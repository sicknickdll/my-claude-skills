// Scene graph for the 20 s cut. seek(t) draws one frame; nothing carries over between frames.
import { createGlitch } from './glitch.js';

const W = 1920, H = 1080;
const params = new URLSearchParams(location.search);
const CONTENT_URL = params.get('content') || 'content.json';

const A = await (await fetch('audio.json')).json();
const C = await (await fetch(CONTENT_URL)).json();
const DROP = A.drop, B = A.beat, FPS = A.fps;
const ACC = C.accent || '#FF1E3C';
const INK = '#EDEDED', BG = '#050505';

// ---------- assets ----------
const loadImg = (src) => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img ' + src)); i.src = src;
});
await document.fonts.load('100px Anton');
await document.fonts.load('800 20px "JetBrains Mono"');
await document.fonts.load('400 20px "JetBrains Mono"');
await document.fonts.load('900 20px "Noto Sans JP"', 'ニコロ視覚');
const IMG = {};
IMG.eye = await loadImg(C.eye.src);
if (C.hero) IMG.hero = await loadImg(C.hero.src);
IMG.projects = await Promise.all(C.projects.map(p => loadImg(p.img)));

// ---------- canvases ----------
const out = document.getElementById('out');
out.width = W; out.height = H;
const scene = document.createElement('canvas'); scene.width = W; scene.height = H;
const ctx = scene.getContext('2d');
const glitch = createGlitch(out);

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const fract = (x) => x - Math.floor(x);
const rnd = (n) => fract(Math.sin(n * 12.9898 + 78.233) * 43758.5453);
const inQuad = (k) => k * k;
const outExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
const outCubic = (k) => 1 - Math.pow(1 - k, 3);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const beatT = (k) => DROP + k * B;                 // time of beat k (0 = drop)
const env = (dt, tau) => (dt < 0 ? 0 : Math.exp(-dt / tau));
const lastOnset = (list, t) => { let r = -1e9; for (const x of list) { if (x <= t) r = x; else break; } return r; };
const frameOf = (t) => Math.min(A.low.length - 1, Math.max(0, Math.round(t * FPS)));

// ---------- drawing helpers ----------
function mono(size, weight = 400) { ctx.font = `${weight} ${size}px "JetBrains Mono"`; }
function anton(size) { ctx.font = `${size}px Anton`; }
function kana(size) { ctx.font = `900 ${size}px "Noto Sans JP"`; }

function coverDraw(img, cx, cy, scale, alpha = 1) {
  const s = Math.max(W / img.width, H / img.height) * scale;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, cx - img.width * s / 2, cy - img.height * s / 2, img.width * s, img.height * s);
  ctx.globalAlpha = 1;
}

// draw an image in horizontal strips, each shifted by offs(i)
function stripDraw(src, x, y, w, h, strips, offs) {
  const sh = src.height / strips, dh = h / strips;
  for (let i = 0; i < strips; i++) {
    ctx.drawImage(src, 0, i * sh, src.width, sh, x + offs(i), y + i * dh, w, dh + 0.5);
  }
}

// pre-render a text block to its own canvas (for slicing)
function textBlock(lines, font, size, color, lineH = 0.92, pad = 20) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = font;
  const widths = lines.map(l => g.measureText(l).width);
  c.width = Math.ceil(Math.max(...widths) + pad * 2);
  c.height = Math.ceil(size * lineH * lines.length + pad * 2);
  g.font = font; g.fillStyle = color; g.textBaseline = 'top';
  lines.forEach((l, i) => g.fillText(l, pad + (Math.max(...widths) - widths[i]) / 2, pad + i * size * lineH));
  return c;
}

