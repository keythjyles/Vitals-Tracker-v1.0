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


### R14.3 deployment verification — workspace confirmed October 27, 2026
- Owner confirmed Render workspace `My Workspace` / `kjiles71@gmail.com`, `tea-d6rno2aa214c73bjm3ag`. Reuse this authorization; do not ask again for this existing service.
- Verified exact existing service `gs-previewlock-api`, ID `srv-dberk21srm7s73d4kqr0`, repository/branch main and PreviewLock build/start paths. Auto-deploy is enabled; no redundant manual deploy or configuration change was performed.
- Render deploy `dep-dbg954qjnfac739qaei0`, commit `049a2dc36d56555a6bcb3afc19eff1fa957f8c70`, is LIVE. Runtime logs confirm PreviewLock listening. The deployed public /health was opened in the cloud browser and returned `status:ok`, `audioDeleteVersion:1`, `audioSaveVersion:1`, and `dropboxReady:true`. The live /api/audio-delete rejects an unauthenticated request with `unauthorized`. These observations establish release/configuration/auth gating, not successful authenticated deletion.
- GitHub Pages runs `40500263905` (application merge) and `40500523405` (documentation checkpoint) both completed successfully. Live page visibly identifies Sound Scrubber R14.3.
- Live browser smoke check: Crickets preset returned 50 search candidates, with inline name/Play/Approve/Delete controls. Previewed `Acheta-domesticus-Stridulation.ogg`; DOM-backed media state showed playback started, advanced to the full 2.533878-second duration, ended paused, and reported no media error. Queue remained zero; no sound was approved, renamed, deleted, or written to cloud as part of this read-only smoke check. This is a cloud-browser test, not Android or an auditory-quality judgment.
- Remaining acceptance: real authenticated deletion across Dropbox and Drive and physical-phone regression. The isolated browser has no saved PreviewLock connection; do not request or publish the owner's setup secret or pretend the public health test proves a provider transaction. Existing 23 automated checks remain the state/provider evidence. Step 2 stays open for these remaining checks; SxLock R24 remains unchanged. No owner action is needed for workspace selection anymore.


## Daily Sound Scrubber intake — 2026-10-27
- Seven Wikimedia Commons audio candidates were verified by source page, license, and original-file URL; Dropbox Sound Effects filename searches found no matches. One known Chinook recording was excluded as already present; video-only rescue-helicopter file was excluded.
- New PENDING-only batch: `tools-home/tools/sound-scrubber/intake/SoundScrubberIntake-20261027-am-01.json` (commit `feb0cc7d`), indexed in `tools-home/tools/sound-scrubber/intake/index.json` (commit `72638cd9`). This is a versioned discovery manifest, NOT a verified live queue import, approval, Dropbox/Drive audio save, or SxLock insertion. Source-ID/renamed-file deduplication remains unverified.
- Existing connected Dropbox `/Grill Sergeant/Sound Effects` contains 131 asset-ID folders. Three sampled asset.json records were owner-approved with verified Dropbox receipts and Drive pending. The Drive Sound Effects root listing returned zero files. Deletion-intent root returned NOT_FOUND, which is not proof of completed deletions. No destructive operation or new Drive audio copy was claimed.
- Next: reconcile existing approved audio with Drive using actual file-reference/byte-transfer support and per-asset hash/readback receipts; inspect live pending-deletion intents if the root appears; preserve SxLock R24 unchanged.



## R14.4 — owner correction: redo is the next decision

Failed approval is an in-place redo with the same Play / Approve / Delete controls. No separate Failed Saves list, no Hold control or Hold/Culled filters. During a save, the row remains in place with its decision buttons briefly disabled; on failure it becomes the next decision in that same position. Successful approval removes it and brings the next row into that position. Both queue and search refreshes preserve the decision's viewport anchor, and a search candidate is not duplicated into the queue. Existing held entries migrate to ordinary pending without deleting audio. Backend deletion/storage and SxLock are unchanged.

Ten frontend state tests passed, including repeated redo failures, exactly three inline controls, decision/successor viewport anchoring, and legacy Hold migration. Physical Android scroll behavior remains unverified. Source baseline: main `5a01863953d3adea81120731d8a77b926c8c1bea`; rollback is a revert of this R14.4 UI correction. Latest owner instruction supersedes the earlier Failed Saves/Hold requirements retained above as history.



## R14.5 — intake only, no completed-sound list

Owner correction: Scrubber is the decision tool, not the approved library. Removed All/Pending/Approved view controls. Approved/completed sounds are excluded from the queue AND new search results, including legacy approved entries with stale failed-save flags. Approved ledger records, audio, cloud receipts, SxLock and WavLock availability are preserved. Redo remains in-place for unresolved decisions. Shortened the queue instructions and moved manifest export into the existing collapsed Search scope & licensing section.

