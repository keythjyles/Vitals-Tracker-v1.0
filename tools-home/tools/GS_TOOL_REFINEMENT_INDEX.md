# GS Tool Refinement — Session Index v1.1

Baseline: 2026-10-27. Work branch: `gs-tools-refinement-baseline-20261027`. Production remains unchanged until reviewed.

## Operating rules
- Execute one numbered step at a time, beginning with 0. Review each change before proceeding.
- Every step: preserve original, version change, verify behavior, record outcome and rollback path.
- Phone-first right-handed UX: narrow rows, controls tightly grouped at far right, no controls obscuring central video/waveform. Tap sound name to rename.
- Sound Scrubber: approve removes pending item and saves approved sound for SxLock; reject removes pending item AND deletes rejected recording and all managed stored copies (not merely hiding it). Queue fills the gap without scroll reset. Rejected sounds may be rediscovered later; do not archive rejected audio. Verify all actual storage destinations before claiming deletion.
- Removing a sound from a collection or episode removes its reference, NOT the approved canonical master. Never delete source videos or existing project placements as collateral.
- Do not publish unfinished media or spend on sound generation without authorization.

## Work index
- [x] **0 — Baseline and version control.** Snapshot starting revisions, create isolated work branch and index; no live deployment.
- [ ] **1 — Right-handed interface (R14.1 review candidate committed; owner/mobile verification pending).** Compact rows, rightmost thumb controls, unobstructed center, rename by tapping name.
- [ ] **2 — Playback and decisions.** Inline preview, approve/delete actions, immediate queue compaction, stable scroll; actual storage deletion for rejected sounds.
- [ ] **3 — Unified sound index.** Search hosted library, recordings, approved effects from one catalog.
- [ ] **4 — Search and classification.** Names, categories, tags, aliases; reclassify without reupload.
- [ ] **5 — Import destinations.** My Recordings, SX Library, or both; one canonical audio asset.
- [ ] **5A — Custom collections.** Unlimited saved named collections referencing approved canonical sounds.
- [ ] **5B — Episode profiles.** Persistent episode effect manifest, load reusable sound starter profiles, save episode sound selection as profile without modifying original.
- [ ] **6 — Scrubber round trip.** Launch fresh/browse from SxLock, preserve current edit state and return.
- [ ] **7 — Immediate synchronization.** Approval instantly populates SxLock without project reset.
- [ ] **8 — Durable storage.** Verify GitHub, Google Drive, Dropbox writes, recovery and delete propagation; no false durability claims.
- [ ] **9 — Mobile regression testing.** Thumb reach, playback, search, import, saved project, restore, export.
- [ ] **10 — Release and documentation.** Version bumps, changelog, verified deployment, rollback instructions.

## Baseline revisions (default branch at inspection)
- `tools-home/tools/sxlock/index.html` — SxLock R1.11 — blob `149ea2bf568094b66bf5c351b7e47296b14fd01c`
- `tools-home/tools/sxlock/sxlock.js` — blob `d085d4a2f14756340de1a3bba3ae735759798618`
- `tools-home/tools/sxlock/library.json` — blob `7b00457a5957512c6be6fee2e727228d7901e852`
- `tools-home/tools/sound-scrubber/index.html` — Sound Scrubber R14 — blob `a3b83a7aa0a801189bdd984a4dd4800094ae9749`

## Release log
- v1.1 index: branch created; index committed on work branch. No production app modification or live verification implied.

- Step 1 review candidate: Sound Scrubber R14.1 CSS-only right-thumb layout, commit `6a500d6a0ab2a50e9c6a7c874d74fed5c2e99ba2`. Existing queue actions and audio code unchanged. NOT deployed on production main. Requires owner mobile review; SxLock right-hand interface not modified.
