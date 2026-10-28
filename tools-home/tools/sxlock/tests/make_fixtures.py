from pathlib import Path
import subprocess,wave,numpy as np,sys
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
root.mkdir(parents=True,exist_ok=True)
def run(args): subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*args],check=True)
sr=48000;n=40*sr;t=np.arange(n)/sr
rng=np.random.default_rng(415)
noise=rng.normal(0,.008,n)
signal=.065*np.sin(2*np.pi*(180*t+35*np.sin(t*.7)))+.045*np.sin(2*np.pi*421*t)+noise
stereo=np.stack([signal,signal*.8+.01*np.sin(2*np.pi*733*t)],1)
with wave.open(str(root/'reference.wav'),'wb') as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((stereo*32767).astype('<i2').tobytes())
run(['-f','lavfi','-i','testsrc2=size=270x480:rate=25:duration=40','-i',str(root/'reference.wav'),'-c:v','libx264','-threads','2','-preset','fast','-crf','16','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-c:a','aac','-b:a','256k','-ar','48000','-movflags','+faststart',str(root/'fixture_40s.mp4')])
# Exact full-range BT.709 static colour control, independent of private production media.
run(['-f','lavfi','-i','testsrc2=size=540x960:rate=25:duration=4','-i',str(root/'reference.wav'),'-t','4','-c:v','libx264','-threads','2','-preset','fast','-crf','16','-pix_fmt','yuvj420p','-color_range','pc','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(root/'color_full709.mp4')])
run(['-i',str(root/'fixture_40s.mp4'),'-t','6','-c:v','copy','-c:a','aac','-ar','44100','-b:a','192k',str(root/'fixture_44100.mp4')])
run(['-i',str(root/'fixture_40s.mp4'),'-t','6','-r','30','-c:v','libx264','-threads','2','-crf','16','-c:a','copy',str(root/'fixture_30fps.mp4')])
run(['-i',str(root/'fixture_40s.mp4'),'-i',str(root/'fixture_40s.mp4'),'-map','0:v:0','-map','1:a:0','-t','6','-af','atrim=start=0:end=5,asetpts=PTS-STARTPTS+1/TB','-c:v','copy','-c:a','aac','-b:a','192k',str(root/'fixture_audio_offset.mp4')])
print('Created timing, colour, 44.1 kHz, 30 fps and offset fixtures.')

run(['-i',str(root/'fixture_30fps.mp4'),'-af','atrim=end=5.88','-c:v','copy','-c:a','aac','-b:a','192k',str(root/'fixture_30fps_short_audio.mp4')])
