import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,validateProject} from '../core.mjs';
import {captionNumber} from '../placement.mjs';
import {withCaptionBatch} from '../caption-batch.mjs';

const project={id:'cut-project-abc',assets:[{id:'bed',role:'bed',name:'Slide.mp4',path:'/project/Slide.mp4',size:100}]};
const asset={id:'caption',name:'Gemini.mp4',path:'/project/captions/Gemini.mp4',cuts:{id:'pass-2',status:'complete',clips:[{number:1,path:'/project/1.webm',frames:10,size:50},{number:2,path:'/project/2.webm',frames:12,size:60}]}};
test('a new caption pass preserves the existing joke scene and placed layers',()=>{
 const saved=createProject();saved.workspace={id:project.id,assetId:'previous',playhead:18};saved.media={kind:'previewlock',name:'Slide.mp4',path:'/project/Slide.mp4',size:100};saved.bedTransform={x:45,y:52,scale:.8};
 const first=withCaptionBatch(saved,project,{...asset,cuts:{...asset.cuts,id:'pass-1'}});first.clips[0].placed=true;first.clips[0].visible=true;first.clips[0].x=37;
 const before=structuredClone(first),next=withCaptionBatch(first,project,asset);
 assert.deepEqual(first,before,'the saved checkpoint is not mutated');assert.deepEqual(next.media,before.media);assert.deepEqual(next.bedTransform,before.bedTransform);assert.deepEqual(next.clips.slice(0,2),before.clips);assert.equal(next.clips.length,4);assert.deepEqual(next.captionSequence.clipIds,['pass-2-1','pass-2-2']);assert.equal(next.workspace.playhead,18);assert.equal(next.clips[2].inFrame,18);assert.equal(next.clips[2].visible,false);validateProject(next);
});
test('reopening the same pass restores its active caption and edits',()=>{
 const saved=withCaptionBatch(null,project,asset);saved.captionSequence.activeId='pass-2-2';saved.clips[1].width=55;saved.clips[1].placed=true;saved.clips[1].visible=true;
 assert.deepEqual(withCaptionBatch(saved,project,asset),saved);
 assert.throws(()=>withCaptionBatch({...saved,workspace:{id:'another-project'}},project,asset),/another joke/);
});

test('private alpha filenames retain the caption component order',()=>{assert.equal(captionNumber({ref:{name:'Slide.02_v01.alp'}}),2);assert.equal(captionNumber({ref:{name:'9.webm'}}),9);assert.equal(captionNumber({ref:{name:'Slide_v01.raw'}}),0);});
