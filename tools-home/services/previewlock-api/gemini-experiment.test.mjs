import test from 'node:test';
import assert from 'node:assert/strict';
import {runExperiment} from './gemini-experiment.mjs';
const env={GEMINI_API_KEY:'test-only',GEMINI_EXPERIMENT_RUN_ID:'GS-GEMINI-20261029-01'};
const testJob={runId:'GS-GEMINI-20261029-01',authorization:{currency:'USD',cap:5,evidence:'Test-only'},assignment:'Test assignment',action:{id:'test-independent-0001',type:'text',model:'gemini-3.8-flash',reserveUsd:0.25,prompt:'Independent proposal'},reconciliations:[{id:'gemini-independent-proposal-02',requestSha256:'648a64792e1b71ee51f9f6ad91b007d32eca12e2ece42cbc8fec082f8827fafd',providerStatus:400,reason:'Test status/hash matched rejection'}]};
const execute=(token,options)=>runExperiment(token,{...options,jobOverride:testJob});
function fixture({failure=false,saveFailure=false,background=false,video=false,doc=null}={}){
 const assets=new Map();let stored=doc,revision=doc?'r1':null,n=1,calls=0;
 const fetcher=async(url,options={})=>{
  if(url.endsWith('/files/download')&&JSON.parse(options.headers['dropbox-api-arg']).path.endsWith('.mp4')){const bytes=assets.get(JSON.parse(options.headers['dropbox-api-arg']).path);return bytes?new Response(bytes):new Response('',{status:409})}
  if(url.endsWith('/files/download'))return stored?Response.json(stored,{headers:{'dropbox-api-result':JSON.stringify({rev:revision})}}):new Response('path/not_found',{status:409});
  if(url.endsWith('/files/create_folder_v2'))return Response.json({});
  if(url.endsWith('/files/upload')){
   if(saveFailure)return new Response('',{status:503});
   const assetArg=JSON.parse(options.headers['dropbox-api-arg']);if(assetArg.path.endsWith('.mp4')){assets.set(assetArg.path,options.body);return Response.json({size:options.body.length})}
   const arg=JSON.parse(options.headers['dropbox-api-arg']);
   if((arg.mode==='add'||arg.mode?.['.tag']==='add')&&stored||arg.mode?.['.tag']==='update'&&arg.mode.update!==revision)return new Response('conflict',{status:409});
   stored=JSON.parse(options.body);revision='r'+(++n);return Response.json({rev:revision});
  }
  if(url.includes('/models?pageSize'))return Response.json({models:[{name:'models/gemini-3.8-flash'},{name:'models/gemini-omni-1.1-flash',outputTokenLimit:65536}]});
  if(url.endsWith('/interactions/reply-1'))return Response.json({id:'reply-1',model:'gemini-3.8-flash',status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'Recovered background treatment.'}]}],usage:{total_input_tokens:1000,total_output_tokens:100}});
  if(url.endsWith('/interactions')){
   calls++;assert.equal(stored.events.at(-1).state,'pending');assert.equal(stored.events.at(-1).reservedUsd,video?2:0.25);
   const body=JSON.parse(options.body);assert.equal(body.generation_config.max_output_tokens,video?65536:2048);assert(!JSON.stringify(body).includes('ChatGPT independent proposal'));
   if(failure)throw Error('uncertain');
   if(video){assert.equal(body.system_instruction,undefined);assert.equal(body.response_format.duration,'10s');return Response.json({id:'video-1',model:'gemini-omni-1.1-flash',status:'completed',steps:[{type:'model_output',content:[{type:'video',mime_type:'video/mp4',data:Buffer.from('test-only-video-bytes').toString('base64')}]}],usage:{total_input_tokens:1000,total_output_tokens:57920}})}
   if(background)return Response.json({id:'reply-1',model:'gemini-3.8-flash',status:'in_progress'});
   return Response.json({id:'reply-1',model:'gemini-3.8-flash',status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'Independent treatment.'}]}],usage:{total_input_tokens:1000,total_output_tokens:100}});
  }
  throw Error('Unexpected URL');
 };
 return {fetcher,get calls(){return calls},get doc(){return stored}};
}
test('disabled job never accesses storage or provider',async()=>{const f=fixture();assert.equal((await execute('test',{env:{},fetcher:f.fetcher})).state,'disabled');assert.equal(f.calls,0)});
test('reserves durably before one call, saves usage and independently reads back, restart cannot repeat',async()=>{const f=fixture();assert.equal((await execute('test',{env,fetcher:f.fetcher})).state,'completed');assert.equal(f.doc.events[0].response,'Independent treatment.');assert.equal(f.doc.events[0].actualChargeUsd,null);assert.equal((await execute('test',{env,fetcher:f.fetcher})).state,'already_recorded');assert.equal(f.calls,1)});
test('uncertain provider call stays reserved and cannot repeat',async()=>{const f=fixture({failure:true});assert.equal((await execute('test',{env,fetcher:f.fetcher})).state,'uncertain');assert.equal((await execute('test',{env,fetcher:f.fetcher})).state,'already_recorded');assert.equal(f.calls,1);assert.equal(f.doc.events[0].reservedUsd,0.25)});
test('failed pre-call persistence prohibits spend',async()=>{const f=fixture({saveFailure:true});await assert.rejects(execute('test',{env,fetcher:f.fetcher}),/experiment_save_failed/);assert.equal(f.calls,0)});
test('exhausted budget and unresolved jobs prohibit spend',async()=>{for(const events of [[{id:'other',state:'completed',reservedUsd:5}],[{id:'other',state:'pending',reservedUsd:0.25}]]){const f=fixture({doc:{authorization:{cap:5},events}});await assert.rejects(execute('test',{env,fetcher:f.fetcher}),/budget_exceeded|unresolved_prior_request/);assert.equal(f.calls,0)}});
test('competing starts admit at most one paid request through Dropbox CAS',async()=>{const f=fixture();await Promise.allSettled([execute('test',{env,fetcher:f.fetcher}),execute('test',{env,fetcher:f.fetcher})]);assert.equal(f.calls,1)});
test('explicitly reconciles only the hash-matched observed400 and retains its reservation',async()=>{const f=fixture({doc:{authorization:{cap:5},events:[{id:'gemini-independent-proposal-02',state:'uncertain',providerStatus:400,requestSha256:'648a64792e1b71ee51f9f6ad91b007d32eca12e2ece42cbc8fec082f8827fafd',reservedUsd:0.25}]}});await execute('test',{env,fetcher:f.fetcher});assert.equal(f.doc.events[0].state,'rejected');assert.equal(f.doc.events.reduce((n,e)=>n+e.reservedUsd,0),0.5);assert.equal(f.calls,1)});
test('a mismatched404 cannot bypass unresolved-request protection',async()=>{const f=fixture({doc:{authorization:{cap:5},events:[{id:'gemini-independent-proposal-01',state:'uncertain',providerStatus:404,requestSha256:'wrong',reservedUsd:0.25}]}});await assert.rejects(execute('test',{env,fetcher:f.fetcher}),/unresolved_prior_request/);assert.equal(f.calls,0)});

