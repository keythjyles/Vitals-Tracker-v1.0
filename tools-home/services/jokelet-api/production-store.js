// Storage adapter only. Paid provider routes do not use this until integration is verified.
import * as sqlite from 'node:sqlite';
import {createHash} from 'node:crypto';
import {chmodSync,mkdirSync,readFileSync,realpathSync} from 'node:fs';
import {dirname,isAbsolute,join} from 'node:path';
const Database=sqlite.DatabaseSync||sqlite.Database;
const digest=x=>createHash('sha256').update(x).digest('hex');
const integer=(n,min=1)=>Number.isSafeInteger(n)&&n>=min;
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(x);
export function storageReadiness(directory,mountInfo){
  if(!directory)return {ready:false,reason:'persistent_mount_not_configured'};
  try{
    if(!isAbsolute(directory)||directory==='/')throw Error();
    const path=realpathSync(directory);
    const info=mountInfo??readFileSync('/proc/self/mountinfo','utf8');
    const mounted=info.split('\n').some(line=>line.split(' ')[4]?.replace(/\\([0-7]{3})/g,(_,n)=>String.fromCharCode(parseInt(n,8)))===path);
    return mounted?{ready:true,reason:'mounted_storage_detected'}:{ready:false,reason:'path_is_not_a_dedicated_mount'};
  }catch{return {ready:false,reason:'persistent_mount_unavailable'};}
}
export class ProductionStore {
  constructor(path){
    mkdirSync(dirname(path),{recursive:true,mode:0o700});
    this.db=new Database(path);chmodSync(path,0o600);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS budgets(id TEXT PRIMARY KEY, policy TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS canonical(id TEXT PRIMARY KEY, budget_id TEXT, produced INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,budget_id TEXT NOT NULL REFERENCES budgets(id),canonical_id TEXT NOT NULL,
        request_hash TEXT NOT NULL,request TEXT NOT NULL,characters INTEGER NOT NULL,reservation INTEGER NOT NULL,
        state TEXT NOT NULL,actual_credits INTEGER,provider_id TEXT,audio BLOB,audio_sha256 TEXT);
      CREATE TABLE IF NOT EXISTS events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,at TEXT NOT NULL,job_id TEXT,event TEXT NOT NULL,detail TEXT NOT NULL);`);
  }
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const r=fn();this.db.exec('COMMIT');return r;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  event(job,event,detail={}){this.db.prepare('INSERT INTO events(at,job_id,event,detail) VALUES(?,?,?,?)').run(new Date().toISOString(),job,event,JSON.stringify(detail));}
  createBudget(policy){
    const {id:budgetId,maxRequests,maxCharacters,maxCredits,voiceId,models,approvedBy,expiresAt,priceEvidence}=policy;
    if(!id(budgetId)||!integer(maxRequests)||!integer(maxCharacters)||!integer(maxCredits)||maxRequests>1000||maxCharacters>1000000||maxCredits>1000000000||!id(voiceId)||!Array.isArray(models)||!models.length||!models.every(id)||typeof approvedBy!=='string'||!approvedBy.trim()||typeof priceEvidence!=='string'||!priceEvidence.trim()||!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=Date.now())throw Error('Invalid or unapproved budget');
    const allowed={id:budgetId,maxRequests,maxCharacters,maxCredits,voiceId,models,approvedBy,expiresAt,priceEvidence};
    return this.transaction(()=>{this.db.prepare('INSERT INTO budgets(id,policy) VALUES(?,?)').run(budgetId,JSON.stringify(allowed));this.event(null,'budget_created',allowed);return allowed;});
  }
  seedProduced(canonicalIds){
    if(!Array.isArray(canonicalIds)||!canonicalIds.every(id))throw Error('Invalid canonical IDs');
    return this.transaction(()=>{for(const key of canonicalIds){const existing=this.db.prepare('SELECT * FROM canonical WHERE id=?').get(key);if(existing&&!existing.produced)throw Error('Existing production claim needs reconciliation');this.db.prepare('INSERT OR IGNORE INTO canonical(id,produced) VALUES(?,1)').run(key);}this.event(null,'produced_seeded',{count:canonicalIds.length});});
  }
  reserve(input){
    const {jobId,budgetId,canonicalId,script,voiceId,modelId,reserveCredits,voiceSettings=null}=input;
    if(![jobId,budgetId,canonicalId,voiceId,modelId].every(id)||typeof script!=='string'||!script.trim()||script.length>1000||!integer(reserveCredits))throw Error('Invalid job');
    if(voiceSettings!==null&&(typeof voiceSettings!=='object'||Array.isArray(voiceSettings)||Object.entries(voiceSettings).some(([k,v])=>!['stability','similarity_boost','style','speed','use_speaker_boost'].includes(k)||!(typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)))))throw Error('Invalid voice settings');
    const settings=voiceSettings===null?null:Object.fromEntries(Object.entries(voiceSettings).sort(([a],[b])=>a.localeCompare(b)));
    const request={jobId,budgetId,canonicalId,script,voiceId,modelId,voiceSettings:settings,reserveCredits},requestJson=JSON.stringify(request),hash=digest(requestJson);
    return this.transaction(()=>{
      const previous=this.db.prepare('SELECT request_hash FROM jobs WHERE id=?').get(jobId);
      if(previous){if(previous.request_hash!==hash)throw Error('Job ID conflicts with a different request');return {replay:true,job:this.getJob(jobId)};}
      const row=this.db.prepare('SELECT policy FROM budgets WHERE id=?').get(budgetId);if(!row)throw Error('Budget not approved');const b=JSON.parse(row.policy);
      if(Date.parse(b.expiresAt)<=Date.now()||b.voiceId!==voiceId||!b.models.includes(modelId))throw Error('Budget expired or voice/model not authorized');
      if(this.db.prepare("SELECT 1 FROM jobs WHERE budget_id=? AND state='uncertain'").get(budgetId))throw Error('Uncertain provider charge must be reconciled first');
      const used=this.db.prepare('SELECT COUNT(*) AS requests,COALESCE(SUM(characters),0) AS characters,COALESCE(SUM(MAX(reservation,COALESCE(actual_credits,0))),0) AS credits FROM jobs WHERE budget_id=?').get(budgetId);
      if(used.requests+1>b.maxRequests||used.characters+script.length>b.maxCharacters||used.credits+reserveCredits>b.maxCredits)throw Error('Budget limit reached');
      const canonical=this.db.prepare('SELECT * FROM canonical WHERE id=?').get(canonicalId);
      if(canonical&&(canonical.produced||canonical.budget_id!==budgetId))throw Error('Canonical joke already produced or claimed by another run');
      this.db.prepare('INSERT OR IGNORE INTO canonical(id,budget_id) VALUES(?,?)').run(canonicalId,budgetId);
      this.db.prepare("INSERT INTO jobs(id,budget_id,canonical_id,request_hash,request,characters,reservation,state) VALUES(?,?,?,?,?,?,?,'reserved')").run(jobId,budgetId,canonicalId,hash,requestJson,script.length,reserveCredits);
      this.event(jobId,'reserved',{budgetId,reserveCredits,characters:script.length});return {replay:false,job:this.getJob(jobId)};
    });
  }
  claimSubmission(jobId){return this.transaction(()=>{const changed=this.db.prepare("UPDATE jobs SET state='submitted' WHERE id=? AND state='reserved'").run(jobId).changes;if(changed)this.event(jobId,'submitted');return changed===1;});}
  markUncertain(jobId){return this.transaction(()=>{const changed=this.db.prepare("UPDATE jobs SET state='uncertain' WHERE id=? AND state='submitted'").run(jobId).changes;if(changed)this.event(jobId,'provider_outcome_uncertain');return changed===1;});}
  recoverSubmitted(){return this.transaction(()=>{const rows=this.db.prepare("SELECT id FROM jobs WHERE state='submitted'").all();for(const {id:jobId} of rows){this.db.prepare("UPDATE jobs SET state='uncertain' WHERE id=?").run(jobId);this.event(jobId,'restart_requires_provider_reconciliation');}return rows.length;});}
  complete(jobId,audio,{providerId,actualCredits=null}={}){
    if(!(audio instanceof Uint8Array)||!audio.length||audio.length>16*1024*1024||!id(providerId)||(actualCredits!==null&&!integer(actualCredits,0)))throw Error('Invalid original audio or usage');
    return this.transaction(()=>{const row=this.db.prepare('SELECT state FROM jobs WHERE id=?').get(jobId);if(row?.state!=='submitted')throw Error('Job is not an active submission');
      const hash=digest(audio);this.db.prepare("UPDATE jobs SET state='completed',audio=?,audio_sha256=?,provider_id=?,actual_credits=? WHERE id=?").run(audio,hash,providerId,actualCredits,jobId);this.event(jobId,'original_preserved',{sha256:hash,bytes:audio.length,providerId,actualCredits});return hash;});
  }
  getJob(jobId){const row=this.db.prepare('SELECT id,budget_id,canonical_id,request,state,reservation,actual_credits,provider_id,audio_sha256,length(audio) AS audio_bytes FROM jobs WHERE id=?').get(jobId);return row?{...row,request:JSON.parse(row.request)}:null;}
  getAudio(jobId){const row=this.db.prepare('SELECT audio FROM jobs WHERE id=?').get(jobId);return row?.audio?Buffer.from(row.audio):null;}
  history(jobId){return this.db.prepare('SELECT sequence,at,event,detail FROM events WHERE job_id=? ORDER BY sequence').all(jobId).map(e=>({...e,detail:JSON.parse(e.detail)}));}
  backup(path){this.db.prepare('VACUUM INTO ?').run(path);chmodSync(path,0o600);}
  close(){this.db.close();}
}
export function openMountedStore(directory){
  const readiness=storageReadiness(directory);if(!readiness.ready)return {readiness,store:null};
  try{return {readiness,store:new ProductionStore(join(realpathSync(directory),'jokelet.sqlite'))};}
  catch{return {readiness:{ready:false,reason:'database_unavailable'},store:null};}
}
