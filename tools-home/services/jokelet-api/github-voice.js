import {createHash} from 'node:crypto';
const ROOT='tools-home/tools/jokelab',REPO='keythjyles/Vitals-Tracker-v1.0';
const digest=b=>createHash('sha256').update(b).digest('hex');
const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export class VoiceGateError extends Error{constructor(code,status=403){super(code);this.status=status;this.code=code;}}
const fail=(code,status)=>{throw new VoiceGateError(code,status);};
export class GitHubVoiceRepository {
 constructor(token,fetcher=fetch){this.token=token;this.fetcher=fetcher;}
 async api(path,method='GET',body){
  const r=await this.fetcher('https://api.github.com/repos/'+REPO+'/'+path,{method,headers:{Authorization:'Bearer '+this.token,Accept:'application/vnd.github+json','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!r.ok)fail('repository_http_'+r.status,r.status===404?404:502);return r.json();
 }
 async read(path,ref='main'){
  let data;try{data=await this.api('contents/'+path+'?ref='+encodeURIComponent(ref));}catch(e){if(e.code==='repository_http_404')return null;throw e;}
  if(!data.content)fail('repository_content_unavailable',502);
  return {value:JSON.parse(Buffer.from(data.content,'base64').toString()),sha:data.sha};
 }
 async bytes(path,ref='main'){
  const data=await this.api('contents/'+path+'?ref='+encodeURIComponent(ref));
  const blob=data.content?data:await this.api('git/blobs/'+data.sha);return Buffer.from(blob.content,'base64');
 }
 async commit(entries,guards){
  for(let attempt=0;attempt<3;attempt++){
   const head=(await this.api('git/ref/heads/main')).object.sha;
   await guards(head);
   const base=(await this.api('git/commits/'+head)).tree.sha;
   const tree=[];
   for(const e of entries){if(e.bytes){const blob=await this.api('git/blobs','POST',{content:Buffer.from(e.bytes).toString('base64'),encoding:'base64'});tree.push({path:e.path,mode:'100644',type:'blob',sha:blob.sha});}else tree.push({path:e.path,mode:'100644',type:'blob',content:stable(e.value)+'\n'});}
   const newtree=await this.api('git/trees','POST',{base_tree:base,tree});
   const commit=await this.api('git/commits','POST',{message:'Jokelet bounded voice job checkpoint',tree:newtree.sha,parents:[head]});
   try{await this.api('git/refs/heads/main','PATCH',{sha:commit.sha,force:false});return commit.sha;}
   catch(e){if(!['repository_http_409','repository_http_422'].includes(e.code)||attempt===2)throw e;}
  }
 }
 async claim(request,identity){
  const path=ROOT+'/voice-jobs/'+request.jobId+'.json',canonical=ROOT+'/canonical-claims/'+request.canonicalId+'.json';
  const claimed={schema:'GS-VoiceJob-2',status:'submitted',jobId:request.jobId,request,requestSha256:digest(stable(request)),sourceCommit:identity.commit,runId:identity.runId,attempt:1,reservedCredits:request.budget.maxCredits,automaticRetries:0};
  await this.commit([{path,value:claimed},{path:canonical,value:{jobId:request.jobId,canonicalId:request.canonicalId,kind:'voice_attempt_reserved'}}],async head=>{
   const job=await this.read(path,head),owner=await this.read(canonical,head);
   if(!job||job.value.status!=='queued'||job.value.sourceCommit!==identity.commit||job.value.runId!==identity.runId||stable(job.value.request)!==stable(request))fail('job_not_queued_for_this_run',409);
   if(owner)fail('canonical_already_reserved',409);
  });return claimed;
 }
 async complete(job,audio,usage){
  const path=ROOT+'/voice-jobs/'+job.jobId+'.json',audioPath=ROOT+'/voice-originals/'+job.jobId+'.mp3';
  const completed={...job,status:'completed',original:{path:audioPath,sha256:digest(audio),bytes:audio.length,format:'audio/mpeg'},usage};
  await this.commit([{path,value:completed},{path:audioPath,bytes:audio}],async head=>{const current=await this.read(path,head);if(current?.value.status!=='submitted'||current.value.requestSha256!==job.requestSha256||current.value.runId!==job.runId)fail('job_receipt_changed',409);});return completed;
 }
 async uncertain(job){
  const path=ROOT+'/voice-jobs/'+job.jobId+'.json';
  await this.commit([{path,value:{...job,status:'uncertain',reconciliationRequired:true}}],async head=>{const current=await this.read(path,head);if(current?.value.status!=='submitted'||current.value.runId!==job.runId)fail('job_receipt_changed',409);});
 }
}
export function validateVoiceRequest(r,{allowExpired=false,quoteOnly=false}={}){
 if(!r||!/^JL-[A-Za-z0-9_-]{1,100}$/.test(r.jobId||'')||r.operation!=='voice_generate')fail('invalid_voice_job',400);
 if(!quoteOnly&&(r.approved!==true||r.budget?.approved!==true||typeof r.budget.approvalEvidence!=='string'||!r.budget.approvalEvidence.trim()))fail('approval_required');
 if(!r.budget||r.budget.maxRequests!==1||!Number.isInteger(r.budget.maxCharacters)||r.budget.maxCharacters<1||r.budget.maxCharacters>1000||r.automaticRetries!==0||!Number.isInteger(r.budget.maxCredits)||r.budget.maxCredits<1||r.budget.maxCredits>1000||!Number.isFinite(Date.parse(r.budget.expiresAt))||(!allowExpired&&!quoteOnly&&Date.parse(r.budget.expiresAt)<=Date.now()))fail('invalid_or_expired_budget');
 if(r.voiceId!=='RBNpu6jPzAoaxZKl9noJ'||r.modelId!=='eleven_v3')fail('voice_or_model_not_authorized');
 if(typeof r.script!=='string'||!r.script.trim()||r.script.length>1000||r.script.length>r.budget.maxCharacters||/\[\[|\]\]/.test(r.script)||!/^dad-[a-f0-9]{24}$/.test(r.canonicalId||''))fail('invalid_script_or_identity',400);
 if(r.voiceSettings!==undefined&&(typeof r.voiceSettings!=='object'||r.voiceSettings===null||Array.isArray(r.voiceSettings)||Object.entries(r.voiceSettings).some(([k,v])=>!['stability','similarity_boost','style','speed','use_speaker_boost'].includes(k)||!(k==='use_speaker_boost'?typeof v==='boolean':typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=2))))fail('invalid_voice_settings',400);
 if(!quoteOnly&&(r.duplicateReview?.cleared!==true||!r.duplicateReview.evidence))fail('duplicate_review_required');
}
export async function executeVoice({repo,request,identity,provider,dryRun=false}){
 if(!request||!/^JL-[A-Za-z0-9_-]{1,100}$/.test(request.jobId||''))fail('invalid_voice_job',400);
 const old=await repo.read(ROOT+'/voice-jobs/'+request.jobId+'.json');
 if(old?.value.status==='completed'){
  validateVoiceRequest(request,{allowExpired:true});
  if(stable(old.value.request)!==stable(request))fail('job_id_conflict',409);
  const bytes=await repo.bytes(old.value.original.path);if(digest(bytes)!==old.value.original.sha256)fail('original_integrity_failed',409);
  return {job:old.value,replayed:true,providerRequests:0};
 }
 validateVoiceRequest(request);
 if(old&&old.value.status!=='queued')fail('unfinished_job_requires_reconciliation',409);
 const ledger=await repo.read(ROOT+'/PRODUCTION_LEDGER.json');if(!ledger)fail('duplicate_ledger_unavailable');
 if(ledger.value.aliases?.[request.canonicalId]&&ledger.value.aliases[request.canonicalId]!==request.canonicalId)fail('canonical_alias_must_be_resolved',409);
 const produced=(ledger.value.existingGroups||[]).some(g=>g.canonicalId===request.canonicalId)||(ledger.value.selectedBatch||[]).some(j=>j.canonicalId===request.canonicalId&&j.state!=='selection_withdrawn');
 const blocked=(ledger.value.sourceBacklog||[]).some(j=>j.canonicalId===request.canonicalId&&j.state!=='not_started_unverified');
 if(produced||blocked)fail('canonical_already_produced_or_reserved',409);
 if(dryRun)return {dryRun:true,providerRequests:0,readyForFundingCheck:true};
 // Non-paid provider checks must pass before taking the permanent one-attempt reservation.
 const funding=await provider.check(request);
 const job=await repo.claim(request,identity);
 let generated;
 try{
  generated=await provider.generate(request);
  const completed=await repo.complete(job,generated.audio,{...generated.usage,modelCostFactor:funding.modelCostFactor,budgetExceeded:generated.usage.actualCredits!==null&&generated.usage.actualCredits>request.budget.maxCredits});
  return {job:completed,replayed:false,providerRequests:1};
 }catch(e){
  try{await repo.uncertain(job);}catch{}
  // Preserve received bytes for the authenticated workflow artifact if repository persistence failed.
  if(generated?.audio)return {error:'persistence_uncertain',status:502,reconciliationRequired:true,providerRequests:1,recoveryAudioBase64:generated.audio.toString('base64'),recoverySha256:digest(generated.audio),usage:generated.usage};
  fail('provider_outcome_uncertain_no_retry',502);
 }
}
export function elevenProvider(key,fetcher=fetch){
 const get=async path=>{const r=await fetcher('https://api.elevenlabs.io'+path,{headers:{'xi-api-key':key,accept:'application/json'},signal:AbortSignal.timeout(15000)});if(!r.ok)fail('provider_preflight_http_'+r.status,502);return r.json();};
 return {
  async check(request){
   const [models,voice,subscription]=await Promise.all([get('/v1/models'),get('/v1/voices/'+request.voiceId),get('/v1/user/subscription')]);
   const factor=models.find(m=>m.model_id===request.modelId&&m.can_do_text_to_speech)?.token_cost_factor;
   if(!Number.isFinite(factor)||factor<=0||factor>1||voice.category!=='generated')fail('pricing_bound_not_verified');
   const required=Math.ceil(request.script.length*factor);
   if(required>request.budget.maxCredits||!Number.isFinite(subscription.character_limit)||!Number.isFinite(subscription.character_count)||subscription.character_limit-subscription.character_count<request.budget.maxCredits)fail('insufficient_reserved_credits');
   return {modelCostFactor:factor,expectedCredits:required}; // Do not persist personal billing details or balances in the public repository.
  },
  async generate(request){
   const r=await fetcher('https://api.elevenlabs.io/v1/text-to-speech/'+request.voiceId+'?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':key,'content-type':'application/json',accept:'audio/mpeg'},body:JSON.stringify({text:request.script,model_id:request.modelId,...(request.voiceSettings?{voice_settings:request.voiceSettings}:{})}),signal:AbortSignal.timeout(60000)});
   if(!r.ok)fail('provider_generation_failed',502);
   const bytes=Buffer.from(await r.arrayBuffer());if(!bytes.length||bytes.length>5*1024*1024)fail('invalid_provider_audio',502);
   const raw=r.headers.get('character-cost'),cost=raw!==null&&raw.trim()!==''?Number(raw):NaN;
   return {audio:bytes,usage:{actualCredits:Number.isFinite(cost)&&cost>=0?cost:null,requestId:r.headers.get('request-id'),historyItemId:r.headers.get('history-item-id'),costStatus:Number.isFinite(cost)?'provider_reported':'unknown'}};
  }
 };
}
