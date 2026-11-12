# GS Global Uploads and Production Asset Ledger — v1
Created 2026-11-12. Scope: ALL Grill Sergeant productions, not just Chapter 3.

## Canonical event fields
- asset_id: immutable UUID or stable asset key
- project_id / scene_id / parent_asset_ids: exact associations
- source_filename, source_uri, source_service, upload_timestamp_utc
- canonical_filename, current_uri, all_storage_locations
- sha256 and size_bytes for byte-for-byte identity
- event_type: UPLOADED, RENAMED, COPIED, DERIVED, SUBMITTED_TO_HEYGEN, RENDERED, REVIEWED, APPROVED_SOURCE, APPROVED_EDIT, REJECTED, ARCHIVED
- event_timestamp_utc, actor, approval_reference, notes, input_asset_ids, render_parameters, cost when known
- append-only history; never silently overwrite prior events or approvals.

## Operating rules
1. Register each uploaded file before processing; retain its original name and stable ID.
2. Every rename and cloud copy is a new ledger event, not a replacement of the original.
3. Every derivative lists exact input asset IDs, source timecodes, trim handles, original audio track, output duration, and checksums.
4. Paid renders require an approved exact image asset ID and audio asset ID, plus a preflight review. Save vendor video ID and cost if known.
5. Never promote a REVIEW to APPROVED without explicit user decision.
6. All outputs: verify frame order, audio synchronization, first/last frames and cuts before release.
7. Global assets and scene-specific copies have distinct associations. Store canonical global references in GS_GLOBAL_ASSETS.
8. A failed backup (e.g., Dropbox insufficient storage) is recorded as FAILED, never as verified.
9. Preserve rejected footage and source provenance; do not use rejected footage in approved assemblies.

## Initial Chapter 3 lineage
- Source `19296.mp4` -> `GS_CHARACTER_3_INTRO_THRU_SC05_APPROVED.mp4`, approved through Scene 5. Drive ID `1loedO8MVaFAnDA3e62sEOFzHtHGy62NZ`.
- Source `19245.mp4` -> `CH03_INTRO_SC06_FAMILY_DENIAL_SOURCE.mp4`, approved family-denial B-roll, approximately 3.25 seconds.
- Source `00_Original_Narration_Part_B.mp3` -> original audio master, no speed changes.
- Derived `GS_CHARACTER_3_INTRO_THRU_SC06_REVIEW.mp4`: Scenes 1–5 + Scene 6, review pending. Scene 6 audio starts at Part B offset 16.690 seconds (based on preceding assembly duration); spoken cue requires review.
- Dropbox backup for Scene 5 previously failed due to insufficient storage; do not claim a successful Dropbox copy.

This document is the initial schema and event record, not yet an automated ingestion service.