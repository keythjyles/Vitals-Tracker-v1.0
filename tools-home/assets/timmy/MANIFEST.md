# Timmy Asset Manifest

Canonical folder: `tools-home/assets/timmy/`

| Asset | Status | Notes |
|---|---|---|
| CHARACTER_BIBLE.md | COMMITTED | Character design, animation doctrine, naming and mandatory storage rules |
| 16859.png | NOT UPLOADED | Side-view walking reference attached in chat |
| 16860.png | NOT UPLOADED | Front/three-quarter waving reference attached in chat |
| GS_BEE_TIMMY_RETURN_FULL_v04.mp4 | NOT UPLOADED | 66.58-second review video, linked in chat; frame 843 hard cutoff |

For each future Timmy asset, record path, version, transparency, dimensions, scene timing and approval. Upload to this folder in the same work session.

| PRODUCTION_HANDOFF.md | COMMITTED | Cross-chat resume guide, timing, asset status and next actions |
| Generated Timmy pose sheets (conversation) | NOT UPLOADED | Reference drafts; require clean individual alpha sprites |
| timmy_overlay_v04 frame sequence | NOT UPLOADED | Earlier review frames; whole-body rotation not approved |
| Front-wave / separate head-turn production sprites | NOT YET PRODUCED | Next production deliverable |

**AI discovery:** repository-root `AGENTS.md` links to this folder and requires reading all three documents before Timmy work. Do not mark media uploaded until its actual binary is verified in GitHub.


## Recovered assets and staged rig checkpoint — October 24, 2026

The original six transparent PNGs and legacy animation were found in `tools-home/assets/mascots/timmy/v01/`. Identical Git blobs are now copied into this canonical folder under `references/` and `animations/legacy/`; the original two references are also named `16859_original_v01.png` and `16860_original_v01.png`. Earlier NOT UPLOADED notes above describe the pre-audit state and are superseded for these references. Approved original two poses remain approved; four additional full-body poses remain Review. Preserve legacy history.

A new isolated head/body rig and 27–34s return-scene review have been rendered. Geometry checks cover one connected silhouette, fixed lower body during the reaction, full visibility at F700, and empty character frames from F843. The first crossfade test showed doubled outlines and was discarded; current motion uses one head texture with registered mesh deformation and foreground collar occlusion.

Committed at this checkpoint: the recovered references, three raw source layers (BODY_FRONT, HEAD_DOWN, HEAD_FRONT), registration/test metadata, and animation scripts. Remaining generated layers, frame archives and review binaries are being uploaded and are NOT yet claimed committed at this checkpoint.

Playable isolated review: https://chatgpt.com/library?file_id=libfile_1b7a23958af8819193b81ba192b4ed12&account_id=personal

Clean pre-Timmy master: `GS_BEE_THREE_PASS_FULL_VIDEO_v01.mp4`, recovered from Library `libfile_c5668c284ea48191bd031ec9fd2acd36`, 1080x1920, container/audio66.58s. Source encoded AAC SHA256 `7cd47a1e2ec277f4fde198210ec2f0bd055c840a7cbcfd3056e3caa641b760e1`. This source has variable frame timestamps despite nominal25fps; use the defined elapsed25fps production timeline. No v03–v06 plate is used. The mobile proxy download timed out twice; the small scene preview was made from the recovered high-quality clean master.

Full master NOT rendered. Current scene review and new artwork require user review; no publication approval is implied.
