import {clipName,constantFrameRate,cutFrameRate,frameAt,frameSeekTime,selection} from '../cliplock/core.mjs?v=4';

const $ = id => document.getElementById(id);
const v = $('video');
const fileInput = $('file');
const engine = () => import('../cliplock/engine.mjs?v=3');

let source = null;
let url = null;
let loadEpoch = 0;
let loading = false;
let timing = null;
let selectedFrame = null;
let fps = null;
let meta = {};
let trimIn = null;
let trimOut = null;
let trimJob = null;
let exportedFile = null;
let trimDownloadURL = null;
let edits = [];
let rec = null;
let stopRequested = false;

const sourceReady = () => !!source && v.readyState >= 1 && !v.error;
const boundaryTime = n => timing.times[n] ?? timing.end;
const frameCount = () => timing?.times.length ?? (fps && sourceReady() ? Math.round(v.duration * fps) : 0);

function frame() {
  if (!sourceReady()) return 0;
  if (!timing) return fps ? Math.max(0, Math.round(v.currentTime * fps)) : 0;
  if (selectedFrame !== null && v.paused) return selectedFrame;
  if (v.ended || v.currentTime >= timing.end) return timing.times.length;
  return frameAt(timing.times, v.currentTime);
}

function cursorTime() {
  return timing && v.paused ? boundaryTime(frame()) : v.currentTime;
}

function update() {
  $('position').textContent = sourceReady()
    ? 'Frame ' + frame() + ' · ' + cursorTime().toFixed(3) + ' s'
    : 'Frame —';
  const end = timing?.end ?? v.duration;
  $('frameProgress').value = end > 0 ? Math.min(1, v.currentTime / end) : 0;
  const count = Math.max(1, parseInt($('count').value, 10) || 1);
  $('gap').textContent = fps
    ? count + ' frames = ' + (count / fps).toFixed(4) + ' seconds of video + silence'
    : 'Load a video to calculate duration';
}

function refreshSource() {
  if (source) {
    const message = v.error ? 'Could not decode video' : loading ? 'Reading source frames…'
      : sourceReady() ? v.videoWidth + '×' + v.videoHeight + ' · ' + v.duration.toFixed(3) + ' s'
        + ' · FPS: ' + (fps ? fps.toFixed(3) : 'unknown') + (meta.variable ? ' · Variable timing' : '')
      : 'Loading video…';
    $('meta').textContent = source.name + ' · ' + message;
  }
  const canStep = sourceReady() && !!fps;
  for (const id of ['back','forward','jumpback','jumpforward','reverse','frameNumber','goFrame']) $(id).disabled = !canStep;
  $('playPause').disabled = !sourceReady();
  $('frameNumber').max = frameCount();
  update();
  updateTrim();
}

async function loadSource(file) {
  if (!file || trimJob || $('export').disabled) return;
  const token = ++loadEpoch;
  stopReverse();
  stopSelectionPlayback();
  selectionLooping = false;
  v.pause();
  setSpeed(100);
  source = file;
  loading = true;
  timing = null;
  selectedFrame = fps = trimIn = trimOut = null;
  meta = {};
  edits = [];
  renderPlan();
  const previousURL = url;
  url = URL.createObjectURL(file);
  v.src = url;
  v.load();
  if (previousURL) URL.revokeObjectURL(previousURL);
  refreshSource();

  let exact = null;
  let fallback = null;
  try {
    exact = await (await engine()).inspect(file);
  } catch {
    if (token === loadEpoch) fallback = await readFPS(file);
  }
  if (token !== loadEpoch) return;
  timing = exact;
  if (exact) {
    const cfr = constantFrameRate(exact.times, exact.end);
    meta = {fps: cfr ?? exact.times.length / (exact.end - exact.times[0]), variable: cfr === null};
  } else {
    meta = fallback ?? {};
  }
  fps = Number.isFinite(meta.fps) && meta.fps > 0 ? meta.fps : null;
  loading = false;
  refreshSource();
}

