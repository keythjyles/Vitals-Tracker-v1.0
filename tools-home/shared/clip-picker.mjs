export function clipNameControl(label, saveName) {
 const box = document.createElement('div');
 const button = document.createElement('button');
 box.className = 'gs-clip-name';
 button.type = 'button';
 button.title = 'Tap to rename';
 box.append(button);

 function setLabel(value) {
  button.textContent = value;
  button.setAttribute('aria-label', 'Rename ' + value);
 }
 setLabel(label);
 button.onclick = () => {
  const oldName = button.textContent;
  const form = document.createElement('form');
  const input = document.createElement('input');
  const save = document.createElement('button');
  const cancel = document.createElement('button');
  const error = document.createElement('small');
  input.value = oldName;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', 'Video name');
  save.type = 'submit';
  save.textContent = 'Save';
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  error.setAttribute('role', 'alert');
  error.hidden = true;
  const close = () => {
   box.replaceChildren(button);
   button.focus({preventScroll:true});
  };
  cancel.onclick = close;
  form.onkeydown = event => {
   if (event.key === 'Escape' && !save.disabled) { event.preventDefault(); close(); }
  };
  form.onsubmit = async event => {
   event.preventDefault();
   if (save.disabled) return;
   const value = input.value.trim();
   if (value === oldName) { close(); return; }
   error.hidden = true;
   input.readOnly = save.disabled = cancel.disabled = true;
   try {
    if (!value) throw Error('Enter a video name.');
    const saved = await saveName(value);
    setLabel(saved ?? value);
    close();
   } catch (problem) {
    error.textContent = problem.message;
    error.hidden = false;
    input.focus({preventScroll:true});
   } finally {
    input.readOnly = save.disabled = cancel.disabled = false;
   }
  };
  form.append(input, save, cancel, error);
  box.replaceChildren(form);
  input.focus({preventScroll:true});
  input.select();
 };
 return {box, setLabel};
}

const pending = new WeakMap();
const pictures = new WeakMap();
let queue = Promise.resolve();
const observer = new IntersectionObserver(entries => {
 for (const {target, isIntersecting} of entries) {
  if (target.isConnected && !isIntersecting) continue;
  observer.unobserve(target);
  const request = pending.get(target);
  pending.delete(target);
  if (target.isConnected && request) void showThumb(target, request);
 }
});

function waitForMedia(element, event, load) {
 return new Promise((resolve, reject) => {
  const listeners = new AbortController();
  const timeout = setTimeout(() => done(Error('Preview could not be decoded.')), 3000);
  function done(error) {
   clearTimeout(timeout);
   listeners.abort();
   if (error) reject(error); else resolve();
  }
  element.addEventListener(event, () => done(), {signal:listeners.signal});
  element.addEventListener('error', () => done(Error('Preview unavailable.')), {signal:listeners.signal});
  load();
 });
}

async function thumbnail(file, kind) {
 const moving = kind === 'video';
 const media = document.createElement(moving ? 'video' : 'img');
 const url = URL.createObjectURL(file);
 if (moving) Object.assign(media, {preload:'auto', muted:true, playsInline:true});
 try {
  await waitForMedia(media, moving ? 'loadeddata' : 'load', () => { media.src = url; });
  if (moving && Number.isFinite(media.duration) && media.duration > .4) {
   await waitForMedia(media, 'seeked', () => { media.currentTime = Math.min(.8, media.duration * .2); }).catch(() => {});
  }
  const width = media.videoWidth || media.naturalWidth, height = media.videoHeight || media.naturalHeight;
  const scale = Math.min(120 / width, 86 / height, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext('2d').drawImage(media, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
 } finally {
  media.removeAttribute('src');
  media.load?.();
  URL.revokeObjectURL(url);
 }
}

async function showThumb(slot, {read, kind}) {
 try {
  const file = await read();
  if (!file || !slot.isConnected) return;
  if (!pictures.has(file)) {
   const work = queue.then(() => thumbnail(file, kind));
   pictures.set(file, work);
   queue = work.catch(() => {});
  }
  const image = document.createElement('img');
  image.alt = '';
  image.src = await pictures.get(file);
  if (slot.isConnected) slot.replaceChildren(image);
 } catch {
  // The clip stays selectable if a representative frame can't be decoded.
 }
}

export function clipThumbnail(kind, read) {
 const slot = document.createElement('span');
 slot.className = 'gs-clip-thumbnail';
 slot.setAttribute('aria-hidden', 'true');
 slot.textContent = {video:'Video', image:'Image', audio:'Audio'}[kind] || 'File';
 if (kind === 'video' || kind === 'image') {
  pending.set(slot, {kind, read});
  observer.observe(slot);
 }
 return slot;
}
