// Part 1, page 3: how long each extreme object has been watched, and how well
// that pins down its orbit.
//
// One row per object: a line from the first night anyone measured it to the
// latest, and a tick for every night in between (observatories.json, from the
// Minor Planet Center's records). To the right, how uncertain its closest point
// to the Sun is: JPL's own estimate (one standard deviation, sigma_q in the JPL
// query) as a share of that distance, on a log scale from 0.0001% to 100%. It was
// the far end (sigma_ad) until 2026-11-16: the far end is the least certain part of
// an orbit, so even reliable orbits looked rough there, while the closest point
// sets the way an orbit points, which is what the evidence uses. The far end and
// its uncertainty are in the hover card. The reliable orbits (seen in more than
// one year) come first, in violet; the ones seen in one year only follow in grey.
// Each group runs from the
// best known to the least, so the shrinking lines and the growing uncertainty
// read as one pattern. The page never says "season": readers did not know it.
//
// The key is in the chart, over the columns it explains (an HTML legend beside
// it confused readers, and a sentence of key was too many words): a sample row
// over the timeline, labelled "one night" at a tick and "first" and "latest" at
// its ends; over the uncertainty, a colour bar from "precise" to "rough". More
// uncertain is worse, so each uncertainty is coloured by its value, dim grey
// where the closest point is known well to bright ember (the site's warning colour)
// where it is barely known, and grows thicker as it goes; the column past 10% is
// faintly ember. The objects with no estimate yet are not drawn as lines: their
// rows are hatched in the column, with the words on them. The chart is compact
// (4.5 px rows) and, with the section's title and line above it, fits one screen
// (pages/data.js measures the head into --arc-head); the years and percentages
// are written at its foot as well as its head.
//
// A note says why the closest point (2026-11-16): it fixes which way an orbit stretches out, and
// those directions are the main clue to Planet Nine. It quotes no number and sits in the column itself, in the room
// right of the reliable orbits' short bars, NOTE_PAD clear of the longest bar beside it,
// so the chart grows no taller. Each group is named in a few words: "the 62 reliable
// orbits", "the 28 objects watched under 4 months". Under the chart (setting/data.html) one
// short paragraph says why the rule counts years rather than ranking by uncertainty.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'
import { fmtAu } from './distance.js'

const nameOf = d => d.name || d.provisional_desig || d.id
const ROW = 4.5, GROUP_GAP = 22, SIG_W = 200, GAP = 40
const M = { top: 76, right: 16, bottom: 26, left: 16 }
const NOTE_LH = 13                // the note's line height
const NOTE_PAD = 16               // the room between the note and the end of any bar beside it

// Where the plot's edges fall, as insets in px from the sides of the chart's box: the drawing is
// centred and, on a short screen, narrower than its box, so the side note under it can start at
// the 1990 line and end at 100%.
export function plotInsets(root) {
  const svg = root.querySelector('svg')
  if (!svg) return null
  const box = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal
  const k = Math.min(box.width / vb.width, box.height / vb.height)
  const side = (box.width - vb.width * k) / 2
  return { left: side + M.left * k, right: side + M.right * k }
}

// dim grey (known well) to bright ember (barely known): the lightness and the colour both climb, so a
// bad value stands out at a glance. Set by value, so a share has the colour it always had: dim grey to
// about 0.4%, ember from about 3%, brightest at 100%. heat takes t, the place along the log scale, 0 to 1.
const HEAT_AT = [0.004, 0.03]
const HEAT = ['#3e3e44', '#5f5b58', '#ff8a5c', '#ff4b25']
const pct = v => { const p = v * 100; return p >= 100 ? 'over 100%' : p >= 10 ? `${Math.round(p)}%` : p >= 1 ? `${p.toFixed(1)}%` : `${p.toFixed(2)}%` }