fileInput.onchange = () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  void loadSource(file);
};
for (const event of ['loadedmetadata','error']) v.addEventListener(event, refreshSource);
for (const event of ['timeupdate','seeked','ended']) v.addEventListener(event, update);
$('count').oninput = update;

function seekFrame(n) {
  if (!sourceReady() || !fps || !Number.isInteger(n) || n < 0 || n > frameCount()) return false;
  v.pause();
  if (timing) {
    selectedFrame = n;
    v.currentTime = Math.min(v.duration, n === frameCount() ? timing.end : frameSeekTime(timing, n));
  } else {
    v.currentTime = Math.min(v.duration, n / fps);
  }
  update();
  return true;
}

function step(delta) {
  stopReverse();
  seekFrame(Math.max(0, Math.min(frameCount(), frame() + delta)));
}
$('back').onclick = () => step(-1);
$('forward').onclick = () => step(1);
$('jumpback').onclick = () => step(-30);
$('jumpforward').onclick = () => step(30);
$('frameGo').addEventListener('toggle', () => {
  if ($('frameGo').open) $('frameNumber').value = frame();
});
$('frameGoForm').onsubmit = event => {
  event.preventDefault();
  stopReverse();
  if (seekFrame($('frameNumber').valueAsNumber)) $('frameGo').open = false;
};

const speed = $('speed');
function setSpeed(value) {
  const percent = Math.max(25, Math.min(200, Number(value) || 100));
  speed.value = percent;
  v.playbackRate = percent / 100;
  $('speedRead').textContent = (percent / 100).toFixed(2) + '× · ' + Math.round(percent) + '%';
}
speed.oninput = () => setSpeed(speed.value);
document.querySelectorAll('[data-speed]').forEach(button => button.onclick = () => setSpeed(button.dataset.speed));
setSpeed(100);

let reverseTimer = null;
function stopReverse() {
  clearInterval(reverseTimer);
  reverseTimer = null;
  $('reverse').setAttribute('aria-pressed', 'false');
}
$('reverse').onclick = () => {
  if (reverseTimer !== null) {
    stopReverse();
    return;
  }
  if (!sourceReady() || !fps) return;
  v.pause();
  $('reverse').setAttribute('aria-pressed', 'true');
  reverseTimer = setInterval(() => {
    const n = frame();
    if (n > 0) seekFrame(n - 1);
    else stopReverse();
  }, Math.max(20, 1000 / (fps * v.playbackRate)));
};
const playPause = $('playPause');
function refreshPlayButton() {
  playPause.textContent = v.paused ? '▶' : 'Ⅱ';
  playPause.setAttribute('aria-label', v.paused ? 'Play video' : 'Pause video');
}
playPause.onclick = async () => {
  if (!sourceReady()) return;
  stopSelectionPlayback();
  if (!v.paused) v.pause();
  else {
    try { await v.play(); }
    catch (error) { $('notesStatus').textContent = 'Playback could not start. ' + error.message; }
  }
};
v.addEventListener('play', () => {
  selectedFrame = null;
  stopReverse();
  refreshPlayButton();
});
for (const event of ['pause','ended']) v.addEventListener(event, refreshPlayButton);

function trimRange() {
  if (!timing || trimIn === null || trimOut === null || trimOut <= trimIn) return null;
  return selection(timing.times, timing.end, trimIn, trimOut);
}

function markPosition(id, n) {
  const marker = $(id);
  marker.hidden = n === null || !timing;
  if (!marker.hidden) {
    marker.style.left = 'clamp(1.5px, ' + (100 * boundaryTime(n) / timing.end) + '%, calc(100% - 1.5px))';
  }
}

