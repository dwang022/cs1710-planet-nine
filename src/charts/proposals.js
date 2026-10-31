// The timeline page: how the proposed planet itself has changed, 2016 to 2025.
// Two strips on one time axis: how far out each paper put the planet, and how
// heavy. Each is a range when the paper gives one; a dot when it gives a value.
// Every number is from planet_nine_predictions.json, which tags its sources.
// On phones (640 px and narrower) time runs down instead: one row per paper,
// its distance and its mass side by side, drawn at the width of the screen.

import * as d3 from 'd3'

const W = 900, H = 470
const M = { top: 96, right: 30, bottom: 40, left: 64 }
const GAP = 70

function ranges (p) {
  const a = p.a_au_range || p.distance_au_range || (p.a_au != null && p.a_au_err ? [p.a_au + p.a_au_err[0], p.a_au + p.a_au_err[1]] : p.a_au != null ? [p.a_au, p.a_au] : null)
  const m = p.mass_earths_range || (p.mass_earths != null && p.mass_earths_err ? [p.mass_earths + p.mass_earths_err[0], p.mass_earths + p.mass_earths_err[1]]
    : p.mass_earths != null ? [p.mass_earths, p.mass_earths] : p.mass_earths_min != null ? [p.mass_earths_min, 20] : null)
  return { a, m, aMid: p.a_au ?? (a ? (a[0] + a[1]) / 2 : null), mMid: p.mass_earths ?? (m && !p.mass_earths_min ? (m[0] + m[1]) / 2 : null), open: p.mass_earths_min != null }
}

const shortLabel = p => p.label.replace('Batygin, Adams, Brown & Becker 2019 (review)', 'Batygin et al. 2019').replace(' (observational constraints)', '')
  .replace(' (headline values)', ', abstract').replace(' (marginalized posterior)', ', full fit').replace(' (IRAS/AKARI far-IR candidate)', ' candidate')
  .replace(' (after the searches)', ', after searches')
// a fit is Planet Nine (the skin's colour); the one candidate sighting is the comparison (ember)
const colour = p => p.candidate ? 'var(--series-2-ink)' : 'var(--p9)'
const ARIA = 'The distance and the mass each paper proposed for Planet Nine, 2016 to 2025. Both shrink over the decade: from about 700 AU and 10 or more Earth masses to about 400 to 500 AU and 5 to 7 Earth masses.'

export function drawProposals (root, predictions) {
  const rows = predictions.map(p => ({ ...p, ...ranges(p) })).filter(p => p.a || p.m)
  if (window.matchMedia('(max-width: 640px)').matches) return drawNarrow(root, rows)
  // two entries share 2021 (the same paper, two readings) and a year has two in 2016; nudge them apart
  const byYear = d3.group(rows, p => p.year)
  for (const [, grp] of byYear) grp.forEach((p, i) => { p.xy = p.year + (i - (grp.length - 1) / 2) * 0.55 })

  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', ARIA)
  svg.selectAll('*').remove()
  const iw = W - M.left - M.right
  const panelH = (H - M.top - M.bottom - GAP) / 2
  const x = d3.scaleLinear().domain([2015.3, 2025.9]).range([M.left, M.left + iw])
  const yA = d3.scaleLinear().domain([0, 1050]).range([M.top + panelH, M.top])
  const yM = d3.scaleLinear().domain([0, 21]).range([M.top + panelH + GAP + panelH, M.top + panelH + GAP])

  const panel = (y, title, unit, ticks, cls = '') => {
    const g = svg.append('g')
    g.append('text').attr('x', M.left).attr('y', y.range()[1] - (y === yA ? 76 : 16)).attr('font-size', 14).attr('font-weight', 600).attr('fill', 'var(--text-primary)').text(title)
    g.selectAll('line').data(ticks).join('line').attr('class', 'gridline').attr('x1', M.left).attr('x2', M.left + iw).attr('y1', d => y(d)).attr('y2', d => y(d))
    g.selectAll('text.t').data(ticks).join('text').attr('class', `t axis-label ${cls}`).attr('x', M.left - 8).attr('y', d => y(d) + 4).attr('text-anchor', 'end').text(d => `${d}${unit}`)
    return g
  }
  // distances in AU are lime wherever they are written
  panel(yA, 'Average distance from the Sun', ' AU', [200, 400, 600, 800, 1000], 'au')
  panel(yM, 'Mass, in Earth masses', '', [5, 10, 15, 20])

  const xa = svg.append('g').attr('transform', `translate(0,${H - M.bottom + 4})`)
    .call(d3.axisBottom(x).tickValues([...new Set(rows.map(p => p.year))]).tickFormat(d3.format('d')))
  xa.selectAll('text').attr('class', 'axis-label').attr('font-size', 12)
  xa.selectAll('line, path').attr('stroke', 'var(--rule)')

  const strip = (y, key, mid, open) => {
    const g = svg.append('g')
    const r = g.selectAll('g').data(rows.filter(p => p[key])).join('g')
    r.append('line').attr('x1', p => x(p.xy)).attr('x2', p => x(p.xy))
      .attr('y1', p => y(p[key][0])).attr('y2', p => y(Math.min(y.domain()[1], p[key][1])))
      .attr('stroke', colour).attr('stroke-width', 10).attr('stroke-linecap', 'round').attr('opacity', .45)
    r.filter(p => open && p.open).append('text').attr('x', p => x(p.xy)).attr('y', p => y(y.domain()[1]) - 4).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--text-muted)').text('at least')
    r.filter(p => p[mid] != null).append('circle').attr('cx', p => x(p.xy)).attr('cy', p => y(p[mid])).attr('r', 5.5).attr('fill', colour).attr('stroke', 'var(--surface-1)').attr('stroke-width', 1.5)
    r.append('title').text(p => `${p.label}: ${p[key][0] === p[key][1] ? p[key][0] : p[key][0] + ' to ' + p[key][1]}${key === 'a' ? ' AU' : ' Earth masses'}`)
    return g
  }
  strip(yA, 'a', 'aMid', false)
  strip(yM, 'm', 'mMid', true)

  // labels along the top, in two alternating rows so neighbours never collide, each tied to its column by a thin line
  const ordered = rows.slice().sort((a, b) => a.xy - b.xy)
  const lab = svg.selectAll('g.lbl').data(ordered).join('g').attr('class', 'lbl')
  const anchor = p => x(p.xy) < M.left + 70 ? 'start' : x(p.xy) > W - M.right - 70 ? 'end' : 'middle'
  const row = i => M.top - 56 + (i % 3) * 16
  lab.append('line').attr('x1', p => x(p.xy)).attr('x2', p => x(p.xy)).attr('y1', (p, i) => row(i) + 4).attr('y2', p => yA(Math.min(1050, p.a ? p.a[1] : 0)) - 6)
    .attr('stroke', 'var(--rule)').attr('stroke-dasharray', '2 3')
  lab.append('text').attr('class', 'halo').attr('x', p => x(p.xy) + (anchor(p) === 'start' ? -6 : anchor(p) === 'end' ? 6 : 0)).attr('y', (p, i) => row(i)).attr('text-anchor', anchor)
    .attr('font-size', 11.5).attr('font-weight', 600).attr('fill', p => p.candidate ? 'var(--series-2-ink)' : 'var(--text-secondary)')
    .text(shortLabel)
}

