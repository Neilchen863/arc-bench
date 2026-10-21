import { chromium } from 'playwright';
import { spawn } from 'child_process';
const B=process.argv[2], port=39261;
const srv=spawn(process.execPath,['server/server.mjs'],{cwd:B,env:{...process.env,PORT:String(port),APP:'keep',STATIC_DIR:B+'/app/dist'},stdio:'ignore'});
try{
for(let i=0;i<50;i++){try{const r=await fetch(`http://127.0.0.1:${port}/__health`);if(r.ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
await fetch(`http://127.0.0.1:${port}/__reset`,{method:'POST'});
const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1440,height:900},locale:'en-US',timezoneId:'UTC'});
const p=await c.newPage(); await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(800);
await p.getByRole('button',{name:/take a note/i}).click();
const d=p.getByRole('dialog',{name:'New note'});
await d.getByRole('textbox',{name:'Title'}).fill('Study schedule ab');
await d.getByRole('textbox',{name:'Note text'}).fill('Math on Monday');
await d.getByRole('button',{name:'Close',exact:true}).click(); await d.waitFor({state:'hidden'});
await p.getByRole('searchbox').click(); await p.waitForTimeout(400);
console.log(await p.locator('main').ariaSnapshot());
await p.keyboard.type('st'); await p.waitForTimeout(400);
console.log(await p.locator('body').ariaSnapshot());
console.log(await p.locator('main').innerHTML());
await b.close();
} finally { srv.kill(); }
