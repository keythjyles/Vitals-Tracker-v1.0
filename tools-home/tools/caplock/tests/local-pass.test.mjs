import test from 'node:test';import assert from 'node:assert/strict';
import {passFilename,matchLocalFile,localPassKey} from '../local-pass.mjs';
test('successive local passes receive separate video names',()=>{
 assert.equal(passFilename('Slide.mp4'),'Slide_CapLock_pass_01.mp4');
 assert.equal(passFilename('Slide_CapLock_pass_01.mp4'),'Slide_CapLock_pass_02.mp4');
 assert.equal(passFilename('Slide_CapLock_pass_09.mp4'),'Slide_CapLock_pass_10.mp4');
 assert.equal(passFilename('../Slide.mp4'),'.._Slide_CapLock_pass_01.mp4');
});
test('reconnect selects only the exact local filename and size; unrelated inputs do not create layers',()=>{
 const a={name:'2 the kid.mp4',size:12},b={name:'1 why did.mp4',size:12};
 assert.equal(matchLocalFile([b,{...a,size:13},a],{kind:'local',name:a.name,size:12}),a);
 assert.equal(matchLocalFile([b],{kind:'local',name:a.name,size:12}),undefined);
 assert.equal(matchLocalFile([a],{kind:'previewlock',name:a.name,size:12}),undefined);
});
test('a new media connection invalidates cached output even when file names and recipes match',()=>{
 const p={clips:[{id:'one',visible:true,placed:true,captionNumber:1}]},m=new Map([['one',{url:'blob:one'}]]),recipe={frames:25};
 const key=localPassKey(p,'blob:bed',m,recipe);assert.notEqual(localPassKey(p,'blob:replacement-bed',m,recipe),key);
 m.set('one',{url:'blob:replacement-overlay'});assert.notEqual(localPassKey(p,'blob:bed',m,recipe),key);
});
