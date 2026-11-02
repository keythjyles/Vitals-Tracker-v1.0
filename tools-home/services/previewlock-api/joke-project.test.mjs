import test from 'node:test';import assert from 'node:assert/strict';import {Readable} from 'node:stream';import {spawnSync} from 'node:child_process';import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {handleJokeProject,validateCuts,keySettings,renderClip,dropboxHash,sha} from './joke-project.mjs';
test('cut boundaries allow independent overlaps and reject invalid ranges/names/keys',()=>{assert.deepEqual(validateCuts([{inFrame:0,outFrame:10},{inFrame:12,outFrame:25}]).map(x=>x.number),[1,2]);for(const cuts of [[{inFrame:0,outFrame:0}],[{inFrame:0,outFrame:751}],[{inFrame:.5,outFrame:10}]])assert.throws(()=>validateCuts(cuts));assert.deepEqual(validateCuts([{inFrame:0,outFrame:10},{inFrame:9,outFrame:12}]).map(x=>x.number),[1,2]);assert.throws(()=>validateCuts([{inFrame:0,outFrame:3,name:'a.webm'},{inFrame:2,outFrame:4,name:'A.webm'}]));assert.throws(()=>keySettings({color:'blue,evil'}));});
test('project → stored original → real alpha cuts → CapLock state, with CAS and source preservation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gs-project-test-'));const source=join(dir,'source.mp4');const gen=spawnSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=0x0a77d4:s=160x90:r=24:d=1','-vf','drawbox=x=60:y=30:w=40:h=30:color=white:t=fill','-c:v','libx264','-pix_fmt','yuv420p',source]);assert.equal(gen.status,0,gen.stderr?.toString());await assert.rejects(()=>renderClip(source,join(dir,'outside.webm'),{inFrame:40,outFrame:45},keySettings()),/Clip decode failed|Cut exceeds/);const original=await readFile(source);const files=new Map(),folders=new Set();let serial=0;const realFetch=global.fetch;
 global.fetch=async(url,opt)=>{const h=opt.headers;const arg=h['dropbox-api-arg']?JSON.parse(h['dropbox-api-arg']):null;const data=arg||JSON.parse(opt.body);const path=data.path;
  if(url.endsWith('/create_folder_v2')){folders.add(path);return Response.json({metadata:{path_display:path}});}
  if(url.endsWith('/download')){const f=files.get(path);return f?new Response(f.bytes,{headers:{'dropbox-api-result':JSON.stringify({rev:f.rev})}}):new Response('not_found',{status:409});}
  if(url.endsWith('/upload')){const prior=files.get(path);if(data.mode?.['.tag']==='update'&&data.mode.update!==prior?.rev||data.mode==='add'&&prior)return new Response('conflict',{status:409});const bytes=Buffer.from(opt.body),rev='r'+(++serial),id='id:'+path;files.set(path,{bytes,rev,id});return Response.json({id,rev,path_display:path});}
  if(url.endsWith('/get_metadata')){const f=[...files].find(([p,f])=>p===path||f.id===path);assert.ok(f);return Response.json({id:f[1].id,rev:f[1].rev,path_display:f[0],size:f[1].bytes.length,content_hash:dropboxHash(f[1].bytes)});}
  throw Error('Unexpected Dropbox endpoint '+url);
 };
 const call=async(method,tail,data)=>{let result,code;const req=Readable.from(data===undefined?[]:[Buffer.isBuffer(data)?data:Buffer.from(JSON.stringify(data))]);req.method=method;req.headers={origin:'http://127.0.0.1:3199'};const res={writeHead(s){code=s;},end(b){result=JSON.parse(b);}};await handleJokeProject(req,res,new URL('https://service/api/joke-project'+tail),'private-test-token');return {code,...result};};
 try{let p=await call('POST','?id=test-project',{rev:null,title:'Pebble',text:'What did the shy pebble wish for?'});assert.equal(p.code,200);assert.equal(p.backup,'pending');assert.equal(files.get('/Grill Sergeant/JokeLab Productions/test-project/joke.txt').bytes.toString(),'What did the shy pebble wish for?');let bad=await call('POST','?id=test-project',{rev:null,title:'Lost edit',text:'No'});assert.equal(bad.code,409);
 p=await call('POST','/asset?id=test-project&role=caption&name=original.mp4',original);assert.equal(p.code,201);const asset=p.asset;assert.equal(asset.sha256,sha(original));const again=await call('POST','/asset?id=test-project&role=caption&name=original.mp4',original);assert.equal(again.reused,true);assert.equal(again.project.assets.length,1);
 p=await call('POST','/cuts?id=test-project',{rev:p.rev,assetId:asset.id,cuts:[{inFrame:0,outFrame:8},{inFrame:6,outFrame:15,name:'question.webm',sourceStart:6/24,sourceEnd:15/24,sourceInFrame:6,sourceOutFrame:15}],chroma:{color:'#0a77d4'}});assert.equal(p.code,202);const blocked=await call('POST','?id=test-project',{rev:p.rev,title:'Interleaved',text:'No'});assert.equal(blocked.code,409);
 for(let i=0;i<150;i++){await new Promise(r=>setTimeout(r,70));p=await call('GET','?id=test-project');if(p.project.assets[0].cuts.status!=='running')break;}
 const cuts=p.project.assets[0].cuts;assert.equal(cuts.status,'complete',cuts.error);assert.equal(cuts.clips.length,2);assert.equal(cuts.clips[1].sourceInFrame,6);assert.ok(cuts.clips[1].path.endsWith('/question.webm'));assert.equal(cuts.clips[1].frames,9);assert.ok(cuts.clips[0].path.endsWith('/1.webm'));assert.equal(files.get(asset.path).bytes.equals(original),true);
 const out=join(dir,'1.webm');await writeFile(out,files.get(cuts.clips[0].path).bytes);const decode=spawnSync('ffmpeg',['-v','error','-c:v','libvpx-vp9','-i',out,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-']);assert.equal(decode.status,0,decode.stderr?.toString());assert.equal(decode.stdout[3],0);assert.equal(decode.stdout[(45*160+80)*4+3],255);
 const info=spawnSync('ffprobe',['-v','error','-count_frames','-select_streams','v','-show_entries','stream=nb_read_frames,r_frame_rate','-of','json',out]);const stream=JSON.parse(info.stdout).streams[0];assert.equal(stream.nb_read_frames,'8');assert.equal(stream.r_frame_rate,'25/1');const handoff=await call('GET','/caplock?id=test-project&asset='+asset.id);assert.equal(handoff.asset.cuts.clips.length,2);assert.equal(handoff.rev,p.rev);
 const session={schema:'GS-CapLock-1',version:3,fps:25,captions:[],clips:[],workspace:{id:'test-project',assetId:asset.id,playhead:17}};p=await call('POST','/caplock?id=test-project',{rev:p.rev,session});assert.equal(p.project.caplock.workspace.playhead,17);assert.equal(p.project.caplockHistory.length,1);assert.equal(p.project.backup.state,'pending');
 const v1=structuredClone(p.project.assets[0].cuts),v1Bytes=v1.clips.map(c=>Buffer.from(files.get(c.path).bytes));
 const passRequest={rev:p.rev,assetId:asset.id,previousPassId:v1.id,requestId:'pass-request-0001',ranges:v1.ranges,chroma:v1.chroma};
 p=await call('POST','/cut-pass?id=test-project',passRequest);assert.equal(p.code,200);
 assert.equal(p.project.assets[0].cuts.version,2);assert.equal(p.project.assets[0].cuts.status,'draft');assert.deepEqual(p.project.assets[0].cuts.ranges,[]);assert.deepEqual(p.project.assets[0].cuts.clips,[]);
 assert.equal(p.project.assets[0].cutHistory.length,1);assert.equal(p.project.assets[0].cutHistory[0].clips[0].path,v1.clips[0].path);assert.equal(p.project.caplock.workspace.playhead,17);
 const retry=await call('POST','/cut-pass?id=test-project',passRequest);assert.equal(retry.reused,true);assert.equal(retry.project.assets[0].cuts.version,2);assert.equal(retry.project.assets[0].cutHistory.length,1);
 const changed=await call('POST','/cut-pass?id=test-project',{...passRequest,rev:p.rev,requestId:'pass-request-0002'});assert.equal(changed.code,409);
 const v2Id=p.project.assets[0].cuts.id;
 p=await call('POST','/cuts?id=test-project',{rev:p.rev,assetId:asset.id,cuts:v1.ranges,chroma:v1.chroma});assert.equal(p.code,202);
 for(let i=0;i<150;i++){await new Promise(r=>setTimeout(r,70));p=await call('GET','?id=test-project');if(p.project.assets[0].cuts.status!=='running')break;}
 assert.equal(p.project.assets[0].cuts.status,'complete',p.project.assets[0].cuts.error);assert.equal(p.project.assets[0].cuts.id,v2Id);assert.equal(p.project.assets[0].cuts.version,2);assert.equal(p.project.assets[0].cutHistory.length,1);
 for(let i=0;i<v1.clips.length;i++)assert.equal(files.get(v1.clips[i].path).bytes.equals(v1Bytes[i]),true);
 assert.notEqual(p.project.assets[0].cuts.clips[0].path,v1.clips[0].path);assert.equal(files.get(asset.path).bytes.equals(original),true);

 }finally{global.fetch=realFetch;await rm(dir,{recursive:true,force:true});}
});


