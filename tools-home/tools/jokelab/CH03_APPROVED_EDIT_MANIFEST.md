# Chapter 3 — Approved edit manifest (authoritative)
Updated: 2026-11-11. This manifest overrides speculative drafts and prior incorrect assemblies.

## Owner-confirmed approval register (authoritative; latest decision)
| Order | Element | Source approval | Edit approval |
|---|---|---|---|
| 01 | Neighbor opening | **APPROVED** | Source accepted; no new edit approved |
| 02 | Symptoms montage | **APPROVED** | Source accepted; no new edit approved |
| 03 | Claim paperwork | **APPROVED** | Source accepted; no new edit approved |
| 04 | Camera B with handles | **ACCEPTED** | **PENDING**: trim handles, synchronize to original Part B narration, review crop/push-in |
| 05 | Family denial | **APPROVED** | Source accepted; exact entry on “Now his family…” must be verified in timeline |
| 06 | Wendell's teaching return | **NOT PRODUCED** | **NOT PRODUCED** |
| 07 | Title card | **CANDIDATE** | **NOT APPROVED** |

**Owner instruction:** Preserve every approved source exactly. Approval of source footage is not approval of a subsequent trim, speed change, crop, audio offset, or assembled export. No defective prior assembly is an approved master.

**Source-review index:** `CH03_REVIEW_INDEX/01_Opening_APPROVED.mp4`, `02_Symptoms_Montage_APPROVED.mp4`, `03_Claim_Paperwork_APPROVED.mp4`, `04_Camera_B_WITH_HANDLES_SOURCE.mp4`, `05_Family_Denial_APPROVED.mp4`, `06_Title_Card_CANDIDATE.mp4`; master audio files `00_Original_Narration_Part_A.mp3` and `00_Original_Narration_Part_B.mp3`. These are review copies, not substitute footage.


## Immutable approved sources
- Part A opening: `CH03_INTRO_A_Neighbor_Story_HeyGen_APPROVED.mp4` (original `19248.mp4`), 18.922 s, approved. Google Drive ID `10bluVa_H3C0pigLgyRZgBffOyQ1gJ8ID`.
- Part B audio: `ch 3 intro part b.mp3`, 40.516 s, ElevenLabs Wendell 4, source of truth for words and timings.
- E01 symptoms montage: `CH03_E01_Symptoms_Not_Reported_APPROVED.mp4`, 7.208 s. No substitutions.
- E02 paperwork: `CH03_E02_Veteran_Files_Claim_Assumes_VA_Knows_APPROVED.mp4` (original `19230.mp4`), 3.029 s. Approved.
- Camera B speaking: `CH03_PART_B_Camera_B_Alternate_Deck_HeyGen_SOURCE_7p36s.mp4` (original `19249.mp4`), 7.360 s. User approved reuse as alternate angle; gentle Ken Burns push-in. Google Drive ID `1ZgsAGmTCnULn2BYnEstfZwSFXIUjInqM`.
- E03 family denial: `CH03_E03_Family_Denial_APPROVED_3p25s.mp4` (original `19245.mp4`), 3.274 s. Begin precisely on “Now his family…”; maximum 4 seconds.
- Established day/sunset lakeside deck is the master scene. Camera B is an alternate angle, not a replacement.
- Closing/title card: `GS_CH03_Title_2p25s.mp4`, 2.25 s; chapter title YOUR RECORD SPEAKS. **CANDIDATE ONLY — not approved.**

## Camera B handle rule
The extra ~0.5 seconds before and after Camera B's intended spoken passage are editing handles, not additional narration. Keep the 7.360-second source unchanged. Identify the exact first/last spoken samples and remove handles **only in the derived edit**, aligning lip sync to the uninterrupted original ElevenLabs Part B track. Never change audio playback speed or infer timing by simply concatenating video durations.

## Timeline structure
A (18.922 s) → B begins at 0.0 relative to Part B.
B E01 → E02 → Camera B → E03, with exact scene boundaries to be audited against Part B audio, not guessed from visual durations.
After E03, “I'm Wendell, the Grill Sergeant,” and the instructional plan remain unfinished as a lip-synced speaking segment. Do not claim final master complete.

## Rules
1. Approved source names/IDs are locked; do not replace with stills, drafts or another deck.
2. Render only from this manifest. No new Gemini/HeyGen generation without explicit approval and confirmed input assets.
3. Preserve source audio; avoid duplicate speech from rendered HeyGen shots.
4. Use subtle continuous motion on every shot; no static filler.
5. Verify actual video frames at every cut, audio at each narration boundary, runtime, and first/last frames before delivery.
6. Save named review and final outputs to Drive folder `1SqWwugwUMsGpjQQXoIG8EoYTUBTcsSza` and Dropbox `/Grill Sergeant/GS_CH03_PRODUCTION_ASSETS/`; report verified links only.
7. Approval is binding; candidate vs approved vs review must be explicit.

