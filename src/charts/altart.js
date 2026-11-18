// Drawings for the alternatives page (insights/alternatives.html): a small mark
// beside each explanation's name in the scorecard (ROW_ART) and a larger picture
// in the panel that opens under its row (PANEL_ART), both keyed by the ids in
// alternatives.json.
//
// Pure markup in the site's flat style (src/art.js): flat shapes, same-hue
// outlines, no glows, no rings round Planet Nine. The distant objects are
// violet (--series-1, the objects we talk about), Planet Nine is the reader's
// skin (--p9 and the sprite's #art-planet-nine), the Sun is the sprite's, and
// everything else is muted. The pictures are cartoons of each idea, not data.

import { skin } from '../skins.js'

const OBJ = 'var(--series-1)', OBJ_INK = 'var(--series-1-ink)'
const MUTED = '#8c8b83', DIM = '#5a5a64', FAINT = '#34343c', LIGHT = '#c7c5bc'
const RAD = Math.PI / 180
const f1 = n => n.toFixed(1)

// The panel pictures are 300 × 170 and clip what runs past the edge.
const panel = inner => `<svg class="alt-art" viewBox="0 0 300 170" style="overflow:hidden" aria-hidden="true" focusable="false">${inner}</svg>`
// The row marks are 48 × 48 unless they borrow a sprite body's own box.
const mark = (inner, vb = '0 0 48 48') => `<svg class="alt-ic" viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`

/** A body from the sprite (src/art.js), centred on (x, y), `s` wide. */
const body = (name, x, y, s, [bw, bh] = [100, 100]) =>
  `<use href="#art-${name}" x="${f1(x - s / 2)}" y="${f1(y - s * bh / bw / 2)}" width="${s}" height="${f1(s * bh / bw)}"/>`

/** A seeded generator, so every visit draws the same picture. */
function rng (seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6D2B79F5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** An orbit seen from above, the Sun at (fx, fy), its closest point `deg` degrees round from +x. */
function orbit (fx, fy, a, e, deg, attrs) {
  const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD)
  const cx = fx - a * e * c, cy = fy - a * e * s
  return `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(a)}" ry="${f1(a * Math.sqrt(1 - e * e))}" transform="rotate(${f1(deg)} ${f1(cx)} ${f1(cy)})" fill="none" ${attrs}/>`
}

/** A point on that orbit, `nu` degrees past its closest point. */
function onOrbit (fx, fy, a, e, deg, nu) {
  const r = a * (1 - e * e) / (1 + e * Math.cos(nu * RAD))
  return [fx + r * Math.cos((deg + nu) * RAD), fy + r * Math.sin((deg + nu) * RAD)]
}

/** An orbit seen edge-on: a thin ellipse from the Sun out to its far end at `deg`. */
function edgeOn (fx, fy, a, e, deg, thick, attrs) {
  const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD)
  const cx = fx + a * e * c, cy = fy + a * e * s
  return `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(a)}" ry="${f1(thick)}" transform="rotate(${f1(deg)} ${f1(cx)} ${f1(cy)})" fill="none" ${attrs}/>`
}

const neptune = (x, y, r = 12) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${DIM}" stroke-width="1" stroke-dasharray="2 3"/>`
const dot = (x, y, r, fill) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${fill}"/>`

/** The black-hole skin's drawing (skins.js), whatever skin the reader chose for Planet Nine. */
function blackHole (x, y, s, id) {
  const bh = skin('black-hole')
  return `<svg x="${f1(x - s / 2)}" y="${f1(y - s / 2)}" width="${s}" height="${s}" viewBox="0 0 100 100" overflow="visible">
    <defs><clipPath id="${id}"><circle cx="50" cy="50" r="40"/></clipPath></defs>
    <g clip-path="url(#${id})">${bh.paint(id)}</g>
    <circle cx="50" cy="50" r="40" fill="none" stroke="#3a2a10" stroke-width="3"/></svg>`
}

// --- the panel pictures --------------------------------------------------------

/**
 * The distant orbits bunched one way and the unseen body's orbit pointing the
 * other, as the planet's proposers draw it. `who` is drawn where that body is.
 */