Eleven frontend state checks passed, including approved-record preservation and exclusion from both review surfaces. Screenshot's generic invalid audio identity/filename save rejection is not diagnosed by this visibility change; do not claim it is fixed. Physical Android acceptance remains open. Baseline main `da2796fe43b7f8ff1b5fdefb482976d3b1fa91e9`; rollback by reverting this UI-only stage.


## R14.6 — private working saw: capture fallback and tucked-away types

Owner direction: anything left in this list is unfinished. Sound-type pills were replaced by one selector inside a closed Sound types disclosure. No approved-sound view returns. Failed-save rows gain only the explicitly requested Record Playback button (●; ■ while recording), alongside the existing decisions. It captures the selected playing media through the browser's media-capture APIs, stops at end/manual stop, converts to PCM WAV, rejects silent/invalid captures, and leaves the result PENDING for playback and explicit approval. It never claims recording means cloud saved. Capture uses a new hash-based stable asset ID and safe WAV filename, preserves the original browser copy and source provenance, and retains known prior managed identities for deletion of all copies if the owner rejects it. No microphone, new service, timer, paid generation, or credential change.

If media capture is unsupported or cross-origin audio cannot be captured, tell the owner to use the phone screen recorder; do not claim the browser can bypass that limitation. Existing import now accepts screen-recording MP4/WebM/MOV as well as audio, extracts its audio to WAV, caches it and presents a pending review item. The source video stays on the phone; this is not a claim of archiving the original video to cloud.

Tests: 16 frontend/state/PCM checks passed, including collapsed type selector, non-silent WAV encoding, silent/invalid capture refusal, pending captured-take staging, original preservation, unsupported-capture messaging, deletion of current/prior managed copies and original cache, and prior redo/visibility regressions. Full frontend script parses. Actual MediaRecorder capture, screen-video decode compatibility, and physical Android flow remain UNVERIFIED. SxLock and backend routes are unchanged. R14.5 code commit `c2ed76a0b1b878dcf1e4e61128fbe31675b3da0c`; combined stage branch `scrubber-private-saw-r14-5`.



## R14.7 — instant decisions, background work, redo at the current focus

Owner correction supersedes R14.4's wait-in-place behavior. Approve/Delete immediately hide the row, stop and release the audition, close that sound's detail player if open, and bring the next row into the same decision position. Pending network/cache work is invisible. Other rows remain actionable; locks are per sound, not a global review lock. Existing cloud mutation requests serialize in the background to respect the backend's single-operation lock, without making the owner wait.

If a hidden save fails, restore that sound as the next decision at the current cursor. If another sound is already being auditioned, insert the redo directly after it without stopping or moving that audition. No Failed Saves or Pending Deletions section; incomplete deletion attempts also return inline at the current cursor. Queue/search each retain explicit display order, preserve the decision/successor viewport anchor, disable native scroll anchoring, and avoid duplicate queue/search rows. Saving rows and approved records remain excluded from the working list. Saved/deleted decisions stay out; original bytes and interrupted-operation recovery semantics are retained. No SxLock or backend edits.

Validation: 21 frontend/state/PCM checks passed, including immediate approve/delete disappearance and playback stop, two slow saves with continued decisions, failure reinsertion at the latest cursor, failure after the actively auditioned sound without interruption, search redo without duplicate queue rows, viewport anchor selection, serialized provider requests and recovery after a failed request, plus earlier capture/storage regressions. Full frontend script parses. These are deterministic DOM/storage/provider doubles; exact physical Android visual behavior remains unverified. Baseline main `9acf0d8a762fcb53066a7aae0090113d691739e4`; revert this UI stage for rollback.

R14.7 right-thumb follow-through: the optional Record Playback control is inserted to the LEFT of Play, keeping Approve and Delete in the same rightmost positions on normal and failed rows. The 21 frontend checks still pass with that ordering asserted.



## R14.8 — no pending-operation rows

Owner screenshot identified circular-arrow deletion jobs appearing before cleanup had a final outcome. Waiting save/delete operations, including durable Drive-cleanup jobs, now stay hidden from queue/search/counts across refresh and reload. No saving/pending footer progress is emitted by those operations. Only a definitive failed deletion returns inline, with normal Play/Delete controls rather than a circular pending/retry control; a pending destination is not a failure. Known save failures retain the existing ordinary redo and recording fallback. Backend job receipts and recovery records are kept, so this does not discard unfinished cloud work or claim completion.

Validation: 24 frontend/state/PCM checks passed, including hidden pending deletion after reload, successful completion remaining out, and confirmed provider failure returning as Play/Delete with no circular control, plus prior instant decision/redo/capture regressions. Full script parses. Physical Android acceptance and the underlying unrecognized-managed-file deletion conflict are still unverified/unresolved. No SxLock or backend changes. Baseline main `8dd01405ffaed78d56089933eea1e4606f293f66`.

R14.8 interrupted-save follow-through: reload now keeps an in-flight approval hidden as `save_unverified` until the authenticated receipt lookup establishes success or a definite failure. Network/auth lookup errors keep it hidden; a matching verified Dropbox record completes approval, and confirmed 404/no upload started returns a normal redo. No pending row is manufactured on restart. 24 checks pass, including unknown-outcome hiding and verified/404 recovery.



