// Page markup, shared by the browser (js/app.js) and the page generator
// (tools/build.mjs), so the pre-built HTML Google reads is exactly what visitors see.
// Pure string functions: no DOM access here.
import { projects, filmOrder, visualsOrder, hero, heroPoster } from "./data.js";
import { videoGalleryMarkup, imageGalleryMarkup, videoSources } from "./galleries.js";
import { logoFilters } from "./project-logos.js";

export const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const byIds = (ids) => ids.map((id) => projects.find((p) => p.id === id)).filter(Boolean);
export const film = byIds(filmOrder);
export const visuals = byIds(visualsOrder);
export const projectURL = (p) => `/work/${p.id}/`;
export const fullName = (p) => (p.title === p.brand ? p.brand : `${p.brand} — ${p.title}`);

export function homeMarkup() {
  const name = "Nicoló Lombardi";
  const letters = [...name]
    .map(
      (letter, i) =>
        `<span class="name-letter" style="--letter:${i}" aria-hidden="true">${letter === " " ? "&nbsp;" : esc(letter)}</span>`,
    )
    .join("");
  return `<section class="home" aria-label="Portfolio introduction"><img class="poster" src="${heroPoster}" alt=""><video id="entrance-video" poster="${heroPoster}" autoplay loop muted playsinline preload="auto" aria-hidden="true">${videoSources(hero)}</video><a class="home-entry" href="/film/" aria-label="Explore films by Nicoló Lombardi"><h1 class="animated-name" aria-label="Nicoló Lombardi">${letters}</h1><span class="down" aria-hidden="true"></span></a><button class="home-pause" aria-label="Pause background video">pause</button></section>${listMarkup(film, "Selected films")}`;
}

// Full-screen scrolling covers. `heading` adds a screen-reader/search heading.
export function listMarkup(list, label, heading) {
  return `${heading ? `<h1 class="sr-only">${esc(heading)}</h1>` : ""}${logoFilters}<div class="project-scroll" aria-label="${label}">${list.map((p, i) => `<section class="project-section" id="p-${p.id}" data-project="${p.id}" aria-label="${esc(fullName(p))}"><a class="project-open" href="${projectURL(p)}" aria-label="Open ${esc(fullName(p))} project"></a><img src="${p.cover}" alt="${esc(`${fullName(p)} — ${p.type} by Nicoló Lombardi`)}" loading="${i === 0 ? "eager" : "lazy"}" decoding="async"></section>`).join("")}</div><a class="view-project" href="${projectURL(list[0])}" aria-label="View ${esc(list[0].brand)} project" hidden>view project</a><button class="project-prev" aria-label="Previous project"></button><button class="project-next" aria-label="Next project"></button><div class="project-cursor" aria-hidden="true" hidden></div>`;
}

export function projectMarkup(p, backHref = "/film/") {
  const local =
    p.videos.length === 1
      ? `<section class="single-film" aria-label="${esc(p.brand)} film"><video controls playsinline preload="metadata" poster="${p.videoPosters?.[0] || p.cover}" aria-label="${esc(fullName(p))}">${videoSources(p.videos[0])}</video></section>`
      : p.videos.length > 1
        ? videoGalleryMarkup(p, esc)
        : "";
  const embed =
    p.youtube ||
    (p.externalVideo?.includes("vimeo.com/")
      ? "https://player.vimeo.com/video/" + p.externalVideo.match(/vimeo\.com\/(\d+)/)[1]
      : null);
  const media = embed
    ? `<section class="single-film"><iframe src="${esc(embed)}" title="${esc(fullName(p))}" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen loading="lazy"></iframe></section>`
    : local;
  const images = imageGalleryMarkup(p, esc);
  const fallback =
    !media && !images
      ? `<section class="detail-header"><img src="${p.cover}" alt="${esc(fullName(p))}"></section>`
      : "";
  const next = projects[(projects.indexOf(p) + 1) % projects.length];
  return `<article class="detail"><a class="back" href="${backHref}">back</a>${media}${images}${fallback}<header class="detail-heading"><h1>${esc(p.brand)}${p.title === p.brand ? "" : "<br>" + esc(p.title)}</h1><p>${esc(p.type)}</p></header><div class="detail-text"><h2>About the project</h2><p>${esc(p.description)}</p></div>${p.externalVideo ? `<p class="media-note"><a href="${esc(p.externalVideo)}" target="_blank" rel="noopener noreferrer">Open film on Vimeo</a></p>` : ""}<a class="next-project" href="${projectURL(next)}"><span>Next project</span><strong>${esc(next.brand)}</strong></a></article>`;
}
