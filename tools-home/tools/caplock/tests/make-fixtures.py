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
