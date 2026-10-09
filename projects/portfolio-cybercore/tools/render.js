// Render src/ to MP4: serve it locally, seek every frame in headless Chromium, pipe PNGs into ffmpeg.
// Usage: node tools/render.js [--out out.mp4] [--content content.json] [--from 0] [--to 20] [--stills 1.0,4.4,...] [--every N]
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.resolve(arg('out', path.join(ROOT, 'out/portfolio-cybercore.mp4')));
const CONTENT = arg('content', 'content.json');
const STILLS = arg('stills', null);
const STILL_DIR = path.resolve(arg('stillDir', path.join(ROOT, 'out/stills')));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.gif': 'image/gif' };
const server = http.createServer((req, res) => {
  const p = path.join(SRC, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(SRC) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--disable-gpu-vsync'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/index.html?content=${encodeURIComponent(CONTENT)}`);
  await page.waitForFunction(() => window.ready || window.loadError, null, { timeout: 120000 });
  const loadError = await page.evaluate(() => window.loadError);
  if (loadError) { console.error(loadError, errors); process.exit(1); }
  const { fps, dur } = await page.evaluate(() => ({ fps: window.FPS, dur: window.DURATION }));
  const shot = async (t) => { await page.evaluate(t => window.seek(t), t); return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } }); };

  if (STILLS) {
    fs.mkdirSync(STILL_DIR, { recursive: true });
    for (const s of STILLS.split(',')) {
      const t = parseFloat(s);
      fs.writeFileSync(path.join(STILL_DIR, `t${t.toFixed(3)}.png`), await shot(t));
    }
    console.log('stills ->', STILL_DIR, errors.length ? errors : '');
  } else {
    const from = parseFloat(arg('from', 0)), to = parseFloat(arg('to', dur));
    const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const audio = path.join(ROOT, 'audio/cut.wav');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      '-ss', String(from), '-t', String(to - from), '-i', audio,
      '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '256k', '-shortest', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      const png = await shot(f / fps);
      if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 30 === 0) process.stdout.write(`frame ${f}/${f1} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('wrote', OUT, errors.length ? errors : '');
  }
  await browser.close(); server.close();
})();
