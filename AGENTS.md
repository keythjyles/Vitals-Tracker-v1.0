## Clipper R12 — Save becomes Resave, November 1, 2026

Owner request: after tapping Save, that action must say Resave. Each prepared video clip now remembers its download click for that prepared output in this session. Its visible label, accessible name and tooltip change to Resave; later clicks reuse the same file. Row refreshes, inline preview and preparing another clip keep that indication. A replacement output starts at Save. Save ZIP and the bundle link similarly become Resave ZIP / Resave all after a download request.

Resave records the click, not a device-download completion or cloud-save receipt. The original source, saved cut drafts, visible editable IN/OUT fields, compact layout and media engines remain intact. Rollback: 32893ef97c8c7117548640f2e07854d5052bf87e. Verification: tools-home/shared/review/player-r12-validation.json.

---

## Clipper R11 — restore visible IN and OUT boxes, November 1, 2026

Owner correction: Mark IN and Mark OUT must fill the adjacent editable number boxes with the displayed source frame. R9 incorrectly moved those boxes into the hidden drawer. Restore the original inputs beside their buttons using the existing compact WavLock row pattern: 29px rows in the locked 76px rail, with 29px IN/OUT buttons and the remaining space for exact frame entry. Both boxes stay visible; marking fills only the matching box, and typing commits through the existing native handler. OUT stays exclusive. Do not hide, replace or remove these exact-entry fields again without an explicit owner request.

This correction preserves source media, browser drafts, queued cuts, playback, Prepare/Save/ZIP and inline review behavior. Native export engines and timing are unchanged. Rollback: 5c4dd5aac8389c721553170c0ee1e04f26fcecea. Validation and publication evidence: tools-home/shared/review/player-r11-validation.json.

---

## R10 boundary follow-up — verified native-frame exports

The live F5–10 test exposed a pre-existing frame-rate resampling error: 5 requested frames became 4. Clipper now leaves decoded source samples at their native timing and supplies known CFR cadence only to output track metadata, so the container also retains the last frame's duration. The pinned SxLock vendor library is unchanged. Frame, duration, size, audio and alpha verification remain strict; bad results never become Save links. The exact 50-frame QA source is a small regression fixture, and both MP4/WebM five-frame outputs plus the longer audio-bearing exports are checked. The active row's cancel square remains enabled during preparation.

## Clipper R10 — visible preparation and inline playback, November 1, 2026

Owner reported Prepare flickering without a visible result and requested a changing button, Save, and inline Play/Pause. Cut rows are now keyed and updated in place. Prepare becomes Prep N%, then Save only after the unchanged media engine verifies the output. Errors (including unapplied-editor validation) stay in that row with Retry. The row's stop square cancels its active preparation without deleting the cut. Do not insert/remove a Cancel row in the fixed-height player rail during processing: that was resizing the picture and shifting the list.

Prepared compressed files remain available for unchanged cuts while other clips are prepared or added. Only invalidated results are released after committed edits; source/mode/format changes clear the relevant transient outputs. All N · ZIP shows batch progress, then Save ZIP downloads the already-completed bundle on the next click. Individual Save links remain available. Ready states are session outputs, not cloud-save or device-download receipts.

Video cuts play/pause inline in their own row; Replay is explicit at the end. Before preparation the preview reads the stored source range; afterward it reads the verified exported file. One lazy inline video is active at a time; switching/closing releases its media and frame callback. The editing viewer's playhead, marks and frame geometry are unchanged. Per-cut output recipes remain downloadable from a prepared inline preview. Read-only timelines, exact-frame behavior, sound, source hashes, cut storage, Photos/Files, clipboard and the locked shared shell stay intact.

Rollback: a59e22aabd7cb2c3288a45384d2850d9c094074d. Preserve all source videos and saved cut drafts on rollback. The user's current 1667-frame/seven-cut work is separate from the synthetic fixtures and older 1674-frame recovery.

---

## Clipper R9 — owner refinements, November 1, 2026

Owner requested Samsung edge clearance, filename display, Photos or Files selection, obvious current-frame IN/OUT buttons, ±25-frame jumps, export clarity and hover help. The shared shell now has at least 16px horizontal insets (including safe-area support), a compact source-name row, native hover titles and touch-hold help. The approved SxLock rail/row/frame dimensions remain locked. All eight HTML adapters use compact-player v3 and player-shell v2; native engines and existing drafts/media remain intact.

Clipper keeps full-width IN/OUT buttons showing their marks. Each click stamps the displayed native source frame; OUT remains exclusive. Exact number entry is retained under the hidden drawer's Exact IN / OUT panel. The additional 25-frame buttons use the same authoritative native cursor and one haptic per click; navigation changes no mark. Photos requests video-only media selection; Files deliberately has no MIME filter so Android can use its general chooser. Android controls which media provider appears; do not claim a web page can force a specific Google Photos account/provider.

One clip prepares only its row, followed by Save clip. All N · ZIP prepares the complete set directly, followed by Save all; individual preparation is optional. No output engine, timing, audio, naming, cut-pass or source-hash storage keys changed.

Copy list copies the entire queued data array, including rows outside the scroll panel. It includes source filename, source SHA-256, total source frames, indexed custom names (automatic names use their index), IN/OUT and duration frames, UTC copy timestamp and device-local date/time with timezone. It records snapshot/copy time, never fabricates creation dates for older cuts. Clipboard failure opens a selected read-only full-text fallback. This is a shareable record, not a media upload or proof of finished exports.

The owner's latest screenshot shows a 1667-frame source and seven cuts; older 1674-frame recovery data must never auto-apply to it. Preserve all existing work. Rollback source: b909ce930a6e485ed5093b81f5266f2d2a3c41b1.

---

## Owner correction: lock and reuse SxLock equipment — November 1, 2026

R7's generic compact layout was rejected. It did not match SxLock and left source controls above the player. The accepted reference is SxLock R24's actual equipment: 76px right rail; normal controls fixed at 29px; −/+ paired in one 36px row with 30px glyphs; 7px vertical spacing; intrinsic controls determine monitor height. Never stretch buttons from video/viewport height.

`tools-home/shared/player-shell.mjs` and `player-shell.css` own this locked component. `PLAYER_PROFILE` is frozen, and the component applies the dimensions directly. Native editors provide existing nodes/handlers only. Do not introduce a tool-specific density, header or picker layout. Change this shared equipment only in response to an explicit owner request, preserving the reference and validating every adapter.

File/project selection is a hidden pull-down drawer after opening media. Pull to the top, then pull again on the grip to reveal it; tapping the grip is the equivalent accessible action. Picture/layer gestures never open the drawer. Opening it pauses playback and changes no cut, placement or source. No repeated Load/Saved/mode header occupies working picture space.

Clipper R8 places playback, paired frame steps, explicit frame Go, IN/OUT, preview and cut/export actions in the right rail. Only the compact name row remains beneath the monitor; cuts immediately follow. Source media, native engines, browser draft keys, cloud projects, six-range recovery and output recipes remain intact. A 1667-frame source is not automatically treated as the 1674-frame screenshot source.

