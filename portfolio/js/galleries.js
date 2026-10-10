// Video carousel (horizontal, with thumbnails) and image carousel (vertical)
// used on project pages.
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const behavior = () => (reduced() ? "instant" : "smooth");

// WebM first (smaller, Chrome/Firefox/modern Safari), MP4 fallback for the rest.
export function videoSources(webm) {
  const mp4 = webm.replace(/\.webm$/, ".mp4");
  return `<source src="${webm}" type="video/webm"><source src="${mp4}" type="video/mp4">`;
}

export function videoGalleryMarkup(project, escape) {
  const posters = project.videoPosters || [],
    thumbs = project.videoThumbnails || posters;
  return `<section class="video-gallery" aria-label="${escape(project.brand)} films" aria-roledescription="carousel">
  <div class="video-track" tabindex="0" aria-label="Video carousel — use left and right arrows">${project.videos.map((src, i) => `<div class="video-slide" data-slide="${i}" style="--ratio:${project.videoRatios?.[i] || 16 / 9}" role="group" aria-label="Film ${i + 1} of ${project.videos.length}"><video controls playsinline preload="${i === 0 ? "metadata" : "none"}" poster="${posters[i] || project.cover}" aria-label="${escape(project.brand)} film ${i + 1}">${videoSources(src)}</video></div>`).join("")}</div>
  <div class="video-navigation"><button class="gallery-prev" aria-label="Previous video">←</button><div class="video-thumbnails" aria-label="Select a video">${project.videos.map((_, i) => `<button class="video-thumbnail" data-video="${i}" aria-label="Select film ${i + 1}" aria-pressed="${i === 0}"><img src="${thumbs[i] || project.cover}" alt="" loading="lazy"></button>`).join("")}</div><button class="gallery-next" aria-label="Next video">→</button></div>
 </section>`;
}

export function imageGalleryMarkup(project, escape) {
  if (!project.images.length) return "";
  return `<section class="image-gallery" aria-label="${escape(project.brand)} images" aria-roledescription="carousel"><div class="image-track" tabindex="0" aria-label="Image carousel — use up and down arrows">${project.images.map((src, i) => `<figure class="image-slide" role="group" aria-label="Image ${i + 1} of ${project.images.length}"><img src="${src}" alt="${escape(project.title === project.brand ? project.brand : project.brand + " — " + project.title)} (${escape(project.type)}), image ${i + 1}" loading="lazy" decoding="async"></figure>`).join("")}</div>${project.images.length > 1 ? '<div class="image-navigation"><button class="gallery-prev" aria-label="Previous image">↑</button><button class="gallery-next" aria-label="Next image">↓</button></div>' : ""}</section>`;
}

