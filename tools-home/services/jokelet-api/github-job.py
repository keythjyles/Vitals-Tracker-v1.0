"""Read-only production rehearsal with durable GitHub receipts. Never generates speech."""
import base64, hashlib, json, os, re, urllib.request, urllib.error, urllib.parse
from pathlib import Path
REPOSITORY='keythjyles/Vitals-Tracker-v1.0'
ROOT='tools-home/tools/jokelab'
def encode(obj): return json.dumps(obj,sort_keys=True,indent=2)+'\n'
def sha(data): return hashlib.sha256(data).hexdigest()
class APIError(Exception):
    def __init__(self,status): self.status=status; super().__init__('GitHub HTTP '+str(status))
class Repository:
    def __init__(self,token): self.token=token
    def api(self,path,method='GET',body=None):
        req=urllib.request.Request('https://api.github.com/repos/'+REPOSITORY+'/'+path,method=method,headers={'Authorization':'Bearer '+self.token,'Accept':'application/vnd.github+json','Content-Type':'application/json'},data=None if body is None else json.dumps(body).encode())
        try:
            with urllib.request.urlopen(req,timeout=25) as response: return json.load(response)
        except urllib.error.HTTPError as e: raise APIError(e.code) from None
    def read(self,path,ref='main'):
        try: data=self.api('contents/'+path+'?ref='+urllib.parse.quote(ref,safe=''))
        except APIError as e:
            if e.status==404:return None,None
            raise
        return json.loads(base64.b64decode(data['content'])),data['sha']
    def put(self,path,obj,expected=None):
        body={'message':'Jokelet job receipt: '+obj['jobId']+' '+obj['status'],'content':base64.b64encode(encode(obj).encode()).decode(),'branch':'main'}
        if expected is not None:body['sha']=expected
        return self.api('contents/'+path,'PUT',body)['content']['sha']
    def finish(self,jobpath,expected,job,proofpath,proof):
        # Retry only a GitHub ref conflict; never repeat the provider request.
        for attempt in range(3):
            head=self.api('git/ref/heads/main')['object']['sha']
            current,current_sha=self.read(jobpath,head)
            if current_sha!=expected:raise ValueError('Job receipt changed; reconciliation required')
            tree_sha=self.api('git/commits/'+head)['tree']['sha']
            tree=self.api('git/trees','POST',{'base_tree':tree_sha,'tree':[{'path':p,'mode':'100644','type':'blob','content':encode(v)} for p,v in [(jobpath,job),(proofpath,proof)]]})['sha']
            commit=self.api('git/commits','POST',{'message':'Preserve completed Jokelet job '+job['jobId'],'tree':tree,'parents':[head]})['sha']
            try:self.api('git/refs/heads/main','PATCH',{'sha':commit,'force':False});return commit
            except APIError as e:
                if e.status not in (409,422) or attempt==2:raise
        raise ValueError('Could not checkpoint result')
