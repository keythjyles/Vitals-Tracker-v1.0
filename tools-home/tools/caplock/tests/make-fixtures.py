"""Generate disposable portrait fixtures; no user media or providers."""
from pathlib import Path
import subprocess
root=Path('/tmp/caplock-fixtures')
root.mkdir(exist_ok=True)
for fps in (25,30):
    command=['ffmpeg','-v','error','-f','lavfi','-i',f'testsrc2=s=270x480:r={fps}:d=3']
    if fps==25:
        command+=['-f','lavfi','-i','sine=frequency=440:duration=3']
    command+=['-c:v','libx264','-pix_fmt','yuv420p']
    if fps==25:
        command+=['-c:a','aac','-shortest']
    subprocess.run(command+['-y',str(root/f'source{fps}.mp4')],check=True)
for name,color in [('blue','0x0060b8'),('green','0x00dd44')]:
    picture=f"color=c={color}:s=320x180:r=24:d=1,drawbox=x=50:y=50:w=60:h=60:color=yellow:t=fill:enable='lt(t,0.4)',drawbox=x=200:y=50:w=60:h=60:color=yellow:t=fill:enable='gte(t,0.4)'"
    subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i',picture,'-c:v','libx264','-pix_fmt','yuv420p','-y',str(root/f'{name}-caption.mp4')],check=True)
subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=0x223344:s=180x320:r=25:d=0.4','-f','lavfi','-i','sine=frequency=440:duration=0.4','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-y',str(root/'key-bed.mp4')],check=True)
