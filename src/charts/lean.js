// Section 02 — "they lean the same way", as one graphic that the story steps
// through. It has two layouts sharing the same marks:
//
//   orbits   the solar system seen from above; each object is its orbit arc
//            and a dot at its closest point to the Sun
//   ring     the orbits stripped away; each dot slides out to a compass at the
//            angle it pointed, so the bunching can be read off directly
//
// The dots are the same SVG elements in both layouts, so switching between them
// is a morph rather than a cut: the reader watches each orbit become a point
// on the compass instead of being asked to trust that the two views agree.

import * as d3 from 'd3'
import { orbitPath, orbitArc, perihelionPoint, PLANET_NINE } from '../orbits.js'
import { showTip, hideTip } from './tooltip.js'
import { registerHighlight, setHover } from '../highlight.js'

const NEPTUNE = { a: 30.07, e: 0.00859, i: 1.770, node: 131.784, argperi: 273.19 }
const W = 760, H = 760
const cx = W / 2, cy = H / 2
const PLOT_R = 360
const RING_R = 210          // the compass circle; also the arrow's full length
const RAD = Math.PI / 180
const T = 750

const nameOf = d => d.name || d.provisional_desig || d.id
const ax = (deg, r) => cx + r * Math.cos(deg * RAD)
const ay = (deg, r) => cy - r * Math.sin(deg * RAD)

