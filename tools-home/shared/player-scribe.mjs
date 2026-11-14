import {setupScribe} from '../tools/sxlock/scribe.mjs?v=42';

export function mountPlayerScribe(reference, {tool, clock, media, source, section, sourceReady, pauseEditor}) {
 const pause = () => {
  if (tool === 'aspectlock') document.getElementById('pause').click();
  else if (pauseEditor) pauseEditor();
  else media.pause();
 };
 const open = document.createElement('button');
 open.type = 'button';
 open.className = 'gs-scribe-button';
 open.textContent = 'Scribe';
 reference.append(open);

 // FrameLock already has a frame-note editor and recovery. Keep its original note box.
 if (tool === 'framelock') {
  open.setAttribute('aria-controls', 'notes-workspace');
  open.onclick = () => {
   pause();
   const notes = document.getElementById('notes-workspace');
   notes.open = true;
   notes.scrollIntoView({block: 'nearest'});
   document.getElementById('notes').focus({preventScroll: true});
  };
  return;
 }

 const panel = section || document.createElement('details');
 panel.id ||= 'gsPlayerScribe';
 panel.classList.add('gs-player-scribe');
 const heading = section?.querySelector('summary') || document.createElement('summary');
 if (!section) {
  heading.textContent = 'Scribe';
  panel.append(heading);
  reference.closest('.gs-player-shell').after(panel);
 }
 panel.insertAdjacentHTML('beforeend', '<textarea id="gs-notes" rows="3" aria-label="Scribe notes" placeholder="Write a note…"></textarea><div class="gs-scribe-actions"><button type="button" id="gs-scribeMark">Mark frame</button><button type="button" id="gs-copyNotes">Copy notes</button><details><summary>More</summary><div class="gs-scribe-actions"><button type="button" id="gs-scribeHistory">History</button><button type="button" id="gs-scribeClear">Clear</button></div></details></div><p id="gs-scribeStatus" role="status"></p>');
 document.body.insertAdjacentHTML('beforeend', '<dialog id="gs-scribeHistorySheet" class="gs-scribe-history" aria-labelledby="gs-scribeHistoryTitle"><div class="gs-scribe-actions"><strong id="gs-scribeHistoryTitle">Scribe history</strong><button type="button" id="gs-scribeClose">Close</button></div><p id="gs-scribeSync" role="status"></p><div class="gs-scribe-actions"><button type="button" id="gs-scribeRetry" hidden>Sync now</button><button type="button" id="gs-scribeConnect" hidden>Sign in with Google</button></div><ol id="gs-scribeEntries"></ol><button type="button" id="gs-scribeEarlier" hidden>Earlier notes</button></dialog>');
 const notes = document.getElementById('gs-notes');
 const status = document.getElementById('gs-scribeStatus');
 const draftKey = 'gs-scribe-draft-' + tool;
 open.setAttribute('aria-controls', panel.id);
 open.setAttribute('aria-expanded', String(panel.open));
 panel.addEventListener('toggle', () => open.setAttribute('aria-expanded', String(panel.open)));
 open.onclick = () => {
  pause();
  panel.open = !panel.open;
  if (panel.open) panel.scrollIntoView({block: 'nearest'});
 };

 let activeSource;
 function restoreDraft() {
  const name = source() || '';
  if (name === activeSource) return;
  activeSource = name;
  try { notes.value = JSON.parse(localStorage.getItem(draftKey) || '{}')[name] || ''; }
  catch { notes.value = ''; }
 }
 restoreDraft();
 const sourceName = reference.querySelector('.gs-player-filename');
 new MutationObserver(restoreDraft).observe(sourceName, {childList: true, subtree: true, characterData: true});
 notes.addEventListener('input', () => {
  try {
   const drafts = Object.assign(Object.create(null), JSON.parse(localStorage.getItem(draftKey) || '{}'));
   drafts[activeSource] = notes.value;
   localStorage.setItem(draftKey, JSON.stringify(drafts));
  } catch { status.textContent = 'This browser could not save the draft. Copy it before closing.'; }
 });
 document.getElementById('gs-copyNotes').onclick = async () => {
  try { await navigator.clipboard.writeText(notes.value); status.textContent = 'Notes copied.'; }
  catch { notes.select(); status.textContent = 'Notes selected for copying.'; }
 };
 void setupScribe({
  prefix: 'gs-',
  getSource: source,
  beforeMark: pause,
  getPosition() {
   if (!sourceReady() || !clock?.dataset.frame) return null;
   return {frame: Number(clock.dataset.frame), time: Number(clock.dataset.time), fps: Number(clock.dataset.fps)};
  },
 }).catch(error => { status.textContent = error.message; });
}
