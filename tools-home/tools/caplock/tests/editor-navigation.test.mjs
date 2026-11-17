import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {matrixFrame} from '../../../shared/item-matrix.mjs';
const cap=fs.readFileSync(new URL('../caplock.mjs',import.meta.url),'utf8');
const aspect=fs.readFileSync(new URL('../../aspectlock/editor.mjs',import.meta.url),'utf8');
function declaration(source,name){
 const lines=source.split('\n'),start=lines.findIndex(line=>line.startsWith('function '+name+'('));
 if(lines[start].endsWith('}'))return lines[start];
 const end=lines.findIndex((line,i)=>i>start&&line==='}');
 return lines.slice(start,end+1).join('\n');
}
test('matrix seeks use the full rectangle, clamp boundaries, and retain integer frames',()=>{
 const rect={left:100,width:400};assert.equal(matrixFrame(100,rect,240),0);assert.equal(matrixFrame(300,rect,240),120);assert.equal(matrixFrame(500,rect,240),240);assert.equal(matrixFrame(0,rect,240),0);assert.equal(matrixFrame(900,rect,240),240);
});
test('CapLock item settings retain the manual playhead and legacy insertion-frame navigation',()=>{
 const calls=[],els={clipTimingError:{}};
 const state={TOOLBOX_MODE:false,restoring:false,project:{editFocus:'bed'},paintFocus:()=>{},renderSourceSound:()=>{},selectedClip:'old',editMode:'move',layers:{update:()=>calls.push('update')},pause:()=>calls.push('pause'),renderClips:()=>calls.push('render'),clipCurrent:()=>({name:'9.webm',type:'video',inFrame:120}),openInsertionSettings:()=>calls.push('open'),seek:n=>calls.push(['seek',n]),v:{src:'bed.mp4'},$:id=>els[id]};
 vm.createContext(state);vm.runInContext(declaration(cap,'selectClip')+'\n'+declaration(cap,'openClipProperties'),state);state.openClipProperties('new');
 assert.equal(state.selectedClip,'new');assert.equal(state.editMode,'move');assert.equal(calls[0],'pause');assert.deepEqual(calls.find(Array.isArray),['seek',120]);assert.ok(calls.includes('open'));state.TOOLBOX_MODE=true;calls.length=0;state.openClipProperties('new');assert.equal(calls.some(Array.isArray),false);
});
test('AspectLock returning to a bed frame pauses both media and never initiates playback',()=>{
 let bedPauses=0,overlayPauses=0;
 const bv={readyState:4,duration:10,currentTime:7,pause:()=>bedPauses++};
 const ov={pause:()=>overlayPauses++};
 const state={bv,ov,FPS:25,lastFrame:duration=>duration*25-1,overlayPreview:true,requestedBedFrame:null,paintPlayback:()=>{}};
 const start=aspect.indexOf('function seekBedFrame('),end=aspect.indexOf('for (const [id,direction]',start);
 vm.createContext(state);vm.runInContext(aspect.slice(start,end),state);
 state.seekBedFrame(0);assert.equal(bedPauses,1);assert.equal(overlayPauses,1);assert.equal(bv.currentTime,0);assert.equal(state.overlayPreview,false);
 state.seekBedFrame(125);assert.equal(bv.currentTime,5);assert.equal(state.requestedBedFrame,125);
 state.seekBedFrame(250);assert.equal(bv.currentTime,9.96);assert.equal(state.requestedBedFrame,249);
});

test('clip reconnection cannot change the saved caption selection or deselected focus',()=>{
 const state={restoring:true,project:{editFocus:'none',captionSequence:{clipIds:['c1','c2'],activeId:'c2'}},selectedClip:'c2',editMode:'view',pause(){},renderClips(){},paintFocus(){},layers:{selected:'c2',update(){}}};vm.createContext(state);vm.runInContext(declaration(cap,'selectClip'),state);state.selectClip('c1');assert.equal(state.project.captionSequence.activeId,'c2');assert.equal(state.project.editFocus,'none');state.restoring=false;state.selectClip('c1');assert.equal(state.project.captionSequence.activeId,'c1');assert.equal(state.project.editFocus,'overlay');
});

