# SxLock operating notes

Read the [GS video tools master plan](../../GS_VIDEO_TOOLS_MASTER_PLAN.md) and the [root operating rules](../../../AGENTS.md) before editing this app.

Place and mix sound, record voice and support the existing visual insertions. Its working player and Scribe are the shared reference.

Use the established transport and Scribe equipment for other tools. Protect SxLock recording, sound library, note history, timeline, mix and media export under the root change-control rules. Validate the native editor as well as all shared adapters whenever its shared equipment changes.

Follow the master plan's approval process for changes to established behavior. When an approved change affects another tool or a shared contract, update the affected notes and verify those paths in the same work.

See the [audio tools master index](../GS_TOOL_REFINEMENT_INDEX.md).

R44 opens the shared settings from Edit insertion in the Toolbox visual list and from camera overlay settings. Visual IN shifts the insertion and OUT fits the same source across its new timeline span. The preview and visual compositor use the same geometry and time mapping. Optional placement fields retain the fit and rate on recovery. Sound effect and recording controls continue to use their native editors.

R45 offers **Audio** for video insertions and camera overlays. Start muted, then enable and set the clip's level in insertion settings. The preview, finished video and mixed WAV use the same saved gain, span and rate. Older visual placements retain muted playback. Rollback is `fee523aa67c127f233e8e6143b1f3531ac1be190`.

R46 adds clip fades and **Mixer → Mix cues**. The video bed and Effects have independent timeline levels, with optional transition durations. Preview, finished video and WAV use the saved cues. Scribe shows Clear, Copy and Mark frame together below the note field. Rollback revision `3e5b257c2601c453747bb7891087762d5958d213`.

R47 restores direct Scribe access. Keep the named gold **Scribe** button beside the player readout in every dock state. It opens the original editor below the player and uses the native Pause action while playing. Save Scribe's open/hidden preference; legacy saved Scribe docks without that preference reopen visibly. Other modules still start collapsed. Keep the original note/history storage and primary/secondary actions. Source filename and clock use two compact lines so Scribe stays reachable at 320px. Baseline/rollback: `c6729268a8ea4344d5ecdbb97d326eba777832c3`; retain projects, source media and Scribe records.



R48 owner correction (November 26): compact filenames and labels in Toolbox/effect settings, real audition Play/Pause, draggable panels with a visible grip, and editable insertion IN/OUT near the top. Every placed sound and visual has an Edit insertion entry in Toolbox. Audio and video items expose item speed, source trim and explicit trim/fit behavior when OUT changes. Mark IN shifts the item and keeps its span; navigation alone does not move it. Audio rate/sourceEnd and visual sourceOffset/sourceLength/sourceDuration are optional recoverable metadata, preserving old 1× mappings. Live preview, offline video and WAV use the same sound mapping. New video audio remains muted. Do not alter recording or original media. See INSERTION_CONTROLS_R48.json; base/rollback a235974a0b52a25de31c094fe988feb4182470f4.