function updateTrim() {
  const range = trimRange();
  const available = !!timing && sourceReady() && !trimJob && !$('export').disabled;
  $('trimIn').disabled = $('trimOut').disabled = !available;
  $('trimExport').disabled = !available || !range;
  $('trimInLabel').textContent = trimIn === null ? 'In —' : 'In F' + trimIn;
  $('trimOutLabel').textContent = trimOut === null ? 'Out —' : 'Out F' + trimOut;
  $('trimTotal').textContent = range ? range.frames + ' fr · ' + (range.end - range.start).toFixed(3) + ' s'
    : trimIn !== null && trimOut !== null ? 'Out must follow In'
    : loading ? 'Reading frames…'
    : v.error ? 'Video could not open'
    : sourceReady() && !timing ? 'Trim unavailable for this file'
    : '';
  refreshSelectionButtons();
  markPosition('trimInTick', trimIn);
  markPosition('trimOutTick', trimOut);
  const band = $('trimBand');
  band.hidden = !range;
  if (range) {
    band.style.left = (100 * range.start / timing.end) + '%';
    band.style.right = (100 * (1 - range.end / timing.end)) + '%';
  }
}

function markTrim(boundary) {
  stopReverse();
  stopSelectionPlayback();
  v.pause();
  if (boundary === 'in') trimIn = Math.min(frame(), frameCount() - 1);
  else trimOut = frame();
  updateTrim();
}
$('trimIn').onclick = () => markTrim('in');
$('trimOut').onclick = () => markTrim('out');


let selectionPlaying = false;
let selectionLooping = false;
let selectionRun = 0;
let selectionMonitor = null;
function stopSelectionPlayback() {
  selectionPlaying = false;
  selectionRun++;
  if (selectionMonitor !== null) cancelAnimationFrame(selectionMonitor);
  selectionMonitor = null;
  refreshSelectionButtons();
}
function refreshSelectionButtons() {
  const valid = !!trimRange() && sourceReady() && !trimJob;
  for (const id of ['playSelection','restartSelection','loopSelection']) $(id).disabled = !valid;
  $('playSelection').textContent = selectionPlaying && !v.paused ? 'Ⅱ Pause' : '▶ Selection';
  $('restartSelection').textContent = '↺ Restart';
  $('loopSelection').textContent = selectionLooping ? 'Loop: On' : 'Loop: Off';
  $('loopSelection').setAttribute('aria-pressed', String(selectionLooping));
}
async function playSelected(fromStart = false) {
  const range = trimRange();
  if (!range || !sourceReady()) return;
  stopReverse();
  const run = ++selectionRun;
  if (selectionMonitor !== null) cancelAnimationFrame(selectionMonitor);
  selectionMonitor = null;
  selectionPlaying = true;
  if (fromStart || v.currentTime < range.start || v.currentTime >= range.end - 0.025) {
    v.pause();
    v.currentTime = range.start;
    selectedFrame = null;
  }
  refreshSelectionButtons();
  try { await v.play(); } catch (error) {
    if (run === selectionRun) {
      stopSelectionPlayback();
      $('notesStatus').textContent = 'Selection playback failed: ' + error.message;
    }
    return;
  }
  const monitor = () => {
    if (run !== selectionRun || !selectionPlaying) return;
    const selected = trimRange();
    if (!selected || v.paused) { stopSelectionPlayback(); return; }
    if (v.currentTime >= selected.end - 0.012 || v.ended) {
      if (selectionLooping) {
        v.currentTime = selected.start;
        selectionMonitor = requestAnimationFrame(monitor);
      } else {
        v.pause();
        v.currentTime = selected.start;
        stopSelectionPlayback();
      }
      return;
    }
    selectionMonitor = requestAnimationFrame(monitor);
  };
  selectionMonitor = requestAnimationFrame(monitor);
}
$('playSelection').onclick = () => {
  if (selectionPlaying && !v.paused) { v.pause(); stopSelectionPlayback(); }
  else void playSelected(false);
};
$('restartSelection').onclick = () => { v.pause(); stopSelectionPlayback(); void playSelected(true); };
$('loopSelection').onclick = () => {
  selectionLooping = !selectionLooping;
  refreshSelectionButtons();
};

