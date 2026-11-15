const assert = require('node:assert/strict');

module.exports = async function checkInsertAndNames(page, bedName, overlayFile, overlayName) {
 const $ = id => page.locator('#' + id);
 const readFrame = () => page.evaluate(() => Number(document.getElementById('position').dataset.frame));
 const readMedia = () => $('bv').evaluate(video => [video.currentSrc, video.currentTime, video.paused]);
 const rename = async (scope, from, to) => {
  await scope.getByRole('button', {name: 'Rename ' + from, exact:true}).tap();
  const name = scope.getByRole('textbox', {name:'Video name', exact:true});
  assert.equal(await name.inputValue(), from);
  await name.fill(to);
  await scope.getByRole('button', {name:'Save', exact:true}).tap();
  await scope.getByRole('button', {name:'Rename ' + to.trim(), exact:true}).waitFor();
 };

 await $('goFrame').fill('24');
 await $('jumpFrame').tap();
 await $('play').tap();
 await page.waitForFunction(() => document.getElementById('bv').currentTime > 1.04);
 const insert = page.getByRole('button', {name:'Insert', exact:true});
 await insert.tap();
 assert.equal(await $('aspectToolbox').evaluate(panel => panel.open), true);
 const held = await readMedia();
 const stoppedFrame = await readFrame();
 assert.equal(held[2], true);
 assert.equal(stoppedFrame, Math.floor(held[1] * 25 + .001));
 assert.equal(await $('insertFrame').textContent(), 'Insert at F' + stoppedFrame);
 await $('insertForward').tap();
 await $('insertForward').tap();
 assert.equal(await readFrame(), stoppedFrame + 2, 'each tap must move exactly one frame');
 await $('insertBack').tap();
 const placement = stoppedFrame + 1;
 assert.equal(await $('insertFrame').textContent(), 'Insert at F' + placement);
 assert.equal(await readFrame(), placement);
 assert.equal((await readMedia())[2], true);

 await $('toolboxFiles').setInputFiles(overlayFile);
 await page.getByRole('button', {name:`Overlay ${overlayName} at current frame`, exact:true}).tap();
 await page.waitForFunction(name => document.getElementById('addedName').textContent === name, overlayName);
 assert.equal(await $('bedIn').inputValue(), String(placement));
 if (!await $('aspectExport').evaluate(panel => panel.open)) await $('aspectExport').locator(':scope > summary').click();
 await $('save').click();
 await page.waitForFunction(() => document.getElementById('status').textContent === 'Edit saved on this device.');
 const saved = await page.evaluate(() => localStorage.getItem('aspectlock-saved-edit'));

 const mediaBeforeNames = await readMedia();
 await rename($('aspectBedName'), bedName, '  Chapter 3 · Working bed  ');
 const namedBed = 'Chapter 3 · Working bed';
 await insert.tap();
 await $('toolboxItems').getByRole('button', {name:'Rename ' + namedBed, exact:true}).waitFor();
 const namedOverlay = 'Blue monitor';
 await rename($('toolboxItems'), overlayName, namedOverlay);
 assert.equal(await $('addedName').textContent(), namedOverlay);
 assert.deepEqual(await readMedia(), mediaBeforeNames, 'a name edit must keep the media and playhead');
 assert.equal(await page.evaluate(() => localStorage.getItem('aspectlock-saved-edit')), saved);

 await $('aspectBedName').getByRole('button', {name:'Rename ' + namedBed}).tap();
 await $('aspectBedName').getByRole('textbox', {name:'Video name'}).fill('   ');
 await $('aspectBedName').getByRole('button', {name:'Save', exact:true}).tap();
 assert.equal(await $('aspectBedName').getByRole('alert').textContent(), 'Enter a video name.');
 await $('aspectBedName').getByRole('button', {name:'Cancel', exact:true}).tap();
 await $('aspectBedName').getByRole('button', {name:'Rename ' + namedBed, exact:true}).waitFor();

 await page.reload();
 await $('aspectExport').locator(':scope > summary').click();
 await $('restoreEdit').click();
 await page.waitForFunction(() => document.getElementById('status').textContent === 'Saved edit restored.');
 assert.equal(await $('aspectBedName').locator('button').textContent(), namedBed);
 assert.equal(await $('addedName').textContent(), namedOverlay);
 assert.equal(await $('bedIn').inputValue(), String(placement));
 assert.equal(await readFrame(), placement);
 console.log('AspectLock Insert pauses and steps by one frame. The renamed clips and saved placement survived reload.');
};
