from pathlib import Path
from PIL import Image,ImageOps
import importlib.util,numpy as np,cv2,json,shutil
P=Path(__file__).parent;O=P/'scene-frames';O.mkdir(exist_ok=True)
spec=importlib.util.spec_from_file_location('timmy_head_rig',P/'animate_rig.py');rig=importlib.util.module_from_spec(spec);spec.loader.exec_module(rig)
refs=P.parent/'references';walk={}
for n,key in [('Timmy_Profile_Right_Stride_A_v01.png','A'),('Timmy_Profile_Right_Passing_Step_v01.png','P'),('Timmy_Profile_Right_Stride_B_v01.png','B')]:walk[key]=ImageOps.mirror(Image.open(refs/n).convert('RGBA'))
source=Path('generated_images/exec-facb20ca-6ff7-4cc1-b628-e336df6b0667.png');shutil.copy2(source,P/'source/TIMMY_STAND_THREEQUARTER_LEFT_v01.png');quarter=Image.open(source).convert('RGBA')
def bbox(im):return im.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
def place_art(canvas,im,cx):
 b=bbox(im);scale=360/(b[3]-b[1]);q=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS);canvas.alpha_composite(q,(round(cx-(b[0]+b[2])/2*scale),round(1810-b[3]*scale)))
base=rig.body.copy();base.alpha_composite(rig.head('FRONT','FRONT',0));base.alpha_composite(rig.collar);bb=bbox(base);scale=360/(bb[3]-bb[1]);size=(round(base.width*scale),round(base.height*scale));fixed=(round(930-450*scale),round(1810-bb[3]*scale));checks=[];stationary=None
for relative in range(175):
 f=675+relative;frame=Image.new('RGBA',(1080,1920));stage='absent'
 if f<700:
  u=relative/25;s=u*u*(3-2*u);cx=1220+(930-1220)*s;key=['A','P','B','P'][(relative//3)%4];place_art(frame,walk[key],cx);stage='walk-in'
 elif f<708:place_art(frame,quarter,930);stage='turn-threequarter'
 elif f<843:
  if f<715:a,b,v='LEFT','FRONT',(f-708)/7;stage='turn-front'
  elif f<730:a,b,v='FRONT','DOWN',(f-715)/15;stage='chin-dip'
  elif f<738:a,b,v='DOWN','LEFT',(f-730)/8;stage='head-shake'
  elif f<833:a,b,v='LEFT','RIGHT',.5-.5*np.cos(2*np.pi*(f-738)/(25*1.65));stage='head-shake'
  else:a,b,v='RIGHT','FRONT',(f-833)/10;stage='settle'
  actor=rig.body.copy();actor.alpha_composite(rig.head(a,b,float(v)));actor.alpha_composite(rig.collar)
  if f>=715:
   low=np.array(actor)[950:]
   if stationary is None:stationary=low.copy()
   assert np.array_equal(stationary,low),'Body moved while head reacted'
  frame.alpha_composite(actor.resize(size,Image.Resampling.LANCZOS),fixed)
 bounds=bbox(frame)
 if 700<=f<843:assert bounds and 0<=bounds[0]<bounds[2]<=1080 and bounds[3]<1920,('Clipped',f,bounds)
 if f>=843:assert bounds is None,('Remnant after cut',f)
 target=O/f'{relative:04d}.png';tmp=target.with_suffix('.tmp.png');frame.save(tmp,compress_level=1);tmp.replace(target);checks.append({'frame':f,'stage':stage,'bounds':bounds})
(P/'scene-checks.json').write_text(json.dumps({'start_frame':675,'end_frame_exclusive':850,'fps':25,'actor_end_frame_exclusive':843,'source_time_range':[27,34],'stopped_center_x':930,'feet_baseline_y':1810,'visible_height':360,'stationary_body_verified_from':715,'headshake_starts':730,'hard_cutoff':843,'results':checks},indent=2)+'\n');print('PASS175 scene frames; planted body, entire stopped figure visible, hard cutoff F843',flush=True)
