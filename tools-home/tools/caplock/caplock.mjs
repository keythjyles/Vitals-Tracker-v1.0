import {compositionFrames,bedTime,TailClock} from './composition-time.mjs?v=25';
import {percentGain,inspectSourceAudio} from './source-audio.mjs?v=28';
import {createToolboxUI} from './toolbox-ui.mjs?v=31';
import {rememberLocalMedia,readLocalMedia} from './local-media.mjs?v=31';
import {isToolboxEntry,makeToolboxPlacement,fitVideoPlacement,setPlacementSpeed} from './toolbox-core.mjs?v=28';
import {inspectToolboxFile} from './toolbox-media.mjs?v=28';
import {createTrimDialog} from './trim-dialog.mjs?v=28';
import {passFilename,matchLocalFile,localPassKey} from './local-pass.mjs?v=21';
import {renderCaptioned} from './composite.mjs?v=30';
import {DEFAULT_CHROMA,detectBackground} from './background.mjs?v=23';
import {captionJobStatus} from '../../shared/caption-job-status.mjs?v=1';
import {stageAsset,stageRecord,stageFilename,captionRecipe,stageForName,pendingCaptions} from '../../shared/production-stages.mjs?v=28';
import {saveProductionStage} from '../../shared/production-client.mjs?v=1';
import {withCaptionBatch} from './caption-batch.mjs?v=22';
import {openVideoProject} from '../../shared/video-project.mjs?v=1';
import {caplockTarget} from '../../shared/caption-handoff.mjs?v=2';
import {inStudio,installAdapter} from '../studio/adapter.mjs?v=1';
import {listCutProjects,readCutVideo,publishCutProject,watchCutProjects} from '../../shared/cut-jokelets.mjs?v=3';
import {moduleSession} from '../studio/core.mjs?v=1';
import {FocusGestures,scaledTarget} from './focus-controls.mjs?v=9';
import {createProjectPicker} from '../studio/project-picker.mjs?v=7-local-first';
import {fitPortrait,preferredBed} from '../studio/project-index.mjs?v=5-studio';
import {captionNumber,numberedCaptionFiles,activeCaption,startCaptionSequence,navigateCaption,moveCaptionDraft,insertCaption} from './placement.mjs?v=19-named';
import {paintMatrix,matrixFrame} from '../../shared/item-matrix.mjs?v=1';
import {rateOf,fitRate} from './clip-time.mjs?v=28';
import {words,moveWords,shiftWords,geminiPrompt} from './script.mjs?v=4';
import {LayerTracks} from './layer-track.mjs?v=29';
import {FPS,DEFAULT_STYLE,createProject,phrase,importTranscript,subtitle,timed,effective,validateProject,validateStyle} from './core.mjs?v=28';
const $=id=>document.getElementById(id),v=$('video'),API='https://gs-previewlock-api.onrender.com';
// Owner lock: built-in text captions cannot be enabled by UI, URL, or restored data.
const BUILTIN_CAPTIONING_LOCKED=true;
const params=new URLSearchParams(location.search);
const STUDIO=inStudio(),CLOUD_VIDEO=params.get('new')==='cloud-video';
const TOOLBOX_MODE=isToolboxEntry(location.search,STUDIO);
const draftKey='gs_caplock_draft_v1',cloudDraftKey='gs_caplock_cloud_draft_v1';
const previousKey='gs_caplock_previous_workspaces',cloudPreviousKey='gs_caplock_cloud_previous_workspaces';
const videoSourceButtons=['newVideoFiles','newVideoPhotos','emptyVideoFiles','emptyVideoPhotos'];
if(STUDIO){
 for(const id of ['newVideoFiles','emptyVideoFiles']){
  $(id).textContent='Open local editor';
  $(id).onclick=()=>window.open('./','_blank','noopener');
 }
 for(const id of ['newVideoPhotos','emptyVideoPhotos'])$(id).hidden=true;
}
let toolboxUI=null;
let projectContext=null;
let localDraftAvailable=false,restoring=false,placementBusy=false,cloudSession=null,cloudTimer=null,cloudSaving=false,cloudWrite=Promise.resolve();
let selectedWords=[],selectedClip=null,editMode='view',libraryTarget='base',projectEpoch=0,dragBefore=null;
let project=createProject(),selected=null,frame=0,maxFrame=0,undo=[],redo=[],mediaUrl=null,bedBlob=null,lastVideoPass=null,input=null,sink=null,seekRevision=0,mediaRevision=0,library=[],dirty=false,zoom=1,pan={x:0,y:0};
const tailClock=new TailClock();let bedFrames=0,bedEnd=0,compositionEnded=false;
const isPlaying=()=>tailClock.running||!v.paused;
function timelineFrame(){
 if(!tailClock.running)return v.currentTime*FPS;
 const sourceFrame=project.canvas?layers.previewFrame():null;
 if(sourceFrame==null)return tailClock.current(FPS);
 tailClock.start(sourceFrame);
 return sourceFrame;
}
function syncExtent(){const end=Math.max(0,compositionFrames(project,bedFrames)-1);if(end!==maxFrame)compositionEnded=false;maxFrame=end;$('seek').max=maxFrame;if(frame>maxFrame){pause();frame=maxFrame;}}
const say=s=>$('status').textContent=s, current=()=>project.captions.find(c=>c.id===selected);
if(!inStudio()&&!window.name)window.name='gs-caplock';
let importingVideo=false,sourceSelection=0;
function lockSourceButtons(busy){
 importingVideo=busy;
 for(const id of videoSourceButtons)$(id).disabled=busy;
}
async function newVideoProject(file){
 if(file.size>40*1024*1024)throw Error('Choose a video under the existing 40 MB project-file limit.');
 say('Reading '+file.name+'…');
 const {inspect}=await import('../cliplock/engine.mjs?v=2'),meta=await inspect(file);
 const record=await openVideoProject(api,file,meta,say);
 await openFullJokeProject(record);
 if(stageForName(file.name)==='raw')await tagCurrentSource('raw');
 say(record.title+' is now its own caption project. Import its Gemini animation when ready.');
 return record;
}
async function loadDeviceVideo(file,{throwOnError=false}={}){
 if(importingVideo||restoring){
  if(throwOnError)throw Error('The editor is busy. Try the file again.');
  return;
 }
 lockSourceButtons(true);
 ++sourceSelection;
 pause();
 const epoch=projectEpoch;
 try{
  if(CLOUD_VIDEO){
   if(cloudSession&&dirty){clearTimeout(cloudTimer);await saveCloudWorkspace();}
   await cloudWrite.catch(()=>{});
   return await newVideoProject(file);
  }
  const ref={kind:'local',name:file.name,size:file.size,lastModified:file.lastModified};
  const initial=await inspectBed(file,ref);
  if(epoch!==projectEpoch)throw Error('The project changed while reading the file. Choose the video again.');
  // Preserve the current edit before detaching from cloud autosave. Device loading
  // must never depend on authentication, an upload, or a project reservation.
  try{archiveWorkspace();}catch{
   if(project.media||project.clips.length||project.captions.length)throw Error('Download the current project before opening another video. This browser could not archive it.');
  }
  const startFresh=TOOLBOX_MODE||!!cloudSession;
  clearTimeout(cloudTimer);cloudSession=null;projectContext=null;delete project.workspace;$('saveCloud').hidden=true;
  if(startFresh)await openProject(createProject());
  lastVideoPass=null;
  $('useSavedVideo').hidden=true;
  $('saveVideo').textContent='Save video';
  $('localVideoProgress').hidden=true;
  $('localVideoStatus').textContent='';
  $('projectName').textContent='Local video';$('bedName').textContent=file.name;
  if(TOOLBOX_MODE)await addEditableBed(file,ref,initial);
  else{
   await loadMedia(file,ref);
   if(project.media===ref)say('Source loaded from your device. Import numbered caption files, then Insert and Next.');
  }
 }catch(e){if(throwOnError)throw e;say('Video not loaded: '+e.message);}finally{
  lockSourceButtons(false);
  render();
 }
}
if(!STUDIO){
 for(const id of ['newVideoFiles','emptyVideoFiles'])$(id).onclick=()=>$('newVideoFile').click();
 for(const id of ['newVideoPhotos','emptyVideoPhotos'])$(id).onclick=()=>$('newVideoPhoto').click();
}
for(const id of ['newVideoFile','newVideoPhoto'])$(id).onchange=e=>{
 const file=e.target.files[0];
 e.target.value='';
 if(file&&!STUDIO)void loadDeviceVideo(file);
};
function download(name,data,type='application/json'){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}
const draftSlot=()=>STUDIO||project.workspace||project.media?.kind==='previewlock'?cloudDraftKey:draftKey;
const archiveSlot=()=>draftSlot()===cloudDraftKey?cloudPreviousKey:previousKey;
function saveDraft(){
 if(restoring)return;
 if(project.captionSequence)project.captionSequence.playhead=frame;
 if(project.workspace)project.workspace.playhead=frame;
 dirty=true;
 if(cloudSession){
  clearTimeout(cloudTimer);
  cloudTimer=setTimeout(()=>saveCloudWorkspace().catch(e=>{$('saveStatus').textContent='Dropbox save pending: '+e.message;}),900);
 }
 try{
  const slot=draftSlot();
  localStorage.setItem(slot,JSON.stringify(project));
  if(slot===draftKey)localDraftAvailable=true;
  $('saveStatus').textContent=cloudSession?'Draft saved on this device. Dropbox save queued.':'Draft saved on this device.';
 }catch(e){$('saveStatus').textContent='Draft save failed. Download the project to keep your edits. '+e.message;}
}
function change(fn){const before=JSON.stringify(project);try{fn();for(const old of JSON.parse(before).clips||[]){const now=project.clips.find(c=>c.id===old.id);if(old.locked&&now?.locked&&['inFrame','outFrame','trimInFrame','trimOutFrame','playbackRate','x','y','width','rotation','mirrorX','flipY','opacity','volume','loop'].some(k=>old[k]!==now[k]))throw Error('Unlock this caption placement before changing it.');}project.captions.forEach(words);validateProject(project);}catch(e){project=JSON.parse(before);say(e.message);return false;}if(before!==JSON.stringify(project)){undo.push(before);if(undo.length>100)undo.shift();redo=[];saveDraft();}render();return true;}
function history(from,to){if(!from.length)return;to.push(JSON.stringify(project));project=JSON.parse(from.pop());if(!current())selected=project.captions[0]?.id||null;saveDraft();render();}
function render(){
 syncExtent();
 const localRefs=project.media?.kind==='local'||project.clips.some(c=>c.ref.kind==='local');
 const firstLayer=project.canvas&&project.clips[0];
 const hasPicture=firstLayer?project.clips.some(c=>c.type==='video'&&layers.media.has(c.id)):!!bedBlob;
 const connected=firstLayer?layers.media.has(firstLayer.id):hasPicture;
 const stageSource=projectContext?.assets?.find(a=>a.path===project.media?.path);
 $('bedLoader').classList.toggle('has-media',hasPicture);
 $('emptyReconnectFiles').hidden=!localRefs;
 $('resumeDraft').hidden=!TOOLBOX_MODE||!localDraftAvailable||localRefs||!!projectContext;
 $('projectAssets').hidden=!projectContext;
 $('sourceStageControl').hidden=!stageSource;
 $('sourceStage').value=stageSource?stageRecord(projectContext,stageSource)?.stage||'':'';
 $('projectName').textContent=projectContext?.title||(project.canvas||project.media?'Local video':'Local editor');
 $('bedName').textContent=firstLayer?.ref.name||project.media?.name||'No video loaded';
 $('bedName').dataset.sourceConnected=String(connected);
 $('empty').textContent=localRefs?'Reconnect the original files to resume.':'';
 $('timeline').replaceChildren();for(const c of project.captions){const b=document.createElement('button');b.textContent=c.text||'(empty caption)';b.setAttribute('aria-pressed',String(c.id===selected));const small=document.createElement('small');small.textContent=(c.visible?'':'Hidden · ')+(timed(c)?'F'+c.inFrame+'–'+c.outFrame:'UNTIMED')+(Object.keys(c.overrides).length?' · local':'');b.append(small);b.onclick=()=>choose(c.id);$('timeline').append(b);}
 const c=current();$('editor').querySelectorAll('textarea,input,button').forEach(el=>{if(!['undo','redo'].includes(el.id))el.disabled=!c});$('selectedLabel').textContent=c?'Selected phrase '+(project.captions.indexOf(c)+1)+' of '+project.captions.length:'Selected phrase — none';$('text').value=c?.text||'';$('inFrame').value=c?.inFrame??'';$('outFrame').value=c?.outFrame??'';$('duration').textContent=c?(timed(c)?(c.outFrame-c.inFrame)+' frames · '+((c.outFrame-c.inFrame)/FPS).toFixed(3)+' seconds · OUT excluded':'Untimed — mark IN and OUT.')+(c&&!c.visible?' · Hidden':''):'';
 fillStyle(c?effective(project,c):project.globalStyle);$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;$('presets').replaceChildren();for(const name of Object.keys(project.presets)){const o=document.createElement('option');o.value=name;o.textContent=name;$('presets').append(o);}renderScript();renderClips();lockBuiltInCaptioning();draw();
}
function choose(id){selected=id;render();const c=current();selectedWords=[];renderScript();if(c?.inFrame!==null&&c&&v.src)seek(c.inFrame);}
function clock(){const t=frame/FPS;$('clipBedFrame').textContent=(project.canvas||maxFrame>=bedFrames&&bedFrames?'Timeline F':'Bed F')+frame+' · '+Math.floor(t/60)+':'+(t%60).toFixed(3).padStart(6,'0');$('clock').textContent='F'+frame+' · '+Math.floor(t/60)+':'+(t%60).toFixed(3).padStart(6,'0')+' · 25 fps';$('seek').value=frame;}
function draw(){
 paintFocus();clock();layers.update();paintMatrix($('itemMatrix'),placedClips(),frame,maxFrame,selectedClip);$('captions').replaceChildren();if(BUILTIN_CAPTIONING_LOCKED||!project.nativeCaptions)return;const c=current();const active=project.captions.filter(x=>x.visible&&timed(x)&&frame>=x.inFrame&&frame<x.outFrame);if(c&&c.visible&&!timed(c))active.push(c);
 for(const c of active){const s=effective(project,c),el=document.createElement('div');el.className='caption';el.textContent=c.text;const alpha=s.backgroundOpacity,hex=s.background;let progress=timed(c)?Math.min(1,(frame-c.inFrame)/5,(c.outFrame-frame)/5):1;progress=Math.max(0,progress);el.style.cssText=`left:${s.x}%;top:${s.y}%;width:${s.width}%;font-family:${s.font};font-weight:${s.emphasis?900:s.weight};font-size:${s.size/5.4}cqw;color:${s.color};text-align:${s.align};line-height:${s.lineHeight};-webkit-text-stroke:${s.outline/5.4}cqw #000;paint-order:stroke fill;text-shadow:0 ${s.shadow/10.8}cqw ${s.shadow/5.4}cqw #000;background:${hex}${Math.round(alpha*255).toString(16).padStart(2,'0')};`;if(s.animation==='fade')el.style.opacity=progress;if(s.animation==='pop')el.style.transform=`translate(-50%,-50%) scale(${.85+.15*progress})`;$('captions').append(el);}
}
function pause(){if(tailClock.running)frame=Math.max(0,Math.min(maxFrame,Math.floor(timelineFrame()+1e-5)));tailClock.stop();v.pause();$('play').textContent='▶ Play';layers.update();}
function startTail(start){++seekRevision;v.pause();frame=Math.min(maxFrame,start);tailClock.start(frame);if(v.readyState>=2){const canvas=$('decoded');canvas.width=v.videoWidth;canvas.height=v.videoHeight;canvas.getContext('2d').drawImage(v,0,0,canvas.width,canvas.height);canvas.hidden=false;}v.currentTime=bedTime(frame,bedEnd,FPS);$('play').textContent='Ⅱ Pause';draw();}
async function seek(n){pause();frame=Math.max(0,Math.min(project.canvas?maxFrame:maxFrame||Number.MAX_SAFE_INTEGER,Math.round(n)));if(!restoring&&project.captionSequence){moveCaptionDraft(project,frame);saveDraft();}compositionEnded=false;if(project.canvas){draw();return;}const revision=++seekRevision,target=bedTime(frame,bedEnd||v.duration,FPS);v.currentTime=target;draw();if(sink){$('decoded').hidden=true;try{const sample=await sink.getSample(target);if(sample){try{if(revision!==seekRevision)return;const vf=sample.toVideoFrame(),canvas=$('decoded'),ctx=canvas.getContext('2d');canvas.width=v.videoWidth||540;canvas.height=v.videoHeight||960;ctx.drawImage(vf,0,0,canvas.width,canvas.height);vf.close();canvas.dataset.frame=String(frame);canvas.dataset.sourceTime=String(sample.timestamp);canvas.hidden=false;}finally{sample.close();}}}catch(e){$('decoded').hidden=true;say('Exact-frame decode unavailable: '+e.message+'. Native seek is approximate.');}}}
$('play').onclick=async()=>{try{if(isPlaying()){pause();return;}if(compositionEnded)return say('End of timeline. Use Start or Go to frame.');if(project.canvas){if(!placedClips().some(c=>c.visible&&layers.media.has(c.id)))return say('Add or reconnect a layer to play.');tailClock.start(frame);$('play').textContent='Ⅱ Pause';draw();return;}if(!v.src)return say('Load a video first.');if(bedFrames&&frame>=bedFrames){startTail(frame);return;}++seekRevision;$('decoded').hidden=true;await v.play();$('play').textContent='Ⅱ Pause';}catch(e){say('Playback failed: '+e.message);}};
v.addEventListener('pause',()=>{if(!isPlaying())$('play').textContent='▶ Play';layers.update();});v.addEventListener('ended',()=>{if(bedFrames&&maxFrame>=bedFrames)startTail(bedFrames);else pause();});
function playback(){if(isPlaying()){const next=timelineFrame();frame=Math.max(0,Math.min(maxFrame,Math.floor(next+1e-5)));draw();if(tailClock.running&&next>=maxFrame+1){pause();compositionEnded=true;}}requestAnimationFrame(playback);}requestAnimationFrame(playback);
$('prev').onclick=()=>seek(frame-1);$('next').onclick=()=>seek(frame+1);$('seek').oninput=()=>seek(Number($('seek').value));$('select').onclick=()=>{const c=project.captions.find(x=>timed(x)&&frame>=x.inFrame&&frame<x.outFrame);if(c)choose(c.id);else say('No timed phrase at this frame. Tap an untimed phrase below.');};
$('text').onchange=()=>change(()=>{if(current())current().text=$('text').value;});
function boundary(which){const c=current();if(!c)return say('Select a phrase first.');change(()=>{c[which]=frame;if(c.inFrame!==null&&c.outFrame!==null&&c.outFrame<=c.inFrame)throw Error('OUT must be after IN. OUT is the first excluded frame.');delete c.originalTiming;});}
$('markIn').onclick=()=>boundary('inFrame');$('markOut').onclick=()=>boundary('outFrame');$('timing').onclick=()=>change(()=>{const c=current();if(!c)return;for(const k of ['inFrame','outFrame'])c[k]=$(k).value===''?null:Number($(k).value);delete c.originalTiming;});
$('add').onclick=()=>{const c=phrase('New caption');change(()=>{project.captions.push(c);selected=c.id;});};
$('visible').onclick=()=>change(()=>{if(current())current().visible=!current().visible;});
$('delete').onclick=()=>change(()=>{const i=project.captions.indexOf(current());if(i<0)return;project.captions.splice(i,1);selected=project.captions[Math.min(i,project.captions.length-1)]?.id||null;});
$('duplicate').onclick=()=>change(()=>{const c=current();if(!c)return;const copy=structuredClone(c);copy.id=crypto.randomUUID();project.captions.splice(project.captions.indexOf(c)+1,0,copy);selected=copy.id;});
for(const [id,delta] of [['up',-1],['down',1]])$(id).onclick=()=>change(()=>{const i=project.captions.indexOf(current()),j=i+delta;if(i>=0&&j>=0&&j<project.captions.length)[project.captions[i],project.captions[j]]=[project.captions[j],project.captions[i]];});
$('split').onclick=()=>{const c=current();if(!c)return say('Select a phrase first.');const pos=$('text').selectionStart;if(pos<=0||pos>=c.text.length)return say('Place the text cursor at the split, then tap Split.');if(timed(c)&&(frame<=c.inFrame||frame>=c.outFrame))return say('Seek inside this phrase to set the split frame.');change(()=>{const copy=structuredClone(c);copy.id=crypto.randomUUID();copy.text=c.text.slice(pos).trim();c.text=c.text.slice(0,pos).trim();if(timed(c)){copy.inFrame=frame;c.outFrame=frame;}else{copy.inFrame=null;copy.outFrame=null;}delete copy.originalTiming;delete c.originalTiming;project.captions.splice(project.captions.indexOf(c)+1,0,copy);selected=copy.id;});};
$('merge').onclick=()=>change(()=>{const c=current(),i=project.captions.indexOf(c),next=project.captions[i+1];if(!c||!next)return;if(timed(c)!==timed(next))throw Error('Time both phrases or leave both untimed before merging.');if(timed(c)&&(next.inFrame<c.inFrame||next.outFrame<c.outFrame))throw Error('Merge requires chronological adjacent phrases.');c.text+=' '+next.text;if(timed(c))c.outFrame=next.outFrame;delete c.originalTiming;project.captions.splice(i+1,1);});
$('undo').onclick=()=>history(undo,redo);$('redo').onclick=()=>history(redo,undo);
const descriptors={font:['Font',['Arial','Georgia','Verdana','Impact','monospace']],weight:['Weight',['400','700','900']],size:['Size · 540px reference','number',12,160,1],color:['Text color','color'],outline:['Black outline','number',0,16,1],shadow:['Shadow','number',0,24,1],background:['Background color','color'],backgroundOpacity:['Background opacity','number',0,1,.1],align:['Alignment',['left','center','right']],x:['Horizontal position %','number',0,100,1],y:['Vertical position %','number',0,100,1],width:['Maximum width %','number',20,100,1],lineHeight:['Line spacing','number',.8,2,.05],animation:['Entrance & exit',['none','fade','pop']],emphasis:['Emphasis',['false','true']]};
for(const [key,[label,type,min,max,step]] of Object.entries(descriptors)){const l=document.createElement('label');l.textContent=label;const el=document.createElement(Array.isArray(type)?'select':'input');el.id='style-'+key;if(Array.isArray(type)){for(const value of type){const o=document.createElement('option');o.value=value;o.textContent=value;el.append(o);}}else{el.type=type;if(type==='number'){el.min=min;el.max=max;el.step=step;}}l.append(el);$('styles').append(l);}
function fillStyle(s){for(const key of Object.keys(descriptors))$('style-'+key).value=String(s[key]);}
function readStyle(){const s={};for(const key of Object.keys(descriptors)){const val=$('style-'+key).value;s[key]=typeof DEFAULT_STYLE[key]==='number'?Number(val):key==='emphasis'?val==='true':val;}return validateStyle(s);}
$('all').onclick=()=>{try{const s=readStyle();change(()=>{project.globalStyle=s;});say('Global design updated. Explicit local overrides preserved.');}catch(e){say(e.message);}};
$('local').onclick=()=>{if(!current())return say('Select a phrase first.');try{const s=readStyle(),before=effective(project,current());change(()=>{for(const k of Object.keys(s))if(s[k]!==before[k])current().overrides[k]=s[k];});say('Changed properties applied only to selected phrase.');}catch(e){say(e.message);}};
$('reset').onclick=()=>change(()=>{if(current())current().overrides={};});$('safeToggle').onchange=()=>{$('safe').hidden=!$('safeToggle').checked;};
$('savePreset').onclick=()=>{const name=$('presetName').value.trim();if(!name||['__proto__','constructor','prototype'].includes(name))return say('Enter a preset name.');try{const s=readStyle();change(()=>{project.presets[name]=s;});}catch(e){say(e.message);}};
$('loadPreset').onclick=()=>{const s=project.presets[$('presets').value];if(s){fillStyle(s);say('Preset loaded. Choose Apply to all or Apply to selected.');}};
$('exportPresets').onclick=()=>download('CapLock-presets.json',JSON.stringify({schema:'GS-CapLock-Presets-1',presets:project.presets},null,2));
$('presetFile').onchange=async e=>{try{const raw=JSON.parse(await e.target.files[0].text());if(raw.schema!=='GS-CapLock-Presets-1')throw Error('Invalid preset file.');const next={...project.presets};for(const [n,s] of Object.entries(raw.presets)){if(['__proto__','constructor','prototype'].includes(n))throw Error('Invalid preset name.');next[n]=validateStyle(s);}change(()=>{project.presets=next;});}catch(e){say(e.message);}};
$('transcriptFile').onchange=async e=>{try{$('transcript').value=await e.target.files[0].text();say('Transcript loaded. Tap Segment & append.');}catch(e){say(e.message);}};
$('segment').onclick=()=>{try{const result=importTranscript($('transcript').value);if(!result.captions.length)return say('Enter a transcript first.');change(()=>{project.captions.push(...result.captions);selected=result.captions[0].id;});$('transcriptImport').open=false;$('timingStatus').textContent=result.timestamped?'Supplied cues retained; seconds quantized to nearest 25 fps boundary (≤20 ms). Original times saved in project.':'UNTIMED: natural phrases created. Mark IN / OUT manually; no speech alignment was inferred.';}catch(e){say(e.message);}};
async function api(path,options={}){const key=localStorage.getItem('gs_previewlock_key');if(!key)throw Error('PreviewLock connection unavailable in this browser. Open the connected PreviewLock library first.');const r=await fetch(API+path,{...options,headers:{Authorization:'Bearer '+key,...options.headers},signal:AbortSignal.timeout(65000)});const d=await r.json();if(!r.ok)throw Error(d.error||'PreviewLock returned '+r.status);return d;}
async function loadCloud(ref){pause();if(cloudSession&&!ref.path.startsWith('/Grill Sergeant/JokeLab Productions/'+cloudSession.id+'/'))ref=await storeCloudAsset(ref,null);const d=await api('/api/playback?path='+encodeURIComponent(ref.path));const r=await fetch(d.url);if(!r.ok)throw Error('Could not read source media: '+r.status);await loadMedia(await r.blob(),ref);}
async function inspectBed(blob,ref){
 say('Reading '+ref.name+'…');
 const meta=await inspectToolboxFile(blob,ref.name,{autoKey:false});
 if(meta.type!=='video')throw Error('Choose a video for Layer 0.');
 return meta;
}
async function addEditableBed(blob,ref,meta){
 const epoch=projectEpoch,migrating=!!project.media;
 const width=Math.max(2,Math.round(meta.width/2)*2),height=Math.max(2,Math.round(width*16/9/2)*2);
 const canvas={width,height,name:ref.name};
 const existing=project.toolbox.find(a=>a.type==='video'&&a.ref.kind===ref.kind&&a.ref.path===(ref.path||'')&&a.ref.name===ref.name&&a.ref.size===ref.size);
 const asset={...existing,id:existing?.id||crypto.randomUUID(),name:ref.name,ref:{...ref,path:ref.path||''},...meta};
 const clip=fitVideoPlacement(makeToolboxPlacement(asset,0,crypto.randomUUID()),asset,canvas);
 clip.volume=1;
 if(migrating){
  const {x,y,scale}=project.bedTransform;
  Object.assign(clip,{x,y,width:Math.max(5,Math.min(400,clip.width*scale)),holdLastFrame:true});
 }
 await layers.attach(clip,blob,{autoKey:false});
 if(epoch!==projectEpoch){layers.detach(clip.id);throw Error('Project changed while reading the video.');}
 if(existing)Object.assign(existing,asset);
 else project.toolbox.push(asset);
 toolboxUI?.remember(asset,blob);
 project.canvas=canvas;
 project.version=10;
 project.media=null;
 project.clips.unshift(clip);
 setProjectDrawer(false);
 selectClip(clip.id);
 render();
 saveDraft();
 await seek(0);
 say(ref.name+' opened as Layer 0. Use Add files to bring in captions, animations or sound.');
}
async function loadMedia(blob,ref){
 if(TOOLBOX_MODE&&!cloudSession&&ref.kind==='local'&&!project.canvas){
  const epoch=projectEpoch,meta=await inspectBed(blob,ref);
  if(epoch!==projectEpoch)throw Error('Project changed while reading the video.');
  return addEditableBed(blob,ref,meta);
 }
 const rev=++mediaRevision;bedBlob=blob;resetView();setProjectDrawer(false);undo=[];redo=[];pause();++seekRevision;input?.dispose();input=null;sink=null;if(mediaUrl)URL.revokeObjectURL(mediaUrl);mediaUrl=URL.createObjectURL(blob);$('decoded').hidden=true;v.src=mediaUrl;$('empty').hidden=true;$('bedLoader').classList.add('has-media');frame=0;maxFrame=0;bedFrames=0;bedEnd=0;compositionEnded=false;say('Inspecting source timing…');
 try{await new Promise((resolve,reject)=>{v.onloadedmetadata=resolve;v.onerror=()=>reject(Error('Video cannot decode in this browser.'));});if(rev!==mediaRevision)return;
  const M=await import('../sxlock/vendor/mediabunny-1.62.1-gs1.mjs');if(rev!==mediaRevision)return;input=new M.Input({source:new M.BlobSource(blob),formats:M.ALL_FORMATS});const track=await input.getPrimaryVideoTrack();if(!track)throw Error('No video track.');const timestamps=[];let end=0;for await(const packet of new M.EncodedPacketSink(track).packets(undefined,undefined,{metadataOnly:true})){if(rev!==mediaRevision)return;timestamps.push(packet.timestamp);end=Math.max(end,packet.timestamp+packet.duration);}timestamps.sort((a,b)=>a-b);if(!timestamps.length)throw Error('No source frames.');bedEnd=end;bedFrames=Math.max(1,Math.ceil((end-.000002)*FPS));syncExtent();
  const cfr25=timestamps.every((t,i)=>Math.abs(t-i/FPS)<.00001);const rate=timestamps.length/end;const ratio=v.videoWidth/v.videoHeight;const geometry=Math.abs(ratio-9/16)<.01?'9:16 source':'Non-9:16 source — contained in portrait, no crop';$('mediaStatus').textContent=`${ref.name} · ${v.videoWidth}×${v.videoHeight} · ${rate.toFixed(3)} source fps · ${cfr25?'25 fps timestamps verified':'Explicit time mapping: F / 25 seconds; source frames repeat or skip'} · ${geometry}.`;
  sink=new M.VideoSampleSink(track);project.media=ref;$('bedName').textContent=ref.name;saveDraft();await seek(0);say('Source loaded. Frame boundaries use the 25 fps production timeline.');
 }catch(e){if(rev!==mediaRevision)return;if(v.error||v.readyState<1){$('empty').hidden=false;$('bedLoader').classList.remove('has-media');$('mediaStatus').textContent='Import failed: '+e.message;say('Video could not be decoded. Original source and caption project remain unchanged.');render();return;}project.media=ref;bedEnd=Number.isFinite(v.duration)?v.duration:0;bedFrames=Math.ceil(bedEnd*FPS);syncExtent();$('mediaStatus').textContent='Native browser preview only; precise source timing not verified. '+e.message;saveDraft();say('Video loaded with approximate seeking. Exact decode unavailable.');}
 render();
}
$('videoFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(TOOLBOX_MODE){await loadDeviceVideo(f);return;}const old=project.media;if(old?.kind==='local'&&project.captions.length&&(old.name!==f.name||old.size!==f.size))if(!confirm('This is a different source. Keep existing caption timing with this source?'))return;if(cloudSession){const ref=await storeCloudAsset({name:f.name},f);await loadMedia(f,ref);}else await loadMedia(f,{kind:'local',name:f.name,size:f.size,lastModified:f.lastModified});}catch(error){say('Bed import not saved: '+error.message);}finally{e.target.value='';}};
$('save').onclick=()=>{project.captions.forEach(words);download('CapLock-project.json',JSON.stringify(project,null,2));dirty=false;$('saveStatus').textContent='Project download requested. Includes captions, styles and media references, not video bytes. Confirm it completed on your device. No cloud write performed.';};
async function openProject(raw){
 const p=validateProject(raw),epoch=++projectEpoch;
 restoring=true;
 $('playerDock').setAttribute('aria-busy','true');
 try{
  trimUI.close();closeClipProperties();toolboxUI?.reset();layers.clear();
  selectedClip=null;selectedWords=[];editMode='view';pause();
  ++mediaRevision;++seekRevision;input?.dispose();input=null;sink=null;
  if(mediaUrl)URL.revokeObjectURL(mediaUrl);
  mediaUrl=null;
  v.removeAttribute('src');v.load();$('decoded').hidden=true;
  $('empty').hidden=false;
  bedBlob=null;project=p;selected=p.captions[0]?.id||null;undo=[];redo=[];
  frame=0;maxFrame=0;bedFrames=0;bedEnd=0;compositionEnded=false;
  $('seek').max=0;
  render();
  let mediaError='';
  for(const c of p.clips){
   try{
    if(c.ref.kind==='previewlock')await loadCloudOverlay(c.ref,c);
    else if(toolboxUI&&p.canvas){
     const asset=p.toolbox.find(a=>a.id===c.toolboxId);
     const blob=asset&&await toolboxUI.cached(asset);
     if(epoch!==projectEpoch)return;
     if(blob)await layers.attach(c,blob,{autoKey:false});
    }
   }catch(e){mediaError=e.message;}
   if(epoch!==projectEpoch)return;
  }
  if(p.media?.kind==='previewlock'){
   try{await loadCloud(p.media);}catch(e){mediaError=e.message;}
  }
  if(epoch!==projectEpoch)return;
  selectedClip=p.captionSequence?.activeId||p.workspace?.selectedClip||p.clips[0]?.id;
  layers.selected=selectedClip;
  frame=p.workspace?.playhead??p.captionSequence?.playhead??0;
  render();
  const missing=p.clips.some(c=>c.ref.kind==='local'&&!layers.media.has(c.id))||p.media?.kind==='local'&&!bedBlob;
  say(mediaError?'Project restored. Media could not reconnect: '+mediaError:
   missing?'Project restored. Use Reconnect files to select the originals.':
   p.canvas?'Project restored from this device.':'Project restored.');
 }finally{
  if(epoch===projectEpoch){restoring=false;$('playerDock').setAttribute('aria-busy','false');}
 }
 saveDraft();
}

$('projectFile').onchange=async e=>{try{const raw=JSON.parse(await e.target.files[0].text());if(dirty&&!confirm('Replace current edit with this project?'))return;await openProject(raw);}catch(e){say('Open failed: '+e.message);}};
$('recover').onclick=async()=>{
 try{
  const raw=localStorage.getItem(draftSlot());
  if(!raw)return say('No browser draft found.');
  if(dirty&&!confirm('Replace current edit with the browser draft?'))return;
  await openProject(JSON.parse(raw));
 }catch(e){say('Recovery failed: '+e.message);}
};
for(const type of ['srt','vtt'])$(type).onclick=()=>{try{download('CapLock-captions.'+type,subtitle(project,type),'text/plain');say(type.toUpperCase()+' download requested. Subtitle files contain timing and text, not the visual design.');}catch(e){say(e.message);}};
function transform(){$('scene').style.transform='translate(0px,0px) scale(1)';}
function fitScene(){const r=$('viewport').getBoundingClientRect(),size=fitPortrait(r.width,r.height);$('scene').style.width=size.width+'px';$('scene').style.height=size.height+'px';}
function resetView(){fitScene();transform();}
new ResizeObserver(fitScene).observe($('viewport'));
$('fit').onclick=resetView;
function setProjectDrawer(open){$('playerDock').classList.toggle('drawer-closed',!open);$('dockGrip').setAttribute('aria-expanded',String(open));$('dockGrip').setAttribute('aria-label',open?'Hide project picker':'Reveal project picker');$('dockGrip').textContent=open?'⌃':'⌄';}
let drawerStart=null,drawerDragged=false;
$('dockGrip').onpointerdown=e=>{drawerStart={y:e.clientY,scroll:window.scrollY};drawerDragged=false;e.currentTarget.setPointerCapture(e.pointerId);};
$('dockGrip').onpointermove=e=>{if(drawerStart===null)return;const delta=e.clientY-drawerStart.y;if(Math.abs(delta)>30){drawerDragged=true;if(drawerStart.scroll>0){window.scrollTo(0,Math.max(0,drawerStart.scroll-delta));return;}setProjectDrawer(delta>0);}};
$('dockGrip').onpointerup=()=>{drawerStart=null;};$('dockGrip').onpointercancel=()=>{drawerStart=null;};
$('dockGrip').onclick=()=>{if(drawerDragged){drawerDragged=false;return;}setProjectDrawer($('playerDock').classList.contains('drawer-closed'));};
function setFocus(target,id){
 pause();
 if(project.canvas&&target==='bed'){target=project.clips.length?'overlay':'none';id=project.clips[0]?.id;}
 const priorFocus=project.editFocus;
 project.editFocus=target;
 if(target==='none'||TOOLBOX_MODE&&target==='bed'&&priorFocus!=='bed')editMode='view';
 if(target==='overlay'&&id)selectClip(id);else renderClips();
 paintFocus();layers.update();saveDraft();
}
function focusedTarget(){if(project.editFocus==='none')return null;const c=clipCurrent();if(project.canvas)return c?{target:c,bed:false}:null;return project.editFocus==='overlay'&&c?{target:c,bed:false}:{target:project.bedTransform,bed:true};}
function paintFocus(){
 $('bedDeviceLoad').hidden=!v.src&&!project.canvas;
 $('bedSurface').hidden=!!project.canvas;
 $('focusBed').textContent=project.canvas?'Layer 0':'Bed';
 $('focusBed').disabled=!!project.canvas&&!project.clips.length;
 const bed=project.bedTransform||{x:50,y:50,scale:1};$('bedSurface').style.transform=`translate(${bed.x-50}%,${bed.y-50}%) scale(${bed.scale})`;$('bedSurface').classList.toggle('focused-bed',project.editFocus==='bed');
 const c=clipCurrent(),overlay=project.editFocus==='overlay'&&!!c;
 if(TOOLBOX_MODE)$('focusReset').textContent=project.canvas?'Fit':overlay?'Reset size':'Fit bed';
 $('focusBed').setAttribute('aria-pressed',String(project.canvas?overlay&&c===project.clips[0]:project.editFocus==='bed'));
 $('focusOverlay').setAttribute('aria-pressed',String(overlay));$('focusOverlay').disabled=!c;
 $('focusSize').textContent=project.editFocus==='none'?'No selection':overlay?(project.canvas?'Layer '+placedClips().indexOf(c):'Overlay')+' · '+Math.round(c.width)+'%':'Bed · '+Math.round(bed.scale*100)+'%';
 for(const id of ['focusSmaller','focusLarger','focusReset'])$(id).disabled=project.editFocus==='none'||(overlay&&c.locked)||!!project.canvas&&!c;
}
function scaleFocused(ratio){pause();const f=focusedTarget();if(!f)return;if(f.target.locked)return say('Unlock this placement before resizing.');change(()=>Object.assign(f.target,scaledTarget(f.target,ratio,{bed:f.bed})));}
$('clearFocus').onclick=()=>setFocus('none');
$('focusBed').onclick=()=>setFocus('bed');$('focusOverlay').onclick=()=>{if(clipCurrent())setFocus('overlay',selectedClip);};$('focusSmaller').onclick=()=>scaleFocused(.8);$('focusLarger').onclick=()=>scaleFocused(1.25);
$('focusReset').onclick=()=>{const f=focusedTarget();if(!f||f.target.locked)return;if(project.canvas&&f.target.type==='video')return fitSelectedVideo();change(()=>{if(f.bed)Object.assign(f.target,{x:50,y:50,scale:1});else f.target.width=90;});};
const layers=new LayerTracks($('layerRoot'),{getClips:()=>project.clips,getFrame:()=>frame,getPlayhead:timelineFrame,isPlaying,getStagedId:()=>activeCaption(project)?.placed?null:project.captionSequence?.activeId,getMode:()=>editMode,isFocused:()=>project.editFocus==='overlay',onSelect:id=>selectClip(id),onStatus:say,onDragStart:()=>{dragBefore=JSON.stringify(project);},onChange:()=>{if(dragBefore){undo.push(dragBefore);redo=[];dragBefore=null;saveDraft();render();}}});
new MutationObserver(()=>{if(tailClock.running&&!$('playerDock').classList.contains('drawer-closed'))pause();}).observe($('playerDock'),{attributes:true,attributeFilter:['class']});
let focusBefore=null;
const focusGestures=new FocusGestures($('viewport'),{getTarget:focusedTarget,getSceneRect:()=>$('scene').getBoundingClientRect(),focus:(id,bedHit)=>setFocus(id?'overlay':bedHit?'bed':'none',id),getMode:()=>editMode,onStart:()=>{focusBefore=JSON.stringify(project);},onUpdate:()=>{paintFocus();layers.update();},onLocked:()=>say('Caption placement locked. Use Unlock placement to resize.'),onCommit:changed=>{if(changed&&focusBefore){const before=focusBefore;focusBefore=null;try{validateProject(project);undo.push(before);redo=[];saveDraft();render();}catch(e){project=JSON.parse(before);render();say(e.message);}}else focusBefore=null;}});
function showPage(which){if(BUILTIN_CAPTIONING_LOCKED&&which==='script'){say('Built-in captioning is locked. Import the Gemini-created animation.');which='viewer';}$('scriptPage').hidden=which!=='script';$('viewerPage').hidden=which!=='viewer';if(which==='script')pause();window.scrollTo(0,0);}
$('openViewer').onclick=()=>showPage('viewer');$('backScript').onclick=()=>{$('nativeTools').open=false;showPage('script');};$('bedLoad').onclick=()=>projectPicker.open();$('railImport').onclick=()=>openCaptionImport();
function renderScript(){
 const root=$('scriptList'),wordEditor=$('wordEditor');root.before(wordEditor);root.replaceChildren();for(const [i,c] of project.captions.entries()){
  const row=document.createElement('article');row.className='spoken-phrase'+(c.id===selected?' chosen':'');row.dataset.phraseId=c.id;const heading=document.createElement('div');heading.className='phrase-heading';const label=document.createElement('span');label.textContent=`Phrase ${i+1} · ${timed(c)?'F'+c.inFrame+'–'+c.outFrame:'Untimed'}${c.timingReview?' · review speech timing':''}`;const button=document.createElement('button');button.textContent='Select phrase';button.onclick=()=>{choose(c.id);$('wordEditor').open=true;};heading.append(label,button);const line=document.createElement('div');line.className='phrase-words';
  for(const w of words(c)){const b=document.createElement('button');b.className='word'+(w.effect?' has-effect':'');b.textContent=w.text;b.dataset.wordId=w.id;b.setAttribute('aria-pressed',String(selected===c.id&&selectedWords.includes(w.id)));b.title=w.effect||'Select word';b.onclick=()=>{if(selected!==c.id){selected=c.id;selectedWords=[];}selectedWords=selectedWords.includes(w.id)?selectedWords.filter(id=>id!==w.id):[...selectedWords,w.id];render();$('wordEditor').open=true;};line.append(b);}
  row.append(heading,line);root.append(row);if(c.id===selected)row.after(wordEditor);
 }
 const c=current();$('wordEditor').hidden=!c;$('wordSelection').textContent=c?`Phrase ${project.captions.indexOf(c)+1} · ${selectedWords.length} word${selectedWords.length===1?'':'s'} selected`:'Select a phrase or words';$('scriptText').value=c?.text||'';$('segmentDirection').value=c?.direction||'';$('inheritProtocol').checked=c?.useProtocol!==false;$('wordEffect').value=c&&selectedWords.length?words(c).find(w=>selectedWords.includes(w.id))?.effect||'':'';$('protocolText').value=project.protocol.text;$('approveProtocol').checked=project.protocol.approved;$('protocolStatus').textContent=project.protocol.approved?'Approved visual protocol · each segment can override it':'Draft visual protocol · first-look review pending';$('promptOutput').value=c?geminiPrompt(project,c):'Select a phrase to prepare its Gemini prompt.';$('showNative').checked=!BUILTIN_CAPTIONING_LOCKED&&project.nativeCaptions;
 for(const id of ['scriptUndo','layerUndo'])$(id).disabled=!undo.length;for(const id of ['scriptRedo','layerRedo'])$(id).disabled=!redo.length;
}
$('scriptText').onchange=()=>change(()=>{if(current()){current().text=$('scriptText').value;words(current());current().timingReview=timed(current());selectedWords=[];}});
$('segmentDirection').onchange=()=>change(()=>{if(current())current().direction=$('segmentDirection').value;});$('inheritProtocol').onchange=()=>change(()=>{if(current())current().useProtocol=$('inheritProtocol').checked;});
$('protocolText').onchange=()=>change(()=>{project.protocol.text=$('protocolText').value;project.protocol.approved=false;});$('approveProtocol').onchange=()=>change(()=>{project.protocol.approved=$('approveProtocol').checked;});
$('setWordEffect').onclick=()=>{if(!selectedWords.length)return say('Select the words that need this treatment.');change(()=>{for(const w of words(current()))if(selectedWords.includes(w.id))w.effect=$('wordEffect').value;});};
$('wordClear').onclick=()=>{selectedWords=[];renderScript();};
for(const [id,delta] of [['wordLeft',-1],['wordRight',1]])$(id).onclick=()=>{if(!current()||!selectedWords.length)return say('Select words first.');change(()=>shiftWords(current(),selectedWords,delta));};
for(const [id,delta] of [['wordPrevious',-1],['wordNext',1]])$(id).onclick=()=>{const c=current(),target=project.captions[project.captions.indexOf(c)+delta];if(!c||!target||!selectedWords.length)return say('Select words and an existing neighboring phrase.');change(()=>{moveWords(c,target,selectedWords,delta>0?'start':'end');selected=target.id;});};
$('wordNew').onclick=()=>{const c=current();if(!c||!selectedWords.length)return say('Select words first.');change(()=>{const target=phrase('');target.words=[];moveWords(c,target,selectedWords);project.captions.splice(project.captions.indexOf(c)+1,0,target);selected=target.id;});};
for(const prefix of ['script','layer']){$(prefix+'Undo').onclick=()=>history(undo,redo);$(prefix+'Redo').onclick=()=>history(redo,undo);}
$('copyPrompt').onclick=async()=>{if(!current())return say('Select a phrase first.');const text=geminiPrompt(project,current());$('promptOutput').value=text;try{await navigator.clipboard.writeText(text);say('Gemini prompt copied. Paste it into your Gemini project.');}catch{$('promptOutput').focus();$('promptOutput').select();say('Prompt selected. Use Copy, then paste in Gemini.');}};
function lockBuiltInCaptioning(){
 if(!BUILTIN_CAPTIONING_LOCKED)return;
 const blocked=e=>{e?.preventDefault();e?.stopImmediatePropagation();};
 for(const id of ['nativeTools','scriptPage']){const panel=$(id);panel.hidden=true;panel.inert=true;panel.setAttribute('aria-hidden','true');if(id==='nativeTools')panel.open=false;
  if(!panel.dataset.ownerLocked){for(const type of ['click','input','change','submit'])panel.addEventListener(type,blocked,true);panel.dataset.ownerLocked='true';}
  for(const control of panel.querySelectorAll('button,input,textarea,select,a')){control.disabled=true;control.tabIndex=-1;control.onclick=control.oninput=control.onchange=blocked;}
 }
 for(const id of ['srt','vtt']){const control=$(id);control.hidden=true;control.disabled=true;control.onclick=blocked;}
 $('showNative').checked=false;$('captions').replaceChildren();
}
$('showNative').onchange=e=>{if(BUILTIN_CAPTIONING_LOCKED){e.target.checked=false;return;}change(()=>{project.nativeCaptions=$('showNative').checked;});};
const clipFields={clipStart:'inFrame',clipEnd:'outFrame',clipTrim:'trimInFrame',clipTrimOut:'trimOutFrame',clipSpeed:'playbackRate',clipWidth:'width',clipX:'x',clipY:'y',clipOpacity:'opacity',clipVolume:'volume',clipRotation:'rotation'};
const orientationButtons=[['clipMirror','mirrorX'],['clipFlip','flipY']];
const clipCurrent=()=>project.clips.find(c=>c.id===selectedClip);
const trimUI=createTrimDialog((clip,range,timing)=>{
 if(clipCurrent()!==clip||clip.locked)return false;
 pause();
 return change(()=>{
  clip.sourceTrim=range;
  clip.sourceFrames=timing.times.length;
  clip.sourceDuration=timing.end;
  if(range.inFrame!==0||range.outFrame!==clip.sourceFrames)delete clip.holdLastFrame;
  setPlacementSpeed(clip,rateOf(clip));
  project.version=10;
 });
});
$('openTrim').onclick=()=>{
 const clip=clipCurrent(),media=layers.media.get(clip?.id);
 if(clip?.type==='video'&&!clip.locked&&media){pause();void trimUI.open(clip,media);}
};
function fitSelectedVideo(){
 const clip=clipCurrent(),video=layers.media.get(clip?.id)?.el;
 if(project.canvas&&clip?.type==='video'&&!clip.locked&&video?.videoWidth){
  change(()=>fitVideoPlacement(clip,{width:video.videoWidth,height:video.videoHeight},project.canvas));
 }
}
$('clipFit').onclick=fitSelectedVideo;
function selectClip(id){pause();if(!restoring){project.editFocus='overlay';if(project.captionSequence?.clipIds.includes(id))project.captionSequence.activeId=id;}if(id!==selectedClip)editMode='view';selectedClip=id;layers.selected=id;renderClips();paintFocus();layers.update();}
function openClipProperties(id){selectClip(id);const c=clipCurrent();if(!c)return;if(v.src&&!TOOLBOX_MODE)seek(c.inFrame);$('clipPropertiesTitle').textContent=(project.canvas?'Layer '+placedClips().indexOf(c)+' · ':'Edit · ')+c.name;$('viewport').scrollIntoView({block:'start',behavior:'instant'});if(!$('clipProperties').open)$('clipProperties').showModal();renderSourceSound(c);}
function closeClipProperties(){if($('clipProperties').open)$('clipProperties').close();}
function removeItem(id){pause();change(()=>{project.clips=project.clips.filter(c=>c.id!==id);if(project.captionSequence?.clipIds.includes(id)){const seq=project.captionSequence,index=seq.clipIds.indexOf(id);seq.clipIds=seq.clipIds.filter(x=>x!==id);seq.preparedIds=seq.preparedIds.filter(x=>x!==id);if(!seq.clipIds.length)delete project.captionSequence;else if(seq.activeId===id)seq.activeId=seq.clipIds[Math.min(index,seq.clipIds.length-1)];}if(selectedClip===id){selectedClip=project.clips[0]?.id||null;layers.selected=selectedClip;editMode='view';}});closeClipProperties();}
function renderSourceSound(c){const m=layers.media.get(c?.id);if(!c||!m||c.volume<=0||c.type==='image')return;if(!m.audioInfo&&!m.audioError&&!m.audioReading){m.audioReading=true;inspectSourceAudio(m.blob).then(info=>m.audioInfo=info).catch(e=>m.audioError=e.message).finally(()=>{m.audioReading=false;if(layers.media.get(c.id)===m&&clipCurrent()?.id===c.id)renderClips();});}const info=m.audioInfo;if(m.audioReading)$('clipVolumeInfo').textContent='Checking source audio…';else if(m.audioError)$('clipVolumeInfo').textContent='Source audio check: '+m.audioError;else if(info?.hasAudio===false)$('clipVolumeInfo').textContent='This file has no audio track.';else if(info?.silent)$('clipVolumeInfo').textContent='This file’s audio track is silent.';else if(info?.peak<.001)$('clipVolumeInfo').textContent='Very quiet source audio · '+Math.round(c.volume*100)+'%';else if(info?.firstSound>=.2)$('clipVolumeInfo').textContent='Clip audio · '+Math.round(c.volume*100)+'% · source sound starts near '+info.firstSound.toFixed(2)+'s';}
function renderClips(){
 if(!clipCurrent()){selectedClip=project.clips[0]?.id||null;layers.selected=selectedClip;if(project.editFocus==='overlay')editMode='view';}
 const c=clipCurrent(),placed=placedClips(),assembly=!!project.canvas;
 $('clipPropertiesTitle').textContent=c?(assembly?'Layer '+placed.indexOf(c)+' · ':'Edit · ')+c.name:'Edit layer';
 $('openTrim').hidden=c?.type!=='video';
 $('openTrim').disabled=!!c?.locked||!layers.media.has(c?.id);
 $('replaceVideo').hidden=!assembly||!TOOLBOX_MODE||c?.type!=='video';
 $('replaceVideo').disabled=!!c?.locked;
 $('clipFit').hidden=!assembly||c?.type!=='video';
 $('clipFit').disabled=!!c?.locked||!layers.media.has(c?.id);
 $('clipTrim').closest('label').hidden=TOOLBOX_MODE||!!c?.sourceTrim;
 $('clipTrimOut').closest('label').hidden=TOOLBOX_MODE||!!c?.sourceTrim;
 $('produceCaptioned').hidden=assembly;
 $('cloudExportHint').hidden=assembly;
 $('placeClip').hidden=!!c?.captionNumber;
 $('clipFields').hidden=!c;
 $('clipModes').hidden=!c;
 $('clipSettingsActions').hidden=!c;
 $('clipSelect').replaceChildren();
 $('clipTimeline').replaceChildren();
 $('itemCount').textContent=placed.length;
 $('itemEmpty').hidden=!!placed.length;
 $('clipName').value=c?.name||'';
 const key=c?.chroma||{...DEFAULT_CHROMA,enabled:false};
 $('captionBackground').hidden=!c||c.type==='audio';
 $('chromaEnabled').checked=key.enabled;
 $('chromaColor').value=key.color;
 $('chromaSimilarity').value=Math.round(key.similarity*100);
 $('chromaBlend').value=Math.round(key.blend*100);
 for(const [index,t] of placed.entries()){
  const option=document.createElement('option');
  option.value=t.id;
  option.textContent=t.name;
  $('clipSelect').append(option);
  const row=document.createElement('div');
  row.className='item-row'+(t.locked?' locked-placement':'');
  const open=document.createElement('button'),title=document.createElement('span'),details=document.createElement('small');
  open.className='item-open';
  title.textContent=(assembly?'Layer '+index+' · ':'')+t.name;
  details.textContent=`F${t.inFrame}–${t.outFrame} · ${rateOf(t).toFixed(3)}x${t.sourceFrames?' · '+t.sourceFrames+(t.type==='audio'?' timeline frames':' source frames'):''}${t.locked?' · locked':''}${t.visible?'':' · hidden'}${layers.media.has(t.id)?'':' · reconnect media'}`;
  open.append(title,details);
  open.setAttribute('aria-pressed',String(t.id===selectedClip));
  open.onclick=()=>openClipProperties(t.id);
  row.append(open);
  const actions=[
   [t.visible?'◉':'○',(t.visible?'Hide ':'Show ')+t.name,()=>{pause();change(()=>{t.visible=!t.visible;});}],
   ['↤','Go to start of '+t.name,()=>{selectClip(t.id);seek(t.inFrame);}],
   ['✕','Remove '+t.name,()=>removeItem(t.id)]
  ];
  for(const [label,description,run] of actions){
   const action=document.createElement('button');
   action.className='item-action';
   action.textContent=label;
   action.setAttribute('aria-label',description);
   action.onclick=run;
   row.append(action);
  }
  $('clipTimeline').append(row);
 }
 $('clipSelect').value=selectedClip||'';for(const [id,key] of Object.entries(clipFields)){$(id).value=c?(key==='volume'?c.volume*100:c[key]??''):'';$(id).disabled=!c||c.locked||(id==='clipRotation'&&editMode!=='rotate');}if(c)$('clipLoop').checked=c.loop;
 for(const [id,key] of orientationButtons){
  const button=$(id);if(!button)continue;
  button.hidden=c?.type==='audio';
  button.disabled=!c||c.locked||c.type==='audio';
  button.setAttribute('aria-pressed',String(c?.[key]===true));
 }
 $('clipVolumeRow').hidden=!c||c.type==='image';const sound=project.toolbox?.find(a=>a.id===c?.toolboxId)?.hasAudio;for(const id of ['clipVolume','clipVolumeDown','clipVolumeUp'])$(id).disabled=!c||c.locked||c.type==='image'||sound===false;$('clipVolumeInfo').textContent=sound===false?'This file has no audio track.':c?.volume?'Clip audio · '+(c.volume*100).toFixed(0)+'%':'Muted · set a volume to hear this clip.';
 if($('clipProperties').open)renderSourceSound(c);
 $('speedTools').hidden=!c||c.type==='image';$('clipSpeed').closest('label').hidden=c?.type==='image';$('clipSpeedInfo').textContent=c?`Playback ${rateOf(c).toFixed(3)}×`:'';
 for(const [id,mode] of [['viewMode','view'],['moveMode','move'],['rotateMode','rotate']])$(id).setAttribute('aria-pressed',String(editMode===mode));$('layerRoot').className='edit-'+editMode;$('railMove').setAttribute('aria-pressed',String(editMode==='move'));$('railRotate').setAttribute('aria-pressed',String(editMode==='rotate'));
 $('unlockClip').hidden=!c?.locked;for(const id of ['applyClip','square','speedDown','speedUp','speedReset','speedFit','placeClip'])$(id).disabled=!!c?.locked;renderPlacement();$('clipStatus').textContent=c?`${c.name} · ${layers.media.has(c.id)?'Media connected':'Reselect this original file to reconnect'} · ${editMode==='rotate'?'Rotate unlocked. Square returns to exactly 0°.':'Rotation locked. Select Rotate to rotate.'}`:'Import transparent WebM animations or PNG graphics. Video clips start muted. Clip audio % controls their original sound.';
}
$('clipSelect').onchange=()=>selectClip($('clipSelect').value);for(const [id,mode] of [['viewMode','view'],['moveMode','move'],['rotateMode','rotate']])$(id).onclick=()=>{if(mode!=='view'&&!clipCurrent())return say('Select a clip first.');pause();editMode=mode;renderClips();if(mode==='move'||mode==='rotate'&&!project.canvas)closeClipProperties();};
for(const [id,key] of orientationButtons)$(id)?.addEventListener('click',()=>change(()=>{
 const c=clipCurrent();
 if(!c||c.locked||c.type==='audio')return;
 if(c[key])delete c[key];
 else{c[key]=true;project.version=Math.max(project.version,9);}
}));
$('applyClip').onclick=()=>change(()=>{const c=clipCurrent();if(!c)return;c.name=$('clipName').value.trim()||c.name;for(const [id,key] of Object.entries(clipFields))if((key!=='rotation'||editMode==='rotate')&&(!['trimInFrame','trimOutFrame'].includes(key)||!c.sourceTrim))c[key]=key==='trimOutFrame'&&$(id).value===''?null:key==='volume'?percentGain($(id).value):Number($(id).value);c.loop=$('clipLoop').checked;});
$('clipVolume').onchange=()=>$('applyClip').click();for(const [id,delta]of [['clipVolumeDown',-5],['clipVolumeUp',5]])$(id).onclick=()=>{$('clipVolume').value=String(Math.max(0,Math.min(100,Number($('clipVolume').value)+delta)));$('applyClip').click();};
function applyBackground(){change(()=>{const c=clipCurrent();if(c)c.chroma={enabled:$('chromaEnabled').checked,color:$('chromaColor').value,similarity:Number($('chromaSimilarity').value)/100,blend:Number($('chromaBlend').value)/100};});}
for(const id of ['chromaEnabled','chromaColor','chromaSimilarity','chromaBlend'])$(id).onchange=()=>{if(id!=='chromaEnabled')$('chromaEnabled').checked=true;applyBackground();};
$('chromaAuto').onclick=()=>{const c=clipCurrent(),m=layers.media.get(c?.id);if(!c||!m)return;try{const key=detectBackground(m.el);if(!key)return say('No uniform solid background detected. Choose its color in Caption background.');change(()=>{c.chroma=key;});say('Solid background detected and removed.');}catch(e){say('Background detection failed: '+e.message);}};
$('clipSpeed').onchange=()=>change(()=>{if(clipCurrent())clipCurrent().playbackRate=Number($('clipSpeed').value);});
 for(const [id,delta] of [['speedDown',-.01],['speedUp',.01]])$(id).onclick=()=>change(()=>{const c=clipCurrent();if(c)c.playbackRate=Math.min(8,Math.max(.1,Math.round((rateOf(c)+delta)*1000)/1000));});
 $('speedReset').onclick=()=>change(()=>{if(clipCurrent())clipCurrent().playbackRate=1;});
 $('speedFit').onclick=()=>change(()=>{const c=clipCurrent();if(c)c.playbackRate=fitRate(c,layers.media.get(c.id)?.el.duration);});
 $('square').onclick=()=>change(()=>{if(clipCurrent())clipCurrent().rotation=0;});
for(const [id,key] of [['clipMarkIn','inFrame'],['clipMarkOut','outFrame']])$(id).onclick=()=>{if(!clipCurrent())return say('Select an animation clip first.');change(()=>{clipCurrent()[key]=frame;});};
$('clipVisible').onclick=()=>change(()=>{if(clipCurrent())clipCurrent().visible=!clipCurrent().visible;});
$('removeClip').onclick=()=>removeItem(selectedClip);
for(const [id,delta] of [['clipBack',-1],['clipFront',1]])$(id).onclick=()=>change(()=>{const i=project.clips.indexOf(clipCurrent()),j=i+delta;if(i>=0&&j>=0&&j<project.clips.length)[project.clips[i],project.clips[j]]=[project.clips[j],project.clips[i]];});
async function importLayer(blob,ref,restore=null,{staged=false}={}){
 pause();
 const epoch=projectEpoch;const type=/\.(png|webp)$/i.test(ref.name)?'image':/\.(wav|mp3|m4a|aac|ogg)$/i.test(ref.name)?'audio':'video';
 if(cloudSession&&ref.kind==='local')ref=await storeCloudAsset(ref,blob,type==='audio'?'voice':'animation');
 const reconnect=restore||(!staged&&project.clips.find(c=>c.ref.kind==='local'&&c.ref.name===ref.name&&c.ref.size===ref.size&&!layers.media.has(c.id)));
 const start=current()?.inFrame??frame;const c=reconnect||{id:crypto.randomUUID(),name:ref.name,phraseId:selected||'',type,ref,inFrame:start,outFrame:start+50,trimInFrame:0,trimOutFrame:null,playbackRate:1,x:50,y:75,width:90,rotation:0,opacity:1,volume:type==='audio'?1:0,visible:true,loop:false};
 const duration=await layers.attach(c,blob,{autoKey:type!=='audio'&&(!reconnect||!!c.captionNumber&&!c.chroma)});if(epoch!==projectEpoch){layers.detach(c.id);throw Error('Import cancelled because project changed.');}
 if(!reconnect){c.trimOutFrame=Math.max(1,Math.round(duration*25));c.outFrame=timed(current()||{})?current().outFrame:start+Math.max(1,Math.ceil(duration*25));if(staged){c.placed=false;c.locked=false;c.visible=false;return c;}if(!change(()=>{project.clips.push(c);selectedClip=c.id;})){layers.detach(c.id);throw Error('Layer could not be added to this project.');}}else{selectedClip=c.id;render();}selectClip(c.id);saveDraft();say('Layer connected. Source time maps in seconds to the25fps timeline. Solid caption backgrounds are removed automatically; existing transparency stays intact.');return c;
}
$('overlayFile').onchange=async e=>{try{for(const file of e.target.files||[])await importLayer(file,{kind:'local',name:file.name,size:file.size});e.target.value='';if($('captionImport').open)$('captionImport').close();}catch(error){say('Overlay import not saved: '+error.message);}};
async function loadCloudOverlay(ref,restore=null){pause();if(cloudSession&&!ref.path.startsWith('/Grill Sergeant/JokeLab Productions/'+cloudSession.id+'/'))ref=await storeCloudAsset(ref,null,/\.(wav|mp3|m4a|aac|ogg)$/i.test(ref.name)?'voice':'animation');const d=await api('/api/playback?path='+encodeURIComponent(ref.path));const r=await fetch(d.url);if(!r.ok)throw Error('Clip download failed: '+r.status);await importLayer(await r.blob(),ref,restore);}
$('overlayLibrary').onclick=()=>openCaptionImport();$('railMove').onclick=()=>{if(project.editFocus==='bed'){pause();editMode=editMode==='move'?'view':'move';renderClips();return;}if(editMode==='move')$('viewMode').click();else $('moveMode').click();};$('railRotate').onclick=()=>{if(project.editFocus==='bed')return say('Select an overlay to rotate it.');if(editMode==='rotate')$('viewMode').click();else $('rotateMode').click();};

window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
render();showPage('viewer');
try{
 localDraftAvailable=!!localStorage.getItem(draftKey);
 if(localStorage.getItem(draftSlot())){
  $('saveStatus').textContent='A draft is available on this device.';
  render();
 }
}catch{$('saveStatus').textContent='Browser recovery storage unavailable. Download your project to save edits.';}
if(params.get('recover')==='local'){try{const raw=localStorage.getItem(draftKey);if(raw){if(params.get('fitBed')==='1')archiveWorkspace();openProject(JSON.parse(raw)).then(()=>{if(params.get('fitBed')==='1')change(()=>{
 const bed=project.clips[0],source=project.toolbox.find(a=>a.id===bed?.toolboxId);
 if(project.canvas&&bed?.type==='video'&&source?.width)fitVideoPlacement(bed,source,project.canvas);
 else if(!project.canvas)Object.assign(project.bedTransform,{x:50,y:50,scale:1});
 });
 const missing=project.clips.some(c=>c.ref.kind==='local'&&!layers.media.has(c.id))||project.media?.kind==='local'&&!bedBlob;
 say(missing?'Saved placements restored. Reconnect files to select the originals.':'Saved placements restored from this device.');}).catch(e=>say('Recovery failed: '+e.message));}}catch(e){say('Recovery failed: '+e.message);}}if(params.get('assetPath'))loadCloud({kind:'previewlock',path:params.get('assetPath'),name:params.get('name')||params.get('assetPath').split('/').pop()}).catch(e=>say(e.message));

// Project-folder handoff: numbered cloud caplets are loaded as an unplaced tray.
async function saveCloudWorkspace(){
 if(!cloudSession)throw Error('Open a joke project to save to its folder.');
 const session=cloudSession;
 cloudWrite=cloudWrite.catch(()=>{}).then(async()=>{if(cloudSession!==session)return;cloudSaving=true;try{project.workspace={id:session.id,assetId:session.asset,playhead:frame,selectedClip:selectedClip||''};const snapshot=JSON.stringify(project);const d=await api('/api/joke-project/caplock?id='+encodeURIComponent(session.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rev:session.rev,session:JSON.parse(snapshot)})});if(cloudSession!==session)return;session.rev=d.rev;if(d.project)projectContext=d.project;if(snapshot===JSON.stringify(project))dirty=false;$('saveStatus').textContent='CapLock workspace saved in Dropbox. Drive backup queued.';}finally{cloudSaving=false;}});return cloudWrite;
}
async function storeCloudAsset(ref,file,role='bed'){
 const session=cloudSession;
 clearTimeout(cloudTimer);
 cloudWrite=cloudWrite.catch(()=>{}).then(async()=>{
  if(!session||cloudSession!==session)throw Error('The project changed before the asset could be saved.');
  const route='/api/joke-project/asset?id='+encodeURIComponent(session.id)+'&role='+encodeURIComponent(role)+'&name='+encodeURIComponent(ref.name)+(file?'':'&source='+encodeURIComponent(ref.path));
  const d=await api(route,{method:'POST',...(file?{headers:{'content-type':'application/octet-stream'},body:file}:{})});
  if(cloudSession!==session)throw Error('The project changed while the asset was saving.');
  session.rev=d.rev;
  if(d.project)projectContext=d.project;
  return {kind:'previewlock',name:d.asset.name,path:d.asset.path,size:d.asset.size};
 });
 return cloudWrite;
}
$('saveCloud').onclick=()=>saveCloudWorkspace().catch(e=>{$('saveStatus').textContent='Save failed: '+e.message;});
$('placeClip').onclick=()=>change(()=>{const c=clipCurrent();if(!c)return;const length=c.outFrame-c.inFrame;c.inFrame=frame;c.outFrame=frame+length;c.visible=true;});
async function openJokeWorkspace(id,assetId){
 const selection=sourceSelection;
 pause();if(cloudSession&&dirty){clearTimeout(cloudTimer);await saveCloudWorkspace();}await cloudWrite.catch(()=>{});const d=await api('/api/joke-project/caplock?id='+encodeURIComponent(id)+'&asset='+encodeURIComponent(assetId));if(selection!==sourceSelection)throw Error('A device file was selected while the cloud project was opening.');archiveWorkspace(cloudPreviousKey,cloudDraftKey);cloudSession=null;clearTimeout(cloudTimer);
 let next=withCaptionBatch(d.session,d.project,d.asset);const savedFocus=d.session?.captionSequence?.source?.cutId===d.asset.cuts.id&&d.session.version>=5?d.session.editFocus:'overlay';
 projectContext=d.project;await openProject(next);cloudSession={id,asset:assetId,rev:d.rev};showPage('viewer');selectedClip=project.captionSequence.activeId;layers.selected=selectedClip;editMode=savedFocus==='none'?'view':'move';project.editFocus=savedFocus;render();await seek(next.workspace?.playhead||0);$('saveCloud').hidden=false;localStorage.setItem('gs_studio_project',id);localStorage.setItem('gs_caplock_caption_project',id);localStorage.setItem('gs_caplock_caption_asset',assetId);importState={project:d.project,id,assetId};renderCaptionImport();await saveCloudWorkspace();say('Caption components ready in '+d.project.title+'. Previous / Next choose a caption; Insert places it.');
}
$('previousWorkspace').onclick=async()=>{
 try{
  const key=archiveSlot(),list=JSON.parse(localStorage.getItem(key)||'[]'),last=list.pop();
  if(!last)return say('No earlier workspace archived.');
  cloudSession=null;projectContext=null;clearTimeout(cloudTimer);$('saveCloud').hidden=true;
  await openProject(last.project);
  localStorage.setItem(key,JSON.stringify(list));
  showPage('viewer');
  say('Earlier workspace restored.');
 }catch(e){say(e.message);}
};