const saveDialog = $('trimSave');
const nextDialog = $('trimNext');
const trimName = $('trimName');
const trimFormat = $('trimFormat');
const saveStatus = $('trimSaveStatus');
const saveButton = $('trimSaveButton');
const trimDownload = $('trimDownload');
const trimShare = $('trimShare');
const downloadStatus = $('trimDownloadStatus');

function cutFilename(value, format) {
  return clipName(value.replace(/\.(mp4|webm)$/i, '') + '.' + format, format);
}

$('trimExport').onclick = () => {
  const range = trimRange();
  if (!range || trimJob) return;
  const mp4 = timing.mp4Possible && !timing.alpha;
  const webm = cutFrameRate(timing, range, true) !== null;
  trimFormat.options[0].disabled = !mp4;
  trimFormat.options[1].disabled = !webm;
  trimFormat.value = mp4 ? 'mp4' : 'webm';
  trimName.value = cutFilename(source.name.replace(/\.[^.]+$/, '') + '_trim', trimFormat.value);
  $('trimSaveRange').textContent = 'In F' + range.inFrame + ' · Out F' + range.outFrame + ' · '
    + range.frames + ' frames · ' + (range.end - range.start).toFixed(3) + ' s. Out is the first frame after the cut.';
  saveButton.disabled = !mp4 && !webm;
  saveStatus.textContent = saveButton.disabled ? 'This cut needs an MP4 encoder to preserve its frame timing.' : '';
  saveDialog.showModal();
  trimName.select();
};
trimFormat.onchange = () => { trimName.value = cutFilename(trimName.value.trim(), trimFormat.value); };

function cancelSave() {
  if (trimJob) {
    trimJob.abort();
    saveStatus.textContent = 'Cancelling…';
  } else {
    saveDialog.close();
  }
}
$('trimCancel').onclick = cancelSave;
saveDialog.addEventListener('cancel', event => {
  if (!trimJob) return;
  event.preventDefault();
  cancelSave();
});

$('trimSaveForm').onsubmit = async event => {
  event.preventDefault();
  const range = trimRange();
  if (!range || trimJob || saveButton.disabled) return;
  const format = trimFormat.value;
  const entered = trimName.value.trim();
  if (!entered) {
    saveStatus.textContent = 'Enter a filename.';
    trimName.focus();
    return;
  }
  const name = cutFilename(entered, format);
  if (name.toLowerCase() === source.name.toLowerCase()) {
    saveStatus.textContent = 'Give the trim a different name from the source.';
    trimName.focus();
    return;
  }
  const job = new AbortController();
  trimJob = job;
  saveButton.disabled = trimName.disabled = trimFormat.disabled = true;
  saveStatus.textContent = 'Preparing trim…';
  updateTrim();
  try {
    const {cut} = await engine();
    const result = await cut(source, timing, range.inFrame, range.outFrame, format, {
      signal: job.signal,
      allowWebmRounding: true,
      onProgress: value => {
        if (!job.signal.aborted) saveStatus.textContent = 'Exporting ' + Math.round(value * 100) + '%';
      },
    });
    if (job.signal.aborted) return;
    exportedFile = new File([result.blob], name, {type: result.blob.type});
    const previousURL = trimDownloadURL;
    trimDownloadURL = URL.createObjectURL(exportedFile);
    if (previousURL) setTimeout(() => URL.revokeObjectURL(previousURL), 60000);
    trimDownload.href = trimDownloadURL;
    trimDownload.download = name;
    trimShare.hidden = !navigator.share || !navigator.canShare?.({files: [exportedFile]});
    $('trimLast').hidden = false;
    $('trimSavedName').textContent = name + ' · ' + result.verified.frames + ' frames · '
      + result.verified.duration.toFixed(3) + ' s';
    downloadStatus.textContent = 'Tap Download to save this cut.';
    saveDialog.close();
    nextDialog.showModal();
  } catch (error) {
    if (!job.signal.aborted) saveStatus.textContent = error.message;
  } finally {
    trimJob = null;
    saveButton.disabled = trimName.disabled = trimFormat.disabled = false;
    if (job.signal.aborted && saveDialog.open) saveDialog.close();
    updateTrim();
  }
};
$('trimKeep').onclick = () => nextDialog.close();
$('trimLoad').onclick = () => {
  const file = exportedFile;
  nextDialog.close();
  void loadSource(file);
};
$('trimNew').onclick = () => {
  nextDialog.close();
  fileInput.click();
};
trimDownload.onclick = () => {
  downloadStatus.textContent = 'Download requested. Look for this file in Downloads.';
};
trimShare.onclick = async () => {
  try {
    await navigator.share({files: [exportedFile]});
    downloadStatus.textContent = 'Share handed to your device.';
  } catch (error) {
    if (error.name !== 'AbortError') downloadStatus.textContent = 'Sharing unavailable. Use Download.';
  }
};
$('trimLast').onclick = () => {
  stopReverse();
  v.pause();
  if (exportedFile) nextDialog.showModal();
};

