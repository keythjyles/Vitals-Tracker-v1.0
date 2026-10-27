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

## Step 2 implementation log — 2026-10-27
- Sound Scrubber queue viewport-anchor preservation committed to main: `16ed72a2b2104a71ed18e895a9d3dc4831c7f126`. Before replacing queue rows, record first visible sound row and its viewport position; after compaction, restore that anchor when still present. Falls back to previous scroll position when the anchor was removed.
- Scope: `tools-home/tools/sound-scrubber/index.html` only. SxLock untouched. This is a code-level implementation, NOT verified Android browser behavior or completed Step 2.
- Remaining Step 2: mobile test inline play/approve/delete and scroll, plus actual IndexedDB and authenticated cloud deletion for rejected recordings; current rejection remains intake-only. Do not claim deletion of cloud originals.

- Rejection safety fix committed: `ba749376e1a936e838bb6ed620947e6fc705e5d6`. Inline Delete now awaits IndexedDB transaction completion to remove browser-owned sound bytes, removes the in-memory file reference, then rejects/removes the intake row. If IndexedDB deletion fails, the row is retained for retry. Approved or cloud-saved masters and in-progress approvals are protected. Remote third-party originals and cloud copies are not deleted; no cloud deletion endpoint was verified. Mobile verification pending. Step 2 remains open.

- Deletion race guard committed `98223e350fa1ed9ed14dd7ea474aebe9f6c2e425`: while IndexedDB deletion runs, disable the row's Delete button, show progress, and prevent duplicate requests; restore retry on error. This prevents repeated taps from overlapping removal operations. SxLock unchanged. Code-level check only; Android test outstanding.

## Step 2 — approval queue behavior (owner directive)
- Implemented `5aae4ef4c676c979a14287c6495ec09cd9e848d2` and follow-up `feb68c6bb6d6d39fc3d18c3827fa363ee53c5650`: Approve immediately removes the row from pending/search results while saving; successful saves remain out of the review queue. Failures return below pending entries in a labeled FAILED SAVES area with Retry (same approval flow), Hold, and Delete. Hold moves the sound to the end of the pending queue; repeated retry failures return to the failed area. Failure state is persisted in reviewDB. Existing approved cloud masters remain protected from deletion. No SxLock files changed.
- Validation status: committed code only; mobile interactive testing and cloud persistence still unverified. Existing review status and cloud receipts remain distinct; no dual-cloud success claim without receipts.

- Owner correction implemented `5c6185e972a032286a1c6fcae36a9ebbedd9f0d9`: remove blanket approved-master Delete prohibition. Delete removes the selected browser audio and review entry regardless of approval status. Failed-save rows now actually display Hold action (previous code omitted it). Cloud deletion remains an unimplemented backend capability: do not claim cloud copies were deleted. Owner requires managed-cloud copies to be deleted too; implement verified authenticated deletion endpoint next. No SxLock edits.

- Rejection lifecycle correction: `2d0122a3abcc25ccbba78d855b79d07cb2d830ac` removes permanent rejection tombstones, clears legacy exclusion storage, and allows a deleted sound to be found again in a future search without restoring deleted browser bytes. README updated `9a5693f59bde90663518ad8703ea6a72165cc281`. Remaining gap: verified authenticated deletion of existing managed Dropbox and Drive copies. Android verification outstanding. SxLock untouched.

- Save-state reliability fix `89cab70a57887b6f3773278105aef751a11d0c83`: after browser restart, in-flight `saving` rows become failed-save retries instead of disappearing indefinitely. New approvals change status to `approved` only after the Dropbox API returns verified success; saving/failure no longer prematurely publishes approved-library status. Existing verified Dropbox receipts remain respected. No SxLock changes. Android test outstanding.


## Step 2 — managed deletion transaction (R14.3, October 27, 2026)

- Work branch: `gs-scrubber-managed-delete-20261027`, starting at main `e8b755d8ae93edab44c4c144aa709675a91e32e0`. Rollback: revert this stage's application/docs commits; retain durable deletion requests and finish already-authorized removals before enabling an older mirror worker. Do not restore deleted sound bytes from rollback.
- Implemented in the existing PreviewLock audio backend: authenticated `/api/audio-delete`; stable-ID/hash/size/receipt checks; paginated Dropbox listing; durable metadata-only intent under `/Grill Sergeant/Sound Effect Deletions`; individually verified file removals; per-destination pending/failed/verified outcomes; retry after interrupted or partial deletion; refusal to re-save/rename a pending deletion. Completed deletion allows new approval of a rediscovered candidate. No permanent rejection blacklist.
- Sound Scrubber R14.3: immediate removal of approval availability, compact PENDING DELETIONS section with one retry/refresh control, local byte removal after durable cloud intent, retained recovery metadata on failure, reload continuation, and detail-view Delete uses the same transaction. Original hash/cloud identity are recorded before upload so interrupted saves remain identifiable. Normal name/Play/Approve/Delete rows remain compact.
- Drive: authenticated direct Drive deletion is NOT present in the service. Uses the existing daily connected-account mirror action and versioned completion receipt protocol in [AUDIO_DELETE.md](sound-scrubber/AUDIO_DELETE.md). Pending jobs must be processed before mirroring and checked around uploads to avoid resurrection. This is an asynchronous worker protocol, not a claim of immediate dual-cloud removal.
- Tested: `node --test tools-home/services/previewlock-api/*.test.mjs` — 23 automated checks passed. Includes original save/rename tests, content-review regression, deletion auth/origin/method/input checks, scoped deletion, failed checkpoint/provider retry, orphan upload identity, changed-file refusal, stale Drive receipt rejection, repeated approval failure/Hold, cached-byte removal, failed-delete recovery, and rediscovery. Frontend tests execute shipped functions against DOM/storage/provider doubles. `git diff --check` passed.
- Unverified: real authenticated Dropbox/Drive deletion, physical Android playback/layout/scroll/rename, live approval availability across open editors, and release deployment. Playwright browser installation failed (download returned an invalid archive); no browser-pass claim. Step 2 remains open until these acceptance checks are complete. No SxLock file, project, library ID, audio engine, or export was modified.


### R14.3 release checkpoint
- Application/docs commit `ffac0fff2f46ad1d29bf293b6cc33df9bb2cd092`, reviewed in PR #2 and merged to main as `953b3f20cfad8e4c808bf705cc668cb5f6f72e52`. PR changed 12 files; zero SxLock files. Baseline and rollback remain recorded above.
- Existing recurring Drive action `i3j4ji1l9ji1ka21lb5qrb2d3s` was updated and read back: deletion processing precedes mirroring, exact protocol linked, daily recurrence retained. No new automation or schedule change.
- GitHub Pages run `40500263905` for the merge was in_progress at inspection; this is separate from Render backend deployment.
- Live health retrieval failed: direct HTTPS request timed out; web retrieval was unavailable. Backend deployment and authenticated real-cloud deletion are NOT verified. Render MCP has no selected workspace. Workspace discovery returned exactly `My Workspace`, account `kjiles71@gmail.com` (`tea-d6rno2aa214c73bjm3ag`); Render access guidance requires owner confirmation before selecting/inspecting/deploying. No Render resource was changed. Next operator: obtain that selection once, inspect the existing PreviewLock service and its auto-deploy state, verify `audioDeleteVersion:1`, then run a disposable end-to-end fixture and Android acceptance. Do not regenerate or redo committed code.
