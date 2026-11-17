import {fitInsertionRate, mountInsertionSettings} from '../../shared/insertion-settings.mjs?v=1';
import {fadeGainAt, mixClipAudio, mountClipAudio, savedFades, scheduleClipGain, validClipGain} from '../../shared/clip-audio.mjs?v=2';
import {scaledTarget} from '../caplock/focus-controls.mjs?v=25';
import {hasSourceAudio, readSourceAudio} from '../caplock/source-audio.mjs?v=36';
import {ALL_FORMATS, BlobSource, Input, VideoSampleSink} from './vendor/mediabunny-1.62.1-gs1.mjs';

const EPS = .000001;
const activeAt = (item,time)=>time>=item.start-EPS && time<item.start+item.duration-EPS;
const rateOf = item=>item.sourceDuration ? item.sourceDuration/item.duration : 1;
const sourceAt = (item,time)=>Math.max(0,(time-item.start)*rateOf(item));
const isVideo = file=>!!file&&(file.type.startsWith('video/')||/\.(mp4|webm|mov|m4v)$/i.test(file.name));
const isImage = file=>!!file&&(file.type.startsWith('image/')||/\.(png|webp|jpg|jpeg|gif|avif)$/i.test(file.name));
const isVisual = file=>isVideo(file)||isImage(file);

function fitGeometry(item, width, height, sourceWidth, sourceHeight) {
 const fit = Math.min(width/sourceWidth,height/sourceHeight);
 return {x:item.x??50, y:item.y??50, width:item.width??sourceWidth*fit/width*100};
}
function pictureRect(item, width, height, sourceWidth, sourceHeight) {
 const shape = fitGeometry(item,width,height,sourceWidth,sourceHeight);
 const w = shape.width/100*width, h = w*sourceHeight/sourceWidth;
 return {x:shape.x/100*width-w/2, y:shape.y/100*height-h/2, w, h};
}

