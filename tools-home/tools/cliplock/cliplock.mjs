import {stageRecord} from '../../shared/production-stages.mjs?v=1';
import {captionJobStatus} from '../../shared/caption-job-status.mjs?v=1';
import {saveProductionStage} from '../../shared/production-client.mjs?v=1';
import {caplockTarget,returnCaptions} from '../../shared/caption-handoff.mjs?v=2';
import {cutListText} from './cut-list-text.mjs?v=1';
import {beginCutQueue,cutQueueStatus,getCutProject,stageCutProject} from '../../shared/cut-jokelets.mjs?v=3';
import {normalizeCutOrigin,cutProjectId} from '../../shared/cut-jokelets-core.mjs?v=1';
import {hapticClick,cutListRecipe,readCutList,clipZip} from './safety.mjs?v=15';
import {inStudio,installAdapter} from '../studio/adapter.mjs?v=1';
import {moduleSession,sourcePassMatches} from '../studio/core.mjs?v=1';
import {cutPassVersion,nextCutPassVersion,captionCutLabel} from '../../shared/cut-passes.mjs?v=4';
import {addOrUpdate,toBatchRanges,toVideoRanges,nextMarks} from './batch.mjs?v=6';
import {createProjectPicker} from '../studio/project-picker.mjs?v=6-stages';
import {projectAssets,isVideo} from '../studio/project-index.mjs?v=5-studio';
import {frameAt,selection,clipName,cloudResult,frameSeekTime,steppedFrame} from './core.mjs?v=3';
import {inspect,cut} from './engine.mjs?v=2';
const $=id=>document.getElementById(id),video=$('video'),API='https://gs-previewlock-api.onrender.com';
let project=null,file=null,source=null,meta=null,sourceURL=null,resultURL=null,result=null,busy=false,controller=null,loadEpoch=0,previewEnd=null,previewLast=0,selectedFrame=0;
let cuts=[],editingId='',sourceDigest='',savedBatch=null,batchDirty=false,boundaryFocus='',passOrigin='',pendingPassRequest='',batchRuntime=null,monitoringBatch=false;
const captionDownloads=new Map();let cutRuntimes={};
let videoMode=new URLSearchParams(location.search).get('mode')==='video'&&!inStudio();
let returnTarget=caplockTarget(new URLSearchParams(location.search).get('returnTo'));
const videoResults=new Map(),modeSources=new Map();let videoResultSource='',bundleURL=null,undoCuts=[];
const cutRows=new Map(),prepareJobs=new Map();let inlinePreview=null,bundleLink=null,batchJob=null;
const text=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
const say=s=>$('status').textContent=s;
const hash=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function api(path,options={}){const key=localStorage.getItem('gs_previewlock_key');if(!key)throw Error('Use your existing PreviewLock connection in this browser.');const r=await fetch(API+path,{...options,headers:{Authorization:'Bearer '+key,...options.headers},signal:AbortSignal.timeout(65000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Cloud request failed ('+r.status+').');return d;}
function guard(fn){return async(...args)=>{try{await fn(...args);}catch(e){say(e.message);}};}
function controls(){for(const id of ['start','back','play','next','back25','next25','markIn','markOut','in','out','preview','reset','jumpFrame','goFrame','saveCutList','importCutList'])$(id).disabled=busy||!meta;for(const id of ['open','assets','import','sourceSelect'])$(id).disabled=busy||(id!=='open'&&!project);$('importCaption').disabled=busy||(!videoMode&&!project);$('loadVideo').disabled=busy;$('loadPhotos').disabled=busy;$('emptyPhotos').disabled=busy;$('videoFormat').disabled=busy||!meta;$('cancelVideo').hidden=true;$('recoverEP4').disabled=busy||!videoMode||meta?.times.length!==1674;$('saveCutList').disabled=busy||!meta||!cuts.length;batchControls();}
function range(){return selection(meta.times,meta.end,Number($('in').value),Number($('out').value));}
function rangeChanged(){result=null;$('result').hidden=true;try{const r=range();$('length').textContent=r.frames+' frames · '+(r.end-r.start).toFixed(3)+'s';}catch(e){$('length').textContent=e.message;}drawBoundaries();controls();}
async function seek(frame){if(!meta)return;pauseInlinePreview();previewEnd=null;video.pause();selectedFrame=Math.max(0,Math.min(meta.times.length-1,Math.trunc(frame)));video.currentTime=frameSeekTime(meta,selectedFrame);updateClock();rememberBatch();}
function updateClock(){if(!meta)return;if(!video.paused&&!video.seeking)selectedFrame=frameAt(meta.times,video.currentTime);$('seek').value=selectedFrame;if(document.activeElement!==$('jumpFrame'))$('jumpFrame').value=selectedFrame;$('clock').textContent='F'+selectedFrame+' / '+meta.times.length+' · '+meta.times[selectedFrame].toFixed(3)+'s';}
function pause(){if(meta&&!video.paused&&!video.seeking)selectedFrame=frameAt(meta.times,video.currentTime);previewEnd=null;video.pause();}
async function loadSource(blob,ref){const token=++loadEpoch;closeInlinePreview();pause();busy=true;controls();say('Reading source frames…');try{const next=await inspect(blob);if(token!==loadEpoch)return;meta=next;file=blob;source=ref;result=null;if(sourceURL)URL.revokeObjectURL(sourceURL);if(resultURL)URL.revokeObjectURL(resultURL);boundaryFocus='';sourceURL=URL.createObjectURL(blob);video.src=sourceURL;video.hidden=false;$('empty').hidden=true;$('result').hidden=true;$('source').textContent=(stageRecord(project,source)?.fileName||ref.name)+' · '+next.width+'×'+next.height+' · '+next.times.length+' frames';$('in').value=0;$('out').value=next.times.length;$('in').max=next.times.length-1;$('out').max=next.times.length;$('seek').max=next.times.length-1;$('jumpFrame').max=next.times.length-1;selectedFrame=0;sourceDigest=await hash(blob);if(token!==loadEpoch)return;const existing=project?.assets.find(a=>(videoMode||a.role==='caption')&&a.sha256===sourceDigest&&a.size===blob.size);if(existing)source=existing;if(videoMode){$('videoFormat').value=next.alpha||!next.mp4Possible?'webm':'mp4';if(videoResultSource!==sourceDigest){clearVideoResults();videoResultSource=sourceDigest;}}restoreBatch();updateClock();rangeChanged();say(videoMode?'Video loaded with '+(next.audio?'original sound':'no audio track')+'.':'Mark IN, mark OUT, then Add cut.');}catch(e){throw e;}finally{if(token===loadEpoch){busy=false;controls();}}}
async function useAsset(a){batchRuntime=cutRuntimes[a.id]||null;if(!isVideo(a)||(!videoMode&&['bed','voice','reaction','outro'].includes(a.role)))throw Error('Choose the caption animation. The bed is selected later in CapLock.');pause();say('Loading '+a.name+'…');const u=a.src?new URL('../jokelets/'+a.src,import.meta.url).href:(await api('/api/playback?path='+encodeURIComponent(a.path))).url;const r=await fetch(u);if(!r.ok)throw Error('Source download failed.');await loadSource(await r.blob(),a);}
async function openProject(record,chosen){const d=await api('/api/joke-project?id='+encodeURIComponent(record.id));if(!d.project)throw Error('Open this catalog joke in CapLock once to establish its saved project.');project=d.project;cutRuntimes=d.cutRuntime||{};$('projectName').textContent=project.title;$('return').href='../caplock/?v=R17-recovery&project='+encodeURIComponent(project.id);const options=project.assets.filter(a=>(videoMode||a.role==='caption')&&isVideo(a));$('sourceSelect').replaceChildren();for(const a of options){const o=document.createElement('option');o.value=a.path;o.textContent=(stageRecord(project,a)?.fileName||a.name)+(videoMode?'':' · '+captionCutLabel(a));$('sourceSelect').append(o);}const a=chosen&&options.find(a=>a.path===chosen.path)||options.at(-1);if(a){batchRuntime=d.cutRuntime?.[a.id]||null;$('sourceSelect').value=a.path;await useAsset(a);}else{file=meta=source=null;cuts=[];editingId='';sourceDigest='';savedBatch=null;batchDirty=false;passOrigin='new';pendingPassRequest='';$('cutName').value='1';$('clock').textContent='No source';$('source').textContent='No caption animation loaded.';renderBatch();video.removeAttribute('src');video.load();video.hidden=true;$('empty').hidden=false;$('emptyMessage').textContent='No caption animation saved yet. Import the Gemini animation.';controls();}}
const picker=createProjectPicker({api,onPause:pause,hasProject:()=>videoMode||!!project,module:videoMode?null:'cut',onOpenProject:openProject,onUseAsset:async(p,a)=>{if(p&&p.id!==project?.id)await openProject(p,a);else await useAsset(a);},onLocal:()=>$('import').click()});
$('open').onclick=guard(()=>picker.open());$('assets').onclick=guard(()=>picker.open(project?.id));$('sourceSelect').onchange=guard(()=>useAsset(projectAssets(project).find(a=>a.path===$('sourceSelect').value)));$('importCaption').onclick=()=>$('import').click();$('import').onchange=guard(async e=>{const f=e.target.files[0];if(f)await loadSource(f,{name:f.name,kind:'device'});e.target.value='';});
$('start').onclick=()=>seek(0);$('back').onclick=()=>stepSource(-1);$('next').onclick=()=>stepSource(1);$('back25').onclick=()=>stepSource(-25);$('next25').onclick=()=>stepSource(25);$('goFrame').onclick=()=>{const n=Number($('jumpFrame').value);if(Number.isInteger(n)&&n>=0&&n<meta.times.length)seek(n);else say('Enter a frame from 0 to '+(meta.times.length-1)+'.');};$('jumpFrame').onkeydown=e=>{if(e.key==='Enter')$('goFrame').click();};$('play').onclick=guard(async()=>{pauseInlinePreview();boundaryFocus='';drawBoundaries();previewEnd=null;if(video.paused){if(video.ended){say('End of source. Use Find a frame to move.');return;}await video.play();}else {pause();updateClock();}});video.onplay=()=>$('play').textContent='Pause';video.onpause=()=>{$('play').textContent='Play';updateClock();};video.onended=()=>{if(meta){selectedFrame=meta.times.length-1;updateClock();}};video.ontimeupdate=()=>{updateClock();if(previewEnd!==null&&video.currentTime>=previewEnd){seek(previewLast);}};video.onseeked=updateClock;video.onerror=()=>say('Source cannot play in this browser. Original is unchanged.');
if(video.requestVideoFrameCallback){const tick=()=>{if(meta&&!video.paused&&!video.seeking)updateClock();if(previewEnd!==null&&video.currentTime>=previewEnd){seek(previewLast);}video.requestVideoFrameCallback(tick);};video.requestVideoFrameCallback(tick);}
$('markIn').onclick=()=>{boundaryFocus='in';pauseInlinePreview();pause();$('in').value=selectedFrame;rangeChanged();rememberBatch();};$('markOut').onclick=()=>{boundaryFocus='out';pauseInlinePreview();pause();$('out').value=selectedFrame;rangeChanged();rememberBatch();};$('reset').onclick=()=>{pause();$('in').value=0;$('out').value=meta.times.length;rangeChanged();};for(const id of ['in','out'])$(id).onchange=()=>{rangeChanged();boundaryFocus=id;seekBoundary(id);drawBoundaries();rememberBatch();};
$('preview').onclick=guard(async()=>{pauseInlinePreview();const r=range();video.pause();selectedFrame=r.inFrame;video.currentTime=r.start;previewLast=r.outFrame-1;previewEnd=r.end;await video.play();});
async function run(fn){if(busy)return;busy=true;controls();try{await fn();}catch(e){say(e.message);}finally{busy=false;controller=null;controls();}}
async function saveBlob(blob,name,role){if(blob.size>40*1024*1024)throw Error('Existing project upload limit is 40 MB per file. Use a caption source under40MB.');const digest=await hash(blob),d=await api('/api/joke-project/asset?id='+encodeURIComponent(project.id)+'&role='+role+'&name='+encodeURIComponent(name),{method:'POST',headers:{'content-type':'application/octet-stream'},body:blob});const a=cloudResult(d,digest,blob.size);project=d.project;return a;}
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!busy)pause();});
controls();const initial=new URLSearchParams(location.search);if(!inStudio()&&initial.has('project'))guard(async()=>{await openProject({id:initial.get('project')});if(initial.has('asset')){const a=projectAssets(project).find(a=>a.id===initial.get('asset')||a.path===initial.get('asset'));if(a)await useAsset(a);}})();

// Reuse waiting editor tabs without navigating/reloading their unsaved workspace.
for(const link of document.querySelectorAll('.links a[target]'))link.addEventListener('click',event=>{if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;if(link.id==='return'&&cuts.length){event.preventDefault();$('finishBatch').click();return;}const tab=window.open('',link.target);if(!tab)return;event.preventDefault();try{if(tab.location.href==='about:blank'||new URL(tab.location.href).pathname!==new URL(link.href).pathname)tab.location.href=link.href;tab.focus();}catch{tab.location.href=link.href;}});


function batchControls(){
 $('copyList').disabled=busy||!meta||!cuts.length;
 for(const id of ['addCut','cutName','removeBlue','blue'])$(id).disabled=busy||!meta;
 $('saveBatch').disabled=busy||(!videoMode&&!project)||!meta||!cuts.length;$('saveBatch').textContent=videoMode?(cuts.length?'All '+cuts.length+' · ZIP':'All clips · ZIP'):!batchDirty&&savedBatch?captionJobStatus(savedBatch,batchRuntime).button:'Save clips';
 if(!videoMode){$('saveBatch').setAttribute('aria-busy',String(monitoringBatch));$('saveBatch').title=captionJobStatus(savedBatch,batchRuntime).message||'Save the named transparent components into this joke project. Completed files are retained on retry.';}
 $('finishBatch').disabled=busy||!meta||!cuts.length||(!videoMode&&!project);$('finishBatch').textContent='Next → CapLock';$('finishBatch').title=videoMode?'Open these named cuts as separate CapLock caption projects':'Save the caption components and return them to this same CapLock joke project';
 $('newPass').disabled=busy||!project||!meta||savedBatch?.status==='running'||(!cuts.length&&!savedBatch?.clips?.length);$('undo').disabled=busy||!undoCuts.length;$('newCut').hidden=!editingId;$('addCut').textContent=editingId?'Update cut':'Add cut';refreshCutRows();
 
}
function draftKey(){return (videoMode?'gs_cliplock_video_v1_':'gs_cliplock_batch_v2_')+(project?.id||'local')+'_'+sourceDigest;}
function rememberBatch(){if(!sourceDigest)return;try{const key=draftKey(),raw=localStorage.getItem(key);if(raw){try{const prior=JSON.parse(raw);if(prior.sourceDigest!==sourceDigest||prior.passId!==(savedBatch?.id||null))localStorage.setItem(key+'_archived_'+Date.now(),raw);}catch{localStorage.setItem(key+'_archived_'+Date.now(),raw);}}localStorage.setItem(key,JSON.stringify({schema:2,updated:Date.now(),sourceDigest,cuts,videoFormat:$('videoFormat').value,removeBlue:$('removeBlue').checked,blue:$('blue').value,editingId,marks:{inFrame:Number($('in').value),outFrame:Number($('out').value)},cutName:$('cutName').value,cursor:selectedFrame,undoCuts:undoCuts.slice(-20),passId:savedBatch?.id||null,pendingPassRequest}));}catch{say('Browser draft unavailable. Save clips to preserve the cut recipe.');}}
function restoreBatch(){
 let restoredDraft=false;undoCuts=[];cuts=[];editingId='';savedBatch=!videoMode&&source?.role==='caption'?source.cuts:null;batchDirty=false;passOrigin=savedBatch?'project':'new';pendingPassRequest='';$('cutName').value='1';$('removeBlue').checked=!meta.alpha;
 if(savedBatch){cuts=savedBatch.ranges.map((c,i)=>({id:'saved-'+i,inFrame:c.sourceInFrame??frameAt(meta.times,c.inFrame/25),outFrame:c.sourceOutFrame??Math.min(meta.times.length,frameAt(meta.times,c.outFrame/25)+((c.outFrame/25>=meta.end)?1:0)),name:(c.name||String(i+1)+'.webm').replace(/\.webm$/i,'')}));$('removeBlue').checked=savedBatch.chroma.enabled!==false;$('blue').value=savedBatch.chroma.color;}
 try{const d=JSON.parse(localStorage.getItem(draftKey())||'null');if(d?.schema===2&&d.sourceDigest===sourceDigest&&Array.isArray(d.cuts)&&(d.passId===(savedBatch?.id||null)||(d.passId===undefined&&(!savedBatch||savedBatch.version===undefined)))){for(const c of d.cuts)selection(meta.times,meta.end,c.inFrame,c.outFrame);restoredDraft=true;if(videoMode&&['mp4','webm'].includes(d.videoFormat))$('videoFormat').value=d.videoFormat;passOrigin='browser';undoCuts=Array.isArray(d.undoCuts)?d.undoCuts.filter(v=>Array.isArray(v.cuts)&&v.cuts.every(c=>Number.isInteger(c.inFrame)&&Number.isInteger(c.outFrame)&&c.inFrame>=0&&c.outFrame>c.inFrame&&c.outFrame<=meta.times.length)).slice(-20):[];pendingPassRequest=d.pendingPassRequest||'';cuts=d.cuts;if(Number.isInteger(d.cursor)){selectedFrame=steppedFrame(d.cursor,0,meta.times.length);video.currentTime=frameSeekTime(meta,selectedFrame);}editingId=cuts.some(c=>c.id===d.editingId)?d.editingId:'';$('cutName').value=d.cutName||String(cuts.length+1);$('removeBlue').checked=d.removeBlue;$('blue').value=d.blue;if(d.marks){selection(meta.times,meta.end,d.marks.inFrame,d.marks.outFrame);$('in').value=d.marks.inFrame;$('out').value=d.marks.outFrame;}}else if(d?.schema===2&&d.sourceDigest===sourceDigest){localStorage.setItem(draftKey()+'_archived_'+Date.now(),JSON.stringify(d));}}catch{say('Invalid temporary cut draft ignored; saved project remains unchanged.');}
 batchDirty=restoredDraft?!matchesSaved():false;renderBatch();rememberBatch();
}
function matchesSaved(){if(!savedBatch||!meta)return false;try{const ranges=toBatchRanges(meta,cuts);return ranges.length===savedBatch.ranges.length&&ranges.every((c,i)=>{const p=savedBatch.ranges[i];return c.inFrame===p.inFrame&&c.outFrame===p.outFrame&&c.sourceStart===p.sourceStart&&c.sourceEnd===p.sourceEnd&&c.name===(p.name||String(i+1)+'.webm');})&&($('removeBlue').checked===(savedBatch.chroma.enabled!==false))&&(!$('removeBlue').checked||$('blue').value===savedBatch.chroma.color);}catch{return false;}}
function changedBatch(){passOrigin='working';batchDirty=true;invalidateBundle();prunePrepared();renderBatch();rememberBatch();}
function drawBoundaries(){$('markIn').textContent='IN';$('markOut').textContent='OUT';if(!meta)return;try{const r=range();$('selectionSummary').textContent='F'+r.inFrame+' → F'+r.outFrame+' · '+r.frames+' frames · OUT exclusive';}catch(e){$('selectionSummary').textContent=e.message;}}
function seekBoundary(which){if(meta)seek(Math.min(meta.times.length-1,Number($(which).value)));}
function checkpointCuts(){undoCuts.push(structuredClone({cuts,editingId,marks:{inFrame:Number($('in').value),outFrame:Number($('out').value)},cutName:$('cutName').value,cursor:selectedFrame}));if(undoCuts.length>20)undoCuts.shift();}
$('undo').onclick=()=>{const old=undoCuts.pop();if(!old||busy)return;cuts=old.cuts;editingId=old.editingId;$('in').value=old.marks.inFrame;$('out').value=old.marks.outFrame;$('cutName').value=old.cutName;changedBatch();rangeChanged();seek(old.cursor);say('Last cut change undone.');};
// A preview or export cannot commit an unfinished boundary edit.
function cutForExport(c){if(!c)throw Error('Choose a saved cut.');if(editingId===c.id){const r=range(),name=$('cutName').value.trim()||c.name;if(r.inFrame!==c.inFrame||r.outFrame!==c.outFrame||name!==c.name)throw Error('Tap Update cut to keep your edits, or Cancel editing to use the saved range.');}return c;}
$('addCut').onclick=()=>{try{const r=range();const name=$('cutName').value.trim()||String(cuts.length+1);const next=addOrUpdate(cuts,{inFrame:r.inFrame,outFrame:r.outFrame},{id:editingId||undefined,name});if(videoMode)toVideoRanges(meta,next,$('videoFormat').value);else toBatchRanges(meta,next);const index=editingId?cuts.findIndex(c=>c.id===editingId):cuts.length;next[index].autoName=name===String(index+1);checkpointCuts();cuts=next;editingId='';boundaryFocus='in';const marks=nextMarks(r.outFrame,meta.times.length);$('in').value=marks.inFrame;$('out').value=marks.outFrame;$('cutName').value=String(cuts.length+1);rangeChanged();seek(marks.inFrame);changedBatch();say('Cut added. Next IN starts at the previous OUT. All clips · ZIP exports the set; One clip exports a single cut.');}catch(e){say(e.message);}};
$('newCut').onclick=()=>{editingId='';const marks=nextMarks(cuts.at(-1)?.outFrame||0,meta.times.length);$('in').value=marks.inFrame;$('out').value=marks.outFrame;$('cutName').value=String(cuts.length+1);rangeChanged();renderBatch();seek(marks.inFrame);rememberBatch();};
function hint(node,value){node.title=value;node.dataset.gsHelp=value;node.dataset.gsDynamicHelp=value;node.setAttribute('aria-description',value);}
function invalidateBundle(){if(bundleURL)URL.revokeObjectURL(bundleURL);bundleURL=null;bundleLink?.remove();bundleLink=null;batchJob=null;}
function releasePrepared(key){const result=videoResults.get(key);if(result){if(inlinePreview?.url===result.url)closeInlinePreview();URL.revokeObjectURL(result.url);videoResults.delete(key);}prepareJobs.delete(key);}
function prunePrepared(){const valid=new Set(cuts.map(videoKey));for(const key of videoResults.keys())if(!valid.has(key))releasePrepared(key);for(const key of prepareJobs.keys())if(!valid.has(key))prepareJobs.delete(key);}
function closeInlinePreview(){const p=inlinePreview;if(!p)return;inlinePreview=null;if(p.frameHandle!==null)p.video.cancelVideoFrameCallback?.(p.frameHandle);p.video.pause();p.video.removeAttribute('src');p.video.load();p.host.replaceChildren();p.host.hidden=true;refreshCutRows();}
function pauseInlinePreview(){inlinePreview?.video.pause();}
function syncBatchAction(){if(!videoMode)return;const b=$('saveBatch');let label='All '+(cuts.length||'clips')+' · ZIP',tip='Prepare every queued clip in one ZIP. Individual Prepare is optional.';if(batchJob?.state==='preparing'){label='Prep '+batchJob.index+'/'+batchJob.total;tip='Preparing clip '+batchJob.index+' of '+batchJob.total+'. Save ZIP appears when the bundle is ready.';}else if(bundleURL){label=batchJob?.saveRequested?'Resave ZIP':'Save ZIP';tip='Download all '+cuts.length+' prepared clips and their cut list in one ZIP.';}else if(batchJob?.state==='error'){label='Retry ZIP';tip=batchJob.error+' Retry the whole set; already prepared clips will be reused.';}text(b,label);hint(b,tip);b.dataset.state=bundleURL?'ready':batchJob?.state||'idle';b.setAttribute('aria-busy',String(batchJob?.state==='preparing'));}
function createCutRow(c){
 const row=document.createElement('div');row.className='cut-row';row.dataset.cutId=c.id;
 const edit=document.createElement('button');edit.className='cut-label';const name=document.createElement('span'),frames=document.createElement('small');edit.append(name,frames);
 const play=document.createElement('button');play.className='cut-play';play.type='button';
 const action=document.createElement('span');action.className='cut-action';const remove=document.createElement('button');remove.textContent='×';
 const error=document.createElement('p');error.className='cut-error';error.setAttribute('role','alert');error.hidden=true;
 const host=document.createElement('div');host.className='cut-inline';host.hidden=true;
 const ui={row,edit,name,frames,play,action,remove,error,host,c,index:0};
 edit.onclick=()=>{if(busy)return;const c=ui.c;pause();editingId=c.id;$('in').value=c.inFrame;$('out').value=c.outFrame;$('cutName').value=c.name;rangeChanged();renderBatch();seek(c.inFrame);rememberBatch();};
 play.onclick=guard(async()=>{if(videoMode)return toggleInlinePreview(ui);const c=ui.c,r=selection(meta.times,meta.end,c.inFrame,c.outFrame);video.pause();selectedFrame=r.inFrame;video.currentTime=r.start;previewLast=r.outFrame-1;previewEnd=r.end;await video.play();});
 remove.onclick=()=>{if(prepareJobs.get(videoKey(ui.c))?.state==='preparing'){controller?.abort();return;}if(busy)return;checkpointCuts();cuts=cuts.filter(x=>x.id!==ui.c.id).map((x,i)=>x.autoName?{...x,name:String(i+1)}:x);if(editingId===ui.c.id)editingId='';$('cutName').value=String(cuts.length+1);changedBatch();drawBoundaries();};
 row.append(edit,play,action,remove,error,host);return ui;
}
function refreshCutRow(ui){
 const c=ui.c,i=ui.index,key=videoKey(c),ready=videoResults.get(key),job=prepareJobs.get(key),active=inlinePreview?.id===c.id?inlinePreview:null;
 ui.row.setAttribute('aria-current',String(editingId===c.id));ui.row.setAttribute('aria-busy',String(job?.state==='preparing'));text(ui.name,(i+1)+'. '+c.name);text(ui.frames,'F'+c.inFrame+'–'+c.outFrame);ui.edit.setAttribute('aria-label','Edit cut '+(i+1));hint(ui.edit,'Edit '+c.name+' and its saved IN/OUT marks.');ui.edit.disabled=busy;const running=job?.state==='preparing';ui.remove.disabled=busy&&!running;text(ui.remove,running?'■':'×');ui.remove.setAttribute('aria-label',running?'Cancel preparing cut '+(i+1):'Remove queued cut '+(i+1));hint(ui.remove,running?'Cancel preparation and keep this cut.':'Remove this queued cut. Undo can restore it.');
 const playing=active&&!active.video.paused&&!active.finished;const playName=playing?'Pause':active?.finished?'Replay':'Play';text(ui.play,playing?'Ⅱ':active?.finished?'↺':'▶');ui.play.setAttribute('aria-label',videoMode?playName+' cut '+(i+1):'Preview cut '+(i+1));hint(ui.play,(videoMode?playName+' '+c.name+' inline.': 'Preview '+c.name+' in the main player.')+' Playback does not change IN/OUT.');ui.play.disabled=busy&&!playing;
 const captionReady=!videoMode&&!batchDirty&&savedBatch?.clips?.find(x=>x.sourceInFrame===c.inFrame&&x.sourceOutFrame===c.outFrame&&(x.name||'').replace(/\.webm$/i,'')===c.name);
 ui.action.hidden=!videoMode&&!captionReady;
 if(captionReady){
  let action=ui.action.firstElementChild;if(action?.tagName!=='BUTTON'){action=document.createElement('button');action.type='button';ui.action.replaceChildren(action);}
  const saved=captionDownloads.has(captionReady.path);text(action,saved?'Resave':'Save');action.disabled=false;action.setAttribute('aria-label',(saved?'Resave':'Save')+' caption '+(i+1));hint(action,'This named component is already saved in the project. Download a copy.');
  action.onclick=guard(async()=>{action.disabled=true;try{let item=captionDownloads.get(captionReady.path);if(!item){const d=await api('/api/playback?path='+encodeURIComponent(captionReady.path)),r=await fetch(d.url);if(!r.ok)throw Error('Saved caption could not be downloaded.');const blob=await r.blob();if(blob.size!==captionReady.size||await hash(blob)!==captionReady.sha256)throw Error('Caption byte verification failed. The saved original is unchanged.');item={url:URL.createObjectURL(blob)};captionDownloads.set(captionReady.path,item);}const a=document.createElement('a');a.href=item.url;a.download=captionReady.name||c.name+'.webm';a.click();say('Download requested · '+a.download);}finally{refreshCutRow(ui);}});
 }else if(videoMode){
  const tag=ready?'A':'BUTTON';let action=ui.action.firstElementChild;if(action?.tagName!==tag){action=document.createElement(tag.toLowerCase());if(!ready)action.type='button';ui.action.replaceChildren(action);}
  ui.action.dataset.state=ready?'ready':job?.state||'idle';ui.action.style.setProperty('--cut-progress',(job?.progress||0)+'%');
  if(ready){const label=ready.saveRequested?'Resave':'Save';action.className='download';action.href=ready.url;action.download=clipName(c.name,ready.format);action.setAttribute('aria-label',label+' cut '+(i+1));text(action,label);hint(action,'Download '+c.name+(ready.saveRequested?' again.':'. The prepared clip is ready.'));action.onclick=()=>{ready.saveRequested=true;refreshCutRow(ui);say('Download requested for '+c.name+'.');};}
  else{const running=job?.state==='preparing',failed=job?.state==='error';action.disabled=busy;action.setAttribute('aria-label',(running?'Preparing':failed?'Retry':'Prepare')+' cut '+(i+1));text(action,running?'Prep '+job.progress+'%':failed?'Retry':'Prepare');hint(action,running?'Preparing '+c.name+' · '+job.progress+'%.':failed?job.error+' Tap Retry.':'Prepare '+c.name+', then use Save. For the complete set use All clips · ZIP.');action.onclick=()=>run(async()=>{try{await prepareVideoCut(cutForExport(ui.c));say('Clip ready · tap Save beside '+ui.c.name+'.');}catch(e){if(prepareJobs.get(key)?.state!=='error')prepareJobs.set(key,{state:'error',progress:0,error:e.message});refreshCutRows();throw e;}});}
 }
 ui.error.hidden=job?.state!=='error';text(ui.error,job?.state==='error'?'Could not prepare: '+job.error:'');
}
function refreshCutRows(){for(const ui of cutRows.values())refreshCutRow(ui);syncBatchAction();}
async function toggleInlinePreview(ui){
 const c=ui.c,ready=videoResults.get(videoKey(c)),url=ready?.url||sourceURL;
 if(inlinePreview?.id===c.id&&inlinePreview.url===url){const p=inlinePreview;if(!p.video.paused){p.video.pause();return;}if(p.finished){p.finished=false;p.video.currentTime=p.start;}await p.video.play();return;}
 if(busy)return;closeInlinePreview();pause();const r=selection(meta.times,meta.end,c.inFrame,c.outFrame),v=document.createElement('video'),progress=document.createElement('progress'),tools=document.createElement('div'),label=document.createElement('span'),close=document.createElement('button');
 v.className='cut-inline-video';v.playsInline=true;v.preload='metadata';v.controls=false;v.setAttribute('aria-label',c.name+' inline preview');progress.max=1;progress.value=0;progress.setAttribute('aria-label','Clip position (read-only)');tools.className='cut-inline-tools';close.type='button';close.textContent='Close';close.setAttribute('aria-label','Close preview cut '+(ui.index+1));close.onclick=closeInlinePreview;
 const p={id:c.id,url,video:v,host:ui.host,start:ready?0:r.start,end:ready?null:r.end,last:ready?null:frameSeekTime(meta,r.outFrame-1),finished:false,frameHandle:null};inlinePreview=p;ui.host.hidden=false;tools.append(label);if(ready){const receipt=document.createElement('button');receipt.type='button';receipt.textContent='Recipe';receipt.setAttribute('aria-label','Save recipe cut '+(ui.index+1));receipt.onclick=()=>downloadJSON(ready.recipe,ready.name+'.clip.json');tools.append(receipt);}tools.append(close);ui.host.append(v,progress,tools);
 function sync(){if(inlinePreview!==p)return;const duration=(p.end??v.duration)-p.start,position=Math.max(0,v.currentTime-p.start);progress.value=p.finished?1:duration>0?Math.min(1,position/duration):0;text(label,(ready?'Prepared clip':'Source range')+' · '+position.toFixed(2)+'s / '+(Number.isFinite(duration)?duration.toFixed(2):'—')+'s');}
 function finish(){if(inlinePreview!==p)return;p.finished=true;v.pause();if(p.last!==null)v.currentTime=p.last;sync();refreshCutRow(ui);}
 function frame(){p.frameHandle=null;if(inlinePreview!==p)return;if(p.end!==null&&v.currentTime>=p.end){finish();return;}sync();if(!v.paused&&v.requestVideoFrameCallback)p.frameHandle=v.requestVideoFrameCallback(frame);}
 v.onloadedmetadata=()=>{if(inlinePreview!==p)return;if(v.currentTime<p.start)v.currentTime=p.start;sync();};v.ontimeupdate=()=>{if(p.end!==null&&v.currentTime>=p.end)finish();else sync();};v.onplay=()=>{refreshCutRow(ui);if(v.requestVideoFrameCallback&&p.frameHandle===null)p.frameHandle=v.requestVideoFrameCallback(frame);};v.onpause=()=>{if(p.frameHandle!==null){v.cancelVideoFrameCallback?.(p.frameHandle);p.frameHandle=null;}refreshCutRow(ui);};v.onended=finish;v.onclick=()=>toggleInlinePreview(ui).catch(e=>say(e.message));v.onerror=()=>{if(inlinePreview===p){say('Preview could not play. The source and cut marks are unchanged.');closeInlinePreview();}};
 v.src=url;v.currentTime=p.start;try{await v.play();}catch(e){if(e.name==='AbortError'&&inlinePreview===p&&v.paused)return;closeInlinePreview();throw e;}
}
function renderBatch(){
 const scroll=$('cutList').closest('.work').scrollTop;const version=cutPassVersion(source,savedBatch);$('passLabel').textContent='v'+version;$('newPass').textContent='New pass · v'+Math.max(version+1,nextCutPassVersion(source));$('restoreStatus').textContent=passOrigin==='newpass'?'v'+version+' · New pass · no cuts yet':savedBatch?.status==='complete'&&!batchDirty?(passOrigin==='saved'?'Saved v':'Restored v')+version+' · '+savedBatch.clips.length+' saved clips':(passOrigin==='browser'?'Restored working draft':'Working draft')+' · v'+version+' · '+cuts.length+' cuts';$('cutCount').textContent=cuts.length;$('cutList').closest('section').classList.toggle('gs-empty-cut-list',!cuts.length);
 const ids=new Set(cuts.map(c=>c.id));if(inlinePreview&&!ids.has(inlinePreview.id))closeInlinePreview();for(const [id,ui]of cutRows)if(!ids.has(id)){ui.row.remove();cutRows.delete(id);}
 for(const [i,c]of cuts.entries()){let ui=cutRows.get(c.id);if(!ui){ui=createCutRow(c);cutRows.set(c.id,ui);}ui.c=c;ui.index=i;const before=$('cutList').children[i];if(before!==ui.row)$('cutList').insertBefore(ui.row,before||null);refreshCutRow(ui);}
 $('batchStatus').textContent=batchDirty?'Cut draft · prepare clips when ready. Overlaps and gaps are allowed.':captionJobStatus(savedBatch,batchRuntime).message||'Add cuts in the order you want them. Overlaps and gaps are allowed.';
 $('savedClips').replaceChildren();drawBoundaries();batchControls();$('cutList').closest('.work').scrollTop=scroll;
}
$('removeBlue').onchange=$('blue').onchange=()=>changedBatch();
async function monitorBatch(assetId){
 monitoringBatch=true;
 try{for(;;){const d=await api('/api/joke-project?id='+encodeURIComponent(project.id));project=d.project;const a=project.assets.find(x=>x.id===assetId);if(!a?.cuts)throw Error('Saved batch is missing; original remains intact.');source=a;savedBatch=a.cuts;batchRuntime=d.cutRuntime?.[assetId]||null;batchDirty=false;renderBatch();rememberBatch();const state=captionJobStatus(savedBatch,batchRuntime);say(state.message);
  if(state.stopped)throw Error(state.message+' Tap '+state.button+'.');
  if(savedBatch.status==='complete'){batchDirty=false;passOrigin='saved';pendingPassRequest='';source=a;refreshSourceList();renderBatch();rememberBatch();say('Numbered clips saved in this project. Ready for CapLock. Drive backup queued.');return;}
  await new Promise(resolve=>setTimeout(resolve,2500));
 }}finally{monitoringBatch=false;}
}
$('saveBatch').onclick=()=>{if(videoMode&&bundleURL&&bundleLink){bundleLink.click();return;}return run(async()=>{
 if(videoMode){if(editingId){const c=cuts.find(c=>c.id===editingId);try{cutForExport(c);}catch(e){prepareJobs.set(videoKey(c),{state:'error',progress:0,error:e.message});batchJob={state:'error',error:e.message};refreshCutRows();throw e;}}rememberBatch();const files=[],list=structuredClone(cuts);batchJob={state:'preparing',index:0,total:list.length};
  try{for(const [i,c]of list.entries()){batchJob.index=i+1;syncBatchAction();say('Preparing '+(i+1)+' / '+list.length+' · '+c.name);const r=await prepareVideoCut(c);files.push({name:String(i+1).padStart(2,'0')+'_'+clipName(c.name,r.format),blob:r.blob});}
   files.push({name:'cut-list.json',blob:new Blob([JSON.stringify(currentCutList(),null,2)],{type:'application/json'})});const bundle=await clipZip(files);invalidateBundle();bundleURL=URL.createObjectURL(bundle);const a=document.createElement('a');a.className='download';a.href=bundleURL;a.download='ClipLock_'+source.name.replace(/\.[^.]+$/,'')+'_clips.zip';a.textContent='Save all '+list.length+' clips (ZIP)';a.onclick=()=>{batchJob.saveRequested=true;a.textContent='Resave all '+list.length+' clips (ZIP)';syncBatchAction();say('Clip bundle download requested.');};bundleLink=a;$('videoDownloads').append(a);batchJob={state:'ready',index:list.length,total:list.length};refreshCutRows();say('All '+list.length+' clips ready · tap Save ZIP.');return;
  }catch(e){batchJob={state:'error',error:e.message};syncBatchAction();throw e;}
 }
 const ranges=toBatchRanges(meta,cuts);if(!project)throw Error('Open the joke project first.');
 let d=await api('/api/joke-project?id='+encodeURIComponent(project.id));if(d.capabilities?.clipBatch!==2||d.capabilities?.cutPass!==1)throw Error('Clip batch server update is not ready. Your cut draft is preserved; retry Save clips after deployment.');project=d.project;let parent=project.assets.find(a=>a.role==='caption'&&a.sha256===sourceDigest&&a.size===file.size);
 if(!parent){say('Preserving original animation…');parent=await saveBlob(file,source.name,'caption');d=await api('/api/joke-project?id='+encodeURIComponent(project.id));project=d.project;}
 if(parent.cuts?.status!=='running'||d.capabilities?.cutResume===1&&d.cutRuntime?.[parent.id]?.active===false)d=await api('/api/joke-project/cuts?id='+encodeURIComponent(project.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rev:d.rev,assetId:parent.id,cuts:ranges,chroma:{enabled:$('removeBlue').checked,color:$('blue').value,similarity:.18,blend:.04}})});
 else {const expected=ranges.map(c=>JSON.stringify(c)),actual=parent.cuts.ranges.map(({number,...c})=>JSON.stringify(c));if(expected.length!==actual.length||expected.some((x,i)=>x!==actual[i]))throw Error('An earlier batch is still rendering. Reopen its caption source to recover it before saving another batch.');}
 await monitorBatch(parent.id);
});};

