// SxLock export engine R25. Media timestamps are the clock; preview playback is never recorded.
import {
  Input, ALL_FORMATS, BlobSource, Output, BufferTarget, Mp4OutputFormat, WebMOutputFormat,
  EncodedPacketSink, EncodedVideoPacketSource, EncodedAudioPacketSource,
  VideoSampleSink, VideoSampleSource, AudioBufferSink, AudioBufferSource, Quality,
  canEncodeAudio, canEncodeVideo,
} from './vendor/mediabunny-1.62.1.mjs';

export const SAMPLE_RATE = 48000;
const CHUNK_FRAMES = 8 * SAMPLE_RATE;
const MAX_AUDIO_BYTES = 96 * 1024 * 1024;
let aacFallback;

function check(cancelled) {
  if (cancelled?.()) throw new Error('Export cancelled. Saved placements are preserved.');
}

export async function inspectVideo(track, cancelled) {
  const timestamps = [];
  let end = 0;
  for await (const packet of new EncodedPacketSink(track).packets(undefined, undefined, { metadataOnly: true })) {
    check(cancelled);
    timestamps.push(packet.timestamp);
    end = Math.max(end, packet.timestamp + packet.duration);
  }
  timestamps.sort((a, b) => a - b);
  if (!timestamps.length || !Number.isFinite(end) || end <= 0) throw new Error('Video has no valid frames.');
  return { timestamps, end, count: timestamps.length };
}

export function isCfr(timestamps, fps) {
  // Check every PTS, including reordered B-frames, rather than nominal container FPS.
  return timestamps.every((t, i) => Math.abs(t - i / fps) <= 0.000002);
}

async function decodeSoundtrack(track, duration, cancelled) {
  if (!track) return null;
  const sampleRate = await track.getSampleRate();
  const channels = await track.getNumberOfChannels();
  const frames = Math.ceil(duration * sampleRate);
  if (channels > 2) throw new Error('This soundtrack has more than two channels. Prepare a stereo master first.');
  if (frames * channels * 4 > MAX_AUDIO_BYTES) {
    throw new Error('This soundtrack exceeds the safe phone mixing limit. Use a shorter source or export effects-only WAV.');
  }
  const original = new AudioBuffer({ length: frames, numberOfChannels: channels, sampleRate });
  // Honour edit lists/priming and each decoded buffer's PTS. Never append buffers to erase an offset or a gap.
  for await (const item of new AudioBufferSink(track).buffers()) {
    check(cancelled);
    if (item.buffer.sampleRate !== sampleRate) throw new Error('Soundtrack sample rate changes inside the source.');
    const position = Math.round(item.timestamp * sampleRate);
    const from = Math.max(0, -position), to = Math.max(0, position);
    const length = Math.min(item.buffer.length - from, frames - to);
    if (length <= 0) continue;
    for (let c = 0; c < channels; c++) {
      original.getChannelData(c).set(item.buffer.getChannelData(c).subarray(from, from + length), to);
    }
  }
  return original;
}

function assertMix(buffer) {
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    for (const x of buffer.getChannelData(c)) {
      if (!Number.isFinite(x) || Math.abs(x) > 1) {
        throw new Error('Mix exceeds full scale. Lower overlapping volumes. No normalization was applied.');
      }
    }
  }
}

async function ensureAudioEncoder(codec) {
  if (codec !== 'aac') {
    if (await canEncodeAudio(codec, { sampleRate: SAMPLE_RATE, numberOfChannels: 2 })) return 0;
    throw new Error('This browser cannot encode the selected audio format.');
  }
  // Probe native support directly: canEncodeAudio also sees globally registered custom encoders.
  // An earlier import of this engine must not make the fallback look like a zero-delay native encoder.
  let native = false;
  try { native = (await globalThis.AudioEncoder?.isConfigSupported({ codec: 'mp4a.40.2',
    sampleRate: SAMPLE_RATE, numberOfChannels: 2, bitrate: 256000 }))?.supported; } catch {}
  if (native) return 0;
  // Local pinned fallback, no paid service, network request or native AAC requirement.
  aacFallback ||= import('./vendor/mediabunny-aac-encoder-1.62.1.mjs').then(m => m.registerAacEncoder());
  await aacFallback;
  if (!(await canEncodeAudio(codec))) throw new Error('AAC encoder unavailable in this browser.');
  // Pinned fallback 1.62.1 emits FFmpeg's priming packet at input PTS instead of its negative PTS.
  // Offset this encoder only. MP4 edit lists trim its 1024-sample lead-in; native encoders keep their own PTS.
  return 1024;
}

function createInput(file) {
  return new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
}

/**
 * Effects are independently scheduled by placeEffects on a fresh OfflineAudioContext per chunk.
 * That callback cannot access/move the original soundtrack source.
 */
