import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {saveAudio,deleteAudio,renameAudio,getAudioRecord,AUDIO_ROOT,AUDIO_DELETE_ROOT,DRIVE_LIBRARY_FOLDER,contentHash,dropboxClient} from './audio-store.mjs';

function memory(){
 const files=new Map();let sequence=0;
 const resolve=p=>files.get(p)||[...files.values()].find(f=>f.meta.id===p);
 return {files,
  async folder(p){if(!files.has(p))files.set(p,{meta:{id:'id:'+ ++sequence,'.tag':'folder',name:p.split('/').pop(),path_display:p}})},
  async meta(p){return resolve(p)?.meta||null},
  async read(p){const f=resolve(p);return f?{data:JSON.parse(f.data),rev:f.meta.rev}:null},
  async write(p,bytes,rev){const old=files.get(p);if(old&&old.meta.rev!==rev)throw Error('revision conflict');const data=Buffer.from(bytes),meta={id:old?.meta.id||'id:'+ ++sequence,rev:String(++sequence),'.tag':'file',name:p.split('/').pop(),path_display:p,size:data.length,content_hash:contentHash(data)};files.set(p,{data,meta});return meta},
  async list(p){return {entries:[...files.values()].map(f=>f.meta).filter(m=>m.path_display.slice(0,m.path_display.lastIndexOf('/'))===p)}},
  async remove(p){const f=resolve(p);if(f){if(f.meta['.tag']==='folder'&&(await this.list(f.meta.path_display)).entries.length)throw Error('nonempty folder');files.delete(f.meta.path_display)}},
 };
}
const wav=Buffer.alloc(60);wav.write('RIFF');wav.write('WAVE',8);
const request={assetId:'check-de1e7e01',name:'crickets.wav',data:wav,sha256:createHash('sha256').update(wav).digest('hex')};
const folder=AUDIO_ROOT+'/'+request.assetId,jobPath=AUDIO_DELETE_ROOT+'/'+request.assetId+'.json';
async function driveReceipt(db,job,overrides={}){const receipt={schema:'SoundScrubberDriveDeletionReceipt-1',requestId:job.requestId,assetId:job.assetId,sha256:job.sha256,rootFolderId:DRIVE_LIBRARY_FOLDER,verified:true,status:'deleted',method:'connected-drive-delete-and-readback',verifiedAt:new Date().toISOString(),...overrides};await db.write(AUDIO_DELETE_ROOT+'/'+job.assetId+'-'+job.requestId+'-drive.json',Buffer.from(JSON.stringify(receipt)));}

