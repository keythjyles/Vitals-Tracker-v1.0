## CapLock R21 — local video passes, November 2, 2026

Owner correction: save the placed captions into a new video bed, then run CapLock over that video again to add any missing caption or animation. A missing first caption need not be merged back into the old queue. Save, recover & export now offers Save video / Resave video and Use as new bed. The existing compositor renders only placed/visible layers, keeps the complete bed and soundtrack, applies R20 background removal, and downloads a distinct MP4 pass. Resave reuses an unchanged completed output. Starting the next pass archives the editable previous workspace and clears its overlay list so rendered captions are not doubled.

No cloud project, upload or credentials are needed for a loaded local video. The original source and component files remain intact. Download project remains the separate editable JSON save. A key cache includes current media connections, so a different same-name file cannot reuse an old render. Cancellation retains edits; starting a pass requires a requested video download and a render matching the current edits.

For the owner's already-open R20 work, keep that tab open and download its project JSON before switching. The explicit R21 `?recover=local` link restores the saved draft; Reconnect files selects the original bed and caption files together by exact filename/size and preserves the six placements, timing, geometry and background settings. Unrelated selected files are not added as layers. Project JSON alone contains references, not video bytes. Normal unbound launch remains cloud-independent and does not auto-open an unrelated project.

R18 compact geometry, R19 named imports, R20 keying, source cuts, existing cloud/Studio routes and adjacent editing engines remain intact. Schema7 is unchanged. Rollback: `4fddec66cac0c0cec32d6c465315b60d23f3b64b`; retain all video downloads, source files, schema7 projects and recovery archives. Verification: [LOCAL_PASSES_R21.json](tools-home/tools/caplock/LOCAL_PASSES_R21.json). Local 78 Node checks passed; browser/export/deployment receipts are recorded separately.

## CapLock R20 — automatic caption background removal, November 2, 2026

Owner correction: caption/animation imports must remove a solid background inside CapLock, as AspectLock does. A separate transparent ZIP or external conversion is not a prerequisite. R20 follows AspectLock's scratch-canvas compositing approach, automatically samples a uniform solid edge color on visual imports and applies the same alpha operation during preview and the existing captioned-video export. Genuine alpha input remains unchanged. Original bytes, cut marks, source cadence, bed soundtrack and editable placement are preserved. AspectLock itself is unchanged.

Caption background adjustments live inside each item's properties: remove on/off, sampled color, Auto-detect, tolerance and soft edge. The player retains R18's one-line header and short right rail. Local Files/Photos and named caption imports retain R19's cloud-independent workflow. A nonuniform or transparent border is not guessed to be a solid background; manual color controls remain available.

Project schema7 retains the key settings through drafts, JSON, undo/redo and cloud saves; versions1–6 migrate without changing existing timing/geometry. Older clients reject schema7 rather than discarding keys. The production recipe includes enabled background settings so changing a key invalidates a previous captioned output. Baseline/rollback: `771c5fb364f625ae60f050722688ede4718abff6`; preserve all schema7 JSON, source media, projects and recovery data on rollback. Verification: [CAPTION_BACKGROUND_R20.json](tools-home/tools/caplock/CAPTION_BACKGROUND_R20.json). Local 75 Node checks passed; browser/export/deployment acceptance is recorded separately.

## CapLock R19 — named caption file import, November 2, 2026

The device importer now accepts the owner's numbered descriptive names, including `1 why did test 1.mp4` through `7 slide test 1.mp4`, as well as numbered WebM and saved ALP components. Selection order does not matter: the leading component number determines the queue. Original filenames, media bytes, native cut marks, existing placements and the R18 compact/local workspace remain intact.

Import progress and errors appear directly below the caption-sheet heading. A batch becomes editable only after every selected component decodes; a failed batch leaves the prior queue and edits intact, clears the picker for retry and reports the failure. No cloud connection is required for a local workspace. MP4 import retains its existing background; use the already-provided transparent WebM components for alpha overlays.

Baseline/rollback: `7e6ad7d7d3c20271ddcb14e983b12c73f4c5dc2d`. Restore source only; retain all original media, projects and browser recovery data. Verification: [NAMED_IMPORT_R19.json](tools-home/tools/caplock/NAMED_IMPORT_R19.json). The 72 local Node checks passed; browser/deployment receipts are recorded separately.

## CapLock R18 — local video loading and compact workspace, November 2, 2026

Owner correction: Files and Photos load a device video immediately. A cloud project, upload, setup key and the former 40 MB cloud limit are not prerequisites for manual placement. Import captions opens the numbered local-file picker in a local workspace. Merely having an old PreviewLock connection no longer auto-opens an unrelated cloud joke. Explicit project links, Open project and Studio retain the existing saved-project routes; `?new=cloud-video` retains explicit agent cloud ingress.

The visible tool identity, filename and clock share one 16 px line with the source grip. Only CapLock uses the owner-requested shorter rows (25 px), paired frame row (32 px) and 4 px gaps; the other editors retain their locked SxLock R24 dimensions. The item map and Undo/Redo are shorter. Original media, imported captions, source timing, precision controls and editable layers remain intact. A late cloud-save response cannot replace a newly selected local workspace. Local edits remain browser drafts until Download project; file loading is not a cloud-save receipt.

Baseline/rollback: `e7f8d6eb7fba1c645631f449d57826240afa691d`. Retain all original media, saved projects and recovery data on rollback. Operation and verification: [LOCAL_ENTRY_R18.json](tools-home/tools/caplock/LOCAL_ENTRY_R18.json). Deployment/browser receipts are recorded separately from the 70 passing local Node checks.

