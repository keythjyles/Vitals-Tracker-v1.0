import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCutOrigin,cutProjectId,verifyCutOutput} from '../cut-jokelets-core.mjs';
const origin={source:{name:'episode.mp4',sha256:'a'.repeat(64),frames:2000,bytes:12345},cut:{id:'saved-cut-1',index:1,name:'Slide',inFrame:1525,outFrame:1550,start:61,end:62}};
test('jokelet identity follows the original and committed cut, independent of name/order/format',async()=>{
 const id=await cutProjectId(origin);assert.match(id,/^cut-[a-f0-9]{64}$/);
 assert.equal(await cutProjectId({...origin,cut:{...origin.cut,name:'Renamed',index:4}}),id);
 for(const changed of [{...origin,source:{...origin.source,sha256:'b'.repeat(64)}},{...origin,cut:{...origin.cut,id:'another-cut'}},{...origin,cut:{...origin.cut,outFrame:1551,end:62.04}}])assert.notEqual(await cutProjectId(changed),id);
});
test('source provenance and finished-video verification fail before a cloud bed can be linked',()=>{
 const o=normalizeCutOrigin(origin);assert.equal(o.cut.frames,25);
 const output={sha256:'c'.repeat(64),bytes:1234,format:'mp4',frames:25,width:1080,height:1920,duration:1,audio:true};assert.equal(verifyCutOutput(output,o).audio,true);
 for(const patch of [{frames:24},{duration:.96},{sha256:'no'},{bytes:41*1024*1024}])assert.throws(()=>verifyCutOutput({...output,...patch},o));
 assert.throws(()=>normalizeCutOrigin({...origin,cut:{...origin.cut,outFrame:2001}}));
 assert.throws(()=>normalizeCutOrigin({...origin,source:{...origin.source,sha256:'unknown'}}));
});
