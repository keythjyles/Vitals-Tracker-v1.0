import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {executeVoice,VoiceGateError,elevenProvider} from './github-voice.js';
const request=()=>({jobId:'JL-TEST-VOICE',operation:'voice_generate',canonicalId:'dad-01390bc83ffc16630ae3d503',script:'[joking] A test.',voiceId:'RBNpu6jPzAoaxZKl9noJ',modelId:'eleven_v3',approved:true,budget:{approved:true,approvalEvidence:'TEST ONLY',maxRequests:1,maxCharacters:100,maxCredits:100,expiresAt:new Date(Date.now()+60000).toISOString()},automaticRetries:0,duplicateReview:{cleared:true,evidence:'TEST ONLY'}});
function fixtures(){let state='queued',calls=0,checks=0,claims=0,receipt=null;const audio=Buffer.from('original-test-audio');
 const repo={async read(path){return path.endsWith('PRODUCTION_LEDGER.json')?{value:{existingGroups:[],selectedBatch:[],sourceBacklog:[]}}:receipt?{value:receipt}:state?{value:{status:state}}:null;},async bytes(){return audio;},async claim(r,i){if(state!=='queued')throw new VoiceGateError('already_claimed',409);state='submitted';claims++;return {jobId:r.jobId,request:r,runId:'run'};},async complete(job,bytes,usage){receipt={...job,status:'completed',original:{path:'original.mp3',sha256:createHash('sha256').update(bytes).digest('hex')},usage};state='completed';return receipt;},async uncertain(){state='uncertain';}};
 const provider={async check(){checks++;return {modelCostFactor:1};},async generate(){calls++;return {audio,usage:{actualCredits:15}};}};
 return {repo,provider,get calls(){return calls;},get checks(){return checks;},get claims(){return claims;},get state(){return state;}};
}
test('approval, credit, model and marker failures never reach paid provider',async()=>{
 for(const edit of [{approved:false},{budget:{...request().budget,maxRequests:2}},{budget:{...request().budget,maxCredits:0}},{budget:{...request().budget,maxCharacters:undefined}},{modelId:'other'},{script:'x[[silence:25f]]'},{voiceSettings:{stability:'secret'}},{duplicateReview:{cleared:false}}]){const f=fixtures();await assert.rejects(executeVoice({...f,identity:{},request:{...request(),...edit}}));assert.equal(f.calls,0);assert.equal(f.claims,0);}
});
test('replay after a completed paid attempt returns preserved original with zero extra calls',async()=>{
 const f=fixtures(),r=request();await executeVoice({...f,identity:{},request:r});assert.equal(f.calls,1);
 r.budget.expiresAt=r.budget.expiresAt;const replay=await executeVoice({...f,identity:{},request:r});assert.equal(replay.replayed,true);assert.equal(f.calls,1);assert.equal(f.claims,1);
});
test('concurrent workers can claim at most one paid submission',async()=>{
 const f=fixtures(),r=request();const results=await Promise.allSettled([executeVoice({...f,identity:{},request:r}),executeVoice({...f,identity:{},request:r})]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(f.calls,1);assert.equal(f.claims,1);
});
test('timeout retains uncertain receipt and a second attempt is blocked',async()=>{
 const f=fixtures();let attempts=0;f.provider.generate=async()=>{attempts++;throw Error('timeout');};await assert.rejects(executeVoice({...f,identity:{},request:request()}));assert.equal(f.state,'uncertain');await assert.rejects(executeVoice({...f,identity:{},request:request()}));assert.equal(attempts,1);
});
test('failed original persistence returns a recovery copy without regenerating',async()=>{
 const f=fixtures();f.repo.complete=async()=>{throw Error('storage failed');};const r=await executeVoice({...f,identity:{},request:request()});assert.equal(r.error,'persistence_uncertain');assert.equal(Buffer.from(r.recoveryAudioBase64,'base64').toString(),'original-test-audio');assert.equal(f.calls,1);assert.equal(f.state,'uncertain');
});
test('dry run never checks or calls provider and a produced canonical joke is blocked',async()=>{
 const f=fixtures();const r=await executeVoice({...f,identity:{},request:request(),dryRun:true});assert.equal(r.providerRequests,0);assert.equal(f.checks,0);
 f.repo.read=async()=>({value:{existingGroups:[{canonicalId:request().canonicalId}]}});await assert.rejects(executeVoice({...f,identity:{},request:request(),dryRun:true}));assert.equal(f.calls,0);
});

test('provider pricing and remaining-credit checks occur before any paid POST',async()=>{
 for(const issue of ['price','balance']){let posts=0;const fetcher=async(url,options)=>{if(options.method==='POST'){posts++;throw Error('must not post');}let data=url.endsWith('/models')?[{model_id:'eleven_v3',can_do_text_to_speech:true,token_cost_factor:issue==='price'?2:1}]:url.includes('/voices/')?{category:'generated'}:{character_limit:1000,character_count:995};return new Response(JSON.stringify(data),{status:200});};await assert.rejects(elevenProvider('private-test-key',fetcher).check(request()));assert.equal(posts,0);}
});
test('provider usage comes from response headers and excludes credentials',async()=>{
 const p=elevenProvider('private-test-key',async()=>new Response(new Uint8Array([1,2,3]),{status:200,headers:{'content-type':'audio/mpeg','character-cost':'15','request-id':'provider-request'}}));
 const r=await p.generate(request());assert.equal(r.usage.actualCredits,15);assert.equal(r.usage.requestId,'provider-request');assert.ok(!JSON.stringify(r).includes('private-test-key'));
});

test('known aliases must be resolved before a new paid job can claim a joke',async()=>{
 const f=fixtures();f.repo.read=async(path)=>path.endsWith('PRODUCTION_LEDGER.json')?{value:{aliases:{[request().canonicalId]:'dad-000000000000000000000000'}}}:{value:{status:'queued'}};
 await assert.rejects(executeVoice({...f,identity:{},request:request(),dryRun:true}));assert.equal(f.calls,0);
});