const projectPicker=createProjectPicker({
 api,onPause:pause,onOpenProject:openJokeletProject,onLocal:()=>$('newVideoFiles').click(),
 showLocal:true,localLabel:'Open video file',deferAssets:true,
 hasProject:()=>!!project.media||!!project.canvas||!!project.workspace,
 extraProjects:listCutProjects,extraMedia:readCutVideo,module:'captions',
 async onUseAsset(p,a){
  if(!p){
   const d=await api('/api/playback?path='+encodeURIComponent(a.path));
   const r=await fetch(d.url);
   if(!r.ok)throw Error('Video could not be read.');
   const blob=await r.blob();
   return await loadDeviceVideo(new File([blob],a.name,{type:blob.type}),{throwOnError:true});
  }
  if(p.id!==cloudSession?.id)await openFullJokeProject(p);
  const ref={kind:'previewlock',name:a.name,path:a.path,size:a.size};
  if(a.role==='bed')await loadCloud(ref);else await loadCloudOverlay(ref);
 }
});
async function openJokeletProject(record,chosenBed,progress){
 const selection=sourceSelection;
 if(record.stagedCut){
  if(cloudSession&&dirty){clearTimeout(cloudTimer);await saveCloudWorkspace();}await cloudWrite.catch(()=>{});
  record=await publishCutProject(api,record.id,progress);
  if(selection!==sourceSelection)throw Error('A device file was selected while the cloud project was opening.');
 }
 return openFullJokeProject(record,chosenBed,progress);
}
watchCutProjects(()=>projectPicker.refreshExtras().catch(e=>say('Cut list unavailable: '+e.message)));
window.addEventListener('message',event=>{if(inStudio()||event.origin!==location.origin||event.data?.protocol!=='GS-JokeletCuts-1'||!/^[a-f0-9]{64}$/.test(event.data.sourceHash||''))return;projectPicker.open(null,{sourceHash:event.data.sourceHash}).catch(e=>say('Cut list unavailable: '+e.message));});
window.addEventListener('message',event=>{if(inStudio()||event.origin!==location.origin||event.data?.protocol!=='GS-CaptionReturn-1')return;const {project:id,caption}=event.data;if(typeof id!=='string'||typeof caption!=='string')return;if($('captionImport').open)$('captionImport').close();projectPicker.close();openJokeWorkspace(id,caption).catch(e=>say('Caption return incomplete: '+e.message));});
$('bedDeviceLoad').onclick=()=>projectPicker.open();
$('emptyLoadProject').onclick=()=>projectPicker.open();
$('projectAssets').onclick=()=>projectPicker.open(project.workspace?.id);
$('resumeDraft').onclick=()=>$('recover').click();
$('toStart').onclick=()=>seek(0);
$('toItemStart').onclick=()=>seek(clipCurrent()?.inFrame||0);
$('sheetItemStart').onclick=()=>seek(clipCurrent()?.inFrame||0);
$('sheetBack').onclick=()=>seek(frame-1);$('sheetForward').onclick=()=>seek(frame+1);$('sheetPlay').onclick=()=>$('play').click();
$('closeClipProperties').onclick=closeClipProperties;
$('itemMatrix').onpointerdown=e=>seek(matrixFrame(e.clientX,e.currentTarget.getBoundingClientRect(),Number(e.currentTarget.dataset.endFrame)||maxFrame));
$('itemMatrix').onkeydown=e=>{if(['Home','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();seek(e.key==='Home'?0:frame+(e.key==='ArrowLeft'?-1:1));}};



// Finished-caption import and placement queue. Navigation and insertion are separate.
let importState={project:null,id:'',assetId:'',runtime:null},captionImportBusy=false;
function placedClips(){const clips=project.clips.filter(c=>!c.captionNumber||c.placed);return TOOLBOX_MODE&&!project.canvas?clips.sort((a,b)=>a.inFrame-b.inFrame):clips;}
function archiveWorkspace(key=archiveSlot(),slot=draftSlot()){
 const prior=localStorage.getItem(slot);
 if(!prior)return;
 const archive=JSON.parse(localStorage.getItem(key)||'[]');
 if(JSON.stringify(archive.at(-1)?.project)===prior)return;
 archive.push({at:new Date().toISOString(),project:JSON.parse(prior)});
 localStorage.setItem(key,JSON.stringify(archive.slice(-20)));
}
function renderPlacement(){
 if(TOOLBOX_MODE&&toolboxUI){toolboxUI.render();return;}
 const seq=project.captionSequence,c=activeCaption(project),index=seq?.clipIds.indexOf(seq.activeId)??-1;
 $('editActiveCaption').textContent=c?`${index+1}/${seq.clipIds.length} · ${c.name}`:'Import captions';
 $('placementState').textContent=c?(c.placed?'Placed · editable':'Ready to place'):'';
 $('previousCaption').disabled=placementBusy||!seq||index<=0;$('nextCaption').disabled=placementBusy||!seq||index>=seq.clipIds.length-1;
 for(const id of ['insertCaption','sheetInsertCaption']){$(id).disabled=placementBusy||!c||c.placed||!layers.media.has(c.id)||v.readyState<1;$(id).textContent=c?.placed?'Placed':'Insert';}
 $('toItemStart').disabled=!clipCurrent();
}
function navigatePlacement(delta){if(isPlaying())frame=Math.min(maxFrame,Math.round(timelineFrame()));pause();if(v.src)seek(frame);project.editFocus='overlay';closeClipProperties();if(!project.captionSequence)return say('Import numbered caption components first.');change(()=>navigateCaption(project,delta,frame));selectedClip=project.captionSequence.activeId;layers.selected=selectedClip;editMode='move';project.editFocus='overlay';const c=activeCaption(project);if(c?.placed)seek(c.inFrame);render();say('Bed paused. Insert this caption, or use Previous / Next.');}
async function insertPlacement(){
 if(isPlaying())frame=Math.min(maxFrame,Math.round(timelineFrame()));pause();if(v.src)seek(frame);const c=activeCaption(project);if(placementBusy||!c||c.placed)return;if(v.readyState<1||!layers.media.has(c.id))return say('Load the bed and caption media first.');
 placementBusy=true;try{closeClipProperties();if(!change(()=>insertCaption(project,frame)))return;editMode='view';render();if(cloudSession){clearTimeout(cloudTimer);await saveCloudWorkspace();say(c.name+' inserted and saved as an editable layer. Use Previous / Next or tap its name to edit.');}else say(c.name+' inserted as an editable layer in this browser draft. No video was flattened.');}catch(e){say('Placement retained in the browser draft; Dropbox save pending: '+e.message);}finally{placementBusy=false;render();}
}
$('previousCaption').onclick=()=>navigatePlacement(-1);$('nextCaption').onclick=()=>navigatePlacement(1);$('insertCaption').onclick=insertPlacement;$('sheetInsertCaption').onclick=insertPlacement;
$('editActiveCaption').onclick=()=>{const c=activeCaption(project);if(c)openClipProperties(c.id);else openCaptionImport();};
$('unlockClip').onclick=()=>{const c=clipCurrent();if(!c)return;change(()=>{c.locked=false;c.placed=false;if(c.captionNumber){c.visible=false;project.captionSequence.activeId=c.id;}});editMode='move';seek(c.inFrame);render();};
async function loadCaptionSource(path){const d=await api('/api/playback?path='+encodeURIComponent(path));$('captionSourcePreview').src=d.url;$('captionSourcePreview').hidden=false;$('captionSourcePreview').pause();}
function renderCaptionImport(){
 const p=importState.project,select=$('captionBatch');$('captionImportTitle').textContent=p?'Captions · '+p.title:'Import created captions';$('geminiJokeText').value=p?.text||'';select.replaceChildren();for(const a of p?.assets.filter(a=>a.role==='caption')||[]){const o=document.createElement('option');o.value=a.id;const state=captionJobStatus(a.cuts,importState.runtime?.[a.id]);o.textContent=a.name+(a.cuts?' · '+state.saved+'/'+state.total+' saved'+(state.stopped?' · stopped':''):' · not clipped');select.append(o);}
 if(!p?.assets.some(a=>a.id===importState.assetId))importState.assetId=p?.assets.filter(a=>a.role==='caption'&&a.cuts?.status==='complete').at(-1)?.id||select.options[0]?.value||'';
 select.value=importState.assetId;const a=p?.assets.find(a=>a.id===importState.assetId),state=captionJobStatus(a?.cuts,importState.runtime?.[a?.id]);$('captionFolder').textContent=a?a.path.slice(0,a.path.lastIndexOf('/')):'/Grill Sergeant/JokeLab Productions';$('captionComponents').textContent=a?.cuts?.clips?.slice().sort((a,b)=>a.number-b.number).map(c=>c.name||c.number+'.webm').join(' · ')||'Finish clipping this animation before placement.';$('loadCaptionBatch').disabled=!state.complete;$('openCaptionClipper').textContent=state.stopped?'Resume clips':state.running?'View save progress':'Cut saved animation';$('savedCaptionStatus').textContent=a?.cuts?state.message:'';
}
async function loadCaptionFolder(id){const d=await api('/api/joke-project?id='+encodeURIComponent(id));if(!d.project)throw Error('This joke folder has no saved caption project.');importState={project:d.project,id,assetId:importState.id===id?importState.assetId:'',runtime:d.cutRuntime};renderCaptionImport();const a=d.project.assets.find(a=>a.id===importState.assetId);if(a)await loadCaptionSource(a.path);}
function openCaptionImport(){
 if(!project.media||!v.src){say('Open a video before importing its captions.');return;}
 pause();
 $('captionImportTitle').textContent='Import caption files';
 $('captionImportStatus').textContent='Choose numbered clips, then use Insert and Next to place them.';
 $('savedCaptionControls').open=false;
 $('savedCaptionControls').hidden=!cloudSession;
 if(!$('captionImport').open)$('captionImport').showModal();
}
$('savedCaptionControls').ontoggle=async e=>{
 if(!e.target.open||!cloudSession)return;
 const session=cloudSession,id=session.id;
 $('savedCaptionStatus').textContent='Loading saved captions…';
 try{
  const {projects}=await api('/api/joke-projects');
  if(cloudSession!==session||!e.target.open)return;
  const folders=new Map([[id,{id,title:projectContext?.title||id}],...projects.filter(p=>p.id!==id).map(p=>[p.id,p])]);
  $('captionProject').replaceChildren(...[...folders.values()].map(p=>new Option(p.title||p.id,p.id)));
  $('captionProject').value=id;
  await loadCaptionFolder(id);
  if(!importState.project.assets.find(a=>a.id===importState.assetId)?.cuts)$('savedCaptionStatus').textContent='Import the Gemini animation to cut it.';
 }catch(error){$('savedCaptionStatus').textContent=error.message;}
};
$('closeCaptionImport').onclick=()=>$('captionImport').close();$('captionImport').addEventListener('close',()=>$('captionSourcePreview').pause());
$('captionProject').onchange=async()=>{try{const id=$('captionProject').value;if(id!==project.workspace?.id)await openFullJokeProject({id});await loadCaptionFolder(id);}catch(e){$('captionImportStatus').textContent=e.message;}};
$('captionBatch').onchange=()=>{importState.assetId=$('captionBatch').value;renderCaptionImport();const a=importState.project.assets.find(a=>a.id===importState.assetId);if(a&&$('captionSourceDetails').open)loadCaptionSource(a.path).catch(e=>{$('savedCaptionStatus').textContent=e.message;});};
$('captionSourceDetails').ontoggle=()=>{
 if(!$('captionSourceDetails').open){$('captionSourcePreview').pause();return;}
 const a=importState.project?.assets.find(a=>a.id===importState.assetId);
 if(a)loadCaptionSource(a.path).catch(e=>{$('savedCaptionStatus').textContent=e.message;});
};
$('refreshCaptionFolder').onclick=()=>loadCaptionFolder(importState.id||$('captionProject').value).catch(e=>{$('captionImportStatus').textContent=e.message;});
$('loadCaptionBatch').onclick=async()=>{const button=$('loadCaptionBatch');button.disabled=true;try{$('captionImport').close();say('Loading saved source and numbered caption components…');await openJokeWorkspace(importState.id,importState.assetId);}catch(e){say('Caption import incomplete: '+e.message);}finally{button.disabled=false;}};
function captionClipperURL(asset){const id=project.workspace?.id||importState.id;if(!id)throw Error('Open a joke video or project first.');return new URL('../cliplock/?mode=caption&v=R16-recovery&project='+encodeURIComponent(id)+(asset?'&asset='+encodeURIComponent(asset.id):'')+'&returnTo='+caplockTarget(window.name),location.href);}
function goCaptionClipper(tab,asset){if(inStudio()){window.parent.postMessage({protocol:'GS-Studio-1',action:'navigate-phase',phase:'cut'},location.origin);return;}const url=captionClipperURL(asset);if(!tab){location.href=url.href;return;}try{if(tab.location.href!=='about:blank'&&new URL(tab.location.href).pathname===url.pathname&&tab.document.title.includes('R16')){tab.postMessage({protocol:'GS-CaptionClipper-1',project:project.workspace.id,asset:asset?.id||'',returnTo:caplockTarget(window.name)},location.origin);tab.focus();return;}}catch{}tab.location.href=url.href;tab.focus();}
function waitingClipper(){if(inStudio())return null;const tab=window.open('','gs-caption-cliplock');try{if(tab?.location.href==='about:blank'){tab.document.body.style.cssText='background:#111a24;color:#edf3fa;font:16px system-ui;padding:24px';tab.document.body.textContent='Saving your caption animation…';}}catch{}return tab;}
$('openCaptionClipper').onclick=async()=>{const a=importState.project?.assets.find(a=>a.id===importState.assetId)||project.captionSequence?.source;const tab=waitingClipper();try{if(cloudSession&&dirty){clearTimeout(cloudTimer);await saveCloudWorkspace();}goCaptionClipper(tab,a);}catch(e){$('captionImportStatus').textContent=e.message;try{if(tab?.location.href==='about:blank')tab.close();}catch{}}};
$('importGeminiVideo').onclick=()=>$('geminiVideoFile').click();
$('geminiVideoFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;const button=$('importGeminiVideo'),tab=waitingClipper();button.disabled=true;button.textContent='Saving…';try{if(!cloudSession)throw Error('Open a joke video or project first.');if(file.size>40*1024*1024)throw Error('Choose an animation under the existing 40 MB project-file limit.');if(dirty){clearTimeout(cloudTimer);await saveCloudWorkspace();}const ref=await storeCloudAsset({name:file.name},file,'caption'),a=projectContext.assets.find(a=>a.path===ref.path);if(!a)throw Error('Saved caption animation could not be matched to this project.');try{const staged=await saveProductionStage(api,cloudSession.id,a,'animation');cloudSession.rev=staged.rev;projectContext=staged.project;}catch(error){$('captionImportStatus').textContent='Original saved; stage assignment pending: '+error.message;}importState={project:projectContext,id:cloudSession.id,assetId:a.id};renderCaptionImport();$('captionImportStatus').textContent='Animation saved. Opening Clipper for this joke…';goCaptionClipper(tab,a);}catch(error){$('captionImportStatus').textContent='Animation import incomplete: '+error.message;try{if(tab?.location.href==='about:blank')tab.close();}catch{}}finally{button.disabled=false;button.textContent='Import Gemini video';e.target.value='';}};
$('copyGeminiHandoff').onclick=async()=>{try{if(!cloudSession)throw Error('Open a joke project first.');const text=$('geminiJokeText').value.trim();if(!text)throw Error('Add the exact joke text here, or use its saved JokeLab project.');if(text!==projectContext.text){if(dirty){clearTimeout(cloudTimer);await saveCloudWorkspace();}const d=await api('/api/joke-project?id='+encodeURIComponent(cloudSession.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rev:cloudSession.rev,title:projectContext.title,text})});cloudSession.rev=d.rev;projectContext=d.project;importState.project=d.project;}
 const prompt='Create animated captions on a completely flat, solid blue background. Use the exact joke words below, in order, with no added words. Show short readable phrases one at a time, disappearing completely before the next. Keep all lettering safely inside the frame. Use bold lettering and simple fast pop/slide changes; concentrate extra animation on the question mark and punchline. No scenery, props, background shading or narration.\n\n'+text;$('geminiHandoffText').value=prompt;$('geminiHandoffText').hidden=false;try{await navigator.clipboard.writeText(prompt);$('captionImportStatus').textContent='Gemini handoff copied. Create the video in Gemini, then use Import Gemini video here.';}catch{$('geminiHandoffText').focus();$('geminiHandoffText').select();$('captionImportStatus').textContent='Select and copy the handoff below.';}}catch(e){$('captionImportStatus').textContent=e.message;}};
async function importNumberedFiles(input){
 if(captionImportBusy||!input.files?.length)return;
 pause();captionImportBusy=true;const pending=[],epoch=projectEpoch,controls=[...$('captionImport').querySelectorAll('input,button,select,textarea')].filter(el=>el.id!=='closeCaptionImport'),disabled=controls.map(el=>el.disabled);
 controls.forEach(el=>el.disabled=true);$('captionImport').setAttribute('aria-busy','true');
 try{
  const files=numberedCaptionFiles(input.files);
  for(const f of files){
   $('captionImportStatus').textContent=`Loading ${pending.length+1}/${files.length} · ${f.name}`;
   const c=await importLayer(f,{kind:'local',name:f.name,size:f.size},null,{staged:true});pending.push(c);c.captionNumber=captionNumber(f);
  }
  if(epoch!==projectEpoch)throw Error('Import cancelled because project changed.');
  if(!change(()=>{project.clips.push(...pending);startCaptionSequence(project,pending.map(c=>c.id),{folder:files[0].webkitRelativePath?.split('/')[0]||'Imported numbered components',frame});project.editFocus='overlay';}))throw Error('Caption batch could not be added to this project.');
  selectedClip=project.captionSequence.activeId;layers.selected=selectedClip;editMode='move';$('captionImport').close();render();say(`${files.length} captions ready. Solid backgrounds removed automatically. Insert, then Next.`);
 }catch(error){
  for(const c of pending)layers.detach(c.id);
  $('captionImportStatus').textContent='Captions not imported: '+error.message;say('Captions not imported: '+error.message);
 }finally{captionImportBusy=false;input.value='';controls.forEach((el,i)=>el.disabled=disabled[i]);$('captionImport').removeAttribute('aria-busy');}
}
for(const id of ['captionFiles','captionFolderFiles'])$(id).onchange=e=>importNumberedFiles(e.target);
$('overlayLibrary').textContent='Import captions';
// A clipper link is authoritative; project entry also supports text-only and bed-only workspaces.
if(!inStudio()&&/^[a-f0-9]{64}$/.test(params.get('cuts')||''))projectPicker.open(null,{sourceHash:params.get('cuts')}).catch(e=>say('Cut list unavailable: '+e.message));
else if(!inStudio()&&params.get('project')&&params.get('caption'))openJokeWorkspace(params.get('project'),params.get('caption')).catch(e=>say('Caption handoff: '+e.message));
else if(!inStudio()&&params.get('project'))openFullJokeProject({id:params.get('project')}).catch(e=>say('Saved joke project unavailable: '+e.message));

async function openFullJokeProject(record,chosenBed=null,progress=say){
 const selection=sourceSelection;
 pause();if(cloudSession&&dirty){clearTimeout(cloudTimer);await saveCloudWorkspace();}await cloudWrite;
 let d=await api('/api/joke-project?id='+encodeURIComponent(record.id));
 if(!d.project){
  if(!record.text?.trim())throw Error('This older joke has no recovered text/project manifest yet. Its original preview is preserved; no substitute script or project was created.');
  progress('Saving the existing joke text in its project folder…');d=await api('/api/joke-project?id='+encodeURIComponent(record.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rev:d.rev,title:record.title,text:record.text})});
 }
 // Import known catalog originals sequentially, verifying their recorded hashes. Retries reuse server hashes.
 if(record.catalog)for(const a of record.assets||[]){
  if(!a.src||!a.sha256||d.project.assets.some(x=>x.sha256===a.sha256))continue;
  progress('Preserving '+a.name+' in this joke project…');const r=await fetch(new URL('../jokelets/'+a.src,import.meta.url));if(!r.ok)throw Error('Original source unavailable: '+a.name);const bytes=await r.arrayBuffer();if(bytes.byteLength>40*1024*1024)throw Error('Original is larger than the existing40MB project import limit; source remains intact.');
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==a.sha256)throw Error('Original hash changed: '+a.name+'. No replacement imported.');
  d=await api('/api/joke-project/asset?id='+encodeURIComponent(record.id)+'&role=bed&name='+encodeURIComponent(a.name),{method:'POST',headers:{'content-type':'application/octet-stream'},body:bytes});
 }
 if(selection!==sourceSelection)throw Error('A device file was selected while the cloud project was opening.');
 const p=d.project,assetId=p.caplock?.workspace?.assetId||p.assets.filter(a=>a.role==='caption'&&a.cuts?.status==='complete').at(-1)?.id;
 if(assetId&&p.assets.some(a=>a.id===assetId&&a.cuts?.status==='complete'))await openJokeWorkspace(p.id,assetId);
 else{
  archiveWorkspace(cloudPreviousKey,cloudDraftKey);cloudSession=null;clearTimeout(cloudTimer);const next=p.caplock?structuredClone(p.caplock):createProject();if(!next.media){const bed=preferredBed(p);if(bed)next.media={kind:'previewlock',name:bed.name,path:bed.path,size:bed.size};}next.workspace={...next.workspace,id:p.id,assetId:assetId||'',playhead:next.workspace?.playhead||0};projectContext=p;await openProject(next);cloudSession={id:p.id,asset:assetId||'',rev:d.rev};importState={project:p,id:p.id,assetId:assetId||''};renderCaptionImport();await seek(next.workspace.playhead);$('saveCloud').hidden=false;
 }
 if(chosenBed){const bed=p.assets.find(a=>a.path===chosenBed.path||a.sha256===chosenBed.sha256);if(bed&&project.media?.path!==bed.path)await loadCloud({kind:'previewlock',name:bed.name,path:bed.path,size:bed.size});}
 localStorage.setItem('gs_studio_project',p.id);showPage('viewer');render();say(p.title+' project loaded · '+p.assets.length+' saved assets available in Assets. Playback stays paused.');
}


