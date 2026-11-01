# Locked SxLock player equipment

The owner rejected the earlier R7 layout. Reuse the SxLock R24 component in player-shell.mjs/css. Its frozen profile is 76px rail, 29px rows, 36px paired frame row, 30px frame glyphs and 7px spacing. The monitor follows the natural transport height. Files/projects/modes live in the shared hidden drawer. No native editor may substitute its own dimensions, add a permanent picker header or stretch transport buttons. Preserve native IDs, events, media and edit state.

The grip uses the established two-stage pull-to-top then pull-to-reveal gesture, with tap as an alternative. The source drawer closes after media loading. Precision picture/overlay gestures do not affect it. Slider protection remains in compact-player.mjs; this file no longer owns player geometry.

Validation must include real phone widths, portrait footage, identical row/pair dimensions, picture/rail alignment, cold-source access, hidden picker after loading, pull/tap source access, source/cut persistence and existing native regressions. Do not call a merely similar viewer a match.


R9 owner refinement: keep at least 16px inside both screen edges (including safe-area insets), show the source filename in one compact row, and annotate interactive controls with hover/focus/touch-hold help. Hold-to-help must consume the following tap so it cannot mark, step, delete or download. Clipper uses full-width current-frame mark buttons; exact numeric marks are deliberately in its drawer. Its extra 25-frame row uses the unchanged 29px row profile, not large single-frame glyph styling. Preserve Photos and general Files routes separately; the browser/OS owns provider selection.
