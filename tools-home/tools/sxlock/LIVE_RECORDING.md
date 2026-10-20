# Live voice recording — SxLock 1.5

Load your video, seek to the desired starting frame, then tap **Rec** at the left of the viewer. Microphone permission is requested on that tap only. Recording starts video playback at normal speed from the current position. The red Rec control and RECORDING banner flash while microphone capture is active; reduced-motion users see a steady indicator. Elapsed recording time remains visible.

Tap **Stop** beside the viewer to finish. Pausing, reaching the video end, or hiding the page also stops the take. The microphone is released after stopping. Headphones prevent speaker playback from entering the microphone; the application itself records only the microphone stream, with no mix routed into it.

Each take is inserted at its captured source-video time with 100% initial gain. Use the existing insertion menu to change start time, volume, Source IN, duration, loop or enabled state. Duplicate/remove behave as for imported sounds. The original video is unchanged.

Audio is stored in IndexedDB and included in portable project JSON with microphone provenance, original MIME type, capture timestamp, video name, source time and frame-rate-based start-frame reference. **Take** downloads the latest captured audio separately, including when decoding it for insertion fails. A project JSON still requires reselecting the original video. Neither recording nor project save uploads to Drive automatically; use Android Save/Share to place backups there.

One take is capped at ten minutes or approximately 32 MiB compressed audio. Exports and other edits are locked during microphone capture. Permission denial restores usable controls without creating a sound. Page-close protection warns while a take is active; a fully closed/killed page cannot guarantee recovery of an unfinished take.

Validation: mocked microphone lifecycle covers start/stop, exact insertion source time and frame reference, project-embedded audio/capture metadata, track release, permission denial and stopping at the video end. JavaScript syntax verified. Physical Samsung microphone/codec behavior requires the user's device check. Existing video/WAV export encoding is unchanged in this update, including the previously observed browser MP4 duration-header limitation.

## Layout and post-record mixer (1.4)

Video, Mixer, Scribe, Sound library, Insertions and Save/export are independently collapsible. Their open state is saved with the project. Seek is directly below the viewer. The information icon holds operating instructions. Sound categories and their contents are alphabetized; category lists collapse individually. The Thicket Tools home list is also alphabetized and collapsible, with SxLock, WavLock and Music Bench in the shared list.

Mixer faders independently scale video soundtrack, effects/imports, and microphone takes. They default to 100% for old projects and multiply individual insertion volume, without rewriting the audio. These levels apply to live playback, finished video, mixed WAV and effects-only WAV (which includes inserted microphone takes). Raw Take downloads remain unchanged. Music/ambience baked into a source remain one video-audio layer.

Manage my recordings offers permanent deletion of imported and microphone audio after a named warning that states the number of affected insertions. It removes the IndexedDB copy, current-project placements, and current local recovery snapshot metadata, and clears the latest raw take if matching. Built-in sounds cannot be deleted. Original source files and previously downloaded or Drive backups are unaffected; deliberately loading an older portable backup may restore its embedded recording.

Validation: syntax/HTML nesting, mixer gain for effects and voice, portable round-trip, legacy defaults, deletion cancellation, confirmed database removal and built-in protection; original mocked microphone lifecycle rechecked. Physical phone layout/microphone behavior still requires the device check.

## Sticky viewer and standalone audio (1.5)

The viewer, Rec/Stop/Take controls, seek and frame buttons share a sticky dock immediately beneath the transport bar. Its top offset tracks the transport height through ResizeObserver and resize events, including wrapped text. The dock is a direct main child so the upload section does not constrain it. The Video section still collapses the viewer dock.

Rec works with no video, a video still loading, or at video EOF. These standalone takes save to My sounds and portable project JSON, without inserting into or changing an existing timeline. Raw Take download remains available. Capture provenance marks standalone mode, duration and null video/frame references. A ready video before EOF retains synchronized playback/insertion behavior. Video pause/end affects only synchronized capture. All modes stop on explicit Stop, hidden page, size/time limits or microphone disconnection.