// Keep legacy MP4 frame-rate detection for files the trim engine cannot inspect.
function boxes(b,end){let out=[];function scan(p,q){while(p+8<=q){let sz=b.getUint32(p),typ=String.fromCharCode(...new Uint8Array(b.buffer,b.byteOffset+p+4,4));let header=8;if(sz===1&&p+16<=q){sz=Number(b.getBigUint64(p+8));header=16}if(!sz)sz=q-p;if(sz<header||p+sz>q)break;out.push({type:typ,start:p+header,end:p+sz});if(['moov','trak','mdia','minf','stbl'].includes(typ))scan(p+header,p+sz);p+=sz}}scan(0,end);return out}
async function readFPS(file){try{const buf=await file.arrayBuffer();const b=new DataView(buf),atoms=boxes(b,b.byteLength);let timescale=0;const trak=atoms.filter(a=>a.type==='trak');for(const t of trak){const children=atoms.filter(a=>a.start>=t.start&&a.end<=t.end);const handler=children.find(a=>a.type==='hdlr');if(!handler||String.fromCharCode(...new Uint8Array(buf,handler.start+8,4))!=='vide')continue;const mdhd=children.find(a=>a.type==='mdhd'),stts=children.find(a=>a.type==='stts');if(!mdhd||!stts)continue;timescale=b.getUint32(mdhd.start+(b.getUint8(mdhd.start)===1?20:12));let n=b.getUint32(stts.start+4),samples=0,duration=0;for(let i=0;i<n;i++){let p=stts.start+8+i*8;if(p+8>stts.end)break;let c=b.getUint32(p),d=b.getUint32(p+4);samples+=c;duration+=c*d}if(timescale&&duration)return {fps:samples*timescale/duration,samples,variable:n>1};}return null}catch(e){return null}}

