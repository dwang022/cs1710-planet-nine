// Part 2, page 1: "what a planet would do", which closes the clustering page. One
// picture, With a planet, drawn like the page's head (leanhead.js: seen from above,
// to scale) so the reader already knows how to read it, and beside it a small No
// planet picture with the notes under it (2026-11-16: the two had been side by
// side, and notes floating on the picture covered what they described).
//
//   No planet      sixteen distant orbits pointing every which way; they stay scattered
//   With a planet  the same orbits, with Planet Nine going round its predicted
//                  orbit, in two acts, so its two effects are seen apart (in
//                  reality they happen together):
//     1 Flung out    the orbits pointing its way are met one at a time: a flash
//                    where the planet passes, then the object shoots off along a
//                    dotted trail that ends inside the picture, and its orbit fades;
//                    the rest hold still
//     2 Turned round the orbits it never meets close in on the far side together,
//                    each one straight towards it (none crosses another, so the
//                    picture reads as a pull, not a jiggle), leaving a faint copy
//                    where it started, a curved arrow at its far end saying which
//                    way it turns
//
// Planet Nine's orbit is drawn more stretched than predicted (e = P9_E, against
// about 0.3; 2026-11-16): nearly round, every orbit seemed to cross it alike, and
// readers could not see why only some were flung. As an oval, the orbits that point
// its way visibly run along its path, the others only cut across it.
//
// The explanation is a short note beside the picture at the moments that matter,
// the run pausing on each until Continue, on every run, Play again's too:
//   start   what to watch; Start
//   flung   at the first object flung away, its trail still on the picture: these run alongside its path, so are likely to be flung
//   spared  once the last is gone: the rest rarely cross its path, so are much less likely to be
//   turn    as the turning begins (no orbit picked out: a bold one read as special)
//   end     what is left, and that with no planet they would point every way; Play again
// No clock and no counts: it is a cartoon, so its years and tallies meant nothing.
// It shows what the proposal predicts and takes no side on whether it is right.
//
// A cartoon of the mechanism in Batygin & Brown (2016), not gravity. The planet
// makes LAPS laps (Kepler's speed along the way: slow at the far end), starting
// at its far end, where the head draws it. Each orbit pointing within LINED_UP
// degrees of it is flung at a moment when the planet really passes within REACH
// pixels of it, worked out before the run, one at a time.

import * as d3 from 'd3'
import { flatOrbit, flatPoint, trueAnomaly, PLANET_NINE as REAL_P9 } from '../orbits.js'
import { seededRandom } from '../stats.js'

const S = 360
const c = S / 2
const R = 164                     // pixels from the Sun to the farthest any of the orbits reaches
let k = 1                         // pixels per AU, to scale as the head; set from the orbits in makeCompare
const N = 16
const LINED_UP = 80               // degrees from the planet's direction: these pass close and are thrown out
const SQUEEZE = 0.5               // how much of its angle from the far side an orbit keeps once it has turned:
                                  // half, so they lean that way without bunching up (a quarter looked too drastic)
const LAPS = 5                    // the planet's laps over the whole run
const REACH = 12                  // pixels: this close to the planet counts as a close pass
const PLAY_MS = 14000
const FLY = 0.04                  // share of the run an object takes to leave
const P9_E = 0.65                 // Planet Nine's orbit, stretched for the cartoon (see above)
const PLANET_NINE = { a_au: REAL_P9.a_au, e: P9_E, varpi_deg: REAL_P9.varpi_deg }
const FLING_BY = 0.3               // every object pointing the planet's way is flung by now
const SPARED_AT = 0.42             // the last one's trail has faded: the note on the ones spared
const T1 = 0.45                   // act 1 (flung out) ends and act 2 (turned round) begins
const TURN = 0.4                  // how long the orbits take to turn
const GAP = 0.025                 // the least time between one object being flung and the next
const RAD = Math.PI / 180

