# ClipLock · GS-TOOL-CLIPLOCK · R1

Quick video cutting with WavLock's load → IN/OUT → preview → name → save pattern. Isolated additive tool; existing editors/renderers are not modified. Reuses the studio picker, canonical cloud joke project, authenticated PreviewLock API and pinned GS1 media library.

Open a project, choose a video, mark IN and exclusive OUT using original frame timestamps, preview selection, then Save to project or Download clip. Sources and independently numbered caption components are available in Source / output. Original media is never overwritten. Save uploads/reuses original bytes first, saves the derived clip and a separate source-hash-bound cut recipe. Matching hashes/byte counts must be acknowledged by the existing server. Drive backup remains queued through the established workflow. No automatic timeline insertion or paid generation.

Offline WebCodecs conversion uses exact trim boundaries and refuses dropped audio/video tracks. Video frame count, duration, source dimensions and audio-track presence are checked after conversion. MP4 requires a native supported H.264/AAC encoder; WebM uses VP9/Opus and alpha keep. No AAC fallback timing is assumed. Unsupported encoders fail visibly. HDR requires a verified SDR source. Actual source picture/audio color/timing and alpha output need real-media/browser verification; metadata checks alone do not establish visual or auditory acceptance.

The existing 40 MB cloud per-file limit applies to originals and cuts. Local download is distinct from cloud save. Source load/project browsing never writes media. Working marks are temporary until a clip recipe saves; they do not change another module's playhead. A full studio session adapter is separate work.

Source baseline ac16a29694359ff328698a3bfca47d05b14fcb0f. New isolated feature branch; no backend, SxLock, AspectLock, CapLock or scheduling changes. Rollback removes this tool's launch entries/files, retaining all cloud originals/derived clips/recipes. Release is not production-verified until CI, browser and deployment receipts are recorded.
