import {Input,ALL_FORMATS,BlobSource,CanvasSink} from '../sxlock/vendor/mediabunny-1.62.1-gs1.mjs';
import {exportVideo,inspectVideo} from '../sxlock/export-engine.mjs?v=46';
import {readSourceAudio} from '../caplock/source-audio.mjs?v=36';
import {mixClipAudio} from '../../shared/clip-audio.mjs?v=3';
import {drawScene,stateAt} from './core.mjs?v=1';

export async function inspectSource(file) {
 const input=new Input({source:new BlobSource(file),formats:ALL_FORMATS});
 try{const track=await input.getPrimaryVideoTrack();if(!track)throw Error('This file has no readable video.');const timing=await inspectVideo(track);
  const color=await track.getColorSpace();if(['pq','hlg','smpte2084','arib-std-b67'].includes(color?.transfer))throw Error('Use an SDR source for this renderer. The HDR original is preserved.');
  return {width:await track.getDisplayWidth(),height:await track.getDisplayHeight(),duration:timing.end,frames:timing.count,nativeFps:timing.count/timing.end,hasAudio:!!await input.getPrimaryAudioTrack()};
 }finally{input.dispose();}
}
export async function renderCamera({file,project,format='mp4',onProgress,onPhase,cancelled=()=>false}) {
 if(!project.path.length)throw Error('Record a camera performance before rendering.');
 const input=new Input({source:new BlobSource(file),formats:ALL_FORMATS});let frames;
 const check=()=>{if(cancelled())throw Error('Render cancelled. Camera instructions are preserved.');};
 try{
  const video=await input.getPrimaryVideoTrack();if(!video)throw Error('Source video is unavailable.');
  const start=project.start,end=Math.min(project.source.duration,project.path.at(-1).t,project.start+project.settings.duration);
  const count=Math.ceil((end-start)*project.fps-1e-6);if(count<1)throw Error('Record at least one output frame.');
  const times=function*(){for(let i=0;i<count;i++)yield Math.min(start+i/project.fps+1e-7,end-1e-7);};
  frames=new CanvasSink(video,{alpha:true,poolSize:1}).canvasesAtTimestamps(times());
  const audio=await input.getPrimaryAudioTrack();let sound;
  if(audio&&project.audio.volume>0){onPhase?.('Preparing source audio');sound=await readSourceAudio(audio,check,{start,end:start+count/project.fps});}
  check();
  const result=await exportVideo({file:null,fps:project.fps,format,soundtrackGain:0,hasEffects:!!sound,cancelled,onProgress,onPhase,
   placeEffects(ctx,from,to){if(sound)mixClipAudio(ctx,sound,{start:0,end:count/project.fps,rate:1,...project.audio},from,to);},
   visual:{independent:true,width:project.stage.width,height:project.stage.height,durationFrames:count,
    async draw(canvas,unused,t){check();const frame=(await frames.next()).value;if(!frame?.canvas)throw Error('Missing source frame at '+(start+t).toFixed(3)+'s.');
     drawScene(canvas.getContext('2d',{alpha:false,colorSpace:'srgb'}),frame.canvas,project.stage,stateAt(project.path,start+t),canvas.width,canvas.height);
    }
   }
  });
  result.report.camlock={start,end:start+count/project.fps,coordinates:project.coordinates,samples:project.path.length,performanceSpeed:project.performanceSpeed,renderSpeed:1};return result;
 }finally{await frames?.return();input.dispose();}
}
