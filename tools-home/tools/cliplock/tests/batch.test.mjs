import test from 'node:test';import assert from 'node:assert/strict';
import {addOrUpdate,toBatchRanges,nextMarks} from '../batch.mjs';
const meta={times:Array.from({length:240},(_,i)=>i/24),end:10};
test('OUT seeds adjustable next IN without mutating saved overlaps',()=>{
 let cuts=addOrUpdate([],{inFrame:0,outFrame:24},{name:'1'});const first=structuredClone(cuts[0]);
 assert.deepEqual(nextMarks(24,240),{inFrame:24,outFrame:240});
 cuts=addOrUpdate(cuts,{inFrame:20,outFrame:48},{name:'question'});assert.deepEqual(cuts[0],first);
 cuts=addOrUpdate(cuts,{inFrame:18,outFrame:50},{id:cuts[1].id,name:'question'});assert.deepEqual(cuts[0],first);assert.equal(cuts.length,2);
 const ranges=toBatchRanges(meta,cuts);assert.equal(ranges[1].sourceStart,18/24);assert.equal(ranges[0].outFrame,25);assert.equal(ranges[1].name,'question.webm');
});
test('gaps and reverse revisits are independent; invalid/duplicate names rejected',()=>{
 const cuts=[{inFrame:50,outFrame:70,name:'later'},{inFrame:2,outFrame:10,name:'earlier'}];assert.equal(toBatchRanges(meta,cuts)[1].sourceStart,2/24);
 assert.throws(()=>toBatchRanges(meta,[...cuts,{inFrame:3,outFrame:9,name:'LATER'}]),/different name/);
 assert.throws(()=>toBatchRanges(meta,[{inFrame:9,outFrame:9}]),/IN before OUT/);
});
