# GS Audio Tools — Master Work Index v1.2

**Mandatory AI onboarding:** [AI MUST READ](../../AI_MUST_READ.md) — read before any changes. It lists universal and task-specific required documents; preserve source material and follow the master index.


Baseline: 2026-10-27. Original work branch: `gs-tools-refinement-baseline-20261027`. Step 1 was merged to production in PR #1; subsequent Sound Scrubber fixes were committed directly to main. Live GitHub Pages verification is still required.

## Operating rules
- Execute one numbered step at a time, beginning with 0. Review each change before proceeding.
- Every step: preserve original, version change, verify behavior, record outcome and rollback path.
- Phone-first right-handed UX: narrow rows, controls tightly grouped at far right, no controls obscuring central video/waveform. Tap sound name to rename.
- Sound Scrubber: approve removes pending item and saves approved sound for SxLock; reject removes pending item AND deletes rejected recording and all managed stored copies (not merely hiding it). Queue fills the gap without scroll reset. Rejected sounds may be rediscovered later; do not archive rejected audio. Verify all actual storage destinations before claiming deletion.
- Removing a sound from a collection or episode removes its reference, NOT the approved canonical master. Never delete source videos or existing project placements as collateral.
- Do not publish unfinished media or spend on sound generation without authorization.

## Work index
- [x] **0 — Baseline and version control.** Snapshot starting revisions, create isolated work branch and index; no live deployment.
- [ ] **1 — Right-handed interface (Scrubber R14.1 and SxLock CSS merged; mobile verification incomplete).** Compact rows, rightmost thumb controls, unobstructed center, rename by tapping name.
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
- `tools-home/tools/sxlock/index.html` — legacy heading R1.11, but embedded interface revision R24 and sxlock.js?v=25; protected visual reference — blob `149ea2bf568094b66bf5c351b7e47296b14fd01c`
- `tools-home/tools/sxlock/sxlock.js` — blob `d085d4a2f14756340de1a3bba3ae735759798618`
- `tools-home/tools/sxlock/library.json` — blob `7b00457a5957512c6be6fee2e727228d7901e852`
- `tools-home/tools/sound-scrubber/index.html` — Sound Scrubber R14 — blob `a3b83a7aa0a801189bdd984a4dd4800094ae9749`

## Release log
- v1.1 index: branch created; index committed on work branch. No production app modification or live verification implied.

- Step 1 review candidate: Sound Scrubber R14.1 CSS-only right-thumb layout, commit `6a500d6a0ab2a50e9c6a7c874d74fed5c2e99ba2`. Existing queue actions and audio code unchanged. NOT deployed on production main. Requires owner mobile review; SxLock right-hand interface not modified.

- Step 1 second review candidate: SxLock R1.11.1 CSS-only compact right-aligned library, clip and recording rows; commit `041267c7b84c3946e6f7be56dcc148fe9753d6be`. No JS/audio/export changes. Mobile review and production deployment pending. Both apps now have step-1 branch revisions; do not mark complete until owner verifies.

## Reconciliation checkpoint — 2026-10-27
- PR #1 merged to main: `36414db780150b0a41bc3a07f6dca9d543032fbd`. The Step 1 CSS-only SxLock and Scrubber revisions were published to repository main; this supersedes earlier release-log statements saying they were not deployed.
- Sound Scrubber visible-heading correction: `7f8fa64864aab5445051e7ec2fe81a79509ebb2d`. Scrubber R14.2 pending-default/count correction: `273991ae27edbef6209d027e9f04963576aa53d0`. The pending-only filter does NOT establish permanent deletion, dual-cloud save, or cross-device queue sync.
- SxLock visual reference: owner's Android screenshot shows internal interface marker `24`, 124 hosted sounds, 1 connected bee recording, and 141 approved effects. Legacy page title was misleadingly changed to R1.11.1; do not treat this as replacing R24. SxLock JS and library JSON were unchanged in PR #1, as confirmed by repository comparison.
- **Preservation lock:** Do not change SxLock HTML/CSS, JS, library, playback, recording, project recovery or exports during Scrubber work. Any future SxLock integration requires explicit scoped review and verified rollback. Keep existing user projects and source assets intact.
- **Current next action:** verify live Scrubber R14.2 and Step 1 mobile layout; then implement Step 2 on an isolated branch, preserving approved canonical sounds. Rejection deletion must verify actual storage destinations; never claim cloud deletion from a browser-only tombstone.
- **Release method:** create a separate branch for each substantive step; inspect code and backend, test, merge, check GitHub Pages deployment and live label, then log commit and test results. No release is called verified solely from a GitHub commit.

## Documentation registry — master index linkage (2026-10-27)
This index is the authoritative live work status and reconciliation record. Detailed manuals remain in place, preserving technical and historical material; do not erase or rewrite historical evidence simply because release headings are stale.
- [Project AI operating manifest](../../AGENTS.md) — points here; production guardrails.
- [Sound Scrubber README](sound-scrubber/README.md) — points here; discovery, queue and UI documentation.
- [Sound Scrubber AUDIO_SAVE](sound-scrubber/AUDIO_SAVE.md) — points here; audio persistence architecture and historical verification details.
- [SxLock README](sxlock/README.md) — points here; legacy operating instructions; its R1.7 heading is historical, NOT the R24 visual revision.
- Source of truth for current behavior requires actual app code plus live testing; this index tracks what has been verified, not an assumption that docs equal implementation.
- Registry updates committed on main: `9ba49538`, `fc4d441f`, `4c05697c`, `2e8acb1c`. No application code changed in these documentation commits.
