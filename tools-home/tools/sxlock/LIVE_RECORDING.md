# Live voice recording — SxLock 1.3

Load your video, seek to the desired starting frame, then tap **Rec** at the left of the viewer. Microphone permission is requested on that tap only. Recording starts video playback at normal speed from the current position. The red Rec control and RECORDING banner flash while microphone capture is active; reduced-motion users see a steady indicator. Elapsed recording time remains visible.

Tap **Stop** beside the viewer to finish. Pausing, reaching the video end, or hiding the page also stops the take. The microphone is released after stopping. Headphones prevent speaker playback from entering the microphone; the application itself records only the microphone stream, with no mix routed into it.

Each take is inserted at its captured source-video time with 100% initial gain. Use the existing insertion menu to change start time, volume, Source IN, duration, loop or enabled state. Duplicate/remove behave as for imported sounds. The original video is unchanged.

Audio is stored in IndexedDB and included in portable project JSON with microphone provenance, original MIME type, capture timestamp, video name, source time and frame-rate-based start-frame reference. **Take** downloads the latest captured audio separately, including when decoding it for insertion fails. A project JSON still requires reselecting the original video. Neither recording nor project save uploads to Drive automatically; use Android Save/Share to place backups there.

One take is capped at ten minutes or approximately 32 MiB compressed audio. Exports and other edits are locked during microphone capture. Permission denial restores usable controls without creating a sound. Page-close protection warns while a take is active; a fully closed/killed page cannot guarantee recovery of an unfinished take.

Validation: mocked microphone lifecycle covers start/stop, exact insertion source time and frame reference, project-embedded audio/capture metadata, track release, permission denial and stopping at the video end. JavaScript syntax verified. Physical Samsung microphone/codec behavior requires the user's device check. Existing video/WAV export encoding is unchanged in this update, including the previously observed browser MP4 duration-header limitation.
