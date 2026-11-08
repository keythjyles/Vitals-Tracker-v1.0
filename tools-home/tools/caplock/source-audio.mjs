import {Input,ALL_FORMATS,BlobSource,AudioBufferSink} from '../sxlock/vendor/mediabunny-1.62.1-gs1.mjs';
export function percentGain(value){const n=Number(value);if(!Number.isFinite(n)||n<0||n>100)throw Error('Clip audio must be 0–100%.');return n/100;}
// Preserve decoded audio PTS, gaps and priming, as the existing bed mixer does.
export async function readSourceAudio(track,check=()=>{},range){
 const start=range?.start??0,end=range?.end??await track.computeDuration();
 const sampleRate=await track.getSampleRate(),channels=await track.getNumberOfChannels(),length=Math.ceil((end-start)*sampleRate);
 if(!length)return null;if(channels>2)throw Error('Use a mono or stereo clip for this sound.');
 if(length*channels*4>96*1024*1024)throw Error('This sound exceeds the phone mixing limit. Use a shorter clip.');
 const buffer=new AudioBuffer({length,numberOfChannels:channels,sampleRate});
 for await(const item of new AudioBufferSink(track).buffers(range?.start,range?.end)){
  check();if(item.buffer.sampleRate!==sampleRate)throw Error('Clip audio changes sample rate.');
  const position=Math.round((item.timestamp-start)*sampleRate),from=Math.max(0,-position),to=Math.max(0,position),count=Math.min(item.buffer.length-from,length-to);
  if(count>0)for(let c=0;c<channels;c++)buffer.getChannelData(c).set(item.buffer.getChannelData(c).subarray(from,from+count),to);
 }
 return buffer;
}
export function audioSignal(buffer){let peak=0,first=Infinity;for(let c=0;c<buffer.numberOfChannels;c++){const data=buffer.getChannelData(c);for(let i=0;i<data.length;i++){const value=Math.abs(data[i]);peak=Math.max(peak,value);if(value>.003&&i/buffer.sampleRate<first)first=i/buffer.sampleRate;}}return{peak,firstSound:Number.isFinite(first)?first:null,silent:peak<.00001};}
export async function inspectSourceAudio(blob){const input=new Input({formats:ALL_FORMATS,source:new BlobSource(blob)});try{const track=await input.getPrimaryAudioTrack();if(!track)return{hasAudio:false};const buffer=await readSourceAudio(track);return{hasAudio:true,...(buffer?audioSignal(buffer):{peak:0,firstSound:null,silent:true})};}finally{input.dispose();}}
