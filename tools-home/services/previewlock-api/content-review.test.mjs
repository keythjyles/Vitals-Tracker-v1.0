import assert from 'node:assert/strict';
const realFetch=globalThis.fetch;const files=new Map();let nextRev=1;
process.env.PORT='3199';process.env.DROPBOX_APP_KEY='test';process.env.DROPBOX_APP_SECRET='test';process.env.DROPBOX_REFRESH_TOKEN='test';process.env.PREVIEWLOCK_SETUP_KEY='test-only';
globalThis.fetch=async(url,options={})=>{
 if(String(url).startsWith('http://127.0.0.1:3199'))return realFetch(url,options);
 if(String(url).endsWith('/oauth2/token'))return Response.json({access_token:'test-token'});
 const arg=options.headers?.['dropbox-api-arg']?JSON.parse(options.headers['dropbox-api-arg']):{};
 if(String(url).endsWith('/files/download')){const x=files.get(arg.path);return x?new Response(JSON.stringify(x.data),{headers:{'dropbox-api-result':JSON.stringify({rev:x.rev})}}):new Response('path/not_found',{status:409})}
 if(String(url).endsWith('/files/create_folder_v2'))return Response.json({});
 if(String(url).endsWith('/files/upload')){const prior=files.get(arg.path);if(arg.mode==='add'&&prior||typeof arg.mode==='object'&&prior?.rev!==arg.mode.update)return new Response('conflict',{status:409});const rev=String(nextRev++);files.set(arg.path,{data:JSON.parse(options.body),rev});return Response.json({rev})}
 throw Error('Unexpected provider call '+url);
};
await import('./server.js');
const route='http://127.0.0.1:3199/api/content-review?id=gs-0123456789abcdef';const request=(opts={})=>realFetch(route,{...opts,headers:{authorization:'Bearer test-only',...opts.headers}});
try{
 assert.equal((await realFetch(route)).status,401);
 let response=await request();assert.deepEqual(await response.json(),{review:null,rev:null});
 let rev=null;
 for(const decision of ['KEEP','EDIT','HOLD','REMOVE','PUBLISH']){response=await request({method:'POST',body:JSON.stringify({decision,notes:'Test '+decision,sha256:'a'.repeat(64),rev})});assert.equal(response.status,200);const saved=await response.json();assert.equal(saved.persisted,true);rev=saved.rev;const loaded=await(await request()).json();assert.equal(loaded.rev,rev);assert.equal(loaded.review.decision,decision)}
 response=await request({method:'POST',body:JSON.stringify({decision:'KEEP',notes:'stale',sha256:'a'.repeat(64),rev:'1'})});assert.equal(response.status,409);
 response=await request({method:'POST',body:JSON.stringify({decision:'BAD',notes:'',sha256:'a'.repeat(64),rev})});assert.equal(response.status,400);
 assert.equal(files.size,1);const record=[...files.values()][0];assert.equal(record.data.history.length,5);console.log('PASS: cloud review persistence, all decisions, history, auth, stale-write rejection, invalid input');process.exit(0);
}catch(e){console.error(e);process.exit(1)}