test('deletes selected approved Dropbox bytes and metadata, leaves unrelated assets, Drive pending until verified',async()=>{
 const db=memory();await saveAudio(db,request);await saveAudio(db,{...request,assetId:'check-de1e7e02'});
 const first=await deleteAudio(db,request);assert.equal(first.complete,false);assert.equal(first.destinations.dropbox.verified,true);assert.equal(first.destinations.drive.status,'pending');assert.equal(await db.meta(folder),null);assert(await db.meta(AUDIO_ROOT+'/check-de1e7e02/crickets.wav'));
 const job=(await db.read(jobPath)).data;await driveReceipt(db,job);const done=await deleteAudio(db,request);assert.equal(done.complete,true);assert.equal(done.requestId,first.requestId);assert.deepEqual(await deleteAudio(db,request),done);
});
test('pending delete blocks save/rename/catalog resurrection; completed deletion permits rediscovery and reapproval',async()=>{
 const db=memory();await saveAudio(db,request);await deleteAudio(db,request);
 await assert.rejects(saveAudio(db,request),/deletion request/);await assert.rejects(renameAudio(db,{...request,name:'renamed.wav'}),/deletion request/);await assert.rejects(getAudioRecord(db,request.assetId),/deletion request/);
 await driveReceipt(db,(await db.read(jobPath)).data);await deleteAudio(db,request);const saved=await saveAudio(db,request);assert(saved.cloudReceipts.dropbox.verified);assert.equal(await db.meta(jobPath),null);
});
test('checkpoint failure removes nothing; interrupted Dropbox delete retries without duplicating intent',async()=>{
 const db=memory();await saveAudio(db,request);const write=db.write.bind(db);db.write=async(p,...a)=>{if(p===jobPath)throw Error('offline');return write(p,...a)};
 await assert.rejects(deleteAudio(db,request),/offline/);assert(await db.meta(folder+'/crickets.wav'));db.write=write;
 const remove=db.remove.bind(db);let fail=true;db.remove=async p=>{if(fail){fail=false;throw Error('provider unavailable')}return remove(p)};
 const first=await deleteAudio(db,request);assert.equal(first.destinations.dropbox.status,'failed');assert(await db.meta(folder+'/crickets.wav'));const retry=await deleteAudio(db,request);assert.equal(retry.requestId,first.requestId);assert.equal(retry.destinations.dropbox.verified,true);
});
test('invalid identity, wrong hash, changed original, and unrecognized folder contents are preserved',async()=>{
 const db=memory();await saveAudio(db,request);
 await assert.rejects(deleteAudio(db,{...request,assetId:'../other'}),/identity/);await assert.rejects(deleteAudio(db,{...request,sha256:'0'.repeat(64)}),/differs/);
 const file=db.files.get(folder+'/crickets.wav');file.meta.content_hash='0'.repeat(64);await assert.rejects(deleteAudio(db,request),/original differs/);file.meta.content_hash=contentHash(wav);
 await db.write(folder+'/other.wav',wav);await assert.rejects(deleteAudio(db,request),/Unrecognized/);assert(await db.meta(folder+'/crickets.wav'));
});
test('an audio upload whose metadata failed is deleted only with matching original size and Dropbox hash',async()=>{
 const db=memory();await db.folder(folder);await db.write(folder+'/crickets.wav',wav);
 await assert.rejects(deleteAudio(db,{...request,bytes:60,contentHash:'0'.repeat(64)}),/original differs/);
 const deleted=await deleteAudio(db,{...request,bytes:60,contentHash:contentHash(wav)});assert(deleted.destinations.dropbox.verified);assert.equal(deleted.complete,false);
});
test('foreign or stale Drive completion receipts never mark complete',async()=>{
 for(const overrides of [{sha256:'0'.repeat(64)},{rootFolderId:'foreign'},{requestId:'old'},{verified:false},{verifiedAt:'2000-01-01T00:00:00Z'},{method:'metadata-only'}]){
  const db=memory();await saveAudio(db,request);await deleteAudio(db,request);await driveReceipt(db,(await db.read(jobPath)).data,overrides);assert.equal((await deleteAudio(db,request)).complete,false);
 }
});
test('retries stop when a checkpointed managed file changes',async()=>{
 const db=memory();await saveAudio(db,request);const remove=db.remove.bind(db);db.remove=async()=>{throw Error('offline')};await deleteAudio(db,request);db.remove=remove;
 const file=db.files.get(folder+'/crickets.wav');file.meta.content_hash='changed';const r=await deleteAudio(db,request);assert.equal(r.destinations.dropbox.status,'failed');assert(await db.meta(folder+'/crickets.wav'));
});
test('Dropbox adapter paginates and treats provider errors as errors, not confirmed absence',async()=>{
 const calls=[];const db=dropboxClient('test',async(url,o)=>{calls.push(url);const data=url.endsWith('list_folder')?{entries:[{name:'one'}],has_more:true,cursor:'next'}:url.endsWith('continue')?{entries:[{name:'two'}],has_more:false}:url.endsWith('delete_v2')?{metadata:{id:'deleted'}}:{error_summary:'permission_denied/'};return {ok:!url.endsWith('get_metadata'),status:403,json:async()=>data}});
 assert.equal((await db.list('/folder')).entries.length,2);await db.remove('id:test');assert(calls.some(u=>u.endsWith('delete_v2')));await assert.rejects(db.meta('id:test'),/failed/);
});
