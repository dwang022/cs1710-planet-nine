// Part 1, page 3: how long each extreme object has been watched, and how well
// that pins down its orbit.
//
// One row per object: a line from the first night anyone measured it to the
// latest, and a tick for every night in between (observatories.json, from the
// Minor Planet Center's records). To the right, how uncertain its far end is:
// JPL's own estimate (one standard deviation, sigma_ad in the JPL query) as a
// share of that distance, on a log scale. The reliable orbits (seen in more than
// one year) come first, in violet; the ones seen in one year only follow in grey.
// Each group is named with how long its objects were watched, from the data
// ("watched for 1 to 35 years", "for under 4 months"). Each group runs from the
// best known to the least, so the shrinking lines and the growing uncertainty
// read as one pattern. The page never says "season": readers did not know it.
//
// The key is in the chart, over the columns it explains (an HTML legend beside
// it confused readers, and a sentence of key was too many words): a sample row
// over the timeline, labelled "one night" at a tick and "first" and "latest" at
// its ends; over the uncertainty, a colour bar from "precise" to "rough". More
// uncertain is worse, so each uncertainty is coloured by its value, dim grey
// where the far end is known well to bright ember (the site's warning colour)
// where it is barely known, and grows thicker as it goes; the column past 10% is
// faintly ember. The objects with no estimate yet are not drawn as lines: their
// rows are hatched in the column, with the words on them. The chart is compact
// (4.5 px rows) and, with the section's title and line above it, fits one screen
// (pages/data.js measures the head into --arc-head); the years and percentages
// are written at its foot as well as its head.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'
import { fmtAu } from './distance.js'

const nameOf = d => d.name || d.provisional_desig || d.id
const ROW = 4.5, GROUP_GAP = 22, SIG_W = 200, GAP = 40
const M = { top: 76, right: 16, bottom: 26, left: 16 }

// dim grey (known well) to bright ember (barely known): the lightness and the colour both climb, so a
// bad value stands out at a glance; t is the place along the log scale, 0 to 1
const heat = d3.scaleLinear().domain([0, 0.4, 0.62, 1]).range(['#3e3e44', '#5f5b58', '#ff8a5c', '#ff4b25']).interpolate(d3.interpolateLab).clamp(true)
const pct = v => { const p = v * 100; return p >= 100 ? 'over 100%' : p >= 10 ? `${Math.round(p)}%` : p >= 1 ? `${p.toFixed(1)}%` : `${p.toFixed(2)}%` }

