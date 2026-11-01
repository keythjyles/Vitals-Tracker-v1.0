from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1]
for size in (192,512):
 im=Image.new("RGB",(size,size),"#101924");d=ImageDraw.Draw(im)
 font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",int(size*.35))
 d.text((size*.5,size*.40),"GS",anchor="mm",font=font,fill="#efd08b")
 for y in (.65,.72):d.line([(size*.30,size*y),(size*.5,size*(y+.10)),(size*.70,size*y)],fill="#efd08b",width=max(2,int(size*.035)))
 im.save(root/("icon-%d.png"%size))
