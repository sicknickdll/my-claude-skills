// Frame-exact screen captures of nicolo-lombardi.com for the reel.
//
// The page clock is virtualised: performance.now/Date.now/requestAnimationFrame
// follow a virtual time we advance by hand, every CSS animation/transition is
// paused and seeked to that time, and every <video> is paused and seeked too.
// So each captured frame is a pure function of the take's local time.
//
// usage: node record.js <outDir> [takeName ...]
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SITE = "https://nicolo-lombardi.com";
const FPS = 30;
const SIXTEENTH = 60 / 111 / 4; // seconds, 111 BPM
const DSF = 1.5; // 2880x1620 captures, so the compositor can push in without blur

// ---------------------------------------------------------------- virtual time
const INIT = `(() => {
  let vt = 0, rafId = 0, seed = 20261010;
  const rafQ = new Map();
  const dateBase = Date.now();
  performance.now = () => vt;
  Date.now = () => dateBase + vt;
  window.requestAnimationFrame = (cb) => { rafQ.set(++rafId, cb); return rafId; };
  window.cancelAnimationFrame = (id) => { rafQ.delete(id); };
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const born = new WeakMap();
  window.__vt = {
    animRate: 1,
    advanceTo(ms) {
      vt = ms;
      const q = [...rafQ.values()]; rafQ.clear();
      for (const cb of q) { try { cb(vt); } catch (e) { console.error(e); } }
      for (const a of document.getAnimations()) {
        if (!born.has(a)) born.set(a, vt);
        a.pause();
        a.currentTime = (vt - born.get(a)) * this.animRate;
      }
    },
  };
})();`;

