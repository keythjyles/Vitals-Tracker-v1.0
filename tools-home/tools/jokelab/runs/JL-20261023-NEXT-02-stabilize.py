import json, subprocess
from pathlib import Path
import numpy as np
p=Path(__file__).parent
shifts=json.loads((p/'stability-check.json').read_text())['frameShifts']
w,h=1080,1920
reader=subprocess.Popen(['ffmpeg','-v','error','-i',str(p/'GS_Robots_HeyGen_Original_v01.mp4'),'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
writer=subprocess.Popen(['ffmpeg','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-r','25','-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',str(p/'GS_Robots_AnchorLock_v01.mp4')],stdin=subprocess.PIPE)
for dx,dy in shifts:
    b=reader.stdout.read(w*h*3)
    if len(b)!=w*h*3: raise RuntimeError('Incomplete source frame')
    a=np.frombuffer(b,dtype=np.uint8).reshape(h,w,3)
    ys=np.clip(np.arange(h)-dy,0,h-1);xs=np.clip(np.arange(w)-dx,0,w-1)
    writer.stdin.write(a[ys[:,None],xs[None,:]].tobytes())
writer.stdin.close();reader.stdout.close()
if reader.wait()!=0 or writer.wait()!=0:raise RuntimeError('Stabilization failed')
print('Aligned',len(shifts),'frames; integer translation, edge replication, no resize.')
