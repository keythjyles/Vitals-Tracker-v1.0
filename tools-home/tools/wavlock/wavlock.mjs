import '../../shared/compact-player.mjs?v=34';
import {formatFrameTime} from '../../shared/frame-stamp.mjs?v=1';
import {mountPlayerScribe} from '../../shared/player-scribe.mjs?v=35';

const $ = id => document.getElementById(id);
const audio = $('audio');
const canvas = $('wave');
const drawing = canvas.getContext('2d');
const fileInput = $('file');
const source = $('source');
const status = text => { $('status').textContent = text; };
const stamp = seconds => formatFrameTime(seconds).padStart(9, '0');
const clipName = () => ($('name').value.trim().replace(/\.wav$/i, '') || 'wavlock_cut').replace(/[^\w-]/g, '_');

let buffer, context, sourceName, peaks, objectURL, stopAt;
let loadRequest = 0;

function pause() {
  audio.pause();
  stopAt = null;
}

function setRange(start, end) {
  $('in').value = start.toFixed(3);
  $('out').value = end.toFixed(3);
}

function range() {
  if (!buffer) return null;
  const start = $('in').valueAsNumber;
  const out = $('out').valueAsNumber;
  const end = out === Number(buffer.duration.toFixed(3)) ? buffer.duration : Math.min(out, buffer.duration);
  return start >= 0 && end > start ? {start, end} : null;
}

function waveform(decoded) {
  const samples = decoded.getChannelData(0);
  const totals = new Float32Array(canvas.width);
  for (let column = 0; column < totals.length; column++) {
    const start = Math.floor(column * samples.length / totals.length);
    const end = Math.floor((column + 1) * samples.length / totals.length);
    const step = Math.max(1, Math.floor((end - start) / 24));
    for (let sample = start; sample < end; sample += step) {
      totals[column] = Math.max(totals[column], Math.abs(samples[sample]));
    }
  }
  return totals;
}

function render() {
  if (buffer) {
    if (stopAt != null && audio.currentTime >= stopAt) pause();
    const {width, height} = canvas;
    const selected = range();
    drawing.clearRect(0, 0, width, height);
    for (let x = 0; x < width; x++) {
      const time = x * buffer.duration / width;
      const bar = Math.max(1, peaks[x] * height * .9);
      drawing.fillStyle = selected && time >= selected.start && time < selected.end ? '#ffae59' : '#649bd1';
      drawing.fillRect(x, (height - bar) / 2, 1, bar);
    }
    drawing.fillStyle = 'white';
    drawing.fillRect(Math.min(width - 3, audio.currentTime / buffer.duration * width), 0, 3, height);
    $('clock').textContent = stamp(audio.currentTime) + ' / ' + stamp(buffer.duration);
  }
  requestAnimationFrame(render);
}

async function openAudio(getFile) {
  const request = ++loadRequest;
  stopApprovedPreview();
  pause();
  status('Opening audio…');
  try {
    const file = await getFile();
    if (request !== loadRequest) return false;
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    if (request !== loadRequest) return false;

    const nextURL = URL.createObjectURL(file);
    const previousURL = objectURL;
    objectURL = nextURL;
    buffer = decoded;
    peaks = waveform(decoded);
    sourceName = file.name;
    audio.src = objectURL;
    if (previousURL) URL.revokeObjectURL(previousURL);
    setRange(0, buffer.duration);
    source.textContent = file.name + ' · ' + stamp(buffer.duration) + ' · ' + buffer.sampleRate + ' Hz';
    source.dataset.expected = file.name;
    $('name').value = file.name.replace(/\.[^.]+$/, '').replace(/[^\w-]/g, '_') + '_CUT_v01';
    status('');
    return true;
  } catch (error) {
    if (request === loadRequest) status('Could not open audio. ' + error.message);
    return false;
  }
}

$('openAudio').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (file) void openAudio(() => file);
});

