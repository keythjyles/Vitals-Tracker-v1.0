import {BackgroundSurface} from './background.mjs?v=23';
import {Input,ALL_FORMATS,BlobSource} from '../sxlock/vendor/mediabunny-1.62.1-gs1.mjs';
import {exportVideo} from '../sxlock/export-engine.mjs?v=27';
import {validateProject} from './core.mjs?v=23';
import {mediaContainer,mediaType} from '../../shared/production-stages.mjs?v=22';
import {clipTime} from './clip-time.mjs?v=22';
import {captionRecipe} from '../../shared/production-stages.mjs?v=22';

export async function renderCaptioned({project,bed,readAsset,cancelled,onProgress,onPhase}){
 const p=validateProject(project),recipe=captionRecipe(p),opened=[],audio=[],images=[],videos=[],check=()=>{if(cancelled?.())throw Error('Export cancelled. Editable placements are retained.');};
 const source=new Input({source:new BlobSource(bed),formats:ALL_FORMATS});opened.push(source);
 let audioContext;
 try{
  const track=await source.getPrimaryVideoTrack();if(!track)throw Error('Load the joke video first.');
  const width=Math.max(2,Math.round((await track.getDisplayWidth())/2)*2),height=Math.max(2,Math.round(width*16/9/2)*2),visual=[];
  for(const c of p.clips){
   if(!c.visible||c.captionNumber&&!c.placed)continue;check();const blob=await readAsset(c.ref,c);
   if(c.type==='image'){const image=await createImageBitmap(blob);images.push(image);visual.push({c,image,width:image.width,height:image.height,duration:Infinity});continue;}
   if(c.type==='audio'){if(c.volume===0)continue;audioContext||=new AudioContext();const buffer=await audioContext.decodeAudioData(await blob.arrayBuffer());audio.push({c,buffer});continue;}
   const input=new Input({source:new BlobSource(blob),formats:ALL_FORMATS});opened.push(input);const v=await input.getPrimaryVideoTrack();if(!v)throw Error('Animation has no video: '+c.name);
   const el=document.createElement('video'),url=URL.createObjectURL(new Blob([blob],{type:mediaType(mediaContainer(await blob.slice(0,12).arrayBuffer()))}));el.muted=true;el.playsInline=true;el.preload='auto';videos.push({el,url});await new Promise((ok,no)=>{el.onloadeddata=ok;el.onerror=()=>no(Error('Animation cannot decode: '+c.name));el.src=url;});visual.push({c,el,width:await v.getDisplayWidth(),height:await v.getDisplayHeight(),duration:await v.computeDuration()});
  }
  const result=await exportVideo({file:bed,fps:25,size:'original',format:'mp4',soundtrackGain:1,cancelled,onProgress,onPhase,hasEffects:audio.length>0,
   placeEffects:async(ctx,at,end)=>{for(const {c,buffer}of audio){const start=Math.max(at,c.inFrame/25),stop=Math.min(end,c.outFrame/25),time=clipTime(c,start*25,buffer.duration);if(stop<=start||!time.shown)continue;const node=ctx.createBufferSource(),gain=ctx.createGain();node.buffer=buffer;node.playbackRate.value=time.rate;gain.gain.value=c.volume;node.loop=c.loop;node.loopStart=c.trimInFrame/25;node.loopEnd=time.end;node.connect(gain).connect(ctx.destination);node.start(start-at,time.target);node.stop(Math.min(stop-start,c.loop?Infinity:(time.end-time.target)/time.rate)+start-at);}},
   visual:{width,height,draw:async(canvas,bedSample,timestamp)=>{
    check();const ctx=canvas.getContext('2d',{alpha:false,colorSpace:'srgb'});ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);
    const b=p.bedTransform,scale=Math.min(width/bedSample.displayWidth,height/bedSample.displayHeight)*b.scale,w=bedSample.displayWidth*scale,h=bedSample.displayHeight*scale;
    bedSample.draw(ctx,b.x/100*width-w/2,b.y/100*height-h/2,w,h);
    for(const item of visual){const {c}=item,frame=Math.round(timestamp*25),time=clipTime(c,frame,item.duration);if(c.type==='image'?frame<c.inFrame||frame>=c.outFrame:!time.shown)continue;check();
     if(item.el){const target=Math.max(0,Math.min(item.duration-.00001,time.target+.000001));if(Math.abs(item.el.currentTime-target)>.0000005){await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('Animation seek timed out: '+c.name)),15000);item.el.onseeked=()=>{clearTimeout(timer);ok();};item.el.onerror=()=>{clearTimeout(timer);no(Error('Animation frame unavailable: '+c.name));};item.el.currentTime=target;});}if(item.el.readyState<2)throw Error('Animation frame is not decoded: '+c.name);}const w=width*c.width/100,h=w*item.height/item.width;ctx.save();ctx.translate(c.x/100*width,c.y/100*height);ctx.rotate(c.rotation*Math.PI/180);ctx.globalAlpha=c.opacity;const source=item.el||item.image;if(c.chroma?.enabled)item.surface||=new BackgroundSurface();ctx.drawImage(c.chroma?.enabled?item.surface.draw(source,c.chroma):source,-w/2,-h/2,w,h);ctx.restore();
    }
   }}
  });
  return {...result,recipe};
 }finally{for(const {el,url}of videos){el.pause();el.removeAttribute('src');el.load();URL.revokeObjectURL(url);}for(const input of opened)input.dispose();for(const image of images)image.close();await audioContext?.close();}
}
