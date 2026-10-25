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
