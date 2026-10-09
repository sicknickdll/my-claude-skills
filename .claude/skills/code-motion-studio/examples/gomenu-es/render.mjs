// Usage:
//   node render.mjs stills 0.5 2 4.2 ...      → stills/t_<sec>.png
//   node render.mjs video [fps=60] [sub=10]    → out/gomenu-es-9x16.mp4
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const [mode = 'video', ...args] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => { console.error('[pageerror]', e.message); process.exitCode = 1; });
await page.goto('file://' + path.join(dir, 'index.html'));
const fit = await page.evaluate(() => window.ready);
console.log('hook font size', fit);
const dur = await page.evaluate(() => window.DURATION);

if (mode === 'stills') {
  mkdirSync(path.join(dir, 'stills'), { recursive: true });
  for (const s of args) {
    await page.evaluate(t => window.seek(t), +s);
    await page.screenshot({ path: path.join(dir, 'stills', `t_${(+s).toFixed(2)}.png`) });
  }
} else {
  const fps = +(args[0] || 60), sub = +(args[1] || 10);
  mkdirSync(path.join(dir, 'out'), { recursive: true });
  const silent = path.join(dir, 'out', 'video-silent.mp4');
  const out = path.join(dir, 'out', 'gomenu-es-9x16.mp4');
  const vf = sub > 1 ? `tmix=frames=${sub}:weights='${Array(sub).fill(1).join(' ')}',select='not(mod(n\\,${sub}))',` : '';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps * sub), '-i', '-',
    '-vf', `${vf}format=yuv420p`, '-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
    '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(dur * fps * sub);
  for (let i = 0; i < total; i++) {
    // 180° shutter: the sub samples of each output frame span its first half
    const f = Math.floor(i / sub), k = i % sub;
    const t = (f + (k / sub) * 0.5) / fps;
    await page.evaluate(t => window.seek(t), t);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 120 === 0) console.log(`frame ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  // mux the 120 BPM cue (music.py), two-pass loudnorm to -14 LUFS / -1 dBTP
  const wav = path.join(dir, 'audio', 'music.wav');
  const run = (a) => new Promise((res, rej) => { const p = spawn('ffmpeg', a, { stdio: ['ignore', 'inherit', 'pipe'] });
    let err = ''; p.stderr.on('data', d => err += d); p.on('close', c => c ? rej(new Error(err)) : res(err)); });
  const meas = JSON.parse((await run(['-hide_banner', '-i', wav, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-']))
    .match(/\{[\s\S]*\}/)[0]);
  const ln = `loudnorm=I=-14:TP=-1:LRA=11:linear=true:measured_I=${meas.input_i}:measured_TP=${meas.input_tp}:measured_LRA=${meas.input_lra}:measured_thresh=${meas.input_thresh}:offset=${meas.target_offset}`;
  await run(['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
    '-af', `${ln},aresample=48000`, '-c:a', 'aac', '-b:a', '256k', '-t', String(dur), '-movflags', '+faststart', out]);
  console.log('wrote', out);
}
await browser.close();
