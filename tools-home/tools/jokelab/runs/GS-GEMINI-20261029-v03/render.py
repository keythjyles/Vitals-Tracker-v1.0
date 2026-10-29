from pathlib import Path
import importlib.util,subprocess,json,hashlib,os
from PIL import Image
import argparse
p=argparse.ArgumentParser();p.add_argument('--master',required=True);p.add_argument('--out',required=True);a=p.parse_args()
root=Path(a.out).resolve();root.mkdir(parents=True,exist_ok=True)
if any(root.iterdir()):raise RuntimeError('Use a new empty output directory')
spec=importlib.util.spec_from_file_location('gemini_design',Path(__file__).with_name('gemini_design.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
frames=root/'frames';frames.mkdir(exist_ok=True)
for frame in range(241):
 im=mod.draw(frame)
 assert im.size==(1080,1920) and im.mode=='RGBA'
 target=frames/f'{frame:04d}.png'; temp=target.with_suffix('.tmp')
 with temp.open('wb') as f: im.save(f,format='PNG');f.flush();os.fsync(f.fileno())
 temp.replace(target)
 with Image.open(target) as checked: checked.load()
for f in sorted(frames.glob('*.png')):
 with Image.open(f) as checked: checked.load()
print('All241 frames rendered and decoded',flush=True)
master=Path(a.master).resolve()
assert hashlib.sha256(master.read_bytes()).hexdigest()=='8d85a1af2e7885e26d54476a5d888f01f108eae22abbff84e02fc2a7efd8647e'
def run(args):subprocess.run(['ffmpeg','-v','error','-nostdin','-y']+list(map(str,args)),check=True)
run(['-framerate','25','-i',frames/'%04d.png','-c:v','libvpx-vp9','-lossless','1','-cpu-used','5','-row-mt','1','-threads','2','-pix_fmt','yuva420p','-auto-alt-ref','0','-an',root/'GS_Pebble_Gemini_Captions_ALPHA_v03b.webm'])
run(['-i',master,'-framerate','25','-i',frames/'%04d.png','-filter_complex','[0:v][1:v]overlay=0:0:shortest=1[v]','-map','[v]','-map','0:a','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',root/'GS_Pebble_Gemini_Captions_REVIEW_v03b.mp4'])
print('Alpha and review rendered',flush=True)

for name in ['GS_Pebble_Gemini_Captions_ALPHA_v03b.webm','GS_Pebble_Gemini_Captions_REVIEW_v03b.mp4']:
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=nb_read_frames','-of','json',str(root/name)]))
 assert info['streams'][0]['nb_read_frames']=='241','Reject truncated output'