$('start').onclick = () => {
  if (!buffer) return;
  stopApprovedPreview();
  pause();
  audio.currentTime = 0;
};
$('play').onclick = () => {
  if (!buffer) return;
  stopApprovedPreview();
  stopAt = null;
  if (audio.paused) void audio.play().catch(error => status(error.message));
  else pause();
};
$('prev').onclick = () => { if (buffer) audio.currentTime = Math.max(0, audio.currentTime - .1); };
$('next').onclick = () => { if (buffer) audio.currentTime = Math.min(buffer.duration, audio.currentTime + .1); };
$('markIn').onclick = () => { if (buffer) $('in').value = audio.currentTime.toFixed(3); };
$('markOut').onclick = () => { if (buffer) $('out').value = audio.currentTime.toFixed(3); };
function goTo(field) {
  const time = $(field).valueAsNumber;
  if (buffer && Number.isFinite(time)) audio.currentTime = Math.max(0, Math.min(buffer.duration, time));
}
$('goIn').onclick = () => goTo('in');
$('goOut').onclick = () => goTo('out');

$('preview').onclick = () => {
  if (!buffer) return status('Open an audio file first.');
  const selected = range();
  if (!selected) return status('OUT must be after IN.');
  stopApprovedPreview();
  audio.currentTime = selected.start;
  stopAt = selected.end;
  void audio.play().catch(error => {
    stopAt = null;
    status(error.message);
  });
};
$('clearSelection').onclick = () => {
  if (!buffer) return;
  pause();
  setRange(0, buffer.duration);
  status('Entire source selected.');
};
$('reset').onclick = () => {
  loadRequest++;
  pause();
  stopApprovedPreview();
  buffer = null;
  sourceName = '';
  audio.removeAttribute('src');
  audio.load();
  if (objectURL) URL.revokeObjectURL(objectURL);
  objectURL = null;
  setRange(0, 0);
  source.textContent = 'No audio loaded.';
  delete source.dataset.expected;
  $('name').value = '';
  $('clock').textContent = '00:00.000 / 00:00.000';
  drawing.clearRect(0, 0, canvas.width, canvas.height);
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

$('export').onclick = () => {
  if (!buffer) return status('Open an audio file first.');
  const selected = range();
  if (!selected) return status('OUT must be after IN.');
  try {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(encodeWav(buffer, selected));
    link.download = clipName() + '.wav';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 30000);
    status('Downloaded ' + link.download + ' (' + (selected.end - selected.start).toFixed(3) + ' s).');
  } catch (error) {
    status('Could not save WAV. ' + error.message);
  }
};

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

const audioMark = /^\[Audio (\d+:\d\d\.\d{3})(?: \| IN (\d+:\d\d\.\d{3}) \| OUT (\d+:\d\d\.\d{3}) \| ([\w-]+))?\]/gm;
function seconds(value) {
  const [minutes, rest] = value.split(':').map(Number);
  return minutes * 60 + rest;
}

mountPlayerScribe($('audioActions'), {
  tool: 'wavlock',
  media: audio,
  section: $('editorScribe'),
  source: () => sourceName,
  sourceElement: source,
  pauseEditor: pause,
  markLabel: 'Mark time',
  missingPosition: 'Open an audio file to mark a time.',
  getPosition: () => buffer ? {time: audio.currentTime, selection: range()} : null,
  formatMark({time, selection}) {
    const at = stamp(time);
    const hasCut = selection && (selection.start > 0 || selection.end < buffer.duration);
    const cut = hasCut ? ' | IN ' + stamp(selection.start) + ' | OUT ' + stamp(selection.end) + ' | ' + clipName() : '';
    return {text: '[Audio ' + at + cut + '] ', confirmation: 'Marked ' + at + '.'};
  },
  restoreMark(entry) {
    if (!buffer || entry.video !== sourceName) return;
    const found = [...entry.text.matchAll(audioMark)].at(-1);
    if (!found) return;
    const [, time, start, end, name] = found;
    pause();
    audio.currentTime = Math.min(buffer.duration, seconds(time));
    if (!start || seconds(end) <= seconds(start) || seconds(end) > buffer.duration + .001) {
      return 'Note and audio time restored.';
    }
    setRange(seconds(start), Math.min(buffer.duration, seconds(end)));
    $('name').value = name;
    return 'Note and clip range restored.';
  }
});
$('audioEditor').remove();
render();
