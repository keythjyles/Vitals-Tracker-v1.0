import test from 'node:test';
import assert from 'node:assert/strict';
import {videoProjectSource} from '../video-project.mjs';
import {sha256Bytes} from '../cut-jokelets-core.mjs';

test('a whole video becomes a stable project source with its original bytes and soundtrack',async()=>{
 const file=new File([new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109])],'Slide test 2.mp4',{type:'video/mp4'}),meta={times:[0,.04,.08],end:.12,width:1080,height:1920,audio:true};
 const first=await videoProjectSource(file,meta),renamed=await videoProjectSource(new File([file],'Renamed.mp4'),meta);
 assert.equal(first.output.blob,file);assert.equal(first.origin.cut.name,'Slide test 2');assert.equal(first.origin.cut.inFrame,0);assert.equal(first.origin.cut.outFrame,3);assert.equal(first.output.verified.audio,true);assert.equal(first.origin.source.sha256,await sha256Bytes(await file.arrayBuffer()));assert.equal(first.id,renamed.id);
 await assert.rejects(videoProjectSource(file,{...meta,times:[.04,.08]}),/frame zero/);
});
