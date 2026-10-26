# Production Tool Change Notes — 2026-10-26

## PreviewLock v0.2
**Issue:** v0.1 relied on a device file picker and browser-local IndexedDB catalog; it could not browse the shared Dropbox production inventory.
**Implementation:** Added cloud media picker using the existing gs-previewlock-api endpoint (/api/assets and /api/playback), filename/path search, EP4 shortcut, and direct playback into the existing player. Preserved device import. Bumped visible version to v0.2.
**Why:** Users must select and preview existing production assets without downloading and re-uploading them.
**Commits:** b9aa2fa3c93f0654ebdfbaca7dce403844b36df5 (picker); 3b7b7547fa54fd289c90fae9b2175e2b04175bf7 (version).
**Verification:** Code committed; live deployment, authentication, inventory visibility, and playback NOT verified. Existing API key in browser localStorage is still required; no authentication repair was implemented.

## AspectLock R17
**Issue:** Browser-generated MP4 export showed roughly four seconds in the user's player although inspection of uploaded output indicated ~66.67 s video and ~66.62 s audio, with irregular video timestamps.
**Implementation:** Changed MediaRecorder MIME preference from MP4-first to WebM-only, updated export messaging, bumped visible title/version from R16 to R17.
**Why:** Avoid the browser MP4 recording path associated with unreliable duration metadata.
**Commits:** cfb376205405fa4b0243578d88d308af82574f18 (recorder); 6268b557529184d28c77bed4af6f5fd9596bf325 (version).
**Verification:** Code committed; full-length WebM export and playback NOT tested. WebM is a workaround, not an MP4 repair. A validated MP4 encoder/transcode path remains required.

## EP4 inputs and timing
Base: GS_EP4_ANIM_LAYER03_TIMMY_SMOKE_FLATTENED_v01.mp4
Overlay: GS_ROBOT_TIMMY_GUACAMOLE_TRIM_8P76S_v01.mp4
Start: master frame 1374 (54.960s); duration 219 frames at 25 fps (8.76s); stop before outro frame 1593 (63.720s). Use blue-screen chroma key, overlay muted, base audio preserved. Original 10s Gemini source remains preserved.
Dropbox EP4 folder contains the base, trimmed overlay, and metadata-repaired prior export. The undersized Layer04 composite is rejected; do not treat as approved.

## Required production gates
1. Identify correct sources in shared library; load and confirm both in AspectLock.
2. Review transparency, scale, position, sync and timing; secure operator approval before flattening.
3. Export, verify full duration, seeking, frame continuity and audio.
4. Register reviewed output in PreviewLock/Dropbox; promote to publishing master only on approval.
5. Every functional change must include visible version bump and change rationale in the same commit, plus verification evidence before calling it production-ready.

**Open issues:** Authenticate PreviewLock reliably; test live Dropbox picker; test AspectLock R17 full-length render; provide stable publishable MP4 export; automate output registration. No live end-to-end validation yet.
