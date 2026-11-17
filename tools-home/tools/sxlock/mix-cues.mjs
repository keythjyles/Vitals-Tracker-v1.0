const channels = ['bed', 'effects'];
const isLevel = value => Number.isFinite(value) && value >= 0 && value <= 100;
const isTime = value => Number.isFinite(value) && value >= 0;

export function normalizeMixCues(saved) {
 if (!Array.isArray(saved)) return [];
 const byId = new Map();
 for (const cue of saved) {
  if (typeof cue?.id === 'string' && isTime(cue.start)) byId.set(cue.id, cue);
 }
 const rows = [], positions = new Map();
 for (const cue of byId.values()) {
  const row = {id:cue.id, start:cue.start, transition:isTime(cue.transition) ? cue.transition : 0};
  const at = positions.get(row.start) || {};
  for (const channel of channels) {
   if (!isLevel(cue[channel])) continue;
   if (at[channel]) delete at[channel][channel];
   row[channel] = cue[channel];
   at[channel] = row;
  }
  positions.set(row.start, at);
  rows.push(row);
 }
 return rows.filter(row => channels.some(channel => row[channel] !== undefined)).sort((a,b) => a.start - b.start);
}

function rampLevel({start, transition, from, target}, time) {
 if (!transition || time >= start + transition) return target;
 return from + (target - from) * (time - start) / transition;
}

export function mixCurve(cues, channel, base) {
 const curve = [{start:0, transition:0, target:base}];
 for (const cue of cues) {
  if (cue[channel] === undefined) continue;
  curve.push({
   start:cue.start, transition:cue.transition,
   from:rampLevel(curve.at(-1), cue.start), target:cue[channel] / 100,
  });
 }
 return curve;
}

export function mixLevelAt(curve, time) {
 return rampLevel(curve.findLast(point => point.start <= time) || curve[0], time);
}

export function scheduleMixGain(gain, curve, from, to, anchor = 0) {
 gain.setValueAtTime(mixLevelAt(curve, from), anchor);
 for (const [i, point] of curve.entries()) {
  if (point.start > to) break;
  if (point.start > from) {
   gain.setValueAtTime(rampLevel(point, point.start), anchor + (point.start - from));
  }
  const end = Math.min(to, point.start + point.transition, curve[i + 1]?.start ?? Infinity);
  if (end > Math.max(from, point.start)) {
   gain.linearRampToValueAtTime(rampLevel(point, end), anchor + (end - from));
  }
 }
}

export function mountMixCues({read, write, playhead, duration, fps, seek, editable, id}) {
 const $ = name => document.getElementById(name);
 const form = $('mixCueEditor'), position = $('mixCuePosition'), transition = $('mixCueTransition');
 const levels = {bed:$('mixCueBed'), effects:$('mixCueEffects')};
 const list = $('mixCueList'), status = $('mixCueStatus');
 let editing = null;
 const amount = (seconds, rate) => rate ? Math.round(seconds * rate) : Number(seconds.toFixed(3));
 const point = seconds => fps() ? 'F' + amount(seconds, fps()) : seconds.toFixed(3) + ' s';
 const span = seconds => seconds ? amount(seconds,fps()) + (fps() ? ' frames' : ' s') : 'Instant';
 function close() {
  form.hidden = true;
  editing = null;
  status.textContent = '';
 }
 function open(cue) {
  if (!editable()) return;
  const rate = fps();
  editing = cue?.id || null;
  const unit = rate ? 'frames' : 'seconds';
  $('mixCuePositionUnit').textContent = unit;
  $('mixCueTransitionUnit').textContent = unit;
  position.step = transition.step = rate ? '1' : '.001';
  position.value = amount(cue?.start ?? playhead(),rate);
  transition.value = amount(cue?.transition ?? 0,rate);
  for (const channel of channels) levels[channel].value = cue?.[channel] ?? '';
  status.textContent = '';
  form.hidden = false;
  position.focus();
 }
 function button(label, action, accessible) {
  const control = document.createElement('button');
  control.type = 'button';
  control.textContent = label;
  control.setAttribute('aria-label', accessible);
  control.onclick = () => { if (editable()) action(); };
  return control;
 }
 function render() {
  list.replaceChildren();
  $('mixCueEmpty').hidden = read().length > 0;
  for (const cue of read()) {
   const row = document.createElement('div');
   row.className = 'mix-cue-row';
   const name = point(cue.start);
   const label = document.createElement('span');
   label.textContent = [name,
    cue.bed === undefined ? '' : 'Video ' + cue.bed + '%',
    cue.effects === undefined ? '' : 'Effects ' + cue.effects + '%',
    span(cue.transition),
   ].filter(Boolean).join(' · ');
   const actions = document.createElement('div');
   actions.append(
    button('Go', () => seek(cue.start), 'Go to cue at ' + name),
    button('Edit', () => open(cue), 'Edit cue at ' + name),
    button('Remove', () => {
     if (editing === cue.id) close();
     write(read().filter(item => item.id !== cue.id));
     render();
    }, 'Remove cue at ' + name),
   );
   row.append(label, actions);
   list.append(row);
  }
 }
 $('addMixCue').onclick = () => open();
 $('cancelMixCue').onclick = close;
 form.onsubmit = event => {
  event.preventDefault();
  if (!editable()) return;
  const rate = fps() || 1;
  const start = position.valueAsNumber / rate;
  const length = transition.valueAsNumber / rate;
  if (!isTime(start) || start > duration() + .0005 || !isTime(length)) {
   status.textContent = 'Choose a position within the timeline and a duration of zero or more.';
   return;
  }
  const cue = {id:editing || id(), start:Math.min(start, duration()), transition:length};
  for (const channel of channels) {
   if (isLevel(levels[channel].valueAsNumber)) cue[channel] = levels[channel].valueAsNumber;
  }
  if (!channels.some(channel => cue[channel] !== undefined)) {
   status.textContent = 'Set a Video audio or Effects level.';
   return;
  }
  write(normalizeMixCues([...read().filter(item => item.id !== editing),cue]));
  close();
  render();
 };
 render();
 return {close,render};
}