const wrap180 = d => ((d + 540) % 360) - 180
const clamp01 = v => Math.max(0, Math.min(1, v))
const warp = ([x, y]) => [c + x * k, c - y * k]
const path = pts => d3.line()(pts.map(warp))
const turn = deg => `rotate(${(-deg).toFixed(2)} ${c} ${c})`
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1])
// from a point, straight away from the Sun, to just inside the picture's edge
const exitFrom = ([x, y]) => { const r = Math.hypot(x - c, y - c) || 1; const f = (c * 0.94) / r; return [c + (x - c) * f, c + (y - c) * f] }

// One plain sentence each (2026-11-16).
const POPS = {
  start: { text: 'Watch how Planet Nine changes the orbits of these objects.', btn: '▶ Start' },
  flung: { k: 'Flung out', text: 'Orbits pointing the same way as Planet Nine’s run alongside its path, so they are likely to be flung out.', btn: 'Continue' },
  spared: { k: 'Spared', text: 'Orbits pointing other ways rarely cross Planet Nine’s path, so they are much less likely to be flung out.', btn: 'Continue' },
  turn: { k: 'Turned round', text: 'Planet Nine’s gravity slowly turns the remaining orbits towards the opposite way.', btn: 'Continue' },
  end: { text: 'The orbits that remain lean opposite to Planet Nine’s. With no planet, they would still point in every direction.', btn: '↺ Play again' },
}

