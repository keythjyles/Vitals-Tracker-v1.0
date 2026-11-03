import test from 'node:test';
import assert from 'node:assert/strict';
import {compositionFrames,bedTime,TailClock} from '../composition-time.mjs';
import {audioSignal} from '../source-audio.mjs';

test('visible placed elements extend the bed to their exclusive OUT, including gaps and sound files',()=>{
 const goat={visible:true,inFrame:251,outFrame:523},p={clips:[goat]};
 assert.equal(compositionFrames(p,295),523);
 assert.equal(compositionFrames(p,295)/25,20.92);
 goat.visible=false;assert.equal(compositionFrames(p,295),295);
 goat.visible=true;goat.captionNumber=1;goat.placed=false;assert.equal(compositionFrames(p,295),295);
 goat.placed=true;assert.equal(compositionFrames(p,295),523);
 p.clips.push({visible:true,type:'audio',inFrame:600,outFrame:625});assert.equal(compositionFrames(p,295),625);
 p.clips=[];assert.equal(compositionFrames(p,295),295);
});
test('tail seeks hold the final bed picture while the independent timeline can pause and resume',()=>{
 assert.equal(bedTime(100,.4),.399998);
 assert.equal(bedTime(5,.4),.2);
 let now=1000;const clock=new TailClock(()=>now);clock.start(10);now+=400;assert.equal(clock.current(),20);
 clock.stop();assert.equal(clock.running,false);now+=1000;clock.start(20);now+=200;assert.equal(clock.current(),25);
});
test('audio inspection distinguishes silence and delayed stereo sound',()=>{
 const channels=[new Float32Array(100),new Float32Array(100)],buffer={numberOfChannels:2,sampleRate:100,getChannelData:n=>channels[n]};
 assert.deepEqual(audioSignal(buffer),{peak:0,firstSound:null,silent:true});
 channels[0][80]=.1;channels[1][60]=.2;const signal=audioSignal(buffer);
 assert.equal(signal.silent,false);assert.equal(signal.firstSound,.6);assert.ok(signal.peak>.19);
});
