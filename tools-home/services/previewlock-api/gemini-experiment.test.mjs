import test from 'node:test';
import assert from 'node:assert/strict';
import {runExperiment} from './gemini-experiment.mjs';
const env={GEMINI_API_KEY:'test-only',GEMINI_EXPERIMENT_RUN_ID:'GS-GEMINI-20261029-01'};
function fixture({failure=false,saveFailure=false,doc=null}={}){
 let stored=doc,revision=doc?'r1':null,n=1,calls=0;
 const fetcher=async(url,options={})=>{
  if(url.endsWith('/files/download'))return stored?Response.json(stored,{headers:{'dropbox-api-result':JSON.stringify({rev:revision})}}):new Response('path/not_found',{status:409});
  if(url.endsWith('/files/create_folder_v2'))return Response.json({});
  if(url.endsWith('/files/upload')){
   if(saveFailure)return new Response('',{status:503});
   const arg=JSON.parse(options.headers['dropbox-api-arg']);
   if((arg.mode==='add'||arg.mode?.['.tag']==='add')&&stored||arg.mode?.['.tag']==='update'&&arg.mode.update!==revision)return new Response('conflict',{status:409});
   stored=JSON.parse(options.body);revision='r'+(++n);return Response.json({rev:revision});
  }
  if(url.includes('/models?pageSize'))return Response.json({models:[{name:'models/gemini-3.8-flash'},{name:'models/gemini-omni-1.1-flash',outputTokenLimit:65536}]});
  if(url.endsWith('/interactions')){
   calls++;assert.equal(stored.events.at(-1).state,'pending');assert.equal(stored.events.at(-1).reservedUsd,0.25);
   const body=JSON.parse(options.body);assert.equal(body.generation_config.max_output_tokens,2048);assert(!JSON.stringify(body).includes('ChatGPT independent proposal'));
   if(failure)throw Error('uncertain');
   return Response.json({id:'reply-1',model:'gemini-3.8-flash',status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'Independent treatment.'}]}],usage:{total_input_tokens:1000,total_output_tokens:100}});
  }
  throw Error('Unexpected URL');
 };
 return {fetcher,get calls(){return calls},get doc(){return stored}};
}
test('disabled job never accesses storage or provider',async()=>{const f=fixture();assert.equal((await runExperiment('test',{env:{},fetcher:f.fetcher})).state,'disabled');assert.equal(f.calls,0)});
test('reserves durably before one call, saves usage and independently reads back, restart cannot repeat',async()=>{const f=fixture();assert.equal((await runExperiment('test',{env,fetcher:f.fetcher})).state,'completed');assert.equal(f.doc.events[0].response,'Independent treatment.');assert.equal(f.doc.events[0].actualChargeUsd,null);assert.equal((await runExperiment('test',{env,fetcher:f.fetcher})).state,'already_recorded');assert.equal(f.calls,1)});
test('uncertain provider call stays reserved and cannot repeat',async()=>{const f=fixture({failure:true});assert.equal((await runExperiment('test',{env,fetcher:f.fetcher})).state,'uncertain');assert.equal((await runExperiment('test',{env,fetcher:f.fetcher})).state,'already_recorded');assert.equal(f.calls,1);assert.equal(f.doc.events[0].reservedUsd,0.25)});
test('failed pre-call persistence prohibits spend',async()=>{const f=fixture({saveFailure:true});await assert.rejects(runExperiment('test',{env,fetcher:f.fetcher}),/experiment_save_failed/);assert.equal(f.calls,0)});
test('exhausted budget and unresolved jobs prohibit spend',async()=>{for(const events of [[{id:'other',state:'completed',reservedUsd:5}],[{id:'other',state:'pending',reservedUsd:0.25}]]){const f=fixture({doc:{authorization:{cap:5},events}});await assert.rejects(runExperiment('test',{env,fetcher:f.fetcher}),/budget_exceeded|unresolved_prior_request/);assert.equal(f.calls,0)}});
test('competing starts admit at most one paid request through Dropbox CAS',async()=>{const f=fixture();await Promise.allSettled([runExperiment('test',{env,fetcher:f.fetcher}),runExperiment('test',{env,fetcher:f.fetcher})]);assert.equal(f.calls,1)});
test('explicitly reconciles only the hash-matched observed400 and retains its reservation',async()=>{const f=fixture({doc:{authorization:{cap:5},events:[{id:'gemini-independent-proposal-02',state:'uncertain',providerStatus:400,requestSha256:'648a64792e1b71ee51f9f6ad91b007d32eca12e2ece42cbc8fec082f8827fafd',reservedUsd:0.25}]}});await runExperiment('test',{env,fetcher:f.fetcher});assert.equal(f.doc.events[0].state,'rejected');assert.equal(f.doc.events.reduce((n,e)=>n+e.reservedUsd,0),0.5);assert.equal(f.calls,1)});
test('a mismatched404 cannot bypass unresolved-request protection',async()=>{const f=fixture({doc:{authorization:{cap:5},events:[{id:'gemini-independent-proposal-01',state:'uncertain',providerStatus:404,requestSha256:'wrong',reservedUsd:0.25}]}});await assert.rejects(runExperiment('test',{env,fetcher:f.fetcher}),/unresolved_prior_request/);assert.equal(f.calls,0)});
