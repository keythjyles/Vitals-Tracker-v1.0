import {formatFrameTime} from '../../shared/frame-stamp.mjs?v=1';
import {mountPlayerScribe} from '../../shared/player-scribe.mjs?v=35';
import {mountWaveform} from './waveform.mjs?v=1.8';
import {listClips, readSource, renameClip, saveClip} from './saved-clips.mjs?v=1.8';

const $ = id => document.getElementById(id);
const audio = $('audio');
const fileInput = $('file');
const source = $('source');
const status = text => { $('status').textContent = text; };
const clipStatus = text => { $('clipStatus').textContent = text; };
const stamp = seconds => formatFrameTime(seconds).padStart(9, '0');
const safeName = name => name.replace(/[^\w-]/g, '_') || 'wavlock_cut';
const nameField = $('name');
const clipList = $('clipList');
const saveButton = $('export');

let buffer, context, currentSource, objectURL, stopAt;
let editingId, playingId, playFrame;
let loadRequest = 0;
const clips = new Map(), volatileClips = new Set(), sessionSources = new Map();
const wave = mountWaveform({
  view: $('waveView'),
  canvas: $('wave'),
  selection: $('waveSelection'),
  playhead: $('wavePlayhead'),
  axis: $('waveAxis'),
  fromLabel: $('waveFrom'),
  toLabel: $('waveTo'),
  formatTime: stamp,
  seek: time => seekTo(time),
});

function pause() {
  stopAt = null;
  playingId = null;
  audio.pause();
  updatePlayback();
}

function seekTo(time, reveal = false) {
  if (!buffer || !Number.isFinite(time)) return;
  const position = Math.max(0, Math.min(time, buffer.duration));
  audio.currentTime = position;
  if (reveal) wave.reveal(position);
}

function range() {
  if (!buffer) return null;
  const start = $('in').valueAsNumber;
  const out = $('out').valueAsNumber;
  const end = out === Number(buffer.duration.toFixed(3)) ? buffer.duration : Math.min(out, buffer.duration);
  return start >= 0 && end > start ? {start, end} : null;
}

function setRange(start, end) {
  $('in').value = start.toFixed(3);
  $('out').value = end.toFixed(3);
  wave.setSelection(range());
}

function markBound(field) {
  if (!buffer) return;
  $(field).value = audio.currentTime.toFixed(3);
  wave.setSelection(range());
}
for (const field of ['in', 'out']) $(field).addEventListener('input', () => wave.setSelection(range()));

function updatePlayback() {
  $('play').textContent = audio.paused ? 'Play' : 'Pause';
  for (const button of clipList.querySelectorAll('[data-play-cut]')) {
    button.textContent = button.dataset.playCut === playingId && !audio.paused ? 'Pause' : 'Play';
  }
}

function updateClock() {
  if (!buffer) return;
  if (stopAt != null && audio.currentTime >= stopAt) {
    const end = stopAt;
    pause();
    seekTo(end);
  }
  wave.setTime(audio.currentTime);
  const text = stamp(audio.currentTime) + ' / ' + stamp(buffer.duration);
  if ($('clock').textContent !== text) $('clock').textContent = text;
}

function followPlayhead() {
  playFrame = null;
  updateClock();
  if (!audio.paused) playFrame = requestAnimationFrame(followPlayhead);
}
audio.addEventListener('play', () => {
  updatePlayback();
  if (playFrame == null) playFrame = requestAnimationFrame(followPlayhead);
});
for (const event of ['pause', 'ended']) audio.addEventListener(event, () => {
  if (!audio.paused && event === 'pause') return;
  playingId = null;
  stopAt = null;
  updatePlayback();
  updateClock();
});
for (const event of ['timeupdate', 'seeking', 'loadedmetadata']) audio.addEventListener(event, updateClock);

const grip = $('fileGrip');
const drawer = $('audioPicker');

function showPicker(open) {
  drawer.hidden = !open;
  grip.setAttribute('aria-expanded', String(open));
  grip.setAttribute('aria-label', open ? 'Hide file picker' : 'Show file picker');
  grip.textContent = open ? '⌃' : '⌄';
  if (open) pause();
}

