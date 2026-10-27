# Sound Scrubber · GS-TOOL-SOUND-SCRUBBER · R14

**GS audio tools master work index:** [`GS_TOOL_REFINEMENT_INDEX.md`](../GS_TOOL_REFINEMENT_INDEX.md). This is the single authoritative record for current step status, release reconciliation, SxLock preservation lock, verification, and rollback. This document retains historical technical detail; do not infer that an old heading is the current release.


Canonical path: `tools-home/tools/sound-scrubber/`. This is the sound discovery and owner review tool. SxLock places approved sounds; WavLock cuts reusable audio components.

Search a sound or use a preset, then Scrub. Each compact row has inline Play, Approve and Reject/Delete at the far right; tap its filename to rename. Delete removes the selected browser recording and intake entry, including previously approved recordings. Deleted candidates may appear in future searches; deletion is not a permanent search ban. Pending candidates are not approved library sounds. Do not auto-approve or auto-import.

Approve saves the actual original through the existing authenticated PreviewLock bridge to Dropbox. Google Drive is mirrored by the existing daily calendar executor. A queued/partial save is not a completed dual-cloud save. See [AUDIO_SAVE.md](AUDIO_SAVE.md) for exact receipts, paths, verification and retry rules. Keep original audio and trimmed derivatives separately.

The right-aligned navigation strip connects Sound Scrubber, SxLock, WavLock and Tools. Each tool has a stable same-origin tab name. A normal tap focuses the already-open tool without reloading its editor; otherwise it opens that tool. The originating tab stays open, preserving its loaded media and unsaved editor state while switching. This is navigation, not automatic audio transfer, cross-device recovery or permanent project storage. Save projects normally before closing tabs. WavLock currently uses file import and local WAV export.

SxLock R1.10 changes navigation and visible identity only. Its recording, mixing, timing, sound IDs and export engine remain unchanged. WavLock R1.2 likewise adds navigation/identity only. Manifests: `tools-home/tools-manifest.json` and `tools-home/source/tools-manifest.json`; editable hub source and deployed hub both expose Sound Scrubber.

## Instant approved-effects handoff — R14 / SxLock R1.11 / WavLock R1.3
Owner directive: Approve must immediately populate the sound library. Both open and subsequently opened tools subscribe to the same browser/profile review ledger and cached original audio. SxLock exposes an Approved effects category (also included in New sounds); WavLock exposes a searchable Approved effects list with Preview/Use. No manual download or file picker is required for these approved sounds. Rename refreshes the library name; rejection removes library availability but preserves already-placed SxLock cues and their project audio. Approval never inserts on the timeline or replaces WavLock's loaded source; Use/Add are explicit.

This live bridge uses existing cached originals for immediate availability, then the existing authenticated Dropbox playback route if cache is absent. Hash and byte checks apply when known. Queued cloud saves remain queued, and Drive backup remains daily; availability is distinct from verified dual-cloud preservation. Same browser/profile only: cross-device catalog discovery is not implemented by this change. Existing approval/metadata bytes and credentials are not copied into public manifests. No new paid services or timers.

## Live verification — October 26, 2026 (America/Chicago)
Deployed commit 1aabd891a9f18999fd4af7c43e347335c74e18fd. Browser test imported a disposable 0.20-second WAV through Scrubber's real file chooser. Pending: zero entries in both editors. Approve: one entry appeared in both already-open editors without reloading; SxLock insertions remained zero and WavLock source stayed unchanged. SxLock Use decoded the original and showed 0.200-second duration without inserting; WavLock Use loaded the waveform directly from the shared original. Filename rename propagated to both lists. Intake rejection removed it from both libraries; the WavLock test editor was reset. Fixture was removed from intake and is not an approved production effect. The isolated browser lacked PreviewLock authentication, so cloud save stayed explicitly queued; this test did not claim a Dropbox/Drive write or physical Android verification. Existing cloud-save behavior was not changed.

## Current owner-directed queue behavior (October 27, 2026)
Approve removes the row immediately while the Dropbox save is in progress. Successful saves stay out of the pending queue. Failed saves reappear below pending entries with Retry, Hold and Delete; Retry hides the row again while saving, and Hold moves it to the end of pending. Delete removes the browser-owned audio and review entry even if previously approved. Rejected search candidates may be rediscovered later; no permanent rejection tombstone. Existing Dropbox/Drive cloud copies are **not** deleted by the current frontend; a verified authenticated server deletion path is still needed. Do not report cloud deletion as completed. Android UI verification remains outstanding. SxLock R24 editor is outside Scrubber modification scope.


## R14.3 — managed deletion transactions

The implemented `/api/audio-delete` route supersedes the browser-only limitation above. Delete immediately removes approval availability, persists a cloud deletion intent, deletes verified managed Dropbox files, and keeps Drive visibly pending until the existing daily connected-account executor supplies a verified deletion receipt. Pending/failed deletions appear below the review queue with one retry/refresh control and resume on reload. No completed-delete claim is made while either destination is pending. Delete inside the detail view uses the same transaction. See [AUDIO_DELETE.md](AUDIO_DELETE.md) for the exact worker protocol and remaining verification.

