from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np,json
P=Path(__file__).parent;S=P/'source';O=P/'registered';O.mkdir(exist_ok=True)
W,H=900,1800;BW=640;headscale=.58
body=Image.open(S/'TIMMY_BODY_FRONT_v01.png').convert('RGBA');ab=np.array(body.getchannel('A'));ys,xs=np.where(ab>128);box=(xs.min(),ys.min(),xs.max()+1,ys.max()+1);bs=BW/(box[2]-box[0]);bodypos=(round(W/2-512*bs),round(862-530*bs));b=body.resize((round(body.width*bs),round(body.height*bs)),Image.Resampling.LANCZOS);bodylayer=Image.new('RGBA',(W,H));bodylayer.alpha_composite(b,bodypos);bodylayer.save(O/'TIMMY_BODY_FRONT_REGISTERED_v01.png')
# Foreground collar is selected by its yellow fabric, including adjacent ink edges.
a=np.array(body);yellow=(a[:,:,0]>145)&(a[:,:,1]>95)&(a[:,:,2]<140)&(a[:,:,3]>128);yellow[650:]=False;yellow[:390]=False
m=Image.fromarray((yellow*255).astype('uint8')).filter(ImageFilter.MaxFilter(15));collar=body.copy();collar.putalpha(Image.fromarray(np.minimum(np.array(m),a[:,:,3]).astype('uint8')));collar=collar.resize(b.size,Image.Resampling.LANCZOS);front=Image.new('RGBA',(W,H));front.alpha_composite(collar,bodypos);front.save(O/'TIMMY_COLLAR_FOREGROUND_v01.png')
info={'canvas':[W,H],'neck_anchor':[450,862],'body_source_anchor':[512,530],'body_scale':bs,'body_translation':bodypos,'head_scale':headscale,'layers':['body','one articulated head','foreground collar'],'head_sources':{},'registration_rule':'All head neck-stem bottoms map to the one collar pivot. No head pixels are retained in the body. Collar fabric and bordering ink are foreground occluders.'}
for name in ['FRONT','LEFT','RIGHT','DOWN']:
 im=Image.open(S/f'TIMMY_HEAD_{name}_v01.png').convert('RGBA');a=np.array(im);ys,xs=np.where(a[:,:,3]>128);bottom=int(ys.max());skin=(a[:,:,0]>160)&(a[:,:,1]>90)&(a[:,:,2]>55)&(a[:,:,3]>128);skin[:bottom-35]=False;yy,xx=np.where(skin);anchor=(float(np.median(xx)),bottom-3);offset=(round(450-anchor[0]*headscale),round(862-anchor[1]*headscale));q=im.resize((round(im.width*headscale),round(im.height*headscale)),Image.Resampling.LANCZOS);layer=Image.new('RGBA',(W,950));layer.alpha_composite(q,offset);layer.save(O/f'TIMMY_HEAD_{name}_REGISTERED_v01.png');info['head_sources'][name]={'anchor':anchor,'translation':offset,'source_size':list(im.size)}
 comp=bodylayer.copy();comp.alpha_composite(layer);comp.alpha_composite(front);comp.save(O/f'TIMMY_RIG_TEST_{name}_v01.png')
(P/'registration.json').write_text(json.dumps(info,indent=2)+'\n')
# Static all-angle inspection over a light background.
sheet=Image.new('RGB',(1200,650),'#dce7ec')
from PIL import ImageDraw
for j,name in enumerate(['FRONT','LEFT','RIGHT','DOWN']):
 im=Image.open(O/f'TIMMY_RIG_TEST_{name}_v01.png');im.thumbnail((300,600));sheet.paste(im,(j*300,0),im);ImageDraw.Draw(sheet).text((j*300+80,615),name,fill='black')
sheet.save(P/'rig-contact.jpg')
print(json.dumps(info))
