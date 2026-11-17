import assert from 'node:assert/strict';
import test from 'node:test';
import {fadeGainAt, savedFades, scheduleClipGain} from '../clip-audio.mjs';

test('clip fades use the placement edges and the lower ramp during overlap', () => {
 const clip = {volume:.8, fadeIn:5, fadeOut:2};
 assert.equal(fadeGainAt(clip,10,12,10),0);
 assert.equal(fadeGainAt(clip,10,12,10.5),.25);
 assert.equal(fadeGainAt(clip,10,12,11),.5);
 assert.equal(fadeGainAt(clip,10,12,11.5),.25);
 assert.equal(fadeGainAt(clip,10,12,12),0);
 assert.deepEqual(savedFades({fadeIn:0,fadeOut:Infinity}),{});
});

test('each offline block begins at the level of the same fade', () => {
 const events = [];
 const gain = {
  setValueAtTime: (...args) => events.push(['set',...args]),
  linearRampToValueAtTime: (...args) => events.push(['ramp',...args]),
 };
 scheduleClipGain(gain,{volume:1,fadeIn:4,fadeOut:4},4,16,7,14,1);
 assert.deepEqual(events,[['set',.75,1],['ramp',1,2],['ramp',1,6],['ramp',.5,8]]);
});
