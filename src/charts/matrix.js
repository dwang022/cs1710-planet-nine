// Sketch GG8 — what else could explain this?
// A scorecard: eight hypotheses against the four things any of them has to
// account for. Reading across a row tells you where each idea breaks.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'

const MARK = {
  yes:     { fill: 'var(--series-3)', glyph: '●', label: 'accounts for it' },
  partial: { fill: 'var(--series-2)', glyph: '◐', label: 'partly' },
  no:      { fill: 'var(--text-muted)', glyph: '○', label: 'does not' },
}

export function drawMatrix (root, { alternatives, phenomena, onSelect, selected }) {
  const rowH = 46, labelW = 230, colW = 118
  const W = labelW + phenomena.length * colW + 20
  const H = 64 + alternatives.length * rowH

  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'Scorecard of eight competing explanations against four observations each must account for.')

  let g = svg.select('g.mx')
  if (g.empty()) g = svg.append('g').attr('class', 'mx')

  // column headers
  g.selectAll('text.col').data(phenomena).join('text')
    .attr('class', 'col axis-label')
    .attr('x', (d, i) => labelW + i * colW + colW / 2)
    .attr('y', 26).attr('text-anchor', 'middle')
    .attr('fill', 'var(--text-secondary)')
    .each(function (d) {
      const words = d.label.split(' ')
      const mid = Math.ceil(words.length / 2)
      d3.select(this).text(null)
        .append('tspan').attr('x', d3.select(this).attr('x')).attr('dy', 0)
        .text(words.slice(0, mid).join(' '))
      d3.select(this).append('tspan')
        .attr('x', d3.select(this).attr('x')).attr('dy', 13)
        .text(words.slice(mid).join(' '))
    })

  const rows = g.selectAll('g.row').data(alternatives, d => d.id)
  const re = rows.enter().append('g').attr('class', 'row')
  re.append('rect').attr('class', 'rowbg').attr('x', 0).attr('height', rowH - 6).attr('rx', 8)
  re.append('text').attr('class', 'rowlabel').attr('x', 12)
  const all = re.merge(rows)
  all.attr('transform', (d, i) => `translate(0,${58 + i * rowH})`)
    .style('cursor', 'pointer')
    .on('click', (ev, d) => onSelect(d.id === selected ? null : d.id))
    .on('pointerenter', (ev, d) => showTip(ev, `<div class="t-name">${d.name}</div>${d.one_liner}`))
    .on('pointerleave', hideTip)

  all.select('rect.rowbg')
    .attr('width', W - 10)
    .attr('fill', d => d.id === selected ? '#ffffff0e' : 'transparent')
  all.select('text.rowlabel')
    .attr('y', (rowH - 6) / 2 + 5)
    .attr('fill', d => d.id === selected ? 'var(--text-primary)' : 'var(--text-secondary)')
    .attr('font-size', 13)
    .attr('font-weight', d => d.id === selected ? 600 : 400)
    .text(d => d.name)

  // Each verdict gets its own SHAPE as well as its own colour: a full disc, a
  // half disc, or an empty ring. Shape carries the meaning on its own, so the
  // chart still reads in greyscale or with any colour vision.
  const R = 9
  const cells = all.selectAll('g.cell').data(d =>
    phenomena.map(p => ({ alt: d, ph: p, v: (d.scorecard || {})[p.id] || 'no' })))
  const ce = cells.enter().append('g').attr('class', 'cell')
  ce.append('circle').attr('class', 'ring').attr('r', R).attr('fill', 'none').attr('stroke-width', 2)
  ce.append('path').attr('class', 'fillmark')
  const cAll = ce.merge(cells)
  cAll.attr('transform', (d, i) => `translate(${labelW + i * colW + colW / 2},${(rowH - 6) / 2})`)
  cAll.select('circle.ring').attr('stroke', d => MARK[d.v].fill)
  cAll.select('path.fillmark')
    .attr('fill', d => MARK[d.v].fill)
    .attr('d', d => d.v === 'yes'
      ? `M 0,-${R} A ${R},${R} 0 1,1 0,${R} A ${R},${R} 0 1,1 0,-${R} Z`
      : d.v === 'partial'
        ? `M 0,-${R} A ${R},${R} 0 0,1 0,${R} Z`
        : null)

  rows.exit().remove()
}