installAdapter('captions',{
 busy:()=>placementBusy||cloudSaving,
 pause,
 async open({project:p,session}){
  await openFullJokeProject({id:p.id});
  if(session?.project&&session.caplockCheckpoint===p.caplockDigest){cloudSession=null;clearTimeout(cloudTimer);await openProject(session.project);const d=await api('/api/joke-project?id='+encodeURIComponent(p.id));cloudSession={id:p.id,asset:project.workspace?.assetId||'',rev:d.rev};projectContext=d.project;}
  if(session&&session.caplockCheckpoint===p.caplockDigest){undo=session.undo||[];redo=session.redo||[];selectedClip=session.selectedClip||selectedClip;layers.selected=selectedClip;editMode=session.editMode||'view';zoom=session.zoom||1;pan=session.pan||{x:0,y:0};render();await seek(session.frame??frame);}
  const bed=preferredBed(p);if(p.studio?.bedAssetId&&bed&&project.media?.path!==bed.path)await loadCloud({kind:'previewlock',name:bed.name,path:bed.path,size:bed.size});
  clearTimeout(cloudTimer);pause();
 },
 async checkpoint({project:p}){
  pause();clearTimeout(cloudTimer);if(dirty)await saveCloudWorkspace();else await cloudWrite;
  project.workspace={...project.workspace,id:p.id,playhead:frame,selectedClip:selectedClip||''};
  return moduleSession('captions',p.id,{project:JSON.parse(JSON.stringify(project)),caplockCheckpoint:projectContext?.caplockDigest||null,frame,selectedClip,editMode,zoom,pan,undo,redo});
 }
});