export function setupVisualPlacement({stage,video,playhead,duration,playing,fps,edit,pause,canEdit,canHear,connectAudio,changed,fileById}) {
 const $ = id=>document.getElementById(id);
 const layer = document.createElement('div');
 layer.className = 'sx-visual-layer';
 stage.append(layer);
 const panel = $('visualSettings');
 const showSettings = mountInsertionSettings(panel);
 let placements = [], entries = [], request = 0, selected = null, moving = false;
 let drag, selectedHasAudio;
 const currentFrame = ()=>Math.round(playhead()*fps());
 const refreshClipAudio = mountClipAudio($('visualAudio'), {
  prefix:'visual',
  read() {
   if(!selected || !isVideo(fileById(selected.fileId)))return null;
   return {
    ...selected, volume:selected.volume??0, fps:fps(), hasAudio:selectedHasAudio, editable:canEdit(),
   };
  },
  write(settings) {changeSetting(item=>Object.assign(item,settings));},
 });
 $('visualAudio').addEventListener('toggle',inspectSelectedAudio);

 async function inspectSelectedAudio() {
  const item = selected, file = item && fileById(item.fileId);
  if(!$('visualAudio').open || !isVideo(file))return;
  try {
   const hasAudio = await hasSourceAudio(file);
   if(selected===item){
    selectedHasAudio=hasAudio;
    refreshClipAudio();
   }
  } catch { /* Keep sound controls available when track metadata is unavailable. */ }
 }

 function sceneRect() {
  const rect = video.getBoundingClientRect();
  const fit = Math.min(rect.width/video.videoWidth,rect.height/video.videoHeight);
  const width = video.videoWidth*fit, height = video.videoHeight*fit;
  return {left:rect.left+(rect.width-width)/2, top:rect.top+(rect.height-height)/2,width,height};
 }
 function sourceSize(node) {
  return [node.videoWidth || node.naturalWidth, node.videoHeight || node.naturalHeight];
 }
 function discardMedia() {
  for(const entry of entries){
   entry.audio?.disconnect();
   entry.node.pause?.();
   entry.node.removeAttribute('src');
   entry.node.load?.();
   entry.wrap.remove();
   URL.revokeObjectURL(entry.url);
  }
  entries = [];
 }
 function reconnect() {
  discardMedia();
  for(const placement of placements){
   const file = fileById(placement.fileId);
   if(!file)continue;
   const node = document.createElement(isVideo(file)?'video':'img');
   const wrap = document.createElement('div'), handle = document.createElement('button');
   wrap.className = 'sx-visual-item';
   wrap.hidden = true;
   handle.className = 'gs-insertion-handle';
   handle.type = 'button';
   handle.textContent = '↘';
   handle.setAttribute('aria-label','Resize insertion');
   handle.hidden = true;
   const url = URL.createObjectURL(file);
   if(isVideo(file))Object.assign(node,{muted:true,playsInline:true,preload:'metadata',preservesPitch:false});
   node.addEventListener(isVideo(file)?'loadedmetadata':'load',sync);
   node.src = url;
   wrap.append(node,handle);
   layer.append(wrap);
   const entry = {placement,node,url,wrap,handle};
   installDrag(entry);
   entries.push(entry);
  }
  sync();
 }
 function sync() {
  if(panel.open){
   const frame = 'F'+currentFrame();
   if($('visualFrame').textContent!==frame)$('visualFrame').textContent=frame;
  }
  if(!entries.length || !video.videoWidth)return;
  const time = playhead(), isPlaying = playing()&&!video.seeking, scene = sceneRect();
  if(!scene.width || !scene.height)return;
  const host = stage.getBoundingClientRect();
  for(const entry of entries){
   const {placement:p,node,wrap,handle} = entry;
   const [w,h] = sourceSize(node);
   const active = activeAt(p,time), editable = active && moving && selected === p && !isPlaying;
   wrap.hidden = !active || !w || !h;
   wrap.classList.toggle('gs-insertion-outline',editable);
   handle.hidden = !editable;
   node.style.opacity = p.opacity;
   if(!wrap.hidden){
    const bounds = pictureRect(p,scene.width,scene.height,w,h);
    wrap.style.left = scene.left-host.left+bounds.x+'px';
    wrap.style.top = scene.top-host.top+bounds.y+'px';
    wrap.style.width = bounds.w+'px';
    wrap.style.height = bounds.h+'px';
   }
   if(node.tagName!=='VIDEO')continue;
   const volume = active && canHear() ? p.volume??0 : 0;
   if(volume>0 && isPlaying && !entry.audio)entry.audio=connectAudio(node);
   if(entry.audio){
    const plan=[volume,isPlaying,p.start,p.duration,p.fadeIn,p.fadeOut].join('|');
    if(entry.audioPlan!==plan){
     const {gain,clock}=entry.audio;
     const now=clock(), end=p.start+p.duration;
     gain.cancelScheduledValues(now);
     if(isPlaying&&volume>0){
      scheduleClipGain(gain,{...p,volume},p.start,end,time,end,now);
      gain.setValueAtTime(0,now+Math.max(0,end-time));
     }else gain.setValueAtTime(volume*fadeGainAt(p,p.start,end,time),now);
     entry.audioPlan=plan;
    }
   }
   node.muted=volume===0;
   if(!active){node.pause();continue;}
   if(node.preload==='metadata')node.preload='auto';
   const rate = rateOf(p), target = Math.min(Math.max(0,node.duration-EPS),sourceAt(p,time));
   if(node.playbackRate!==rate)node.playbackRate=rate;
   if(node.readyState && !node.seeking && Math.abs(node.currentTime-target)>(isPlaying?.15:.001))node.currentTime=target;
   if(isPlaying&&node.paused)node.play().catch(()=>{});
   else if(!isPlaying&&!node.paused)node.pause();
  }
 }
 new ResizeObserver(sync).observe(stage);
 function installDrag({placement,node,wrap,handle}) {
  wrap.addEventListener('pointerdown',event=>{
   if(event.button!==0 || drag || !moving || selected!==placement || !canEdit())return;
   const scene = sceneRect(), [w,h] = sourceSize(node);
   if(!w || !h || !scene.width || !scene.height)return;
   event.preventDefault();
   event.stopPropagation();
   wrap.setPointerCapture(event.pointerId);
   const shape = fitGeometry(placement,scene.width,scene.height,w,h);
   const x = scene.left+scene.width*shape.x/100, y = scene.top+scene.height*shape.y/100;
   drag = {id:event.pointerId,wrap,scene,shape,resize:event.target===handle,
    fromX:event.clientX,fromY:event.clientY,x,y,distance:Math.hypot(event.clientX-x,event.clientY-y),dirty:false};
  });
  wrap.addEventListener('pointermove',event=>{
   if(drag?.wrap!==wrap || event.pointerId!==drag.id || !canEdit())return;
   const {scene,shape,resize,fromX,fromY,x,y,distance} = drag;
   const next = resize
    ? scaledTarget(shape,Math.hypot(event.clientX-x,event.clientY-y)/Math.max(1,distance))
    : scaledTarget(shape,1,{dx:(event.clientX-fromX)/scene.width*100,dy:(event.clientY-fromY)/scene.height*100});
   Object.assign(placement,next);
   drag.dirty = true;
   sync();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])wrap.addEventListener(type,event=>{
   if(drag?.wrap!==wrap || event.pointerId!==drag.id)return;
   const dirty = drag.dirty;
   drag = null;
   if(dirty)changed();
  });
 }
 function outlet(){
  return placements.reduce((end,p)=>Math.max(end,p.start+p.duration),0);
 }
 async function place(id,file,mode,startOverride){
  const sequence=++request;
  const time=startOverride??(mode==='append'?duration():playhead());
  if(!video.videoWidth)throw Error('Load a base video to place this file.');
  if(!isVisual(file))throw Error('Choose a video or an image.');
  let length=2;
  if(isVideo(file)){
   const input=new Input({source:new BlobSource(file),formats:ALL_FORMATS});
   try{
    const track=await input.getPrimaryVideoTrack();
    if(!track)throw Error('No readable video track in '+file.name);
    length=await track.computeDuration();
   }finally{input.dispose();}
   if(!Number.isFinite(length)||length<=0)throw Error('Could not read the clip duration.');
  }
  if(sequence!==request)return;
  const frameRate=fps();
  const start=mode==='append'||startOverride!=null?time:Math.round(time*frameRate)/frameRate;
  const item = {id:crypto.randomUUID(),fileId:id,name:file.name,start,duration:length,opacity:mode==='append'?1:.5,mode};
  placements.push(item);
  reconnect();
  if(mode==='append')edit(start);
  changed();
  return item;
 }

 function refreshSettings() {
  const item = selected;
  if(!item)return;
  $('visualIn').value = Math.round(item.start*fps());
  $('visualOut').value = Math.ceil((item.start+item.duration)*fps()-EPS);
  $('visualSpan').textContent = ($('visualOut').value-$('visualIn').value)+' frames · '+Number(rateOf(item).toFixed(3))+'× · OUT is the first clear frame';
  $('visualOpacity').value = item.opacity*100;
  $('visualOpacityValue').textContent = Math.round(item.opacity*100)+'%';
  $('visualMove').setAttribute('aria-pressed',String(moving));
  refreshClipAudio();
 }
 function openSettings(id) {
  const item = placements.find(p=>p.id===id);
  if(!item || !canEdit())return;
  pause();
  selected = item;
  selectedHasAudio = undefined;
  moving = true;
  $('visualName').value = item.name;
  $('visualSettingsStatus').textContent = '';
  refreshSettings();
  showSettings();
  void inspectSelectedAudio();
  sync();
 }
 function changeSetting(action) {
  if(!selected || !canEdit())return;
  try {
   action(selected);
   $('visualSettingsStatus').textContent = '';
   changed();
  } catch(error) {
   $('visualSettingsStatus').textContent = error.message;
  }
  refreshSettings();
  sync();
 }
 function editTiming(edge,frame) {
  pause();
  changeSetting(item=>{
   if(!Number.isSafeInteger(frame)||frame<0)throw Error('Enter a nonnegative frame number.');
   const time=frame/fps();
   if(edge==='in'){item.start=time;return;}
   const span=time-item.start;
   if(span<=0)throw Error('OUT must follow IN.');
   const file=fileById(item.fileId);
   if(!file)throw Error('Reconnect the clip to change its OUT.');
   if(isVideo(file)){
    const sourceDuration = item.sourceDuration ?? item.duration;
    fitInsertionRate(sourceDuration,span);
    item.sourceDuration = sourceDuration;
   }
   item.duration=span;
  });
 }
 for(const [edge,suffix] of [['in','In'],['out','Out']]){
  $('visual'+suffix).onchange=event=>editTiming(edge,event.target.valueAsNumber);
  $('visualMark'+suffix).onclick=()=>editTiming(edge,currentFrame());
 }
 $('visualRename').onclick=()=>changeSetting(item=>{
  const name=$('visualName').value.trim();
  if(!name)throw Error('Enter an insertion name.');
  item.name=name;
  $('visualName').value=name;
 });
 $('visualGoIn').onclick=()=>{if(selected){pause();void edit(selected.start).then(sync);}};
 for(const [id,delta] of [['visualBack',-1],['visualForward',1]])$(id).onclick=()=>{
  pause();
  void edit((currentFrame()+delta)/fps()).then(sync);
 };
 $('visualMove').onclick=()=>{
  if(!selected || !canEdit())return;
  moving=!moving;
  if(moving&&!activeAt(selected,playhead()))$('visualGoIn').click();
  refreshSettings();
  sync();
 };
 $('visualFit').onclick=()=>changeSetting(item=>{delete item.x;delete item.y;delete item.width;});
 $('visualOpacity').oninput=event=>{
  if(selected&&canEdit()){
   selected.opacity=Number(event.target.value)/100;
   $('visualOpacityValue').textContent=event.target.value+'%';
   sync();
  }
 };
 $('visualOpacity').onchange=()=>changed();
 panel.addEventListener('close',()=>{
  selected=null;
  moving=false;
  refreshClipAudio();
  sync();
 });
 function remove(id){
  if(selected?.id===id)panel.close();
  placements=placements.filter(p=>p.id!==id);
  reconnect();changed();
 }
 function restore(saved){
  request++;
  if(panel.open)panel.close();
  placements=Array.isArray(saved)?saved.filter(p=>typeof p?.id==='string'&&typeof p.fileId==='string'&&typeof p.name==='string'
   &&Number.isFinite(p.start)&&p.start>=0&&Number.isFinite(p.duration)&&p.duration>0
   &&Number.isFinite(p.opacity)&&p.opacity>=0&&p.opacity<=1).map(p=>{
    const {fadeIn,fadeOut,...item}=p;
    Object.assign(item,savedFades(p));
    if(!Number.isFinite(item.sourceDuration)||rateOf(item)<.1||rateOf(item)>8)delete item.sourceDuration;
    for(const key of ['volume','previousVolume'])if(!validClipGain(item[key]))delete item[key];
    for(const [key,min,max] of [['x',-100,200],['y',-100,200],['width',5,400]]){
     if(!Number.isFinite(item[key])||item[key]<min||item[key]>max)delete item[key];
    }
    return item;
   }):[];
  reconnect();
 }
 async function prepareAudioMix(check) {
  const tracks = [];
  for(const item of placements){
   if(!(item.volume>0))continue;
   check();
   const file = fileById(item.fileId);
   if(!file)throw Error('Reconnect '+item.name+' in Toolbox before exporting.');
   if(!isVideo(file))continue;
   const input = new Input({source:new BlobSource(file),formats:ALL_FORMATS});
   try {
    const track = await input.getPrimaryAudioTrack();
    if(!track)continue;
    const end = Math.min(item.sourceDuration??item.duration,await track.computeDuration());
    if(end<=0)continue;
    const buffer = await readSourceAudio(track,check,{start:0,end});
    if(buffer)tracks.push({buffer,start:item.start,end:item.start+item.duration,rate:rateOf(item),volume:item.volume,...savedFades(item)});
   } finally {
    input.dispose();
   }
  }
  return {
   hasAudio:tracks.length>0,
   place(context,from,to) {
    for(const track of tracks)mixClipAudio(context,track.buffer,track,from,to);
   },
  };
 }
 async function prepareFrameRender(outputFps,size,outputDuration) {
  if(!placements.length)return null;
  const scale=size==='720'?Math.min(1,720/video.videoWidth):1;
  const width=Math.max(2,Math.round(video.videoWidth*scale/2)*2),height=Math.max(2,Math.round(video.videoHeight*scale/2)*2);
  const streams=[], bitmaps=[];
  const close=async()=>{
   for(const item of streams){await item.frames?.return();item.input.dispose();}
   for(const bitmap of bitmaps)bitmap.close();
  };
  try{
   for(const placed of placements){
    const p={...placed}, f=fileById(p.fileId);
    if(!f)throw Error('Reconnect '+p.name+' in Toolbox before exporting.');
    if(!isVideo(f)){
     const bitmap=await createImageBitmap(f);
     bitmaps.push(bitmap);streams.push({p,bitmap,input:{dispose(){}}});
     continue;
    }
    const input=new Input({source:new BlobSource(f),formats:ALL_FORMATS});
    const item={p,input};streams.push(item);
    const track=await input.getPrimaryVideoTrack();
    const timeLimit=await track.computeDuration(), first=await track.getFirstTimestamp();
    const times=function*(){
     for(let i=Math.ceil((p.start-EPS)*outputFps);activeAt(p,i/outputFps);i++){
      yield Math.max(first,Math.min(timeLimit-.000002,sourceAt(p,i/outputFps)));
     }
    };
    item.frames=new VideoSampleSink(track).samplesAtTimestamps(times());
   }
   return {
    width,height,durationFrames:Math.ceil((outputDuration-.000002)*outputFps),close,
    async draw(canvas,source,time){
     const context=canvas.getContext('2d',{alpha:false,colorSpace:'srgb'});
     context.fillStyle='#000';context.fillRect(0,0,width,height);
     if(source)source.draw(context,0,0,width,height);
     for(const item of streams){
      const {p}=item;
      if(!activeAt(p,time))continue;
      const sample=item.bitmap||((await item.frames.next()).value);
      if(!sample)throw Error('Missing '+p.name+' frame at '+time.toFixed(3)+' s.');
      try{
       const {x,y,w,h}=pictureRect(p,width,height,sample.displayWidth||sample.width,sample.displayHeight||sample.height);
       context.globalAlpha=p.opacity;
       if(item.bitmap)context.drawImage(sample,x,y,w,h);
       else sample.draw(context,x,y,w,h);
      }finally{context.globalAlpha=1;if(!item.bitmap)sample.close();}
     }
    },
   };
  }catch(error){await close();throw error;}
 }
 function renameFile(id,name,oldName){
  for(const item of placements)if(item.fileId===id&&(oldName===undefined||item.name===oldName))item.name=name;
 }
 return {isVisual,place,restore,renameFile,reconnect,sync,outlet,placements:()=>placements,openSettings,remove,prepareFrameRender,prepareAudioMix};
}
