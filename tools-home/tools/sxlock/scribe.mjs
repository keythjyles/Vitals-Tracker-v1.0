const $ = id => document.getElementById(id);
const notes = $('notes');
const video = $('video');
const dialog = $('scribeHistorySheet');
const list = $('scribeEntries');
const status = $('scribeStatus');
const syncStatus = $('scribeSync');
const api = 'https://gs-previewlock-api.onrender.com';
const endpoint = '/api/scribe-history';
const sessionKey = 'sxlock-scribe-session';
const localRows = new Map();
const cloudRows = new Map();
let lastDraft = null;
let dbPromise, syncTask, retryTimer, nextPage, loadingHistory;
let localError = false, paused = false, displayed = 12;

function database() {
 return dbPromise ??= new Promise((resolve, reject) => {
  const request = indexedDB.open('SxLock-scribe', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('entries', {keyPath: 'id'});
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => { dbPromise = undefined; reject(request.error); };
 });
}

async function localStore(mode, action) {
 const db = await database();
 return new Promise((resolve, reject) => {
  const tx = db.transaction('entries', mode);
  const result = action(tx.objectStore('entries'));
  tx.oncomplete = () => resolve(result.result);
  tx.onabort = () => reject(tx.error);
 });
}

function credential() {
 return localStorage.getItem(sessionKey) || localStorage.getItem('gs_previewlock_key');
}

async function request(path, body) {
 const key = credential();
 if (!key) throw Error('Sign in to open your shared history.');
 const headers = {Authorization: `Bearer ${key}`};
 if (body) headers['content-type'] = 'application/json';
 const response = await fetch(api + endpoint + path, {method: body ? 'POST' : 'GET', body, headers, signal: AbortSignal.timeout(65000)});
 if (response.status === 401) {
  if (localStorage.getItem(sessionKey) === key) localStorage.removeItem(sessionKey);
  if (credential() && credential() !== key) return request(path, body);
  paused = true;
  throw Error('Sign in to sync your Scribe history.');
 }
 if (!response.ok) {
  const error = Error(response.status === 413 ? 'A note is too large to sync. Its local copy is in History.' : 'Shared history is unavailable. Try Sync now.');
  error.status = response.status;
  throw error;
 }
 return response.json();
}

function queueSync(delay = 850) {
 clearTimeout(retryTimer);
 if (credential() && !paused && navigator.onLine) retryTimer = setTimeout(sync, delay);
}

function capture(text = notes.value) {
 const source = $('videoName').dataset.expected || null;
 if (!text.trim() || lastDraft?.text === text && lastDraft.video === source) return lastDraft?.saved || Promise.resolve(true);
 const now = Date.now();
 const entry = {id: `${now}-${crypto.randomUUID().replaceAll('-', '')}`, at: new Date(now).toISOString(), video: source, text};
 const draft = {video: source, text};
 lastDraft = draft;
 draft.saved = remember(entry).then(() => true, () => {
  if (lastDraft === draft) lastDraft = null;
  return false;
 });
 return draft.saved;
}

async function remember(entry) {
 const row = {...entry, pending: true};
 localRows.set(entry.id, row);
 try {
  // add prevents a migration in a second tab from putting a synced revision back in the queue.
  await localStore('readwrite', store => store.add(row));
 } catch (error) {
  if (error?.name !== 'ConstraintError') {
   localError = true;
   status.textContent = 'Scribe could not save on this device.';
   queueSync(0);
   throw error;
  }
  const existing = await localStore('readonly', store => store.get(row.id));
  if (existing) localRows.set(row.id, existing);
 }
 queueSync();
 if (dialog.open) renderHistory();
}

async function sync() {
 if (syncTask || !credential() || paused || !navigator.onLine) return syncTask;
 const queued = [...localRows.values()].filter(row => row.pending && !row.rejected);
 const pending = queued.length ? [queued.pop(), ...queued.slice(0, 4)] : [];
 if (!pending.length) return;
 syncTask = (async () => {
  for (const {id, at, video, text} of pending) {
   const entry = {id, at, video, text};
   let rejected = false;
   try {
    const receipt = await request('', JSON.stringify(entry));
    if (!receipt.persisted || receipt.id !== id) throw Error('Shared save could not be verified.');
   } catch (error) {
    if (![400, 409, 413].includes(error.status)) throw error;
    rejected = true;
   }
   const synced = {...entry, pending: rejected, rejected};
   localRows.set(entry.id, synced);
   try { await localStore('readwrite', store => store.put(synced)); }
   catch { localError = true; }
  }
  showSyncStatus();
  if (dialog.open) renderHistory();
  if ([...localRows.values()].some(row => row.pending && !row.rejected)) queueSync(0);
 })().catch(error => {
  showSyncStatus(error.message);
  if (!paused && navigator.onLine) queueSync(15000);
 }).finally(() => { syncTask = null; });
 return syncTask;
}

function showSyncStatus(error) {
 const connected = Boolean(credential()) && !paused;
 const rows = [...localRows.values()];
 const pending = rows.some(row => row.pending && !row.rejected);
 syncStatus.textContent = error || (!connected ? 'Sign in to recover notes across devices.' :
  pending ? 'Some notes are waiting to sync.' : rows.some(row => row.rejected) ? 'Some revisions are available only on this device.' : 'Shared history is connected.');
 $('scribeConnect').hidden = connected;
 $('scribeRetry').hidden = !connected || (!pending && !error);
}

function renderHistory() {
 const byId = new Map([...localRows, ...cloudRows]);
 const visibleText = new Set();
 const rows = [...byId.values()].sort((a, b) => b.id.localeCompare(a.id)).filter(entry => {
  const content = JSON.stringify([entry.video, entry.text]);
  if (visibleText.has(content)) return false;
  visibleText.add(content);
  return true;
 });
 list.replaceChildren();
 if (!rows.length) {
  const empty = document.createElement('li');
  empty.textContent = loadingHistory ? 'Loading history…' : 'No saved notes yet.';
  list.append(empty);
 }
 for (const entry of rows.slice(0, displayed)) {
  const item = document.createElement('li');
  const label = document.createElement('div');
  label.className = 'small';
  label.textContent = `${entry.id.startsWith('1000000000000-') ? 'Older draft' : new Date(entry.at).toLocaleString()} · ${entry.video || 'Scribe'}`;
  const text = document.createElement('pre');
  text.textContent = entry.text;
  const restore = document.createElement('button');
  restore.type = 'button';
  restore.textContent = 'Restore';
  restore.dataset.scribeControl = '';
  restore.addEventListener('click', async () => {
   if (!await capture()) return;
   notes.value = entry.text;
   lastDraft = {text: entry.text, video: $('videoName').dataset.expected || null, saved: Promise.resolve(true)};
   notes.dispatchEvent(new Event('input', {bubbles: true}));
   dialog.close();
   notes.setSelectionRange(notes.value.length, notes.value.length);
   status.textContent = 'Note restored.';
  });
  item.append(label, text, restore);
  list.append(item);
 }
 $('scribeEarlier').hidden = !nextPage && rows.length <= displayed;
}

async function loadHistory(earlier = false) {
 if (loadingHistory) return;
 loadingHistory = true;
 renderHistory();
 try {
  if (!credential() || paused || earlier && !nextPage) return;
  const data = await request(earlier ? `?before=${encodeURIComponent(nextPage)}` : '');
  if (!earlier) cloudRows.clear();
  for (const row of data.entries) cloudRows.set(row.id, row);
  nextPage = data.next;
  showSyncStatus();
 } catch (error) { showSyncStatus(error.message); }
 finally { loadingHistory = false; if (dialog.open) renderHistory(); }
}

async function importSavedNotes() {
 await window.SxLock.ready;
 const saved = window.SxLock.recoveredScribes();
 const existing = new Set([...localRows.values()].map(row => JSON.stringify([row.video, row.text])));
 for (const {notes: text, video: name, savedAt} of [...saved].reverse()) {
  if (typeof text !== 'string' || !text.trim()) continue;
  const video = typeof name === 'string' && name ? name : null;
  const content = JSON.stringify([video, text]);
  if (existing.has(content)) continue;
  existing.add(content);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  const digest = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const date = Number.isSafeInteger(savedAt) && /^\d{13}$/.test(String(savedAt)) ? savedAt : 1000000000000;
  await remember({id: `${date}-${digest}`, at: new Date(date).toISOString(), video, text});
 }
}

notes.addEventListener('input', () => {
 status.textContent = '';
 void capture();
 if (!notes.value.trim()) lastDraft = null;
});
document.addEventListener('sxlock-before-scribe-replace', () => { if (notes.value.trim()) void capture(); lastDraft = null; });
document.addEventListener('sxlock-scribe-restored', () => { if (notes.value.trim()) void capture(); });
$('scribeMark').addEventListener('click', () => {
 if (!video.getAttribute('src')) { status.textContent = 'Load a video to mark a frame.'; return; }
 const fps = Number($('sourceFps').value) || 25;
 const time = video.currentTime || 0;
 const frame = Math.round(time * fps);
 const ms = Math.round(time * 1000);
 const clock = `${Math.floor(ms / 60000)}:${(ms % 60000 / 1000).toFixed(3).padStart(6, '0')}`;
 const marker = `[F${frame} | ${clock} | ${fps} fps] `;
 const start = notes.selectionStart;
 const prefix = notes.value.slice(0, start);
 const insert = (prefix && !prefix.endsWith('\n') ? '\n' : '') + marker;
 notes.setRangeText(insert, start, start, 'end');
 notes.dispatchEvent(new Event('input', {bubbles: true}));
 notes.focus({preventScroll: true});
 status.textContent = `Marked F${frame}.`;
});
$('scribeClear').addEventListener('click', async () => {
 if (!notes.value) return;
 const before = notes.value;
 if (!await capture() || notes.value !== before) return;
 notes.value = '';
 notes.dispatchEvent(new Event('input', {bubbles: true}));
 status.textContent = 'Note kept in History.';
});
$('scribeHistory').addEventListener('click', () => {
 displayed = 12;
 showSyncStatus();
 dialog.showModal();
 void sync();
 void loadHistory();
});
$('scribeClose').addEventListener('click', () => dialog.close());
$('scribeEarlier').addEventListener('click', () => { displayed += 12; void loadHistory(true); });
$('scribeRetry').addEventListener('click', async () => { await sync(); await loadHistory(); });
$('scribeConnect').addEventListener('click', () => {
 const verifier = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
 const tab = window.open('', 'gs-scribe-signin', 'popup,width=540,height=670');
 if (!tab) { syncStatus.textContent = 'Allow the sign-in window and try again.'; return; }
 const receive = event => {
  if (event.origin !== api || event.source !== tab || event.data?.verifier !== verifier) return;
  window.removeEventListener('message', receive);
  if (!event.data.session) { showSyncStatus(event.data.error || 'Sign-in could not be completed.'); return; }
  localStorage.setItem(sessionKey, event.data.session);
  paused = false;
  showSyncStatus();
  void sync();
  void loadHistory();
 };
 window.addEventListener('message', receive);
 setTimeout(() => window.removeEventListener('message', receive), 600000);
 tab.location.href = `${api}/oauth/scribe/start?verifier=${verifier}`;
});
window.addEventListener('online', () => queueSync(0));
window.addEventListener('storage', event => {
 if ([sessionKey, 'gs_previewlock_key'].includes(event.key)) { paused = false; queueSync(0); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) void sync(); else queueSync(0); });

try {
 for (const row of await localStore('readonly', store => store.getAll())) {
  if (!localRows.has(row.id)) localRows.set(row.id, row);
 }
} catch { localError = true; }
void importSavedNotes().catch(() => { status.textContent = 'Some older Scribe notes could not be copied into History.'; });
if (localError && !status.textContent) status.textContent = 'Scribe storage on this device is unavailable.';
queueSync(0);
