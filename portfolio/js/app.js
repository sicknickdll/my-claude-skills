// Portfolio behaviour. Every page (/, /film/, /visuals/, /work/<id>/) is a real,
// pre-built HTML file (see tools/build.mjs) so search engines can read it; this
// script re-renders the same markup and adds the interactions: snap scrolling,
// previous/next logo hover, carousels, the About panel.
import { projects } from "./data.js";
import { bindGalleries } from "./galleries.js";
import { projectLogoMarkup } from "./project-logos.js";
import { film, visuals, homeMarkup, listMarkup, projectMarkup, projectURL } from "./views.js";
const main = document.querySelector("#main");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
let cleanup = () => {},
  returnFocus = null;
// Remembers which list the visitor came from, so "back" on a project returns there.
const memory = {
  get: () => {
    try {
      return sessionStorage.getItem("lastList");
    } catch {
      return null;
    }
  },
  set: (v) => {
    try {
      sessionStorage.setItem("lastList", v);
    } catch {}
  },
};
function announce(s) {
  document.querySelector("#announcer").textContent = s;
}
function showHome() {
  main.innerHTML = homeMarkup();
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
    if (location.pathname === "/")
      window.scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" });
    else location.href = "/";
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
function showProjects(list, label, heading) {
  main.innerHTML = listMarkup(list, label, heading);
  cleanup = bindProjectScroll(list);
}
function showProject(id) {
  const p = projects.find((x) => x.id === id);
  if (!p) return location.replace("/film/");
  // Back to the list the visitor came from, if this project is in it.
  const inList = { "/": film, "/film/": film, "/visuals/": visuals };
  const remembered = memory.get();
  const list = inList[remembered]?.includes(p)
    ? remembered
    : film.includes(p)
      ? "/film/"
      : "/visuals/";
  main.innerHTML = projectMarkup(p, `${list}#p-${p.id}`);
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
// Old ChatGPT-site links used #film, #visuals and #project/<id>: send them to the real pages.
function redirectLegacyHash() {
  const h = location.hash.slice(1);
  if (h === "film" || h === "visuals") return (location.replace(`/${h}/`), true);
  if (h.startsWith("project/")) return (location.replace(`/work/${h.slice(8)}/`), true);
  if (h === "home") history.replaceState(null, "", "/");
  return false;
}
function render() {
  const path = location.pathname.replace(/index\.html$/, "");
  const work = path.match(/^\/work\/([^/]+)\/?$/);
  document.documentElement.classList.toggle("snap-pages", !work);
  document.querySelectorAll(".header a").forEach((a) => {
    if (a.pathname === path) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (path === "/film/") showProjects(film, "Selected films", "Films by Nicoló Lombardi");
  else if (path === "/visuals/")
    showProjects(visuals, "Visual projects", "Visual projects by Nicoló Lombardi");
  else if (work) showProject(work[1]);
  else showHome();
  if (!work) memory.set(path === "/film/" || path === "/visuals/" ? path : "/");
  // Arriving from "back" (…#p-<id>): land on that project's slide.
  const target = location.hash.startsWith("#p-") && document.getElementById(location.hash.slice(1));
  window.scrollTo({ top: target ? target.offsetTop : 0, behavior: "instant" });
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
// Clicking the link of the page you're already on scrolls back to the top.
document.querySelectorAll(".header a").forEach((a) =>
  a.addEventListener("click", (e) => {
    if (a.pathname === location.pathname) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" });
    }
  }),
);
document.querySelector("#year").textContent = new Date().getFullYear();
if (!redirectLegacyHash()) render();
