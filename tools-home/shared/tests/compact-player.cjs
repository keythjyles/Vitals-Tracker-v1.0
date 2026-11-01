const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const pages=['cliplock/?mode=video','caplock/','sxlock/','aspectlock/','previewlock/cloud-test.html','framelock/','motionlock/','wavlock/'];
 for(const path of pages){const page=await browser.newPage({viewport:{width:390,height:740},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8767/tools-home/tools/'+path);await page.waitForSelector('body.gs-compact');await page.waitForFunction(()=>[...document.querySelectorAll('input[type=range]:not([hidden])')].every(e=>e.hasAttribute('data-gs-protected-range')||e.closest('[inert]')));await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,path+' fits phone width');
  assert.equal(await page.locator('input[type=range]').evaluateAll(es=>es.some(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0)),false,path+' has no draggable ranges');
  const layout=await page.evaluate(()=>{const workspace=document.querySelector('.gs-viewer'),rail=document.querySelector('.gs-rail'),stage=document.querySelector('.gs-stage');if(!workspace||!rail||!stage)return null;const r=rail.getBoundingClientRect(),s=stage.getBoundingClientRect();return {right:r.left>=s.right-1,rail:r.width,stage:s.width};});if(layout){assert.equal(layout.right,true,path+' transport hugs right');assert.ok(layout.rail<=80,path+' compact rail');}
  assert.deepEqual(errors,[],path+' initializes without script errors');await page.close();
 }console.log('Eight shared players fit phone width with protected ranges and compact right controls.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