/** objects: the extreme objects, each joined to its row in observatories.json as `rec`. */
export function drawArcs (root, objects) {
  const rows = objects.map(o => {
    const n = o.rec.nights
    return { ...o, first: n[0], last: n[n.length - 1], span: n[n.length - 1] - n[0], sig: o.rec.sigma_Q_au != null ? o.rec.sigma_Q_au / o.Q_au : null }
  }).sort((a, b) => (b.well_determined - a.well_determined) || ((a.sig ?? Infinity) - (b.sig ?? Infinity)) || (b.span - a.span))
  const used = rows.filter(d => d.well_determined), once = rows.filter(d => !d.well_determined)
  const nUsed = used.length
  const yOf = i => i * ROW + GROUP_GAP * (i >= nUsed ? 2 : 1) + ROW / 2      // each group has a line above it for its name
  const plotH = yOf(rows.length - 1) + ROW / 2

  const W = 960, H = M.top + plotH + M.bottom
  const tlW = W - M.left - M.right - GAP - SIG_W
  const x = d3.scaleLinear().domain([Math.floor(d3.min(rows, d => d.first)), Math.ceil(d3.max(rows, d => d.last))]).range([0, tlW])
  const s = d3.scaleLog().domain([0.0001, 1]).range([0, SIG_W]).clamp(true)
  const t = v => s(v) / SIG_W

  // how long each group was watched, in the units that say it: years for the reliable, months for the rest
  const yrs = [Math.max(1, Math.round(d3.min(used, d => d.span))), Math.round(d3.max(used, d => d.span))]
  const months = Math.ceil(d3.max(once, d => d.span) * 12)
  // the rows with no estimate, sorted last in their group, so one run per group (the reliable group's is
  // 2015 DR370, whose only JPL uncertainty is for another orbit: scripts/build_observatories.py)
  const unknown = rows.map((d, i) => (d.sig == null ? i : -1)).filter(i => i >= 0)
  const runs = d3.groups(unknown, i => rows[i].well_determined).map(([, is]) => is)
  const nUnknownOnce = once.filter(d => d.sig == null).length

  const svg = d3.select(root).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', `For each of the ${rows.length} extreme objects, every night it was measured, and how uncertain its orbit's far end is. The ${nUsed} reliable orbits, watched for ${yrs[0]} to ${yrs[1]} years, have far ends known to a fraction of a percent; the ${once.length} seen in one year only, watched for under ${months} months, are uncertain by tens of percent or more, and ${nUnknownOnce} of them have no estimate yet${unknown.length > nUnknownOnce ? ` (nor ${unknown.length - nUnknownOnce} of the reliable ones)` : ''}.`)

  const defs = svg.append('defs')
  const grad = defs.append('linearGradient').attr('id', 'arc-heat').attr('x1', 0).attr('x2', 1)
  d3.range(0, 1.001, 0.1).forEach(v => grad.append('stop').attr('offset', v).attr('stop-color', heat(v)))
  defs.append('pattern').attr('id', 'arc-hatch').attr('width', 6).attr('height', 6).attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(45)').append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6)

  const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`)
  const gs = svg.append('g').attr('transform', `translate(${M.left + tlW + GAP},${M.top})`)

  // --- the key, over the columns it explains ---------------------------------------
  // the timeline: one sample row, labelled where it means something, in three words: one tick is
  // "one night", and the line runs from the "first" to the "latest"
  const keyL = svg.append('g').attr('transform', `translate(${M.left},0)`)
  const sx0 = 34, sw = 120, nights = [0, 0.05, 0.09, 0.3, 0.42, 0.46, 0.7, 0.74, 1], one = 0.42
  const sample = keyL.append('g').attr('class', 'arc-row used').attr('transform', `translate(${sx0},36)`)
  sample.append('line').attr('class', 'span').attr('x1', 0).attr('x2', sw)
  sample.append('path').attr('class', 'nights').attr('d', nights.map(f => `M${(f * sw).toFixed(1)},-4v8`).join(''))
  keyL.append('text').attr('class', 'arc-key-lbl').attr('x', sx0 - 6).attr('y', 40).attr('text-anchor', 'end').text('first')
  keyL.append('text').attr('class', 'arc-key-lbl').attr('x', sx0 + sw + 6).attr('y', 40).text('latest')
  keyL.append('text').attr('class', 'arc-key-lbl').attr('x', sx0 + one * sw).attr('y', 14).attr('text-anchor', 'middle').text('one night')
  keyL.append('line').attr('class', 'arc-key-lead').attr('x1', sx0 + one * sw).attr('x2', sx0 + one * sw).attr('y1', 18).attr('y2', 29)
  // the uncertainty: its name, the colour bar with its two ends named
  const keyR = svg.append('g').attr('transform', `translate(${M.left + tlW + GAP},0)`)
  keyR.append('text').attr('class', 'axis-label strong').attr('x', 0).attr('y', 14).text('uncertainty of its far end')
  keyR.append('text').attr('class', 'arc-end good').attr('x', 0).attr('y', 31).text('precise')
  keyR.append('text').attr('class', 'arc-end bad').attr('x', SIG_W).attr('y', 31).attr('text-anchor', 'end').text('rough')
  keyR.append('rect').attr('class', 'arc-heat').attr('x', 0).attr('y', 36).attr('width', SIG_W).attr('height', 6).attr('rx', 3)

  // --- axes: years and percentages at the head and again at the foot ------------------
  const years = x.ticks(8)
  const sticks = [[0.001, '0.1%'], [0.01, '1%'], [0.1, '10%'], [1, '100%']]
  // past 10% the far end is barely known: the column there is faintly ember
  gs.append('rect').attr('class', 'arc-bad-zone').attr('x', s(0.1)).attr('y', -6).attr('width', SIG_W - s(0.1)).attr('height', plotH + 10)
  g.selectAll('line.grid').data(years).join('line').attr('class', 'gridline')
    .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', -6).attr('y2', plotH + 4)
  gs.selectAll('line.grid').data(sticks).join('line').attr('class', 'gridline')
    .attr('x1', d => s(d[0])).attr('x2', d => s(d[0])).attr('y1', -6).attr('y2', plotH + 4)
  for (const y of [-12, plotH + 16]) {
    g.append('g').selectAll('text').data(years).join('text').attr('class', 'axis-label')
      .attr('x', d => x(d)).attr('y', y).attr('text-anchor', 'middle').text(d => d)
    gs.append('g').selectAll('text').data(sticks).join('text').attr('class', 'axis-label')
      .attr('x', d => s(d[0])).attr('y', y).attr('text-anchor', 'middle').text(d => d[1])
  }

  // the two groups, named where they start, with how long they were watched
  g.append('text').attr('class', 'arc-group used').attr('x', 0).attr('y', yOf(0) - ROW / 2 - 8)
    .text(`the ${nUsed} reliable orbits · watched for ${yrs[0]} to ${yrs[1]} years`)
  g.append('text').attr('class', 'arc-group').attr('x', 0).attr('y', yOf(nUsed) - ROW / 2 - 8)
    .text(`the ${once.length} seen in one year only · watched for under ${months} months`)

  // --- the rows -------------------------------------------------------------------
  const row = g.selectAll('g.arc-row.obj').data(rows).join('g')
    .attr('class', d => `arc-row obj${d.well_determined ? ' used' : ''}`)
    .attr('transform', (d, i) => `translate(0,${yOf(i)})`)
  row.append('line').attr('class', 'span').attr('x1', d => x(d.first)).attr('x2', d => x(d.last))
  row.append('path').attr('class', 'nights').attr('d', d => d.rec.nights.map(v => `M${x(v).toFixed(1)},-1.8v3.6`).join(''))
  row.append('rect').attr('class', 'hit').attr('x', -M.left).attr('y', -ROW / 2).attr('width', W).attr('height', ROW)

  // each uncertainty in its own colour and weight (inline, so it wins over the stylesheet)
  const known = rows.filter(d => d.sig != null)
  gs.selectAll('g.sig').data(known).join('g').attr('class', 'sig')
    .attr('transform', d => `translate(0,${yOf(rows.indexOf(d))})`)
    .call(e => e.append('line').attr('x1', 0).attr('x2', d => s(d.sig)).style('stroke', d => heat(t(d.sig))).style('stroke-width', d => 1 + 1.4 * t(d.sig)))
    .call(e => e.append('circle').attr('cx', d => s(d.sig)).attr('r', d => 1.6 + 1.4 * t(d.sig)).style('fill', d => heat(t(d.sig))))

  // no estimate yet: each group's run of such rows hatched across the column, the words on a tall run,
  // and under a short one, in the gap before the next group
  for (const run of runs) {
    const y0 = yOf(run[0]) - ROW / 2, y1 = yOf(run[run.length - 1]) + ROW / 2
    gs.append('rect').attr('class', 'arc-none').attr('x', 0).attr('y', y0).attr('width', SIG_W).attr('height', y1 - y0).attr('rx', run.length > 2 ? 3 : 1)
    const tall = run.length >= 4
    gs.append('text').attr('class', `arc-none-lbl${tall ? '' : ' small'}`).attr('x', SIG_W / 2).attr('text-anchor', 'middle')
      .attr('y', tall ? (y0 + y1) / 2 + 4 : y1 + 11)
      .text(tall ? `no estimate yet (${run.length})` : 'no estimate yet')
  }

  const tip = (ev, d) => {
    const yrs = d.span >= 1 ? `${d.span.toFixed(0)} years` : d.span >= 2 / 12 ? `${Math.round(d.span * 12)} months` : `${Math.max(1, Math.round(d.span * 52))} weeks`
    showTip(ev, `<b>${nameOf(d)}</b>
      <dl><dt>watched</dt><dd>${Math.floor(d.first)}${Math.floor(d.last) !== Math.floor(d.first) ? `–${Math.floor(d.last)}` : ''}, ${yrs}</dd>
      <dt>nights</dt><dd>${d.rec.n_nights}</dd>
      <dt>observatories</dt><dd>${d.rec.n_observatories}</dd>
      <dt>far end</dt><dd class="au">${fmtAu(d.Q_au)}${d.rec.sigma_Q_au != null ? ` ± ${fmtAu(d.rec.sigma_Q_au)}` : ''}</dd>
      <dt>uncertainty</dt><dd>${d.sig != null ? pct(d.sig) : 'no estimate yet'}</dd></dl>`)
  }
  row.on('pointerenter', function (ev, d) { d3.select(this).classed('hot', true); tip(ev, d) })
    .on('pointermove', tip)
    .on('pointerleave', function () { d3.select(this).classed('hot', false); hideTip() })
}