## Production incident review — framing and continuity (2026-11-11)
**Status:** Latest centered-pose image is a CANDIDATE, NOT approved; do not pay for HeyGen generation until owner approves the exact source image.

### What failed
- Original HeyGen framing placed GS too far right. A post-render crop attempted to center the head but clipped an arm and distorted visual balance. Head centering is not body composition.
- Repeated new images changed beard length, apparent age, hat flag, deck architecture, grill location, and scene dressing despite fixed references.
- The user specifically removed the hanging American flag, flag-pattern cushion and checkered towel, but these reappeared in generated versions. **The American flag patch on the camouflage cap must remain.**
- Hands and elbows need a generous motion-safe margin, because HeyGen animation may extend gestures beyond the source silhouette.
- Some images put GS dangerously close to a flaming grill; the grill belongs to the viewer's LEFT, with GS safely to the RIGHT of it, and the empty butcher-block foreground reserved for product/animation placement.
- Camera motion and post-cropping cannot repair a bad source composition. Generate/approve the correct pose first.

### Required source-pose acceptance checklist BEFORE any paid generation
1. Use global GS VA master face, age, short tidy gray-white beard, camo cap WITH US flag patch, black shirt, brown Grill Sergeant apron.
2. Portrait 9:16; centered full torso with symmetrical shoulders, natural upright spine, head on central axis, hands fully in frame with breathing room on BOTH sides; no awkward body twists.
3. Frame wide enough for speaking gestures: **do not crop elbows, wrists or hands**; leave at least ~8–10% horizontal safety margins for moving arms. Center torso, not merely face.
4. Original Chapter 3 sunset/day lakeside deck continuity: fireplace, pergola, lake/dock, wooden cabinets and countertop. No redesign of approved furnishings.
5. Open cooking grill on viewer's LEFT, physically separated from GS; safe distance from flames.
6. NO hanging flag, NO flag-patterned cushion, NO checkered towel; flag patch on hat IS mandatory.
7. Clean clear butcher-block front stage, no props obstructing animation/product space.
8. Calm, serious, kind expression, restrained natural gestures. No theatrical surprise or flailing.
9. Compare candidate source against approved global portrait and deck reference side by side, visually inspect every requirement, show ONE candidate to owner. **Only explicit owner approval authorizes paid video generation.**
10. Original ElevenLabs audio is the sole clock; preserve speed and sync; HeyGen handle padding is trimmed from derivative only. Inspect full resulting video and cuts before delivery.

### Failure prevention
- Every asset has state: REFERENCE / CANDIDATE / APPROVED_SOURCE / APPROVED_EDIT / REJECTED. Never promote a candidate automatically.
- If any source frame fails the checklist, STOP before paid rendering. Fix the still image, not the exported video.
- Approved source files remain immutable; store new versions with descriptive names. Rejected render must not enter master timeline.
- Before export: inspect opening/middle/end frames and 1-second samples around each cut; verify audio timecodes, speed, arm bounds and character identity.

## Scene 7 handoff — 2026-11-12
- **Scene ID:** CH03-INTRO-SC07
- **Original upload:** `19306.mp4` (10.320 s; 15,364,841 bytes; SHA-256 `5e1ff76888a24d32e889805343e06e0b8e2e15459559c234252c40cebafe8d98`)
- **Canonical filename:** `GS_CH03_INTRO_SC07_WENDELL_SPEAKING_SOURCE_19306.mp4`
- **Google Drive ID:** `1k2Uc8yFT7d22g4JM30t0a1knaKMwQzI0` (production folder `1SqWwugwUMsGpjQQXoIG8EoYTUBTcsSza`)
- **Content:** Wendell at established grill/deck, speaking. User says shot is good and clean; spoken content extends through part of “can't know what happ…”
- **State:** ACCEPTED SOURCE / EDIT NOT YET APPROVED. Never confuse with Gemini Scene 8, which user says is generating.
- **Edit instruction:** Align to master ElevenLabs narration; trim handle and transition to Scene 8 on a verified audio cue, without dropping/duplicating syllables. Preserve original upload.
- **Process correction:** Every user-delivered source must immediately be assigned scene ID, canonical filename, content summary, SHA-256, approval state, storage URL, and timeline relationship; update manifest and global ledger before claiming progress.