// ---------- HUD (persistent frame, the one constant across cuts) ----------
function hud(t, sceneCode, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha * 0.85;
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  const m = 44, L = 34;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
  }
  mono(17, 800); ctx.fillStyle = INK; ctx.textBaseline = 'middle';
  const k = Math.floor((t - DROP) / B);
  const blink = fract((t - DROP) / B) < 0.5;
  ctx.fillStyle = ACC; if (blink) { ctx.beginPath(); ctx.arc(m + 18, m + 52, 7, 0, 7); ctx.fill(); }
  ctx.fillStyle = INK; ctx.fillText('REC', m + 34, m + 53);
  const fr = Math.floor(t * FPS);
  const tc = `00:00:${String(Math.floor(t)).padStart(2, '0')}:${String(fr % FPS).padStart(2, '0')}`;
  ctx.textAlign = 'right'; ctx.fillText(tc, W - m - 4, m + 53);
  mono(14, 400); ctx.globalAlpha = alpha * 0.6;
  ctx.fillText(`${A.start + t >= 0 ? 'BPM 107.7' : ''}  //  BEAT ${String(Math.max(k, -9) + 9).padStart(2, '0')}`, W - m - 4, m + 78);
  ctx.textAlign = 'left';
  ctx.fillText(C.hudTag || 'PORTFOLIO.EXE', m + 4, H - m - 54);
  ctx.globalAlpha = alpha * 0.85; mono(17, 800);
  ctx.fillText(sceneCode, m + 4, H - m - 30);
  ctx.textAlign = 'right'; kana(18); ctx.globalAlpha = alpha * 0.7;
  ctx.fillText(C.kanaTag || 'ポートフォリオ', W - m - 4, H - m - 30);
  // progress rail
  ctx.globalAlpha = alpha * 0.35; ctx.fillStyle = INK;
  ctx.fillRect(W / 2 - 160, H - m - 31, 320, 2);
  ctx.globalAlpha = alpha * 0.9; ctx.fillStyle = ACC;
  ctx.fillRect(W / 2 - 160, H - m - 33, 320 * clamp(t / A.duration), 6);
  ctx.restore();
}

function reticle(x, y, r, t, alpha = 1, label) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = ACC; ctx.lineWidth = 2;
  const g = r * 0.35;
  ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.moveTo(x + sx * r, y + sy * (r - g)); ctx.lineTo(x + sx * r, y + sy * r); ctx.lineTo(x + sx * (r - g), y + sy * r);
  }
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); ctx.stroke();
  if (label) { mono(14, 800); ctx.fillStyle = ACC; ctx.textBaseline = 'bottom'; ctx.fillText(label, x - r, y - r - 8); }
  ctx.restore();
}

// ---------- S0: the eye ----------
// eye geometry lives in image-normalised coords (content.json): pupil centre, iris radius, eye half-width, lid heights
function eyeAperture(t) {
  // twitch open on the 4 breakdown beats, step wider on the next 3, snap wide on the last
  const steps = [0.0, 0.07, 0.13, 0.2, 0.3, 0.42, 0.55];
  let a = 0;
  for (let i = 0; i < steps.length; i++) {
    const tb = beatT(-8 + i) + 0.02;
    if (t >= tb) {
      const prev = i ? steps[i - 1] : 0;
      a = lerp(prev, steps[i], outExpo(seg(t, tb, tb + 0.22)));
      // flicker back half-way for a frame or two (the lid "twitch")
      if (i < 4 && t - tb < 0.08 && t - tb > 0.033) a = lerp(prev, steps[i], 0.35);
    }
  }
  const snap = beatT(-1);
  if (t >= snap) {
    const k = seg(t, snap, snap + 0.18);
    a = lerp(steps[steps.length - 1], 1, outExpo(k)) + 0.06 * Math.sin(k * Math.PI) ;
  }
  return a;
}

