## Verified production stages — November 2, 2026

CapLock R16 now produces a captioned composite and opens the same single-joke project in SxLock R31. SxLock saves the editable sound pass and verified jokelet. Clipper R15 remains optional; Studio R2 skips cutting in its normal joke route. Stage-aware lists default to ready inputs with Show all files off. Originals, layers, captions and prior versions are retained. The locked player equipment is unchanged. [Operation, file extensions, rebuild contract and rollback](../studio/PRODUCTION_STAGES_R16.md). Earlier release sections remain historical.

## Direct jokelet caption workflow — Clipper R14 / CapLock R15, November 2, 2026

Owner correction: Clipper is optional equipment. A saved joke video (for example Slide test 2.mp4) opens directly in CapLock through Files or Photos and becomes its own project. Existing projects remain selectable. A whole-video import preserves the exact source bytes and soundtrack; it does not render, stitch, transcribe or require a visit to Clipper. Its source-bound full range is recorded with origin cut ID `whole-video`, using the existing verified bed-save route. Reopening the same bytes resumes the same project; names never establish identity.

For a source that needs cuts, Clipper's visible **Next → CapLock** sends the named video cuts to the jokelet picker. Each selected cut still owns an independent caption project. This replaces the hidden-footer-only handoff as the normal instruction; the footer remains compatible. The locked right rail, editable IN/OUT boxes, exact source frames, media engines and Save/Resave stay intact.

In the opened CapLock joke, **Import captions → Import Gemini video** preserves the blue provider original in that project and opens Caption Clipper with the project and return target already bound. Mark/add the animation ranges, then **Next → CapLock** saves any pending transparent components and returns to the waiting editor tab. A changed caption pass adds its unplaced component tray to the same scene, preserving bed transforms, existing layers and prior placements. Reopening the same pass restores its active item. Previous/Next caption navigation and Insert remain separate actions.

The caption sheet also offers **Joke text · Gemini handoff → Copy Gemini handoff**. Existing JokeLab text is reused. Imported videos with no text do not get a fabricated transcript: literal text may be saved before copying the brief. The existing Gemini app performs creation; no paid generation or automatic Gemini request is triggered. Blue source, numbered alpha clips and editable placements remain independent assets. In Studio, the caption round trip uses the existing Cut/Captions adapters; no parallel shell or new project is created from inside a selected Studio module.

Cloud working saves use the existing PreviewLock authentication, byte/hash verification and Dropbox project. Temporary browser staging supports retries; Drive remains pending until separately verified. No production QA upload or source deletion is authorized by this engineering change. No finished layered-video renderer is added. Rollback code baseline: dba4614ee11fd936033242b79358de41ec0aa31b; preserve projects, full-video source origins, cut drafts, media, edit history and caption passes. Evidence: tools-home/tools/cliplock/CAPTION_WORKFLOW_R14.json. Earlier release instructions below remain historical.

---

## Jokelet-first cut projects — Clipper R13 / CapLock R14, November 1, 2026

Owner direction: finish and caption individual jokelets. An episode assembly is not a prerequisite. Existing finished/mixed source cuts retain their picture, soundtrack and exact source range; no new performance or automatic transcript is invented.

In Clipper Video + sound, tap the existing CapLock link. Its saved cut list appears by name in a compact CapLock picker while the existing cutter prepares any missing video files. Prepared outputs are reused. Open project creates or resumes that cut's independent jokelet folder and video bed through the existing authenticated PreviewLock service. Browsing alone does not create cloud projects. Each jokelet owns its caption animations, numbered components and CapLock edits; switching saves the current workspace first. The source fingerprint, native IN/exclusive OUT, timestamps, original filename and saved cut ID remain recorded in cutOrigin. Renaming/reordering a cut preserves identity; a changed source or committed frame range creates a separate project without replacing prior caption work.

The same-origin IndexedDB handoff holds temporary cut bytes until the selected video's Dropbox save and hash/size receipt are verified. Opening a project uses the owner's existing PreviewLock connection. Failed/partial saves retain the staged file for retry and never claim a complete project. A verified bed releases its temporary handoff copy, while the cutter's prepared download remains available. Drive backup stays explicitly pending through the existing mirror workflow. No credentials or media bytes enter navigation URLs.

Saved project schema GS-JokeProject-1 gains optional GS-CutJokelet-1 provenance. POST /api/joke-project/from-cut creates the source-bound project without fabricated joke text, then binds the verified bed. Retries reuse a ready project and preserve its title, text, assets and caption history. Cut workspaces reject a CapLock save bound to another jokelet or bed. Existing canonical joke IDs are not guessed from short cut names. Built-in auto-captioning remains owner-locked; import the created animated caption components as before. This handoff does not add a final layered-video renderer or authorize generation/publication.

