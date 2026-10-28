# Pinned export dependencies

- `mediabunny-1.62.1.mjs`: unmodified minified ESM distribution from `mediabunny@1.62.1`.
- `mediabunny-aac-encoder-1.62.1.mjs`: minified ESM distribution from `@mediabunny/aac-encoder@1.62.1`; only the two bare module import specifiers are relocated to the adjacent pinned Mediabunny file. Embedded AAC WASM is unchanged.
- Both packages carry MPL-2.0; the adjacent LICENSE files are preserved. Upstream source, including AAC encoder source, bridge, FFmpeg build recipe and license information: https://github.com/Vanilagy/mediabunny/tree/v1.62.1 . Package source is also available in the corresponding npm source distributions. FFmpeg: https://ffmpeg.org/legal.html .

These assets load locally. No CDN, paid provider, service deployment or credential is required.

The fallback AAC encoder's `src/encoder.ts::emitPackets` uses a sequential packet timestamp instead of FFmpeg's returned `p.pts`. At 48 kHz this retains a 1024-sample priming lead-in. `export-engine.mjs::ensureAudioEncoder` compensates **this pinned fallback only**, using negative start PTS and the MP4 edit list. Native AAC uses its own timestamps. Regression tests measure the decoded file, including repeated/differently versioned module imports and the actual UI handler; do not remove compensation based on a duration-header check.

## GS1 alpha colour correction — R26

The active engine imports `mediabunny-1.62.1-gs1.mjs` and `mediabunny-aac-encoder-1.62.1-gs1.mjs`. Older files are retained for R25 rollback/cache compatibility. The AAC GS1 distribution only points its imports to the matching GS1 core.

Confirmed defect: core `media-sink.ts`'s `mergePlanarYuv` and `mergeNv12` copied colour planes into a new alpha frame, then constructed `VideoFrame` without `colorSpace`. A full-range source therefore became a default limited-range I420A frame, without changing its sample values. Treating those full-range values as limited range changed display colour. The fix adds `colorSpace: color.colorSpace` in those two constructors. It preserves the decoder's actual colour interpretation; it does not grade pixels or blindly replace output tags.

The complete changed MPL source is `source/media-sink-1.62.1-gs1.ts`; `source/alpha-colour-gs1.patch` contains the exact two additions. Other unchanged upstream source remains at the pinned upstream distribution/repository linked above. The GS1 core was produced by applying these same additions to the upstream bundled ESM, then minifying with esbuild0.25.12 (`--minify --format=esm --legal-comments=inline`). License notices are retained.

A native MediaRecorder alpha WebM regression compares its HTML-video display against the decoded VideoFrame and finished H.264 export. The decoded frame must match within0.1 RGB MAE; the export must retain all colour tags and stay within normal compression tolerance. Tests also include the owner's recovered AspectLock WebM control and MP4 reference. Merely changing a completed MP4's transfer tags did not correct the faulty conversion; repair is before encoding.