## R14.9 — no Approve means invisible

Owner rule supersedes R14.8's failed-deletion-row exception: the working queue/search/count include only sounds eligible for an approval decision. All deletion records stay invisible, including confirmed failures. Deletion errors remain in recovery metadata; they do not reinsert a row, move the decision cursor, or emit a retry/footer instruction to the owner. A stale pending record already carrying a verified save receipt also stays out unless it is an actual failed save offering Approve again. Nothing is deleted or marked successful merely to hide it; background cleanup and its unresolved filename/storage conflict remain recorded.

Validation: 26 frontend/state/PCM checks passed, including pending/failed deletion invisibility across reload, approval eligibility and count, original preservation, plus earlier instant decision/redo/capture regressions. Full script parses. Physical Android acceptance remains unverified. No backend or SxLock changes. Baseline `d7afb4ad8b5852e47b16cb8bc4a7350d88c4ea10`.


## R14.10 — categorized approved effects and AI enrichment

Owner explicitly authorized this classification integration. SxLock no longer hardcodes approved effects into a status-named category or drops their tags. Shared metadata fallback categorizes existing/new approvals immediately; subcategories, common-name aliases and tags participate in search. A collapsed editor inside approved effects lets the owner correct category/tags, retaining offline edits and syncing metadata through the existing authenticated backend. The existing daily connected-account sound action performs AI metadata classification and backfills versioned, identity-bound private receipts. See [classification protocol](sound-scrubber/CLASSIFICATION.md). No paid model endpoint or additional timer. Approval semantics, SxLock R24 layout, timeline/audio engine, original sounds and cues remain preserved; only approved-library metadata integration and its tucked-away metadata editor change.

Baseline main `d6119539195b0faf2025ad9a93b297da3a4cb19a`; isolated branch `sound-classification-r14-10`. Provider scan listed 186 asset.json records but metadata fetch hit Dropbox rate limits; this is not a claim that all live sounds have AI receipts. Automated verification and deployment evidence are recorded with the release. Physical Android and authenticated classification POST remain unverified. Roll back by reverting this stage while retaining private receipts and deletion compatibility.


Validation before release: all 48 automated state/provider/classification checks passed. Includes 50 scientific-name cricket approvals, category/tag search, AI/owner precedence, offline edits, cloud-refresh deletion races, identity-bound AI receipts, owner-only metadata writes, safe receipt deletion, preservation of decoded buffers and placed cue decisions, and prior review/capture/cloud regressions. Full Scrubber inline script and changed JavaScript parse. Live deployment/browser/cloud checks follow separately.


### R14.10 release verification — October 27, 2026 (America/Chicago)

- Code/test/protocol commit `7728d9a98c06b0ca41b984a5b10ade4f541d3dda`, PR #8, merged main `4d221726270d460994654fa7cf1ac7e0c3994ab8`. All 48 automated checks passed; full Scrubber inline script parses.
- GitHub Pages workflow `40599063701`: build, deploy and report-build-status all completed successfully. Live SxLock DOM verified `effect-classification.js?v=1`, `approved-effects.js?v=2`, `sxlock.js?v=26`; hosted cricket search returns results and selecting the field recording reaches normal effect controls without adding a cue. Separate test browser has zero owner-approved effects, so owner-library editing was not live browser-tested.
- Render auto-deploy `dep-dbgiq895efls73dhgge0` for that merge reached `live`. Live health returns `status:ok`, `audioClassificationVersion:1`, `dropboxReady:true`. No manual deploy or service upgrade. Actual authenticated owner-classification POST remains unverified.
- Existing daily sound calendar action `i3j4ji1l9ji1ka21lb5qrb2d3s` updated and read back with AI classification instructions. Existing DAILY recurrence and boundaries retained; deletion and mirror instructions preserved. No additional timer.
- Initial provider listing returned 186 asset.json records, pagination exhausted. Read 52 records before provider throttling blocked further metadata reads. Completed a semantic AI metadata pass on 20 existing approved assets, re-read their current identities and checked deletion intents before writing separate versioned classification receipts. All 20 uploads reached completed and exact JSON fetch/readback matched; final deletion-intent listing contained none of those asset IDs. No audio bytes, filenames, approvals or asset.json records were changed by this backfill. This is source-metadata classification, not claimed listening or verified Drive mirroring.
- Full historical-library AI backfill is NOT complete. Matching per-asset receipts checkpoint the first 20; the existing daily action resumes remaining assets while immediate metadata-rule categories/search remain available. Physical Android acceptance, cross-device catalog discovery, and the previously unresolved audio-filename storage conflict remain outstanding. These are not repaired merely by category changes.


## SxLock R25 media-integrity repair — 2026-10-28

