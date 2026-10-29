// Part 2, page 2: what the papers conclude about the odds, on one axis.
// Each row is a published result (or this site's own calculation) placed at
// "1 in N": how often chance alone would produce the alignment the study
// measured. Further right is harder to blame on luck. Ranges are drawn as bars.

import * as d3 from 'd3'

const W = 900
const M = { top: 46, right: 40, bottom: 44, left: 320 }
const ROW = 50

/**
 * rows: [{ label, detail, oneIn | range: [lo, hi], side: 'for' | 'against' | 'ours', href }]
 */
export function drawOdds (root, rows) {
  const H = M.top + rows.length * ROW + M.bottom
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Published odds that the alignment is chance, one row per study: ' + rows.map(r => `${r.label}: ${r.range ? `1 in ${r.range[0]} to 1 in ${r.range[1]}` : `1 in ${r.oneIn}`}`).join('; '))
  const iw = W - M.left - M.right
  const x = d3.scaleLog().domain([1, 100000]).range([M.left, M.left + iw]).clamp(true)
  const colour = { for: 'var(--series-3)', against: 'var(--series-2)', ours: 'var(--series-1)' }
  const ink = { for: '#6ee7b7', against: '#ffa07a', ours: '#c4b5fd' }

  svg.selectAll('*').remove()
  // the usual bar: 1 in 20
  svg.append('rect').attr('x', x(20)).attr('y', M.top - 24).attr('width', x(100000) - x(20)).attr('height', rows.length * ROW + 12)
    .attr('fill', 'var(--series-3)').attr('opacity', 0.06)
  svg.append('line').attr('x1', x(20)).attr('x2', x(20)).attr('y1', M.top - 24).attr('y2', M.top + rows.length * ROW - 12)
    .attr('stroke', 'var(--series-3)').attr('stroke-width', 1.5)
  svg.append('text').attr('x', x(20) + 8).attr('y', M.top - 30).attr('font-size', 12.5).attr('font-weight', 600).attr('fill', '#6ee7b7')
    .text('past the usual bar (1 in 20): probably not luck')
  svg.append('text').attr('x', x(20) - 8).attr('y', M.top - 30).attr('font-size', 12.5).attr('font-weight', 600).attr('fill', 'var(--text-muted)').attr('text-anchor', 'end')
    .text('could easily be luck')

  const axis = svg.append('g').attr('transform', `translate(0,${M.top + rows.length * ROW - 8})`)
    .call(d3.axisBottom(x).tickValues([1, 2, 5, 20, 100, 1000, 10000, 100000]).tickFormat(d => `1 in ${d3.format(',')(d)}`))
  axis.selectAll('text').attr('class', 'axis-label').attr('font-size', 12)
  axis.selectAll('line, path').attr('stroke', 'var(--rule)')

  const g = svg.selectAll('g.row').data(rows).join('g').attr('class', 'row')
    .attr('transform', (d, i) => `translate(0,${M.top + i * ROW})`)
  g.append('text').attr('x', 0).attr('y', 4).attr('font-size', 14).attr('font-weight', 600).attr('fill', 'var(--text-primary)').text(d => d.label)
  g.append('text').attr('x', 0).attr('y', 22).attr('font-size', 12).attr('fill', 'var(--text-muted)').text(d => d.detail)
  g.append('line').attr('x1', x(1)).attr('x2', d => x(d.range ? d.range[1] : d.oneIn)).attr('y1', 0).attr('y2', 0)
    .attr('stroke', d => colour[d.side]).attr('stroke-width', 2).attr('opacity', 0.35)
  g.filter(d => d.range).append('rect').attr('x', d => x(d.range[0])).attr('width', d => Math.max(6, x(d.range[1]) - x(d.range[0])))
    .attr('y', -7).attr('height', 14).attr('rx', 7).attr('fill', d => colour[d.side]).attr('opacity', 0.85)
  g.filter(d => !d.range).append('circle').attr('cx', d => x(d.oneIn)).attr('cy', 0).attr('r', 8).attr('fill', d => colour[d.side])
  g.append('text').attr('class', 'halo').attr('x', d => x(d.range ? d.range[1] : d.oneIn) + 14).attr('y', 5).attr('font-size', 14).attr('font-weight', 600)
    .attr('fill', d => ink[d.side])
    .text(d => d.range ? `1 in ${d.range[0]} to 1 in ${d.range[1]}` : `1 in ${d3.format(',')(d.oneIn)}`)
}
