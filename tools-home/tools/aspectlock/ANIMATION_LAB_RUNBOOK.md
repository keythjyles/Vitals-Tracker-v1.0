# ANIMATION LAB — Operating Runbook
**Established:** 2026-10-25, America/Chicago (CDT). **Revision:** 1.0. **Owner:** Grill Sergeant production. **Search terms:** Animation Lab, AspectLock, PreviewLock, Gemini, overlay, green screen, blue screen, checkerboard, chroma key, flatten, stage, Dad Joke Duty, EP4, Timmy, scissors.

> **Production rule:** The tools and approved procedure are the production path. Do not improvise a new compositing pipeline, rescale an asset, switch its background, flatten early, or substitute a download unless the operator requests it. Ask for approval when framing or creative timing is unsettled.

## 1. Purpose and scope
Animation Lab is the repeatable **animation-overlay compositing stage**, not a generator tied to Gemini. Animation can originate in Gemini, HeyGen, a video editor, or another provider. An animation source is placed over a **current approved bed** in AspectLock, timed, keyed if necessary, aligned in the full virtual stage, reviewed, then flattened into a **new versioned intermediate master**. That master is the bed for the next pass. Repeat until animation passes are complete; subsequent production phases (captions, SFX, ambience, music, publishing) remain separate and governed by their own approval gates.

## 2. Where everything lives
- **AspectLock editor:** https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/tools/aspectlock/
- **Editor code:** `tools-home/tools/aspectlock/index.html` in `keythjyles/Vitals-Tracker-v1.0`.
- **PreviewLock:** authenticated media inventory and playback API, used by AspectLock to discover and load videos. A Dropbox file does **not** automatically appear in PreviewLock. Verify both the original bed and overlay appear in its inventory before issuing a preloaded editor link.
- **Dropbox source motion library:** `/Grill Sergeant/Timmy Motion Library/` (originals and source/reference animations).
- **Dropbox flattened production archive:** `/Grill Sergeant/Animation Lab/<PROJECT_ID>/`; EP4 folder `/Grill Sergeant/Animation Lab/GS_EP4/`.
- **Project-specific history:** `PRODUCTION_NOTES_2026-10-25_SC02_CHROMA.md` in this directory.
- **EP4 layer-02 saved file:** `GS_EP4_ANIM_LAYER02_TIMMY_SCISSORS_FLATTENED_v01.mp4` in the EP4 Animation Lab folder. It is a 66.56s, 540×960 MP4 with audio, archived from the operator-supplied `GS_EP4_AS_timmy2 finished.mp4`. The archived layer is a production intermediate, not automatic publication approval.

## 3. Before starting any animation pass
1. Identify **project ID**, current approved **bed master**, source animation filename, source provider, animation duration, source frame rate, and desired insertion time.
2. Locate each file in **PreviewLock**. Search the connected Dropbox project directory and existing GitHub notes if an asset seems missing; do not ask for a reupload until the available stores have been checked. PreviewLock selection is authoritative for loading into AspectLock.
3. Verify the bed is the **entire previous master**, not a 4-second overlay or thumbnail. Check metadata duration and portrait dimensions. The export must run the **full bed duration**.
4. Preserve the original source unchanged. Do not trim, retime, recolor, resize, or re-encode it without explicit instruction.
5. Identify background mode from the **actual pixels** of the animation, not just its filename or extension: green, blue, genuine alpha transparency, checkerboard pixels, or other.
6. Document the desired entry time, source start frame, intended motion/exit, scene geometry and audio. If already approved, reuse those values; do not reset them.

