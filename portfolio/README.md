# nicolo-lombardi.com

Nicoló Lombardi's portfolio (film and visuals), rebuilt as a plain static website. There's
nothing to install and no build step: the files in this folder *are* the website, so it runs
on any static host (GitHub Pages, Cloudflare Pages, Netlify, or plain FTP hosting).

```
index.html          page shell: header, About panel, link-preview tags
style.css           all styling
js/data.js          ← ALL CONTENT: projects, texts, videos, and the order of Film / Visuals
js/app.js           routing (#home, #film, #visuals, #project/<id>) and the scroll pages
js/galleries.js     video carousel and image carousel on project pages
js/project-logos.js brand logos shown when hovering the left/right edges
assets/             images (.webp), videos (.webm + .mp4 fallback), icons, og-image.jpg
tools/              prepare-video.sh, which converts a new video into the formats above
CNAME, .nojekyll    GitHub Pages settings (custom domain, serve files as-is)
_headers            caching and security headers for Netlify / Cloudflare Pages
404.html, robots.txt, sitemap.xml
```

## Preview on your computer

Any static server works. With Node installed: `npx serve .`, then open http://localhost:3000.
(Opening `index.html` by double-click won't work, because browsers block JavaScript modules
loaded from `file://`.)

## Changing content

Everything lives in **`js/data.js`**. The comment at the top of that file explains each field.

- **Edit a text**: change `title`, `type`, or `description` of the project.
- **Reorder / hide projects**: edit `filmOrder` and `visualsOrder` at the bottom of the file.
- **Add a project**:
  1. Put a full-screen cover image in `assets/` (`.webp` or `.jpg`, ~2560 px wide).
  2. For each video run `tools/prepare-video.sh path/to/video.mov myproject-01` (needs
     `ffmpeg`). It creates the `.webm`, `.mp4`, poster, and thumbnail, and prints what to paste.
  3. Copy an existing project block in `projects`, give it a new `id`, fill in the fields,
     and add the `id` to `filmOrder` and/or `visualsOrder`.
  4. New projects show their brand name as text on the hover edges. A cropped logo can be
     added later in `js/project-logos.js`.
- **About text / contact**: edit the `<aside id="about">` section in `index.html`.

Keep every file under 24 MB so it fits all free hosts.

## Hosting (GitHub Pages + OVH domain)

GitHub Pages is free, includes HTTPS, and redeploys automatically on every push.

### 1. Publish the site

1. Put the contents of this folder at the root of a **public** GitHub repository (e.g.
   `nicolo-lombardi.com`).
2. Repository **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a
   branch**, branch `main`, folder `/ (root)`, then **Save**.
3. In the same page, under *Custom domain*, enter `nicolo-lombardi.com` and **Save**. The site
   is now also reachable at `https://<github-user>.github.io/<repo>/` while DNS is pending.

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
| Add | `www` | CNAME | `<github-user>.github.io.` |

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
