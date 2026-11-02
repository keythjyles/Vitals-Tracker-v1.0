import test from 'node:test';
import assert from 'node:assert/strict';
import {captionRecipe,stageAsset,stageAccepts,stageFilename,mediaContainer} from '../production-stages.mjs';
test('ready filters follow saved stage receipts and invalidate changed render decisions',()=>{
 const caplock={media:{path:'/raw',size:50},bedTransform:{x:50,y:50,scale:1},clips:[]},asset={id:'cap',sha256:'hash',role:'stage'},p={caplock,assets:[asset],production:{records:[{assetId:'cap',sha256:'hash',stage:'captioned',verified:true,recipeJSON:JSON.stringify(captionRecipe(caplock))}]}};
 assert.equal(stageAccepts(p,asset,'sound'),true);assert.equal(stageAccepts(p,asset,'cut'),false);assert.equal(stageAsset(p,'captioned').id,'cap');
 p.caplock.editFocus='none';p.caplock.workspace={playhead:23};assert.equal(stageAccepts(p,asset,'sound'),true,'view position is not a new picture edit');p.caplock.bedTransform.scale=.8;assert.equal(stageAsset(p,'captioned'),null,'changed geometry makes an old render stale');
 assert.equal(stageAccepts(p,{id:'unknown',name:'looks-ready.cap'},'sound'),false,'a renamed file is not a verified next-stage output');
});
test('stage filenames are readable, safe and independent of the actual media container',()=>{assert.equal(stageFilename('Slide','captioned',2),'Slide_v02.cap');assert.equal(stageFilename('Slide','alpha',1,2),'Slide.02_v01.alp');assert.equal(mediaContainer(new Uint8Array([0,0,0,0,102,116,121,112])),'mp4');assert.throws(()=>mediaContainer(new Uint8Array([1,2,3])),/not readable/);assert.ok(!stageFilename('../Slide: x','raw').includes('/'));});
