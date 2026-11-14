const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

module.exports = async (browser, base) => {
 const page = await browser.newPage();
 try {
  await page.goto(base);
  const bytes = [...await fs.readFile('/tmp/caplock-fixtures/full-range-alpha.webm')];
  const compare = await page.evaluate(async sourceBytes => {
   const moduleURL = name => new URL(name, location.href).href;
   const {createProject} = await import(moduleURL('./core.mjs'));
   const {makeToolboxPlacement} = await import(moduleURL('./toolbox-core.mjs'));
   const {renderCaptioned} = await import(moduleURL('./composite.mjs'));
   const width = 160, height = 288;
   const source = new Blob([new Uint8Array(sourceBytes)], {type: 'video/webm'});

   async function pixels(file) {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    try {
     await new Promise((resolve, reject) => {
      video.onloadeddata = resolve;
      video.onerror = () => reject(Error('Could not decode the color test frame.'));
      video.src = url;
     });
     const canvas = new OffscreenCanvas(width, height);
     const ctx = canvas.getContext('2d', {alpha: false, colorSpace: 'srgb'});
     ctx.drawImage(video, 0, 0);
     return ctx.getImageData(0, 0, width, height).data;
    } finally {
     video.pause();
     video.removeAttribute('src');
     video.load();
     URL.revokeObjectURL(url);
    }
   }

   async function render(file, name) {
    const project = createProject();
    project.version = 10;
    project.canvas = {width, height, name};
    const asset = {id: 'source', name, type: 'video', ref: {kind: 'local', name, size: file.size},
     frames: 10, duration: .4, width, height, hasAudio: false};
    project.toolbox = [asset];
    project.clips = [{...makeToolboxPlacement(asset, 0, 'layer'), x: 50, y: 50, width: 100}];
    return renderCaptioned({project, readAsset: async () => file});
   }

   function patches(reference, actual) {
    const averages = [];
    for (const [x, y] of [[40, 36], [120, 36], [40, 108], [120, 108], [40, 180], [120, 180], [40, 252], [120, 252]]) {
     const delta = [0, 0, 0];
     for (let dy = -4; dy < 4; dy++) for (let dx = -4; dx < 4; dx++) {
      const p = ((y + dy) * width + x + dx) * 4;
      for (let c = 0; c < 3; c++) delta[c] += actual[p + c] - reference[p + c];
     }
     averages.push(delta.map(value => value / 64));
    }
    return averages;
   }

   const reference = await pixels(source);
   const point = (x, y) => [...reference.slice((y * width + x) * 4, (y * width + x) * 4 + 3)];
   const transparentCorner = point(3, 36);
   const colorPatch = point(120, 36);
   const first = await render(source, 'first.webm');
   const second = await render(first.blob, 'second.mp4');
   const firstPixels = await pixels(first.blob);
   const secondPixels = await pixels(second.blob);
   return {
    transparentCorner, colorPatch,
    firstPass: patches(reference, firstPixels),
    secondPass: patches(reference, secondPixels),
    repeatChange: patches(firstPixels, secondPixels),
    frames: [first.report.outputFrames, second.report.outputFrames],
   };
  }, bytes);
  assert.deepEqual(compare.frames, [10, 10]);
  assert.ok(compare.transparentCorner.every(channel => channel < 5), JSON.stringify(compare));
  assert.ok(compare.colorPatch[0] > 160 && compare.colorPatch[1] > 90 && compare.colorPatch[2] < 120, JSON.stringify(compare));
  const within = (patches, limit) => patches.every(patch => patch.every(value => Math.abs(value) <= limit));
  assert.ok(within(compare.firstPass, 6), JSON.stringify(compare));
  assert.ok(within(compare.secondPass, 8), JSON.stringify(compare));
  assert.ok(within(compare.repeatChange, 4), JSON.stringify(compare));
  console.log(JSON.stringify({capLockColorPasses: compare}));
 } finally {
  await page.close();
 }
};
