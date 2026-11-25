import {newProject,initialCamera,stateAt,Action,CameraTouch,CameraJoystick,drawScene,pathDocument,importDocument,clamp,snapSquare} from './core.mjs?v=3';
import {inspectSource,renderCamera} from './render.mjs?v=1';
import {mountPlayerScribe} from '../../shared/player-scribe.mjs?v=34';
import {mountClipAudio,fadeGainAt} from '../../shared/clip-audio.mjs?v=3';
import {PLAYER_PROFILE} from '../../shared/player-shell.mjs?v=34';

const $=id=>document.getElementById(id),video=$('sourceVideo'),canvas=$('picture'),ctx=canvas.getContext('2d',{alpha:false,colorSpace:'srgb'}),view=$('viewport');
const KEY='gs-camlock-project-v1'+(new URLSearchParams(location.search).get('qa')==='acceptance'?'-qa':''),COPY=v=>JSON.parse(JSON.stringify(v));
const VERSION='V1.2',DOCK_KEY=KEY+'-player-docked';
let project=newProject(),file=null,sourceURL=null,camera=initialCamera(),action=null,reverseTimer=null,busy=false,renderResult=null,renderURL=null,cancelled=false;
let loading=0,playRequest=0,raf=0,sampleTimer=null,lastTime=0,stageGesture=null,stagePoints=new Map(),dirty=false;
let playerDocked=true,topMenuOpen=false;
let cardPanels=[],wizard=null;
let joystickPointer=null;const joystickKeys=new Set();
const say=text=>$('status').textContent=text;
const error=e=>{say(e.message||String(e));console.error(e);};
const guard=fn=>(...args)=>Promise.resolve().then(()=>fn(...args)).catch(error);
const active=()=>!!action?.active;
const frame=()=>Math.floor((video.currentTime||0)*project.fps+1e-5);
const endpoint=()=>Math.min(project.source?.duration||0,project.start+project.settings.duration);
const reviewedEnd=()=>Math.min(endpoint(),project.path.at(-1)?.t??endpoint());
function persist(){project.release=VERSION;project.scribe=$('gs-notes')?.value||'';try{localStorage.setItem(KEY,JSON.stringify(project));dirty=false;}catch{say('Draft storage is full. Save project before closing.');}}
function invalidate(){dirty=true;if(renderResult){renderResult=null;if(renderURL)URL.revokeObjectURL(renderURL);renderURL=null;$('renderInfo').textContent='Camera edit changed. Render again to export this version.';}updateControls();}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);}
function jsonDownload(value,suffix){download(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),'CamLock_'+suffix+'_V01.json');}
function sourceReady(){return !!file&&video.readyState>=2;}
function audioPreview(){video.muted=active()&&$('mutePerformance').checked;const start=project.start,end=reviewedEnd();video.volume=clamp(project.audio.volume*fadeGainAt(project.audio,start,end,video.currentTime||start),0,1);}
function updateControls(){
 const recording=active(),touching=touch.size>0||joystickPointer!==null||joystickKeys.size>0,ready=sourceReady();
 for(const b of $('rail').querySelectorAll('button'))b.disabled=busy||!ready;
 $('action').disabled=busy||!ready||!project.stage.locked||recording&&touching||$('settingsCard').open;
 $('wizard').disabled=busy||!ready||recording;
 $('action').textContent=recording?'Ⅱ Pause':'● Action';$('action').setAttribute('aria-label',recording?'Pause Action':'Start Action');
 $('lockStage').textContent=project.stage.locked?'Unlock stage':'Lock stage';$('lockStage').setAttribute('aria-pressed',String(project.stage.locked));
 if(recording)for(const b of $('rail').querySelectorAll('button'))if(b.id!=='action')b.disabled=true;
 for(const b of document.querySelectorAll('.transport button,.transport input'))b.disabled=busy||!ready||recording;
 $('settings').inert=busy||recording;$('sourceDrawer').inert=busy||recording;$('scribe').inert=busy||recording;
 $('settingsCard').inert=busy||recording;
 $('reference').querySelector('.gs-scribe-button')?.toggleAttribute('disabled',busy||recording);
 $('export').disabled=busy||recording||!renderResult;$('share').disabled=!renderResult||busy;$('reviewRender').disabled=!renderResult||busy;
 $('render').disabled=busy||recording||!ready||!project.path.length||!!wizard;
 if(wizard)$('lockStage').disabled=true;
 $('dockHandle').disabled=busy||recording;
 $('recording').hidden=!recording;view.classList.toggle('recording',recording);
 $('modeLabel').textContent=!ready?'LOAD SOURCE':wizard?'WIZARD SETUP':project.stage.locked?($('touchArmed').checked&&!$('settingsCard').open?'HOT · TOUCH TO START':'CAMERA READY'):'STAGE SETUP';
 $('play').textContent=!video.paused&&!recording?'Ⅱ Pause':'▶ Play';
 $('emptyLoad').hidden=!!file||busy;
 $('joystick').hidden=!ready||!project.stage.locked||!project.controls.joystick||!!wizard||$('settingsCard').open;
 $('joystick').disabled=busy;
 for(const input of document.querySelectorAll('[data-stage],#aspect,#outputWidth,#outputHeight,#opening,#openingHere'))input.disabled=project.stage.locked;
 document.querySelector('[data-stage="r"]').disabled=project.stage.locked||!project.settings.rotation.enabled;
 audioRefresh?.();
}
function redraw(){
 if(video.seeking)return;
 if(!active())camera=stateAt(project.path,video.currentTime||project.start);
 drawScene(ctx,sourceReady()?video:null,project.stage,camera,canvas.width,canvas.height);
 const t=video.currentTime||0;$('clock').textContent='F'+frame()+' · '+t.toFixed(3)+'s · '+project.fps+'fps';
 $('clock').dataset.frame=frame();$('clock').dataset.time=t;$('clock').dataset.fps=project.fps;
 $('timeline').value=project.source?.duration?t/project.source.duration:0;
 if(document.activeElement!==$('goFrame'))$('goFrame').value=frame();
}
function fitCanvas(){const s=project.stage,ratio=s.width/s.height;view.style.setProperty('--ratio',s.width+'/'+s.height);view.style.setProperty('--aspect',ratio);canvas.width=Math.round(Math.min(720,s.width)/2)*2;canvas.height=Math.round(canvas.width/ratio);redraw();}
function syncFields(){
 for(const el of document.querySelectorAll('[data-stage]')){const value=project.stage[el.dataset.stage];if(el.type==='checkbox')el.checked=value;else el.value=value;}
 for(const [id,value] of Object.entries({outputWidth:project.stage.width,outputHeight:project.stage.height,opening:project.start,zoomEnd:project.settings.zoom.end,zoomDuration:project.settings.zoom.duration,zoomCurve:project.settings.zoom.curve,rotationDegrees:Math.abs(project.settings.rotation.degrees),rotationDirection:Math.sign(project.settings.rotation.degrees)||1,rotationDuration:project.settings.rotation.duration,rotationCurve:project.settings.rotation.curve,actionDuration:project.settings.duration,speed:project.performanceSpeed,fps:project.fps}))$(id).value=value;
 $('rotationEnabled').checked=!!project.settings.rotation.enabled;$('rotationSnap').checked=project.settings.rotation.snap!==false;
 $('touchSensitivity').value=project.controls.touchGain;$('joystickEnabled').checked=project.controls.joystick;$('joystickSpeed').value=project.controls.joystickSpeed*100;
 $('zoomEnd').value=Number((project.settings.zoom.end*100).toFixed(3));$('zoomMove').value=project.settings.zoom.end===1?'hold':project.settings.zoom.end>1?'push':'pull';
 const ratio=project.stage.width/project.stage.height;$('aspect').value=Object.keys(ratios).find(k=>Math.abs(ratios[k][0]/ratios[k][1]-ratio)<.0001)||'custom';
 fitCanvas();updateControls();
}
function stopReverse(){clearInterval(reverseTimer);reverseTimer=null;$('reverse').setAttribute('aria-pressed','false');}
function stop(){
 ++playRequest;stopReverse();clearInterval(sampleTimer);sampleTimer=null;
 if(active())sample();
 if(action){camera=action.stop(Math.max(lastTime,Math.min(video.currentTime,action.end)));action=null;invalidate();}
 video.pause();video.playbackRate=1;touch.clear();resetJoystick();stagePoints.clear();updateControls();audioPreview();redraw();persist();
}
function seek(t){
 if(active()||busy||!file)return;
 video.pause();t=clamp(t,0,Math.max(0,project.source.duration-1/project.fps));
 camera=stateAt(project.path,t);video.currentTime=t+1e-7;lastTime=t;
 if(!video.seeking)redraw();updateControls();
}
async function begin(){
 if(active())return;if(!sourceReady()||!project.stage.locked||busy)throw Error('Load a source and lock the stage first.');
 stopReverse();
 const at=video.currentTime;
 if(at<project.start-1e-4||at>=endpoint()-1e-6)throw Error('Go to a source time inside the Action range first.');
 const previousPath=project.path,previousSegments=COPY(project.segments);
 action=new Action(project,at,project.source.duration);camera={...action.state};lastTime=at;joystick.reset(at);invalidate();
 const request=++playRequest;video.playbackRate=project.performanceSpeed;audioPreview();updateControls();
 // Source time is still the only trajectory clock. Keep sampling if canvas rAF is throttled.
 clearInterval(sampleTimer);sampleTimer=setInterval(sample,1000/60);
 try{await video.play();if(request!==playRequest)video.pause();else{say('Action · direct with touch or joystick. Lift freely, then Pause to edit.');loop();}}
 catch(e){if(request===playRequest){clearInterval(sampleTimer);sampleTimer=null;action=null;resetJoystick();project.path=previousPath;project.segments=previousSegments;video.playbackRate=1;updateControls();}throw e;}
}
function sample(){
 if(!active())return;
 const t=Math.max(lastTime,Math.min(video.currentTime,action.end));lastTime=t;
 const rect=view.getBoundingClientRect();joystick.advance(t,rect.width,rect.height);camera=action.update(t);
 if(!action.active){clearInterval(sampleTimer);sampleTimer=null;video.pause();const end=action.end;action=null;touch.clear();resetJoystick();video.playbackRate=1;video.currentTime=end;audioPreview();updateControls();persist();say('Action complete · '+project.path.length+' camera samples. Play to review or Render.');}
}
function loop(){cancelAnimationFrame(raf);function tick(){if(active())sample();else if(!video.paused&&video.currentTime>=reviewedEnd()-1e-5){video.pause();updateControls();}
  audioPreview();redraw();if(active()||!video.paused)raf=requestAnimationFrame(tick);
 }raf=requestAnimationFrame(tick);}
