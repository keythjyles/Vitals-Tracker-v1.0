const assert = require('node:assert/strict');

module.exports = async (browser, caplockURL) => {
 const home = new URL('../../', caplockURL);
 const context = await browser.newContext({viewport: {width: 360, height: 640}});
 const page = await context.newPage();
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.goto(home.href);
 await page.getByRole('searchbox', {name: 'Find a tool'}).waitFor();

 const targets = await page.locator('#toolGroups a.tool').evaluateAll(links => links.map(link => link.href));
 assert.equal(new Set(targets).size, targets.length);
 assert.equal(await page.locator('#toolGroups h2').count(), 4);
 assert.equal(await page.locator('#toolGroups a[href="./tools/caplock/"]').count(), 1);
 assert.equal(await page.locator('#toolGroups a[href="./tools/wavlock/"]').count(), 1);
 for (const width of [320, 360, 1100]) {
  await page.setViewportSize({width, height: 700});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
 }

 await page.getByRole('searchbox').fill('caption caplock');
 assert.equal(await page.locator('#toolGroups a.tool:visible').count(), 1);
 assert.match(await page.locator('#toolGroups a.tool:visible').textContent(), /CapLock/);
 await page.getByRole('searchbox').fill('unmatched query');
 assert.equal(await page.locator('#searchStatus').textContent(), 'No tools found.');

 await page.getByRole('searchbox').fill('');
 await page.getByText('More tools and shortcuts', {exact: true}).click();
 await page.getByLabel('Tool name').fill('Review file');
 await page.getByLabel('Tool URL').fill('https://example.com/check');
 await page.getByRole('button', {name: 'Add link'}).click();
 await page.reload();
 await page.getByText('More tools and shortcuts', {exact: true}).click();
 assert.equal(await page.getByRole('link', {name: 'Review file'}).getAttribute('href'), 'https://example.com/check');

 assert.deepEqual(errors, []);
 await context.close();
 console.log(JSON.stringify({toolsDirectory: {uniqueEntries: targets.length, search: true, viewportWidths: [320, 360, 1100], savedShortcuts: true}}));
};
