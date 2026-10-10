// Brand marks shown on the left/right "previous / next project" hover areas.
// `box` crops the logo out of each project's cover image: [x, y, width, height]
// as fractions of the cover's pixel `size`.
// Most marks reuse the supplied headers. The two marks with very fine lettering
// use clean vector typography so bright photographic details cannot leak through.
const marks = {
  toyota: { size: [2560, 1378], box: [0.36, 0.46, 0.295, 0.083] },
  lexus: { size: [1280, 720], box: [0.36, 0.374, 0.28, 0.23] },
  elaguila: { size: [2560, 1429], box: [0.418, 0.31, 0.16, 0.34], gold: true },
  melia: { size: [1820, 1024], box: [0.4, 0.408, 0.205, 0.185] },
  wichita: { size: [2560, 1350], box: [0.444, 0.353, 0.115, 0.29] },
  anaya: { size: [2560, 1429], box: [0.35, 0.425, 0.3, 0.14] },
  soapandglory: { size: [1024, 1280], box: [0.233, 0.435, 0.536, 0.094] },
};
const whiteKey =
  '<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 14 14 14 0 -38" result="whiteInk"/>';
export const logoFilters = `<svg class="logo-filter-defs" width="0" height="0" aria-hidden="true"><defs><filter id="project-white-ink" color-interpolation-filters="sRGB">${whiteKey}<feComposite in="SourceGraphic" in2="whiteInk" operator="in"/></filter><filter id="project-gold-ink" color-interpolation-filters="sRGB">${whiteKey}<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 8 4 -10 0 -6" result="goldInk"/><feMerge result="ink"><feMergeNode in="whiteInk"/><feMergeNode in="goldInk"/></feMerge><feComposite in="SourceGraphic" in2="ink" operator="in"/></filter></defs></svg>`;
export function projectLogoMarkup(project, slot = "mark") {
  if (!project) return '<span class="landing-logo" aria-hidden="true">Nicoló Lombardi</span>';
  if (project.id === "uncommonsense")
    return `<svg class="project-logo" data-logo="uncommonsense" aria-hidden="true" focusable="false" viewBox="0 0 620 70"><g fill="white" font-family="Helvetica Neue, Arial, sans-serif" font-size="58"><text x="0" y="54" font-weight="300" textLength="410" lengthAdjust="spacingAndGlyphs">UNCOMMON</text><text x="412" y="54" font-weight="500" textLength="208" lengthAdjust="spacingAndGlyphs">SENSE.</text></g></svg>`;
  if (project.id === "wppproduction")
    return `<svg class="project-logo" data-logo="wppproduction" aria-hidden="true" focusable="false" viewBox="0 0 530 72"><defs><pattern id="wpp-dots-${slot}" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white"/></pattern></defs><g font-family="Helvetica Neue, Arial, sans-serif" font-weight="700"><text x="0" y="58" font-size="62" textLength="170" lengthAdjust="spacingAndGlyphs" fill="url(#wpp-dots-${slot})">WPP</text><text x="180" y="58" font-size="65" textLength="350" lengthAdjust="spacingAndGlyphs" fill="white">Production</text></g></svg>`;
  const mark = marks[project.id];
  // New projects without a cropped logo simply show their brand name.
  if (!mark)
    return `<span class="landing-logo" aria-hidden="true">${project.brand.replace(/[&<>"']/g, "")}</span>`;
  const [w, h] = mark.size,
    [x, y, bw, bh] = mark.box;
  return `<svg class="project-logo" aria-hidden="true" focusable="false" viewBox="${x * w} ${y * h} ${bw * w} ${bh * h}" preserveAspectRatio="xMidYMid meet"><image href="${project.cover}" width="${w}" height="${h}" filter="url(#project-${mark.gold ? "gold" : "white"}-ink)"/></svg>`;
}