if(STUDIO){for(const id of ['bedLoad','bedDeviceLoad','emptyLoadProject','projectAssets'])$(id).onclick=()=>window.parent.postMessage({protocol:'GS-Studio-1',action:'navigate-phase',phase:'joke'},location.origin);$('captionProject').onchange=()=>{if(cloudSession){$('captionProject').value=cloudSession.id;loadCaptionFolder(cloudSession.id).catch(e=>say(e.message));}};$('openCaptionClipper').onclick=()=>window.parent.postMessage({protocol:'GS-Studio-1',action:'navigate-phase',phase:'cut'},location.origin);}

// Explicit source classification and the verified captioned-video handoff.
async function tagCurrentSource(stage){if(!cloudSession||!project.media?.path)throw Error('Open a saved joke video first.');if(dirty){clearTimeout(cloudTimer);await saveCloudWorkspace();}const a=projectContext.assets.find(a=>a.path===project.media.path);if(!a)throw Error('The source is not saved in this project.');const d=await saveProductionStage(api,cloudSession.id,a,stage);cloudSession.rev=d.rev;projectContext=d.project;render();say('Source marked '+stage+'. Future ready lists use its saved stage.');}
$('sourceStage').onchange=()=>{if(!$('sourceStage').value)return render();tagCurrentSource($('sourceStage').value).catch(e=>{render();say(e.message);});};
let compositeBusy=false,compositeCancelled=false,lastComposite=null;
$('cancelComposite').onclick=()=>{compositeCancelled=true;say('Cancelling composite; saved layers are retained.');};
$('produceCaptioned').onclick=async()=>{
 if(compositeBusy)return;if(!cloudSession)return say('Open a saved joke project before continuing to SX.');const pending=pendingCaptions(project).length;if(pending)return say('Insert or remove the '+pending+' remaining caption components before continuing to SX.');
 pause();compositeBusy=true;compositeCancelled=false;const disabled=new Map([...document.querySelectorAll('button,input,select,textarea')].map(e=>[e,e.disabled]));for(const [e]of disabled)if(e.id!=='cancelComposite')e.disabled=true;
 const button=$('produceCaptioned');$('cancelComposite').hidden=false;$('cancelComposite').disabled=false;$('compositeProgress').hidden=false;
 try{
  clearTimeout(cloudTimer);if(dirty)await saveCloudWorkspace();await cloudWrite;
  const snapshot=validateProject(JSON.parse(JSON.stringify(project))),recipe=captionRecipe(snapshot),key=JSON.stringify(recipe);let d=await api('/api/joke-project?id='+encodeURIComponent(cloudSession.id));projectContext=d.project;cloudSession.rev=d.rev;
  let asset=stageAsset(d.project,'captioned');
  if(!asset){
   if(!lastComposite||lastComposite.key!==key){
    const readAsset=async ref=>{const d=await api('/api/playback?path='+encodeURIComponent(ref.path));const r=await fetch(d.url);if(!r.ok)throw Error('Source unavailable: '+ref.name);const b=await r.blob();if(ref.size&&b.size!==ref.size)throw Error('Source size changed: '+ref.name);return b;};
    const bed=await readAsset(snapshot.media),result=await renderCaptioned({project:snapshot,bed,readAsset,cancelled:()=>compositeCancelled,onPhase:say,onProgress:p=>{button.textContent='Rendering '+Math.floor(p*100)+'%';$('compositeProgress').value=p;}});lastComposite={key,...result};
   }
   if(compositeCancelled)throw Error('Export cancelled.');if(lastComposite.blob.size>40*1024*1024)throw Error('Composite exceeds the existing 40 MB project limit. Its editable project is retained.');
   button.textContent='Saving…';say('Saving captioned video and verifying its production stage…');
   const version=1+(projectContext.production?.records||[]).filter(r=>r.stage==='captioned').length,name=stageFilename(projectContext.title,'captioned',version);
   d=await api('/api/joke-project/asset?id='+encodeURIComponent(cloudSession.id)+'&role=stage&name='+encodeURIComponent(name),{method:'POST',headers:{'content-type':'application/octet-stream'},body:lastComposite.blob});cloudSession.rev=d.rev;projectContext=d.project;
   d=await saveProductionStage(api,cloudSession.id,d.asset,'captioned',{recipe,report:lastComposite.report});cloudSession.rev=d.rev;projectContext=d.project;asset=d.project.assets.find(a=>a.id===d.record.assetId);
  }
  $('compositeProgress').value=1;button.textContent='Ready for SX';say('Captioned video saved. Opening the same joke in SxLock. Drive backup remains pending.');dirty=false;
  if(inStudio()){window.parent.postMessage({protocol:'GS-Studio-1',action:'navigate-phase',phase:'sound'},location.origin);return;}
  location.href='../sxlock/?v=R31-stages&production='+encodeURIComponent(cloudSession.id)+'&stageAsset='+encodeURIComponent(asset.id);
 }catch(e){button.textContent='Retry → SxLock';say('SX handoff incomplete: '+e.message);}finally{compositeBusy=false;$('cancelComposite').hidden=true;for(const [e,value]of disabled)if(e.id!=='produceCaptioned')e.disabled=value;button.disabled=false;}
};


