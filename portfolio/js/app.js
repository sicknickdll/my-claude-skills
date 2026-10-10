// Single-page portfolio. Routes live in the URL hash:
//   #home (default) · #film · #visuals · #project/<id>
// Content comes from data.js; this file only renders it.
import { projects, filmOrder, visualsOrder, hero, heroPoster } from "./data.js";
import {
  videoGalleryMarkup,
  imageGalleryMarkup,
  bindGalleries,
  videoSources,
} from "./galleries.js";
import { logoFilters, projectLogoMarkup } from "./project-logos.js";
const main = document.querySelector("#main");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const byIds = (ids) => ids.map((id) => projects.find((p) => p.id === id)).filter(Boolean);
const film = byIds(filmOrder);
const visuals = byIds(visualsOrder);
let cleanup = () => {},
  returnFocus = null;
// Where the "back" link on a project page leads, and which project to scroll back to.
let lastList = "film",
  returnTo = null;
const esc = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const projectURL = (p) => "#project/" + p.id;
function announce(s) {
  document.querySelector("#announcer").textContent = s;
}
function showHome() {
  const name = "Nicoló Lombardi";
  const letters = [...name]
    .map(
      (letter, i) =>
        `<span class="name-letter" style="--letter:${i}" aria-hidden="true">${letter === " " ? "&nbsp;" : esc(letter)}</span>`,
    )
    .join("");
  main.innerHTML = `<section class="home" aria-label="Portfolio introduction"><img class="poster" src="${heroPoster}" alt=""><video id="entrance-video" poster="${heroPoster}" autoplay loop muted playsinline preload="auto" aria-hidden="true">${videoSources(hero)}</video><a class="home-entry" href="#film" aria-label="Explore films by Nicoló Lombardi"><h1 class="animated-name" aria-label="Nicoló Lombardi">${letters}</h1><span class="down" aria-hidden="true"></span></a><button class="home-pause" aria-label="Pause background video">pause</button></section>${projectMarkup(film, "Selected films")}`;
  const v = document.querySelector("#entrance-video"),
    b = document.querySelector(".home-pause");
  const setPaused = (paused) => {
    b.textContent = paused ? "play" : "pause";
    b.setAttribute("aria-label", paused ? "Play background video" : "Pause background video");
  };
  if (reduce.matches) {
    v.pause();
    setPaused(true);
  } else v.play().catch(() => setPaused(true));
  v.addEventListener("play", () => setPaused(false));
  v.addEventListener("pause", () => setPaused(true));
  b.onclick = () => {
    if (v.paused) v.play().catch(() => setPaused(true));
    else v.pause();
  };
  const scrollCleanup = bindProjectScroll(film);
  cleanup = () => {
    v.pause();
    scrollCleanup();
  };
}
function projectMarkup(list, label) {
  return `${logoFilters}<div class="project-scroll" aria-label="${label}">${list.map((p, i) => `<section class="project-section" data-project="${p.id}" aria-label="${esc(p.brand + " — " + p.title)}"><a class="project-open" href="${projectURL(p)}" aria-label="Open ${esc(p.brand + " — " + p.title)} project"></a><img src="${p.cover}" alt="${esc(p.brand + " — " + p.title)}" loading="${i === 0 ? "eager" : "lazy"}" decoding="async"></section>`).join("")}</div><a class="view-project" href="${projectURL(list[0])}" aria-label="View ${esc(list[0].brand)} project" hidden>view project</a><button class="project-prev" aria-label="Previous project"></button><button class="project-next" aria-label="Next project"></button><div class="project-cursor" aria-hidden="true" hidden></div>`;
}
function bindProjectScroll(list) {
  const link = main.querySelector(".view-project");
  const pages = [...main.querySelectorAll(".home,.project-section")];
  const previous = main.querySelector(".project-prev"),
    next = main.querySelector(".project-next");
  const cursor = main.querySelector(".project-cursor");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  let frame = 0,
    cursorFrame = 0,
    currentIndex = -1,
    hoveredSide = null,
    pointer = { x: 0, y: 0 };
  const projectFor = (page) => list.find((p) => p.id === page?.dataset.project);
  const nearest = () =>
    pages.reduce((best, page, i) => {
      const distance = (element) => {
        const r = element.getBoundingClientRect();
        return Math.abs(r.top + r.height / 2 - innerHeight / 2);
      };
      return distance(page) < distance(pages[best]) ? i : best;
    }, 0);
  const hideCursor = () => {
    hoveredSide = null;
    cursor.hidden = true;
  };
  const positionCursor = () => {
    cursorFrame = 0;
    cursor.style.left = Math.max(82, Math.min(innerWidth - 82, pointer.x)) + "px";
    cursor.style.top = Math.max(50, Math.min(innerHeight - 50, pointer.y)) + "px";
  };
  const refreshCursor = () => {
    if (!hoveredSide || hoveredSide.disabled || isOverlayOpen() || !finePointer.matches) {
      cursor.hidden = true;
      return;
    }
    cursor.innerHTML = projectLogoMarkup(
      list.find((p) => p.id === hoveredSide.dataset.destination),
      "cursor",
    );
    cursor.hidden = false;
    positionCursor();
  };
  const configure = (button, index, direction) => {
    const page = pages[index];
    button.disabled = !page;
    if (!page) {
      button.innerHTML = "";
      button.setAttribute("aria-label", direction + " project");
      delete button.dataset.destination;
      return;
    }
    const project = projectFor(page);
    button.innerHTML = projectLogoMarkup(project, direction.toLowerCase());
    button.dataset.destination = project?.id || "home";
    button.setAttribute(
      "aria-label",
      direction +
        " — " +
        (project ? project.brand + " — " + project.title : "Nicoló Lombardi landing"),
    );
  };
  const update = () => {
    frame = 0;
    const index = nearest();
    if (index !== currentIndex) {
      currentIndex = index;
      const project = projectFor(pages[index]);
      link.hidden = !project;
      if (project) {
        link.href = projectURL(project);
        link.setAttribute("aria-label", "View " + project.brand + " — " + project.title);
        announce(project.brand + " — " + project.title);
      }
      configure(previous, index - 1, "Previous");
      configure(next, index + 1, "Next");
      refreshCursor();
    }
  };
  const move = (direction) => {
    const destination = pages[nearest() + direction];
    if (!destination) return;
    window.scrollTo({
      top: window.scrollY + destination.getBoundingClientRect().top,
      behavior: reduce.matches ? "auto" : "smooth",
    });
  };
  previous.onclick = () => move(-1);
  next.onclick = () => move(1);
  const key = (e) => {
    if (isOverlayOpen() || e.target.closest?.("a,button,input,textarea,select")) return;
    if (["ArrowDown", "ArrowRight", "PageDown"].includes(e.key)) {
      e.preventDefault();
      move(1);
    } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
      e.preventDefault();
      move(-1);
    }
  };
  const pointerMove = (e) => {
    if (e.pointerType !== "mouse" || !finePointer.matches) {
      hideCursor();
      return;
    }
    const side = e.target.closest?.(".project-prev,.project-next");
    if (!side || side.disabled || isOverlayOpen()) {
      hideCursor();
      return;
    }
    pointer = { x: e.clientX, y: e.clientY };
    if (hoveredSide !== side || cursor.hidden) {
      hoveredSide = side;
      refreshCursor();
    } else if (!cursorFrame) cursorFrame = requestAnimationFrame(positionCursor);
  };
  const pointerLeave = (e) => {
    if (!e.relatedTarget) hideCursor();
  };
  // Require a fresh, deliberate gesture after the final section has settled.
  // Tracking all wheel events prevents arrival momentum from counting as intent.
  let atEnd = false,
    endSince = 0,
    lastWheel = -Infinity,
    wheelScore = 0,
    gestureStart = 0,
    gestureArmed = false,
    returning = false,
    touchStart = null;
  const checkEnd = () => {
    const rect = pages.at(-1).getBoundingClientRect();
    const end = rect.bottom <= innerHeight + 2 && rect.top <= 2;
    if (end !== atEnd) {
      atEnd = end;
      endSince = performance.now();
      wheelScore = 0;
      gestureArmed = false;
    }
    return end;
  };
  const returnToLanding = () => {
    returning = true;
    hideCursor();
    announce("Back to Nicoló Lombardi");
    const route = location.hash.slice(1) || "home";
    if (route === "home") window.scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" });
    else location.hash = "home";
  };
  const wheel = (e) => {
    const now = performance.now(),
      gap = now - lastWheel;
    lastWheel = now;
    const end = checkEnd();
    if (
      !end ||
      returning ||
      isOverlayOpen() ||
      e.ctrlKey ||
      e.deltaY <= 0 ||
      Math.abs(e.deltaX) > Math.abs(e.deltaY)
    ) {
      wheelScore = 0;
      gestureArmed = false;
      return;
    }
    if (gap > 240) {
      wheelScore = 0;
      gestureStart = now;
      gestureArmed = now - endSince >= 240;
    }
    if (!gestureArmed) return;
    if (now - gestureStart > 450) {
      wheelScore = 0;
      gestureStart = now;
    }
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
    wheelScore += e.deltaY * scale;
    if (wheelScore >= Math.max(320, innerHeight * 0.45)) {
      e.preventDefault();
      returnToLanding();
    }
  };
  const touchBegin = (e) => {
    touchStart = null;
    if (
      e.touches.length !== 1 ||
      isOverlayOpen() ||
      returning ||
      !checkEnd() ||
      performance.now() - endSince < 240
    )
      return;
    touchStart = { y: e.touches[0].clientY, time: performance.now() };
  };
  const touchEnd = (e) => {
    const start = touchStart;
    touchStart = null;
    if (!start || !checkEnd() || isOverlayOpen() || e.changedTouches.length !== 1) return;
    const distance = start.y - e.changedTouches[0].clientY,
      elapsed = performance.now() - start.time;
    if (distance >= Math.max(110, innerHeight * 0.16) && elapsed <= 650) returnToLanding();
  };
  const touchCancel = () => {
    touchStart = null;
  };
  const scroll = () => {
    if (!checkEnd()) returning = false;
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", scroll, { passive: true });
  window.addEventListener("resize", scroll);
  window.addEventListener("keydown", key);
  window.addEventListener("blur", hideCursor);
  document.addEventListener("pointermove", pointerMove, { passive: true });
  document.addEventListener("pointerout", pointerLeave);
  window.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("touchstart", touchBegin, { passive: true });
  window.addEventListener("touchend", touchEnd, { passive: true });
  window.addEventListener("touchcancel", touchCancel, { passive: true });
  update();
  return () => {
    cancelAnimationFrame(frame);
    cancelAnimationFrame(cursorFrame);
    hideCursor();
    window.removeEventListener("scroll", scroll);
    window.removeEventListener("resize", scroll);
    window.removeEventListener("keydown", key);
    window.removeEventListener("blur", hideCursor);
    document.removeEventListener("pointermove", pointerMove);
    document.removeEventListener("pointerout", pointerLeave);
    window.removeEventListener("wheel", wheel);
    window.removeEventListener("touchstart", touchBegin);
    window.removeEventListener("touchend", touchEnd);
    window.removeEventListener("touchcancel", touchCancel);
  };
}
function showProjects(list, label) {
  main.innerHTML = projectMarkup(list, label);
  cleanup = bindProjectScroll(list);
}
function showFilm() {
  showProjects(film, "Selected films");
}
function showVisuals() {
  showProjects(visuals, "Visual projects");
}
function showProject(id) {
  const p = projects.find((x) => x.id === id);
  if (!p) {
    location.hash = "film";
    return;
  }
  document.title = `${p.brand} — ${p.title} · Nicoló Lombardi`;
  returnTo = p.id;
  const local =
    p.videos.length === 1
      ? `<section class="single-film" aria-label="${esc(p.brand)} film"><video controls playsinline preload="metadata" poster="${p.videoPosters?.[0] || p.cover}" aria-label="${esc(p.title)}">${videoSources(p.videos[0])}</video></section>`
      : p.videos.length > 1
        ? videoGalleryMarkup(p, esc)
        : "";
  const embed =
    p.youtube ||
    (p.externalVideo?.includes("vimeo.com/")
      ? "https://player.vimeo.com/video/" + p.externalVideo.match(/vimeo\.com\/(\d+)/)[1]
      : null);
  const media = embed
    ? `<section class="single-film"><iframe src="${esc(embed)}" title="${esc(p.title)}" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen loading="lazy"></iframe></section>`
    : local;
  const images = imageGalleryMarkup(p, esc);
  const fallback =
    !media && !images
      ? `<section class="detail-header"><img src="${p.cover}" alt="${esc(p.title)}"></section>`
      : "";
  const next = projects[(projects.indexOf(p) + 1) % projects.length];
  main.innerHTML = `<article class="detail"><a class="back" href="#${lastList}">back</a>${media}${images}${fallback}<header class="detail-heading"><h1>${esc(p.brand)}${p.title === p.brand ? "" : "<br>" + esc(p.title)}</h1><p>${esc(p.type)}</p></header><div class="detail-text"><h2>About the project</h2><p>${esc(p.description)}</p></div>${p.externalVideo ? `<p class="media-note"><a href="${esc(p.externalVideo)}" target="_blank" rel="noopener noreferrer">Open film on Vimeo</a></p>` : ""}<a class="next-project" href="${projectURL(next)}"><span>Next project</span><strong>${esc(next.brand)}</strong></a></article>`;
  main.querySelectorAll("video").forEach((v) =>
    v.addEventListener("play", () =>
      main.querySelectorAll("video").forEach((other) => {
        if (v !== other) other.pause();
      }),
    ),
  );
  const galleriesCleanup = bindGalleries(main);
  cleanup = () => {
    galleriesCleanup();
    main.querySelectorAll("video").forEach((v) => v.pause());
  };
}
function render() {
  cleanup();
  closeOverlay();
  const route = location.hash.slice(1) || "home";
  document.documentElement.classList.toggle("snap-pages", !route.startsWith("project/"));
  document.title = "Nicoló Lombardi — Film & Visuals";
  document.querySelectorAll(".header a").forEach((a) => {
    if (a.hash === "#" + route) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const isProject = route.startsWith("project/");
  if (route === "film") showFilm();
  else if (route === "visuals") showVisuals();
  else if (isProject) showProject(route.slice(8));
  else showHome();
  // Coming back from a project page: land on that project's slide, not the top.
  const section = !isProject && returnTo && main.querySelector(`[data-project="${returnTo}"]`);
  window.scrollTo({ top: section ? section.offsetTop : 0, behavior: "instant" });
  if (!isProject) {
    lastList = route === "film" || route === "visuals" ? route : "home";
    returnTo = null;
  }
}
const about = document.querySelector("#about"),
  aboutToggle = document.querySelector("#about-toggle");
function isOverlayOpen() {
  return !about.hidden;
}
function closeOverlay() {
  const was = isOverlayOpen();
  about.hidden = true;
  document.body.style.overflow = "";
  main.inert = false;
  aboutToggle.setAttribute("aria-expanded", "false");
  if (was && returnFocus?.isConnected) returnFocus.focus();
}
function openAbout() {
  returnFocus = document.activeElement;
  about.hidden = false;
  main.inert = true;
  document.body.style.overflow = "hidden";
  aboutToggle.setAttribute("aria-expanded", "true");
  document.querySelector("#about-close").focus();
}
about.insertAdjacentHTML(
  "afterbegin",
  '<button id="about-close" aria-label="Close about">close</button>',
);
aboutToggle.onclick = () => (about.hidden ? openAbout() : closeOverlay());
document.querySelector("#about-close").onclick = closeOverlay;
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isOverlayOpen()) {
    e.preventDefault();
    closeOverlay();
  }
  if (e.key === "Tab" && isOverlayOpen()) {
    const els = [...about.querySelectorAll("a,button")],
      first = els[0],
      last = els.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
document.querySelectorAll(".header a").forEach((a) =>
  a.addEventListener("click", (e) => {
    if (
      location.hash === a.getAttribute("href") ||
      (!location.hash && a.getAttribute("href") === "#home")
    ) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" });
    }
  }),
);
document.querySelector("#year").textContent = new Date().getFullYear();
window.addEventListener("hashchange", render);
render();