- Current owner handoff explicitly authorizes SxLock export/timing/colour investigation; captions are suspended. This is separate from Sound Scrubber refinement and does not remove the approved R24 workspace preservation requirement.
- Baseline main `5154f84a8d78faf8caee841ad2247dc7ba4f7b04`; isolated branch `fix/sxlock-media-integrity-20261028`; implementation/evidence commit `440c3f845ed052907b45140466aef8f6c2b12cef`; draft PR #9: https://github.com/keythjyles/Vitals-Tracker-v1.0/pull/9 . No merge/deploy.
- Confirmed old SxLock path always recaptures an RGB canvas with MediaRecorder/timers, uses platform-dependent codecs and final held-frame padding. AspectLock is also a real-time canvas capture, so blindly copying it would retain those mechanisms. See [full findings](sxlock/MEDIA_REPAIR_20261028.md).
- Implemented: lossless encoded-picture pass-through for compliant original-size H.264/CFR exports; sample-timed original soundtrack plus independent effects; explicit AAC priming handling; deterministic offline picture conversion only when required by requested settings; final frame/duration/dimension/colour checks; future-change CI workflow. Workspace layout, library IDs, original media, recording and legacy projects retained.
- Local evidence: 51 prior checks pass; actual Chromium UI/engine matrix and independent FFmpeg/NumPy measurements pass. Seventy 40-second source-speech windows show zero additional offset. Full bee v06 output preserves all 1,667 encoded frames, 540×960 / 25 fps / 66.680 s and zero audio offset at six checkpoints including F863/34.520s. No-op and repeat exports are byte-identical. Exact-frame PCM placement, 44.1 kHz, positive audio PTS, overlaps, move/delete, cancellation and 30→25 fps are covered. GitHub-hosted workflow status is separate from these completed local checks.
- Review copies: GS_BEE_SXLOCK_R25_NO_CHANGES_v01.mp4 and GS_BEE_SXLOCK_R25_SYNC_TEST_v01.mp4. The latter has one quiet 40 ms timing beep at F863; it is not a publication master. Both Dropbox uploads completed in the existing PreviewLock folder. Drive metadata readback confirmed filenames,video/mp4,size and existing Episode 4 review-folder parent; raw cloud SHA/readback and physical Android playback are not claimed. Versioned findings,logs,frame samples and measurements retained.
- OPEN: historical red-cast root cause/provenance and physical Android/native AAC/sharing. The old cast was not reproduced here; recovered 17618 signals different colour metadata from this desktop control. R25 preserves v06's current colour exactly and does not remove a cast already baked into v06. Do not declare full acceptance, deploy or resume captions until those gaps are closed. Main is the rollback baseline; approved masters and v06 audio/video correction remain unchanged.


## Deployment requested and actual AspectLock handoff — 2026-10-28

- Owner follow-up “Why not deploy the fix” supersedes the earlier draft deployment hold. PR #9 was merged as `b2a89ef0e0f9db95b392febd47c820898d9a7601`. GitHub Pages run 40710732929 and main media-regression run 40710734065 completed successfully. Live R25 HTML and script 27 were retrieved; a fresh browser loaded the actual live engine/dependencies and passed import, byte-identical no-change export and F863 effect export/download with no page errors. Tests used a disposable profile and the existing network proxy; physical Android is not claimed.
- The owner's correction is the acceptance target: the same input must retain the colour AspectLock preserves. A recovered full-range BT.709 AspectLock export was passed through the live repaired SxLock. Source and output both retain full-range BT.709 primaries/matrix/transfer. Five matched frames at 0, 2, 16, 34.52, 60 s show only normal compression differences: mean per-channel bias under 0.32 on a 0–255 scale, PSNR 38.7–46.4 dB. Speech offset is zero samples at six checkpoints. These are direct same-source comparisons, not a substitute reference or a claimed reproduction of the historical Android encoder. Measurements retained in sxlock/review/20261028/.
- The same real handoff exposed a validation defect for no-effect exports: AspectLock's soundtrack ends about 57 ms before its picture. Copied audio must be validated against the original audio end, not forced to equal the video duration. R26 corrects this without shifting/padding/reencoding the copied soundtrack. Added a 30 fps source with a shortened audio tail to the independent regression.
- R26 also uses sequential timestamped frame decoding for required picture conversion, closing the iterator on completion/cancel; colour acceptance is checked against the original matched source frames. Corrected the stale mobile 24 marker and made the existing tool name/ID/release line visible, preserving the approved player and right-side controls. Engine R26, script 28, module query 26.
- Local R26 verification: 51 state/provider checks, full browser matrix including short-tail copy, FFmpeg/NumPy measurements and the actual 66.68 s AspectLock source pass. R26 branch: fix/sxlock-aspectlock-release-20261028; release verification follows. Captions remain paused; originals/approved masters and the v06 correction remain unchanged.

