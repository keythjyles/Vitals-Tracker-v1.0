import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createDriveManager} from './drive-manager.mjs';

const BASE='https://gs-previewlock-api.onrender.com';
const FOLDER='application/vnd.google-apps.folder';
const OWNER='kjiles71@gmail.com';
const SCOPE='https://www.googleapis.com/auth/drive';
const fixture=()=>{
 const calls=[], files=new Map(),uploads=new Map();let serial=0,refreshes=0,email=OWNER,scope=SCOPE;
 const add=(id,name,parents=[],mimeType=FOLDER,extra={})=>files.set(id,{id,name,parents,mimeType,trashed:false,explicitlyTrashed:false,capabilities:{canAddChildren:true,canDownload:true},modifiedTime:'2026-11-21T12:00:00Z',...extra});
 add('rootFixture123','My Drive');add('downloadFixture','Download',['rootFixture123']);add('claimsFixture12','VA Claim',['downloadFixture']);add('cpFolderFixture','C&P Exams',['claimsFixture12']);
 add('reportFixture12','Vision decision.pdf',['cpFolderFixture'],'application/pdf',{size:'17'});
 const get=value=>{const f=files.get(value==='root'?'rootFixture123':value);if(!f)return null;const result=structuredClone(f);let p=f;const seen=new Set();while(p?.parents?.length&&!seen.has(p.id)){seen.add(p.id);p=files.get(p.parents[0]);if(p?.explicitlyTrashed)result.trashed=true;}return result;};
 const json=(x,status=200,headers={})=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json',...headers}});
 async function fetcher(input,options={}){
  const u=new URL(input),method=options.method||'GET';calls.push({url:u.href,method,body:options.body,headers:options.headers});
  if(u.hostname==='oauth2.googleapis.com'){
   if(new URLSearchParams(options.body).get('grant_type')==='refresh_token')refreshes++;
   return json({access_token:'fixture-access',refresh_token:'fixture-refresh-private',scope,expires_in:3600});
  }
  if(u.pathname.endsWith('/about'))return json({user:{emailAddress:email,displayName:'Fixture owner'}});
  if(u.pathname==='/upload/drive/v3/files'&&method==='POST'){
   const data=JSON.parse(options.body),uploadId='u'+(++serial);uploads.set(uploadId,{metadata:data,offset:0,size:Number(options.headers['x-upload-content-length'])});
   return new Response('',{status:200,headers:{location:'https://www.googleapis.com/upload/drive/v3/files?upload_id='+uploadId}});
  }
  if(u.pathname==='/upload/drive/v3/files'&&method==='PUT'){
   const upload=uploads.get(u.searchParams.get('upload_id'));if(!upload)return json({},404);
   if(!options.headers['content-range'].startsWith('bytes */'))upload.offset+=options.body.length;
   if(upload.offset<upload.size)return new Response(null,{status:308,headers:upload.offset?{range:'bytes=0-'+(upload.offset-1)}:{}});
   const id='uploadedFixture'+serial;add(id,upload.metadata.name,upload.metadata.parents,upload.metadata.mimeType,{size:String(upload.size)});return json(get(id));
  }
  const match=/\/drive\/v3\/files(?:\/([^/]+))?(\/copy|\/export)?$/.exec(u.pathname);
  if(!match)throw Error('Unexpected provider URL: '+u.origin+u.pathname);
  const itemId=match[1],suffix=match[2];
  if(!itemId&&method==='GET'){
   const q=u.searchParams.get('q')||'',parent=/'([^']+)' in parents/.exec(q)?.[1];
   const folder=parent==='root'?'rootFixture123':parent;
   let results=[...files.keys()].map(get).filter(f=>f.id!=='rootFixture123');
   results=results.filter(f=>q.includes('trashed = true')?f.trashed:!f.trashed);
   if(folder)results=results.filter(f=>f.parents.includes(folder));
   if(q.includes("mimeType = '"+FOLDER+"'"))results=results.filter(f=>f.mimeType===FOLDER);
   return json({files:results});
  }
  if(!itemId&&method==='POST'){const d=JSON.parse(options.body),id='newFolderFixture'+(++serial);add(id,d.name,d.parents,d.mimeType);return json(get(id));}
  const before=get(itemId);if(!before)return json({error:{message:'not found'}},404);
  if(method==='GET'&&(u.searchParams.get('alt')==='media'||suffix==='/export'))return new Response(Buffer.from('%PDF-1.4\nfixture\n'),{headers:{'content-type':suffix? 'application/pdf':before.mimeType,'content-length':'17'}});
  if(method==='GET')return json(before);
  if(method==='PATCH'){
   const data=JSON.parse(options.body),raw=files.get(itemId);
   if('trashed'in data){raw.explicitlyTrashed=data.trashed;raw.trashed=data.trashed;}
   if('name'in data)raw.name=data.name;if('starred'in data)raw.starred=data.starred;
   if(u.searchParams.get('addParents'))raw.parents=[u.searchParams.get('addParents')];return json(get(itemId));
  }
  if(method==='POST'&&suffix==='/copy'){const d=JSON.parse(options.body),id='copyFixture'+(++serial);add(id,d.name,d.parents,before.mimeType);return json(get(id));}
  throw Error('Unexpected provider method');
 }
 return {fetcher,calls,files,get,uploads,get refreshes(){return refreshes;},set email(v){email=v;},set scope(v){scope=v;}};
};
async function harness(t,f=fixture()){
 let manager=createDriveManager({key:'fixture-key',clientId:'fixture-client',clientSecret:'fixture-secret',fetcher:f.fetcher});
 const server=http.createServer(async(req,res)=>{if(!await manager.route(req,res,new URL(req.url,BASE))){res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const url='http://127.0.0.1:'+server.address().port;
 const call=(path,options={})=>fetch(url+path,{redirect:'manual',...options});
 const login=async()=>{
  const start=await call('/drive/connect');assert.equal(start.status,303);const authURL=new URL(start.headers.get('location'));
  const stateCookie=start.headers.getSetCookie()[0].split(';')[0];
  const callback=await call('/oauth/google/callback?state='+encodeURIComponent(authURL.searchParams.get('state'))+'&code=fixture-code',{headers:{cookie:stateCookie}});
  const session=callback.headers.getSetCookie().find(x=>x.startsWith('__Host-vt-drive='))?.split(';')[0];
  return {start,authURL,callback,session};
 };
 const post=(path,session,payload,requestId='fixture-request-12345')=>call(path,{method:'POST',headers:{cookie:session,origin:BASE,'content-type':'application/json','x-request-id':requestId},body:JSON.stringify(payload)});
 return {f,call,login,post,restart(){manager=createDriveManager({key:'fixture-key',clientId:'fixture-client',clientSecret:'fixture-secret',fetcher:f.fetcher});}};
}

test('unauthenticated shell exposes no Drive files and performs no provider writes',async t=>{
 const h=await harness(t);const shell=await h.call('/drive/');assert.equal(shell.status,200);assert.match(await shell.text(),/Connect Google Drive/);
 const status=await h.call('/api/drive-manager/status');assert.equal((await status.json()).connected,false);
 assert.equal((await h.call('/api/drive-manager/files?folder=root')).status,401);assert.equal(h.f.calls.length,0);
});
test('one offline full-Drive grant persists across service restart without another login',async t=>{
 const h=await harness(t),auth=await h.login();assert.equal(auth.authURL.searchParams.get('scope'),SCOPE);assert.equal(auth.authURL.searchParams.get('access_type'),'offline');assert.equal(auth.authURL.searchParams.get('redirect_uri'),BASE+'/oauth/google/callback');
 assert.ok(auth.session);assert.doesNotMatch(auth.session,/fixture-refresh-private/);assert.match(auth.callback.headers.getSetCookie().join(';'),/HttpOnly/);
 const read=()=>h.call('/api/drive-manager/files?folder=root',{headers:{cookie:auth.session}});
 await Promise.all([read(),read()]);assert.equal(h.f.refreshes,1);
 h.restart();const response=await read();assert.equal(response.status,200);assert.equal(h.f.refreshes,2);
 assert.equal((await response.json()).files.some(f=>f.name==='Download'),true);
});
test('OAuth rejects wrong accounts, limited scopes and mismatched state',async t=>{
 const h=await harness(t);h.f.email='someoneelse@example.test';const wrong=await h.login();assert.equal(wrong.callback.headers.get('location'),'/drive/?connection=account');assert.equal(wrong.session,undefined);
 h.f.email=OWNER;h.f.scope='https://www.googleapis.com/auth/drive.file';const limited=await h.login();assert.equal(limited.session,undefined);assert.equal(limited.callback.headers.get('location'),'/drive/?connection=failed');
 const bad=await h.call('/oauth/google/callback?state=vt-drive-manager.123.abc.def&code=fixture');assert.equal(bad.headers.get('location'),'/drive/?connection=expired');
});
test('browsing and searching retain real location/trash fields without moving or deleting files',async t=>{
 const h=await harness(t),{session}=await h.login();h.f.files.get('claimsFixture12').trashed=true;h.f.files.get('claimsFixture12').explicitlyTrashed=true;
 const item=await (await h.call('/api/drive-manager/item?id=cpFolderFixture',{headers:{cookie:session}})).json();
 assert.deepEqual(item.path.map(x=>x.name),['My Drive','Download','VA Claim','C&P Exams']);assert.equal(item.item.trashed,true);
 await h.call('/api/drive-manager/files?view=trash&query=Claim',{headers:{cookie:session}});
 const driveWrites=h.f.calls.filter(c=>c.url.includes('/drive/v3/')&&c.method!=='GET');assert.equal(driveWrites.length,0);
 const queryCall=h.f.calls.find(c=>new URL(c.url).searchParams.get('q')?.includes('trashed = true'));assert.ok(queryCall);
});
test('restoration reuses original parent and child IDs and verifies inherited trash state',async t=>{
 const h=await harness(t),{session}=await h.login(),parent=h.f.files.get('claimsFixture12');parent.trashed=true;parent.explicitlyTrashed=true;
 let r=await (await h.post('/api/drive-manager/change',session,{action:'restore',ids:['cpFolderFixture']})).json();assert.equal(r.complete,false);assert.equal(r.results[0].ok,false);
 r=await (await h.post('/api/drive-manager/change',session,{action:'restore',ids:['claimsFixture12','cpFolderFixture']},'fixture-restore-parent')).json();assert.equal(r.complete,true);assert.deepEqual(r.results.map(x=>x.after.id),['claimsFixture12','cpFolderFixture']);assert.equal(h.f.files.size,5);assert.equal(h.f.get('cpFolderFixture').trashed,false);
});
test('moving removes only the observed source parent; cycles and stale renames are rejected',async t=>{
 const h=await harness(t),{session}=await h.login();const response=await h.post('/api/drive-manager/change',session,{action:'move',ids:['claimsFixture12'],targetId:'root'});const result=await response.json();assert.equal(result.complete,true);assert.deepEqual(h.f.get('claimsFixture12').parents,['rootFixture123']);
 const move=h.f.calls.find(c=>c.method==='PATCH');assert.equal(new URL(move.url).searchParams.get('removeParents'),'downloadFixture');assert.equal(JSON.parse(move.body).trashed,undefined);
 let cycle=await (await h.post('/api/drive-manager/change',session,{action:'move',ids:['claimsFixture12'],targetId:'cpFolderFixture'},'fixture-cycle-request')).json();assert.equal(cycle.complete,false);
 const stale=await (await h.post('/api/drive-manager/change',session,{action:'rename',ids:['claimsFixture12'],name:'Changed',expected:{claimsFixture12:{name:'An old name'}}},'fixture-stale-rename')).json();assert.equal(stale.complete,false);assert.equal(h.f.get('claimsFixture12').name,'VA Claim');
});
test('CSRF and invalid actions cannot mutate Drive; duplicate create clicks make one folder',async t=>{
 const h=await harness(t),{session}=await h.login();const payload={name:'Decisions',parentId:'root'};
 const csrf=await h.call('/api/drive-manager/folder',{method:'POST',headers:{cookie:session,origin:'https://untrusted.example','content-type':'application/json','x-request-id':'fixture-request-12345'},body:JSON.stringify(payload)});assert.equal(csrf.status,403);
 const results=await Promise.all([h.post('/api/drive-manager/folder',session,payload),h.post('/api/drive-manager/folder',session,payload)]);const [a,b]=await Promise.all(results.map(r=>r.json()));assert.equal(a.item.id,b.item.id);assert.equal([...h.f.files.values()].filter(x=>x.name==='Decisions').length,1);
 const conflicting=await h.post('/api/drive-manager/folder',session,{name:'Different',parentId:'root'});assert.equal(conflicting.status,409);
 assert.equal((await h.post('/api/drive-manager/change',session,{action:'delete',ids:['claimsFixture12']},'fixture-invalid-delete')).status,400);
});
test('authenticated downloads stream privately, while HTML and SVG cannot execute on the app origin',async t=>{
 const h=await harness(t),{session}=await h.login();let r=await h.call('/api/drive-manager/content?id=reportFixture12',{headers:{cookie:session}});assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);assert.match(r.headers.get('content-disposition'),/^inline/);assert.match(await r.text(),/%PDF/);
 h.f.files.get('reportFixture12').mimeType='text/html';r=await h.call('/api/drive-manager/content?id=reportFixture12',{headers:{cookie:session}});assert.match(r.headers.get('content-disposition'),/^attachment/);
 h.f.files.get('reportFixture12').mimeType='image/svg+xml';r=await h.call('/api/drive-manager/content?id=reportFixture12',{headers:{cookie:session}});assert.match(r.headers.get('content-disposition'),/^attachment/);
});
test('large upload resumes the existing provider session and returns the original verified result',async t=>{
 const h=await harness(t),{session}=await h.login(),size=262148;
 const started=await (await h.post('/api/drive-manager/upload',session,{name:'Cfile.pdf',mimeType:'application/pdf',size,parentId:'root'})).json();assert.ok(started.ticket);assert.doesNotMatch(started.ticket,/upload_id|fixture-access/);
 const put=(range,body)=>h.call('/api/drive-manager/upload-chunk',{method:'PUT',headers:{cookie:session,origin:BASE,'x-upload-ticket':started.ticket,'content-range':range},body});
 const first=await (await put(`bytes 0-262143/${size}`,Buffer.alloc(262144))).json();assert.equal(first.complete,false);assert.equal(first.offset,262144);
 const probe=await (await put(`bytes */${size}`,Buffer.alloc(0))).json();assert.equal(probe.offset,262144);assert.equal(h.f.uploads.size,1);
 const done=await (await put(`bytes 262144-262147/${size}`,Buffer.alloc(4))).json();assert.equal(done.complete,true);assert.equal(Number(done.item.size),size);assert.equal(done.item.name,'Cfile.pdf');
});
