// The page's small cast of illustrated bodies: the Planet Nine mark, the Sun,
// the eight planets, a sad Pluto, and three generic trans-Neptunian objects.
//
// Flat shapes, a darker outline in the body's own hue, soft wavy bands and a
// thin "halo" ring, after the Outer Wilds planetary chart, but muted so they
// sit behind the data instead of competing with it. Planet Nine's halo is
// dashed: it is the one body here nobody has seen.
//
// Pure: every function returns a markup string and nothing touches the DOM,
// so scripts/export_art.mjs can run this file in Node to write the standalone
// SVG and PNG files in public/art/. In the page, main.js injects sprite() once
// and charts draw a body with <use href="#art-NAME">.

const R = 40                 // body radius inside the 100 x 100 box
const HALO_R = 46.5

let seq = 0
const uid = () => `a${(seq++).toString(36)}`

// --- helpers ---------------------------------------------------------------

const clip = (id, r = R) => `<clipPath id="${id}-c"><circle cx="50" cy="50" r="${r}"/></clipPath>`
const disc = (fill, r = R) => `<circle cx="50" cy="50" r="${r}" fill="${fill}"/>`
const outline = (stroke, r = R, w = 2.5) => `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${stroke}" stroke-width="${w}"/>`

/** A band with soft wavy edges; the caller clips it to the disc. */
function band (y, h, fill, opacity = 1, amp = 2.2) {
  const y2 = y + h
  return `<path d="M0,${y} C25,${y - amp} 40,${y + amp} 60,${y} S90,${y - amp} 100,${y + amp / 2} ` +
    `L100,${y2 + amp} C80,${y2 - amp} 60,${y2 + amp} 40,${y2} S15,${y2 - amp} 0,${y2 + amp / 2} Z" ` +
    `fill="${fill}" opacity="${opacity}"/>`
}

/** The night side: a big offset circle, clipped to the disc, shades the right limb. */
const shade = (opacity = 0.32, r = R) => `<circle cx="${50 + r * 0.52}" cy="50" r="${r}" fill="#06100e" opacity="${opacity}"/>`

/** The thin ring the Outer Wilds chart draws round each body. */
const halo = (dashed = false, r = HALO_R) =>
  `<circle cx="50" cy="50" r="${r}" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.4"` +
  (dashed ? ' stroke-dasharray="2.5 3.5"' : '') + '/>'

const FONT = "ui-sans-serif, -apple-system, 'SF Pro Text', 'Segoe UI', Inter, system-ui, sans-serif"

/** The question mark: Planet Nine is a prediction, and the mark says so at any size. */
const QMARK = `<text x="50" y="67" text-anchor="middle" font-family="${FONT}" font-size="48" font-weight="700" fill="#e6f4ef" stroke="#1b3a32" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke">?</text>`

// --- Planet Nine -----------------------------------------------------------

function planetNineBody (id, { halo: ring = true } = {}) {
  return `<g clip-path="url(#${id}-c)">
    ${disc('#3b6d60')}
    ${band(29, 8, '#487f71')}
    ${band(46, 11, '#2f5b50')}
    ${band(66, 6, '#487f71', 0.9)}
    <ellipse cx="37" cy="25" rx="11" ry="5" fill="#6a9d8d" opacity="0.4"/>
    ${shade(0.36)}
  </g>
  ${outline('#1b3a32')}
  ${QMARK}
  ${ring ? halo(true) : ''}`
}

/** Pluto: the heart-shaped plain, two craters; a face only for the moment it is reclassified. */
function plutoBody (id, sad) {
  return `<g clip-path="url(#${id}-c)">
      ${disc('#c7ad95')}
      <path d="M62,72 C50,64 52,54 59,57 C61,59 61,59 65,57 C72,54 74,64 62,72 Z" fill="#ece0d0"/>
      <circle cx="30" cy="34" r="4" fill="#ad927a"/><circle cx="68" cy="30" r="3" fill="#ad927a"/>
      ${shade(0.26)}
    </g>${outline('#85684f')}` + (sad ? `
    <g fill="#3a2a1e" stroke="#3a2a1e" stroke-width="2.5" stroke-linecap="round">
      <circle cx="37" cy="41" r="2.7" stroke="none"/><circle cx="49" cy="41" r="2.7" stroke="none"/>
      <path d="M32,36 L39,33 M54,33 L61,36" fill="none"/>
      <path d="M36,54 Q43,48 50,54" fill="none"/>
    </g>
    <ellipse cx="51" cy="48" rx="1.8" ry="3" fill="#9fd8e0"/>` : '')
}

// --- the catalogue ---------------------------------------------------------
//
// Each entry: a label for assistive tech, an optional box (default 100 x 100),
// defs(id) for anything that needs a document-unique id, and body(id, opts).

