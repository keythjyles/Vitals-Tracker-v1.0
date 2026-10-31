import test from 'node:test';import assert from 'node:assert/strict';
import {cutPassVersion,nextCutPassVersion,captionCutLabel} from '../../../shared/cut-passes.mjs';
import {projectAssets} from '../../studio/project-index.mjs';
test('legacy cut is v1, a new blank pass is v2, both stay discoverable',()=>{
 const old={id:'old',status:'complete',clips:[{path:'/v1/1.webm',number:1}],ranges:[]};
 const a={id:'source',role:'caption',name:'original.mp4',path:'/original.mp4',cuts:old};
 assert.equal(cutPassVersion(a),1);assert.equal(nextCutPassVersion(a),2);assert.match(captionCutLabel(a),/Cut · v1/);
 a.cutHistory=[old];a.cuts={id:'new',version:2,status:'draft',clips:[],ranges:[]};
 assert.equal(cutPassVersion(a),2);assert.match(captionCutLabel(a),/Draft · v2 · v1 cut/);
 assert.equal(projectAssets({assets:[a]}).find(x=>x.parent).cutPassVersion,1);
 a.cuts={...a.cuts,status:'complete',clips:[{number:1,path:'/v2/1.webm',name:'question.webm'}]};
 const assets=projectAssets({assets:[a]});assert.equal(assets.length,3);assert.equal(assets[2].name,'question.webm');assert.equal(assets[2].cutPassVersion,2);assert.match(captionCutLabel(a),/Cut · v2/);
});