function bindCarousel(root, axis, selector, thumbnailSelector) {
  const track = root.querySelector(axis === "x" ? ".video-track" : ".image-track");
  const slides = [...track.querySelectorAll(selector)],
    thumbs = [...root.querySelectorAll(thumbnailSelector || ".unused")];
  let active = 0,
    frame = 0,
    pointer = null,
    suppressClick = false;
  const position = (el) => (axis === "x" ? el.offsetLeft : el.offsetTop);
  const size = (el) => (axis === "x" ? el.clientWidth : el.clientHeight);
  const scroll = () => (axis === "x" ? track.scrollLeft : track.scrollTop);
  const target = (i) => position(slides[i]) - (size(track) - size(slides[i])) / 2;
  const select = (i) => {
    i = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo(
      axis === "x"
        ? { left: target(i), behavior: behavior() }
        : { top: target(i), behavior: behavior() },
    );
  };
  const update = () => {
    frame = 0;
    const next = slides.reduce(
      (best, slide, i) =>
        Math.abs(target(i) - scroll()) < Math.abs(target(best) - scroll()) ? i : best,
      0,
    );
    active = next;
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === active);
      const video = slide.querySelector("video");
      if (video) {
        if (i !== active) video.pause();
        else video.preload = "metadata";
      }
    });
    thumbs.forEach((thumb, i) => thumb.setAttribute("aria-pressed", String(i === active)));
    if (thumbs[active]) {
      const bar = thumbs[active].parentElement;
      bar.scrollTo({
        left: thumbs[active].offsetLeft - (bar.clientWidth - thumbs[active].clientWidth) / 2,
        behavior: behavior(),
      });
    }
    const prev = root.querySelector(".gallery-prev"),
      nextButton = root.querySelector(".gallery-next");
    if (prev) prev.disabled = active === 0;
    if (nextButton) nextButton.disabled = active === slides.length - 1;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  track.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  const prev = root.querySelector(".gallery-prev"),
    next = root.querySelector(".gallery-next");
  if (prev) prev.onclick = () => select(active - 1);
  if (next) next.onclick = () => select(active + 1);
  thumbs.forEach((thumb, i) => (thumb.onclick = () => select(i)));
  const key = (e) => {
    if (e.target.tagName === "VIDEO") return;
    const keys = axis === "x" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
    if (keys.includes(e.key)) {
      e.preventDefault();
      select(active + (e.key === keys[0] ? -1 : 1));
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      select(e.key === "Home" ? 0 : slides.length - 1);
    }
  };
  track.addEventListener("keydown", key);
  const down = (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("button,a")) return;
    const video = e.target.closest("video");
    if (video && e.clientY > video.getBoundingClientRect().bottom - 60) return;
    suppressClick = false;
    pointer = {
      id: e.pointerId,
      start: axis === "x" ? e.clientX : e.clientY,
      scroll: scroll(),
      dragging: false,
    };
  };
  const move = (e) => {
    if (!pointer || e.pointerId !== pointer.id) return;
    const distance = (axis === "x" ? e.clientX : e.clientY) - pointer.start;
    if (Math.abs(distance) > 5) {
      pointer.dragging = true;
      suppressClick = true;
      track.classList.add("dragging");
      track.setPointerCapture(e.pointerId);
    }
    if (pointer.dragging) {
      e.preventDefault();
      if (axis === "x") track.scrollLeft = pointer.scroll - distance;
      else track.scrollTop = pointer.scroll - distance;
    }
  };
  const up = (e) => {
    if (!pointer) return;
    if (track.hasPointerCapture?.(pointer.id)) track.releasePointerCapture(pointer.id);
    const dragged = pointer.dragging;
    pointer = null;
    track.classList.remove("dragging");
    if (dragged) select(active);
  };
  const click = (e) => {
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick = false;
    }
  };
  track.addEventListener("click", click, true);
  track.addEventListener("pointerdown", down);
  track.addEventListener("pointermove", move);
  track.addEventListener("pointerup", up);
  track.addEventListener("pointercancel", up);
  slides.forEach((slide, i) => {
    const video = slide.querySelector("video");
    if (video)
      video.addEventListener("play", () => {
        if (i !== active) select(i);
      });
  });
  const initial = requestAnimationFrame(() => {
    select(0);
    update();
  });
  return () => {
    cancelAnimationFrame(initial);
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", schedule);
    track.removeEventListener("scroll", schedule);
    track.removeEventListener("keydown", key);
    track.removeEventListener("click", click, true);
    track.removeEventListener("pointerdown", down);
    track.removeEventListener("pointermove", move);
    track.removeEventListener("pointerup", up);
    track.removeEventListener("pointercancel", up);
  };
}
export function bindGalleries(main) {
  const clean = [];
  main
    .querySelectorAll(".video-gallery")
    .forEach((root) => clean.push(bindCarousel(root, "x", ".video-slide", ".video-thumbnail")));
  main
    .querySelectorAll(".image-gallery")
    .forEach((root) => clean.push(bindCarousel(root, "y", ".image-slide")));
  return () => clean.forEach((fn) => fn());
}