Rollback: d984d51b589468a19942a34aa4448f682b40938e. Preserve all original media, prepared downloads, cut drafts, child projects, optional cutOrigin data and edit histories. Verification: tools-home/tools/cliplock/JOKELET_PROJECTS_R13.json. Phone/private-cloud acceptance remains distinct from authenticated fixtures and code deployment.

---
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

# Clipper R8 — SxLock equipment and hidden source drawer

The player now uses the actual locked SxLock profile: compact 29px single-row controls, paired −/+ frame buttons, and monitor height determined by its right rail. Playback, explicit frame Go, IN/OUT, cut preview, Add/Update and Prepare all occupy that rail. The name row and editable cut list immediately follow the monitor.

Load the initial source from the empty picture. Afterward files, saved projects, modes, format and recovery controls stay in the shared pull-down drawer. Pull to the top then pull again on the grip, or tap it, to reveal sources. Selection is paused, source frames and saved ranges are unchanged, and picture gestures do not reveal the drawer.

R7 export, recovery and source-preservation behavior is retained. Its earlier visual matching claim was rejected by the owner; the locked component and its release evidence supersede that claim.

---

# Clipper R7 — compact, protected cuts

Verified runtime `7ea3d1b456bde159bfcf7d74871850d8012f047f`: native checks and Pages passed. [Shared-player release evidence](../../shared/COMPACT_PLAYER_R1.json).

The same cutter handles video with sound and caption animation. The clock sits above the picture, large single-frame −/+ buttons sit at the right, and the editable cut list begins directly beneath the marks/name dock. The position bar shows progress only. Find a frame uses an explicit number and Go. Frame buttons request a 12ms haptic where supported.

Marks and names are working edits until Update cut. Preview/export never commits them. Undo restores recent added, updated, removed or recovered ranges; source-hash-bound drafts retain the working list across reload after the unchanged source is reselected. Save cut list exports a portable recovery recipe; Restore cut list validates source hash and frame count before changing the list.

For the owner's six Episode 4 screenshot cuts, Find a frame → Restore six EP4 cuts requires the same 1674-frame source. Slide is F0–300. This recovery has no source hash; it must not auto-apply to unrelated footage. Previous browser cuts are archived before this recovery and Undo restores them.

Prepare beside one cut releases the previous encoded preview, then creates a deliberate Save link. The optional exported preview loads only while expanded. Prepare all clips renders sequentially and creates one ZIP download for every clip plus cut-list.json. This avoids multiple automatic-download prompts and simultaneous decoded video previews. Sources, dimensions, original primary soundtrack and exact frame validation remain in the existing engine. Downloads do not establish cloud preservation.

R6 operation/history follows. Current source and release evidence take precedence.

---

## Clipper R6 — one cutter, two modes, November 1, 2026

The existing Clipper now has **Video + sound** (`?mode=video`) and **Caption animation** modes. They share the same player, exact source-frame stepping, IN/OUT marks, independent overlapping/gapped cuts and immediate editable cut list. Mode switching pauses playback and retains each mode's source and working cuts in-session. Browser recovery drafts remain bound to mode/project/source hash; after closing the tab, reselect the unchanged source to recover its cuts. Studio's Cut phase remains the caption-specific route.

For Episode 4: Load video, mark IN, mark exclusive OUT, optionally name it, Add cut, then tap Save on that cut's row. Next IN defaults to the previous OUT and remains adjustable. Video exports use the existing local conversion engine, retain source dimensions/timing and the primary soundtrack, and refuse a missing audio track after export. MP4 is offered when the browser can encode H.264/AAC; otherwise use the explicitly labeled WebM option. No blue-key removal is applied in Video mode. General cuts are not subject to the caption renderer's 60-second-source/30-second-cut limits.

Prepare all clips creates playable downloads; it does not mean Dropbox/Drive save. Save video and Save cut recipe are local downloads. Keep the original in its existing saved location. The shared project/folder picker remains available under Saved videos, with device loading as a direct shortcut. No media is uploaded or deleted by selecting a source, switching modes or making a local cut. Gemini-created caption animation and CapLock placement remain the caption workflow; automatic subtitles are hidden/locked in CapLock R11. Final layered export remains a separate unfinished item. FrameLock is available for identifying frame ranges when needed.

---

# Caption Clipper R4 — cuts directly below the player

Open the joke project and its caption original. The first section under the player and its marking controls is the cut list. Tap a cut name to edit; use its adjacent play button to preview that range. The source details and optional background settings are below the list. R3's source-frame stepping, independent overlaps/gaps, numbering/naming and exact CapLock handoff remain.

