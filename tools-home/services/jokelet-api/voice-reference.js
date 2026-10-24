// Read-only parity audit for one already-approved, public production reference.
export async function approvedVoiceReference(key, fetcher=fetch) {
 const id='pqILh6dY0D1CO7Ckhplb';
 const read=async path=>{
  const r=await fetcher('https://api.elevenlabs.io'+path,{headers:{'xi-api-key':key,accept:'application/json'},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error('reference_lookup_http_'+r.status);
  return r.json();
 };
 const [history,models]=await Promise.all([read('/v1/history/'+id),read('/v1/models')]);
 if(history.history_item_id!==id || history.voice_id!=='RBNpu6jPzAoaxZKl9noJ')throw new Error('approved_reference_identity_mismatch');
 const allowed=['stability','similarity_boost','style','speed','use_speaker_boost'];
 return {schema:'GS-ApprovedVoiceReference-1',paidRequests:0,
  history:{historyItemId:id,voiceId:history.voice_id,modelId:history.model_id??null,text:history.text??null,source:history.source??null,
   outputFormat:history.output_format??null,settings:Object.fromEntries(Object.entries(history.settings||{}).filter(([k])=>allowed.includes(k)))},
  models:models.filter(m=>[history.model_id,'eleven_v4','eleven_v3'].includes(m.model_id)).map(m=>({modelId:m.model_id,name:m.name,canDoTextToSpeech:m.can_do_text_to_speech,costFactor:m.token_cost_factor}))};
}