$('finishBatch').onclick=async()=>{
 if(videoMode)return launchJokeletProjects();
 if(busy||!project||!cuts.length)return;
 const tab=inStudio()?null:window.open('',returnTarget);
 try{if(tab?.location.href==='about:blank'){tab.document.body.style.cssText='background:#111a24;color:#edf3fa;font:16px system-ui;padding:24px';tab.document.body.textContent='Saving your caption clips…';}}catch{}
 if(batchDirty||savedBatch?.status!=='complete')await $('saveBatch').onclick();
 if(batchDirty||savedBatch?.status!=='complete'||!source?.id){try{if(tab?.location.href==='about:blank')tab.close();}catch{}return;}
 try{const caption=await saveProductionStage(api,project.id,source,'animation');project=caption.project;source=project.assets.find(a=>a.id===source.id);const alpha=await saveProductionStage(api,project.id,source.cuts.clips,'alpha');project=alpha.project;}catch(e){say('Clips saved; stage verification pending: '+e.message);}
 pause();rememberBatch();
 if(inStudio()){window.parent.postMessage({protocol:'GS-Studio-1',action:'navigate-phase',phase:'captions'},location.origin);return;}
 returnCaptions(tab,{project:project.id,caption:source.id});
};

function refreshSourceList(){
 const select=$('sourceSelect');select.replaceChildren();for(const a of project.assets.filter(a=>a.role==='caption'&&isVideo(a))){const o=document.createElement('option');o.value=a.path;o.textContent=(stageRecord(project,a)?.fileName||a.name)+(videoMode?'':' · '+captionCutLabel(a));select.append(o);}select.value=source?.path||'';
}


