export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function scaledTarget(target,ratio,{bed=false,dx=0,dy=0}={}){
 const result={...target,x:clamp(target.x+dx,-100,200),y:clamp(target.y+dy,-100,200)};
 if(bed)result.scale=clamp(target.scale*ratio,.25,4);else result.width=clamp(target.width*ratio,5,400);return result;
}
const distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),mid=p=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});
// Coordinates use the fixed composition surface, never the resized bed rectangle.
export class FocusGestures{
 constructor(viewport,{getTarget,getSceneRect,focus,onStart,onUpdate,onCommit,onLocked,getMode}){
  Object.assign(this,{viewport,getTarget,getSceneRect,focus,onStart,onUpdate,onCommit,onLocked,getMode});this.points=new Map();this.active=null;this.changed=false;
  viewport.addEventListener('pointerdown',e=>this.down(e),true);viewport.addEventListener('pointermove',e=>this.move(e));for(const type of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(type,e=>this.up(e));
 }
 baseline(){const a=[...this.points.values()];this.start={points:a,target:{...this.active.target},rect:this.getSceneRect()};}
 down(e){
  if(e.target.closest('button,input,label,a,select,textarea')&&!e.target.closest('.layer-resize'))return;
  const layer=e.target.closest('.media-layer'),id=layer?.dataset.clipId,resize=!!e.target.closest('.layer-resize');
  e.stopPropagation();e.preventDefault();
  if(!this.active){this.focus(id||null);const target=this.getTarget();if(!target)return;if(target.target.locked){this.onLocked();return;}this.active=target;this.active.resize=resize;this.changed=false;this.onStart();}
  this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});this.viewport.setPointerCapture(e.pointerId);this.baseline();
 }
 move(e){
  if(!this.points.has(e.pointerId)||!this.active)return;e.preventDefault();this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});const a=[...this.points.values()],s=this.start,bed=this.active.bed;
  let next;
  if(a.length>=2&&s.points.length>=2){const m=mid(a),old=mid(s.points);next=scaledTarget(s.target,distance(a)/Math.max(1,distance(s.points)),{bed,dx:(m.x-old.x)/s.rect.width*100,dy:(m.y-old.y)/s.rect.height*100});}
  else if(a.length===1&&s.points.length===1){
   if(this.active.resize){const cx=s.rect.left+s.target.x/100*s.rect.width,cy=s.rect.top+s.target.y/100*s.rect.height,old=Math.hypot(s.points[0].x-cx,s.points[0].y-cy),now=Math.hypot(a[0].x-cx,a[0].y-cy);next=scaledTarget(s.target,now/Math.max(1,old),{bed});}
   else if(this.getMode()==='move')next=scaledTarget(s.target,1,{bed,dx:(a[0].x-s.points[0].x)/s.rect.width*100,dy:(a[0].y-s.points[0].y)/s.rect.height*100});
  }
  if(next){Object.assign(this.active.target,next);this.changed=true;this.onUpdate();}
 }
 up(e){if(!this.points.delete(e.pointerId))return;if(this.points.size){this.baseline();return;}const changed=this.changed;this.active=null;this.start=null;this.changed=false;this.onCommit(changed);}
}
