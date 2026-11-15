const assert = require('node:assert/strict');

module.exports = async function checkFrameSeek(browser, caplockURL) {
 const page = await browser.newPage({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
 const $ = id => page.locator('#' + id);
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));

 async function waitForFrame(frame, color) {
  await page.waitForFunction(({frame, color}) => {
   const ctx = document.getElementById('output').getContext('2d');
   const [r,g,b] = ctx.getImageData(30,30,1,1).data;
   const tint = Math.max(r,g,b) < 12 ? 'black' : r > g ? 'red' : 'green';
   return document.getElementById('bv').paused &&
    document.getElementById('position').dataset.frame === String(frame) &&
    document.getElementById('insertFrame').textContent === 'Insert at F' + frame &&
    tint === color;
  }, {frame, color});
 }

 async function go(frame, color) {
  await $('goFrame').fill(String(frame));
  await $('jumpFrame').tap();
  await waitForFrame(frame, color);
 }

 try {
  await page.goto(new URL('../aspectlock/?source=device',caplockURL).href);
  await $('deviceVideo').setInputFiles('/tmp/caplock-fixtures/single-black-frame.mp4');
  await waitForFrame(0, 'red');
  await go(472,'red');
  await go(473,'black');
  const steppingBack = await page.evaluate(() => {
   document.getElementById('backFrame').click();
   const frame = Number(document.getElementById('position').dataset.frame);
   const pixel = document.getElementById('output').getContext('2d').getImageData(30,30,1,1).data;
   return {frame, black:Math.max(pixel[0],pixel[1],pixel[2]) < 12};
  });
  assert.equal(steppingBack.black, steppingBack.frame === 473,'a previous picture keeps its matching frame number while the seek is pending');
  await waitForFrame(472,'red');
  await $('forwardFrame').tap();
  await waitForFrame(473,'black');
  await $('railToolbox').tap();
  await $('insertBack').tap();
  await waitForFrame(472,'red');
  await $('insertForward').tap();
  await $('insertForward').tap();
  await waitForFrame(474,'green');
  await go(448,'red');
  await $('forward25').tap();
  await waitForFrame(473,'black');
  await go(498,'green');
  await $('back25').tap();
  await waitForFrame(473,'black');

  await $('insertBack').tap();
  await waitForFrame(472,'red');
  await $('toolboxFiles').setInputFiles('/tmp/caplock-fixtures/blue-caption.mp4');
  await page.getByRole('button',{name:'Overlay blue-caption.mp4 at current frame',exact:true}).tap();
  await page.waitForFunction(()=>document.getElementById('addedName').textContent==='blue-caption.mp4');
  await $('railTiming').tap();
  await $('bedOut').fill('473');
  await $('applyTiming').tap();
  await $('editAdded').tap();
  for (const width of [320, 360, 393]) {
   await page.setViewportSize({width,height:740});
   const overflowing = await page.locator('#itemProperties > .compactBar > button').evaluateAll(buttons =>
    buttons.filter(button => button.scrollWidth > button.clientWidth + 1).map(button => button.textContent));
   assert.deepEqual(overflowing, [], 'appearance labels fit at ' + width + ' px');
  }
  await $('sheetForward').tap();
  await waitForFrame(473,'black');
  await $('sheetBack').tap();
  await waitForFrame(472,'red');
  await $('closeItemProperties').tap();
  await $('bedZero').tap();
  await waitForFrame(0,'red');
  assert.deepEqual(errors, []);
  console.log('AspectLock Go, rail, Toolbox and appearance steps show the black picture only at F473.');
 } finally { await page.close(); }
};