Rollback: `307af6a07a4ff3b40339a81da3259fc58d400488`. Keep all media and saved edits on rollback. Older R7 matching/compact claims below are historical and superseded by this correction.

---

## Shared compact players and protected precision — November 1, 2026

Owner instruction: all editing tools use the same compact picture/clock/right-hand transport pattern. Position bars and painted timeline maps are read-only. Use frame buttons or an explicit Go field; other former sliders use typed values plus Set. No swipe, preview or export commits an unfinished cut. Single-frame buttons carry the large −/+ glyphs and request a short haptic on supported devices. Keep source picture, sound, assets, project IDs and native editing engines intact.

Clipper R7 retains one tool with Video + sound and Caption animation modes. Six Episode 4 ranges are recoverable from its Find a frame panel, including Slide F0–300; these screenshot ranges have no source hash, so they require the same 1674-frame original and owner review. Gaps and the shared F1103 boundary are intentional preserved evidence. Two attached project videos (3070 and 954 frames) are not that source. Export previews are released between cuts; Prepare all clips creates one ZIP containing every clip and the source-bound recovery list. Local download remains distinct from a cloud save.

Shared adapter: `tools-home/shared/compact-player.mjs`, styles and `COMPACT_PLAYER.md`. Releases: ClipLock R7, CapLock R12, SxLock R29, AspectLock R29, PreviewLock R31, FrameLock 1.3.16 (includes AnchorLock), MotionLock 0.1.6, WavLock R1.4. Rollback baseline `1f084ac8f3c075bd3962841d9e8c6a99bc446e46`. Never delete media or browser recovery data during rollback. See the release receipt for verification and deployment status.

---

## Clipper R6 — one cutter, two modes, November 1, 2026

The existing Clipper now has **Video + sound** (`?mode=video`) and **Caption animation** modes. They share the same player, exact source-frame stepping, IN/OUT marks, independent overlapping/gapped cuts and immediate editable cut list. Mode switching pauses playback and retains each mode's source and working cuts in-session. Browser recovery drafts remain bound to mode/project/source hash; after closing the tab, reselect the unchanged source to recover its cuts. Studio's Cut phase remains the caption-specific route.

For Episode 4: Load video, mark IN, mark exclusive OUT, optionally name it, Add cut, then tap Save on that cut's row. Next IN defaults to the previous OUT and remains adjustable. Video exports use the existing local conversion engine, retain source dimensions/timing and the primary soundtrack, and refuse a missing audio track after export. MP4 is offered when the browser can encode H.264/AAC; otherwise use the explicitly labeled WebM option. No blue-key removal is applied in Video mode. General cuts are not subject to the caption renderer's 60-second-source/30-second-cut limits.

Prepare all clips creates playable downloads; it does not mean Dropbox/Drive save. Save video and Save cut recipe are local downloads. Keep the original in its existing saved location. The shared project/folder picker remains available under Saved videos, with device loading as a direct shortcut. No media is uploaded or deleted by selecting a source, switching modes or making a local cut. Gemini-created caption animation and CapLock placement remain the caption workflow; automatic subtitles are hidden/locked in CapLock R11. Final layered export remains a separate unfinished item. FrameLock is available for identifying frame ranges when needed.

---

## Owner-locked built-in captioning — November 1, 2026

CapLock R11 hides and disables built-in text captions, transcript segmentation, native caption preview and subtitle export. There is no UI, query-string or saved-project switch that enables native caption rendering. Old text, timing, styles, protocols and nativeCaptions settings are retained for recovery; restored settings cannot activate this path. Gemini-created blue-background animations, numbered clips, alpha layers and their editable placement stay available. This is a bounded lock, not an editor rewrite or a claim that final video export is implemented.

The owner is using **FrameLock** to identify the Episode 4 jokelet IN/OUT frames, then ChatGPT will make the requested cuts with the existing soundtrack intact. Do not rename FrameLock or redirect this production to automatic subtitles. Episode 4 already contains music, which the owner chose to keep. Caption each jokelet separately using the established Gemini animation process. The requested two-second outro remains a separate asset; it has not been generated by this UI lock.

---

## Authorized GS Studio implementation — October 31, 2026

The owner approved the clarified entrance with **“Right. Make it.”** The app opens at **Select a joke**, using the existing JokeLab selector. Selecting the joke creates/resumes its canonical project; the container then carries it through Joke, Cut, Captions, Scene, Sound and Review. ChatGPT is not a required manual joke-entry stage. This authorizes repository implementation of the container and adapters; it does not approve or revive the earlier unapproved ChatGPT Site, paid generation, source cleanup or schedule changes. Earlier discussion-only stops and ChatGPT-entry framing below are historical for the previous proposal.

Implementation and recovery: [GS Studio R1 operation](tools-home/tools/studio/README.md). The R1 container uses existing native editors with versioned cloud checkpoints, a recipe-only unrendered-cut save, stable app manifest/icons and same-project asset discovery. Native tool releases: JokeLab R5, Clipper R5, CapLock R10, AspectLock R28, SxLock R28 and PreviewLock R30. Editor engine behavior remains the established baseline; source/media/history are retained. Working Dropbox saves and queued Drive mirrors remain separate states. Automatic Gemini creative handback, within-layer speed/freeze maps and combined final rendering remain separate unfinished milestones.

GS Studio R1 is implemented and deployed from commit `5e1dbf37a1505111719735ece8c1d3e453792a5b`. The release receipt records passing native regressions, the complete authenticated-fixture module round trip, 127 code/transaction tests, Pages verification and the existing Render deployment. The live entry opens the actual JokeLab selector. See `tools-home/tools/studio/RELEASE_R1.json` from the repository root. Do not infer owner-phone installation, production-cloud acceptance or final publishing approval from unit tests. No paid/provider generation, production test upload, cleanup or scheduled-post change.

---

## Caption Clipper R4 — immediate cut list and versioned blank passes, October30

Owner rule: added elements populate their editable list directly under the player, following SxLock's established pattern. Source details, optional controls and explanatory panels do not precede the list. This release applies that rule to Caption Clipper; it does not redesign SxLock or AspectLock.

The active cut list now begins immediately under the player/control dock. Restored work says “Restored vN · N saved clips” or “Restored working draft”. Caption originals in the source selector and shared asset picker are labeled Cut/Draft with their cut-pass version; archived components retain version badges and custom names.

**New pass · v2** (or the next available version) clears the working list only after a durable project save creates the empty next pass. Earlier rendered files, their cut recipe, and any current unsaved working ranges remain recorded under the source's cutHistory. Original animation and existing CapLock snapshots remain unchanged. Reloading the blank pass cannot resurrect a previous pass's browser draft; unmatched temporary drafts are preserved separately. Save clips renders within that new pass; it does not advance another version. Request/revision checks prevent duplicate or stale clears. Pass versions belong to the selected caption original, independently of its filename/source version.