async function play(){
 if(!sourceReady()||busy||active())return;
 stopReverse();if(!video.paused){video.pause();updateControls();return;}
 if(video.currentTime>=reviewedEnd()-1e-5){say('At the end. Press Start or choose a frame to review.');return;}
 video.playbackRate=1;audioPreview();await video.play();updateControls();loop();
}
function translateCamera(dx,dy){if(active()){action.state.x+=dx;action.state.y+=dy;}}
const touch=new CameraTouch({read:()=>action?.state||camera,sensitivity:()=>project.controls.touchGain,rotationEnabled:()=>!!project.settings.rotation.enabled,translate:translateCamera,rotate:degrees=>{if(active())action.rotate(degrees,Math.max(lastTime,video.currentTime));}});
const joystick=new CameraJoystick({read:()=>action?.state||camera,translate:translateCamera,speed:()=>project.controls.joystickSpeed});
function paintJoystick(){const radius=$('joystick').clientWidth*.32;$('joystickKnob').style.transform=`translate(${joystick.x*radius}px,${joystick.y*radius}px)`;}
function resetJoystick(){joystickPointer=null;joystickKeys.clear();joystick.reset();paintJoystick();}
function joystickReady(){
 if(busy||!sourceReady()||!project.stage.locked||!project.controls.joystick||touch.size||wizard||$('settingsCard').open)return false;
 if(!active()){if(!$('touchArmed').checked||!video.paused)return false;void begin().catch(error);}
 return active();
}
function moveJoystick(e){const rect=$('joystick').getBoundingClientRect();joystick.set(e.clientX-rect.left-rect.width/2,e.clientY-rect.top-rect.height/2,rect.width*.32);paintJoystick();}
$('joystick').addEventListener('pointerdown',e=>{
 e.preventDefault();e.stopPropagation();if(e.button>0||joystickPointer!==null||joystickKeys.size||!joystickReady())return;
 sample();if(!active())return;joystickPointer=e.pointerId;try{$('joystick').setPointerCapture(e.pointerId);}catch{}moveJoystick(e);updateControls();
});
$('joystick').addEventListener('pointermove',e=>{e.stopPropagation();if(e.pointerId!==joystickPointer)return;e.preventDefault();sample();if(active())moveJoystick(e);});
function releaseJoystick(e){e.stopPropagation();if(e.pointerId!==joystickPointer)return;sample();resetJoystick();updateControls();}
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(type,releaseJoystick);
const joystickArrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
function keyJoystick(){const vector=[...joystickKeys].reduce((sum,key)=>sum.map((n,i)=>n+joystickArrows[key][i]),[0,0]);joystick.set(...vector,1);paintJoystick();}
$('joystick').addEventListener('keydown',e=>{e.stopPropagation();if(!joystickArrows[e.key])return;e.preventDefault();if(joystickPointer!==null||!joystickReady())return;sample();if(active()){joystickKeys.add(e.key);keyJoystick();updateControls();}});
$('joystick').addEventListener('keyup',e=>{e.stopPropagation();if(!joystickArrows[e.key])return;e.preventDefault();sample();joystickKeys.delete(e.key);keyJoystick();updateControls();});
$('joystick').addEventListener('blur',()=>{if(joystickKeys.size){sample();resetJoystick();updateControls();}});
window.addEventListener('blur',()=>{if(joystickPointer!==null||joystickKeys.size){sample();resetJoystick();updateControls();}});
const point=e=>({x:e.clientX,y:e.clientY});
function rebaseStage(){
 const [a,b]=stagePoints.values();stageGesture=a?{stage:COPY(project.stage),a:{...a},mid:b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2}:{...a},distance:b?Math.hypot(b.x-a.x,b.y-a.y):0,angle:b?Math.atan2(b.y-a.y,b.x-a.x):0}:null;
}
view.addEventListener('pointerdown',e=>{
 if(e.target.closest('button')||busy||!sourceReady()||e.button>0||joystickPointer!==null||joystickKeys.size)return;e.preventDefault();try{view.setPointerCapture(e.pointerId);}catch{}
 if(project.stage.locked){
  if(!active()&&(!$('touchArmed').checked||!video.paused||wizard||$('settingsCard').open))return;
  if(!active())void begin().catch(error);
  if(active())touch.down(e.pointerId,e.clientX,e.clientY);
 }else{if(stagePoints.size&&!project.settings.rotation.enabled)return;video.pause();stagePoints.set(e.pointerId,point(e));rebaseStage();}
 updateControls();
});
view.addEventListener('pointermove',e=>{
 if(busy)return;
 const rect=view.getBoundingClientRect();
 if(project.stage.locked&&active()){
  if(!touch.points.has(e.pointerId))return;e.preventDefault();sample();if(!active())return;touch.move(e.pointerId,e.clientX,e.clientY,rect.width,rect.height);sample();redraw();
 }else if(!project.stage.locked&&stagePoints.has(e.pointerId)&&stageGesture){
  e.preventDefault();stagePoints.set(e.pointerId,point(e));const [a,b]=stagePoints.values(),g=stageGesture,mid=b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2}:a;
  project.stage.x=g.stage.x+(mid.x-g.mid.x)/rect.width;project.stage.y=g.stage.y+(mid.y-g.mid.y)/rect.height;
  if(b&&project.settings.rotation.enabled&&g.distance>2&&Math.hypot(b.x-a.x,b.y-a.y)>2){project.stage.scale=g.stage.scale*Math.hypot(b.x-a.x,b.y-a.y)/g.distance;project.stage.r=snapSquare(g.stage.r+(Math.atan2(b.y-a.y,b.x-a.x)-g.angle)*180/Math.PI,project.settings.rotation.snap);}
  invalidate();redraw();
 }
});
function release(e){if(active()&&touch.points.has(e.pointerId)){sample();touch.up(e.pointerId);}
 if(stagePoints.delete(e.pointerId)){rebaseStage();syncFields();persist();}updateControls();}