export function makeLean (root) {
  const svg = d3.select(root).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')

  const defs = svg.append('defs')
  defs.append('clipPath').attr('id', 'lean-clip')
    .append('circle').attr('cx', cx).attr('cy', cy).attr('r', PLOT_R)
  for (const [id, fill] of [['lean-head', 'var(--text-primary)'], ['lean-head-p9', 'var(--series-3)']]) {
    defs.append('marker').attr('id', id).attr('viewBox', '0 0 10 10')
      .attr('refX', 7).attr('refY', 5).attr('markerWidth', 16).attr('markerHeight', 16)
      .attr('markerUnits', 'userSpaceOnUse')
      .attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', fill)
  }

  const clipped = svg.append('g').attr('clip-path', 'url(#lean-clip)')
  const gRings = clipped.append('g')
  const gHalf = clipped.append('g')
  const gCompass = svg.append('g')
  const gNeptune = clipped.append('g')
  const gP9 = clipped.append('g')
  const gOrbits = clipped.append('g')
  const gPointer = svg.append('g')
  const gMean = svg.append('g')
  const gDots = svg.append('g')
  const gNotes = svg.append('g').style('pointer-events', 'none')
  svg.append('use').attr('href', '#art-sun').style('pointer-events', 'none')
    .attr('x', cx - 13).attr('y', cy - 13).attr('width', 26).attr('height', 26)

  let scene = {}

  // --- compass: drawn once, faded in and out -------------------------------
  gCompass.append('circle').attr('cx', cx).attr('cy', cy).attr('r', RING_R)
    .attr('fill', 'none').attr('stroke', 'var(--text-muted)').attr('stroke-opacity', 0.5)
  gCompass.selectAll('line').data(d3.range(0, 360, 45)).join('line')
    .attr('x1', d => ax(d, 14)).attr('y1', d => ay(d, 14))
    .attr('x2', d => ax(d, RING_R)).attr('y2', d => ay(d, RING_R))
    .attr('stroke', 'var(--rule)')
  gCompass.selectAll('text').data(d3.range(0, 360, 45)).join('text')
    .attr('class', 'axis-label halo')
    .attr('x', d => ax(d, PLOT_R - 4)).attr('y', d => ay(d, PLOT_R - 4))
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
    .text(d => `${d}°`)

  // --- Planet Nine: an arc in the orbit view, a spoke on the compass -------
  gP9.append('path').attr('class', 'p9arc').attr('fill', 'none')
    .attr('stroke', 'var(--series-3)').attr('stroke-width', 3)
  gP9.append('circle').attr('class', 'p9dot').attr('r', 8)
    .attr('fill', 'var(--series-3)').attr('stroke', 'var(--surface-1)').attr('stroke-width', 2)
  gP9.append('use').attr('class', 'p9icon').attr('href', '#art-planet-nine')
    .attr('width', 28).attr('height', 28).attr('opacity', 0)
  const p9Spoke = svg.insert('line', () => gMean.node())
    .attr('stroke', 'var(--series-3)').attr('stroke-width', 3)
    .attr('stroke-dasharray', '2 6').attr('stroke-linecap', 'round')
    .attr('x1', cx).attr('y1', cy)
    .attr('x2', ax(PLANET_NINE.varpi_deg, RING_R)).attr('y2', ay(PLANET_NINE.varpi_deg, RING_R))
    .attr('marker-end', 'url(#lean-head-p9)')
    .attr('opacity', 0)

  gNeptune.append('path')
    .attr('fill', 'none').attr('stroke', 'var(--neptune)').attr('stroke-width', 2)

  // --- the average-direction arrow ----------------------------------------
  const meanLine = gMean.append('line')
    .attr('stroke', 'var(--text-primary)').attr('stroke-width', 4)
    .attr('stroke-linecap', 'round').attr('marker-end', 'url(#lean-head)')
    .attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', cy)

  // --- linked highlighting -------------------------------------------------
  registerHighlight(id => {
    gOrbits.selectAll('g.obj').each(function (d) {
      const on = d.id === id
      d3.select(this).select('path.track')
        .attr('stroke', on ? 'var(--text-primary)' : 'var(--series-1)')
        .attr('stroke-width', on ? 4 : (d.well_determined ? 2.4 : 1.4))
    })
    gDots.selectAll('circle.dot')
      .attr('fill', d => d.id === id ? 'var(--text-primary)' : 'var(--series-1)')
      .attr('r', d => d.id === id ? 9 : 6)
  })

  function update (objects, stats, s) {
    scene = s
    const ring = s.layout === 'ring'
    const r = d3.scaleLinear().domain([0, s.maxAu]).range([0, PLOT_R])
    const line = d3.line().x(([x]) => cx + r(x)).y(([, y]) => cy - r(y))
    const visible = d => !s.only || s.only.has(d.id)
    const shown = objects.filter(visible)

    svg.attr('aria-label', ring
      ? `Compass of the direction ${shown.length} objects point. Average arrow length ${stats.R.toFixed(2)}.`
      : `${shown.length} orbits seen from above, with the Sun at the centre.`)

    // distance rings: only meaningful in the orbit layout
    const ticks = r.ticks(4).filter(d => d > 0)
    const rings = gRings.selectAll('g').data(ticks, d => d)
    rings.exit().remove()
    const re = rings.enter().append('g')
    re.append('circle').attr('cx', cx).attr('cy', cy).attr('fill', 'none').attr('stroke', 'var(--rule)').attr('r', d => r(d))
    re.append('text').attr('class', 'axis-label halo').attr('x', cx + 5).attr('y', d => cy - r(d) - 5)
    const ra = re.merge(rings)
    ra.select('circle').transition().duration(T).attr('r', d => r(d))
    ra.select('text').text(d => `${d3.format(',')(d)} AU`)
      .transition().duration(T).attr('y', d => cy - r(d) - 5)
    gRings.transition().duration(T).attr('opacity', ring || s.compass ? 0 : 1)

    gNeptune.select('path')
      .transition().duration(T)
      .attr('d', line(orbitPath(NEPTUNE.a, NEPTUNE.e, NEPTUNE.i, NEPTUNE.node, NEPTUNE.argperi)))
      .attr('opacity', ring ? 0 : 1)

    gCompass.transition().duration(T).attr('opacity', s.compass ? 1 : 0)

    // --- the half they lean toward ----------------------------------------
    const halfData = s.half && stats.n >= 3 ? [stats.meanDeg] : []
    const arc = d3.arc().innerRadius(0).outerRadius(PLOT_R)
    gHalf.selectAll('path').data(halfData).join(
      en => en.append('path').attr('fill', 'var(--series-1)').attr('opacity', 0)
        .call(e => e.transition().duration(T).attr('opacity', 0.13)),
      up => up,
      ex => ex.transition().duration(T / 2).attr('opacity', 0).remove())
      .attr('transform', `translate(${cx},${cy})`)
      // d3.arc measures clockwise from 12 o'clock; our angles run
      // counter-clockwise from 3 o'clock.
      .attr('d', m => arc({ startAngle: (90 - m - 90) * RAD, endAngle: (90 - m + 90) * RAD }))

    // --- orbits -------------------------------------------------------------
    const objs = gOrbits.selectAll('g.obj').data(objects, d => d.id)
    objs.exit().remove()
    const oe = objs.enter().append('g').attr('class', 'obj').attr('opacity', 0)
    oe.append('path').attr('class', 'full').attr('fill', 'none').attr('stroke', 'var(--series-1)').attr('stroke-width', 1)
    oe.append('path').attr('class', 'track').attr('fill', 'none').attr('stroke', 'var(--series-1)').attr('stroke-linecap', 'round')
    oe.append('path').attr('class', 'hit').attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 16)
    const oa = oe.merge(objs)
    oa.each(function (d) {
      const n = d3.select(this)
      const a = line(orbitArc(d.a_au, d.e, d.i_deg, d.node_deg, d.argperi_deg))
      n.select('path.full').transition().duration(T)
        .attr('d', line(orbitPath(d.a_au, d.e, d.i_deg, d.node_deg, d.argperi_deg)))
        .attr('opacity', (d.well_determined ? 0.22 : 0.09) * (s.fadeOrbits ? 0.4 : 1))
      // "Just look at the dots": the arcs step back when the story says so.
      const k = s.fadeOrbits ? 0.3 : 1
      n.select('path.track').attr('stroke-width', d.well_determined ? 2.4 : 1.4)
        .transition().duration(T).attr('d', a)
        .attr('opacity', (d.well_determined ? 0.9 : 0.4) * k)
      n.select('path.hit').attr('d', a)
    })
    oa.style('pointer-events', d => !ring && visible(d) ? null : 'none')
      .transition().duration(T)
      .attr('opacity', d => ring || !visible(d) ? 0 : (s.dimOthers && d.id !== s.focus ? 0.25 : 1))
    oa.on('pointerenter', (ev, d) => hover(ev, d)).on('pointerleave', unhover)

    // --- dots: the same elements in both layouts ---------------------------
    const ringPos = ringPositions(objects)
    const dotPos = d => {
      if (ring) return ringPos.get(d.id)
      const p = perihelionPoint(d)
      return [cx + r(p[0]), cy - r(p[1])]
    }
    const dots = gDots.selectAll('circle.dot').data(objects, d => d.id)
    dots.exit().remove()
    dots.enter().append('circle').attr('class', 'dot')
      .attr('r', 6).attr('stroke', 'var(--surface-1)').attr('stroke-width', 1.5)
      .attr('fill', 'var(--series-1)').attr('opacity', 0)
      .attr('cx', d => dotPos(d)[0]).attr('cy', d => dotPos(d)[1])
      .merge(dots)
      .style('pointer-events', d => visible(d) ? null : 'none')
      .on('pointerenter', (ev, d) => hover(ev, d)).on('pointerleave', unhover)
      .transition().duration(T)
      .delay((d, i) => ring || s.stagger ? (d.varpi_deg / 360) * 400 : 0)
      .attr('cx', d => dotPos(d)[0]).attr('cy', d => dotPos(d)[1])
      .attr('opacity', d => !visible(d) ? 0
        : (s.dimOthers && d.id !== s.focus ? 0.25 : (d.well_determined ? 1 : 0.45)))

    // --- pointer: "this is the direction it points" -------------------------
    const focus = s.pointer && objects.find(d => d.id === s.focus)
    const ptr = gPointer.selectAll('g').data(focus ? [focus] : [], d => d.id)
    ptr.exit().transition().duration(T / 2).attr('opacity', 0).remove()
    const pe = ptr.enter().append('g').attr('opacity', 0)
    pe.append('line').attr('stroke', 'var(--text-primary)').attr('stroke-width', 2)
      .attr('stroke-dasharray', '5 5').attr('marker-end', 'url(#lean-head)')
    pe.append('path').attr('fill', 'none').attr('stroke', 'var(--text-secondary)').attr('stroke-width', 1.5)
    pe.append('text').attr('class', 'halo').attr('fill', 'var(--text-primary)')
      .attr('font-size', 15).attr('font-weight', 600)
    pe.transition().duration(T).attr('opacity', 1)
    const pa = pe.merge(ptr)
    pa.select('line').attr('x1', cx).attr('y1', cy)
      .attr('x2', d => ax(d.varpi_deg, RING_R)).attr('y2', d => ay(d.varpi_deg, RING_R))
    // small arc from 0 degrees round to the object's angle
    pa.select('path').attr('d', d => {
      const pts = d3.range(0, d.varpi_deg + 0.1, 2).map(a => [ax(a, 46), ay(a, 46)])
      return d3.line()(pts)
    })
    pa.select('text')
      .attr('x', d => ax(d.varpi_deg / 2, 64)).attr('y', d => ay(d.varpi_deg / 2, 64))
      .attr('text-anchor', 'start')
      .text(d => `${d.varpi_deg.toFixed(0)}°`)

    // --- mean arrow --------------------------------------------------------
    const m = s.mean && stats.n >= 3 ? stats : null
    meanLine.transition().duration(T)
      .attr('opacity', m ? 1 : 0)
      .attr('x2', m ? ax(m.meanDeg, RING_R * m.R) : cx)
      .attr('y2', m ? ay(m.meanDeg, RING_R * m.R) : cy)

    // --- Planet Nine ------------------------------------------------------
    const p9pt = perihelionPoint({ a_au: PLANET_NINE.a_au, e: PLANET_NINE.e, i_deg: PLANET_NINE.i_deg, node_deg: PLANET_NINE.node_deg, argperi_deg: PLANET_NINE.argperi_deg })
    const showArc = s.p9 && !ring
    gP9.select('path.p9arc').transition().duration(T)
      .attr('d', line(orbitArc(PLANET_NINE.a_au, PLANET_NINE.e, PLANET_NINE.i_deg, PLANET_NINE.node_deg, PLANET_NINE.argperi_deg)))
      .attr('opacity', showArc ? 1 : 0)
    gP9.select('circle.p9dot').transition().duration(T)
      .attr('cx', cx + r(p9pt[0])).attr('cy', cy - r(p9pt[1]))
      .attr('opacity', showArc ? 1 : 0)
    gP9.select('use.p9icon').transition().duration(T)
      .attr('x', cx + r(p9pt[0]) - 14).attr('y', cy - r(p9pt[1]) - 14)
      .attr('opacity', showArc ? 1 : 0)
    p9Spoke.transition().duration(T).attr('opacity', s.p9 ? 1 : 0)

    // --- annotations ------------------------------------------------------
    notes(s, objects, stats, { r, ring, p9pt, focus: objects.find(d => d.id === s.focus) })
  }

  /** Every label is a sentence fragment pinned to the thing it names. */
  function notes (s, objects, stats, { r, ring, p9pt, focus }) {
    const list = []
    const L = (key, x, y, text, opts = {}) => list.push({ key, x, y, text, ...opts })
    if (s.labels?.sun) L('sun', cx + 12, cy + 22, 'the Sun', { anchor: 'start', colour: 'var(--sun)' })
    if (s.labels?.neptune && !ring) {
      L('nep', cx - r(30) * 0.72 - 6, cy + r(30) * 0.72 + 18, 'Neptune’s orbit', { anchor: 'end', colour: '#aab0c4' })
    }
    if (s.labels?.closest && focus && !ring) {
      const p = perihelionPoint(focus)
      L('closest', cx + r(p[0]) + 14, cy - r(p[1]) - 14, `${nameOf(focus)} — closest point to the Sun`, { anchor: 'start', size: 15 })
    }
    if (s.labels?.half && stats.n >= 3) {
      const ang = stats.meanDeg
      L('half', ax(ang, PLOT_R * 0.72), ay(ang, PLOT_R * 0.72),
        `${s.halfCount} of ${stats.n} dots in this half`, { size: 17, colour: '#c4b5fd' })
      L('half2', ax(ang + 180, PLOT_R * 0.62), ay(ang + 180, PLOT_R * 0.62),
        `only ${stats.n - s.halfCount} in this half`, { size: 15, colour: 'var(--text-muted)' })
    }
    if (s.labels?.mean && stats.n >= 3) {
      const ang = stats.meanDeg
      L('mean', ax(ang, RING_R * stats.R + 26), ay(ang, RING_R * stats.R + 26),
        'average direction', { size: 15, anchor: Math.cos(ang * RAD) < -0.3 ? 'end' : 'start' })
      L('ring', cx, cy + RING_R * 0.38,
        'reaching the circle = every object agrees', { size: 13, colour: 'var(--text-muted)', anchor: 'middle' })
    }
    if (s.labels?.p9 && s.p9) {
      if (!ring) {
        L('p9', cx + r(p9pt[0]), cy - r(p9pt[1]) + 28, 'Planet Nine (predicted)', { size: 15, colour: 'var(--series-3)', anchor: 'middle' })
      }
      const a = PLANET_NINE.varpi_deg
      L('p9s', ax(a, RING_R * 0.55) - 12, ay(a, RING_R * 0.55), 'Planet Nine points this way', { size: 13, colour: 'var(--series-3)', anchor: 'end' })
    }

    const t = gNotes.selectAll('text').data(list, d => d.key)
    t.exit().transition().duration(T / 2).attr('opacity', 0).remove()
    t.enter().append('text').attr('class', 'halo').attr('opacity', 0)
      .attr('x', d => d.x).attr('y', d => d.y)
      .merge(t)
      .attr('text-anchor', d => d.anchor || 'middle')
      .attr('font-size', d => d.size || 14).attr('font-weight', 600)
      .attr('fill', d => d.colour || 'var(--text-primary)')
      .text(d => d.text)
      .transition().duration(T)
      .attr('x', d => d.x).attr('y', d => d.y).attr('opacity', 1)
  }

  function hover (ev, d) {
    if (scene.only && !scene.only.has(d.id)) return
    setHover(d.id)
    showTip(ev, `
      <div class="t-name">${nameOf(d)}</div>
      <dl>
        <dt>points toward</dt><dd>${d.varpi_deg.toFixed(0)}°</dd>
        <dt>closest to Sun</dt><dd>${d.q_au.toFixed(0)} AU</dd>
        <dt>average distance</dt><dd>${d3.format(',.0f')(d.a_au)} AU</dd>
        <dt>orbit</dt><dd>${d.well_determined ? 'well measured' : 'seen briefly — uncertain'}</dd>
      </dl>`)
  }
  function unhover () { setHover(null); hideTip() }

  return { update }
}

/** Compass positions: each dot at its angle, stacked outward where crowded. */
function ringPositions (objects) {
  const pos = new Map()
  const bins = d3.group([...objects].sort((a, b) => a.varpi_deg - b.varpi_deg), d => Math.floor(d.varpi_deg / 7))
  for (const [, grp] of bins) {
    grp.forEach((d, i) => {
      const rr = Math.min(RING_R + 12 + i * 13, PLOT_R - 30)
      pos.set(d.id, [ax(d.varpi_deg, rr), ay(d.varpi_deg, rr)])
    })
  }
  return pos
}
