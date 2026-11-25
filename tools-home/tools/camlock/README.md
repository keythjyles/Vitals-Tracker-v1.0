# CamLock · GS-TOOL-CAMLOCK · V1.0

CamLock performs a virtual camera move against an independently composed, locked source-video stage. The November 25, 2026 owner handoff is the implementation authority. It is a working camera engine and source-frame renderer.

## Operation

1. Load a source from the empty viewport or pull the dedicated top handle down. Device files stay original; HTTPS sources require a server that permits browser access.
2. Establish the opening composition. Drag the source, pinch to scale/rotate, or use Stage setup. Position, uniform scale, rotation, horizontal mirror, vertical flip, output aspect/dimensions and opening source timestamp save independently of the camera path.
3. Lock stage. Set Action duration, ending magnification, zoom duration/curve and rotation degrees/direction/duration/curve. Magnification is a multiplier of the established opening composition; 1 leaves its magnification unchanged.
4. Touch the armed viewport or press Action. The first finger moves the camera, so a downward direction moves the picture upward. A second finger adds rotation; radial separation has no effect. Removing either or both fingers does not stop Action. If the primary finger lifts, the remaining finger becomes the direction controller at its present location without a jump.
5. Lift your fingers and press Pause to navigate. Navigation preserves instructions. Starting Action at an earlier time inherits that exact camera state, retains the earlier path, and replaces its subsequent portion. Programmed motion continues from source time; it does not restart at every correction.
6. Play reviews at normal speed. REV toggles frame-by-frame reverse. Start pauses at the opening source timestamp. Frame buttons step one frame, or 25 on a double tap, with explicit 25-frame buttons and Go. Touch-to-Action can be disarmed without unlocking the stage.
7. Scribe uses the existing note editor, source/frame stamps, recoverable Clear, Copy, History, restore and existing shared-history connection. Its source data and current note are included in a project; the original shared history is retained separately.
8. Save stage, Save camera path and Save project download JSON instructions. Render applies the path to the original decoded frames. Export downloads the resulting video, and Share uses native file sharing when available. The output can be loaded by AspectLock, CapLock or SxLock through their existing file controls. Automatic direct blob handoff is not implemented by those general source-loading routes.

Pulling or tapping the handle undocks the player and reveals source controls. Pulling upward or tapping again redocks it. Only the handle owns this gesture; camera touches cannot undock the player. The page reserves scrolling room below the docked player so editing fields and saving controls remain reachable.

## Camera and timing contract

- T is absolute source seconds. X and Y use viewport width and height, centered at zero. Z is relative to the locked stage's opening magnification. R is an unwrapped clockwise camera angle; the inverse camera transform moves the visible picture. Stage rotation is separate.
- No source-edge bounds, automatic fit, recentering, compensating zoom or crop corrections are applied. Outside content is opaque black.
- Manual rotation is added to the inherited/programmed angle. The first finger retains exclusive translation authority. Primary movement rebases the rotation reference; only secondary movement changes its manual offset.
- Raw samples use the actual media currentTime, on touch events, preview frames and a 60 Hz sampling timer. The timer continues when the browser throttles preview painting. Equal-time samples retain their latest pose. No smoothing is applied; timestamp interpolation is piecewise linear with no overshoot and no angle wrapping.
- Performance rates are 1, 1/2, 1/4 and 1/8. They change operator time only. Review and rendering use 1x source time. Performance muting is separate from the saved soundtrack level/fades.
- Individual zoom and rotation durations hold their final components. Only the master Action endpoint, source EOF, explicit Pause, or leaving the active document stops Action. Leaving a hidden/background document pauses and preserves the performance for recovery.
- Rendering covers opening source time through the last recorded sample, limited by Action duration/source EOF. The exclusive output boundary rounds up to a whole output frame. Source audio is decoded with its timestamps and re-encoded at normal speed, retaining its offset, gaps and intended level; it is not a bit-for-bit audio stream copy.

## Implementation and reuse

`core.mjs` owns camera math, touch roles, trajectory branching, normalized JSON contracts and the shared scene painter. `app.mjs` owns media playback, Action lifecycle, stage setup, docking, file saving and integration. `render.mjs` reads original frames through the existing patched Mediabunny decoder, paints the saved transform and calls SxLock's independent visual-composition export hook. No screen capture or re-performance is used.

Existing Scribe/history, frame-stamp, clip-audio, player-profile and export modules are consumed without modification. The normal paths and saved projects of the existing tools are unchanged. The new app has its own draft namespace, with a separate namespace for the browser acceptance fixture. JSON saves contain source references and SHA-256, not original media bytes. Reconnecting the identical original retains the edit. Loading a different source starts a new project and retains the immediately preceding browser draft separately.

## Verification

Base/rollback commit: `7b4d955e739f08a7169bf5ec3679df9f8ba9507c`; implementation branch: `camlock-v1`.

Run core checks with `node --test tools-home/tools/camlock/tests/core.test.mjs`. The 16 checks cover independent endpoints/curves, all four performance-speed source clocks, raw interpolation, partial replacement and resumed programs, both finger roles, release/reacquisition/promotion, angle wrap, EOF, JSON preservation/validation, black space and inverse camera translation.

[Browser receipt](tests/BROWSER_ACCEPTANCE_V1.json) records a passing run against a real four-second 180×320 / 25 fps H.264/AAC fixture with gated tones. The harness is [tests/browser.html](tests/browser.html); supply `?source=/your-fixture.mp4`. It uses the production app and renderer with simulated touch PointerEvents in 320/390/430px frames. The receipt verifies:

- Stage manipulation/lock, touch/button Action, disabled navigation, both finger roles, separation isolation, primary promotion and reacquisition.
- Independent movement holds, explicit Pause, preserved navigation, continuous partial replacement and exact master endpoint.
- Original Scribe Mark frame, recoverable Clear and History, normal-speed review and reverse navigation.
- MP4 encoding of 30 frames / 1.2 seconds from source 0.4–1.6 seconds, source audio alignment and unchanged camera instructions after rendering.
- Decoded rendered-frame comparisons at three times, with mean channel error below 3/255 against the saved composition, and no recording UI in the image.
- WebM rendering with the camera completely outside the source, producing intentional black without edge correction.

A separate standalone check used the actual device file picker and native viewport drag at 1/8 performance speed. Its exported MP4 downloaded successfully. Independent FFprobe reported H.264, AAC, 180×320, 25 fps and 8 frames / 0.320 seconds for a requested 0.3-source-second Action. This is a desktop pointer check, not physical phone acceptance.

## Known limits and explicit differences

- Physical Android/iOS multitouch, long high-resolution device rendering and authenticated Scribe cloud sync are not certified by these checks. Browser WebCodecs support controls available input/output codecs. The existing audio mixer retains its 96 MiB decoded-audio limit; export uses an in-memory target. HDR input is rejected instead of silently changing its color.
- The inspected current tools do not implement the handoff's stated Play/REV double-/triple-tap conventions. SxLock has 1/10-frame taps, AspectLock and CapLock use 1/25-frame taps, and FrameLock REV is a simple reverse toggle. CamLock adopts the visual editors' 1/25-frame navigation, normal Play toggle and existing frame-reverse behavior. No triple-tap action is claimed.
- Optional smoothing is not supplied. The raw path remains the authoritative instructions. There is no screen-recording fallback.
- Save downloads instructions and Export downloads video; neither claims cloud backup. An existing original source location/reference should be retained independently. No production-media upload, source deletion or paid generation is performed by this change.

Keep previously saved JSON and all source/render files when rolling back. Remove the new entry/app or revert its commit; do not delete existing editors or clear Scribe history.
