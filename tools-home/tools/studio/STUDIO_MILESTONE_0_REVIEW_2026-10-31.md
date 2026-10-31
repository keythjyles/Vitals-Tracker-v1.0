# GS Studio — first integration review

October 31, 2026 · Milestone 0 · proposal for owner review

## Scope and result

The returned master handoff has been activated by the owner's “Lets go.” This session inspected the current repository and live tool interfaces, then read the actual saved Pebble cloud manifest. No shell application, provider request, project migration, production edit or cleanup was performed. The pending shell layout discussion remains open; this document makes that discussion concrete.

Repository baseline: `b241d15202ea90a3cac3ae626ebee37e6c3f14a4`.

## Recommended first-pass layout

One project, six compact phase tabs, one active editing engine. Keep actual tool name/ID/version visible inside the phase. The tabs below are proposed labels, not deployed controls.

| Tab | What appears | Existing tool |
| --- | --- | --- |
| Project | Visual project chooser; exact text and phrase groups; Assets; creative discussion and source-production records within this project | Existing shared picker/index and JokeLab; Gemini integration is developed here later |
| Cut | Caption original, source-frame marks and immediately adjacent cut list; versioned passes | Caption Clipper R4 |
| Captions | Numbered components over the bed; explicit Insert; editable layers and directly-under-player placed list | CapLock R9 |
| Scene | Other animation, reaction, graphic/B-roll composition and specialized positioning | AspectLock R27; SceneLock remains a future naming decision |
| Sound | Effects/voice/music placement, matrix and added-effect list | SxLock R27.1; WavLock/Scrubber remain supporting subtools |
| Review | Play the actual composed review export; revisit edits; record review decisions | PreviewLock R29; combined final export and durable frame-note capture need implementation |

The Project tab includes development/source preparation so the phone does not need a tab for every provider or asset type. The six phases remain directly accessible. This does not require completing every phase or purchasing/generating missing assets. A project with a finished bed can start at Cut or Captions. A text-only project stays in Project until source preparation is ready.

Inside editing phases: compact right-hand precision controls, frame/time label above, seek tight beneath the picture, and active items immediately below the player/control dock. Project title, bed selector and Assets remain available through the tucked drawer/grip. One set of phase tabs replaces duplicated app-navigation links within the shell view; standalone module pages retain their own navigation and recovery value. No oversized scrolling transport rail.

Next/Previous element, Insert, Next phase and Review remain separate. Next/Previous pauses and selects without insertion. Insert creates an editable layer. Next phase first saves the outgoing module, then changes engines. It does not render, flatten, approve, regenerate or publish. A failed/conflicting save keeps the current edit in place with a visible retry/recovery path.

## Real Pebble project: current state, independently read

Project identity: `dad-00bda89167b4f15850aa1c91`, title **Pebble**.

Exact saved text:

```text
What did the shy Pebble wish for?
That she was a little BOULDER!
```

Cloud root: `/Grill Sergeant/JokeLab Productions/dad-00bda89167b4f15850aa1c91/`.

Observed manifest metadata: `GS-JokeProject-1` version 1, 43,574 bytes, provider revision `0165f10b6150fdf0000000338214c31`; server modified October 30 at 15:47:19 UTC. The record was read through the authorized Dropbox connection; its complete private contents are not copied into this repository.

| Saved item | Observed state |
| --- | --- |
| Joke/phrases | `joke.txt`, text history and `phrases.txt` exist. Phrase text was fetched and has the intended nine independent groups. |
| Bed | `GS_Jokelet_Pebble_Straight_Stare_v01.mp4`, asset `bed-approved-v01`; metadata confirms 6,398,154 bytes. |
| Caption original | `GS_Pebble_Gemini_NATIVE_CAPTIONS_v02.mp4`, asset `caption-native-v02`; metadata confirms 1,957,328 bytes. |
| Current cuts | Legacy pass `cut-01`, complete, nine clips; no explicit pass version in this older record. The R4 helper interprets this as v1. No v2 was created by this inspection. |
| CapLock edit | Nested `GS-CapLock-1` version 4, paused at frame 138, selected component `cut-01-1`; two components have visible timeline positions. Other components remain in the sequence. |
| Edit history | 62 immutable snapshot references in `caplockHistory`. |
| Backup | Current manifest explicitly says pending. Complete root listing contains one Drive receipt for an earlier project hash, verified October 30 at 00:44:10 UTC. It does not cover the later 15:47 edit. |