function steered (who) {
  const [fx, fy] = [184, 86]
  const r = rng(9)
  let out = neptune(fx, fy)
  for (let i = 0; i < 6; i++) {
    const a = 72 + r() * 16, e = 0.8 + r() * 0.05, deg = (r() - 0.5) * 26
    out += orbit(fx, fy, a, e, deg, `stroke="${OBJ}" stroke-width="1.3" opacity=".85"`)
    const [x, y] = onOrbit(fx, fy, a, e, deg, 150 + r() * 60)
    out += dot(x, y, 2.4, OBJ_INK)
  }
  const [pa, pe] = [62, 0.4]
  const far = fx + pa * (1 + pe)
  out += who === 'planet'
    ? orbit(fx, fy, pa, pe, 180, 'style="stroke:var(--p9)" stroke-width="2"') + body('planet-nine', far, fy, 32)
    : orbit(fx, fy, pa, pe, 180, `stroke="${LIGHT}" stroke-width="1.6" stroke-dasharray="5 4"`) + blackHole(far, fy, 30, 'alt-bh-panel')
  out += body('sun', fx, fy, 22)
  return panel(out)
}

/**
 * Where telescopes looked: orbits in every direction (dashed), but an object is
 * seen only near its closest point to the Sun, and only inside the patch of sky
 * searched (the wedge). The few found (violet) all point the same way.
 */
function looked () {
  const [fx, fy] = [150, 85]
  const look = -32, half = 26, R = 200
  const p = a => `${f1(fx + R * Math.cos(a * RAD))},${f1(fy + R * Math.sin(a * RAD))}`
  let out = `<path d="M${fx},${fy} L${p(look - half)} A${R},${R} 0 0,1 ${p(look + half)} Z" fill="#ffffff" fill-opacity=".06"/>
    <path d="M${p(look - half)} L${fx},${fy} L${p(look + half)}" fill="none" stroke="${MUTED}" stroke-width="1" stroke-dasharray="3 4"/>`
  const r = rng(4)
  // the ones never seen: closest points everywhere outside the searched patch
  for (let k = 0; k < 9; k++) {
    const deg = look + half + 12 + k * (360 - 2 * half - 24) / 8 + (r() - 0.5) * 10
    out += orbit(fx, fy, 44 + r() * 10, 0.56 + r() * 0.06, deg, `stroke="${DIM}" stroke-width="1" stroke-dasharray="2 3"`)
  }
  // the ones found: closest points inside it
  for (const off of [-17, -3, 12]) {
    const a = 44 + r() * 10, e = 0.58, deg = look + off
    out += orbit(fx, fy, a, e, deg, `stroke="${OBJ}" stroke-width="1.7"`)
    const [x, y] = onOrbit(fx, fy, a, e, deg, 0)
    out += dot(x, y, 3.2, OBJ_INK)
  }
  out += body('sun', fx, fy, 16)
  return panel(out)
}

/** A broad, lopsided ring of small bodies, and the distant orbits held in line inside it. */
function disk () {
  const [fx, fy] = [150, 86]
  const r = rng(31)
  let out = ''
  for (let i = 0; i < 190; i++) {
    const a = 40 + r() * 52, e = 0.28 + r() * 0.12, deg = 180 + (r() - 0.5) * 24
    const [x, y] = onOrbit(fx, fy, a, e, deg, r() * 360)
    out += dot(x, y, f1(0.8 + r() * 0.9), MUTED)
  }
  out += neptune(fx, fy, 11)
  const q = rng(5)
  for (let i = 0; i < 4; i++) {
    const a = 54 + q() * 10, e = 0.8, deg = (q() - 0.5) * 16
    out += orbit(fx, fy, a, e, deg, `stroke="${OBJ}" stroke-width="1.5"`)
  }
  out += body('sun', fx, fy, 18)
  return panel(out)
}

