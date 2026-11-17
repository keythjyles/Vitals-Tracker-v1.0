import {addColorWheel} from '../../shared/color-wheel.mjs?v=1';
import {fitInsertionRate, mountInsertionSettings} from '../../shared/insertion-settings.mjs?v=1';
import {paintMatrix} from "../../shared/item-matrix.mjs?v=1";
import {beginVideoLoad,loadVideoSource,clearVideoSource} from "./media-source.mjs?v=33";
import {Composition,WIDTH,HEIGHT,FPS,lastFrame,frameAt,placementAt,fitRect} from "./composition.mjs?v=36";
import {setupPinnedSections} from "../../shared/pinned-sections.mjs?v=32";
import {clipName,setupToolbox} from "./toolbox.mjs?v=38";
import {formatFrameTime,writeFrameClock,frameStepControl} from "../../shared/frame-stamp.mjs?v=2";
import {DEFAULT_REPLACEMENT_COLOR,detectBackground} from "../caplock/background.mjs?v=33";
const RECIPE_VERSION = 'R33';
const keySourceModes = ['green','blue','custom','alpha'];
const backgroundButtons = {keep:'keyKeep',replace:'keyReplace',transparent:'keyTransparent'};
let lastKeySource = 'green', replaceBackground = false;
const API='https://gs-previewlock-api.onrender.com',key=localStorage.getItem('gs_previewlock_key')||'',Q=id=>document.getElementById(id),C=Q('output'),ctx=C.getContext('2d'),stage=Q('stage'),bv=Q('bv'),ov=Q('ov'),work=Q('workPicture'),wc=work.getContext('2d'),compositor=new Composition();
let pickerTarget='base', manualVideoSelection=false;function formatBytes(n){return n?(n/1048576).toFixed(1)+' MB':'Size unknown'}function renderLibrary(){const search=Q('assetSearch').value.trim().toLowerCase(),sort=Q('assetSort').value;let arr=items.filter(f=>f.name.toLowerCase().includes(search));arr.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='nameDesc'?b.name.localeCompare(a.name):sort==='size'?(b.size||b.file?.size||0)-(a.size||a.file?.size||0):sort==='old'?String(a.server_modified||a.client_modified||'').localeCompare(String(b.server_modified||b.client_modified||'')):String(b.server_modified||b.client_modified||'').localeCompare(String(a.server_modified||a.client_modified||'')));Q('assetCount').textContent=arr.length+' cloud videos';const box=Q('assetResults');box.replaceChildren();for(const f of arr){const pickValue=new URLSearchParams(location.search).get('studio')==='1'&&parent!==window?f.path_display:f.name;const card=document.createElement('div');card.className='assetCard'+(Q(pickerTarget).value===pickValue?' selected':'');const thumb=document.createElement('div');thumb.className='assetThumb';thumb.textContent='▶ Video preview';const title=document.createElement('div');title.className='assetName';title.textContent=f.name;const meta=document.createElement('div');meta.className='assetMeta';meta.textContent=[formatBytes(f.size||f.file?.size),f.server_modified||f.client_modified||''].filter(Boolean).join(' · ');const actions=document.createElement('div');actions.className='assetActions';const preview=document.createElement('button');preview.textContent='▶ Preview';preview.onclick=async()=>{preview.disabled=true;preview.textContent='Loading…';try{const p=await api('/api/playback?path='+encodeURIComponent(f.path_display));const video=document.createElement('video');video.className='assetPreview';video.controls=true;video.playsInline=true;video.preload='metadata';video.src=p.url;video.style.display='block';card.append(video);video.play().catch(()=>{});preview.textContent='▶ Play'}catch(e){preview.textContent='Preview failed';report(e.message)}finally{preview.disabled=false}};const choose=document.createElement('button');choose.textContent='Use this video';choose.onclick=async()=>{const id=pickerTarget;Q('assetDialog').close();await chooseCloudVideo(id,pickValue)};actions.append(preview,choose);card.append(thumb,title,meta,actions);box.append(card)}}function openLibrary(id) {
  pickerTarget = id;
  Q('libraryTitle').textContent = id === 'base' ? 'Choose bed video' : 'Choose animation overlay';
  Q('pickDeviceVideo').hidden = inStudio;
  Q('cloudVideoStatus').hidden = Boolean(key) || inStudio;
  Q('assetSearch').value = '';
  renderLibrary();
  Q('assetDialog').showModal();
  Q(inStudio ? 'assetSearch' : 'pickDeviceVideo').focus();
}
Q('pickBase').onclick=()=>openLibrary('base');Q('pickOverlay').onclick=()=>openLibrary('overlay');Q('closeLibrary').onclick=()=>Q('assetDialog').close();Q('assetSearch').oninput=renderLibrary;Q('assetSort').onchange=renderLibrary;let trimInFrame=0,trimOutFrame=null;
const trimInTime=()=>trimInFrame/FPS,trimOutTime=()=>Math.min(ov.duration||0,trimOutFrame===null?Infinity:trimOutFrame/FPS),trimLength=()=>Math.max(0,trimOutTime()-trimInTime());
let startFrame=0,endFrame=null,playbackRate=1,overlayActive=false,overlayAudible=false,overlayPreview=false;
let requestedBedFrame = null, paintedBedFrame = null;
let x=40,y=350,w=460,ratio=16/9,bx=0,by=0,bw=WIDTH,editMode='view',items=[],raf=0,canSample=true,rendering=false;
const localFiles = {}, localMedia = {};
const params=new URLSearchParams(location.search);
const inStudio = params.get('studio') === '1' && parent !== window;
const names=[params.get('base')||'GS_EP4_MINT_TRUCK_COMPOSITE_readyfornextpass.webm',params.get('overlay')||'HeyGen-Video-1793044979820.mp4'];let renderedBlob=null,renderedExt='mp4',renderedUrl=null;function fileName(){const stem=Q('outputName').value.trim().replace(/\.(mp4|webm)$/i,'').replace(/[\\/:*?"<>|]/g,'_')||'AspectLock_Render';return stem+'.'+renderedExt}
Q('downloadVideo').onclick=()=>{if(!renderedBlob)return;const a=document.createElement('a');a.href=renderedUrl;a.download=fileName();document.body.append(a);a.click();a.remove();report('Download requested: '+fileName()+'. Check your browser Downloads if no save dialog appears.')};
Q('shareVideo').onclick=async()=>{if(!renderedBlob)return;const f=new File([renderedBlob],fileName(),{type:renderedBlob.type});try{if(navigator.canShare?.({files:[f]})){await navigator.share({files:[f],title:fileName()})}else{Q('downloadVideo').click();Q('renderInfo').textContent='Sharing files is not supported by this browser; download instead.'}}catch(e){if(e.name!=='AbortError')Q('renderInfo').textContent='Share unavailable: '+e.message}};
function report(t){Q('status').textContent=t}
async function api(path){let r=await fetch(API+path,{headers:{Authorization:'Bearer '+key}});if(!r.ok)throw Error('Library request failed '+r.status);return r.json()}
function refreshLoadedVideo(video) {
 canSample = true;
 if (video === ov) {
  ratio = video.videoWidth / video.videoHeight || 16 / 9;
  trimInFrame = 0;
  trimOutFrame = null;
  endFrame = null;
  playbackRate = 1;
  ov.playbackRate = 1;
  Q('insertionError').textContent = '';
  showTiming();
 }
 update();
}
async function loadFile(name, video) {
 const file = items.find(item => item.path_display === name || item.name.toLowerCase() === name.toLowerCase());
 if (!file) throw new Error('Cloud video not found: ' + name);
 const signal = beginVideoLoad(video);
 Q('pause').click();
 overlayPreview = false;
 const playback = await api('/api/playback?path=' + encodeURIComponent(file.path_display));
 if (signal.aborted) return null;
 if (!await loadVideoSource(video, playback.url, file.name, signal)) return null;
 refreshLoadedVideo(video);
 return file;
}
function markVideoSelection(id, name, cloudValue, label = name) {
 const select = Q(id);
 select.querySelector('[data-device-video]')?.remove();
 if (cloudValue === undefined) {
  const option = new Option(label, name);
  option.dataset.deviceVideo = '';
  select.add(option);
  option.selected = true;
 } else {
  select.value = cloudValue;
 }
 const chosen = Q(id + 'Chosen');
 if (id === 'base') {
  // Scribe stays bound to the imported source name when its display label changes.
  if (cloudValue === undefined) chosen.dataset.expected = name;
  else delete chosen.dataset.expected;
  toolbox.renderBedName();
 }
 chosen.textContent = label;
 update();
}
function placeLoadedOverlay(at) {
 startFrame = at;
 ({x,y,width:w} = fitRect(ratio));
 const preset = keyModeFromUrl();
 if (preset) setKeySource(preset);
 else {
  let sample;
  try { sample = detectBackground(ov,{includeAlpha:true}); } catch {/* Keep the source if it cannot be sampled yet. */}
  applyBackgroundSample(sample);
 }
 replaceBackground = false;
 Q('keyBackground').value = 0;
 Q('keyReplacementColor').value = DEFAULT_REPLACEMENT_COLOR;
 syncOverlay();
 showTiming();
 update();
}
async function chooseCloudVideo(id, value) {
 if (rendering) { report('Wait for the render to finish.'); return; }
 manualVideoSelection = true;
 const at = bedFrame();
 report('Loading ' + value + '…');
 try {
  const file = await loadFile(value, id === 'base' ? bv : ov);
  if (!file) return;
  delete localFiles[id];
  delete localMedia[id];
  markVideoSelection(id, file.name, value);
  if (id === 'overlay') placeLoadedOverlay(at);
  report('Loaded ' + file.name);
 } catch (error) {
  report(error.message);
 }
}
async function loadLocalVideo(id, source, at = bedFrame()) {
 if (rendering) throw Error('Wait for the render to finish.');
 const {file, id: savedId} = source;
 const label = clipName(source);
 manualVideoSelection = true;
 Q('pause').click();
 overlayPreview = false;
 const video = id === 'base' ? bv : ov;
 const signal = beginVideoLoad(video);
 const url = URL.createObjectURL(file);
 let loaded = false;
 report('Loading ' + label + '…');
 try {
  loaded = await loadVideoSource(video, url, file.name, signal);
  if (!loaded) return false;
  delete localFiles[id];
  localMedia[id] = file;
  refreshLoadedVideo(video);
  markVideoSelection(id, file.name, undefined, label);
  if (id === 'overlay') placeLoadedOverlay(at);
  sound();
  const asset = savedId ? (await toolbox.get(savedId) ?? source) : await toolbox.add(file);
  if (video.getAttribute('src') === url) {
   localFiles[id] = asset.id;
   if (clipName(asset) !== label) markVideoSelection(id, file.name, undefined, clipName(asset));
   toolbox.render();
   report('Loaded from device: ' + clipName(asset));
  }
  return video.getAttribute('src') === url;
 } finally {
  if (!loaded) URL.revokeObjectURL(url);
 }
}
Q('pickDeviceVideo').onclick = () => Q('deviceVideo').click();
Q('deviceVideo').onchange = async event => {
 const file = event.currentTarget.files[0];
 event.currentTarget.value = '';
 if (!file) return;
 const id = pickerTarget;
 Q('assetDialog').close();
 try { await loadLocalVideo(id, {file}); }
 catch (error) { report(error.message); }
};

function positionRect(element, rect) {
 element.style.left = rect.x * displayScale + 'px';
 element.style.top = rect.y * displayScale + 'px';
 element.style.width = rect.width * displayScale + 'px';
 element.style.height = rect.height * displayScale + 'px';
}
function bedRect() {
 const fit = fitRect(bv.videoWidth / bv.videoHeight || WIDTH / HEIGHT);
 return {x: fit.x + bx, y: fit.y + by, width: fit.width * bw / WIDTH, height: fit.height * bw / WIDTH};
}
function overlayRect() {
 return {x, y, width: w, height: w / ratio};
}
function setKeySource(mode) {
 Q('keyMode').value = mode;
 if (keySourceModes.includes(mode)) lastKeySource = mode;
}
function applyBackgroundSample(sample) {
 if (sample) Q('keyColor').value = sample.color;
 setKeySource(sample ? (sample.sourceAlpha ? 'alpha' : 'custom') : 'off');
}
function keySettings() {
 const mode=Q('keyMode').value;
 const color=Q('keyReplacementColor').value;
 return {mode,enabled:mode!=='off',color:Q('keyColor').value,similarity:Number(Q('keyRange').value)/100,blend:Number(Q('keyEdge').value)/100,backgroundOpacity:Number(Q('keyBackground').value)/100,tolerance:Number(Q('tolerance').value),
  ...(mode==='off'?{sourceMode:lastKeySource}:{}),
  ...(replaceBackground||color!==DEFAULT_REPLACEMENT_COLOR?{replacement:{enabled:replaceBackground,color}}:{}),
 };
}
function spec() {
 return {
  tool: 'AspectLock', toolId: 'GS-TOOL-ASPECTLOCK', version: RECIPE_VERSION,
  base: Q('base').value, overlay: Q('overlay').value, canvas: {width: WIDTH, height: HEIGHT},
  ...(!localMedia.overlay && Q('overlayChosen').textContent ? {overlayLabel: Q('overlayChosen').textContent} : {}),
  portraitPerspective: {x: bx, y: by, width: bw, finalOutput: 'fixed 9:16 viewport'},
  overlayTransform: {...overlayRect(), aspectRatio: ratio},
  layerOrder: Q('order').value, blueRemoval: Q('keyMode').value, tolerance: Number(Q('tolerance').value),
  key: keySettings(), opacity: Number(Q('opacity').value) / 100,
  audio: {source: Q('baseAudio').value, cartoonSfx: Q('overlayAudio').value},
  startFrame, outFrame: endFrame, playbackRate, overlayTrim: {inFrame: trimInFrame, outFrame: trimOutFrame, frameRate: FPS},
  sourceMotion: 'unchanged',
 };
}
function update() {
 positionRect(Q('dragSurface'), overlayRect());
 positionRect(Q('bedEdge'), bedRect());
 positionRect(Q('baseEdit'), bedRect());
 const hasBed = bv.readyState >= 1, hasOverlay = ov.readyState >= 1;
 Q('bedEdge').hidden = !hasBed;
 Q('baseEdit').hidden = editMode !== 'base' || !hasBed;
 Q('dragSurface').style.visibility = editMode !== 'overlay' || !hasBed || !hasOverlay ? 'hidden' : 'visible';
 Q('dragSurface').style.pointerEvents = editMode === 'overlay' ? 'auto' : 'none';
 Q('railMove').disabled = !hasOverlay || !hasBed;
 Q('railMove').setAttribute('aria-pressed',String(editMode === 'overlay' && !viewMode));
 Q('editOverlay').setAttribute('aria-pressed', Q('railMove').getAttribute('aria-pressed'));
 for (const [id,value] of [['width',w],['x',x],['y',y]]) {
  Q(id).value = value;
  Q(id + 'Text').textContent = Math.round(value) + ' px';
 }
 Q('toleranceText').textContent = Q('tolerance').value;
 const mode = Q('keyMode').value;
 const treatment = mode==='off'?'keep':replaceBackground?'replace':'transparent';
 for (const [value,id] of Object.entries(backgroundButtons)) {
  Q(id).setAttribute('aria-pressed',String(treatment===value));
  Q(id).disabled = !hasOverlay;
 }
 Q('keyColorTools').hidden = mode === 'off';
 Q('keyReplacementRow').hidden = treatment !== 'replace';
 Q('keyReplacementColor').disabled = !hasOverlay || treatment !== 'replace';
 Q('keyMode').disabled = !hasOverlay;
 Q('presetTolerance').hidden = !['blue','green'].includes(mode);
 Q('keyColor').disabled = !hasOverlay;
 Q('keyRangeRow').hidden = Q('keyEdgeRow').hidden = mode !== 'custom';
 Q('keyOpacityControl').hidden = mode === 'alpha' && treatment !== 'replace';
 Q('keyBackground').disabled = !hasOverlay || Q('keyOpacityControl').hidden;
 Q('sampleKey').disabled = !hasOverlay;
 for (const [id,output,suffix] of [['opacity','opacityValue','%'],['keyRange','keyRangeValue','%'],['keyEdge','keyEdgeValue','%'],['keyBackground','keyBackgroundValue','%']]) Q(output).textContent = Q(id).value + suffix;
 for (const id of ['bedZero','backFrame','forwardFrame','back25','forward25','goFrame','jumpFrame','play','insertBack','insertForward']) Q(id).disabled = !hasBed;
 Q('goFrame').max = hasBed ? lastFrame(bv.duration) : 0;
 Q('timingControls').disabled = !hasOverlay || !hasBed || rendering;
 for (const id of ['insertionIn','insertionOut','insertionMarkIn','insertionMarkOut']) Q(id).disabled = Q('timingControls').disabled;
 Q('render').disabled = !hasBed || rendering;
 refreshAdded();
 Q('spec').textContent = JSON.stringify(spec(), null, 2);
 paintPlayback();
}

function sceneFor(bed = bv, animation = ov, active = overlayActive, maxWidth = WIDTH, painter = compositor) {
 const opacity = Number(Q('opacity').value) / 100;
 let overlay = null;
 try { if (active && opacity > 0) overlay = painter.overlayFrame(animation, keySettings(), maxWidth); }
 catch (error) {
  if (canSample) report('Background removal failed: ' + error.message);
  canSample = false;
  overlay = animation.readyState >= 2 ? animation : null;
 }
 return {bed, bedRect: bedRect(), overlay, overlayRect: overlayRect(), opacity, order: Q('order').value};
}

function outsideOutput({x, y, width, height}) {
 return x < 0 || y < 0 || x + width > WIDTH || y + height > HEIGHT;
}

function drawPicture() {
 if (stage.clientWidth < 1 || stage.clientHeight < 1) return false;
 const left = stage.clientWidth / 2 - WIDTH * displayScale / 2 + viewX;
 const top = stage.clientHeight / 2 - HEIGHT * displayScale / 2 + viewY;
 const scene = sceneFor();
 ctx.fillStyle = '#000';
 ctx.fillRect(0, 0, WIDTH, HEIGHT);
 compositor.draw(ctx, scene);
 const dpr = Math.min(2, devicePixelRatio || 1);
 const width = Math.max(1, Math.round(stage.clientWidth * dpr));
 const height = Math.max(1, Math.round(stage.clientHeight * dpr));
 if (work.width !== width || work.height !== height) {
  work.width = width;
  work.height = height;
 }
 wc.setTransform(dpr, 0, 0, dpr, 0, 0);
 wc.fillStyle = '#080d14';
 wc.fillRect(0, 0, stage.clientWidth, stage.clientHeight);
 if (Q('showOutside').checked && (outsideOutput(scene.bedRect) || (scene.overlay && outsideOutput(scene.overlayRect)))) {
  wc.save();
  wc.translate(left, top);
  wc.scale(displayScale, displayScale);
  compositor.draw(wc, scene);
  wc.restore();
  wc.fillStyle = 'rgba(5, 10, 17, .66)';
  wc.fillRect(0, 0, stage.clientWidth, stage.clientHeight);
 }
 wc.drawImage(C, left, top, WIDTH * displayScale, HEIGHT * displayScale);
 return true;
}

function bedFrame() { return paintedBedFrame ?? 0; }
function stepFrame() { return requestedBedFrame ?? bedFrame(); }
function timing() {
 const limit = bv.readyState >= 1 ? lastFrame(bv.duration) + 1 : Infinity;
 const naturalOut = startFrame + Math.max(1, Math.ceil(trimLength() * FPS / playbackRate - 1e-6));
 return {inFrame: startFrame, outFrame: Math.min(limit, endFrame ?? naturalOut), trimIn: trimInTime(), trimOut: trimOutTime(), rate: playbackRate};
}
function updateClock() {
 if (paintedBedFrame !== null) {
  const frame = bedFrame();
  let clock = Q('position');
  if (clock.dataset.frame !== String(frame)) writeFrameClock(clock, {frame, time: frame / FPS, fps: FPS});
  Q('insertionFrame').textContent = 'F' + frame;
  const insertion = 'Insert at F' + frame;
  if (Q('insertFrame').textContent !== insertion) Q('insertFrame').textContent = insertion;
  Q('bedProgress').value = bv.currentTime / bv.duration;
 }
 const pos = formatFrameTime(ov.currentTime || 0);
 if (Q('overlayPosition').textContent !== pos) Q('overlayPosition').textContent = pos;
 if (!Q('overlaySeek').matches(':active')) Q('overlaySeek').value = Math.round(1000 * ov.currentTime / (ov.duration || 1));
}
let lastDraw = -Infinity;
function draw(now = performance.now()) {
 raf = requestAnimationFrame(draw);
 if (now - lastDraw < 30 || document.hidden || (bv.paused && ov.paused)) return;
 lastDraw = now;
 paintPlayback();
}
function paintPlayback() {
 // A seek changes currentTime immediately. Keep the previous picture and its
 // clock together until the bed and any active animation have decoded.
 const hasBed = bv.readyState >= 2;
 if (bv.getAttribute('src') && (!hasBed || bv.seeking)) return;
 const frame = hasBed ? (bv.paused && requestedBedFrame !== null ? requestedBedFrame : frameAt(bv.currentTime, bv.duration)) : null;
 syncOverlay(bv.paused ? (frame ?? 0) / FPS : bv.currentTime);
 if (bv.paused && overlayActive && (ov.seeking || ov.readyState < 2)) return;
 if (!drawPicture()) return;
 paintedBedFrame = frame;
 requestedBedFrame = null;
 updateClock();
 paintAddedMatrix();
}
for (const video of [bv, ov]) {
 for (const event of ['loadeddata', 'seeked', 'pause', 'ended']) video.addEventListener(event, paintPlayback);
}
function sound() {
 bv.muted = Q('baseAudio').value !== 'on';
 ov.muted = Q('overlayAudio').value !== 'on' || !overlayAudible;
}
function syncOverlay(bedTime = bv.currentTime) {
 if (overlayPreview) {
  overlayActive = ov.readyState >= 1;
  overlayAudible = overlayActive;
  sound();
  return;
 }
 const position = bv.readyState >= 1 && ov.readyState >= 1 ? placementAt(bedTime, timing()) : null;
 overlayActive = !!position;
 overlayAudible = !!position?.audible;
 if (!position) {
  if (!ov.paused) ov.pause();
 } else {
  if (ov.playbackRate !== playbackRate) ov.playbackRate = playbackRate;
  const tolerance = bv.paused ? .000001 : .10;
  if (!ov.seeking && Math.abs(ov.currentTime - position.time) > tolerance) ov.currentTime = position.time;
  if (!bv.paused && position.audible && ov.paused) ov.play().catch(() => {});
  if ((bv.paused || !position.audible) && !ov.paused) ov.pause();
 }
 sound();
}

function showTiming() {
 const current = timing();
 Q('bedIn').value = ov.readyState >= 1 ? startFrame : '';
 Q('bedOut').value = ov.readyState >= 1 && Number.isFinite(current.outFrame) ? current.outFrame : '';
 Q('insertionIn').value = Q('bedIn').value;
 Q('insertionOut').value = Q('bedOut').value;
 Q('insertionSpan').textContent = Q('bedOut').value
  ? (current.outFrame - startFrame) + ' frames · ' + Number(playbackRate.toFixed(3)) + '× · OUT is the first clear frame'
  : '';
 Q('startInfo').textContent = ov.readyState >= 1
  ? 'F' + startFrame + ' to F' + current.outFrame + ' · OUT is the first clear frame · ' + playbackRate.toFixed(3) + '×'
  : 'Choose an animation to set its timing.';
 Q('trimInfo').textContent = ov.readyState >= 1
  ? 'Source ' + formatFrameTime(trimInTime()) + ' to ' + formatFrameTime(trimOutTime())
  : '';
}

function setTiming(inFrame, outFrame, rate = playbackRate) {
 const limit = lastFrame(bv.duration) + 1;
 if (![inFrame,outFrame].every(Number.isSafeInteger) || inFrame < 0 || outFrame <= inFrame || outFrame > limit) {
  throw Error('Enter IN and OUT frames within the bed. OUT must follow IN.');
 }
 Q('pause').click();
 startFrame = inFrame;
 endFrame = outFrame;
 playbackRate = rate;
 overlayPreview = false;
 Q('timingError').textContent = '';
 Q('insertionError').textContent = '';
 showTiming();
 syncOverlay();
 update();
}
function editTiming(action) {
 try { action(); }
 catch (error) { Q('timingError').textContent = error.message; }
}
function editInsertionTiming(edge, frame) {
 try {
  if (rendering) throw Error('Wait for the render to finish.');
  if (edge === 'in') {
   const current = timing();
   setTiming(frame, frame + current.outFrame - current.inFrame);
  } else {
   if (!Number.isSafeInteger(frame) || frame <= startFrame) throw Error('OUT must follow IN.');
   setTiming(startFrame, frame, fitInsertionRate(trimLength(), (frame - startFrame) / FPS));
  }
 } catch (error) {
  showTiming();
  Q('insertionError').textContent = error.message;
 }
}
for (const [edge, suffix] of [['in','In'],['out','Out']]) {
 Q('insertion' + suffix).onchange = event => editInsertionTiming(edge, event.target.valueAsNumber);
 Q('insertionMark' + suffix).onclick = () => editInsertionTiming(edge, bedFrame());
}
function enterTiming() {
 const inFrame = Q('bedIn').value === '' ? NaN : Number(Q('bedIn').value);
 const outFrame = Q('bedOut').value === '' ? NaN : Number(Q('bedOut').value);
 return [inFrame, outFrame];
}

function seekBedFrame(frame) {
 if (bv.readyState < 1) return;
 bv.pause();
 ov.pause();
 overlayPreview = false;
 requestedBedFrame = Math.max(0, Math.min(lastFrame(bv.duration), frame));
 const time = requestedBedFrame / FPS;
 if (Math.abs(bv.currentTime - time) > .000001) bv.currentTime = time;
 paintPlayback();
}
for (const [id,direction] of [['backFrame',-1],['forwardFrame',1],['sheetBack',-1],['sheetForward',1]]) {
 frameStepControl(Q(id),{getFrame:stepFrame,seek:seekBedFrame,direction});
}
Q('insertBack').onclick = () => seekBedFrame(stepFrame() - 1);
Q('insertForward').onclick = () => seekBedFrame(stepFrame() + 1);
Q('back25').onclick = () => seekBedFrame(stepFrame() - 25);
Q('forward25').onclick = () => seekBedFrame(stepFrame() + 25);
Q('bedZero').onclick = () => seekBedFrame(0);
Q('jumpFrame').onclick = () => {
 const frame = Number(Q('goFrame').value);
 if (Q('goFrame').value === '' || !Number.isSafeInteger(frame) || frame < 0 || frame > lastFrame(bv.duration)) {
  report('Enter a frame from 0 to ' + lastFrame(bv.duration) + '.');
  return;
 }
 seekBedFrame(frame);
};
Q('goFrame').onkeydown = event => { if (event.key === 'Enter') Q('jumpFrame').click(); };
Q('markStart').onclick = () => editTiming(() => {
 const current = timing(), from = bedFrame();
 setTiming(from, Math.min(lastFrame(bv.duration) + 1, from + Math.max(1, current.outFrame - startFrame)));
});
Q('markEnd').onclick = () => editTiming(() => setTiming(startFrame, bedFrame()));
Q('applyTiming').onclick = () => editTiming(() => setTiming(...enterTiming()));
Q('fitTiming').onclick = () => editTiming(() => {
 const [from, to] = enterTiming();
 const rate = trimLength() * FPS / (to - from);
 if (!(rate >= .1 && rate <= 8)) throw Error('Fit requires a speed between 0.1× and 8×.');
 setTiming(from, to, rate);
});
Q('clearStart').onclick = () => {
 startFrame = 0;
 endFrame = null;
 playbackRate = 1;
 Q('timingError').textContent = '';
 showTiming();
 seekBedFrame(0);
 update();
};
async function playPreview(video, name) {
 const source = video.getAttribute('src');
 try { await video.play(); }
 catch (error) {
  if (error.name !== 'AbortError' && video.getAttribute('src') === source) {
   report('Could not play the ' + name + '. ' + error.message);
  }
 }
}
Q('play').onclick = () => {
 if (rendering || bv.readyState < 1) return;
 toolbox.stopPreview();
 overlayPreview = false;
 return playPreview(bv, 'bed');
};
Q('pause').onclick = () => {
 if (!bv.paused && paintedBedFrame !== null) {
  seekBedFrame(paintedBedFrame);
  return;
 }
 bv.pause();
 ov.pause();
};
Q('editorScribe').addEventListener('toggle', () => { if (Q('editorScribe').open) Q('pause').click(); });
bv.addEventListener('pause', () => { if (!overlayPreview) ov.pause(); });
Q('playOverlay').onclick = () => {
 if (rendering || ov.readyState < 1) return;
 toolbox.stopPreview();
 Q('pause').click();
 overlayPreview = true;
 if (ov.currentTime < trimInTime() || ov.currentTime >= trimOutTime()) ov.currentTime = trimInTime();
 ov.playbackRate = 1;
 syncOverlay();
 return playPreview(ov, 'animation');
};
Q('pauseOverlay').onclick = () => { ov.pause(); };
Q('overlayZero').onclick = () => {
 Q('pause').click();
 if (ov.readyState < 1) return;
 overlayPreview = true;
 ov.currentTime = trimInTime();
 syncOverlay();
};
for (const id of ['trimIn','trimOut','trimClear']) Q(id).onclick = () => editTiming(() => {
 const frame = Math.round(ov.currentTime * FPS);
 if (id === 'trimIn' && frame / FPS >= trimOutTime()) throw Error('Source IN must precede OUT.');
 if (id === 'trimOut' && frame <= trimInFrame) throw Error('Source OUT must follow IN.');
 if (id !== 'trimOut') trimInFrame = id === 'trimClear' ? 0 : frame;
 if (id !== 'trimIn') trimOutFrame = id === 'trimClear' ? null : frame;
 showTiming();
 update();
});
Q('overlaySeek').oninput = () => {
 if (ov.readyState < 1) return;
 Q('pause').click();
 overlayPreview = true;
 ov.currentTime = Number(Q('overlaySeek').value) / 1000 * ov.duration;
 syncOverlay();
};
Q('fitOverlay').onclick = () => {
 if (ov.readyState < 1) return;
 const fit = fitRect(ratio);
 ({x,y,width:w} = fit);
 update();
};
Q('fitBed').onclick = () => { bx = 0; by = 0; bw = WIDTH; update(); };
Q('reset').onclick = () => { Q('fitBed').click(); Q('fitOverlay').click(); Q('order').value = 'overlay'; update(); };
for (const id of ['width','x','y']) Q(id).oninput = () => {
 const value = Number(Q(id).value);
 if (id === 'width') w = value;
 if (id === 'x') x = value;
 if (id === 'y') y = value;
 update();
};
for (const id of ['order','tolerance','baseAudio','overlayAudio','showOutside']) Q(id).onchange = () => { sound(); update(); };
Q('keyMode').onchange = () => { setKeySource(Q('keyMode').value); update(); };
for (const [mode,id] of Object.entries(backgroundButtons)) Q(id).onclick = () => {
 if (mode==='keep') setKeySource('off');
 else {
  if (mode==='replace' && replaceBackground && Q('keyMode').value!=='off') return;
  if (Q('keyMode').value==='off') setKeySource(lastKeySource);
  replaceBackground = mode === 'replace';
  Q('keyBackground').value = replaceBackground ? 100 : 0;
 }
 update();
};
for (const id of ['opacity','keyRange','keyEdge','keyBackground','keyReplacementColor']) Q(id).oninput = update;
Q('keyColor').oninput = () => { setKeySource('custom'); update(); };
addColorWheel(Q('keyColor'));
addColorWheel(Q('keyReplacementColor'));
Q('sampleKey').onclick = () => {
 try {
  const sample = detectBackground(ov,{includeAlpha:true});
  if (!sample) throw Error('No uniform background found. Select its color.');
  applyBackgroundSample(sample);
  update();
 } catch (error) { report(error.message); }
};
function moveAnimation() {
 if (ov.readyState < 1) { report('Choose an animation in Toolbox.'); return; }
 if (!placementAt(bedFrame() / FPS,timing())) Q('overlayZero').click();
 setViewMode(false);
 editMode = 'overlay';
 update();
}
Q('railMove').onclick = () => {
 if (editMode === 'overlay' && !viewMode) { editMode = 'view'; overlayPreview = false; update(); }
 else moveAnimation();
};
Q('editOverlay').onclick = () => Q('railMove').click();
function editBed() {
 if (Q('itemProperties').open) Q('itemProperties').close();
 setViewMode(false);
 editMode = 'base';
 update();
}
Q('editBase').onclick = editBed;
Q('editBedView').onclick = editBed;
let viewZoom=1,viewX=0,viewY=0,viewMode=false,viewGesture=null,displayScale=1;
const viewPointers=new Map();
function previewFitScale(width = WIDTH, height = HEIGHT) {
 // Leave room for the blue outline while using the available monitor height.
 return Math.max(.0001, Math.min((stage.clientWidth - 8) / width, (stage.clientHeight - 8) / height));
}
function showView() {
 displayScale = previewFitScale() * viewZoom;
 const scene = Q('stageScene');
 scene.style.left = (stage.clientWidth - WIDTH * displayScale) / 2 + viewX + 'px';
 scene.style.top = (stage.clientHeight - HEIGHT * displayScale) / 2 + viewY + 'px';
 scene.style.width = WIDTH * displayScale + 'px';
 scene.style.height = HEIGHT * displayScale + 'px';
 Q('viewZoom').value = Math.round(viewZoom * 100);
 Q('viewZoomText').textContent = Math.round(viewZoom * 100) + '%';
 update();
}
function setViewMode(on) {
 viewMode = on;
 stage.classList.toggle('viewMode',on);
 Q('viewStage').textContent = on ? 'Pan preview on' : 'Pan preview';
 Q('viewStage').setAttribute('aria-pressed',String(on));
 viewPointers.clear();
 viewGesture = null;
}
function zoomView(z,cx=stage.clientWidth/2,cy=stage.clientHeight/2){z=Math.max(.25,Math.min(4,z));const f=z/viewZoom;const dx=cx-stage.clientWidth/2,dy=cy-stage.clientHeight/2;viewX=dx-(dx-viewX)*f;viewY=dy-(dy-viewY)*f;viewZoom=z;showView()}
Q('viewStage').onclick=()=>setViewMode(!viewMode);
Q('viewReset').onclick = () => {
 const rects = [{x:0,y:0,width:WIDTH,height:HEIGHT}];
 if (bv.readyState >= 1) rects.push(bedRect());
 if (ov.readyState >= 1 && Q('showOutside').checked) rects.push(overlayRect());
 const left = Math.min(...rects.map(rect => rect.x)), top = Math.min(...rects.map(rect => rect.y));
 const right = Math.max(...rects.map(rect => rect.x + rect.width)), bottom = Math.max(...rects.map(rect => rect.y + rect.height));
 const fit = previewFitScale();
 viewZoom = Math.max(.25, Math.min(1, previewFitScale(right - left, bottom - top) / fit));
 viewX = (WIDTH / 2 - (left + right) / 2) * fit * viewZoom;
 viewY = (HEIGHT / 2 - (top + bottom) / 2) * fit * viewZoom;
 showView();
};
Q('viewZoom').oninput=()=>zoomView(Number(Q('viewZoom').value)/100);
function viewPoint(e){const r=stage.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function startViewGesture(){const ps=[...viewPointers.values()];if(!ps.length){viewGesture=null;return}const a=ps[0],b=ps[1]||a;viewGesture={x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:ps.length>1?Math.hypot(b.x-a.x,b.y-a.y):0,z:viewZoom,tx:viewX,ty:viewY}}
stage.addEventListener('pointerdown',e=>{if(!viewMode)return;e.preventDefault();stage.setPointerCapture(e.pointerId);viewPointers.set(e.pointerId,viewPoint(e));startViewGesture()});
stage.addEventListener('pointermove',e=>{if(!viewPointers.has(e.pointerId)||!viewGesture)return;e.preventDefault();viewPointers.set(e.pointerId,viewPoint(e));const ps=[...viewPointers.values()],a=ps[0],b=ps[1]||a,g=viewGesture,cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;viewZoom=g.d&&ps.length>1?Math.max(.25,Math.min(4,g.z*Math.hypot(b.x-a.x,b.y-a.y)/g.d)):g.z;const f=viewZoom/g.z;viewX=(cx-stage.clientWidth/2)-(g.x-stage.clientWidth/2-g.tx)*f;viewY=(cy-stage.clientHeight/2)-(g.y-stage.clientHeight/2-g.ty)*f;showView()});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(ev,e=>{viewPointers.delete(e.pointerId);startViewGesture()});
stage.addEventListener('wheel',e=>{if(!viewMode)return;e.preventDefault();const p=viewPoint(e);zoomView(viewZoom*Math.exp(-e.deltaY*.0015),p.x,p.y)},{passive:false});
window.addEventListener('resize',showView);
Q('stageNav').append(...Q('railButtons').children); Q('railButtons').remove();
const pointers=new Map();let gesture=null;
function applyGesture(){if(!gesture)return;const pts=[...pointers.values()],g=gesture,scale=1/displayScale;if(pts.length>=2&&g.distance){const d=Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y),factor=d/g.distance;if(g.mode==='base'){bw=Math.max(85,Math.min(WIDTH*3,g.w*factor));bx=g.x+(g.w-bw)/2;by=g.y+(g.w-bw)*8/9}else{w=Math.max(70,Math.min(1600,g.w*factor));x=g.x+(g.w-w)/2;y=g.y+(g.w-w)/ratio/2}}else if(pts.length===1){const p=pts[0],dx=(p.x-g.startX)*scale,dy=(p.y-g.startY)*scale;if(g.resize){if(g.mode==='base')bw=Math.max(85,Math.min(WIDTH*3,g.w+dx));else w=Math.max(70,Math.min(1600,g.w+dx))}else if(g.mode==='base'){bx=g.x+dx;by=g.y+dy}else{x=g.x+dx;y=g.y+dy}}update()}
function initGesture(el,mode){el.addEventListener('pointerdown',e=>{if(viewMode||mode!==editMode||rendering)return;e.preventDefault();el.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const pts=[...pointers.values()];gesture={mode,resize:e.target.id==='handle'||e.target.id==='baseHandle',x:mode==='base'?bx:x,y:mode==='base'?by:y,w:mode==='base'?bw:w,startX:e.clientX,startY:e.clientY,distance:pts.length>=2?Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y):0}});el.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&gesture&&!gesture.distance){const pts=[...pointers.values()];gesture={...gesture,x:mode==='base'?bx:x,y:mode==='base'?by:y,w:mode==='base'?bw:w,distance:Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y)}}applyGesture()});for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,e=>{pointers.delete(e.pointerId);gesture=null})}
initGesture(Q('dragSurface'),'overlay');initGesture(Q('baseEdit'),'base');
async function mediaBytes(id, video) {
 if (localMedia[id]) return localMedia[id];
 const response = await fetch(video.currentSrc);
 if (!response.ok) throw Error('Could not read the selected ' + id + ' video.');
 return response.blob();
}
Q('render').onclick = async () => {
 if (rendering || bv.readyState < 2) return;
 Q('pause').click();
 rendering = true;
 update();
 const settings = spec(), range = timing(), scene = sceneFor(bv, ov, false);
 try {
  report('Preparing the 25 fps export…');
  const [{renderAspect}, bed, animation] = await Promise.all([
   import('./export.mjs?v=36'), mediaBytes('base',bv), ov.readyState >= 2 ? mediaBytes('overlay',ov) : null,
  ]);
  let phase = 'Preparing export';
  const result = await renderAspect({bed,animation,scene,key:settings.key,range,audio:settings.audio,
   onPhase: text => { phase = text; report(text); },
   onProgress: progress => report(phase + ' · ' + Math.round(progress*100) + '%'),
  });
  renderedExt = 'webm';
  renderedBlob = result.blob;
  if (renderedUrl) URL.revokeObjectURL(renderedUrl);
  renderedUrl = URL.createObjectURL(renderedBlob);
  Q('resultVideo').src = renderedUrl;
  Q('renderResult').hidden = false;
  Q('renderInfo').textContent = result.report.outputFrames + ' frames · 25 fps · WebM · ' + (renderedBlob.size / 1048576).toFixed(1) + ' MB';
  Q('renderResult').scrollIntoView({block:'nearest'});
  report('Render ready to download.');
 } catch (error) { report('Render failed: ' + error.message); }
 finally { rendering = false; update(); }
};
const keyModeFromUrl = () => [...keySourceModes,'off'].includes(params.get('key')) ? params.get('key') : null;
function restoreSettings(saved, transformLegacy = true) {
 const bed = saved.portraitPerspective, overlay = saved.overlayTransform;
 const fixedViewport = saved.version === 'R32' || saved.version === RECIPE_VERSION;
 const useLegacy = transformLegacy && !fixedViewport && bed?.width > 0;
 const scale = useLegacy ? WIDTH / bed.width : 1;
 if (overlay) {
  x = (overlay.x - (useLegacy ? bed.x : 0)) * scale;
  y = (overlay.y - (useLegacy ? bed.y : 0)) * scale;
  w = overlay.width * scale;
 }
 if (bed && fixedViewport) { bx = bed.x; by = bed.y; bw = bed.width; }
 Q('order').value = saved.layerOrder || 'overlay';
 editMode = 'view';
 lastKeySource = keySourceModes.includes(saved.key?.sourceMode) ? saved.key.sourceMode : 'green';
 const savedSource = saved.blueRemoval === 'on' ? 'blue' : saved.blueRemoval;
 setKeySource([...keySourceModes,'off'].includes(savedSource) ? savedSource : 'green');
 replaceBackground = saved.key?.replacement?.enabled === true;
 Q('keyReplacementColor').value = saved.key?.replacement?.color || DEFAULT_REPLACEMENT_COLOR;
 Q('tolerance').value = saved.tolerance ?? 70;
 Q('opacity').value = Math.round(100 * (saved.opacity ?? 1));
 Q('keyColor').value = saved.key?.color || '#0a77d4';
 Q('keyRange').value = Math.round(100 * (saved.key?.similarity ?? .18));
 Q('keyEdge').value = Math.round(100 * (saved.key?.blend ?? .04));
 Q('keyBackground').value = Math.round(100 * (saved.key?.backgroundOpacity ?? 0));
 Q('baseAudio').value = saved.audio?.source || 'on';
 Q('overlayAudio').value = saved.audio?.cartoonSfx || 'off';
 startFrame = saved.startFrame ?? 0;
 endFrame = saved.outFrame ?? null;
 playbackRate = saved.playbackRate ?? 1;
 trimInFrame = saved.overlayTrim?.inFrame ?? 0;
 trimOutFrame = saved.overlayTrim?.outFrame ?? null;
 if (!localMedia.overlay && typeof saved.overlayLabel === 'string' && ov.readyState >= 1) Q('overlayChosen').textContent = saved.overlayLabel;
 showTiming();
 sound();
}
const savedEditKey = 'aspectlock-saved-edit';
Q('save').onclick = () => {
 try {
  if (!bv.readyState) throw Error('Choose a bed to save this edit.');
  localStorage.setItem(savedEditKey, JSON.stringify({spec: spec(), files: localFiles, frame: bedFrame(), outputName: Q('outputName').value}));
  toolbox.render();
  report('Edit saved on this device.');
 } catch (error) { report(error.message); }
};
Q('restoreEdit').onclick = async () => {
 if (rendering) { report('Wait for the render to finish.'); return; }
 Q('pause').click();
 const button = Q('restoreEdit');
 button.disabled = true;
 try {
  const edit = JSON.parse(localStorage.getItem(savedEditKey) || 'null');
  if (!edit) throw Error('No saved AspectLock edit on this device.');
  const sources = {};
  for (const id of ['base','overlay']) {
   const existed = edit.spec[id];
   sources[id] = edit.files?.[id] ? await toolbox.get(edit.files[id]) : existed ? items.find(item => item.path_display === existed || item.name === existed) : null;
   if (existed && !sources[id]) throw Error('Reconnect ' + existed + ' in Toolbox.');
  }
  for (const id of ['base','overlay']) {
   const source = sources[id];
   if (source?.file) {
    if (!await loadLocalVideo(id, source)) return;
   } else if (source) {
    const loaded = await loadFile(edit.spec[id], id === 'base' ? bv : ov);
    if (!loaded) return;
    delete localFiles[id];
    delete localMedia[id];
    markVideoSelection(id, source.name, edit.spec[id]);
   } else {
    detach(id);
   }
  }
  restoreSettings(edit.spec);
  seekBedFrame(edit.frame);
  Q('outputName').value = edit.outputName;
  update();
  report('Saved edit restored.');
 } catch (error) { report(error.message); }
 finally { button.disabled = false; }
};
Q('copy').onclick = async () => {
 try { await navigator.clipboard.writeText(JSON.stringify(spec(), null, 2)); report('Settings copied.'); }
 catch { report('Open Alignment settings to select and copy the text.'); }
};
Q('frame').onclick = () => {
 const link = document.createElement('a');
 link.href = C.toDataURL('image/png');
 link.download = 'AspectLock_frame_F' + bedFrame() + '.png';
 link.click();
};
function detach(id) {
 clearVideoSource(id === 'base' ? bv : ov);
 delete localFiles[id];
 delete localMedia[id];
 Q(id).querySelector('[data-device-video]')?.remove();
 Q(id).selectedIndex = -1;
 Q(id + 'Chosen').textContent = '';
 if (id === 'base') {
  requestedBedFrame = paintedBedFrame = null;
  delete Q('baseChosen').dataset.expected;
  toolbox.renderBedName();
  const clock = Q('position');
  delete clock.dataset.frame;
  clock.textContent = 'F—';
  Q('insertFrame').textContent = 'Insert at F—';
  Q('bedProgress').value = 0;
 }
}
function newEdit(keepBed) {
 if (rendering) { report('Wait for the render to finish.'); return; }
 manualVideoSelection = true;
 Q('pause').click();
 if (inStudio && !keepBed) return;
 detach('overlay');
 if (!keepBed) detach('base');
 overlayActive = overlayPreview = overlayAudible = false;
 restoreSettings({version:RECIPE_VERSION, blueRemoval:keyModeFromUrl() || 'green', portraitPerspective:{x:0,y:0,width:WIDTH}, overlayTransform:{x:40,y:350,width:460}});
 Q('viewReset').click();
 if (keepBed) seekBedFrame(0);
 if (Q('newEditDialog').open) Q('newEditDialog').close();
 Q('renderResult').hidden = true;
 Q('resultVideo').removeAttribute('src');
 Q('resultVideo').load();
 renderedBlob = null;
 if (renderedUrl) URL.revokeObjectURL(renderedUrl);
 renderedUrl = null;
 toolbox.render();
 update();
 report(keepBed ? 'Bed ready. Choose another animation in Toolbox.' : 'Choose a bed to start a new edit.');
}
Q('keepBed').onclick = () => newEdit(true);
Q('emptyEdit').onclick = () => newEdit(false);
Q('emptyEdit').hidden = inStudio;
Q('cancelNew').onclick = () => Q('newEditDialog').close();
function askNewEdit() {
 Q('pause').click();
 if (!rendering) Q('newEditDialog').showModal();
}
Q('newEdit').onclick = askNewEdit;
Q('resetFromExport').onclick = askNewEdit;
Q('startOver').onclick = askNewEdit;

