// Section 01 — "how far away are these objects?", as one continuous zoom.
//
// The Sun sits at the left edge and everything else is placed at its true
// distance along a ray from it, after the Outer Wilds planetary chart: the
// planets on the dashed arcs of their orbits, each extreme object on a thin
// line that runs from its closest point to its farthest, Planet Nine as a
// shaded band between the two ends of its predicted orbit. Scrolling changes
// one number, the width of the view in AU, so the reader watches the familiar
// planets shrink into the Sun's glow as the picture opens out.
//
// Distances are to scale. The drawn sizes of the bodies are not, and the
// caption says so. Bodies are drawn from the sprite in art.js.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'
import { registerHighlight, setHover } from '../highlight.js'
import { PLANET_ART } from '../art.js'

const W = 900, H = 520
const SUN = { x: 52, y: H / 2, r: 46 }       // drawn size; not to scale
const RIGHT_PAD = 44
const LIGHT_S_PER_AU = 499.005
const RAD = Math.PI / 180

// Presentation only: drawn size and the angle of each planet's ray, staggered
// so neighbours never sit on one line. Distances come from planets.json.
const LOOK = {
  Mercury: { size: 15, ang: 9 }, Venus: { size: 20, ang: -11 }, Earth: { size: 22, ang: 7 },
  Mars: { size: 17, ang: -15 }, Jupiter: { size: 46, ang: 10 }, Saturn: { size: 50, ang: -9 },
  Uranus: { size: 31, ang: 12 }, Neptune: { size: 30, ang: -7 }, Pluto: { size: 19, ang: 17 },
}
const VOYAGER_AU = 170          // the primer card's "about 170"
const KUIPER = [30, 50]

const nameOf = d => d.name || d.provisional_desig || d.id
const fmt = d3.format(',.0f')
export const fmtAu = au => `${au < 10 ? parseFloat(au.toFixed(au < 2 ? 2 : 1)) : fmt(au)} AU`

/** How long light takes to cover a distance, in round words. */
export function lightTime (au) {
  const s = au * LIGHT_S_PER_AU
  if (s < 90 * 60) return `${Math.round(s / 60)} minutes`
  if (s < 36 * 3600) return `${(s / 3600).toFixed(s < 10 * 3600 ? 1 : 0)} hours`
  return `${Math.round(s / 86400)} days`
}

// A stable pseudo-random spread for the extreme objects' rays, keyed by id so
// nothing shuffles when the filters change.
function hash01 (s) {
  let h = 2166136261
  for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 10007) / 10007
}
const rayAngle = id => { const u = hash01(id); return (u < 0.5 ? -1 : 1) * (7 + ((u * 2) % 1) * 23) }
const tnoArt = id => `tno-${1 + Math.floor(hash01(id + 'v') * 3)}`

const NICE = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]

