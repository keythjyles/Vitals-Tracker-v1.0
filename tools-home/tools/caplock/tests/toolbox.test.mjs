import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,validateProject} from '../core.mjs';
import {makeToolboxPlacement,shiftPlacementIn,fitPlacementOut,setPlacementSpeed,packetDuration,assetFrameLabel} from '../toolbox-core.mjs';
import {clipTime} from '../clip-time.mjs';
import {captionRecipe} from '../../../shared/production-stages.mjs';
const asset=()=>({id:'file-one',name:'1 why did.mp4',type:'video',ref:{kind:'local',name:'1 why did.mp4',size:123},frames:19,duration:19/24,sha256:'a'.repeat(64)});
test('native frame count and full video span survive reusable insertions and JSON',()=>{
 const p=createProject(),a=asset();p.toolbox.push(a);p.clips.push(makeToolboxPlacement(a,10,'first'),makeToolboxPlacement(a,50,'second'));
 assert.equal(p.clips[0].outFrame,30);assert.equal(p.clips[0].sourceFrames,19);assert.equal(p.clips[0].sourceDuration,19/24);assert.equal(p.clips[1].toolboxId,p.clips[0].toolboxId);
 p.clips[0].x=30;assert.equal(p.clips[1].x,50);p.clips.shift();const q=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(q.version,8);assert.equal(q.toolbox.length,1);assert.equal(q.toolbox[0].sha256,a.sha256);assert.equal(q.clips[0].sourceFrames,19);assert.match(assetFrameLabel(q.toolbox[0]),/19 source frames · 24 fps/);
});
test('IN retains duration; OUT and speed fit the complete source with exclusive OUT',()=>{
 const c=makeToolboxPlacement(asset(),10,'one');shiftPlacementIn(c,20);assert.equal(c.outFrame,40);assert.equal(c.playbackRate,1);
 fitPlacementOut(c,70);assert.ok(Math.abs(c.playbackRate-(19/24)/2)<1e-12);assert.equal(clipTime(c,69,1).shown,true);assert.ok(clipTime(c,69,1).target>0.75);assert.equal(clipTime(c,70,1).shown,false);
 setPlacementSpeed(c,2);assert.equal(c.outFrame,30);assert.throws(()=>fitPlacementOut(c,20));assert.throws(()=>shiftPlacementIn(c,-1));assert.throws(()=>fitPlacementOut(c,21));
});
test('packet timing excludes audio tails and source duration invalidates the render recipe',()=>{
 assert.ok(Math.abs(packetDuration(Array.from({length:19},(_,i)=>i/24),.85)-19/24)<1e-12);
 const p=createProject();p.clips=[makeToolboxPlacement(asset(),0,'one')];const before=JSON.stringify(captionRecipe(p));p.clips[0].sourceDuration=.8;assert.notEqual(JSON.stringify(captionRecipe(p)),before);
 assert.throws(()=>validateProject({...p,toolbox:[{...asset(),frames:0}]}));assert.throws(()=>validateProject({...p,toolbox:[{...asset(),sha256:'wrong'}]}));
});