/** root: where the pictures and the notes go. */
export function makeCompare ({ root }) {
  // the make-believe orbits: shapes like the real ones, random starting directions, the same in both pictures
  // (the draws are in the order they always were, so the orbits are the ones readers have seen)
  const rnd = seededRandom(1710)
  const anti = PLANET_NINE.varpi_deg + 180
  const orbits = d3.range(N).map(() => {
    const a = 260 + rnd() * 320, e = 0.72 + rnd() * 0.2, from = rnd() * 360
    const lined = Math.abs(wrap180(from - PLANET_NINE.varpi_deg)) < LINED_UP
    const drift = (rnd() - 0.5) * 24
    rnd()                                                        // a draw the old version used
    // the rest close in on the far side, the short way round: each keeps a quarter of its angle from it, so none
    // overtakes another and none turns more than 50 degrees
    return { a, e, from, drift, lined, to: lined ? from : from - wrap180(from - anti) * (1 - SQUEEZE) }
  })
  k = R / d3.max(orbits, o => o.a * (1 + o.e))
  const lined = orbits.filter(o => o.lined), kept = orbits.filter(o => !o.lined)
  // the planet along its orbit at time t (0..1), starting at its far end
  const planetAtT = t => warp(flatPoint(PLANET_NINE.a_au, PLANET_NINE.e, PLANET_NINE.varpi_deg, trueAnomaly(180 + 360 * LAPS * t, PLANET_NINE.e)))
  const farEnd = (o, deg) => warp(flatPoint(o.a, o.e, deg, 180))

  // --- act 2: every orbit it never meets turns at once, from where it started towards the far side ---
  const turnU = t => clamp01((t - T1) / TURN)
  const angle = (o, t) => o.lined ? o.from : o.from + (o.to - o.from) * d3.easeCubicInOut(turnU(t))

  // --- act 1: when each orbit pointing the planet's way is flung. One at a time, each at a moment the planet
  // really passes it, the first alone so its note speaks of one object; all gone before act 2 ---
  const tl = d3.range(0.03, FLING_BY, 0.001)
  const planetTl = tl.map(planetAtT)
  for (const o of lined) {
    const pts = flatOrbit(o.a, o.e, o.from, 200).map(warp)
    o.gap = planetTl.map(p => d3.min(pts, q => dist(q, p)))
  }
  {
    const left = new Set(lined)
    let next = 0.03
    while (left.size) {
      let best = null
      for (const o of left) {
        let i0 = tl.findIndex(t => t >= next)
        if (i0 < 0) i0 = tl.length - 1
        let i = o.gap.findIndex((g, j) => j >= i0 && g < REACH)
        if (i < 0) i = i0 + d3.minIndex(o.gap.slice(i0))           // no close pass left: its closest
        if (!best || tl[i] < best.t) best = { o, t: tl[i] }
      }
      const o = best.o
      o.out = best.t; o.at = planetAtT(o.out); o.exit = exitFrom(o.at)
      next = o.out + (left.size === lined.length ? 2.4 : 1) * GAP
      left.delete(o)
    }
  }
  const first = lined.reduce((b, o) => !b || o.out < b.out ? o : b, null)

  // a curved arrow just outside an orbit's far end, the way it is turning
  function arrowD (o, t) {
    const ang = angle(o, t), sgn = Math.sign(o.to - o.from)
    const r = dist(farEnd(o, ang), [c, c]) + 9
    const pts = d3.range(7).map(i => { const p = (ang + 180 + sgn * i * 3) * RAD; return [c + r * Math.cos(p), c - r * Math.sin(p)] })
    const [pb, pe] = pts.slice(-2), L = dist(pe, pb) || 1, ux = (pe[0] - pb[0]) / L, uy = (pe[1] - pb[1]) / L
    const head = s => [pe[0] - 7 * (ux * Math.cos(s) - uy * Math.sin(s)), pe[1] - 7 * (uy * Math.cos(s) + ux * Math.sin(s))]
    const f = p => p.map(v => v.toFixed(1)).join(',')
    return `M${pts.map(f).join('L')}M${f(head(0.55))}L${f(pe)}L${f(head(-0.55))}`
  }
  const arrowOp = (o, t) => { const u = turnU(t); return Math.abs(o.to - o.from) < 12 || u <= 0 ? 0 : u < 0.85 ? 1 : (1 - u) / 0.15 }
  // the copy of an orbit where it started: in as the turning begins, out once it is done
  const ghostOp = t => { const u = turnU(t); return u <= 0 ? 0 : u < 1 ? Math.min(1, u / 0.05) : Math.max(0, 1 - (t - T1 - TURN) / 0.05) }

  const orbitD = o => path(flatOrbit(o.a, o.e, 0, 200))
  const frame = (inner, p9) => `<svg viewBox="0 0 ${S} ${S}" aria-hidden="true">
    ${p9 ? `<g class="cmp-ghosts">${kept.map(o => `<path class="cmp-ghost" d="${orbitD(o)}" transform="${turn(o.from)}" opacity="0"/>`).join('')}</g>` : ''}
    ${inner}
    ${p9 ? `<path class="lh-p9" d="${path(flatOrbit(PLANET_NINE.a_au, PLANET_NINE.e, PLANET_NINE.varpi_deg, 240))}"/>
      <g class="cmp-arrows">${kept.map(() => '<path class="cmp-arrow" opacity="0"/>').join('')}</g>
      <g class="cmp-flung">${lined.map(() => '<g opacity="0"><line/><circle class="flash" r="0"/><circle class="obj" r="4"/></g>').join('')}</g>
      <use class="cmp-planet" href="#art-planet-nine" width="26" height="26"/>` : ''}
    <use href="#art-sun" x="${c - 7}" y="${c - 7}" width="14" height="14"/>
  </svg>`
  const made = orbits.map(o => `<path class="cmp-orbit" d="${orbitD(o)}" transform="${turn(o.from)}"/>`).join('')

  // the picture with a planet; beside it the small one without, and under that the notes, so no note covers a drawing
  root.innerHTML = `
    <figure class="cmp-panel" data-p="p9" role="img" aria-label="With a planet going round its orbit, first each orbit lined up with it is met by the planet and its object flung out of the solar system; then the orbits it never meets slowly turn to point the opposite way, and stay."><figcaption>With a planet</figcaption>${frame(made, true)}</figure>
    <div class="cmp-side">
      <figure class="cmp-panel" data-p="none" role="img" aria-label="With no planet, the orbits stay pointing every which way."><figcaption>No planet</figcaption>${frame(made, false)}</figure>
      <div class="cmp-notes" aria-live="polite"></div>
    </div>`
  const notes = root.querySelector('.cmp-notes')

  const sel = p => d3.select(root).selectAll(`.cmp-panel[data-p="${p}"] .cmp-orbit`).data(orbits)
  const none = sel('none'), withP9 = sel('p9')
  const ghosts = d3.select(root).selectAll('.cmp-ghost').data(kept)
  const arrows = d3.select(root).selectAll('.cmp-arrow').data(kept)
  const flung = d3.select(root).selectAll('.cmp-flung > g').data(lined)
  const planet = d3.select(root).select('.cmp-planet')

  // --- the notes: one at a time, beside the picture (never over it); the picture shows what each is about,
  // the objects in question flashing as they are flung, the turning ones leaving copies and arrows ---
  function pop (key, { onBtn } = {}) {
    const p = POPS[key]
    const el = document.createElement('div')
    el.className = 'cmp-pop'
    el.innerHTML = `${p.k ? `<b class="cmp-pop-k">${p.k}</b>` : ''}<p>${p.text}</p>${p.btn ? `<button type="button" class="pic-btn primary">${p.btn}</button>` : ''}`
    notes.replaceChildren(el)
    el.querySelector('button')?.addEventListener('click', () => { clearPops(); onBtn?.() })
    el.querySelector('button')?.focus({ preventScroll: true })
  }
  const clearPops = () => notes.replaceChildren()

  // --- the run: forward frame by frame, pausing at the moments that matter ----------
  let t = 0, base = 0, timer = null, seen = new Set()
  function show () {
    const pos = planetAtT(t)
    planet.attr('x', pos[0] - 13).attr('y', pos[1] - 13)
    none.attr('transform', o => turn(o.from + o.drift * d3.easeCubicInOut(t)))
    const gone = o => !o.lined || t < o.out ? 0 : Math.min(1, (t - o.out) / FLY)
    withP9.attr('transform', o => turn(angle(o, t))).attr('opacity', o => 1 - gone(o))
      .classed('is-out', o => o.lined && t >= o.out)
    ghosts.attr('opacity', ghostOp(t))
    arrows.each(function (o) {
      const op = arrowOp(o, t)
      d3.select(this).attr('opacity', op).attr('d', op > 0 ? arrowD(o, t) : null)
    })
    // a flung object: a flash where it met the planet, then off along a dotted trail that fades inside the picture
    flung.each(function (o) {
      const g = d3.select(this), f = gone(o)
      if (t < o.out) { g.attr('opacity', 0); return }
      const [x, y] = [o.at[0] + (o.exit[0] - o.at[0]) * f, o.at[1] + (o.exit[1] - o.at[1]) * f]
      g.attr('opacity', t - o.out < FLY * 2 ? 1 : Math.max(0, 1 - (t - o.out - FLY * 2) / FLY))
      g.select('line').attr('x1', o.at[0]).attr('y1', o.at[1]).attr('x2', x).attr('y2', y)
      g.select('.flash').attr('cx', o.at[0]).attr('cy', o.at[1]).attr('r', f < 1 ? 5 + 14 * f : 0).attr('opacity', 1 - f)
      g.select('.obj').attr('cx', x).attr('cy', y)
    })
  }
  function stop () { timer?.stop(); timer = null; base = t }
  function go () {
    stop(); clearPops()
    timer = d3.timer(ms => {
      t = Math.min(1, base + ms / PLAY_MS)
      show()
      // paused with the first object two-thirds of the way out, its trail still in the picture
      if (first && !seen.has('flung') && t >= first.out + FLY * 0.66) {
        seen.add('flung'); stop(); pop('flung', { onBtn: go }); return
      }
      // paused once every object pointing the planet's way has gone, before the rest begin to turn
      if (!seen.has('spared') && t >= SPARED_AT) {
        seen.add('spared'); stop(); show(); pop('spared', { onBtn: go }); return
      }
      // paused once the orbits are a quarter of the way round
      if (kept.length && !seen.has('turn') && turnU(t) >= 0.25) {
        seen.add('turn'); stop(); show(); pop('turn', { onBtn: go }); return
      }
      if (t >= 1) { stop(); pop('end', { onBtn: play }) }
    })
  }
  // Start, and Play again from the last note: the same run each time, the notes and their pauses too
  function play () {
    t = 0; seen = new Set(); show(); clearPops()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (let i = 0; i <= 400; i++) { t = i / 400; show() }
      pop('end', { onBtn: play }); return
    }
    base = 0; go()
  }
  show()
  pop('start', { onBtn: play })
}
