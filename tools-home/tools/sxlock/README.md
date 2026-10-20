# SxLock 1.1.3

Phone-first sound-effect placement. Open `index.html` over HTTP(S).

## Use

1. Load the original video. Tap the picture to pause.
2. Step backward/forward one frame. Source frame rate is under Soundtrack & frame rate (default 25); select the actual source rate.
3. Hold the video for 500 ms (right-click or keyboard M also works) to open the categorized sound menu. A compact library button opens the same menu with that sound selected.
4. Hear the recording, set volume, start, play length and optional Source IN. Loop repeats Source IN through the end of the recording until the selected play length ends. Press Add/Apply to commit. Overlaps are independent.
5. Tap a placed effect to edit it at its saved frame. Duplicate or remove from its compact row.
6. Keep ideas in Scribe. Copy notes/full handoff, Save/Load projects, and export video or WAV. Imported recordings travel inside project JSON. The original video is reselected separately.

## Audio and preservation

31 CC0 recorded library effects are hosted in `sounds/`; source URLs, licenses, processing, hashes and decode measurements are in `library.json` and `CREDITS.md`. Ba-dum-tss uses recorded snare and cymbal samples. Original synthesized slide whistles and crickets remain available. Other old synthesized presets are hidden but retained for existing project cues; no silent replacement of saved decisions.

Recordings are cached in IndexedDB after use. Projects pin metadata for used library recordings. Notes and placements autosave locally. Original files are never overwritten. Original soundtrack volume starts at 100%; existing music and ambience in the source video remain in that soundtrack. No ambient layer is added automatically.

## Export behavior

Preview, finished-video capture and WAV use the same loop/trim/gain schedule. WAV rejects clipping instead of silently normalizing the mix. Library copies were level-matched independently; source media and project gain decisions are not normalized.

Video is encoded locally in real time with the browser's available codecs. The chosen rate is a target; MediaRecorder does not guarantee constant frame rate or H.264. The generic MP4 option may use VP9/Opus. Keep the page visible. Video stays onscreen while frames are requested by a timer. Recorder readiness and a short final held-frame/audio-flush interval protect capture; exported duration can include a small padding interval. Use a finishing pass when a strict CFR delivery is required.

Share invokes the native file share sheet only when supported; otherwise Download remains available. Desktop Chrome integration checks passed; physical Android file sharing remains device-dependent.

## Verification (2026-10-20)

- All 31 recorded assets decoded to finite, non-silent PCM. Measured post-encode peaks were below full scale.
- Core checks cover looping seek offsets, Source IN bounds, one-shot end, video end cutoff and gain scheduling.
- Live browser: held-video categorized menu, right-click menu, tap-to-pause, 25 fps source frame step to 0.040s, compact preselected button menu, a 40% crow loop from 0.040s to 3.000s overlapping an acoustic rimshot, project restore, WAV and MP4 exports.
- Effects WAV: exactly 3.000s; audible signal persisted after the one-shot ended, confirming the loop continued.
- Final 3s fixture video export: 360×640, 82 frames, 3.192567s, VP9/Opus MP4. Audio lasted 3.137271s including recorder flush padding.
- No supplied user media was modified by these tests.