export function makeDistance (root, { planets, p9 }) {
  const svg = d3.select(root).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'The solar system drawn to scale from the Sun outward, zooming out as you scroll: the planets, Pluto, the extreme objects in view, and the range of distances predicted for Planet Nine.')

  svg.append('defs').append('clipPath').attr('id', 'dist-clip')
    .append('rect').attr('width', W).attr('height', H)

  const g = svg.append('g').attr('clip-path', 'url(#dist-clip)')
  const gBands = g.append('g')
  const gOrbits = g.append('g')
  const gRays = g.append('g')
  const gBodies = g.append('g')
  const gVoy = g.append('g')
  const gSun = g.append('g')
  const gFocus = g.append('g').style('pointer-events', 'none')
  const gNotes = g.append('g').style('pointer-events', 'none')
  const gRuler = svg.append('g').style('pointer-events', 'none')

  gSun.append('use').attr('href', '#art-sun')
    .attr('x', SUN.x - SUN.r).attr('y', SUN.y - SUN.r).attr('width', SUN.r * 2).attr('height', SUN.r * 2)
  gSun.append('text').attr('class', 'dist-lbl muted').attr('x', SUN.x + 4).attr('y', SUN.y + SUN.r + 14)
    .attr('text-anchor', 'middle').text('the Sun')
  svg.append('text').attr('class', 'dist-lbl muted').attr('x', 14).attr('y', H - 12)
    .text('Distances to scale. Sizes are not.')

  // Planet Nine's predicted orbit, and how far the uncertainty stretches it.
  const P9 = {
    a: p9.a, e: p9.e, q: p9.a * (1 - p9.e), Q: p9.a * (1 + p9.e),
    qMin: (p9.a + p9.aErr[0]) * (1 - (p9.e + p9.eErr[1])),
    QMax: (p9.a + p9.aErr[1]) * (1 + (p9.e + p9.eErr[1])),
  }

  const S = { view: 60, step: 'home', objects: [], showP9: true, far: null, hot: null }
  const sector = d3.arc().startAngle(0).endAngle(Math.PI)    // the right half-annulus
  const pos = (au, ang, k) => [SUN.x + au * k * Math.cos(ang * RAD), SUN.y - au * k * Math.sin(ang * RAD)]
  const FOCUS = { home: 'Earth', giants: 'Saturn', neptune: 'Neptune', pluto: 'Pluto', p9: 'p9' }

  function draw () {
    const k = (W - SUN.x - RIGHT_PAD) / S.view

    // The Sun shrinks as the view opens out, so the zoom reads as a zoom; it
    // stays an icon, never to scale (at 5,000 AU it would be a thousandth of a pixel).
    const sunR = Math.max(13, Math.min(SUN.r, SUN.r * Math.pow(1.75 / S.view, 0.28)))
    gSun.select('use').attr('x', SUN.x - sunR).attr('y', SUN.y - sunR).attr('width', sunR * 2).attr('height', sunR * 2)
    gSun.select('text').attr('y', SUN.y + sunR + 14)

    const focus = S.step === 'farthest' ? S.far?.id : FOCUS[S.step]
    const p9On = S.showP9 && (S.step === 'p9' || S.step === 'farthest')
    const notes = []        // { x, y, text, cls, anchor }
    let focusAt = null

    // --- bands: the Kuiper belt and Planet Nine's range ---------------------
    const bands = []
    if ((KUIPER[1] - KUIPER[0]) * k >= 5) bands.push({ id: 'kuiper', r0: KUIPER[0] * k, r1: KUIPER[1] * k, cls: 'kuiper' })
    if (p9On && (P9.Q - P9.q) * k >= 4) {
      bands.push({ id: 'p9wide', r0: P9.qMin * k, r1: P9.QMax * k, cls: 'p9 wide' })
      bands.push({ id: 'p9', r0: P9.q * k, r1: P9.Q * k, cls: 'p9' })
    }
    gBands.selectAll('path').data(bands, d => d.id).join('path')
      .attr('class', d => `dist-band ${d.cls}`)
      .attr('transform', `translate(${SUN.x},${SUN.y})`)
      .attr('d', d => sector({ innerRadius: d.r0, outerRadius: d.r1 }))
    const edges = bands.filter(b => b.id !== 'kuiper').flatMap(b => [{ id: b.id + '0', r: b.r0, cls: b.cls }, { id: b.id + '1', r: b.r1, cls: b.cls }])
    gBands.selectAll('circle').data(edges, d => d.id).join('circle')
      .attr('class', d => `dist-edge ${d.cls}`)
      .attr('cx', SUN.x).attr('cy', SUN.y).attr('r', d => d.r)
    if (bands.some(b => b.id === 'kuiper') && (KUIPER[1] - KUIPER[0]) * k >= 26 && (S.step === 'pluto' || S.step === 'neptune')) {
      const [x, y] = pos((KUIPER[0] + KUIPER[1]) / 2, -22, k)
      notes.push({ x, y: y + 4, text: 'Kuiper belt', cls: 'muted', anchor: 'middle' })
    }

    // --- the planets ---------------------------------------------------------
    const shown = planets.map(p => {
      const look = LOOK[p.name], r = p.a * k
      const size = look.size * Math.min(1, Math.max(0.16, r / 70))
      const [x, y] = pos(p.a, look.ang, k)
      return { ...p, r, size, x, y, art: PLANET_ART[p.name], isFocus: p.name === focus }
    }).filter(p => p.x < W + 40)

    gOrbits.selectAll('circle').data(shown.filter(p => p.r >= 9), p => p.name).join('circle')
      .attr('class', p => `dist-orbit${p.name === 'Pluto' ? ' dwarf' : ''}`)
      .attr('cx', SUN.x).attr('cy', SUN.y).attr('r', p => p.r)

    // Pluto's path crosses inside Neptune's: its near and far ends, on its ray.
    const pluto = shown.find(p => p.name === 'Pluto')
    const plutoLine = pluto && (pluto.Q - pluto.q) * k >= 8
      ? [{ id: 'pluto', x1: pos(pluto.q, LOOK.Pluto.ang, k)[0], y1: pos(pluto.q, LOOK.Pluto.ang, k)[1], x2: pos(pluto.Q, LOOK.Pluto.ang, k)[0], y2: pos(pluto.Q, LOOK.Pluto.ang, k)[1] }]
      : []
    gRays.selectAll('line.dwarf').data(plutoLine, d => d.id).join('line').attr('class', 'dist-ray dwarf')
      .attr('x1', d => d.x1).attr('y1', d => d.y1).attr('x2', d => d.x2).attr('y2', d => d.y2)

    // --- the extreme objects: a thin line from closest to farthest, a rock at the average ---
    const objs = S.objects.map(o => {
      const ang = rayAngle(o.id)
      const [x, y] = pos(o.a_au, ang, k)
      const [x1, y1] = pos(o.q_au, ang, k)
      const [x2, y2] = pos(o.Q_au, ang, k)
      const hot = o.id === S.hot || o.id === focus
      return { ...o, ang, x, y, x1, y1, x2, y2, hot, size: hot ? 20 : 12, art: tnoArt(o.id) }
    })
    gRays.selectAll('line.etno').data(objs, d => d.id).join('line')
      .attr('class', d => `dist-ray etno ${d.alignment === 'anti-aligned' ? 'anti' : 'ali'}${d.hot ? ' hot' : ''}`)
      .attr('x1', d => d.x1).attr('y1', d => d.y1).attr('x2', d => d.x2).attr('y2', d => d.y2)
      .on('pointerenter', hover).on('pointermove', hover).on('pointerleave', unhover)

    // --- bodies: planets and rocks share one layer, drawn far to near --------
    const bodies = [
      ...objs.filter(o => o.x < W + 20).map(o => ({ key: o.id, art: o.art, x: o.x, y: o.y, size: o.size, etno: o, cls: `etno${o.hot ? ' hot' : ''}` })),
      ...shown.map(p => ({ key: p.name, art: p.art, x: p.x, y: p.y, size: p.size, cls: 'planet' })),
    ].sort((a, b) => b.x - a.x)
    gBodies.selectAll('use.gen').data(bodies, d => d.key).join('use')
      .attr('class', d => `dist-body gen ${d.cls}`)
      .attr('href', d => `#art-${d.art}`)
      .attr('x', d => d.x - d.size / 2).attr('y', d => d.y - d.size / 2)
      .attr('width', d => d.size).attr('height', d => d.size)
      .on('pointerenter', (ev, d) => d.etno && hover(ev, d.etno))
      .on('pointermove', (ev, d) => d.etno && hover(ev, d.etno))
      .on('pointerleave', (ev, d) => d.etno && unhover())

    // --- labels: every planet big enough to read, thinned where they crowd ---
    let lastX = -Infinity
    for (const p of shown.slice().sort((a, b) => a.x - b.x)) {
      const want = p.isFocus || (p.size >= 12 && p.r >= 60 && p.x - lastX >= 54)
      if (!want) continue
      lastX = p.x
      const y = p.y + p.size / 2 + 15
      if (p.isFocus) {
        focusAt = { x: p.x, y: p.y, r: p.size * 0.72 + 5 }
        notes.push({ x: p.x, y, text: p.name, cls: 'focus', anchor: 'middle' })
        notes.push({ x: p.x, y: y + 16, text: p.name === 'Pluto' ? `${fmtAu(p.q)} to ${fmtAu(p.Q)}` : fmtAu(p.a), cls: 'focus-v', anchor: 'middle' })
      } else {
        notes.push({ x: p.x, y, text: p.name, cls: '', anchor: 'middle' })
      }
    }

    // --- Planet Nine ---------------------------------------------------------
    const p9use = []
    if (p9On) {
      const size = 36 * Math.min(1, Math.max(0.3, (P9.a * k) / 120))
      const [x, y] = pos(P9.a, 0, k)
      if (x < W + 20 && P9.a * k > 14) p9use.push({ x, y, size })
      if (focus === 'p9' && p9use.length) {
        focusAt = { x, y, r: size * 0.72 + 6, dashed: true }
        notes.push({ x, y: y - size / 2 - 10, text: 'Planet Nine (predicted)', cls: 'focus p9', anchor: 'middle' })
        notes.push({ x, y: y + size / 2 + 17, text: `between ${fmtAu(P9.q)} and ${fmtAu(P9.Q)} on its orbit`, cls: 'focus-v', anchor: 'middle' })
        notes.push({ x, y: y + size / 2 + 33, text: `and anywhere from ~${fmt(P9.qMin)} to ~${fmt(P9.QMax)} AU, given the uncertainty`, cls: 'muted', anchor: 'middle' })
        for (const [au, side, wide] of [[P9.q, -1, false], [P9.Q, 1, false], [P9.qMin, -1, true], [P9.QMax, 1, true]]) {
          const ex = SUN.x + au * k + side * 6
          if (ex > W - 4) continue
          notes.push({ x: ex, y: wide ? y + 19 : y - 9, text: `${wide ? '~' : ''}${fmt(au)} AU`, cls: wide ? 'muted small' : 'focus-v', anchor: side < 0 ? 'end' : 'start' })
        }
      }
    }
    gBodies.selectAll('use.p9').data(p9use).join('use').attr('class', 'dist-body p9')
      .attr('href', '#art-planet-nine')
      .attr('x', d => d.x - d.size / 2).attr('y', d => d.y - d.size / 2).attr('width', d => d.size).attr('height', d => d.size)
      .raise()

    // --- Voyager 1, for a human-made yardstick --------------------------------
    const vx = VOYAGER_AU * k
    const voy = vx > 70 && vx < W - SUN.x - 20 ? [pos(VOYAGER_AU, -14, k)] : []
    const voyG = gVoy.selectAll('g').data(voy).join(enter => {
      const e = enter.append('g').attr('class', 'voy')
      e.append('circle').attr('class', 'hit').attr('r', 14)
      e.append('path').attr('d', 'M-5,5 L5,5 L0,-6 Z')
      return e
    })
    voyG.attr('transform', ([x, y]) => `translate(${x},${y})`)
      .on('pointerenter', voyagerTip).on('pointermove', voyagerTip).on('pointerleave', () => hideTip())
    if (voy.length) notes.push({ x: voy[0][0] + 9, y: voy[0][1] + 4, text: `Voyager 1 · ~${VOYAGER_AU} AU`, cls: 'muted small', anchor: 'start' })

    // --- the farthest point in view -------------------------------------------
    if (S.step === 'farthest' && S.far) {
      const o = objs.find(d => d.id === S.far.id)
      if (o) {
        focusAt = { x: o.x2, y: o.y2, r: 9 }
        const left = o.x2 > W - 260, up = o.y2 > H - 70
        const lx = o.x2 + (left ? -14 : 14)
        notes.push({ x: lx, y: up ? o.y2 - 28 : o.y2 - 8, text: `farthest point: ${fmtAu(o.Q_au)}`, cls: 'focus', anchor: left ? 'end' : 'start' })
        notes.push({ x: lx, y: up ? o.y2 - 11 : o.y2 + 10, text: `${nameOf(o)} · light takes ${lightTime(o.Q_au)} to get there`, cls: 'focus-v', anchor: left ? 'end' : 'start' })
      }
    }

    // --- the hovered rock ------------------------------------------------------
    const hot = objs.find(o => o.id === S.hot)
    if (hot && hot.x < W) notes.push({ x: hot.x, y: hot.y - hot.size / 2 - 7, text: nameOf(hot), cls: 'focus', anchor: 'middle' })

    gFocus.selectAll('circle').data(focusAt ? [focusAt] : []).join('circle')
      .attr('class', d => `dist-focus${d.dashed ? ' dashed' : ''}`)
      .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.r)

    gNotes.selectAll('text').data(notes).join('text')
      .attr('class', d => `dist-lbl ${d.cls}`)
      .attr('x', d => Math.min(W - 6, Math.max(6, d.x))).attr('y', d => d.y)
      .attr('text-anchor', d => d.anchor).text(d => d.text)

    // --- a ruler for the current zoom ------------------------------------------
    const nice = NICE.filter(n => n * k <= 240).pop() ?? NICE[0]
    const len = nice * k, x1 = 16, y = H - 44
    const rule = gRuler.selectAll('g').data([0]).join(enter => {
      const e = enter.append('g').attr('class', 'dist-ruler')
      e.append('line').attr('class', 'bar'); e.append('line').attr('class', 'tick t1'); e.append('line').attr('class', 'tick t2')
      e.append('text').attr('class', 'dist-lbl').attr('text-anchor', 'start')
      return e
    })
    rule.select('.bar').attr('x1', x1).attr('x2', x1 + len).attr('y1', y).attr('y2', y)
    rule.select('.t1').attr('x1', x1).attr('x2', x1).attr('y1', y - 5).attr('y2', y + 5)
    rule.select('.t2').attr('x1', x1 + len).attr('x2', x1 + len).attr('y1', y - 5).attr('y2', y + 5)
    rule.select('text').attr('x', x1).attr('y', y - 9).text(`${fmtAu(nice)} · light takes ${lightTime(nice)}`)
  }

  function hover (ev, d) {
    setHover(d.id)
    showTip(ev, `<b>${nameOf(d)}</b>
      <dl><dt>closest to the Sun</dt><dd>${fmtAu(d.q_au)}</dd>
      <dt>average distance</dt><dd>${fmtAu(d.a_au)}</dd>
      <dt>farthest from the Sun</dt><dd>${fmtAu(d.Q_au)}</dd>
      <dt>light to its far end</dt><dd>${lightTime(d.Q_au)}</dd></dl>
      <div class="note">${d.well_determined ? 'well-measured orbit' : 'seen only briefly: the far end is uncertain'}</div>`)
  }
  function unhover () { setHover(null); hideTip() }

  function voyagerTip (ev) {
    showTip(ev, `<b>Voyager 1</b>
      <div>Launched in 1977, it is the farthest human-made object: about ${VOYAGER_AU} AU from the Sun,
      moving outward at roughly 3.6 AU a year. It crossed into interstellar space in 2012 and is still transmitting.</div>
      <div class="note">A marker for how far people have actually sent anything.</div>`)
  }

  registerHighlight(id => { if (id !== S.hot) { S.hot = id; draw() } })

  return {
    /** New objects, filters or story step. */
    update (patch) { Object.assign(S, patch); draw() },
    /** The width of the view in AU; called on every scroll frame. */
    setView (view) { if (view !== S.view) { S.view = view; draw() } },
    view: () => S.view,
    p9: P9,
    /** The smallest view that keeps an object's far end on the canvas, whatever its ray's angle. */
    viewFor (o) {
      const ang = rayAngle(o.id) * RAD
      const rx = W - SUN.x - RIGHT_PAD, ry = H / 2 - 26
      return o.Q_au * Math.max(Math.cos(ang), Math.abs(Math.sin(ang)) * rx / ry) * 1.04
    },
  }
}
