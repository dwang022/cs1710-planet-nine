// Top-down view of the extreme orbits, looking down on the ecliptic plane.
// This is the picture the whole argument rests on: either the long axes of
// these ellipses point the same way, or they do not.

import * as d3 from 'd3'
import { orbitPath, orbitArc, perihelionPoint, PLANET_NINE } from '../orbits.js'
import { showTip, hideTip } from './tooltip.js'
import { registerHighlight, setHover } from '../highlight.js'

const NEPTUNE = { a: 30.07, e: 0.00859, i: 1.770, node: 131.784, argperi: 273.19 }

export function drawOrbits (root, { objects, showP9, maxAu, stats }) {
  const W = 760, H = 760, M = 8
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label',
      `Top-down view of ${objects.length} extreme trans-Neptunian orbits out to ${Math.round(maxAu)} astronomical units.`)

  const r = d3.scaleLinear().domain([0, maxAu]).range([0, (Math.min(W, H) - M * 2) / 2])
  const cx = W / 2, cy = H / 2
  const px = ([x, y]) => cx + r(x)
  const py = ([x, y]) => cy - r(y)
  const line = d3.line().x(px).y(py)

  // Orbits that run past the view are clipped rather than allowed to set the
  // scale — a handful of 5,000 AU objects would otherwise squash everything.
  let defs = svg.select('defs')
  if (defs.empty()) defs = svg.append('defs')
  let clip = defs.select('#orbit-clip')
  if (clip.empty()) {
    clip = defs.append('clipPath').attr('id', 'orbit-clip')
    clip.append('circle')
  }
  clip.select('circle')
    .attr('cx', W / 2).attr('cy', H / 2).attr('r', (Math.min(W, H) - M * 2) / 2)

  let g = svg.select('g.plot')
  if (g.empty()) g = svg.append('g').attr('class', 'plot').attr('clip-path', 'url(#orbit-clip)')

  // --- reference rings: distance scale, drawn first and kept recessive ------
  const ticks = r.ticks(4).filter(d => d > 0)
  const rings = g.selectAll('g.ring').data(ticks, d => d)
  const ringsEnter = rings.enter().append('g').attr('class', 'ring')
  ringsEnter.append('circle')
    .attr('cx', cx).attr('cy', cy).attr('fill', 'none')
    .attr('stroke', 'var(--rule)').attr('stroke-width', 1)
  ringsEnter.append('text')
    .attr('class', 'axis-label').attr('x', cx + 4).attr('text-anchor', 'start')
  rings.exit().remove()
  const ringsAll = ringsEnter.merge(rings)
  ringsAll.select('circle').transition().duration(420).attr('r', d => r(d))
  ringsAll.select('text').transition().duration(420)
    .attr('y', d => cy - r(d) - 5).text(d => `${d3.format(',')(d)} AU`)

  // --- Neptune, the edge of the known planetary system ---------------------
  g.selectAll('path.neptune').data([0]).join('path')
    .attr('class', 'neptune')
    .attr('d', line(orbitPath(NEPTUNE.a, NEPTUNE.e, NEPTUNE.i, NEPTUNE.node, NEPTUNE.argperi)))
    .attr('fill', 'none').attr('stroke', 'var(--neptune)')
    .attr('stroke-width', 1.5).attr('opacity', 0.9)

  // --- the extreme objects -------------------------------------------------
  const sel = g.selectAll('g.obj').data(objects, d => d.id)
  sel.exit().interrupt().remove()

  const enter = sel.enter().append('g').attr('class', 'obj').attr('opacity', 0)
  // Faint: the whole ellipse, which mostly runs off the edge - that is the point.
  enter.append('path').attr('class', 'full').attr('fill', 'none')
  // Bright: the arc around perihelion, which carries the direction.
  enter.append('path').attr('class', 'track').attr('fill', 'none')
  // A wide invisible stroke makes the hover target forgiving.
  enter.append('path').attr('class', 'hit').attr('fill', 'none')
    .attr('stroke', 'transparent').attr('stroke-width', 14)
  enter.append('circle').attr('class', 'peri').attr('r', 5.5)
    .attr('stroke', 'var(--surface-1)').attr('stroke-width', 2)

  const all = enter.merge(sel)
  // One hue for every object. Alignment is NOT encoded in colour: it is defined
  // by a 90-degree threshold on the same angle this chart plots, so colouring
  // by it would draw a conclusion into the picture. Orbit quality is encoded
  // instead, which is independent of the claim being tested.
  const colour = () => 'var(--series-1)'

  all.each(function (d) {
    const arc = line(orbitArc(d.a_au, d.e, d.i_deg, d.node_deg, d.argperi_deg))
    const node = d3.select(this)
    node.select('path.full')
      .attr('d', line(orbitPath(d.a_au, d.e, d.i_deg, d.node_deg, d.argperi_deg)))
      .attr('stroke', colour(d)).attr('stroke-width', 1)
      .attr('opacity', d.well_determined ? 0.16 : 0.07)
    node.select('path.track').attr('d', arc)
      .attr('stroke', colour(d))
      .attr('stroke-width', d.well_determined ? 2.2 : 1.3)
      .attr('stroke-linecap', 'round')
      .attr('opacity', d.well_determined ? 0.9 : 0.4)
    node.select('path.hit').attr('d', arc)
    const p = perihelionPoint(d)
    node.select('circle.peri')
      .attr('cx', px(p)).attr('cy', py(p))
      .attr('fill', colour(d))
      .attr('opacity', d.well_determined ? 1 : 0.5)
  })

  all.transition().duration(420).attr('opacity', 1)

  all.on('pointerenter', function (ev, d) {
    setHover(d.id)
    d3.select(this).select('path.track').attr('stroke-width', 3.6).attr('opacity', 1)
    d3.select(this).raise()
    showTip(ev, `
      <div class="t-name">${d.name || d.provisional_desig || d.id}</div>
      <dl>
        <dt>semi-major axis</dt><dd>${d3.format(',.0f')(d.a_au)} AU</dd>
        <dt>perihelion</dt><dd>${d.q_au.toFixed(1)} AU</dd>
        <dt>inclination</dt><dd>${d.i_deg.toFixed(1)}°</dd>
        <dt>ϖ</dt><dd>${d.varpi_deg.toFixed(1)}°</dd>
        <dt>group</dt><dd>${d.alignment}</dd>
        <dt>orbit quality</dt><dd>${d.well_determined ? 'well determined' : 'short arc — uncertain'}</dd>
      </dl>`)
  }).on('pointermove', (ev, d) => showTip(ev, document.querySelector('.tooltip').innerHTML))
    .on('pointerleave', function (ev, d) {
      d3.select(this).select('path.track')
        .attr('stroke-width', d.well_determined ? 2.2 : 1.3)
        .attr('opacity', d.well_determined ? 0.9 : 0.4)
      setHover(null)
      hideTip()
    })

  // Repaint this chart whenever any view highlights an object.
  if (!root.__hl) {
    root.__hl = true
    registerHighlight(id => {
      d3.select(root).selectAll('g.obj').each(function (d) {
        const on = d.id === id
        d3.select(this).select('path.track')
          .attr('stroke', on ? 'var(--text-primary)' : 'var(--series-1)')
          .attr('stroke-width', on ? 3.6 : (d.well_determined ? 2.2 : 1.3))
          .attr('opacity', on ? 1 : (d.well_determined ? 0.5 : 0.22))
        d3.select(this).select('circle.peri')
          .attr('fill', on ? 'var(--text-primary)' : 'var(--series-1)')
          .attr('r', on ? 8 : 5.5)
        // Deliberately no raise() here. Re-ordering the element under the
        // cursor re-fires pointerenter/leave, which ping-pongs with setHover
        // and locks the page up. Raising happens once, in the hover handler.
      })
    })
  }

  // --- Planet Nine ---------------------------------------------------------
  const p9data = showP9 ? [PLANET_NINE] : []
  const p9 = g.selectAll('g.p9').data(p9data)
  p9.exit().remove()
  const p9e = p9.enter().append('g').attr('class', 'p9')
  p9e.append('path').attr('fill', 'none')
    .attr('stroke', 'var(--series-3)').attr('stroke-width', 2.5)
  p9e.append('circle').attr('r', 6)
    .attr('fill', 'var(--series-3)')
    .attr('stroke', 'var(--surface-1)').attr('stroke-width', 2)
  p9e.append('text').attr('class', 'axis-label')
    .attr('fill', 'var(--series-3)').attr('font-weight', 600)
    .attr('text-anchor', 'middle').text('Planet Nine (predicted)')

  const p9all = p9e.merge(p9)
  p9all.select('path').attr('d', d => line(orbitArc(d.a_au, d.e, d.i_deg, d.node_deg, d.argperi_deg)))
  p9all.select('circle')
    .attr('cx', d => px(perihelionPoint({ a_au: d.a_au, e: d.e, i_deg: d.i_deg, node_deg: d.node_deg, argperi_deg: d.argperi_deg })))
    .attr('cy', d => py(perihelionPoint({ a_au: d.a_au, e: d.e, i_deg: d.i_deg, node_deg: d.node_deg, argperi_deg: d.argperi_deg })))
  p9all.select('text')
    .attr('x', d => px(perihelionPoint({ a_au: d.a_au, e: d.e, i_deg: d.i_deg, node_deg: d.node_deg, argperi_deg: d.argperi_deg })))
    .attr('y', d => py(perihelionPoint({ a_au: d.a_au, e: d.e, i_deg: d.i_deg, node_deg: d.node_deg, argperi_deg: d.argperi_deg })) + 24)
    .attr('text-anchor', 'middle')
    .text('Planet Nine perihelion')

  // --- mean perihelion direction -------------------------------------------
  // The same white arrow as the polar chart, so the two views read as one
  // claim: this is the direction the perihelia average out to.
  const RADD = Math.PI / 180
  const meanData = (stats && stats.n >= 3) ? [stats] : []
  const mg = g.selectAll('g.meandir').data(meanData)
  mg.exit().remove()
  const mge = mg.enter().append('g').attr('class', 'meandir')
  mge.append('line')
    .attr('stroke', 'var(--text-primary)').attr('stroke-width', 2.5)
    .attr('stroke-linecap', 'round').attr('opacity', 0.9)
  mge.append('text').attr('class', 'axis-label')
    .attr('fill', 'var(--text-primary)').attr('font-weight', 600)
  const mgAll = mge.merge(mg)
  const armLen = (Math.min(W, H) - M * 2) / 2 * 0.95
  mgAll.select('line').transition().duration(420)
    .attr('x1', cx).attr('y1', cy)
    .attr('x2', d => cx + armLen * d.R * Math.cos(d.meanDeg * RADD))
    .attr('y2', d => cy - armLen * d.R * Math.sin(d.meanDeg * RADD))
  mgAll.select('text').transition().duration(420)
    .attr('x', d => cx + (armLen * d.R + 30) * Math.cos(d.meanDeg * RADD))
    .attr('y', d => cy - (armLen * d.R + 30) * Math.sin(d.meanDeg * RADD))
    .attr('text-anchor', d => Math.cos(d.meanDeg * RADD) < -0.3 ? 'end'
      : Math.cos(d.meanDeg * RADD) > 0.3 ? 'start' : 'middle')
    .text(d => `mean perihelion direction ${d.meanDeg.toFixed(0)}°`)

  // --- the Sun, drawn last so it sits on top -------------------------------
  g.selectAll('circle.sun').data([0]).join('circle')
    .attr('class', 'sun').attr('cx', cx).attr('cy', cy).attr('r', 3.5)
    .attr('fill', 'var(--sun)')
}
