# Production stages — CapLock R16 / Clipper R15 / SxLock R31 / Studio R2

One joke is one project. Open an existing joke or import its performance video directly into CapLock. Clipper is optional; use it only when the performance or Gemini animation needs cuts. Episode assembly is not required.

| File label | Meaning | Next equipment |
|---|---|---|
| `Slide_v01.raw` | Clean performance and voice, explicitly classified | CapLock |
| `Slide_v01.anm` | Original Gemini blue-background animation | Caption Clipper, when cuts are needed |
| `Slide.02_v01.alp` | Numbered transparent caption component | CapLock |
| `Slide_v01.cap` | Verified flattened caption composite | SxLock |
| `Slide_v01.jkt` | Verified rendered sound pass | Music / outro assembly |
| `.mp4` | Actual final publishing export | Platform upload |

Private names describe production stages; the bytes still contain real MP4 or WebM media. Renaming an arbitrary file does not verify its stage or convert its container. Existing originals keep their original names, hashes and paths. Their stage-labelled downloads use private names; newly produced composites and jokelets are saved with private names. No bulk renaming, source deletion, paid generation or automatic publication is performed. Final music/outro assembly and publishing export are not added in this release.

## Operation

1. In CapLock, open your saved joke or use Files / Photos for a new performance. Original mixed source imports remain unclassified until explicitly marked **Clean joke · .raw** in the drawer. Existing editable projects can always resume.
2. Import the Gemini original through **Import captions**, optionally cut it in Caption Clipper, then return with **Next → CapLock**. Place each component with Insert. Native Previous / Next remains navigation only. Existing original, cut-pass history, layers, geometry and saved timing survive.
3. **Next → SxLock** saves the editable scene, renders the video with the placed layers, preserves the original soundtrack, verifies the actual saved output and opens the same joke in SxLock. Active unplaced components must be inserted or removed first. Visible progress, cancel and retry retain the editable project; an unchanged verified composite is reused.
4. In SxLock, add the effects as usual. **Next · Save jokelet** saves the sound sources and edit recipe, renders the native sound export, saves the verified `.jkt` and exposes Save / Resave. The jokelet is ready for music/outro work. Its original video, caption layers, sound sources and editable recipes remain separate.

Stage-aware project pickers show the files appropriate to that module. **Show all files** starts off each time; enable it for older, unclassified or general media, including other folders. Native device Files / Photos imports remain available. Stage labels show names and versions instead of relying on nearly identical thumbnails. The shared compact shell, SxLock rail dimensions, read-only timelines, exact IN/OUT boxes, frame stepping and haptics stay locked.

## Rebuild and verification contract

`GS-JokeProject-1` gains optional `production.records`. The existing authenticated project service accepts `POST /api/joke-project/stage` with revision, saved asset ID(s), requested stage, canonical render recipe and native export report. It re-reads the saved bytes, verifies SHA-256 and size, probes the real container/video/audio/alpha, checks the output dimensions/frame count/duration, and binds parent assets by project-local path and size. A `.cap` requires the current saved CapLock picture recipe. A `.jkt` requires the current saved sound session and current verified `.cap` parent. A stale recipe disappears from ready lists; originals and old versions remain available through Show all files. Repeated identical stage requests are idempotent. A private extension alone never makes an item ready. Release-stage promotion is rejected until final assembly is implemented.

CapLock uses the pinned existing MediaBunny/SxLock encoder with an optional canvas visual pass. Overlay video frames use the same native HTML video alpha decode as the preview. Bed transform, layer ordering, timing, trim, speed, loop, placement, rotation and opacity come from the saved recipe. Source audio and audio-layer effects use the existing offline audio schedule. SxLock's ordinary export path is unchanged when no visual pass is supplied. SxLock then preserves the composite picture while rendering effects with its native engine. No MediaRecorder wall-clock capture is used.

Working save is verified Dropbox storage; Drive backup stays explicitly pending until independently mirrored. Test media uses disposable authenticated fixtures, never production uploads. The saved owner Pebble project has two placed captions and seven unplaced pieces as inspected on November 2, 2026; it must not be silently promoted. Automated proof and physical phone acceptance are separate. Release/deployment evidence is recorded in `PRODUCTION_STAGES_R16.json`.

Rollback code baseline: `9cd7a94a76662c6e55ab256b6d02b498ec4a78b8`. Keep all new stage records, stage assets, editable CapLock/sound sessions, original files and pass histories. Older code may ignore the optional stage data; do not strip it or overwrite the saved project with a downgraded schema. Backend health advertises `productionStagesVersion:1`, project capabilities advertise `productionStages:1`.