The page distinguishes restored work from cuts you make now. It says **Restored v1 ·9 saved clips**, for example, or **Restored working draft ·v1**. The caption source dropdown and project Assets list label originals **Cut ·v1 ·9 clips**, **Uncut**, or **Draft ·v2 ·v1 cut**. Individual archived components carry their cut-pass version and original custom filename.

Choose **New pass ·v2** to start blank from the same original. It saves the empty next pass into project.json before clearing the working rows, resets marks and playhead to the source start, and disables Finish until that pass is rendered. Earlier pass media and recipes remain saved; unsaved working ranges are attached as a workingDraft in the archived pass metadata. No original or paid asset is deleted. A pass number is separate from the Gemini source filename's version.

Reload/reopening restores the current pass only. Temporary drafts are bound to project, original SHA256 and pass ID. A stale draft from another pass is archived separately in browser recovery storage and cannot repopulate the blank slate. A New pass retry reuses its request ID rather than allocating another version; stale project/pass revisions are rejected with existing rows intact. An empty new pass cannot be cleared repeatedly into empty extra versions.

**Save clips** fills that pass with silent transparent components using the established25fps renderer, then **Finish →CapLock** carries its exact project/source/batch. It keeps the reserved pass ID/version. Prior components remain visible in Assets with version labels, and earlier CapLock snapshots/media references remain preserved. New-pass actions do not render clips. The existing cloud-render limits, original hash checks, blue removal / VP9-alpha behavior and queued Drive backup continue to apply. Only a matching verified mirror receipt establishes Drive backup.

Implementation: shared cut-passes helpers, additive authenticated /api/joke-project/cut-pass endpoint with revision/pass identity/idempotency checks, source cutHistory records, and a compact list-first Caption Clipper UI. R4 client saves require the compatible server; an old or incomplete deployment fails visibly before clearing anything.

Read PASSES_R4.json for verification, release IDs and remaining physical-phone/private-cloud limits. Rollback baseline3931616d17f42902cdad8b85bd9eaf09228fa37f. Retain every source, project, pass history, clip, editor snapshot and backup receipt when rolling back; do not use the old server to render new versioned drafts.

---

# Caption Clipper R3 · existing ClipLock tool

Cut a Gemini caption animation into numbered or custom-named, independent components for CapLock. This is caption preparation; general scene animation clipping is a separate SceneLock direction (currently AspectLock).

Open the joke project. Its latest saved caption original loads automatically; Caption source lets you choose another saved caption or import the Gemini animation. The bed stays in CapLock. If no caption exists, import it inside the opened project.

**−1f and +1f always move the source picture.** They never silently edit a boundary. Rapid taps retain every requested step even while the decoder is seeking, and the displayed native frame is independent from rounded media-time reads. Mark IN/OUT copies that frame into the selection. Drag the gold/blue handles or edit the IN/OUT fields to adjust a boundary. Exclusive OUT is the first frame not included; selection playback stops on the last included frame.

Add cut queues the current range and suggests its OUT as the next IN. That IN can move backward into the previous range or forward to leave a gap; saved cuts remain independent. Tap a queued name to edit/update or use its play button. Automatic names are1,2,3… with optional custom names. Save clips preserves/reuses the original, renders silent25fps WebM components in the same caption source's cut-pass subfolder, and preserves prior cut history. Finish → CapLock restores the exact project and component batch. Caption blue removal / existing VP9 transparency behavior, immutable originals and the established Dropbox/queued Drive workflow are unchanged from R2.

General MP4/video-with-sound export controls have been removed from this caption page. The original conversion engine remains in source for reuse; no new animation clipper, SceneLock engine, AspectLock redesign, provider generation or shell is implemented here. Existing ClipLock links and stable ID remain valid. Tools, CapLock and PreviewLock all launch this same Caption Clipper.

See CAPTION_R3.json for verified release evidence and limitations. Rollback restores app/menu source from222506eb6f392e48570bc1b2ce6bb1aa51c60bfe while retaining every original, project, component batch and editor snapshot. Earlier R2 instructions below are historical.

---

# ClipLock R2 — fast caption batches

Use the existing ClipLock from Tools. Open the joke project, select its Gemini animation under Source / output (or import that animation into the open project), then work entirely in the player.

