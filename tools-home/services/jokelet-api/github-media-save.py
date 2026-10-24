"""Preserve hash-bound public production bytes in the existing repository; no generation."""
import base64,hashlib,json,os,re,urllib.request,urllib.parse,urllib.error

REPO='keythjyles/Vitals-Tracker-v1.0'
ROOT='tools-home/tools/jokelab'
def api(path,method='GET',body=None):
 req=urllib.request.Request('https://api.github.com/repos/'+REPO+'/'+path,method=method,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/json'},data=None if body is None else json.dumps(body).encode())
 with urllib.request.urlopen(req,timeout=40) as r:return json.load(r)
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args):raise ValueError('Artifact redirects are not allowed')
def main():
 data=api('contents/'+ROOT+'/requests/media-save.json?ref='+os.environ['GITHUB_SHA'])
 request=json.loads(base64.b64decode(data['content']))
 if request.get('operation')!='preserve_production_artifact' or not re.fullmatch(r'JL-[A-Za-z0-9_-]{1,100}',request.get('jobId','')):raise ValueError('Invalid archive request')
 path=request['path'];url=request['sourceUrl'];u=urllib.parse.urlsplit(url)
 if not re.fullmatch(r'tools-home/tools/jokelets/media/GS_[A-Za-z0-9_-]+\.mp4',path):raise ValueError('Invalid destination')
 if u.scheme!='https' or u.hostname!='resource2.heygen.ai' or u.username or u.password or u.query or not re.fullmatch(r'/video/[a-f0-9]{32}/original\.mp4',u.path):raise ValueError('Invalid production source')
 if not isinstance(request.get('bytes'),int) or not 1<=request['bytes']<=20*1024*1024 or not re.fullmatch(r'[a-f0-9]{64}',request.get('sha256','')):raise ValueError('Invalid byte contract')
 with urllib.request.build_opener(NoRedirect).open(url,timeout=60) as r:body=r.read(20*1024*1024+1)
 if len(body)!=request['bytes'] or hashlib.sha256(body).hexdigest()!=request['sha256']:raise ValueError('Artifact hash mismatch')
 blob=api('git/blobs','POST',{'content':base64.b64encode(body).decode(),'encoding':'base64'})['sha']
 proof={'schema':'GS-MediaArchive-1','jobId':request['jobId'],'status':'completed','paidRequests':0,'path':path,'bytes':len(body),'sha256':request['sha256'],'blobSha':blob,'sourceAssetId':request['sourceAssetId'],'runId':os.environ['GITHUB_RUN_ID']}
 for attempt in range(3):
  head=api('git/ref/heads/main')['object']['sha'];tree=api('git/commits/'+head)['tree']['sha']
  # Destination is immutable: an already-present different blob cannot be overwritten.
  try:prior=api('contents/'+path+'?ref='+head)
  except urllib.error.HTTPError as e:
   if e.code!=404:raise
   prior=None
  if prior and prior['sha']!=blob:raise ValueError('Destination already has different bytes')
  newtree=api('git/trees','POST',{'base_tree':tree,'tree':[{'path':path,'mode':'100644','type':'blob','sha':blob},{'path':ROOT+'/results/'+request['jobId']+'.json','mode':'100644','type':'blob','content':json.dumps(proof,indent=2)+'\n'}]})['sha']
  commit=api('git/commits','POST',{'message':'Preserve verified jokelet media [skip render]','tree':newtree,'parents':[head]})['sha']
  try:api('git/refs/heads/main','PATCH',{'sha':commit,'force':False});break
  except urllib.error.HTTPError as e:
   if e.code not in (409,422) or attempt==2:raise
 print('Verified production bytes saved; paid generation requests: 0')
if __name__=='__main__':
 try:main()
 except Exception as e:print('Archive stopped:',type(e).__name__);raise SystemExit(1)
