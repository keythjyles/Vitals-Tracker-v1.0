const requests = new WeakMap();
const sources = new WeakMap();
const measuredDurations = new WeakMap();

export function mediaDuration(video) {
  if (video.readyState < 1) return 0;
  if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;
  const measured = measuredDurations.get(video);
  return measured?.url === video.currentSrc ? measured.duration : 0;
}

export async function measureDuration(video, signal, file) {
  if (mediaDuration(video) || signal.aborted) return false;
  const url = video.currentSrc;
  const {ALL_FORMATS, BlobSource, Input, UrlSource} = await import('../sxlock/vendor/mediabunny-1.62.1-gs1.mjs');
  if (signal.aborted || video.currentSrc !== url || mediaDuration(video)) return false;
  // Some WebM files have no duration header. Read their picture packet timestamps.
  const source = file ? new BlobSource(file) : new UrlSource(url, {getRetryDelay: () => null});
  const input = new Input({source, formats:ALL_FORMATS});
  const stop = () => input.dispose();
  signal.addEventListener('abort', stop, {once:true});
  try {
    const track = await input.getPrimaryVideoTrack();
    const duration = await track?.computeDuration();
    if (signal.aborted || video.currentSrc !== url || mediaDuration(video)) return false;
    if (!Number.isFinite(duration) || duration <= 0) throw Error('The file has no readable picture duration.');
    measuredDurations.set(video, {url, duration});
    return true;
  } finally {
    signal.removeEventListener('abort', stop);
    if (!signal.aborted) input.dispose();
  }
}

export function beginVideoLoad(video) {
  requests.get(video)?.abort();
  const request = new AbortController();
  requests.set(video, request);
  return request.signal;
}

export async function loadVideoSource(video, url, name, signal) {
  if (signal.aborted) return false;
  const previous = sources.get(video);
  const previousTime = video.currentTime;
  try {
    await new Promise((resolve, reject) => {
      const listeners = new AbortController();
      const options = { once: true, signal: listeners.signal };
      function finish(error) {
        listeners.abort();
        if (error) reject(error);
        else resolve();
      }
      video.addEventListener('loadeddata', () => finish(), options);
      video.addEventListener('error', () => finish(new Error('Could not read ' + name)), options);
      signal.addEventListener('abort', () => finish(signal.reason), options);
      video.src = url;
      video.load();
    });
  } catch (error) {
    if (signal.aborted || video.getAttribute('src') !== url) return false;
    if (previous) {
      video.addEventListener('loadedmetadata', () => {
        if (video.getAttribute('src') === previous) video.currentTime = previousTime;
      }, { once: true, signal });
      video.src = previous;
    } else {
      video.removeAttribute('src');
    }
    video.load();
    throw error;
  }
  if (signal.aborted) return false;
  sources.set(video, url);
  measuredDurations.delete(video);
  if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
  return true;
}

export function clearVideoSource(video) {
  beginVideoLoad(video);
  const active = video.getAttribute('src');
  const saved = sources.get(video);
  video.pause();
  video.removeAttribute('src');
  video.load();
  for (const url of new Set([active, saved])) if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  sources.delete(video);
  measuredDurations.delete(video);
}
