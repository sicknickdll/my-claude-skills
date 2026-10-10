# nicolo-lombardi.com

Nicolò Lombardi's portfolio, rebuilt as a plain static website so it can be hosted anywhere, with no
dependency on ChatGPT Sites (or any other builder).

```
portfolio/
├── content.mjs     ← all text + the list of projects (the only file you normally edit)
├── build.mjs       ← turns content.mjs into the HTML pages in site/   (node build.mjs)
├── site/           ← the finished website — this folder is what gets hosted
│   ├── index.html, work/<project>/index.html, 404.html, sitemap.xml, robots.txt
│   ├── assets/     css, js, self-hosted fonts
│   └── media/      compressed images and videos (45 MB, down from 101 MB of originals)
└── tools/optimize-media.sh   how site/media was produced from the Drive originals
```

## Before it goes live: what's still missing

Run `node build.mjs`. It prints everything that's still missing. Until every text item is filled
in, the site tells search engines not to index it (`noindex`), so a half-finished version never
ends up on Google.

**Text** (shown on the site as dashed amber "Add … in content.mjs" boxes):

- tagline under your name, a short bio, and your Instagram / Vimeo / LinkedIn links
  (delete any you don't use)
- for each project: year, your role, a one- or two-sentence description
- confirm the spelling of your name (Nicolò with the accent?) and that
  `hello.nicolombardi@gmail.com` is the address you want public

**Media** that was too large to copy over automatically (>6 MB each). Compress it if you like, then
drop it into the folder shown. It appears on the site at the next build, with no code changes:

| Original in Drive | Put it here |
| --- | --- |
| `head.mp4` (home page background video) | `site/media/home/head.mp4` |
| `UNCOMMONSENSE/260228_UNCOMMON_GIVEAWAY_V2_low.mp4` | `site/media/uncommonsense/giveaway.mp4` |
| `UNCOMMONSENSE/260603_UNCOMMON_PHOTOBOOTH_V1_EXPORT_low.mp4` | `site/media/uncommonsense/photobooth.mp4` |
| `VP/vp_video.mp4` | `site/media/wpp-virtual-production/film.mp4` |

Optional, not wired in yet: the Hogarth DP reel in the Drive root (it could become its own
project), `UNCOMMONSENSE/image(130).png` and `WICHITA/KTB/KTB_header.png`.

## Editing the site

1. Edit `content.mjs` (text, project order, which images and videos appear on each project page).
2. Run `node build.mjs` (needs [Node.js](https://nodejs.org) 18 or newer; nothing else to install).
3. Preview: `npx serve site` (or `python3 -m http.server -d site`) and open the address it prints.

When the site is connected to GitHub (below), pushing a change publishes it automatically.

## Hosting (recommended: Cloudflare Pages, free)

Why Cloudflare Pages: free, no bandwidth bill for a video-heavy site, automatic HTTPS, and it
deploys straight from GitHub. Every file here is under its 25 MiB per-file limit.

### 1. Create the site on Cloudflare

1. Sign up at <https://dash.cloudflare.com> (free plan).
2. **Workers & Pages → Create → Pages → Connect to Git**, then pick this repository and branch.
3. Build settings:
   - Framework preset: **None**
   - Root directory: **`portfolio`**
   - Build command: **`node build.mjs`**
   - Build output directory: **`site`**
4. Deploy. You get a preview address like `https://<name>.pages.dev`. Check everything there first.

No GitHub? Use **Create → Pages → Upload assets** instead and drag in the `site` folder.

### 2. Move your domain (nicolo-lombardi.com)

ChatGPT Sites doesn't sell domains, so you already own `nicolo-lombardi.com` at a registrar
(GoDaddy, Namecheap, Google/Squarespace, IONOS, …) and pointed it at ChatGPT with DNS records.
Do these in order to keep downtime to a few minutes:

1. **Cloudflare → Add a domain** → `nicolo-lombardi.com` → Free plan. Cloudflare copies your
   existing DNS records. In that list, **delete the records you added for ChatGPT Sites**, but
   **keep any MX / TXT records** (email, Google verification, etc.).
2. Cloudflare shows two nameservers (e.g. `xxx.ns.cloudflare.com`). At your **registrar**, replace the
   current nameservers with those two. This is the only change at the registrar, and the domain stays
   registered there.
3. Wait for Cloudflare to email that the domain is active (usually under an hour, at most 24 h).
4. **Pages project → Custom domains → Set up a domain** → add `nicolo-lombardi.com`, then again for
   `www.nicolo-lombardi.com`. Cloudflare creates the records and the HTTPS certificate itself.
5. In **ChatGPT Sites**, open the site's settings and **remove the custom domain** so it's released
   there. Once the new site is confirmed live you can unpublish the old one.

(A root domain like `nicolo-lombardi.com` must use Cloudflare's nameservers to work with Pages.
That's why step 2 exists. If you'd rather keep DNS at your registrar, Netlify works too: same
`site` folder, and it gives you an A record and a CNAME to add instead.)

## Housekeeping

- The Google Drive folder these files came from is shared as **"Anyone with the link: Editor"**.
  Anyone with the link can delete or replace your originals, so consider switching it to **Viewer**.
