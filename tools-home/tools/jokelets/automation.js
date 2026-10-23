// Eligibility for automated reuse is separate from human/editorial approval.
// Unknown legacy metadata deliberately fails closed; manual use remains available.
export function automationAssessment(item){
 const review=item.automationReview||{},type=item.kind||item.role||(item.family?'jokelet':'other'),reasons=[];
 if(!['jokelet','performance','audio','outro','reaction','broll','photo'].includes(type))reasons.push('Asset type requires review.');
 if(item.status!=='Approved')reasons.push('Content is not approved.');
 if(review.status!=='Allowed')reasons.push(review.status==='Blocked'?'Excluded from automation.':'Clean-source review required.');
 if(review.burnedCaptions)reasons.push('Burned captions.');
 if(review.ambient)reasons.push('Ambient sound already mixed in.');
 if(review.music)reasons.push('Music already mixed in.');
 if(review.soundEffects)reasons.push('Sound effects already mixed in.');
 if(['jokelet','performance','audio','outro'].includes(type)&&review.audio!=='voice-only')reasons.push('Voice-only audio has not been confirmed.');
 if(['reaction','broll'].includes(type)&&!['voice-only','silent'].includes(review.audio))reasons.push('Clean audio or silence has not been confirmed.');
 return {eligible:reasons.length===0,label:reasons.length?(review.status==='Blocked'?'Blocked':'Needs review'):'Eligible',reasons};
}