[Operation](tools-home/tools/cliplock/README.md) · [evidence](tools-home/tools/cliplock/PASSES_R4.json). Dropbox working project / queued Drive mirror remain distinct from verified dual-cloud backup. No paid generation, production test upload, source deletion, schedule change, SceneLock/AspectLock implementation or shell build. Older list-placement and unversioned-clearing behavior below is historical.

---

## Caption Clipper R3 — source stepping and caption-only scope, October30

Owner correction: this is a caption clipper. General animation clipping belongs with the future SceneLock direction (currently AspectLock); that does not authorize an AspectLock rewrite or rename in this repair.

−1f/+1f always move the source picture exactly one native frame, regardless of the last marked boundary. The selected frame is maintained independently from rounded media currentTime; paused picture seeking goes inside the intended frame. Mark IN/OUT copies that displayed native frame into the range. Handles/numeric fields adjust boundaries independently. Preview stops on the last included frame. Rapid stepping and24fps rounded-time reads have direct browser regressions.

The existing ClipLock URL/tool ID is retained and the page/menu says Caption Clipper R3. It chooses saved caption originals instead of loading the joke bed, supports import into an opened project, keeps numbered/named overlapping caption batches and exact CapLock handoff, and removes general single-video export controls from this caption UI. Existing rendering engine source is retained for reuse; no separate animation clipper or shell was built here. CapLock/PreviewLock clipper links point to this same caption tool.

[Operation](tools-home/tools/cliplock/README.md) · [evidence](tools-home/tools/cliplock/CAPTION_R3.json). Existing originals, cuts, editor saves and backups remain intact. Drive remains queued until verified. Physical owner-phone/private-cloud acceptance remains separate from authenticated fixture browser tests. Older R2 hidden-boundary step-mode and general export instructions below are superseded.

---

## ClipLock R2 — owner-authorized caption batch work, October30

The owner explicitly said “Make it work” after agreeing OUT→next IN as an adjustable default, with overlaps/gaps and independent saved ranges. This authorizes extending EXISTING ClipLock, not building the unapproved shell. The shell remains discussion-only.

ClipLock R2 is the normal batch-cutting entry. See [operation](tools-home/tools/cliplock/README.md) and [release evidence](tools-home/tools/cliplock/BATCH_R2.json). Native source-frame marks and visual handles queue independent numbered/custom-named cuts, Save clips uses the existing project original/alpha-render/checkpoint path, and Finish opens the exact CapLock project/source batch. Previous OUT is only the starting suggestion for next IN. Earlier no-overlap/source-order-only instructions below are historical and superseded. Prior batch metadata and originals are preserved. Single-cut export stays available. Drive remains queued until verified; owner-phone/private-cloud acceptance is separate from test fixtures. No provider generation, original deletion, schedule change or new shell.

---

## Owner correction — unapproved shell prototype, October 30, 2026

**The separate ChatGPT Site formerly titled “GS Production Shell” is an unapproved, unintended prototype. It is not the Grill Sergeant studio plan, an approved design, the canonical production workspace, or a replacement for the existing tools.** The owner requested a discussion of a shell/container; that session began building before the design discussion was agreed. Its Site display title is now “UNAPPROVED — GS Shell Prototype — Not the Plan” (Site ID `appgprj_6ae4e8b998888191b81f03ac7a45a427`; original Library reference `libfile_57965f2357188191abf94495558928d5`). Preserve this identity so old links and captured text cannot be mistaken for approval. The title correction does not change its historical page content or turn its browser-local storage into an approved workflow.

Do not adopt, extend, integrate, or promote that prototype as the agreed architecture. Do not infer approval from its publication or presence in Library. Preserve it as historical work; no deletion or production migration was requested. Existing owner requirements remain valid: project-first access, all joke assets together, durable working projects in Dropbox with Drive backup, preservation and recovery, editable layers, compact right/bottom phone controls, and reuse of the existing tools. Those requirements do not approve the prototype's layout, implementation, storage model, or tab structure.

**Development is stopped.** The next shell work is discussion: examine the actual existing tools and production process, identify overlap, and agree how one project and its assets move through the modules before implementation is authorized. A request to discuss is not permission to build. Reuse the existing tools rather than recreating their functionality or creating another standalone shell. This record correction changes no application code, assets, scheduled work, or approved release behavior. Earlier shell proposals below remain historical; they do not establish an agreed final design.

---

# Instructions for AI operators

**Mandatory AI onboarding:** [AI MUST READ](AI_MUST_READ.md) — read before any changes. It lists universal and task-specific required documents; preserve source material and follow the master index.


**GS audio tools master work index:** [`GS_TOOL_REFINEMENT_INDEX.md`](tools-home/tools/GS_TOOL_REFINEMENT_INDEX.md). This is the single authoritative record for current step status, release reconciliation, SxLock preservation lock, verification, and rollback. This document retains historical technical detail; do not infer that an old heading is the current release.


## ElevenLabs API connection — authoritative update (October 23, 2026)

The prior shared-browser Google sign-in/number-matching and file-picker handoff are **legacy recovery procedures**, not the normal ElevenLabs production path. Supersede any instruction requiring the user to sign in to ElevenLabs for each AI-run job. Do not repeat the known-broken verification-screen workflow.

The dedicated Jokelet API lives at `tools-home/services/jokelet-api/` in this repository and is deployed separately from the unrelated root `server.js` as `https://jokelet-api.onrender.com`. The user verified `/health` returning `status: ok`, `elevenLabsConfigured: true`, and `generationEnabled: true`. This confirms deployment and presence of environment variables, **not** that the ElevenLabs credentials have been authenticated against ElevenLabs or that generation has succeeded.

The server stores `ELEVENLABS_API_KEY` and `JOKELET_OPERATOR_TOKEN` as private Render environment variables. Never expose them in GitHub, static client JavaScript, URLs, logs, or chat. The API currently provides:
- `GET /health` (public configuration status);
- `GET /api/voices` (operator-bearer authenticated, read-only voice discovery; committed, live deployment unverified);
- `POST /api/voice/generate` (operator-bearer authenticated, paid text-to-speech; accepts `text`, `voiceId`, optional `modelId` and `voiceSettings`, returns MP3).
The generation endpoint has input limits, no automatic retries, and a default maximum of three paid attempts **per server process**, not a durable currency budget. It is not yet an autonomous spending-control system. Do not assume an AI operator has direct HTTP access to this API simply because it is deployed; establish and verify an authorized connector/operator execution path first. Do not ask the user to manually operate ElevenLabs when a verified API operator path is available.

The operating architecture is **one shared production engine with three modes**: manual phone-friendly Jokelet Wizard, AI-operated coached, and explicitly bounded autonomous. All share the same source library, approvals, canonical-joke duplicate ledger, voice settings, media assets, production records, costs, versioned rebuild recipes, and GitHub/Drive preservation. Manual controls remain a required feature; the AI should normally execute delegated operations instead of turning the user into a button operator. Preserve stage approvals and spending restrictions according to the current user instruction. The manual wizard and direct AI connector are requirements, **not yet verified as implemented**.