function renderPlan(){let x=edits.map((e,i)=>`${i+1}. Frame ${e.at} · ${e.count} ${e.kind} frames · ${(e.count/fps).toFixed(3)}s`).join('\n');$('plan').textContent=x||'No insertions yet.'} $('add').onclick=()=>{if(!fps)return alert('FPS not detected; cannot insert accurately.');let c=parseInt($('count').value);if(!Number.isInteger(c)||c<1||c>9000)return alert('Enter 1–9000 frames');edits.push({at:frame()+($('side').value==='after'?1:0),count:c,kind:$('kind').value});edits.sort((a,b)=>a.at-b.at);renderPlan();};$('undo').onclick=()=>{edits.pop();renderPlan()};
const historyKey='FrameLock_v1.3.4_note_history';
const noteSession='note_'+Date.now()+'_'+Math.floor(Math.random()*100000);
$('notes').value='';
function readHistory(){try{return JSON.parse(localStorage.getItem(historyKey)||'[]')}catch(e){return []}}
function saveHistory(){const value=$('notes').value;try{let items=readHistory();let item=items.find(x=>x.id===noteSession);if(!item){item={id:noteSession,created:new Date().toISOString(),text:'',video:''};items.unshift(item)}item.text=value;item.video=source?.name||'No video selected';item.frame=Number.isFinite(fps)&&fps>0?frame():null;item.updated=new Date().toISOString();localStorage.setItem(historyKey,JSON.stringify(items))}catch(e){$('notesStatus').textContent='Browser history storage unavailable: export your notes to a text file.'}}
$('notes').oninput=saveHistory;
function showHistory(){const list=$('historyList');list.replaceChildren();for(const item of readHistory()){const opt=document.createElement('option');opt.value=item.id;opt.textContent=`${new Date(item.updated||item.created).toLocaleString()} | ${item.video||'Unknown video'} | Frame ${item.frame??'—'} | ${(item.text||'').slice(0,35)}`;list.appendChild(opt)}$('historyPanel').hidden=false}
$('history').onclick=showHistory;
$('closeHistory').onclick=()=>{$('historyPanel').hidden=true};
$('restoreNotes').onclick=()=>{const item=readHistory().find(x=>x.id===$('historyList').value);if(!item)return;$('notes').value=item.text||'';saveHistory();$('historyPanel').hidden=true;$('notesStatus').textContent='Historical notes restored to the current box'};
$('clearNotes').onclick=()=>{if(!confirm('Clear the visible notes box? Your prior notes remain in History.'))return;$('notes').value='';saveHistory()};
function releaseEditorFocus(){const a=document.activeElement;if(a&&(a.tagName==='TEXTAREA'||(a.tagName==='INPUT'&&a.type!=='range'&&a.type!=='file')))a.blur();}
[v,document.querySelector('.transport'),document.querySelector('.speedbox')].filter(Boolean).forEach(el=>el.addEventListener('pointerdown',releaseEditorFocus,{capture:true,passive:true}));
$('notesDone').onclick=()=>{
  releaseEditorFocus();
  $('notes-workspace').open=false;
  $('scribeSummary')?.focus({preventScroll:true});
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseEditorFocus();});
$('stamp').onclick=()=>{releaseEditorFocus();const n=$('notes');n.value+=`\nFrame ${frame()} | ${cursorTime().toFixed(3)}s | `;n.oninput();n.setSelectionRange(n.value.length,n.value.length);};
$('copy').onclick=async()=>{const txt=$('notes').value;try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(txt);$('notesStatus').textContent='Notes copied to clipboard';return}throw new Error('Clipboard API unavailable')}catch(e){try{$('notes').focus({preventScroll:true});$('notes').select();$('notes').setSelectionRange(0,txt.length);const ok=document.execCommand('copy');$('notes').setSelectionRange(txt.length,txt.length);if(ok){$('notes').blur();$('notesStatus').textContent='Notes copied to clipboard';return}}catch(_){}$('notesStatus').textContent='Clipboard blocked by this browser. Notes are selected for manual Copy.'}};function download(blob,name){let a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000)}$('saveNotes').onclick=()=>download(new Blob([`FrameLock v1.4.2 notes\nSource: ${source?.name||'none'}\nFPS: ${fps||'unknown'}\nInsertions:\n${edits.map(e=>JSON.stringify(e)).join('\n')}\n\n${$('notes').value}`],{type:'text/plain'}),'FrameLock_v1.3_Notes.txt');