let drawerDrag, movedGrip;
grip.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  drawerDrag = {id: event.pointerId, y: event.clientY};
  movedGrip = false;
  grip.setPointerCapture(event.pointerId);
});
grip.addEventListener('pointermove', event => {
  if (drawerDrag?.id !== event.pointerId || movedGrip) return;
  const distance = event.clientY - drawerDrag.y;
  if (Math.abs(distance) < 25) return;
  movedGrip = true;
  showPicker(distance > 0);
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) grip.addEventListener(event, () => { drawerDrag = null; });
grip.addEventListener('click', event => {
  if (!movedGrip || event.detail === 0) showPicker(drawer.hidden);
  movedGrip = false;
});
$('openAudio').addEventListener('click', () => fileInput.click());

function setEditing(id) {
  editingId = id;
  saveButton.textContent = id ? 'Update WAV' : 'Save WAV';
  for (const row of clipList.querySelectorAll('[data-cut-id]')) {
    const active = row.dataset.cutId === editingId;
    row.classList.toggle('is-editing', active);
    row.querySelector('.cut-name').setAttribute('aria-pressed', String(active));
  }
}

function defaultName() {
  const prefix = safeName(currentSource.name.replace(/\.[^.]+$/, '')) + '_CUT_v';
  const names = new Set([...clips.values()].filter(clip => clip.sourceId === currentSource.id).map(clip => clip.name));
  let number = 1;
  while (names.has(prefix + String(number).padStart(2, '0'))) number++;
  return prefix + String(number).padStart(2, '0');
}
const cutName = () => nameField.value.trim().replace(/\.wav$/i, '').trim() || defaultName();

async function openAudio(getFile, sourceId) {
  const request = ++loadRequest;
  stopApprovedPreview();
  pause();
  status('Opening audio…');
  try {
    const file = await getFile();
    if (request !== loadRequest) return false;
    const bytes = await file.arrayBuffer();
    const id = sourceId || await crypto.subtle.digest('SHA-256', bytes).then(hash => {
      const digest = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
      return digest + ':' + file.name;
    });
    if (request !== loadRequest) return false;
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await context.decodeAudioData(bytes);
    if (request !== loadRequest) return false;

    const nextURL = URL.createObjectURL(file);
    const previousURL = objectURL;
    objectURL = nextURL;
    buffer = decoded;
    currentSource = {id, name: file.name, file};
    audio.src = objectURL;
    if (previousURL) URL.revokeObjectURL(previousURL);
    wave.load(buffer);
    setRange(0, buffer.duration);
    setEditing(null);
    nameField.value = defaultName();
    source.textContent = file.name;
    source.title = file.name;
    $('openAudio').hidden = true;
    $('editControls').disabled = false;
    showPicker(false);
    updateClock();
    status('');
    return true;
  } catch (error) {
    if (request === loadRequest) status('Could not open audio. ' + error.message);
    return false;
  }
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (file) void openAudio(() => file);
});

function playAudio() {
  void audio.play().catch(error => {
    if (!audio.paused) return;
    const message = error.name === 'AbortError' ? '' : error.message;
    if (message) status(message);
    updatePlayback();
  });
}

function playRange(selection, clipId = null) {
  stopApprovedPreview();
  pause();
  wave.reveal(selection.start, selection.end);
  seekTo(selection.start);
  stopAt = selection.end;
  playingId = clipId;
  playAudio();
}