test('background ID is saved before GET retrieval; restart resumes without another POST',async()=>{const f=fixture({background:true});await execute('test',{env,fetcher:f.fetcher});assert.equal(f.doc.events[0].responseId,'reply-1');assert.equal(f.doc.events[0].response,'Recovered background treatment.');await execute('test',{env,fetcher:f.fetcher});assert.equal(f.calls,1)});

test('video requires a joint plan before spending',async()=>{const f=fixture();await assert.rejects(runExperiment('test',{env,fetcher:f.fetcher,jobOverride:{...testJob,action:{id:'video-test-01',type:'video',model:'gemini-omni-1.1-flash',reserveUsd:2,prompt:'Silent reaction'}}}),/missing_two_ai_plan/);assert.equal(f.calls,0)});
test('video is bounded, original bytes are saved and read back, and restart never regenerates',async()=>{const f=fixture({video:true,doc:{authorization:{cap:5},events:[{id:'agreement-test',state:'completed',reservedUsd:0.25}]}}),job={...testJob,plan:{chatgptAgreed:true,geminiAgreementActionId:'agreement-test'},action:{id:'video-test-01',type:'video',model:'gemini-omni-1.1-flash',reserveUsd:2,requires:['agreement-test'],prompt:'Silent reaction'}};await runExperiment('test',{env,fetcher:f.fetcher,jobOverride:job});const output=f.doc.events.at(-1).output;assert(output.verifiedReadback);assert.equal(output.bytes,21);assert.equal(f.doc.events.at(-1).reservedUsd,2);await runExperiment('test',{env,fetcher:f.fetcher,jobOverride:job});assert.equal(f.calls,1)});

test('read-only retrieval can never create a missing generation',async()=>{const f=fixture();const r=await runExperiment('test',{env,fetcher:f.fetcher,jobOverride:testJob,retrieveOnly:true,maxPolls:1});assert.equal(r.state,'not_started');assert.equal(f.calls,0)});