const sleep=ms=>new Promise(r=>setTimeout(r,ms));function waitSeek(t){return new Promise(resolve=>{if(Math.abs(v.currentTime-t)<.005)return resolve();let done=()=>{v.removeEventListener('seeked',done);resolve()};v.addEventListener('seeked',done,{once:true});v.currentTime=t;setTimeout(done,1200)})}function waitFrame(){return new Promise(r=>{if(v.requestVideoFrameCallback)v.requestVideoFrameCallback(()=>r());else setTimeout(r,20)})}
$('stop').onclick=()=>{stopRequested=true};$('export').onclick=async()=>{if(trimJob||loading)return;if(!sourceReady()||!fps)return alert('Load an MP4 with detectable FPS first.');if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)return alert('This browser does not support rendering. Save notes instead.');if(meta.variable)return alert('Variable-frame timing detected. Use saved notes for accurate external export.');if(!edits.length)return alert('Add an insertion first.');stopReverse();selectedFrame=null;let c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;let g=c.getContext('2d'),stream=c.captureStream(0),track=stream.getVideoTracks()[0];let ac=new AudioContext(),dest=ac.createMediaStreamDestination(),media=ac.createMediaElementSource(v);media.connect(dest);media.connect(ac.destination);let combined=new MediaStream([track,...dest.stream.getAudioTracks()]);let mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime)return alert('WebM encoding unsupported');let chunks=[];rec=new MediaRecorder(combined,{mimeType:mime});rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=()=>{if(chunks.length)download(new Blob(chunks,{type:mime}),$('filename').value.replace(/\.mp4$/i,'.webm'));$('status').textContent=stopRequested?'Render stopped; partial export may be incomplete':'Export complete — verify audio and timing';$('export').disabled=false;$('stop').disabled=true;v.pause();ac.close();updateTrim()};stopRequested=false;$('export').disabled=true;$('stop').disabled=false;updateTrim();$('status').textContent='Rendering in real time. Keep this tab open.';v.pause();await ac.resume();rec.start();let n=Math.floor(v.duration*fps),insertMap=new Map();for(const e of edits){let list=insertMap.get(e.at)||[];list.push(e);insertMap.set(e.at,list)}let rendered=0;for(let i=0;i<=n&&!stopRequested;i++){let ins=insertMap.get(i)||[];for(const e of ins){v.pause();for(let j=0;j<e.count&&!stopRequested;j++){g.clearRect(0,0,c.width,c.height);if(e.kind!=='transparent'){g.fillStyle=e.kind==='green'?'#00ff00':'#000000';g.fillRect(0,0,c.width,c.height)}else{g.fillStyle='#000';g.fillRect(0,0,c.width,c.height)}track.requestFrame?.();await sleep(1000/fps);rendered++}}if(i===n)break;await waitSeek(i/fps);await waitFrame();g.drawImage(v,0,0,c.width,c.height);track.requestFrame?.();await sleep(1000/fps);rendered++;if(i%30===0)$('status').textContent=`Rendering ${Math.round(i/n*100)}% · ${rendered} output frames`; }rec.stop()};

async function openLinkedSource() {
  const params = new URLSearchParams(location.search);
  if (!params.has('src')) return;
  const token = loadEpoch;
  try {
    const link = new URL(params.get('src'));
    if (link.protocol !== 'https:') throw Error('Only HTTPS video links are supported.');
    $('meta').textContent = 'Loading linked review video…';
    const response = await fetch(link.href);
    if (!response.ok) throw Error('Video request failed (' + response.status + ').');
    const blob = await response.blob();
    if (token === loadEpoch) await loadSource(new File([blob], params.get('name') || 'Linked_review.mp4', {type: blob.type || 'video/mp4'}));
  } catch (error) {
    if (token === loadEpoch) $('meta').textContent = 'Could not load linked video. ' + error.message;
  }
}
window.toolsHubState = () => ({
  tool: 'FrameLock with AnchorLock',
  version: '1.4.1+hub.2',
  source: source?.name ?? null,
  fps,
  frame: frame(),
  time: cursorTime(),
  trim: {...trimRange(), inFrame: trimIn, outFrame: trimOut, outExclusive: true},
  edits: structuredClone(edits),
  notes: $('notes').value,
});

refreshSource();
void openLinkedSource();
