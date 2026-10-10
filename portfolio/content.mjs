// All the words and the list of projects on the site live in this file.
// Edit it, then run `node build.mjs` to regenerate the pages in site/.
//
// Anything left as an empty string ("") shows up on the site as a dashed
// "to add" box, and `node build.mjs` lists it, so nothing goes live half-done
// without you noticing. Media paths are relative to site/media/.

export const site = {
  url: "https://nicolo-lombardi.com",
  name: "Nicolò Lombardi", // TODO confirm spelling (with or without the accent)
  // Short line under your name on the home page, e.g. your discipline(s) and city.
  tagline: "",
  // One or two sentences Google shows under your site in search results.
  description: "",
  // Paragraphs for the About section.
  bio: [""],
  email: "hello.nicolombardi@gmail.com", // TODO confirm this is your public contact address
  // e.g. { label: "Instagram", url: "https://instagram.com/..." }
  socials: [{ label: "Instagram", url: "" }, { label: "Vimeo", url: "" }, { label: "LinkedIn", url: "" }],
  hero: {
    image: "home/head", // head-1280.webp / head-2560.webp
    video: "home/head.mp4", // optional — add site/media/home/head.mp4 and it plays automatically
  },
};

// Logos shown in the "Selected clients" strip, in this order.
export const clients = [
  { name: "Heineken", logo: "clients/heineken.webp" },
  { name: "Coca-Cola", logo: "clients/coca-cola.webp" },
  { name: "Lexus", logo: "clients/lexus.webp" },
  { name: "Toyota", logo: "clients/toyota.webp" },
  { name: "El Águila", logo: "clients/el-aguila.webp" },
  { name: "WPP Production", logo: "clients/wpp-production.webp" },
  { name: "Meliá Hotels & Resorts", logo: "clients/melia.webp" },
  { name: "Boots", logo: "clients/boots.webp" },
  { name: "Soap & Glory", logo: "clients/soap-and-glory.webp" },
  { name: "Osborne", logo: "clients/osborne.webp" },
  { name: "Anaya", logo: "clients/anaya.webp" },
  { name: "Wichita", logo: "clients/wichita.webp" },
  { name: "Uncommonsense", logo: "clients/uncommonsense.webp" },
  { name: "Graphomedia", logo: "clients/graphomedia.webp" },
];

