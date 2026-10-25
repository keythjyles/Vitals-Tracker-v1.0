# PreviewLock — controlled implementation checklist
Updated: 2026-10-25

## Fixed scope
Use the existing frame-review app and SxLock. Do not build another player or animation engine. Dropbox is the first cloud delivery candidate; Render is used only if needed for authenticated upload, durable catalog, and cleanup. Never rely on phone storage, browser IndexedDB, GitHub binaries, or ephemeral sandbox links as the canonical video archive. Do not expose PreviewLock as complete until all acceptance gates pass.

## Milestones and verified evidence
- [x] 1. Dropbox connection: Dropbox list_folder root returned successfully, initially empty.
- [x] 2. Create folders: /Grill Sergeant (id:lnTiunUsDy8AAAAAAAAABQ); /Grill Sergeant/Timmy Motion Library (id:lnTiunUsDy8AAAAAAAAABg).
- [ ] 3. Upload TM-002 existing video to /Grill Sergeant/Timmy Motion Library/GS_TM002_POINT_LAUGH_IN_L_OUT_R_POC_v01.mp4. Source video was generated in a previous workspace; Dropbox connector requires an injected conversation file parameter and does not accept a manually constructed local file path. **Do not mark complete until upload returns completed.**
- [ ] 4. Read back metadata (file ID, bytes, revision) and verify playback on Android without using phone storage.
- [ ] 5. Connect existing PreviewLock and SxLock to cloud storage; verify the handoff and clear stale SFX on new source.
- [ ] 6. Persist cloud catalog: source, lineage, status, versions, directional metadata, FPS/duration, reuse tags, approvals.
- [ ] 7. Finalization: explicit FINAL approval, preserve originals/masters/reusable clips, inventory temps, reversible cleanup and permanent audit trail.
- [ ] 8. End-to-end verification, root documentation, enable PreviewLock in tools page.

## Immediate blocker / next action
Establish a supported file reference for TM-002 for Dropbox upload. Do not invent source_file, URL, or success. If connector cannot accept the existing video, use a verified authorized transfer route or request a reattachment only after alternatives are exhausted.

## Change control
Update this file with evidence for each milestone. Never silently mark a step complete. User should not need to repeat prior approvals. No automatic deletions without the explicit finalization gate and recorded retention rules.
