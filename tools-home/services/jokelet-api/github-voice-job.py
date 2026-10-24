"""Single approved voice job, or a zero-paid approval-gate rehearsal."""
import base64, hashlib, importlib.util, json, os, shutil, subprocess, urllib.request, urllib.error, urllib.parse
from pathlib import Path
spec=importlib.util.spec_from_file_location('jobs','github-job.py');jobs=importlib.util.module_from_spec(spec);spec.loader.exec_module(jobs)
ROOT=jobs.ROOT
VOICE_WORKFLOW='jokelet-voice.yml'
def oidc():
    url=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']+'&audience='+urllib.parse.quote('https://jokelet-api.onrender.com/ai-preflight',safe='')
    req=urllib.request.Request(url,headers={'Authorization':'Bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
    with urllib.request.urlopen(req,timeout=20) as r:token=json.load(r)['value']
    print('::add-mask::'+token);return token
def invoke(request,dry_run,quote_only=False):
    body=json.dumps({'jobId':request['jobId'],'dryRun':dry_run,'quoteOnly':quote_only}).encode()
    req=urllib.request.Request('https://jokelet-api.onrender.com/api/ai/voice/generate',data=body,headers={'content-type':'application/json','Authorization':'Bearer '+oidc(),'X-GitHub-Job-Token':os.environ['GH_TOKEN']})
    try:
        with urllib.request.urlopen(req,timeout=100) as r:return r.status,json.load(r)
    except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
def repo_bytes(repo,path):
    data=repo.api('contents/'+path)
    if not data.get('content'):data=repo.api('git/blobs/'+data['sha'])
    return base64.b64decode(data['content'])
def save_wav(repo,job,wav,metadata):
    path=ROOT+'/voice-jobs/'+job['jobId']+'.json';wavpath=ROOT+'/voice-wav/'+job['jobId']+'.wav'
    for attempt in range(3):
        head=repo.api('git/ref/heads/main')['object']['sha'];current,version=repo.read(path,head)
        if current.get('status')!='completed' or current.get('original')!=job['original']:raise ValueError('Original voice receipt changed')
        updated={**current,'wav':{'path':wavpath,'sha256':jobs.sha(wav),'bytes':len(wav),**metadata}}
        tree_sha=repo.api('git/commits/'+head)['tree']['sha'];blob=repo.api('git/blobs','POST',{'content':base64.b64encode(wav).decode(),'encoding':'base64'})['sha']
        tree=repo.api('git/trees','POST',{'base_tree':tree_sha,'tree':[{'path':path,'mode':'100644','type':'blob','content':jobs.encode(updated)},{'path':wavpath,'mode':'100644','type':'blob','sha':blob}]})['sha']
        commit=repo.api('git/commits','POST',{'message':'Preserve PCM WAV for '+job['jobId'],'tree':tree,'parents':[head]})['sha']
        try:repo.api('git/refs/heads/main','PATCH',{'sha':commit,'force':False});return updated
        except jobs.APIError as e:
            if e.status not in (409,422) or attempt==2:raise
    raise ValueError('WAV checkpoint not saved')
def main():
    repo=jobs.Repository(os.environ['GH_TOKEN']);source=os.environ['GITHUB_SHA'];run_id=os.environ['GITHUB_RUN_ID']
    source_request,_=repo.read(ROOT+'/requests/voice-job.json',source)
    request={k:v for k,v in source_request.items() if k not in ('invocation','executionMode')}
    mode=source_request.get('executionMode');job_id=request['jobId']
    if mode not in ('gate_rehearsal','generate'):raise ValueError('Unknown execution mode')
    if mode=='gate_rehearsal':
        status,result=invoke(request,True)
        if status!=403 or result.get('error')!='approval_required':raise ValueError('Approval gate did not reject as expected')
        quote_status,quote=invoke(request,True,True)
        if quote_status!=200 or quote.get('quoteOnly') is not True or quote.get('paidRequests')!=0:
            Path('voice-result.json').write_text(jobs.encode({'status':'read_only_quote_blocked','httpStatus':quote_status,'error':quote.get('error'),'paidRequests':0,'runId':run_id}));raise ValueError('Read-only funding quote unavailable')
        report={'quote':quote,'schema':'GS-VoiceGateRehearsal-1','jobId':job_id,'sourceCommit':source,'runId':run_id,'expectedApprovalBlock':True,'httpStatus':status,'paidRequests':0,'body':result}
        Path('voice-result.json').write_text(jobs.encode(report))
        path=ROOT+'/results/'+job_id+'.json';existing,version=repo.read(path)
        repo.put(path,{**report,'status':'blocked_as_expected'},version)
        print('VOICE GATE PASSED: unapproved request rejected; quote verified; paid requests: 0');return
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):raise ValueError('WAV conversion tools unavailable; stopped before generation')
    path=ROOT+'/voice-jobs/'+job_id+'.json';prior,version=repo.read(path)
    if prior is None:
        repo.put(path,{'schema':'GS-VoiceJob-2','jobId':job_id,'status':'queued','request':request,'sourceCommit':source,'runId':run_id})
    elif prior.get('status')!='completed' or prior.get('request')!=request:raise ValueError('Existing job needs reconciliation; no retry')
    status,result=invoke(request,False)
    if result.get('recoveryAudioBase64'):
        Path('voice-recovery.mp3').write_bytes(base64.b64decode(result.pop('recoveryAudioBase64')))
        Path('voice-result.json').write_text(jobs.encode(result));raise ValueError('Original recovered to artifact; reconcile repository before another request')
    if status!=200 or not result.get('job'):
        Path('voice-result.json').write_text(jobs.encode({'status':'stopped','httpStatus':status,'error':result.get('error'),'paidRequests':None,'requiresReconciliation':True,'runId':run_id}));raise ValueError('Voice job stopped; inspect durable receipt before retry')
    job=result['job'];audio=repo_bytes(repo,job['original']['path'])
    if jobs.sha(audio)!=job['original']['sha256']:raise ValueError('Original hash mismatch')
    Path('voice-original.mp3').write_bytes(audio)
    subprocess.run(['ffmpeg','-nostdin','-y','-loglevel','error','-i','voice-original.mp3','-c:a','pcm_s16le','voice.wav'],check=True)
    details=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_name,sample_rate,channels:format=duration','-of','json','voice.wav']))
    stream=details['streams'][0]
    if stream['codec_name']!='pcm_s16le':raise ValueError('WAV encoding verification failed')
    metadata={'encoding':'pcm_s16le','sampleRate':int(stream['sample_rate']),'channels':stream['channels'],'duration':float(details['format']['duration']),'parentSha256':job['original']['sha256'],'conversion':'ffmpeg decode to PCM16; no gain, speed, trim or resampling options'}
    completed=save_wav(repo,job,Path('voice.wav').read_bytes(),metadata)
    Path('voice-result.json').write_text(jobs.encode({'job':completed,'providerRequestsThisRun':result['providerRequests'],'replayed':result['replayed']}))
    print('VOICE JOB SAVED: original MP3 and verified PCM WAV; provider requests this run:',result['providerRequests'])
if __name__=='__main__':
    try:main()
    except Exception as e:
        if not Path('voice-result.json').exists():Path('voice-result.json').write_text(jobs.encode({'status':'stopped','errorType':type(e).__name__,'requiresReconciliation':True,'paidRequests':None}))
        print('Voice job stopped. No automatic retry. Preserve artifacts and inspect receipt.');raise SystemExit(1)
