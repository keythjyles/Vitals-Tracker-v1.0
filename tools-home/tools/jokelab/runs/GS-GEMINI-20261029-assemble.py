"""Rebuild the controlled GS single; source files are never overwritten.
Usage: python GS-GEMINI-20261029-assemble.py --voice approved.wav --reaction original.mp4 --out new-directory
Caption boundaries are an editorial draft until playback review; exact words remain editable.
"""
import argparse, hashlib, json, subprocess, wave, os
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

p=argparse.ArgumentParser();p.add_argument('--voice',required=True);p.add_argument('--reaction');p.add_argument('--existing-master',action='store_true');p.add_argument('--caption-only',action='store_true');p.add_argument('--out',required=True);p.add_argument('--reaction-in-frame',type=int,default=0);a=p.parse_args()
repo=Path(__file__).resolve().parents[4];out=Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True)
if any(out.iterdir()):raise RuntimeError('Use a NEW empty output directory')
voice=Path(a.voice).resolve();reaction=Path(a.reaction).resolve() if a.reaction else None;master=repo/'tools-home/tools/jokelets/media/GS_Jokelet_Pebble_Straight_Stare_v01.mp4'
sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
assert sha(voice)=='09519972b493e2ec472b4114972c116905fc21204bf1d6c748b09230439f9879'
assert sha(master)=='8d85a1af2e7885e26d54476a5d888f01f108eae22abbff84e02fc2a7efd8647e'
def run(*args):subprocess.run(['ffmpeg','-v','error','-nostdin','-n',*map(str,args)],check=True)
def decode_audio(path):
 b=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','1','-ar','48000','-'],capture_output=True,check=True).stdout
 return np.frombuffer(b,dtype='<f4').copy()
