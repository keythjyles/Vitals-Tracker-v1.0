# Short-clip regression fixture

short-portrait.mp4 is a 42 KB, two-second, 50-frame, 25 fps, 180×320 video-only QA derivative. It is a codec test asset, not a production master or the owner’s Episode 4 source. F5–10 exposed a dropped frame when forced frame-rate resampling rounded an offset timestamp down. Both MP4 and WebM must preserve all five frames and their full 0.2-second duration.

Preserve native sample timing. Declaring CFR cadence on the output track supplies exact container time units without resampling. Do not weaken frame/duration/audio/alpha verification to make this case pass.
