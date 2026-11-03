import test from 'node:test';import assert from 'node:assert/strict';
import {DEFAULT_CHROMA,inferBackground,removeBackground,validateChroma} from '../background.mjs';
import {createProject,validateProject} from '../core.mjs';
import {captionRecipe} from '../../../shared/production-stages.mjs';
const solid=(r,g,b,a=255)=>new Uint8ClampedArray(Array.from({length:64*64},()=>[r,g,b,a]).flat());
test('solid blue, green and other solid backgrounds are detected from pixels; alpha and nonuniform edges stay intact',()=>{
 for(const color of [[0,96,184],[0,221,68],[245,245,245],[0,0,0]]){const p=solid(...color),key=inferBackground(p,64,64);assert.ok(key?.enabled);assert.equal(key.color,'#'+color.map(v=>v.toString(16).padStart(2,'0')).join(''));}
 assert.equal(inferBackground(solid(0,0,0,0),64,64),null);
 const split=solid(0,96,184);for(let y=0;y<64;y++)for(let x=32;x<64;x++){const i=(y*64+x)*4;split[i]=255;split[i+1]=230;split[i+2]=0;}assert.equal(inferBackground(split,64,64),null);
});
test('keying clears background, keeps lettering/outline, multiplies existing alpha and supports soft/hard edges',()=>{
 const key={...DEFAULT_CHROMA,color:'#0060b8'},source=new Uint8ClampedArray([0,96,184,255,255,230,0,255,0,0,0,255,255,255,255,120,0,96,184,0]);
 assert.deepEqual([...removeBackground(source,key)],[0,96,184,0,255,230,0,255,0,0,0,255,255,255,255,120,0,96,184,0]);
 const edge=new Uint8ClampedArray([88,96,184,128]);removeBackground(edge,key);assert.ok(edge[3]>0&&edge[3]<128);
 const off=new Uint8ClampedArray([0,96,184,255]);removeBackground(off,{...key,enabled:false});assert.equal(off[3],255);removeBackground(off,{...key,blend:0});assert.equal(off[3],0);
});
test('schema7 saves editable background settings without changing source, timing or legacy state',()=>{
 const p=createProject();p.clips=[{id:'c',name:'1 why did.mp4',type:'video',ref:{kind:'local',name:'1 why did.mp4',path:'',size:100},inFrame:12,outFrame:32,trimInFrame:0,trimOutFrame:20,playbackRate:1,x:50,y:75,width:90,rotation:0,opacity:1,volume:0,visible:true,placed:true,captionNumber:1,loop:false,chroma:{...DEFAULT_CHROMA,color:'#0060b8'}}];
 const q=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(q.version,8);assert.deepEqual(q.clips[0].chroma,p.clips[0].chroma);assert.deepEqual(q.clips[0].ref,p.clips[0].ref);assert.equal(q.clips[0].inFrame,12);assert.equal(q.clips[0].trimOutFrame,20);
 const legacy={...p,version:6,clips:p.clips.map(({chroma,...c})=>c)},recovered=validateProject(legacy);assert.equal(recovered.version,8);assert.equal(recovered.clips[0].chroma,undefined);assert.equal(recovered.clips[0].inFrame,12);
 for(const bad of [{enabled:'yes'},{color:'blue'},{similarity:.8},{blend:-1}])assert.throws(()=>validateChroma({...DEFAULT_CHROMA,...bad}));
 const first=JSON.stringify(captionRecipe(q));q.clips[0].chroma.color='#00dd44';assert.notEqual(JSON.stringify(captionRecipe(q)),first);q.clips[0].chroma.enabled=false;assert.equal(JSON.stringify(captionRecipe(q)),JSON.stringify(captionRecipe(recovered)));
});