function stepSource(delta){if(!meta||busy)return;hapticClick();const from=video.paused?selectedFrame:frameAt(meta.times,video.currentTime);seek(steppedFrame(from,delta,meta.times.length));}

$('newPass').onclick=()=>run(async()=>{
 if(!project||!meta)return;
 pause();pendingPassRequest ||= crypto.randomUUID();rememberBatch();
 let d=await api('/api/joke-project?id='+encodeURIComponent(project.id));
 if(d.capabilities?.cutPass!==1)throw Error('New-pass server update is not ready. Your cuts remain intact.');
 project=d.project;let parent=project.assets.find(a=>a.role==='caption'&&a.sha256===sourceDigest&&a.size===file.size);
 if(!parent){parent=await saveBlob(file,source.name,'caption');d=await api('/api/joke-project?id='+encodeURIComponent(project.id));project=d.project;}
 if((parent.cuts?.id||null)!==(savedBatch?.id||null)&&parent.cuts?.requestId!==pendingPassRequest)throw Error('Caption pass changed. Reopen the source before starting a new pass.');
 const ranges=cuts.length?toBatchRanges(meta,cuts):[];
 d=await api('/api/joke-project/cut-pass?id='+encodeURIComponent(project.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rev:d.rev,assetId:parent.id,previousPassId:savedBatch?.id||null,requestId:pendingPassRequest,ranges,chroma:{enabled:$('removeBlue').checked,color:$('blue').value,similarity:.18,blend:.04}})});
 project=d.project;source=project.assets.find(a=>a.id===parent.id);if(source.cuts.status!=='draft'){restoreBatch();refreshSourceList();say('Existing v'+cutPassVersion(source)+' restored; no new pass was created.');return;}savedBatch=source.cuts;undoCuts=[];cuts=[];editingId='';batchDirty=false;pendingPassRequest='';passOrigin='newpass';
 $('in').value=0;$('out').value=meta.times.length;$('cutName').value='1';refreshSourceList();rangeChanged();renderBatch();seek(0);rememberBatch();
 say('v'+cutPassVersion(source)+' started. Previous passes and clips remain saved.');
});