const CLEAN_CSS = `
  html, html.snap-pages { scroll-snap-type: none !important; scroll-behavior: auto !important; }
  .video-track, .image-track, .video-thumbnails { scroll-snap-type: none !important; scroll-behavior: auto !important; }
  .skip { display: none !important; }
  #fake-cursor { position: fixed; z-index: 100000; width: 22px; height: 30px; pointer-events: none; left: 0; top: 0; }
`;
const ARROW = `<svg viewBox="0 0 22 30" width="22" height="30"><path d="M1 1 L1 23 L6.5 17.5 L10.5 27 L14 25.5 L10 16.5 L18 16.5 Z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const s16 = (n) => n * SIXTEENTH;

// Scroll schedule helper: list of [startSec, durSec, fromY, toY]
function scheduled(moves, t, initial) {
  let y = initial;
  for (const [t0, d, a, b] of moves) {
    if (t < t0) break;
    y = a + (b - a) * ease((t - t0) / d);
  }
  return y;
}

// ---------------------------------------------------------------- takes
// Each take: url, frames, setup(page), state(page, t) -> {scrollY?, trackX?, mouse?}, videos(t) -> [{i, time}]
const TAKES = {
  home_boot: {
    url: "/",
    seconds: 2.4,
    animRate: 1.75,
    videos: (t) => [{ sel: "#entrance-video", time: 1.0 + t }],
    mouse: () => [960, 1000],
  },
  home_scroll: {
    url: "/",
    seconds: 2.0,
    animRate: 1,
    pre: 3.0, // let the name reveal finish before t=0
    videos: (t) => [{ sel: "#entrance-video", time: 3.0 + t }],
    mouse: () => [1690, 560],
    scroll: (t, H) =>
      scheduled(
        [
          [s16(0), s16(1.2), 0, H],
          [s16(2), s16(1.2), H, 2 * H],
          [s16(4), s16(1.2), 2 * H, 3 * H],
          [s16(6), s16(1.2), 3 * H, 4 * H],
          [s16(8), s16(1.2), 4 * H, 5 * H],
          [s16(10), s16(1.2), 5 * H, 6 * H],
        ],
        t,
        0,
      ),
  },
  gallery_unc: {
    url: "/work/uncommonsense/",
    seconds: 4.0,
    videos: (t) =>
      [26.0, 8.0, 7.0, 16.5, 27.0, 15.0, 5.0].map((o, i) => ({ sel: `.video-slide[data-slide="${i}"] video`, time: o + t })),
    track: { slides: [0, 1, 2, 3, 4, 5, 6], every: 4, dur: 2.2 },
    mouse: () => [960, 1060],
  },
  gallery_ktb: {
    url: "/work/wichita/",
    seconds: 4.0,
    videos: (t) =>
      [165.0, 0.0, 1.0, 0.5, 0.8, 2.0, 1.5].map((o, i) => ({ sel: `.video-slide[data-slide="${i}"] video`, time: o + t })),
    track: { slides: [0, 6, 5, 2, 3], every: 4, dur: 2.2 },
    mouse: () => [960, 1060],
  },
  gallery_aguila: {
    url: "/work/elaguila/",
    seconds: 3.0,
    videos: (t) =>
      [5.0, 9.0, 2.0, 7.0].map((o, i) => ({ sel: `.video-slide[data-slide="${i}"] video`, time: o + t })),
    track: { slides: [1, 2, 3], every: 4, dur: 2.2 },
    mouse: () => [960, 1060],
  },
  gallery_melia: {
    url: "/work/melia/",
    seconds: 3.0,
    videos: (t) => [7.0, 5.0].map((o, i) => ({ sel: `.video-slide[data-slide="${i}"] video`, time: o + t })),
    track: { slides: [0, 1], every: 6, dur: 2.2 },
    mouse: () => [960, 1060],
  },
  page_malik: {
    url: "/work/malik-cross/",
    seconds: 3.0,
    videos: (t) => [{ sel: "video", time: 59.6 + t }],
    mouse: () => [960, 1060],
    scroll: (t) => scheduled([[1.4, 0.45, 0, 380]], t, 0),
  },
  page_lexus: {
    url: "/work/lexus/",
    seconds: 3.0,
    videos: (t) => [{ sel: "video", time: 24.6 + t }],
    mouse: () => [960, 1060],
  },
  page_wpp: {
    url: "/work/wppproduction/",
    seconds: 3.0,
    videos: (t) => [{ sel: "video", time: 27.5 + t }],
    mouse: () => [960, 1060],
  },
  about_click: {
    url: "/",
    seconds: 3.0,
    pre: 3.0,
    videos: (t) => [{ sel: "#entrance-video", time: 4.0 + t }],
    // cursor glides to "about" and clicks at t = 0.5 s
    mouse: (t) => {
      const k = ease(Math.min(1, t / 0.45));
      return [1180 + (1885 - 1180) * k, 620 + (27 - 620) * k];
    },
    clickAt: 0.5,
    clickSel: "#about-toggle",
    fakeCursor: true,
    aboutScroll: (t) => scheduled([[0.95, 0.01, 0, 99999]], t, 0),
  },
};

// ---------------------------------------------------------------- recorder
async function record(browser, name, take, outRoot) {
  const dir = path.join(outRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DSF });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`[${name}] pageerror`, e.message));
  await page.goto(SITE + take.url, { waitUntil: "load", timeout: 60000 });
  await page.addStyleTag({ content: CLEAN_CSS });
  await page.evaluate((r) => (window.__vt.animRate = r), take.animRate || 1);

  // Eager-load every image and fully buffer every video we will show.
  await page.evaluate(async () => {
    const imgs = [...document.images];
    imgs.forEach((im) => (im.loading = "eager"));
    await Promise.all(imgs.map((im) => (im.complete ? 0 : im.decode().catch(() => 0))));
    for (const v of document.querySelectorAll("video")) {
      v.removeAttribute("controls");
      v.muted = true;
      v.pause();
      if (v.preload !== "auto") {
        v.preload = "auto";
        v.load();
      }
    }
  });
  const sels = take.videos ? take.videos(0).map((v) => v.sel) : [];
  for (const sel of sels) {
    await page.waitForFunction(
      (s) => {
        const v = document.querySelector(s);
        return !v || v.readyState >= 3;
      },
      sel,
      { timeout: 90000, polling: 250 },
    );
  }
  if (take.fakeCursor) await page.evaluate((svg) => {
    const c = document.createElement("div");
    c.id = "fake-cursor"; c.innerHTML = svg; document.body.append(c);
  }, ARROW);

  const H = 1080;
  const pre = take.pre || 0;
  // Settle at virtual time "pre" (e.g. the name reveal has finished).
  await page.evaluate((ms) => window.__vt.advanceTo(ms), 0);
  if (pre) await page.evaluate((ms) => window.__vt.advanceTo(ms), pre * 1000);

  const frames = Math.round(take.seconds * FPS);
  let clicked = false;
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    if (take.mouse) {
      const [mx, my] = take.mouse(t);
      await page.mouse.move(mx, my);
      if (take.fakeCursor)
        await page.evaluate(([x, y]) => {
          const c = document.querySelector("#fake-cursor");
          c.style.transform = `translate(${x - 1}px, ${y - 1}px)`;
        }, [mx, my]);
    }
    if (take.clickAt !== undefined && !clicked && t >= take.clickAt) {
      clicked = true;
      await page.click(take.clickSel);
    }
    if (take.scroll) {
      const y = take.scroll(t, H);
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
    }
    if (take.aboutScroll) {
      const y = take.aboutScroll(t);
      await page.evaluate((yy) => {
        const a = document.querySelector("#about");
        if (!a.hidden) a.scrollTop = yy;
      }, y);
    }
    if (take.track) {
      const { slides, every, dur } = take.track;
      await page.evaluate(
        ({ t, slides, every, dur, sx }) => {
          const track = document.querySelector(".video-track");
          const all = [...track.querySelectorAll(".video-slide")];
          const target = (i) => all[i].offsetLeft - (track.clientWidth - all[i].clientWidth) / 2;
          const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
          let x = target(slides[0]);
          for (let k = 1; k < slides.length; k++) {
            const t0 = k * every * sx;
            if (t < t0) break;
            x = target(slides[k - 1]) + (target(slides[k]) - target(slides[k - 1])) * ease((t - t0) / (dur * sx));
          }
          track.scrollLeft = x;
        },
        { t, slides, every, dur, sx: SIXTEENTH },
      );
    }
    await page.evaluate((ms) => window.__vt.advanceTo(ms), (pre + t) * 1000);
    if (take.videos) {
      const vids = take.videos(t);
      await page.evaluate(async (vids) => {
        await Promise.all(
          vids.map(
            ({ sel, time }) =>
              new Promise((res) => {
                const v = document.querySelector(sel);
                if (!v || !v.duration) return res();
                v.pause();
                const target = time % Math.max(0.1, v.duration - 0.08);
                if (Math.abs(v.currentTime - target) < 0.004) return res();
                const done = () => {
                  v.removeEventListener("seeked", done);
                  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(() => res());
                  setTimeout(res, 120);
                };
                v.addEventListener("seeked", done);
                v.currentTime = target;
                setTimeout(res, 3000);
              }),
          ),
        );
        const b = document.querySelector(".home-pause");
        if (b) b.textContent = "pause";
      }, vids);
    }
    await page.screenshot({ path: path.join(dir, String(f).padStart(4, "0") + ".jpg"), type: "jpeg", quality: 92 });
  }
  await ctx.close();
  console.log(`[${name}] ${frames} frames -> ${dir}`);
}

(async () => {
  const outRoot = process.argv[2];
  const names = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(TAKES);
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--hide-scrollbars"] });
  for (const n of names) {
    const t0 = Date.now();
    await record(browser, n, TAKES[n], outRoot);
    console.log(`  took ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