/** Side view: the plane of the planets, and a swarm of orbits tipped out of it, all the same way. */
function swarm () {
  const [fx, fy] = [150, 132]
  const r = rng(12)
  let out = `<line x1="6" y1="${fy}" x2="294" y2="${fy}" stroke="${DIM}" stroke-width="1" stroke-dasharray="3 4"/>`
  // where they started: flat in the plane
  out += edgeOn(fx, fy, 60, 0.85, 0, 2.5, `stroke="${FAINT}" stroke-width="1.2"`) + edgeOn(fx, fy, 56, 0.85, 180, 2.5, `stroke="${FAINT}" stroke-width="1.2"`)
  for (let i = 0; i < 10; i++) {
    const right = i % 2 === 0, tilt = 16 + (i >> 1) * 5 + r() * 3
    const deg = right ? -tilt : 180 + tilt
    const a = 66 + r() * 14, e = 0.85
    out += edgeOn(fx, fy, a, e, deg, 3 + r() * 2, `stroke="${OBJ}" stroke-width="1.2" opacity=".85"`)
    const far = a * (1 + e) * (0.7 + r() * 0.25)
    out += dot(fx + far * Math.cos(deg * RAD), fy + far * Math.sin(deg * RAD), 2.2, OBJ_INK)
  }
  out += [10, 17, 24].map(d => dot(fx - d, fy, 1.6, MUTED) + dot(fx + d, fy, 1.6, MUTED)).join('')
  out += body('sun', fx, fy, 16)
  return panel(out)
}

/** Another star passing close by, long ago, and the far ends of the orbits pulled toward its path. */
function star () {
  const [fx, fy] = [92, 112]
  const r = rng(8)
  let out = neptune(fx, fy, 11)
  for (let i = 0; i < 5; i++) {
    const aph = -38 + (r() - 0.5) * 18, a = 60 + r() * 12, e = 0.68 + r() * 0.04
    out += orbit(fx, fy, a, e, aph + 180, `stroke="${OBJ}" stroke-width="1.4"`)
  }
  // the star's path, an arrow ahead of it and three strokes behind it
  out += `<path d="M118,26 L292,52" fill="none" stroke="${MUTED}" stroke-width="1.2" stroke-dasharray="4 4"/>
    <path d="M284,44 L294,52 L282,56" fill="none" stroke="${MUTED}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <g stroke="${LIGHT}" stroke-width="2" stroke-linecap="round" opacity=".7">
      <path d="M190,30 L212,33"/><path d="M186,40 L210,43.5"/><path d="M192,50 L212,53"/></g>`
  out += body('sun', 236, 42, 40)
  out += body('sun', fx, fy, 18)
  return panel(out)
}

