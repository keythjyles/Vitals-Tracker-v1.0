import '../../shared/compact-player.mjs?v=8';

const $ = id => document.getElementById(id);
const player = document.querySelector('.gs-player-shell');
const workspace = $('editorDock');
const surface = workspace.querySelector('.viewer');
const reference = player.querySelector('.sx-reference');
const sourceGrip = player.querySelector('.gs-source-grip');
const video = $('video');
const rail = $('sxSideControls');
const transportPanel = rail.closest('.gs-player-rail');
const sheet = $('sxViewSheet');
const settingsKey = 'sxlock-docked-section';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const view = document.createElement('button');
view.type = 'button';
view.className = 'sx-view-button';
view.textContent = 'View';
view.setAttribute('aria-haspopup', 'dialog');
view.setAttribute('aria-controls', sheet.id);
view.onclick = () => sheet.showModal();
reference.append(view);

const grip = document.createElement('button');
grip.type = 'button';
grip.id = 'sxResize';
grip.title = 'Drag to resize the preview';
grip.setAttribute('aria-label', 'Resize preview');
grip.setAttribute('aria-haspopup', 'dialog');
grip.setAttribute('aria-controls', sheet.id);
reference.after(grip);

const dock = document.createElement('div');
dock.className = 'sx-section-dock';
dock.hidden = true;
grip.after(dock);
const dockToggle = document.createElement('button');
dockToggle.type = 'button';
dockToggle.className = 'sx-view-button sx-docked-button';
dockToggle.hidden = true;
dockToggle.textContent = 'Docked';
dockToggle.setAttribute('aria-controls', 'sxDockedSection');
dockToggle.setAttribute('aria-expanded', 'false');
dock.id = 'sxDockedSection';
reference.append(dockToggle);
const scribeDockActions = document.createElement('div');
scribeDockActions.className = 'sx-scribe-dock-actions';

const sections = new Map([...document.querySelectorAll('[data-dock]')].map(button => {
 const section = $(button.dataset.dock);
 const header = button.parentElement;
 const home = document.createComment(` ${section.id} `);
 section.before(home);
 const title = button.getAttribute('aria-label').slice(5);
 return [section.id, {section, button, header, title, home}];
}));

let docked = null;
let wasOpen = false;
let dockOpen = false;
let requestedHeight = null;
let zoom = 1;
let x = 0;
let y = 0;
let fill = false;

function updateSize() {
 if (!workspace.clientWidth) return;
 const transport = Math.ceil(rail.scrollHeight);
 const progress = surface.nextElementSibling;
 const barHeight = progress?.matches('progress') ? progress.offsetHeight + 4 : 0;
 const viewport = window.innerHeight;
 const scribeDocked = docked?.section.id === 'scribeBox';
 const dockSpace = dockOpen ? Math.min(scribeDocked ? 244 : 220, viewport * 0.46) : 0;
 const chrome = sourceGrip.offsetHeight + reference.offsetHeight + grip.offsetHeight;
 const max = Math.max(88, Math.floor(viewport - dockSpace - chrome - barHeight - 4));
 const height = clamp(requestedHeight ?? transport - barHeight, 88, max);
 const workspaceHeight = height + barHeight;
 transportPanel.tabIndex = workspaceHeight < transport ? 0 : -1;
 player.style.setProperty('--sx-preview-height', `${height}px`);
 player.style.setProperty('--sx-workspace-height', `${workspaceHeight}px`);
 player.style.setProperty('--sx-player-height', `${workspaceHeight + chrome}px`);
 dock.style.maxHeight = `${dockSpace}px`;
 renderView();
}

function showDock(open) {
 dockOpen = open;
 const scribeOpen = open && docked?.section.id === 'scribeBox';
 if (scribeOpen) scribeDockActions.prepend(dockToggle);
 else if (dockToggle.parentElement !== reference) reference.append(dockToggle);
 dockToggle.textContent = scribeOpen ? 'Hide' : 'Docked';
 dock.hidden = !open;
 dockToggle.setAttribute('aria-expanded', String(open));
 document.body.classList.toggle('sx-has-dock', open);
 updateSize();
}

