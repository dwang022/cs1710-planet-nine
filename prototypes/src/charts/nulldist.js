// The verdict: where the selection's agreement falls against samples of the
// same size whose directions are drawn uniformly at random.

import * as d3 from 'd3'

export function drawNull (root, { stats, colour = 'var(--a)', width = 420, height = 190 }) {
  const m = { top: 16, right: 14, bottom: 34, left: 40 }
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', `Observed agreement ${stats.R.toFixed(3)} against ${stats.nullDist.trials} random samples.`)

  const iw = width - m.left - m.right, ih = height - m.top - m.bottom
  let g = svg.select('g.p')
  if (g.empty()) g = svg.append('g').attr('class', 'p').attr('transform', `translate(${m.left},${m.top})`)

  const nd = stats.nullDist
  const lastBin = nd.counts.reduce((acc, c, i) => c > 0 ? i : acc, 0)
  const xMax = Math.min(1, Math.max(0.35, (lastBin + 1) / nd.bins, stats.R) * 1.15)
  const x = d3.scaleLinear().domain([0, xMax]).range([0, iw])
  const y = d3.scaleLinear().domain([0, d3.max(nd.counts) || 1]).nice().range([ih, 0])

  let gx = g.select('g.x')
  if (gx.empty()) gx = g.append('g').attr('class', 'x axis').attr('transform', `translate(0,${ih})`)
  gx.call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.1f')))
  gx.selectAll('text').attr('class', 'axis-label')

  g.selectAll('text.xl').data([0]).join('text').attr('class', 'xl axis-label')
    .attr('x', iw / 2).attr('y', ih + 30).attr('text-anchor', 'middle')
    .text('agreement if directions were random')

  const bars = g.selectAll('rect.bar').data(nd.counts)
  bars.enter().append('rect').attr('class', 'bar').attr('fill', 'var(--surface-3)')
    .merge(bars)
    .attr('x', (d, i) => x(i / nd.bins) + 0.5)
    .attr('width', Math.max(1, x(1 / nd.bins) - x(0) - 1))
    .attr('y', d => y(d)).attr('height', d => ih - y(d)).attr('rx', 1.5)
  bars.exit().remove()

  const obs = g.selectAll('g.obs').data([stats]).join(en => {
    const n = en.append('g').attr('class', 'obs')
    n.append('line').attr('stroke-width', 2.5)
    n.append('circle').attr('r', 4).attr('stroke', 'var(--surface-1)').attr('stroke-width', 1.5)
    return n
  })
  obs.select('line').attr('stroke', colour)
    .attr('x1', d => x(d.R)).attr('x2', d => x(d.R)).attr('y1', -4).attr('y2', ih)
  obs.select('circle').attr('fill', colour)
    .attr('cx', d => x(d.R)).attr('cy', -4)
}
