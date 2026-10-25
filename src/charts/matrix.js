// Sketch GG8 — what else could explain this?
// A scorecard: eight hypotheses against the four things any of them has to
// account for. Reading across a row tells you where each idea breaks.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'

const MARK = {
  yes:     { fill: 'var(--series-3)', glyph: '●', label: 'accounts for it' },
  partial: { fill: 'var(--series-2)', glyph: '◐', label: 'partly accounts for it' },
  no:      { fill: 'var(--text-muted)', glyph: '○', label: 'does not account for it' },
}

// Greedy word wrap for SVG text. ~0.55em per character is close enough for the
// UI font at these sizes; it only decides where lines break.
function wrap (text, maxPx, fontPx) {
  const max = Math.max(8, Math.floor(maxPx / (fontPx * 0.55)))
  const lines = []
  for (const w of text.split(' ')) {
    const last = lines[lines.length - 1]
    if (last && (last + ' ' + w).length <= max) lines[lines.length - 1] = last + ' ' + w
    else lines.push(w)
  }
  return lines
}

export function drawMatrix (root, { alternatives, phenomena, onSelect, selected }) {
  // Lay out at the container's real width so text renders at its true size
  // instead of being scaled up on wide screens or shrunk on phones. Below the
  // minimum the card scrolls sideways rather than crushing the labels.
  const avail = root.clientWidth || 760
  const narrow = avail < 640
  const labelW = narrow ? 168 : Math.round(Math.min(420, Math.max(280, avail * 0.28)))
  const chevW = 28
  const colW = Math.max(narrow ? 92 : 110, (avail - labelW - chevW) / phenomena.length)
  const W = labelW + phenomena.length * colW + chevW
  const nameFont = 13.5, headFont = 12.5
  const headLines = Math.max(...phenomena.map(p => wrap(p.label, colW - 12, headFont).length))
  const headH = 18 + headLines * 15
  const nameLines = alternatives.map(a => wrap(a.name, labelW - 24, nameFont).length)
  const rowH = 46 + (Math.max(...nameLines) - 1) * 10
  const H = headH + alternatives.length * rowH + 6
  const cx = i => labelW + i * colW + colW / 2

  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('class', 'matrix-svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)
    .attr('role', 'group')
    .attr('aria-label', 'Scorecard of eight competing explanations against four observations each must account for. Each row is a button that shows details.')

  let g = svg.select('g.mx')
  if (g.empty()) g = svg.append('g').attr('class', 'mx')

  // column headers, wrapped and centred over their column
  g.selectAll('text.col-head').data(phenomena).join('text')
    .attr('class', 'col-head')
    .attr('text-anchor', 'middle')
    .attr('font-size', headFont)
    .each(function (d, i) {
      const lines = wrap(d.label, colW - 12, headFont)
      const t = d3.select(this).text(null)
      lines.forEach((ln, k) => t.append('tspan').attr('x', cx(i))
        .attr('y', headH - 12 - (lines.length - 1 - k) * 15).text(ln))
      t.append('title').text(d.plain)
    })
  g.selectAll('line.head-rule').data([0]).join('line').attr('class', 'head-rule')
    .attr('x1', 0).attr('x2', W).attr('y1', headH).attr('y2', headH)

  const rows = g.selectAll('g.row').data(alternatives, d => d.id)
  const re = rows.enter().append('g').attr('class', 'row')
    .attr('tabindex', 0).attr('role', 'button')
  re.append('rect').attr('class', 'rowbg').attr('x', 0).attr('rx', 8)
  re.append('rect').attr('class', 'rowbar').attr('x', 0).attr('width', 3).attr('rx', 1.5)
  re.append('text').attr('class', 'rowlabel').attr('x', 14)
  re.append('text').attr('class', 'chev').attr('text-anchor', 'middle')
  re.append('line').attr('class', 'row-rule')
  const all = re.merge(rows)
  const toggle = d => onSelect(d.id === selected ? null : d.id)
  all.attr('transform', (d, i) => `translate(0,${headH + 3 + i * rowH})`)
    .classed('is-selected', d => d.id === selected)
    .attr('aria-pressed', d => String(d.id === selected))
    .attr('aria-label', d => `${d.name}. ` + phenomena.map(p =>
      `${p.label}: ${MARK[(d.scorecard || {})[p.id] || 'no'].label}`).join('; ') + '.')
    .on('click', (ev, d) => toggle(d))
    .on('keydown', (ev, d) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(d) }
    })
    .on('pointerenter', (ev, d) => showTip(ev, `<div class="t-name">${d.name}</div>${d.one_liner}`))
    .on('pointerleave', hideTip)

  const inner = rowH - 6
  all.select('rect.rowbg').attr('y', 0).attr('width', W).attr('height', inner)
  all.select('rect.rowbar').attr('y', 6).attr('height', inner - 12)
  all.select('line.row-rule').attr('x1', 0).attr('x2', W).attr('y1', rowH - 3).attr('y2', rowH - 3)
  all.select('text.chev').attr('x', W - chevW / 2).attr('y', inner / 2 + 5)
    .text(d => d.id === selected ? '▾' : '›')
  all.select('text.rowlabel')
    .attr('font-size', nameFont)
    .each(function (d) {
      const lines = wrap(d.name, labelW - 24, nameFont)
      const t = d3.select(this).text(null)
      const top = inner / 2 + 5 - (lines.length - 1) * 8
      lines.forEach((ln, k) => t.append('tspan').attr('x', 14).attr('y', top + k * 16).text(ln))
    })

  // Each verdict gets its own SHAPE as well as its own colour: a full disc, a
  // half disc, or an empty ring. Shape carries the meaning on its own, so the
  // chart still reads in greyscale or with any colour vision.
  const R = 9
  const cells = all.selectAll('g.cell').data(d =>
    phenomena.map(p => ({ alt: d, ph: p, v: (d.scorecard || {})[p.id] || 'no' })))
  const ce = cells.enter().append('g').attr('class', 'cell').attr('aria-hidden', 'true')
  ce.append('circle').attr('class', 'ring').attr('r', R).attr('fill', 'none').attr('stroke-width', 2)
  ce.append('path').attr('class', 'fillmark')
  const cAll = ce.merge(cells)
  cAll.attr('transform', (d, i) => `translate(${cx(i)},${inner / 2})`)
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