function sceneEye(t, fx, opts = {}) {
  const E = C.eye, img = IMG.eye;
  const base = Math.max(W / img.width, H / img.height) * (E.fit || 1);
  // camera: slow push, then exponential dive into the pupil from the last beat
  const snap = beatT(-1);
  let zoom = lerp(1.0, 1.55, inQuad(seg(t, 0, snap)));
  const dive = seg(t, snap + 0.06, DROP);
  zoom *= Math.pow(80, inQuad(dive) * 1.0);
  if (opts.zoom) zoom = opts.zoom;
  const s = base * zoom;
  const px = E.pupil[0] * img.width, py = E.pupil[1] * img.height;
  // pupil drifts from its framed position to dead centre as we dive
  const frameX = W / 2 + (E.frameOffset?.[0] || 0) * (1 - dive), frameY = H / 2 + (E.frameOffset?.[1] || 0) * (1 - dive);
  const ox = frameX - px * s, oy = frameY - py * s;
  const toScreen = (nx, ny) => [ox + nx * img.width * s, oy + ny * img.height * s];

  const a = opts.aperture ?? eyeAperture(t);
  const [cx, cy] = toScreen(E.pupil[0], E.pupil[1]);
  const hw = E.halfWidth * img.width * s;
  const up = E.lidUp * img.height * s * a, dn = E.lidDown * img.height * s * a;
  const tilt = (E.tilt || 0) * hw;
  const lx = cx - hw, rx = cx + hw;

  // the world outside the lids: crushed, dark
  ctx.save();
  ctx.globalAlpha = E.outsideAlpha ?? 0.18;
  ctx.drawImage(img, ox, oy, img.width * s, img.height * s);
  ctx.restore();

  // almond aperture
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(lx, cy + tilt);
  ctx.bezierCurveTo(lx + hw * 0.45, cy - up * 1.33, rx - hw * 0.5, cy - up * 1.33, rx, cy - tilt);
  ctx.bezierCurveTo(rx - hw * 0.45, cy + dn * 1.33, lx + hw * 0.5, cy + dn * 1.33, lx, cy + tilt);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, ox, oy, img.width * s, img.height * s);
  // pupil dilation on the snap
  const dil = outCubic(seg(t, snap, snap + 0.35));
  if (dil > 0) {
    const r = E.pupilR * img.width * s * lerp(1, E.dilate || 1.9, dil);
    const g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
    g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  }
  ctx.restore();

  // lash lines: heavy upper, thin lower
  if (a > 0.004 && !opts.noLids) {
    ctx.save(); ctx.strokeStyle = BG; ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(6, hw * 0.07);
    ctx.beginPath(); ctx.moveTo(lx, cy + tilt);
    ctx.bezierCurveTo(lx + hw * 0.45, cy - up * 1.33, rx - hw * 0.5, cy - up * 1.33, rx, cy - tilt); ctx.stroke();
    ctx.lineWidth = Math.max(3, hw * 0.025);
    ctx.beginPath(); ctx.moveTo(lx, cy + tilt);
    ctx.bezierCurveTo(lx + hw * 0.5, cy + dn * 1.33, rx - hw * 0.45, cy + dn * 1.33, rx, cy - tilt); ctx.stroke();
    ctx.restore();
  }
  // closed / nearly closed: a hot slit of light
  if (a < 0.08 && t > 0.1) {
    ctx.save(); ctx.globalAlpha = (1 - a / 0.08) * 0.9;
    const g = ctx.createLinearGradient(lx, 0, rx, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, INK); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(lx, cy - 1.5, rx - lx, 3);
    ctx.restore();
  }

  if (opts.noHud) return { cx, cy };

  // reticle locks on the pupil, re-locking on each beat
  const kb = Math.floor((t - DROP) / B);
  const lock = outExpo(seg(t, beatT(kb), beatT(kb) + 0.25));
  const jit = (1 - lock) * 60;
  if (t > beatT(-7) && t < snap + 0.2) {
    reticle(cx + (rnd(kb) - 0.5) * jit, cy + (rnd(kb + 9) - 0.5) * jit, lerp(150, 90, lock) * Math.min(zoom, 1.8),
      t, 0.9, `TARGET_LOCK ${String(Math.round(a * 100)).padStart(3, '0')}%`);
  }

  // boot terminal
  const lines = C.boot || ['> SIGNAL_LOST', '> REBOOTING VISUAL CORTEX', '> LOADING PORTFOLIO.EXE', '> EYE.OPEN()'];
  ctx.save(); mono(22, 800); ctx.fillStyle = INK; ctx.textBaseline = 'top';
  lines.forEach((l, i) => {
    const t0 = 0.15 + i * 0.95;
    const n = Math.floor(clamp((t - t0) / 0.35) * l.length);
    if (n <= 0) return;
    const cursor = (n < l.length || fract(t * 3) < 0.5) ? '█' : '';
    ctx.globalAlpha = i === lines.length - 1 ? 1 : 0.75;
    ctx.fillStyle = i === lines.length - 1 ? ACC : INK;
    ctx.fillText(l.slice(0, n) + (i === lines.length - 1 || n < l.length ? cursor : ''), 92, 150 + i * 34);
  });
  kana(54); ctx.globalAlpha = 0.9 * seg(t, beatT(-6), beatT(-6) + 0.05); ctx.fillStyle = INK;
  ctx.textAlign = 'right'; ctx.fillText('視覚 // 起動', W - 92, 150);
  ctx.restore();

  // fx
  const kd = (t - DROP) / B, ph = fract(kd);
  const tick = env(ph * B, 0.07) * (t < snap ? 1 : 0);
  fx.seed = Math.floor(kd) + 0.5;
  fx.slice = 0.25 * tick + 0.6 * inQuad(dive);
  fx.chroma = 6 + 30 * tick + 70 * dive;
  fx.noise = lerp(0.55, 0.12, seg(t, 0, 1.2)) + 0.18 * tick + 0.15 * seg(t, 2.2, snap);
  fx.block = 0.3 * tick + 0.4 * dive;
  fx.zoomBlur = 0.55 * inQuad(dive);
  fx.zoomCx = cx / W; fx.zoomCy = 1 - cy / H;
  fx.bright = outCubic(seg(t, 0.02, 0.3));
  fx.collapseY = lerp(0.004, 1, outExpo(seg(t, 0.05, 0.4)));
  fx.flash = seg(t, DROP - 0.075, DROP - 0.001);
  fx.invert = t > DROP - 0.11 && t < DROP - 0.07 ? 1 : 0;
  return { cx, cy };
}

