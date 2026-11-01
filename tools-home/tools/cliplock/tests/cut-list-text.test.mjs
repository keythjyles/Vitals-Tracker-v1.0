import test from 'node:test';
import assert from 'node:assert/strict';
import {cutListText} from '../cut-list-text.mjs';
test('copy includes every queued cut, source identity, names, exclusive bounds and timestamp without editing the list',()=>{
 const cuts=Array.from({length:7},(_,i)=>({name:i===0?'Slide test 2':i===1?'unused automatic name':String(i+1),autoName:i===1,inFrame:23+i*100,outFrame:100+i*100})),before=structuredClone(cuts);
 const text=cutListText({source:{name:'EP4 original.mp4',sha256:'abc123'},totalFrames:1667,cuts,copiedAt:'2026-11-02T00:20:00.000Z',timeZone:'America/Chicago'});
 assert.match(text,/Source file: EP4 original\.mp4/);assert.match(text,/Source SHA-256: abc123/);assert.match(text,/Source frames: 1667/);assert.match(text,/Copied: 2026-11-02T00:20:00.000Z/);assert.match(text,/America\/Chicago/);assert.match(text,/IN inclusive; OUT exclusive/);
 const rows=text.split('\n').filter(x=>/^\d+\t/.test(x));assert.equal(rows.length,7);assert.equal(rows[0],'1\tSlide test 2\t23\t100\t77');assert.equal(rows[1],'2\t2\t123\t200\t77');assert.equal(rows.at(-1),'7\t7\t623\t700\t77');assert.deepEqual(cuts,before);
});
