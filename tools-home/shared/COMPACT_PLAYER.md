# Shared compact editing player · v1

Owner direction, November 1, 2026: retain the existing tools and editing engines; make their picture, frame clock and right-hand transport consistent. One ClipLock cutter offers video-with-sound and caption-animation modes. Do not create another cutter to fix a layout defect.

The shared adapter lives in `compact-player.mjs` and `compact-player.css`. Each tool declares its existing workspace, picture, transport, native media element and frame-button IDs. The adapter retains those nodes, listeners, native rendering, projects, media, sound, approval records and storage. FrameLock includes AnchorLock. WavLock retains its waveform equipment.

| Interface | Behavior |
| --- | --- |
| Player | Compact picture at left; transport immediately at right; small frame/time clock; progress immediately below |
| Single-frame buttons | Large −/+ glyphs; native source stepping; one short vibration request per physical click where supported |
| Position bars | Read-only progress; typing alone does nothing; explicit Go commits a deliberate frame/time jump and pauses |
| Other former sliders | Numeric entry plus Set; no draggable control |
| Painted timeline maps | Read-only; edit/select via named item rows; use the explicit Go field for seeking |
| Native video controls | Replaced by play/pause and read-only progress, including optional exported previews |
| Play | Pause/resume at the current position; reaching the source end does not silently seek to zero |
| AspectLock | Bed and Animation each use one play/pause toggle; the existing pause operations remain the engine |

Precision bars retain their native hidden input IDs so renderer/session adapters remain compatible. Replacing a control must not mutate its value during initialization. Draft numeric input does not dispatch native change events. Go/Set validates finite bounds before dispatching the existing native input/change handlers. Canvas painting continues; touch cannot seek through the painted map. Editing geometry remains in its existing explicit modes.

Clipper R7 additionally preserves six screenshot ranges in `EP4_RECOVERED_CUTS_20261101.json`. Slide is F0–300, not the erroneous whole-source range. The screenshot recipe has no source hash: matching 1674 frames only enables an explicit recovery action, and the user must review it against the original. Imported source-bound recipes reject mismatched hashes/frame counts before changing the active cut list. Earlier drafts are archived, and Undo retains recent cut-list states. Exports do not silently commit unfinished marks/name edits.

Individual exports keep one prepared preview at a time and release old URLs/media elements. Optional preview elements exist only while expanded. All-clips preparation runs encoders sequentially and offers one ZIP with every clip plus the source-bound recipe. Local downloads and browser recovery are distinct from cloud-save receipts. Do not claim physical Android vibration, downloaded files on the owner's phone, final picture/sound approval or cloud backup from automated tests.

Native release identities remain independent: ClipLock R7; CapLock R12; SxLock R29; AspectLock R29; PreviewLock R31; FrameLock 1.3.16; MotionLock 0.1.6; WavLock R1.4. Baseline main: `1f084ac8f3c075bd3962841d9e8c6a99bc446e46`. Revert changed code only for rollback, retaining original media, projects, imported sounds, browser drafts, historical recipes and cloud assets. Existing scheduled publishing is outside this interface change.

Verification: native unit checks, existing Clipper/CapLock/Studio browser regressions, six-cut decode/audio/ZIP/reload checks and shared-player phone-width entry checks. A local preview on a nonsecure HTTP hostname cannot exercise WebCrypto/WebCodecs; secure-origin CI and the live HTTPS tool are required for media acceptance. Read the release receipt for the actual test/deployment results.
