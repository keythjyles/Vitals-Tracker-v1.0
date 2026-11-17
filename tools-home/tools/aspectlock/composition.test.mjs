import assert from 'node:assert/strict';
import test from 'node:test';
import {frameAt, fitRect, lastFrame, placedOutFrame, placementAt, pictureOpacityAt} from './composition.mjs';

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

test('automatic OUT uses the full trimmed source at the current rate', () => {
 assert.equal(placedOutFrame(502, 1, 1, 503), 503);
 assert.equal(placedOutFrame(94, 1, 1, 503), 119);
 assert.equal(placedOutFrame(94, 1, 1.25, 503), 114);
 assert.equal(placedOutFrame(94, 1, 1.25, 503, 114), 114);
 assert.equal(placedOutFrame(94, 0, 1, 503), null);
 assert.equal(placedOutFrame(94, Infinity, 1, 503), null);
 assert.equal(placedOutFrame(503, 1, 1, 503), null);
});

test('picture fades reach transparency on the first and last displayed frames', () => {
 const settings = {fadeIn:4/25, fadeOut:2/25};
 const opacity = frame => pictureOpacityAt(settings, 94, 104, frame);
 assert.deepEqual([94,96,98,101,102,103].map(opacity), [0,.5,1,1,.5,0]);
 assert.equal(pictureOpacityAt(settings, 94, 95, 94), 0);
 assert.equal(pictureOpacityAt(undefined, 94, 95, 94), 1);
 assert.equal(pictureOpacityAt({fadeOut:1}, 94, 99, 96), .5);
});

test('the same portrait rectangle contains a landscape animation without stretching it', () => {
 const r = fitRect(16/9);
 assert.equal(r.width, 540);
 assert.equal(r.y * 2 + r.height, 960);
 assert.equal(r.width / r.height, 16/9);
});
