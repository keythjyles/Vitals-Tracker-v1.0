export function setupToolbox({
 openSound, previewSound, editRecording, importAudio, getSound, useCount, persist, pause, stopPreview, busy, visual, editVideoRecording, soundNameButton,
}) {
 const $ = id => document.getElementById(id);
 const sheet = $('toolboxSheet'), host = $('toolboxItems'), preview = $('toolboxPreview'), placed = $('visualPlacements');
 let soundIds = new Set(), cameraIds = new Set(), files = new Map(), missing = new Map(), previewUrl = null, previewRequest = 0, revision = 0;

 function clearPreview() {
  previewRequest++;
  preview.replaceChildren();
  preview.hidden = true;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
 }
 async function previewFile(file) {
  clearPreview();
  const request = previewRequest;
  let element;
  if (file.type.startsWith('video/')) {
   element = document.createElement('video');
   element.controls = true;
   element.playsInline = true;
  } else if (file.type.startsWith('image/')) {
   element = document.createElement('img');
   element.alt = file.name;
  } else if (file.type.startsWith('text/') || /\.(md|txt|csv|json)$/i.test(file.name)) {
   const text = await file.slice(0, 32768).text();
   if (request !== previewRequest) return;
   element = document.createElement('pre');
   element.textContent = text;
  }
  if (!element) return;
  if (element.tagName !== 'PRE') {
   previewUrl = URL.createObjectURL(file);
   element.src = previewUrl;
  }
  preview.append(element);
  preview.hidden = false;
 }
 function button(label, action, name = label) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.setAttribute('aria-label', name);
  element.onclick = () => Promise.resolve().then(action).catch(error => {
   $('toolboxStatus').textContent = error.message;
  });
  return element;
 }
 function row(title, actions) {
  const element = document.createElement('div');
  element.className = 'sx-toolbox-row';
  const name = typeof title === 'string' ? document.createElement('strong') : title;
  if(typeof title === 'string')name.textContent = title;
  element.append(name, ...actions);
  return element;
 }
 function render() {
  if (!sheet.open) return;
  host.replaceChildren();
  for (const id of soundIds) {
   const sound = getSound(id);
   if (!sound) continue;
   const used = useCount(id);
   const actions = [
    button('Play', () => {clearPreview();return previewSound(id);}, 'Preview '+sound.name),
    button('Use', () => {sheet.close();openSound(id);}, 'Place '+sound.name),
    button('Remove', () => {soundIds.delete(id);render();persist();}, 'Remove '+sound.name+' from Toolbox'),
   ];
   if (sound.origin === 'microphone') actions.splice(2, 0, button('Edit', () => {sheet.close();editRecording(id);}, 'Edit recording '+sound.name));
   const name=soundNameButton(sound);
   if(used)name.append(document.createTextNode(' · used '+used+'×'));
   host.append(row(name,actions));
  }
  for (const [id, file] of files) {
   const actions = [
    button('Download', () => {
     const url = URL.createObjectURL(file);
     const link = document.createElement('a');
     link.href = url;
     link.download = file.name;
     link.click();
     setTimeout(() => URL.revokeObjectURL(url), 60000);
    }, 'Download '+file.name),
    button('Remove', () => {
     if(visual.placements().some(item=>item.fileId===id))throw Error('Remove the placed layer first.');
     clearPreview();files.delete(id);cameraIds.delete(id);render();persist();
    }, 'Remove '+file.name+' from Toolbox'),
   ];
   if (/^(video|image|text)\//.test(file.type) || /\.(md|txt|csv|json)$/i.test(file.name)) {
    actions.unshift(button('Preview', () => previewFile(file),'Preview '+file.name));
   }
   if(cameraIds.has(id))actions.push(button('Edit',()=>{sheet.close();editVideoRecording(id);},'Edit camera recording '+file.name));
   if(visual.isVisual(file)){
    actions.push(button('Overlay',()=>visual.place(id,file,'overlay'),'Overlay '+file.name));
    actions.push(button('Append',()=>visual.place(id,file,'append'),'Append '+file.name));
   }
   host.append(row(file.name, actions));
  }
  for (const [id,file] of missing) {
   host.append(row(file.name+' · reconnect', [
    button('Remove', () => {missing.delete(id);render();persist();}, 'Remove '+file.name+' from Toolbox'),
   ]));
  }
  if (!host.children.length) host.textContent = 'Add files or find sounds online.';
  placed.replaceChildren();
  for (const item of visual.placements()) {
   placed.append(row(item.name+' · '+item.start.toFixed(3)+' s · '+Math.round(item.opacity*100)+'%',[
    button('Opacity',()=>visual.update(item.id),'Change opacity for '+item.name),
    button('Remove layer',()=>visual.remove(item.id),'Remove layer '+item.name),
   ]));
  }
 }
 function open() {
  if (busy()) return;
  pause();
  $('toolboxStatus').textContent = '';
  if (!sheet.open) sheet.showModal();
  render();
 }
 $('openToolbox').onclick = open;
 $('toolboxAdd').onclick = () => $('toolboxFiles').click();
 $('toolboxFiles').onchange = async event => {
  const selected = [...event.target.files], startRevision = revision;
  event.target.value = '';
  const failures = [];
  for (const file of selected) {
   try {
    if (revision !== startRevision) return;
    if (file.type.startsWith('audio/') || /\.(wav|mp3|m4a|aac|ogg|flac|opus|aif[fc]?)$/i.test(file.name)) {
     const id = await importAudio(file);
     if (revision !== startRevision) return;
     soundIds.add(id);
    } else {
     const match=[...missing].find(([,entry])=>entry.name===file.name&&entry.size===file.size);
     const id=match?.[0]||crypto.randomUUID();
     files.set(id,file);if(missing.delete(id))visual.reconnect();
    }
    await persist();
   } catch (error) {failures.push(file.name+' — '+error.message);}
  }
  $('toolboxStatus').textContent = failures.join(' · ');
  render();
 };
 sheet.addEventListener('close', () => {clearPreview();stopPreview();});
 return {
  get sounds() {return soundIds;},
  files: () => files,
  state: () => ({
   sounds: [...soundIds],
   cameraIds: [...cameraIds],
   files: [...missing.values(), ...[...files].map(([id,file]) => ({id,name:file.name,type:file.type,size:file.size,lastModified:file.lastModified}))],
  }),
  restoreSoundIds(ids,recordings) {
   revision++;
   soundIds = new Set(Array.isArray(ids)?ids.filter(id=>typeof id==='string'):[]);
   cameraIds = new Set(Array.isArray(recordings)?recordings.filter(id=>typeof id==='string'):[]);
   files.clear();
   missing.clear();
   clearPreview();
   render();
  },
  restoreFile(id,file,{camera=false}={}) {files.set(id,file);if(camera||/_Cam_/.test(file.name))cameraIds.add(id);},
  renameFile(id,name) {const file=files.get(id);if(file)files.set(id,new File([file],name,{type:file.type,lastModified:file.lastModified}));},
  restoreMissingFiles(entries) {missing=new Map(entries.map(item=>[item.id,item]));},
  render, open,
 };
}