const toolbox = setupToolbox({
 pause: () => Q('pause').click(),
 currentBed: () => localFiles.base,
 currentFiles: () => {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(savedEditKey) || 'null')?.files; } catch {}
  return [...Object.values(localFiles), ...Object.values(saved || {})];
 },
 allowDevice: !inStudio,
 onSelect: (id, source) => loadLocalVideo(id, source),
 onRename: entry => {
  const label = clipName(entry);
  for (const id of ['base','overlay']) {
   if (localFiles[id] === entry.id) markVideoSelection(id, entry.file.name, undefined, label);
  }
 },
});
Q('toolboxAdd').disabled = inStudio;
Q('restoreEdit').hidden = inStudio;
Q('toolboxCloud').onclick = () => openLibrary('overlay');
function openTimingPanel() {
 Q('pause').click();
 const panel = Q('aspectTiming');
 panel.open = true;
 panel.scrollIntoView({block:'nearest'});
}
Q('railTiming').onclick = openTimingPanel;
Q('openInsertionTrim').onclick = () => {
 Q('itemProperties').close();
 Q('overlayTrimPanel').open = true;
 openTimingPanel();
};
const insertPanel = Q('aspectToolbox');
insertPanel.querySelector('summary').addEventListener('click', event => {
 if (!insertPanel.open && !event.target.closest('button')) Q('pause').click();
});
Q('railToolbox').onclick = () => {
 Q('pause').click();
 insertPanel.open = true;
 if (Q('pinnedSections').contains(insertPanel)) return;

 const controls = Q('insertPoint').getBoundingClientRect();
 const player = stage.closest('.gs-player-shell');
 const top = Math.max(0, player?.getBoundingClientRect().bottom ?? 0);
 const viewport = window.visualViewport;
 const bottom = viewport ? viewport.offsetTop + viewport.height : innerHeight;
 const room = bottom - top - controls.height;
 if (room <= 0) return;
 const clipRoom = Math.min(72, room);
 if (controls.top < top - 1 || controls.bottom + clipRoom > bottom + 1) {
  insertPanel.scrollIntoView({block:'start'});
 }
};
const openInsertionSettings = mountInsertionSettings(Q('itemProperties'));
Q('editAdded').onclick = () => {
 Q('pause').click();
 overlayPreview = false;
 setViewMode(false);
 editMode = 'overlay';
 Q('insertionName').value = addedPlacement().name;
 Q('insertionError').textContent = '';
 update();
 openInsertionSettings();
};
Q('renameInsertion').onclick = async () => {
 const field = Q('insertionName'), button = Q('renameInsertion');
 const label = field.value.trim();
 if (!label) { Q('insertionError').textContent = 'Enter a video name.'; field.focus(); return; }
 button.disabled = field.readOnly = true;
 try {
  if (localFiles.overlay) await toolbox.renameClip(localFiles.overlay, label);
  else { Q('overlayChosen').textContent = label; update(); }
  field.value = addedPlacement().name;
  Q('insertionError').textContent = '';
 } catch (error) { Q('insertionError').textContent = error.message; }
 finally { button.disabled = field.readOnly = false; }
};
Q('jumpAdded').onclick = () => seekBedFrame(startFrame);
Q('sheetItemStart').onclick = () => seekBedFrame(startFrame);
Q('itemProperties').addEventListener('close', () => { overlayPreview = false; ov.pause(); paintPlayback(); });
function addedPlacement() {
 return {id:'overlay', name:Q('overlayChosen').textContent || Q('overlay').value, ...timing(), visible:true};
}
let paintedMatrix;
function paintAddedMatrix() {
 const item = ov.readyState >= 1 && addedPlacement();
 const frame = bedFrame(), frames = bv.readyState >= 1 ? lastFrame(bv.duration) + 1 : 1;
 const signature = [frame, frames, item?.name, item?.inFrame, item?.outFrame].join('|');
 if (signature === paintedMatrix) return;
 paintedMatrix = signature;
 paintMatrix(Q('itemMatrix'), item ? [item] : [], frame, frames, 'overlay');
}
function refreshAdded() {
 const loaded = ov.readyState >= 1;
 Q('addedOverlay').hidden = !loaded;
 Q('addedEmpty').hidden = loaded;
 Q('addedCount').textContent = loaded ? '1' : '0';
 if (loaded) {
  const item = addedPlacement();
  Q('addedName').textContent = item.name;
  Q('addedTiming').textContent = 'Edit insertion · IN F' + item.inFrame + ' · OUT F' + item.outFrame;
  const name = Q('insertionName');
  if (name.dataset.savedName !== item.name) name.value = name.dataset.savedName = item.name;
 }
 paintAddedMatrix();
}

