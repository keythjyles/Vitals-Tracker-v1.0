import {PHASES,LABELS,canonicalId,validProjectId,moduleSession,moduleRevision,nextPhase,phaseSession,preferredBed} from './core.mjs?v=1';
import {api,assetBlob,storeAsset} from './adapter.mjs?v=1';
import {projectAssets} from './project-index.mjs?v=4';
import {captionCutLabel} from '../../shared/cut-passes.mjs?v=4';
import {createProjectPicker} from './project-picker.mjs?v=4';
const $=id=>document.getElementById(id),origin=location.origin;
let project=null,phase='joke',loadedRevision=0,child=null,working=false,ledger=null,pendingSave=null,installPrompt=null,epoch=0,jokeDirty=false,jokeBase=null;
const urls={cut:'../cliplock/?studio=1',captions:'../caplock/?studio=1',scene:'../aspectlock/?studio=1',sound:'../sxlock/?studio=1',review:'../previewlock/cloud-test.html?studio=1'};
const inflight=new Map();
function status(text){$('saveState').textContent='GS-TOOL-STUDIO · R1 · '+text;}
function fail(e){status(e.message||String(e));$('errorText').textContent=e.message||String(e);if(!$('errorDialog').open)$('errorDialog').showModal();}
$('closeError').onclick=()=>$('errorDialog').close();
function busy(on){working=on;$('moduleHost').inert=on;$('jokeWorkspace').inert=on;$('entrance').inert=on;for(const b of document.querySelectorAll('[data-phase]'))b.disabled=on||(!project&&b.dataset.phase!=='joke');$('nextPhase').disabled=on||!project||phase==='review';$('assets').disabled=on||!project;$('saveWork').disabled=on||!project;$('chooseJoke').disabled=on;}
function showPhase(){for(const b of document.querySelectorAll('[data-phase]')){if(b.dataset.phase===phase)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}$('entrance').hidden=!!project;$('jokeWorkspace').hidden=!project||phase!=='joke';$('moduleHost').hidden=phase==='joke';$('jokeTitle').textContent=project?.title||'Select a joke';busy(working);}
function rpc(action,payload,timeout=65000){
 if(!child)throw Error('Module is not open.');const frame=child,id=crypto.randomUUID(),module=phase;
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{inflight.delete(id);reject(Error('The tool did not acknowledge '+action+'. Work remains open; retry when it is ready.'));},timeout);inflight.set(id,{frame,module,resolve,reject,timer});frame.contentWindow.postMessage({protocol:'GS-Studio-1',module,id,action,payload},origin);});
}
window.addEventListener('message',event=>{
 const d=event.data;if(event.origin!==origin||d?.protocol!=='GS-Studio-1')return;
 const waiting=inflight.get(d.id);if(waiting&&event.source===waiting.frame.contentWindow&&d.module===waiting.module){clearTimeout(waiting.timer);inflight.delete(d.id);d.error?waiting.reject(Error(d.error)):waiting.resolve(d.result);return;}
 if(event.source===$('jokeSelector').contentWindow&&d.action==='select-joke'&&typeof d.joke?.text==='string'&&d.joke.text.trim()&&d.joke.text.length<=20000)run(()=>selectJoke(d.joke));
 if(child&&event.source===child.contentWindow&&d.action==='navigate-phase'&&PHASES.includes(d.phase))run(()=>switchPhase(d.phase));
});
async function readProject(){const d=await api('/api/joke-project?id='+encodeURIComponent(project.id));if(!d.project)throw Error('Saved joke project is unavailable.');if(d.capabilities?.studio!==1)throw Error('Studio server update is not ready. Your current edit stays open.');project=d.project;return d;}
async function checkpoint(target){
 if(!project)return;
 let session;
 if(phase==='joke'){
  if(jokeDirty){let d=await readProject();if(project.text!==jokeBase.text||project.title!==jokeBase.title)throw Error('Joke text changed elsewhere. Your wording remains on screen; reconcile it before saving.');d=await api('/api/joke-project?id='+encodeURIComponent(project.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rev:d.rev,title:$('title').value,text:$('text').value})});project=d.project;jokeDirty=false;jokeBase={text:project.text,title:project.title};}
  session=moduleSession('joke',project.id,{phrases:$('phrases').value.split('\n'),scribe:$('scribe').value});
 }else session=await rpc('checkpoint');
 const d=await readProject();
 const signature=JSON.stringify({module:phase,nextPhase:target,session,moduleRevision:loadedRevision});
 if(!pendingSave||pendingSave.signature!==signature)pendingSave={signature,requestId:crypto.randomUUID()};
 const saved=await api('/api/joke-project/studio?id='+encodeURIComponent(project.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rev:d.rev,module:phase,moduleRevision:loadedRevision,nextPhase:target,session,requestId:pendingSave.requestId})});
 if(!saved.persisted)throw Error('Studio save not acknowledged.');project=saved.project;loadedRevision=moduleRevision(project,phase);pendingSave=null;status('Saved in Dropbox · Drive backup pending');
}
async function openModule(target){
 const turn=++epoch;phase=target;loadedRevision=moduleRevision(project,phase);showPhase();
 if(target==='joke'){fillJoke();return;}
 const frame=document.createElement('iframe');frame.title=LABELS[target]+' · '+project.title;frame.allow='microphone; clipboard-write';frame.src=urls[target];
 child=frame;$('moduleHost').replaceChildren(frame);await new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(Error('Tool could not open.'));setTimeout(()=>reject(Error('Tool load timed out.')),30000);});
 if(turn!==epoch)return;for(let i=0;i<30;i++){try{await rpc('ping',null,1200);break;}catch(e){if(i===29)throw e;}}
 await rpc('open',{project,session:phaseSession(project,target)});status(LABELS[target]+' · '+project.title+' · playback paused');
}
async function switchPhase(target){if(!project||target===phase)return;await checkpoint(target);if(child){child.remove();child=null;}try{await openModule(target);}catch(e){child?.remove();child=null;phase='joke';loadedRevision=moduleRevision(project,'joke');fillJoke();showPhase();throw e;}}
function fillJoke(){const s=phaseSession(project,'joke');$('title').value=project.title;$('text').value=project.text;$('phrases').value=(s?.phrases||[]).join('\n');$('scribe').value=s?.scribe||'';jokeDirty=false;jokeBase={text:project.text,title:project.title};renderAssets();}
async function selectJoke(joke){
 if(project)await checkpoint('joke');
 ledger||=await fetch('../jokelab/PRODUCTION_LEDGER.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Production identity ledger unavailable.');return r.json();});
 let id=canonicalId(joke.id,ledger);if(!validProjectId(id)){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(joke.text.normalize('NFKC').trim()));id='joke-'+[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,32);}
 let d=await api('/api/joke-project?id='+encodeURIComponent(id));if(d.capabilities?.studio!==1)throw Error('Studio server update is not ready. Selected joke is kept on screen.');
 if(!d.project)d=await api('/api/joke-project?id='+encodeURIComponent(id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rev:d.rev,title:joke.title||joke.text.slice(0,70),text:joke.text})});
 if(joke.updateText&&d.project.text!==joke.text){if(project?.id===id&&d.project.text!==project.text)throw Error('Joke wording changed elsewhere; keep the developed wording and reconcile before saving.');d=await api('/api/joke-project?id='+encodeURIComponent(id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rev:d.rev,title:d.project.title,text:joke.text})});}
 project=d.project;child?.remove();child=null;phase='joke';loadedRevision=moduleRevision(project,'joke');showPhase();fillJoke();
 if(!phaseSession(project,'joke')&&joke.notes)$('scribe').value=joke.notes;
 history.replaceState(null,'',location.pathname+'?joke='+encodeURIComponent(id));status(project.title+' · joke saved · choose the next production step');
}
const picker=createProjectPicker({api,hasProject:()=>!!project,onPause:()=>{},onOpenProject:async record=>{
 if(project)await checkpoint('joke');const d=await api('/api/joke-project?id='+encodeURIComponent(record.id));
 if(!d.project){if(!record.text?.trim())throw Error('This legacy joke has no recovered text yet. Its sources remain preserved.');await selectJoke({id:record.id,title:record.title,text:record.text});for(const a of record.assets||[]){if(!a.src||!a.sha256||project.assets.some(v=>v.sha256===a.sha256))continue;const r=await fetch(new URL('../jokelets/'+a.src,import.meta.url));if(!r.ok)throw Error('Existing source unavailable: '+a.name);const b=await r.blob(),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');if(digest!==a.sha256)throw Error('Existing source hash changed; original was not imported.');const saved=await storeAsset(project.id,b,a.name,'bed');project=saved.project;}renderAssets();return;}
 project=d.project;child?.remove();child=null;phase='joke';loadedRevision=moduleRevision(project,'joke');showPhase();fillJoke();history.replaceState(null,'',location.pathname+'?joke='+encodeURIComponent(project.id));status('Joke restored · saved phase: '+LABELS[project.studio?.activePhase||'joke']+' · choose a phase to resume');
 },onUseAsset:async(p,a)=>{if(!project||p?.id!==project.id)throw Error('Choose this joke first.');await showAsset(a);}});
async function showAsset(a){const b=await assetBlob(a),url=URL.createObjectURL(b),link=document.createElement('a');link.href=url;link.download=a.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function renderAssets(){
 const list=$('assetList');for(const m of list.querySelectorAll('video,audio')){m.pause();m.removeAttribute('src');}list.replaceChildren();
 for(const a of projectAssets(project)){
  const row=document.createElement('article');row.className='asset';const name=document.createElement('strong');name.textContent=a.name;const role=document.createElement('small');role.textContent=[a.role,captionCutLabel(a)].filter(Boolean).join(' · ');row.append(name,role);
  const type=/\.(mp4|webm|mov)$/i.test(a.name)?'video':/\.(mp3|wav|m4a|ogg)$/i.test(a.name)?'audio':/\.(png|jpg|jpeg|webp)$/i.test(a.name)?'img':null;
  if(type){const m=document.createElement(type);if(type!=='img'){m.controls=true;m.preload='none';m.playsInline=true;}const preview=document.createElement('button');preview.textContent='Preview';preview.onclick=async()=>{try{preview.disabled=true;const d=await api('/api/playback?path='+encodeURIComponent(a.path));m.src=d.url;row.append(m);preview.hidden=true;}catch(e){fail(e);}finally{preview.disabled=false;}};row.append(preview);}
  const save=document.createElement('button');save.textContent='Save asset';save.onclick=()=>showAsset(a).catch(fail);row.append(save);list.append(row);
 }
}
async function run(fn){if(working)return;busy(true);try{await fn();}catch(e){fail(e);}finally{busy(false);}}
for(const b of document.querySelectorAll('[data-phase]'))b.onclick=()=>run(()=>switchPhase(b.dataset.phase));
$('saveWork').onclick=()=>run(()=>checkpoint(phase));
$('nextPhase').onclick=()=>run(()=>switchPhase(nextPhase(phase)));
$('jokeForm').onsubmit=e=>{e.preventDefault();run(()=>checkpoint('joke'));};
for(const id of ['title','text'])$(id).oninput=()=>{jokeDirty=true;status('Joke text changed · save before leaving');};
for(const id of ['phrases','scribe'])$(id).oninput=()=>status('Working notes changed · saved when you change phase');
$('assets').onclick=()=>run(async()=>{await checkpoint('joke');if(child){child.remove();child=null;}phase='joke';loadedRevision=moduleRevision(project,'joke');fillJoke();showPhase();$('jokeAssets').scrollIntoView();});
$('chooseJoke').onclick=()=>run(async()=>{if(project)await checkpoint('joke');child?.remove();child=null;project=null;phase='joke';history.replaceState(null,'',location.pathname);showPhase();status('Select a joke · existing work remains saved');});
$('resume').onclick=()=>run(()=>picker.open());
$('importAsset').onclick=()=>$('assetFile').click();$('assetFile').onchange=()=>run(async()=>{const f=$('assetFile').files[0];if(!f||!project)return;await checkpoint('joke');status('Saving original '+f.name+'…');const d=await storeAsset(project.id,f,f.name,$('assetRole').value);project=d.project;renderAssets();$('assetFile').value='';status('Original saved in this joke · Drive backup pending');});
$('develop').onclick=()=>{const f=$('jokeSelector');$('entrance').hidden=false;$('jokeWorkspace').hidden=true;f.src='../jokelab/?studio=1&sourceJoke='+encodeURIComponent(project.id)+'#work='+encodeURIComponent(JSON.stringify({text:$('text').value,notes:$('scribe').value,settings:{}}));};
$('openGemini').onclick=()=>window.open(project?.id==='dad-00bda89167b4f15850aa1c91'?'https://gemini.google.com/app/042cebd9fc13ea0f':'https://gemini.google.com/app','gs-gemini','noopener');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('install').hidden=true;}};
window.addEventListener('beforeunload',e=>{if(project){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&child)rpc('pause').catch(()=>{});});
const initial=new URLSearchParams(location.search).get('joke');if(initial&&validProjectId(initial))run(()=>picker.open(initial));
showPhase();

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