export const ART = {
  'planet-nine': {
    label: 'Planet Nine, the predicted planet: a muted teal world with a dashed ring, because no one has seen it',
    defs: id => clip(id),
    body: id => planetNineBody(id, { halo: true }),
  },
  'planet-nine-mark': {
    label: 'Planet Nine',
    defs: id => clip(id),
    body: id => planetNineBody(id, { halo: false }),
  },
  'planet-nine-mono': {
    label: 'Planet Nine',
    defs: id => clip(id),
    body: () => `<circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="5"/>
    <text x="50" y="67" text-anchor="middle" font-family="${FONT}" font-size="50" font-weight="700" fill="currentColor">?</text>
    <circle cx="50" cy="50" r="${HALO_R}" fill="none" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.4" stroke-dasharray="2.5 3.5"/>`,
  },
  'planet-nine-lockup': {
    label: 'The evidence for Planet Nine',
    box: [360, 100],
    defs: id => clip(id),
    body: id => `<g transform="translate(50 50) scale(0.88) translate(-50 -50)">${planetNineBody(id)}</g>
    <text x="106" y="43" font-family="${FONT}" font-size="11" font-weight="600" letter-spacing="3.2" fill="currentColor" opacity="0.6">THE EVIDENCE FOR</text>
    <text x="106" y="75" font-family="${FONT}" font-size="28" font-weight="700" letter-spacing="2.6" fill="currentColor">PLANET NINE</text>`,
  },

  // --- the Sun ---
  sun: {
    label: 'The Sun',
    defs: id => `<radialGradient id="${id}-g" cx="42%" cy="40%" r="65%">
        <stop offset="0" stop-color="#fbe49a"/><stop offset="0.55" stop-color="#f3c660"/><stop offset="1" stop-color="#e59a3c"/>
      </radialGradient>
      <radialGradient id="${id}-h"><stop offset="0.7" stop-color="#f3c660" stop-opacity="0.35"/><stop offset="1" stop-color="#f3c660" stop-opacity="0"/></radialGradient>`,
    body: id => {
      const rays = []
      for (let k = 0; k < 12; k++) {
        const t = (k * 30 + 15) * Math.PI / 180, dt = 6 * Math.PI / 180
        const p = (r, a) => `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`
        rays.push(`M${p(39, t - dt)} L${p(48, t)} L${p(39, t + dt)} Z`)
      }
      return `<circle cx="50" cy="50" r="50" fill="url(#${id}-h)"/>
      <path d="${rays.join(' ')}" fill="#efb24e" opacity="0.8"/>
      <circle cx="50" cy="50" r="38" fill="url(#${id}-g)"/>
      <circle cx="40" cy="42" r="8" fill="#ffffff" opacity="0.14"/>
      <circle cx="59" cy="59" r="5" fill="#c9802d" opacity="0.22"/>
      ${outline('#c9802d', 38, 2)}`
    },
  },

  // --- the planets ---
  mercury: {
    label: 'Mercury',
    defs: id => clip(id),
    body: id => `<g clip-path="url(#${id}-c)">
      ${disc('#8c7f78')}
      <circle cx="38" cy="40" r="7" fill="#6e615a"/><circle cx="60" cy="58" r="5" fill="#6e615a"/>
      <circle cx="56" cy="34" r="3" fill="#6e615a"/><circle cx="42" cy="64" r="3" fill="#6e615a"/>
      ${shade(0.3)}
    </g>${outline('#55493f')}`,
  },
  venus: {
    label: 'Venus',
    defs: id => clip(id),
    body: id => `<g clip-path="url(#${id}-c)">
      ${disc('#d9b98a')}
      <path d="M18,42 C32,34 44,48 60,40 S86,36 92,44" fill="none" stroke="#efe0c3" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
      <path d="M12,62 C28,56 40,68 56,60 S80,56 90,64" fill="none" stroke="#efe0c3" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
      ${shade(0.26)}
    </g>${outline('#a0784a')}`,
  },
  earth: {
    label: 'Earth',
    defs: id => clip(id),
    body: id => `<g clip-path="url(#${id}-c)">
      ${disc('#4f86c6')}
      <path d="M26,30 C34,22 48,24 50,34 C52,42 44,46 38,50 C30,54 22,46 26,30 Z" fill="#5faa5f"/>
      <path d="M56,52 C64,46 76,52 74,62 C72,72 60,74 56,66 C52,60 52,56 56,52 Z" fill="#5faa5f"/>
      <path d="M40,66 C46,62 54,64 58,70" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
      <path d="M58,30 C64,28 70,30 74,34" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
      ${shade(0.3)}
    </g>${outline('#2d5a93')}`,
  },
  mars: {
    label: 'Mars',
    defs: id => clip(id),
    body: id => `<g clip-path="url(#${id}-c)">
      ${disc('#c1440e')}
      <path d="M30,46 C40,38 56,40 62,50 C66,58 56,66 46,64 C36,62 26,54 30,46 Z" fill="#9a3509" opacity="0.85"/>
      <ellipse cx="50" cy="13" rx="12" ry="5" fill="#f3e9df"/>
      ${shade(0.28)}
    </g>${outline('#7a2806')}`,
  },
  jupiter: {
    label: 'Jupiter',
    defs: id => clip(id),
    body: id => `<g clip-path="url(#${id}-c)">
      ${disc('#cfa57c')}
      ${band(31, 8, '#b57c55')}
      ${band(45, 6, '#e6cbac')}
      ${band(58, 10, '#b57c55')}
      <ellipse cx="62" cy="61" rx="9" ry="5" fill="#c45a3b" stroke="#a6462c" stroke-width="1"/>
      ${shade(0.3)}
    </g>${outline('#8d6141')}`,
  },
  saturn: {
    label: 'Saturn',
    defs: id => `${clip(id, 27)}<clipPath id="${id}-f" clipPathUnits="userSpaceOnUse"><rect x="-10" y="50" width="120" height="60"/></clipPath>`,
    body: id => `<g transform="rotate(-18 50 50)">
      <ellipse cx="50" cy="50" rx="46" ry="11" fill="none" stroke="#cdb882" stroke-width="7" opacity="0.9"/>
    </g>
    <g clip-path="url(#${id}-c)">
      ${disc('#e3d6a8', 27)}
      ${band(40, 5, '#cbb97f', 0.8, 1.4)}
      ${band(52, 6, '#f1e8c8', 0.9, 1.4)}
      ${shade(0.26, 27)}
    </g>${outline('#a8955f', 27)}
    <g transform="rotate(-18 50 50)" clip-path="url(#${id}-f)">
      <ellipse cx="50" cy="50" rx="46" ry="11" fill="none" stroke="#cdb882" stroke-width="7" opacity="0.95"/>
      <ellipse cx="50" cy="50" rx="46" ry="11" fill="none" stroke="#9a8853" stroke-width="1" opacity="0.6"/>
    </g>`,
  },
  uranus: {
    label: 'Uranus',
    defs: id => clip(id),
    body: id => `<g clip-path="url(#${id}-c)">
      ${disc('#9fd8e0')}
      ${band(56, 8, '#bde7ec', 0.9, 1.6)}
      ${shade(0.24)}
    </g>${outline('#5aa3ad')}
    <ellipse cx="50" cy="50" rx="6" ry="47" fill="none" stroke="#d9f1f4" stroke-width="2.5" opacity="0.55" transform="rotate(12 50 50)"/>`,
  },
  neptune: {
    label: 'Neptune',
    defs: id => clip(id),
    body: id => `<g clip-path="url(#${id}-c)">
      ${disc('#3f66c9')}
      ${band(30, 7, '#5a7fd6', 0.8)}
      <ellipse cx="58" cy="57" rx="10" ry="6" fill="#2c4ea6"/>
      <path d="M28,42 C36,36 46,38 54,36" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
      ${shade(0.3)}
    </g>${outline('#253f8f')}`,
  },
  pluto: {
    label: 'Pluto',
    defs: id => clip(id),
    body: id => plutoBody(id, false),
  },
  'pluto-sad': {
    label: 'Pluto, at the moment it stopped being a planet',
    defs: id => clip(id),
    body: id => plutoBody(id, true),
  },

  // --- two more for the "what counts as a planet" table ---
  moon: {
    label: 'The Moon',
    defs: id => clip(id, 30),
    body: id => `<g clip-path="url(#${id}-c)">
      ${disc('#b9b4ad', 30)}
      <circle cx="40" cy="42" r="6" fill="#8f8a83"/><circle cx="58" cy="56" r="4" fill="#8f8a83"/>
      <circle cx="56" cy="36" r="2.5" fill="#8f8a83"/><circle cx="44" cy="62" r="2.5" fill="#8f8a83"/>
      <ellipse cx="42" cy="34" rx="9" ry="5" fill="#dcd8d1" opacity="0.5"/>
      ${shade(0.3, 30)}
    </g>${outline('#6f6a63', 30)}`,
  },
  ceres: {
    label: 'Ceres, the largest body in the asteroid belt',
    defs: id => clip(id, 24),
    body: id => `<g clip-path="url(#${id}-c)">
      ${disc('#8f877c', 24)}
      <circle cx="42" cy="46" r="4.5" fill="#6d665c"/><circle cx="58" cy="58" r="3" fill="#6d665c"/>
      <circle cx="55" cy="40" r="3.6" fill="#f1ece4"/>
      ${shade(0.3, 24)}
    </g>${outline('#55504a', 24)}`,
  },

  // --- trans-Neptunian objects: three looks, so a swarm reads as many bodies ---
  'tno-1': {
    label: 'A trans-Neptunian object',
    body: () => `<path d="M22,44 C20,30 34,18 50,20 C66,18 80,30 80,46 C82,62 68,80 50,80 C32,82 18,66 22,44 Z" fill="#8d99a8" stroke="#4e5867" stroke-width="2.5" stroke-linejoin="round"/>
      <ellipse cx="40" cy="34" rx="10" ry="6" fill="#c4ccd6" opacity="0.5"/>
      <circle cx="40" cy="50" r="6" fill="#6b7584"/><circle cx="60" cy="62" r="4" fill="#6b7584"/><circle cx="58" cy="36" r="3" fill="#6b7584"/>`,
  },
  'tno-2': {
    label: 'A trans-Neptunian object, two lobes stuck together',
    body: () => `<g stroke="#5c5346" stroke-width="5"><circle cx="36" cy="52" r="22"/><circle cx="64" cy="46" r="17"/><ellipse cx="50" cy="50" rx="10" ry="8"/></g>
      <g fill="#a69d8d"><circle cx="36" cy="52" r="22"/><circle cx="64" cy="46" r="17"/><ellipse cx="50" cy="50" rx="10" ry="8"/></g>
      <ellipse cx="30" cy="42" rx="8" ry="5" fill="#d2cabb" opacity="0.5"/>
      <circle cx="40" cy="60" r="4" fill="#7f7667"/><circle cx="66" cy="50" r="3" fill="#7f7667"/>`,
  },
  'tno-3': {
    label: 'A trans-Neptunian object, icy and round',
    body: () => `<circle cx="50" cy="50" r="34" fill="#9db3c3" stroke="#566f80" stroke-width="2.5"/>
      <ellipse cx="40" cy="36" rx="12" ry="8" fill="#dbe8f0" opacity="0.55"/>
      <circle cx="60" cy="58" r="5" fill="#7d93a3"/><circle cx="44" cy="62" r="2.5" fill="#7d93a3"/>`,
  },
}