async function start() {
 setKeySource(keyModeFromUrl() || 'green');
 if (!raf) draw();
 update();
 if (!key) return;
 try {
  const data = await api('/api/assets');
  items = (data.entries || []).filter(file => file['.tag'] === 'file' && /\.(mp4|webm|mov)$/i.test(file.name));
  for (const id of ['base','overlay']) {
   const select = Q(id), active = select.selectedOptions[0];
   for (const file of items) select.add(new Option(file.name, file.name));
   if (active) active.selected = true;
   else select.selectedIndex = -1;
   select.onchange = () => chooseCloudVideo(id, select.value);
  }
  if (Q('assetDialog').open) renderLibrary();
  if (manualVideoSelection || params.get('source') === 'device' || (!params.has('base') && !params.has('overlay') && !params.has('preset'))) return;
  const bed = await loadFile(names[0], bv);
  if (!bed) return;
  markVideoSelection('base', bed.name, names[0]);
  if (manualVideoSelection) return;
  const overlay = await loadFile(names[1], ov);
  if (!overlay) return;
  markVideoSelection('overlay', overlay.name, names[1]);
  if (manualVideoSelection) return;
  placeLoadedOverlay(0);
  const saved = JSON.parse(localStorage.getItem('aspectlock_ep4_alignment_r1') || 'null');
  if (saved?.base === names[0] && saved.overlay === names[1]) restoreSettings(saved);
  else if (params.get('preset') === 'timmy351') {
   const scale = WIDTH / 217;
   x = (150 - 173) * scale;
   y = (295 - 119) * scale;
   w = 413 * scale;
  }
  if (keyModeFromUrl()) setKeySource(keyModeFromUrl());
  if (params.has('start')) startFrame = Math.max(0, Math.round(Number(params.get('start')) * FPS) || 0);
  else if (params.get('preset') === 'timmy351') startFrame = 351;
  showTiming();
  update();
  report('Connected. Both videos ready.');
 } catch (error) { if (!manualVideoSelection && params.get('source') !== 'device') report(error.message); }
}

