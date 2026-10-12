// The same data reduced to one angle per object: the longitude of perihelion.
// A polar scatter plus the mean resultant vector. If the directions were
// random the arrow would be short; the clustering claim is that it is not.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'
import { registerHighlight, setHover } from '../highlight.js'
import { PLANET_NINE } from '../orbits.js'

const RAD = Math.PI / 180

export function drawRose (root, { objects, stats, showP9 }) {
  const W = 460, H = 460
  const cx = W / 2, cy = H / 2, R = 168

  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label',
      `Polar plot of longitude of perihelion for ${stats.n} objects. Mean resultant length ${stats.R.toFixed(2)}, mean direction ${stats.meanDeg.toFixed(0)} degrees.`)

  let g = svg.select('g.rose')
  if (g.empty()) g = svg.append('g').attr('class', 'rose')

  // Angle to screen: 0 deg at right, increasing counter-clockwise.
  const ax = (deg, rad) => cx + rad * Math.cos(deg * RAD)
  const ay = (deg, rad) => cy - rad * Math.sin(deg * RAD)

  // --- chrome --------------------------------------------------------------
  g.selectAll('circle.outer').data([0]).join('circle')
    .attr('class', 'outer').attr('cx', cx).attr('cy', cy).attr('r', R)
    .attr('fill', 'none').attr('stroke', 'var(--rule)')

  g.selectAll('circle.inner').data([R / 2]).join('circle')
    .attr('class', 'inner').attr('cx', cx).attr('cy', cy).attr('r', d => d)
    .attr('fill', 'none').attr('stroke', 'var(--rule)')

  const spokes = d3.range(0, 360, 45)
  g.selectAll('line.spoke').data(spokes).join('line')
    .attr('class', 'spoke')
    .attr('x1', cx).attr('y1', cy)
    .attr('x2', d => ax(d, R)).attr('y2', d => ay(d, R))
    .attr('stroke', 'var(--rule)').attr('stroke-width', 1)

  g.selectAll('text.deg').data(spokes).join('text')
    .attr('class', 'deg axis-label')
    .attr('x', d => ax(d, R + 18)).attr('y', d => ay(d, R + 18))
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
    .text(d => `${d}°`)

  // --- one dot per object, jittered outward so overlaps stay readable ------
  const byAngle = d3.group(objects, d => Math.floor(d.varpi_deg / 6))
  const placed = []
  for (const [, grp] of byAngle) {
    grp.forEach((d, i) => placed.push({ d, rad: R * 0.42 + i * 11 }))
  }

  const dots = g.selectAll('circle.dot').data(placed, p => p.d.id)
  dots.exit().interrupt().remove()
  const de = dots.enter().append('circle').attr('class', 'dot')
    .attr('r', 0).attr('stroke', 'var(--surface-1)').attr('stroke-width', 1.5)
  de.merge(dots)
    .attr('cx', p => ax(p.d.varpi_deg, Math.min(p.rad, R - 10)))
    .attr('cy', p => ay(p.d.varpi_deg, Math.min(p.rad, R - 10)))
    .attr('fill', 'var(--series-1)')
    .attr('opacity', p => p.d.well_determined ? 0.95 : 0.45)
    .transition().duration(360).attr('r', 5)

  g.selectAll('circle.dot')
    .on('pointerenter', (ev, p) => { setHover(p.d.id); showTip(ev, `
      <div class="t-name">${p.d.name || p.d.provisional_desig || p.d.id}</div>
      <dl><dt>ϖ</dt><dd>${p.d.varpi_deg.toFixed(1)}°</dd>
      <dt>a</dt><dd>${d3.format(',.0f')(p.d.a_au)} AU</dd>
      <dt>group</dt><dd>${p.d.alignment}</dd></dl>`) })
    .on('pointerleave', () => { setHover(null); hideTip() })

  if (!root.__hl) {
    root.__hl = true
    registerHighlight(id => {
      d3.select(root).selectAll('circle.dot')
        .attr('r', p => p.d.id === id ? 8 : 5)
        .attr('stroke', p => p.d.id === id ? 'var(--text-primary)' : 'var(--surface-1)')
        .attr('stroke-width', p => p.d.id === id ? 2.5 : 1.5)
    })
  }

  // --- mean resultant vector ----------------------------------------------
  // Length is R scaled to the plot radius: a short arrow means "no preferred
  // direction", a long one means "they point the same way".
  const arrow = g.selectAll('g.mean').data([stats]).join(
    en => {
      const n = en.append('g').attr('class', 'mean')
      n.append('line').attr('stroke-linecap', 'round')
      n.append('circle').attr('r', 4)
      n.append('text').attr('class', 'axis-label').attr('font-weight', 600)
      return n
    })
  arrow.select('line')
    .attr('x1', cx).attr('y1', cy)
    .attr('stroke', 'var(--text-primary)').attr('stroke-width', 3)
    .transition().duration(420)
    .attr('x2', d => ax(d.meanDeg, R * d.R)).attr('y2', d => ay(d.meanDeg, R * d.R))
  arrow.select('circle')
    .attr('fill', 'var(--text-primary)')
    .transition().duration(420)
    .attr('cx', d => ax(d.meanDeg, R * d.R)).attr('cy', d => ay(d.meanDeg, R * d.R))
  arrow.select('text')
    .attr('fill', 'var(--text-primary)').attr('text-anchor', 'middle')
    .transition().duration(420)
    .attr('x', d => ax(d.meanDeg, R * d.R + 20))
    .attr('y', d => ay(d.meanDeg, R * d.R + 20))
    .text(d => `R = ${d.R.toFixed(2)}`)

  // --- Planet Nine's own direction, 180 deg from the cluster ---------------
  const p9 = g.selectAll('g.p9dir').data(showP9 ? [PLANET_NINE.varpi_deg] : [])
  p9.exit().remove()
  const p9e = p9.enter().append('g').attr('class', 'p9dir')
  p9e.append('line')
    .attr('stroke', 'var(--series-3)').attr('stroke-width', 2)
    .attr('stroke-linecap', 'round')
  p9e.append('text').attr('class', 'axis-label')
    .attr('fill', 'var(--series-3)').attr('font-weight', 600).attr('text-anchor', 'middle')
  const p9all = p9e.merge(p9)
  p9all.select('line')
    .attr('x1', cx).attr('y1', cy)
    .attr('x2', d => ax(d, R)).attr('y2', d => ay(d, R))
  p9all.select('text')
    .attr('x', d => ax(d, R - 34)).attr('y', d => ay(d, R - 34))
    .text('P9')

  g.selectAll('circle.hub').data([0]).join('circle')
    .attr('class', 'hub').attr('cx', cx).attr('cy', cy).attr('r', 2.5)
    .attr('fill', 'var(--text-muted)')
}
