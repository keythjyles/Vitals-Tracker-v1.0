import test from 'node:test';
import assert from 'node:assert/strict';
import {explicitValue} from '../compact-player.mjs';
test('explicit entry rejects empty, nonfinite and out-of-bounds input',()=>{
 for(const v of ['', ' ', 'NaN', 'Infinity', '-1','101'])assert.throws(()=>explicitValue(v,0,100));
 assert.equal(explicitValue('0',0,100),0);assert.equal(explicitValue('100',0,100),100);assert.equal(explicitValue('25.125',0,100),25.125);
});
