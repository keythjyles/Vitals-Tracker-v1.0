import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {ProductionStore,storageReadiness,openMountedStore} from './production-store.js';
const budget=(id='budget')=>({id,maxRequests:2,maxCharacters:100,maxCredits:100,voiceId:'gsvoice',models:['eleven_v3'],approvedBy:'test approval',expiresAt:new Date(Date.now()+60000).toISOString(),priceEvidence:'Test-only bound, not a provider quote'});
const request=(jobId='job')=>({jobId,budgetId:'budget',canonicalId:'canonical',script:'[joking] Test.',voiceId:'gsvoice',modelId:'eleven_v3',reserveCredits:50});
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'gs-ledger-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return {dir,path:join(dir,'data.sqlite')};}
test('job identity, spending reservations and original audio survive restart and native backup',t=>{
 const {dir,path}=fixture(t);let s=new ProductionStore(path);s.createBudget(budget());
 assert.equal(s.reserve(request()).replay,false);assert.equal(s.claimSubmission('job'),true);assert.equal(s.claimSubmission('job'),false);
 const original=Buffer.from([1,2,3,0,255]),hash=s.complete('job',original,{providerId:'provider-take-1',actualCredits:44});s.close();
 s=new ProductionStore(path);assert.equal(s.reserve(request()).replay,true);assert.equal(s.getJob('job').audio_sha256,hash);assert.deepEqual(s.getAudio('job'),original);
 assert.throws(()=>s.reserve({...request(),script:'Changed'}),/conflicts/);
 assert.throws(()=>s.reserve({...request(),voiceSettings:{stability:.5}}),/conflicts/);
 s.reserve(request('second'));assert.throws(()=>s.reserve(request('third')),/Budget limit/);
 const copy=join(dir,'backup.sqlite');s.backup(copy);s.close();
 const restored=new ProductionStore(copy);assert.deepEqual(restored.getAudio('job'),original);assert.equal(restored.history('job').at(-1).event,'original_preserved');assert.equal(restored.getJob('second').state,'reserved');restored.close();
});
test('canonical duplicate guard and uncertain charges stop new work',t=>{
 const {path}=fixture(t);let s=new ProductionStore(path);s.createBudget(budget());s.seedProduced(['already-produced']);
 assert.throws(()=>s.reserve({...request(),canonicalId:'already-produced'}),/already produced/);
 s.reserve(request());s.claimSubmission('job');s.close();s=new ProductionStore(path);assert.equal(s.recoverSubmitted(),1);
 assert.equal(s.getJob('job').state,'uncertain');assert.equal(s.claimSubmission('job'),false);assert.throws(()=>s.reserve(request('another')),/reconciled/);
 s.createBudget(budget('other'));assert.throws(()=>s.reserve({...request('newrun'),budgetId:'other'}),/claimed by another run/);s.close();
});
test('unauthorized models, voices, missing approval and character or credit limits fail closed',t=>{
 const {path}=fixture(t),s=new ProductionStore(path);assert.throws(()=>s.createBudget({...budget(),approvedBy:''}));s.createBudget(budget());
 for(const edit of [{modelId:'other'},{voiceId:'other'},{reserveCredits:101},{script:'x'.repeat(101)},{voiceSettings:{Authorization:'secret'}}])assert.throws(()=>s.reserve({...request(),...edit}));s.close();
});
test('independent processes cannot both consume a one-request budget',async t=>{
 const {path}=fixture(t),s=new ProductionStore(path);s.createBudget({...budget(),maxRequests:1});s.close();
 const moduleUrl=new URL('./production-store.js',import.meta.url).href;
 const code=`import {ProductionStore} from ${JSON.stringify(moduleUrl)};const s=new ProductionStore(process.argv[1]);try{s.reserve(JSON.parse(process.argv[2]));process.stdout.write('reserved');}catch{process.stdout.write('blocked');}finally{s.close();}`;
 const run=job=>new Promise((resolve,reject)=>{const c=spawn(process.execPath,['--input-type=module','-e',code,path,JSON.stringify(request(job))]);let out='';c.stdout.on('data',b=>out+=b);c.on('error',reject);c.on('exit',n=>n===0?resolve(out):reject(Error('worker failed')));});
 assert.deepEqual((await Promise.all([run('one'),run('two')])).sort(),['blocked','reserved']);
});
test('ordinary ephemeral directories are never reported as mounted durable storage',t=>{
 const {dir}=fixture(t);assert.equal(storageReadiness().ready,false);assert.equal(storageReadiness(dir,'').ready,false);
 assert.equal(openMountedStore(dir).store,null);assert.equal(existsSync(join(dir,'jokelet.sqlite')),false);
 const line=`1 0 8:1 / ${dir} rw - ext4 /dev/disk rw`;assert.equal(storageReadiness(dir,line).ready,true);
});