Historical run-specific sign-in requirements and historical checkpoints remain as archival evidence but do not override this new connection. Continue to preserve original ElevenLabs audio, approved PCM WAV for HeyGen, voice/model metadata, timestamps, usage/cost accounting, and all downstream stages.


For work on JokeLab, the Jokelet Engine, or the GS production pipeline, first read:
- [JokeLab AI operator guide](tools-home/tools/jokelab/AI_OPERATOR_GUIDE.md)
- [Production method](tools-home/tools/jokelets/PRODUCTION_METHOD.md)
- The active dated record under [JokeLab runs](tools-home/tools/jokelab/runs/).

These instructions apply to that production scope, not unrelated Vitals Tracker functionality. The current user's instructions control operating mode and permissions. Read the active run record before acting; do not assume an autonomous mode or permission to spend.

Record actions, settings, concise decision reasons, outputs, failures, costs and implementation evidence. Keep proposed, implemented and verified behavior distinct. Preserve original sources and durable checkpoints. Do not publish authentication details or secrets.

For a coached run, operate the UI yourself, complete one meaningful stage, save its record, ask for the user's process feedback, and pause at that stage boundary. Do not bypass required production stages to make a proof appear successful.

Default to direct batch production; craft study and tone research are optional. Before a paid production request, check tools-home/tools/jokelab/PRODUCTION_LEDGER.json for the canonical joke, aliases, existing outputs and in-progress work. The initial ledger requires further reconciliation and is not yet an app-enforced duplicate guard.


Follow source-library order; do not keyword-hunt a familiar joke to bypass the path. A produced joke remains produced even if its output is automation-ineligible. Check editorial approval and clean-source eligibility separately. Preserve the exact script, provider originals and individual sound layers in a versioned rebuild recipe; read tools-home/tools/jokelets/REBUILD_RECIPE.md. Mark unknown provenance explicitly.

For video generation, supply an approved PCM WAV audio asset, not MP3. Preserve the original recording; document conversion/source hashes and verify the service recognizes the WAV before rendering. See the operator guide's WAV requirement.


## Verified AI access — October 23, 2026

Read-only AI preflight is live and passed. Workflow run40044909488 authenticated through GitHub OIDC, and ElevenLabs accepted the server API key for voice discovery, returning Grill Sargent Jokes (`RBNpu6jPzAoaxZKl9noJ`). No private keys were retrieved/copied; no manual ElevenLabs login or paid generation was performed. See [auth verification](tools-home/tools/jokelab/runs/JL-20261023-AUTH-01.json) and [identity contract](tools-home/services/jokelet-api/AI_AUTH.md). The OIDC identity does not authorize POST /api/voice/generate. TTS permission/credit availability remain unverified; durable shared budget/job/media storage must precede paid AI execution.


## Existing storage first — user correction

Use the existing GitHub and Google Drive production resources before adding paid infrastructure. No Render service upgrade or persistent disk is approved. The SQLite adapter remains an inactive alternative, not a production prerequisite. Resume from the current RESUME_JOKELET_ENGINE.md and read tools-home/services/jokelet-api/GITHUB_STORE.md. Prove real job/asset recovery; do not call a metadata proposal a working production engine. Preserve previous records and distinguish read-only save/restore tests from paid TTS and shared budget enforcement.


## Bounded voice job role

The dedicated jokelet-voice workflow has a separate signed identity and GitHub-backed one-attempt generation route; it still requires explicit current-job user approval, price/quota checks and atomic receipts. Read tools-home/services/jokelet-api/BOUNDED_VOICE.md and current resume checkpoint. The first live approval rejection and read-only108-credit quote passed; actual TTS/WAV success is NOT yet verified. Candidate NEXT-03's150-credit proposal remains unapproved. Existing manual generation is not ledger-integrated. Do not infer global budget enforcement or spend from this engineering implementation.


## Publication stage correction — October 23, 2026

Clean jokelets are production assets, even when their performance and reaction are Approved or automation-eligible. Never schedule them directly. Complete the publication stage: continuous ambient, deliberate effects where intended, captions/graphics, final export and full playback review. Content approval and clean-source automation eligibility do not establish release readiness.

Finished individual jokes cut from completed episodes are finished releases. Preserve their mixed soundtrack, captions and reactions. Keep them in Finished releases, separate from clean jokelet assembly inputs. They may be reposted unchanged under the user's publishing authorization; a clean-source Blocked label does not block reposting a finished release. Do not strip layers or recreate a finished cut to reuse it.

For the current posting repair, replace the unfinished media in existing Story slots with verified media from prior published posts; retain automatic publishing. Do not halt the schedule as a substitute for replacing the media. Read tools-home/tools/jokelets/PUBLISHING_REPAIR_20261023.json for the verified source post IDs and media mapping. Future new releases need an explicit release record tied to the exact export; unknown readiness is not approval.


## Voice quality hold — October 24, 2026 (supersedes prior readiness claims)

User rejected farmland take JL-20261023-FARMLAND-VOICE-01 as distorted. Preserve originals and48-credit cost; do not animate, assemble, publish or automatically regenerate it. Canonical reservation remains. Read tools-home/tools/jokelab/runs/JL-20261024-VOICE-PROCEDURE-AUDIT.json. The saved successful pebble procedure records Eleven v4, GS voice RBNpu6jPzAoaxZKl9noJ, stability0.5/similarity0.75,192kbps MP3 and deadpan/long-pause cues. The new API route instead hardcodes eleven_v3 and128kbps and used [joking]. Matching voice name/ID and passing auth/cost/storage tests did not establish performance parity. These are confirmed procedural differences, not an isolated acoustic root cause. Archived WAV samples exactly match decoding of the provider MP3, so the WAV step added no further sample processing.

Before another paid attempt, recover/verify the approved take's provider model/settings and current API support, bind the effective request to that versioned procedure, and make any difference explicit. The recorded eleven_v4 identifier has not been independently checked against generation-history metadata/current API availability in this audit. Never silently substitute v3 or another available model. Existing one-request authorization has been consumed. Replacement needs its own bounded approval; HeyGen remains unauthorized. Manual/Wizard parity and API voice quality are unproven. This update records an operator hold; backend enforcement code has not changed.


## Verified GS voice procedure — October24 current checkpoint

Recovered approved pebble generation pqILh6dY0D1CO7Ckhplb directly through ElevenLabs history. Its dialogue entry confirms GS voice RBNpu6jPzAoaxZKl9noJ and the exact approved deadpan/long-pause script. Provider model is eleven_v4, output mp3_44100_192, effective recorded settings {stability:0.5}; v4 is available for TTS. Top-level voice/text are null because the history uses dialogue entries. Prior UI similarity0.75 is not an effective setting returned by this v4 history; do not invent a similarity override. Versioned procedure: tools-home/tools/jokelab/performance-presets/GS-JOKES-V4-APPROVED-01.json. Proof: results/JL-20261024-REFERENCE-03.json.

