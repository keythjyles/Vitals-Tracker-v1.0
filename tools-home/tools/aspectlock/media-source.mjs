const requests = new WeakMap();
const sources = new WeakMap();

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
}
