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
