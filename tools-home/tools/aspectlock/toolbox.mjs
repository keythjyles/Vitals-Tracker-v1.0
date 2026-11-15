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
 let previewUrl, bedName;
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

 function nameEditor(entry, inPlayer = false) {
  const title = clipName(entry);
  const box = document.createElement('div');
  box.className = 'aspect-clip-name';
  const button = action(title, edit, 'Rename ' + title);
  button.className = 'aspect-name-button';
  button.title = 'Tap to rename';
  box.append(button);
  function edit() {
   const form = document.createElement('form');
   const input = document.createElement('input');
   input.type = 'text';
   input.value = title;
   input.autocomplete = 'off';
   input.setAttribute('aria-label', 'Video name');
   const save = document.createElement('button');
   save.type = 'submit';
   save.textContent = 'Save';
   const cancel = action('Cancel', close);
   const error = document.createElement('small');
   error.setAttribute('role', 'alert');
   error.hidden = true;
   function close() {
    box.replaceChildren(button);
    button.focus({preventScroll: true});
   }
   function showNameError(message) {
    error.textContent = message;
    error.hidden = false;
   }
   form.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !save.disabled) { event.preventDefault(); close(); }
   });
   form.onsubmit = async event => {
    event.preventDefault();
    if (save.disabled) return;
    const label = input.value.trim();
    if (!label) { showNameError('Enter a video name.'); input.focus(); return; }
    if (label === title) { close(); return; }
    error.hidden = true;
    input.readOnly = save.disabled = cancel.disabled = true;
    try {
     const updated = await rename(entry.id, label);
     const restoreFocus = form.contains(document.activeElement);
     onRename(updated);
     render(restoreFocus ? entry.id : null, inPlayer);
    } catch {
     showNameError('Could not save the name. Try again.');
     input.focus({preventScroll: true});
    } finally {
     input.readOnly = save.disabled = cancel.disabled = false;
    }
   };
   form.append(input, save, cancel, error);
   box.replaceChildren(form);
   input.focus({preventScroll: true});
   input.select();
  }
  return box;
 }

 function attachBedName(original) {
  const slot = document.createElement('div');
  slot.id = 'aspectBedName';
  original.after(slot);
  bedName = {original, slot};
  renderBedName();
 }

 function renderBedName(focus = false) {
  if (!bedName) return;
  const entry = items.get(currentBed());
  bedName.original.hidden = Boolean(entry);
  bedName.slot.hidden = !entry;
  if (entry !== bedName.entry) {
   bedName.entry = entry;
   bedName.slot.replaceChildren(...(entry ? [nameEditor(entry, true)] : []));
  }
  if (focus) bedName.slot.querySelector('.aspect-name-button')?.focus({preventScroll: true});
 }

 function render(focusId, inPlayer = false) {
  const host = $('toolboxItems');
  host.replaceChildren();
  const inUse = currentFiles();
  for (const entry of allowDevice ? items.values() : []) {
   const {id, file} = entry;
   const label = clipName(entry);
   const row = document.createElement('div');
   row.className = 'toolbox-row';
   const name = nameEditor(entry);
   const use = target => async () => {
    stopPreview();
    await onSelect(target, entry);
   };
   const remove = action('Remove', async () => {
    if (currentFiles().includes(id)) throw Error('This file is in the current edit.');
    await filesTransaction('readwrite', store => store.delete(id));
    stopPreview();
    items.delete(id);
    render();
   }, 'Remove ' + label + ' from Toolbox');
   remove.disabled = inUse.includes(id);
   row.append(name, action('Preview', () => {
    pause();
    stopPreview();
    const video = $('toolboxPreview');
    previewUrl = URL.createObjectURL(file);
    video.src = previewUrl;
    video.hidden = false;
   }, 'Preview ' + label), action('Use as bed', use('base'), 'Use ' + label + ' as bed'), action('Overlay here', use('overlay'), 'Overlay ' + label + ' at current frame'), remove);
   host.append(row);
   if (id === focusId && !inPlayer) name.querySelector('button').focus({preventScroll: true});
  }
  $('toolboxEmpty').hidden = items.size > 0;
  renderBedName(inPlayer && focusId === currentBed());
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

 return {add, render, attachBedName, renderBedName, stopPreview, async get(id) { await ready; return items.get(id); }};
}
