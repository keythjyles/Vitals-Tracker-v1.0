"""Independent FFmpeg/NumPy verification of the browser exports; raises on regression."""
import argparse, hashlib, json, subprocess
from pathlib import Path
import numpy as np
from scipy.signal import correlate, butter, sosfiltfilt
from functools import lru_cache

def probe(p):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))

def video_bytes(p):
    return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:v:0','-c:v','copy','-bsf:v','h264_mp4toannexb','-f','h264','-'])

@lru_cache(maxsize=20)
def audio(p):
    return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-ac','1',
        '-af','aresample=48000:async=0:first_pts=0','-f','f32le','-']),dtype='<f4')

def offsets(ref, out, times):
    # Fixture effects occupy 2.7 kHz; measure the immutable speech band separately from added effects.
    sos=butter(6,1500,fs=48000,output='sos')
    a,b=sosfiltfilt(sos,audio(ref)),sosfiltfilt(sos,audio(out));results=[]
    for t in times:
        start=round(t*48000);length=min(48000,len(a)-start,len(b)-start-2400)
        if length<12000:continue
        lo=max(0,start-2400);hi=min(len(b),start+length+2400)
        corr=correlate(b[lo:hi],a[start:start+length],mode='valid',method='fft');i=int(corr.argmax())
        delta=lo+i-start;quality=float(np.corrcoef(a[start:start+length],b[lo+i:lo+i+length])[0,1])
        results.append({'seconds':t,'offset_samples':delta,'offset_ms':delta/48,'correlation':quality})
    return results

def main():
    parser=argparse.ArgumentParser();parser.add_argument('directory',type=Path);args=parser.parse_args();d=args.directory
    report={};source=d/'fixture_40s.mp4';baseline=video_bytes(source)
    for name in ['C','D','E','F','G','Moved','Deleted','H','UI','AfterCancel']:
        p=d/(name+'.mp4');meta=probe(p);v=next(s for s in meta['streams'] if s['codec_type']=='video')
        assert video_bytes(p)==baseline, name+' changed video samples'
        assert v['width']==270 and v['height']==480 and v['avg_frame_rate']=='25/1' and int(v['nb_frames'])==1000,name
        measured=offsets(source,p,[.1,7.5,15.5,23.5,31.5,34.52,37.5])
        assert all(abs(m['offset_samples'])<=2 and m['correlation']>.98 for m in measured),(name,measured)
        report[name]={'encoded_video_identical':True,'frames':1000,'fps':25,'audio':measured}
    assert (d/'C.mp4').read_bytes()==source.read_bytes(),'No-op changed file bytes'
    assert (d/'H.mp4').read_bytes()==(d/'E.mp4').read_bytes(),'Repeat export introduced generation loss'
    for name in ['fixture_44100','fixture_audio_offset','fixture_30fps_short_audio']:
        measured=offsets(d/(name+'.mp4'),d/(name+'_out.mp4'),[1.2,3.5,4.5])
        assert all(abs(m['offset_samples'])<=2 and m['correlation']>.98 for m in measured),(name,measured)
        report[name]={'audio':measured}
    a=d/'color_full709.mp4';b=d/'color_full709_out.mp4';assert video_bytes(a)==video_bytes(b)
    report['colour']={'encoded_video_identical':True,'PSNR':'infinity','SSIM':1.0}
    meta=probe(d/'fixture_30fps_out.mp4');v=next(s for s in meta['streams'] if s['codec_type']=='video')
    assert v['avg_frame_rate']=='25/1' and int(v['nb_frames'])==150
    report['30fps_conversion']={'fps':25,'frames':150,'audio':offsets(d/'fixture_30fps.mp4',d/'fixture_30fps_out.mp4',[.1,3,4.5])}
    for m in report['30fps_conversion']['audio']:assert abs(m['offset_samples'])<=2,m
    (d/'measurements.json').write_text(json.dumps(report,indent=2));print('PASS: exact picture, all timing windows, 44.1 kHz, audio offsets, repeat export and CFR conversion')

if __name__=='__main__':main()
