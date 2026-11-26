import test from 'node:test';
import assert from 'node:assert/strict';
import {audioClipWindow,fittedAudioRate,clipRate} from '../audio-insertion.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1/48000,a+' != '+b);
test('legacy one-shot mappings stay sample exact across an export chunk boundary',()=>{
 const c={start:1.12,offset:.23,duration:10,volume:65};
 const w=audioClipWindow(c,{duration:20},8,16);
 near(w.offset,7.11);near(w.remaining,3.12);assert.equal(w.rate,1);
});
test('speed maps source offsets through live playback and every offline chunk',()=>{
 const c={start:1,offset:2,sourceEnd:18,duration:8,rate:2,volume:65};
 const first=audioClipWindow(c,{duration:30},0,8),second=audioClipWindow(c,{duration:30},8,16);
 near(first.when,1);near(first.offset,2);near(first.remaining,7);near(second.offset,16);near(second.remaining,1);
 assert.equal(audioClipWindow(c,{duration:30},9,16),null);
});
test('trimmed source loop wraps its selected region at the saved item speed',()=>{
 const c={start:1,offset:2,sourceEnd:4,duration:20,rate:.5,volume:65,loop:true};
 const w=audioClipWindow(c,{duration:30},10,16);
 near(w.offset,2.5);near(w.remaining,6);assert.equal(w.loopStart,2);assert.equal(w.loopEnd,4);
});
test('fitting the selected source preserves the source range and rejects unsupported rates',()=>{
 assert.equal(fittedAudioRate(4,2),2);assert.equal(fittedAudioRate(2,4),.5);
 for(const span of [0,-1,.01,100])assert.throws(()=>fittedAudioRate(4,span));
 assert.equal(clipRate({}),1);assert.equal(clipRate({rate:0}),1);
});
