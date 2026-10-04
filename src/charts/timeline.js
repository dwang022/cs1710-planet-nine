// Sketch RL5 — who supports it. Every paper we read, placed by publication date
// and stance, sized by how often it has been cited.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'

const LANES = [
  ['supports', 'Supports Planet Nine', 'var(--series-3)'],
  ['alternative', 'Proposes something else', 'var(--series-1)'],
  ['against', 'Argues against / narrows it', 'var(--series-2)'],
  ['neutral', 'Neutral — data and limits', 'var(--text-muted)'],
]

export function drawTimeline (root, { papers, onSelect, selected }) {
  const W = 940, H = 340
  const m = { top: 20, right: 24, bottom: 42, left: 186 }
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom

  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', `Timeline of ${papers.length} papers from 2014 to 2025, grouped by stance and sized by citation count.`)

  let g = svg.select('g.tl')
  if (g.empty()) g = svg.append('g').attr('class', 'tl').attr('transform', `translate(${m.left},${m.top})`)

  // Leave a margin before the earliest paper so its circle clears the lane labels.
  const x = d3.scaleLinear()
    .domain([d3.min(papers, p => p.year) - 1, d3.max(papers, p => p.year) + 0.6])
    .range([0, iw])
  const y = d3.scalePoint().domain(LANES.map(l => l[0])).range([24, ih - 24]).padding(0.5)
  const size = d3.scaleSqrt()
    .domain([0, d3.max(papers, p => p.citations_crossref || 0)]).range([5, 22])

  // lanes
  const lane = g.selectAll('g.lane').data(LANES).join('g').attr('class', 'lane')
    .attr('transform', d => `translate(0,${y(d[0])})`)
  lane.selectAll('line').data(d => [d]).join('line')
    .attr('x1', 0).attr('x2', iw).attr('stroke', 'var(--rule)')
  lane.selectAll('text').data(d => [d]).join('text')
    .attr('class', 'axis-label').attr('x', -14).attr('y', 4)
    .attr('text-anchor', 'end').attr('fill', d => d[2])
    .attr('font-weight', 600).text(d => d[1])

  // year axis
  let gx = g.select('g.x')
  if (gx.empty()) gx = g.append('g').attr('class', 'x axis').attr('transform', `translate(0,${ih})`)
  gx.call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(8))
  gx.selectAll('text').attr('class', 'axis-label')

  // jitter overlapping years within a lane
  const byKey = d3.group(papers, p => p.stance + '-' + p.year)
  const placed = []
  for (const [, grp] of byKey) {
    grp.forEach((p, i) => placed.push({ p, dy: (i - (grp.length - 1) / 2) * 15 }))
  }

  const dots = g.selectAll('circle.paper').data(placed, d => d.p.doi)
  dots.exit().remove()
  dots.enter().append('circle').attr('class', 'paper')
    .attr('stroke', 'var(--surface-1)').attr('stroke-width', 1.5)
    .merge(dots)
    .attr('cx', d => x(d.p.year))
    .attr('cy', d => y(d.p.stance) + d.dy)
    .attr('r', d => size(d.p.citations_crossref || 0))
    .attr('fill', d => LANES.find(l => l[0] === d.p.stance)[2])
    .attr('opacity', d => selected && selected !== d.p.doi ? 0.3 : 0.88)
    .style('cursor', 'pointer')
    .on('click', (ev, d) => onSelect(d.p.doi === selected ? null : d.p.doi))
    .on('pointerenter', (ev, d) => showTip(ev, `
      <div class="t-name">${d.p.label}</div>
      <dl><dt>journal</dt><dd>${d.p.journal || '—'}</dd>
      <dt>citations</dt><dd>${d.p.citations_crossref ?? '—'}</dd></dl>
      <div style="margin-top:6px;color:var(--text-secondary)">${d.p.summary}</div>`))
    .on('pointerleave', hideTip)

  g.selectAll('text.sizekey').data([0]).join('text')
    .attr('class', 'sizekey axis-label')
    .attr('x', iw).attr('y', ih + 34).attr('text-anchor', 'end')
    .text('circle size = citations')
}
