// Shared performance recipe primitives; no credentials or provider calls.
export const FPS = 25;
export const SAMPLE_RATE = 48000;
export const CUES = {
  'Context and emotion': ['joking','deadpan','sarcastic','mischievously','curious','surprised','excited','serious'],
  'Delivery': ['whispers'],
  'Expressive pauses (duration varies)': ['short pause','long pause'],
  'Nonverbal sounds (test before reuse)': ['sighs','chuckles','hmm','quiet breath','thoughtful exhale']
};
export function cueText(raw) {
  const text = raw.replace(/[\[\]\r\n]/g,' ').trim();
  if (!text || text.length > 120) throw Error('Enter a cue of 1–120 characters.');
  return '[' + text + '] ';
}
export function silenceMarker(seconds) {
  const frames = Math.round(Number(seconds) * FPS);
  if (!Number.isFinite(frames) || frames < 1 || frames > 250) throw Error('Choose a silence between 1 frame and 10 seconds.');
  return `[[silence:${frames}f]]`;
}
export function planScript(script) {
  if (!script.trim() || script.length > 1000) throw Error('Enter a script of 1–1000 characters.');
  const parts = []; let end = 0;
  const pattern = /\[\[silence:(\d+)f\]\]/g;
  const speech = text => { if (text.trim()) parts.push({type:'speech',text:text.trim()}); };
  for (const m of script.matchAll(pattern)) {
    speech(script.slice(end,m.index));
    const frames = Number(m[1]);
    if (frames < 1 || frames > 250) throw Error('Silence must be 1–250 frames.');
    parts.push({type:'silence',frames,seconds:frames/FPS}); end=m.index+m[0].length;
  }
  speech(script.slice(end));
  if (parts.some(p=>p.type==='speech' && /\[\[|\]\]/.test(p.text))) throw Error('Malformed engine marker; use [[silence:25f]].');
  const requests = parts.filter(p=>p.type==='speech').length;
  if (!requests || requests > 3) throw Error('Use 1–3 speech segments per take. Each segment is a paid request.');
  return {schema:'GS-PerformancePlan-1',fps:FPS,sampleRate:SAMPLE_RATE,parts,requests};
}
// Input speech channels must already be decoded/resampled at the plan sample rate.
export function assemblePcm(plan, speech) {
  let index=0; const timeline=[];
  const arrays=plan.parts.map(part=>{
    const samples=part.type==='silence' ? new Float32Array(part.frames*SAMPLE_RATE/FPS) : speech[index++];
    if (!(samples instanceof Float32Array)) throw Error('Missing decoded speech segment.');
    timeline.push({...part,startSample:timeline.reduce((n,p)=>n+p.samples,0),samples:samples.length});
    return samples;
  });
  const output=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));
  let offset=0; for(const a of arrays){output.set(a,offset);offset+=a.length;}
  return {samples:output,timeline};
}
export function encodeWav(samples) {
  const buffer=new ArrayBuffer(44+samples.length*2),v=new DataView(buffer);
  const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,36+samples.length*2,true);str(8,'WAVE');str(12,'fmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,SAMPLE_RATE,true);
  v.setUint32(28,SAMPLE_RATE*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){const s=Math.max(-1,Math.min(1,samples[i]));v.setInt16(44+i*2,Math.round(s*(s<0?32768:32767)),true);}
  return buffer;
}
