import {Input,ALL_FORMATS,BlobSource,EncodedPacketSink} from '../sxlock/vendor/mediabunny-1.62.1-gs1.mjs';
import {DEFAULT_CHROMA,detectBackground} from './background.mjs?v=23';
import {packetDuration} from './toolbox-core.mjs?v=23';
import {mediaContainer,mediaType} from '../../shared/production-stages.mjs?v=22';
export async function inspectToolboxFile(blob,name){
 if(/\.(png|webp|jpe?g)$/i.test(name)||blob.type.startsWith('image/')){
  const image=await createImageBitmap(blob);try{return {type:'image',frames:1,duration:2,chroma:detectBackground(image)||{...DEFAULT_CHROMA,enabled:false}};}finally{image.close();}
 }
 const input=new Input({formats:ALL_FORMATS,source:new BlobSource(blob)});let video,url;
 try{
  const track=await input.getPrimaryVideoTrack();if(!track)throw Error('Choose an animation video or image: '+name);
  const times=[];let end=0;for await(const p of new EncodedPacketSink(track).packets(undefined,undefined,{metadataOnly:true})){times.push(p.timestamp);end=Math.max(end,p.timestamp+p.duration);}times.sort((a,b)=>a-b);if(!times.length)throw Error('No video frames: '+name);
  const type=mediaType(mediaContainer(await blob.slice(0,12).arrayBuffer()));url=URL.createObjectURL(blob.slice(0,blob.size,type));video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Could not read '+name+'. Try selecting this local file again.')),20000);video.onloadeddata=()=>{clearTimeout(timer);resolve();};video.onerror=()=>{clearTimeout(timer);reject(Error('Cannot decode '+name));};video.src=url;});
  return {type:'video',frames:times.length,duration:packetDuration(times,end),chroma:detectBackground(video)||{...DEFAULT_CHROMA,enabled:false}};
 }finally{if(video){video.pause();video.removeAttribute('src');video.load();}if(url)URL.revokeObjectURL(url);input.dispose();}
}
