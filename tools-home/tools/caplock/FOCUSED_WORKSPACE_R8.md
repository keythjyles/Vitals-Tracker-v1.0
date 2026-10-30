# CapLock R8 — project, player and focused elements

Owner direction, October30,2026. Entry is **Open project**, never a bare file selection. The project is the unit of work; its files reveal themselves inside the suite and remain individually savable. The empty player contains Open project. After media loads, title/version, project name and project controls tuck into a pull-down drawer. The player/transport/seek/placement controls dock together at the top while added items remain below. Pull the grip down, or tap it, to reveal project controls; reverse/tap to hide them.

## Three surfaces and focus

The outer player viewport stays fixed. The portrait composition surface remains9:16; the bed and each overlay have independent transforms within it. Bed focus permits pinch/size controls down to25% (including50%) and up to400%, plus Move. Overlay focus permits pinch, resize handle and size controls from5% to400% of the composition width, independently of the bed. Its box can extend beyond the bed and portrait surface; clipping happens only at the outer player boundary. Focus switches through Bed/Overlay or touching the element. Pinch preserves the original target for the whole gesture. One-finger Move uses the fixed composition dimensions, never the resized bed rectangle. Rotate remains overlay-only.

Bed scaling does not change source media, frame timing, audio rate or another overlay's geometry. Pending captions remain independently previewed; only Insert commits/locks them. A locked placement cannot be moved, pinched or resized until explicitly unlocked. Undo/recovery and source references remain. Fit view recenters/refits the fixed composition surface, rather than overwriting bed or overlay placement; Reset size acts on the focused element.

Project schema5 adds bedTransform and editFocus and extends overlay width to400%. R8 reads versions1–4 with a neutral bed transform; R7 rejects schema5 rather than dropping it silently. Preserve schema5 JSON and sources when rolling back. This remains an editor preview, not a finished-video exporter.

## Complete project assets

Each joke project is intended to contain the saved joke text, scripts/transcripts, source footage, clips, sounds, caption sources and numbered cuts, alternate animations, reactions, HeyGen output, ElevenLabs audio, B-roll and outro. Preserve actual provider identifiers, settings, costs, original bytes, lineage and approvals as recovered; never fabricate missing settings or regenerate an existing paid source because a record is incomplete. The current picker lists all recorded manifest assets, with Save asset for an individual original/component copy. Device import is available only with a current project. The general import paths remain; no paid provider calls are performed by this release. Historical upstream/provider reconciliation is still incomplete.

Future performance records should link the exact project and version to platform post IDs, publication dates, release decisions and metrics, with organic and paid results separate. This is a future extension, not implemented analytics or an active metrics job.

## Verification and continuity

Receipt: FOCUSED_WORKSPACE_R8.json.39 local Node checks pass before publication, including actual gesture-controller state, half-bed/independent-overlay geometry, locks and schema migration. Browser checks separately cover real CDP touch input, resize beyond the bed, fixed viewport, drawer/dock, individual byte-checked asset download and all earlier app/AspectLock/project/clipper regressions. Record live and physical-phone evidence separately; do not infer private owner-cloud acceptance from fixture APIs.

Clean-start directive remains: finish owner testing, then begin a fresh text-first project and keep test/rejected/bad assets outside the active workspace with recoverable lineage. No production cleanup, test upload, paid generation or posting-schedule change is performed here. SxLock and AspectLock engines are unchanged.

Rollback baseline:1823fc8e9dbe59be0668077117263d010ab034db. Retain all original media, schema5 projects, immutable edit history and backup receipts. The complete cross-module shell/adapters and within-item speed/freeze controls remain unfinished.
