import {ALL_FORMATS, BlobSource, Input, VideoSampleSink} from './vendor/mediabunny-1.62.1-gs1.mjs';

export function setupVisualPlacement({stage, video, playhead, duration, playing, fps, edit, changed, fileById}) {
 const layer=document.createElement('div');
 layer.className='sx-visual-layer';
 stage.append(layer);
 let placements=[], entries=[], request=0;
 const isVideo=file=>file.type.startsWith('video/')||/\.(mp4|webm|mov|m4v)$/i.test(file.name);
 const isImage=file=>file.type.startsWith('image/')||/\.(png|webp|jpg|jpeg|gif|avif)$/i.test(file.name);
 const isVisual=file=>isVideo(file)||isImage(file);

 function closeEntries() {
  for(const entry of entries){
   entry.node.pause?.();
   entry.node.remove();
   URL.revokeObjectURL(entry.url);
  }
  entries=[];
 }
 function reconnect() {
  closeEntries();
  for(const placement of placements){
   const file=fileById(placement.fileId);
   if(!file)continue;
   const node=document.createElement(isVideo(file)?'video':'img');
   const url=URL.createObjectURL(file);
   if(node.tagName==='VIDEO'){node.muted=true;node.playsInline=true;node.preload='metadata';}
   node.src=url;
   node.hidden=true;
   layer.append(node);
   entries.push({placement,node,url});
  }
  sync();
 }
 function sync() {
  if(!entries.length)return;
  const time=playhead(),isPlaying=playing();
  for(const {placement:p,node} of entries){
   const active=time>=p.start&&time<p.start+p.duration;
   node.hidden=!active;
   node.style.opacity=p.opacity;
   if(node.tagName!=='VIDEO')continue;
   if(!active){node.pause();continue;}
   const target=time-p.start;
   if(node.readyState && Math.abs(node.currentTime-target)>(isPlaying?.15:.013))node.currentTime=target;
   if(isPlaying&&node.paused)node.play().catch(()=>{});
   else if(!isPlaying&&!node.paused)node.pause();
  }
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
  placements.push({id:crypto.randomUUID(),fileId:id,name:file.name,start,duration:length,opacity:mode==='append'?1:.5,mode});
  reconnect();
  if(mode==='append')edit(start);
  changed();
 }
 function update(id){
  const item=placements.find(p=>p.id===id);
  if(!item)return;
  const answer=prompt('Opacity (0–100%)',String(Math.round(item.opacity*100)));
  if(answer===null||!answer.trim())return;
  const opacity=Number(answer);
  if(!Number.isFinite(opacity)||opacity<0||opacity>100)throw Error('Enter opacity from 0 to 100.');
  item.opacity=opacity/100;
  sync();changed();
 }
 function remove(id){
  placements=placements.filter(p=>p.id!==id);
  reconnect();changed();
 }
 function restore(saved){
  request++;
  placements=Array.isArray(saved)?saved.filter(p=>typeof p?.id==='string'&&typeof p.fileId==='string'&&typeof p.name==='string'
   &&Number.isFinite(p.start)&&p.start>=0&&Number.isFinite(p.duration)&&p.duration>0
   &&Number.isFinite(p.opacity)&&p.opacity>=0&&p.opacity<=1):[];
  reconnect();
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
   for(const p of placements){
    const f=fileById(p.fileId);
    if(!f)throw Error('Reconnect '+p.name+' in Toolbox before exporting.');
    if(!isVideo(f)){
     const bitmap=await createImageBitmap(f);
     bitmaps.push(bitmap);streams.push({p,bitmap,input:{dispose(){}}});
     continue;
    }
    const input=new Input({source:new BlobSource(f),formats:ALL_FORMATS});
    const item={p,input};streams.push(item);
    const track=await input.getPrimaryVideoTrack();
    if(!track)throw Error('No readable video track in '+p.name);
    const timeLimit=await track.computeDuration(), first=await track.getFirstTimestamp();
    const times=function*(){
     for(let i=Math.ceil(p.start*outputFps-0.000001);i/outputFps<p.start+p.duration;i++){
      yield Math.max(first,Math.min(timeLimit-.000002,i/outputFps-p.start));
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
      if(time<p.start-.000001||time>=p.start+p.duration)continue;
      const sample=item.bitmap||((await item.frames.next()).value);
      if(!sample)throw Error('Missing '+p.name+' frame at '+time.toFixed(3)+' s.');
      try{
       const w=sample.displayWidth||sample.width,h=sample.displayHeight||sample.height;
       const scale=Math.min(width/w,height/h);
       context.globalAlpha=p.opacity;
       if(item.bitmap)context.drawImage(sample,(width-w*scale)/2,(height-h*scale)/2,w*scale,h*scale);
       else sample.draw(context,(width-w*scale)/2,(height-h*scale)/2,w*scale,h*scale);
      }finally{context.globalAlpha=1;if(!item.bitmap)sample.close();}
     }
    },
   };
  }catch(error){await close();throw error;}
 }
 function renameFile(id,name){
  for(const item of placements)if(item.fileId===id)item.name=name;
 }
 return {isVisual,place,restore,renameFile,reconnect,sync,outlet,placements:()=>placements,update,remove,prepareFrameRender};
}