$('start').onclick = () => {
  stopApprovedPreview();
  pause();
  seekTo(0, true);
};
$('play').onclick = () => {
  stopApprovedPreview();
  if (!audio.paused) return pause();
  stopAt = null;
  playAudio();
};
$('prev').onclick = () => seekTo(audio.currentTime - .1, true);
$('next').onclick = () => seekTo(audio.currentTime + .1, true);
$('markIn').onclick = () => markBound('in');
$('markOut').onclick = () => markBound('out');
$('goIn').onclick = () => seekTo($('in').valueAsNumber, true);
$('goOut').onclick = () => seekTo($('out').valueAsNumber, true);
$('goTime').onclick = () => seekTo($('jumpTime').valueAsNumber, true);
$('jumpTime').addEventListener('keydown', event => {
  if (event.key === 'Enter') $('goTime').click();
});
$('preview').onclick = () => {
  const selection = range();
  if (selection) playRange(selection, editingId);
  else status('OUT must be after IN.');
};
$('fitWave').onclick = () => wave.fit();
$('clearSelection').onclick = () => {
  if (!buffer) return;
  pause();
  setEditing(null);
  setRange(0, buffer.duration);
  nameField.value = defaultName();
  status('');
};
$('reset').onclick = () => {
  loadRequest++;
  pause();
  stopApprovedPreview();
  buffer = currentSource = null;
  audio.removeAttribute('src');
  audio.load();
  if (objectURL) URL.revokeObjectURL(objectURL);
  objectURL = null;
  wave.load(null);
  setRange(0, 0);
  setEditing(null);
  source.textContent = 'No file loaded';
  source.removeAttribute('title');
  nameField.value = '';
  $('clock').textContent = '00:00.000 / 00:00.000';
  $('editControls').disabled = true;
  $('audioMore').open = false;
  $('openAudio').hidden = false;
  showPicker(false);
  status('');
};

function encodeWav(decoded, {start, end}) {
  const rate = decoded.sampleRate;
  const channels = Array.from({length: decoded.numberOfChannels}, (_, channel) => decoded.getChannelData(channel));
  const first = Math.floor(start * rate);
  const last = Math.min(decoded.length, Math.floor(end * rate));
  const dataSize = (last - first) * channels.length * 2;
  if (!dataSize) throw Error('The selected clip is shorter than one sample.');
  const data = new ArrayBuffer(44 + dataSize);
  const view = new DataView(data);
  let offset = 0;
  const str = text => { for (const letter of text) view.setUint8(offset++, letter.charCodeAt(0)); };
  const u16 = value => { view.setUint16(offset, value, true); offset += 2; };
  const u32 = value => { view.setUint32(offset, value, true); offset += 4; };
  str('RIFF'); u32(data.byteLength - 8);
  str('WAVEfmt '); u32(16); u16(1); u16(channels.length);
  u32(rate); u32(rate * channels.length * 2); u16(channels.length * 2); u16(16);
  str('data'); u32(dataSize);
  for (let sample = first; sample < last; sample++) {
    for (const channel of channels) {
      const value = Math.max(-1, Math.min(1, channel[sample]));
      view.setInt16(offset, value < 0 ? value * 32768 : value * 32767, true);
      offset += 2;
    }
  }
  return new Blob([data], {type: 'audio/wav'});
}

function downloadWav(blob, name) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = safeName(name) + '.wav';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 30000);
}

saveButton.onclick = async () => {
  const selection = range();
  if (!selection) return status('OUT must be after IN.');
  const name = cutName();
  const original = currentSource;
  const request = loadRequest;
  const same = editingId ? clips.get(editingId) : [...clips.values()].find(clip =>
    clip.sourceId === original.id && clip.name === name && clip.start === selection.start && clip.end === selection.end);
  const cut = {
    id: same?.id || crypto.randomUUID(), name, ...selection,
    sourceId: original.id, sourceName: original.name, createdAt: same?.createdAt || Date.now(),
  };
  saveButton.disabled = true;
  try {
    downloadWav(encodeWav(buffer, selection), name);
  } catch (error) {
    saveButton.disabled = false;
    status('Could not save WAV. ' + error.message);
    return;
  }
  try {
    await saveClip(cut, original);
    volatileClips.delete(cut.id);
    if (request === loadRequest) status('Saved ' + name + ' · ' + (cut.end - cut.start).toFixed(3) + ' s.');
  } catch {
    volatileClips.add(cut.id);
    sessionSources.set(original.id, original);
    if (request === loadRequest) status('WAV downloaded. This cut is available until the tab closes.');
  } finally {
    clips.set(cut.id, cut);
    renderClips();
    saveButton.disabled = false;
  }
};