// ---------- S1: inside the eye — name slam ----------
let NAME_BLOCK = null, NAME_BLOCK_INV = null;
function sceneName(t, fx) {
  const tl = t - DROP, kb = Math.floor(tl / B), ph = fract(tl / B);
  const kick = env(t - lastOnset(A.kicks, t), 0.09);
  const snare = env(t - lastOnset(A.snares, t), 0.06);
  // iris tunnel: rings rushing outward + rotating striations
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1 + 0.04 * kick, 1 + 0.04 * kick);
  ctx.strokeStyle = ACC;
  for (let i = 0; i < 18; i++) {
    const z = fract(i / 18 + tl * 0.55);
    const r = 30 * Math.pow(70, z);
    ctx.globalAlpha = 0.85 * (1 - z) * clamp(z * 6);
    ctx.lineWidth = 1 + z * 10;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 0.35; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  for (let i = 0; i < 96; i++) {
    const a = i / 96 * Math.PI * 2 + tl * 0.25;
    const r0 = 140 + rnd(i) * 120, r1 = r0 + 200 + rnd(i + 3) * 700;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
  }
  ctx.restore();

  // the name, sliced and slammed
  if (!NAME_BLOCK) {
    NAME_BLOCK = textBlock(C.nameLines, '330px Anton', 330, INK, 0.9);
    NAME_BLOCK_INV = textBlock(C.nameLines, '330px Anton', 330, ACC, 0.9);
  }
  const nb = (snare > 0.5 && kb % 2 === 1) ? NAME_BLOCK_INV : NAME_BLOCK;
  const bw = Math.min(W * 0.86, nb.width), bh = nb.height * bw / nb.width;
  const land = env(ph * B, 0.11);
  const strips = 9;
  const scale = 1 + 0.03 * kick + (kb === 0 ? 0.25 * env(tl, 0.12) : 0);
  ctx.save(); ctx.translate(W / 2, H / 2 - 20); ctx.scale(scale, scale);
  stripDraw(nb, -bw / 2, -bh / 2, bw, bh, strips, i => {
    const r = rnd(i * 7 + kb * 31) - 0.5;
    return r * 900 * land * (kb === 0 ? 1.6 : 0.7) + (rnd(i + Math.floor(tl * 30)) - 0.5) * 14 * snare;
  });
  ctx.restore();

  // katakana under-title + role tag
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  kana(40); ctx.fillStyle = INK; ctx.globalAlpha = seg(tl, B * 0.5, B * 0.5 + 0.05);
  ctx.fillText(C.nameKana || '', W / 2, H / 2 + bh / 2 - 6);
  ctx.restore();
  if (tl > B * 2) {
    const tw = 26; mono(tw, 800);
    const label = `[ ${C.role} ]`;
    const n = Math.floor(clamp((tl - B * 2) / 0.3) * label.length);
    ctx.save(); ctx.fillStyle = ACC; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(label.slice(0, n), W / 2, H / 2 + bh / 2 + 52); ctx.restore();
  }

  fx.seed = kb * 3.1 + Math.floor(tl * 15) * 0.01;
  fx.slice = 0.55 * env(ph * B, 0.08) + 0.25 * snare;
  fx.block = 0.5 * env(tl, 0.15) + 0.2 * snare;
  fx.chroma = 10 + 50 * kick + 40 * env(tl, 0.2);
  fx.noise = 0.06 + 0.1 * snare;
  fx.zoomBlur = 0.35 * env(tl, 0.18) + 0.08 * kick;
  fx.invert = tl < 0.033 ? 1 : 0;
}

