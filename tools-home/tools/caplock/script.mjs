import {uid} from './core.mjs?v=2';
export function words(c){
 const text=c.text.trim().split(/\s+/).filter(Boolean);
 if(c.words?.map(w=>w.text).join(' ')===text.join(' '))return c.words;
 const remaining=[...(c.words||[])];c.words=text.map(text=>{const i=remaining.findIndex(w=>w.text===text);return i<0?{id:uid(),text,effect:''}:remaining.splice(i,1)[0];});return c.words;
}
export function updateText(c){c.text=c.words.map(w=>w.text).join(' ');c.timingReview=c.inFrame!==null;}
export function moveWords(c,target,ids,placement='end'){if(c===target)return;const chosen=words(c).filter(w=>ids.includes(w.id));words(target);c.words=c.words.filter(w=>!ids.includes(w.id));if(placement==='start')target.words.unshift(...chosen);else target.words.push(...chosen);updateText(c);updateText(target);}
export function shiftWords(c,ids,delta){const a=words(c);if(delta<0){for(let i=1;i<a.length;i++)if(ids.includes(a[i].id)&&!ids.includes(a[i-1].id))[a[i-1],a[i]]=[a[i],a[i-1]];}else{for(let i=a.length-2;i>=0;i--)if(ids.includes(a[i].id)&&!ids.includes(a[i+1].id))[a[i],a[i+1]]=[a[i+1],a[i]];}updateText(c);}
export function geminiPrompt(p,c){
 const inherited=c.useProtocol!==false;return ['CapLock animation brief — '+c.id,'Exact spoken phrase: '+c.text,'Generate an animation clip of this phrase. Transparent background with real alpha; no background plate. Preserve spelling and punctuation. Keep text within the agreed portrait safe area. Do not alter the source video or soundtrack.',inherited?'Project visual protocol ('+(p.protocol?.approved?'approved':'draft')+'):\n'+(p.protocol?.text||'First look: establish the visual treatment for review.'):'Independent visual treatment for this segment. Do not inherit the project visual protocol.', 'Segment direction:\n'+(c.direction||'Use the visual protocol above.'),'Word treatments:\n'+words(c).filter(w=>w.effect).map(w=>w.text+': '+w.effect).join('\n'),c.inFrame!==null&&c.outFrame!==null?'Placement: F'+c.inFrame+'–'+c.outFrame+' on a25fps production timeline. Duration '+((c.outFrame-c.inFrame)/25).toFixed(3)+' seconds.':'Timing is not aligned yet. Do not invent word timestamps.','Deliver the transparent animation separately, ready for placement over the completed video in CapLock. If the generation tool cannot produce alpha, report that limitation; do not label a black/green background transparent.'].join('\n\n');
}
