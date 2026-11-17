import {clipNameControl, clipThumbnail} from '../../shared/clip-picker.mjs?v=1';

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

export function clipName({file, label}) {
 return label ?? file.name;
}

export function setupToolbox({onSelect, onRename, currentFiles, currentBed, pause, allowDevice}) {
 const $ = id => document.getElementById(id);
 const items = new Map();
 const labelRows = new Map();
 let previewUrl, bedName;
 const showError = error => { $('toolboxStatus').textContent = error.message; };
 const ready = filesTransaction('readonly', store => store.getAll()).then(rows => {
  for (const row of rows) if (!items.has(row.id)) items.set(row.id, row);
 }).catch(() => { $('toolboxStatus').textContent = 'The saved Toolbox could not be opened on this device.'; });

 function action(label, callback) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
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

 async function rename(id, label) {
  let updated;
  await filesTransaction('readwrite', store => {
   const request = store.get(id);
   request.onsuccess = () => {
    if (!request.result) return;
    updated = {...request.result, label};
    store.put(updated);
   };
   return request;
  });
  if (!updated) throw Error('This video is missing from the saved Toolbox.');
  items.set(id, updated);
  return updated;
 }

 async function renameClip(id, label) {
  const updated = await rename(id, label);
  labelRows.get(id)?.(label);
  if (bedName?.entry?.id === id) {
   bedName.entry = updated;
   bedName.editor.setLabel(label);
  }
  onRename(updated);
 }

 function nameEditor(entry) {
  return clipNameControl(clipName(entry), label => renameClip(entry.id, label));
 }

 function attachBedName(original) {
  const slot = document.createElement('div');
  slot.id = 'aspectBedName';
  original.after(slot);
  bedName = {original, slot};
  renderBedName();
 }

 function renderBedName() {
  if (!bedName) return;
  const entry = items.get(currentBed());
  bedName.original.hidden = Boolean(entry);
  bedName.slot.hidden = !entry;
  if (entry !== bedName.entry) {
   bedName.entry = entry;
   bedName.editor = entry ? nameEditor(entry) : null;
   bedName.slot.replaceChildren(...(bedName.editor ? [bedName.editor.box] : []));
  }
 }

 function render() {
  const host = $('toolboxItems');
  host.replaceChildren();
  labelRows.clear();
  const inUse = currentFiles();
  for (const entry of allowDevice ? [...items.values()].reverse() : []) {
   const {id, file} = entry;
   const row = document.createElement('div');
   row.className = 'toolbox-row gs-clip-choice';
   const name = nameEditor(entry);
   const use = target => async () => {
    stopPreview();
    await onSelect(target, items.get(id));
   };
   const remove = action('Remove', async () => {
    if (currentFiles().includes(id)) throw Error('This file is in the current edit.');
    await filesTransaction('readwrite', store => store.delete(id));
    stopPreview();
    items.delete(id);
    render();
   });
   remove.disabled = inUse.includes(id);
   const preview = action('Preview', () => {
    pause();
    stopPreview();
    const video = $('toolboxPreview');
    previewUrl = URL.createObjectURL(file);
    video.src = previewUrl;
    video.hidden = false;
   });
   const bed = action('Use as bed', use('base'));
   const overlay = action('Place here', use('overlay'));
   overlay.className = 'gs-place-clip';
   const setLabel = label => {
    name.setLabel(label);
    preview.setAttribute('aria-label', 'Preview ' + label);
    bed.setAttribute('aria-label', 'Use ' + label + ' as bed');
    overlay.setAttribute('aria-label', 'Overlay ' + label + ' at current frame');
    remove.setAttribute('aria-label', 'Remove ' + label + ' from Toolbox');
   };
   setLabel(clipName(entry));
   labelRows.set(id, setLabel);
   const actions = document.createElement('div');
   actions.className = 'gs-clip-actions';
   actions.append(preview, bed, remove);
   row.append(clipThumbnail('video', () => file), name.box, overlay, actions);
   host.append(row);
  }
  $('toolboxEmpty').hidden = items.size > 0;
  renderBedName();
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
 $('toolboxPreview').addEventListener('play', event => {
  if (!event.currentTarget.hidden && !event.currentTarget.paused) pause();
 });
 $('aspectToolbox').addEventListener('toggle', () => { if (!$('aspectToolbox').open) stopPreview(); });
 void ready.then(render);

 return {add, render, renameClip, attachBedName, renderBedName, stopPreview, async get(id) { await ready; return items.get(id); }};
}