This explains the owner's earlier observation: the loaded source is already cut because **the saved project contains nine previously made clips**. Opening the project does not mean the app just chose the cuts or that the owner created them in the recent session.

The newest installed CapLock supports schema 6, but this actual saved project remains schema 4 until deliberately opened/migrated/saved through the verified editor. Do not rewrite the cloud record merely to make an architecture diagram look current. Preserve v4, all sources and snapshot references during migration.

Native source and bed metadata were verified; fresh full-byte decoding/playback and current hashes were not independently rechecked in this milestone. Prior technical/alpha verification remains in the release receipts.

## How Pebble should move through the shell

1. **Open Project → Pebble:** read its manifest/revision, show its own assets, and offer resume at the saved phase/edit. Its current frame 138 and existing placements must survive. The initial project drawer can then tuck away.
2. **Cut:** select `caption-native-v02`, display **Cut · v1 · 9 clips** and the nine editable cut rows directly below the player. New pass is explicit and reserves blank v2 while preserving v1. The bed is not the source being cut.
3. **Captions:** open the exact caption source/pass with CapLock's recorded bed and waiting edit. Existing placements stay where saved. Selecting an unplaced component stages it without inserting. Returning to a placed component seeks to its saved IN and stays editable.
4. **Scene:** keep the same project/assets but use AspectLock's native transforms. If no scene edit exists, show that honestly rather than load Episode 4's hardcoded defaults. Any first selection comes from Pebble's Assets.
5. **Sound:** restore Pebble's native SxLock snapshot if one is registered. Otherwise start a new sound pass for this same bed with no effects inherited from another joke. Existing recordings and approved sound library remain available. This adapter is not built yet.
6. **Review:** review a new combined derivative whose input edit revisions are recorded. Until combined composition rendering is implemented, do not pass the uncomposited bed to PreviewLock and call that the completed studio result.
7. **Return/reopen:** resume the saved phase, module-specific selection/playhead and durable edit references. Project switching must flush writes and reject late async responses from the prior project.

## Actual module findings and adapter work

| Module | What exists | What shell integration must add |
| --- | --- | --- |
| CapLock R9 | Project URL support, visual picker, `openFullJokeProject`, `openJokeWorkspace`, serialized cloud saving, schema migration and native layers | A documented shell-facing pause/open/read-state/save/resume interface; acknowledge save before changing phase; preserve waiting state |
| Clipper R4 | Project/asset query support, shared picker, pass-scoped drafts, durable New pass and batch render | Shell-facing current source/pass/marks/draft context; save an unrendered cut recipe durably before navigation without automatically rendering clips |
| AspectLock R27 | Native spec, selected base/overlay, source playback, transforms/keying/trim and local alignment save | Stable asset-ID/path selection instead of filename matching; per-project native edit snapshots; paused load/resume; remove accidental fallback to unrelated defaults inside shell |
| SxLock R27.1 | Native `snapshot`, recovery queue, actual local source/sound blobs, portable JSON and existing reviewed-assembly message bridge | Durable project identity/asset references and native snapshot storage; explicit pause/flush/import acknowledgements; safe same-project sound asset recovery. Existing bridge is not a generic shell protocol. |
| PreviewLock R29 | Actual cloud player, direct-open filename delivery, local library-membership model | Project-scoped manifest asset/revision selection, combined derivative provenance, durable review state/notes; avoid filename collisions |

