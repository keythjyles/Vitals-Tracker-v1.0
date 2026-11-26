// CamLock V1.6. World positions use viewport widths/heights; camera is independent of stage.
export const SCHEMA = 'CamLockProject-1.0';
export const COORDINATES = Object.freeze({version:1,origin:'viewport-center',x:'viewport-width',y:'viewport-height',z:'multiplier-of-locked-stage',r:'unwrapped-camera-degrees-clockwise',time:'absolute-source-seconds',interpolation:'linear-no-overshoot'});
export const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const finite = n => typeof n === 'number' && Number.isFinite(n);
const clone = value => JSON.parse(JSON.stringify(value));
export function ease(name,p) {
 p=clamp(p,0,1);
 if(name==='accelerating')return p*p;
 if(name==='decelerating')return 1-(1-p)*(1-p);
 if(name==='ease')return p*p*(3-2*p);
 return p;
}
export function newProject() {
 return {schema:SCHEMA,tool:'GS-TOOL-CAMLOCK',release:'V1.6',createdAt:new Date().toISOString(),source:null,trim:null,
  coordinates:{...COORDINATES},stage:{x:0,y:0,scale:1,r:0,mirror:false,flip:false,width:1080,height:1920,locked:false},
  start:0,settings:{duration:12,durationAutomatic:false,zoom:{end:1,duration:9,curve:'constant'},rotation:{enabled:false,snap:true,degrees:0,duration:4,curve:'constant'}},
  controls:{touchGain:.25,joystick:false,joystickSpeed:.1},
  audio:{volume:1,previousVolume:1,fadeIn:0,fadeOut:0},performanceSpeed:1,fps:25,path:[],segments:[],scribe:''};
}
export function initialCamera(){return {x:0,y:0,z:1,r:0};}
export function actionLimit(project, origin=project.start) {
 return Math.max(0,(project.source?.duration??0)-origin);
}
export function fitActionDuration(project, origin=project.start) {
 const limit=actionLimit(project,origin);
 if(limit>0)project.settings.duration=project.settings.durationAutomatic?limit:Math.min(project.settings.duration,limit);
 return limit;
}
export function clipRange(project){
 const start=project.trim?.start??0,end=project.trim?.end??project.source?.duration??0;
 return {start,end,duration:Math.max(0,end-start)};
}
export function stateAt(path,t,fallback=initialCamera()) {
 if(!path.length)return {...fallback};
 let lo=0,hi=path.length-1;
 if(t<=path[lo].t)return cameraOnly(path[lo]);
 if(t>=path[hi].t)return cameraOnly(path[hi]);
 while(hi-lo>1){const mid=(lo+hi)>>1;if(path[mid].t<=t)lo=mid;else hi=mid;}
 const a=path[lo],b=path[hi],p=(t-a.t)/(b.t-a.t),out={};
 for(const k of ['x','y','z','r'])out[k]=a[k]+(b[k]-a[k])*p;
 return out;
}
export function cameraOnly(s){return {x:s.x,y:s.y,z:s.z,r:s.r};}
export function snapSquare(angle,enabled=true){const square=Math.round(angle/90)*90;return enabled&&Math.abs(angle-square)<=5?square:angle;}
export function addSample(path,t,state) {
 if(!finite(t)||!['x','y','z','r'].every(k=>finite(state[k]))||state.z<=0)throw Error('Invalid camera sample.');
 const item={t,...cameraOnly(state)},last=path.at(-1);
 if(finite(state.rawR))item.rawR=state.rawR;
 if(last&&t<last.t-1e-9)throw Error('Source time moved backward during Action. Pause and navigate first.');
 if(last&&Math.abs(t-last.t)<1e-9)path[path.length-1]=item;else path.push(item);
}
export class Action {
 constructor(project,at,sourceEnd,{insert=false}={}) {
  if(!finite(at)||!finite(sourceEnd)||sourceEnd<=0)throw Error('Choose a valid source time before Action.');
  const previous=project.segments.findLast(s=>s.start<=at+1e-7);
  this.project=project;this.start=clamp(at,0,sourceEnd);
  this.origin=insert?this.start:finite(previous?.origin)?previous.origin:project.start;
  const length=Math.min(project.settings.duration,sourceEnd-this.origin);
  this.end=Math.min(sourceEnd,this.origin+length);
  if(this.start<this.origin-1e-7||this.start>=this.end-1e-7)throw Error('Choose a source time inside the Action range, or Play and touch to insert here.');
  this.base=stateAt(project.path,this.start);this.state={...this.base};this.settings=clone(project.settings);this.settings.duration=length;
  this.manual=0;this.rawManual=0;this.manualTouched=false;this.active=true;
  // Only Action truncates. Navigation and review never mutate instructions.
  project.path=project.path.filter(s=>s.t<this.start);
  project.segments=project.segments.filter(s=>s.start<this.start).map(s=>({...s,end:Math.min(s.end,this.start)}));
  this.segment={start:this.start,end:this.start,origin:this.origin,base:{...this.base},settings:clone(this.settings)};
  project.segments.push(this.segment);addSample(project.path,this.start,this.state);
 }
 programRotation(t){const r=this.settings.rotation;if(r.enabled===false)return 0;return r.degrees*(ease(r.curve,(t-this.origin)/Math.max(1e-9,r.duration))-ease(r.curve,(this.start-this.origin)/Math.max(1e-9,r.duration)));}
 rotate(degrees,t){
  if(this.settings.rotation.enabled===false)return;
  this.rawManual+=degrees;this.manualTouched=true;
  const program=this.programRotation(clamp(t,this.start,this.end)),raw=this.base.r+program+this.rawManual,opening=this.project.stage.r;
  this.manual=snapSquare(raw-opening,this.settings.rotation.snap!==false)+opening-this.base.r-program;
 }
 update(t) {
  t=clamp(t,this.start,this.end);
  const elapsed=t-this.origin,from=this.start-this.origin;
  const z=this.settings.zoom;
  const zp=ease(z.curve,elapsed/Math.max(1e-9,z.duration)),z0=ease(z.curve,from/Math.max(1e-9,z.duration));
  this.state.z=z0<1?this.base.z+(z.end-this.base.z)*(zp-z0)/(1-z0):this.base.z;
  const program=this.programRotation(t);
  this.state.r=this.base.r+program+this.manual;
  if(this.manualTouched)this.state.rawR=this.base.r+program+this.rawManual;
  this.segment.end=t;addSample(this.project.path,t,this.state);
  if(t>=this.end-1e-9)this.active=false;
  return {...this.state};
 }
 stop(t){const s=this.update(t);this.active=false;return s;}
}
export function cameraDirection(state,dx,dy,aspect){
 const r=state.r*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 return {x:(c*dx-s*dy/aspect)/state.z,y:(s*dx*aspect+c*dy)/state.z};
}
export class CameraTouch {
 constructor({read,translate,rotate,rotationEnabled=()=>true,sensitivity=()=>1}){this.points=new Map();this.read=read;this.translate=translate;this.rotate=rotate;this.rotationEnabled=rotationEnabled;this.sensitivity=sensitivity;this.angle=null;}
 get size(){return this.points.size;}
 resetAngle(){const [a,b]=this.points.values();this.angle=a&&b&&Math.hypot(b.x-a.x,b.y-a.y)>2?Math.atan2(b.y-a.y,b.x-a.x):null;}
 down(id,x,y){if(this.points.size>=2)return;this.points.set(id,{x,y});this.resetAngle();}
 move(id,x,y,width,height){
  const previous=this.points.get(id);if(!previous)return;
  const primary=this.points.keys().next().value;this.points.set(id,{x,y});
  if(id===primary){
   // A screen-space direction is transformed into camera-world space. No edge limits.
   const gain=this.sensitivity(),delta=cameraDirection(this.read(),(x-previous.x)/width*gain,(y-previous.y)/height*gain,width/height);
   this.translate(delta.x,delta.y);
   this.resetAngle();
  }else{
   if(!this.rotationEnabled()){this.resetAngle();return;}
   const [a,b]=this.points.values();
   if(Math.hypot(b.x-a.x,b.y-a.y)<=2){this.angle=null;return;}
   const angle=Math.atan2(b.y-a.y,b.x-a.x);
   if(this.angle!==null){let delta=angle-this.angle;while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;this.rotate(delta*180/Math.PI);}
   this.angle=angle;
  }
 }
 up(id){this.points.delete(id);this.resetAngle();} // Remaining finger is rebased in place, never teleported.
 clear(){this.points.clear();this.angle=null;}
}
export class CameraJoystick {
 constructor({read,translate,speed=()=>.1,deadZone=.12}){this.read=read;this.translate=translate;this.speed=speed;this.deadZone=deadZone;this.reset();}
 reset(t=null){this.x=0;this.y=0;this.time=t;}
 set(x,y,radius){
  const distance=Math.hypot(x,y),amount=clamp((distance/radius-this.deadZone)/(1-this.deadZone),0,1);
  this.x=distance?x/distance*amount:0;this.y=distance?y/distance*amount:0;
 }
 advance(t,width,height){
  const elapsed=this.time===null?0:Math.max(0,t-this.time);this.time=t;
  if(!elapsed||!width||!height||!this.x&&!this.y)return;
  // Rate is a fraction of picture width per source second, independent of performance speed.
  const rate=this.speed()*elapsed,delta=cameraDirection(this.read(),this.x*rate,this.y*rate*width/height,width/height);
  this.translate(delta.x,delta.y);
 }
}
export function drawScene(ctx,image,stage,camera,width,height) {
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);
 if(image){
  const iw=image.videoWidth||image.width,ih=image.videoHeight||image.height;
  if(iw&&ih){
   const fit=Math.min(width/iw,height/ih)*stage.scale;
   ctx.translate(width/2,height/2);ctx.rotate(-camera.r*Math.PI/180);ctx.scale(camera.z,camera.z);
   ctx.translate(-camera.x*width,-camera.y*height);
   ctx.translate(stage.x*width,stage.y*height);ctx.rotate(stage.r*Math.PI/180);
   ctx.scale(stage.mirror?-fit:fit,stage.flip?-fit:fit);ctx.drawImage(image,-iw/2,-ih/2,iw,ih);
  }
 }
 ctx.restore();
}
export function pathDocument(project){return {schema:'CamLockPath-1.0',coordinates:clone(project.coordinates),start:project.start,settings:clone(project.settings),path:clone(project.path),segments:clone(project.segments),viewport:{width:project.stage.width,height:project.stage.height},sourceDuration:project.source?.duration};}
export function validatePath(path){
 if(!Array.isArray(path)||path.length>2000000)throw Error('Invalid or oversized camera path.');
 let t=-Infinity;for(const s of path){if(!s||!['t','x','y','z','r'].every(k=>finite(s[k]))||s.t<0||s.t<=t||s.z<=0||s.z>10000||s.rawR!==undefined&&!finite(s.rawR))throw Error('Invalid camera path sample.');t=s.t;}
 return path.map(s=>({t:s.t,...cameraOnly(s),...(s.rawR===undefined?{}:{rawR:s.rawR})}));
}
function settingsCheck(s){
 if(!s||!finite(s.duration)||s.duration<=0||s.duration>86400)throw Error('Invalid Action duration.');
 for(const part of [s.zoom,s.rotation])if(!part||!finite(part.duration)||part.duration<=0||!['constant','accelerating','decelerating','ease'].includes(part.curve))throw Error('Invalid programmed movement.');
 if(!finite(s.zoom.end)||s.zoom.end<=0||s.zoom.end>10000||!finite(s.rotation.degrees))throw Error('Invalid programmed movement values.');
 for(const key of ['enabled','snap'])if(s.rotation[key]!==undefined&&typeof s.rotation[key]!=='boolean')throw Error('Invalid rotation switch.');
 const out=clone(s);out.durationAutomatic=s.durationAutomatic===true;out.rotation.enabled??=s.rotation.degrees!==0;out.rotation.snap??=true;return out;
}
export function importDocument(input,current) {
 if(!input||!['CamLockProject-1.0','CamLockPath-1.0','CamLockStage-1.0'].includes(input.schema))throw Error('Choose a CamLock project, stage or camera path.');
 const out=clone(current);
 if(input.schema!== 'CamLockStage-1.0'){
  if(!input.coordinates||!Object.keys(COORDINATES).every(k=>input.coordinates[k]===COORDINATES[k]))throw Error('Unsupported camera coordinate system.');
  if(!finite(input.start)||input.start<0)throw Error('Invalid source start.');
  out.start=input.start;out.settings=settingsCheck(input.settings);out.path=validatePath(input.path);
  out.segments=Array.isArray(input.segments)?clone(input.segments):[];
 }
 if(input.schema!=='CamLockPath-1.0'){
  const s=input.stage;if(!s||!['x','y','scale','r','width','height'].every(k=>finite(s[k]))||s.scale<=0||s.width<2||s.height<2||s.width>7680||s.height>7680||s.width%2||s.height%2)throw Error('Invalid stage.');
  out.stage=clone(s);
  if(input.schema==='CamLockStage-1.0'){if(!finite(input.start)||input.start<0)throw Error('Invalid stage opening timestamp.');out.start=input.start;}
 }
 if(input.schema==='CamLockProject-1.0'){
  if(typeof input.createdAt==='string')out.createdAt=input.createdAt;
  out.source=input.source?clone(input.source):null;out.scribe=typeof input.scribe==='string'?input.scribe:'';
  out.trim=null;
  if(input.trim!==undefined&&input.trim!==null){
   const t=input.trim;
   if(!finite(t.start)||!finite(t.end)||t.start<0||t.end<=t.start||out.source?.duration!==undefined&&t.end>out.source.duration+1e-7)throw Error('Invalid output trim.');
   out.trim={start:t.start,end:t.end};
  }
  if(!finite(input.audio?.volume)||input.audio.volume<0||input.audio.volume>1)throw Error('Invalid audio level.');
  for(const key of ['fadeIn','fadeOut'])if(!finite(input.audio[key])||input.audio[key]<0)throw Error('Invalid audio fade.');
  out.audio=clone(input.audio);out.fps=[24,25,30,50,60].includes(input.fps)?input.fps:25;
  out.performanceSpeed=[1,.5,.25,.125].includes(input.performanceSpeed)?input.performanceSpeed:1;
  if(input.controls!==undefined){
   const c=input.controls;
   if(!c||![1,.5,.25,.125].includes(c.touchGain)||typeof c.joystick!=='boolean'||!finite(c.joystickSpeed)||c.joystickSpeed<.01||c.joystickSpeed>2)throw Error('Invalid direction controls.');
   out.controls=clone(c);
  }
 }
 fitActionDuration(out);
 return out;
}