This release changes Sound Scrubber and its existing backend only; SxLock R24, hosted library IDs, timelines, placed cues, and exports are untouched. Automated provider/state tests passed; live authenticated deletion and physical Android behavior remain unverified.



## R14.4 — owner correction: redo is the next decision

Failed approval is an in-place redo with the same Play / Approve / Delete controls. No separate Failed Saves list, no Hold control or Hold/Culled filters. During a save, the row remains in place with its decision buttons briefly disabled; on failure it becomes the next decision in that same position. Successful approval removes it and brings the next row into that position. Both queue and search refreshes preserve the decision's viewport anchor, and a search candidate is not duplicated into the queue. Existing held entries migrate to ordinary pending without deleting audio. Backend deletion/storage and SxLock are unchanged.

Ten frontend state tests passed, including repeated redo failures, exactly three inline controls, decision/successor viewport anchoring, and legacy Hold migration. Physical Android scroll behavior remains unverified. Source baseline: main `5a01863953d3adea81120731d8a77b926c8c1bea`; rollback is a revert of this R14.4 UI correction. Latest owner instruction supersedes the earlier Failed Saves/Hold requirements retained above as history.



## R14.5 — intake only, no completed-sound list

Owner correction: Scrubber is the decision tool, not the approved library. Removed All/Pending/Approved view controls. Approved/completed sounds are excluded from the queue AND new search results, including legacy approved entries with stale failed-save flags. Approved ledger records, audio, cloud receipts, SxLock and WavLock availability are preserved. Redo remains in-place for unresolved decisions. Shortened the queue instructions and moved manifest export into the existing collapsed Search scope & licensing section.

Eleven frontend state checks passed, including approved-record preservation and exclusion from both review surfaces. Screenshot's generic invalid audio identity/filename save rejection is not diagnosed by this visibility change; do not claim it is fixed. Physical Android acceptance remains open. Baseline main `da2796fe43b7f8ff1b5fdefb482976d3b1fa91e9`; rollback by reverting this UI-only stage.


## R14.6 — private working saw: capture fallback and tucked-away types

Owner direction: anything left in this list is unfinished. Sound-type pills were replaced by one selector inside a closed Sound types disclosure. No approved-sound view returns. Failed-save rows gain only the explicitly requested Record Playback button (●; ■ while recording), alongside the existing decisions. It captures the selected playing media through the browser's media-capture APIs, stops at end/manual stop, converts to PCM WAV, rejects silent/invalid captures, and leaves the result PENDING for playback and explicit approval. It never claims recording means cloud saved. Capture uses a new hash-based stable asset ID and safe WAV filename, preserves the original browser copy and source provenance, and retains known prior managed identities for deletion of all copies if the owner rejects it. No microphone, new service, timer, paid generation, or credential change.

If media capture is unsupported or cross-origin audio cannot be captured, tell the owner to use the phone screen recorder; do not claim the browser can bypass that limitation. Existing import now accepts screen-recording MP4/WebM/MOV as well as audio, extracts its audio to WAV, caches it and presents a pending review item. The source video stays on the phone; this is not a claim of archiving the original video to cloud.

Tests: 16 frontend/state/PCM checks passed, including collapsed type selector, non-silent WAV encoding, silent/invalid capture refusal, pending captured-take staging, original preservation, unsupported-capture messaging, deletion of current/prior managed copies and original cache, and prior redo/visibility regressions. Full frontend script parses. Actual MediaRecorder capture, screen-video decode compatibility, and physical Android flow remain UNVERIFIED. SxLock and backend routes are unchanged. R14.5 code commit `c2ed76a0b1b878dcf1e4e61128fbe31675b3da0c`; combined stage branch `scrubber-private-saw-r14-5`.



## R14.7 — instant decisions, background work, redo at the current focus

Owner correction supersedes R14.4's wait-in-place behavior. Approve/Delete immediately hide the row, stop and release the audition, close that sound's detail player if open, and bring the next row into the same decision position. Pending network/cache work is invisible. Other rows remain actionable; locks are per sound, not a global review lock. Existing cloud mutation requests serialize in the background to respect the backend's single-operation lock, without making the owner wait.

If a hidden save fails, restore that sound as the next decision at the current cursor. If another sound is already being auditioned, insert the redo directly after it without stopping or moving that audition. No Failed Saves or Pending Deletions section; incomplete deletion attempts also return inline at the current cursor. Queue/search each retain explicit display order, preserve the decision/successor viewport anchor, disable native scroll anchoring, and avoid duplicate queue/search rows. Saving rows and approved records remain excluded from the working list. Saved/deleted decisions stay out; original bytes and interrupted-operation recovery semantics are retained. No SxLock or backend edits.

Validation: 21 frontend/state/PCM checks passed, including immediate approve/delete disappearance and playback stop, two slow saves with continued decisions, failure reinsertion at the latest cursor, failure after the actively auditioned sound without interruption, search redo without duplicate queue rows, viewport anchor selection, serialized provider requests and recovery after a failed request, plus earlier capture/storage regressions. Full frontend script parses. These are deterministic DOM/storage/provider doubles; exact physical Android visual behavior remains unverified. Baseline main `9acf0d8a762fcb53066a7aae0090113d691739e4`; revert this UI stage for rollback.