test('already-transparent VP9 source retains alpha without blue removal',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gs-alpha-keep-'));try{
 const source=join(dir,'alpha.webm'),out=join(dir,'kept.webm');
 const gen=spawnSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=red:s=64x64:r=24:d=1,format=yuva420p,lut=a=128','-c:v','libvpx-vp9','-lossless','1','-auto-alt-ref','0',source]);assert.equal(gen.status,0,gen.stderr?.toString());
 const cut=validateCuts([{inFrame:0,outFrame:13,sourceStart:0,sourceEnd:.5,sourceInFrame:0,sourceOutFrame:12}])[0];
 await renderClip(source,out,cut,keySettings({enabled:false}));
 const decoded=spawnSync('ffmpeg',['-v','error','-c:v','libvpx-vp9','-i',out,'-vf','alphaextract','-frames:v','1','-pix_fmt','gray','-f','rawvideo','-']);assert.equal(decoded.status,0,decoded.stderr?.toString());assert.ok(Math.abs(decoded.stdout[0]-128)<3);
 }finally{await rm(dir,{recursive:true,force:true});}
});


test('failed caption batch resumes its saved pass and files; orphaned running jobs also recover',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gs-caption-resume-')),source=join(dir,'source.mp4');
 const gen=spawnSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=0x0a77d4:s=160x90:r=25:d=1,drawbox=x=40:y=20:w=40:h=30:color=white:t=fill','-c:v','libx264','-pix_fmt','yuv420p',source]);assert.equal(gen.status,0);
 const original=await readFile(source),files=new Map(),writes=new Map(),realFetch=global.fetch;let serial=0,failSecond=true;
 global.fetch=async(url,opt)=>{
  const data=opt.headers['dropbox-api-arg']?JSON.parse(opt.headers['dropbox-api-arg']):JSON.parse(opt.body),path=data.path;
  if(url.endsWith('/create_folder_v2'))return Response.json({metadata:{path_display:path}});
  if(url.endsWith('/download')){const f=files.get(path);return f?new Response(f.bytes,{headers:{'dropbox-api-result':JSON.stringify({rev:f.rev})}}):new Response('not_found',{status:409});}
  if(url.endsWith('/upload')){
   if(failSecond&&path.endsWith('/2 Hives.webm')){failSecond=false;return new Response('Interrupted fixture upload',{status:503});}
   const prior=files.get(path);if(data.mode?.['.tag']==='update'&&data.mode.update!==prior?.rev||data.mode==='add'&&prior)return new Response('conflict',{status:409});
   const bytes=Buffer.from(opt.body),rev='r'+(++serial),id='id:'+path;files.set(path,{bytes,rev,id});writes.set(path,(writes.get(path)||0)+1);return Response.json({id,rev,path_display:path});
  }
  if(url.endsWith('/get_metadata')){const [name,f]=[...files].find(([p,f])=>p===path||f.id===path)||[];assert.ok(f);return Response.json({id:f.id,rev:f.rev,path_display:name,size:f.bytes.length,content_hash:dropboxHash(f.bytes)});}
  if(url.endsWith('/list_folder'))return Response.json({entries:[],has_more:false});
  throw Error('Unexpected fixture request '+url);
 };
 const call=async(method,tail,data)=>{let result,code;const req=Readable.from(data===undefined?[]:[Buffer.isBuffer(data)?data:Buffer.from(JSON.stringify(data))]);req.method=method;req.headers={origin:'http://127.0.0.1:3199'};await handleJokeProject(req,{writeHead(s){code=s;},end(b){result=JSON.parse(b);}},new URL('https://service/api/joke-project'+tail),'fixture');return {code,...result};};
 const wait=async()=>{let d;for(let i=0;i<200;i++){d=await call('GET','?id=resume-project');if(d.project.assets[0].cuts.status!=='running')return d;await new Promise(r=>setTimeout(r,20));}throw Error('Fixture render did not finish');};
 try{
  await call('POST','?id=resume-project',{rev:null,title:'Resume',text:'Saved exact words.'});
  let d=await call('POST','/asset?id=resume-project&role=caption&name=original.mp4',original);const asset=d.asset;
  const ranges=[{inFrame:0,outFrame:8,name:'1 why did.webm'},{inFrame:10,outFrame:18,name:'2 Hives.webm'}],request=rev=>({rev,assetId:asset.id,cuts:ranges,chroma:{color:'#0a77d4'}});
  d=await call('POST','/cuts?id=resume-project',request(d.rev));assert.equal(d.code,202);
  d=await wait();let job=d.project.assets[0].cuts;assert.equal(job.status,'failed');assert.equal(job.clips.length,1);const jobId=job.id,first=job.clips[0],firstBytes=Buffer.from(files.get(first.path).bytes);
  d=await call('POST','/cuts?id=resume-project',request(d.rev));assert.equal(d.code,202);assert.equal(d.resumed,true);assert.equal(d.project.assets[0].cuts.id,jobId);
  const live=await call('GET','?id=resume-project');assert.equal(live.cutRuntime[asset.id].active,true);
  d=await wait();job=d.project.assets[0].cuts;assert.equal(job.status,'complete',job.error);assert.equal(job.id,jobId);assert.equal(job.version,1);assert.equal(job.clips.length,2);assert.equal(job.attempts.length,1);assert.deepEqual(job.ranges,validateCuts(ranges));assert.equal(writes.get(first.path),1);assert.ok(files.get(first.path).bytes.equals(firstBytes));assert.ok(files.get(asset.path).bytes.equals(original));assert.equal(d.project.assets[0].cutHistory,undefined);
  const path='/Grill Sergeant/JokeLab Productions/resume-project/project.json',stored=files.get(path),interrupted=JSON.parse(stored.bytes);interrupted.assets[0].cuts.status='running';stored.bytes=Buffer.from(JSON.stringify(interrupted));stored.rev='r'+(++serial);
  d=await call('GET','?id=resume-project');assert.equal(d.cutRuntime[asset.id].active,false);
  d=await call('POST','/cuts?id=resume-project',request(d.rev));assert.equal(d.resumed,true);d=await wait();assert.equal(d.project.assets[0].cuts.status,'complete');assert.equal(writes.get(first.path),1);assert.equal(writes.get(job.clips[1].path),1);
 }finally{global.fetch=realFetch;await rm(dir,{recursive:true,force:true});}
});