## 4. Prepare animation from ANY provider
- Prompt for a **single solid, consistent chroma background** (green or blue) when true alpha is not available. Ensure clothing/character colors do not match that key color. Minimize background shadows, gradients, compression, and motion blur at boundaries. For silent character actions, start the generation prompt with **NO TALKING!** and explicitly request no speech/no sound when applicable.
- **Green background MP4:** load the original MP4 and select **Green screen** in AspectLock. This is the preferred EP4 SC02 route.
- **Blue background MP4:** load original MP4 and select **Blue screen (R9 legacy)**. R9 successfully keyed the first Timmy scene with its offscreen-canvas blue pixel-removal algorithm.
- **True alpha PNG/WebM/MOV:** choose **Existing transparency** only after validating alpha in the target browser and ensuring that the animation is genuinely transparent. A codec/metadata flag alone is not proof; check against dark and light beds and across frames.
- **Checkerboard:** distinguish *a transparency-grid shown by the editor* (which may indicate genuine alpha) from *a checkerboard baked into the video pixels* (which is **not** transparent). If baked in, do not use alpha mode; obtain the true alpha source or a clean solid-color background. Two-color checkerboard cannot be cleanly keyed by a single green/blue chroma key. Do not promise it can.
- **Unknown/complex background:** stop and identify an appropriate isolation method rather than silently accepting artifacts or swapping pipelines.

## 5. AspectLock — exact operating sequence
1. Open the current deployed AspectLock URL, confirm the revision on-screen. Use PreviewLock on the same authenticated browser/device.
2. Select the **current bed master** under Base video and the **original animation** under Overlay video. The library should allow searching, sorting, previewing, and selecting; do not rely on a guessed filename alone.
3. Confirm the base and overlay load and display their correct durations.
4. Set background removal to **Green**, **Blue**, **Existing transparency**, or **Off** based on the original animation. With green/blue, adjust key tolerance while watching opaque character bodies, outlines and edge spill. Do not accept semi-transparent characters or ghost silhouettes.
5. Set overlay insertion time on the bed timeline using frame stepping. The current editor uses a **25 fps** bed timeline: `frame = round(seconds × 25)`. For EP4 SC02, 12.5s maps to **frame 313**.
6. Position and scale on the **540×960 portrait output canvas**, remembering the animation is a larger **landscape stage** behind the portrait viewport. Do not shrink the entire animation to fit 540px width merely to show its edges. Preserve intended on/off-screen travel, and do not make characters vanish at a shrunken source rectangle boundary.
7. Set audio routing: preserve the base soundtrack; mute the animation audio unless specifically approved. SFX and ambience can be added in their own later stages.
8. Preview and frame-step before, during, and after the overlay. Inspect first entrance, mid-motion, overlap, last visible frame, exit, and bed after the overlay. Check that there are **no accumulated frame trails** and that the base remains undisturbed.
9. **Save alignment/specification** (including filenames, start frame, position, width, key mode/tolerance, audio state). The saved state must be recoverable, not dependent on an undocumented screenshot.
10. **Render video** only after the operator accepts the preview. Rendering is a full-bed pass; keep the tab open until completed. The app's browser render uses MediaRecorder and may need device-specific QA. Do not report success until the file exists and is playable.
11. Inspect the rendered file, including duration, dimensions, audio, several frames of keyed motion, exit and post-animation frames. If defective, return to the saved alignment and correct **only the defect**.
12. Save the approved flattened pass as the **next numbered intermediate master** in Dropbox Animation Lab project folder. Verify upload completion and retrieve its Dropbox preview link. Ensure it is also available in PreviewLock before making it the next bed.
13. Advance to the next overlay by selecting this new master as Base video; preserve all prior layers.

## 6. Reusable preloaded links
AspectLock supports URL parameters `base`, `overlay`, `start` (seconds), and `key` (`green`, `blue`, `alpha`, `off`), plus cache-busting `v`. Parameters **select**, but cannot guarantee assets exist in PreviewLock. A preloaded link is valid only if the inventory contains the named files and the browser is authenticated.

**EP4 scene 02 example (R16):**
https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/tools/aspectlock/?v=R16&base=GS_EP4_ASPECTLOCK_PHASE01_AUDIO_RECOVERY_REVIEW_v01.mp4&overlay=GS_TIMMY_SCISSORS_CHASE_GEMINI_SOURCE_v01.mp4&start=12.5&key=green