/** The rules change far out: a grid that stays square near the Sun and bends farther away. */
function gravity () {
  const [cx, cy] = [150, 85]
  const warp = (x, y) => {
    const d = Math.hypot(x - cx, y - cy), amp = Math.max(0, d - 48) * 0.075
    return [x + amp * Math.sin(y / 11), y + amp * Math.sin(x / 13)]
  }
  const line = pts => `<polyline points="${pts.map(([x, y]) => warp(x, y)).map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ')}" fill="none" stroke="#44444c" stroke-width="1"/>`
  let out = ''
  for (let x = 10; x <= 290; x += 20) out += line(Array.from({ length: 36 }, (_, i) => [x, -5 + i * 5]))
  for (let y = 5; y <= 165; y += 20) out += line(Array.from({ length: 62 }, (_, i) => [-5 + i * 5, y]))
  out += [13, 21, 29].map(rr => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${LIGHT}" stroke-width="1" opacity=".55"/>`).join('')
  const r = rng(3)
  for (let i = 0; i < 3; i++) {
    out += orbit(cx, cy, 70 + r() * 8, 0.78, 196 + (r() - 0.5) * 14, `stroke="${OBJ}" stroke-width="1.5"`)
  }
  out += body('sun', cx, cy, 18)
  return panel(out)
}

/**
 * Eight small sets of six directions drawn at random, each with the arrow the
 * probability page uses (the average direction). One set lines up by chance.
 */
function luck () {
  const r = rng(77)
  const lucky = 5
  let out = ''
  for (let k = 0; k < 8; k++) {
    const cx = 45 + (k % 4) * 70, cy = k < 4 ? 46 : 124, R = 26
    let angles, L, mx, my
    do {
      const base = r() * 2 * Math.PI
      angles = Array.from({ length: 6 }, () => k === lucky ? base + (r() - 0.5) * 1.8 : r() * 2 * Math.PI)
      mx = angles.reduce((s, a) => s + Math.cos(a), 0) / 6
      my = angles.reduce((s, a) => s + Math.sin(a), 0) / 6
      L = Math.hypot(mx, my)
    } while (k !== lucky && L > 0.45)
    const on = k === lucky
    out += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${on ? LIGHT : FAINT}" stroke-width="${on ? 1.4 : 1}"/>`
    out += angles.map(a => dot(cx + R * Math.cos(a), cy + R * Math.sin(a), on ? 2.8 : 2.2, on ? OBJ_INK : MUTED)).join('')
    const len = R * L, ux = mx / (L || 1), uy = my / (L || 1)
    const tx = cx + ux * len, ty = cy + uy * len
    const col = on ? OBJ_INK : MUTED, w = on ? 2.2 : 1.4
    out += `<path d="M${cx},${cy} L${f1(tx)},${f1(ty)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`
    if (len > 6) {
      const h = on ? 5 : 3.5, px = -uy, py = ux
      out += `<path d="M${f1(tx - ux * h + px * h * 0.7)},${f1(ty - uy * h + py * h * 0.7)} L${f1(tx)},${f1(ty)} L${f1(tx - ux * h - px * h * 0.7)},${f1(ty - uy * h - py * h * 0.7)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
    }
    out += dot(cx, cy, 1.6, on ? LIGHT : DIM)
  }
  return panel(out)
}

export const PANEL_ART = {
  planet_nine: () => steered('planet'),
  observational_bias: looked,
  self_gravitating_disk: disk,
  inclination_instability: swarm,
  stellar_flyby: star,
  primordial_black_hole: () => steered('black hole'),
  modified_gravity: gravity,
  small_sample: luck,
}

// --- the row marks ---------------------------------------------------------------

function diskMark () {
  const r = rng(2)
  let out = ''
  for (let i = 0; i < 30; i++) {
    const [x, y] = onOrbit(24, 24, 15 + r() * 6, 0.3, 180, i * 12 + r() * 8)
    out += dot(x, y, f1(0.9 + r() * 0.8), LIGHT)
  }
  return mark(out + dot(24, 24, 3.2, '#f3c660'))
}

function swarmMark () {
  let out = `<line x1="3" y1="36" x2="45" y2="36" stroke="${MUTED}" stroke-width="1.2" stroke-dasharray="2 2.5"/>`
  for (const [deg, a] of [[-24, 13], [-40, 12], [204, 12], [220, 11]]) {
    out += edgeOn(24, 36, a, 0.82, deg, 1.6, `stroke="${OBJ}" stroke-width="1.6"`)
  }
  return mark(out + dot(24, 36, 2.6, '#f3c660'))
}

function starMark () {
  return mark(`<g stroke="${LIGHT}" stroke-width="2.2" stroke-linecap="round" opacity=".75">
    <path d="M4,17 L15,18"/><path d="M2,24 L14,24.5"/><path d="M4,31 L15,30"/></g>${body('sun', 30, 24, 30)}`)
}

function gravityMark () {
  const warp = (x, y) => {
    const d = Math.hypot(x - 24, y - 24), amp = Math.max(0, d - 8) * 0.16
    return [x + amp * Math.sin(y / 3.4), y + amp * Math.sin(x / 3.8)]
  }
  const line = pts => `<polyline points="${pts.map(([x, y]) => warp(x, y)).map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ')}" fill="none" stroke="${MUTED}" stroke-width="1.3"/>`
  let out = ''
  for (const v of [8, 16, 24, 32, 40]) {
    out += line(Array.from({ length: 21 }, (_, i) => [v, 4 + i * 2]))
    out += line(Array.from({ length: 21 }, (_, i) => [4 + i * 2, v]))
  }
  return mark(out + dot(24, 24, 3.4, '#f3c660'))
}

function dieMark () {
  const pip = (x, y) => dot(x, y, 2.6, '#2a2a30')
  return mark(`<g transform="rotate(-10 24 24)">
    <rect x="9" y="9" width="30" height="30" rx="6" fill="#d9d4c7" stroke="#8a8478" stroke-width="2"/>
    ${pip(17, 17)}${pip(31, 17)}${pip(24, 24)}${pip(17, 31)}${pip(31, 31)}</g>`)
}

export const ROW_ART = {
  planet_nine: () => mark('<use href="#art-planet-nine"/>', '0 0 100 100'),
  observational_bias: () => mark('<use href="#art-observatory"/>', '0 0 160 120'),
  self_gravitating_disk: diskMark,
  inclination_instability: swarmMark,
  stellar_flyby: starMark,
  primordial_black_hole: () => mark(blackHole(24, 24, 46, 'alt-bh-row')),
  modified_gravity: gravityMark,
  small_sample: dieMark,
}