dockToggle.onclick = () => {
 showDock(!dockOpen);
 dockToggle.focus({preventScroll: true});
};

function setDock(id, focus = false, savedOpen) {
 const previous = docked?.button;
 if (docked) {
  if (docked.section.id === 'scribeBox') {
   docked.header.append(docked.button);
   scribeDockActions.remove();
  }
  docked.home.after(docked.section);
  docked.section.open = wasOpen;
  docked.button.textContent = 'Dock';
  docked.button.setAttribute('aria-label', `Dock ${docked.title}`);
  docked.button.setAttribute('aria-pressed', 'false');
 }
 docked = sections.get(id) || null;
 if (docked) {
  wasOpen = savedOpen ?? docked.section.open;
  docked.section.open = true;
  docked.button.textContent = 'Undock';
  docked.button.setAttribute('aria-label', `Undock ${docked.title}`);
  docked.button.setAttribute('aria-pressed', 'true');
  if (id === 'scribeBox') {
   scribeDockActions.append(docked.button);
   docked.section.append(scribeDockActions);
  }
  dock.append(docked.section);
  dock.scrollTop = 0;
 }
 dockToggle.hidden = !docked;
 if (docked) dockToggle.setAttribute('aria-label', `Toggle docked ${docked.title}`);
 showDock(Boolean(docked));
 try { localStorage.setItem(settingsKey, JSON.stringify({id: docked?.section.id, wasOpen})); } catch {}
 if (focus) (docked?.button || previous).focus({preventScroll: Boolean(docked)});
}

for (const {section, button} of sections.values()) {
 button.onclick = event => {
  event.preventDefault();
  event.stopPropagation();
  if (document.body.classList.contains('library-only')) $('libraryOnly').click();
  const id = docked?.section === section ? null : section.id;
  setDock(id, true);
 };
}

const scribe = $('scribeBox');
scribe.addEventListener('toggle', () => {
 if (docked?.section === scribe && !scribe.open) scribe.open = true;
});

function pictureBounds() {
 const {width, height} = surface.getBoundingClientRect();
 const fit = Math.min(width / video.videoWidth, height / video.videoHeight);
 const cover = Math.max(width / video.videoWidth, height / video.videoHeight);
 return {width, height, contentWidth: video.videoWidth * fit, contentHeight: video.videoHeight * fit, cover: cover / fit};
}

function renderView() {
 const hasVideo = Boolean(video.videoWidth && surface.clientWidth && surface.clientHeight);
 for (const id of ['sxFill', 'sxZoomOut', 'sxZoomIn']) $(id).disabled = !hasVideo;
 if (!hasVideo) {
  $('sxViewStatus').textContent = `${surface.clientHeight} px high`;
  return;
 }
 const {width, height, contentWidth, contentHeight, cover} = pictureBounds();
 if (fill) zoom = cover;
 else zoom = clamp(zoom, 1, Math.max(8, cover * 2));
 const maxX = Math.max(0, (contentWidth * zoom - width) / 2);
 const maxY = Math.max(0, (contentHeight * zoom - height) / 2);
 x = clamp(x, -maxX, maxX);
 y = clamp(y, -maxY, maxY);
 video.style.setProperty('--sx-zoom', zoom);
 video.style.setProperty('--sx-pan-x', `${x}px`);
 video.style.setProperty('--sx-pan-y', `${y}px`);
 surface.classList.toggle('sx-zoomed', zoom > 1);
 $('sxFit').setAttribute('aria-pressed', String(zoom === 1 && !fill && requestedHeight === null));
 $('sxFill').setAttribute('aria-pressed', String(fill));
 $('sxViewStatus').textContent = `${Math.round(zoom * 100)}% zoom · ${Math.round(height)} px high`;
}

