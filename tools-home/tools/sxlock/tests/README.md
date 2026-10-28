# SxLock export regression

Requirements: Node 24, Playwright 1.62.1 with Chromium, Python 3.12, NumPy, SciPy and FFmpeg/FFprobe. CI uses only generated public fixtures; no owner media, browser project, credential or paid service.

```bash
python tools-home/tools/sxlock/tests/make_fixtures.py /tmp/sx-media
DATA_DIR=/tmp/sx-media node tools-home/tools/sxlock/tests/media-regression.cjs
python tools-home/tools/sxlock/tests/measure_regression.py /tmp/sx-media
```

Set `PLAYWRIGHT_MODULE` and optionally `BROWSER_EXECUTABLE` when using a managed runtime. The browser driver runs the shipped engine, `placeSource`, frame placement, real file input, export handler and file download. It uses the original soundtrack and independent effects; file comparison is performed separately with FFmpeg, not inferred from UI status.

Checks: no-op C; single D; multiple E; overlapping F; F863 G; moved/deleted cues; export/reimport H; cancellation/retry; source 44.1 kHz; a positive audio PTS offset; 30→25 fps conversion; full-range BT.709; 1000-frame count, exact encoded video payloads, byte-identical no-op/repeat export, and decoded speech correlation around start/middle/chunk boundaries/F863/end. Effects occupy 2.7 kHz; speech timing is independently measured below 1.5 kHz so the intentional additions do not invalidate the comparison. Allowed audio timing error is at most two samples, approximately 0.042 ms.

Optional `TEST_BASELINE=1` compares the original SxLock capture and unchanged AspectLock. Put the selected baseline SxLock HTML/JS under `<DATA_DIR>/baseline/tools-home/tools/sxlock/`; other unchanged dependencies fall back to the checkout. `BASELINE_ONLY=1` runs just this control. It disables the AspectLock overlay by moving its start beyond the test, preserving the same base frame. A desktop codec result is not an Android codec result.

Physical Android playback/native AAC, sharing and the historical red cast still require owner-device verification. CI/browser emulation does not establish those facts.

R26 adds a 30fps source with audio ending before video. A copied soundtrack is checked against its own source end and must remain packet-copied. Required video conversion uses one sequential timestamp iterator; this retains colour and timing while avoiding repeated GOP decoding.

R26 also generates a real full-range alpha VP8 WebM with MediaRecorder, matching AspectLock's format. It asserts an alpha sample is present, compares the HTML-video preview to the decoded VideoFrame (MAE≤0.1), compares the finished H.264 display (mean channel bias≤1.5/255 and MAE≤4), and independently verifies colour range/matrix/transfer/primaries with FFprobe. This catches metadata lost while rebuilding alpha frames, before an encoder bakes in a red/contrast shift.

R27 adds `node tools-home/tools/sxlock/tests/library-playhead.cjs` after fixture generation. Its isolated browser recovers old audio-only IndexedDB rows using project/back-up names, recovers an orphan without guessing its name, keeps a standalone microphone take, verifies approved and repository-uploaded availability, imports audio before any video, reloads, switches projects without dropping the library, and checks explicit deletion stays deleted. No owner browser data is accessed. First-play and restart checks cover MP4, durationless WebM, and a controlled browser-duration delay. The delay overrides only the test element's metadata getter; real media and time continue normally. The corrected slider must follow currentTime without reaching the end early. `OBSERVE_ONLY=1 REPO_DIR=/path/to/R26` records the prior failure without asserting recovery. `LIVE_URL` runs the same disposable test against the deployed app.