for(const name of ['pointerup','pointercancel','lostpointercapture'])view.addEventListener(name,release);
view.addEventListener('wheel',e=>{e.preventDefault();if(project.stage.locked||busy||!sourceReady())return;project.stage.scale*=Math.exp(-e.deltaY*.001);invalidate();syncFields();persist();},{passive:false});
view.addEventListener('contextmenu',e=>e.preventDefault());
view.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(active())stop();else void begin().catch(error);}});

async function openSource(candidate,{reconnect=false}={}){
 if(active()||busy)return;
 const token=++loading;busy=true;updateControls();say('Checking source frames…');
 try{
  const meta=await inspectSource(candidate);say('Identifying original source…');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await candidate.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
  if(token!==loading)return;
  const matches=project.source?.sha256===digest;
  if(reconnect&&project.source?.sha256&&!matches)throw Error('This is a different source. Choose the saved original, or Load source to start a new project.');
  const nextURL=URL.createObjectURL(candidate),testVideo=document.createElement('video');testVideo.preload='auto';testVideo.muted=true;testVideo.src=nextURL;
  try{await new Promise((resolve,reject)=>{testVideo.onloadeddata=resolve;testVideo.onerror=()=>reject(Error('This browser cannot decode the source picture.'));});}catch(e){URL.revokeObjectURL(nextURL);throw e;}
  testVideo.removeAttribute('src');testVideo.load();stopReverse();video.pause();
  closeSettingsCard();if(!matches){if(project.source)jsonArchive();project=newProject();camera=initialCamera();}
  project.source={name:candidate.name,size:candidate.size,lastModified:candidate.lastModified,sha256:digest,...meta};
  file=candidate;if(sourceURL)URL.revokeObjectURL(sourceURL);sourceURL=nextURL;
  await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(Error('The source failed to load.'));video.src=sourceURL;video.load();});
  if(project.start>=meta.duration)throw Error('This saved opening is beyond the source duration.');
  $('sourceName').textContent=candidate.name;await Promise.resolve();video.currentTime=project.start;camera=stateAt(project.path,project.start);
  revealTopMenu(false);syncFields();invalidate();persist();say(matches?'Original reconnected · saved camera instructions retained.':'Set the opening composition, then Lock stage.');
 }finally{busy=false;updateControls();}
}
function jsonArchive(){try{localStorage.setItem(KEY+'-previous',JSON.stringify(project));}catch{}}
$('loadSource').onclick=$('emptyLoad').onclick=()=>$('sourceFile').click();
$('sourceFile').onchange=guard(async e=>{const f=e.target.files[0];e.target.value='';if(f)await openSource(f);});
$('loadURL').onclick=guard(async()=>{const url=new URL($('sourceURL').value);if(url.protocol!=='https:')throw Error('Use an HTTPS video URL.');say('Loading source…');const response=await fetch(url);if(!response.ok)throw Error('Source request failed: '+response.status);const blob=await response.blob();await openSource(new File([blob],decodeURIComponent(url.pathname.split('/').at(-1))||'Source.mp4',{type:blob.type}),{reconnect:!!project.source&&!file});});
$('openDocument').onclick=$('openSaved').onclick=()=>$('documentFile').click();
$('documentFile').onchange=guard(async e=>{
 const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>150*1024*1024)throw Error('Camera document is too large.');
 const data=JSON.parse(await f.text()),next=importDocument(data,project);
 if(data.schema==='CamLockPath-1.0'&&file&&next.path.at(-1)?.t>project.source.duration+1e-5)throw Error('This source is shorter than the saved path.');
 stop();jsonArchive();
 if(data.schema==='CamLockProject-1.0'&&next.source?.sha256!==project.source?.sha256){file=null;video.removeAttribute('src');video.load();if(sourceURL)URL.revokeObjectURL(sourceURL);sourceURL=null;}
 project=next;camera=stateAt(project.path,project.start);$('sourceName').textContent=file?file.name:project.source?.name||'No source';
 await Promise.resolve(); // Let the original Scribe bind its source draft before restoring project notes.
 if($('gs-notes')){$('gs-notes').value=project.scribe;$('gs-notes').dispatchEvent(new Event('input',{bubbles:true}));}
 syncFields();invalidate();if(file)seek(project.start);persist();say(file?'Saved instructions opened.':'Saved instructions opened. Load the original video to reconnect.');
});
$('start').onclick=()=>{stopReverse();seek(project.start);};$('play').onclick=guard(play);
$('action').onclick=guard(()=>active()?stop():begin());
$('lockStage').onclick=()=>{if(!file||active())return;video.pause();project.stage.locked=!project.stage.locked;touch.clear();stagePoints.clear();$('stage').open=!project.stage.locked;invalidate();syncFields();persist();say(project.stage.locked?'Stage locked · touch the viewport or press Action.':'Stage unlocked · drag, pinch, or change its settings.');};
$('reverse').onclick=()=>{if(reverseTimer!==null){stopReverse();return;}if(active()||!file||busy)return;video.pause();$('reverse').setAttribute('aria-pressed','true');reverseTimer=setInterval(()=>{if(frame()>0)seek((frame()-1)/project.fps);else stopReverse();},Math.max(20,1000/project.fps));updateControls();};
for(const [id,delta]of [['back25',-25],['next25',25]])$(id).onclick=()=>{stopReverse();seek((frame()+delta)/project.fps);};
for(const [id,dir]of [['back',-1],['next',1]]){let timer=null,origin=0;$(id).onclick=()=>{stopReverse();if(timer){clearTimeout(timer);timer=null;seek((origin+dir*25)/project.fps);}else{origin=frame();timer=setTimeout(()=>{timer=null;seek((origin+dir)/project.fps);},260);}};}
$('go').onclick=()=>{stopReverse();const f=$('goFrame').valueAsNumber;if(Number.isSafeInteger(f)&&f>=0)seek(f/project.fps);};
$('goFrame').onkeydown=e=>{if(e.key==='Enter')$('go').click();};
for(const button of document.querySelectorAll('[data-section]'))button.onclick=()=>openSettingsCard(button.dataset.section);

