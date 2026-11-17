export function validClipGain(gain) {
 return Number.isFinite(gain) && gain >= 0 && gain <= 1;
}

export function mountClipAudio(section, {prefix, read, write}) {
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
  summary.textContent = 'Audio · ' + (unavailable ? 'No audio track' : audible ? percent(volume) + '%' : 'No sound');
  controls.hidden = unavailable;
  off.setAttribute('aria-pressed', String(!audible));
  on.setAttribute('aria-pressed', String(audible));
  slider.value = level.value = percent(volume);
  for (const item of [off, on, slider, level, down, up]) item.disabled = !state?.editable || unavailable;
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
export function mixClipAudio(context, buffer, {start, end, rate, volume}, from, to) {
 const at = Math.max(from, start);
 const stop = Math.min(to, end, start + buffer.duration / rate);
 if (stop <= at || volume <= 0) return;
 const node = context.createBufferSource();
 const gain = context.createGain();
 node.buffer = buffer;
 node.playbackRate.value = rate;
 gain.gain.value = volume;
 node.connect(gain).connect(context.destination);
 node.start(at - from, (at - start) * rate);
 node.stop(stop - from);
}
