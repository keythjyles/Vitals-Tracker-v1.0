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
