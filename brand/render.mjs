// Renders an episode page to MP4: node brand/render.mjs <scene.html> <out.mp4> <audio.wav> [seconds] [fps] [--frames 0,90,300 --png-dir dir]
// The page must define window.renderFrame(t) (pure function of time) and window.ready (Promise).
import { createRequire } from "module";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");

const [html, out, audio, secs = "30", fps = "30"] = process.argv.slice(2);
const fi = process.argv.indexOf("--frames");
const stills = fi > 0 ? process.argv[fi + 1].split(",").map(Number) : null;
const pngDir = process.argv.includes("--png-dir") ? process.argv[process.argv.indexOf("--png-dir") + 1] : null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto("file://" + path.resolve(html));
await page.evaluate(() => window.ready);
const total = Math.round(Number(secs) * Number(fps));

if (stills) {
  fs.mkdirSync(pngDir, { recursive: true });
  for (const f of stills) {
    await page.evaluate((t) => window.renderFrame(t), f / Number(fps));
    await page.screenshot({ path: `${pngDir}/f${String(f).padStart(4, "0")}.png` });
  }
} else {
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", fps, "-i", "-",
    "-i", audio, "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.renderFrame(t), f / Number(fps));
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 90 === 0) process.stdout.write(`frame ${f}/${total}\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
}
await browser.close();
