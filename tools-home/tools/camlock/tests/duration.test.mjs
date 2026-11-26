import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,fitActionDuration,actionLimit,Action,importDocument} from '../core.mjs';
test('newly loaded duration fills the remaining source and manual values clamp at EOF',()=>{
 const p=newProject();p.source={duration:9.72};p.start=1.2;p.settings.durationAutomatic=true;
 fitActionDuration(p);assert.ok(Math.abs(p.settings.duration-8.52)<1e-10);
 p.settings.durationAutomatic=false;p.settings.duration=60;fitActionDuration(p);assert.ok(Math.abs(p.settings.duration-8.52)<1e-10);
 p.settings.duration=2;fitActionDuration(p);assert.equal(p.settings.duration,2);
 assert.equal(actionLimit(p,8.72),1);
});
test('duration recovery clamps the setting without editing recorded poses or segments',()=>{
 const p=newProject();p.source={duration:4};p.settings.duration=10;
 const a=new Action(p,0,4);a.update(1);a.stop(2);
 const path=JSON.stringify(p.path),segments=JSON.stringify(p.segments);
 const restored=importDocument(p,newProject());
 assert.equal(restored.settings.duration,4);assert.equal(JSON.stringify(restored.path),path);assert.equal(JSON.stringify(restored.segments),segments);
});
test('late insertion cannot record beyond source EOF',()=>{
 const p=newProject();p.source={duration:4};p.settings.duration=12;
 const action=new Action(p,3.76,4,{insert:true});action.update(10);
 assert.equal(action.end,4);assert.ok(Math.abs(action.settings.duration-.24)<1e-10);assert.equal(p.path.at(-1).t,4);
});