window.addEventListener('DOMContentLoaded', () => {
 const nav = document.querySelector('nav[aria-label="Caption production tools"]');
 if (nav) Q('aspectExport').after(nav);
 const player = document.querySelector('.gs-player-shell');
 if (player) {
  if (!inStudio) toolbox.attachBedName(player.querySelector('.gs-player-filename'));
  player.append(Q('pinnedSections'), Q('status'));
  setupPinnedSections({host:Q('pinnedSections'), player, key:'aspectlock-pinned-section', togglePlayer:Q('pinPlayer')});
  new ResizeObserver(() => { document.body.style.setProperty('--aspect-player-height', player.offsetHeight + 'px'); }).observe(player);
 }
 showView();
 new ResizeObserver(showView).observe(stage);
}, {once:true});
if (!inStudio) void start();

if (inStudio) Promise.all([import('../studio/adapter.mjs?v=1'), import('../studio/core.mjs?v=1')]).then(([{installAdapter},{moduleSession,preferredBed}]) => {
 installAdapter('scene',{
  busy: () => rendering,
  pause: () => Q('pause').click(),
  async open({project,session}) {
   newEdit(true);
   detach('base');
   items = project.assets.filter(asset => /\.(mp4|webm|mov)$/i.test(asset.name)).map(asset => ({...asset,path_display:asset.path}));
   for (const id of ['base','overlay']) {
    Q(id).replaceChildren(...items.map(asset => new Option(asset.name,asset.path)));
    Q(id).selectedIndex = -1;
    Q(id).onchange = () => chooseCloudVideo(id,Q(id).value);
   }
   const base = (project.studio?.bedAssetId ? preferredBed(project) : null) || items.find(asset => asset.path === session?.spec?.base) || preferredBed(project);
   const overlay = items.find(asset => asset.path === session?.spec?.overlay) || items.find(asset => ['animation','reaction','broll'].includes(asset.role));
   for (const [id,asset,video] of [['base',base,bv],['overlay',overlay,ov]]) {
    if (asset && await loadFile(asset.path,video)) markVideoSelection(id,asset.name,asset.path);
   }
   if (session?.spec) {
    restoreSettings(session.spec);
    viewZoom = session.view?.zoom || 1;
    viewX = session.view?.x || 0;
    viewY = session.view?.y || 0;
    Q('outputName').value = session.outputName || project.title + '_scene';
   } else if (overlay) placeLoadedOverlay(0);
   seekBedFrame(Math.round((session?.time || 0) * FPS));
   showView();
   if (!raf) draw();
   report(project.title + ' · scene pass · paused');
  },
  checkpoint: ({project}) => moduleSession('scene',project.id,{spec:spec(),time:bedFrame()/FPS,view:{zoom:viewZoom,x:viewX,y:viewY},outputName:Q('outputName').value}),
 });
});
