# CamLock operating rules

Read the [GS video tools master plan](../../GS_VIDEO_TOOLS_MASTER_PLAN.md), [root operating rules](../../../AGENTS.md) and [CamLock operation/verification](README.md) before editing.

The November 25, 2026 camera model is approved. Preserve independent stage and camera transforms, unrestricted camera travel, source-time trajectory records, independent programmed durations, primary-finger translation and secondary-only additive rotation. Finger separation cannot change camera zoom. A removed primary promotes the remaining finger without a discontinuity.

Navigation never deletes instructions. Only starting Action replaces the trajectory after the selected source time. Keep raw data, original media, JSON project recovery and source references independent from rendered output.

Consume existing Scribe/history and rendering modules without changing the production editors. Report physical-device verification separately from browser simulation. Never claim rendering, download, cloud backup or deployment from a code-only check. Keep the visible name, ID, version and release receipt consistent.

V1.1 owner corrections require a picture docked at y=0, top-menu Dock/Unlock controls, floating settings cards and optional opening/effect/duration questions that arm only on completion. Rotation must be explicitly on; square snapping defaults on and preserves unsnapped `rawR` when used. Keep Push / Pull labels, percentages and plain speed descriptions. Do not restore settings hidden beneath the locked player.

V1.2 owner direction adds Full/½/¼/⅛ X/Y sensitivity (¼ default) and a toggleable proportional joystick. Preserve fractional positions. Operator response never rewrites or rescales an existing path, and does not affect stage setup, Z or R. Joystick rates use source time; release, cancellation and focus loss clear its velocity. Keep joystick overlays out of the scene painter/export. Project controls migrate without discarding earlier poses. See RELEASE_V1_2.json for verification and rollback.

V1.3 owner correction locks first-step opening values until explicit Unlock opening, raises the wizard, and keeps live source length/elapsed/remaining/frame/time visible below the player and in the wizard. Action opening/duration and path endpoints are not output trims. Render the entire source unless project.trim explicitly selects IN/OUT. Hold the first/final camera pose outside recorded samples while source picture/audio continue; never freeze source frames. Trim edits/cancellation must preserve the full raw path. Legacy projects default to no trim. See RELEASE_V1_3.json.

V1.4 owner request: opening parameters must be locked and collapsed on entry, with explicit unlock reachable outside the disclosure. Unlock expands/enables; relock collapses/disables. Rotation settings enter collapsed in Wizard and their own popup. Preserve values and all camera/render behavior. See RELEASE_V1_4.json.
