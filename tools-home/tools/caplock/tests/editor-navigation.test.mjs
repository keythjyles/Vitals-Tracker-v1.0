import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {matrixFrame} from '../../../shared/item-matrix.mjs';
const cap=fs.readFileSync(new URL('../caplock.mjs',import.meta.url),'utf8');
const aspect=fs.readFileSync(new URL('../../aspectlock/index.html',import.meta.url),'utf8');
function declaration(source,name){return source.split('\n').find(line=>line.startsWith('function '+name+'('));}
test('matrix seeks use the full rectangle, clamp boundaries, and retain integer frames',()=>{
 const rect={left:100,width:400};assert.equal(matrixFrame(100,rect,240),0);assert.equal(matrixFrame(300,rect,240),120);assert.equal(matrixFrame(500,rect,240),240);assert.equal(matrixFrame(0,rect,240),0);assert.equal(matrixFrame(900,rect,240),240);
});
test('CapLock item selection pauses and opens the existing item at its insertion frame',()=>{
 const calls=[],els={clipPropertiesTitle:{},viewport:{scrollIntoView:()=>calls.push('scroll')},clipProperties:{open:false,showModal(){this.open=true;calls.push('open');}}};
 const state={restoring:false,project:{editFocus:'bed'},paintFocus:()=>{},selectedClip:'old',editMode:'move',layers:{update:()=>calls.push('update')},pause:()=>calls.push('pause'),renderClips:()=>calls.push('render'),clipCurrent:()=>({name:'9.webm',inFrame:120}),seek:n=>calls.push(['seek',n]),v:{src:'bed.mp4'},$:id=>els[id]};
 vm.createContext(state);vm.runInContext(declaration(cap,'selectClip')+'\n'+declaration(cap,'openClipProperties'),state);state.openClipProperties('new');
 assert.equal(state.selectedClip,'new');assert.equal(state.editMode,'view');assert.equal(calls[0],'pause');assert.ok(calls.find(x=>Array.isArray(x)&&x[0]==='seek'&&x[1]===120));assert.equal(els.clipProperties.open,true);assert.equal(els.clipPropertiesTitle.textContent,'Edit · 9.webm');
});
test('AspectLock returning to a bed frame pauses both media and never initiates playback',()=>{
 let pauses=0,syncs=0;const bv={readyState:4,duration:10,currentTime:7};const state={bv,overlayPreview:true,Q:id=>id==='pause'?{click:()=>pauses++}:{},syncOverlay:()=>syncs++,paintAddedMatrix:()=>{}};
 vm.createContext(state);vm.runInContext(declaration(aspect,'seekBedFrame'),state);state.seekBedFrame(0);assert.equal(pauses,1);assert.equal(bv.currentTime,0);assert.equal(state.overlayPreview,false);assert.equal(syncs,1);state.seekBedFrame(125);assert.equal(bv.currentTime,5);assert.equal(pauses,2);
});

test('clip reconnection cannot change the saved caption selection or deselected focus',()=>{
 const state={restoring:true,project:{editFocus:'none',captionSequence:{clipIds:['c1','c2'],activeId:'c2'}},selectedClip:'c2',editMode:'view',pause(){},renderClips(){},paintFocus(){},layers:{selected:'c2',update(){}}};vm.createContext(state);vm.runInContext(declaration(cap,'selectClip'),state);state.selectClip('c1');assert.equal(state.project.captionSequence.activeId,'c2');assert.equal(state.project.editFocus,'none');state.restoring=false;state.selectClip('c1');assert.equal(state.project.captionSequence.activeId,'c1');assert.equal(state.project.editFocus,'overlay');
});

