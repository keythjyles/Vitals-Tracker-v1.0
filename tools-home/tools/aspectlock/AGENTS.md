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
