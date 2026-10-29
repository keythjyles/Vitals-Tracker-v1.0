import {clipTime} from './clip-time.mjs?v=3';
/* Independent reusable media-layer preview. Source picture/audio are never rewritten. */
export class LayerTracks{
 constructor(root,{getClips,getFrame,isPlaying,onSelect,onChange,onStatus,getMode,onDragStart}){Object.assign(this,{root,getClips,getFrame,isPlaying,onSelect,onChange,onStatus,getMode,onDragStart});this.media=new Map();this.selected=null;this.generation=0;}
 async attach(clip,blob){
  const generation=this.generation,url=URL.createObjectURL(blob),el=document.createElement(clip.type==='image'?'img':clip.type==='audio'?'audio':'video');el.preload='auto';el.playsInline=true;el.muted=clip.type==='video';
  try{await new Promise((ok,no)=>{if(clip.type==='image')el.onload=ok;else el.onloadedmetadata=ok;el.onerror=()=>no(Error('Clip format cannot decode. Use a browser-supported alpha WebM or transparent PNG.'));el.src=url;});}catch(e){URL.revokeObjectURL(url);throw e;}
  if(generation!==this.generation){el.pause?.();URL.revokeObjectURL(url);throw Error('Import cancelled because project changed');}
  this.detach(clip.id);const wrap=document.createElement('div');wrap.className='media-layer';wrap.dataset.clipId=clip.id;wrap.append(el);wrap.onpointerdown=e=>this.drag(e,clip.id);this.root.append(wrap);this.media.set(clip.id,{el,wrap,url});this.update();return Number.isFinite(el.duration)?el.duration:2;
 }
 detach(id){const m=this.media.get(id);if(m){m.el.pause?.();m.el.removeAttribute('src');m.el.load?.();m.wrap.remove();URL.revokeObjectURL(m.url);this.media.delete(id);}}
 clear(){this.generation++;for(const id of this.media.keys())this.detach(id);this.selected=null;}
 update(){
  const frame=this.getFrame(),playing=this.isPlaying(),clips=this.getClips();
  for(const [id,m] of this.media){const c=clips.find(c=>c.id===id);if(!c){m.wrap.hidden=true;m.el.pause?.();continue;}const duration=m.el.duration;const timing=clipTime(c,frame,duration);const shown=c.type==='image'?c.visible&&frame>=c.inFrame&&frame<c.outFrame:timing.shown;
   m.wrap.hidden=!shown;m.wrap.classList.toggle('selected-layer',id===this.selected);m.wrap.style.cssText=`left:${c.x}%;top:${c.y}%;width:${c.width}%;opacity:${c.opacity};transform:translate(-50%,-50%) rotate(${c.rotation}deg);z-index:${clips.indexOf(c)+1}`;
   if(c.type!=='image'){
    m.el.volume=c.volume;m.el.muted=c.type==='video'||c.volume===0;const target=timing.target;if(m.el.playbackRate!==timing.rate)m.el.playbackRate=timing.rate;
    if(shown&&Number.isFinite(target)&&(!playing||Math.abs(m.el.currentTime-target)>.08)){if(!m.el.seeking&&Math.abs(m.el.currentTime-target)>.004)m.el.currentTime=Math.min(target,Number.isFinite(duration)?Math.max(0,Math.min(duration,timing.end)-.001):target);}
    if(shown&&playing){if(m.el.paused)m.el.play().catch(()=>this.onStatus('Clip playback blocked or unavailable. Tap Play again.'));}else m.el.pause();
   }
  }
 }
 drag(e,id){this.onSelect(id);if(this.getMode()!=='move')return;e.stopPropagation();e.preventDefault();this.onDragStart();const c=this.getClips().find(c=>c.id===id),box=this.root.getBoundingClientRect(),start={x:e.clientX,y:e.clientY,cx:c.x,cy:c.y};e.currentTarget.setPointerCapture(e.pointerId);const wrap=e.currentTarget;const move=p=>{c.x=Math.max(-100,Math.min(200,start.cx+(p.clientX-start.x)/box.width*100));c.y=Math.max(-100,Math.min(200,start.cy+(p.clientY-start.y)/box.height*100));this.update();};const finish=()=>{wrap.removeEventListener('pointermove',move);wrap.removeEventListener('pointerup',finish);wrap.removeEventListener('pointercancel',finish);this.onChange();};wrap.addEventListener('pointermove',move);wrap.addEventListener('pointerup',finish,{once:true});wrap.addEventListener('pointercancel',finish,{once:true});}
}
