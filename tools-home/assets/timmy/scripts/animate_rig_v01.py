from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,cv2,json,math
from scipy.spatial import Delaunay
P=Path(__file__).parent;R=P/'registered';F=P/'frames';F.mkdir(exist_ok=True)
info=json.loads((P/'registration.json').read_text());W,H=info['canvas'];HH=950
names=['FRONT','LEFT','RIGHT','DOWN'];heads={n:np.array(Image.open(R/f'TIMMY_HEAD_{n}_REGISTERED_v01.png')).astype(np.float32)/255 for n in names}
for a in heads.values():a[:,:,:3]*=a[:,:,3:4]
features={
'FRONT':[(498,638),(868,638),(705,725),(445,800),(880,820),(660,925),(660,1050)],
'LEFT':[(411,630),(708,674),(485,718),(355,795),(740,883),(530,947),(650,1030)],
'RIGHT':[(650,632),(978,621),(876,728),(592,793),(973,808),(810,921),(675,1048)],
'DOWN':[(493,706),(865,711),(703,805),(450,865),(875,870),(660,965),(660,1040)]}
common=[(660,30),(330,130),(1100,250),(200,620),(1130,620),(180,740),(1150,750),(330,970),(1000,970),(590,1100),(730,1100),(590,1150),(730,1150)]
pts={}
for n in names:
 off=info['head_sources'][n]['translation'];s=info['head_scale'];v=[(x*s+off[0],y*s+off[1]) for x,y in features[n]+common];v += [(0,0),(W-1,0),(W-1,HH-1),(0,HH-1),(450,862)];pts[n]=np.array(v,np.float32)
tri=Delaunay(pts['FRONT']).simplices

def warp(image,source,target):
 out=np.zeros_like(image);weights=np.zeros((HH,W,1),np.float32)
 for ids in tri:
  a=source[ids];b=target[ids];x,y,w,h=cv2.boundingRect(b);x0=max(0,x);y0=max(0,y);x1=min(W,x+w);y1=min(HH,y+h)
  if x0>=x1 or y0>=y1:continue
  bb=b-np.array([x0,y0],np.float32);matrix=cv2.getAffineTransform(a,bb);patch=cv2.warpAffine(image,matrix,(x1-x0,y1-y0),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT);m=np.zeros((y1-y0,x1-x0),np.float32);cv2.fillConvexPoly(m,np.round(bb).astype(np.int32),1,lineType=cv2.LINE_AA)
  out[y0:y1,x0:x1]+=patch*m[:,:,None];weights[y0:y1,x0:x1]+=m[:,:,None]
 return out/np.maximum(weights,1e-6)
cache={}
def head(a,b,v):
 k=(a,b,round(v*12));v=k[2]/12
 if k not in cache:
  # One source texture at every frame: no crossfade and no duplicate facial outlines.
  target=pts[a]*(1-v)+pts[b]*v
  target=pts['FRONT']+.55*(target-pts['FRONT'])
  z=warp(heads['FRONT'],pts['FRONT'],target)
  z[:,:,:3]/=np.maximum(z[:,:,3:4],1e-6);cache[k]=Image.fromarray(np.clip(z*255,0,255).astype(np.uint8))
 return cache[k]
body=Image.open(R/'TIMMY_BODY_FRONT_REGISTERED_v01.png');collar=Image.open(R/'TIMMY_COLLAR_FOREGROUND_v01.png')
def render_proof():
 checks=[];base_lower=None
 for i in range(150):
  t=i/25
  if t<.8:a,b,v='FRONT','DOWN',min(1,t/.8)
  else:
   phase=(t-.8)/1.65;v=.5-.5*math.cos(math.tau*phase)
   a,b='LEFT','RIGHT'
  # Feet and torso never move. Only the registered head texture changes.
  frame=body.copy();frame.alpha_composite(head(a,b,v));frame.alpha_composite(collar)
  lower=np.array(frame)[950:]
  if base_lower is None:base_lower=lower.copy()
  assert np.array_equal(base_lower,lower),'Stationary body changed'
  mask=(np.array(frame.getchannel('A'))>128).astype(np.uint8);n,labels,stats,centroids=cv2.connectedComponentsWithStats(mask)
  major=[s for s in stats[1:] if s[4]>100]
  assert len(major)==1,('Detached components',i,len(major))
  checks.append({'frame':i,'head_components':1,'stationary_body':True})
  frame=frame.resize((450,900),Image.Resampling.LANCZOS);target=F/f'{i:04d}.png';temporary=target.with_suffix('.tmp.png');frame.save(temporary,compress_level=1);temporary.replace(target)
  # Preview is composited for convenient phone playback; original frames keep alpha.
  background=Image.new('RGBA',frame.size,'#dce7ec');background.alpha_composite(frame);background.convert('RGB').save(F/f'preview-{i:04d}.jpg',quality=92)
 (P/'rig-checks.json').write_text(json.dumps({'frames':150,'fps':25,'duration':6,'body_pixels_static':True,'major_alpha_components_each_frame':1,'method':'Single-texture piecewise-affine head deformation guided by illustrated poses; one common neck pivot; no image crossfade or whole-body movement; collar foreground occlusion.','frames_checked':checks},indent=2)+'\n')
 print('PASS150 frames: fixed body and one connected figure, no floating components',flush=True)

if __name__=="__main__": render_proof()