The `start` parameter does not itself validate key quality or complete a render.

## 7. Flattened-master naming, manifest and retention
Naming: `GS_<PROJECT>_ANIM_LAYER<NN>_<SCENE_OR_ACTION>_FLATTENED_v<NN>.mp4`.
- Never overwrite the preceding layer or the original. Versions are monotonically increasing for revisions.
- For every pass, keep a small manifest entry: UTC/local timestamp, project ID, layer number, base filename/path, overlay filename/path, source provider, start frame/time, x/y/width, key mode/tolerance, audio policy, output filename/path, full duration, frame rate, status (draft/review/approved), and preview link.
- Keep all flattened intermediate masters **at least until the episode is completed, approved and published**. No automatic deletion. Post-production cleanup requires explicit review/approval.
- Unfinished/review masters are **not publishable**. Only approved, fully finished output proceeds to scheduling.

## 8. Quality gates and failure recovery
- **Double exposure/ghost trails:** first check if the source itself contains repeated figures; then inspect canvas clearing, pixel alpha, chroma mode, and decoder output at separate timestamps. Do not treat this as a creative motion effect.
- **Dim or translucent characters:** key threshold may be removing character colors; compare source against keyed preview on contrasting backgrounds. Adjust mask and edge handling, not global opacity.
- **Characters disappear before screen edge:** landscape source was improperly fitted/shrunk or positioned. Revisit virtual stage and portrait viewport; do not crop or change motion without approval.
- **Base suddenly 4s:** incorrect duration/timeline binding; read base media duration and render the whole base. Do not trim to overlay duration.
- **File not found:** check PreviewLock inventory, exact filename, API connection and auth; a Dropbox upload alone is insufficient. Search project assets before asking the operator.
- **Export unavailable/short/no audio:** inspect MediaRecorder format/support, audio routing and full duration; keep original and previous flattened master. Never mark export done from a button click alone.
- **Keyed WebM shows opaque green:** alpha metadata is insufficient; fall back to the **original solid-screen MP4** and corresponding chroma key in AspectLock, not another speculative conversion.
- **Unapproved edits:** revert to the prior saved intermediate, restore the approved alignment, and change only the requested parameter.

## 9. EP4 canonical example / current state
- Scene one was burned into the ~66.54s EP4 bed via AspectLock R9; reference commit `a1b0fdf0d21013b7b47becc2c52630ef160e058f`.
- Scene two original: `GS_TIMMY_SCISSORS_CHASE_GEMINI_SOURCE_v01.mp4` (10s, green landscape source). Start 12.5s, original GS audio, overlay muted.
- Last documented geometry: x=124, y=297, width=334 (540×960 coordinate system), subject to operator's saved adjustments.
- AspectLock R16 added explicit green/blue/alpha/off modes and per-frame scratch clearing; commit `3a0e1f07be42e8cd238f154398ddac5e6dcad7b3`. The specific chroma algorithm remains subject to visual QA.
- User subsequently supplied a completed 66.56s Layer 02 render, archived in `/Grill Sergeant/Animation Lab/GS_EP4/GS_EP4_ANIM_LAYER02_TIMMY_SCISSORS_FLATTENED_v01.mp4`. The next overlay must use the **approved** flattened master as bed, not automatically an earlier scene source.

## 10. Engineering roadmap — not yet implemented
Add persistent asset IDs, project/layer manifest UI, automatic archive/PreviewLock registration, project browser, before/after alpha test, eyedropper and spill controls, native transparency QA, reliable full-length export and status/approval controls. These are requirements, **not claims that the current app already performs them**.

## 11. Handoff instruction for any future assistant or editor
**Read this runbook and the dated EP4 production notes before editing, generating, loading, compositing, rendering or publishing.** Inspect the latest GitHub editor code and connected Dropbox/PreviewLock assets. Preserve user-approved settings. Never invent an alternate workflow merely because the current one needs debugging. Make every asset and output discoverable, timestamped and reversible.