## Caption save recovery — November 2, 2026

Clipper R16 / CapLock R17 repair the six-component field-test failure. The server timed out on the last clip after saving five. Retry reuses the same source-bound cut pass, verifies and retains completed files, and renders only missing components. Stopped or interrupted jobs expose Resume; active jobs expose frame progress. Named partial files remain downloadable. Reopening an already-saved jokelet reads its verified project instead of attempting a blocked write. Lossless encoding is faster with unchanged decoded color/alpha pixels. [Operation and validation](tools-home/tools/cliplock/CAPTION_RECOVERY_R16.json). Originals, exact native cut marks, prior passes, editor state and the locked player equipment are retained.

## Verified production stages — November 2, 2026

CapLock R16 now produces a captioned composite and opens the same single-joke project in SxLock R31. SxLock saves the editable sound pass and verified jokelet. Clipper R15 remains optional; Studio R2 skips cutting in its normal joke route. Stage-aware lists default to ready inputs with Show all files off. Originals, layers, captions and prior versions are retained. The locked player equipment is unchanged. [Operation, file extensions, rebuild contract and rollback](tools-home/tools/studio/PRODUCTION_STAGES_R16.md). Earlier release sections remain historical.

# AI MUST READ — GS / Vitals Tracker repository

**Mandatory entry point for every AI operator before inspecting, editing, deploying, deleting, or publishing anything in this repository.** Read the documents applicable to the task, then inspect the actual code, data, and current production state. Do not assume a prior chat or a document heading reflects the current deployed version.

## Universal reading order — required for every task
1. [AGENTS.md](AGENTS.md) — binding operator rules, asset preservation, storage, approvals, change control, deployment restrictions.
2. [GS Audio Tools Master Work Index](tools-home/tools/GS_TOOL_REFINEMENT_INDEX.md) — current step, verified status, releases, rollback, and protected SxLock baseline. For audio work this is the authoritative current progress ledger; for other work use its cross-references only where relevant.
3. [Repository README](README.md) — repository-level entry and preview delivery rules.
4. **Task-specific source and manifests** — read the relevant documents below and inspect current application code and storage before making changes.

## Task-specific required reading

### Sound Scrubber / SxLock / WavLock / sound catalog
- [Sound Scrubber README](tools-home/tools/sound-scrubber/README.md)
- [Sound Scrubber AUDIO_SAVE](tools-home/tools/sound-scrubber/AUDIO_SAVE.md)
- [SxLock README](tools-home/tools/sxlock/README.md)
- [GS Audio Tools Master Work Index](tools-home/tools/GS_TOOL_REFINEMENT_INDEX.md)
- Inspect the relevant live code and catalogs: `tools-home/tools/sound-scrubber/index.html`, `tools-home/tools/sxlock/index.html`, `tools-home/tools/sxlock/sxlock.js`, `tools-home/tools/sxlock/library.json`, and shared audio bridges as needed.
- **Preservation lock:** SxLock's user-approved R24 interface and existing media/projects must not be altered during Sound Scrubber work. The old R1.11/R1.7 headings are not the actual UI revision.

### Timmy character, animation, and compositing
- [Timmy Character Bible](tools-home/assets/timmy/CHARACTER_BIBLE.md)
- [Timmy Asset Manifest](tools-home/assets/timmy/MANIFEST.md)
- [Timmy Production Handoff](tools-home/assets/timmy/PRODUCTION_HANDOFF.md)
- Preserve approved references, transparent masters, and provenance. Do not regenerate or substitute an approved character by assumption.

### Video review, media delivery, and publishing
- [PreviewLock README](tools-home/tools/previewlock/README.md)
- Read the media preservation, approval, publishing, and Google Drive/Dropbox rules in [AGENTS.md](AGENTS.md).
- Verify finished media and approvals before scheduling or publishing. Never treat raw/unfinished derivatives as publishable.

### Other tools or workflows
- Read [AGENTS.md](AGENTS.md), then locate and read the tool's own README, manifest, production handoff, and source. If a required document is absent, record the gap in the relevant index before acting; do not invent a file or a policy.

## Mandatory operating checklist
- Identify task, source-of-truth index, active release, current branch, and user-approved baseline.
- Record source file revisions and preserve a recoverable rollback before editing.
- Do not change adjacent tools or delete canonical assets as collateral.
- Distinguish **committed**, **deployed**, **browser-tested**, and **cloud-verified**; each requires separate evidence.
- Update the master index/manifest with the actual commit, result, known gaps, and next step.
- If the task requires permissions, credentials, live provider data, or confirmation that is unavailable, state the limitation; never claim success from an unverified write.

**This document is a navigation and reading contract, not a substitute for the underlying documents.**

## Render workspace and service discovery
Before Render/Gemini/GS backend work, read [RENDER_SERVICE_MAP.json](tools-home/tools/jokelab/RENDER_SERVICE_MAP.json). The workspace question is resolved; route GS media/Gemini checks to gs-previewlock-api and voice to jokelet-api. The root lex-backend is a separate legacy VA-analysis/testing runtime. Current service metadata wins if IDs/build paths have changed; do not infer service identity from the shared repository name.

## Studio shell design and cross-platform continuation — October 31, 2026

Read the [portable GS Studio Master Handoff](tools-home/tools/studio/GS_STUDIO_MASTER_HANDOFF_2026-10-31.md) before studio/container work. It consolidates the existing tools, project/asset workflow, source/API map, implementation sequence and verification limits. The owner requested this document for reuse as instructions; creating it does not implement or approve a shell layout. Preserve the pending design discussion and never adopt the explicitly unapproved shell Site as the plan.

