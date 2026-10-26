# AspectLock / Grill Sergeant EP4 SC02 — Production intent and engineering record
**Recorded:** 2026-10-25 (America/Chicago; conversation date). **Status:** implementation committed, device QA pending.
**Discovery tags:** AspectLock, PreviewLock, GS, EP4, Timmy, scissors, scene 02, green screen, blue screen, chroma key, alpha, ghost trails, R9, R16.

## Locked production intent
- Maintain source provenance and preserve original video/audio; never substitute an independently rendered composite for the user's AspectLock workflow.
- Bed: `GS_EP4_ASPECTLOCK_PHASE01_AUDIO_RECOVERY_REVIEW_v01.mp4`, full ~66.54s; scene one Timmy is already in this bed.
- SC02 animation: `GS_TIMMY_SCISSORS_CHASE_GEMINI_SOURCE_v01.mp4`, original 10-second landscape green-screen source. Align beginning at **12.5 seconds** (frame 313 at 25fps). Keep overlay source timing unchanged and mute its audio.
- User-approved current overlay geometry in AspectLock: **width 334 px, X 124 px, Y 297 px** (540×960 coordinate system); preserve and do not independently resize or reposition. These are displayed R14 values, subject to user adjustment.
- Do not publish unfinished review renders; do not modify source files.
- Media must be discoverable through PreviewLock's project library; direct Dropbox links are not equivalent to registration in PreviewLock.

## Evidence and regression
- GitHub R9 source at commit `a1b0fdf0d21013b7b47becc2c52630ef160e058f` uses an offscreen canvas, per-frame `getImageData`, blue chroma key, `putImageData`, and composites onto the bed. It worked for scene one.
- Later attempts converted the SC02 green MP4 to VP9 WebM alpha; the user observed accumulated/ghosted characters in AspectLock, while converted alpha did not decode consistently in inspection. Do not rely on this unvalidated asset.
- Screenshot of R14 shows original `Blue removal: On` applied to a green-screen/alpha source. Incorrect mode.
- R16 changes the editor to selectable Green, Blue (legacy R9), Existing Alpha, and Off modes; clears scratch canvas every frame; supports URL `key=green` and `start=12.5`. GitHub commit `3a0e1f07be42e8cd238f154398ddac5e6dcad7b3`.
- **Important:** R16 is not yet visually QA-tested on user's Samsung; chroma thresholds may need adjustment. Do not claim final transparency or publish-ready output without inspection. The original green-screen MP4 is the preferred test input.

## Required acceptance tests
1. Open R16 using PreviewLock-authenticated browser and original SC02 MP4, not experimental WebM.
2. Confirm full bed duration (~66.54s), overlay duration (10s), start at 12.5s, muted overlay audio, original bed audio.
3. At multiple timestamps, verify only one Timmy/scissors pose per frame, no accumulated frames or ghost trails, opaque characters, clean background removal.
4. Confirm 334/124/297 placement and editable 9:16 stage; preserve user control and no implicit rescaling.
5. Render a short review, inspect frames, then full-length export; keep originals intact.
6. If PreviewLock asset absent, register it through its own asset upload workflow before issuing a purported preloaded link.

## Next engineering priorities
- Chroma spill suppression and background sampling/eyedropper, separate tolerance and edge softness, alpha-preserving compositing, frame stepping, before/after visual test.
- Persist asset IDs/paths, not filename-only where possible; searchable thumbnail/duration/status library; provenance and approval gates.
- QA the source duration/export defect and ensure the render spans the entire base.
