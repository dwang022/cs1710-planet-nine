// Part 1, page 3: how long each extreme object has been watched, and how well
// that pins down its orbit.
//
// One row per object: a line from the first night anyone measured it to the
// latest, and a tick for every night in between (observatories.json, from the
// Minor Planet Center's records). To the right, how uncertain its far end is:
// JPL's own estimate (one standard deviation, sigma_ad in the JPL query) as a
// share of that distance, on a log scale. The reliable orbits (seen in more than
// one season) come first, in violet, each group named in its colour; the ones
// seen in one season follow in grey. Each group runs from the best
// known to the least, so the shrinking lines and the growing uncertainty read
// as one pattern. What a line and a tick are is drawn in the page's key line.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'
import { fmtAu } from './distance.js'

const nameOf = d => d.name || d.provisional_desig || d.id
const ROW = 6, GROUP_GAP = 24, SIG_W = 200, GAP = 40
const M = { top: 46, right: 16, bottom: 14, left: 16 }

/** objects: the extreme objects, each joined to its row in observatories.json as `rec`. */
export function drawArcs (root, objects) {
  const rows = objects.map(o => {
    const n = o.rec.nights
    return { ...o, first: n[0], last: n[n.length - 1], span: n[n.length - 1] - n[0], sig: o.rec.sigma_Q_au != null ? o.rec.sigma_Q_au / o.Q_au : null }
  }).sort((a, b) => (b.well_determined - a.well_determined) || ((a.sig ?? Infinity) - (b.sig ?? Infinity)) || (b.span - a.span))
  const nUsed = rows.filter(d => d.well_determined).length
  const yOf = i => i * ROW + GROUP_GAP * (i >= nUsed ? 2 : 1) + ROW / 2      // each group has a line above it for its name
  const plotH = yOf(rows.length - 1) + ROW / 2

  const W = 960, H = M.top + plotH + M.bottom
  const tlW = W - M.left - M.right - GAP - SIG_W
  const x = d3.scaleLinear().domain([Math.floor(d3.min(rows, d => d.first)), Math.ceil(d3.max(rows, d => d.last))]).range([0, tlW])
  const s = d3.scaleLog().domain([0.0001, 1]).range([0, SIG_W]).clamp(true)

  const svg = d3.select(root).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'For each of the 90 extreme objects, every night it was measured, and how uncertain its orbit\'s far end is. The reliable orbits, followed for years, have far ends known to a fraction of a percent; those seen in one season, followed for weeks or months, are uncertain by tens of percent or have no estimate yet.')

  // the uncertainty column's header, one line above its scale (the rest of the key sits in the page's key line)
  svg.append('text').attr('class', 'axis-label strong').attr('x', M.left + tlW + GAP).attr('y', 14)
    .text('uncertainty of its far end')

  const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`)
  const gs = svg.append('g').attr('transform', `translate(${M.left + tlW + GAP},${M.top})`)

  // axes: years along the top, the uncertainty scale above its column
  const years = x.ticks(8)
  g.selectAll('line.grid').data(years).join('line').attr('class', 'gridline')
    .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', -6).attr('y2', plotH)
  g.selectAll('text.year').data(years).join('text').attr('class', 'axis-label')
    .attr('x', d => x(d)).attr('y', -12).attr('text-anchor', 'middle').text(d => d)
  const sticks = [[0.001, '0.1%'], [0.01, '1%'], [0.1, '10%'], [1, '100%']]
  gs.selectAll('line.grid').data(sticks).join('line').attr('class', 'gridline')
    .attr('x1', d => s(d[0])).attr('x2', d => s(d[0])).attr('y1', -6).attr('y2', plotH)
  gs.selectAll('text.tick').data(sticks).join('text').attr('class', 'axis-label')
    .attr('x', d => s(d[0])).attr('y', -12).attr('text-anchor', 'middle').text(d => d[1])

  // the two groups, named where they start
  g.append('text').attr('class', 'arc-group used').attr('x', 0).attr('y', yOf(0) - ROW / 2 - 8).text(`the ${nUsed} reliable orbits`)
  g.append('text').attr('class', 'arc-group').attr('x', 0).attr('y', yOf(nUsed) - ROW / 2 - 8).text(`the ${rows.length - nUsed} seen in one season`)

  const row = g.selectAll('g.arc-row').data(rows).join('g')
    .attr('class', d => `arc-row${d.well_determined ? ' used' : ''}`)
    .attr('transform', (d, i) => `translate(0,${yOf(i)})`)
  row.append('line').attr('class', 'span').attr('x1', d => x(d.first)).attr('x2', d => x(d.last))
  row.append('path').attr('class', 'nights').attr('d', d => d.rec.nights.map(t => `M${x(t).toFixed(1)},-2.4v4.8`).join(''))
  row.append('rect').attr('class', 'hit').attr('x', -M.left).attr('y', -ROW / 2).attr('width', W).attr('height', ROW)

  const srow = gs.selectAll('g.sig').data(rows).join('g')
    .attr('class', d => `sig${d.well_determined ? ' used' : ''}`)
    .attr('transform', (d, i) => `translate(0,${yOf(i)})`)
  srow.filter(d => d.sig != null).append('line').attr('x1', 0).attr('x2', d => s(d.sig))
  srow.filter(d => d.sig != null).append('circle').attr('cx', d => s(d.sig)).attr('r', 2.2)
  srow.filter(d => d.sig == null).append('line').attr('class', 'unknown').attr('x1', 0).attr('x2', SIG_W)

  const tip = (ev, d) => {
    const yrs = d.span >= 1 ? `${d.span.toFixed(0)} years` : `${Math.max(1, Math.round(d.span * 52))} weeks`
    showTip(ev, `<b>${nameOf(d)}</b>
      <dl><dt>watched</dt><dd>${Math.floor(d.first)}${Math.floor(d.last) !== Math.floor(d.first) ? `–${Math.floor(d.last)}` : ''}, ${yrs}</dd>
      <dt>nights</dt><dd>${d.rec.n_nights}</dd>
      <dt>observatories</dt><dd>${d.rec.n_observatories}</dd>
      <dt>far end</dt><dd class="au">${fmtAu(d.Q_au)}${d.rec.sigma_Q_au != null ? ` ± ${fmtAu(d.rec.sigma_Q_au)}` : ''}</dd></dl>`)
  }
  row.on('pointerenter', function (ev, d) { d3.select(this).classed('hot', true); tip(ev, d) })
    .on('pointermove', tip)
    .on('pointerleave', function () { d3.select(this).classed('hot', false); hideTip() })
}