const ratios={'9:16':[1080,1920],'16:9':[1920,1080],'1:1':[1080,1080],'4:5':[1080,1350]};
for(const el of document.querySelectorAll('[data-stage]'))el.onchange=()=>{if(project.stage.locked)return;const value=el.type==='checkbox'?el.checked:el.valueAsNumber;if(typeof value==='number'&&(!Number.isFinite(value)||el.dataset.stage==='scale'&&value<=0)){syncFields();return;}project.stage[el.dataset.stage]=value;invalidate();redraw();persist();};
$('aspect').onchange=()=>{if(project.stage.locked)return;const size=ratios[$('aspect').value];if(size){[project.stage.width,project.stage.height]=size;invalidate();syncFields();persist();}};
for(const id of ['outputWidth','outputHeight'])$(id).onchange=guard(()=>{const width=$('outputWidth').valueAsNumber,height=$('outputHeight').valueAsNumber;if(![width,height].every(n=>Number.isInteger(n)&&n>=2&&n<=7680&&n%2===0)){syncFields();throw Error('Output dimensions must be even whole numbers from 2 to 7680.');}project.stage.width=width;project.stage.height=height;invalidate();syncFields();persist();});
function setOpening(t){if(project.stage.locked)return;if(!Number.isFinite(t)||t<0||t>=project.source?.duration)throw Error('Choose an opening inside the source.');project.start=t;invalidate();syncFields();seek(t);persist();}
$('opening').onchange=guard(()=>setOpening($('opening').valueAsNumber));$('openingHere').onclick=guard(()=>setOpening(video.currentTime));
function settingsChanged(){
 const duration=$('actionDuration').valueAsNumber,z=$('zoomEnd').valueAsNumber/100,zd=$('zoomDuration').valueAsNumber,rd=$('rotationDuration').valueAsNumber,degrees=$('rotationDegrees').valueAsNumber;
 if(![duration,z,zd,rd].every(n=>Number.isFinite(n)&&n>0)||!Number.isFinite(degrees)||degrees<0||z>10000||duration>86400){syncFields();throw Error('Enter valid positive durations and magnification.');}
 project.settings={duration,zoom:{end:z,duration:zd,curve:$('zoomCurve').value},rotation:{enabled:$('rotationEnabled').checked,snap:$('rotationSnap').checked,degrees:degrees*Number($('rotationDirection').value),duration:rd,curve:$('rotationCurve').value}};
 $('zoomMove').value=z===1?'hold':z>1?'push':'pull';
 project.performanceSpeed=Number($('speed').value);project.fps=Number($('fps').value);invalidate();redraw();persist();
}
for(const id of ['zoomEnd','zoomDuration','zoomCurve','rotationEnabled','rotationSnap','rotationDegrees','rotationDirection','rotationDuration','rotationCurve','actionDuration','speed','fps'])$(id).onchange=guard(settingsChanged);
$('zoomMove').onchange=guard(()=>{const move=$('zoomMove').value,value=$('zoomEnd').valueAsNumber;if(move==='hold')$('zoomEnd').value=100;else if(move==='push'&&value<=100)$('zoomEnd').value=150;else if(move==='pull'&&value>=100)$('zoomEnd').value=70;settingsChanged();});
$('touchArmed').onchange=updateControls;$('mutePerformance').onchange=audioPreview;
for(const id of ['touchSensitivity','joystickEnabled','joystickSpeed'])$(id).onchange=guard(()=>{
 const touchGain=Number($('touchSensitivity').value),joystickSpeed=$('joystickSpeed').valueAsNumber/100;
 if(![1,.5,.25,.125].includes(touchGain)||!Number.isFinite(joystickSpeed)||joystickSpeed<.01||joystickSpeed>2){syncFields();throw Error('Choose a valid touch sensitivity and joystick speed from 1% to 200%.');}
 project.controls={touchGain,joystick:$('joystickEnabled').checked,joystickSpeed};resetJoystick();updateControls();persist();
});
$('format').onchange=()=>{invalidate();persist();};
let audioRefresh=mountClipAudio($('audio'),{prefix:'cam',read:()=>({...project.audio,editable:!busy&&!active(),hasAudio:project.source?.hasAudio,duration:Math.max(0,reviewedEnd()-project.start)}),write:value=>{Object.assign(project.audio,value);invalidate();audioPreview();persist();audioRefresh();},label:'Audio'});
mountPlayerScribe($('reference'),{tool:'camlock',clock:$('clock'),media:video,source:()=>project.source?.name||'',sourceElement:$('sourceName'),section:$('scribe'),sourceReady,pauseEditor:stop,
 getPosition:()=>file?{frame:frame(),time:video.currentTime,fps:project.fps}:null,restoreMark:position=>seek(position.time??position.frame/project.fps)});
