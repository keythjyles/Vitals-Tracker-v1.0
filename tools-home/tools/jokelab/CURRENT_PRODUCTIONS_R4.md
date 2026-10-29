# Current productions R4 — implementation checkpoint

Baseline/rollback: main 0a72e79426c3dc848927737cc0bf8a71d8713970. Revert only this change's files to that baseline. Preserve all cloud decision files and original media.

The existing JokeLab entry now loads a scoped module above the unchanged workbench. Current productions use canonical IDs, selected runs and reconciled episode/voice records. Older groups are in All. Inline players, search, editable display names, Approve, Hold, Remove/Restore and playback position use separate overrides. Component approval never modifies publication.ready or paid-generation guards. Removing a production retains sources and duplicate reservations.

Durable metadata: authenticated /api/jokelab-production on the existing PreviewLock service saves one versioned Dropbox document per production under /Grill Sergeant/JokeLab Productions. Writes use expected provider revisions; conflicts fail instead of overwriting another device. Original media never passes through this route. Browser recovery is labeled temporary and failed cloud changes remain retryable. No Drive mirror for these new decision documents is implemented; do not claim dual-cloud save.

SxLock discovery reads only an already-existing SxLock-media database and current project metadata. When original video bytes are present on the same browser, the row previews them and Resume opens the existing editor's project-file importer with that exact snapshot. The editor verifies its own stored source. Return closes the editor tab and focuses the retained JokeLab. SxLock source/encoding/UI files are unchanged. This does not create cross-device project-media recovery. Saved projects absent on this browser require actual cloud-project reconciliation; do not invent them.

Episode 4, bee voice, chicken/egg voice and transparent-caption references are reconciled into the ledger with explicit unresolved statuses. Connected Dropbox discovery evidence is in DISCOVERED_MEDIA_20261028.json. The discovered filenames are not editorial approval. Caption kit references have no verified cloud playback/project link yet.

GS_CHARACTER_REGISTRY.json preserves the real GS4 avatar ID and history-backed ElevenLabs voice procedure, plus original-video references. Classic/Fireside/Daylight/Reaction mappings remain explicitly unverified. GEMINI_CONNECTION_STATUS.md documents the supported API and authentication boundary; direct Gemini integration is not active.

Validation: production-model tests; mocked cloud route save/readback, decision history, restore, stale-write conflict, invalid input/origin rejection; existing content-review regression; syntax checks. Committed/deployed/browser/cloud checks require separate dated receipts below.

Builder's Archive: entrypoint tools-home/tools/jokelab/index.html; editable code current-productions.js/css and production-model.mjs; server tools-home/services/previewlock-api/jokelab-state.mjs; authoritative media pointers PRODUCTION_LEDGER.json plus source recipes. Uses existing GitHub Pages and PreviewLock Render/Dropbox infrastructure; no new paid service. Ownership/credentials recovery remain the owner's existing accounts; secrets are not recorded here.
