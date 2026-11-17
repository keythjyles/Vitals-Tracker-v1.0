# GS video tools master plan

## Objective

Build a phone-first production system that can repeat the same editing and motion-graphics method across dozens of elements per chapter and hundreds across the series. Keyth can supply copy and exact frame cues. The operator can build, insert, verify and deliver the graphics in the established bed. Keyth can also open local sources and place an animation directly when desired.

Use SxLock's established player for the tasks all video viewers share. CapLock and AspectLock should feel like the same equipment when loading files, finding a frame, taking a note, or setting up an overlay. Each tool has its own editor and job.

| Tool | Job | Source notes |
| --- | --- | --- |
| AspectLock | Frame one animation against a bed, key its background, and set its source trim, scale, placement and timing. | [AspectLock](tools/aspectlock/AGENTS.md) |
| CapLock | Assemble and adjust multiple editable caption, animation, image, video and audio layers on a composition. | [CapLock](tools/caplock/AGENTS.md) |
| SxLock | Place effects, record and mix sound for an edit. Its player and Scribe are the reference for shared controls. | [SxLock](tools/sxlock/AGENTS.md) |
| Clipper | Mark and save named cuts from a source, including numbered caption components. | [Clipper](tools/cliplock/AGENTS.md) |
| FrameLock | Inspect and trim source frames and record frame notes. Preserve the established FrameLock/AnchorLock workflows. | [FrameLock](tools/framelock/AGENTS.md) |
| MotionLock | Prepare intentional camera motion and B-roll placement with its motion timeline. | [MotionLock](tools/motionlock/AGENTS.md) |
| PreviewLock | Open and review the identified saved asset, take notes and hand it to the next editor. | [PreviewLock](tools/previewlock/AGENTS.md) |

The [tool registry](TOOL_REGISTRY.md) documents entry points, versions and render paths. [Studio](tools/studio/GS_STUDIO_MASTER_HANDOFF_2026-10-31.md) retains project identity across native phases. [WavLock and Sound Scrubber](tools/GS_TOOL_REFINEMENT_INDEX.md) have their own audio workflows and change history.

## Shared editing behavior

- Keep compact right-hand transport and accessible Files/Photos access. When media is loaded, put the filename and frame/time/fps readout at the bottom of the player. Open Scribe from its own section in AspectLock. Reuse the real SxLock behavior and shared components. Capture the source and the paused frame with each note. Keep existing note history recoverable. Put **Clear**, **Copy**, and **Mark frame** together directly below each Scribe note box. Put the available secondary actions in a smaller row.
- Put **Start** at the top of the main transport and **Play** directly below it. Start pauses at the first source or composition frame. Play toggles playback.
- AspectLock and CapLock should use the same terms and controls for Toolbox, frame navigation, background color, and layer and background opacity. A single step moves one frame. A double-tap on a step button moves 25 frames from the starting frame. Dedicated 25-frame controls and numeric frame entry make the same moves available without a gesture. Keep pinned sections and temporary view state separate from the edit.
- **Insert** in the right-hand controls pauses at the current frame and opens the existing Toolbox for placement. The **Toolbox** control below the player gives access to the same clips.
- AspectLock, CapLock and SxLock visual insertions use the same settings box. Keep the current timeline frame, editable IN/OUT and Mark IN/OUT near the top. Mark IN moves the insertion. AspectLock recalculates OUT from the full selected source span at its current rate. Typing or marking OUT fits the selected source span to the new end. The yellow dashed outline and resize handle remain reachable from the player while editing. Keep device media identifiable by thumbnail and an editable display name in the Toolbox.
- Put a collapsed **Audio** section in visual insertion settings. New video overlays start with **No sound**. **Sound on** restores the last audible level. Use the same volume slider, percent field and 5% steps in each editor. Keep the clip's sound aligned with its placement and playback rate in preview and export.
- Provide separate **Fade in** and **Fade out** durations in clip Audio. The fades follow the placement's IN and exclusive OUT. In AspectLock give the bed its level and fades in **Bed settings → Audio**.
- Give AspectLock's bed and visual insertion separate **Picture fades** and **Audio** sections with independently adjustable durations. Apply both in preview and export.
- Keep the AspectLock file picker to filenames and compact selection controls. Load a single preview when requested. Show down arrows on collapsed AspectLock sections and up arrows when expanded.
- Show **Mix cues** under SxLock's Mixer. A cue captures the timeline position and can set the bed, Effects, or both. Use a zero transition for an immediate change. A timed ramp starts from the channel's level at the cue. Save cues with the edit and apply them during playback and export.
- Identify whether a frame belongs to the source or composition. Chapter 3 and the AspectLock/CapLock composition clocks use 25 fps. Native source cutters retain the source frame rate. IN is the first included frame. OUT is the first clear frame. When a timestamp and an F-number disagree in a production cue, use the F-number.
- AspectLock's blue outline shows the bed extent. The fixed viewport is the exported picture. Shade material outside the viewport so it is visible while placing a layer. Pan, zoom or resize the editor view separately from any change to the bed or animation. Make the reset choice clear so a user can start fresh or keep the bed and clear its insertion.
- Use **Keep**, **Replace** and **Transparent** for a clip's background in CapLock and AspectLock. Set a replacement color with the common color wheel. Use separate percentage controls for layer opacity and background opacity. Read 0% as transparent and 100% as opaque. Match framing, keying, opacity and audio timing between preview and export. Keep tool identity and release visible.
- Preserve originals, saved placement and cut recipes, and earlier review versions. Follow the repository's asset-storage and review procedures. Use descriptive names and a source/index record so the active asset is identifiable by more than a screenshot or a download timestamp.