### R26 decisive WebM colour finding and correction
- The direct AspectLock alpha WebM control reproduced a redder display in the first replacement conversion path: decoded full-range pixels were tagged limited-range after alpha merge. `Mediabunny1.62.1 media-sink.ts::mergePlanarYuv` and `mergeNv12` omitted `colorSpace` from their new VideoFrame constructors. Changing final transfer tags did not undo the resulting conversion.
- GS1 core preserves `color.colorSpace` in both constructors, with the complete modified MPL source and exact patch retained. The corrected decoded frame matches the AspectLock HTML preview pixel-for-pixel; the finished control has mean RGB bias approximately[-0.039,-0.003,+0.299]/255, rather than the earlier[-0.497,-4.092,-4.658]/255. This is a confirmed defect and verified correction in the replacement WebM/alpha path; it is not a claim that the historical phone encoder has been independently reconstructed.
- A generated native alpha-WebM colour/display regression now runs in the regular browser suite, plus independent FFprobe metadata checks. Pinning remains local, with no paid service, colour grading or approved-master alteration. R26 retains the original-audio-tail validation and source-timed export corrections described above.

### R26 release verified — October 28, 2026
- PR #10 merged as `91c2b76de02f6a79995f4ebe4d37243331f654c6`, including GS1 colour correction `3a9707530f358f23945d41796c11a42a2192ce4b` and explicit cross-browser colour fixture `602d514001fc086cf4f097799a9a2a402608146e`. Hosted PR regression40717855023 passed, including51 state checks, generated alpha-colour case and independent FFmpeg/NumPy checks. The earlier fixture failure was traced to Chromium151 omitting MediaRecorder colour tags; the test now explicitly tags only its input fixture, keeping the full-range case defined across versions. No production metadata is guessed or graded.
- GitHub Pages40718339903 completed build/report/deploy successfully. A fresh browser opened the actual live site and verified the visible `SxLock · GS-TOOL-SXLOCK · R26` line, script28, engine query26 and GS1 dependencies. It passed original import, byte-identical no-change export, F863 effect export/download, the full recovered AspectLock MP4 with its original shorter audio tail, and the raw AspectLock alpha WebM. No page-script errors. This is live desktop Chromium at mobile viewport, not a claimed physical Android test.
- Live alpha-WebM-to-MP4 browser display comparison: mean RGB bias[-0.0363,-0.00294,+0.3027]/255, MAE2.949, PSNR35.676dB. The prior systematic red bias is eliminated within normal encoding tolerance; decoded alpha frames match the source preview exactly. Original full-range metadata is retained. No source/master, saved project, approved recording or caption was changed.
- Production is now R26. This owner-requested release supersedes the old no-deploy draft notes; those remain historical evidence. Do not resume captions without the next instruction. Physical Android/native AAC/sharing and reconstruction of historical phone encoders are separate remaining observations, not a deployment hold. Rollback is the pre-repair main5154f84a8d78faf8caee841ad2247dc7ba4f7b04; retain all approved media and the v06 correction.


## SxLock R27 — uploaded sounds and first-play seek regression, October 28, 2026

Owner reported missing uploaded sounds after R26 and a first-play slider that reaches the end early, correcting on restart. Baseline/rollback is deployed main `df3c8168c86eb9341e411087704c5c1cdae483b3` (R26); branch `fix/sxlock-library-playhead-r27`. This repair is within the existing authorization to fix and release SxLock; it preserves the right-hand layout and R26 export/color fixes.

Confirmed code paths:
- Startup loaded current project metadata but did not call any custom-library restoration. Clean timelines therefore hid previously stored uploads. Importing before any video also called only `saveLocal`, which returns without persisting when no session is active. Old sound-store rows held only `{id,data}`, so their names depended on a project snapshot. `restore` also removed custom library entries when switching projects. Existing retained audio rows were not deleted by those paths; actual owner-device contents have not been remotely inspected.
- `discoverEffectDirectory` used an overescaped extension regex and skipped normal incoming WAV/MP3/M4A files. The current repository incoming directory has only its README, so this is a separate latent defect, not evidence of missing repository audio.
- `duration` fell back to a one-second timeline for unknown/infinite browser duration. Controlled real-playback test with only the browser metadata getter delayed reproduced currentTime1.114667s while slider max/value were both1. Native MP4 was stable in this desktop browser; the owner's exact Android metadata sequence is not claimed reproduced.

Correction:
- Recover the independent custom library from existing sound rows, using current/previous/stored backup metadata for legacy names. Keep orphan audio visible as Recovered recording. Persist name/type/capture beside original audio without changing database identity or audio bytes. Save imports before a video is loaded; preserve the library across project switches. Restore only rows whose audio still exists, so metadata for explicitly deleted recordings does not resurrect them. Existing approved-effects bridge, favorites, source masters and project backups remain preserved.
- Read the selected video track's actual final timestamp before enabling playback. Seek scale, frame stepping, effect cutoffs and restoration share that duration. Do not seek to the end or restart the video to infer it. Fix the incoming filename and display-name regexes. Visible releaseR27 / script29; export engine remains the validated R26 module.

