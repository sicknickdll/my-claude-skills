// Generates every page of the site from template.html + js/data.js:
//   index.html, film/index.html, visuals/index.html, work/<id>/index.html, sitemap.xml
// Each page gets its own title, description, preview image and structured data,
// with the content already in the HTML so Google can read it.
//
// Run after editing js/data.js or template.html:   node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { projects } from "../js/data.js";
import {
  esc,
  film,
  visuals,
  fullName,
  homeMarkup,
  listMarkup,
  projectMarkup,
} from "../js/views.js";

const SITE = "https://nicolo-lombardi.com";
const NAME = "Nicoló Lombardi";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const template = readFileSync(join(root, "template.html"), "utf8").replace(/^<!--.*?-->\n/, "");

const person = {
  "@type": "Person",
  "@id": `${SITE}/#person`,
  name: NAME,
  url: `${SITE}/`,
  image: `${SITE}/assets/og-image.jpg`,
  jobTitle: "AI Filmmaker, Creative Technologist and Art Director",
  email: "mailto:hello.nicolombardi@gmail.com",
  address: { "@type": "PostalAddress", addressLocality: "Madrid", addressCountry: "ES" },
  knowsAbout: [
    "AI filmmaking",
    "Art direction",
    "Generative AI video",
    "Virtual production",
    "VFX",
    "Motion design",
    "Sound design",
  ],
  sameAs: ["https://www.instagram.com/nickprods/", "https://www.linkedin.com/in/nicolo-lombardi/"],
};

// First sentences of a text, cut on a word boundary to fit a search snippet.
function summary(text, max = 158) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const sentence = cut.lastIndexOf(". ");
  return sentence > 80 ? cut.slice(0, sentence + 1) : cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

function head({ title, description, path, image, imageAlt, schema, preload }) {
  const url = SITE + path;
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": schema }, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/\n/g, "\n      ");
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${NAME}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE}${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    preload ? `<link rel="preload" as="image" href="${preload}" />` : "",
    `<script type="application/ld+json">\n      ${json}\n    </script>`,
  ]
    .filter(Boolean)
    .map((line) => "    " + line)
    .join("\n");
}

function write(path, headHTML, mainHTML) {
  const file = join(root, path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, template.replace("{{HEAD}}", headHTML).replace("{{MAIN}}", mainHTML));
}

const breadcrumbs = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({
    "@type": "ListItem",
    position: i + 1,
    name,
    item: SITE + path,
  })),
});
const itemList = (list) => ({
  "@type": "ItemList",
  itemListElement: list.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${SITE}/work/${p.id}/`,
    name: fullName(p),
  })),
});
const brands = [...new Set(projects.map((p) => p.brand))].slice(0, 5).join(", ");

// Landing page
write(
  "",
  head({
    title: `${NAME} — AI Filmmaker & Art Director in Madrid`,
    description: `AI filmmaker, creative technologist and art director based in Madrid. AI-native campaigns, TV commercials, VFX and virtual production for ${brands} and more.`,
    path: "/",
    image: "/assets/og-image.jpg",
    imageAlt: NAME,
    preload: "/assets/anime-eye-poster.webp",
    schema: [
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        url: `${SITE}/`,
        name: NAME,
        publisher: { "@id": person["@id"] },
      },
      person,
      itemList(film),
    ],
  }),
  homeMarkup(),
);

// Section pages
for (const [slug, label, heading, list, blurb] of [
  [
    "film",
    "Selected films",
    "Films by Nicoló Lombardi",
    film,
    "AI-generated TV commercials, fashion campaigns, music video VFX and educational animation",
  ],
  [
    "visuals",
    "Visual projects",
    "Visual projects by Nicoló Lombardi",
    visuals,
    "AI product shots, photoreal digital assets and virtual production environments",
  ],
]) {
  write(
    slug,
    head({
      title: `${slug[0].toUpperCase() + slug.slice(1)} — ${NAME}, AI Filmmaker`,
      description: `${blurb} by ${NAME}, AI filmmaker and art director in Madrid: ${list.map((p) => p.brand).join(", ")}.`,
      path: `/${slug}/`,
      image: `/assets/og/${list[0].id}.jpg`,
      imageAlt: fullName(list[0]),
      schema: [
        {
          "@type": "CollectionPage",
          url: `${SITE}/${slug}/`,
          name: heading,
          author: { "@id": person["@id"] },
          mainEntity: itemList(list),
        },
        breadcrumbs([
          [NAME, "/"],
          [heading, `/${slug}/`],
        ]),
        person,
      ],
    }),
    listMarkup(list, label, heading),
  );
}

// One page per project
for (const p of projects) {
  const path = `/work/${p.id}/`;
  const og = existsSync(join(root, "assets/og", `${p.id}.jpg`))
    ? `/assets/og/${p.id}.jpg`
    : "/assets/og-image.jpg";
  const section =
    visuals.includes(p) && !film.includes(p) ? ["Visuals", "/visuals/"] : ["Film", "/film/"];
  write(
    `work/${p.id}`,
    head({
      title: `${fullName(p)} (${p.type}) — ${NAME}`,
      description: summary(p.description),
      path,
      image: og,
      imageAlt: fullName(p),
      schema: [
        {
          "@type": "CreativeWork",
          "@id": `${SITE}${path}#work`,
          url: SITE + path,
          name: fullName(p),
          headline: `${fullName(p)} — ${p.type}`,
          genre: p.type,
          description: p.description.replace(/\s+/g, " ").trim(),
          image: [SITE + og, ...p.images.map((i) => SITE + i)],
          creator: { "@id": person["@id"] },
          about: { "@type": "Brand", name: p.brand },
          ...(p.externalVideo || p.youtube ? { sameAs: p.externalVideo || p.youtube } : {}),
        },
        breadcrumbs([[NAME, "/"], section, [fullName(p), path]]),
        person,
      ],
    }),
    projectMarkup(p, section[1] + `#p-${p.id}`),
  );
}

// Sitemap (with images, so covers and stills can show in Google Images)
const today = new Date().toISOString().slice(0, 10);
const pages = [
  ["/", ["/assets/og-image.jpg"]],
  ["/film/", film.map((p) => p.cover)],
  ["/visuals/", visuals.map((p) => p.cover)],
  ...projects.map((p) => [`/work/${p.id}/`, [p.cover, ...p.images]]),
];
writeFileSync(
  join(root, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages
  .map(
    ([path, imgs]) => `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${today}</lastmod>
${imgs.map((i) => `    <image:image><image:loc>${SITE}${i}</image:loc></image:image>`).join("\n")}
  </url>`,
  )
  .join("\n")}
</urlset>
`,
);
console.log(`Built ${pages.length} pages + sitemap.xml`);
