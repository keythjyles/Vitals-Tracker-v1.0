# Current productions R4 — implementation checkpoint

Baseline/rollback: main 0a72e79426c3dc848927737cc0bf8a71d8713970. Revert only this change's files to that baseline. Preserve all cloud decision files and original media.

The existing JokeLab entry now loads a scoped module above the unchanged workbench. Current productions use canonical IDs, selected runs and reconciled episode/voice records. Older groups are in All. Inline players, search, editable display names, Approve, Hold, Remove/Restore and playback position use separate overrides. Component approval never modifies publication.ready or paid-generation guards. Removing a production retains sources and duplicate reservations.

Durable metadata: authenticated /api/jokelab-production on the existing PreviewLock service saves one versioned Dropbox document per production under /Grill Sergeant/JokeLab Productions. Writes use expected provider revisions; conflicts fail instead of overwriting another device. Original media never passes through this route. Browser recovery is labeled temporary and failed cloud changes remain retryable. No Drive mirror for these new decision documents is implemented; do not claim dual-cloud save.

SxLock discovery reads only an already-existing SxLock-media database and current project metadata. When original video bytes are present on the same browser, the row previews them and Resume opens the existing editor's project-file importer with that exact snapshot. The editor verifies its own stored source. Return closes the editor tab and focuses the retained JokeLab. SxLock source/encoding/UI files are unchanged. This does not create cross-device project-media recovery. Saved projects absent on this browser require actual cloud-project reconciliation; do not invent them.

Episode 4, bee voice, chicken/egg voice and transparent-caption references are reconciled into the ledger with explicit unresolved statuses. Connected Dropbox discovery evidence is in DISCOVERED_MEDIA_20261028.json. The discovered filenames are not editorial approval. Caption kit references have no verified cloud playback/project link yet.

GS_CHARACTER_REGISTRY.json preserves the real GS4 avatar ID and history-backed ElevenLabs voice procedure, plus original-video references. Classic/Fireside/Daylight/Reaction mappings remain explicitly unverified. GEMINI_CONNECTION_STATUS.md documents the supported API and authentication boundary; direct Gemini integration is not active.

Validation: production-model tests; mocked cloud route save/readback, decision history, restore, stale-write conflict, invalid input/origin rejection; existing content-review regression; syntax checks. Committed/deployed/browser/cloud checks require separate dated receipts below.

Builder's Archive: entrypoint tools-home/tools/jokelab/index.html; editable code current-productions.js/css and production-model.mjs; server tools-home/services/previewlock-api/jokelab-state.mjs; authoritative media pointers PRODUCTION_LEDGER.json plus source recipes. Uses existing GitHub Pages and PreviewLock Render/Dropbox infrastructure; no new paid service. Ownership/credentials recovery remain the owner's existing accounts; secrets are not recorded here.

## Release and verification receipt
- PR #14 merged as 5523ae1aa2f75f4625fa2b85126e743cf5d30fb6; implementation commit 11f6f44631fe566a9225c4c150f4f81e171f1fcb. GitHub Pages run 40797367176 completed successfully.
- Live browser saw JokeLab R4, eight current productions, the unchanged 900-joke source library, search/filter controls and inline audio/video. Bookmark played at 5.592807 seconds with duration 10.36, readyState 4 and no media error. Only browser-extension metadata warnings appeared; no application script error observed.
- Live service health advertises jokeLabProductionVersion:1 and dropboxReady:true. Authenticated production save/readback is NOT verified: this test browser has no existing PreviewLock credential. No setup-key request, credential change or new access grant was made.
- Same-browser SxLock resume is implemented through the existing importer but not exercised with an actual saved editor project in this browser. Cross-device cloud editor restore remains incomplete.
- Full PreviewLock backend suite: 49 tests passed; production model: four tests passed. R4.1 follow-up adds three shipped-frontend tests for failed/offline save recovery, concurrent-edit responses and conflict handling across refresh.
- R4.1 retains expected cloud revisions across reload, offers retry after save failure, protects newer queued name edits and provides Use cloud on detected conflicts. Native controls wait for a cloud media URL. Registry now includes the lookId found explicitly in the saved Farmland preparation record.
- Direct Gemini integration, complete archive reconciliation, approved-reference-image/variant mappings and Drive mirroring of these new decision records remain outstanding. API plugin discovery returned no suitable Gemini connector in the queried results.
