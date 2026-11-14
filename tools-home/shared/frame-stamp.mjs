export function formatFrameTime(seconds) {
 const ms = Math.round(seconds * 1000);
 return Math.floor(ms / 60000) + ':' + ((ms % 60000) / 1000).toFixed(3).padStart(6, '0');
}

export function frameStamp({frame, time, fps}) {
 return '[F' + frame + ' | ' + formatFrameTime(time) + (fps ? ' | ' + fps + ' fps' : '') + '] ';
}

export function writeFrameClock(clock, {frame, time, fps}, label = '') {
 clock.dataset.frame = String(frame);
 clock.dataset.time = String(time);
 clock.dataset.fps = fps ? String(fps) : '';
 clock.textContent = label + 'F' + frame + ' · ' + formatFrameTime(time) + (fps ? ' · ' + fps + ' fps' : '');
}

export function frameStepControl(button, {getFrame, seek, direction}) {
 let previous;
 button.addEventListener('click', event => {
  const frame = getFrame();
  const touch = event.pointerType === 'touch';
  const double = previous && frame === previous.landed && touch === previous.touch &&
   (event.detail === 2 || (touch && event.detail > 0 && event.timeStamp - previous.time < 350));
  seek(double ? previous.start + direction * 25 : frame + direction);
  previous = !double && event.detail > 0
   ? {start: frame, landed: getFrame(), touch, time: event.timeStamp}
   : null;
 });
}
