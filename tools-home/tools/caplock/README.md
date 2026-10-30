# CapLock R5 — multi-item compositor (October 29, 2026)

The owner corrected the interaction model: CapLock is AspectLock with multiple added items, using SxLock's placement matrix, compact insertion list and tap-to-edit properties. The player now opens first. Transcript, phrase directions and Gemini preparation remain available through Transcript; they are no longer the compulsory opening workflow. This supersedes the historical R2 transcript-first entry instruction below.

Added clips appear directly below the player as compact rows. Tap the name for its property sheet: name, IN/OUT, source trim, independent speed, position/size, rotation, opacity, audio volume, looping and order. Row ↤ seeks to that item's insertion and stays paused. The rail provides Start (bed frame0), Item (selected insertion), Play, ±1 frame and existing placement/import tools. Matrix clicks and Home/arrow keys seek paused. Importing, selecting and changing media also pause; only an explicit Play starts playback. Move and Rotate retain their existing independent modes. Close the sheet to position directly on the video.

Source references and geometry remain in the existing version3 project, undo/redo and Dropbox save path; no new schema, library or paid generation. CapLock still has no finished-video exporter, within-item speed ramps or freeze holds. Physical phone and authenticated cloud save/reopen remain separate acceptance checks. Shared matrix: ../../shared/item-matrix.mjs. SxLock is a read-only behavioral reference and its bytes are untouched.

Pre-publication:22 Node checks pass, script syntax and all static control IDs pass. The expanded existing CI browser suite covers multi-item import, property sheets, paused seeking, prior word/style/rotation/undo/recovery, plus AspectLock with actual fixture video/alpha at three viewport sizes. CI/live results are recorded independently in EDITOR_MODEL_20261029.json and the master index. Rollback main: `c24ee364317594ce2da2514494d478024b63123e`; preserve media and saved projects.

---

R4.2 finishing pass: new locally imported overlays/audio and external library layers are copied into this joke project before the edit can reference them. Writes are serialized; failures remain visible. This preserves reconnectable sources, rather than saving only local filenames.

# R4.2 — joke-folder clip tray and durable workspace
Receives numbered alpha clips from PreviewLock, opens the recorded bed or any selected bed, Place at playhead, immutable cloud edit snapshots and revision-guarded Dropbox save. Drive mirror is a separate queued process; no finished-video export or in-clip freeze/speed-ramp claim. See ../jokelab/ANIMATED_CAPTION_WORKFLOW.md.

# CapLock R3 — independent animation speed (October29)

Architect supplied17802.mp4: actual10.000s240-frame1280x720 H.264 animation at24fps, blue background with yellow/black lettering, varied directional entrances, pulsing question mark and expanding HIVES burst. This is evidence of a useful Gemini-app animation workflow. It is not alpha yet. Original source remains untouched.

Selected clip now has independent0.100–8.000x speed, numeric precision0.001x, ±0.01x adjustments and1x reset. Changes apply while the bed continues at its normal rate. Bed IN/OUT remains fixed. Source IN/OUT selects a subrange of the original; Fit to bed IN/OUT computes the exact range/duration ratio. Loop repeats only that source range. The source can be24fps: its presentation time is mapped in seconds onto the25fps bed grid, not relabeled as25fps.

Project version3 preserves playbackRate and optional trimOutFrame; opens v1/v2 at normal speed. Old R2 rejects v3 instead of silently losing timing. Undo/redo/drafts/project JSON retain these fields. Only selected media elements get playbackRate; the bed is never retimed. Native preview remains subject to decode/scheduling tolerance; deterministic exported frame accuracy is not claimed. No finished clip exporter or automatic background removal is introduced by this change.

Creative correction: previous ChatGPT brief overconstrained Gemini to Pillow code, specified fonts and2048output tokens. Calling that unrestricted Gemini creative lead was inaccurate. Let Gemini generate the animation with the requested phrase structure and creative latitude. CapLock handles timing/placement; genuine alpha is preferred, uniform blue is an accepted removable source. Prompts now reflect this rather than forbidding the successful blue-background route. No new paid generation.