async function loadClip(cut, play) {
  if (play && playingId === cut.id && !audio.paused) return pause();
  clipStatus('');
  if (currentSource?.id !== cut.sourceId) {
    const opened = await openAudio(async () => {
      const original = sessionSources.get(cut.sourceId) || await readSource(cut.sourceId);
      if (!original?.file) throw Error('Reopen ' + cut.sourceName + ' and try the cut again.');
      return new File([original.file], original.name, {type: original.file.type});
    }, cut.sourceId);
    if (!opened) return clipStatus($('status').textContent);
  } else {
    loadRequest++;
    pause();
    stopApprovedPreview();
  }
  setRange(cut.start, cut.end);
  nameField.value = cut.name;
  setEditing(cut.id);
  const selection = range();
  if (!selection) return clipStatus('The cut is outside this source.');
  wave.reveal(selection.start, selection.end);
  seekTo(selection.start);
  status('Editing ' + cut.name + '.');
  if (play) playRange(selection, cut.id);
}

function addRenameForm(row, cut) {
  const existing = row.querySelector('.cut-rename input');
  if (existing) return existing.focus();
  const form = document.createElement('form');
  form.className = 'cut-rename';
  const field = document.createElement('input');
  field.type = 'text';
  field.maxLength = 120;
  field.value = cut.name;
  field.setAttribute('aria-label', 'New clip name');
  const apply = document.createElement('button');
  apply.textContent = 'Save name';
  apply.type = 'submit';
  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  cancel.type = 'button';
  cancel.onclick = () => form.remove();
  form.append(field, apply, cancel);
  form.onsubmit = async event => {
    event.preventDefault();
    const name = field.value.trim();
    if (!name) return clipStatus('Enter a clip name.');
    apply.disabled = true;
    try {
      const updated = volatileClips.has(cut.id) ? {...clips.get(cut.id), name} : await renameClip(cut.id, name);
      clips.set(cut.id, updated);
      if (editingId === cut.id) nameField.value = name;
      clipStatus('Renamed to ' + name + '.');
      renderClips();
    } catch (error) {
      clipStatus(error.message);
      apply.disabled = false;
    }
  };
  row.append(form);
  field.focus();
  field.select();
}

function renderClips() {
  clipList.replaceChildren();
  for (const cut of [...clips.values()].sort((a, b) => b.createdAt - a.createdAt)) {
    const row = document.createElement('li');
    row.className = 'saved-cut';
    row.dataset.cutId = cut.id;
    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'cut-name';
    name.textContent = cut.name;
    name.setAttribute('aria-label', 'Edit ' + cut.name);
    name.title = cut.sourceName;
    name.onclick = () => void loadClip(cut, false);
    const bounds = document.createElement('span');
    bounds.className = 'cut-range';
    bounds.textContent = stamp(cut.start) + ' – ' + stamp(cut.end);
    name.append(bounds);
    const play = document.createElement('button');
    play.type = 'button';
    play.textContent = 'Play';
    play.dataset.playCut = cut.id;
    play.setAttribute('aria-label', 'Play or pause ' + cut.name);
    play.onclick = () => void loadClip(cut, true);
    const rename = document.createElement('button');
    rename.type = 'button';
    rename.textContent = 'Rename';
    rename.setAttribute('aria-label', 'Rename ' + cut.name);
    rename.onclick = () => addRenameForm(row, cut);
    row.append(name, play, rename);
    clipList.append(row);
  }
  if (!clipList.children.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No saved clips yet.';
    clipList.append(empty);
  }
  setEditing(editingId);
  updatePlayback();
}

renderClips();
void listClips().then(records => {
  for (const record of records) if (!clips.has(record.id)) clips.set(record.id, record);
  renderClips();
}).catch(() => clipStatus('Saved clips on this device could not be opened.'));

let approvedEntries = [];
let approvedPreview, approvedURL;
let previewRequest = 0;
const effects = $('wavlockEffects');
const approvedStatus = text => { $('approvedStatus').textContent = text; };

function stopApprovedPreview() {
  previewRequest++;
  approvedPreview?.pause();
  approvedPreview = null;
  if (approvedURL) URL.revokeObjectURL(approvedURL);
  approvedURL = null;
}

