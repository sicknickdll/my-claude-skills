// Capture the portfolio for the video: viewport screenshots down the page, full text, every image (downloaded).
// Usage: node tools/scrape.js [url] [outDir]
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const URL_ = process.argv[2] || 'https://nicololombardi.framer.website/';
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '../site'));

(async () => {
  fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const media = new Set();
  page.on('response', r => {
    const ct = r.headers()['content-type'] || '';
    if (/image|video/.test(ct)) media.add(r.url());
  });
  await page.goto(URL_, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, 'shots/000_top.png') });

  // scroll down a viewport at a time so lazy content and scroll animations fire
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  let i = 1;
  for (let y = 0; y < total; y += 900, i++) {
    await page.evaluate(y => window.scrollTo(0, y), y);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `shots/${String(i).padStart(3, '0')}_y${y}.png`) });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'shots/full.png'), fullPage: true });

  const info = await page.evaluate(() => {
    const abs = u => { try { return new URL(u, location.href).href; } catch { return u; } };
    const imgs = [...document.querySelectorAll('img')].map(im => {
      const r = im.getBoundingClientRect();
      return { src: abs(im.currentSrc || im.src), srcset: im.srcset, alt: im.alt, w: im.naturalWidth, h: im.naturalHeight,
        box: [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)] };
    });
    const bgs = [...document.querySelectorAll('*')].map(el => getComputedStyle(el).backgroundImage)
      .filter(b => b && b.startsWith('url(')).map(b => abs(b.slice(5, -2)));
    const videos = [...document.querySelectorAll('video, video source')].map(v => abs(v.src || v.currentSrc)).filter(Boolean);
    const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => ({ tag: h.tagName, text: h.innerText.trim() }));
    const links = [...document.querySelectorAll('a')].map(a => ({ text: a.innerText.trim(), href: a.href })).filter(a => a.text);
    const fonts = [...new Set([...document.querySelectorAll('h1,h2,h3,p,a,span')].slice(0, 400).map(e => getComputedStyle(e).fontFamily))];
    const colors = [...new Set([...document.querySelectorAll('*')].slice(0, 1500).flatMap(e => {
      const s = getComputedStyle(e); return [s.color, s.backgroundColor];
    }))];
    return { title: document.title, text: document.body.innerText, imgs, bgs: [...new Set(bgs)], videos, heads, links, fonts, colors };
  });
  info.media = [...media];
  fs.writeFileSync(path.join(OUT, 'site.json'), JSON.stringify(info, null, 1));
  fs.writeFileSync(path.join(OUT, 'text.txt'), info.text);

  // download the largest variant of every image/video we saw
  const urls = new Set([...info.media, ...info.bgs, ...info.videos, ...info.imgs.map(i => i.src)]);
  for (const im of info.imgs) for (const part of (im.srcset || '').split(',')) { const u = part.trim().split(' ')[0]; if (u) urls.add(u); }
  let n = 0;
  for (const u of urls) {
    if (!/^https?:/.test(u)) continue;
    try {
      const r = await ctx.request.get(u, { timeout: 30000 });
      if (!r.ok()) continue;
      const ct = r.headers()['content-type'] || '';
      const ext = ct.includes('png') ? '.png' : ct.includes('webp') ? '.webp' : ct.includes('svg') ? '.svg' : ct.includes('gif') ? '.gif'
        : ct.includes('mp4') ? '.mp4' : ct.includes('webm') ? '.webm' : '.jpg';
      const name = String(n++).padStart(3, '0') + '_' + path.basename(new URL(u).pathname).replace(/\.[a-z0-9]+$/i, '').slice(0, 40) + ext;
      fs.writeFileSync(path.join(OUT, 'img', name), await r.body());
    } catch (e) { /* skip unreachable assets */ }
  }
  console.log(`title: ${info.title}\nimages: ${info.imgs.length}, downloaded: ${n}, page height: ${total}`);
  await browser.close();
})();