Validation before release:
- Real Chromium/mobile viewport: three retained legacy/orphan/standalone sounds recovered, approved bridge and uploaded-directory fixture present, clean timeline remains empty and recovery project unchanged. Import before video survives reload; project switch retains the library; explicit delete stays deleted after reload. MP4, durationless WebM and delayed browser metadata all keep the first-play slider aligned. In the delayed case currentTime1.104s, slider1.032s/max40s rather than1s/max1s. Restart checks pass. Zero page-script errors. See `sxlock/review/20261028/r27_library_playhead.json`.
- Existing51 state/provider/duration tests pass. Full media matrix and actual UI export/download pass; independent FFmpeg measurements pass exact picture preservation, all audio correlation windows, 44.1kHz, positive source offsets, repeat export and required CFR conversion. See `r27_export_measurements.json`. The UI driver now waits for timing-read completion before inserting, matching the disabled real controls.
- Added persistent-library/first-play regression and durationless WebM fixture to the existing GitHub workflow. Physical Android and the owner's recovered-recording count need observation on their browser; fixture recovery is not a claim of inspecting that private store.
- Committed/deployed/live verification follows below. No production deployment is claimed by this pre-release checkpoint.


### R27 deployed and live-verified checkpoint
- Code commit `5511a89fb82cac1392cfffb4669f7b4ac1ab019a`, PR11, merged as `0e3aa83a9487d8097d7882e938a0f9b6c9ede8a4`. Hosted push40723150088 and PR40723156228 checks both passed. Main regression40723675101 also passed. Pages40723675201 build/report/deploy completed successfully.
- Live page confirms `GS-TOOL-SXLOCK · R27` and script29. The same isolated Chromium test against the deployed HTTPS site passed retained-library recovery, filename recovery, approved/uploaded-directory availability, clean timeline preservation, import-before-video/reload, project switching and explicit-delete persistence. It accessed only synthetic test data in a disposable browser profile.
- Live first-play results: MP4 currentTime1.101333s, slider1.071/max40; durationless WebM1.113966s, slider1.098/max3; delayed browser-duration case1.114667s, slider1.081/max40. Restart passed; zero page-script errors. The old controlled case was pinned at1/max1. Actual owner-phone storage and physical Android remain uninspected; open R27 in the same browser/profile to recover its retained uploads automatically.
- Existing color/export encoding, soundtrack timing, source masters, approved effects, captions hold and established layout are preserved. Rollback remains R26 maindf3c816; reverting does not require clearing browser data. Do not re-run production or recreate source media for this completed repair.

## CapLock R1 prototype — October 28, 2026

Owner explicitly requested an independent caption tool and navigation from Tools, AspectLock, SxLock and PreviewLock. This is new caption work, not a resumption of the old SxLock renderer changes. Baseline main `52984f0eaa1e47aba57b87931d753e0973ff751f`; isolated branch `feature/caplock-r1-20261028`. Owner subsequently removed ZLock integration: AspectLock handles composition. No Z-map/layer migration is included.

Implementation/verification/remaining gates: [CapLock README](caplock/README.md), [protected baseline](caplock/BASELINE.json). Independent caption editor with global styles/local overrides, manual integer frame timing, frame-sample preview where WebCodecs supports it, SRT/VTT and editable JSON/recovery. Navigation-only page releases: SxLock R27.1, AspectLock R26.1, PreviewLock R27.1; existing media engines and source assets unchanged. Legacy PreviewLock catalog labeled R0.3 separately.

Seven core tests and real Chromium153 phone-viewport prototype checks passed. No physical Android, authenticated owner cloud-library operation, cloud project save or burned-in video export is claimed. R1 is a functional prototype, not production-ready. Deployment/commit receipts are separate from these local checks.


### CapLock R1 deployment and live verification

PR #12 merged as `4ce921bd4fdb3819ab94d9c8b6863880b7631e42` from final feature head `86f37ffde024228b08c4af1da4058c1b8ccca64e`. Seven small baseline/implementation/navigation/validation commits are retained on `feature/caplock-r1-20261028`. Rollback is baseline main `52984f0eaa1e47aba57b87931d753e0973ff751f`; keep originals and browser databases.

Main hosted runs all succeeded: CapLock prototype `40754893942`, SxLock full media regression `40754893806`, GitHub Pages build/report/deploy `40754887730`. The existing 51 state/provider tests also passed locally; SxLock engine/dependency/catalog bytes remain identical to baseline. One earlier SxLock job `40754201838` intermittently failed the inherited alpha-color fixture; unchanged-code subsequent branch/main runs passed. No renderer correction or engine replacement was made. An early CapLock CI HTTP startup race was fixed with server readiness checking; two attempts to open the live page before Pages finished are not counted as app verification.

A fresh disposable Chromium153 profile loaded the actual published HTTPS R1, imported generated25/30fps fixtures, passed frame stepping/select/IN/OUT, global/local/reset, undo/redo, split/merge, play/pause/resume, downloaded/reopened project JSON and verified stable IDs/timing. Invalid video is correctly reported as import failure. Phone viewport390×844: right rail,9:16 ratio0.562502, no horizontal overflow. All five live Tools/AspectLock/SxLock/PreviewLock launch entries passed; zero page-script errors. Only synthetic fixture browser state was accessed. Source media were not uploaded or altered.