1. Seek/step to the phrase start and Mark IN.
2. Seek/step to the end and Mark OUT. OUT is exclusive.
3. Add cut. Default names are1,2,3…; replace the name for a custom component name. This only queues a range; it does not render or flatten anything.
4. Next IN defaults to the previous OUT. Drag the gold IN or blue OUT handle; the player shows the adjusted boundary. The active Mark IN/OUT button is outlined; −1f/+1f adjusts that boundary. Scrub the source or press Play to leave boundary adjustment. Overlaps, gaps, and revisiting an earlier source region are valid. A changed next IN never changes a saved previous OUT.
5. Tap a queued name to edit its range/name and Update cut. Preview any queued cut with its adjacent play button. Remove queued cut removes only that draft range. Controls stay fixed; the list scrolls below.
6. Caption background: Remove blue background for Gemini blue MP4, or turn it off for an already transparent VP9 WebM. Choose the exact blue when needed. Original source remains intact.
7. Save clips preserves/reuses the original in the project's captions folder, then uses the EXISTING authenticated project renderer to save a numbered/custom-named, silent WebM batch under that source's clips/cut-pass subfolder. It verifies raw stored bytes through the established Dropbox bridge. Prior cut files and the previous cut job metadata remain recoverable in cutHistory. Different names must be unique, ignoring case.
8. After saving completes, Finish → CapLock opens the exact project and caption source. Components retain explicit sequence numbers even with custom filenames; the first pending component is ready over the matching bed. Insert in CapLock remains editable. No phone download/reimport or manual joke ID is needed.

Native source frame timestamps are recorded in each range. The batch renderer trims at those times, normalizes output to25fps, and verifies output frame count. Rounding to25fps can repeat the final source frame by less than one output frame. The existing renderer caps picture width at1280. Current limits:40MB original,40 cuts, cuts within the first60s, each at most30s. Batch components are deliberately silent; the original audio remains in the original asset. WebM alpha input currently uses the VP9 decoder; unsupported sources fail visibly rather than silently discarding transparency.

A temporary draft is bound to project ID plus source SHA256. Reload/reselecting that source restores ranges/marks/names; it is not a cloud backup. Save clips writes the durable recipe/job and actual component media. Interrupted renders expose their saved checkpoint; reopen the caption source and Save clips reconnects to a matching running job. Server revision/capability checks reject stale or incompatible writes. Drive backup remains queued until its existing executor writes a verified receipt.

Single cut export retains R1's exact-native-frame download and save (with soundtrack and chosen MP4/WebM format), inside a collapsed section. It is separate from silent caption-batch output. Its saved artifacts do not insert automatically into any timeline.

PreviewLock's Clip captions button now opens ClipLock; its old cutter remains only for recovery. No new shell was built. SxLock, AspectLock, WavLock, provider originals, paid generation and schedules are unchanged. The separate unapproved shell prototype remains unapproved.

## Release and rollback

Baseline124eeeac3b6f5a03b23fee70f6e584664211ae92. See BATCH_R2.json for verified commit/CI/deployment evidence and remaining owner-phone/cloud limits. Restore changed source files from baseline for rollback, preserving every source, derived clip, cutHistory, saved project/editor snapshot and backup receipt. Older servers must not receive source-time R2 batches; capability gating prevents that.

---

# ClipLock · GS-TOOL-CLIPLOCK · R1

Quick video cutting with WavLock's load → IN/OUT → preview → name → save pattern. Isolated additive tool; existing editors/renderers are not modified. Reuses the studio picker, canonical cloud joke project, authenticated PreviewLock API and pinned GS1 media library.

Open a project, choose a video, mark IN and exclusive OUT using original frame timestamps, preview selection, then Save to project or Download clip. Sources and independently numbered caption components are available in Source / output. Original media is never overwritten. Save uploads/reuses original bytes first, saves the derived clip and a separate source-hash-bound cut recipe. Matching hashes/byte counts must be acknowledged by the existing server. Drive backup remains queued through the established workflow. No automatic timeline insertion or paid generation.

Offline WebCodecs conversion uses exact trim boundaries and refuses dropped audio/video tracks. Video frame count, duration, source dimensions and audio-track presence are checked after conversion. MP4 requires a native supported H.264/AAC encoder; WebM uses VP9/Opus and alpha keep. No AAC fallback timing is assumed. Unsupported encoders fail visibly. HDR requires a verified SDR source. Actual source picture/audio color/timing and alpha output need real-media/browser verification; metadata checks alone do not establish visual or auditory acceptance.

The existing 40 MB cloud per-file limit applies to originals and cuts. Local download is distinct from cloud save. Source load/project browsing never writes media. Working marks are temporary until a clip recipe saves; they do not change another module's playhead. A full studio session adapter is separate work.

Source baseline ac16a29694359ff328698a3bfca47d05b14fcb0f. New isolated feature branch; no backend, SxLock, AspectLock, CapLock or scheduling changes. Rollback removes this tool's launch entries/files, retaining all cloud originals/derived clips/recipes. Release is not production-verified until CI, browser and deployment receipts are recorded.