// ---------- S2: hero ----------
function sceneHero(t, fx) {
  const t0 = beatT(4), tl = t - t0, kb = Math.floor(tl / B), ph = fract(tl / B);
  const kick = env(t - lastOnset(A.kicks, t), 0.09);
  const snare = env(t - lastOnset(A.snares, t), 0.06);
  const img = IMG.hero;
  const push = lerp(1.0, 1.06, seg(tl, 0, 4 * B));
  const fw = W * 0.8, fh = fw * img.height / img.width;
  const x = W / 2 - fw / 2, y = H / 2 - fh / 2 - 10;
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(push * (1 + 0.015 * kick), push * (1 + 0.015 * kick)); ctx.translate(-W / 2, -H / 2);
  // datamosh block shuffle on each beat
  const mosh = env(ph * B, 0.1);
  ctx.drawImage(img, x, y, fw, fh);
  if (mosh > 0.05) {
    for (let i = 0; i < 14; i++) {
      const bx = rnd(i + kb * 17) * fw, by = rnd(i * 3 + kb * 11) * fh, bw = 60 + rnd(i * 5) * 260, bhh = 20 + rnd(i * 9) * 120;
      ctx.drawImage(img, bx * img.width / fw, by * img.height / fh, bw * img.width / fw, bhh * img.height / fh,
        x + bx + (rnd(i + 99 + kb) - 0.5) * 240 * mosh, y + by, bw, bhh);
    }
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x - 10, y - 10, fw + 20, fh + 20);
  mono(16, 800); ctx.fillStyle = BG; ctx.fillRect(x - 10, y - 40, 260, 30);
  ctx.fillStyle = INK; ctx.fillRect(x - 10, y - 40, 260, 30);
  ctx.fillStyle = BG; ctx.textBaseline = 'middle'; ctx.fillText(C.hero.label || 'INDEX // HOME', x + 2, y - 25);
  ctx.restore();

  // reticle re-locks on beat
  const pts = C.hero.points || [[0.3, 0.4], [0.7, 0.35], [0.55, 0.7], [0.25, 0.65]];
  const p = pts[kb % pts.length], lock = outExpo(seg(ph, 0, 0.4));
  reticle(x + p[0] * fw, y + p[1] * fh, lerp(160, 70, lock), t, 0.95, `SCAN_${String(kb + 1).padStart(2, '0')}`);

  // role, huge, on bar's second half
  if (kb >= 2) {
    const lines = C.roleLines || [C.role];
    const blk = textBlock(lines.map(s => s.toUpperCase()), '170px Anton', 170, ACC, 0.95);
    const bw = Math.min(W * 0.9, blk.width), bh = blk.height * bw / blk.width;
    const l2 = env(fract(tl / B) * B, 0.1);
    ctx.save(); ctx.fillStyle = BG; ctx.globalAlpha = 0.8; ctx.fillRect(0, H / 2 - bh / 2, W, bh); ctx.restore();
    stripDraw(blk, W / 2 - bw / 2, H / 2 - bh / 2, bw, bh, 6, i => (rnd(i + kb * 5) - 0.5) * 500 * l2);
  }
  fx.seed = 40 + kb + Math.floor(tl * 15) * 0.013;
  fx.slice = 0.35 * env(ph * B, 0.07) + 0.15 * snare;
  fx.block = 0.35 * mosh;
  fx.chroma = 8 + 40 * kick;
  fx.noise = 0.05 + 0.08 * snare;
}

