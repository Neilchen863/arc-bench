import { chromium } from 'playwright';
const port=process.argv[2];
const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1440,height:900},locale:'en-US',timezoneId:'UTC'});
const p=await c.newPage(); await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(1000);
console.log(await p.locator('body').ariaSnapshot());
await p.getByRole('button',{name:/take a note/i}).click(); await p.waitForTimeout(500);
console.log('--- editor'); console.log(await p.getByRole('dialog').ariaSnapshot());
await b.close();