export async function exportVideo({ file, fps = 25, size = 'original', format = 'mp4',
  soundtrackGain = 1, hasEffects = false, placeEffects = async () => {},
  cancelled, onProgress = () => {}, onPhase = () => {} }) {
  if (!(file instanceof Blob)) throw new Error('Load an original video first.');
  if (!Number.isInteger(fps) || fps < 1 || fps > 60) throw new Error('Invalid output frame rate.');
  if (!['original', '720'].includes(size) || !['mp4', 'webm'].includes(format)) throw new Error('Invalid export settings.');
  if (!Number.isFinite(soundtrackGain) || soundtrackGain < 0 || soundtrackGain > 1) throw new Error('Invalid soundtrack level.');
  const input = createInput(file);
  let output, succeeded = false;
  try {
    check(cancelled);
    onPhase('Checking original video');
    const video = await input.getPrimaryVideoTrack();
    if (!video) throw new Error('Source contains no readable video track.');
    const audio = await input.getPrimaryAudioTrack();
    const timing = await inspectVideo(video, cancelled);
    const width = await video.getDisplayWidth(), height = await video.getDisplayHeight();
    const videoCodec = format === 'mp4' ? 'avc' : 'vp9';
    const audioCodec = format === 'mp4' ? 'aac' : 'opus';
    const scale = size === '720' ? Math.min(1, 720 / width) : 1;
    const copyVideo = video.codec === videoCodec && scale === 1 && isCfr(timing.timestamps, fps)
      && Math.abs(timing.end - timing.count / fps) <= 0.000002;
    const copyAudio = !!audio && audio.codec === audioCodec && soundtrackGain === 1 && !hasEffects;
    const exactDuration = copyVideo ? timing.end : Math.ceil((timing.end - 0.000002) * fps) / fps;
    const report = { engine: 'SxLock-R25', fps, width, height, sourceFrames: timing.count,
      duration: exactDuration, video: copyVideo ? 'packet-copy' : 'offline-encode',
      audio: copyAudio ? 'packet-copy' : 'sample-mix', sampleRate: SAMPLE_RATE,
      colorSpace: await video.getColorSpace(), pictureResized: scale !== 1 };
    // A true no-op is byte-identical, including codec configuration, colour metadata and encoder delay.
    if (copyVideo && copyAudio && (await input.getFormat()).name === 'MP4' && format === 'mp4') {
      check(cancelled); onProgress(1);
      return { blob: file.slice(0, file.size, 'video/mp4'), report: { ...report, outputFrames: timing.count,
        video: 'file-copy', audio: 'file-copy' } };
    }
    const decoderConfig = await video.getDecoderConfig();
    if (!decoderConfig) throw new Error('Source video codec is unsupported.');
    if (!copyVideo) {
      if (['pq', 'hlg', 'smpte2084', 'arib-std-b67'].includes(report.colorSpace.transfer)) {
        throw new Error('HDR conversion needs a validated SDR master. The original is preserved.');
      }
      if (!(await canEncodeVideo(videoCodec))) throw new Error('This browser cannot encode this picture change. Use an original-size 25 fps H.264 master.');
    }
    const target = new BufferTarget();
    output = new Output({ target, format: format === 'mp4'
      ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat() });
    const videoSource = copyVideo ? new EncodedVideoPacketSource(videoCodec) : new VideoSampleSource({
      codec: videoCodec, quality: new Quality({ quantizer: 18, bitrate: Math.max(6e6, width * height * fps * 0.2) }),
      latencyMode: 'quality', keyFrameInterval: 2,
      transform: scale === 1 ? undefined : { width: Math.round(width * scale / 2) * 2, height: Math.round(height * scale / 2) * 2 },
    });
    output.addVideoTrack(videoSource, { decoderConfig: copyVideo ? decoderConfig : undefined,
      rotation: await video.getRotation(), frameRate: fps });
    let audioSource;
    if (copyAudio) audioSource = new EncodedAudioPacketSource(audioCodec);
    else if (audio || hasEffects) {
      const priming = await ensureAudioEncoder(audioCodec);
      report.encoderPrimingSamples = priming;
      audioSource = new AudioBufferSource({ codec: audioCodec, quality: new Quality({ bitrate: 256000 }) },
        { startTimestamp: -priming / SAMPLE_RATE });
    }
    if (audioSource) output.addAudioTrack(audioSource);
    onPhase('Preparing soundtrack');
    const original = !copyAudio && soundtrackGain > 0 ? await decodeSoundtrack(audio, exactDuration, cancelled) : null;
    await output.start();
    const videoPackets = copyVideo ? new EncodedPacketSink(video).packets() : null;
    const copyAudioPackets = copyAudio ? new EncodedPacketSink(audio).packets() : null;
    const audioConfig = copyAudio ? await audio.getDecoderConfig() : null;
    let v = videoPackets ? await videoPackets.next() : null;
    let a = copyAudioPackets ? await copyAudioPackets.next() : null;
    let firstVideo = true, firstAudio = true, renderedFrames = 0;
    const totalAudioFrames = Math.round(exactDuration * SAMPLE_RATE);
    const videoSink = copyVideo ? null : new VideoSampleSink(video);
    let nextFrame = 0;
    onPhase(copyVideo ? 'Preserving video and mixing sound' : 'Encoding frames and mixing sound');
    // Interleave at fixed timeline boundaries. Work may run at any wall-clock speed.
    for (let first = 0; first < totalAudioFrames; first += CHUNK_FRAMES) {
      check(cancelled);
      const length = Math.min(CHUNK_FRAMES, totalAudioFrames - first);
      const at = first / SAMPLE_RATE, end = (first + length) / SAMPLE_RATE;
      if (copyVideo) {
        while (!v.done && (v.value.timestamp < end || first + length === totalAudioFrames)) {
          check(cancelled);
          await videoSource.add(v.value, firstVideo ? { decoderConfig } : undefined);
          firstVideo = false; renderedFrames++; v = await videoPackets.next();
        }
      } else {
        while (nextFrame < Math.round(exactDuration * fps) && nextFrame / fps < end - 0.000002) {
          check(cancelled);
          const timestamp = nextFrame / fps;
          const sample = await videoSink.getSample(Math.min(timestamp, timing.end - 0.000002));
          if (!sample) throw new Error('Missing source frame at ' + timestamp.toFixed(3) + 's.');
          try { sample.setTimestamp(timestamp); sample.setDuration(1 / fps); await videoSource.add(sample); }
          finally { sample.close(); }
          nextFrame++; renderedFrames++;
        }
      }
      if (copyAudio) {
        while (!a.done && (a.value.timestamp < end || first + length === totalAudioFrames)) {
          check(cancelled);
          await audioSource.add(a.value, firstAudio ? { decoderConfig: audioConfig } : undefined);
          firstAudio = false; a = await copyAudioPackets.next();
        }
      } else if (audioSource) {
        const offline = new OfflineAudioContext(2, length, SAMPLE_RATE);
        if (original && at < original.duration) {
          const source = offline.createBufferSource(), gain = offline.createGain();
          source.buffer = original; gain.gain.value = soundtrackGain;
          source.connect(gain).connect(offline.destination);
          source.start(0, at, Math.min(length / SAMPLE_RATE, original.duration - at));
        }
        await placeEffects(offline, at, end);
        check(cancelled);
        const mixed = await offline.startRendering();
        assertMix(mixed);
        await audioSource.add(mixed);
      }
      onProgress(Math.min(0.99, (first + length) / totalAudioFrames));
      await new Promise(r => setTimeout(r, 0));
    }
    check(cancelled);
    videoSource.close(); audioSource?.close();
    onPhase('Finalizing synchronized file');
    await output.finalize();
    check(cancelled);
    const blob = new Blob([target.buffer], { type: format === 'mp4' ? 'video/mp4' : 'video/webm' });
    onPhase('Validating export');
    const verified = createInput(blob);
    try {
      const resultVideo = await verified.getPrimaryVideoTrack();
      const actual = await inspectVideo(resultVideo, cancelled);
      if (actual.count !== renderedFrames || !isCfr(actual.timestamps, fps)
          || Math.abs(actual.end - exactDuration) > 0.0001) throw new Error('Export failed video timing validation.');
      const resultAudio = await verified.getPrimaryAudioTrack();
      if (audioSource && (!resultAudio || Math.abs((await resultAudio.computeDuration()) - exactDuration) > 0.04)) {
        throw new Error('Export failed audio duration validation.');
      }
      report.outputFrames = actual.count;
      report.outputWidth = await resultVideo.getDisplayWidth();
      report.outputHeight = await resultVideo.getDisplayHeight();
      if (report.outputWidth !== Math.round(width * scale / 2) * 2
          || report.outputHeight !== Math.round(height * scale / 2) * 2) {
        throw new Error('Export failed picture size validation.');
      }
      report.outputColorSpace = await resultVideo.getColorSpace();
      if (copyVideo && ['matrix','primaries','transfer','fullRange'].some(k => report.outputColorSpace[k] !== report.colorSpace[k])) {
        throw new Error('Export failed colour metadata validation.');
      }
    } finally { verified.dispose(); }
    succeeded = true; onProgress(1);
    return { blob, report };
  } finally {
    if (output && !succeeded) await output.cancel().catch(() => {});
    input.dispose();
  }
}
