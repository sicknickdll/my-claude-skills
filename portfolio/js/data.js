// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO CONTENT — this is the only file you need to edit to change projects.
//
// Each project:
//   id              short unique name, used in the URL (#project/<id>)
//   brand / title   shown on the project page (title is hidden if it equals brand)
//   type            small label under the title (e.g. "TVC", "VFX")
//   description     the "About the project" text (use \n\n for a new paragraph)
//   cover           full-screen image used in the Film / Visuals scroll
//   images          optional vertical image gallery
//   videos          optional .webm files; a matching .mp4 with the same name must
//                   sit next to each one (Safari / older iPhones play the .mp4)
//   videoPosters    still frame shown before each video plays (same order)
//   videoThumbnails small previews under the video carousel (same order)
//   videoRatios     width ÷ height of each video, e.g. 16/9 → 1.777, 9/16 → 0.5625
//   youtube         optional YouTube embed URL (replaces local videos)
//   externalVideo   optional Vimeo link (embedded + "Open film on Vimeo" link)
//
// The order of `projects` is the order of the "Next project" links.
// `filmOrder` and `visualsOrder` decide what appears in each section, in order.
// ─────────────────────────────────────────────────────────────────────────────
export const projects = [
  {
    id: "uncommonsense",
    brand: "UNCOMMONSENSE",
    title: "UNCOMMONSENSE",
    type: "Social Media Content & Fashion",
    description:
      "UNCOMMONSENSE is an accessories brand founded by @Ohh.Ginger. For the brand, I create end-to-end AI-native campaigns, developing everything from the initial concept and creative direction to image generation, video production, sound design, and final editing. \n\nThe work blends fashion, surrealism, and contemporary visual culture to build distinctive visual narratives, while maintaining strict consistency across characters, products, materials, and textures to faithfully represent the physical product in highly stylized environments.",
    cover: "/assets/uncommonsense-header.webp",
    images: [],
    videos: [
      "/assets/pgvXtdMshKqmetkpEhgM2k1TI.webm",
      "/assets/Ste489lG9zmVBFJeCYP9xDo.webm",
      "/assets/Vfrnp4LUs7aaOAevNvmhbI8FJrw.webm",
      "/assets/3z5frFOL28vZ40IlJCXbcUgW0pc.webm",
      "/assets/FD1kZsJlQdpOLlGLrAbnlQFTPA.webm",
      "/assets/GWH2DGkArjGgTWVAw8hsv6C5rxM.webm",
      "/assets/i7MWkcoSeItRmxvFvuUf3tTLM.webm",
    ],
    youtube: null,
    videoPosters: [
      "/assets/pgvXtdMshKqmetkpEhgM2k1TI-poster.webp",
      "/assets/Ste489lG9zmVBFJeCYP9xDo-poster.webp",
      "/assets/Vfrnp4LUs7aaOAevNvmhbI8FJrw-poster.webp",
      "/assets/3z5frFOL28vZ40IlJCXbcUgW0pc-poster.webp",
      "/assets/FD1kZsJlQdpOLlGLrAbnlQFTPA-poster.webp",
      "/assets/GWH2DGkArjGgTWVAw8hsv6C5rxM-poster.webp",
      "/assets/i7MWkcoSeItRmxvFvuUf3tTLM-poster.webp",
    ],
    videoThumbnails: [
      "/assets/pgvXtdMshKqmetkpEhgM2k1TI-thumb.webp",
      "/assets/Ste489lG9zmVBFJeCYP9xDo-thumb.webp",
      "/assets/Vfrnp4LUs7aaOAevNvmhbI8FJrw-thumb.webp",
      "/assets/3z5frFOL28vZ40IlJCXbcUgW0pc-thumb.webp",
      "/assets/FD1kZsJlQdpOLlGLrAbnlQFTPA-thumb.webp",
      "/assets/GWH2DGkArjGgTWVAw8hsv6C5rxM-thumb.webp",
      "/assets/i7MWkcoSeItRmxvFvuUf3tTLM-thumb.webp",
    ],
    videoRatios: [
      1.3333333333333333, 0.5625, 0.5625, 0.557632398753894, 0.5592515592515592, 0.557632398753894,
      0.5628930817610063,
    ],
  },
  {
    id: "toyota",
    brand: "Toyota",
    title: "Ma Toyota est Fantastique",
    type: "Digital Asset",
    description:
      'For Toyota France\'s "Ma Toyota est Fantastique" campaign, I created a photorealistic de-aged portrait of the lead actor alongside the featured vehicle. The asset was printed and used directly on set, with a focus on identity consistency, visual authenticity, and accurate vehicle detailing to seamlessly integrate with the live-action production.\n\nProperty of WPP Production / WPP Holding. Featured here to showcase my contribution as part of the production and creative team.',
    cover: "/assets/toyota-header.webp",
    images: ["/assets/DTlMGv30IEOltcth8y1RmJJoVug.webp"],
    videos: [],
    youtube:
      "https://www.youtube.com/embed/Zykwz9wTaG4?v=Zykwz9wTaG4&iv_load_policy=3&rel=0&modestbranding=1&playsinline=1&autoplay=0&color=white",
  },
  {
    id: "lexus",
    brand: "Lexus",
    title: "Electrified",
    type: "TVC",
    description:
      "AI-generated TV commercial created for the Lexus Electrified series. Working alongside filmmakers, 3D artists, and expert photoretouchers, I helped develop a premium visual pipeline that delivered the cinematic quality, vehicle accuracy, and refined aesthetics expected from a Lexus campaign.\n\nProperty of WPP Production / WPP Holding. Featured here to showcase my contribution as part of the production and creative team.",
    cover: "/assets/lexus-header.webp",
    images: [],
    videos: ["/assets/q65cZYQLVwWuvK4CaJ99qUKYaI0.webm"],
    youtube: null,
    videoPosters: ["/assets/q65cZYQLVwWuvK4CaJ99qUKYaI0-poster.webp"],
    videoThumbnails: ["/assets/q65cZYQLVwWuvK4CaJ99qUKYaI0-thumb.webp"],
    videoRatios: [0.8],
  },
  {
    id: "elaguila",
    brand: "El Águila",
    title: "La hora dorada",
    type: "Virtual Production",
    description:
      "For El Águila's \"La Hora Dorada\" campaign, I designed AI-generated virtual production backgrounds that served as extensions of the physical set. Collaborating closely with both the director and DOP, I crafted environments that aligned with the project's visual language, matching light, composition, and atmosphere to achieve a cohesive final image.\n\nProperty of WPP Production / WPP Holding. Featured here to showcase my contribution as part of the production and creative team.",
    cover: "/assets/elaguila-header.webp",
    images: [
      "/assets/EbUqwZS95KiNcYsKBk3UANSNwE.webp",
      "/assets/yIEYV8vCubp6Kj2aMdWp37H2M.webp",
      "/assets/D7gRk6cgnwsXzD7ZpcUlbGip1QY.webp",
    ],
    videos: [
      "/assets/dtWaKoY1sNjmQihjqZxhqg2lUw.webm",
      "/assets/8fGBCk6oQ0OAD5GdSgJchhMk44.webm",
      "/assets/2whYpxgd3GAUPGqDR5SeGZ1CBAM.webm",
      "/assets/0LWzJpUVqcUeFipZK5FL9GiADM.webm",
    ],
    youtube: null,
    videoPosters: [
      "/assets/dtWaKoY1sNjmQihjqZxhqg2lUw-poster.webp",
      "/assets/8fGBCk6oQ0OAD5GdSgJchhMk44-poster.webp",
      "/assets/2whYpxgd3GAUPGqDR5SeGZ1CBAM-poster.webp",
      "/assets/0LWzJpUVqcUeFipZK5FL9GiADM-poster.webp",
    ],
    videoThumbnails: [
      "/assets/dtWaKoY1sNjmQihjqZxhqg2lUw-thumb.webp",
      "/assets/8fGBCk6oQ0OAD5GdSgJchhMk44-thumb.webp",
      "/assets/2whYpxgd3GAUPGqDR5SeGZ1CBAM-thumb.webp",
      "/assets/0LWzJpUVqcUeFipZK5FL9GiADM-thumb.webp",
    ],
    videoRatios: [0.5625, 0.5625, 0.5625, 0.5625],
  },
  {
    id: "melia",
    brand: "Meliá",
    title: "Hotel Meliá",
    type: "Social Media Content",
    description:
      "For Meliá Hotels International, I produced social media videos blending AI-generated content with existing hotel assets. \n\nEvery piece was designed to reflect real destinations and experiences, ensuring brand authenticity, visual consistency, and a premium aesthetic across all deliverables.\n\nProperty of WPP Production / WPP Holding. Featured here to showcase my contribution as part of the production and creative team.",
    cover: "/assets/YdNyD17WHUrTAhLwd8H2m4OCiio.webp",
    images: [],
    videos: [
      "/assets/9o6UGKJle9O9wkuKGqdLwOqjB2w.webm",
      "/assets/zSZrThHWODZG0ReCYFLVQcZv8fk.webm",
    ],
    youtube: null,
    videoPosters: [
      "/assets/9o6UGKJle9O9wkuKGqdLwOqjB2w-poster.webp",
      "/assets/zSZrThHWODZG0ReCYFLVQcZv8fk-poster.webp",
    ],
    videoThumbnails: [
      "/assets/9o6UGKJle9O9wkuKGqdLwOqjB2w-thumb.webp",
      "/assets/zSZrThHWODZG0ReCYFLVQcZv8fk-thumb.webp",
    ],
    videoRatios: [0.5625, 0.5625],
  },
  {
    id: "wichita",
    brand: "Wichita Production",
    title: "Kill the Boy",
    type: "VFX",
    description:
      "Created the VFX for a Wichita Production music video using a hybrid workflow that combined live-action footage, image inpainting, and video-to-video techniques. Animated and integrated digital assets while maintaining visual consistency and supporting the director’s creative vision.",
    cover: "/assets/wichita-header.webp",
    images: ["/assets/ktb-still.webp", "/assets/ktb-head.webp", "/assets/ktb-head2.webp"],
    videos: [
      "/assets/ktb-film.webm",
      "/assets/ktb-vfx-01.webm",
      "/assets/ktb-vfx-02.webm",
      "/assets/ktb-vfx-03.webm",
      "/assets/ktb-vfx-04.webm",
      "/assets/ktb-vfx-06.webm",
      "/assets/ktb-vfx-07.webm",
    ],
    youtube: null,
    videoPosters: [
      "/assets/ktb-film-poster.webp",
      "/assets/ktb-vfx-01-poster.webp",
      "/assets/ktb-vfx-02-poster.webp",
      "/assets/ktb-vfx-03-poster.webp",
      "/assets/ktb-vfx-04-poster.webp",
      "/assets/ktb-vfx-06-poster.webp",
      "/assets/ktb-vfx-07-poster.webp",
    ],
    videoThumbnails: [
      "/assets/ktb-film-thumb.webp",
      "/assets/ktb-vfx-01-thumb.webp",
      "/assets/ktb-vfx-02-thumb.webp",
      "/assets/ktb-vfx-03-thumb.webp",
      "/assets/ktb-vfx-04-thumb.webp",
      "/assets/ktb-vfx-06-thumb.webp",
      "/assets/ktb-vfx-07-thumb.webp",
    ],
    videoRatios: [
      1.8962962962962964, 1.8962962962962964, 1.8962962962962964, 1.8962962962962964,
      1.8962962962962964, 1.8962962962962964, 1.8962962962962964,
    ],
  },
  {
    id: "anaya",
    externalVideo: "https://vimeo.com/1199356201?share=copy&fl=sv&fe=ci",
    brand: "Anaya",
    title: "ANAYA",
    type: "Educational Video",
    description:
      "Created and produced a series of educational animated videos for Anaya, one of Spain’s leading educational publishers, aimed at primary school students (Grades 1–5). The projects included animated stories, literary adaptations, and informative learning content designed to support classroom education and independent learning.\n\nResponsible for the visual development, art direction, storyboard and frame creation, animation, and overall creative vision of each video. Working from editorial scripts, I translated educational content into engaging visual narratives while ensuring consistency with Anaya’s established visual identity and pedagogical objectives.\n\nAll productions featured narration by acclaimed Spanish voice actor Álvaro Mendoza, contributing to an accessible and engaging learning experience for young audiences.",
    cover: "/assets/anaya-header.webp",
    images: [],
    videos: [],
    youtube: null,
  },
  {
    id: "wppproduction",
    brand: "WPP Production",
    title: "Virtual Production",
    type: "Virtual Production",
    description:
      "A pilot project exploring how AI-generated environments can be integrated into Virtual Production workflows. Crafted on set of WPP Production (old name Hogarth).\n\nProperty of WPP Production / WPP Holding. Featured here to showcase my contribution as part of the production and creative team.",
    cover: "/assets/wppproduction-header.webp",
    images: [
      "/assets/tCWzlzIAE7jQHlAVps91sxPcyj8.webp",
      "/assets/jc4FOKsSx1h4P4kwI6ODDCKpm9Q.webp",
      "/assets/9hyo0VkCbLoEIrXSuxcA1SIr6c.webp",
      "/assets/naOAPUvjZFYi85q78GDLS8IER0.webp",
      "/assets/ioNHN6Zjwan6br7R43sdHv4a2uQ.webp",
      "/assets/MnxhisGIRkQF5Rp4UtkNeOmCVQg.webp",
    ],
    videos: ["/assets/Ldb4lUOdpBMLqQgyUIvXayYlE.webm"],
    youtube: null,
    videoPosters: ["/assets/Ldb4lUOdpBMLqQgyUIvXayYlE-poster.webp"],
    videoThumbnails: ["/assets/Ldb4lUOdpBMLqQgyUIvXayYlE-thumb.webp"],
    videoRatios: [1.7777777777777777],
  },
  {
    id: "soapandglory",
    brand: "Soap & Glory",
    title: "Soap & Glory",
    type: "AI Product Shot",
    description:
      "A series of AI-crafted beauty visuals for Soap & Glory, blending playful, fragrance-inspired worlds with precise product reproduction. Working alongside expert photoretouchers, I developed campaign-ready imagery that preserves packaging accuracy, material realism, and texture detail while pushing the creative possibilities beyond traditional product photography.\n\nProperty of WPP Production / WPP Holding. Featured here to showcase my contribution as part of the production and creative team.",
    cover: "/assets/fQqLobjVjQLcjn0oYAmyuUyPAs.webp",
    images: [
      "/assets/SKCYB8BMwkneaPvdQDQqhbuyVKE.webp",
      "/assets/VsTh5pQROkDtulNoeTzjH4oFN10.webp",
      "/assets/WPCII4Q6wfoAC5QLMGvrtZzfiMg.webp",
      "/assets/ZNevGqjeZtnNwmtIkJQYvFLGwNI.webp",
      "/assets/qxYVszQfCWqf8VjXjMmMxJaTd9I.webp",
    ],
    videos: [],
    youtube: null,
  },
];

// Sections shown in the top navigation, as lists of project ids.
// The landing page shows the hero video followed by the film list.
export const filmOrder = [
  "uncommonsense",
  "toyota",
  "lexus",
  "elaguila",
  "melia",
  "wichita",
  "anaya",
  "wppproduction",
];
export const visualsOrder = ["soapandglory", "toyota", "elaguila", "anaya", "wppproduction"];

// Landing page background loop (an .mp4 with the same name is the Safari fallback).
export const hero = "/assets/anime-eye.webm";
export const heroPoster = "/assets/anime-eye-poster.webp";