function renderApproved() {
  const host = $('approvedList');
  const query = $('approvedSearch').value.toLowerCase().trim();
  $('approvedCount').textContent = '· ' + approvedEntries.length;
  $('approvedCount').hidden = false;
  host.replaceChildren();
  for (const item of approvedEntries.filter(entry => entry.name.toLowerCase().includes(query))) {
    const row = document.createElement('div');
    row.className = 'approved-row';
    const name = document.createElement('span');
    name.textContent = item.name;
    const preview = document.createElement('button');
    preview.type = 'button';
    preview.textContent = '▶';
    preview.setAttribute('aria-label', 'Preview approved ' + item.name);
    preview.onclick = async () => {
      stopApprovedPreview();
      pause();
      const request = previewRequest;
      try {
        const blob = await window.GSApprovedEffects.blob(item);
        if (request !== previewRequest) return;
        approvedURL = URL.createObjectURL(blob);
        approvedPreview = new Audio(approvedURL);
        await approvedPreview.play();
        if (request === previewRequest) approvedStatus('Playing ' + item.name);
      } catch (error) {
        if (request === previewRequest) approvedStatus(error.message);
      }
    };
    const use = document.createElement('button');
    use.type = 'button';
    use.textContent = 'Use';
    use.setAttribute('aria-label', 'Use approved ' + item.name);
    use.onclick = async () => {
      use.disabled = true;
      try {
        const loaded = await openAudio(async () => {
          const blob = await window.GSApprovedEffects.blob(item);
          return new File([blob], item.name, {type: blob.type || 'audio/wav'});
        });
        if (loaded) effects.open = false;
      } finally {
        use.disabled = false;
      }
    };
    row.append(name, preview, use);
    host.append(row);
  }
  if (!host.children.length) host.textContent = approvedEntries.length ? 'No matching approved effects.' : 'No approved effects yet.';
}

let effectsStarted = false;
effects.addEventListener('toggle', async () => {
  if (!effects.open) {
    stopApprovedPreview();
    return;
  }
  if (effectsStarted) {
    renderApproved();
    return;
  }
  effectsStarted = true;
  approvedStatus('Loading approved effects…');
  try {
    await import('../../shared/approved-effects.js?v=3');
    window.GSApprovedEffects.subscribe(entries => {
      approvedEntries = entries;
      if (effects.open) renderApproved();
    });
    approvedStatus('');
  } catch (error) {
    effectsStarted = false;
    approvedStatus('Approved effects could not load. Close and reopen to retry.');
  }
});
$('approvedSearch').oninput = renderApproved;
document.addEventListener('visibilitychange', () => { if (document.hidden) stopApprovedPreview(); });

const audioMark = /^\[Audio (\d+:\d\d\.\d{3})(?: \| IN (\d+:\d\d\.\d{3}) \| OUT (\d+:\d\d\.\d{3}) \| ([^\]\r\n]+))?\]/gm;
function seconds(value) {
  const [minutes, rest] = value.split(':').map(Number);
  return minutes * 60 + rest;
}

mountPlayerScribe($('scribeActions'), {
  tool: 'wavlock',
  media: audio,
  section: $('editorScribe'),
  source: () => currentSource?.name,
  sourceElement: source,
  pauseEditor: pause,
  markLabel: 'Mark time',
  missingPosition: 'Open an audio file to mark a time.',
  getPosition: () => buffer ? {time: audio.currentTime, selection: range()} : null,
  formatMark({time, selection}) {
    const at = stamp(time);
    const hasCut = selection && (selection.start > 0 || selection.end < buffer.duration);
    const name = cutName().replace(/[\[\]\r\n]/g, ' ');
    const cut = hasCut ? ' | IN ' + stamp(selection.start) + ' | OUT ' + stamp(selection.end) + ' | ' + name : '';
    return {text: '[Audio ' + at + cut + '] ', confirmation: 'Marked ' + at + '.'};
  },
  restoreMark(entry) {
    if (!buffer || entry.video !== currentSource.name) return;
    const found = [...entry.text.matchAll(audioMark)].at(-1);
    if (!found) return;
    const [, time, start, end, name] = found;
    pause();
    setEditing(null);
    seekTo(seconds(time), true);
    if (!start || seconds(end) <= seconds(start) || seconds(end) > buffer.duration + .001) {
      return 'Note and audio time restored.';
    }
    setRange(seconds(start), Math.min(buffer.duration, seconds(end)));
    nameField.value = name;
    wave.reveal(seconds(start), Math.min(buffer.duration, seconds(end)));
    return 'Note and clip range restored.';
  }
});
