import copy, importlib.util, json, tempfile, unittest, os
from pathlib import Path
spec=importlib.util.spec_from_file_location('job',Path(__file__).with_name('github-job.py'));job=importlib.util.module_from_spec(spec);spec.loader.exec_module(job)
class FakeRepository:
    def __init__(self):self.files={};self.counter=0
    def read(self,path,ref='main'):
        record=self.files.get(path);return (copy.deepcopy(record[0]),record[1]) if record else (None,None)
    def put(self,path,obj,expected=None):
        existing=self.files.get(path)
        if (existing and existing[1]!=expected) or (not existing and expected is not None):raise ValueError('conflict')
        self.counter+=1;version=str(self.counter);self.files[path]=(copy.deepcopy(obj),version);return version
    def finish(self,path,expected,obj,proofpath,proof):
        if self.files[path][1]!=expected:raise ValueError('conflict')
        self.put(path,obj,expected);self.put(proofpath,proof);return 'test-commit'
class Jobs(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.cwd=os.getcwd();os.chdir(self.tmp.name);self.repo=FakeRepository();self.calls=0
        self.req={'jobId':'TEST-GITSTORE','operation':'authenticated_voice_discovery','paidRequests':0,'automaticRetries':0,'catalogId':'approved','assetSha256':'a'*64}
    def tearDown(self):os.chdir(self.cwd);self.tmp.cleanup()
    def lookup(self):
        self.calls+=1
        # The receipt must precede actual provider access.
        self.assertEqual(self.repo.read(job.ROOT+'/jobs/TEST-GITSTORE.json')[0]['status'],'submitted')
        return {'authenticatedVoiceLookup':True,'paidGeneration':False}
    def runjob(self,request=None):return job.execute(self.repo,request or self.req,self.lookup,lambda r,s:{'sha256':'a'*64},'source-commit','run-id')
    def test_restart_replays_saved_job_without_second_lookup(self):
        first=self.runjob();self.assertFalse(first['restored']);self.assertTrue(Path('jokelet-preflight.json').is_file())
        # New runner instance receives only the durable repository, not local output files.
        for p in Path('.').glob('*.json'):p.unlink()
        second=self.runjob();self.assertTrue(second['restored']);self.assertEqual(self.calls,1);self.assertEqual(second['resultSha256'],first['resultSha256'])
    def test_same_id_different_input_rejected(self):
        self.runjob()
        with self.assertRaises(ValueError):self.runjob({**self.req,'assetSha256':'b'*64})
        self.assertEqual(self.calls,1)
    def test_missing_or_changed_saved_result_stops(self):
        self.runjob();path=job.ROOT+'/results/TEST-GITSTORE.json';self.repo.files[path][0]['paidRequests']=1
        with self.assertRaises(ValueError):self.runjob()
        self.assertEqual(self.calls,1)
    def test_uncertain_provider_outcome_is_not_retried(self):
        def failed():self.calls+=1;raise TimeoutError()
        with self.assertRaises(TimeoutError):job.execute(self.repo,self.req,failed,lambda r,s:{},'commit','run')
        with self.assertRaises(ValueError):self.runjob()
        self.assertEqual(self.calls,1)
    def test_paid_operations_rejected_before_any_write(self):
        for edit in [{'paidRequests':1},{'operation':'generate_voice'},{'automaticRetries':1}]:
            with self.assertRaises(ValueError):self.runjob({**self.req,**edit})
        self.assertEqual(self.repo.files,{});self.assertEqual(self.calls,0)
    def test_source_check_fails_before_provider_and_write(self):
        def bad(r,s):raise ValueError('not approved')
        with self.assertRaises(ValueError):job.execute(self.repo,self.req,self.lookup,bad,'commit','run')
        self.assertEqual(self.repo.files,{});self.assertEqual(self.calls,0)
if __name__=='__main__':unittest.main()
