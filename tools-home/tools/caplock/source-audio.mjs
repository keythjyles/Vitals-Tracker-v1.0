import {AudioBufferSink} from '../sxlock/vendor/mediabunny-1.62.1-gs1.mjs';
export function percentGain(value){const n=Number(value);if(!Number.isFinite(n)||n<0||n>100)throw Error('Clip audio must be 0–100%.');return n/100;}
// Preserve decoded audio PTS, gaps and priming, as the existing bed mixer does.
export async function readSourceAudio(track,check=()=>{}){
 const sampleRate=await track.getSampleRate(),channels=await track.getNumberOfChannels(),length=Math.ceil(await track.computeDuration()*sampleRate);
 if(!length)return null;if(channels>2)throw Error('Use a mono or stereo clip for this sound.');
 if(length*channels*4>96*1024*1024)throw Error('This sound exceeds the phone mixing limit. Use a shorter clip.');
 const buffer=new AudioBuffer({length,numberOfChannels:channels,sampleRate});
 for await(const item of new AudioBufferSink(track).buffers()){
  check();if(item.buffer.sampleRate!==sampleRate)throw Error('Clip audio changes sample rate.');
  const position=Math.round(item.timestamp*sampleRate),from=Math.max(0,-position),to=Math.max(0,position),count=Math.min(item.buffer.length-from,length-to);
  if(count>0)for(let c=0;c<channels;c++)buffer.getChannelData(c).set(item.buffer.getChannelData(c).subarray(from,from+count),to);
 }
 return buffer;
}