// ---------- S3: projects ----------
function sceneProjects(t, fx) {
  const t0 = beatT(8), tl = t - t0;
  const N = C.projects.length, per = 12 / N;           // beats per project
  const idx = Math.min(N - 1, Math.floor(tl / B / per));
  const pt0 = t0 + idx * per * B, pl = t - pt0;
  const kb = Math.floor(tl / B), ph = fract(tl / B);
  const P = C.projects[idx], img = IMG.projects[idx];
  const kick = env(t - lastOnset(A.kicks, t), 0.09);
  const snare = env(t - lastOnset(A.snares, t), 0.06);
  const entry = env(pl, 0.12);
  const push = lerp(1.0, 1.08, seg(pl, 0, per * B)) * (1 + 0.02 * kick) + 0.12 * entry;
  coverDraw(img, W / 2 + (rnd(idx) - 0.5) * 60 * entry, H / 2, push);
  // darken the bottom for the title
  const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
  g.addColorStop(0, 'rgba(5,5,5,0)'); g.addColorStop(1, 'rgba(5,5,5,0.88)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // title slices in from the side on the project's first beat
  const blk = textBlock([P.title.toUpperCase()], '200px Anton', 200, INK, 1.0, 10);
  const bw = Math.min(W * 0.84, blk.width), bh = blk.height * bw / blk.width;
  stripDraw(blk, 92, H - 150 - bh, bw, bh, 5, i => (rnd(i + idx * 13) - 0.5) * 1400 * entry + (rnd(i + Math.floor(t * 30)) - 0.5) * 18 * snare);
  ctx.save(); mono(24, 800); ctx.textBaseline = 'top';
  ctx.fillStyle = ACC; ctx.fillText(`[${String(idx + 1).padStart(2, '0')}/${String(N).padStart(2, '0')}]`, 98, 140);
  ctx.fillStyle = INK; ctx.globalAlpha = 0.8;
  ctx.fillText([P.tag, P.year].filter(Boolean).join('  //  ').toUpperCase(), 98, H - 140);
  ctx.restore();
  // accent bar sweeps on every beat
  ctx.fillStyle = ACC; ctx.fillRect(0, H - 120, W * outExpo(seg(ph, 0, 0.5)), 4);

  fx.seed = 80 + idx * 7 + kb + Math.floor(tl * 15) * 0.017;
  fx.slice = 0.6 * entry + 0.2 * env(ph * B, 0.06) + 0.12 * snare;
  fx.block = 0.55 * entry;
  fx.chroma = 8 + 45 * kick + 60 * entry;
  fx.noise = 0.04 + 0.1 * snare;
  fx.invert = pl < 1 / FPS ? 1 : 0;
  fx.poster = 0.5 * entry;
}

// ---------- S4: stack strobe (one word per eighth) ----------
function sceneStack(t, fx) {
  const t0 = beatT(20), tl = t - t0;
  const e8 = B / 2, i = Math.min(7, Math.floor(tl / e8)), pl = tl - i * e8;
  const words = C.stack;
  const word = words[i % words.length].toUpperCase();
  const inv = i % 2 === 1;
  ctx.fillStyle = inv ? ACC : BG; ctx.fillRect(0, 0, W, H);
  // ghost of the last project behind on the dark beats
  if (!inv) coverDraw(IMG.projects[(i / 2 | 0) % IMG.projects.length], W / 2, H / 2, 1.1, 0.22);
  const blk = textBlock([word], '300px Anton', 300, inv ? BG : INK, 1.0, 10);
  const bw = Math.min(W * 0.9, blk.width), bh = blk.height * bw / blk.width;
  const land = env(pl, 0.06);
  ctx.save(); ctx.translate(W / 2, H / 2); const sc = 1 + 0.1 * land; ctx.scale(sc, sc);
  stripDraw(blk, -bw / 2, -bh / 2, bw, bh, 4, k => (rnd(k + i * 3) - 0.5) * 300 * land);
  ctx.restore();
  ctx.save(); mono(22, 800); ctx.fillStyle = inv ? BG : ACC; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(`${String(i + 1).padStart(2, '0')} / 08  —  ${C.stackLabel || 'CAPABILITIES'}`, W / 2, H / 2 + bh / 2 + 30);
  ctx.restore();
  fx.seed = 200 + i;
  fx.slice = 0.4 * land; fx.block = 0.2 * land; fx.chroma = 14 + 40 * land; fx.noise = 0.05;
}

// ---------- S5: outro — the eye closes, CRT off ----------
function sceneOutro(t, fx) {
  const t0 = beatT(24), tl = t - t0;
  const close = outCubic(seg(t, t0 + 0.05, beatT(25) + B * 0.5));
  const a = 1 - close;
  sceneEye(t, fx, { aperture: a, zoom: 1.35, noHud: true });
  const snare = env(t - lastOnset(A.snares, t), 0.06);
  if (t >= beatT(25)) {
    const blk = textBlock(C.nameLines.length > 1 ? [C.nameLines.join(' ')] : C.nameLines, '150px Anton', 150, INK, 1.0, 10);
    const bw = Math.min(W * 0.8, blk.width), bh = blk.height * bw / blk.width;
    const land = env(t - beatT(25), 0.1);
    stripDraw(blk, W / 2 - bw / 2, H / 2 - bh - 10, bw, bh, 6, i => (rnd(i + 400) - 0.5) * 700 * land);
    ctx.save(); mono(30, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = ACC;
    const url = C.url;
    const n = Math.floor(clamp((t - beatT(25) - 0.1) / 0.45) * url.length);
    ctx.fillText(url.slice(0, n) + (fract(t * 3) < 0.5 ? '█' : ' '), W / 2, H / 2 + 26);
    ctx.restore();
  }
  const kd = (t - DROP) / B, ph = fract(kd);
  fx.seed = 300 + Math.floor(kd);
  fx.slice = 0.3 * env(ph * B, 0.07) + 0.1 * snare;
  fx.block = 0.15 * env(ph * B, 0.07);
  fx.chroma = 8 + 30 * env(ph * B, 0.1);
  fx.noise = 0.06 + 0.25 * seg(t, beatT(27), beatT(27) + 0.15);
  fx.zoomBlur = 0; fx.flash = 0; fx.invert = 0;
  fx.bright = 1;
  // CRT off from beat 27: squash to a line, then to a dot, then gone
  const off = beatT(27);
  fx.collapseY = lerp(1, 0.003, outExpo(seg(t, off, off + 0.16)));
  fx.collapseX = lerp(1, 0.004, outExpo(seg(t, off + 0.16, off + 0.32)));
  fx.bright = 1 - seg(t, off + 0.32, A.duration - 0.02);
}

// ---------- frame ----------
const CODES = ['SEQ_00 // BOOT', 'SEQ_01 // IDENTITY', 'SEQ_02 // INDEX', 'SEQ_03 // WORK', 'SEQ_04 // STACK', 'SEQ_05 // EOF'];
export function seek(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  const fx = { t, scan: 1, curve: 0.07, chroma: 6, bright: 1, collapseX: 1, collapseY: 1 };
  const k = (t - DROP) / B;
  let code;
  if (t < DROP) { sceneEye(t, fx); code = CODES[0]; }
  else if (k < 4) { sceneName(t, fx); code = CODES[1]; }
  else if (k < 8) { sceneHero(t, fx); code = CODES[2]; }
  else if (k < 20) { sceneProjects(t, fx); code = CODES[3]; }
  else if (k < 24) { sceneStack(t, fx); code = CODES[4]; }
  else { sceneOutro(t, fx); code = CODES[5]; }
  hud(t, code, t < 0.4 ? seg(t, 0.25, 0.4) : 1);
  glitch(scene, fx);
}

window.seek = seek;
window.DURATION = A.duration;
window.FPS = FPS;
window.ready = true;
