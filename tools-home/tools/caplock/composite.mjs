import {BackgroundSurface} from './background.mjs?v=23';
import {Input,ALL_FORMATS,BlobSource,CanvasSink} from '../sxlock/vendor/mediabunny-1.62.1-gs1.mjs';
import {exportVideo,inspectVideo} from '../sxlock/export-engine.mjs?v=caplock28';
import {FPS,validateProject} from './core.mjs?v=28';
import {captionRecipe} from '../../shared/production-stages.mjs?v=28';
import {clipRange,clipTime,pictureTime} from './clip-time.mjs?v=28';
import {readSourceAudio} from './source-audio.mjs?v=28';
import {compositionFrames} from './composition-time.mjs?v=25';

export async function renderCaptioned({project,bed,readAsset,cancelled,onProgress,onPhase}){
 const p=validateProject(project),recipe=captionRecipe(p);
 const opened=[],audio=[],visual=[];
 const check=()=>{if(cancelled?.())throw Error('Export cancelled. Editable placements are retained.');};
 const open=blob=>{
  const input=new Input({source:new BlobSource(blob),formats:ALL_FORMATS});
  opened.push(input);
  return input;
 };

 try{
  let {width,height}=p.canvas||{},bedFrames=0,sourceFile=bed;
  if(!p.canvas){
   const track=await open(bed).getPrimaryVideoTrack();
   if(!track)throw Error('Load the joke video first.');
   width=Math.max(2,Math.round((await track.getDisplayWidth())/2)*2);
   height=Math.max(2,Math.round(width*16/9/2)*2);
   bedFrames=Math.ceil(((await inspectVideo(track,cancelled)).end-.000002)*FPS);
  }
  const durationFrames=compositionFrames(p,bedFrames);
  if(!durationFrames)throw Error('Place a visible layer before saving video.');
  for(const c of p.clips){
   if(!c.visible||c.captionNumber&&!c.placed||c.type==='audio'&&c.volume===0)continue;
   check();
   const blob=await readAsset(c.ref,c);
   if(c.type==='image'){
    const image=await createImageBitmap(blob);
    visual.push({c,image,width:image.width,height:image.height});
    continue;
   }
   const input=open(blob);
   if(c.volume>0){
    const track=await input.getPrimaryAudioTrack();
    if(track){
     const {start,end}=clipRange(c),audioEnd=await track.computeDuration();
     const fullSound=p.canvas&&!sourceFile&&c.type==='video'&&c.volume===1&&c.inFrame===0&&c.outFrame===durationFrames
      &&start===0&&!c.loop&&c.playbackRate===1&&audioEnd<=Math.min(end,durationFrames/FPS)+.000002;
     if(fullSound)sourceFile=blob;
     else{
      const buffer=await readSourceAudio(track,check,c.sourceTrim);
      if(buffer)audio.push({c,buffer,offset:c.sourceTrim?.start??0});
     }
    }
   }
   if(c.type==='audio')continue;
   const track=await input.getPrimaryVideoTrack();
   if(!track)throw Error('No video track: '+c.name);
   if(p.canvas&&['pq','hlg','smpte2084','arib-std-b67'].includes((await track.getColorSpace()).transfer)){
    throw Error('Use an SDR source for '+c.name+' to preserve its color in the composite.');
   }
   const duration=await track.computeDuration(),first=await track.getFirstTimestamp();
   const targets=function*(){
    for(let frame=c.inFrame;frame<durationFrames;frame++){
     const time=pictureTime(c,frame,duration);
     if(!time.shown){
      if(frame>=c.outFrame)break;
      continue;
     }
     if(time.target>=first-.000001)yield Math.min(time.target+.0000001,time.end-.0000001);
    }
   };
   const samples=new CanvasSink(track,{alpha:true,poolSize:1}).canvasesAtTimestamps(targets());
   visual.push({c,samples,duration,first,width:await track.getDisplayWidth(),height:await track.getDisplayHeight()});
  }

  const result=await exportVideo({
   file:sourceFile,fps:FPS,size:'original',format:'mp4',soundtrackGain:1,cancelled,onProgress,onPhase,
   hasEffects:audio.length>0,
   placeEffects:async(ctx,at,end)=>{
    for(const {c,buffer,offset} of audio){
     const start=Math.max(at,c.inFrame/FPS),stop=Math.min(end,c.outFrame/FPS);
     const time=clipTime(c,start*FPS,offset+buffer.duration);
     if(stop<=start||!time.shown)continue;
     const node=ctx.createBufferSource(),gain=ctx.createGain();
     node.buffer=buffer;
     node.playbackRate.value=time.rate;
     gain.gain.value=c.volume;
     node.loop=c.loop;
     node.loopStart=time.start-offset;
     node.loopEnd=time.end-offset;
     node.connect(gain).connect(ctx.destination);
     node.start(start-at,time.target-offset);
     const remaining=c.loop?Infinity:(time.end-time.target)/time.rate;
     node.stop(start-at+Math.min(stop-start,remaining));
    }
   },
   visual:{width,height,durationFrames,independent:!!p.canvas,draw:async(canvas,bedSample,timestamp)=>{
    check();
    const ctx=canvas.getContext('2d',{alpha:false,colorSpace:'srgb'});
    ctx.fillStyle='#000';
    ctx.fillRect(0,0,width,height);
    if(bedSample){
     const b=p.bedTransform,scale=Math.min(width/bedSample.displayWidth,height/bedSample.displayHeight)*b.scale;
     const w=bedSample.displayWidth*scale,h=bedSample.displayHeight*scale;
     bedSample.draw(ctx,b.x/100*width-w/2,b.y/100*height-h/2,w,h);
    }
    const frame=Math.round(timestamp*FPS);
    for(const item of visual){
     const {c}=item;
     let source=item.image;
     if(source){
      if(frame<c.inFrame||frame>=c.outFrame)continue;
     }else{
      const time=pictureTime(c,frame,item.duration);
      if(!time.shown||time.target<item.first-.000001)continue;
      check();
      source=(await item.samples.next()).value?.canvas;
      if(!source)throw Error('Frame unavailable in '+c.name+' at '+time.target.toFixed(3)+' s.');
     }
     const w=width*c.width/100,h=w*item.height/item.width;
     ctx.save();
     ctx.translate(c.x/100*width,c.y/100*height);
     ctx.rotate(c.rotation*Math.PI/180);
     ctx.scale(c.mirrorX?-1:1,c.flipY?-1:1);
     ctx.globalAlpha=c.opacity;
     if(c.chroma?.enabled){
      item.surface||=new BackgroundSurface();
      source=item.surface.draw(source,c.chroma);
     }
     ctx.drawImage(source,-w/2,-h/2,w,h);
     ctx.restore();
    }
   }}
  });
  return {...result,recipe};
 }finally{
  for(const item of visual){
   item.image?.close();
   await item.samples?.return();
  }
  for(const input of opened)input.dispose();
 }
}