17 Node checks pass before deployment, including rate/source-time mapping, trimmed loops, fit ratio, legacy migration/JSON/rejection and native layer-rate isolation. Browser verification is separate. Rollback: restore the CapLock directory from307fefab9673110fd725cc1d9c54feb3b7a19b3e; preserve originals and all version3 projects. PreviewLock/SxLock/AspectLock unchanged.

The Architect’s supplied phone screenshots show PreviewLock R28 connected and playing the actual v03b at F32,56,132. This supplies phone playback evidence missing from the earlier browser-only R28 receipt. It does not approve the caption design or prove native animation quality.

---

# CapLock · GS-TOOL-CAPLOCK · R2

October28,2026 owner revision: **transcript first → Gemini animation production → import transparent media layers**. Rotate means flat2D rotation only. No third-axis behavior, ZLock integration or changes to AspectLock/SxLock engines.

The entry page literally lists every segmented spoken phrase as selectable word buttons. Select words, move within/across neighboring phrases, create a new phrase, and attach Gemini effect directions. Stable word IDs carry directions through movement and JSON recovery. Text edits remap surviving words where possible. Word movement retains existing phrase timing and marks it for speech-timing review; new phrases remain untimed. Nothing fabricates word alignment.

Project visual-protocol notes support draft/owner-approved state. Editing the protocol returns it to draft. Each phrase can inherit it, add its own direction, or opt out completely: the independent phrase prompt omits the global protocol. Copy a segment brief into the owner's Gemini project; generation/first-look approval remain with the owner. The Open Gemini link is ordinary navigation, not an authenticated API or automatic generation integration. A prompt requests actual alpha and tells Gemini to disclose unsupported transparency rather than label a colored background transparent.

The viewer is the next page. Real local-source and existing PreviewLock-library load controls sit inside the bed before loading, then disappear to preserve an unobstructed picture; the right-side Load bed button reveals them. Transparent animation/graphic/audio clips use a reusable independent `layer-track.mjs` controller: per-clip integer IN/exclusive OUT, source trim, position, aspect-preserving width, opacity, volume for audio, visibility, explicit looping and array-based stacking. Video animations are silent by default. Underlying source picture/audio remain unchanged. Viewport pan/pinch never changes clip geometry.

**Rotate is opt-in:** choosing Rotate unlocks the angle field for the selected clip. Default View, Move/size, ordinary dragging and pinch never rotate. Selecting another clip resets the mode to View. Square explicitly sets exactly0°. Rotation, placement and layer order survive project reopening. Undo/redo covers word/direction/protocol/clip edits and drag placement; media resources remain available for undo within the session.

Built-in captions, styling and subtitle transport remain inside the closed **Built-in captions · optional** panel. Their preview is explicitly enabled by checkbox. R1 caption styling/timing is retained. Gemini-generated animations are the primary production path.

Editable project **version2** includes words/effect directions, visual protocol/approval, independent segment direction, clip/media references and geometry. R2 reads R1 projects; older R1 code rejects version2 instead of silently dropping layers. No media bytes or temporary cloud URLs are embedded. Local files reconnect by original filename/size; cloud clips resolve their saved PreviewLock path. Browser drafts are temporary recovery, not cloud backup. Keep independent originals and download the JSON project.

## R2 validation and remaining gates

12 Node checks cover prior caption behavior plus stable word directions across movement/recovery, word ordering, independent protocols, legacy migration and clip boundary/rotation validation. Real Chromium153 at390×844: transcript-first entry, word edits/directions, approved/global versus independent prompt, in-bed loading, collapsed native tools, real VP9 alpha-WebM import, frame controls/play/pause/resume, opt-in Rotate, exact Square reset, position undo/redo, project download/reopen, local clip reconnect and remove/undo. Native alpha readback returned corner alpha0 and opaque-center alpha255. No page-script errors; 9:16 scene ratio0.562502; no horizontal page overflow. A complete test rerun is required after implementation changes; release receipts belong in the master index.

Run: `python tools-home/tools/caplock/tests/make-fixtures.py`, `node --test tools-home/tools/caplock/tests/*.test.mjs`, then serve the repository on localhost8766 and run `node tools-home/tools/caplock/tests/browser.cjs`. Playwright/Chromium required; runtime overrides remain `PLAYWRIGHT_MODULE`, `BROWSER_EXECUTABLE`, `LIVE_URL`. The browser check generates an actual transparent WebM locally, never calling Gemini or paid providers.

