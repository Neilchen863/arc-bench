const root='/Users/chenjiahao/Desktop/research/FYP/arc-bench/node_modules/';
const {chromium}=require(root+'playwright');
const {expect}=require(root+'@playwright/test');
(async()=>{const browser=await chromium.launch();const page=await browser.newPage();const results=[];
async function check(name,html,fn){await page.setContent(html);try{results.push({name,result:await fn()});}catch(e){results.push({name,error:e.message.split('\n').slice(0,5).join('\n')});}}
const text=()=>page.getByText('First line\nSecond line',{exact:true}).count();
await check('multiline-prewrap','<p style="white-space:pre-wrap">First line\nSecond line</p>',text);
await check('multiline-br','<p>First line<br>Second line</p>',text);
await check('multiline-br-whitespace','<p>First line<br>\nSecond line</p>',text);
await check('multiline-paragraphs','<div><p>First line</p><p>Second line</p></div>',text);
await check('stacked-notices','<div role="status" aria-label="Note deleted">Deleted A<button>Undo</button></div><div role="status" aria-label="Note deleted">Deleted B<button>Undo</button></div>',async()=>{await expect(page.getByRole('status',{name:'Note deleted',exact:true})).toBeVisible({timeout:100});return 'passed';});
for(const [name,content] of [['br','G1001<br>Shanghai → Beijing'],['text','G1001 Shanghai → Beijing'],['strong','<strong>G1001</strong> Shanghai → Beijing']]) await check('order-'+name,`<table><tr><td>${content}</td></tr></table>`,()=>page.getByRole('row').filter({has:page.getByText('G1001',{exact:true})}).count());
for(const tag of ['th','td'])await check('train-'+tag,`<table><tr><${tag} scope="row">G1001</${tag}><td>08:00</td><td><button>Book</button></td></tr></table>`,async()=>{const cells=await page.getByRole('row').filter({has:page.getByRole('button',{name:'Book',exact:true})}).getByRole('cell').allTextContents();const ids=cells.flatMap(s=>s.match(/\b[GCDKZT]\d+\b/g)??[]);return {cells,ids,helperThrows:ids.length!==1};});
await check('nested-flights','<section aria-label="Flight list"><ul><li aria-label="Flight CZ3401">CZ3401</li><li aria-label="Flight JD5162">JD5162<ul><li>Stop A</li><li>Stop B</li></ul></li><li aria-label="Flight MU5234">MU5234</li></ul></section>',async()=>{const entries=page.getByRole('region',{name:'Flight list',exact:true}).getByRole('listitem');const snapshots=await Promise.all((await entries.all()).map(x=>x.ariaSnapshot()));return {count:await entries.count(),missingFlightIdentity:snapshots.filter(s=>!s.match(/^[- ]*listitem "Flight ([A-Z]+[0-9]+)"/m)).length};});
await check('view-count','<div>Views: <span role="status" aria-label="View count">42</span></div>',async()=>({status:await page.getByRole('status',{name:'View count',exact:true}).innerText(),viewedCount:await page.getByText(/^Viewed/).count()}));
const report=JSON.stringify({playwright:require(root+'playwright/package.json').version,browser:browser.version(),results},null,2);require('fs').writeFileSync(__dirname+'/results.json',report+'\n');console.log(report);await browser.close();})();
