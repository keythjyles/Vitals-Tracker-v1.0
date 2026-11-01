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