## Field Guide graphics method

1. Build the completed hold frame first. Use the established sharp warm-ivory main type, bright metallic gold accents, measured row sizes and center alignment. Keep gold connectors and their rules optically consistent with each other. Center each rule between the visible edges of the adjacent large words and leave both vertical and horizontal padding. Over a speaking shot, the first row sits over the apron flame when that is the cue, with the face clear. B-roll can use a centered top-down layout. Use the chapter or shot-specific placement.
2. Animate back from that layout. Reveal the whole phrased group in a quick stagger using short, alternating in-frame slides and simultaneous fades. Where a lean is called for, animate individual glyphs after landing and retain the row's alignment. Keep the completed group readable through the hold. Apply individual row cues when supplied. Use audio alignment when Keyth specifically asks for it.
3. Place the group on the established video bed at the supplied frame. Use an exclusive OUT and check the first visible frame, a held frame, and the first clear frame. Save useful transparent elements as separate assets with a rebuildable recipe. Offer an episode-length graphics-only alpha pass with the same time origin and frame rate when the episode is complete.
4. Use the scene-card layout for the closing build. The title lands over the footage and stays in place as it fades to the dark card. The divider, star, Field Guide name, chapter and subtitle complete the card. Follow the current frame cues and the approved final hold for the edit.

Keep the template reusable for multi-line groups, graphic-only inserts, and later chapters. Pick the rendering method that reproduces the approved design and timing reliably. A form or batch run is a way to send the same cues to the established procedure.

## Change approval and recovery

1. Start with the latest user direction, this plan, the relevant app notes and the current source. Confirm the active release, branch and saved edit before touching production. Identify the problem, affected tools, evidence, and recovery or rollback point.
2. An explicit user request authorizes the scoped work it describes. Routine implementation choices, reproduction, validation and repairs that restore the agreed behavior can proceed within that scope. For a proposed departure from the agreed behavior or an expansion into another tool, show the user a concrete change with its effect on the existing workflow and get approval for that change. Record the decision with the affected revision. Carry forward existing approval rules for releases, publication and paid media.
3. Check all consumers when a proposed change touches shared player code, timing semantics, an export path, project or asset storage, or API handoffs. Update this plan, the affected app notes and the registry or relevant contract in the same change when the system's agreed behavior changes. Preserve and test recovery of saved edits created under the previous version. Leave one-off media directions in the project recipe.
4. Keep unfinished changes in an identifiable branch or draft. Record why the change exists, the base and head, the actual tests run, open failures, asset links, and the precise next action. Retain local recovery, original media and usable earlier releases. Check mobile layout and actual frame, color, audio and saved-project behavior where the change affects them. Record repository, test, live deployment, and owner-device evidence separately.
5. Read and act on branch test failures during the work. Use the run log for diagnosis and include its link in the checkpoint. Raise a user alert when the live workflow is affected or a specific user decision is required. Give the impact and next action. Keep development-test diagnostics in the PR and handoff.

See [root operating rules](../AGENTS.md), [AI onboarding](../AI_MUST_READ.md), and the [shared player contract](shared/COMPACT_PLAYER.md) for the existing system instructions.
