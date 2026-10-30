# R29 — project caption cutter and single-column player
One right-hand transport column; app buttons appear once across the sticky player bottom. Joke project/text/animation save, ordered IN/OUT cuts, real alpha clip generation and Finish clips → CapLock. See ../jokelab/ANIMATED_CAPTION_WORKFLOW.md for source/backup rules and limits.

# PreviewLock — AI-to-reviewer delivery protocol

**Status: user-verified October 25, 2026.** This is the standard delivery workflow for Grill Sergeant video previews. Do not substitute a sandbox download link for the cloud handoff.

## Authoritative workflow

1. Render an actual playable MP4. Confirm the local output exists and is a valid video before claiming it is ready.
2. Upload the MP4 to the connected Dropbox folder **/Grill Sergeant/Timmy Motion Library/** (the currently working PreviewLock library folder). For other assets use an existing folder under **/Grill Sergeant/** that PreviewLock indexes. Preserve descriptive filenames, spaces are allowed, and use the `.mp4` extension for stored files.
3. **Wait for a completed upload confirmation** (including async upload status). A submitted or in-progress upload is not a completed delivery.
4. Deliver the PreviewLock direct-open URL, with the filename URL-encoded in the `open` parameter:

   `https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/tools/previewlock/cloud-test.html?v=R23&open=ENCODED_FILENAME.mp4`

   Replace `ENCODED_FILENAME.mp4` with `encodeURIComponent(exactStoredFilename)`. The `v` parameter is for cache busting/build identification; use the current actual published version, not an invented one. The `open` parameter selects the asset from the connected library. Do not include API secrets in links.
5. The user opens the link in PreviewLock, where the intended video loads in the player, with timecode, frame counter, play/pause, seeking and library controls available. The user verified this end-to-end with `PreviewLock_Test_Timmy_Motion_v01.mp4` on October 25, 2026 (screenshot showed the video loaded at frame 129, 0:05.145).
6. Request review or revisions **in PreviewLock**, not via a chat attachment. Do not claim notes have been received automatically: **persistent frame-specific review notes and AI retrieval are not yet implemented**.

## Operational rules

- PreviewLock is the review destination, not the chat download link. The user should not need to download, locate, import or re-upload the rendered video.
- Preserve source assets and version renders. Use descriptive versioned names; never overwrite an approved master without explicit authorization.
- Confirm actual upload success before sending the handoff URL. If direct-open fails, investigate URL parsing, the requested filename, connection state, asset listing, and player loading; do not call it successful merely because the video appears in the library.
- Do not repeatedly demand testing of already user-verified features. User verified cloud connectivity, library, thumbnails, sorting, playback and the successful direct-open handoff.
- The video player supports tap-to-pause/resume, a slim seek bar, frame stepping, and an in-page expanded viewer that retains controls.
- Do not expose Dropbox OAuth secrets or PreviewLock setup keys in repository files, chat or links.
- The frontend lives at `tools-home/tools/previewlock/cloud-test.html`; the backend lives at `tools-home/services/previewlock-api/server.js` and runs at `https://gs-previewlock-api.onrender.com`.
- Current unfinished acceptance requirement: frame/timecode-specific notes, durable saving, and agent retrieval so revisions can be executed from the notes. Never claim this part is solved before it is implemented and tested.

## Known successful acceptance test

Render: `PreviewLock_Test_Timmy_Motion_v01.mp4` (6-second Timmy motion test).

Dropbox path: `/Grill Sergeant/Timmy Motion Library/PreviewLock_Test_Timmy_Motion_v01.mp4`.

Result: upload returned completed; user opened PreviewLock, confirmed the intended render was playing in the reviewer, and said **“Success!!”**

This test establishes the render → Dropbox → direct-open PreviewLock workflow. It does not establish automatic review-note transfer.


## Grill Sergeant animation source-of-truth — Gemini (October 25, 2026)

**Gemini is the user's established animation-generation workflow.** The user explicitly identified the Timmy animation visible in the PreviewLock screenshot as **Gemini-rendered Timmy**. Do not misidentify it as an earlier assistant-made animation, an approved v10 head-turn composite, or a generic test asset. Do not default to recommending paid animation services or complicated external animation pipelines when Gemini is already producing the required animation.

**Required procedure:** identify the exact Gemini-generated source and version that the user approved; inspect the actual file, not just its thumbnail; preserve the original; composite that exact animation into the clean video bed; render a versioned preview; upload it to the PreviewLock Dropbox library; share a direct-open PreviewLock URL; collect revisions. Never silently substitute a different Timmy clip or infer asset identity from similar-looking thumbnails. If the approved Gemini file is unavailable, locate it in connected libraries or ask for the exact file instead of guessing.

**Distinguish tools:** Gemini = animation generation; PreviewLock = review/delivery; FrameLock/AnchorLock = stabilization; MotionLock = compositing motion; SxLock/WavLock = audio and sound tools. Use only the stages the actual deliverable requires. Avoid unnecessary paid services.

**Known failure:** On October 25, an incorrect Timmy clip was composited and the user identified the intended Gemini-rendered Timmy in a screenshot. This is an asset-selection error, not a reason to replace Gemini with another service. Source identification must be verified before compositing.

## R28 — direct playback and compact right-hand layout (October29)
Uses AspectLockR26.1 stage-left/right82px rail and SxLockR27.1 stacked controls as references; neither reference tool is modified. PreviewLock retains project membership, source media, cloud auth, rename/duplicate/unlink/import/export/tool navigation. Playback+paired frame steps are tightly grouped at right. Import and settings remain collapsed.

Playback repair: open the exact Timmy Motion Library filename FIRST, without waiting for recursive catalog or thumbnails. Successful selection joins this browser's existing project. Backend asset-catalog.mjs follows every Dropbox cursor, errors instead of returning misleading partial data, and exposes assetCatalogVersion2 in health. Existing API bearer security remains unchanged. An absent browser connection, autoplay refusal and decoder/network failure are explicit; Reload is adjacent to player. deliveries.json supplies only the observed existing private Drive review URL as a saved-copy fallback; it contains no secrets, new sharing grants or public media. Local device preview is local-only and uploads nothing.

Checks before deployment:4 playback tests (exact file before slow/failed catalog, selection race, absent auth, autoplay rejection);69 backend tests including3 new pagination/failure/cursor tests. Live browser/physical-phone verification is separate and must be recorded after deployment. No new paid generation.

Rollback: restore cloud-test.html and server.js from c0df90fe3872eb0407ae1bb209ba748c62425cbf; remove R28-only JS/CSS/module imports. Source media/project caches were not migrated or removed.
