import assert from 'node:assert/strict';
import test from 'node:test';
import {frameAt, fitRect, lastFrame, placementAt} from './composition.mjs';

test('25 fps cues keep the last visible frame and exact exclusive output boundary', () => {
 assert.equal(lastFrame(62.68), 1566);
 assert.equal(frameAt(18.919, 62.68), 472);
 assert.equal(frameAt(18.920, 62.68), 473);
 assert.equal(frameAt(62.68, 62.68), 1566);

 const range = {inFrame:331,outFrame:473,trimIn:0,trimOut:10,rate:10*25/142};
 assert.equal(placementAt(330/25, range), null);
 assert.equal(placementAt(331/25, range).time, 0);
 assert.ok(placementAt(472/25, range).time > 9.9);
 assert.equal(placementAt(473/25, range), null);
});
test('the same portrait rectangle contains a landscape animation without stretching it', () => {
 const r = fitRect(16/9);
 assert.equal(r.width, 540);
 assert.equal(r.y * 2 + r.height, 960);
 assert.equal(r.width / r.height, 16/9);
});
