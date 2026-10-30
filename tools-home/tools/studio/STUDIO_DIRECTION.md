# Grill Sergeant Studio — owner direction

October 30, 2026. **Status: CapLock R8 implements project-first visual entry/picker and focused compositing; the complete studio shell and cross-module adapters remain unbuilt.** Existing modules continue working. This direction supersedes treating CapLock and AspectLock as disconnected production destinations.

## Product model

One joke project opens the entire studio. The initial visual bed selection identifies the canonical project and loads its manifest, saved working bed, original and clipped caption animations, character/reaction clips, other overlays, B-roll, voice, SFX, ambience/music and outro. Selecting a bed from an existing project must not require rediscovering its assets through phone folders. A home video or unrelated bed can create a project, then imported assets join that project deliberately.

CapLock and AspectLock are specialized compositing views. CapLock supports repeated/multiple caption and animation insertions; AspectLock offers the existing perspective/compositing controls. Preserve their proven functions while converging on shared project/layer data. SxLock is the sound-editing module; PreviewLock is review. Do not silently replace the working SxLock or AspectLock renderers to make the shell look unified.

## Picker contract

The primary picker is owned by the studio and reads durable project folders, rather than invoking Google Photos or relying on phone Downloads. Provide grid and compact list modes, actual visual thumbnails, inline playable previews and searchable project/asset names. Include clear asset roles and original/derivative lineage where useful. Choosing a project bed scopes every module to that project's assets. Changing folder is deliberate; opening a module never resets the picker to the entire cloud library. A device picker is optional import ingress only.

Resolve project identity by manifest/stable asset ID/hash and verified ancestry, not filename resemblance. Reconcile existing Drive/Dropbox/GitHub records before representing the library as complete; never regenerate a paid asset because its catalog is stale.

## Shared state and navigation

Top tabs provide direct access to project/assets, caption clipper, CapLock, AspectLock, SxLock and PreviewLock. Logical phase order is visible, while tabs permit deliberate jumps. Exact ordering can follow the project's production recipe; compositing and sound passes are reusable, not a forced linear episode builder.

- **Next element / Previous element:** select an asset in the current phase; keep the bed paused at the current production frame. Selection does not insert it.
- **Insert:** explicitly commit the selected item's timing and geometry to the shared project; preserve an editable layer and original source.
- **Next phase:** save the module edit and move to the next production phase with the same project, bed, frame and assets.
- **Module tabs:** preserve each module's exact waiting edit, media references, selection, playhead and undo/recovery state. Do not reimport, clear a project or flatten layers merely to change tabs.

A tab wrapper alone does not satisfy this contract. Module adapters must read/write one canonical project context, with versioned per-module edit records and verified save acknowledgements. The project manifest is the source of truth; iframe or browser memory can only be an operational view.

## Storage and Rule 1

Dropbox is the current working joke-project home under /Grill Sergeant/JokeLab Productions/<canonical-id>; Drive is its backup through the established verified-receipt executor. GitHub preserves code, schemas, manifests/provenance and recovery instructions. Imported assets must be saved into, or durably linked with verified lineage to, the selected joke project before a completed save is reported. Preserve immutable originals, approved masters, source hashes, module edit history, ownership, costs and credential recovery instructions without publishing secrets. No automatic approval, source deletion, paid generation or publishing-schedule change follows from a studio tab selection.

## Starting point already being built

CapLock R6 imports finished caption batches from the saved joke folder, links the original animation, loads numbered cuts, separates Previous/Next from Insert and stores queue/locks in version4 project JSON. PreviewLock's existing clipper passes the exact project and caption asset. This is a module foundation, not an implemented studio shell or complete cross-module handoff. The general animation/graphic/audio import remains available; caption-specific controls must not eliminate other composition uses.

## Delivery gates

Before claiming the studio operational, verify project/bed selection recovers the real associated assets; grid/list previews play; each tab resumes the same edit without source duplication; Next element, Insert and Next phase have distinct effects; original and module edits survive close/reopen and cloud recovery; and the existing SxLock/AspectLock picture/audio behavior remains preserved. Test with actual saved jokes and media, retaining explicit phone/authenticated-cloud verification limits.

## R7 project-entry implementation and clean production start

[PROJECT_PICKER_R7.md](PROJECT_PICKER_R7.md) records the implemented sticky bed control, visual project/catalog picker, source-preserving legacy import, project asset selection and viewport centering. This is a shared module used by CapLock, not a finished cross-module shell. After owner testing, start clean from a new saved joke text; remove test/rejected material from active selection while retaining recoverable originals and lineage. Do not populate the new workspace with test overlays or auto-open an old caption batch as the new production. Cleanup remains pending owner testing and verified classification.

## R8 owner corrections — project and focused surfaces

[FOCUSED_WORKSPACE_R8.md](../caplock/FOCUSED_WORKSPACE_R8.md) governs the current entry and editing model. Open project is the entry; never frame the normal workflow as picking a bare video file. The suite reveals saved text/scripts/transcripts, source media/clips/sounds, alternate animations/reactions, HeyGen/ElevenLabs originals and their recorded settings/lineage, with individual asset saves. Reconcile missing historical provider/source records explicitly; no automatic paid regeneration. Other-folder/device ingress remains inside a current project.

Fixed outer player, independently transformable bed and overlays, explicit focus, no bed-edge editing constraint. Loaded projects tuck title/version/project controls into a pull-down drawer; the player/transport/seek/placement stay docked. Schema5 preserves the new transforms and reads legacy projects. The complete cross-module shell/adapters remain unbuilt.

Future performance records should bind exact source/project/export versions to platform post IDs, release dates and metrics, with organic and paid separate. This is planned, not an implemented analytics dashboard or a scheduled job. Clean-start requirements remain pending owner testing; preserve recoverable originals and keep test/rejected material out of active selection.
