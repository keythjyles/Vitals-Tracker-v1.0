let database;

function openFiles() {
 return database ??= new Promise((resolve, reject) => {
  const request = indexedDB.open('AspectLock-toolbox', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('videos', {keyPath: 'id'});
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => { database = null; reject(request.error); };
 });
}

async function filesTransaction(mode, action) {
 const db = await openFiles();
 return new Promise((resolve, reject) => {
  const transaction = db.transaction('videos', mode);
  const result = action(transaction.objectStore('videos'));
  transaction.oncomplete = () => resolve(result.result);
  transaction.onabort = () => reject(transaction.error);
 });
}

export function setupToolbox({onSelect, currentFiles, pause, allowDevice}) {
 const $ = id => document.getElementById(id);
 const items = new Map();
 let previewUrl;
 const showError = error => { $('toolboxStatus').textContent = error.message; };
 const ready = filesTransaction('readonly', store => store.getAll()).then(rows => {
  for (const row of rows) if (!items.has(row.id)) items.set(row.id, row);
 }).catch(() => { $('toolboxStatus').textContent = 'The saved Toolbox could not be opened on this device.'; });

 function action(label, callback, name) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (name) button.setAttribute('aria-label', name);
  button.onclick = async () => {
   try { await callback(); }
   catch (error) { showError(error); }
  };
  return button;
 }

 function stopPreview() {
  const video = $('toolboxPreview');
  if (!previewUrl) return;
  video.pause();
  video.removeAttribute('src');
  video.load();
  video.hidden = true;
  URL.revokeObjectURL(previewUrl);
  previewUrl = null;
 }

 function render() {
  const host = $('toolboxItems');
  host.replaceChildren();
  const inUse = currentFiles();
  for (const {id, file} of allowDevice ? items.values() : []) {
   const row = document.createElement('div');
   row.className = 'toolbox-row';
   const name = document.createElement('strong');
   name.textContent = file.name;
   const use = target => async () => {
    stopPreview();
    await onSelect(target, {id, file});
   };
   const remove = action('Remove', async () => {
    if (currentFiles().includes(id)) throw Error('This file is in the current edit.');
    await filesTransaction('readwrite', store => store.delete(id));
    stopPreview();
    items.delete(id);
    render();
   }, 'Remove ' + file.name + ' from Toolbox');
   remove.disabled = inUse.includes(id);
   row.append(name, action('Preview', () => {
    pause();
    stopPreview();
    const video = $('toolboxPreview');
    previewUrl = URL.createObjectURL(file);
    video.src = previewUrl;
    video.hidden = false;
   }, 'Preview ' + file.name), action('Use as bed', use('base'), 'Use ' + file.name + ' as bed'), action('Overlay here', use('overlay'), 'Overlay ' + file.name + ' at current frame'), remove);
   host.append(row);
  }
  $('toolboxEmpty').hidden = items.size > 0;
 }

 async function add(file) {
  await ready;
  if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) throw Error('Choose a video file.');
  if (file.lastModified) {
   const existing = [...items.values()].find(item => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified);
   if (existing) return existing;
  }
  const entry = {id: crypto.randomUUID(), file};
  items.set(entry.id, entry);
  try { await filesTransaction('readwrite', store => store.put(entry)); }
  catch { $('toolboxStatus').textContent = 'This video is available for this session. The browser could not save it in Toolbox.'; }
  render();
  return entry;
 }

 $('toolboxAdd').onclick = () => $('toolboxFiles').click();
 $('toolboxFiles').onchange = async event => {
  const files = [...event.target.files];
  event.target.value = '';
  for (const file of files) {
   try { await add(file); }
   catch (error) { showError(error); }
  }
 };
 $('toolboxPreview').addEventListener('play', pause);
 $('aspectToolbox').addEventListener('toggle', () => { if (!$('aspectToolbox').open) stopPreview(); });
 void ready.then(render);

 return {add, render, async get(id) { await ready; return items.get(id); }};
}