export const NAMES = Object.keys(ART)
export const PLANET_ART = { Mercury: 'mercury', Venus: 'venus', Earth: 'earth', Mars: 'mars', Jupiter: 'jupiter', Saturn: 'saturn', Uranus: 'uranus', Neptune: 'neptune', Pluto: 'pluto' }

const box = name => ART[name].box || [100, 100]

/**
 * A complete standalone <svg> for one body.
 *   size   rendered width in px (height follows the box)
 *   bg     'none' (transparent), 'dark' or 'light': a rounded tile behind it
 *   halo   add the thin ring round a real body (Planet Nine's is built in)
 *   color  what currentColor resolves to (the lockup's wordmark, the mono mark)
 */
export function svgMarkup (name, { size = 64, bg = 'none', halo: ring = false, color } = {}) {
  const a = ART[name]
  if (!a) throw new Error(`unknown art: ${name}`)
  const [bw, bh] = box(name)
  const id = uid()
  const fg = color || (bg === 'light' ? '#1a1a19' : '#ffffff')
  const tile = bg === 'none' ? ''
    : `<rect width="${bw}" height="${bh}" rx="${Math.min(bw, bh) * 0.16}" fill="${bg === 'light' ? '#f4f2ec' : '#121211'}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bw} ${bh}" width="${size}" height="${Math.round(size * bh / bw)}" role="img" aria-label="${a.label}" style="color:${fg}">` +
    `${tile}<defs>${a.defs?.(id) ?? ''}</defs>${a.body(id)}${ring && bw === 100 ? halo(false) : ''}</svg>`
}

/** One <symbol> per body, for a sprite. */
export function symbolMarkup (name) {
  const a = ART[name]
  const [bw, bh] = box(name)
  const id = `art-${name}`
  return `<symbol id="${id}" viewBox="0 0 ${bw} ${bh}"><defs>${a.defs?.(id) ?? ''}</defs>${a.body(id)}</symbol>`
}

/** The hidden sprite the page injects once; afterwards <use href="#art-NAME"> draws any body. */
export function sprite (names = NAMES) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>` +
    names.map(symbolMarkup).join('') + '</defs></svg>'
}

/** Inline use of a sprite symbol in HTML, sized by CSS (defaults to the .art class). */
export function inline (name, { cls = 'art', title } = {}) {
  const [bw, bh] = box(name)
  const t = title ? `<title>${title}</title>` : ''
  return `<svg class="${cls}" viewBox="0 0 ${bw} ${bh}" aria-hidden="${title ? 'false' : 'true'}" role="${title ? 'img' : 'presentation'}">${t}<use href="#art-${name}"/></svg>`
}
