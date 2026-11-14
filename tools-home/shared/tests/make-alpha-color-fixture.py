"""Write a deterministic, full-range alpha fixture for the browser exporters."""
from pathlib import Path
import subprocess
import sys

root = Path(sys.argv[1])
root.mkdir(parents=True, exist_ok=True)
# Full-range alpha samples exercise the GS1 decode fix before CapLock flattens the frame.
width, height = 160, 288
colors = [(18, 26, 36), (206, 134, 73), (240, 213, 162), (27, 81, 57),
          (146, 44, 32), (112, 140, 184), (220, 220, 220), (25, 25, 25)]
patches = bytearray(width * height * 4)
for y in range(height):
    for x in range(width):
        offset = 4 * (y * width + x)
        patches[offset:offset + 4] = bytes((*colors[(y // 72) * 2 + x // 80], 0 if x < 8 else 255))
subprocess.run(['ffmpeg', '-v', 'error', '-f', 'rawvideo', '-pixel_format', 'rgba',
    '-video_size', f'{width}x{height}', '-framerate', '25', '-i', 'pipe:',
    '-vf', 'scale=out_color_matrix=bt709:out_range=full,format=yuva420p',
    '-c:v', 'libvpx-vp9', '-lossless', '1', '-auto-alt-ref', '0',
    '-color_range', 'pc', '-colorspace', 'bt709', '-color_primaries', 'bt709',
    '-color_trc', 'iec61966-2-1', '-y', str(root / 'alpha-untagged.webm')],
    input=bytes(patches) * 10, check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-i', str(root / 'alpha-untagged.webm'), '-map', '0:v:0',
    '-c', 'copy', '-color_range', 'pc', '-colorspace', 'bt709', '-color_primaries', 'bt709',
    '-color_trc', 'iec61966-2-1', '-y', str(root / 'full-range-alpha.webm')], check=True)