R2 remains a preview/editor prototype: no finished-video exporter, cloud project-save bridge or automatic Gemini asset exchange. Overlay playback/seeking uses native media presentation timestamps and can have browser scheduling/seek tolerance; the existing pinned GS1 decoder handles precise paused base sampling. No deterministic export, audio/color/frame-count parity or physical Android acceptance is claimed. Different source rates map seconds to25fps production frames, not one-to-one frame indices. Next: shared deterministic composite renderer/verified final export and durable production-project delivery, without modifying the locked legacy engines.

Baseline/rollback: main `ebdd2eb04f9570a1d8a0d2a440beaade600476d6` (deployed R1). R2 is isolated in its own branch and CapLock directory. Existing AspectLock/SxLock/PreviewLock engines, libraries, projects and sources are untouched. Registry and CapLock workflow changes are scoped to R2 metadata/test coverage.

---

## Historical R1 record

# CapLock · GS-TOOL-CAPLOCK · R1

Functional prototype, October 28, 2026. Independent caption editor at `tools-home/tools/caplock/`.

Owner update during development: abandon ZLock integration; AspectLock already handles picture composition. CapLock does not assign Z0–Z3, consume zoom maps or modify older ZLock implementations. A caption has the separate internal namespace `caplock.caption`. Load the completed AspectLock/SxLock video bed; existing picture, overlays and mixed audio remain in that unchanged source.

## Protected baseline

Main at inspection: `52984f0eaa1e47aba57b87931d753e0973ff751f`. SxLock R27, AspectLock R26, PreviewLock cloud R27. Baseline remains recoverable from Git history. Revert the CapLock feature/navigation commits to roll back; do not clear browser media/project storage.

Protected modules: SxLock `sxlock.js`, `export-engine.mjs` R26, `mp4-duration.js`, `library.json`, both pinned GS1 media dependencies; all existing media and approved sources. Their bytes are unchanged. Existing inline page scripts differ only in release metadata; new navigation is isolated in `shared/caplock-launch.js`. Visible page releases become SxLock R27.1, AspectLock R26.1, PreviewLock R27.1 for navigation; media engines retain their original versions.

Inspected: AGENTS, AI_MUST_READ, root README, master refinement index, phone layout doctrine, SxLock README/HTML/JS/export engine, AspectLock HTML, PreviewLock HTML/cloud page/README, shared navigation/bridge, tools manifests and editable/deployed hub. Existing MotionLock Z names are zoom presets, not a verified compositing-layer registry. No authoritative fixed Z0–Z3 compositing assignment was located; owner subsequently removed that requirement.

Known baseline limitations: physical Android is not established by desktop emulation; older PreviewLock index is a browser catalog prototype; cloud access uses the existing connected PreviewLock session. No cloud storage/backend or existing renderer is changed.

## Implemented

- Centered portrait viewer, padding, pinch zoom/pan and Fit independent of caption coordinates. Dense right-side controls have 44px minimum touch targets. Seek, time/frame readout, phrase strip and selected editor follow the viewer.
- Local video ingress plus existing authenticated PreviewLock catalog/playback. Canonical cloud sources stay remote; no new shadow media library. Local references include filename/size/mtime, never video bytes. Credentials and temporary playback URLs are not written to project JSON.
- TXT/paste segmentation at sentence/clauses before readability fallback. Plain text is explicitly UNTIMED, not estimated speech alignment. SRT/VTT cues retain text and supplied boundaries, quantized to nearest 25fps frame (up to 20ms); original imported seconds remain in JSON until timing edits. Word-level timing is never invented.
- Integer IN, exclusive OUT, duration, selection without retiming, visibility, text/line breaks, split at text cursor and interior current frame, merge-next, duplicate, delete and list reorder. Reordering changes list order, not source timing. Undo/redo covers caption edits; selecting a new source resets edit history to prevent restoring mismatched media references.
- Global font/weight/size/color/outline/shadow/background/alignment/position/width/line-height, emphasis and basic fade/pop preview. Global defaults plus explicit local property overrides. Apply to selected changes only properties edited from its displayed design. Reset selected removes style overrides, retaining text/timing. Named presets and JSON import/export.
- JSON project download/open, temporary browser draft/recovery, SRT/VTT export. Untimed visible phrases block subtitle export. Imported projects are validated; edits and independent source references survive round trip. Reopen cloud sources via stable provider path; reconnect local sources with original file. Save messages distinguish browser draft, requested device download and unavailable cloud save.
- Launch links in Tools, AspectLock and SxLock; PreviewLock exposes CapLock, AspectLock, SxLock and Tools. Named tabs retain active editors instead of reloading them. Navigation itself does not transfer an unfinished composition or mix.

