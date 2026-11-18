// The clustering page's walkthrough (2026-11-17): one module drawn twice, side by side, so the two clues are read
// with one method at once instead of one after the other:
//
//   kind 'stretch'  which way each orbit stretches out: an arrow from the Sun towards the orbit's far end (its
//                   longitude of perihelion plus 180 degrees; the closest point is on the other side of the Sun)
//   kind 'tilt'     which way each orbit tilts: an arrow from the Sun along the planets' plane, towards the side
//                   where the orbit rises above it (its longitude of ascending node plus 90 degrees), at right
//                   angles to the line the orbit is tipped about (its hinge, the line of nodes)
//
// Each dial starts as a drawing of Sedna's orbit through a camera that can look down from above or along the
// planets' plane from the side, and zoom (one move between views: round, up and in or out together). Sedna's
// arrow lies on the plane and is drawn through the same camera, so the tilt arrow found from the side (along the
// level line, towards the side the orbit rises) is carried up into the view from above, where its angle is
// counted from the right by a sweeping arc. From the step that adds every object each dial is a compass: every
// object's arrow, one length, dashed and grey, its dot just past the circle; their middle, solid, thick and white;
// and how tight they are as a wedge, the middle plus and minus their spread (the typical angle between each arrow
// and the middle, Batygin and Brown's measure, the one the probability page tests; 2026-11-17, asked for: the
// alignment, the length of the combined arrow, was a second measure the reader met only here). The camera can also
// be moved off the Sun (`fit`), so Sedna's whole orbit fills the dial on the first step, Neptune's orbit small at
// the Sun. Then the stretch dial alone draws the six orbits of 2016 and
// Planet Nine's predicted orbit, and after it the tilt dial alone adds Planet Nine's orbit to its compass, its
// raised half filled like Sedna's (the lid), and its tilt arrow beside the six's average (one change a step, each
// staged: what goes, then what comes). Seen from above, the orbit's raised half is filled, a lid on its hinge (the
// line it is tipped about, drawn thick and named), so where the tilt arrow points can be seen.
//
// Labels keep one size on screen whatever the dial's size (--u, set from the drawing's width); the numbers the
// dial measures are in the part's colour, as on the cards. Pointing at an object in either dial lights it in both
// (highlight.js) and opens its card; a click keeps the card. Every number on the cards is computed on load in
// pages/clustering.js.

import * as d3 from 'd3'
import { positionAt, PLANET_NINE } from '../orbits.js'
import { registerHighlight, setHover } from '../highlight.js'

const W = 760, H = 760
const cx = W / 2, cy = H / 2
const PLOT_R = 360
const RING_R = 210            // the compass circle; also an arrow's full length
const SWEEP_R = 92            // the arc that counts an arrow's angle from the right
const RAD = Math.PI / 180
const T = 750
const NEPTUNE = { a: 30.07, e: 0.00859, i: 1.770, node: 131.784, argperi: 273.19 }

const nameOf = d => d.name || d.provisional_desig || d.id
const ax = (deg, r) => cx + r * Math.cos(deg * RAD)
const ay = (deg, r) => cy - r * Math.sin(deg * RAD)
/** Which way an orbit stretches out: from the Sun towards its far end. */
export const stretchOf = o => (o.varpi_deg + 180) % 360
/** Which way an orbit tilts: from the Sun along the plane, towards the side where the orbit rises above it. */
export const tiltOf = o => (o.node_deg + 90) % 360
const P9 = PLANET_NINE
const KINDS = {
  stretch: { angle: stretchOf, p9: (P9.varpi_deg + 180) % 360, mean: 'middle' },
  tilt: { angle: tiltOf, p9: (P9.node_deg + 90) % 360, mean: 'middle' },
}
const orbitOf = (o, nu) => positionAt(o.a_au, o.e, o.i_deg, o.node_deg, o.argperi_deg, nu)
const p9At = nu => positionAt(P9.a_au, P9.e, P9.i_deg, P9.node_deg, P9.argperi_deg, nu)

/** An orbit as two runs of points, the half raised above the plane and the half below, and whole. */
function halves (at) {
  const pts = d3.range(0, 360, 0.5).map(at)
  const start = pts.findIndex((p, i) => p[2] >= 0 && pts[(i + pts.length - 1) % pts.length][2] < 0)
  const run = [...pts.slice(start), ...pts.slice(0, start)]
  const split = run.findIndex(p => p[2] < 0)
  return { up: run.slice(0, split + 1), down: [...run.slice(split - 1), run[0]], all: [...pts, pts[0]] }
}
const arcTo = (deg, r) => d3.line()([...d3.range(0, deg, 2), deg].map(t => [ax(t, r), ay(t, r)]))

