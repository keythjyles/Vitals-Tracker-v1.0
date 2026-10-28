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

Actual Chromium 153, disposable profile, 390×844 phone viewport: video import; 75 encoded-frame/25fps fixture; explicit 30→25 time mapping; right-hand controls; 9:16 viewer ratio 0.562502; no horizontal page overflow; phrase import/global/local/reset; undo/redo; seek/select/frame steps; play/pause/resume; JSON file download/reopen with stable IDs. Zero page-script errors. Frame F25 was decoded and compared to independent FFmpeg frames: closest match is F25; source color equivalence was not established (RGB MAE 10.36 on synthetic high-chroma test pattern). This is a prototype check, not final preview/render color acceptance.

The two project attachments were inspected with FFprobe: `d45c304c031d3413f9199e6ce6555014.mp4` is H.264/AAC 720×1280 at25fps,122.8s; `952b5bdde69df2233c05af1b9c9c0bae.mp4` is HEVC/AAC1080×1920 at30fps,31.811s. No original was modified. These metadata inspections do not establish HEVC support on Android/browser.

Run core tests: `node --test tools-home/tools/caplock/tests/core.test.mjs`.
Run browser tests with a local HTTP server rooted at the repository and Playwright Chromium installed. `BROWSER_EXECUTABLE` and `PLAYWRIGHT_MODULE` override runtime paths. Generate `/tmp/caplock-fixtures/source25.mp4` and `source30.mp4` as3-second testsrc2 portrait H.264270×480 fixtures at25/30fps; include an AAC sine soundtrack on source25. Browser test: `node tools-home/tools/caplock/tests/browser.cjs`. `LIVE_URL` selects deployed CapLock instead of localhost8765.

## Incomplete / acceptance gates

This is Phase A plus much of Phase B, not production-ready. No burned-in video exporter; no preview/export animation/placement parity or color/audio/frame-count acceptance. No cloud project write/verified cross-device draft recovery, alignment service, arbitrary timestamped JSON transcript dialect, multi-selection or independent entrance/exit animation parameters. SRT/VTT do not contain visual styles. Android hardware, owner cloud-library auth, pinch usability, codec coverage and full recovery under quota/storage failures remain to verify. No external save is reported without a real receipt.

Next: deterministic separate caption pass using the same caption layout/animation renderer for preview and output; copy original encoded audio when compatible; validate actual frames/audio/color/dimensions independently. Do not reuse MediaRecorder wall-clock capture or alter SxLock's existing engine. Complete cloud project preservation through the existing authenticated production bridge, then physical Android acceptance.
