// Three small diagrams for "from a few dots to an orbit" on the data page, in
// the manner of rulesart.js: pure markup in 300 × 170 boxes, the object in
// violet (--series-1), stars in the muted ink. pages/data.js drops them into
// the .definition list. Schematic: no positions here are measured.

const VIOLET = '#a78bfa', INK = '#c7c5bc', FAINT = '#5a5a64'

// A small seeded generator so the star field is the same on every visit.
function lcg (seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 } }

function stars (seed, n, box = [12, 12, 288, 158]) {
  const rnd = lcg(seed)
  let out = ''
  for (let k = 0; k < n; k++) {
    const x = box[0] + rnd() * (box[2] - box[0]), y = box[1] + rnd() * (box[3] - box[1]), r = 0.8 + rnd() * 1.6
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${INK}" opacity="${(0.35 + rnd() * 0.5).toFixed(2)}"/>`
  }
  return out
}

function arrow (x0, y0, x1, y1, colour = INK) {
  const a = Math.atan2(y1 - y0, x1 - x0), h = 6
  const p = t => `${(x1 - h * Math.cos(a + t)).toFixed(1)},${(y1 - h * Math.sin(a + t)).toFixed(1)}`
  return `<path d="M${x0},${y0} L${x1},${y1} M${p(0.5)} L${x1},${y1} L${p(-0.5)}" fill="none" stroke="${colour}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
}

const open = '<svg viewBox="0 0 300 170" aria-hidden="true">'

export const ORBIT_ART = {
  // 1. Find the mover: the same patch of sky on two nights, side by side. The stars
  // are the same in both frames, star for star; only the dot has moved, and the
  // second frame rings where it was. (One picture with a faint dot and an arrow
  // did not say that the stars were the same; readers asked why they would not move.)
  find: () => {
    const F = [[8, 26], [156, 26]], S = 136                    // the two frames' corners, and their size
    const A = [50, 86], B = [86, 56]                           // the dot on night 1 and night 2, in a frame
    const rnd = lcg(7)
    const field = []
    while (field.length < 13) {
      const x = 10 + rnd() * (S - 20), y = 10 + rnd() * (S - 20), r = 0.9 + rnd() * 1.5, o = 0.4 + rnd() * 0.5
      if (Math.hypot(x - A[0], y - A[1]) > 14 && Math.hypot(x - B[0], y - B[1]) > 14) field.push([x, y, r, o])
    }
    const at = ([ox, oy], [x, y]) => [ox + x, oy + y]
    const frame = ([ox, oy], k) => `
      <rect x="${ox}" y="${oy}" width="${S}" height="${S}" rx="8" fill="#0b0b0e" stroke="${FAINT}"/>
      <text class="oa-lbl" x="${ox + S / 2}" y="16" text-anchor="middle">Night ${k + 1}</text>
      ${field.map(([x, y, r, o]) => `<circle cx="${(ox + x).toFixed(1)}" cy="${(oy + y).toFixed(1)}" r="${r.toFixed(1)}" fill="${INK}" opacity="${o.toFixed(2)}"/>`).join('')}`
    const [a1, a2] = [at(F[0], A), at(F[1], A)], b2 = at(F[1], B)
    return `${open}
      ${F.map(frame).join('')}
      <circle cx="${a1[0]}" cy="${a1[1]}" r="4.5" fill="${VIOLET}"/>
      <circle cx="${a2[0]}" cy="${a2[1]}" r="6" fill="none" stroke="${VIOLET}" stroke-width="1.2" stroke-dasharray="2 2.5" opacity=".7"/>
      ${arrow(a2[0] + 7, a2[1] - 6, b2[0] - 7, b2[1] + 6, VIOLET)}
      <circle cx="${b2[0]}" cy="${b2[1]}" r="4.5" fill="${VIOLET}"/>
    </svg>`
  },

  // 2. Follow it: a position on each night it is found again, strung into an arc.
  follow: () => {
    const pts = [[52, 122], [86, 110], [118, 100], [152, 92], [186, 86], [220, 82], [252, 80]]
    return `${open}
      ${stars(19, 22)}
      <path d="M${pts.map(p => p.join(',')).join(' L')}" fill="none" stroke="${VIOLET}" stroke-width="1.4" stroke-dasharray="2 4" opacity=".7"/>
      ${pts.map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="4" fill="${VIOLET}" opacity="${(0.35 + 0.65 * k / (pts.length - 1)).toFixed(2)}"/>`).join('')}
    </svg>`
  },

  // 3. Fit the oval: a few points near the Sun sit on very different orbits. The
  // three ovals share their near end (same vertex and curvature there, so they
  // agree to second order along the measured arc) and part ways farther out.
  fit: () => {
    const V = [62, 104], th = -12 * Math.PI / 180, rho = 46, c = Math.cos(th), s = Math.sin(th)
    const oval = a => {
      const b = Math.sqrt(rho * a), cx = V[0] + a * c, cy = V[1] + a * s
      return t => [cx + a * Math.cos(t) * c - b * Math.sin(t) * s, cy + a * Math.cos(t) * s + b * Math.sin(t) * c]
    }
    const path = a => {
      const f = oval(a)
      return 'M' + Array.from({ length: 121 }, (_, k) => f(k / 120 * 2 * Math.PI).map(v => v.toFixed(1)).join(',')).join('L') + 'Z'
    }
    const near = oval(96)
    const pts = [0.3, 0.5, 0.7, 0.9].map(t => near(Math.PI + t))
    const q = 96 - Math.sqrt(96 * 96 - rho * 96)                  // the Sun at the focus of the solid one
    return `${open}
      <path d="${path(330)}" fill="none" stroke="${FAINT}" stroke-width="1.4" stroke-dasharray="4 5"/>
      <path d="${path(170)}" fill="none" stroke="${FAINT}" stroke-width="1.4" stroke-dasharray="4 5"/>
      <path d="${path(96)}" fill="none" stroke="${VIOLET}" stroke-width="1.8" opacity=".9"/>
      <use href="#art-sun" x="${(V[0] + q * c - 11).toFixed(1)}" y="${(V[1] + q * s - 11).toFixed(1)}" width="22" height="22"/>
      ${pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="${VIOLET}"/>`).join('')}
    </svg>`
  },
}