export function makeDial (root, { kind }) {
  const K = KINDS[kind]
  const angle = K.angle
  const svg = d3.select(root).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  // the drawing's units per screen pixel, so the labels' CSS sizes hold on screen however large the dial is drawn
  // (the drawing is fitted inside the svg's box, so its scale is set by the box's shorter side)
  let uPx = 1.8          // the drawing's units per screen pixel, for gaps that must hold on screen like the words
  new ResizeObserver(() => {
    const { width, height } = svg.node().getBoundingClientRect()
    if (width > 0 && height > 0) { uPx = Math.max(W / width, H / height); svg.style('--u', uPx.toFixed(3)) }
  }).observe(svg.node())
  const defs = svg.append('defs')
  const clipId = `dial-clip-${kind}`
  defs.append('clipPath').attr('id', clipId).append('circle').attr('cx', cx).attr('cy', cy).attr('r', PLOT_R)
  const marker = (id, fill, size) => defs.append('marker').attr('id', `${id}-${kind}`).attr('viewBox', '0 0 10 10')
    .attr('refX', 7).attr('refY', 5).attr('markerWidth', size).attr('markerHeight', size)
    .attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', fill)
  marker('dh', 'var(--text-primary)', 18)
  marker('dh-p9', 'var(--p9)', 18)
  marker('dh-old', 'var(--text-muted)', 18)
  marker('dh-each', 'var(--text-secondary)', 10)
  marker('dh-num', 'var(--part)', 15)
  const url = id => `url(#${id}-${kind})`

  const clipped = svg.append('g').attr('clip-path', `url(#${clipId})`)
  const gPlane = clipped.append('g').attr('opacity', 0)      // the plane of the planets: a level line from the side
  const gNeptune = clipped.append('g').attr('opacity', 0)
  const gSix = clipped.append('g').attr('opacity', 0)        // the six orbits of 2016
  const gP9 = clipped.append('g').attr('opacity', 0)         // Planet Nine's predicted orbit
  const gOrbit = clipped.append('g').attr('opacity', 0)      // Sedna's orbit (tilt: raised half solid, lower half dashed)
  const gCompass = svg.append('g').attr('opacity', 0)
  const gAngle = svg.append('g').attr('opacity', 0)          // the side view's angle between the plane and the orbit
  const gSweep = svg.append('g').attr('opacity', 0)          // the arc that counts Sedna's arrow from the right
  const gSpokes = svg.append('g').style('pointer-events', 'none')
  const gWedge = svg.append('g').style('pointer-events', 'none').attr('opacity', 0)   // the middle plus and minus the spread
  const gHinge = svg.append('g').attr('opacity', 0)          // the right angle between the hinge and the tilt arrow
  const gPointer = svg.append('g').attr('opacity', 0)
  const p9Spoke = svg.append('line').attr('stroke', 'var(--p9)').attr('stroke-width', 3)
    .attr('stroke-dasharray', '2 6').attr('stroke-linecap', 'round').attr('marker-end', url('dh-p9'))
    .attr('x1', cx).attr('y1', cy).attr('x2', ax(K.p9, RING_R)).attr('y2', ay(K.p9, RING_R)).attr('opacity', 0)
  const gMean = svg.append('g')
  const gDots = svg.append('g')
  const wedgeLbl = svg.append('text').attr('class', 'halo dial-lbl dial-spread').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('opacity', 0)
  const gNotes = svg.append('g').style('pointer-events', 'none')
  // the Sun, where the camera puts it (at the middle unless the camera is moved off it)
  const sunIcon = svg.append('use').attr('href', '#art-sun').style('pointer-events', 'none')
    .attr('x', cx - 13).attr('y', cy - 13).attr('width', 26).attr('height', 26)

  const card = d3.select(root).append('div').attr('class', 'pick-card').attr('hidden', true).attr('role', 'dialog')
  let picked = null, pinned = false, closing = null
  card.on('mouseenter', () => clearTimeout(closing))
    .on('mouseleave', () => { if (!pinned) { clearTimeout(closing); closing = setTimeout(close, 260) } })

  // --- what the camera draws ---------------------------------------------------------------------------
  const planePath = gPlane.append('path').attr('fill', 'var(--text-primary)').attr('fill-opacity', 0.035)
    .attr('stroke', 'var(--text-muted)').attr('stroke-opacity', 0.6).attr('stroke-width', 1.5)
  const neptunePath = gNeptune.append('path').attr('fill', 'none').attr('stroke', 'var(--neptune)').attr('stroke-width', 2.6)
  // the raised half filled, a lid on its hinge (seen from above; from the side it closes to a line)
  const lid = gOrbit.append('path').attr('fill', 'var(--series-1)').attr('fill-opacity', 0.16).attr('stroke', 'none').attr('opacity', 0)
  const above = gOrbit.append('path').attr('fill', 'none').attr('stroke', 'var(--series-1)').attr('stroke-width', 2.6)
  const below = gOrbit.append('path').attr('fill', 'none').attr('stroke', 'var(--series-1)').attr('stroke-width', 2)
    .attr('stroke-dasharray', '5 6').attr('stroke-opacity', 0.85)
  // the hinge: thick and segmented, like the barrel of a hinge
  const nodeLine = gOrbit.append('line').attr('stroke', 'var(--text-primary)').attr('stroke-width', 4)
    .attr('stroke-dasharray', '14 6').attr('stroke-linecap', 'butt').attr('opacity', 0)
  const closest = gOrbit.append('circle').attr('r', 7).attr('fill', 'var(--series-1)')
    .attr('stroke', 'var(--surface-1)').attr('stroke-width', 2).attr('opacity', 0)
  const p9Path = gP9.append('path').attr('fill', 'none').attr('stroke', 'var(--p9)').attr('stroke-width', 2.6)
    .attr('stroke-dasharray', '2 7').attr('stroke-linecap', 'round')
  const p9Lid = gP9.insert('path', ':first-child').attr('fill', 'var(--p9)').attr('fill-opacity', 0.12).attr('stroke', 'none').attr('opacity', 0)
  // in the tilt dial, as Sedna's was on step 4: the half raised above the plane solid, the half below dashed
  // (2026-11-17, asked for)
  const p9Up = gP9.append('path').attr('fill', 'none').attr('stroke', 'var(--p9)').attr('stroke-width', 2.6).attr('opacity', 0)
  const p9Down = gP9.append('path').attr('fill', 'none').attr('stroke', 'var(--p9)').attr('stroke-width', 2)
    .attr('stroke-dasharray', '5 6').attr('stroke-opacity', 0.85).attr('opacity', 0)
  // Planet Nine's hinge, drawn as Sedna's was, a little past its orbit either side
  const p9Hinge = gP9.append('line').attr('stroke', 'var(--text-primary)').attr('stroke-width', 4)
    .attr('stroke-dasharray', '14 6').attr('stroke-linecap', 'butt').attr('opacity', 0)
  const p9Icon = gP9.append('use').attr('href', '#art-planet-nine').attr('width', 34).attr('height', 34)
  // Sedna's arrow, on the plane, through the camera: seen from above it is an arrow's full length
  const pointer = gPointer.append('line').attr('stroke', 'var(--text-primary)').attr('stroke-width', 2.4)
    .attr('stroke-dasharray', '6 5').attr('marker-end', url('dh')).attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', cy)
  const square = gHinge.append('path').attr('fill', 'none').attr('stroke', 'var(--text-secondary)').attr('stroke-width', 1.5)

  // --- the compass and the alignment's scale, drawn once ---------------------------------------------------
  gCompass.append('circle').attr('cx', cx).attr('cy', cy).attr('r', RING_R)
    .attr('fill', 'none').attr('stroke', 'var(--text-muted)').attr('stroke-opacity', 0.5)
  gCompass.selectAll('line').data(d3.range(0, 360, 45)).join('line')
    .attr('x1', d => ax(d, 14)).attr('y1', d => ay(d, 14)).attr('x2', d => ax(d, RING_R)).attr('y2', d => ay(d, RING_R))
    .attr('stroke', 'var(--rule)')
  // the degrees hug the circle while it holds one arrow, and move out past the dots once it holds them all
  const degR = ring => ring ? PLOT_R - 8 : RING_R + 24
  const degLabels = gCompass.selectAll('text').data(d3.range(0, 360, 45)).join('text')
    .attr('class', 'axis-label halo dial-deg').attr('x', d => ax(d, degR(false))).attr('y', d => ay(d, degR(false)))
    .attr('text-anchor', 'middle').attr('dy', '0.35em').text(d => `${d}°`)
  // how tight the set is: a wedge round the middle, as wide as the spread either side (the six's violet)
  const wedge = gWedge.append('path').attr('stroke-width', 1.6).attr('stroke-dasharray', '5 5')
  const sector = (mid, sp) => {
    const a = Math.min(179.5, sp)
    return `M${cx},${cy}L` + [...d3.range(mid - a, mid + a, 2), mid + a].map(d => `${ax(d, RING_R).toFixed(1)},${ay(d, RING_R).toFixed(1)}`).join('L') + 'Z'
  }
  const sweepArc = gSweep.append('path').attr('fill', 'none').attr('stroke', 'var(--part)').attr('stroke-width', 2.2)
    .attr('marker-end', url('dh-num'))
  const sweepNum = gSweep.append('text').attr('class', 'halo dial-num').attr('text-anchor', 'middle').attr('dy', '0.35em')
  let swept = false

  // --- the averages: the six's (or everyone's) in white, everyone's dimmed on top when the six are lit ---
  const meanLine = gMean.append('line').attr('stroke', 'var(--text-primary)').attr('stroke-width', 4)
    .attr('stroke-linecap', 'round').attr('marker-end', url('dh'))
    .attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', cy).attr('opacity', 0)
  const oldLine = gMean.append('line').attr('stroke', 'var(--text-muted)').attr('stroke-width', 4)
    .attr('stroke-linecap', 'round').attr('marker-end', url('dh-old'))
    .attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', cy).attr('opacity', 0)

  // --- the camera: round and up in degrees (from above: 0, 90), and how many AU from the Sun to the edge ---
  let cam = { round: 0, up: 90, au: 130, px: 0, pv: 0 }, sedna = null, six = [], scene = {}, sunR = 13
  // a point in the camera's frame before it is scaled and moved: across, and up
  const frame = ([x, y, z], c) => {
    const r = c.round * RAD, u = c.up * RAD
    const x1 = x * Math.cos(r) - y * Math.sin(r), y1 = x * Math.sin(r) + y * Math.cos(r)
    return [x1, y1 * Math.sin(u) + z * Math.cos(u)]
  }
  const look = (p, c) => {
    const k = PLOT_R / c.au, [h, v] = frame(p, c)
    return [cx + k * (h - (c.px || 0)), cy - k * (v - (c.pv || 0))]
  }
  const neptunePts = d3.range(0, 361, 3).map(nu => positionAt(NEPTUNE.a, NEPTUNE.e, NEPTUNE.i, NEPTUNE.node, NEPTUNE.argperi, nu))
  const p9Pts = d3.range(0, 361, 1.5).map(p9At)
  const p9Halves = halves(p9At)
  const sixCache = new Map()
  function drawCamera (c) {
    const k = PLOT_R / c.au
    const P = p => look(p, c)
    const line = pts => d3.line()(pts.map(P))
    const rim = d3.range(0, 361, 3).map(a => [c.au * 1.5 * Math.cos(a * RAD), c.au * 1.5 * Math.sin(a * RAD), 0])
    planePath.attr('d', line(rim) + 'Z')
    const [sx, sy] = P([0, 0, 0])
    sunIcon.attr('x', sx - sunR).attr('y', sy - sunR).attr('width', 2 * sunR).attr('height', 2 * sunR)
    pointer.attr('x1', sx).attr('y1', sy)
    neptunePath.attr('d', line(neptunePts))
    if (sedna) {
      const h = sedna.halves
      if (kind === 'tilt') { above.attr('d', line(h.up)); below.attr('d', line(h.down)); lid.attr('d', line(h.up) + 'Z') } else { above.attr('d', line(h.all)); below.attr('d', null) }
      const n = sedna.node_deg * RAD, m = n + Math.PI / 2, L = c.au * 1.5
      const [a1, b1] = P([L * Math.cos(n), L * Math.sin(n), 0]), [a2, b2] = P([-L * Math.cos(n), -L * Math.sin(n), 0])
      nodeLine.attr('x1', a1).attr('y1', b1).attr('x2', a2).attr('y2', b2)
      const [qx, qy] = P(orbitOf(sedna, 0))
      closest.attr('cx', qx).attr('cy', qy)
      const a = angle(sedna) * RAD, R = RING_R / k
      const [x2, y2] = P([R * Math.cos(a), R * Math.sin(a), 0])
      pointer.attr('x2', x2).attr('y2', y2)
      // a right angle where the hinge meets the tilt arrow, a fixed size on screen
      const s0 = 26 / k
      const Q = (u, v) => P([u * Math.cos(n) + v * Math.cos(m), u * Math.sin(n) + v * Math.sin(m), 0])
      square.attr('d', d3.line()([Q(s0, 0), Q(s0, s0), Q(0, s0)]))
    }
    gSix.selectAll('path.six').data(six, d => d.id).join('path').attr('class', 'six')
      .attr('fill', 'none').attr('stroke', 'var(--series-1)').attr('stroke-width', 2).attr('stroke-opacity', 0.9)
      .attr('d', d => line(d.halves.all))
    p9Path.attr('d', line(p9Pts))
    p9Lid.attr('d', line(p9Halves.up) + 'Z')
    p9Up.attr('d', line(p9Halves.up)); p9Down.attr('d', line(p9Halves.down))
    {
      const n = P9.node_deg * RAD, L = 1.3 * d3.max(p9Pts, p => Math.hypot(p[0], p[1]))
      const [a1, b1] = P([L * Math.cos(n), L * Math.sin(n), 0]), [a2, b2] = P([-L * Math.cos(n), -L * Math.sin(n), 0])
      p9Hinge.attr('x1', a1).attr('y1', b1).attr('x2', a2).attr('y2', b2)
    }
    const [px, py] = P(p9At(180))
    p9Icon.attr('x', px - 17).attr('y', py - 17)
  }
  function moveCamera (to, delay = 0) {
    svg.transition('camera').delay(delay).duration(T * 1.8).ease(d3.easeCubicInOut)
      .tween('camera', () => {
        const from = { ...cam }
        const dr = ((to.round - from.round + 540) % 360) - 180          // round the short way
        const zoom = d3.interpolate(Math.log(from.au), Math.log(to.au))   // zoom evenly, not linearly
        return t => {
          cam = { round: from.round + dr * t, up: from.up + (to.up - from.up) * t, au: Math.exp(zoom(t)),
            px: (from.px || 0) + ((to.px || 0) - (from.px || 0)) * t, pv: (from.pv || 0) + ((to.pv || 0) - (from.pv || 0)) * t }
          drawCamera(cam)
        }
      })
  }

  // one object lit in both dials
  registerHighlight(id => {
    gDots.selectAll('circle').attr('r', d => d.id === id ? 9 : 6)
      .attr('fill', d => d.id === id ? 'var(--text-primary)' : 'var(--series-1)')
  })

  function update (objects, stats, s) {
    scene = s
    const ring = s.layout === 'ring'
    const visible = d => !s.only || s.only.has(d.id)
    const dimmed = d => s.lit && !s.lit.has(d.id)
    const D = { six: 0, p9: 0, plane: 0, cam: 0, notes: null, ...(s.delays || {}) }     // in steps of T
    if (!sedna && s.focus) { sedna = objects.find(d => d.id === s.focus); if (sedna) sedna.halves = halves(nu => orbitOf(sedna, nu)) }
    if (s.sixOrbits) {
      six = objects.filter(d => s.lit?.has(d.id)).map(d => {
        if (!sixCache.has(d.id)) sixCache.set(d.id, { ...d, halves: halves(nu => orbitOf(d, nu)) })
        return sixCache.get(d.id)
      })
    }

    svg.attr('aria-label', ring
      ? `Compass of the way ${s.only ? s.only.size : objects.length} orbits ${kind === 'tilt' ? 'tilt' : 'stretch out'}. Spread ${Math.round(stats.spread)}°.`
      : s.sixOrbits && s.view === 'side' ? 'Seen from the side, the six orbits of 2016 all rise above the plane of the planets on the same side, and so does Planet Nine’s predicted orbit.'
        : s.sixOrbits ? 'The six orbits of 2016 seen from above, with Planet Nine’s predicted orbit stretching out the other way.'
          : s.view === 'side' ? 'Seen from the side: the plane of the planets is a level line, and Sedna’s orbit is tipped out of it, rising on one side.'
            : 'Sedna’s orbit seen from above.')

    // --- the camera: where it looks from and how far out ---------------------------------------------
    let target
    if (s.view === 'side' && sedna) {
      // round so the hinge runs straight away from us; the tilt arrow then points to the right
      const round = (((s.round ?? (270 - sedna.node_deg)) % 360) + 360) % 360
      target = { round, up: 0, au: s.au || 1100, px: 0, pv: 0 }
    } else target = { round: 0, up: 90, au: s.au || cam.au, px: 0, pv: 0 }
    // fitted: the camera moves off the Sun to the middle of Sedna's orbit and in until the orbit fills the dial
    // (from the side it only slides along the plane, so the plane stays level through the middle)
    if (s.fit && sedna) {
      const pts = d3.range(0, 360, 4).map(nu => frame(orbitOf(sedna, nu), target))
      const hs = pts.map(q => q[0]), vs = pts.map(q => q[1])
      const mh = (d3.min(hs) + d3.max(hs)) / 2, mv = s.view === 'side' ? 0 : (d3.min(vs) + d3.max(vs)) / 2
      target = { ...target, px: mh, pv: mv, au: d3.max(pts, q => Math.hypot(q[0] - mh, q[1] - mv)) / 0.84 }
    }
    sunR = s.neptune && s.fit ? 7 : 13
    const off = (a, b) => Math.abs(a - b) > 0.01
    if (off(target.round, cam.round) || off(target.up, cam.up) || off(target.au, cam.au) || off(target.px, cam.px || 0) || off(target.pv, cam.pv || 0)) moveCamera(target, D.cam * T)
    else { svg.interrupt('camera'); drawCamera(cam) }
    const moving = Math.abs(target.au - cam.au) > 1 || Math.abs(target.up - cam.up) > 0.01 || Math.abs(target.px - (cam.px || 0)) > 1

    const fade = (sel, on, value, delay = 0) => sel.transition().duration(T).delay(on ? delay * T : 0).attr('opacity', on ? value : 0)
    fade(gPlane, s.plane && !ring, s.view === 'side' ? 1 : 0.55, D.plane)
    fade(gNeptune, s.neptune && !ring, 1)
    fade(gOrbit, s.orbit && !ring, s.compass ? 0.55 : 1)
    nodeLine.transition().duration(T).delay(s.nodeLine && moving ? T * 1.8 : 0).attr('opacity', s.nodeLine && !ring ? 0.85 : 0)
    lid.transition().duration(T).delay(s.lid && moving ? T * 1.8 : 0).attr('opacity', s.lid && !ring ? 1 : 0)
    closest.transition().duration(T).attr('opacity', s.closest && !ring ? 1 : 0)
    fade(gSix, s.sixOrbits, 1, D.six)
    fade(gP9, s.p9Orbit, 1, D.p9)
    p9Lid.transition().duration(T).delay(s.p9Lid ? D.p9 * T : 0).attr('opacity', s.p9Lid ? 1 : 0)
    // with its raised half filled, its orbit drawn in halves; otherwise dotted, as predicted orbits are
    p9Path.transition().duration(T).attr('opacity', s.p9Lid ? 0 : 1)
    for (const el of [p9Up, p9Down]) el.transition().duration(T).delay(s.p9Lid ? D.p9 * T : 0).attr('opacity', s.p9Lid ? 1 : 0)
    p9Hinge.transition().duration(T).delay(s.p9Lid ? D.p9 * T : 0).attr('opacity', s.p9Lid ? 0.85 : 0)
    fade(gCompass, s.compass, 1, s.compass && moving ? 1.4 : 0)
    degLabels.transition().duration(T).attr('x', d => ax(d, degR(ring))).attr('y', d => ay(d, degR(ring)))
    gHinge.transition().duration(T).delay(s.rightAngle && moving ? T * 1.8 : 0).attr('opacity', s.rightAngle && !ring ? 1 : 0)

    // the angle between the plane and the orbit, from the side, its number on the open side of the wedge
    gAngle.selectAll('*').remove()
    if (sedna && kind === 'tilt') {
      const i = sedna.i_deg, R = 150
      gAngle.append('path').attr('fill', 'none').attr('stroke', 'var(--part)').attr('stroke-width', 2)
        .attr('d', d3.line()(d3.range(0, i + 0.01, 0.5).map(a => [ax(a, R), ay(a, R)])))
      gAngle.append('text').attr('class', 'halo dial-num').attr('x', ax(i / 2, R + 12)).attr('y', ay(i / 2, R + 12))
        .attr('dy', '0.35em').text(`${Math.round(i)}°`)
    }
    gAngle.transition().duration(T).delay(s.tiltAngle ? T : 0).attr('opacity', s.tiltAngle && !ring ? 1 : 0)

    // --- Sedna's arrow, drawn by the camera; seen from above, its angle counted from the right ----------------
    gPointer.transition().duration(T).delay(s.pointer && moving && s.view !== 'side' && !s.keepPointer ? T * 1.8 : (s.pointer && s.view === 'side' ? T : 0))
      .attr('opacity', s.pointer && !ring ? 1 : 0)
    if (s.sweep && sedna && !ring) {
      const a = angle(sedna)
      sweepNum.attr('x', ax(a / 2, SWEEP_R + 34)).attr('y', ay(a / 2, SWEEP_R + 34)).text(`${Math.round(a)}°`)
      if (!swept) {
        swept = true
        const wait = moving ? T * 2.4 : T * 0.6
        gSweep.interrupt().attr('opacity', 1)
        sweepArc.interrupt().attr('d', arcTo(0.5, SWEEP_R)).attr('opacity', 0)
          .transition().delay(wait).duration(0).attr('opacity', 1)
          .transition().duration(1100).ease(d3.easeCubicInOut).attrTween('d', () => t => arcTo(Math.max(0.5, a * t), SWEEP_R))
        sweepNum.interrupt().attr('opacity', 0).transition().delay(wait + 1000).duration(T / 2).attr('opacity', 1)
      }
    } else if (swept) {
      swept = false
      gSweep.transition().duration(T / 2).attr('opacity', 0)
    }

    // --- every object's arrow and dot, on the compass ---------------------------------------------------
    const ringPos = ringPositions(objects, angle)
    const SPOKE_FROM = 18, SPOKE_TO = RING_R - 3
    const spokesOn = d => s.spokes && visible(d)
    gSpokes.selectAll('line').data(objects, d => d.id).join(
      en => en.append('line').attr('stroke', 'var(--text-secondary)').attr('stroke-width', 1.25)
        .attr('stroke-dasharray', '3 4').attr('marker-end', url('dh-each'))
        .attr('x1', d => ax(angle(d), SPOKE_FROM)).attr('y1', d => ay(angle(d), SPOKE_FROM))
        .attr('x2', d => ax(angle(d), SPOKE_FROM)).attr('y2', d => ay(angle(d), SPOKE_FROM)).attr('opacity', 0))
      .transition().duration(T).delay(d => s.spokes ? (angle(d) / 360) * 400 : 0)
      .attr('x2', d => ax(angle(d), spokesOn(d) ? SPOKE_TO : SPOKE_FROM))
      .attr('y2', d => ay(angle(d), spokesOn(d) ? SPOKE_TO : SPOKE_FROM))
      .attr('opacity', d => !spokesOn(d) ? 0 : (dimmed(d) ? 0.04 : 0.3))

    const dotsOn = d => s.spokes && visible(d) && !s.sixOrbits
    gDots.selectAll('circle').data(objects, d => d.id).join(
      en => en.append('circle').attr('r', 6).attr('stroke', 'var(--surface-1)').attr('stroke-width', 1.5)
        .attr('fill', 'var(--series-1)').attr('opacity', 0)
        .attr('cx', d => ringPos.get(d.id)[0]).attr('cy', d => ringPos.get(d.id)[1]))
      .style('pointer-events', d => dotsOn(d) ? null : 'none')
      .on('pointerenter', (ev, d) => hover(d)).on('pointerleave', unhover).on('click', (ev, d) => pick(d))
      .transition().duration(T).delay(d => s.spokes ? (angle(d) / 360) * 400 : 0)
      .attr('cx', d => ringPos.get(d.id)[0]).attr('cy', d => ringPos.get(d.id)[1])
      .attr('opacity', d => !dotsOn(d) ? 0 : (dimmed(d) ? 0.25 : 1))

    // --- the averages ---------------------------------------------------------------------------------
    const m = s.mean ? (s.litStats || stats) : null
    const old = s.mean && s.litStats && s.old !== false ? stats : null
    const M = RING_R - 6
    meanLine.transition().duration(T).attr('opacity', m ? 1 : 0)
      .attr('x2', m ? ax(m.meanDeg, M) : cx).attr('y2', m ? ay(m.meanDeg, M) : cy)
    oldLine.raise().transition().duration(T).attr('opacity', old ? 0.55 : 0)
      .attr('x2', old ? ax(old.meanDeg, M) : (m ? ax(m.meanDeg, M) : cx))
      .attr('y2', old ? ay(old.meanDeg, M) : (m ? ay(m.meanDeg, M) : cy))
    // the spread: the wedge (violet for the six) and its number, in the part's colour, inside it
    const w = s.spread && m ? m : null
    gWedge.transition().duration(T).attr('opacity', w ? 1 : 0)
    if (w) {
      wedge.attr('fill', s.litStats ? 'var(--series-1)' : 'var(--text-primary)').attr('fill-opacity', s.litStats ? 0.16 : 0.07)
        .attr('stroke', s.litStats ? 'var(--series-1-ink)' : 'var(--text-secondary)').attr('stroke-opacity', 0.6)
        .transition().duration(T).attrTween('d', function () {
          const prev = this.__w || { mid: w.meanDeg, sp: 0 }, dm = ((w.meanDeg - prev.mid + 540) % 360) - 180
          return t => { const now = { mid: prev.mid + dm * t, sp: prev.sp + (w.spread - prev.sp) * t }; this.__w = now; return sector(now.mid, now.sp) }
        })
      // inside the wedge, on the other side of the middle from the middle's name (see notes), so the two never meet
      const apart = s.litStats ? ((s.litStats.meanDeg - stats.meanDeg + 540) % 360) - 180 : 1
      const at = w.meanDeg - (apart >= 0 ? 1 : -1) * Math.min(0.55 * w.spread, 30)
      wedgeLbl.text(`spread ${Math.round(w.spread)}°`).transition().duration(T)
        .attr('x', ax(at, RING_R * 0.6)).attr('y', ay(at, RING_R * 0.6)).attr('opacity', 1)
    } else wedgeLbl.transition().duration(T / 2).attr('opacity', 0)
    p9Spoke.transition().duration(T).delay(s.p9 ? (D.p9arrow ?? D.p9) * T : 0).attr('opacity', s.p9 ? 1 : 0)

    notes(s, stats, target, D, moving)
  }

  /** Every label is a few words pinned to the thing it names. */
  function notes (s, stats, c, D, moving) {
    const list = []
    // dy: '0.35em' centres a label on its point, '0.8em' hangs it below, 0 sets it on its point
    const L = (key, x, y, text, opts = {}) => list.push({ key, x, y, text, dy: '0.35em', ...opts })
    const side = deg => Math.cos(deg * RAD) < -0.3 ? 'end' : (Math.cos(deg * RAD) > 0.3 ? 'start' : 'middle')
    const ring = s.layout === 'ring'
    const out = (x, y, gap) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x + (x - cx) / d * gap, y + (y - cy) / d * gap] }
    if (s.labels?.sun) { const [x, y] = look([0, 0, 0], c); L('sun', x + 14, y + 14, 'the Sun', { anchor: 'start', colour: 'var(--sun)', dy: '0.8em' }) }
    if (s.labels?.neptune && !ring) {
      const [x, y] = look(positionAt(NEPTUNE.a, NEPTUNE.e, NEPTUNE.i, NEPTUNE.node, NEPTUNE.argperi, 120), c)
      L('nep', x - 8, y + 10, 'Neptune’s orbit', { anchor: 'end', colour: '#aab0c4', dy: '0.8em' })
    }
    if (s.labels?.closest && sedna && !ring) {
      const [x, y] = look(orbitOf(sedna, 0), c)
      L('closest', x + 14, y - 14, 'closest point to the Sun', { anchor: 'start', dy: 0 })
    }
    if (s.labels?.orbit && sedna && !ring) {
      if (s.view === 'side') {
        // above the orbit's line, two-thirds of the way out from the Sun to its far end as the camera sees them
        const [x0, y0] = look([0, 0, 0], c), [x1, y1] = look(orbitOf(sedna, 180), c)
        const far = Math.abs(x1 - x0) > 40 ? [x1, y1] : look(orbitOf(sedna, 120), c)
        L('orbit', x0 + (far[0] - x0) * 0.66, y0 + (far[1] - y0) * 0.66 - 18, `${nameOf(sedna)}’s orbit`, { dy: 0 })
      } else {
        // just outside the orbit, a little way round from its closest point
        const [x, y] = out(...look(orbitOf(sedna, s.au && s.au > 400 ? 150 : -50), c), 20)
        L('orbit', x, y, `${nameOf(sedna)}’s orbit`, { anchor: x < cx ? 'end' : 'start' })
      }
    }
    if (s.labels?.far && sedna && !ring) {
      const [x, y] = look(orbitOf(sedna, 180), c)
      L('far', x, y + (y > cy ? 14 : -14), 'far end', y > cy ? { dy: '0.8em' } : { dy: 0 })
    }
    if (s.labels?.plane && s.view === 'side' && !ring) {
      L('plane', cx - PLOT_R + 46, cy - 12, 'the plane of the planets', { anchor: 'start', colour: 'var(--text-secondary)', small: true, dy: 0 })
    }
    if (s.labels?.halves && sedna && !ring) {
      const top = { round: 0, up: 90, au: c.au }
      for (const [key, pts, text] of [['up', sedna.halves.up, 'above the plane'], ['down', sedna.halves.down, 'below the plane']]) {
        const [x, y] = out(...look(pts[Math.floor(pts.length / 2)], top), 28)
        L(key, x, y, text, { anchor: x < cx ? 'end' : 'start', colour: 'var(--series-1-ink)' })
      }
    }
    if (s.labels?.hinge && sedna && !ring) {
      // along the hinge, on the side away from the raised half, near the edge of the picture
      const n = sedna.node_deg, m = n + 90, r = PLOT_R * 0.86
      L('hinge', ax(n, r) - 24 * Math.cos(m * RAD), ay(n, r) + 24 * Math.sin(m * RAD), 'hinge', {})
    }
    // a middle's name beside its arrow, out near its head, on one side of it (side 1: anticlockwise of it), centred on
    // a point set off square to the arrow, so it reads along the arrow without covering it or the dots
    const beside = (deg, r, sd, gapPx = 15) => {
      const n = (deg + 90 * sd) * RAD, gap = gapPx * uPx
      return [ax(deg, r) + gap * Math.cos(n), ay(deg, r) - gap * Math.sin(n)]
    }
    if (s.labels?.mean && stats) L('mean', ...beside(stats.meanDeg, RING_R * 0.8, 1, 12), K.mean, { small: true })
    if (s.labels?.arrows && s.litStats) {
      // the six's on the side away from everyone's, everyone's on the other, so the two names never meet
      const sx = s.litStats, apart = ((sx.meanDeg - stats.meanDeg + 540) % 360) - 180, sd = apart >= 0 ? 1 : -1
      L('m6', ...beside(sx.meanDeg, RING_R * 0.82, sd, 12), 'middle of the six', { small: true })
      // everyone's named only where its arrow is far enough from the six's for the two names to sit apart; otherwise
      // the dimmed arrow is the middle the step before named
      if (s.old !== false && Math.abs(apart) > 25) {
        L('mall', ...beside(stats.meanDeg, RING_R * 0.82, -sd, 12), `middle of all ${stats.n}`,
          { small: true, colour: 'var(--text-secondary)' })
      }
    }
    if (s.labels?.p9 && s.p9Orbit) {
      // on the open side of the icon: under it if it is below the Sun, over it otherwise
      const [px, py] = look(p9At(180), c), low = py > cy + 4
      if (s.layout === 'ring') {
        // on the compass: straight out from the Sun past the icon
        const [x, y] = out(px, py, 30)
        L('p9', x, y, 'Planet Nine', { colour: 'var(--p9)', anchor: x > cx + 20 ? 'start' : (x < cx - 20 ? 'end' : 'middle'), delay: D.notes ?? D.p9 + 0.4 })
      } else L('p9', px, py + (low ? 24 : -26), 'Planet Nine', { colour: 'var(--p9)', dy: low ? '0.8em' : 0, delay: D.notes ?? D.p9 + 0.4 })
    }

    const wait = d => (d.delay ?? D.notes ?? ((s.view === 'side' && moving) || s.labels?.halves || s.sixOrbits ? 1.4 : 0)) * T
    const t = gNotes.selectAll('text').data(list, d => d.key)
    t.exit().transition().duration(T / 2).attr('opacity', 0).remove()
    t.enter().append('text').attr('opacity', 0).attr('x', d => d.x).attr('y', d => d.y)
      .merge(t)
      .attr('class', d => `halo ${d.small ? 'dial-lbl-sm' : 'dial-lbl'}`)
      .attr('text-anchor', d => d.anchor || 'middle').attr('dy', d => d.dy)
      .attr('font-weight', 600)
      .attr('fill', d => d.colour || 'var(--text-primary)')
      .text(d => d.text)
      .transition().duration(T).delay(wait)
      .attr('x', d => d.x).attr('y', d => d.y).attr('opacity', 1)
  }

  // pointing at a dot lights it in both dials and opens its card; a click keeps it
  function hover (d) { clearTimeout(closing); setHover(d.id); if (picked?.id !== d.id) { pinned = false; show(d) } }
  function unhover () { if (!pinned) { clearTimeout(closing); closing = setTimeout(close, 260) } }
  function pick (d) { clearTimeout(closing); if (picked?.id !== d.id) show(d); pinned = true; card.select('.pick-close').node().focus({ preventScroll: true }) }
  function show (d) {
    picked = d
    const rows = kind === 'tilt'
      ? `<dt>tilts toward</dt><dd>${Math.round(tiltOf(d))}°</dd><dt>tilted by</dt><dd>${d.i_deg.toFixed(0)}°</dd>`
      : `<dt>stretches out toward</dt><dd>${Math.round(stretchOf(d))}°</dd>
         <dt>closest to the Sun</dt><dd class="au">${d.q_au.toFixed(0)} AU</dd>
         <dt>farthest from the Sun</dt><dd class="au">${d3.format(',.0f')(d.a_au * (1 + d.e))} AU</dd>`
    card.attr('hidden', null).html(`
      <button type="button" class="pick-close" aria-label="Close">×</button>
      <div class="pick-name">${nameOf(d)}</div>
      <dl>${rows}</dl>`)
    card.select('.pick-close').on('click', close)
  }
  function close () { clearTimeout(closing); picked = null; pinned = false; card.attr('hidden', true); setHover(null) }
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && picked) close() })

  return { update, close }
}

/** Compass positions: each dot at its angle, stacked outward where crowded. */
function ringPositions (objects, angle) {
  const pos = new Map()
  const bins = d3.group([...objects].sort((a, b) => angle(a) - angle(b)), d => Math.floor(angle(d) / 7))
  for (const [, grp] of bins) {
    grp.forEach((d, i) => {
      const rr = Math.min(RING_R + 12 + i * 13, PLOT_R - 30)
      pos.set(d.id, [ax(angle(d), rr), ay(angle(d), rr)])
    })
  }
  return pos
}
