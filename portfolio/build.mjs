// Builds the static site in site/ from content.mjs. No dependencies: `node build.mjs`.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { site, clients, projects } from "./content.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "site");
const MEDIA = join(OUT, "media");
const YEAR = new Date().getFullYear();

const missingText = [];
const missingMedia = [];

// ---------- helpers ----------
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Placeholder for text that hasn't been written yet: visible on the page and reported by the build.
function text(value, where) {
  if (value && String(value).trim()) return esc(value);
  missingText.push(where);
  return `<span class="todo">Add ${esc(where)} in content.mjs</span>`;
}

function hasMedia(rel, where) {
  if (existsSync(join(MEDIA, rel))) return true;
  missingMedia.push(`site/media/${rel}${where ? `  (${where})` : ""}`);
  return false;
}

// Width/height straight from the file headers, so pages reserve the right space while loading.
function webpSize(file) {
  const b = readFileSync(file);
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (kind === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  throw new Error(`Unrecognised WebP: ${file}`);
}

function mp4Size(file) {
  const b = readFileSync(file);
  for (let i = b.indexOf("tkhd"); i !== -1; i = b.indexOf("tkhd", i + 4)) {
    const end = i - 4 + b.readUInt32BE(i - 4);
    const w = b.readUInt32BE(end - 8) / 65536;
    const h = b.readUInt32BE(end - 4) / 65536;
    if (w && h) return { w: Math.round(w), h: Math.round(h) };
  }
  return null;
}

// All "<base>-<width>.webp" variants of an image, smallest first.
function variants(base) {
  const dir = join(MEDIA, dirname(base));
  const name = base.split("/").pop();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((f) => f.match(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)\\.webp$`)))
    .filter(Boolean)
    .map((m) => ({ w: Number(m[1]), path: `${dirname(base)}/${m[0]}` }))
    .sort((a, b) => a.w - b.w);
}

function picture(base, alt, { root, sizes, cls = "", eager = false, style = "" }) {
  const v = variants(base);
  if (!v.length) {
    missingMedia.push(`site/media/${base}-<width>.webp`);
    return "";
  }
  const largest = v[v.length - 1];
  const { w, h } = webpSize(join(MEDIA, largest.path));
  const srcset = v.map((x) => `${root}media/${x.path} ${x.w}w`).join(", ");
  return `<img class="${cls}" src="${root}media/${v[0].path}" srcset="${srcset}" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${style ? ` style="${style}"` : ""}>`;
}

function video(item, { root, kind, where }) {
  if (!hasMedia(item.src, where)) return "";
  const size = mp4Size(join(MEDIA, item.src));
  const dims = size ? ` width="${size.w}" height="${size.h}"` : "";
  const poster = item.poster && existsSync(join(MEDIA, item.poster)) ? ` poster="${root}media/${item.poster}"` : "";
  const src = `<source src="${root}media/${item.src}" type="video/mp4">`;
  if (kind === "loop") {
    return `<figure class="loop"><video data-loop muted loop playsinline controls preload="none"${poster}${dims}>${src}</video><button class="sound" type="button" data-sound aria-pressed="false" aria-label="Sound on"><span aria-hidden="true">Sound</span></button></figure>`;
  }
  const caption = item.caption ? `<figcaption>${esc(item.caption)}</figcaption>` : "";
  return `<figure class="${kind}"><video controls playsinline preload="none"${poster}${dims}>${src}</video>${caption}</figure>`;
}

// ---------- page shell ----------

function layout({ root, path, title, description, body, bodyClass = "" }) {
  const fullTitle = title ? `${title} — ${site.name}` : site.name;
  const desc = description || site.description;
  const canonical = `${site.url}${path}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
${desc ? `<meta name="description" content="${esc(desc)}">\n` : ""}<!--robots--><link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(fullTitle)}">
${desc ? `<meta property="og:description" content="${esc(desc)}">\n` : ""}<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${site.url}/media/home/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b0b0a">
<link rel="icon" href="${root}favicon.ico" sizes="any">
<link rel="icon" href="${root}icon-512.png" type="image/png">
<link rel="apple-touch-icon" href="${root}apple-touch-icon.png">
<link rel="preload" href="${root}assets/fonts/inter-tight-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${root}assets/css/style.css">
<script src="${root}assets/js/main.js" defer></script>
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <a class="nav__brand" href="${root || "./"}" aria-label="${esc(site.name)} — home"><img src="${root}media/home/eye.webp" width="28" height="28" alt=""><span>${esc(site.name)}</span></a>
  <nav aria-label="Main">
    <a href="${root}#work">Work</a>
    <a href="${root}#about">About</a>
    <a href="${root}#contact">Contact</a>
  </nav>
</header>
<main id="main">
${body}
</main>
<footer class="footer wrap">
  <span>© ${YEAR} ${esc(site.name)}</span>
  <a href="#main">Back to top ↑</a>
</footer>
</body>
</html>
`;
}

// ---------- home ----------
function home() {
  const root = "";
  let heroVideo = "";
  if (site.hero.video && hasMedia(site.hero.video, "home page background video")) {
    const poster = variants(site.hero.image).at(-1);
    heroVideo = `<video class="hero__video" autoplay muted loop playsinline aria-hidden="true"${poster ? ` poster="${root}media/${poster.path}"` : ""}><source src="${root}media/${site.hero.video}" type="video/mp4"></video>`;
  }

  const cards = projects
    .map(
      (p, i) => `<li>
      <a class="card" href="work/${p.slug}/">
        <div class="card__media">${picture(p.cover.src, p.cover.alt, { root, sizes: "(min-width: 800px) 50vw, 100vw", style: `object-position:${p.cover.focus || "50% 50%"}` })}</div>
        <div class="card__meta"><span class="mono">${String(i + 1).padStart(2, "0")}</span><h3>${esc(p.title)}</h3><span class="mono card__client">${esc(p.client)}${p.year ? ` · ${esc(p.year)}` : ""}</span></div>
      </a>
    </li>`
    )
    .join("\n    ");

  const logos = clients
    .filter((c) => hasMedia(c.logo, `${c.name} logo`))
    .map((c) => {
      const { w, h } = webpSize(join(MEDIA, c.logo));
      // Wide wordmarks get less height and square marks more, so they carry similar visual weight.
      const height = Math.round(Math.min(48, Math.max(18, 30 * Math.sqrt(3 / (w / h)))));
      return `<li><img src="media/${c.logo}" width="${w}" height="${h}" style="height:${height}px" alt="${esc(c.name)}" loading="lazy" decoding="async"></li>`;
    })
    .join("\n      ");

  const bio = site.bio.map((p, i) => `<p>${text(p, i === 0 ? "your bio" : `bio paragraph ${i + 1}`)}</p>`).join("\n      ");
  const socials = site.socials
    .map((s) => (s.url ? `<li><a href="${esc(s.url)}" rel="me noopener" target="_blank">${esc(s.label)} ↗</a></li>` : `<li>${text("", `${s.label} link`)}</li>`))
    .join("\n        ");

  const body = `<section class="hero" aria-label="Intro">
  ${picture(site.hero.image, "", { root, sizes: "100vw", cls: "hero__image", eager: true })}
  ${heroVideo}
  <div class="hero__content wrap">
    <h1 class="hero__name">${esc(site.name)}</h1>
    <p class="hero__tagline mono">${text(site.tagline, "a tagline")}</p>
  </div>
  <a class="hero__cue mono" href="#work">Selected work ↓</a>
</section>

<section id="work" class="section wrap" aria-labelledby="work-title">
  <div class="section__head"><h2 id="work-title">Selected work</h2><span class="mono">(${String(projects.length).padStart(2, "0")})</span></div>
  <ol class="grid" role="list">
    ${cards}
  </ol>
</section>

<section class="section wrap" aria-labelledby="clients-title">
  <div class="section__head"><h2 id="clients-title">Selected clients</h2></div>
  <ul class="logos" role="list">
      ${logos}
  </ul>
</section>

<section id="about" class="section wrap about" aria-labelledby="about-title">
  <div class="section__head"><h2 id="about-title">About</h2></div>
  <div class="about__body">
    <img class="about__mark" src="media/home/eye.webp" width="256" height="256" alt="" loading="lazy">
    <div class="about__text">
      ${bio}
    </div>
  </div>
</section>

<section id="contact" class="section wrap contact" aria-labelledby="contact-title">
  <div class="section__head"><h2 id="contact-title">Contact</h2></div>
  <a class="contact__email" href="mailto:${esc(site.email)}">${esc(site.email)}</a>
  <ul class="contact__socials mono" role="list">
        ${socials}
  </ul>
</section>`;

  return layout({ root, path: "/", body, bodyClass: "page-home" });
}

// ---------- project page ----------
function block(b, p, root) {
  const where = `${p.title} page`;
  if (b.type === "film") {
    const v = video(b, { root, kind: "film", where });
    return v && `<div class="block block--film">${v}</div>`;
  }
  if (b.type === "loops") {
    const items = b.items.map((it) => video(it, { root, kind: "loop", where })).filter(Boolean);
    return items.length ? `<div class="block block--loops">${items.join("")}</div>` : "";
  }
  if (b.type === "verticals") {
    const items = b.items.map((it) => video(it, { root, kind: "vertical", where })).filter(Boolean);
    return items.length ? `<div class="block block--verticals">${items.join("")}</div>` : "";
  }
  if (b.type === "stills") {
    const sizes = { wide: "(min-width: 1000px) 50vw, 100vw", gate: "(min-width: 800px) 50vw, 100vw", portrait: "(min-width: 900px) 25vw, 50vw" }[b.layout];
    const items = b.items.map((it) => picture(it.src, it.alt, { root, sizes })).filter(Boolean);
    return items.length ? `<div class="block block--stills block--${b.layout}">${items.map((i) => `<figure>${i}</figure>`).join("")}</div>` : "";
  }
  throw new Error(`Unknown block type "${b.type}" in ${p.slug}`);
}

function projectPage(p, i) {
  const root = "../../";
  const next = projects[(i + 1) % projects.length];
  const blocks = p.blocks.map((b) => block(b, p, root)).filter(Boolean).join("\n");
  const credits = p.credits.length
    ? `<dl class="credits">${p.credits.map((c) => `<div><dt class="mono">${esc(c.role)}</dt><dd>${esc(c.name)}</dd></div>`).join("")}</dl>`
    : "";

  const body = `<article class="project">
  <header class="project__head wrap">
    <a class="back mono" href="${root}#work">← All work</a>
    <h1 class="project__title">${esc(p.title)}</h1>
    <dl class="project__meta">
      <div><dt class="mono">Client</dt><dd>${esc(p.client)}</dd></div>
      <div><dt class="mono">Year</dt><dd>${text(p.year, `the year for ${p.title}`)}</dd></div>
      <div><dt class="mono">Role</dt><dd>${text(p.role, `your role on ${p.title}`)}</dd></div>
    </dl>
  </header>
  <div class="project__cover wrap">${picture(p.cover.src, p.cover.alt, { root, sizes: "100vw", eager: true, style: `object-position:${p.cover.focus || "50% 50%"}` })}</div>
  <div class="project__summary wrap"><p>${text(p.summary, `a short description of ${p.title}`)}</p></div>
  <div class="project__blocks wrap">
${blocks}
  </div>
  ${credits ? `<div class="wrap">${credits}</div>` : ""}
  <nav class="next wrap" aria-label="Next project">
    <a href="../${next.slug}/">
      <span class="mono">Next project</span>
      <span class="next__title">${esc(next.title)} →</span>
    </a>
  </nav>
</article>`;

  return layout({ root, path: `/work/${p.slug}/`, title: p.title, description: p.summary, body, bodyClass: "page-project" });
}

function notFound() {
  const body = `<section class="notfound wrap"><h1>Not found</h1><p>That page doesn't exist. <a href="/">Back to the home page</a>.</p></section>`;
  return layout({ root: "/", path: "/404", title: "Not found", body });
}

// ---------- write ----------
const write = (rel, html) => {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};

// Render everything first: whether the site is still a draft (and kept out of search engines)
// is only known once every placeholder has been seen.
const pages = [
  ["index.html", home()],
  ...projects.map((p, i) => [`work/${p.slug}/index.html`, projectPage(p, i)]),
  ["404.html", notFound()],
];
const draft = missingText.length > 0;
const robots = draft ? '<meta name="robots" content="noindex">\n' : "";
for (const [rel, html] of pages) write(rel, html.replace("<!--robots-->", robots));

write("robots.txt", draft ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["/", ...projects.map((p) => `/work/${p.slug}/`)]
    .map((u) => `  <url><loc>${site.url}${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`
);

console.log(`Built ${projects.length + 2} pages into site/`);
if (draft) {
  console.log(`\nText still to write (${missingText.length}) — the site is marked noindex until these are filled:`);
  for (const m of missingText) console.log(`  - ${m}`);
}
if (missingMedia.length) {
  console.log(`\nMedia referenced in content.mjs but not found (skipped on the page):`);
  for (const m of missingMedia) console.log(`  - ${m}`);
}
