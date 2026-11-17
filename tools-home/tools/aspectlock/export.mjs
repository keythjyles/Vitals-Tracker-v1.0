import {mixClipAudio, validClipGain} from '../../shared/clip-audio.mjs?v=1';
import {Input,ALL_FORMATS,BlobSource,CanvasSink} from '../sxlock/vendor/mediabunny-1.62.1-gs1.mjs';
import {exportVideo,inspectVideo} from '../sxlock/export-engine.mjs?v=caplock28';
import {readSourceAudio} from '../caplock/source-audio.mjs?v=36';
import {Composition,WIDTH,HEIGHT,FPS,placementAt} from './composition.mjs?v=36';

export async function renderAspect({bed, animation, scene, key, range, audio, onPhase, onProgress}) {
 const inputs = [];
 const track = async blob => {
  const input = new Input({source:new BlobSource(blob),formats:ALL_FORMATS});
  inputs.push(input);
  const video = await input.getPrimaryVideoTrack();
  if (!video) throw Error('The selected file has no readable picture.');
  return {input,video};
 };
 const painter = new Composition();
 let baseFrames, overlays, animationAudio;
 const volume = validClipGain(audio.volume) ? audio.volume : Number(audio.cartoonSfx === 'on');
 try {
  const {video:bedVideo} = await track(bed);
  const {end} = await inspectVideo(bedVideo);
  const total = Math.ceil((end - .000002) * FPS);
  if (animation) {
   const {input,video} = await track(animation);
   const duration = await video.computeDuration();
   range = {...range,trimOut:Math.min(range.trimOut,duration),outFrame:Math.min(range.outFrame,total)};
   const frames = function*() {
    for (let frame = range.inFrame; frame < range.outFrame; frame++) {
     const target = placementAt(frame / FPS, range);
     if (target) yield target.time + .0000001;
    }
   };
   overlays = new CanvasSink(video,{alpha:true,poolSize:1}).canvasesAtTimestamps(frames());
   if (volume > 0) {
    const sound = await input.getPrimaryAudioTrack();
    if (sound) {
     const {trimIn:start,trimOut:out} = range;
     const end = Math.min(out,await sound.computeDuration());
     if (end > start) animationAudio = await readSourceAudio(sound,undefined,{start,end});
    }
   }
  }
  const timestamps = function*() {
   for (let frame = 0; frame < total; frame++) yield Math.min(frame / FPS + .0000001,end - .000002);
  };
  baseFrames = new CanvasSink(bedVideo,{alpha:false,poolSize:1}).canvasesAtTimestamps(timestamps());
  return await exportVideo({
   file:bed, format:'webm', fps:FPS, soundtrackGain:Number(audio.source === 'on'), hasEffects:!!animationAudio,onPhase,onProgress,
   placeEffects(ctx,from,to) {
    if (!animationAudio) return;
    mixClipAudio(ctx,animationAudio,{
     start:range.inFrame/FPS, end:range.outFrame/FPS, rate:range.rate, volume,
    },from,to);
   },
   visual:{width:WIDTH,height:HEIGHT,durationFrames:total,independent:true,async draw(canvas,unused,timestamp) {
    const bed = (await baseFrames.next()).value?.canvas;
    if (!bed) throw Error('Missing bed picture at ' + timestamp.toFixed(3) + ' seconds.');
    let overlay = null;
    if (overlays && placementAt(timestamp,range)) {
     const source = (await overlays.next()).value?.canvas;
     if (!source) throw Error('Missing animation picture at ' + timestamp.toFixed(3) + ' seconds.');
     overlay = painter.overlayFrame(source,key,WIDTH);
    }
    const ctx = canvas.getContext('2d',{alpha:false,colorSpace:'srgb'});
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,WIDTH,HEIGHT);
    painter.draw(ctx,{...scene,bed,overlay});
   }},
  });
 } finally {
  await overlays?.return();
  await baseFrames?.return();
  for (const input of inputs) input.dispose();
 }
}
