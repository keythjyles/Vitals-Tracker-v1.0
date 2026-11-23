# Locked SxLock player equipment

The owner rejected the earlier R7 layout. Reuse the SxLock R24 component in player-shell.mjs/css. Its frozen profile is 76px rail, 29px rows, 36px paired frame row, 30px frame glyphs and 7px spacing. The monitor follows the natural transport height. FrameLock v1.3.19 uses the same 76px rail with 50.75px standard buttons and 63px frame buttons. Its picture column matches the transport height with the clock and progress inside that height. Files/projects/modes live in the shared hidden drawer. No native editor may substitute its own dimensions, add a permanent picker header or stretch transport buttons. Preserve native IDs, events, media and edit state.

WavLock R1.8 has its own audio editor. Its short waveform supports pinch zoom and panning. Audio controls and shared Scribe sit below the waveform. The cold bed opens the device picker, and the grip reveals the picker for later sources. Saved audio cuts retain their source and ranges on the device.

The grip uses the established two-stage pull-to-top then pull-to-reveal gesture, with tap as an alternative. The source drawer closes after media loading. Precision picture/overlay gestures do not affect it. Slider protection remains in compact-player.mjs; this file no longer owns player geometry.

The first transport button is Start, followed by Play. Use each editor's own rewind and playback controls so source trimming, selections, and project state stay bound to its native player.

`insertion-settings.mjs` and its stylesheet lay out the name, current frame, placement marks and motion controls for AspectLock, CapLock and SxLock visual layers. Open the settings beside the active player so it can still receive pointer input. IN moves the placement as a whole. OUT fits the selected media span by setting playback speed for time-based media and hold length for stills. Each app keeps its own source-trim controls, timeline clock and saved placement. `clip-picker.mjs` supplies the inline name field and generates thumbnails from visible files in the Toolbox.

The shared **Audio** section shows the selected insertion's sound state while collapsed. Use **No sound** to mute and **Sound on** to restore the remembered volume. The slider, exact percent field and 5% buttons set the clip level. **Fade in** and **Fade out** follow the placed span. Use the saved level and fades for preview and export.

Keep **Clear**, **Copy**, and **Mark frame** on one row directly below each Scribe editor. Put History and the tool's other existing actions in a smaller row. FrameLock uses its original notes and history handlers.

SxLock R47 keeps its native Scribe and a permanently named Scribe button beside the player readout. Docking or hiding the note must never remove that access. Its native dock controller restores Scribe visibility across reload, including the legacy hidden-dock repair. Other adapters continue using their established Scribe access and storage.

AspectLock opens Scribe from its named section below the player. Its readout shows the filename and frame clock. The section arrow indicates whether the notes are expanded.

FrameLock v1.4.0 pairs the transport controls and keeps its read-only timeline and trim totals inside the matched player height. In is the first retained frame. Out is the first frame after the cut, and Go accepts the end boundary. Trim reuses Clipper's verified local exporter. Save As names the download, and Load cut uses those same export bytes. The source and notes stay in place when Keep editing is selected.

Validation must include real phone widths, portrait footage, identical row/pair dimensions, picture/rail alignment, cold-source access, hidden picker after loading, pull/tap source access, source/cut persistence and existing native regressions. Do not call a merely similar viewer a match.


R9 owner refinement: keep at least 16px inside both screen edges (including safe-area insets), show the source filename in one compact row, and annotate interactive controls with hover/focus/touch-hold help. Hold-to-help must consume the following tap so it cannot mark, step, delete or download. R11 corrects the earlier interpretation: Clipper keeps visible editable IN/OUT boxes beside the corresponding current-frame mark buttons, using WavLock's existing 29px compact row pattern. Never move these number boxes into the drawer or replace them with a button label. Its extra 25-frame row uses the unchanged 29px row profile, not large single-frame glyph styling. Preserve Photos and general Files routes separately; the browser/OS owns provider selection.

