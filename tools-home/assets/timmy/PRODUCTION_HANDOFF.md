# Timmy — Production Handoff / Resume Here
Updated 2026-10-24
Owner project: Grill Sergeant social-media production
Canonical folder: tools-home/assets/timmy/
Read with CHARACTER_BIBLE.md and MANIFEST.md before any Timmy task.

## Who
Timmy is the established illustrated GS cartoon-boy mascot, not a realistic child or interchangeable cartoon. Approved design: rounded peach face, tousled medium brown spiky hair, oval black eyes, curved eyebrows and nose, small smile, thick black outlines; yellow short-sleeved collared shirt with dark charcoal chest stripe, charcoal shorts, white socks and oversized brown shoes. Preserve design consistency. Do not use a differently styled/generated character without review.

## What / asset types
Maintain original reference art, genuine-alpha transparent individual full-body poses, separately aligned torso and head layers, animation frame sequences, render scripts, audio/video compositing recipes, review clips and approved masters. Every asset must have a stable versioned filename and manifest entry. The user's preferred workflow is AI-operated production with manual review; do not make the user redo asset discovery or manual file work unnecessarily.

## Where
GitHub: https://github.com/keythjyles/Vitals-Tracker-v1.0/tree/main/tools-home/assets/timmy
- CHARACTER_BIBLE.md: identity and movement constraints
- MANIFEST.md: actual upload status and asset provenance
- PRODUCTION_HANDOFF.md: this resume document
GitHub is the canonical home; Drive may be a redundant copy but never claim a Drive upload without verification.

## How: animation construction
1. Inspect approved reference PNGs and approved video; verify the exact files exist before using them.
2. Derive clean transparent individual poses (alpha, no dark vignette, labels, glow, checkerboard or backdrop). Review their fidelity to canonical character.
3. Construct separate body/torso and head layers with aligned neck pivot. The body/feet stay fixed during reaction. Replace/interpolate head artwork across left, center, right, down poses; small controlled neck rotations only, NOT rotating the full figure. Facial expression: restrained smiling disapproval, slight downward chin.
4. Animate walk-in from screen right using coherent walking leg/foot poses, mirrored for direction. Finish fully inside screen including both shoes.
5. Preserve underlying footage, bee passes and source soundtrack. Render with reproducible timing, keep source layers and script.
6. Inspect frames around 675, 700, 725, 800, 842 and 843; ensure Timmy is fully visible by 700, no visible remnants at 843, no body wobble during head shake.
7. Save all Timmy-specific files to canonical GitHub folder and update MANIFEST.md. Link actual committed files and verify their retrieval. Preserve previous versions.

## Current scene — locked user direction
Video: Grill Sergeant full portrait video, duration 66.58s, 25fps, 1080x1920. Approved bee flybys remain unchanged.
- Frame 675 (~27.0s): Timmy enters from right, mirrored, approximately half the size of earlier oversized version.
- Frame 700 (~28.0s): entire figure is inside frame.
- ~28–29s: stop walking, turn to face viewer, lower head.
- ~29s through frame 842: body stationary, small smiling disapproving side-to-side head shake using different head poses.
- Frame 843 (~33.72s): scene changes; Timmy gone immediately, no fade.
- Never extend the scene past the cut.
- Last user feedback: whole-body rotation was incorrect; new front-facing wave and distinct head-angle poses are needed. User approved proceeding with a revised pose sheet and preserving it across chats.

## Known sources / not-yet-verified binaries
- 16859_preview.jpg and 16860_preview.jpg (original illustrated side-walk and smiling wave references, conversation uploads).
- 16859.png and 16860.png are names cited in earlier notes, NOT verified committed files.
- Generated sprite-sheet references in conversation: a_clean_transparent_png_style_sprite_sheet_cartoon.png and a_clean_high_resolution_sprite_asset_sheet_on_a_t.png. Generated sheets were **not production-ready individual transparent sprites**; they contain labels and colored backdrops, so cutouts require cleanup.
- Earlier Timmy frame sequence: timmy_overlay_v04/0000.png through 0167.png in conversation work area; NOT verified on GitHub.
- Prior review render: GS_BEE_TIMMY_RETURN_FULL_v04.mp4, 66.58 seconds; NOT verified committed to GitHub. It was considered improved but rejected for whole-body rotation.
- No individual final alpha pose, finished head-only reaction animation, or updated final master has been verified committed.

## Approval / next work
Next: create clean transparent FRONT_WAVE and stationary FRONT_BODY, plus separate head center, left, right, down poses. Check character identity and neck alignment. Then rebuild 27–33.72s reaction, render full video, review and only then mark approved. The new sprite sheets are references, not automatically approved production sprites.

## Persistence contract
Do not lose user decisions across chats. Update this handoff whenever timing, pose, animation, filenames, approvals or next steps change. Record exact repository paths, commit identifiers, media provenance, version and what remains incomplete. If tool lacks binary GitHub upload, report limitation; do not pretend assets are saved.
