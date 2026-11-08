import {clipTime,pictureTime} from './clip-time.mjs?v=28';
import {BackgroundSurface,DEFAULT_CHROMA,detectBackground} from './background.mjs?v=23';
/* Independent reusable media-layer preview. Source picture/audio are never rewritten. */
export class LayerTracks{
 constructor(root,{getClips,getFrame,getPlayhead,isPlaying,getStagedId,onSelect,onChange,onStatus,getMode,onDragStart,isFocused}){Object.assign(this,{root,getClips,getFrame,getPlayhead,isPlaying,getStagedId,onSelect,onChange,onStatus,getMode,onDragStart,isFocused});this.media=new Map();this.selected=null;this.generation=0;}
 async attach(clip,blob,{autoKey=!!clip.captionNumber&&!clip.chroma}={}){
  const generation=this.generation,url=URL.createObjectURL(blob),el=document.createElement(clip.type==='image'?'img':clip.type==='audio'?'audio':'video');el.preload='auto';el.playsInline=true;el.muted=clip.volume===0;el.preservesPitch=false;
  try{await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('Caption loading timed out. Select the local file again.')),20000),done=()=>{clearTimeout(timer);ok();};if(clip.type==='image')el.onload=done;else el.onloadeddata=done;el.onerror=()=>{clearTimeout(timer);no(Error('Clip format cannot decode. Choose a supported MP4, WebM or PNG.'));};el.src=url;});if(autoKey&&clip.type!=='audio')clip.chroma=detectBackground(el)||{...DEFAULT_CHROMA,enabled:false};}catch(e){el.pause?.();el.removeAttribute('src');el.load?.();URL.revokeObjectURL(url);throw e;}
  if(generation!==this.generation){el.pause?.();URL.revokeObjectURL(url);throw Error('Import cancelled because project changed');}
  this.detach(clip.id);const wrap=document.createElement('div');wrap.className='media-layer';wrap.dataset.clipId=clip.id;wrap.append(el);let surface;
  if(clip.type!=='audio'){surface=new BackgroundSurface();surface.canvas.className='keyed-frame';surface.canvas.style.display='none';wrap.append(surface.canvas);const resize=document.createElement('button');resize.type='button';resize.className='layer-resize';resize.textContent='↘';resize.setAttribute('aria-label','Resize animation '+clip.name);wrap.append(resize);}wrap.onpointerdown=e=>this.drag(e,clip.id);this.root.append(wrap);
  const media={el,wrap,url,blob,surface,serial:0};this.media.set(clip.id,media);
  el.addEventListener('seeked',()=>{media.serial++;this.update();});
  this.update();return Number.isFinite(el.duration)?el.duration:2;
 }
 detach(id){const m=this.media.get(id);if(m){this.media.delete(id);if(m.callback!==undefined)m.el.cancelVideoFrameCallback?.(m.callback);m.el.pause?.();m.el.removeAttribute('src');m.el.load?.();m.wrap.remove();URL.revokeObjectURL(m.url);}}
 clear(){this.generation++;for(const id of this.media.keys())this.detach(id);this.selected=null;this.clock=null;}
 previewFrame(){
  if(!this.clock)return null;
  const {media,clip,entry,start,end,rate}=this.clock;
  const source=Math.min(end,media.el.currentTime);
  return Math.min(clip.outFrame,Math.max(entry,clip.inFrame+(source-start)*25/rate));
 }
 update(){
  const frame=this.getFrame(),playing=this.isPlaying(),clips=this.getClips();
  const playhead=playing?(this.getPlayhead?.()??frame):frame;
  let clock=null;
  for(const [id,m] of this.media){const c=clips.find(c=>c.id===id);if(!c){m.wrap.hidden=true;m.el.pause?.();continue;}const duration=m.el.duration;const timing=c.type==='video'?pictureTime(c,frame,duration):clipTime(c,frame,duration);const inserted=!c.captionNumber||c.placed;const shown=inserted&&(c.type==='image'?c.visible&&frame>=c.inFrame&&frame<c.outFrame:timing.shown);
   const staged=!playing&&id===this.getStagedId?.();m.wrap.hidden=!(shown||staged);m.wrap.classList.toggle('selected-layer',id===this.selected&&(this.isFocused?.()??true));m.wrap.classList.toggle('locked-layer',!!c.locked);m.wrap.style.cssText=`left:${c.x}%;top:${c.y}%;width:${c.width}%;opacity:${c.opacity};transform:translate(-50%,-50%) rotate(${c.rotation}deg);z-index:${clips.indexOf(c)+1}`;
   if(m.surface){
    const transform=c.mirrorX||c.flipY?`scale(${c.mirrorX?-1:1}, ${c.flipY?-1:1})`:'';
    m.el.style.transform=transform;
    m.surface.canvas.style.transform=transform;
   }
   if(c.type!=='image'){
    const el=m.el,live=playing?clipTime(c,playhead,duration):timing;
    el.volume=c.volume;
    el.muted=c.volume===0;
    if(el.playbackRate!==timing.rate)el.playbackRate=timing.rate;
    const active=shown&&playing&&live.shown&&!timing.held;
    const firstPlay=m.playTarget==null;
    const entering=firstPlay||c.loop&&(el.ended||live.target<m.playTarget-1e-7);
    if(active){
     // Reposition on entry and on a loop wrap. Jumping an audible decoder
     // forward during startup or buffering drops the sound it has yet to play.
     const target=firstPlay?timing.target:live.target;
     const drift=Math.abs(el.currentTime-target);
     if(entering?drift>.004:c.volume===0&&!el.seeking&&drift>.08){
      el.currentTime=Math.max(live.start,Math.min(target,live.end-.000002));
     }
     m.playTarget=live.target;
     const exhausted=!entering&&!c.loop&&(el.ended||el.currentTime>=live.end-.000002);
     if(!exhausted){
      if(el.paused&&!m.starting){
       m.starting=true;
       el.play().catch(()=>{if(m.playTarget!=null)this.onStatus('Clip playback blocked or unavailable. Tap Play again.');}).finally(()=>m.starting=false);
      }
      if(c.volume>0&&!c.loop&&(!clock||this.clock?.media===m)){
       clock=this.clock?.media===m?this.clock:{media:m,clip:c,entry:firstPlay?frame:playhead,...live};
      }
     }else el.pause();
    }else{
     m.playTarget=null;
     el.pause();
     if((shown||staged)&&(!playing||timing.held)){
      const target=staged?timing.start:timing.target;
      const seekTo=Math.min(target+(c.sourceTrim&&!playing ? .0005 : 0),Math.max(0,timing.end-.000002));
      if(Number.isFinite(seekTo)&&!el.seeking&&Math.abs(el.currentTime-seekTo)>.0001)el.currentTime=seekTo;
     }
    }
   }
   this.paint(m,c);
  }
  this.clock=clock;
 }
 paint(m,c){
  if(!m.surface||!c)return;const keyed=!!c.chroma?.enabled;m.el.style.display=keyed?'none':'';m.surface.canvas.style.display=keyed?'block':'none';
  if(!keyed||m.wrap.hidden||c.type==='video'&&m.el.readyState<2||m.el.seeking)return;
  const stamp=JSON.stringify(c.chroma)+'/'+m.serial+'/'+Math.floor((m.el.currentTime||0)*25);if(m.stamp===stamp)return;
  try{m.surface.draw(m.el,c.chroma,{maxWidth:540});m.surface.canvas.dataset.sourceTime=String(m.el.currentTime||0);m.stamp=stamp;}catch(e){if(m.failed!==stamp){m.failed=stamp;this.onStatus('Caption background removal failed: '+e.message);}}
 }
 drag(e,id){this.onSelect(id);const c=this.getClips().find(c=>c.id===id);if(c?.locked){this.onStatus('Caption placement locked. Use Unlock placement to edit it.');return;}if(this.getMode()!=='move')return;e.stopPropagation();e.preventDefault();this.onDragStart();const box=this.root.getBoundingClientRect(),start={x:e.clientX,y:e.clientY,cx:c.x,cy:c.y};e.currentTarget.setPointerCapture(e.pointerId);const wrap=e.currentTarget;const move=p=>{c.x=Math.max(-100,Math.min(200,start.cx+(p.clientX-start.x)/box.width*100));c.y=Math.max(-100,Math.min(200,start.cy+(p.clientY-start.y)/box.height*100));this.update();};const finish=()=>{wrap.removeEventListener('pointermove',move);wrap.removeEventListener('pointerup',finish);wrap.removeEventListener('pointercancel',finish);this.onChange();};wrap.addEventListener('pointermove',move);wrap.addEventListener('pointerup',finish,{once:true});wrap.addEventListener('pointercancel',finish,{once:true});}
}

