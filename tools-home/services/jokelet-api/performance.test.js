import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cueText,silenceMarker,planScript,assemblePcm,encodeWav} from './performance.js';
test('engine markers never enter submitted speech; invalid markers fail closed',()=>{
  const plan=planScript('Setup? [[silence:25f]] [deadpan] Punchline.');
  assert.equal(plan.requests,2);
  assert.deepEqual(plan.parts.filter(p=>p.type==='speech').map(p=>p.text),['Setup?','[deadpan] Punchline.']);
  for(const bad of ['x [[silence:0f]]','x [[silence:251f]]','x [[silence:1s]]','[[silence:25f]]','a[[silence:1f]]b[[silence:1f]]c[[silence:1f]]d'])assert.throws(()=>planScript(bad));
  assert.equal(silenceMarker(0.5),'[[silence:13f]]');
  assert.equal(silenceMarker(1.5),'[[silence:38f]]');
  assert.equal(cueText('[joking]\n'),'[joking] ');
});
test('PCM assembly preserves speech samples and inserts exactly 25 frames of zeros',()=>{
  const plan=planScript('Setup[[silence:25f]]Punchline');
  const {samples,timeline}=assemblePcm(plan,[new Float32Array([.5,-.5]),new Float32Array([.25])]);
  assert.equal(samples.length,48003);assert.equal(samples[0],.5);assert.equal(samples[1],-.5);
  assert.ok(samples.slice(2,48002).every(s=>s===0));assert.equal(samples[48002],.25);
  assert.equal(timeline[1].startSample,2);assert.equal(timeline[1].samples,48000);
  const wav=new DataView(encodeWav(samples));
  assert.equal(wav.getUint32(24,true),48000);assert.equal(wav.getUint16(22,true),1);assert.equal(wav.getUint16(34,true),16);
  assert.equal(wav.byteLength,44+48003*2);assert.equal(wav.getInt16(44,true),16384);assert.equal(wav.getInt16(48,true),0);
});
