import assert from 'node:assert/strict';
import test from 'node:test';
import {mixCurve, mixLevelAt, normalizeMixCues, scheduleMixGain} from './mix-cues.mjs';

test('only a matching channel at the same position is replaced', () => {
 const cues = normalizeMixCues([
  {id:'both',start:4,transition:.4,bed:30,effects:80},
  {id:'bed',start:4,transition:0,bed:20},
  {id:'invalid',start:6,bed:150},
 ]);
 assert.deepEqual(cues, [
  {id:'both',start:4,transition:.4,effects:80},
  {id:'bed',start:4,transition:0,bed:20},
 ]);
});

test('mix cues hold their target and interrupt a ramp at its current level', () => {
 const cues = normalizeMixCues([
  {id:'a',start:4,transition:4,bed:100},
  {id:'b',start:6,transition:2,bed:0,effects:100},
 ]);
 const bed = mixCurve(cues,'bed',0), effects = mixCurve(cues,'effects',.5);
 assert.deepEqual([3,4,5,6,7,8,10].map(t => mixLevelAt(bed,t)),[0,0,.25,.5,.25,0,0]);
 assert.deepEqual([3,6,7,8,10].map(t => mixLevelAt(effects,t)),[.5,.5,.75,1,1]);
 const events = [];
 const gain = {
  setValueAtTime:(level,time)=>events.push(['set',level,time]),
  linearRampToValueAtTime:(level,time)=>events.push(['ramp',level,time]),
 };
 scheduleMixGain(gain,bed,5,7);
 assert.deepEqual(events,[['set',.25,0],['ramp',.5,1],['set',.5,1],['ramp',.25,2]]);
});
