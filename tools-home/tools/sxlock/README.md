# SxLock R1.7

Phone-first sound-effect placement. Open `index.html` over HTTP(S).

## Use

1. Load the original video. Tap the picture to pause.
2. Step backward/forward one frame. Source frame rate is under Soundtrack & frame rate (default 25); select the actual source rate.
3. Hold the video for 500 ms (right-click or keyboard M also works) to open the categorized sound menu. A compact library button opens the same menu with that sound selected.
4. Hear the recording, set volume, start, play length and optional Source IN. Loop repeats Source IN through the end of the recording until the selected play length ends. Press Add/Apply to commit. Overlaps are independent.
5. Tap a placed effect to edit it at its saved frame. Duplicate or remove from its compact row.
6. Keep ideas in Scribe. Copy notes/full handoff, Save/Load projects, and export video or WAV. Imported recordings travel inside project JSON. The original video is reselected separately.

## Audio and preservation

93 CC0 recorded library effects are hosted in `sounds/`; source URLs, licenses, processing, hashes and decode measurements are in `library.json` and `CREDITS.md`. Ba-dum-tss uses recorded snare and cymbal samples. Original synthesized slide whistles and crickets remain available. Other old synthesized presets are hidden but retained for existing project cues; no silent replacement of saved decisions.

Recordings are cached in IndexedDB after use. Projects pin metadata for used library recordings. Notes and placements autosave locally. Original files are never overwritten. Original soundtrack volume starts at 100%; existing music and ambience in the source video remain in that soundtrack. No ambient layer is added automatically.

## Export behavior

Preview, finished-video capture and WAV use the same loop/trim/gain schedule. WAV rejects clipping instead of silently normalizing the mix. Library copies were level-matched independently; source media and project gain decisions are not normalized.

Video is encoded locally in real time with the browser's available codecs. The chosen rate is a target; MediaRecorder does not guarantee constant frame rate or H.264. The generic MP4 option may use VP9/Opus. Keep the page visible. Video stays onscreen while frames are requested by a timer. Recorder readiness and a short final held-frame/audio-flush interval protect capture; exported duration can include a small padding interval. Use a finishing pass when a strict CFR delivery is required.

Share invokes the native file share sheet only when supported; otherwise Download remains available. Desktop Chrome integration checks passed; physical Android file sharing remains device-dependent.

## Earlier integration verification (1.1.3, 2026-10-20)

- All 31 recorded assets decoded to finite, non-silent PCM. Measured post-encode peaks were below full scale.
- Core checks cover looping seek offsets, Source IN bounds, one-shot end, video end cutoff and gain scheduling.
- Live browser: held-video categorized menu, right-click menu, tap-to-pause, 25 fps source frame step to 0.040s, compact preselected button menu, a 40% crow loop from 0.040s to 3.000s overlapping an acoustic rimshot, project restore, WAV and MP4 exports.
- Effects WAV: exactly 3.000s; audible signal persisted after the one-shot ended, confirming the loop continued.
- Final 3s fixture video export: 360×640, 82 frames, 3.192567s, VP9/Opus MP4. Audio lasted 3.137271s including recorder flush padding.
- No supplied user media was modified by these tests.

## Stability and library update (1.2)

62 additional CC0 recordings bring the library to 93. The original 31 MP3 hashes are unchanged, and old project IDs, positions, trims, loop flags and levels remain compatible.

Decoded sound buffers use a 24 MiB LRU target; compressed audio uses an 8 MiB target. A single imported file larger than a budget may temporarily exceed that target while it is in use. Playback prepares an eight-second window instead of decoding the entire timeline. Completed/stopped audio sources release their gain and buffer references; late audition requests are cancelled. Meter storage is reused, and paused views redraw only after changes at no more than ten updates per second.

An export locks immediately, including preparation, so repeated taps cannot start overlapping encoders or renders. Video cleanup releases capture tracks, timers, audio connections, and canvas backing memory on success, cancel or failure. WAV renders use eight-second PCM chunks rather than a full-length stereo floating-point output buffer. Mixed-WAV original soundtrack decoding is separately guarded against large phone memory allocations; file imports are capped at 64 MiB.

Autosave keeps the previous project as recovery fallback and flushes on page hide. Export-interruption markers survive a tab crash; the next open restores saved placements and prompts to reselect the source video. Copy troubleshooting provides local error/stage information. No telemetry is sent.

Checks: all 62 new files decoded to finite non-silent PCM below full scale; 93 total files match their recorded SHA-256. The chunked renderer matched a full 20-second loop/one-shot reference exactly at PCM16 precision, including both eight-second boundaries. A 93-sound cache stress check remained below its target; overlapping exports were rejected, and failing jobs released their lock. The specific physical-phone crash reported by the user has not been reproduced, so these changes address identified memory and concurrency risks without asserting a confirmed root cause.

## R1.7 — expanded playable library

31 additions bring the hosted manifest to 124 entries; the existing connected bee recording remains separate. New engines, vehicle/aircraft beds and pass-bys, hard/soft braking, designed squealing takeoff, reactions, gongs, farts, yawns, ducks, geese, sniffles and chuckles supplement existing belches, sneezes, coughs, hens, roosters and aww. Designed motion/quiet variants are labeled. Hover beds are rotor recordings, not guaranteed seamless loops.

Open `?library=1&v=1.7` for the uncluttered listening view. Each row has a duration, Play, Use and favorite star. Search matches all entered words across names, categories and tags (including belch/burp and awe/aww). All / New sounds / Favorites filters work in the main list and placement chooser. One preview plays at a time; Stop preview or leaving the tab stops it. Use opens the existing placement controls without inserting until Add is pressed. Favorites are browser preferences; sound assets are hosted in the repository.

Two additions use CC BY 3.0 (male throat clearing and distant jet takeoff). They are labeled **credit required**. Copy credits for placed sounds under Sources & credits; include them in the published description. Project snapshots retain license metadata and Copy full handoff includes required credits. Other new entries are CC0/public domain.

Tool identity: GS-TOOL-SXLOCK · R1.7. Original sounds and IDs remain unchanged. No paid APIs were used.