/** objects: the extreme objects, each joined to its row in observatories.json as `rec`. */
export function drawArcs (root, objects) {
  const rows = objects.map(o => {
    const n = o.rec.nights
    return { ...o, first: n[0], last: n[n.length - 1], span: n[n.length - 1] - n[0], sig: o.rec.sigma_q_au != null ? o.rec.sigma_q_au / o.q_au : null }
  }).sort((a, b) => (b.well_determined - a.well_determined) || ((a.sig ?? Infinity) - (b.sig ?? Infinity)) || (b.span - a.span))
  const used = rows.filter(d => d.well_determined), once = rows.filter(d => !d.well_determined)
  const nUsed = used.length
  const yOf = i => i * ROW + GROUP_GAP * (i >= nUsed ? 2 : 1) + ROW / 2      // each group has a line above it for its name
  const plotH = yOf(rows.length - 1) + ROW / 2

  const W = 960, H = M.top + plotH + M.bottom
  const tlW = W - M.left - M.right - GAP - SIG_W
  const x = d3.scaleLinear().domain([Math.floor(d3.min(rows, d => d.first)), Math.ceil(d3.max(rows, d => d.last))]).range([0, tlW])
  const s = d3.scaleLog().domain([0.000001, 1]).range([0, SIG_W]).clamp(true)
  const t = v => s(v) / SIG_W
  const heat = d3.scaleLinear().domain([0, t(HEAT_AT[0]), t(HEAT_AT[1]), 1]).range(HEAT).interpolate(d3.interpolateLab).clamp(true)

  // how long each group was watched, in the units that say it: years for the reliable, months for the rest
  const yrs = [Math.max(1, Math.round(d3.min(used, d => d.span))), Math.round(d3.max(used, d => d.span))]
  const months = Math.ceil(d3.max(once, d => d.span) * 12)
  // the rows with no estimate, sorted last in their group, so one run per group (the reliable group's is
  // 2015 DR370, whose only JPL uncertainty is for another orbit: scripts/build_observatories.py)
  const unknown = rows.map((d, i) => (d.sig == null ? i : -1)).filter(i => i >= 0)
  const runs = d3.groups(unknown, i => rows[i].well_determined).map(([, is]) => is)
  const nUnknownOnce = once.filter(d => d.sig == null).length

  const svg = d3.select(root).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', `For each of the ${rows.length} extreme objects, every night it was measured, and how uncertain its orbit's closest point to the Sun is. Of the ${nUsed} reliable orbits, watched for ${yrs[0]} to ${yrs[1]} years, ${used.filter(d => d.sig != null && d.sig < 0.01).length} have closest points known to better than 1%; the ${once.length} seen in one year only, watched for under ${months} months, are mostly uncertain by tens of percent or more, and ${nUnknownOnce} of them have no estimate yet${unknown.length > nUnknownOnce ? ` (nor ${unknown.length - nUnknownOnce} of the reliable ones)` : ''}.`)

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
  // (two lines: the name is wider than the column)
  const head = keyR.append('text').attr('class', 'axis-label strong')
  head.append('tspan').attr('x', 0).attr('y', 9).text('uncertainty of its closest point')
  head.append('tspan').attr('x', 0).attr('y', 23).text('to the ').append('tspan').style('fill', 'var(--sun)').text('Sun')
  keyR.append('text').attr('class', 'arc-end good').attr('x', 0).attr('y', 39).text('precise')
  keyR.append('text').attr('class', 'arc-end bad').attr('x', SIG_W).attr('y', 39).attr('text-anchor', 'end').text('rough')
  keyR.append('rect').attr('class', 'arc-heat').attr('x', 0).attr('y', 44).attr('width', SIG_W).attr('height', 6).attr('rx', 3)

  // --- axes: years and percentages at the head and again at the foot ------------------
  const years = x.ticks(8)
  const sticks = [[0.00001, '0.001%'], [0.001, '0.1%'], [0.1, '10%'], [1, '100%']]
  // past 10% the closest point is barely known: the column there is faintly ember
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
    .text(`the ${nUsed} reliable orbits`)
  g.append('text').attr('class', 'arc-group').attr('x', 0).attr('y', yOf(nUsed) - ROW / 2 - 8)
    .text(`the ${once.length} objects watched under ${months} months`)

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

  // why the closest point: a note in the column, in the room right of the reliable orbits' short bars, from the
  // top of the group down, wrapped to that room and NOTE_PAD clear of the longest bar beside any of its lines
  {
    const note = gs.append('text').attr('class', 'arc-note')
    const y0 = yOf(0) + 4
    const lay = x0 => {
      note.selectAll('tspan').remove()
      const lines = []
      const wrap = (words, cls) => {
        let line = [], ts = null
        for (const w of words.split(' ')) {
          if (!ts) { ts = note.append('tspan').attr('class', cls).attr('x', x0); lines.push(ts) }
          line.push(w); ts.text(line.join(' '))
          if (line.length > 1 && ts.node().getComputedTextLength() > SIG_W - x0) {
            line.pop(); ts.text(line.join(' ')); line = [w]
            ts = note.append('tspan').attr('class', cls).attr('x', x0).text(w); lines.push(ts)
          }
        }
      }
      wrap('Why the closest point?', 'lead')
      wrap('It fixes which way an orbit stretches out. Those directions are the main clue to Planet Nine.', '')
      lines.forEach((ts, k) => ts.attr('y', y0 + k * NOTE_LH))
      // Planet Nine in its lettering, as chart text draws it (kept on one line by the no-break space)
      for (const ts of lines) {
        const txt = ts.text(), at = txt.indexOf('Planet Nine')
        if (at < 0) continue
        ts.text(txt.slice(0, at))
        ts.append('tspan').attr('class', 'p9-svg').text('Planet Nine')
        ts.append('tspan').text(txt.slice(at + 11))
      }
      // the longest bar among the rows the note's lines cover (from a cap height above the first to the last's descenders)
      const covered = used.filter((d, i) => yOf(i) + ROW / 2 >= y0 - 10 && yOf(i) - ROW / 2 <= y0 + (lines.length - 1) * NOTE_LH + 4)
      return d3.max(covered, d => (d.sig == null ? 0 : s(d.sig))) + NOTE_PAD
    }
    // start just past the 0.01% line, then step right until no bar beside the note comes within NOTE_PAD of it
    let x0 = s(0.0001)
    for (let k = 0; k < 6; k++) { const need = lay(x0); if (need <= x0) break; x0 = need }
  }

  const tip = (ev, d) => {
    const yrs = d.span >= 1 ? `${d.span.toFixed(0)} years` : d.span >= 2 / 12 ? `${Math.round(d.span * 12)} months` : `${Math.max(1, Math.round(d.span * 52))} weeks`
    showTip(ev, `<b>${nameOf(d)}</b>
      <dl><dt>watched</dt><dd>${Math.floor(d.first)}${Math.floor(d.last) !== Math.floor(d.first) ? `–${Math.floor(d.last)}` : ''}, ${yrs}</dd>
      <dt>nights</dt><dd>${d.rec.n_nights}</dd>
      <dt>observatories</dt><dd>${d.rec.n_observatories}</dd>
      <dt>closest point</dt><dd class="au">${fmtAu(d.q_au)}${d.rec.sigma_q_au != null ? ` ± ${fmtAu(d.rec.sigma_q_au)}` : ''}</dd>
      <dt>uncertainty</dt><dd>${d.sig != null ? pct(d.sig) : 'no estimate yet'}</dd>
      <dt>far end</dt><dd class="au">${fmtAu(d.Q_au)}${d.rec.sigma_Q_au != null ? ` ± ${fmtAu(d.rec.sigma_Q_au)}` : ''}</dd></dl>`)
  }
  row.on('pointerenter', function (ev, d) { d3.select(this).classed('hot', true); tip(ev, d) })
    .on('pointermove', tip)
    .on('pointerleave', function () { d3.select(this).classed('hot', false); hideTip() })
}
