# Pinned export dependencies

- `mediabunny-1.62.1.mjs`: unmodified minified ESM distribution from `mediabunny@1.62.1`.
- `mediabunny-aac-encoder-1.62.1.mjs`: minified ESM distribution from `@mediabunny/aac-encoder@1.62.1`; only the two bare module import specifiers are relocated to the adjacent pinned Mediabunny file. Embedded AAC WASM is unchanged.
- Both packages carry MPL-2.0; the adjacent LICENSE files are preserved. Upstream source, including AAC encoder source, bridge, FFmpeg build recipe and license information: https://github.com/Vanilagy/mediabunny/tree/v1.62.1 . Package source is also available in the corresponding npm source distributions. FFmpeg: https://ffmpeg.org/legal.html .

These assets load locally. No CDN, paid provider, service deployment or credential is required.

The fallback AAC encoder's `src/encoder.ts::emitPackets` uses a sequential packet timestamp instead of FFmpeg's returned `p.pts`. At 48 kHz this retains a 1024-sample priming lead-in. `export-engine.mjs::ensureAudioEncoder` compensates **this pinned fallback only**, using negative start PTS and the MP4 edit list. Native AAC uses its own timestamps. Regression tests measure the decoded file, including repeated/differently versioned module imports and the actual UI handler; do not remove compensation based on a duration-header check.