$('reference').querySelector('.gs-scribe-button').onclick=()=>openSettingsCard('scribe');
$('scribe').addEventListener('toggle',()=>{try{localStorage.setItem('gs-camlock-scribe-open',String($('scribe').open));}catch{}});
$('gs-notes').addEventListener('input',()=>{project.scribe=$('gs-notes').value;persist();});

function restoreCardPanels(){for(const panel of cardPanels){panel.open=false;$('settings').append(panel);}cardPanels=[];}
function showCardPanels(ids){restoreCardPanels();for(const id of ids){const panel=$(id);panel.open=true;$('cardBody').append(panel);cardPanels.push(panel);}}
function showSettingsCard(){if(!$('settingsCard').open)$('settingsCard').show();updateControls();}
function closeSettingsCard(completed=false){
 if(wizard&&!completed){const previous=wizard.previous;project.stage=previous.stage;project.settings=previous.settings;project.start=previous.start;project.performanceSpeed=previous.speed;$('touchArmed').checked=previous.armed;wizard=null;syncFields();seek(previous.time);persist();}
 wizard=null;restoreCardPanels();$('settingsCard').close();$('settingsCard').classList.remove('wizard-mode');updateControls();
}
function openSettingsCard(id){
 if(busy||active())return;stop();closeSettingsCard();$('cardTitle').textContent=$(id).querySelector('summary').textContent;
 $('wizardQuestion').hidden=true;$('wizardEffectBox').hidden=true;$('wizardBack').hidden=true;$('wizardNext').hidden=true;$('settingsDone').hidden=false;
 showCardPanels([id]);showSettingsCard();
}
$('closeSettings').onclick=$('settingsDone').onclick=()=>closeSettingsCard();
$('settingsCard').addEventListener('cancel',e=>{e.preventDefault();closeSettingsCard();});
$('settingsCard').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeSettingsCard();}});
const wizardSteps=[
 {prompt:'How should the video open?',hint:'Drag the video into its opening composition and choose its starting time.',panels:['stage']},
 {prompt:'What camera effect do you want?',hint:'Choose the movement, then adjust its magnification or enabled rotation.',panels:['magnification','rotation']},
 {prompt:'How long should Action last?',hint:'Set the source-video duration and performance speed. Arm camera makes the viewport hot.',panels:['duration']},
];
function showWizardStep(){
 const step=wizardSteps[wizard.step];$('cardTitle').textContent='CamLock wizard';$('wizardStep').textContent=['Opening','Effect','Duration'][wizard.step]+' · '+(wizard.step+1)+' of 3';$('wizardPrompt').textContent=step.prompt;$('wizardHint').textContent=step.hint;
 $('wizardQuestion').hidden=false;$('wizardEffectBox').hidden=wizard.step!==1;$('wizardBack').hidden=false;$('wizardBack').disabled=wizard.step===0;$('wizardNext').hidden=false;$('wizardNext').textContent=wizard.step===2?'Arm camera':'Next';$('settingsDone').hidden=true;
 project.stage.locked=wizard.step!==0;showCardPanels(step.panels);$('settingsCard').classList.add('wizard-mode');showSettingsCard();syncFields();
}
$('wizard').onclick=()=>{
 if(!sourceReady()||busy||active())return;stop();closeSettingsCard();
 wizard={step:0,previous:{stage:COPY(project.stage),settings:COPY(project.settings),start:project.start,speed:project.performanceSpeed,armed:$('touchArmed').checked,time:video.currentTime}};
 const z=project.settings.zoom.end,r=project.settings.rotation.enabled;$('wizardEffect').value=r?(z===1?'rotate':'combined'):(z===1?'direction':z>1?'push':'pull');
 seek(project.start);showWizardStep();
};
$('wizardEffect').onchange=guard(()=>{
 const effect=$('wizardEffect').value;
 if(effect==='direction'||effect==='rotate')$('zoomEnd').value=100;
 if(effect==='push'&&Number($('zoomEnd').value)<=100)$('zoomEnd').value=150;
 if(effect==='pull'&&Number($('zoomEnd').value)>=100)$('zoomEnd').value=70;
 if(effect==='combined'&&Number($('zoomEnd').value)===100)$('zoomEnd').value=130;
 $('rotationEnabled').checked=['rotate','combined'].includes(effect);
 if(effect==='rotate'&&Number($('rotationDegrees').value)===0)$('rotationDegrees').value=90;
 settingsChanged();
});
$('wizardBack').onclick=()=>{if(wizard&&wizard.step>0){wizard.step--;showWizardStep();}};
$('wizardNext').onclick=guard(async()=>{
 if(!wizard)return;
 for(const input of $('cardBody').querySelectorAll('input'))if(!input.disabled&&!input.reportValidity())return;
 if(wizard.step<2){wizard.step++;showWizardStep();return;}
 settingsChanged();project.stage.locked=true;$('touchArmed').checked=true;closeSettingsCard(true);seek(project.start);persist();updateControls();say('Camera hot · touch the viewport or press Action.');
});

