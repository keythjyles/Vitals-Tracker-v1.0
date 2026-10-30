import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,validateProject} from '../core.mjs';
import {insertCaption,startCaptionSequence,navigateCaption,moveCaptionDraft} from '../placement.mjs';
const clip=n=>({id:'c'+n,name:n+'.webm',captionNumber:n,type:'video',ref:{kind:'previewlock',name:n+'.webm',path:'/joke/'+n+'.webm',size:123},inFrame:20,outFrame:40,trimInFrame:0,trimOutFrame:20,playbackRate:1,x:37,y:75,width:90,rotation:0,opacity:1,volume:0,visible:false,locked:false,placed:false});
test('old auto-locked placements migrate as editable layers with exact timing and source',()=>{
 const p=createProject();p.version=5;p.clips=[{...clip(1),locked:true,visible:true}];delete p.clips[0].placed;
 const q=validateProject(p);assert.equal(q.version,6);assert.equal(q.clips[0].placed,true);assert.equal(q.clips[0].locked,false);assert.equal(q.clips[0].inFrame,20);assert.equal(q.clips[0].outFrame,40);assert.equal(q.clips[0].x,37);assert.equal(q.clips[0].ref.path,'/joke/1.webm');q.clips[0].x=65;assert.equal(validateProject(q).clips[0].x,65);
});
test('placed timing survives seeking, selecting another caption and returning; edits remain possible',()=>{
 const p=createProject();p.clips=[clip(1),clip(2)];startCaptionSequence(p,['c1','c2'],{frame:50});insertCaption(p,50);const before=structuredClone(p.clips[0].ref);navigateCaption(p,1,50);moveCaptionDraft(p,100);navigateCaption(p,-1,100);assert.equal(p.clips[0].inFrame,50);assert.equal(p.clips[0].outFrame,70);assert.equal(p.clips[0].placed,true);assert.equal(p.clips[0].locked,false);p.clips[0].width=150;assert.equal(validateProject(p).clips[0].width,150);assert.deepEqual(p.clips[0].ref,before);assert.equal(p.clips.length,2);
});
test('hidden placed layers remain in the project and deselection survives recovery',()=>{
 const p=createProject();p.clips=[clip(1)];startCaptionSequence(p,['c1'],{frame:20});insertCaption(p,20);p.clips[0].visible=false;p.editFocus='none';const q=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(q.clips[0].placed,true);assert.equal(q.clips[0].visible,false);assert.equal(q.editFocus,'none');assert.equal(q.clips[0].locked,false);
});
