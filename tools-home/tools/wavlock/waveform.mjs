const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const blockSize = 256;

function envelope(samples) {
  const blocks = new Float32Array(Math.ceil(samples.length / blockSize));
  for (let i = 0; i < samples.length; i++) {
    const block = Math.floor(i / blockSize);
    blocks[block] = Math.max(blocks[block], Math.abs(samples[i]));
  }
  return blocks;
}

function peakBetween(samples, blocks, start, end) {
  let peak = 0;
  while (start < end && start % blockSize) peak = Math.max(peak, Math.abs(samples[start++]));
  while (start + blockSize <= end) {
    peak = Math.max(peak, blocks[start / blockSize]);
    start += blockSize;
  }
  while (start < end) peak = Math.max(peak, Math.abs(samples[start++]));
  return peak;
}

export function mountWaveform({view, canvas, selection: selectionBand, playhead, axis, fromLabel, toLabel, formatTime, seek}) {
  const drawing = canvas.getContext('2d');
  let samples, blocks, rate;
  let duration = 0, start = 0, span = 0, time = 0, selection;
  let redraw = 0;
  const pointers = new Map();
  let pinch, drag;

  function draw() {
    redraw = 0;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(view.clientWidth * scale));
    const height = Math.max(1, Math.round(view.clientHeight * scale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    drawing.clearRect(0, 0, width, height);
    if (!samples) return;

    drawing.fillStyle = '#649ed6';
    const firstSample = start * rate;
    const samplesPerColumn = span * rate / width;
    for (let x = 0; x < width; x++) {
      const first = Math.floor(firstSample + x * samplesPerColumn);
      const last = Math.min(samples.length, Math.ceil(firstSample + (x + 1) * samplesPerColumn));
      const peak = peakBetween(samples, blocks, first, last);
      const bar = Math.max(1, peak * height * .86);
      drawing.fillRect(x, (height - bar) / 2, 1, bar);
    }
  }

  function requestDraw() {
    if (!redraw) redraw = requestAnimationFrame(draw);
  }

  function updateOverlays() {
    const edge = start + span;
    const left = selection ? Math.max(start, selection.start) : edge;
    const right = selection ? Math.min(edge, selection.end) : start;
    selectionBand.hidden = !span || right <= left;
    if (!selectionBand.hidden) {
      selectionBand.style.left = ((left - start) / span * 100) + '%';
      selectionBand.style.width = ((right - left) / span * 100) + '%';
    }
    playhead.hidden = !span || time < start || time > edge;
    if (!playhead.hidden) {
      playhead.style.left = 'min(calc(100% - 2px), ' + ((time - start) / span * 100) + '%)';
    }
  }

  function setView(first, length) {
    span = duration ? clamp(length, Math.min(.2, duration), duration) : 0;
    start = clamp(first, 0, Math.max(0, duration - span));
    axis.hidden = !duration;
    fromLabel.textContent = formatTime(start);
    toLabel.textContent = formatTime(start + span);
    updateOverlays();
    requestDraw();
  }

  function fraction(clientX) {
    const rect = view.getBoundingClientRect();
    return clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
  }

  function pair() {
    const [a, b] = pointers.values();
    return {center: fraction((a.x + b.x) / 2), distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))};
  }

  view.addEventListener('pointerdown', event => {
    if (!duration || event.target.closest('button') || event.button !== 0 || pointers.size >= 2) return;
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    view.setPointerCapture(event.pointerId);
    if (pointers.size === 2) {
      const {center, distance} = pair();
      pinch = {anchor: start + span * center, distance, span};
      drag = null;
    } else {
      drag = {x: event.clientX, y: event.clientY, start, moved: false};
    }
  });
  view.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (pinch) {
      const {center, distance} = pair();
      const length = clamp(pinch.span * pinch.distance / distance, Math.min(.2, duration), duration);
      setView(pinch.anchor - center * length, length);
    } else if (drag) {
      const dx = event.clientX - drag.x;
      if (Math.abs(dx) > 5 || Math.abs(event.clientY - drag.y) > 5) drag.moved = true;
      if (drag.moved && span < duration) setView(drag.start - dx * span / Math.max(1, view.clientWidth), span);
    }
  });
  function endPointer(event) {
    if (!pointers.delete(event.pointerId)) return;
    if (pinch) {
      pinch = null;
      const remaining = pointers.values().next().value;
      drag = remaining ? {...remaining, start, moved: true} : null;
    } else {
      if (drag && !drag.moved && event.type === 'pointerup') seek(start + span * fraction(event.clientX));
      drag = null;
    }
  }
  view.addEventListener('pointerup', endPointer);
  view.addEventListener('pointercancel', endPointer);
  view.addEventListener('lostpointercapture', endPointer);
  view.addEventListener('wheel', event => {
    if (!duration || !event.ctrlKey) return;
    event.preventDefault();
    const center = fraction(event.clientX);
    const length = clamp(span * Math.exp(clamp(event.deltaY, -240, 240) * .008), Math.min(.2, duration), duration);
    setView(start + center * (span - length), length);
  }, {passive: false});
  new ResizeObserver(requestDraw).observe(view);

  return {
    load(buffer) {
      samples = buffer?.getChannelData(0);
      blocks = samples ? envelope(samples) : null;
      rate = buffer?.sampleRate;
      duration = buffer?.duration || 0;
      pointers.clear();
      pinch = drag = null;
      time = 0;
      selection = null;
      setView(0, duration);
    },
    fit() { setView(0, duration); },
    setSelection(next) {
      selection = next;
      updateOverlays();
    },
    setTime(next) {
      time = next;
      updateOverlays();
    },
    reveal(first, last = first) {
      if (first >= start && last <= start + span) return;
      const length = Math.min(duration, Math.max(span, (last - first) * 1.15));
      setView((first + last - length) / 2, length);
    },
  };
}