$('saveStage').onclick=()=>jsonDownload({schema:'CamLockStage-1.0',stage:COPY(project.stage),start:project.start},'Stage');
$('savePath').onclick=()=>{if(!project.path.length){say('Record a camera performance first.');return;}jsonDownload(pathDocument(project),'CameraPath');};
$('saveProject').onclick=()=>{persist();jsonDownload(project,'Project');say('Project download requested · stage, path, settings, Scribe and original reference.');};
$('render').onclick=guard(async()=>{
 if(!file||!project.path.length||active()||busy||wizard)return;stop();closeSettingsCard();persist();busy=true;cancelled=false;updateControls();$('renderProgress').hidden=false;$('cancelRender').hidden=false;$('renderProgress').value=0;
 try{const result=await renderCamera({file,project:COPY(project),format:$('format').value,cancelled:()=>cancelled,onPhase:say,onProgress:p=>$('renderProgress').value=p});
  if(renderURL)URL.revokeObjectURL(renderURL);renderResult=result;renderURL=URL.createObjectURL(result.blob);
  $('renderInfo').textContent=result.report.outputFrames+' frames · '+project.stage.width+'×'+project.stage.height+' · '+result.report.duration.toFixed(3)+'s · '+(result.report.hasEffects?'source audio':'silent')+' · '+(result.blob.size/1048576).toFixed(1)+' MB';
  say('Render ready. Export downloads the video; your original and camera instructions are preserved.');
 }finally{busy=false;$('cancelRender').hidden=true;updateControls();}
});
$('cancelRender').onclick=()=>{cancelled=true;say('Cancelling after the current frame…');};
function outputFilename(){const stem=$('outputName').value.trim().replace(/\.(mp4|webm)$/i,'').replace(/[\\/:*?"<>|]/g,'_')||'CamLock_Treatment_V01';return stem+(renderResult?.blob.type==='video/mp4'?'.mp4':'.webm');}
$('export').onclick=()=>{if(renderResult){download(renderResult.blob,outputFilename());say('Video download requested: '+outputFilename());}};
$('share').onclick=guard(async()=>{if(!renderResult)return;const f=new File([renderResult.blob],outputFilename(),{type:renderResult.blob.type});if(!navigator.canShare?.({files:[f]})){download(renderResult.blob,f.name);say('File sharing is unavailable in this browser. Video download requested.');return;}try{await navigator.share({files:[f],title:f.name});}catch(e){if(e.name!=='AbortError')throw e;}});
$('reviewRender').onclick=()=>{if(!renderURL)return;$('renderedVideo').src=renderURL;$('renderReview').showModal();};$('closeReview').onclick=()=>{$('renderedVideo').pause();$('renderReview').close();};

let gripStart=null,gripMoved=false;
$('dockHandle').addEventListener('pointerdown',e=>{e.preventDefault();gripStart=e.clientY;gripMoved=false;try{$('dockHandle').setPointerCapture(e.pointerId);}catch{}});
$('dockHandle').addEventListener('pointermove',e=>{if(gripStart===null||gripMoved)return;const d=e.clientY-gripStart;if(Math.abs(d)>24){gripMoved=true;revealTopMenu(d>0);}});
for(const type of ['pointerup','pointercancel'])$('dockHandle').addEventListener(type,()=>{gripStart=null;});
$('dockHandle').onclick=()=>{if(gripMoved){gripMoved=false;return;}revealTopMenu(!topMenuOpen);};
function applyPlayerDock(scroll=false){
 $('sourceDrawer').hidden=!topMenuOpen;
 $('player').classList.toggle('undocked',!playerDocked||topMenuOpen);
 $('player').dataset.docked=String(playerDocked);
 $('dockPlayer').setAttribute('aria-pressed',String(playerDocked));
 $('unlockPlayer').setAttribute('aria-pressed',String(!playerDocked));
 $('dockHandle').setAttribute('aria-expanded',String(topMenuOpen));
 $('dockHandle').setAttribute('aria-label',topMenuOpen?'Pull up to close top menu':'Pull down to reveal top menu');
 sizeDock();if(scroll)window.scrollTo(0,0);
}
function revealTopMenu(open){topMenuOpen=open;applyPlayerDock(true);}
function setPlayerDock(locked){playerDocked=locked;topMenuOpen=!locked;try{localStorage.setItem(DOCK_KEY,String(locked));}catch{}applyPlayerDock(true);}
$('dockPlayer').onclick=()=>setPlayerDock(true);
$('unlockPlayer').onclick=()=>setPlayerDock(false);
function sizeDock(){document.documentElement.style.setProperty('--cam-player-height',$('player').classList.contains('undocked')?'0px':Math.ceil($('player').getBoundingClientRect().height)+'px');}
new ResizeObserver(sizeDock).observe($('player'));
video.addEventListener('seeked',()=>{audioPreview();redraw();updateControls();});video.addEventListener('loadeddata',updateControls);video.addEventListener('play',()=>{updateControls();loop();});video.addEventListener('pause',()=>{if(active())stop();else updateControls();});
video.addEventListener('ended',()=>{if(active())stop();updateControls();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(active())stop();persist();}});window.addEventListener('pagehide',persist);
window.addEventListener('beforeunload',e=>{if(dirty||active()||busy){e.preventDefault();e.returnValue='';}});

// Same public methods used by browser acceptance checks; no alternate camera or render implementation.
window.CamLock={version:VERSION,profile:PLAYER_PROFILE,snapshot:()=>COPY(project),camera:()=>({...camera}),loadSource:openSource,seek,startAction:begin,pause:stop,render:renderCamera,rendered:()=>renderResult,sourceReady,active,sourceVideo:video};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){project=importDocument(saved,project);$('sourceName').textContent=project.source?.name||'No source';const restoredScribe=project.scribe;queueMicrotask(()=>{$('gs-notes').value=restoredScribe;});say('Draft instructions restored. Load the original video to reconnect.');}if(localStorage.getItem('gs-camlock-scribe-open')==='true')$('scribe').open=true;}catch(e){say('Saved draft could not be restored. Open a saved project to recover it.');}
syncFields();
try{playerDocked=localStorage.getItem(DOCK_KEY)!=='false';}catch{}
topMenuOpen=!playerDocked;applyPlayerDock();
if($('scribe').open)openSettingsCard('scribe');
