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
