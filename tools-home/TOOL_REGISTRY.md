# Tools and media export audit

November 14, 2026. The inventory covers the [Tools directory](https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/) and the editor paths it opens. Source comparison is based on `0f0e4a11cc44b754160a8309cf52f08d34c6f816`. The audit uses SxLock R40 as the reference. The CapLock R31 and Tools R2 changes are included in this review.

## Editing and production

| Tool | Purpose and capabilities | How it works | What to carry forward |
| --- | --- | --- | --- |
| [SxLock R41](tools/sxlock/) | Place and mix effects, record voice, and add visual or camera layers while reviewing frames and using Scribe | HTML video, Web Audio preview, IndexedDB media and project recovery. Its timestamped [export engine](tools/sxlock/export-engine.mjs) packet-copies eligible H.264 picture and mixes audio offline. Required picture changes and Toolbox visual layers use offline encode. | Interaction reference for docking, preview-only zoom and pan, right-hand transport, deliberate frame controls and file drawer. Export reference for packet copy, color and audio sync. |
| [CapLock R31](tools/caplock/) | Compose a portrait timeline with captions, animation, sound and editable video layers | Local Layer 0 and toolbox with separate media copies and project recipe. Legacy bed projects and Studio use their existing project handoff. [CapLock compositor](tools/caplock/composite.mjs) uses the patched decoder, a portrait canvas and the SxLock export engine’s composition hook. | Keep trim, layer focus, preview crop, opacity, source audio and timeline extent in CapLock. Preview resize and source transforms represent different actions. Run the actual composite and repeat-pass color check before changes to its export path. |
| [Clipper R16](tools/cliplock/) | Cut video and sound at source frames. Save numbered keyed animations for CapLock. | [Browser engine](tools/cliplock/engine.mjs) uses patched Mediabunny Conversion for native-frame MP4/WebM cuts. [Saved caption renderer](services/previewlock-api/joke-project.mjs) keys and encodes lossless alpha VP9 with FFmpeg, verifies frame count and saves per-cut receipts. | Keep visible IN and exclusive OUT with native source timing. Browser cuts and server caption cuts require separate color and alpha checks. |
| [FrameLock 1.4.8](tools/framelock/) | Frame review, precise trim, stamped notes and frame correction plans | [Frame controller](tools/framelock/framelock.mjs) inspects source timing and uses Clipper for Trim/Save As. The separate Render path captures a canvas and audio with MediaRecorder. AnchorLock is the established fixed-anchor correction method within the FrameLock workflow. | Keep source-frame notes, source-timed trim and anchor adjustments. Test the corrected-render path independently. Keep existing Trim verification through Clipper. |
| [AspectLock R30](tools/aspectlock/) | Frame a 9:16 scene, align a visual overlay, and manage its start, background and audio | Independent bed and layer video clocks, in-browser canvas preview and real-time MediaRecorder export. | Keep source and composition controls. Add timestamped output and color tests before any exporter change. Its alpha WebM output is a known handoff fixture. |
| [MotionLock 0.1.7](tools/motionlock/) | Mark hard cuts, Z levels, pans and B-roll events | Local video and canvas preview with a timed event plan and handoff. The tool records the motion recipe. | Reuse transport and time readout. Keep the motion timeline and Z/B-roll controls. Validate downstream application of the plan. |
| [WavLock R1.5](tools/wavlock/) | Trim and preview audio and approved effects | Web Audio decode, waveform selection and PCM WAV encoding. The approved-effects bridge can supply cached sound bytes. | Keep audio time, selection, gain and waveform controls. Check sample boundaries and format independently of video. |
| [Sound Scrubber R14.12](tools/sound-scrubber/) | Find, audition, rename, approve and reject candidate sounds | Audio list and same-browser approval ledger. New approvals save to the existing Google Drive Sound Effects folder. WavLock and SxLock use the shared effects bridge. | Share file and status treatment where useful. Keep discovery and audition controls on the list. |
| [Audio Cue Mixer 2.5](tools/mixer/) | Audition multiple timed audio tracks against a video and save cue settings | Native media tracks synchronized to the video during preview. Exports a JSON cue plan. | Keep accessible as a shortcut. Its HTML media synchronization is a preview method. |
| [PreviewLock R32 cloud](tools/previewlock/cloud-test.html) | Review saved media, inspect frame/time and open editor handoffs | Authenticated PreviewLock backend indexes Dropbox and supplies playback URLs. The player displays the stored source or review copy. | Keep explicit source identity and existing direct-open URLs. Check decoded playback against source before attributing an export defect to the viewer. |
| [GS Studio R2](tools/studio/) | Select a joke, manage project assets and move between native phases | Same-origin iframe adapters and revisioned checkpoints on the project manifest. Media rendering is delegated to the active editor. | Keep project binding, save acknowledgement and native per-tool controls. |
| [JokeLab R5](tools/jokelab/) and Joke Reports | Develop exact wording and variants, view reports and open production projects | Joke catalogs, saved text and hash handoffs. The workbench passes the selected joke identity to Studio. | Keep report and seed links, joke identity and exact text. |
| [Jokelet Wizard](tools/jokelets/factory.html?view=wizard) | Combine voice, performance and reaction into a jokelet | [Browser renderer](tools/jokelets/factory-render.js) uses real-time canvas capture and Web Audio into MediaRecorder. | Check frame and sample timing, and color, before changing this renderer. |
| [Jokelet Assembly](tools/jokelets/) | Order jokelets, B-roll and outro and render an episode | [Assembly renderer](tools/jokelets/library.js) uses real-time portrait canvas, Web Audio and MediaRecorder. JSON retains the sequence. | Check the complete multi-clip path and each transition independently of the Wizard. |
| [Media Library](tools/jokelets/factory.html?view=all) | Browse, preview and organize reusable assets, including reactions | Catalog and browser media storage with the Factory’s provider/hosted asset paths. The reaction route opens a view of this library. | Keep library filter links and original asset download routes. |
| [Finished video review](https://gs-release-review.briskpear.chatgpt.site/) | Review and approve finished releases | Separate private review page. The Tools directory points to its established address. | Keep release decisions and review links with the finished asset. |
| [GS Field Guide FG-01](tools/fieldguide-gemini/) | Check the fixed caption timing and Gemini test status | Displays specified words/frames and reads status from the established service. | Keep source access and test status distinct from a media editor. |

## Utilities

| Tool | Purpose and method |
| --- | --- |
| [Fax Desk](tools/fax/) | Prepares and tracks fax submissions through its dedicated packet and receipt workflow. |
| [Jet Standby](tools/jet-standby/) | Keeps the device ready for aircraft recording with screen wake-lock controls. |
| [Vitals Tracker](../index.html) | Main health-record workspace at its existing route. |
| [Angel Code](../AN/index.html) and [Birthday Code](../BC/index.html) | Standalone calculators at their existing routes. |

## Player standard

Use the SxLock reference for predictable placement of the primary picture, frame/time readout, right-hand transport, accessible source drawer, and focus treatment. Share player controls through [player-shell.mjs](shared/player-shell.mjs), [player-shell.css](shared/player-shell.css) and [compact-player.mjs](shared/compact-player.mjs) where the native editor fits that contract. Define input and output timing units in each adapter. Clipper and FrameLock use source frames. CapLock uses composition frames at 25 fps and explicitly maps them to each source. SxLock and PreviewLock retain seconds and display a frame readout.

Keep docking, display zoom/pan and preview resize as view state. Keep crop, layer geometry, trim and media changes in the native editor. Preserve deliberate frame steps and explicit Go actions. Confirm device import, paused seek, editing, recovery, and layout at phone and desktop widths. Test that pulling the source drawer leaves the active edit in place. Audio-only editors keep an audio surface. The directory groups routes by the work they do.

## Color and export regressions

The confirmed alpha WebM red shift came from Mediabunny rebuilding planar and NV12 alpha frames without the decoded frame’s `colorSpace`. Full-range pixels were interpreted as limited range. The [pinned GS1 decoder and patch notes](tools/sxlock/vendor/README.md) preserve the source color space before compositing. The [SxLock browser regression](tools/sxlock/tests/README.md) already compares decoded pixels and FFprobe color metadata. Its sound-only packet-copy cases also check repeat exports, video frame timestamps and audio sync. The browser suites share the [full-range alpha fixture](shared/tests/make-alpha-color-fixture.py). The [CapLock regression](tools/caplock/tests/color-pass-browser.cjs) samples eight color patches after each of two passes. The [release evidence](tools/GS_TOOL_REFINEMENT_INDEX.md#r26-decisive-webm-colour-finding-and-correction) records the demonstrated defect and correction.

CapLock, browser Clipper, and the Clipper Trim path in FrameLock already load the patched library. CapLock shares the SxLock exporter, including the fallback AAC priming correction. AspectLock, FrameLock Render, the server caption cutter, Jokelet Wizard, and Jokelet Assembly have separate encode paths. Their use of the same color fix requires verification at the relevant decode, canvas or encoder boundary.

For future changes to media output, use a full-range BT.709 sample with large neutral and saturated patches, a transparent WebM sample, and a source with sound ending before the picture. Check the following where each capability applies.

- **Copy.** Compare original and output encoded video packets and color tags. Compare the whole file when the operation is a true no-op.
- **Decode and composite.** Check alpha corners and matched reference pixels. Confirm matrix, primaries, transfer and range through the path. Test one tool’s output as the next tool’s input, including a second pass. Record channel bias and frame difference alongside the visual result.
- **Timing and sound.** Check every frame timestamp, final frame and dimensions. Use an audible fixture with known timing, check the start, cut or layer boundary and end, and verify that any original shorter audio tail retains its end. Check fallback AAC timing where that encoder is used.
- **Evidence.** Record source filename, fixture/commit, route, compiler or browser, test result and output format. Desktop Chromium checks and physical Android codec checks are separate. Reuse the pinned implementation and existing regressions when applicable, then add a focused check at each separate renderer boundary.

The current change is in CapLock’s file entry and recovery, the cloud picker, the player’s source readout and the Tools directory. Each other player’s next change should be scoped from its row in this audit. The historical notes below retain earlier findings.

Current locked equipment (owner correction, November 1): Clipper R14, CapLock R15, SxLock R30, AspectLock R30, PreviewLock R32, FrameLock 1.3.17, MotionLock 0.1.7, WavLock R1.5. Shared component: `shared/player-shell.mjs` and `shared/player-shell.css`; profile SxLock-R24. R7 matching claims below were rejected.

Superseded R7 releases (historical, November 1, 2026): ClipLock R7, CapLock R12, SxLock R29, AspectLock R29, PreviewLock R31, FrameLock 1.3.16, MotionLock 0.1.6, WavLock R1.4. See [the shared compact-player contract](shared/COMPACT_PLAYER.md). Historical entries below retain their provenance.

# GS / Thicket Tools — Canonical Registry
Updated: 2026-10-24
Repository: https://github.com/keythjyles/Vitals-Tracker-v1.0
Tools home: https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/

## WavLock — verified in repository
- Live: https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/tools/wavlock/
- Source: tools-home/tools/wavlock/index.html
- Version shown in source: v1.0
- Function: phone-friendly WAV/audio editor. Touch waveform to seek; IN/OUT marks; +/- 0.1s; preview selection; export 16-bit PCM WAV. Source unchanged.
- Tested in 2026-10-20 production history: 55.719-second source; exported Leftovers.wav, 4.851 seconds at 48 kHz mono.
- Bee source for current work: 134813__zedkah__bee-beat.wav (2.437s), provided in ChatGPT conversation 2026-10-24. Do not assume it is uploaded to GitHub/Drive.
- Opening a source: visit WavLock and select the original file in the device file picker. Existing WavLock has no verified remote preload interface.

## SxLock — verified in repository
- Live: https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/tools/sxlock/
- Source: tools-home/tools/sxlock/index.html and sxlock.js
- Version: v1.6 at registry update
- Function: place and mix sound effects with video; import audio; adjust insertion timing, volume and trim. Not a substitute for WavLock's source-cut workflow.

## AnchorLock — established stabilization method
- AnchorLock is the fixed-anchor stabilization component/method within FrameLock, not an unrelated replacement tool.
- Purpose: remove frame-to-frame positional shimmy using a stable visual anchor, preserving original framing and audio; apply stabilization **before** MotionLock camera movement.
- Production doctrine: FrameLock includes AnchorLock (\"naming one names them all\"). Maintain distinct module/method documentation while keeping their relationship explicit.
- Source/deployment of any standalone AnchorLock interface: not independently verified in this registry update.

## FrameLock — established production tool
- Live: https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/tools/framelock/
- Function: stabilization / AnchorLock in video production. Verify source version before edits.

## Documentation policy (mandatory for future changes)
1. Search this registry and repository paths before asserting a tool does not exist. GitHub code search alone is not sufficient; directory listing and prior production history matter.
2. On every tool creation, rename, relocation, major change or retirement, update this registry **in the same commit or work session** with exact source path, live URL, version, function, dependencies, test status, and recovery instructions.
3. Update the Tools Home navigation/index where applicable and verify the deployed link. Never claim a deployment is live merely because a commit succeeded.
4. Preserve previous versions, source files, and original media. Distinguish verified GitHub/Drive assets from browser-local or conversation-only files.
5. For each production handoff record source asset name, processing tool, exported artifact, approval state and next step.
6. If an asset is not yet in the shared library, explicitly mark it NOT UPLOADED rather than implying it is saved.

## CapLock · GS-TOOL-CAPLOCK · R1

Direct path: `tools/caplock/`. Independent phone-first caption prototype; global design, local refinement,25fps integer timing, project JSON, SRT/VTT and browser draft recovery. Load completed AspectLock/SxLock picture/audio. No ZLock integration; no video renderer/cloud project save in R1. See `tools/caplock/README.md` for actual validation and open gates. Launch entries in Tools, AspectLock, SxLock and PreviewLock; navigation changes preserve existing engines.


### CapLock R2 revision

CapLock is now transcript-first: selectable/movable words with Gemini directions, approved visual-protocol inheritance or independent segment prompts, then transparent animation/graphic/audio layers in the viewer. Native caption tools are collapsed. Rotate is explicitly enabled and Square resets exactly0°. Project version2 preserves layers/word metadata and imports R1. Finished-video export/cloud project saves remain pending. Existing production engines are unchanged.

## ClipLock · GS-TOOL-CLIPLOCK · R1

Source: `tools-home/tools/cliplock/`. Intended live path: https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/tools/cliplock/?v=R1 . Quick WavLock-style video cutter using the existing studio picker, project API and pinned GS1 media library. Source frame IN/exclusive OUT, selection preview, independent MP4/WebM download, original-preserving project save plus cut recipe. Source baseline ac16a29694359ff328698a3bfca47d05b14fcb0f. Local core checks passed; browser/deployment/phone and authenticated cloud acceptance remain separate. No existing editor or backend changed. Rollback removes launch entries/files but retains saved original/derived media and lineage. See the tool README and cliplock-checks workflow for verification.

