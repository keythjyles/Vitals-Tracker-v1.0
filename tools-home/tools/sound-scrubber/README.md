# Sound Scrubber · GS-TOOL-SOUND-SCRUBBER · R13

Canonical path: `tools-home/tools/sound-scrubber/`. This is the sound discovery and owner review tool. SxLock places approved sounds; WavLock cuts reusable audio components.

Search a sound or use a preset, then Scrub. Each compact row has inline Play, Approve and Reject/Delete at the far right; tap its filename to rename. Preserve owner decisions and stable rejection IDs. Pending candidates are not approved library sounds. Do not auto-approve or auto-import.

Approve saves the actual original through the existing authenticated PreviewLock bridge to Dropbox. Google Drive is mirrored by the existing daily calendar executor. A queued/partial save is not a completed dual-cloud save. See [AUDIO_SAVE.md](AUDIO_SAVE.md) for exact receipts, paths, verification and retry rules. Keep original audio and trimmed derivatives separately.

The right-aligned navigation strip connects Sound Scrubber, SxLock, WavLock and Tools. Each tool has a stable same-origin tab name. A normal tap focuses the already-open tool without reloading its editor; otherwise it opens that tool. The originating tab stays open, preserving its loaded media and unsaved editor state while switching. This is navigation, not automatic audio transfer, cross-device recovery or permanent project storage. Save projects normally before closing tabs. WavLock currently uses file import and local WAV export.

SxLock R1.10 changes navigation and visible identity only. Its recording, mixing, timing, sound IDs and export engine remain unchanged. WavLock R1.2 likewise adds navigation/identity only. Manifests: `tools-home/tools-manifest.json` and `tools-home/source/tools-manifest.json`; editable hub source and deployed hub both expose Sound Scrubber.
