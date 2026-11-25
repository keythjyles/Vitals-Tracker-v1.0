import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,Action,CameraTouch,stateAt,addSample,pathDocument,importDocument,drawScene} from '../core.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('independent durations: rotation holds at four, zoom at nine, Action ends at twelve source seconds',()=>{
 const p=newProject();p.settings.zoom.end=3;p.settings.rotation.degrees=90;const a=new Action(p,0,30);
 near(a.update(4).r,90);assert.equal(a.active,true);near(a.update(6).z,1+2*6/9);
 const at9=a.update(9);near(at9.z,3);assert.equal(a.active,true);
 a.manual=17;const end=a.update(12);near(end.r,107);near(end.z,3);assert.equal(a.active,false);
});
for(const curve of ['constant','accelerating','decelerating','ease'])test(`${curve} push/pull and rotation retain exact endpoints`,()=>{
 const p=newProject();p.settings.zoom={end:.25,duration:3,curve};p.settings.rotation={degrees:-450,duration:2,curve};const a=new Action(p,0,20);
 near(a.update(0).z,1);const s=a.update(5);near(s.z,.25);near(s.r,-450);assert.ok(a.active);
});
test('path is tied to source time at 1x, half, quarter and eighth speed',()=>{
 const paths=[];for(const speed of [1,.5,.25,.125]){const p=newProject();p.performanceSpeed=speed;p.settings.zoom.end=2;const a=new Action(p,0,20);for(const t of [0,1,4,9,12])a.update(t);paths.push(p.path);}
 for(const path of paths)assert.deepEqual(path,paths[0]);
});
test('raw samples retain deliberate motion; linear interpolation never overshoots or wraps multi-turn rotation',()=>{
 const path=[];addSample(path,0,{x:0,y:0,z:1,r:350});addSample(path,1,{x:20,y:-13,z:.3,r:730});
 assert.deepEqual(stateAt(path,.5),{x:10,y:-6.5,z:.65,r:540});
 addSample(path,1,{x:-20,y:13,z:.3,r:730});assert.equal(path.length,2);near(stateAt(path,1).x,-20);
 assert.throws(()=>addSample(path,.9,{x:0,y:0,z:1,r:0}));
});
test('navigation preserves path, correction inherits exact state and replaces only subsequent instructions',()=>{
 const p=newProject();p.settings.zoom.end=2;p.settings.rotation.degrees=120;const a=new Action(p,0,20);
 for(const t of [1,3,6,9,12]){a.state.x=t/10;a.update(t);}
 const original=structuredClone(p.path),at=stateAt(p.path,5);stateAt(p.path,2);assert.deepEqual(p.path,original);
 const b=new Action(p,5,20);assert.deepEqual(b.state,at);assert.deepEqual(p.path.slice(0,-1),original.filter(s=>s.t<5));
 assert.equal(p.path.at(-1).t,5);b.state.y=2;b.update(7);near(b.state.r,at.r); // rotation had already finished at the correction point
 near(b.update(9).z,2);assert.ok(!p.path.some(s=>s.t===12));
});
test('continuing at a paused time does not restart programmed movement',()=>{
 const p=newProject();p.settings.zoom.end=4;p.settings.rotation.degrees=180;const a=new Action(p,0,30);a.stop(3);
 const before=stateAt(p.path,3),b=new Action(p,3,30);assert.deepEqual(b.state,before);near(b.update(4).r,180);near(b.update(9).z,4);
});
test('release and reacquisition preserve pose; secondary finger never translates or zooms',()=>{
 const s={x:0,y:0,z:1,r:0};const g=new CameraTouch({read:()=>s,translate:(x,y)=>{s.x+=x;s.y+=y;},rotate:r=>s.r+=r});
 g.down(10,10,20);assert.deepEqual(s,{x:0,y:0,z:1,r:0});g.move(10,10,120,200,400);near(s.y,.25);
 g.down(20,110,120);g.move(20,210,120,200,400);near(s.r,0);near(s.z,1);near(s.y,.25);
 g.move(20,10,220,200,400);near(s.r,90);near(s.x,0);near(s.y,.25);
 g.up(20);g.up(10);const held={...s};g.down(30,600,900);assert.deepEqual(s,held);g.up(30);assert.deepEqual(s,held);
});
test('first finger retains direction with two fingers; primary removal promotes remaining finger without a jump',()=>{
 const s={x:0,y:0,z:1,r:0};const g=new CameraTouch({read:()=>s,translate:(x,y)=>{s.x+=x;s.y+=y;},rotate:r=>s.r+=r});
 g.down(4,0,0);g.down(9,100,0);g.move(4,0,100,200,400);near(s.y,.25);near(s.r,0);
 const before={...s};g.up(4);assert.deepEqual(s,before);g.move(9,120,0,200,400);near(s.x,.1);near(s.y,.25);near(s.z,1);
});
test('finger angle wraps continuously across -180/180 without a full-turn jump',()=>{
 let r=0;const s={x:0,y:0,z:1,r:0},g=new CameraTouch({read:()=>s,translate:()=>{},rotate:d=>r+=d});
 g.down(1,0,0);g.down(2,-100,1);g.move(2,-100,-1,200,400);assert.ok(r>0&&r<2);
});
test('source EOF ends Action independently of longer requested duration',()=>{const p=newProject();const a=new Action(p,2,3);a.update(9);assert.equal(a.active,false);assert.equal(p.path.at(-1).t,3);});
test('stage transforms and camera pose save independently; path reuse retains destination stage',()=>{
 const p=newProject();p.stage.x=3;p.stage.mirror=true;p.settings.zoom.end=2;const a=new Action(p,0,20);a.update(5);
 const next=newProject();next.stage.r=23;const restored=importDocument(pathDocument(p),next);assert.deepEqual(restored.stage,next.stage);assert.deepEqual(restored.path,p.path);
 p.scribe='[F50] hold';p.source={name:'Original.mp4',sha256:'abc'};assert.deepEqual(importDocument(p,newProject()),p);
});
test('invalid or unsorted documents cannot replace the active edit',()=>{
 const p=newProject(),original=structuredClone(p);assert.throws(()=>importDocument({...p,settings:{duration:-1}},p));
 assert.throws(()=>importDocument({...p,path:[{t:2,x:0,y:0,z:1,r:0},{t:1,x:0,y:0,z:1,r:0}]},p));
 assert.throws(()=>importDocument({...p,coordinates:{time:'wall-clock'}},p));assert.deepEqual(p,original);
});
test('painting uses inverse camera direction, unchanged zoom on rotation and opaque black outside source',()=>{
 const calls=[],ctx={save(){},restore(){},setTransform(){},fillRect(...v){calls.push(['fill',...v]);},translate(...v){calls.push(['translate',...v]);},rotate(v){calls.push(['rotate',v]);},scale(...v){calls.push(['scale',...v]);},drawImage(...v){calls.push(['draw',...v]);}};
 const p=newProject();drawScene(ctx,{width:100,height:100},p.stage,{x:50,y:90,z:.25,r:90},100,200);
 assert.deepEqual(calls[0],['fill',0,0,100,200]);assert.ok(calls.some(c=>c[0]==='translate'&&c[1]===-5000&&c[2]===-18000));
 assert.ok(calls.some(c=>c[0]==='scale'&&c[1]===.25&&c[2]===.25));assert.equal(ctx.fillStyle,'#000');
});
