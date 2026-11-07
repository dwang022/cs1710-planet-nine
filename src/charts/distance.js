// Part 1, page 2: "how far away is all this?", as one continuous zoom over a
// map of the solar system seen from above.
//
// The Sun sits in the middle and everything is where it was on the catalogue
// date (June 2026): the planets on their orbits, the Kuiper belt as a faint
// ring filled with small dots for its icy bodies (decoration, not data: the
// real catalogue is on the data page; they fade out once the extreme objects
// come in), Voyager 1 (positions.json), and the extreme objects as violet dots.
// Their orbits overlap into a tangle, so each one appears only when its object
// is pointed at, which also marks its far end and dims the rest; one card
// ('orbits') shows them all at once. Planet Nine is its best-fit orbit over a
// faint band of the orbits its uncertainty allows; nobody knows where on that
// orbit it is: its icon marks the orbit, not a predicted position.
//
// Scrolling moves one camera. Each card has a frame, a box in AU that must be
// in view, and the camera glides between frames with d3.interpolateZoom.
// Everything drawn in AU (the orbits, the belt, Planet Nine) sits in groups
// that one transform moves, with non-scaling strokes, so a scroll frame only
// re-renders the few bodies and labels drawn in pixels.
//
// Every orbit is laid flat on the ecliptic (orbits.js flatPoint): each point
// keeps its true distance from the Sun and only the tilt is dropped, so the
// map is a true ruler in every direction. The drawn sizes of the bodies are
// not to scale. Distances in AU are gold (--au) wherever they are written, and
// every planet with room for a name has its distance under it.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'
import { registerHighlight, setHover } from '../highlight.js'
import { PLANET_ART } from '../art.js'
import { flatPoint, flatOrbit, trueAnomaly } from '../orbits.js'

const LIGHT_S_PER_AU = 499.005
const RAD = Math.PI / 180
const PAD = 30                     // px kept clear round each card's frame
const SUN_R = 46                   // the Sun's drawn radius in the closest view; never to scale
export const KUIPER = [30, 50]     // AU, the belt's inner and outer edges, drawn as a ring

// Presentation only: each body's drawn size when it has room. Positions come from the data.
const SIZE = { Mercury: 15, Venus: 20, Earth: 22, Mars: 17, Jupiter: 46, Saturn: 50, Uranus: 31, Neptune: 30, Pluto: 19 }

// The body each early card is about, labelled with its distance.
const FOCUS = { home: 'Earth', giants: 'Saturn', neptune: 'Neptune', pluto: 'Pluto' }
const OBJ_STEPS = ['extreme', 'orbits', 'p9', 'farthest']
const P9_STEPS = ['p9', 'farthest']

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// A seeded generator, so the belt's drawn bodies are the same on every visit.
function lcg (seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 } }
const nameOf = d => d.name || d.provisional_desig || d.id
const fmt = d3.format(',.0f')
export const fmtAu = au => `${au < 10 ? parseFloat(au.toFixed(au < 2 ? 2 : 1)) : fmt(au)} AU`

/** How many days light takes to cover a distance, rounded. */
export const lightDays = au => Math.round(au * LIGHT_S_PER_AU / 86400)

/** How long light takes to cover a distance, in round words. */
export function lightTime (au) {
  const s = au * LIGHT_S_PER_AU
  if (s < 90 * 60) return `${Math.round(s / 60)} minutes`
  if (s < 36 * 3600) return `${(s / 3600).toFixed(s < 10 * 3600 ? 1 : 0)} hours`
  return `${Math.round(s / 86400)} days`
}

const NICE = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]

// SVG path data for [x, y] points in AU (y up; the world groups flip it).
const pathOf = (pts, digits = 1) => 'M' + pts.map(([x, y]) => `${x.toFixed(digits)},${y.toFixed(digits)}`).join('L')

// A box in AU round the Sun, and the union of boxes.
const ring = r => [-r, -r, r, r]
const union = (...bs) => [Math.min(...bs.map(b => b[0])), Math.min(...bs.map(b => b[1])), Math.max(...bs.map(b => b[2])), Math.max(...bs.map(b => b[3]))]
const boxOf = pts => union([0, 0, 0, 0], ...pts.map(([x, y]) => [x, y, x, y]))

