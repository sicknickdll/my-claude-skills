# nicolo-lombardi.com

Nicoló Lombardi's portfolio (film and visuals) as a plain static website: every page is a
ready-made HTML file, so it runs on any static host (GitHub Pages, Cloudflare Pages, Netlify,
or plain FTP hosting) and search engines can read every project.

```
template.html       page shell (header, About panel) used for every page
js/data.js          ← ALL CONTENT: projects, texts, videos, order of Film / Visuals
js/views.js         page markup, shared by the browser and the page generator
js/app.js           interactions: snap scrolling, logo hover, carousels, About panel
js/galleries.js     video and image carousels on project pages
js/project-logos.js brand logos shown when hovering the left/right edges
tools/build.mjs     generates the pages below + sitemap.xml   (npm run build)
tools/make-og-images.py  link-preview images in assets/og/
tools/prepare-video.sh   converts a new video into the needed formats
index.html, film/, visuals/, work/<id>/   GENERATED pages, don't edit by hand
assets/             images (.webp), videos (.webm + .mp4 fallback), icons, previews
CNAME, .nojekyll    GitHub Pages settings · _headers for Netlify / Cloudflare
404.html, robots.txt, sitemap.xml
```

Pages and addresses:

| Address | Page |
| --- | --- |
| `/` | landing video + film list |
| `/film/`, `/visuals/` | full-screen project lists |
| `/work/<id>/` | one page per project, e.g. `/work/lexus/` |

Old links from the previous site (`/#film`, `/#project/lexus`) redirect to the new addresses.

## Preview on your computer

With Node installed: `npx serve .`, then open http://localhost:3000.
(Double-clicking `index.html` won't work: browsers block JavaScript modules from `file://`.)

## Changing content

Everything lives in **`js/data.js`**. The comment at the top explains each field.
**After any change, run `node tools/build.mjs`** to regenerate the pages and sitemap, then
commit and push.

- **Edit a text**: change `title`, `type` or `description` of the project. The first ~155
  characters of `description` become the Google snippet, so lead with what and for whom.
- **Reorder / hide projects**: edit `filmOrder` and `visualsOrder` at the bottom of the file.
- **Add a project**:
  1. Put a full-screen cover image in `assets/` (`.webp` or `.jpg`, ~2560 px wide).
  2. For each video run `tools/prepare-video.sh path/to/video.mov myproject-01` (needs `ffmpeg`).
  3. Copy an existing project block in `projects`, give it a new `id` (it becomes the address
     `/work/<id>/`), fill in the fields, and add the `id` to `filmOrder` and/or `visualsOrder`.
  4. `python3 tools/make-og-images.py` (link-preview image), then `node tools/build.mjs`.
  5. New projects show their brand name as text on the hover edges. A cropped logo can be
     added in `js/project-logos.js`.
- **About text / contact**: edit `template.html`, then rebuild.

Keep every file under 24 MB so it fits all free hosts.

## SEO checklist (after the site is live)

1. **Google Search Console** (search.google.com/search-console): add a *Domain* property for
   `nicolo-lombardi.com`, verify it with the TXT record it gives you (OVH → DNS zone → add TXT),
   then under *Sitemaps* submit `https://nicolo-lombardi.com/sitemap.xml`.
2. In *URL inspection*, request indexing for `/` and each `/work/…` page.
3. Link the site from Instagram bio, LinkedIn (Contact info + Featured), Vimeo and YouTube
   profiles. Ask collaborators and press to link to the project pages.
4. Test link previews: paste a project address into LinkedIn's Post Inspector.

## Hosting (GitHub Pages + OVH domain)

GitHub Pages is free, includes HTTPS, and redeploys automatically on every push.

### 1. Publish the site

1. This repository must be **public** (free GitHub Pages).
2. Repository **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a
   branch**, branch `main`, folder `/ (root)`, then **Save**.
3. In the same page, under *Custom domain*, enter `nicolo-lombardi.com` and **Save**.

### 2. Point the domain (OVHcloud control panel)

**Web Cloud → Domain names → nicolo-lombardi.com → DNS zone**:

| Action | Subdomain | Type | Target |
| --- | --- | --- | --- |
| Delete | *(empty)* | A | `162.159.143.30` (old ChatGPT host) |
| Delete | *(empty)* | A | `172.66.3.26` (old ChatGPT host) |
| Delete | `www` | A | `213.186.33.5` (OVH "site en construction" page) |
| Add | *(empty)* | A | `185.199.108.153` |
| Add | *(empty)* | A | `185.199.109.153` |
| Add | *(empty)* | A | `185.199.110.153` |
| Add | *(empty)* | A | `185.199.111.153` |
| Add | `www` | CNAME | `sicknickdll.github.io.` |

Leave the **MX** and **TXT** records alone (they belong to OVH e-mail and SPF).

Optional IPv6 (add AAAA records on the empty subdomain): `2606:50c0:8000::153`,
`2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.

### 3. Turn on HTTPS

DNS changes take from a few minutes up to 24 h. Back in **Settings → Pages**, wait until the
domain check passes, then tick **Enforce HTTPS** (the certificate can take up to an hour to be
issued). `www.nicolo-lombardi.com` then redirects to `nicolo-lombardi.com` automatically.

Recommended: in your GitHub account **Settings → Pages → Add a domain** to *verify*
`nicolo-lombardi.com` (one TXT record at OVH). That stops anyone else from claiming the domain on
GitHub.

### 4. Finish

- Check `https://nicolo-lombardi.com` and `https://www.nicolo-lombardi.com` on desktop and phone.
- Remove the custom domain from the old ChatGPT site so nothing else claims it.

### Other hosts

Same folder, no changes needed:

- **Cloudflare Pages**: unlimited bandwidth, private repos OK. Using the bare domain requires
  moving the domain's nameservers from OVH to Cloudflare (Cloudflare copies the existing records).
- **Netlify**: drag-and-drop this folder at app.netlify.com/drop, then add the domain and point
  an `A` record to the IP Netlify shows.
