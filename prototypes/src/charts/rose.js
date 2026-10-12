// The claim: each selected object placed by the direction it leans, plus the
// average direction as an arrow whose length is the strength of agreement.

import * as d3 from 'd3'

const RAD = Math.PI / 180

export function drawRose (root, { stats, colour = 'var(--a)', size = 300, label = '' }) {
  const cx = size / 2, cy = size / 2, R = size * 0.37
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${size} ${size}`)
    .attr('role', 'img')
    .attr('aria-label', `${stats.n} objects; agreement ${stats.R.toFixed(2)}, average direction ${stats.meanDeg.toFixed(0)} degrees.`)

  const ax = (d, r) => cx + r * Math.cos(d * RAD)
  const ay = (d, r) => cy - r * Math.sin(d * RAD)

  let g = svg.select('g.r')
  if (g.empty()) g = svg.append('g').attr('class', 'r')

  g.selectAll('circle.ring').data([R, R * 0.5]).join('circle').attr('class', 'ring')
    .attr('cx', cx).attr('cy', cy).attr('r', d => d)
    .attr('fill', 'none').attr('stroke', 'var(--rule)')
  g.selectAll('line.spoke').data(d3.range(0, 360, 90)).join('line').attr('class', 'spoke')
    .attr('x1', cx).attr('y1', cy).attr('x2', d => ax(d, R)).attr('y2', d => ay(d, R))
    .attr('stroke', 'var(--rule)')
  g.selectAll('text.deg').data(d3.range(0, 360, 90)).join('text').attr('class', 'deg axis-label')
    .attr('x', d => ax(d, R + 14)).attr('y', d => ay(d, R + 14))
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
    .text(d => `${d}°`)

  // spread overlapping objects outward so dense directions stay countable
  const byBin = d3.group(stats.objects, o => Math.floor(o.varpi_deg / 7))
  const placed = []
  for (const [, grp] of byBin) grp.forEach((o, i) => placed.push({ o, rad: R * 0.42 + i * 9 }))

  const dots = g.selectAll('circle.dot').data(placed, p => p.o.id)
  dots.exit().remove()
  dots.enter().append('circle').attr('class', 'dot')
    .attr('stroke', 'var(--surface-1)').attr('stroke-width', 1)
    .merge(dots)
    .attr('cx', p => ax(p.o.varpi_deg, Math.min(p.rad, R - 7)))
    .attr('cy', p => ay(p.o.varpi_deg, Math.min(p.rad, R - 7)))
    .attr('r', 4).attr('fill', colour)
    .attr('opacity', p => p.o.well_determined ? .95 : .45)

  // mean resultant vector
  const arrow = g.selectAll('g.mean').data([stats]).join(en => {
    const n = en.append('g').attr('class', 'mean')
    n.append('line').attr('stroke-linecap', 'round')
    n.append('circle').attr('r', 3.5)
    return n
  })
  arrow.select('line')
    .attr('x1', cx).attr('y1', cy)
    .attr('stroke', 'var(--text-primary)').attr('stroke-width', 2.5)
    .attr('x2', d => ax(d.meanDeg, R * d.R)).attr('y2', d => ay(d.meanDeg, R * d.R))
  arrow.select('circle')
    .attr('fill', 'var(--text-primary)')
    .attr('cx', d => ax(d.meanDeg, R * d.R)).attr('cy', d => ay(d.meanDeg, R * d.R))

  g.selectAll('text.lbl').data(label ? [label] : []).join('text')
    .attr('class', 'lbl axis-label').attr('x', cx).attr('y', 14)
    .attr('text-anchor', 'middle').attr('fill', colour).attr('font-weight', 600)
    .text(d => d)
}