Direct launch: https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/tools/caplock/?v=R1 . This establishes deployed/browser-tested prototype status, not physical Android, cloud project saving, owner-session cloud playback or deterministic captioned-video export. Those remain the explicit next gates in CapLock README. Owner's ZLock-abandonment instruction is preserved; AspectLock remains the picture compositor.


## CapLock R2 — transcript-first Gemini animation workflow, October28,2026

Owner correction: use Gemini for prompt-driven transparent caption animations; CapLock prepares literal segmented transcript/word directions and exposes imported layers over the completed bed. Keep native captions collapsed. Terminology is **Rotate** (flat2D), explicitly selected before editing; Square resets exactly0°. No ZLock/third-axis implementation.

Baseline/rollback: main `ebdd2eb04f9570a1d8a0d2a440beaade600476d6`. Work branch `feature/caplock-r2-gemini-layers-20261028`. Scope is CapLock plus its release metadata/test workflow; no AspectLock/SxLock/PreviewLock media engine, source, audio library or project database is changed. See updated CapLock README for architecture and limits.

Implemented: transcript-first page; stable selectable word IDs/effect directions; move words within/across/new phrases; global draft/approved visual protocol with truly independent per-segment prompts; copy/Open Gemini handoff; second-page viewer with in-bed load controls; separate transparent animation/graphic/audio preview tracks, frame boundaries/source trim, position/width/opacity/visibility/stacking; opt-in Rotate and exact Square; clip/text undo/redo and version2 JSON recovery. R1 reads forward-protected via version2 rejection; R2 imports R1. Native caption controls remain optional/collapsed.

Local checks:12 Node tests pass; disposable Chromium153 phone viewport validates entry/navigation, word movement/effect retention, protocol opt-out, actual VP9 alpha-WebM import (corner alpha0/center255), rotation lock/reset, placement/undo, play/pause/resume and JSON/reconnect/remove/undo. No script errors or horizontal overflow. Source files remain separate. Native overlay timing is preview behavior, not deterministic render acceptance. No finished-video export, cloud project-save receipt, automatic Gemini generation/asset exchange or physical Android acceptance is claimed. Commit/deploy/live receipts follow separately.


### R2 deployed/live verified and owner layer-preservation directive

PR #13 merged as `ac36877bb5007dff31298c5f8f864d280296ca2b` from feature head `b033e19ad9ef10d3c19e0c067135fa7a9b557588`. Hosted main prototype run40762768612 and Pages build/report/deploy40762768837 both completed successfully. The actual published R2 was opened in a disposable Chromium153 profile at390×844 and passed the full browser test: transcript-first navigation, word effects/movement, independent protocol, in-bed file load, real VP9 alpha-WebM (alpha0 corner/255 center), opt-in Rotate and Square, drag/undo, playback, native fallback, project JSON/reconnect and remove/undo. Zero page-script errors,9:16 scene and no page overflow. This establishes deployed desktop-browser/mobile-viewport behavior, not physical Android or final-export acceptance.

Live: https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/tools/caplock/?v=R2 . Finished-video export, cloud project save and automatic Gemini exchange remain incomplete.

The owner's subsequent direction is recorded in [the GS layered production model](../CAPLOCK_LAYER_PRODUCTION_MODEL.md): bed, animation, sound and captions remain independent synchronized sources; preview/save never flatten them; explicit final render creates a NEW master and leaves the original bed untouched even at publish. Preserve layer projects after export. Future recorded-performance-to-GS-voice conversion with companion transcription is planned only; no paid voice work is authorized or implemented by this release. The full four-role UI/shared final renderer remains to build, not implied by this architecture record.

## PreviewLock R28 — October29 playback repair and reference layout
Owner reports blank preview and requests tight right-hand controls, explicitly naming SxLock/AspectLock as references. PreviewLock only: stage-left/right82px rail, paired frame steps, compact stacked actions/name-only rows. SxLockR27.1/AspectLockR26.1 remain locked unchanged. Exact file opens before library; backend traverses all Dropbox pages. Auth retained; private Drive saved-copy fallback and explicit playback messages prevent silent blank state. 4 frontend and69 backend checks pass before push. Source/rollback c0df90fe; live browser QA follows deployment. No provider generation/spend or schedules changed.

## CapLock R3 — October29 Architect animation and independent speed
Architect supplied17802.mp4 and Gemini-app prompt. Actual10s24fps1280x720 blue-background animation has directional phrase slides, pulsing question mark, large HIVES burst. Prior text-model/Pillow brief was overconstrained; accept blue-key production route with actual removal before calling it transparent. CapLock only: selected-layer0.100–8.000x speed with0.001 numeric precision, ±0.01/reset, source IN/OUT and exact fit-to-bed range. Bed remains1x and its IN/OUT unchanged. Version3 persists new fields and reads v1/v2.17 Node checks pass. Native browser preview/export limitations retained. PreviewLock/SxLock/AspectLock untouched by this release. Rollback307fefab. Live browser verification follows deployment; no provider generation.

