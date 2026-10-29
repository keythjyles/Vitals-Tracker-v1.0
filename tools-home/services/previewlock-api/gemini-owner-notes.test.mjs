import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOwnerNotes,ownerNotesPath} from './gemini-owner-notes.mjs';
test('owner notes are private append-only records with idempotence, readback and origin validation; no AI call',async()=>{
 const original=globalThis.fetch;let doc=null,rev=null,n=0;globalThis.fetch=async(url,options)=>{const arg=JSON.parse(options.headers['dropbox-api-arg']);assert.equal(arg.path,ownerNotesPath);if(url.endsWith('/download'))return doc?Response.json(doc,{headers:{'dropbox-api-result':JSON.stringify({rev})}}):new Response('path/not_found',{status:409});if(url.endsWith('/upload')){if(arg.mode['.tag']==='add'&&doc||arg.mode['.tag']==='update'&&arg.mode.update!==rev)return new Response('conflict',{status:409});doc=JSON.parse(options.body);rev='r'+(++n);return Response.json({rev})}throw Error('Unexpected external call')};
 const call=async(method='GET',data,origin='https://keythjyles.github.io')=>{const req={method,headers:{origin},async *[Symbol.asyncIterator](){if(data!==undefined)yield Buffer.from(typeof data==='string'?data:JSON.stringify(data))}},res={writeHead(s){this.status=s},end(b){this.body=JSON.parse(b)}};await handleOwnerNotes(req,res,new URL('https://test.invalid/api/gemini-owner-notes'),'test-only');return res};
 try{
  assert.equal((await call('POST',{},'https://foreign.invalid')).status,403);assert.equal((await call('DELETE')).status,405);assert.equal((await call('POST','bad-json')).status,400);assert.equal((await call('POST',{id:'owner-12345678',text:''})).status,400);
  assert.deepEqual((await call()).body.notes,[]);
  let r=await call('POST',{id:'owner-12345678',text:'Use the blink.'});assert.equal(r.status,200);assert(r.body.persisted);assert.equal(r.body.note.state,'awaiting_ai_review');
  r=await call('POST',{id:'owner-12345678',text:'Use the blink.'});assert(r.body.duplicate);assert.equal(doc.notes.length,1);
  assert.equal((await call('POST',{id:'owner-12345678',text:'Different text'})).status,409);
  await call('POST',{id:'owner-23456789',text:'Keep the original voice.'});assert.equal((await call()).body.notes.length,2);assert.equal(doc.notes[0].text,'Use the blink.');assert(!JSON.stringify(doc).includes('test-only'));
 }finally{globalThis.fetch=original}
});