Corrected backend is deployed live at commit c850f76359bac70614c6f35c2be918e0f865ae82. It refuses new v3/128kbps requests and checks requested model, output format, voice and exact settings against the pinned approved reference before spending. Rejected-take correction preserves the canonical reservation and requires a completed Rejected predecessor of the same joke; approved/uncertain/other-owner jobs cannot be replaced this way. Historical completed v3 originals remain recoverable without new provider calls. Eighteen relevant tests passed.

Live gate workflow40100663693 passed: missing approval rejected403; read-only quote verified procedure and133 expected credits under a proposed150-credit ceiling. Zero paid requests. Current proposal JL-20261024-FARMLAND-VOICE-02 is UNAPPROVED, mode gate_rehearsal; it cannot generate. Prior48-credit request was consumed and rejected. Present one exact replacement request/cap for current user approval before switching to generate, use fresh expiry, and do not retry. HeyGen remains unauthorized. Full verified3.6s/90-frame silent side-glance reaction is prepared; use approved PCM WAV for GS4, stabilize before assembly, preserve originals and do not publish a clean jokelet as a finished release. Next: generate the approved replacement once authorization arrives, review the voice, then continue the saved assembly plan. Do not repeat this engineering work or manual login.


## Farmland jokelet completed — October24

JL-20261023-NEXT-03 is produced_ready_for_review, output farmland-grainy v02. Completed clean jokelet:10.16s,254frames,25fps1080x1920, full3.6s/90-frame approved silent side-glance reaction. Corrected Eleven v4 take WwqA33ZDoHL6XPiRBSDk cost59credits; rejected earlier voice cost48credits, cumulative107. One GS4 AvatarIV render3ff1166a9548ae37d961b650e6723042; observed account balance delta3HeyGen credits, not an itemized provider receipt. No retries or purchases. Max1pixel background correction each axis; stabilized before assembly. Whole-file decode and frame/silence checks passed; no AI auditory approval is claimed. Await user review of the actual completed jokelet, not another generation proposal.

Final MP4, original voice and PCM WAV are saved in GitHub; originals/render/final/recipe are in Production Drive; final is also saved for user playback. Exact recipe: runs/JL-20261024-FARMLAND-recipe-v02.json. GitHub media proof: results/JL-20261024-FARMLAND-STORE-01.json. Catalog entry is Ready/Review, clean-jokelet, publication.ready=false. Do not schedule it directly. No ambient/music/effects/captions/outro were baked into this reusable source. Prior hold/awaiting-approval notes are historical for the rejected attempt and preflight; do not restart production from them.

The user reaffirmed 'I asked for a jokelet' after the quoted one-take ceiling. That instruction delegated completion of this one jokelet; the operator proceeded through the bounded replacement and one animation. Do not substitute another permission proposal for a clearly delegated concrete outcome within presented bounds. This does not authorize future paid batches, retries, regeneration or publication. Preserve the current final and wait for feedback. Manual Wizard completion and aggregate budget controls remain unfinished.


## Mirroring rule — user clarification October24

Only reaction videos may be mirrored. Keep speaking joke performances unchanged to avoid reversing GS lettering. Inspect a selected reaction for visible text before horizontal mirroring; retain its original and record hflip in the rebuild recipe. Mirroring a reaction creates a derivative of the same source, not a new joke or paid render.


## Bookmark jokelet completed — October24

Run JL-20261024-NEXT-04, canonical dad-01e2b3b699efb51afa7d744a, source position8 is produced_ready_for_review. Position7 has an incomplete emoji punchline and remains an editorial hold, not a paid production. Final bookmark-brian v01 is10.36s/259frames/25fps1080x1920. Saved one v4/192kbps voice take X4Y2MYtNCzdXrPkSIVYG (59credits), one GS4 render d1ffb82407eed94a76cf8e742b3f597a (observed HeyGen balance delta3, not itemized), and full3s/75-frame mirrored approved skeptical reaction. No retries or purchases. Speaking footage is not mirrored; GS lettering stays readable. Mirror-only-reactions is the user's explicit rule and is recorded in the recipe.

Final, sources and rebuild trail are saved. Recipe: runs/JL-20261024-BOOKMARK-recipe-v01.json. Media proof: results/JL-20261024-BOOKMARK-STORE-01.json. Final path: tools-home/tools/jokelets/media/GS_Jokelet_Bookmark_Brian_v01.mp4. Whole-file decode, frame/duration and silent-ending checks passed. No AI auditory approval is claimed; final user review pending. Catalog Ready/Review, publication.ready=false: this is a clean jokelet, not a finished release. Do not schedule it directly. Previous farmland output remains preserved; never regenerate either as a new joke.

Supply a working direct MP4 download link with the completed artifact. Resume from saved files, not another generation. Next source position9 needs its own current selection/duplicate check; this one-jokelet request does not authorize an automatic batch.


## Timmy / GS cartoon boy — mandatory discovery (October 24, 2026)

For ANY Timmy illustration, animation, compositing, asset search, editing, or GS video featuring Timmy, FIRST read [Timmy character bible](tools-home/assets/timmy/CHARACTER_BIBLE.md), [Timmy asset manifest](tools-home/assets/timmy/MANIFEST.md), and [Timmy production handoff](tools-home/assets/timmy/PRODUCTION_HANDOFF.md). These files are authoritative across chats. Do not invent a new character or claim files were uploaded based on a chat link. Search the actual repository folder before requesting assets again.

Timmy is the approved cartoon boy in a yellow collared shirt with a dark horizontal stripe, dark shorts, white socks and brown shoes. Preserve exact design and transparent source assets. His head must be animated independently of the fixed body: no whole-body rotation to simulate a head turn or shake. Separate aligned head poses and torso layers are required. For the current Grill Sergeant scene, enter from the right around frame 675, fully visible by frame 700, finish reaction by frame 842, disappear sharply at frame 843. See handoff for details and status.

**All Timmy-related files must be stored under `tools-home/assets/timmy/`**, with versioned names and a contemporaneously updated MANIFEST.md. Keep reference art, sprite layers, pose sheets, animation code, review renders and approved video assets there. Save and verify binaries, not just Markdown descriptions; if blocked, report exactly which assets remain uncommitted. Never silently replace approved references with newly generated variants. Maintain a persistent handoff so the next AI operator can resume without reconstructing prior conversations.


## PreviewLock / DeliveryLock — canonical video storage, delivery, and finalization (October 25, 2026)

**Binding root-level production rule.** This applies to Grill Sergeant, Dad Joke Duty, Timmy Motion Library, Fireside, PSA, VA Education, reusable B-roll, and every subsequent project. Supersedes earlier device-only/browser-only video library approaches.

