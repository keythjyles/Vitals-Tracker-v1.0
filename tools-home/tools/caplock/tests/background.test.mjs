import test from 'node:test';import assert from 'node:assert/strict';
import {DEFAULT_CHROMA,inferBackground,inferChromaScreen,removeBackground,validateChroma} from '../background.mjs';
import {createProject,validateProject} from '../core.mjs';
import {captionRecipe} from '../../../shared/production-stages.mjs';
const solid=(r,g,b,a=255)=>new Uint8ClampedArray(Array.from({length:64*64},()=>[r,g,b,a]).flat());
test('solid blue, green and other solid backgrounds are detected from pixels; alpha and nonuniform edges stay intact',()=>{
 for(const color of [[0,96,184],[0,221,68],[245,245,245],[0,0,0]]){const p=solid(...color),key=inferBackground(p,64,64);assert.ok(key?.enabled);assert.equal(key.color,'#'+color.map(v=>v.toString(16).padStart(2,'0')).join(''));}
 assert.equal(inferBackground(solid(0,0,0,0),64,64),null);
 assert.equal(inferBackground(solid(0,0,0,0),64,64,{includeAlpha:true}).sourceAlpha,true);
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

test('background opacity affects keyed pixels while retaining foreground and original alpha',()=>{
 const pixels=new Uint8ClampedArray([10,119,212,255,255,240,100,255,10,119,212,128]);
 const key={...DEFAULT_CHROMA,backgroundOpacity:.5};
 assert.deepEqual([...removeBackground(pixels,key)].filter((_,i)=>i%4===3),[128,255,64]);
 assert.equal(validateChroma(key).backgroundOpacity,.5);
 assert.throws(()=>validateChroma({...key,backgroundOpacity:1.1}));
});

test('replacement color round-trips and changes the export recipe only when active',()=>{
 const key={...DEFAULT_CHROMA,sourceAlpha:true,backgroundOpacity:0,replacement:{enabled:true,color:'#7347C2'}};
 const checked=validateChroma(key);
 assert.deepEqual(checked.replacement,{enabled:true,color:'#7347c2'});
 assert.equal(checked.sourceAlpha,true);
 assert.throws(()=>validateChroma({...key,replacement:{enabled:true,color:'red'}}));
 const p={clips:[{id:'one',type:'video',visible:true,ref:{path:'/animation',size:100},chroma:checked}]};
 assert.deepEqual(captionRecipe(p).clips[0].chroma,checked);
 p.clips[0].chroma.replacement.enabled=false;
 const masked=captionRecipe(p);
 p.clips[0].chroma.replacement.color='#aabbcc';
 assert.deepEqual(captionRecipe(p),masked);
 p.clips[0].chroma.enabled=false;
 assert.equal(captionRecipe(p).clips[0].chroma,undefined);
});



test('an internal green phone screen keys out while the finger, camera hole and room remain opaque',()=>{
 const width=64,height=64,pixels=solid(130,90,50);
 const put=(x,y,color)=>pixels.set([...color,255],(y*width+x)*4);
 // Nonuniform scene edges deliberately defeat the old border-only sampler.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)put(x,y,[90+x,55+y,30]);
 for(let y=15;y<56;y++)for(let x=18;x<46;x++)put(x,y,[2,217,0]);
 for(let y=36;y<53;y++)for(let x=33;x<39;x++)put(x,y,[210,150,110]);
 put(31,18,[0,0,0]);
 assert.equal(inferBackground(pixels,width,height),null);
 const key=inferChromaScreen(pixels,width,height);
 assert.equal(key.color,'#02d900');
 removeBackground(pixels,key);
 const alpha=(x,y)=>pixels[(y*width+x)*4+3];
 assert.equal(alpha(25,30),0,'the card underneath is visible in the screen');
 assert.equal(alpha(35,45),255,'the finger occludes the card');
 assert.equal(alpha(31,18),255,'the camera hole is retained');
 assert.equal(alpha(4,4),255,'the scene is retained');
});

test('screen detection needs a substantial connected flat patch and supports blue screens',()=>{
 const pixels=solid(120,90,60);
 for(let y=0;y<64;y+=2)for(let x=0;x<64;x+=2)pixels.set([0,220,0,255],(y*64+x)*4);
 assert.equal(inferChromaScreen(pixels,64,64),null,'scattered green detail is not a screen');
 for(let y=20;y<50;y++)for(let x=20;x<45;x++)pixels.set([0,70,240,255],(y*64+x)*4);
 assert.equal(inferChromaScreen(pixels,64,64).color,'#0046f0');
 assert.equal(inferChromaScreen(solid(0,220,0,0),64,64),null);
});
