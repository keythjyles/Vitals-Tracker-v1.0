# AspectLock operating notes

Read the [GS video tools master plan](../../GS_VIDEO_TOOLS_MASTER_PLAN.md) and the [root operating rules](../../../AGENTS.md) before editing this app.

Fit and key one animation over an identified bed. Keep bed-frame IN/OUT separate from source trim, playback speed, and geometry.

Use the shared SxLock-derived navigation and Scribe conventions. Preserve device import, saved placements, fixed portrait output and the difference between viewing the scene and changing its composition. Keep the bed outline and off-canvas shading in the editor view.

Follow the master plan's approval process for changes to established behavior. When an approved change affects another tool or a shared contract, update the affected notes and verify those paths in the same work.

See the [shared player contract](../../shared/COMPACT_PLAYER.md).

## R34 clip names and insertion

Tap the active device bed name under the player or a Toolbox clip name to edit it inline. Save stores the label with the existing Toolbox ID, and active labels update in the player and Insertions. Source file identity still anchors recovery and Scribe. R34 uses the R33 edit recipe format. The R33 rollback revision is `e7fad69f6a3f9095b98c6bd6e6fa6d86089b9f6c`.

Insert opens the Toolbox and pauses the bed at its current playhead. The panel shows the insertion frame and moves it one frame per tap. Overlay here uses the displayed bed frame.

## R35 viewport stability

Keep the insertion controls visible while the list scrolls. Open Insert in place when its controls are visible or the Toolbox is pinned. Editing the bed name fits the existing player row. Saving a name updates its existing row in the clip list and leaves the scroll position and playhead in place. R34 rollback revision `c446e6ece63a0a8aa36761d79eff4c7af2ae8373`.

## R36 clip backgrounds

The animation properties use **Keep**, **Replace** and **Transparent** like CapLock. Color sampling and replacement use the same rendering code. Existing green and blue presets can also supply the source mask. Store the background treatment separately from layer opacity and use it for preview and export. R35 rollback revision `109f62a8355682cf394a39518f62a6c1372648b1`.

## R37 frame readout and appearance controls

On a paused seek, keep the last picture and its frame number until the requested bed and active animation are decoded. Update the preview, frame clock and insertion cue together. Consecutive step commands use the latest requested frame. Start is above Play and appearance buttons wrap to fit the phone. R36 rollback revision `8f93dac918b30885dde8c261207ae8aedc3719ad`.

## R38 insertion settings

Tap an insertion to edit its name, view the paused bed frame and mark or type IN/OUT. The settings stay open while the yellow dashed outline moves and resizes the animation. OUT fits the selected source span and is exclusive. Source trim opens the existing source controls. In Toolbox, Add video shows a thumbnail and editable name, and Place here uses the indicated bed frame. Saved device names travel with each Toolbox ID and cloud labels can be saved in the local edit. Rollback is `bb01ce180129414f5d4df026299fc57f8bbac9d7`.

## R39 insertion audio

Open **Audio** in insertion settings to mute the overlay or set its level. **Sound on** restores the prior level. Bed audio is a separate control in the same section. Saved edits keep both settings and continue to read earlier on/off overlay settings. Preview and the WebM mix follow the overlay's placement, source trim and rate. Rollback is `fee523aa67c127f233e8e6143b1f3531ac1be190`.

## R40 clip audio and file picker

Use **Bed settings → Audio** for the bed's level and fades. Insertions use **Edit insertion → Audio**. The picker lists names and opens a preview only when requested. **Collapse** closes the Toolbox at the current frame. Rollback revision `3e5b257c2601c453747bb7891087762d5958d213`.