// Local video passes use the existing compositor. No project upload is required.
function currentPassKey(){return localPassKey(project,mediaUrl,layers.media,captionRecipe(project));}
$('cancelLocalVideo').onclick=()=>{compositeCancelled=true;$('localVideoStatus').textContent='Cancelling. Your editable placements are retained.';};
$('saveVideo').onclick=async()=>{
 if(compositeBusy)return;pause();const button=$('saveVideo');
 try{
  if(!project.canvas&&(!bedBlob||v.readyState<1))throw Error('Reconnect the source video before saving.');
  const snapshot=validateProject(JSON.parse(JSON.stringify(project))),key=currentPassKey();
  for(const c of snapshot.clips)if(c.visible&&(!c.captionNumber||c.placed)&&!layers.media.get(c.id)?.blob)throw Error('Reconnect '+c.ref.name+' before saving.');
  compositeBusy=true;compositeCancelled=false;const controls=[...document.querySelectorAll('button,input,select,textarea')],disabled=controls.map(e=>e.disabled);controls.forEach(e=>e.disabled=true);$('cancelLocalVideo').hidden=false;$('cancelLocalVideo').disabled=false;$('localVideoProgress').hidden=false;
  try{
   if(!lastVideoPass||lastVideoPass.key!==key){
    const bytes=new Map(snapshot.clips.map(c=>[c.id,layers.media.get(c.id)?.blob]));
    const result=await renderCaptioned({project:snapshot,bed:bedBlob,readAsset:async(ref,c)=>{const blob=bytes.get(c.id);if(!blob)throw Error('Reconnect '+ref.name);return blob;},cancelled:()=>compositeCancelled,onPhase:phase=>{$('localVideoStatus').textContent=phase;},onProgress:progress=>{button.textContent='Saving video '+Math.floor(progress*100)+'%';$('localVideoProgress').value=progress;}});
    lastVideoPass={key,name:passFilename(snapshot.clips[0]?.type==='video'&&snapshot.canvas?snapshot.clips[0].ref.name:snapshot.canvas?.name||snapshot.media?.name),...result};
   }
   if(compositeCancelled)throw Error('Video save cancelled.');
   download(lastVideoPass.name,lastVideoPass.blob,'video/mp4');lastVideoPass.downloadRequested=true;$('localVideoProgress').value=1;$('useSavedVideo').hidden=false;$('localVideoStatus').textContent='Video download requested: '+lastVideoPass.name+'. Use as new bed starts the next pass with an empty overlay list.';
  }finally{controls.forEach((e,i)=>e.disabled=disabled[i]);$('cancelLocalVideo').hidden=true;compositeBusy=false;button.textContent=lastVideoPass?.key===currentPassKey()?'Resave video':'Save video';}
 }catch(e){$('localVideoStatus').textContent=e.message;say(e.message);button.textContent='Save video';compositeBusy=false;}
};
$('useSavedVideo').onclick=async()=>{
 if(compositeBusy||!lastVideoPass)return;if(!lastVideoPass.downloadRequested)return say('Save video before starting the next pass.');if(lastVideoPass.key!==currentPassKey())return say('Save video again to include your latest edits before starting the next pass.');
 const pass=lastVideoPass;
 try{
  archiveWorkspace();clearTimeout(cloudTimer);cloudSession=null;projectContext=null;$('saveCloud').hidden=true;
  await openProject(createProject());const file=new File([pass.blob],pass.name,{type:'video/mp4',lastModified:Date.now()});
  await loadMedia(file,{kind:'local',name:file.name,size:file.size,lastModified:file.lastModified});
  lastVideoPass=null;$('useSavedVideo').hidden=true;$('saveVideo').textContent='Save video';$('localVideoProgress').hidden=true;$('localVideoStatus').textContent='New pass ready. The saved video is the bed; add only the next captions or animations.';
  say('New pass ready. Earlier edits are in Previous workspace. Import the next caption or animation.');
 }catch(e){say('Could not start the next pass: '+e.message);}
};
for(const id of ['emptyReconnectFiles','reconnectMedia'])$(id).onclick=()=>$('reconnectFiles').click();
$('reconnectFiles').onchange=async e=>{
 const files=[...e.target.files||[]];if(!files.length)return;pause();const epoch=projectEpoch,playhead=frame;
 try{
  let count=0;const bed=matchLocalFile(files,project.media);
  if(bed){await loadMedia(bed,project.media);if(epoch!==projectEpoch)throw Error('Project changed during reconnect.');}
  if(TOOLBOX_MODE)await toolboxUI.reconnect(files);
  for(const c of [...project.clips]){
   if(epoch!==projectEpoch)throw Error('Project changed during reconnect.');
   const file=matchLocalFile(files,c.ref);if(!file||layers.media.get(c.id)?.blob===file)continue;
   await importLayer(file,c.ref,c);count++;
  }
  if(project.canvas||v.src)await seek(playhead);saveDraft();render();say('Reconnected '+(bed?'video and ':'')+count+' layers. Existing placements and timing retained.');
 }catch(error){say('Reconnect incomplete: '+error.message);}finally{e.target.value='';}
};