## Scene 8 intake — 2026-11-12
- Scene ID: `CH03-INTRO-SC08`; user upload: `20261112_014737170.mp4`; canonical: `GS_CH03_INTRO_SC08_GEMINI_DOCTOR_DOCUMENTATION_SOURCE_20261112_014737170.mp4`.
- Google Drive file ID: `1A2-P3EFX2bOnHi_5fpKPV1De3BvPRn2J`; folder: `1SqWwugwUMsGpjQQXoIG8EoYTUBTcsSza`.
- Source SHA-256: `c7aadd29e44dee497baf7235b36f3a98c9ca9c16a34036a222089151d3d38fca`; 6.041667 seconds, 1080x1920, 6,663,161 bytes, H.264/AAC.
- Visual: doctor documenting symptoms; overlay at 5s: 'Tell your doctor / Get it documented'.
- Status: SOURCE RECEIVED, REVIEW PENDING; not yet approved or stitched. Preserve upload unmodified. Scene 7 `19306.mp4` remains separate and indexed.

## Cumulative intro through Scene 7 — indexed 2026-11-12
- User-delivered file: `19309.mp4`, duration **48.600 s**, 25,500,458 bytes, SHA-256 `84ce866be05570d0ec1c80a491aa504933ef9687265670cf48105167cfe77e5c`.
- Canonical: `GS_CH03_INTRO_THRU_SC07_ACCEPTED_19309.mp4`.
- Verified Google Drive file ID: `1fagV_NcPSKhIUNqrPSFZFpsxAJ5g7hwF`; production folder `1SqWwugwUMsGpjQQXoIG8EoYTUBTcsSza`.
- State: **USER-ACCEPTED CUMULATIVE REVIEW THROUGH SC07**, not final master. Preserve exact original bytes; Scene 8 remains separate, clean footage pending.
- On receipt: renamed, backed up, hashed, and entered in global ledger v3. Do not skip cumulative exports or substitute sources.

## Scene 8 — silent picture master (2026-11-12)
- Original upload: `19310.mp4` (6.041667 seconds; contains video and audio), SHA-256 `f45e45edbd1ef63c5ea4dc74c062fd34e30a450a23445b8c4116096659914832`.
- Derived canonical: `GS_CH03_INTRO_SC08_CLEAN_SILENT_19310.mp4`, SHA-256 `801a88bb189058e75056613581b9c4b0d4fa3aa2b9450c83597a498d992ebaf3`.
- Transformation: `ffmpeg -i 19310.mp4 -map 0:v:0 -c:v copy -an -movflags +faststart ...`; no video re-encoding; audio stream absent verified with ffprobe.
- Google Drive: `1oCHt0kJBj2WOhQXL2bni1u-VEvnPK7Mn`, Chapter 3 production folder. Original source remains preserved.
- Status: **SC08 CLEAN SILENT SOURCE SAVED**, pending approval and cumulative assembly with accepted through-Scene-7 cut. No captions or audio added.

## Element 9 intake — 2026-11-12
- Scene ID `CH03-INTRO-SC09`; original upload `20261112_021755973.mp4`; canonical `GS_CH03_INTRO_SC09_ACTION_PLAN_SOURCE_20261112_021755973.mp4`.
- Source 6.041667 seconds, 720×1280, includes audio stream; SHA-256 `1eb51907dfca38c83287b20cd0bd9bae8e930b6b69be3ef325311e0f2407cb31`; 4,184,996 bytes.
- Verified Drive ID `14boTcKyQUGiMlMP75sz7NIzGcQEwSyUV`, Chapter 3 production folder.
- Content inspection: older man reviewing information; later laptop patient-message/medication-list interface. Source UI text is not reliable medical guidance; review for visual accuracy before publication.
- State **RECEIVED / REVIEW PENDING**; no changes to colors, no automatic approval or assembly. Next action: user approval, then silent derivative if requested, then cumulative through Scene 9 with original narration.

## Scene 8–9 graphics and cumulative review — 2026-11-12
- Source 8: `GS_CH03_INTRO_SC08_CLEAN_SILENT_19310.mp4`, source 9: `20261112_021755973.mp4`; original source files unchanged.
- Intermediate: `GS_CH03_INTRO_SC08_SC09_GRAPHICS_REVIEW.mp4`, 12.083 seconds; restrained editorial overlay typography (separate derived video). **REVIEW, NOT APPROVED.**
- Cumulative master input: user-accepted `19309.mp4` through Scene 7, 48.60 seconds.
- Cumulative review output: `GS_CH03_INTRO_THRU_SC09_GRAPHICS_REVIEW.mp4`, 60.68 seconds, Drive ID `1uSUTwmYwyxqmKuLbz5lF9Asg-LLziHSi`.
- Audio: original Part B continuation starting at ~29.678 s after cumulative SC07; last ~1.25 s silence as original narration ends. Exact visual-to-word alignment and transition to closing scene require user review.
- No color correction, no new HeyGen or Gemini credits. Preserve approved through-SC07 source. Status **PENDING USER APPROVAL**.
