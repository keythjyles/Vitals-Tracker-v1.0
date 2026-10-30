# Project picker — CapLock R7

October30,2026. This implements project entry inside the existing CapLock, not a replacement editor or the complete studio shell.

Load video at the sticky top opens the studio-owned picker immediately. Cloud waits and errors are displayed inside the open picker. Grid/list views show saved joke projects and preserved catalog jokes by canonical ledger identity, with actual media previews and search. Assets exposes the saved text, bed, original animations, numbered caption components, reactions and other recorded project assets. Other folders navigates the existing complete PreviewLock Dropbox catalog. Device import remains optional, inside the picker.

Opening a saved project restores its existing CapLock state, bed, clips, locks and playhead. Text-only and bed-only projects no longer require a completed caption cut. Choosing another bed is explicit. Assets remain selectable without being automatically inserted. Existing cloud CAS, immutable edit snapshots and queued Drive backup remain in use; a queued mirror is not verified backup.

Existing catalog joke videos are joined by canonical IDs and exact asset IDs. If no folder exists, opening a known joke first saves its recorded literal text, then copies its catalog originals sequentially through the existing project asset endpoint. SHA256 must match before upload; backend byte verification and hash reuse prevent replacing originals or copying the same asset again. Missing/unrecovered legacy text is an explicit gap; no substitute script is invented. No project or media writes occur just from browsing or previewing.

The portrait scene is sized to the minimum of available width and height at9:16, centered in both axes. Loading a source resets the viewing pan/zoom; Fit view does the same. Overlay coordinates remain percentages in the production scene. SxLock and AspectLock source and engines are unchanged.

## Clean production start after testing

Owner directs that, after testing, new production starts with an empty working project and grows from its saved joke text. Test drafts, rejected caption versions and bad assets must not clutter the normal active project/asset picker. Classify actual test/rejected material and move it out of the active workspace into recoverable storage with manifest lineage. Do not erase paid originals, approved masters or saved user edits by treating every old asset as a test. Do not perform cleanup before testing completes or claim a full cloud cleanup from a local draft reset. This release's fixture tests use mocked APIs and disposable browser contexts, not real test uploads to the production folders.

## Verification and remaining scope

Receipt: ../caplock/PROJECT_ENTRY_R7.json. Unit and browser evidence are recorded separately from deployment and physical-phone acceptance. The complete cross-module shell, shared layer adapters and exhaustive historical Drive/Dropbox reconciliation remain outstanding. Existing production-catalog records establish known assets, not a claim that every upstream voice/render/reaction has been reconciled into every project folder. Within-item freeze/speed ramps and final CapLock video export remain unfinished.

Rollback: restore changed app/picker files from e40520366a38bc76a66ffb5fbd1650b97550eba3. Keep every project manifest, original media, immutable edit snapshot and Drive receipt; R7 retains project schema4.