// Projects, in the order they appear on the home page.
//
// cover:  base name of the cover image (cover-960.webp / cover-1920.webp …)
// focus:  which part of the cover to keep when it's cropped into a card (CSS object-position)
// blocks: what appears on the project page, top to bottom:
//   { type: "film", src, poster }               one large video with controls
//   { type: "loops", items: [{ src, poster }] } short clips that play silently on loop (with a sound button)
//   { type: "verticals", items: [{ src, poster, caption }] }  9:16 videos with controls
//   { type: "stills", layout: "wide" | "portrait" | "gate", items: [{ src, alt }] }
export const projects = [
  {
    slug: "kill-the-boy",
    title: "Kill the Boy",
    client: "Wichita",
    year: "",
    role: "",
    summary: "",
    cover: { src: "kill-the-boy/cover", alt: "A barn owl perched on a dead tree against a pale sky", focus: "50% 50%" },
    blocks: [
      {
        type: "loops",
        items: ["01", "02", "03", "04", "06", "07"].map((n) => ({
          src: `kill-the-boy/vfx-${n}.mp4`,
          poster: `kill-the-boy/vfx-${n}.webp`,
        })),
      },
      {
        type: "stills",
        layout: "gate",
        items: [
          { src: "kill-the-boy/still-fire", alt: "A farmhouse burning in a field under a heavy sky" },
          { src: "kill-the-boy/still-field", alt: "A man in a dark suit lying in long grass" },
        ],
      },
    ],
    credits: [],
  },
  {
    slug: "el-aguila",
    title: "El Águila",
    client: "El Águila",
    year: "",
    role: "",
    summary: "",
    cover: { src: "el-aguila/cover", alt: "El Águila campaign still: a man relaxing in an armchair with a beer", focus: "50% 40%" },
    blocks: [
      {
        type: "verticals",
        items: ["01", "02", "03", "04"].map((n) => ({ src: `el-aguila/spot-${n}.mp4`, poster: `el-aguila/spot-${n}.webp`, caption: "" })),
      },
      {
        type: "stills",
        layout: "portrait",
        items: [
          { src: "el-aguila/still-01", alt: "El Águila campaign still: friends toasting on a rooftop" },
          { src: "el-aguila/still-02", alt: "El Águila campaign still: two friends drinking at sunset" },
          { src: "el-aguila/still-03", alt: "El Águila campaign still: friends on a sofa among moving boxes" },
          { src: "el-aguila/still-04", alt: "El Águila campaign still: a man in an armchair by a bookshelf" },
        ],
      },
    ],
    credits: [],
  },
  {
    slug: "uncommonsense",
    title: "Uncommonsense",
    client: "Uncommonsense",
    year: "",
    role: "",
    summary: "",
    cover: { src: "uncommonsense/cover", alt: "Profile of a young man in a beige hood, Uncommonsense wordmark", focus: "50% 47%" },
    blocks: [
      {
        type: "verticals",
        items: [
          { src: "uncommonsense/catwalk.mp4", poster: "uncommonsense/catwalk.webp", caption: "Catwalk" },
          { src: "uncommonsense/heist.mp4", poster: "uncommonsense/heist.webp", caption: "Heist" },
          { src: "uncommonsense/nightmare.mp4", poster: "uncommonsense/nightmare.webp", caption: "Nightmare" },
          { src: "uncommonsense/fridge.mp4", poster: "uncommonsense/fridge.webp", caption: "Fridge" },
          { src: "uncommonsense/cem.mp4", poster: "uncommonsense/cem.webp", caption: "CEM" },
          // Too large to copy from Drive automatically — add them to site/media/uncommonsense/ to show them:
          { src: "uncommonsense/giveaway.mp4", poster: "uncommonsense/giveaway.webp", caption: "Giveaway" },
          { src: "uncommonsense/photobooth.mp4", poster: "uncommonsense/photobooth.webp", caption: "Photobooth" },
        ],
      },
    ],
    credits: [],
  },
  {
    slug: "lexus",
    title: "Lexus",
    client: "Lexus",
    year: "",
    role: "",
    summary: "",
    cover: { src: "lexus/cover", alt: "Close-up of a young man's face beside a window, Lexus logo", focus: "50% 50%" },
    blocks: [{ type: "film", src: "lexus/film.mp4", poster: "lexus/film.webp" }],
    credits: [],
  },
  {
    slug: "wpp-virtual-production",
    title: "Virtual Production",
    client: "WPP Production",
    year: "",
    role: "",
    summary: "",
    cover: { src: "wpp-virtual-production/cover", alt: "A woman with her face turned up into heavy rain, WPP Production logo", focus: "50% 40%" },
    blocks: [
      // Too large to copy from Drive automatically (vp_video.mp4) — add it as site/media/wpp-virtual-production/film.mp4:
      { type: "film", src: "wpp-virtual-production/film.mp4", poster: "wpp-virtual-production/frame-02-1920.webp" },
      {
        type: "stills",
        layout: "wide",
        items: [
          { src: "wpp-virtual-production/frame-01", alt: "A woman in sunglasses on a deckchair on a tropical beach" },
          { src: "wpp-virtual-production/frame-02", alt: "Behind the scenes on an LED-volume stage with a snowy backdrop" },
          { src: "wpp-virtual-production/frame-03", alt: "Close-up of a woman in a headscarf in warm desert light" },
          { src: "wpp-virtual-production/frame-04", alt: "A woman in a headscarf in a desert at dusk" },
          { src: "wpp-virtual-production/frame-05", alt: "A woman with her face turned up into heavy rain" },
          { src: "wpp-virtual-production/frame-06", alt: "A woman working late at a laptop in an office" },
        ],
      },
    ],
    credits: [],
  },
  {
    slug: "toyota",
    title: "Toyota",
    client: "Toyota",
    year: "",
    role: "",
    summary: "",
    cover: { src: "toyota/cover", alt: "An older man in a plaid shirt in a wooden barn, Toyota logo", focus: "50% 35%" },
    blocks: [],
    credits: [],
  },
  {
    slug: "anaya",
    title: "Anaya",
    client: "Anaya",
    year: "",
    role: "",
    summary: "",
    cover: { src: "anaya/cover", alt: "A girl with long, tangled hair in a rocky landscape, Anaya logo", focus: "50% 30%" },
    blocks: [],
    credits: [],
  },
  {
    slug: "bionic-awards",
    title: "Bionic Awards",
    client: "Bionic Awards",
    year: "",
    role: "",
    summary: "",
    cover: { src: "bionic-awards/cover", alt: "Black-and-white portrait of a boxer in the ring, Bionic Awards logo", focus: "50% 40%" },
    blocks: [],
    credits: [],
  },
];
