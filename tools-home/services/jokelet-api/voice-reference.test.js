import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approvedVoiceReference} from './voice-reference.js';
test('reference audit is GET only, pinned and strips private history fields',async()=>{
 const calls=[];const r=await approvedVoiceReference('test-secret',async(url,options)=>{
  calls.push({url,options});return {ok:true,json:async()=>url.endsWith('/models')?[{model_id:'eleven_v4',can_do_text_to_speech:true,token_cost_factor:1},{model_id:'unrelated'}]:{history_item_id:'pqILh6dY0D1CO7Ckhplb',voice_id:'RBNpu6jPzAoaxZKl9noJ',model_id:'eleven_v4',text:'approved script',settings:{stability:0.5,private:'omit'},character_count_change_to:99999,output_format:'mp3_44100_192'}};
 });
 assert.equal(calls.length,2);assert.ok(calls.every(c=>!c.options.method));assert.equal(r.history.modelId,'eleven_v4');assert.equal(r.models.length,1);
 assert.ok(!JSON.stringify(r).includes('test-secret'));assert.ok(!JSON.stringify(r).includes('99999'));assert.ok(!JSON.stringify(r).includes('private'));
});
test('wrong voice or item and upstream failure stop without any generation',async()=>{
 for(const bad of [{ok:false,status:403},{ok:true,json:async()=>({history_item_id:'wrong',voice_id:'other'})}]){
  await assert.rejects(approvedVoiceReference('test',async url=>url.endsWith('/models')?{ok:true,json:async()=>[]}:bad));
 }
});
