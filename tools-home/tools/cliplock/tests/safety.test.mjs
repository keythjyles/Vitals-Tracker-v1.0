import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {readCutList,cutListRecipe,clipZip,hapticClick} from '../safety.mjs';
const meta={times:Array.from({length:1674},(_,i)=>i/25),end:1674/25};
const recovered=JSON.parse(readFileSync(new URL('../EP4_RECOVERED_CUTS_20261101.json',import.meta.url)));
test('six screenshot ranges recover independently, including the shorter Slide',()=>{
 const cuts=readCutList(recovered,meta,'actual-source');
 assert.deepEqual(cuts.map(({name,inFrame,outFrame})=>[name,inFrame,outFrame]),[['Slide',0,300],['Eclipse',320,567],['Mint',865,1103],['Smart Grill',1103,1385],['Guacamole',1386,1608],['Jokelet Outro 65 frames',1609,1674]]);
 assert.equal(new Set(cuts.map(c=>c.id)).size,6);
 const recipe=cutListRecipe({sha256:'actual-source'},meta,cuts);
 assert.equal(readCutList(recipe,meta,'actual-source').length,6);
 assert.throws(()=>readCutList(recipe,meta,'different-source'),/different source/);
 assert.throws(()=>readCutList(recovered,{...meta,times:meta.times.slice(1)},'actual-source'),/frame count differs/);
});
test('bad cut-list import cannot change the original recipe',()=>{
 const before=structuredClone(recovered),bad=structuredClone(recovered);bad.cuts[4].name='Slide';
 assert.throws(()=>readCutList(bad,meta,'source'),/different name/);
 assert.deepEqual(recovered,before);
 bad.cuts[4].name='Guacamole';bad.cuts[4].outFrame=1675;
 assert.throws(()=>readCutList(bad,meta,'source'));
});
test('one bundle carries six byte-identical clips and its recovery recipe',async()=>{
 const files=recovered.cuts.map((c,i)=>({name:String(i+1).padStart(2,'0')+'_'+c.name+'.webm',blob:new Blob([new Uint8Array([i,1,255,0])])}));
 files.push({name:'cut-list.json',blob:new Blob([JSON.stringify(recovered)])});
 const bundle=await clipZip(files),dir=mkdtempSync(join(tmpdir(),'gs-zip-')),path=join(dir,'clips.zip');writeFileSync(path,new Uint8Array(await bundle.arrayBuffer()));
 const inspected=JSON.parse(execFileSync('python3',['-c',"import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps({'names':z.namelist(),'bytes':[list(z.read(n)) for n in z.namelist()[:-1]],'cuts':len(json.loads(z.read('cut-list.json'))['cuts'])}))",path],{encoding:'utf8'}));
 assert.equal(inspected.names.length,7);assert.equal(inspected.cuts,6);assert.deepEqual(inspected.bytes,Array.from({length:6},(_,i)=>[i,1,255,0]));
 const controller=new AbortController();controller.abort();await assert.rejects(clipZip(files,{signal:controller.signal}),/cancelled/);
});
test('one frame press requests one short haptic, and unsupported devices stay usable',()=>{
 const calls=[];hapticClick({vibrate:n=>{calls.push(n);return true;}});assert.deepEqual(calls,[12]);assert.equal(hapticClick({}),false);assert.equal(hapticClick({vibrate(){throw Error('unsupported');}}),false);
});