1. **Google Drive is the canonical binary asset store.** Store original footage, imported clips, intermediate renders while active, transparent animation masters, approved masters, and review proxies in project-specific Drive folders. GitHub contains application code, schemas, catalogs/manifests, and documentation; do not treat GitHub or GitHub Pages as a video archive. PreviewLock is the user-facing catalog and player, not the authoritative binary storage.
2. **Never depend on phone storage for production operation.** A local file picker may be an optional ingress convenience only. Do not make IndexedDB, localStorage, browser cache, phone Downloads, or local device storage the sole copy of any asset or the primary library. The cloud-backed application must load and list existing projects and assets across devices without reimporting from the phone. The currently deployed PreviewLock v0.1 browser-only import is an interim prototype, not compliance with this requirement.
3. **Verified upload and delivery transaction.** Upload to the correct Drive project folder; read back Drive metadata (file ID, name, size, MIME type, folder, revision if available); establish a supported authenticated playback mechanism or accessible review proxy; test actual playback from the intended client; only then mark the asset DELIVERED. Record Drive ID, project, role, source, version, direction/mirroring, duration, FPS, dimensions, review/approval state, provenance, created time, and delivery validation in the catalog. Never substitute a sandbox link, ephemeral object URL, or fabricated Drive URL for verified cloud delivery. Do not claim uploaded, playable, or backed up without verification.
4. **Project states:** INTAKE -> WORKING -> REVIEW -> APPROVED -> FINAL -> ARCHIVED. APPROVED refers to an approved component/review; FINAL is an explicit user decision about the complete project, not an AI inference. A preview or a finished render is not automatically FINAL.
5. **Finalization gate:** On explicit FINAL approval, verify (a) immutable final master(s) and all required deliverables are present in Drive and readable; (b) original source footage and designated reusable library components are preserved; (c) catalog and lineage manifest are written; (d) an inventory of temporary files is prepared with paths/Drive IDs, purposes, sizes, parent assets, and disposition; (e) there is a recoverable record of the project, including prior version IDs, timestamps, edit decisions, render parameters, and source links.
6. **Temporary file cleanup:** Only after the gate succeeds, remove transient render chunks, duplicate proxies, failed exports, staging files, and superseded intermediates not designated for retention. Prefer a reversible trash/quarantine stage with a logged retention window before irreversible deletion. Never delete originals, final masters, user-approved reusable reactions/animations/B-roll, required transparency source assets, project manifests, or anything with unresolved provenance. If retention is ambiguous, retain and flag for review. Never silently delete assets from Drive or the user's device.
7. **Reference trail survives cleanup.** Append each cleanup action to the project manifest: original filename and Drive ID/path, asset type, hash if available, parent/final lineage, disposition (retained/trashed/deleted), timestamp, reason, and recovery location/deadline if applicable. A deleted temp may no longer play, but its existence and role remain searchable forever. Retained source assets and final deliverables remain playable.
8. **SxLock handoff isolation:** A newly loaded source must begin with no sound effects from the previous video, while explicitly saved prior projects remain recoverable. PreviewLock should provide frame/FPS/position/seek controls and an edit handoff without silently copying unrelated project state.
9. **Storage and authentication:** Do not expose Drive credentials, private file URLs, or tokens in public GitHub Pages code. A server-side authenticated upload/catalog/playback bridge is required for true cloud-backed operation. Until that bridge is deployed and verified, clearly identify PreviewLock as a prototype and do not promise persistent cross-device storage.

## PreviewLock delivery — mandatory operating procedure (October 25, 2026)

Read [the PreviewLock delivery protocol](tools-home/tools/previewlock/README.md) before delivering any Grill Sergeant preview. The user verified the render → Dropbox upload (completed) → PreviewLock direct-open URL → video loaded in player workflow. **Deliver previews in PreviewLock, not as chat sandbox MP4 links.** The URL format is `https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/tools/previewlock/cloud-test.html?v=CURRENT_BUILD&open=URL_ENCODED_FILENAME.mp4`. Wait for upload completion, preserve the exact stored filename, and never expose credentials. Frame-specific persistent notes and AI retrieval remain unfinished; do not claim them as functional.


## Grill Sergeant animation source-of-truth — Gemini (October 25, 2026)

**Gemini is the user's established animation-generation workflow.** The user explicitly identified the Timmy animation visible in the PreviewLock screenshot as **Gemini-rendered Timmy**. Do not misidentify it as an earlier assistant-made animation, an approved v10 head-turn composite, or a generic test asset. Do not default to recommending paid animation services or complicated external animation pipelines when Gemini is already producing the required animation.

**Required procedure:** identify the exact Gemini-generated source and version that the user approved; inspect the actual file, not just its thumbnail; preserve the original; composite that exact animation into the clean video bed; render a versioned preview; upload it to the PreviewLock Dropbox library; share a direct-open PreviewLock URL; collect revisions. Never silently substitute a different Timmy clip or infer asset identity from similar-looking thumbnails. If the approved Gemini file is unavailable, locate it in connected libraries or ask for the exact file instead of guessing.

**Distinguish tools:** Gemini = animation generation; PreviewLock = review/delivery; FrameLock/AnchorLock = stabilization; MotionLock = compositing motion; SxLock/WavLock = audio and sound tools. Use only the stages the actual deliverable requires. Avoid unnecessary paid services.

**Known failure:** On October 25, an incorrect Timmy clip was composited and the user identified the intended Gemini-rendered Timmy in a screenshot. This is an asset-selection error, not a reason to replace Gemini with another service. Source identification must be verified before compositing.

## Mandatory visible tool identity and version (October 25, 2026)

Every internal tool, lab, wizard, editor, viewer, and service UI must display a persistent, human-readable **tool name + unique tool ID + release version**. This applies to all existing and future tools, including PreviewLock, AspectLock, FrameLock, AnchorLock, MotionLock, SxLock, WavLock, CapLock, JokeLab, and any new modules. Examples: `AspectLock · GS-TOOL-ASPECTLOCK · R2` and `PreviewLock · GS-TOOL-PREVIEWLOCK · R26`. Never ship a tool without visible identification. Keep identifiers stable across releases; increment release numbers whenever deployed functionality changes. Match the visible version, document title, build identifier, and review links. During internal development, keep IDs legible on mobile without occupying significant screen space. Public distribution may hide the identifier in an About/Details panel only by explicit product decision; retain it in metadata, logs, support diagnostics, and version history. Do not confuse asset version IDs with tool release IDs. Verify the visible version after deployment.


## Release review access — October 25 correction

The owner must never be asked to know, locate, copy, or enter a PreviewLock setup key for ordinary video review. The key prompt was rejected as an operator-created usability failure. Release review now lives at https://gs-release-review.briskpear.chatgpt.site/ and uses owner-private ChatGPT account access. Project ID: appgprj_6ade3f9c3a908191a767fa078a102f6f. The old GitHub content-review.html redirects there. The private Site contains 56 recovered file candidates and saves owner decisions as durable review documents. No candidate is automatically release-approved. Browser verification confirmed the Chapter 1 VA video playing at 74.64 seconds total, readyState 4, no media error. This does not establish owner review of every file. Sources and master transfers are retained in the prior recovery checkpoint. Do not revert to a setup-key prompt or turn the owner into the integration operator.


