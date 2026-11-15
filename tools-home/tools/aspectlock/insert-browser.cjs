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

 // A full Toolbox has both a page scroll and, when pinned, a separate list scroll.
 await insert.tap();
 const filler = Array.from({length:12}, (_, i) => ({
  name:`Clip list fixture ${i + 1}.mp4`,mimeType:'video/mp4',buffer:Buffer.from('List entry only'),
 }));
 await $('toolboxFiles').setInputFiles(filler);
 await $('toolboxItems').getByRole('button', {name:'Rename Clip list fixture 12.mp4',exact:true}).waitFor({state:'attached'});
 const position = () => page.evaluate(() => ({
  page:window.scrollY,
  list:document.getElementById('pinnedSections').scrollTop,
  player:document.querySelector('.gs-player-shell').offsetHeight,
 }));
 await page.evaluate(() => window.scrollTo(0, 800));
 await page.waitForFunction(() => window.scrollY >= 795);
 const scrolled = await position();
 await insert.tap();
 assert.deepEqual(await position(), scrolled, 'reopening Insert must leave a scrolled clip list in place');
 const stepVisible = await $('insertForward').evaluate(button => {
  const {x,y,width,height} = button.getBoundingClientRect();
  return button.contains(document.elementFromPoint(x + width / 2, y + height / 2));
 });
 assert.equal(stepVisible, true);

 const untouchedRow = await $('toolboxItems').getByRole('button',{name:'Rename Clip list fixture 12.mp4',exact:true}).elementHandle();
 await $('aspectBedName').getByRole('button',{name:'Rename ' + namedBed,exact:true}).tap();
 assert.deepEqual(await position(), scrolled, 'the name field must fit the existing player row');
 await $('aspectBedName').getByRole('textbox').fill('Chapter 3 bed');
 await $('aspectBedName').getByRole('button',{name:'Save',exact:true}).tap();
 await $('aspectBedName').getByRole('button',{name:'Rename Chapter 3 bed',exact:true}).waitFor();
 assert.deepEqual(await position(), scrolled, 'saving a name must keep the view in place');
 assert.equal(await untouchedRow.evaluate(row => row.isConnected), true);
 assert.equal(await readFrame(), placement);

 await page.evaluate(() => window.scrollTo(0, 0));
 await insert.tap();
 await $('aspectToolbox').getByRole('button',{name:'Pin Toolbox',exact:true}).tap();
 await page.evaluate(() => {
  document.getElementById('pinnedSections').scrollTop = 320;
  window.scrollTo(0, 200);
 });
 await page.waitForFunction(() => document.getElementById('pinnedSections').scrollTop >= 300);
 const pinned = await position();
 await insert.tap();
 assert.deepEqual(await position(), pinned, 'Insert must keep both scroll positions when the Toolbox is pinned');
 assert.equal(await readFrame(), placement);
 console.log('AspectLock Insert and rename kept the paused frame and the scroll position. Saved names and placement survived reload.');
};
