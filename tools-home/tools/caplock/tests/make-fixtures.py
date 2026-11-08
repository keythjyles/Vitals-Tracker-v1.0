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
subprocess.run(['ffmpeg','-v','error','-i',str(root/'source25.mp4'),'-an','-frames:v','29',
    '-c:v','libx264','-y',str(root/'prepend-29.mp4')],check=True)
for name,color in [('blue','0x0060b8'),('green','0x00dd44')]:
    picture=f"color=c={color}:s=320x180:r=24:d=1,drawbox=x=50:y=50:w=60:h=60:color=yellow:t=fill:enable='lt(t,0.4)',drawbox=x=200:y=50:w=60:h=60:color=yellow:t=fill:enable='gte(t,0.4)'"
    subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i',picture,'-c:v','libx264','-pix_fmt','yuv420p','-y',str(root/f'{name}-caption.mp4')],check=True)
subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=0x223344:s=180x320:r=25:d=0.4','-f','lavfi','-i','sine=frequency=440:duration=0.4','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-y',str(root/'key-bed.mp4')],check=True)

subprocess.run(['ffmpeg','-v','error','-i',str(root/'blue-caption.mp4'),'-vf','scale=1280:720','-c:v','libx264','-pix_fmt','yuv420p','-y',str(root/'large-caption.mp4')],check=True)

subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=0x0060b8:s=320x180:r=25:d=1','-f','lavfi','-i','sine=frequency=1000:duration=1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-y',str(root/'goat-tone.mp4')],check=True)
subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=1000:duration=1','-c:a','pcm_s16le','-y',str(root/'goat.wav')],check=True)

# Sound begins after the short bed has ended: reproduces the missing goat tail.
subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i',"color=c=0x223344:s=180x320:r=25:d=0.4,drawbox=x=0:y=0:w=iw:h=ih:color=0x446688:t=fill:enable='gte(t,0.2)'",'-f','lavfi','-i','sine=frequency=440:duration=0.4','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-y',str(root/'tail-bed.mp4')],check=True)
for name,audio in [('late-goat','sine=frequency=1000:duration=1'),('silent-goat','anullsrc=r=48000:cl=stereo:d=1')]:
    command=['ffmpeg','-v','error','-f','lavfi','-i','color=c=yellow:s=80x80:r=25:d=1','-f','lavfi','-i',audio]
    if name=='late-goat':
        command+=['-af',"volume=0:enable='lt(t,0.6)'"]
    subprocess.run(command+['-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-y',str(root/f'{name}.mp4')],check=True)

# Non-25 fps, with picture and sound events inside a known native frame range.
trim_picture = "color=c=navy:s=180x320:r=30:d=1.2,drawbox=x=0:y=0:w=90:h=160:color=red:t=fill:enable='gte(t,0.4)*lt(t,0.8)',drawbox=x=90:y=160:w=90:h=160:color=yellow:t=fill"
subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i',trim_picture,
    '-f','lavfi','-i','sine=frequency=1000:duration=1.2','-af',"volume=0:enable='lt(t,0.4)+gte(t,0.8)'",
    '-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-y',str(root/'trim-source.mp4')],check=True)
