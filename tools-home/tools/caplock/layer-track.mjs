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
 clear(){this.generation++;for(const id of this.media.keys())this.detach(id);this.selected=null;}
 update(){
  const frame=this.getFrame(),playing=this.isPlaying(),clips=this.getClips();
  for(const [id,m] of this.media){const c=clips.find(c=>c.id===id);if(!c){m.wrap.hidden=true;m.el.pause?.();continue;}const duration=m.el.duration;const timing=c.type==='video'?pictureTime(c,frame,duration):clipTime(c,frame,duration);const inserted=!c.captionNumber||c.placed;const shown=inserted&&(c.type==='image'?c.visible&&frame>=c.inFrame&&frame<c.outFrame:timing.shown);
   const staged=!playing&&id===this.getStagedId?.();m.wrap.hidden=!(shown||staged);m.wrap.classList.toggle('selected-layer',id===this.selected&&(this.isFocused?.()??true));m.wrap.classList.toggle('locked-layer',!!c.locked);m.wrap.style.cssText=`left:${c.x}%;top:${c.y}%;width:${c.width}%;opacity:${c.opacity};transform:translate(-50%,-50%) rotate(${c.rotation}deg);z-index:${clips.indexOf(c)+1}`;
   if(m.surface){
    const transform=c.mirrorX||c.flipY?`scale(${c.mirrorX?-1:1}, ${c.flipY?-1:1})`:'';
    m.el.style.transform=transform;
    m.surface.canvas.style.transform=transform;
   }
   if(c.type!=='image'){
    const live=playing&&c.sourceTrim&&this.getPlayhead?clipTime(c,this.getPlayhead(),duration):timing;
    m.el.volume=c.volume;m.el.muted=c.volume===0;const target=staged?timing.start:live.shown?live.target:timing.target;if(m.el.playbackRate!==timing.rate)m.el.playbackRate=timing.rate;
    const seekTo=Math.min(target+(c.sourceTrim&&!playing ? .0005 : 0),Math.max(0,timing.end-.000002));
    const tolerance=playing&&!timing.held&&!m.el.paused ? .08 : .0001;
    if((shown||staged)&&Number.isFinite(seekTo)&&!m.el.seeking&&Math.abs(m.el.currentTime-seekTo)>tolerance)m.el.currentTime=seekTo;
    if(shown&&playing&&live.shown&&!timing.held){if(m.el.paused)m.el.play().catch(()=>this.onStatus('Clip playback blocked or unavailable. Tap Play again.'));}else m.el.pause();
   }
   this.paint(m,c);
  }
 }
 paint(m,c){
  if(!m.surface||!c)return;const keyed=!!c.chroma?.enabled;m.el.style.display=keyed?'none':'';m.surface.canvas.style.display=keyed?'block':'none';
  if(!keyed||m.wrap.hidden||c.type==='video'&&m.el.readyState<2||m.el.seeking)return;
  const stamp=JSON.stringify(c.chroma)+'/'+m.serial+'/'+Math.floor((m.el.currentTime||0)*25);if(m.stamp===stamp)return;
  try{m.surface.draw(m.el,c.chroma,{maxWidth:540});m.surface.canvas.dataset.sourceTime=String(m.el.currentTime||0);m.stamp=stamp;}catch(e){if(m.failed!==stamp){m.failed=stamp;this.onStatus('Caption background removal failed: '+e.message);}}
 }
 drag(e,id){this.onSelect(id);const c=this.getClips().find(c=>c.id===id);if(c?.locked){this.onStatus('Caption placement locked. Use Unlock placement to edit it.');return;}if(this.getMode()!=='move')return;e.stopPropagation();e.preventDefault();this.onDragStart();const box=this.root.getBoundingClientRect(),start={x:e.clientX,y:e.clientY,cx:c.x,cy:c.y};e.currentTarget.setPointerCapture(e.pointerId);const wrap=e.currentTarget;const move=p=>{c.x=Math.max(-100,Math.min(200,start.cx+(p.clientX-start.x)/box.width*100));c.y=Math.max(-100,Math.min(200,start.cy+(p.clientY-start.y)/box.height*100));this.update();};const finish=()=>{wrap.removeEventListener('pointermove',move);wrap.removeEventListener('pointerup',finish);wrap.removeEventListener('pointercancel',finish);this.onChange();};wrap.addEventListener('pointermove',move);wrap.addEventListener('pointerup',finish,{once:true});wrap.addEventListener('pointercancel',finish,{once:true});}
}

