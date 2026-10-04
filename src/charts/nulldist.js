// "Would random data look like this?" — the histogram is 4,000 simulated
// samples of the same size, each with perihelion directions drawn uniformly at
// random. The marker is what the real objects give.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'

export function drawNull (root, { nullDist, observedR, p }) {
  const W = 920, H = 340
  const m = { top: 30, right: 22, bottom: 52, left: 62 }

  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label',
      `Histogram of clustering strength for ${nullDist.trials} random samples, with the observed value ${observedR.toFixed(3)} marked.`)

  let g = svg.select('g.plot')
  if (g.empty()) g = svg.append('g').attr('class', 'plot').attr('transform', `translate(${m.left},${m.top})`)
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom

  // R is bounded 0-1, but the null mass for n of this size sits well left of 1.
  // Fit the domain to the data actually on screen so the plot is not 60% empty.
  const lastBin = nullDist.counts.reduce((acc, c, i) => c > 0 ? i : acc, 0)
  const xMax = Math.min(1, Math.max(0.35, (lastBin + 1) / nullDist.bins, observedR) * 1.18)
  const x = d3.scaleLinear().domain([0, xMax]).range([0, iw])
  const y = d3.scaleLinear()
    .domain([0, d3.max(nullDist.counts) || 1]).nice()
    .range([ih, 0])

  // axes — recessive, solid, never dashed
  let gx = g.select('g.x-axis')
  if (gx.empty()) gx = g.append('g').attr('class', 'x-axis axis').attr('transform', `translate(0,${ih})`)
  gx.call(d3.axisBottom(x).ticks(6).tickFormat(d3.format('.1f')))
  gx.selectAll('text').attr('class', 'axis-label')

  let gy = g.select('g.y-axis')
  if (gy.empty()) gy = g.append('g').attr('class', 'y-axis axis')
  gy.transition().duration(300).call(d3.axisLeft(y).ticks(4))
  gy.selectAll('text').attr('class', 'axis-label')

  g.selectAll('text.xt').data([0]).join('text')
    .attr('class', 'xt axis-label')
    .attr('x', iw / 2).attr('y', ih + 40).attr('text-anchor', 'middle')
    .text('clustering strength R  (0 = evenly spread, 1 = all pointing the same way)')

  g.selectAll('text.yt').data([0]).join('text')
    .attr('class', 'yt axis-label')
    .attr('transform', `translate(${-m.left + 14},${ih / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .text('random samples per bin')

  // bars — 2px surface gap between neighbours
  const bars = g.selectAll('rect.bar').data(nullDist.counts)
  bars.enter().append('rect').attr('class', 'bar')
    .attr('fill', 'var(--surface-3)')
    .merge(bars)
    .attr('x', (d, i) => x(i / nullDist.bins) + 1)
    .attr('width', Math.max(1, x(1 / nullDist.bins) - x(0) - 2))
    .attr('rx', 2)
    .transition().duration(300)
    .attr('y', d => y(d)).attr('height', d => ih - y(d))
  bars.exit().remove()

  // observed value
  const obs = g.selectAll('g.obs').data([observedR]).join(
    en => {
      const n = en.append('g').attr('class', 'obs')
      n.append('line').attr('stroke', 'var(--series-1)').attr('stroke-width', 2.5)
      n.append('circle').attr('r', 5).attr('fill', 'var(--series-1)')
        .attr('stroke', 'var(--surface-1)').attr('stroke-width', 2)
      n.append('text').attr('class', 'axis-label')
        .attr('fill', 'var(--series-1)').attr('font-weight', 600)
      return n
    })
  obs.select('line').transition().duration(300)
    .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', -6).attr('y2', ih)
  obs.select('circle').transition().duration(300).attr('cx', d => x(d)).attr('cy', -6)
  obs.select('text').transition().duration(300)
    .attr('x', d => x(d) + (x(d) > iw - 110 ? -10 : 10))
    .attr('text-anchor', d => x(d) > iw - 110 ? 'end' : 'start')
    .attr('y', 10)
    .text(d => `observed R = ${d.toFixed(3)}`)

  // generous hover band over the whole plot
  g.selectAll('rect.hit').data([0]).join('rect')
    .attr('class', 'hit').attr('width', iw).attr('height', ih)
    .attr('fill', 'transparent')
    .on('pointermove', function (ev) {
      const [mx] = d3.pointer(ev, this)
      const rv = x.invert(mx)
      const bin = Math.min(nullDist.bins - 1, Math.max(0, Math.floor(rv * nullDist.bins)))
      if (rv < 0 || rv > 1) { hideTip(); return }
      const share = nullDist.counts[bin] / nullDist.trials
      showTip(ev, `
        <div class="t-name">R between ${(bin / nullDist.bins).toFixed(2)} and ${((bin + 1) / nullDist.bins).toFixed(2)}</div>
        <dl><dt>random samples</dt><dd>${nullDist.counts[bin]} of ${nullDist.trials.toLocaleString()}</dd>
        <dt>share</dt><dd>${(share * 100).toFixed(1)}%</dd></dl>`)
    })
    .on('pointerleave', hideTip)
}
