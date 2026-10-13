// Channel kit: palette, block-print ink texture, the frog mascot, captions and motion helpers.
// Every function is a pure function of its arguments (and time) and returns an SVG string,
// so an episode's renderFrame(t) can rebuild the whole frame from scratch.
window.KIT = (() => {
  const C = { paper: "#EFE6D3", cream: "#F6EFDF", navy: "#1E3473", green: "#3E5A2C", red: "#B8452E" };
  // Not "Helvetica Neue": on Linux fontconfig maps it to Inter. Helvetica -> Nimbus Sans (metric clone) when missing.
  const FONT = `Helvetica, 'Nimbus Sans', Arial, sans-serif`;
  const W = 1080, H = 1920;

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const prog = (t, at, dur) => clamp((t - at) / dur);
  const ease = {
    out: (u) => 1 - Math.pow(1 - u, 3),
    inOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    back: (u) => { const c = 1.9, c3 = c + 1; return 1 + c3 * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
  };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  // Stamp-in: overshooting scale + quick fade, like a rubber stamp hitting paper.
  function stamp(t, at, dur = 0.35) {
    const u = prog(t, at, dur);
    return { s: u <= 0 ? 0.0001 : lerp(1.35, 1, ease.back(u)), o: clamp(u * 4) };
  }
  // Wrap content in a stamp transform around (cx, cy).
  function stamped(t, at, cx, cy, inner, { rot = 0, dur = 0.35 } = {}) {
    const k = stamp(t, at, dur);
    if (t < at) return "";
    return `<g opacity="${k.o}" transform="translate(${cx} ${cy}) rotate(${rot}) scale(${k.s}) translate(${-cx} ${-cy})">${inner}</g>`;
  }

  // Ink filter: rough edges + speckled grain. The noise "boils" 8x per second for a hand-printed feel.
  function defs(t) {
    const seed = (Math.floor(t * 8) % 40) + 1;
    return `<defs>
      <filter id="ink" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed}" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="${seed + 11}" result="g"/>
        <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -12 0 0 0 7.6" result="speck"/>
        <feComposite in="d" in2="speck" operator="in"/>
      </filter>
    </defs>`;
  }

  // The paper texture is the page's CSS background (see an episode's <style>), not part of the SVG,
  // so it isn't re-decoded every frame. Await this before the first frame.
  const loadPaper = (src = "../../brand/paper.jpg") => { const i = new Image(); i.src = src; return i.decode(); };

  // ---------- the frog ----------
  // Local origin = between the feet. Unscaled the frog is ~260 wide, ~290 tall (with hat).
  function frog({ x, y, s = 1, rot = 0, sx = 1, sy = 1, mouth = 0, blink = 0, gaze = 0, hatY = 0, hatRot = 0 }) {
    const g = C.green, cr = C.cream, n = C.navy;
    const eye = (cx) => {
      const ry = Math.max(2.5, 22 * (1 - blink));
      return `<circle cx="${cx}" cy="-178" r="42" fill="${g}"/>
        <ellipse cx="${cx}" cy="-176" rx="22" ry="${ry}" fill="${g}" stroke="${cr}" stroke-width="7"/>
        ${blink < 0.5 ? `<circle cx="${cx + gaze * 9}" cy="-173" r="7.5" fill="${n}"/>` : ""}`;
    };
    const freckles = (sgn) => [[-74, -142], [-62, -134], [-84, -132]].map(([a, b]) => `<circle cx="${a * sgn}" cy="${b}" r="3.6" fill="${cr}"/>`).join("");
    const m = clamp(mouth);
    const mouthSvg = m > 0.06
      ? `<ellipse cx="0" cy="-128" rx="${15 + 7 * m}" ry="${3 + 14 * m}" fill="${n}" stroke="${cr}" stroke-width="5"/>`
      : `<path d="M-34,-134 Q0,-114 34,-134" fill="none" stroke="${cr}" stroke-width="6" stroke-linecap="round"/>`;
    const hat = `<g transform="translate(0 ${-212 + hatY}) rotate(${-7 + hatRot})">
        <path d="M-60,-2 C-58,-70 58,-70 60,-2 Z" fill="${n}"/>
        <path d="M-59,-17 L59,-17 L60,-3 L-60,-3 Z" fill="${C.red}"/>
        <circle cx="0" cy="-64" r="8" fill="${n}"/>
        <ellipse cx="0" cy="0" rx="90" ry="14" fill="${n}"/>
      </g>`;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s * sx} ${s * sy})">
      <ellipse cx="-110" cy="-42" rx="34" ry="44" fill="${g}"/>
      <ellipse cx="110" cy="-42" rx="34" ry="44" fill="${g}"/>
      <path d="M-122,0 C-140,-90 -108,-168 -62,-184 C-30,-194 30,-194 62,-184 C108,-168 140,-90 122,0 Z" fill="${g}"/>
      ${eye(-62)}${eye(62)}
      <circle cx="0" cy="-74" r="70" fill="${cr}"/>
      ${freckles(1)}${freckles(-1)}
      ${mouthSvg}
      <ellipse cx="-92" cy="-6" rx="38" ry="14" fill="${g}"/>
      <ellipse cx="92" cy="-6" rx="38" ry="14" fill="${g}"/>
      ${hat}
    </g>`;
  }

  // Deterministic blink (0..1) every ~3 s.
  function blink(t) {
    const p = (t + 0.7) % 3.1;
    return p < 0.16 ? Math.sin((p / 0.16) * Math.PI) : 0;
  }

  // Hop path. moves: [{at, x, y, s, dur, h}] in time order. Returns pose for frog().
  function hops(t, start, moves) {
    let st = { ...start }, sx = 1, sy = 1;
    for (const m of moves) {
      const d = m.dur || 0.55, to = { x: m.x ?? st.x, y: m.y ?? st.y, s: m.s ?? st.s };
      if (t >= m.at + d) {
        st = to;
        const k = t - (m.at + d);
        if (k < 0.3) { const q = Math.sin((Math.PI * k) / 0.3) * Math.exp(-k * 5); sx = 1 + 0.2 * q; sy = 1 - 0.2 * q; } else { sx = 1; sy = 1; }
        continue;
      }
      if (t >= m.at) {
        const u = (t - m.at) / d, e = ease.inOut(u), b = Math.sin(Math.PI * u);
        return {
          x: lerp(st.x, to.x, e), y: lerp(st.y, to.y, e) - (m.h ?? 160) * 4 * u * (1 - u), s: lerp(st.s, to.s, e),
          rot: 10 * Math.sign(to.x - st.x) * b, sx: 1 - 0.1 * b, sy: 1 + 0.14 * b,
        };
      }
      break;
    }
    return { ...st, rot: 0, sx, sy: sy * (1 + 0.012 * Math.sin(t * 4.4)) };
  }

  // ---------- type ----------
  function text(x, y, str, { size = 66, weight = 700, fill = C.navy, anchor = "start", ls = 0, rot = 0, upper = false } = {}) {
    return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}em" ${rot ? `transform="rotate(${rot} ${x} ${y})"` : ""}>${esc(upper ? str.toUpperCase() : str)}</text>`;
  }
  // Vox-style label: uppercase, tracked, with optional leader line to a point.
  function label(t, at, x, y, str, { to = null, anchor = "start", fill = C.red, size = 36 } = {}) {
    if (t < at) return "";
    const u = ease.out(prog(t, at, 0.3));
    let line = "";
    if (to) {
      const x0 = anchor === "end" ? x - 10 : x + 10, y0 = to[1] > y ? y + 14 : y - size - 6;
      const lx = lerp(x0, to[0], u), ly = lerp(y0, to[1], u);
      line = `<line x1="${x0}" y1="${y0}" x2="${lx}" y2="${ly}" stroke="${fill}" stroke-width="5" stroke-linecap="round"/>
        ${u >= 1 ? `<circle cx="${to[0]}" cy="${to[1]}" r="8" fill="${fill}"/>` : ""}`;
    }
    const pad = to ? 0 : 0;
    return `<g opacity="${clamp(u * 2)}">${line}${text(x + pad, y, str, { size, fill, anchor, ls: 0.06, upper: true })}</g>`;
  }
  // Hand-drawn circle callout that draws itself on.
  function circleCallout(t, at, cx, cy, rx, ry, { stroke = C.red, w = 9, dur = 0.45 } = {}) {
    if (t < at) return "";
    const L = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2) * 1.08, u = ease.out(prog(t, at, dur));
    const d = `M${cx + rx},${cy} A${rx},${ry} 0 1,1 ${cx + rx * 0.98},${cy - ry * 0.12}`;
    return `<path d="${d}" transform="rotate(-8 ${cx} ${cy})" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - u)}"/>`;
  }

  // ---------- captions ----------
  let _ctx;
  const measure = (s, size) => {
    _ctx = _ctx || document.createElement("canvas").getContext("2d");
    _ctx.font = `700 ${size}px ${FONT}`;
    return _ctx.measureText(s).width;
  };
  // Word-by-word captions synced to the babble voice (cues.json from babble-audio).
  function captions(t, cues, { cx = 500, top = 1330, maxW = 800, size = 66, lh = 82 } = {}) {
    let idx = -1;
    for (let i = 0; i < cues.length; i++) if (t >= cues[i].start - 0.05) idx = i;
    if (idx < 0) return "";
    const cue = cues[idx];
    const words = cue.text.split(" ").map((w, i) => ({ hl: /\*/.test(w), w: w.replace(/\*/g, ""), at: cue.words[i] ?? cue.start }));
    const sp = measure(" ", size);
    const lines = [[]];
    let cur = 0;
    for (const w of words) {
      w.width = measure(w.w, size);
      if (cur > 0 && cur + sp + w.width > maxW) { lines.push([]); cur = 0; }
      lines[lines.length - 1].push(w);
      cur += (cur ? sp : 0) + w.width;
    }
    let out = "";
    lines.forEach((ln, li) => {
      const lw = ln.reduce((a, w) => a + w.width, 0) + sp * (ln.length - 1);
      let x = cx - lw / 2;
      const y = top + size + li * lh;
      for (const w of ln) {
        const u = prog(t, w.at - 0.02, 0.1);
        if (u > 0) {
          const dy = (1 - ease.out(u)) * 14;
          if (w.hl) {
            const hu = ease.out(prog(t, w.at, 0.2));
            out += `<rect x="${x - 10}" y="${y - size * 0.82 + dy}" width="${(w.width + 20) * hu}" height="${size * 1.06}" fill="${C.red}" transform="rotate(-1.5 ${x} ${y})"/>`;
          }
          out += `<g opacity="${u}">${text(x, y + dy, w.w, { size, fill: w.hl ? C.cream : C.navy })}</g>`;
        }
        x += w.width + sp;
      }
    });
    return out;
  }

  return { C, FONT, W, H, clamp, lerp, prog, ease, esc, stamp, stamped, defs, loadPaper, frog, blink, hops, text, label, circleCallout, captions };
})();
