import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyStage} from './production-stages.mjs';
import {captionRecipe} from '../../shared/production-stages.mjs';
test('stage promotion verifies the actual media, current recipe and project-bound parents',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'stage-test-'));try{
  const path=join(dir,'source.mp4');execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=red:s=90x160:r=25:d=0.4','-f','lavfi','-i','sine=frequency=440:duration=0.4','-c:v','libx264','-c:a','aac',path]);const bytes=await readFile(path),sha256=createHash('sha256').update(bytes).digest('hex'),raw={id:'raw',role:'bed',name:'source.mp4',path:'/raw',size:bytes.length,sha256},out={...raw,id:'out',role:'stage',path:'/out',name:'Slide_v01.cap'},p={id:'stage-test-one',title:'Slide',assets:[raw,out],caplock:{media:{path:'/raw',size:bytes.length},clips:[],bedTransform:{x:50,y:50,scale:1}}};
  const input=await verifyStage(p,{stage:'raw'},raw,bytes);assert.equal(input.record.media.audio,true);assert.equal(input.record.fileName,'Slide_v01.raw');
  const data={stage:'captioned',recipeJSON:JSON.stringify(captionRecipe(p.caplock)),report:{composited:true,outputFrames:10,outputWidth:90,outputHeight:160,duration:.4,hasSourceAudio:true,hasEffects:false}},result=await verifyStage(p,data,out,bytes);assert.equal(result.record.media.frames,10);assert.equal(result.record.parents[0].sha256,sha256);
  p.production={records:[result.record]};assert.equal((await verifyStage(p,data,out,bytes)).reused,true);p.caplock.bedTransform.scale=.8;await assert.rejects(verifyStage(p,data,out,bytes),/placements changed/);await assert.rejects(verifyStage(p,{stage:'raw'},raw,Buffer.from('not the source')),/byte verification/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