def execute(repo,request,lookup,asset_check,source_commit,run_id):
    if request.get('operation')!='authenticated_voice_discovery' or request.get('paidRequests')!=0 or request.get('automaticRetries')!=0:raise ValueError('Only a zero-paid-request voice preflight is allowed')
    job_id=request.get('jobId','')
    if not isinstance(job_id,str) or not re.fullmatch('[A-Za-z0-9_-]{1,100}',job_id):raise ValueError('Invalid job identifier')
    semantic={k:request.get(k) for k in ['jobId','operation','paidRequests','automaticRetries','catalogId','assetSha256']}
    fingerprint=sha(encode(semantic).encode());jobpath=ROOT+'/jobs/'+job_id+'.json';proofpath=ROOT+'/results/'+job_id+'.json'
    prior,version=repo.read(jobpath)
    if prior:
        if prior.get('requestSha256')!=fingerprint:raise ValueError('Job ID already belongs to different input')
        if prior.get('status')!='completed':raise ValueError('Unfinished job must be reconciled; no automatic provider retry')
        proof,_=repo.read(proofpath)
        if proof is None or sha(encode(proof).encode())!=prior.get('resultSha256'):raise ValueError('Saved result is missing or changed')
        return {'schema':'GS-GitHubRecovery-1','jobId':job_id,'restored':True,'providerLookupsThisRun':0,'paidRequests':0,'sourceResult':proofpath,'resultSha256':prior['resultSha256'],'sourceJob':jobpath,'runId':run_id}
    # Fail preflight before any receipt or provider access if the selected source is not approved.
    asset=asset_check(request,source_commit)
    job={'schema':'GS-GitHubJob-1','jobId':job_id,'request':semantic,'requestSha256':fingerprint,'status':'reserved','sourceCommit':source_commit,'runId':run_id,'paidRequests':0,'sourceAsset':asset,'events':['reserved_before_provider_lookup']}
    version=repo.put(jobpath,job)
    job['status']='submitted';job['events'].append('read_only_lookup_started');version=repo.put(jobpath,job,version)
    try:
        preflight=lookup()
        if preflight.get('authenticatedVoiceLookup') is not True or preflight.get('paidGeneration') is not False:raise ValueError('Authenticated read-only lookup did not pass')
        proof={'schema':'GS-GitHubJobResult-1','jobId':job_id,'requestSha256':fingerprint,'sourceCommit':source_commit,'runId':run_id,'paidRequests':0,'providerLookups':1,'preflight':preflight,'sourceAsset':asset}
        # Keep a recovery copy before committing; upload-artifact runs even if GitHub persistence fails.
        Path('jokelet-preflight.json').write_text(encode(proof))
        job['status']='completed';job['resultPath']=proofpath;job['resultSha256']=sha(encode(proof).encode());job['events'].append('result_and_source_hash_preserved')
        commit=repo.finish(jobpath,version,job,proofpath,proof)
        return {'schema':'GS-GitHubRecovery-1','jobId':job_id,'restored':False,'providerLookupsThisRun':1,'paidRequests':0,'resultSha256':job['resultSha256'],'savedCommit':commit,'sourceJob':jobpath,'sourceResult':proofpath,'runId':run_id}
    except Exception:
        job['status']='uncertain';job['events'].append('stopped_without_provider_retry')
        try:repo.put(jobpath,job,version)
        except Exception:pass
        raise

def lookup():
    audience='https://jokelet-api.onrender.com/ai-preflight'
    url=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']+'&audience='+urllib.parse.quote(audience,safe='')
    req=urllib.request.Request(url,headers={'Authorization':'Bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
    with urllib.request.urlopen(req,timeout=20) as r: token=json.load(r)['value']
    print('::add-mask::'+token)
    req=urllib.request.Request('https://jokelet-api.onrender.com/api/ai/preflight',headers={'Authorization':'Bearer '+token})
    with urllib.request.urlopen(req,timeout=60) as r:return json.load(r)
def check_asset(repo,request,ref):
    catalog,_=repo.read('tools-home/tools/jokelets/catalog.json',ref)
    matches=[v for v in catalog['catalog'] if v['id']==request.get('catalogId')]
    if len(matches)!=1:raise ValueError('Approved source missing')
    item=matches[0];src=item['src']
    if item['status']!='Approved' or item.get('automationReview',{}).get('status')!='Allowed' or item['sha256']!=request.get('assetSha256') or not re.fullmatch(r'media/[A-Za-z0-9_.-]+\.mp4',src):raise ValueError('Source is not approved for clean reuse')
    url='https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/tools/jokelets/'+src
    with urllib.request.urlopen(url,timeout=30) as r:data=r.read(20*1024*1024+1)
    if len(data)>20*1024*1024 or sha(data)!=item['sha256']:raise ValueError('Original source bytes do not match approved hash')
    return {'catalogId':item['id'],'canonicalId':item.get('canonicalJokeId'),'path':'tools-home/tools/jokelets/'+src,'driveId':item.get('driveId'),'sha256':sha(data),'bytes':len(data),'status':'existing_approved_source_verified_unchanged'}
def main():
    repo=Repository(os.environ['GH_TOKEN']);ref=os.environ['GITHUB_SHA'];run_id=os.environ['GITHUB_RUN_ID']
    try:
        request,_=repo.read(ROOT+'/requests/voice-preflight.json',ref)
        result=execute(repo,request,lookup,lambda req,sha_ref:check_asset(repo,req,sha_ref),ref,run_id)
        Path('jokelet-recovery.json').write_text(encode(result))
        print('Durable GitHub job:',result['jobId'],'; restored:',result['restored'],'; provider lookups:',result['providerLookupsThisRun'],'; paid generation requests: 0')
    except Exception as e:
        # Never print exception bodies/URLs/headers, which could contain transport credentials.
        Path('jokelet-recovery.json').write_text(encode({'status':'stopped','errorType':type(e).__name__,'paidRequests':0,'runId':run_id}))
        print('Job stopped; recovery artifact preserved; no automatic provider retry.');raise SystemExit(1)
if __name__=='__main__':main()
