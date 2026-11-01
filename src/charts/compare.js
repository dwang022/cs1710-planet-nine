// Part 2, page 1: "what a planet would do", two pictures side by side that close
// the clustering page. Each is drawn like the page's head (leanhead.js), so the
// reader already knows how to read it:
//
//   No planet      sixteen distant orbits pointing every which way; four
//                  billion years pass and they stay scattered
//   With a planet  the same orbits, with Planet Nine going round its predicted
//                  orbit. An orbit lined up with it is caught when the planet
//                  passes it: a flash where they meet, then the object shoots
//                  off past the edge along a dotted trail (flung out of the
//                  solar system) and its orbit fades; a count on the bar. The
//                  ones pointing away are never met up close; they stay, and
//                  settle on the far side.
//
// The explanation is not a paragraph under the pictures: short pop-ups appear on
// them at the moments that matter, and the run pauses on each until Continue.
//   start   what the lines are; Start
//   flung   at the first object flung away, once it has gone
//   stay    halfway, on one orbit that points away yet crosses the planet's
//           path on the picture: the crossings are ringed and its object is
//           shown going round in step with the planet (a whole-number rhythm,
//           as a resonance keeps it), so it is always elsewhere when the planet
//           reaches a crossing
//   end     over what is left, and over the picture with no planet
// Play again runs it once more without stopping. It shows what the proposal
// predicts and takes no side on whether it is right; the line under the key
// hands that to the next pages.
//
// Both are a cartoon of the mechanism in Batygin & Brown (2016), not gravity.
// The planet makes LAPS laps (Kepler's speed along the way: slow at the far
// end), starting and ending at its far end, where the head draws it. An orbit
// pointing within LINED_UP degrees of it becomes catchable at its own moment and
// is thrown out the next time the planet passes within REACH pixels of it; every
// other eases from its random start to the side opposite the planet, give or
// take its own small offset. Without the planet, each drifts a little and stays.

import * as d3 from 'd3'
import { flatOrbit, flatPoint, planetAt, trueAnomaly, PLANET_NINE } from '../orbits.js'
import { seededRandom } from '../stats.js'

const S = 360
const c = S / 2
const R = 158                     // pixels for EDGE_AU
const EDGE_AU = 1100
const k = R / Math.sqrt(EDGE_AU)
const N = 16
const LINED_UP = 80               // degrees from the planet's direction: these pass close and are thrown out
const LAPS = 3
const REACH = 14                  // pixels: this close to the planet counts as a close pass
const PLAY_MS = 10000
const FLY = 0.05                  // share of the run an object takes to leave the picture
const GIANTS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune']

const wrap180 = d => ((d + 540) % 360) - 180
function warp ([x, y]) {
  const r = Math.hypot(x, y)
  if (!r) return [c, c]
  const s = k * Math.sqrt(r) / r
  return [c + x * s, c - y * s]
}
const path = pts => d3.line()(pts.map(warp))
const turn = deg => `rotate(${(-deg).toFixed(2)} ${c} ${c})`
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1])
// from a point, straight away from the Sun to just past the picture's edge
const exitFrom = ([x, y]) => { const r = Math.hypot(x - c, y - c) || 1; const f = (c * 1.45) / r; return [c + (x - c) * f, c + (y - c) * f] }

const POPS = {
  start: { text: 'Each line is the orbit of a small icy world. Watch what the planet does.', btn: '▶ Start' },
  flung: { text: 'Too close! The planet flings this one out of the solar system.', btn: 'Continue' },
  stay: { text: 'The white orbit crosses the planet’s path (circled), but the two go round in step: when the planet reaches a crossing, the object (dot) is always somewhere else. It is never flung.', btn: 'Continue', side: true },
  end: { text: 'What’s left all points away from the planet.' },
  none: { text: 'No planet: still every which way.' },
}

/** For the page's note on how the cartoon works. */
export const COMPARE = { linedUp: LINED_UP }