function changeZoom(next, from, to = from) {
 const {cover} = pictureBounds();
 const value = clamp(next, 1, Math.max(8, cover * 2));
 const rect = surface.getBoundingClientRect();
 const cx = rect.left + rect.width / 2;
 const cy = rect.top + rect.height / 2;
 const ratio = value / zoom;
 x = to.x - cx - (from.x - cx - x) * ratio;
 y = to.y - cy - (from.y - cy - y) * ratio;
 fill = false;
 zoom = value;
 renderView();
}

function zoomBy(multiplier) {
 if (!video.videoWidth) return;
 const rect = surface.getBoundingClientRect();
 changeZoom(zoom * multiplier, {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2});
}

function resetPicture() {
 zoom = 1;
 fill = false;
 x = y = 0;
 renderView();
}

function resizeTo(height) {
 requestedHeight = Math.max(88, height);
 updateSize();
}

$('sxFit').onclick = () => { requestedHeight = null; resetPicture(); updateSize(); };
$('sxFill').onclick = () => { fill = true; x = y = 0; renderView(); };
$('sxZoomOut').onclick = () => zoomBy(1 / 1.25);
$('sxZoomIn').onclick = () => zoomBy(1.25);
$('sxShorter').onclick = () => resizeTo(surface.clientHeight - 48);
$('sxTaller').onclick = () => resizeTo(surface.clientHeight + 48);

const points = new Map();
const point = event => ({x: event.clientX, y: event.clientY});
const midpoint = ([a, b]) => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
const distance = ([a, b]) => Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));

surface.addEventListener('pointerdown', event => {
 if (event.target !== video || event.button !== 0 || !video.videoWidth || points.size === 2) return;
 points.set(event.pointerId, point(event));
 surface.setPointerCapture(event.pointerId);
});

surface.addEventListener('pointermove', event => {
 const previous = points.get(event.pointerId);
 if (!previous) return;
 const current = point(event);
 if (points.size === 2) {
  const before = [...points.values()];
  points.set(event.pointerId, current);
  const after = [...points.values()];
  changeZoom(zoom * distance(after) / distance(before), midpoint(before), midpoint(after));
 } else {
  points.set(event.pointerId, current);
  x += current.x - previous.x;
  y += current.y - previous.y;
  renderView();
 }
});

for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
 surface.addEventListener(name, event => points.delete(event.pointerId));
}

surface.addEventListener('wheel', event => {
 if (!video.videoWidth || !event.deltaY) return;
 event.preventDefault();
 changeZoom(zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15), point(event));
}, {passive: false});

let resize = null;
let moved = false;
grip.addEventListener('pointerdown', event => {
 if (event.button !== 0 || resize) return;
 resize = {id: event.pointerId, y: event.clientY, height: surface.clientHeight};
 moved = false;
 grip.setPointerCapture(event.pointerId);
});
grip.addEventListener('pointermove', event => {
 if (resize?.id !== event.pointerId) return;
 const delta = event.clientY - resize.y;
 if (!moved && Math.abs(delta) < 4) return;
 moved = true;
 resizeTo(resize.height + delta);
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
 grip.addEventListener(name, event => { if (resize?.id === event.pointerId) resize = null; });
}
grip.onclick = event => { if (!moved || !event.detail) sheet.showModal(); moved = false; };
grip.addEventListener('keydown', event => {
 if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
 event.preventDefault();
 resizeTo(surface.clientHeight + (event.key === 'ArrowUp' ? -24 : 24));
});

for (const name of ['loadedmetadata', 'emptied']) video.addEventListener(name, () => {
 points.clear();
 resetPicture();
 updateSize();
});
const observer = new ResizeObserver(updateSize);
observer.observe(rail);
observer.observe(reference);
window.addEventListener('resize', updateSize);

let savedDock;
try { savedDock = JSON.parse(localStorage.getItem(settingsKey) || 'null'); } catch {}
if (sections.has(savedDock?.id)) setDock(savedDock.id, false, savedDock.wasOpen);
else updateSize();
