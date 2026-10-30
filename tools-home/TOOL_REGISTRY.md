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