def wav(name,samples):
 with wave.open(str(out/name),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(48000);f.writeframes((np.clip(samples,-1,1)*32767).astype('<i2').tobytes())
def loop_crossfade(x,n):
 fade=12000;result=x.copy()
 while len(result)<n:
  w=np.linspace(0,1,fade,dtype=np.float32);result=np.concatenate([result[:-fade],result[-fade:]*(1-w)+x[:fade]*w,x[fade:]])
 return result[:n]
total_frames=241 if a.existing_master else 250;N=round(total_frames/25*48000);speech=np.zeros(N,dtype=np.float32);v=decode_audio(voice);speech[:len(v)]=v
ambient=np.zeros(N,dtype=np.float32);sources=[]
for name,gain in ([] if a.caption_only else [('esc-crackling-fire.mp3',0.14),('esc-crickets.mp3',0.02)]):
 f=repo/'tools-home/tools/sxlock/sounds'/name;ambient+=loop_crossfade(decode_audio(f),N)*gain;sources.append({'path':str(f.relative_to(repo)),'sha256':sha(f),'linearGain':gain,'loopCrossfadeSamples':12000})
# Short audio-only edge fades avoid clicks. Picture and full reaction remain intact.
ramp=960;ambient[:ramp]*=np.linspace(0,1,ramp);ambient[-ramp:]*=np.linspace(1,0,ramp)
wav('voice-stem.wav',speech);wav('ambient-stem.wav',ambient);wav('mix-stem.wav',speech+ambient)
start=a.reaction_in_frame/25
if a.existing_master:
 run('-i',master,'-map','0:v','-an','-c:v','copy','-movflags','+faststart',out/'clean-picture.mp4')
else:
 run('-i',master,'-i',reaction,'-filter_complex',f'[0:v]trim=start_frame=0:end_frame=134,setpts=PTS-STARTPTS,setsar=1[v0];[1:v]fps=25,trim=start={start}:duration=4.64,setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];[v0][v1]concat=n=2:v=1:a=0[v]','-map','[v]','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out/'clean-picture.mp4')
if a.caption_only:
 import shutil
 assert a.existing_master
 shutil.copyfile(master,out/'GS_Pebble_Collaboration_clean-bed_v01.mp4')
else:
 run('-i',out/'clean-picture.mp4','-i',out/'mix-stem.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',out/'GS_Pebble_Collaboration_clean-bed_v01.mp4')
cues=[{'id':'pebble-setup','inFrame':6,'outFrame':56,'text':'What did the shy pebble wish for?','lines':['WHAT DID THE','SHY PEBBLE WISH FOR?']},{'id':'pebble-payoff-lead','inFrame':91,'outFrame':116,'text':'That she was a little','lines':['THAT SHE WAS','A LITTLE']},{'id':'pebble-payoff','inFrame':116,'outFrame':134,'text':'BOULDER.','lines':['BOULDER.']}]
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';font=ImageFont.truetype(fontpath,58);frames=out/'caption-frames';frames.mkdir();word=0
for c in cues:
 c['words']=[]
 for text in c['text'].split():word+=1;c['words'].append({'id':f'pebble-w{word:02d}','text':text})
 c['timingReview']=True
for f in range(total_frames):
 im=Image.new('RGBA',(1080,1920),(0,0,0,0));d=ImageDraw.Draw(im)
 c=next((c for c in cues if c['inFrame']<=f<c['outFrame']),None)
 if c:
  for i,line in enumerate(c['lines']):
   age=f-c['inFrame'];scale=1+0.08*max(0,1-age/4) if c['id']=='pebble-payoff' else 1
   face=ImageFont.truetype(fontpath,round(58*scale)) if scale!=1 else font
   d.text((500,1050+72*i),line,font=face,fill='#ffd780' if c['id']=='pebble-payoff' else 'white',anchor='mt',stroke_width=4,stroke_fill='#101713')
 target=frames/f'{f:04d}.png';tmp=target.with_suffix('.tmp')
 with tmp.open('wb') as file:im.save(file,format='PNG');file.flush();os.fsync(file.fileno())
 tmp.replace(target)
 with Image.open(target) as checked:checked.verify()
for png in frames.glob('*.png'):
 with Image.open(png) as checked:checked.verify()
run('-framerate','25','-i',frames/'%04d.png','-c:v','libvpx-vp9','-lossless','1','-cpu-used','5','-row-mt','1','-threads','2','-pix_fmt','yuva420p','-auto-alt-ref','0','-an',out/'GS_Pebble_Captions_ALPHA_DRAFT_v01.webm')
run('-i',out/'GS_Pebble_Collaboration_clean-bed_v01.mp4','-framerate','25','-i',frames/'%04d.png','-filter_complex','[0:v][1:v]overlay=0:0:shortest=1[v]','-map','[v]','-map','0:a','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',out/'GS_Pebble_Collaboration_REVIEW_v01.mp4')
measured=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=nb_frames','-of','json',str(out/'GS_Pebble_Collaboration_REVIEW_v01.mp4')]))
assert int(measured['streams'][0]['nb_frames'])==total_frames,'Truncated picture: do not deliver'
recipe={'schema':'GS-Jokelet-Rebuild-2','runId':'GS-GEMINI-20261029-01','fps':25,'frames':total_frames,'target':'1080x1920','speed':1,'sources':{'approvedMaster':{'path':str(master.relative_to(repo)),'sha256':sha(master),'frames':[0,134]},'approvedVoice':{'driveId':'1-HrnqhQvBc-IZXmXLXnZCMBOhGvIoDPY','sha256':sha(voice)},'newReaction':None if a.existing_master else {'sha256':sha(reaction),'inFrameAt25fps':a.reaction_in_frame,'durationFrames':116,'sourcePreserved':True},'usesExistingApprovedMaster':a.existing_master},'ambient':sources,'captionCues':cues,'captionOnly':a.caption_only,'originalAudioCopiedUnchanged':a.caption_only,'captionTiming':'draft; speech onset/end silence anchors verified, word split still requires playback review','captionLayer':{'path':'GS_Pebble_Captions_ALPHA_DRAFT_v01.webm','independent':True,'alphaQA':'pending'},'reviewVideo':'GS_Pebble_Collaboration_REVIEW_v01.mp4','ownerApproval':False,'releaseReady':False,'outputs':[{'name':f.name,'bytes':f.stat().st_size,'sha256':sha(f)} for f in out.iterdir() if f.is_file()]}
(out/'rebuild-recipe.json').write_text(json.dumps(recipe,indent=2)+'\n')
print(json.dumps({'out':str(out),'frames':total_frames,'ownerApproval':False,'captionTimingReview':True}))