/** planets: planets.json rows; jd: their date; root: where the two panels go; bar: the play bar; stage: holds the pop-ups. */
export function makeCompare ({ root, bar, stage, planets, jd }) {
  const giants = planets.filter(p => GIANTS.includes(p.name)).map(p => planetAt(p, jd))
  // the make-believe orbits: shapes like the real ones, random starting directions, the same in both pictures
  const rnd = seededRandom(1710)
  const anti = PLANET_NINE.varpi_deg + 180
  const orbits = d3.range(N).map(() => {
    const a = 260 + rnd() * 320, e = 0.72 + rnd() * 0.2, from = rnd() * 360
    const lined = Math.abs(wrap180(from - PLANET_NINE.varpi_deg)) < LINED_UP
    return {
      a, e, from, drift: (rnd() - 0.5) * 24, lined,
      ready: null,                                // from when the planet can catch it: staggered below
      to: lined ? from + (rnd() - 0.5) * 20 : from + wrap180(anti + (rnd() - 0.5) * 70 - from),
    }
  })
  const lined = orbits.filter(o => o.lined), kept = orbits.filter(o => !o.lined)
  const p9Pts = flatOrbit(PLANET_NINE.a_au, PLANET_NINE.e, PLANET_NINE.varpi_deg, 360).map(warp)
  // one at a time: the first can be caught early and alone, the rest follow at intervals
  lined.forEach((o, i) => { o.ready = 0.06 + i * (0.6 / lined.length) })
  // the planet along its orbit at time t (0..1), starting and ending at its far end
  const planetAtT = t => warp(flatPoint(PLANET_NINE.a_au, PLANET_NINE.e, PLANET_NINE.varpi_deg, trueAnomaly(180 + 360 * LAPS * t, PLANET_NINE.e)))
  const angle = (o, t, e) => o.from + (o.to - o.from) * (o.lined ? Math.min(1, t / (o.out ?? 1)) : e)
  const farEnd = (o, deg) => warp(flatPoint(o.a, o.e, deg, 180))

  // --- the one survivor that shows why: its path crosses the planet's, yet it is never met ---
  // where a path, at its final direction, crosses the planet's on the picture
  const crossings = o => {
    const out = []
    for (const q of flatOrbit(o.a, o.e, o.to, 360).map(warp)) {
      if (p9Pts.some(r => dist(q, r) < 2.2) && out.every(c => dist(c, q) > 20)) out.push(q)
    }
    return out
  }
  // the survivor that crosses and turns least on the way, so it is easy to follow
  const demo = kept.map(o => ({ o, x: crossings(o) })).filter(d => d.x.length)
    .sort((a, b) => Math.abs(a.o.to - a.o.from) - Math.abs(b.o.to - b.o.from))[0]
  const DEMO_FROM = 0.5
  if (demo) {
    const o = demo.o, true_ = (PLANET_NINE.a_au / o.a) ** 1.5
    // going round in step: the simplest whole-number rhythm near its true period against the planet's
    const ratio = [1, 1.5, 2, 2.5, 3].reduce((b, r) => Math.abs(r - true_) < Math.abs(b - true_) ? r : b)
    const at = (t, phase) => warp(flatPoint(o.a, o.e, angle(o, t, d3.easeCubicInOut(t)), trueAnomaly(phase + 360 * LAPS * ratio * t, o.e)))
    // the starting point that keeps it farthest from the planet for the rest of the run
    let best = 0, bestGap = -1
    for (let ph = 0; ph < 360; ph += 4) {
      let gap = Infinity
      for (let i = 0; i <= 200; i++) { const t = DEMO_FROM + (1 - DEMO_FROM) * i / 200; gap = Math.min(gap, dist(at(t, ph), planetAtT(t))) }
      if (gap > bestGap) { bestGap = gap; best = ph }
    }
    demo.pos = t => at(t, best)
    // pause when the planet sits on a crossing and the object is farthest from it
    let pick = null
    for (let i = 0; i <= 400; i++) {
      const t = DEMO_FROM + 0.04 + 0.4 * i / 400, pl = planetAtT(t)
      if (!demo.x.some(c => dist(c, pl) < 9)) continue
      const gap = dist(demo.pos(t), pl)
      if (!pick || gap > pick.gap) pick = { t, gap }
    }
    demo.pauseAt = pick ? pick.t : DEMO_FROM + 0.04
  }

  const frame = (inner, p9) => `<svg viewBox="0 0 ${S} ${S}" aria-hidden="true">
    ${giants.map(p => `<path class="lh-ring" d="${path(flatOrbit(p.a, p.e, p.varpi, 120))}"/>`).join('')}
    ${inner}
    ${p9 ? `<path class="lh-p9" d="${path(flatOrbit(PLANET_NINE.a_au, PLANET_NINE.e, PLANET_NINE.varpi_deg, 240))}"/>
      <g class="cmp-flung">${lined.map(() => '<g opacity="0"><line/><circle class="flash" r="0"/><circle class="obj" r="4"/></g>').join('')}</g>
      <g class="cmp-demo" opacity="0">${demo ? demo.x.map(([x, y]) => `<circle class="cross" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9"/>`).join('') : ''}<circle class="obj" r="4.5"/></g>
      <use class="cmp-planet" href="#art-planet-nine" width="30" height="30"/>` : ''}
    <use href="#art-sun" x="${c - 7}" y="${c - 7}" width="14" height="14"/>
  </svg>`
  const made = orbits.map(o => `<path class="cmp-orbit" d="${path(flatOrbit(o.a, o.e, 0, 200))}" transform="${turn(o.from)}"/>`).join('')

  root.innerHTML = `
    <figure class="cmp-panel" data-p="none"><figcaption>No planet</figcaption>${frame(made, false)}</figure>
    <figure class="cmp-panel" data-p="p9"><figcaption>With a planet</figcaption>${frame(made, true)}</figure>`
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'Two pictures. With no planet, the orbits stay pointing every which way. With a planet going round its orbit, each orbit lined up with it is caught when the planet passes it, and the object is flung out of the solar system; the ones pointing away stay, so the survivors all stretch the opposite way from it.')

  const svgOf = p => root.querySelector(`.cmp-panel[data-p="${p}"] svg`)
  const sel = p => d3.select(root).selectAll(`.cmp-panel[data-p="${p}"] .cmp-orbit`).data(orbits)
  const none = sel('none'), withP9 = sel('p9')
  const flung = d3.select(root).selectAll('.cmp-flung > g').data(lined)
  const planet = d3.select(root).select('.cmp-planet')
  const demoG = d3.select(root).select('.cmp-demo')
  const clock = bar.querySelector('.pic-time'), btn = bar.querySelector('button'), count = bar.querySelector('.cmp-count')

  // --- the pop-ups: a bubble on a picture, pointing at a spot in it ------------------
  function pop (key, panel, at, { onBtn } = {}) {
    const p = POPS[key], svg = svgOf(panel), r = svg.getBoundingClientRect(), s = stage.getBoundingClientRect()
    const x = r.left - s.left + at[0] * r.width / S, y = r.top - s.top + at[1] * r.height / S
    const el = document.createElement('div')
    el.className = 'cmp-pop'
    el.setAttribute('role', 'status')
    el.innerHTML = `<p>${p.text}</p>${p.btn ? `<button type="button" class="pic-btn primary">${p.btn}</button>` : ''}`
    stage.appendChild(el)
    const w = el.offsetWidth, h = el.offsetHeight
    if (p.side && x - w - 20 > 0) {
      // beside the spot, to its left, so the picture round it stays clear
      el.style.left = `${x - w - 18}px`
      el.style.top = `${Math.max(6, Math.min(s.height - h - 6, y - h / 2))}px`
      el.dataset.side = 'left'
      el.style.setProperty('--tail', `${Math.max(14, Math.min(h - 14, y - parseFloat(el.style.top)))}px`)
    } else {
      // above the spot if there is room, else below; kept inside the stage
      const below = y - h - 16 < 0
      el.style.left = `${Math.max(6, Math.min(s.width - w - 6, x - w / 2))}px`
      el.style.top = `${below ? y + 16 : y - h - 16}px`
      el.dataset.side = below ? 'below' : 'above'
      el.style.setProperty('--tail', `${Math.max(14, Math.min(w - 14, x - parseFloat(el.style.left)))}px`)
    }
    el.querySelector('button')?.addEventListener('click', () => { clearPops(); onBtn?.() })
    el.querySelector('button')?.focus({ preventScroll: true })
  }
  const clearPops = () => stage.querySelectorAll('.cmp-pop').forEach(el => el.remove())

  // --- the run: forward frame by frame, pausing at the moments that matter ----------
  let t = 0, base = 0, timer = null, guided = true, seen = new Set()
  function reset () { for (const o of lined) { o.out = null; o.at = null; o.exit = null } t = 0; seen = new Set() }
  function catches (pos) {
    // on a guided run the first one is caught alone, so its pop-up speaks of one object
    const holding = guided && !seen.has('flung') && lined.some(o => o.out != null)
    for (const o of lined) {
      if (holding || o.out != null || t < o.ready) continue
      const near = flatOrbit(o.a, o.e, angle(o, t, 0), 160).map(warp).reduce((b, q) => dist(q, pos) < dist(b, pos) ? q : b)
      // caught when the planet passes close; never left to the end of the run
      if (dist(near, pos) < REACH || t > Math.min(0.94, o.ready + 0.45)) {
        o.out = t; o.at = dist(near, pos) < REACH ? pos : near; o.exit = exitFrom(o.at)
      }
    }
  }
  function show () {
    const e = d3.easeCubicInOut(t)
    const pos = planetAtT(t)
    planet.attr('x', pos[0] - 15).attr('y', pos[1] - 15)
    catches(pos)
    none.attr('transform', o => turn(o.from + o.drift * e))
    const gone = o => o.out == null ? 0 : Math.max(0, Math.min(1, (t - o.out) / FLY))
    withP9.attr('transform', o => turn(angle(o, t, e))).attr('opacity', o => 1 - gone(o)).classed('is-out', o => o.out != null)
      .classed('is-demo', o => demo && o === demo.o && t >= DEMO_FROM)
    // the survivor going round in step, its crossings ringed
    if (demo) {
      const on = t >= DEMO_FROM
      demoG.attr('opacity', on ? 1 : 0)
      if (on) { const [x, y] = demo.pos(t); demoG.select('.obj').attr('cx', x).attr('cy', y) }
    }
    // a flung object: a flash where it met the planet, then off past the edge along a dotted trail
    flung.each(function (o) {
      const g = d3.select(this), f = gone(o)
      if (o.out == null) { g.attr('opacity', 0); return }
      const [x, y] = [o.at[0] + (o.exit[0] - o.at[0]) * f, o.at[1] + (o.exit[1] - o.at[1]) * f]
      g.attr('opacity', t - o.out < FLY * 3 ? 1 : Math.max(0, 1 - (t - o.out - FLY * 3) / FLY))
      g.select('line').attr('x1', o.at[0]).attr('y1', o.at[1]).attr('x2', x).attr('y2', y)
      g.select('.flash').attr('cx', o.at[0]).attr('cy', o.at[1]).attr('r', f < 1 ? 5 + 14 * f : 0).attr('opacity', 1 - f)
      g.select('.obj').attr('cx', x).attr('cy', y)
    })
    const n = lined.filter(o => o.out != null).length
    count.textContent = n ? `${n} flung away` : ''
    clock.textContent = t === 0 ? 'now' : `${(t * 4).toFixed(1)} billion years later`
  }
  function stop () { timer?.stop(); timer = null; base = t }
  function go () {
    stop(); clearPops()
    timer = d3.timer(ms => {
      t = Math.min(1, base + ms / PLAY_MS)
      show()
      if (guided) {
        // paused with the object two-thirds of the way out, still in the picture, the bubble pointing at it
        const first = lined.find(o => o.out != null && t >= o.out + FLY * 0.66)
        if (first && !seen.has('flung')) {
          seen.add('flung'); stop()
          const f = Math.min(1, (t - first.out) / FLY)
          pop('flung', 'p9', [0, 1].map(i => Math.max(18, Math.min(S - 18, first.at[i] + (first.exit[i] - first.at[i]) * f))), { onBtn: go }); return
        }
        if (t >= (demo?.pauseAt ?? 0.55) && !seen.has('stay')) {
          seen.add('stay'); stop(); show()
          // the bubble sits off the picture's left edge, level with the object, so the white orbit stays in view
          const o = demo?.o ?? kept[0]
          pop('stay', 'p9', demo ? [0, demo.pos(t)[1]] : farEnd(o, angle(o, t, d3.easeCubicInOut(t))), { onBtn: go }); return
        }
      }
      if (t >= 1) { stop(); ending() }
    })
  }
  function ending () {
    const ends = kept.map(o => farEnd(o, o.to))
    pop('end', 'p9', [d3.mean(ends, p => p[0]), d3.mean(ends, p => p[1])])
    pop('none', 'none', [c, c * 0.35])
  }
  function play () {
    reset(); show(); clearPops()
    btn.textContent = '↺ Play again'
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (let i = 0; i <= 400; i++) { t = i / 400; show() }
      ending(); btn.textContent = '↺ Play again'; return
    }
    base = 0; go()
  }
  btn.addEventListener('click', () => {
    // the bar's button: Start the first time, Play again (without stopping) after that
    if (btn.textContent.includes('again')) guided = false
    play()
  })
  reset(); show()
  // the first time the pictures come into view, the opening pop-up waits with its Start button
  const io = new IntersectionObserver(es => {
    if (es.some(e => e.isIntersecting)) { io.disconnect(); pop('start', 'p9', [c, c * 0.62], { onBtn: play }) }
  }, { threshold: 0.4 })
  io.observe(root)
  // the bubbles are placed in pixels: on a resize, put the ones showing back where they belong by redrawing nothing,
  // only hiding them until the reader moves on (the run's own pop-ups come back at their moments)
  new ResizeObserver(() => { if (!timer) stage.querySelectorAll('.cmp-pop:not(:has(button))').forEach(el => el.remove()) }).observe(stage)
}
