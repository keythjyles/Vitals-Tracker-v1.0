// One source-time mapping for live playback, chunked video export and WAV export.
export const clipRate = item => Number.isFinite(item.rate)&&item.rate>=.1&&item.rate<=8 ? item.rate : 1;
export function sourceOut(item, duration) {
 return Math.min(duration,Number.isFinite(item.sourceEnd)?item.sourceEnd:duration);
}
export function audioClipWindow(item, buffer, at=0, end=Infinity, sampleRate=48000) {
 const sample=n=>Math.round(n*sampleRate),rate=clipRate(item);
 const offset=sample(item.offset),sourceEnd=sample(sourceOut(item,buffer.duration)),region=sourceEnd-offset;
 if(region<=0)return null;
 const start=sample(item.start),length=Math.min(sample(item.duration),item.loop?Infinity:Math.round(region/rate),Number.isFinite(end)?sample(end)-start:Infinity);
 const elapsed=Math.max(0,sample(at)-start);
 if(length<=elapsed||item.volume<=0)return null;
 const travelled=Math.round(elapsed*rate);
 return {when:Math.max(0,start-sample(at))/sampleRate,
  offset:(offset+(item.loop?travelled%region:travelled))/sampleRate,
  remaining:(length-elapsed)/sampleRate,loopStart:offset/sampleRate,loopEnd:sourceEnd/sampleRate,rate};
}
export function fittedAudioRate(sourceSpan, timelineSpan) {
 const rate=sourceSpan/timelineSpan;
 if(!Number.isFinite(rate)||rate<.1||rate>8)throw Error('Choose an OUT that fits the selected source at 0.1× to 8×.');
 return rate;
}
