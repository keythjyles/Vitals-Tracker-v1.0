# R9 — Insert creates an editable layer

Owner correction, October30,2026. Supersedes the R6–R8 automatic placement lock. Insert must never flatten an animation or lock editing. Final compositing/export is a separate later step; CapLock currently has no finished-video exporter.

## Interaction

- Insert adds the selected caption to the timeline at its chosen timing/geometry, remains on that caption and keeps it editable. Repeating Insert does not duplicate it.
- Previous/Next choose components. Pending components use the current paused frame. Returning to a placed component seeks paused to its actual insertion for editing; it does not move its saved timing.
- Selecting a placed row also makes it the active component, so another pending component cannot linger staged over it. Placed media follows only its saved timeline range and visibility; selecting it is not a permanent render.
- Done, or a blank-space tap, deselects the box without removing the layer. Bed/Overlay can regain focus. Hide/Show beside each placed item controls visibility without deleting its source or timeline record.
- Settings remain enabled after insertion. Apply settings is sticky at the top of the sheet. Move/Rotate closes the modal to permit direct canvas manipulation. Inserted layers can be repositioned, resized, retimed, hidden or removed independently.

## Project controls and docking

The source/project/title/version drawer disappears after loading. The player/transport/seek/placement remain docked; Open project is still the entry. When scrolled down, the first pull on the grip returns the page toward the top without revealing the drawer. Once at the top, a new pull reveals it. Tap the grip is an explicit accessible reveal/hide alternative. Drawer height changes are immediate so precision controls do not drift during an animation.

## Preservation

Schema6 separates placed, visible and selected/focused state. R6–R8 automatically locked placements migrate to placed=true/locked=false with exact source references, timing, geometry, bed transform and queue retained. R9 reads1–5; older apps reject6. Preserve6 JSON/history during rollback. Pending layers remain out of normal playback until Insert. Original video/audio/animation bytes are untouched; no renderer, paid provider call, new test upload, cleanup or schedule change is performed.

Operation and evidence: EDITABLE_LAYERS_R9.json.42 local Node checks passed before publication, including old-lock migration, editable placed timing, hide/recovery and the existing geometry/source tests. Browser evidence and deployment are independent; owner-phone/private-cloud acceptance remains separate.

Project scope remains all recorded text/scripts/transcripts, clips/sounds, original/alternate animations/reactions, HeyGen/ElevenLabs outputs and metadata. Individual assets remain savable. Historical upstream reconciliation, full studio adapters, in-item speed/freeze and final export remain unfinished. Performance analytics are a future exact-version/post-linked extension with organic/paid separate. Clean-start cleanup waits for owner testing to finish and must preserve recoverable originals outside active selection.

Rollback source:f25cd556616802c8c9718c71ef399643f1e3d6cf. Do not discard schema6 projects or original media when rolling back.
