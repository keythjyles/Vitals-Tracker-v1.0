import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedJokes,projectFolders,projectAssets,preferredBed,fitPortrait,PROJECT_ROOT} from '../../studio/project-index.mjs';
test('picker joins existing videos by canonical identity, preserves source hashes, and never invents missing joke text',()=>{
 const result=indexedJokes({existingGroups:[{canonicalId:'dad-known',title:'Known',assets:[{id:'v1',src:'media/one.mp4',sha256:'abc'}]},{canonicalId:'dad-unknown',title:'Unknown',assets:[{id:'v2',src:'media/two.mp4'}]}]},{catalog:[{id:'v1',text:'Literal joke.',poster:'media/one.jpg'},{id:'v2',text:'Preserved joke and complete reaction.'}]});
 assert.equal(result[0].text,'Literal joke.');assert.equal(result[0].assets[0].sha256,'abc');assert.equal(result[0].assets[0].poster,'media/one.jpg');assert.equal(result[1].text,'');assert.equal(result[0].path,PROJECT_ROOT+'/dad-known');
});
test('complete catalog fallback finds canonical folders without mistaking decision JSON for projects',()=>{
 assert.deepEqual(projectFolders([{path_display:PROJECT_ROOT+'/dad-one/project.json'},{path_display:PROJECT_ROOT+'/dad-one/video/bed.mp4'},{path_display:PROJECT_ROOT+'/dad-two.json'},{path_display:'/Grill Sergeant/Animation Lab/bed.mp4'}]),[{id:'dad-one',path:PROJECT_ROOT+'/dad-one'}]);
});
test('project assets include original animation and numbered cuts without inserting unrelated layers',()=>{
 const p={assets:[{id:'c',path:'/original.mp4',role:'caption',cuts:{clips:[{number:1,path:'/1.webm'},{number:2,path:'/2.webm'}]}},{path:'/1.webm'}]};const a=projectAssets(p);assert.equal(a.length,3);assert.equal(a[1].role,'caption component');assert.equal(a[1].name,'1.webm');assert.equal(a[1].parent,'c');
});
test('bed selection restores saved source exactly before falling back to the newest bed',()=>{
 const first={role:'bed',path:'/first'},second={role:'bed',path:'/second'},p={assets:[first,second],caplock:{media:{path:'/first'}}};assert.equal(preferredBed(p),first);delete p.caplock;assert.equal(preferredBed(p),second);
});
test('portrait fits entirely inside phone, short landscape and desktop workspaces',()=>{
 for(const [w,h] of [[285,388],[250,366],[640,450],[0,0]]){const size=fitPortrait(w,h);assert.ok(size.width<=w+.001);assert.ok(size.height<=h+.001);if(w&&h)assert.ok(Math.abs(size.width/size.height-9/16)<1e-9);}
});
