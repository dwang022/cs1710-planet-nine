// Three small diagrams for the planet definition on the planets page, one per
// requirement. Pure markup (300 × 170 boxes) drawn with the sprite's bodies
// where one fits; pages/planets.js drops them into the .definition list.

const body = (name, x, y, s, extra = '') =>
  `<use href="#art-${name}" x="${(x - s / 2).toFixed(1)}" y="${(y - s / 2).toFixed(1)}" width="${s}" height="${s}"${extra}/>`

// A short arrow from radius r0 to r1 at angle a (radians) around (cx, cy), pointing inward.
function inward (cx, cy, r0, r1, a) {
  const c = Math.cos(a), s = Math.sin(a)
  const x0 = cx + r0 * c, y0 = cy + r0 * s, x1 = cx + r1 * c, y1 = cy + r1 * s
  const hx = -c * 5, hy = -s * 5, px = -s * 4, py = c * 4
  return `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)}" stroke="#ece6d8" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M${(x1 - hx + px).toFixed(1)},${(y1 - hy + py).toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} L${(x1 - hx - px).toFixed(1)},${(y1 - hy - py).toFixed(1)}" fill="none" stroke="#ece6d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
}

// A small seeded generator so the debris is the same on every visit.
function lcg (seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 } }

// A lumpy body: three overlapping discs, outlined by a slightly larger dark copy underneath.
function lump (x, y) {
  const parts = [[x - 6, y - 10, 26], [x + 18, y + 6, 19], [x - 12, y + 14, 17], [x + 10, y - 20, 12]]
  const ring = parts.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="#4a4642"/>`).join('')
  const fill = parts.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#6f6a66"/>`).join('')
  return `<g opacity=".85">${ring}${fill}</g>`
}

const open = `<svg viewBox="0 0 300 170" aria-hidden="true">`

export const RULE_ART = {
  // 1. Orbits the Sun: a planet on its path round the Sun; a moon loops the planet instead.
  orbit: () => `${open}
    <ellipse cx="128" cy="88" rx="104" ry="56" fill="none" stroke="#5a5a64" stroke-width="1.5"/>
    <path d="M135,27 l-7,5 l7,5" fill="none" stroke="#c7c5bc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${body('sun', 128, 88, 60)}
    <ellipse cx="232" cy="88" rx="30" ry="15" fill="none" stroke="#8c8b83" stroke-width="1.2" stroke-dasharray="2 4" opacity=".8"/>
    ${body('earth', 232, 88, 30)}
    ${body('moon', 262, 94, 11)}
  </svg>`,

  // 2. Is round: a lump that its own gravity has pulled into a ball.
  round: () => `${open}
    ${lump(84, 86)}
    <path d="M132,86 h34 m-9,-9 l9,9 l-9,9" fill="none" stroke="#c7c5bc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${body('ceres', 226, 86, 62)}
    ${[0, 1, 2, 3, 4, 5].map(i => inward(226, 86, 58, 42, i * Math.PI / 3 + Math.PI / 6)).join('')}
  </svg>`,

  // 3. Has cleared its orbit: debris everywhere except a swept lane along the planet's path.
  cleared: () => {
    const cx = -150, cy = 85, R = 300
    const rnd = lcg(2006)
    const dots = []
    while (dots.length < 120) {
      const x = rnd() * 300, y = rnd() * 170
      if (Math.abs(Math.hypot(x - cx, y - cy) - R) > 24) dots.push({ x, y, r: 1 + rnd() * 1.6 })
    }
    return `${open}
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#ffffff" stroke-opacity=".035" stroke-width="46"/>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#5a5a64" stroke-width="1.5"/>
      ${dots.map(d => `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r.toFixed(1)}" fill="#8c8b83"/>`).join('')}
      ${body('jupiter', 150, 85, 44)}
    </svg>`
  },
}
