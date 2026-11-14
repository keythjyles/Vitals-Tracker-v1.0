import {Input,ALL_FORMATS,BlobSource,CanvasSink} from '../sxlock/vendor/mediabunny-1.62.1-gs1.mjs';
import {exportVideo,inspectVideo} from '../sxlock/export-engine.mjs?v=caplock28';
import {readSourceAudio} from '../caplock/source-audio.mjs?v=28';
import {Composition,WIDTH,HEIGHT,FPS,placementAt} from './composition.mjs?v=32';

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
   if (audio.cartoonSfx === 'on') {
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
    const start = Math.max(from,range.inFrame/FPS);
    const end = Math.min(to,range.outFrame/FPS,range.inFrame/FPS + animationAudio.duration/range.rate);
    if (end <= start) return;
    const node = ctx.createBufferSource();
    node.buffer = animationAudio;
    node.playbackRate.value = range.rate;
    node.connect(ctx.destination);
    node.start(start-from,(start-range.inFrame/FPS)*range.rate);
    node.stop(end-from);
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
