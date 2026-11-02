import test from 'node:test';import assert from 'node:assert/strict';import {Readable} from 'node:stream';
import {handleJokeProject,dropboxHash,sha} from './joke-project.mjs';
import {cutProjectId} from '../../shared/cut-jokelets-core.mjs';
test('independent cut projects reuse verified beds and preserve each caption workspace',async()=>{
 const files=new Map();let serial=0;const real=global.fetch;
 global.fetch=async(url,opt)=>{
  const arg=opt.headers['dropbox-api-arg']?JSON.parse(opt.headers['dropbox-api-arg']):JSON.parse(opt.body),path=arg.path;
  if(url.endsWith('/create_folder_v2'))return Response.json({metadata:{path_display:path}});
  if(url.endsWith('/download')){const f=files.get(path);return f?new Response(f.bytes,{headers:{'dropbox-api-result':JSON.stringify({rev:f.rev})}}):new Response('not_found',{status:409});}
  if(url.endsWith('/upload')){const prior=files.get(path);if(arg.mode?.['.tag']==='update'&&arg.mode.update!==prior?.rev||arg.mode==='add'&&prior)return new Response('conflict',{status:409});const bytes=Buffer.from(opt.body),rev='r'+(++serial),id='id:'+path;files.set(path,{bytes,rev,id});return Response.json({id,rev,path_display:path});}
  if(url.endsWith('/get_metadata')){const entry=[...files].find(([p,f])=>p===path||f.id===path);assert.ok(entry);const[p,f]=entry;return Response.json({id:f.id,rev:f.rev,path_display:p,size:f.bytes.length,content_hash:dropboxHash(f.bytes)});}
  if(url.endsWith('/list_folder'))return Response.json({entries:[],has_more:false});
  throw Error('Unexpected fixture route '+url);
 };
 const call=async(id,tail,data)=>{let code,result;const req=Readable.from(data===undefined?[]:[Buffer.isBuffer(data)?data:Buffer.from(JSON.stringify(data))]);req.method=data===undefined?'GET':'POST';req.headers={origin:'http://127.0.0.1:3199'};await handleJokeProject(req,{writeHead(s){code=s;},end(b){result=JSON.parse(b);}},new URL('https://fixture/api/joke-project'+tail+(tail.includes('?')?'&':'?')+'id='+id),'fixture-token');return {code,...result};};
 const origin={source:{name:'episode.mp4',sha256:'a'.repeat(64),frames:100,bytes:500},cut:{id:'cut-one',index:1,name:'Slide',inFrame:5,outFrame:15,start:.2,end:.6}},other={...origin,cut:{...origin.cut,id:'cut-two',index:2,name:'Eclipse',inFrame:20,outFrame:30,start:.8,end:1.2}};
 const a=await cutProjectId(origin),b=await cutProjectId(other),bytes=Buffer.from('fixture-video-bytes'),output={sha256:sha(bytes),bytes:bytes.length,format:'mp4',frames:10,width:90,height:160,duration:.4,audio:true};
 try{
  assert.equal((await call('dad-wrong-project','/from-cut',{origin})).code,400);
  let first=await call(a,'/from-cut',{origin});assert.equal(first.code,200);assert.equal(first.project.text,'');assert.equal(first.project.textStatus,'not-transcribed');assert.equal(first.project.cutOrigin.state,'awaiting-video');assert.equal([...files.keys()].some(p=>p.endsWith('/joke.txt')),false);
  const uploaded=await call(a,'/asset?role=bed&name=Slide.mp4',bytes);assert.equal(uploaded.persisted,true);const duplicate=await call(a,'/asset?role=bed&name=Slide.mp4',bytes);assert.equal(duplicate.reused,true);assert.equal(duplicate.persisted,true);assert.equal(duplicate.asset.id,uploaded.asset.id);
  const bad=await call(a,'/from-cut',{origin,assetId:uploaded.asset.id,output:{...output,sha256:'b'.repeat(64)}});assert.equal(bad.code,409);assert.equal((await call(a,'')).project.cutOrigin.state,'awaiting-video');
  first=await call(a,'/from-cut',{origin,assetId:uploaded.asset.id,output});assert.equal(first.project.cutOrigin.state,'ready');assert.equal(first.project.cutOrigin.bedAssetId,uploaded.asset.id);
  const session={schema:'GS-CapLock-1',version:6,fps:25,captions:[],clips:[],workspace:{id:a,playhead:7},media:{kind:'previewlock',name:'Slide.mp4',path:uploaded.asset.path,size:bytes.length}};
  const saved=await call(a,'/caplock',{rev:first.rev,session});assert.equal(saved.project.caplock.workspace.playhead,7);
  const reopened=await call(a,'/from-cut',{origin:{...origin,cut:{...origin.cut,name:'Renamed'}}});assert.equal(reopened.reused,true);assert.equal(reopened.project.title,'Slide');assert.equal(reopened.project.caplock.workspace.playhead,7);assert.equal(reopened.project.assets.length,1);
  let second=await call(b,'/from-cut',{origin:other});const bed2=await call(b,'/asset?role=bed&name=Eclipse.mp4',bytes);second=await call(b,'/from-cut',{origin:other,assetId:bed2.asset.id,output});assert.notEqual(bed2.asset.path,uploaded.asset.path);
  const wrong=await call(b,'/caplock',{rev:second.rev,session});assert.equal(wrong.code,409);assert.equal((await call(b,'')).project.caplock,undefined);assert.equal((await call(a,'')).project.caplock.workspace.playhead,7);
  assert.equal(files.get(uploaded.asset.path).bytes.equals(bytes),true);assert.equal(files.get(bed2.asset.path).bytes.equals(bytes),true);assert.equal(reopened.project.backup.state,'pending');
 }finally{global.fetch=real;}
});