/** Phones: one row per paper, time running down; distance and mass side by side, at 1:1 so text stays readable. */
function drawNarrow (root, rows) {
  const W = Math.max(280, Math.round(root.clientWidth || 320))
  const ROW = 50, TOP = 52
  const H = TOP + rows.length * ROW + 4
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', ARIA)
  svg.selectAll('*').remove()
  const half = (W - 24) / 2
  const xA = d3.scaleLinear().domain([0, 1050]).range([4, half - 4])
  const xM = d3.scaleLinear().domain([0, 21]).range([half + 24, W - 6])
  const cols = [
    { x: xA, key: 'a', mid: 'aMid', title: 'Average distance', ticks: [0, 500, 1000], unit: ' AU', cls: 'au' },
    { x: xM, key: 'm', mid: 'mMid', title: 'Mass (Earth masses)', ticks: [0, 10, 20], unit: '', cls: '' },
  ]
  for (const c of cols) {
    svg.append('text').attr('x', c.x.range()[0]).attr('y', 14).attr('font-size', 13).attr('font-weight', 600).attr('fill', 'var(--text-primary)').text(c.title)
    svg.selectAll(null).data(c.ticks).join('line').attr('class', 'gridline').attr('x1', d => c.x(d)).attr('x2', d => c.x(d)).attr('y1', TOP - 14).attr('y2', H)
    svg.selectAll(null).data(c.ticks).join('text').attr('class', `axis-label ${c.cls}`).attr('font-size', 11.5)
      .attr('x', d => c.x(d)).attr('y', TOP - 20).attr('text-anchor', (d, i) => i === 0 ? 'start' : i === c.ticks.length - 1 ? 'end' : 'middle')
      .text(d => `${d}${d ? c.unit : ''}`)
  }
  const g = svg.selectAll('g.row').data(rows.slice().sort((a, b) => a.year - b.year)).join('g').attr('class', 'row')
    .attr('transform', (p, i) => `translate(0,${TOP + i * ROW})`)
  g.append('text').attr('x', 4).attr('y', 16).attr('font-size', 12.5).attr('font-weight', 600)
    .attr('fill', p => p.candidate ? 'var(--series-2-ink)' : 'var(--text-secondary)').text(p => shortLabel(p))
  for (const c of cols) {
    const has = g.filter(p => p[c.key])
    has.append('line').attr('x1', p => c.x(p[c.key][0])).attr('x2', p => c.x(Math.min(c.x.domain()[1], p[c.key][1])))
      .attr('y1', 34).attr('y2', 34).attr('stroke', colour).attr('stroke-width', 9).attr('stroke-linecap', 'round').attr('opacity', .45)
    has.filter(p => p[c.mid] != null).append('circle').attr('cx', p => c.x(p[c.mid])).attr('cy', 34).attr('r', 5).attr('fill', colour)
      .attr('stroke', 'var(--surface-1)').attr('stroke-width', 1.5)
    if (c.key === 'm') has.filter(p => p.open).append('text').attr('x', p => c.x(p.m[0])).attr('y', 50).attr('font-size', 11)
      .attr('fill', 'var(--text-muted)').text('at least')
  }
}