/**
 * @param planets  [{ name, a, e, varpi, nu }] on the catalogue date (orbits.js planetAt), Pluto included
 * @param p9       { a, e, varpi, aErr, eErr, varpiErr }, errors as [minus, plus] offsets
 * @param voyager  { r_au, lon_deg, outward_au_per_yr } (positions.json)
 */
export function makeDistance (root, { planets, p9, voyager }) {
  const svg = d3.select(root).append('svg').attr('role', 'img')
    .attr('aria-label', 'A map of the solar system seen from above, zooming out as you scroll: the planets where they are, the Kuiper belt, the distant objects behind the case for Planet Nine and their orbits, and the orbits predicted for Planet Nine itself. At the farthest view the Sun is one star in a sky of them.')
  let W = 900, H = 600

  // The last card's sky: many dim stars in the panel's pixels (decoration, not data, like the belt's
  // dots), fading in as the camera reaches the farthest view, where the Sun becomes one star among them.
  const gSky = svg.append('g').attr('class', 'dist-sky').attr('aria-hidden', 'true').style('pointer-events', 'none')
  let skyFor = ''
  const gLow = svg.append('g')                 // in AU: the Kuiper belt, Planet Nine's band and orbit
  const belt = gLow.append('path').attr('class', 'dist-belt')
  const gBelt = gLow.append('g').attr('class', 'belt-bodies')   // in AU: the belt's icy bodies, as dots
  const p9Band = gLow.append('path').attr('class', 'dist-p9band')
  const p9Line = gLow.append('path').attr('class', 'dist-p9orbit')
  const gSun = svg.append('g')                 // under the rest, so nothing close to it is hidden
  const gOrbits = svg.append('g')              // in pixels: the planets' dashed orbits
  const gObjOrbits = svg.append('g')           // in AU: the extreme objects' orbits
  const gDots = svg.append('g')                // in pixels: where each extreme object is now
  const gBodies = svg.append('g')
  const gVoy = svg.append('g')
  const gNotes = svg.append('g').style('pointer-events', 'none')
  const gRuler = svg.append('g').style('pointer-events', 'none')

  gSun.append('use').attr('href', '#art-sun')
  gSun.append('circle').attr('class', 'sun-star')        // the Sun as a star, on the last card

  // --- what is drawn in AU, built once ------------------------------------------
  const PL = planets.map(p => {
    const [x, y] = flatPoint(p.a, p.e, p.varpi, p.nu)
    return { ...p, q: p.a * (1 - p.e), Q: p.a * (1 + p.e), x, y, orbit: flatOrbit(p.a, p.e, p.varpi, 120) }
  })
  const PLN = Object.fromEntries(PL.map(p => [p.name, p]))

  // the Kuiper belt: a faint ring between its two edges
  const circle = r => d3.range(0, 360, 2).map(t => [r * Math.cos(t * RAD), r * Math.sin(t * RAD)])
  belt.attr('d', pathOf(circle(KUIPER[1])) + 'Z' + pathOf(circle(KUIPER[0]).reverse()) + 'Z')

  // ...and its icy bodies: a seeded scatter of dots (decoration, not data), thickest
  // between 39 and 48 AU, kept clear of Neptune and Pluto where they are. Two
  // paths of zero-length round-capped strokes, small and larger, drawn in AU.
  {
    const rnd = lcg(1992), d = ['', '']
    for (let n = 0; n < 640;) {
      const r = rnd() < 0.6 ? 39 + rnd() * 9 : KUIPER[0] + 0.5 + rnd() * (KUIPER[1] - KUIPER[0] - 1)
      const t = rnd() * 2 * Math.PI, x = r * Math.cos(t), y = r * Math.sin(t)
      if (['Neptune', 'Pluto'].some(p => Math.hypot(x - PLN[p].x, y - PLN[p].y) < 2.5)) continue
      d[rnd() < 0.8 ? 0 : 1] += `M${x.toFixed(2)},${y.toFixed(2)}h0`
      n++
    }
    gBelt.append('path').attr('class', 'belt-dot').attr('d', d[0])
    gBelt.append('path').attr('class', 'belt-dot big').attr('d', d[1])
  }

  const voy = { ...voyager, x: voyager.r_au * Math.cos(voyager.lon_deg * RAD), y: voyager.r_au * Math.sin(voyager.lon_deg * RAD) }

  // Planet Nine: the best-fit orbit, and the band every orbit inside the error
  // bars on a, e and the direction of its perihelion would sweep. Every one of
  // them goes round the Sun, so along each direction the band runs from the
  // nearest of them to the farthest.
  const P9 = { a: p9.a, e: p9.e, varpi: p9.varpi, q: p9.a * (1 - p9.e), Q: p9.a * (1 + p9.e) }
  const steps5 = (v, [lo, hi]) => d3.range(5).map(i => v + lo + (hi - lo) * i / 4)
  const family = []
  for (const a of steps5(p9.a, p9.aErr)) for (const e of steps5(p9.e, p9.eErr)) for (const w of steps5(p9.varpi, p9.varpiErr)) family.push([a, e, w])
  const inner = [], outer = []
  for (let t = 0; t < 360; t += 1) {
    let lo = Infinity, hi = 0
    for (const [a, e, w] of family) {
      const r = a * (1 - e * e) / (1 + e * Math.cos((t - w) * RAD))
      lo = Math.min(lo, r); hi = Math.max(hi, r)
    }
    inner.push([lo * Math.cos(t * RAD), lo * Math.sin(t * RAD)])
    outer.push([hi * Math.cos(t * RAD), hi * Math.sin(t * RAD)])
  }
  p9Band.attr('d', pathOf(outer) + 'Z' + pathOf(inner.slice().reverse()) + 'Z')
  P9.bandMin = d3.min(inner, ([x, y]) => Math.hypot(x, y))
  P9.bandMax = d3.max(outer, ([x, y]) => Math.hypot(x, y))
  const p9Orbit = flatOrbit(P9.a, P9.e, P9.varpi, 240)
  p9Line.attr('d', pathOf(p9Orbit) + 'Z')
  P9.peri = flatPoint(P9.a, P9.e, P9.varpi, 0)
  P9.aph = flatPoint(P9.a, P9.e, P9.varpi, 180)
  P9.top = p9Orbit.reduce((m, p) => (p[1] > m[1] ? p : m))

  // --- the frame each card must show, in AU -------------------------------------
  const boxes = {
    home: ring(PLN.Mars.Q * 1.06),
    giants: ring(PLN.Saturn.Q * 1.06),
    neptune: ring(PLN.Neptune.Q * 1.06),
    pluto: ring(KUIPER[1] * 1.06),
  }
  boxes.extreme = boxes.orbits = boxes.p9 = boxes.farthest = boxes.pluto      // until the objects arrive

  const S = { step: 'home', objects: [], far: null, hot: null }
  let cam = [0, 0, 4]                          // [x, y] at the centre of the view and its width, in AU
  let glideArgs = ['home', 'home', 0]

  // The sky, rebuilt only when the panel changes size: about one star per 600 square pixels, most
  // of them faint, a few brighter, seeded so it is the same on every visit; three paths of
  // zero-length round-capped strokes, one per brightness.
  function drawSky () {
    const key = `${W}x${H}`
    if (key === skyFor) return
    skyFor = key
    const rnd = lcg(1610), d = ['', '', '']
    const n = Math.round(W * H / 600)
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H, b = rnd()
      d[b < 0.8 ? 0 : b < 0.97 ? 1 : 2] += `M${x.toFixed(1)},${y.toFixed(1)}h0`
    }
    gSky.selectAll('path').data(d).join('path').attr('class', (_, i) => `sky-star s${i}`).attr('d', p => p)
  }

  function viewOf ([x0, y0, x1, y1]) {
    const k = Math.min((W - 2 * PAD) / (x1 - x0), (H - 2 * PAD) / (y1 - y0))
    return [(x0 + x1) / 2, (y0 + y1) / 2, W / k]
  }

  function draw () {
    const k = W / cam[2]
    const sx = W / 2 - cam[0] * k, sy = H / 2 + cam[1] * k        // the Sun on screen
    const X = x => sx + x * k, Y = y => sy - y * k
    const span = Math.min(W, H) / 2 / k                            // AU from the middle to the nearer edge
    const reach = Math.hypot(Math.max(sx, W - sx), Math.max(sy, H - sy)) / k   // AU from the Sun to the farthest corner
    const onScreen = (x, y, m = 0) => x > -m && x < W + m && y > -m && y < H + m
    const world = `translate(${sx.toFixed(2)},${sy.toFixed(2)}) scale(${k},${-k})`
    const focus = FOCUS[S.step]
    const objOn = OBJ_STEPS.includes(S.step), p9On = P9_STEPS.includes(S.step)
    const notes = []        // { x, y, text, au, cls, anchor }

    // How far the camera has come into the last card's view, 0 to 1: the sky fills with stars, the Sun
    // turns from its drawing into one of them, and every object but the farthest leaves.
    const [gFrom, gTo, gS] = glideArgs
    const deep = gFrom === 'farthest' ? 1 : gTo === 'farthest' ? gS : 0
    drawSky()
    gSky.style('opacity', deep).style('display', deep > 0 ? null : 'none')

    // The Sun shrinks as the view opens out, so the zoom reads as a zoom; it
    // stays an icon (at 5,000 AU across it would be a thousandth of a pixel).
    // On the last card it is a star, a little brighter than the brightest round it.
    const sunR = clamp(SUN_R * Math.pow(1.8 / span, 0.28), 12, SUN_R)
    const starR = 3.4
    gSun.select('use').attr('x', sx - sunR).attr('y', sy - sunR).attr('width', sunR * 2).attr('height', sunR * 2).style('opacity', 1 - deep)
    gSun.select('.sun-star').attr('cx', sx).attr('cy', sy).attr('r', starR).style('opacity', deep)
    notes.push({ x: sx, y: sy + sunR + (starR - sunR) * deep + 15, text: 'the Sun', planet: 'Sun' })
    const outside = r => r * k > sunR * 1.15                       // clear of the Sun's drawing

    gLow.attr('transform', world)
    gObjOrbits.attr('transform', world)

    // --- Planet Nine: the band, the best-fit orbit, and its icon on the orbit ---
    gLow.selectAll('.dist-p9band, .dist-p9orbit').style('display', p9On ? null : 'none')
    const p9Size = 36 * clamp(P9.a * k / 170, 0.5, 1)
    const p9Icon = p9On && P9.a * k > 40 ? [{ x: X(P9.top[0]), y: Y(P9.top[1]), size: p9Size }] : []
    if (p9On && S.step === 'p9') {
      const out = ([x, y], px) => { const r = Math.hypot(x, y); return [X(x + (x / r) * px / k), Y(y + (y / r) * px / k)] }
      const [tx, ty] = [X(P9.top[0]), Y(P9.top[1])]
      notes.push({ x: tx, y: ty - p9Size / 2 - 10, text: 'Planet Nine', cls: 'focus p9' })
      for (const [pt, au] of [[P9.peri, P9.q], [P9.aph, P9.Q]]) {
        const [x, y] = out(pt, 16)
        notes.push({ x, y: y + 5, au: fmtAu(au), cls: 'focus-v', anchor: x < sx ? 'end' : 'start' })
      }
    }

    // --- the Kuiper belt ---------------------------------------------------------
    const beltOn = outside(KUIPER[1]) && KUIPER[0] < reach
    belt.style('display', beltOn ? null : 'none')
    // its dots leave when the evidence arrives, and once the belt is a sliver
    gBelt.classed('off', objOn).style('display', beltOn && (KUIPER[1] - KUIPER[0]) * k >= 8 ? null : 'none')
    if (beltOn && (S.step === 'pluto' || S.step === 'neptune') && KUIPER[1] * k < H / 2 - 12) {
      notes.push({ x: X(0), y: Y(KUIPER[1]) - 10, text: 'Kuiper belt', cls: 'muted' })
    }

    // --- the planets and Pluto: dashed orbits, then the bodies ------------------
    const orbits = PL.filter(p => outside(p.a) && p.q < reach)
    gOrbits.selectAll('path').data(orbits, p => p.name).join('path')
      .attr('class', p => `dist-orbit${p.name === 'Pluto' ? ' dwarf' : ''}`)
      .attr('d', p => 'M' + p.orbit.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join('L') + 'Z')

    const shown = PL.map(p => {
      const r = Math.hypot(p.x, p.y) * k
      return { ...p, sx: X(p.x), sy: Y(p.y), r, size: SIZE[p.name] * clamp(r / 70, 0.16, 1), isFocus: p.name === focus }
    }).filter(p => p.r > sunR * 1.15 && onScreen(p.sx, p.sy, 30))

    gBodies.selectAll('use.planet').data(shown.slice().sort((a, b) => a.size - b.size), p => p.name).join('use')
      .attr('class', 'dist-body planet').attr('href', p => `#art-${PLANET_ART[p.name]}`)
      .attr('x', p => p.sx - p.size / 2).attr('y', p => p.sy - p.size / 2)
      .attr('width', p => p.size).attr('height', p => p.size)
    gBodies.selectAll('use.p9').data(p9Icon).join('use')
      .attr('class', 'dist-body p9').attr('href', '#art-planet-nine')
      .attr('x', d => d.x - d.size / 2).attr('y', d => d.y - d.size / 2)
      .attr('width', d => d.size).attr('height', d => d.size)

    // labels: the card's body first, then the biggest. Every labelled body has its distance under
    // its name (the card's body a size larger); a label is two lines, so each takes a block of both,
    // under its body or, where that is taken (by the Sun, a body or another label), over it.
    const taken = [{ x: sx, y0: sy - sunR, y1: sy + sunR + 17, w: Math.max(2 * sunR, 64) },     // the Sun and its name
      ...shown.map(p => ({ id: p.name, x: p.sx, y0: p.sy - p.size / 2, y1: p.sy + p.size / 2, w: p.size }))]
    const free = (id, x, y0, y1, w) => !taken.some(t => t.id !== id && Math.abs(t.x - x) < (t.w + w) / 2 + 6 && y0 < t.y1 + 4 && t.y0 < y1 + 4)
    for (const p of shown.slice().sort((a, b) => (b.isFocus - a.isFocus) || (b.size - a.size))) {
      if (!p.isFocus && p.r < 40) continue
      const dy = p.isFocus ? 17 : 15
      const au = p.name === 'Pluto' ? `${fmtAu(p.q)} to ${fmtAu(p.Q)}` : fmtAu(p.a)
      const w = Math.max(p.name.length * 8, au.length * 7)
      const below = p.sy + p.size / 2 + 15, above = p.sy - p.size / 2 - 8 - dy
      const y = [below, above].find(y => y + dy < H - 6 && y > 14 && free(p.name, p.sx, y - 12, y + dy, w)) ?? (p.isFocus ? below : null)
      if (y == null) continue
      taken.push({ x: p.sx, y0: y - 12, y1: y + dy, w })
      notes.push({ x: p.sx, y, text: p.name, planet: p.name, cls: p.isFocus ? 'focus' : '' })
      notes.push({ x: p.sx, y: y + dy, au, cls: p.isFocus ? 'focus-v' : 'small' })
    }

    // --- the extreme objects: a dot where each is now, and its orbit when it is
    // pointed at (or on the last card, the farthest); the 'orbits' card shows them all
    const hotId = S.hot ?? (S.step === 'farthest' ? S.far?.id : null)
    const objs = objOn ? S.objects : []
    const anyHot = objs.some(o => o.id === hotId)
    const allOrbits = S.step === 'orbits'
    const cls = o => (o.id === hotId ? ' hot' : (anyHot ? ' dim' : '') + (allOrbits ? '' : ' off'))
    const og = gObjOrbits.selectAll('g').data(objs, o => o.id).join(enter => {
      const g = enter.append('g')
      g.append('path').attr('class', 'line').attr('d', o => o.path)
      g.append('path').attr('class', 'hit').attr('d', o => o.path)
      return g
    })
    // on the last card every object but the farthest fades away (inline, over the stylesheet's dimming)
    const farId = S.far?.id
    const leave = o => (deep === 0 || o.id === farId ? null : (anyHot && o.id !== hotId ? 0.25 : 1) * (1 - deep))
    og.attr('class', o => `obj-orbit${cls(o)}`)
      .style('opacity', leave).style('pointer-events', o => (deep > 0.5 && o.id !== farId ? 'none' : null))
      .on('pointerenter', hover).on('pointermove', hover).on('pointerleave', unhover)
    og.filter(o => o.id === hotId).raise()

    const dots = gDots.selectAll('g').data(objs, o => o.id).join(enter => {
      const g = enter.append('g')
      g.append('circle').attr('class', 'now')
      g.append('circle').attr('class', 'hit').attr('r', 7)
      return g
    })
    dots.attr('class', o => `obj${cls(o)}`)
      .style('opacity', leave).style('pointer-events', o => (deep > 0.5 && o.id !== farId ? 'none' : null))
      .on('pointerenter', hover).on('pointermove', hover).on('pointerleave', unhover)
    // on the last card the farthest object keeps its violet until pointed at, so its white does not
    // compete with the Sun's star beside it
    dots.select('.now').attr('cx', o => X(o.x)).attr('cy', o => Y(o.y)).attr('r', o => (o.id === hotId ? 4.5 : 3))
      .style('fill', o => (deep > 0 && !S.hot && o.id === farId ? 'var(--series-1)' : null))
    dots.select('.hit').attr('cx', o => X(o.x)).attr('cy', o => Y(o.y))
    dots.filter(o => o.id === hotId).raise()

    // the far end of the orbit in focus (on the last card with its name); when the
    // far end is off the map, the distance sits where the orbit leaves it
    const hot = objs.find(o => o.id === hotId)
    if (hot) {
      // the object pointed at: how far it is now, beside its dot (its far end is labelled below)
      if (S.hot === hot.id) {
        const dx = X(hot.x), right = dx < W - 120
        notes.push({ x: dx + (right ? 9 : -9), y: Y(hot.y) + 4, text: 'now', au: fmtAu(hot.now_au), cls: 'focus-v strong', anchor: right ? 'start' : 'end', plain: true })
      }
      const [ax, ay] = hot.aph, r = Math.hypot(ax, ay)
      let x = X(ax + (ax / r) * 14 / k), y = Y(ay + (ay / r) * 14 / k) + 5, text = S.hot ? 'farthest' : nameOf(hot)
      if (!onScreen(X(ax), Y(ay), -12)) {
        const half = hot.pts.slice(0, hot.pts.length >> 1)
        const i = half.findIndex(([px, py]) => !onScreen(X(px), Y(py), -40))
        const [ex, ey] = half[Math.max(0, i - 1)]
        x = X(ex); y = Y(ey) + 5; text = 'out to'
      }
      x = clamp(x, 10, W - 10); y = clamp(y, 16, H - 30)
      const anchor = x < sx - 20 ? 'end' : x > sx + 20 ? 'start' : 'middle'
      notes.push({ x, y, text, au: fmtAu(hot.Q_au), cls: 'focus-v strong', anchor, plain: text === 'out to' || text === 'farthest' })
    }

    // --- Voyager 1, for a human-made yardstick ----------------------------------
    const vx = X(voy.x), vy = Y(voy.y)
    const voyOn = outside(voy.r_au) && voy.r_au * k > sunR + 40 && onScreen(vx, vy, -20)
    const voyG = gVoy.selectAll('g').data(voyOn ? [voy] : []).join(enter => {
      const e = enter.append('g').attr('class', 'voy')
      e.append('circle').attr('class', 'hit').attr('r', 14)
      e.append('path').attr('d', 'M-5,5 L5,5 L0,-6 Z')
      return e
    })
    voyG.attr('transform', `translate(${vx},${vy})`)
      .on('pointerenter', voyagerTip).on('pointermove', voyagerTip).on('pointerleave', () => hideTip())
    if (voyOn) notes.push({ x: vx + 10, y: vy + 4, text: 'Voyager 1', au: fmtAu(voy.r_au), cls: 'muted small', anchor: vx > W - 160 ? 'end' : 'start' })

    gNotes.selectAll('text').data(notes).join('text')
      .attr('class', d => `dist-lbl ${d.cls || ''}`).attr('data-planet', d => d.planet || null)
      .attr('x', d => clamp(d.x, 6, W - 6)).attr('y', d => d.y)
      .attr('text-anchor', d => d.anchor || 'middle')
      .each(function (d) {
        const parts = [d.text && { s: d.text }, d.text && d.au && { s: d.plain ? ' ' : ' · ' }, d.au && { s: d.au, c: 'au' }].filter(Boolean)
        d3.select(this).selectAll('tspan').data(parts).join('tspan').attr('class', p => p.c || null).text(p => p.s)
      })

    // --- a ruler for the current zoom ------------------------------------------
    const nice = NICE.filter(n => n * k <= 150).pop() ?? NICE[0]
    const len = nice * k, x1 = 16, y = H - 18
    const rule = gRuler.selectAll('g').data([0]).join(enter => {
      const e = enter.append('g').attr('class', 'dist-ruler')
      e.append('line').attr('class', 'bar'); e.append('line').attr('class', 'tick t1'); e.append('line').attr('class', 'tick t2')
      e.append('text').attr('class', 'dist-lbl au').attr('text-anchor', 'start')
      return e
    })
    rule.select('.bar').attr('x1', x1).attr('x2', x1 + len).attr('y1', y).attr('y2', y)
    rule.select('.t1').attr('x1', x1).attr('x2', x1).attr('y1', y - 5).attr('y2', y + 5)
    rule.select('.t2').attr('x1', x1 + len).attr('x2', x1 + len).attr('y1', y - 5).attr('y2', y + 5)
    rule.select('text').attr('x', x1).attr('y', y - 10).text(fmtAu(nice))
  }

  function hover (ev, d) {
    setHover(d.id)
    showTip(ev, `<b>${nameOf(d)}</b>
      <dl><dt>nearest to the Sun</dt><dd class="au">${fmtAu(d.q_au)}</dd>
      <dt>where it is now</dt><dd class="au">${fmtAu(d.now_au)}</dd>
      <dt>farthest from the Sun</dt><dd class="au">${fmtAu(d.Q_au)}</dd></dl>`)
  }
  function unhover () { setHover(null); hideTip() }
  // Scrolling moves the map out from under the pointer, and a step change can
  // remove the dot it was on before 'pointerleave' fires, so both let go of it.
  window.addEventListener('scroll', () => { hideTip(); if (S.hot != null) setHover(null) }, { passive: true })

  function voyagerTip (ev) {
    showTip(ev, `<b>Voyager 1</b>
      <div>Launched in 1977, it is the farthest human-made object, <span class="k-au">${fmtAu(voy.r_au)}</span> from
      the Sun and moving outward about <span class="k-au">${voy.outward_au_per_yr.toFixed(1)} AU</span> a year.
      It crossed into interstellar space in 2012 and is still transmitting.</div>`)
  }

  function glide (from, to, s) {
    glideArgs = [from, to, s]
    const a = boxes[from] || boxes.home, b = boxes[to] || a
    cam = d3.interpolateZoom(viewOf(a), viewOf(b))(s)
    draw()
  }

  // The viewBox is the box's own size in pixels, so text and strokes keep their size.
  new ResizeObserver(() => {
    const r = svg.node().getBoundingClientRect()
    if (r.width < 10 || r.height < 10 || (r.width === W && r.height === H)) return
    W = r.width; H = r.height
    svg.attr('viewBox', `0 0 ${W} ${H}`)
    glide(...glideArgs)
  }).observe(svg.node())

  registerHighlight(id => { if (id !== S.hot) { S.hot = id; draw() } })

  return {
    /** New objects or story step. Objects get their orbit, where they are now and the frames here. */
    update (patch) {
      if (patch.objects) {
        patch.objects = patch.objects.map(o => {
          const nu = trueAnomaly(o.mean_anom_deg, o.e)
          const [x, y] = flatPoint(o.a_au, o.e, o.varpi_deg, nu)
          const pts = flatOrbit(o.a_au, o.e, o.varpi_deg, 240)
          return { ...o, x, y, now_au: Math.hypot(x, y), aph: flatPoint(o.a_au, o.e, o.varpi_deg, 180), pts, path: pathOf(pts) + 'Z' }
        })
        // The objects' first card frames where they are now, so the dots spread
        // across the map. The orbits' card shows every orbit out to the farthest
        // point of the nearest three quarters; longer ones run off the edge until the last card.
        boxes.extreme = union(boxes.pluto, boxOf(patch.objects.map(o => [o.x, o.y])))
        const Qs = patch.objects.map(o => o.Q_au).sort(d3.ascending)
        const reachQ = d3.quantile(Qs, 0.75)
        boxes.orbits = union(boxes.pluto, boxOf(patch.objects.flatMap(o => o.pts.filter(([x, y]) => Math.hypot(x, y) <= reachQ))))
        boxes.p9 = union(boxes.orbits, boxOf(outer))
      }
      if (patch.step && !OBJ_STEPS.includes(patch.step)) { hideTip(); S.hot = null }
      Object.assign(S, patch)
      if (S.far) boxes.farthest = union(boxes.p9, boxOf(S.objects.find(o => o.id === S.far.id)?.pts || []))
      draw()
    },
    /** Move the camera part of the way (s, 0 to 1) from one card's frame to the next. */
    glide,
    /** The width of the view in AU. */
    width: () => cam[2],
    /** The objects as drawn, each with now_au, its distance from the Sun on the catalogue date. */
    objects: () => S.objects,
    p9: P9,
  }
}
