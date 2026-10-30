import {addOrUpdate,toBatchRanges,nextMarks} from './batch.mjs?v=2';
import {createProjectPicker} from '../studio/project-picker.mjs?v=2-project';
import {projectAssets,preferredBed,isVideo} from '../studio/project-index.mjs?v=1';
import {frameAt,selection,clipName,cloudResult} from './core.mjs?v=1';
import {inspect,cut} from './engine.mjs?v=1';
const $=id=>document.getElementById(id),video=$('video'),API='https://gs-previewlock-api.onrender.com';
let project=null,file=null,source=null,meta=null,sourceURL=null,resultURL=null,result=null,busy=false,controller=null,loadEpoch=0,previewEnd=null,selectedFrame=0;
let cuts=[],editingId='',sourceDigest='',savedBatch=null,batchDirty=false,boundaryFocus='';
const say=s=>$('status').textContent=s;
const hash=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function api(path,options={}){const key=localStorage.getItem('gs_previewlock_key');if(!key)throw Error('Use your existing PreviewLock connection in this browser.');const r=await fetch(API+path,{...options,headers:{Authorization:'Bearer '+key,...options.headers},signal:AbortSignal.timeout(65000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Cloud request failed ('+r.status+').');return d;}
function guard(fn){return async(...args)=>{try{await fn(...args);}catch(e){say(e.message);}};}
function controls(){for(const id of ['back','play','next','markIn','markOut','in','out','preview','reset','seek','format','name','download'])$(id).disabled=busy||!meta;for(const id of ['open','assets','import','sourceSelect'])$(id).disabled=busy||(id!=='open'&&!project);$('save').disabled=busy||!meta||!project;$('cancel').hidden=!controller;batchControls();}
function range(){return selection(meta.times,meta.end,Number($('in').value),Number($('out').value));}
function rangeChanged(){result=null;$('result').hidden=true;try{const r=range();$('length').textContent=r.frames+' frames · '+(r.end-r.start).toFixed(3)+'s';}catch(e){$('length').textContent=e.message;}drawBoundaries();controls();}
async function seek(frame){if(!meta)return;previewEnd=null;video.pause();selectedFrame=Math.max(0,Math.min(meta.times.length-1,Math.trunc(frame)));video.currentTime=meta.times[selectedFrame];updateClock();}
function updateClock(){if(!meta)return;const f=video.seeking?selectedFrame:frameAt(meta.times,video.currentTime);$('seek').value=f;$('clock').textContent='F'+f+' / '+meta.times.length+' · '+video.currentTime.toFixed(3)+'s';}
function pause(){previewEnd=null;video.pause();}
async function loadSource(blob,ref){const token=++loadEpoch;pause();busy=true;controls();say('Reading source frames…');try{const next=await inspect(blob);if(token!==loadEpoch)return;meta=next;file=blob;source=ref;result=null;if(sourceURL)URL.revokeObjectURL(sourceURL);if(resultURL)URL.revokeObjectURL(resultURL);boundaryFocus='';sourceURL=URL.createObjectURL(blob);video.src=sourceURL;video.hidden=false;$('empty').hidden=true;$('result').hidden=true;$('source').textContent=ref.name+' · '+next.width+'×'+next.height+' · '+next.times.length+' frames';$('in').value=0;$('out').value=next.times.length;$('in').max=next.times.length-1;$('out').max=next.times.length;$('seek').max=next.times.length-1;$('format').value=(next.alpha||next.format==='WebM'||!next.mp4Possible)?'webm':'mp4';$('name').value=ref.name.replace(/\.[^.]+$/,'')+'_CUT_v01';selectedFrame=0;sourceDigest=await hash(blob);if(token!==loadEpoch)return;restoreBatch();rangeChanged();say('Mark IN, mark OUT, then Add cut.');}catch(e){throw e;}finally{if(token===loadEpoch){busy=false;controls();}}}
async function useAsset(a){if(!isVideo(a))throw Error('Choose a video source.');pause();say('Loading '+a.name+'…');const u=a.src?new URL('../jokelets/'+a.src,import.meta.url).href:(await api('/api/playback?path='+encodeURIComponent(a.path))).url;const r=await fetch(u);if(!r.ok)throw Error('Source download failed.');await loadSource(await r.blob(),a);}
async function openProject(record,chosen){const d=await api('/api/joke-project?id='+encodeURIComponent(record.id));if(!d.project)throw Error('Open this catalog joke in CapLock once to establish its saved project.');project=d.project;$('projectName').textContent=project.title;$('return').href='../caplock/?v=R9&project='+encodeURIComponent(project.id);const options=projectAssets(project).filter(isVideo);$('sourceSelect').replaceChildren();for(const a of options){const o=document.createElement('option');o.value=a.path;o.textContent=a.name;$('sourceSelect').append(o);}const a=chosen||preferredBed(project)||options[0];if(a){$('sourceSelect').value=a.path;await useAsset(a);}else{file=meta=source=null;video.removeAttribute('src');video.load();video.hidden=true;$('empty').hidden=false;$('empty').textContent='No video in this project yet. Import a source below.';controls();}}
const picker=createProjectPicker({api,onPause:pause,hasProject:()=>!!project,onOpenProject:openProject,onUseAsset:async(p,a)=>{if(p&&p.id!==project?.id)await openProject(p,a);else await useAsset(a);},onLocal:()=>$('import').click()});
$('open').onclick=guard(()=>picker.open());$('assets').onclick=guard(()=>picker.open(project?.id));$('sourceSelect').onchange=guard(()=>useAsset(projectAssets(project).find(a=>a.path===$('sourceSelect').value)));$('import').onchange=guard(async e=>{const f=e.target.files[0];if(f)await loadSource(f,{name:f.name,kind:'device'});e.target.value='';});
$('back').onclick=()=>stepBoundary(-1);$('next').onclick=()=>stepBoundary(1);$('seek').oninput=e=>{boundaryFocus='';drawBoundaries();seek(Number(e.target.value));};$('play').onclick=guard(async()=>{boundaryFocus='';drawBoundaries();previewEnd=null;if(video.paused)await video.play();else video.pause();});video.onplay=()=>$('play').textContent='Pause';video.onpause=()=>$('play').textContent='Play';video.ontimeupdate=()=>{updateClock();if(previewEnd!==null&&video.currentTime>=previewEnd){video.pause();video.currentTime=previewEnd;previewEnd=null;}};video.onseeked=updateClock;video.onerror=()=>say('Source cannot play in this browser. Original is unchanged.');
if(video.requestVideoFrameCallback){const tick=()=>{if(previewEnd!==null&&video.currentTime>=previewEnd){video.pause();video.currentTime=previewEnd;previewEnd=null;}video.requestVideoFrameCallback(tick);};video.requestVideoFrameCallback(tick);}
$('markIn').onclick=()=>{boundaryFocus='in';pause();$('in').value=frameAt(meta.times,video.currentTime);rangeChanged();rememberBatch();};$('markOut').onclick=()=>{boundaryFocus='out';pause();$('out').value=frameAt(meta.times,video.currentTime);rangeChanged();rememberBatch();};$('reset').onclick=()=>{pause();$('in').value=0;$('out').value=meta.times.length;rangeChanged();};$('in').onchange=$('out').onchange=()=>{rangeChanged();boundaryFocus=document.activeElement?.id==='in'?'in':'out';seekBoundary(boundaryFocus);drawBoundaries();};$('format').onchange=rangeChanged;
$('preview').onclick=guard(async()=>{const r=range();video.pause();video.currentTime=r.start;previewEnd=r.end;await video.play();});
async function renderCut(){if(result)return result;pause();controller=new AbortController();controls();say('Cutting…');try{result=await cut(file,meta,Number($('in').value),Number($('out').value),$('format').value,{signal:controller.signal,onProgress:p=>say('Cutting · '+Math.round(p*100)+'%')});if(resultURL)URL.revokeObjectURL(resultURL);resultURL=URL.createObjectURL(result.blob);$('resultVideo').src=resultURL;$('result').hidden=false;return result;}finally{controller=null;controls();}}
async function run(fn){if(busy)return;busy=true;controls();try{await fn();}catch(e){say(e.message);}finally{busy=false;controller=null;controls();}}
$('cancel').onclick=()=>controller?.abort();
$('download').onclick=()=>run(async()=>{const r=await renderCut(),a=document.createElement('a');a.href=resultURL;a.download=clipName($('name').value,r.format);a.click();say('Download requested · '+r.verified.frames+' verified video frames. Project save is separate.');});
async function saveBlob(blob,name,role){if(blob.size>40*1024*1024)throw Error('Existing project upload limit is 40 MB per file. Download this cut or use a shorter source.');const digest=await hash(blob),d=await api('/api/joke-project/asset?id='+encodeURIComponent(project.id)+'&role='+role+'&name='+encodeURIComponent(name),{method:'POST',headers:{'content-type':'application/octet-stream'},body:blob});const a=cloudResult(d,digest,blob.size);project=d.project;return a;}
$('save').onclick=()=>run(async()=>{const r=await renderCut();say('Saving original and clip…');const sourceHash=await hash(file);let parent=projectAssets(project).find(a=>a.sha256===sourceHash&&a.size===file.size);if(!parent)parent=await saveBlob(file,source.name,'broll');const name=clipName($('name').value,r.format),asset=await saveBlob(r.blob,name,'broll');const recipe={schema:'GS-ClipLockCut-1',tool:'GS-TOOL-CLIPLOCK',release:'R1',projectId:project.id,created:new Date().toISOString(),source:{id:parent.id,path:parent.path,name:source.name,sha256:sourceHash,bytes:file.size},selection:{...r.range,outExclusive:true},output:{id:asset.id,path:asset.path,name:asset.name,sha256:asset.sha256,bytes:asset.size,...r.verified},encoding:'offline exact-boundary transcode; source dimensions retained',driveBackup:'pending'};try{await saveBlob(new Blob([JSON.stringify(recipe,null,2)+'\n'],{type:'application/json'}),name+'.clip.json','broll');say('Clip + cut recipe saved in this project. Original preserved. Drive backup queued.');}catch(e){say('Clip saved; cut recipe still pending: '+e.message+' Retry Save to finish without duplicating matching bytes.');}});
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!busy)pause();});
controls();const initial=new URLSearchParams(location.search);if(initial.has('project'))guard(async()=>{await openProject({id:initial.get('project')});if(initial.has('asset')){const a=projectAssets(project).find(a=>a.id===initial.get('asset')||a.path===initial.get('asset'));if(a)await useAsset(a);}})();

// Reuse waiting editor tabs without navigating/reloading their unsaved workspace.
for(const link of document.querySelectorAll('.links a[target]'))link.addEventListener('click',event=>{if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const tab=window.open('',link.target);if(!tab)return;event.preventDefault();try{if(tab.location.href==='about:blank'||new URL(tab.location.href).pathname!==new URL(link.href).pathname)tab.location.href=link.href;tab.focus();}catch{tab.location.href=link.href;}});


function batchControls(){
 for(const id of ['addCut','cutName','inHandle','outHandle','removeBlue','blue'])$(id).disabled=busy||!meta;
 $('saveBatch').disabled=busy||!project||!meta||!cuts.length;
 $('finishBatch').disabled=busy||batchDirty||savedBatch?.status!=='complete';
 $('newCut').hidden=!editingId;$('addCut').textContent=editingId?'Update cut':'+ Add cut';
 for(const b of $('cutList').querySelectorAll('button'))b.disabled=busy;
}
function draftKey(){return 'gs_cliplock_batch_v2_'+(project?.id||'local')+'_'+sourceDigest;}
function rememberBatch(){if(!sourceDigest)return;try{localStorage.setItem(draftKey(),JSON.stringify({schema:2,sourceDigest,cuts,removeBlue:$('removeBlue').checked,blue:$('blue').value,editingId,marks:{inFrame:Number($('in').value),outFrame:Number($('out').value)},cutName:$('cutName').value}));}catch{say('Browser draft unavailable. Save clips to preserve the cut recipe.');}}
function restoreBatch(){
 let restoredDraft=false;cuts=[];editingId='';savedBatch=source?.role==='caption'?source.cuts:null;batchDirty=false;$('cutName').value='1';$('removeBlue').checked=!meta.alpha;
 if(savedBatch){cuts=savedBatch.ranges.map((c,i)=>({id:'saved-'+i,inFrame:c.sourceInFrame??frameAt(meta.times,c.inFrame/25),outFrame:c.sourceOutFrame??Math.min(meta.times.length,frameAt(meta.times,c.outFrame/25)+((c.outFrame/25>=meta.end)?1:0)),name:(c.name||String(i+1)+'.webm').replace(/\.webm$/i,'')}));$('removeBlue').checked=savedBatch.chroma.enabled!==false;$('blue').value=savedBatch.chroma.color;}
 try{const d=JSON.parse(localStorage.getItem(draftKey())||'null');if(d?.schema===2&&d.sourceDigest===sourceDigest&&Array.isArray(d.cuts)){for(const c of d.cuts)selection(meta.times,meta.end,c.inFrame,c.outFrame);restoredDraft=true;cuts=d.cuts;editingId=cuts.some(c=>c.id===d.editingId)?d.editingId:'';$('cutName').value=d.cutName||String(cuts.length+1);$('removeBlue').checked=d.removeBlue;$('blue').value=d.blue;if(d.marks){selection(meta.times,meta.end,d.marks.inFrame,d.marks.outFrame);$('in').value=d.marks.inFrame;$('out').value=d.marks.outFrame;}}}catch{say('Invalid temporary cut draft ignored; saved project remains unchanged.');}
 batchDirty=restoredDraft?!matchesSaved():false;renderBatch();
}
function matchesSaved(){if(!savedBatch||!meta)return false;try{const ranges=toBatchRanges(meta,cuts);return savedBatch.status==='complete'&&ranges.length===savedBatch.ranges.length&&ranges.every((c,i)=>{const p=savedBatch.ranges[i];return c.inFrame===p.inFrame&&c.outFrame===p.outFrame&&c.sourceStart===p.sourceStart&&c.sourceEnd===p.sourceEnd&&c.name===(p.name||String(i+1)+'.webm');})&&($('removeBlue').checked===(savedBatch.chroma.enabled!==false))&&(!$('removeBlue').checked||$('blue').value===savedBatch.chroma.color);}catch{return false;}}
function changedBatch(){batchDirty=true;renderBatch();rememberBatch();}
function drawBoundaries(){for(const w of ['in','out'])$('mark'+(w==='in'?'In':'Out')).setAttribute('aria-pressed',String(boundaryFocus===w));if(!meta)return;const total=meta.times.length,a=Number($('in').value),b=Number($('out').value);$('inHandle').max=total-1;$('outHandle').max=total;$('inHandle').value=a;$('outHandle').value=b;$('rangeBand').style.left=(a/total*100)+'%';$('rangeBand').style.width=(Math.max(0,b-a)/total*100)+'%';const prev=editingId?cuts[cuts.findIndex(c=>c.id===editingId)-1]:cuts.at(-1);$('previousBoundary').hidden=!prev;if(prev)$('previousBoundary').style.left=(prev.outFrame/total*100)+'%';}
function seekBoundary(which){if(!meta)return;seek(Math.min(meta.times.length-1,Number($(which).value)));rememberBatch();}
for(const which of ['in','out'])$(which+'Handle').oninput=e=>{boundaryFocus=which;const n=Number(e.target.value);$(which).value=which==='in'?Math.min(n,Number($('out').value)-1):Math.max(n,Number($('in').value)+1);rangeChanged();seekBoundary(which);};
$('addCut').onclick=()=>{try{const r=range();const name=$('cutName').value.trim()||String(cuts.length+1);const next=addOrUpdate(cuts,{inFrame:r.inFrame,outFrame:r.outFrame},{id:editingId||undefined,name});toBatchRanges(meta,next);const index=editingId?cuts.findIndex(c=>c.id===editingId):cuts.length;next[index].autoName=name===String(index+1);cuts=next;editingId='';boundaryFocus='in';const marks=nextMarks(r.outFrame,meta.times.length);$('in').value=marks.inFrame;$('out').value=marks.outFrame;$('cutName').value=String(cuts.length+1);rangeChanged();seek(marks.inFrame);changedBatch();say('Cut added. Next IN starts at the previous OUT; drag either boundary to adjust.');}catch(e){say(e.message);}};
$('newCut').onclick=()=>{editingId='';const marks=nextMarks(cuts.at(-1)?.outFrame||0,meta.times.length);$('in').value=marks.inFrame;$('out').value=marks.outFrame;$('cutName').value=String(cuts.length+1);rangeChanged();renderBatch();seek(marks.inFrame);rememberBatch();};
function renderBatch(){
 $('cutCount').textContent=cuts.length;$('cutList').replaceChildren();
 for(const [i,c]of cuts.entries()){
  const row=document.createElement('div');row.className='cut-row';row.setAttribute('aria-current',String(editingId===c.id));
  const edit=document.createElement('button');edit.className='cut-label';edit.textContent=(i+1)+'. '+c.name;edit.setAttribute('aria-label','Edit cut '+(i+1));const small=document.createElement('small');small.textContent='F'+c.inFrame+'–'+c.outFrame;edit.append(small);
  edit.onclick=()=>{pause();editingId=c.id;$('in').value=c.inFrame;$('out').value=c.outFrame;$('cutName').value=c.name;rangeChanged();renderBatch();seek(c.inFrame);rememberBatch();};
  const play=document.createElement('button');play.textContent='▶';play.setAttribute('aria-label','Preview cut '+(i+1));play.onclick=guard(async()=>{const r=selection(meta.times,meta.end,c.inFrame,c.outFrame);video.pause();video.currentTime=r.start;previewEnd=r.end;await video.play();});
  const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','Remove queued cut '+(i+1));remove.onclick=()=>{cuts=cuts.filter(x=>x.id!==c.id).map((x,i)=>x.autoName?{...x,name:String(i+1)}:x);if(editingId===c.id)editingId='';$('cutName').value=String(cuts.length+1);changedBatch();drawBoundaries();};
  row.append(edit,play,remove);$('cutList').append(row);
 }
 $('batchStatus').textContent=batchDirty?'Cut draft · save clips when ready. Overlaps and gaps are allowed.':savedBatch?.status==='complete'?savedBatch.clips.length+' components saved · Drive backup queued.':savedBatch?.status==='running'?'Rendering is in progress. Save clips reconnects to the saved job.':'Add cuts in the order you want them. Overlaps and gaps are allowed.';
 $('savedClips').replaceChildren();if(savedBatch?.status==='complete'&&!batchDirty)for(const c of savedBatch.clips){const b=document.createElement('button');b.textContent='▶ '+(c.name||c.number+'.webm');b.onclick=guard(async()=>{pause();const d=await api('/api/playback?path='+encodeURIComponent(c.path));$('resultVideo').src=d.url;$('result').hidden=false;await $('resultVideo').play();});$('savedClips').append(b);}
 drawBoundaries();batchControls();
}
$('removeBlue').onchange=$('blue').onchange=()=>changedBatch();
async function monitorBatch(assetId){
 for(;;){const d=await api('/api/joke-project?id='+encodeURIComponent(project.id));project=d.project;const a=project.assets.find(x=>x.id===assetId);if(!a?.cuts)throw Error('Saved batch is missing; original remains intact.');savedBatch=a.cuts;$('batchStatus').textContent='Saving clips · '+savedBatch.clips.length+' / '+savedBatch.ranges.length;
  if(savedBatch.status==='failed')throw Error('Clip render stopped: '+savedBatch.error+' Original and partial clips remain saved.');
  if(savedBatch.status==='complete'){batchDirty=false;source=a;refreshSourceList();renderBatch();rememberBatch();say('Numbered clips saved in this project. Ready for CapLock. Drive backup queued.');return;}
  await new Promise(resolve=>setTimeout(resolve,2500));
 }
}
$('saveBatch').onclick=()=>run(async()=>{
 const ranges=toBatchRanges(meta,cuts);if(!project)throw Error('Open the joke project first.');
 let d=await api('/api/joke-project?id='+encodeURIComponent(project.id));if(d.capabilities?.clipBatch!==2)throw Error('Clip batch server update is not ready. Your cut draft is preserved; retry Save clips after deployment.');project=d.project;let parent=project.assets.find(a=>a.role==='caption'&&a.sha256===sourceDigest&&a.size===file.size);
 if(!parent){say('Preserving original animation…');parent=await saveBlob(file,source.name,'caption');d=await api('/api/joke-project?id='+encodeURIComponent(project.id));project=d.project;}
 if(parent.cuts?.status!=='running')d=await api('/api/joke-project/cuts?id='+encodeURIComponent(project.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rev:d.rev,assetId:parent.id,cuts:ranges,chroma:{enabled:$('removeBlue').checked,color:$('blue').value,similarity:.18,blend:.04}})});
 else {const expected=ranges.map(c=>JSON.stringify(c)),actual=parent.cuts.ranges.map(({number,...c})=>JSON.stringify(c));if(expected.length!==actual.length||expected.some((x,i)=>x!==actual[i]))throw Error('An earlier batch is still rendering. Reopen its caption source to recover it before saving another batch.');}
 await monitorBatch(parent.id);
});
$('finishBatch').onclick=()=>{if(batchDirty||savedBatch?.status!=='complete'||!source?.id)return;pause();location.href='../caplock/?v=R9&project='+encodeURIComponent(project.id)+'&caption='+encodeURIComponent(source.id);};

function stepBoundary(delta){
 if(!meta)return;
 if(!boundaryFocus)return seek(frameAt(meta.times,video.currentTime)+delta);
 const w=boundaryFocus,a=Number($('in').value),b=Number($('out').value),n=Number($(w).value)+delta;
 $(w).value=w==='in'?Math.max(0,Math.min(b-1,n)):Math.min(meta.times.length,Math.max(a+1,n));rangeChanged();seekBoundary(w);
}

function refreshSourceList(){
 const select=$('sourceSelect');select.replaceChildren();for(const a of projectAssets(project).filter(isVideo)){const o=document.createElement('option');o.value=a.path;o.textContent=a.name;select.append(o);}select.value=source?.path||'';
}
