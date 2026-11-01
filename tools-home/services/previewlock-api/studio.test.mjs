import test from 'node:test';import assert from 'node:assert/strict';import {Readable} from 'node:stream';
import {handleJokeProject,dropboxHash} from './joke-project.mjs';
test('studio checkpoints preserve native edits and cut passes; retries, stale writers and wrong projects cannot overwrite them',async()=>{
 const files=new Map();let serial=0;const real=global.fetch;
 global.fetch=async(url,opt)=>{
  const a=opt.headers['dropbox-api-arg']?JSON.parse(opt.headers['dropbox-api-arg']):JSON.parse(opt.body),path=a.path;
  if(url.endsWith('/create_folder_v2'))return Response.json({});
  if(url.endsWith('/download')){const f=files.get(path);return f?new Response(f.bytes,{headers:{'dropbox-api-result':JSON.stringify({rev:f.rev})}}):new Response('not_found',{status:409});}
  if(url.endsWith('/upload')){const old=files.get(path);if(a.mode?.update&&old?.rev!==a.mode.update||a.mode==='add'&&old)return new Response('conflict',{status:409});const f={bytes:Buffer.from(opt.body),rev:'r'+(++serial)};files.set(path,f);return Response.json({id:path});}
  if(url.endsWith('/get_metadata')){const f=files.get(path);return Response.json({id:path,path_display:path,rev:f.rev,size:f.bytes.length,content_hash:dropboxHash(f.bytes)});}
  if(url.endsWith('/list_folder'))return Response.json({entries:[]});throw Error('Unexpected provider call '+url);
 };
 const call=async(method,path,data)=>{let code,value;const req=Readable.from(data?[Buffer.from(JSON.stringify(data))]:[]);req.method=method;req.headers={origin:'http://127.0.0.1:3199'};await handleJokeProject(req,{writeHead(s){code=s;},end(s){value=JSON.parse(s);}},new URL('https://test/api/joke-project'+path+'?id=studio-fixture'),'fixture-token');return {code,...value};};
 try{
  let d=await call('POST','',{rev:null,title:'Exact joke',text:'Exact source text.'});assert.equal(d.code,200);
  const native={schema:'GS-StudioModule-1',module:'sound',projectId:'studio-fixture',state:{schema:'SxLock-1.0',clips:[{id:'cue-1',start:.24,offset:.04,volume:51}],mixer:{voice:63}}};
  const save={rev:d.rev,module:'sound',moduleRevision:0,nextPhase:'review',requestId:'checkpoint-request-01',session:native};
  d=await call('POST','/studio',save);assert.equal(d.code,200);assert.equal(d.persisted,true);assert.equal(d.project.studio.activePhase,'review');assert.deepEqual(d.project.studio.modules.sound.session,native);assert.equal(d.project.text,'Exact source text.');assert.equal(d.project.backup.state,'pending');
  assert.equal((await call('POST','/studio',save)).reused,true);
  assert.equal((await call('POST','/studio',{...save,rev:d.rev,requestId:'checkpoint-request-02'})).code,409);
  assert.equal((await call('POST','/studio',{...save,rev:d.rev,moduleRevision:1,requestId:'checkpoint-request-03',session:{...native,projectId:'different-project'}})).code,400);
  const root='/Grill Sergeant/JokeLab Productions/studio-fixture',file=files.get(root+'/project.json'),p=JSON.parse(file.bytes);
  p.assets=[{id:'caption-a',role:'caption',sha256:'source-sha',cuts:{id:'pass-1',version:1,status:'complete',clips:[{path:root+'/1.webm'}],ranges:[{inFrame:0,outFrame:25}]}}];file.bytes=Buffer.from(JSON.stringify(p));
  const recipe={schema:'GS-StudioModule-1',module:'cut',projectId:p.id,source:{assetId:'caption-a',sha256:'source-sha',passId:'pass-1'},cuts:[{inFrame:2,outFrame:11,name:'Question'}],cursor:8};
  d=await call('GET','');const before=JSON.stringify(d.project.assets);
  d=await call('POST','/studio',{rev:d.rev,module:'cut',moduleRevision:0,nextPhase:'captions',requestId:'checkpoint-request-04',session:recipe});assert.equal(d.code,200);assert.equal(JSON.stringify(d.project.assets),before);assert.deepEqual(d.project.studio.modules.cut.session.cuts,recipe.cuts);
  const bad=await call('POST','/studio',{rev:d.rev,module:'cut',moduleRevision:1,nextPhase:'captions',requestId:'checkpoint-request-05',session:{...recipe,source:{...recipe.source,passId:'pass-old'}}});assert.equal(bad.code,409);assert.equal(JSON.parse(files.get(root+'/project.json').bytes).studio.modules.cut.revision,1);
  assert.ok([...files.keys()].some(p=>p.includes('/edits/studio-')));
 }finally{global.fetch=real;}
});
