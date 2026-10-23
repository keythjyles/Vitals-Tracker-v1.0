# Reaction library checkpoint — 2026-10-22

The Vitals Tracker GitHub Pages factory is the manual production workspace. Open factory.html?view=reaction. The prior tools/reactions/index.html entry redirects here.

## Completed

- 42 categorized reaction entries: 28 existing entries, three requested cuts, two additional Drive sources, and nine cuts from existing HeyGen renders.
- 13 relevant existing HeyGen renders inspected. Four matched existing archived sources by SHA-256; two captioned productions retained in Performance video for editing. One additional night fireside shot is in B-roll.
- Every reaction has starting pose, ending pose, movement, expression, framing, scene, visible mouth behavior and sound classification. Labels are based on sampled frames, with denser samples around selected trim boundaries; approval still requires complete playback.
- All 41 silent working reactions have no audio stream. The six-second Did you hear that? retains audio, and the wizard offers an explicit Keep reaction audio control for it.
- Six pre-existing/requested approvals preserved. The remaining 36 entries require review. Categorization does not grant approval. Facepalms remain Review.
- Sources, original titles/hashes, original working copies and exact selected source time ranges are retained when available. Source page links point to HeyGen or Drive. Different crops and durations remain separate variants.
- Folder organization, import, rename, duplicate, soft delete/restore, editing queue, pose filters, profile editing, jokelet wizard, publication builder and SxLock handoff migrated together.
- Four reaction-only backup ZIP parts saved in the production Dad Jokes Drive folder. Extract all four into one directory to recover the processed reaction MP4s and posters. The catalog also references other production assets that stay on GitHub; these ZIPs are an archive, not the wizard's JSON project-import format.

## Verification

87 catalog entries reference existing media files. All 42 profiles are populated. Silent-stream checks passed. Browser checks confirmed 42 displayed reactions, four Facepalm filter matches, one Spoken match, six Approved matches, and spoken audio retained through audio/performance/reaction wizard selection. Full export on a physical Android phone has not been retested in this migration.

## Remaining reconciliation

This checkpoint does not certify an exhaustive Drive inventory. The main archive folder read was capped at 100 children. Checked production locations include Grill Sergeant, Dad Jokes, Episode 2, original frame cuts and the JokeLab production folder. Additional unnamed/older Drive renders can still be discovered and compared with source hashes. The HeyGen lookup returned 100 records; targeted reaction, silent-acting and deadpan candidates were inspected. Unrelated long dialogue productions were not exhaustively mined for possible reaction fragments.

Some older source reactions contain visible mouth movement despite having no audio. Those entries are flagged for editing. The phone screen recording needs a clean source or crop. The two Corny Joke Reaction productions contain burned captions/title cards and are source material rather than clean reaction inserts. The elevator shot needs character/setting continuity review.

Device imports and edits persist in that browser. Save / share project exports a portable JSON with imported bytes; it is not automatic Drive synchronization. Existing bundled media is served from GitHub.

## Next production gate — 2026-10-22

1. Reconcile remaining Drive source folders against SHA-256 and source IDs before creating any duplicate catalog entry.
2. Keep categorized but unreviewed clips in Review; approval requires complete playback, including mouth motion and scene continuity.
3. Test Android Files picker, Google Drive provider picker, Save/share JSON, reaction audio checkbox, render, and download on a physical Galaxy device.
4. Preserve silent-reaction post-punchline holds, and do not burn publication thumbnails into clean jokelets.
5. Treat browser-local imports as unsynced until a portable project backup has been saved; never describe local edits as automatically uploaded to GitHub or Drive.

## Drive discovery verification — 2026-10-22

Connected Drive search verified Grill Sergeant folder ID `1XoaLyR8AqV0RhbcH13GCuV7uvvE3IeS-`, containing Dad Jokes, Hurricane psa, Auditions for elevenlabs audio, and Audio folders. Dad Jokes folder `1xvvS6Lh-R1qNtP1Bg0t2ljb76FhNfQFC` currently returns Ep 2 folder `1-Y1o-1bo0pm7oWuf_hexSHxOqTkxhwcH` as its direct child. The separate HeyGenVideos folder `1Er1uRrybddT1hmYNt4Yb3SLlmZn0NSdj` returned no direct children in this connector search. These results do not prove that other production folders or assets are absent; continue targeted discovery and hash reconciliation. Do not import unrelated search matches from medical or claims records.


## Follow-up workflow verification — 2026-10-22

Live GitHub Pages shows 42 categorized reactions, and the four processed-reaction ZIP backup parts were verified in the production Dad Jokes Drive folder.

Fixed two workflow defects: reaction selection/insertion now defaults to the complete reaction duration instead of truncating it to three seconds; SxLock's trusted handoff uses its internal loading route while controls are busy, avoiding a self-blocked video load. Versioned script links refresh cached code.

Cloud-browser verification used already approved Lifesavers audio/performance, the Straight stare reaction, and the approved Fireside CTA. A clean jokelet and MP4 publication assembly rendered successfully. The actual 18.561-second test assembly transferred to SxLock, was retained with its video bytes, and restored successfully after reloading SxLock. A separate selection check confirmed the full 4.280-second Straight stare and a 10.17-second planned clean jokelet. The test assembly was created before the duration-default fix; its transfer/recovery test is separate from that duration check.

No new paid HeyGen or ElevenLabs generation was started. This verifies the manual browser workflow. Physical Galaxy file/Drive pickers, Android sharing and phone-specific render/export behavior remain unverified here. Remaining source discovery and 36 review approvals are still outstanding; this follow-up does not certify every scattered Drive source has been collected.


## Source and recovery audit — October 22, 2026

Direct folder fetching found 70 MP4s in HeyGenVideos despite the earlier search returning no files. They are an unreviewed queue; equal file sizes do not prove duplicates. The scoped Drive inventory covers 21 known production folders and 200 unique non-folder records, not every file in both accounts.

All 87 bundled assets and referenced working files, preserved originalSrc files and posters passed checksum verification. Source IDs are recorded for 76 assets; 11 still need an original source ID. Six full recovery ZIPs were uploaded and verified by Drive file size and parent folder. Archived contents passed local SHA-256 verification. These cover tools-home, not later browser-only projects. Export now reports cancelled sharing and records an export request; confirm the file in Drive separately. Sources & recovery documents restoration, provenance and the render queue. SxLock projects must be separately exported.


## Operating method — October 23, 2026

[PRODUCTION_METHOD.md](PRODUCTION_METHOD.md) documents the Jokelet Engine working name, established creative doctrine, source-to-release recipe, approval and recovery requirements, optional anticipatory-listener cut, and the separate manuscript-led education workflow. [EPISODE_PROOF_LOG.md](EPISODE_PROOF_LOG.md) opens a proposed initial three-episode validation batch. All new proof slots are Not run; the earlier manual flow test remains separate evidence. No paid generation, episode release or new automation is implied by this documentation.
