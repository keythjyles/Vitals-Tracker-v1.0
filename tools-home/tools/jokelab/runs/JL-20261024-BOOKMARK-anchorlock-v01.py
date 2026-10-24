import json,subprocess,pathlib
import numpy as np
from scipy.signal import fftconvolve
from scipy.ndimage import gaussian_filter

p=pathlib.Path(__file__).parent
w,h,frames=1080,1920,184
rois=[(190,110,310,310),(60,325,300,435),(425,160,660,245)]
margin=12
def gray(a):
 return gaussian_filter((a[:,:,0]*.299+a[:,:,1]*.587+a[:,:,2]*.114).astype(np.float32),.7)
def offset(g,ref,roi):
 x0,y0,x1,y1=roi
 a=g[y0-margin:y1+margin,x0-margin:x1+margin]
 t=ref[y0:y1,x0:x1];t=t-t.mean();ones=np.ones(t.shape,np.float32);n=t.size
 dots=fftconvolve(a,t[::-1,::-1],mode='valid')
 sums=fftconvolve(a,ones,mode='valid');squares=fftconvolve(a*a,ones,mode='valid')
 norm=np.sqrt(np.maximum(squares-sums*sums/n,1e-5)*(t*t).sum())
 score=dots/norm;dy,dx=np.unravel_index(np.argmax(score),score.shape)
 return int(dx-margin),int(dy-margin),float(score[dy,dx])
reader=subprocess.Popen(['ffmpeg','-v','error','-i',str(p/'GS_Bookmark_HeyGen_Original_v01.mp4'),'-map','0:v:0','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
writer=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-r','25','-i','-','-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p',str(p/'GS_Bookmark_AnchorLock_v01.mp4')],stdin=subprocess.PIPE)
shifts=[];confidence=[];ref=None
for i in range(frames):
 b=reader.stdout.read(w*h*3)
 if len(b)!=w*h*3:raise RuntimeError('Incomplete source frame')
 a=np.frombuffer(b,np.uint8).reshape(h,w,3);g=gray(a)
 if ref is None:ref=g.copy()
 found=[offset(g,ref,r) for r in rois]
 dx,dy=np.rint(np.median(np.array(found)[:,:2],axis=0)).astype(int)
 if abs(dx)>=margin or abs(dy)>=margin:raise RuntimeError('Background displacement exceeded search margin')
 shifts.append([-int(dx),-int(dy)]);confidence.append([round(v[2],5) for v in found])
 ys=np.clip(np.arange(h)+dy,0,h-1);xs=np.clip(np.arange(w)+dx,0,w-1)
 writer.stdin.write(a[ys[:,None],xs[None,:]].tobytes())
writer.stdin.close();reader.stdout.close()
if reader.wait()!=0 or writer.wait()!=0:raise RuntimeError('Frame conversion failed')
result={'schema':'GS-AnchorLock-1','source':'GS_Bookmark_HeyGen_Original_v01.mp4','frames':frames,'fps':25,'referenceFrame':0,'backgroundROIs':rois,'method':'Median normalized cross-correlation across three fixed background patches, integer translation, edge replication, no resizing','frameShifts':shifts,'patchScores':confidence,'maxAbsDx':max(abs(x[0]) for x in shifts),'maxAbsDy':max(abs(x[1]) for x in shifts)}
(p/'anchorlock-offsets-v01.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['frames','maxAbsDx','maxAbsDy']}))