SxLock's existing `GS_JOKELET_VIDEO` bridge accepts a reviewed assembly Blob and plan from its opener and saves the previous local project. Do not forge `review.satisfied=true` to bypass that contract for ordinary shell navigation. Add a suitable separate project-adapter interface while preserving the old route.

AspectLock's current native spec uses a 540×960 canvas and distinguishes portrait-perspective editing from the final full-frame output. Preserve those native values and export rules; do not silently reinterpret them as CapLock percentage coordinates. SxLock playhead uses seconds, CapLock uses 25fps composition frames, and Clipper marks native source frames/timestamps. Preserve these timebases explicitly.

Clipper currently keeps unrendered working range changes in a pass-scoped browser draft; durable cut reservation/render records alone do not provide a generic save-draft API. Therefore a shell tab cannot report “all edits saved to Dropbox” just because Save clips exists. Add a revision-checked recipe-only checkpoint before promising save-on-phase-change.

## First implementation slice after layout review

The recommended first slice is **Project → Cut → Captions**, with real durable state and unchanged module engines. This is small enough to verify exact continuity before adding Scene/Sound/Review adapters.

Required engineering decisions for that slice:

- Preserve one stable project identity and manifest revision. Add a compatible, versioned studio context rather than replacing existing schemas.
- Store current phase and module-native snapshot references durably; retain legacy CapLock snapshot/history.
- Provide a recipe-only Clipper checkpoint for unrendered cuts, including source hash, pass identity, marks and cursor. Revision/idempotency checks prevent stale clears and duplicate writes.
- Keep live module instances only as useful operational state; canonical recovery is cloud-backed. One active transport; hidden modules pause. No eager loading of every video engine on the phone.
- Preserve each module's waiting playhead on a tab return. A deliberate “use this frame in next phase” command carries a timebase-tagged transfer separately. Do not silently overwrite all module cursors with one global number.
- If an engine is unloaded to save memory, save and acknowledge its native snapshot first. Undo remains in-session where retained; do not claim persistent undo-history recovery without implementing it.
- Adapter messages use a version, request/correlation ID, allowed origin, verified sender and project-context epoch. Tokens/playback credentials never appear in URLs or messages.
- Define the layout through compact phase tabs, retaining actual module identity within each tab. Alternate owner choice: direct tool-name tabs. Settle that naming/layout before broad page changes.

No Gemini generation, ElevenLabs/HeyGen calls, publishing, paid service changes or cleanup is needed to prove this slice.

## Live inspection evidence and limits

Fresh live page identities observed: SxLock **R27.1**, CapLock **R9**, AspectLock **R27**, Caption Clipper **R4**, PreviewLock **R29**. SxLock retains its compact right transport; CapLock retains independent Bed/Overlay focus and directly-under-player placed list; AspectLock has its fixed controls and added-items matrix; Clipper's cut list immediately follows its marking controls.

CapLock's Open project picker opened and settled with real catalog cards, Grid/List, Search and explicit saved-project connection status. This inspection browser lacks the owner's private PreviewLock browser credential; it displayed the honest fallback message and preserved public catalog previews. The separate authorized Dropbox connector successfully read the actual saved project. No setup key or new login was requested. This browser limitation is not evidence that the owner's phone connection is lost.

No scripts, media or settings were modified by this inspection. Prior test receipts are preserved; no new runtime test result or fully working shell is claimed.

## Discussion checkpoint

Proposed visible order: **Project → Cut → Captions → Scene → Sound → Review**. Inside those tabs, use the existing named tools and their compact player/control layouts. The first code slice would connect only Project/Cut/Captions durably; remaining tabs are integrated as their adapters pass checks, not presented as completed features.

The master handoff explicitly says to show the actual project flow and compact layout for the pending design discussion before implementation. This document completes that inspection/review preparation. Owner agreement on the first-pass structure remains the next step; no unapproved replacement shell has been built.