installAdapter('cut',{
 busy:()=>busy||savedBatch?.status==='running',pause,
 async open({project:p,session}){
  let local;try{local=JSON.parse(localStorage.getItem('gs_cliplock_batch_v2_'+p.id+'_'+session?.source?.sha256)||'null');}catch{}
  await openProject({id:p.id},p.assets.find(a=>a.id===session?.source?.assetId));
  if(session?.source&&sourcePassMatches(session,source)){
   if(!(local?.updated>session.updated&&local.passId===(savedBatch?.id||null))){
    for(const c of session.cuts||[])selection(meta.times,meta.end,c.inFrame,c.outFrame);
    cuts=session.cuts||[];editingId=session.editingId||'';pendingPassRequest=session.pendingPassRequest||'';
    $('in').value=session.marks.inFrame;$('out').value=session.marks.outFrame;$('cutName').value=session.cutName||'1';$('removeBlue').checked=session.chroma.enabled;$('blue').value=session.chroma.color;
    batchDirty=!matchesSaved();passOrigin='working';renderBatch();await seek(session.cursor||0);rememberBatch();
   }
  }
  pause();
 },
 async checkpoint({project:p}){
  pause();if(!meta||!source)return moduleSession('cut',p.id,{});
  if(!source.id){source=await saveBlob(file,source.name,'caption');savedBatch=source.cuts||null;refreshSourceList();}
  rememberBatch();return moduleSession('cut',p.id,{source:{assetId:source.id,sha256:sourceDigest,passId:savedBatch?.id||null},cuts:structuredClone(cuts),editingId,marks:{inFrame:Number($('in').value),outFrame:Number($('out').value)},cursor:selectedFrame,cutName:$('cutName').value,chroma:{enabled:$('removeBlue').checked,color:$('blue').value},pendingPassRequest,updated:Date.now()});
 }
});

