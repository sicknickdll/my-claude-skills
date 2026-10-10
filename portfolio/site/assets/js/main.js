// Small enhancements only — every page works without JavaScript.
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Solid nav background once the page scrolls.
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Hero background video: keep it still for people who prefer reduced motion.
  const heroVideo = document.querySelector(".hero__video");
  if (heroVideo && reduceMotion) heroVideo.pause();

  // Silent loops play only while on screen. Without JS (or with reduced motion) they keep normal controls.
  const loops = [...document.querySelectorAll("video[data-loop]")];
  if (loops.length && "IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting } of entries) {
          if (isIntersecting) target.play().catch(() => {});
          else target.pause();
        }
      },
      { threshold: 0.25 }
    );
    for (const v of loops) {
      v.removeAttribute("controls");
      v.preload = "auto";
      io.observe(v);
    }
  }

  const soundButton = (v) => v.parentElement.querySelector("[data-sound]");
  const setSound = (v, on) => {
    v.muted = !on;
    const b = soundButton(v);
    if (b) {
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", on ? "Sound off" : "Sound on");
    }
  };

  // Only one thing makes sound at a time.
  const quietOthers = (current) => {
    for (const v of document.querySelectorAll("video")) {
      if (v === current) continue;
      if (v.hasAttribute("data-loop")) setSound(v, false);
      else if (!v.paused && !v.classList.contains("hero__video")) v.pause();
    }
  };

  for (const b of document.querySelectorAll("[data-sound]")) {
    const v = b.parentElement.querySelector("video");
    b.addEventListener("click", () => {
      const on = v.muted;
      if (on) {
        quietOthers(v);
        if (v.paused) v.play().catch(() => {});
      }
      setSound(v, on);
    });
  }

  for (const v of document.querySelectorAll("video[controls]")) {
    v.addEventListener("play", () => quietOthers(v));
  }
})();
