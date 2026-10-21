import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const books = await (await fetch('http://127.0.0.1:39071/api/books')).json();
const bk = books.find(x => x.name === 'Book 6.1.1');
await p.goto('http://127.0.0.1:39071/books/' + bk.id); await p.waitForTimeout(500); await p.screenshot({ path: process.argv[2] + '/book.png' });
const pages = await (await fetch('http://127.0.0.1:39071/api/pages')).json();
await p.goto('http://127.0.0.1:39071/pages/' + pages[2].id + '/edit'); await p.waitForTimeout(500); await p.screenshot({ path: process.argv[2] + '/editor.png' });
await b.close();