if(inStudio())for(const id of ['open','assets'])$(id).onclick=()=>window.parent.postMessage({protocol:'GS-Studio-1',action:'navigate-phase',phase:'joke'},location.origin);

function clearVideoResults(){closeInlinePreview();for(const key of videoResults.keys())releasePrepared(key);prepareJobs.clear();invalidateBundle();$('videoDownloads').replaceChildren();refreshCutRows();}
function videoKey(c){return [sourceDigest,c.id,c.inFrame,c.outFrame,c.name,$('videoFormat').value].join(':');}
async function prepareVideoCut(c,onProgress=()=>{}){
 const ranges=toVideoRanges(meta,[c],$('videoFormat').value),r=ranges[0],key=videoKey(c);if(videoResults.has(key))return videoResults.get(key);
 pauseInlinePreview();pause();const job={state:'preparing',progress:0,error:''};prepareJobs.set(key,job);refreshCutRows();controller=new AbortController();const signal=controller.signal;controls();say('Preparing '+c.name+' · 0%');
 // Paint the visible row state before initializing a codec, even on a busy phone.
 await new Promise(resolve=>{const timer=setTimeout(resolve,100);requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);resolve();}));});
 try{const output=await cut(file,meta,r.inFrame,r.outFrame,$('videoFormat').value,{signal,onProgress:p=>{job.progress=Math.max(0,Math.min(99,Math.floor(p*100)));onProgress(job.progress);const ui=cutRows.get(c.id);if(ui)refreshCutRow(ui);say('Preparing '+c.name+' · '+job.progress+'%');}});
  const url=URL.createObjectURL(output.blob),recipe={schema:'GS-ClipLockCut-1',release:'R16',source:{name:source.name,path:source.path||null,sha256:sourceDigest,bytes:file.size},selection:{...output.range,outExclusive:true},output:{...output.verified,format:output.format},audio:meta.audio?'Primary source soundtrack retained.':'Silent source.'};
  const data={...output,url,name:r.name,recipe};videoResults.set(key,data);job.state='ready';job.progress=100;refreshCutRows();return data;
 }catch(e){job.state='error';job.error=signal.aborted?'Cancelled.':e.message||'Preparation failed.';refreshCutRows();throw e;}finally{controller=null;controls();}
}
function currentCutList(){return cutListRecipe({name:source.name,path:source.path||null,sha256:sourceDigest,bytes:file.size},meta,cuts);}
function downloadJSON(data,name){const uri=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=uri;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(uri),30000);}
$('saveCutList').onclick=()=>downloadJSON(currentCutList(),'ClipLock_cut-list.json');
function restoreCutList(recipe){const recovered=readCutList(recipe,meta,sourceDigest);pause();if(cuts.length)localStorage.setItem(draftKey()+'_archived_'+Date.now(),JSON.stringify(currentCutList()));checkpointCuts();clearVideoResults();cuts=recovered;editingId='';const marks=nextMarks(cuts.at(-1).outFrame,meta.times.length);$('in').value=marks.inFrame;$('out').value=marks.outFrame;$('cutName').value=String(cuts.length+1);changedBatch();rangeChanged();say('Restored '+cuts.length+' cuts. '+(recipe.source.sha256?'Source hash matched.':'Review against the same source; this recovery has no source hash.')+' Undo can restore the previous list.');}
$('importCutList').onclick=()=>$('cutListFile').click();$('cutListFile').onchange=guard(async e=>{const f=e.target.files[0];if(f){if(f.size>1000000)throw Error('Choose a cut list under 1 MB.');restoreCutList(JSON.parse(await f.text()));}e.target.value='';});
$('recoverEP4').onclick=guard(async()=>{const r=await fetch(new URL('./EP4_RECOVERED_CUTS_20261101.json',import.meta.url));if(!r.ok)throw Error('EP4 cut recovery unavailable.');restoreCutList(await r.json());});
$('cutName').oninput=()=>rememberBatch();window.addEventListener('pagehide',rememberBatch);
$('cancelVideo').onclick=()=>controller?.abort();
$('videoFormat').onchange=()=>{clearVideoResults();rangeChanged();rememberBatch();};
$('loadVideo').onclick=()=>$('videoFile').click();$('loadPhotos').onclick=$('emptyPhotos').onclick=()=>$('videoPhotos').click();const loadLocalVideo=guard(async e=>{const f=e.target.files[0];if(f)await loadSource(f,{name:f.name,kind:'device'});e.target.value='';});$('videoFile').onchange=$('videoPhotos').onchange=loadLocalVideo;
function applyModeUI(){
 document.body.classList.toggle('video-mode',videoMode);document.title=(videoMode?'Video Clipper':'Caption Clipper')+' · GS-TOOL-CLIPLOCK · R16';$('toolTitle').textContent=videoMode?'Video Clipper':'Caption Clipper';$('loadVideo').hidden=!videoMode;$('loadPhotos').hidden=$('emptyPhotos').hidden=!videoMode;$('videoExport').hidden=!videoMode;$('open').textContent=videoMode?'Saved videos':'Open project';$('emptyMessage').textContent=videoMode?'Load the finished video. Its voice, music and effects stay together.':'Open the joke project and its caption animation.';$('importCaption').textContent=videoMode?'Files':'Import caption animation';$('importCaption').onclick=()=>$(videoMode?'videoFile':'import').click();$('saveBatch').textContent=videoMode?'All clips · ZIP':'Save clips';
 for(const [id,active]of [['videoMode',videoMode],['captionMode',!videoMode]]){if(active)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');}
 const details=$('sourceSelect').closest('details');details.querySelector('summary').textContent=videoMode?'Video source':'Caption source';$('sourceSelect').closest('label').firstChild.textContent=videoMode?'Video ':'Caption animation';details.querySelector('p:last-child').textContent=videoMode?'Video cuts keep their source dimensions, timing and sound. Downloads and cut recipes are separate from cloud project saves.':'Mark on the native caption source frames. Save clips creates silent components at25fps, preserving the original. Drive backup remains queued until verified.';
 const footer=document.querySelector('#projectPicker .picker-footer button');if(footer)footer.textContent=videoMode?'Load video from device':'Import into current project';
 controls();
}
async function switchMode(next){
 if(busy||next===videoMode||inStudio())return;clearVideoResults();undoCuts=[];
 pause();rememberBatch();modeSources.set(videoMode?'video':'caption',{file,source,project});videoMode=next;history.replaceState(null,'',location.pathname+'?mode='+(videoMode?'video':'caption'));
 const cached=modeSources.get(videoMode?'video':'caption');project=cached?cached.project:project;applyModeUI();
 if(cached?.file){await loadSource(cached.file,cached.source);return;}
 ++loadEpoch;file=meta=source=null;cuts=[];editingId='';sourceDigest='';savedBatch=null;batchDirty=false;pendingPassRequest='';passOrigin='new';selectedFrame=0;video.removeAttribute('src');video.load();if(sourceURL){URL.revokeObjectURL(sourceURL);sourceURL=null;}video.hidden=true;$('empty').hidden=false;$('clock').textContent='No source';$('cutName').value='1';$('source').textContent=videoMode?'No video loaded.':'No caption animation loaded.';$('projectName').textContent=project?.title||'No project selected';$('sourceSelect').replaceChildren();
 if(project)for(const a of project.assets.filter(a=>(videoMode||a.role==='caption')&&isVideo(a))){const o=document.createElement('option');o.value=a.path;o.textContent=a.name;$('sourceSelect').append(o);}$('sourceSelect').selectedIndex=-1;renderBatch();controls();say('Choose a '+(videoMode?'video with sound':'caption animation')+'. The other mode’s working cuts remain saved.');
}
$('videoMode').onclick=e=>{e.preventDefault();guard(()=>switchMode(true))();};$('captionMode').onclick=e=>{e.preventDefault();guard(()=>switchMode(false))();};
if(inStudio())document.querySelector('.mode-switch').hidden=true;
applyModeUI();
if(new URLSearchParams(location.search).get('recover')==='ep4'){$('frameTools').open=true;say('EP4 cut points recovered. Load the same 1674-frame source, then tap Restore six EP4 cuts.');}
controls();


$('copyList').onclick=async()=>{const text=cutListText({source:{name:source.name,sha256:sourceDigest},totalFrames:meta.times.length,cuts});try{await navigator.clipboard.writeText(text);say('Copied all '+cuts.length+' cuts, source file and timestamp.');}catch{$('copyListText').value=text;$('copyListDialog').showModal();$('copyListText').focus();$('copyListText').select();say('Select and copy the complete list below.');}};
$('closeCopyList').onclick=()=>$('copyListDialog').close();

// Transfer complete video cuts to independent jokelet workspaces, not a caption batch.
function launchJokeletProjects(){
 if(busy)return say('Wait for the current preparation to finish.');
 try{
  const snapshot=cuts.map((c,i)=>{
   cutForExport(c);const r=selection(meta.times,meta.end,c.inFrame,c.outFrame);
   return {cut:{...c},origin:normalizeCutOrigin({source:{name:source.name,sha256:sourceDigest,frames:meta.times.length,bytes:file.size},cut:{...c,index:i+1,start:r.start,end:r.end}})};
  });
  const digest=sourceDigest;beginCutQueue(digest,snapshot.map(x=>x.origin));pause();pauseInlinePreview();
  const url=new URL('../caplock/?v=R17-recovery&cuts='+digest,location.href),tab=window.open('','gs-caplock-jokelets');
  if(tab){try{if(tab.location.href==='about:blank'||new URL(tab.location.href).pathname!==url.pathname)tab.location.href=url.href;else tab.postMessage({protocol:'GS-JokeletCuts-1',sourceHash:digest},location.origin);tab.focus();}catch{tab.location.href=url.href;}}
  run(async()=>{
   let ready=0;
   for(const {cut:c,origin}of snapshot){
    const id=await cutProjectId(origin);cutQueueStatus(digest,id,'preparing');say('CapLock jokelets · '+origin.cut.index+'/'+snapshot.length+' · '+c.name);
    try{
     const cached=await getCutProject(id);
     if(cached?.hasVideo||cached?.cloud)await stageCutProject(origin);
     else{let last=0;const output=await prepareVideoCut(c,p=>{if(Date.now()-last>400){last=Date.now();cutQueueStatus(digest,id,'preparing','',p);}});await stageCutProject(origin,output);}
     cutQueueStatus(digest,id,'ready','',100);ready++;
    }catch(e){cutQueueStatus(digest,id,'error',e.message);}
   }
   say(ready+' of '+snapshot.length+' jokelets ready in CapLock. '+(ready===snapshot.length?'Choose a cut to caption it.':'Tap CapLock again to retry the remaining cuts.'));
  });
 }catch(e){say(e.message);}
}

const playerShell=document.querySelector('.gs-player-shell');if(playerShell)new MutationObserver(()=>{if(!playerShell.classList.contains('drawer-closed'))pauseInlinePreview();}).observe(playerShell,{attributes:true,attributeFilter:['class']});

window.addEventListener('message',event=>{
 if(inStudio()||event.origin!==location.origin||event.data?.protocol!=='GS-CaptionClipper-1')return;
 const {project:id,asset,returnTo}=event.data;if(typeof id!=='string'||typeof asset!=='string')return;
 guard(async()=>{if(busy)throw Error('Finish the current clip preparation before opening another animation.');rememberBatch();if(videoMode)await switchMode(false);returnTarget=caplockTarget(returnTo);await openProject({id});const a=project.assets.find(a=>a.id===asset);if(a&&a.id!==source?.id)await useAsset(a);history.replaceState(null,'',location.pathname+'?mode=caption&v=R14-workflow&project='+encodeURIComponent(id)+(asset?'&asset='+encodeURIComponent(asset):'')+'&returnTo='+returnTarget);say('Cut this caption animation, then tap Next → CapLock to return to '+project.title+'.');})();
});