## Frame preview

The unchanged pinned GS1 Mediabunny module provides packet timestamps and paused `VideoSampleSink.getSample(F/25)`. The frame shown is the source sample covering that presentation time. Non-25fps/VFR inputs explicitly map seconds, repeating/skipping source samples as necessary. Native HTML video provides audio/playback; real-time playback remains subject to browser scheduling. Exact paused decode falls back to visibly labeled approximate native seeking when WebCodecs/source decode is unavailable. Final output timing is not claimed: video rendering does not exist in R1.

## Verification

Seven Node core tests pass: segmentation/untimed integrity, imported timing, SRT/VTT boundaries, hidden/untimed behavior, global/local inheritance, JSON recovery and invalid input rejection.

Actual Chromium 153, disposable profile, 390×844 phone viewport: video import; 75 encoded-frame/25fps fixture; explicit 30→25 time mapping; right-hand controls; 9:16 viewer ratio 0.562502; no horizontal page overflow; phrase import/global/local/reset; undo/redo; split/merge preserving outer boundaries; seek/select/frame steps; play/pause/resume; JSON file download/reopen with stable IDs. All five Tools/AspectLock/SxLock/PreviewLock navigation checks passed with zero page-script errors. Frame F25 was decoded and compared to independent FFmpeg frames: closest match is F25; source color equivalence was not established (RGB MAE 10.36 on synthetic high-chroma test pattern). This is a prototype check, not final preview/render color acceptance.

The two project attachments were inspected with FFprobe: `d45c304c031d3413f9199e6ce6555014.mp4` is H.264/AAC 720×1280 at25fps,122.8s; `952b5bdde69df2233c05af1b9c9c0bae.mp4` is HEVC/AAC1080×1920 at30fps,31.811s. No original was modified. These metadata inspections do not establish HEVC support on Android/browser.

Run core tests: `node --test tools-home/tools/caplock/tests/core.test.mjs`.
Run browser tests with a local HTTP server rooted at the repository and Playwright Chromium installed. `BROWSER_EXECUTABLE` and `PLAYWRIGHT_MODULE` override runtime paths. Generate fixtures with `python tools-home/tools/caplock/tests/make-fixtures.py` (3-second testsrc2 portrait H.264270×480 at25/30fps, AAC sine soundtrack on source25). The CapLock prototype workflow runs these checks in GitHub Actions. Browser test: `node tools-home/tools/caplock/tests/browser.cjs`. `LIVE_URL` selects deployed CapLock instead of localhost8765.

## Incomplete / acceptance gates

This is Phase A plus much of Phase B, not production-ready. No burned-in video exporter; no preview/export animation/placement parity or color/audio/frame-count acceptance. Cloud project write routes are implemented; authenticated phone save/reopen and cross-device draft recovery remain unverified. No alignment service, arbitrary timestamped JSON transcript dialect, multi-selection or independent entrance/exit animation parameters. SRT/VTT do not contain visual styles. Android hardware, owner cloud-library auth, pinch usability, codec coverage and full recovery under quota/storage failures remain to verify. No external save is reported without a real receipt.

Next: deterministic separate caption pass using the same caption layout/animation renderer for preview and output; copy original encoded audio when compatible; validate actual frames/audio/color/dimensions independently. Do not reuse MediaRecorder wall-clock capture or alter SxLock's existing engine. Verify the implemented project preservation through the existing authenticated production bridge on the owner’s phone, then physical Android acceptance.