// The manual workspace uses a per-bed file toolbox; each insertion is independent.
if(TOOLBOX_MODE){
 toolboxUI=createToolboxUI({project:()=>project,selected:()=>selectedClip,media:()=>layers.media,ready:()=>!importingVideo&&(!!project.canvas||!!project.media&&!!bedBlob&&v.readyState>=1),
  frame:()=>frame,rememberLocal:(id,blob)=>{void rememberLocalMedia(id,blob).catch(()=>{$('saveStatus').textContent='This browser could not keep a media copy. Keep the original file to reconnect.';});},
  readLocal:asset=>readLocalMedia(asset).catch(()=>null),
  end:()=>compositionFrames(project,bedFrames),extendedFrames:()=>project.canvas?compositionFrames(project):bedFrames&&maxFrame>=bedFrames?maxFrame+1:0,epoch:()=>projectEpoch,pause:()=>{if(isPlaying())frame=Math.min(maxFrame,Math.round(timelineFrame()));pause();draw();},say,change,api,
  attach:(c,blob)=>layers.attach(c,blob,{autoKey:false}),detach:id=>layers.detach(id),select:id=>{selectClip(id);editMode='move';project.editFocus='overlay';render();},seek,closeProperties:closeClipProperties});
 $('clipTrim').closest('label').hidden=true;$('clipTrimOut').closest('label').hidden=true;
 render();
}