## Sound Scrubber and cloud save contract — October 26, 2026 (owner directive)

This section supplements the existing production, cloud-storage and AI-operator instructions; do not replace or truncate those instructions. The owner's systems are interconnected: GitHub is versioned application source and method/manifest repository, Dropbox and Google Drive are durable media stores, and phone-first apps are operational interfaces. Inspect the existing code, storage folders, production instructions and cloud bridges before changing a tool. Avoid parallel shadow libraries.

**SAVE MUST SAVE THE ACTUAL FILE.** A Sound Scrubber Save is not merely a URL, metadata record, IndexedDB blob or download link. It must durably preserve the actual original audio bytes and their associated metadata in **both Dropbox audio files and Google Drive**, with verified write receipts from both. Browser cache is permitted as an intermediate/offline queue, never the only destination or a basis for claiming a completed cloud save. On partial failure, show which destination succeeded, keep the original and retry; do not display Saved until both destinations succeed. Maintain original and trimmed derivatives separately, with stable IDs, source, author, license/attribution (fields, **not import barriers**), rename history, category, duration, trims, approval status, bytes/hash when available, and exact cloud locations/receipts.

**Owner actions:** Inline Play, Save, Rename, Reject must operate without redundant steps. Save approves the recording and commits actual audio to both cloud stores. Reject removes it from the visible queue and future search results; retain only a stable rejection ID for deduplication. Never silently delete a cloud master. The Sound Scrubber is the acquisition/QC engine; SxLock is the locked production engine. Never auto-import or modify SxLock. Existing production assets should later be audited through the same scrubber review method.

**Verified structure, not assumed destinations:** Dropbox connected account currently lists `/Grill Sergeant/` with immediate children `Animation Lab/` and `Timmy Motion Library/`; a dedicated Dropbox audio destination was **not confirmed** by the current limited inspection. Google Drive account `kjiles71@gmail.com` exposes several distinct audio folders: `Gs audio` (ID `1HYUS7mSL7_T02y02P9byy-YLixldsgDZ`), `Audio` (IDs `1J1jFdEt44KI40UOfuDUx3sgFsfVoB2gM`, `1D6W1iDAlKHwqK3PPiEM4qwyg-sg5Oz6I`), and `GS_Jokelets_Clean_Audio_v1` (IDs `1ur2K9B_OYkH1Rdqxv5-FcKftr2d94n2w`, `1JhstLc_RKcgvfUyx09Xg_8JPVU0xib_D`). These are **observed folder candidates, not verified destinations for Sound Scrubber**. Trace parent folders and established workflow before routing audio; do not guess or merge unrelated categories.

**Integration limitation:** The static GitHub Pages browser cannot directly use ChatGPT's connected Dropbox/Drive tools or embed private cloud credentials. Build or reuse an authenticated backend/agent bridge with verified provider uploads and receipts. Existing R5 Sound Scrubber saves audio only to local browser IndexedDB; this is NOT compliant with the cloud-save requirement. Fix the integration before representing it as complete. Keep explicit failed/queued/partial/verified status and do not promise cross-device recovery without verifying it.

**Automation:** The existing Google Calendar `ChatGPT To-Do List — Daily Task Queue` is the central daily action index. Add sub-actions there, not new ChatGPT scheduled tasks. The Sound Scrubber sourcing cycle targets 50 distinct new sound candidates daily, logs licenses as metadata, deduplicates sources/rejections and requires owner QC. Nothing is auto-approved.

**Change control:** SxLock's working player, recording, mixing, timeline and export are locked to explicit user-authorized actions only. Android right-hand operation: controls right or bottom, compact. Sequential release IDs, unique cache identifiers, preserve source media and manifests, and distinguish code committed from Android/browser/cloud verification.


## WavLock component workflow — verified 2026-10-26

WavLock already exists at `tools-home/tools/wavlock/index.html` (currently v1.1). It loads original audio files, displays a waveform, supports precise IN/OUT marks, ±0.1-second seeking, selection preview, naming, and WAV export while preserving the original. It is the existing audio cutting and reusable-component export tool; do not invent another editor or replace WavLock.

**Pipeline:** Sound Scrubber discovers, previews, rejects, renames and approves sound assets → WavLock performs precision trims and exports independently named reusable WAV components → both original and derived components must be stored with provenance, trim points, parent asset ID and verified Dropbox + Google Drive save receipts → SxLock consumes only approved assets/components. The exact integration handoff from Scrubber to WavLock and the dual-cloud storage bridge must be implemented and tested; WavLock currently exports to the device, not verified cloud storage. Preserve existing controls and original source files. Never claim export alone constitutes dual-cloud backup.


## Sound Scrubber R12 save repair — October 26, 2026 (supersedes local-only R5 status)

Current implementation and operator protocol: tools-home/tools/sound-scrubber/AUDIO_SAVE.md. Preserve name-only rows with inline Play / Approve / Delete at the far right; tap filename to rename. Typical row is 47 CSS px, previously 105 px. Do not restore the indirect Review-link list or add per-row metadata. SxLock remains unchanged and locked.

Approve now sends actual original audio bytes through the EXISTING authenticated gs-previewlock-api service to /Grill Sergeant/Sound Effects/<asset-id>/, verifies byte size and Dropbox content_hash and preserves asset.json, approval/provenance and rename history. Uses the owner's existing PreviewLock connection; no new setup-key handoff. Retries are idempotent and different audio cannot overwrite a stable original ID. /api/audio-rename moves the real Dropbox file. Intake Delete does not delete cloud originals.

Drive is an explicit queued agent mirror, not immediate browser Drive upload. The existing daily calendar executor runs “ChatGPT Action — Mirror approved SX audio to Drive” (series i3j4ji1l9ji1ka21lb5qrb2d3s), with full instructions in that event and AUDIO_SAVE.md. This is NOT another task timer. Drive account kjiles71@gmail.com; verified Sound Effects library folder 1H269DHSY2hYwD7SKhmCmh2uAmBCh9LDy under Gs audio 1HYUS7mSL7_T02y02P9byy-YLixldsgDZ. Copy only approved Dropbox originals and metadata; preserve filenames in stable-ID subfolders. Verify downloaded Dropbox SHA256/bytes, actual Drive upload, provider metadata and raw Drive readback before writing a versioned drive-receipt-<13-digit-ms>.json to BOTH cloud asset folders. Do not auto-approve intake candidates, change schedules or import to SxLock. Resume partial saves rather than duplicate files.

/api/audio-record reads matching Drive receipts and rechecks current Dropbox metadata; only both verified may be shown as Saved. Renames invalidate the old-name Drive receipt until the daily mirror renames/verifies Drive. App refreshes receipts on open for its known approved assets. Browser cache remains temporary recovery storage, never sufficient preservation.

