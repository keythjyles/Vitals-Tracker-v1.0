import {setupScribe} from './scribe-history.mjs?v=42';

if (typeof document !== 'undefined' && document.getElementById('scribeHistorySheet')) {
 const video = document.getElementById('video');
 await setupScribe({
  getSource: () => document.getElementById('videoName').dataset.expected,
  getPosition() {
   if (!video.getAttribute('src')) return null;
   const fps = Number(document.getElementById('sourceFps').value) || 25;
   const time = window.SxLock?.currentTime() ?? video.currentTime;
   return {frame: Math.round(time * fps), time, fps};
  },
  async recoveredNotes() {
   await window.SxLock.ready;
   return window.SxLock.recoveredScribes();
  },
 });
}