## PreviewLock R29 / CapLock R4 — joke project folders
Owner accepts simple native Gemini animation for clipping; requests saved joke text, canonical project folder, preserved source animation, numbered transparent clips, Finish→CapLock and Dropbox working home/Drive backup. Implemented locally in existing tools;89 Node checks pass, including real alpha encode/CAS/source-preservation. Native provider originals preserved; no paid call. New instructions: jokelab/ANIMATED_CAPTION_WORKFLOW.md. Live/cloud/browser receipts follow in jokelab/runs/GS-CAPTION-PROJECT-20261029-01.json. Rollback2d3ae5b3. SxLock/AspectLock unchanged.

## R4.2 finishing pass — caption project continuity
New overlay/audio and external library imports now enter the same joke project before the editor references them, with serialized writes and visible failures.91 local checks pass. Pebble's17 Drive files are raw-byte/SHA256 verified; nine actual alpha caplets and original bed are in Dropbox. Run GS-CAPTION-PROJECT-20261029-01.json now carries storage receipts and prior live browser metrics. R29 single-column/bottom-row layout and R4.1 real bed/alpha playback passed live; R4.2 code e3df87045f1e83533831c58984dbbc59a2a476b0 is live: GitHub checks40984836802 and Pages40984834870 succeeded; Render dep-dbhuvp2vcj2c73f91o4g is live; browser title confirms R4.2. Authenticated phone handoff remains unverified, rather than inferred from tests. No paid generation, new timer or posting changes.

## AspectLock R26.2 — restore compact precision controls

Owner reports oversized scrolling right-hand controls; source confirms min-height44px from ad1e2a9 plus overflow-y:auto from d4647b6. Replaced only the rail CSS with ten compact fixed rows (maximum32px), all actions in existing order, no inner scrolling; short viewports retain a288px player minimum. Source/export/placement/playback handlers and local alignment key are identical apart from visible/spec releaseR26.2. Script syntax passes. Live verification follows deployment; physical phone not yet verified. Baseline/rollback main7e961d1df43233f990dabf43481d0337e769c5f4. Adjacent tools and production media unchanged. No AspectLock README existed; existing ANIMATION_LAB_RUNBOOK.md is its operating guide.

## Owner correction — CapLock R5 / AspectLock R27

CapLock is the multiple-item version of AspectLock, with SxLock's matrix, compact insertion list and tap-to-edit properties below the player. Player-first entry replaces compulsory transcript-first navigation; existing transcript/Gemini tools remain. Both tools pause on item selection, scrub and source import, with direct bed/item-start seeking. Existing CapLock project schema/references, speed/transform/undo/cloud saves and AspectLock compositor/export remain; SxLock is read-only.22 local Node checks pass, including source-derived property-selection/pause functions and matrix bounds; all static controls and module syntax pass. Existing CI browser suite extended for multi-item behavior and three AspectLock viewport checks. Live/browser/authenticated phone results are independent in caplock/EDITOR_MODEL_20261029.json. Baseline/rollback `c24ee364317594ce2da2514494d478024b63123e`. No source media, paid generation or schedules change.

### CapLock R5 / AspectLock R27 release verified

Code `f9ce6b4323af26874c82fcb00198559ea693f591`; Pages41003781711 success; browser CI41003659943 success (22 Node checks plus complete media/interaction suite). Actual deployed R5 exercised with the preserved Pebble bed plus9.webm/5.webm; two compact rows, sheet edit, F126 paused, all three videos ready4/error-null; rail431px scrollHeight431px. Deployed AspectLockR27 list/sheet/ten-button fixed rail verified347/347px; private media and physical-phone acceptance remain separate. Test media server byte-range handling corrected before final success; same-file bed reselect and actual-frame readiness also repaired before release. Exact evidence: caplock/EDITOR_MODEL_20261029.json. No SxLock file, approved master, provider generation or schedule changes.

## CapLock R6 — finished-caption import and explicit placement

Owner removes Source information and requires clipper→saved source/numbered-components→placement. Latest correction supersedes auto-commit-on-Next: Previous/Next freeze the bed and choose a component; only Insert commits and locks timing/geometry, without advancing. Cloud caption folder defaults to the remembered joke/Pebble project; first pending number is previewed, originals linked and components naturally sorted. Clock above/seek18px flush below player. Version4 persists queue/locks; v1–v3 migrate.28 Node checks and syntax/static control checks pass; browser/deployment receipts follow in caplock/CAPTION_PLACEMENT_R6.json. PreviewLock change is caption-module handoff/cache only, engine/layout R29 preserved. SxLock and AspectLock remain unchanged. Baseline/rollback6052c78778c78e931b7ed3d54eb1530f7f508c18; preserve v4 projects and source media.