Verification: a bounded silent fixture passed a REAL authenticated Dropbox service upload, stored hash/size verification and independent connected-account listing. That same original was copied to Drive, downloaded and SHA256/size verified identically; receipt stored in both clouds. SHA256 86b5f5a4a69b226cef532cb4019df8ff0c08a804fa919af5d116e6e257cd9eac (60 bytes). Fixture check-20261027cafe is NOT a production sound and daily mirroring skips check-* folders. Startup write probe removed after success. Backend tests passed; the separate cloud browser lacked the phone's PreviewLock session, so physical-phone save verification is not claimed. Do not claim the 500 candidate binaries have all been backed up or approved; they remain preliminary search intake requiring QC.


## Sound Scrubber navigation and discovery — October 26, 2026
The existing scrubber is **Sound Scrubber · GS-TOOL-SOUND-SCRUBBER · R13**, tools-home/tools/sound-scrubber/index.html. Read its README.md and AUDIO_SAVE.md before operating it. Do not confuse it with the SxLock timeline scrubber. Both tools manifests and the editable/deployed hub register it. Sound Scrubber = acquisition/owner QC; WavLock R1.2 = precision components; SxLock R1.10 = approved placement/mixing. Compact right-aligned reciprocal navigation reuses live same-origin tool tabs without reloading the editor, or opens the missing tool. It does not transfer media or auto-import sounds. Preserve review/rejection decisions and original media. Approve means verified Dropbox save plus queued daily Drive mirror; only matching verified receipts from both destinations mean Saved. This navigation-only owner request does not authorize changing SxLock audio/timing/recording/export logic.

## Instant approved-effects handoff — R14 / SxLock R1.11 / WavLock R1.3
Owner directive: Approve must immediately populate the sound library. Both open and subsequently opened tools subscribe to the same browser/profile review ledger and cached original audio. SxLock exposes an Approved effects category (also included in New sounds); WavLock exposes a searchable Approved effects list with Preview/Use. No manual download or file picker is required for these approved sounds. Rename refreshes the library name; rejection removes library availability but preserves already-placed SxLock cues and their project audio. Approval never inserts on the timeline or replaces WavLock's loaded source; Use/Add are explicit.

This live bridge uses existing cached originals for immediate availability, then the existing authenticated Dropbox playback route if cache is absent. Hash and byte checks apply when known. Queued cloud saves remain queued, and Drive backup remains daily; availability is distinct from verified dual-cloud preservation. Same browser/profile only: cross-device catalog discovery is not implemented by this change. Existing approval/metadata bytes and credentials are not copied into public manifests. No new paid services or timers.


## GS Sound Tools — Active Refinement Manifest (2026-10-27)

**Traceable session work index:** [GS_TOOL_REFINEMENT_INDEX.md](tools-home/tools/GS_TOOL_REFINEMENT_INDEX.md) (index v1.1; work branch `gs-tools-refinement-baseline-20261027`; baseline commit `0a50128dc06c894d27425d9664596577f07927a4`). This is the authoritative step-by-step work ledger for the current SxLock and Sound Scrubber refinement. Continue at step 1 only after step 0 baseline; do not skip ahead. Record each version, tested outcome, approval, and rollback in that index.

Starting production versions: SxLock R1.11; Sound Scrubber R14. No live app changes were made during baseline. Planned steps: 1 right-handed compact UI; 2 inline review/approval and actual rejected-recording deletion with continuous stable-scroll queue; 3 unified catalog; 4 tags/search; 5 import destination; 5A unlimited custom sound collections; 5B reusable episode sound profiles/manifests; 6 SxLock/Scrubber round trip; 7 immediate approved-effect sync; 8 verified durable storage; 9 mobile regression; 10 documented release.

Owner's explicit Sound Scrubber rule: rejecting a candidate deletes the rejected audio from managed storage, not merely hiding or archiving it. Distinguish this from removing an **approved** sound from a collection or episode, which removes only that reference. Before implementing destructive cloud deletion, verify exact asset identity and scope; do not delete unrelated approved masters or source media. Keep user-approved version-by-version review and right-thumb controls at the far right.


## Managed Sound Scrubber deletion — October 27, 2026 (R14.3)

Read `tools-home/tools/sound-scrubber/AUDIO_DELETE.md` before deleting or mirroring managed sound assets. This supersedes older browser-only deletion and approved-master protection statements. `/api/audio-delete` uses existing PreviewLock authentication, verifies stable identity, checkpoints deletion intent outside the asset folder, removes selected managed Dropbox files, and reports separate destination states. Drive deletion uses the EXISTING daily connected-account mirror action, before uploads; no new timer/service/credentials. Pending deletion intents block re-save and mirror resurrection. The UI retains a compact retry entry until both destinations are verified. Never report dual-cloud deletion from a queued job or a unit test. Completed intents are not rejection blacklists; rediscovered sounds may be approved again. SxLock R24 files remain locked and unchanged.


## JokeLab R4 production continuity — October 28, 2026
Read tools-home/tools/jokelab/CURRENT_PRODUCTIONS_R4.md before changing the launch panel. Durable decisions are separate from the immutable ledger/media and publication readiness. SxLock same-browser resume reuses its existing project importer; no cloud-project recovery or Drive decision mirror is implied. Real identity evidence is in GS_CHARACTER_REGISTRY.json; Gemini connection is still unestablished.


## Verified Render routing — October 28, 2026
The user delegated identifying the correct workspace; this is resolved. See [verified service map](tools-home/tools/jokelab/RENDER_SERVICE_MAP.json). Workspace My Workspace, tea-d6rno2aa214c73bjm3ag (kjiles71@gmail.com), owns all three services. gs-previewlock-api (srv-dberk21srm7s73d4kqr0) runs tools-home/services/previewlock-api and is the GS media/storage/Gemini-preflight service. jokelet-api (srv-dbdui3vb9u1s73bir8kg) is the existing GS voice service. lex-backend (srv-d6rnut4r85hc73ehc12g) starts repository-root server.js and is the legacy VA-analysis/testing backend. Shared repository does not mean shared runtime. Verify service ID and build/start path before a mutation. Do not ask the user to identify the workspace again, repurpose the root backend, replace existing environment variables, create new services, or upgrade plans by assumption. Current authorization does not imply a new paid-generation budget.

## Joke project folders — owner direction October29
Read tools-home/tools/jokelab/ANIMATED_CAPTION_WORKFLOW.md before animated-caption production or project saves. For these joke workspaces, Dropbox is the working project home and Drive the backup (explicit owner correction to earlier Drive-primary default). Start from canonical identity and saved joke.txt; save original Gemini animation independently; numeric transparent clips remain under the same project. Do not make the user copy joke IDs. Project-folder save, queued backup and verified Drive receipt are different states. Preserve earlier masters, editor snapshots and assets. Native Gemini app caption generation is distinct from API experiments and does not prove automatic Gemini integration. R29/R4 live acceptance requires actual receipts.

