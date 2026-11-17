export function validClipGain(gain) {
 return Number.isFinite(gain) && gain >= 0 && gain <= 1;
}

export function savedFades(settings) {
 const fades = {};
 for (const key of ['fadeIn', 'fadeOut']) {
  if (Number.isFinite(settings?.[key]) && settings[key] > 0) fades[key] = settings[key];
 }
 return fades;
}

function fadeLengths(settings, length) {
 return [Math.min(settings.fadeIn || 0, length), Math.min(settings.fadeOut || 0, length)];
}

export function fadeGainAt(settings, start, end, at) {
 const [fadeIn, fadeOut] = fadeLengths(settings, Math.max(0, end - start));
 const incoming = fadeIn ? (at - start) / fadeIn : 1;
 const outgoing = fadeOut ? (end - at) / fadeOut : 1;
 return Math.max(0, Math.min(1, incoming, outgoing));
}

export function scheduleClipGain(gain, settings, start, end, from, to, anchor = 0) {
 const [fadeIn, fadeOut] = fadeLengths(settings, Math.max(0, end - start));
 const levelAt = time => settings.volume * fadeGainAt(settings, start, end, time);
 gain.setValueAtTime(levelAt(from), anchor);
 if (!fadeIn && !fadeOut) return;
 const length = end - start;
 const corners = fadeIn + fadeOut > length
  ? [start + length * (fadeIn / (fadeIn + fadeOut))]
  : [start + fadeIn, end - fadeOut];
 let last = from;
 for (const time of [...corners, to]) {
  if (time <= last || time > to) continue;
  gain.linearRampToValueAtTime(levelAt(time), anchor + (time - from));
  last = time;
 }
}

export function mountAudioFades(container, {prefix, read, write}) {
 const row = document.createElement('div');
 row.className = 'gs-audio-fades';
 row.innerHTML = `
  <label>Fade in <small></small><input id="${prefix}FadeIn" type="number" inputmode="decimal" min="0" value="0"></label>
  <label>Fade out <small></small><input id="${prefix}FadeOut" type="number" inputmode="decimal" min="0" value="0"></label>`;
 container.append(row);
 const fields = [...row.querySelectorAll('input')];
 const keys = ['fadeIn','fadeOut'];
 function refresh() {
  const state = read();
  const fps = state?.fps || 1;
  const limit = Math.max(0, state?.duration || 0);
  const parts = fadeLengths(state || {}, limit);
  fields.forEach((input, index) => {
   const digits = state?.fps ? 0 : 3;
   input.step = state?.fps ? '1' : '.001';
   input.max = Number((limit * fps).toFixed(digits));
   input.value = Number((parts[index] * fps).toFixed(digits));
   input.disabled = !state?.editable || limit === 0 || state.hasAudio === false;
   input.previousElementSibling.textContent = state?.fps ? '(frames)' : '(sec)';
  });
 }
 fields.forEach((input, index) => {
  input.onchange = () => {
   const state = read();
   const value = input.valueAsNumber;
   const fps = state?.fps || 1;
   if (state?.editable && state.duration > 0 && state.hasAudio !== false && Number.isFinite(value) && value >= 0) {
    const time = (state.fps ? Math.round(value) : value) / fps;
    write({[keys[index]]: Math.min(time, state.duration)});
   }
   refresh();
  };
 });
 return refresh;
}

export function mountClipAudio(section, {prefix, read, write, label = 'Audio'}) {
 const summary = section.querySelector('summary');
 const controls = document.createElement('div');
 controls.className = 'gs-clip-audio-controls';
 controls.innerHTML = `
  <div class="gs-clip-audio-modes" role="group" aria-label="Clip sound">
   <button type="button" data-sound="off" aria-pressed="true">No sound</button>
   <button type="button" data-sound="on" aria-pressed="false">Sound on</button>
  </div>
  <label class="gs-clip-audio-slider" for="${prefix}VolumeSlider">Volume
   <input id="${prefix}VolumeSlider" type="range" min="0" max="100" step="0.1" value="0" data-gs-continuous>
  </label>
  <div class="gs-clip-audio-level">
   <button id="${prefix}VolumeDown" type="button" aria-label="Lower clip audio by 5 percent">−5%</button>
   <input id="${prefix}Volume" type="number" min="0" max="100" step="0.1" inputmode="decimal" aria-label="Clip audio percent">
   <button id="${prefix}VolumeUp" type="button" aria-label="Raise clip audio by 5 percent">+5%</button>
  </div>`;
 summary.after(controls);
 const refreshFades = mountAudioFades(controls, {prefix, read, write});
 const off = controls.querySelector('[data-sound="off"]');
 const on = controls.querySelector('[data-sound="on"]');
 const slider = controls.querySelector('input[type="range"]');
 const level = controls.querySelector('input[type="number"]');
 const down = controls.querySelector('#' + prefix + 'VolumeDown');
 const up = controls.querySelector('#' + prefix + 'VolumeUp');
 const percent = volume => Math.round(volume * 1000) / 10;

 function refresh() {
  const state = read();
  section.hidden = !state;
  const unavailable = state?.hasAudio === false;
  const volume = state?.volume ?? 0;
  const audible = volume > 0 && !unavailable;
  summary.textContent = label + ' · ' + (unavailable ? 'No audio track' : audible ? percent(volume) + '%' : 'No sound');
  controls.hidden = unavailable;
  off.setAttribute('aria-pressed', String(!audible));
  on.setAttribute('aria-pressed', String(audible));
  slider.value = level.value = percent(volume);
  for (const item of [off, on, slider, level, down, up]) item.disabled = !state?.editable || unavailable;
  refreshFades();
 }

 function setVolume(volume) {
  const state = read();
  if (state?.editable && state.hasAudio !== false && validClipGain(volume) && volume !== state.volume) {
   const previousVolume = volume || state.volume || state.previousVolume;
   write({volume, previousVolume});
  }
  refresh();
 }

 off.onclick = () => setVolume(0);
 on.onclick = () => {
  const state = read();
  setVolume(state?.volume || state?.previousVolume || 1);
 };
 slider.oninput = () => { level.value = slider.value; };
 slider.onchange = () => setVolume(slider.valueAsNumber / 100);
 level.onchange = () => setVolume(level.valueAsNumber / 100);
 down.onclick = () => setVolume(Math.max(0, percent(read().volume) - 5) / 100);
 up.onclick = () => setVolume(Math.min(100, percent(read().volume) + 5) / 100);
 return refresh;
}

// A buffer starts at the insertion's source IN. Schedule only its portion of this mix block.
export function mixClipAudio(context, buffer, settings, from, to) {
 const {start, end, rate, volume} = settings;
 const at = Math.max(from, start);
 const stop = Math.min(to, end, start + buffer.duration / rate);
 if (stop <= at || volume <= 0) return;
 const node = context.createBufferSource();
 const gain = context.createGain();
 node.buffer = buffer;
 node.playbackRate.value = rate;
 scheduleClipGain(gain.gain, settings, start, end, at, stop, at - from);
 node.connect(gain).connect(context.destination);
 node.start(at - from, (at - start) * rate);
 node.stop(stop - from);
}
