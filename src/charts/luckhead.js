// The probability page's head: one compass that sets up the question. The dots
// shuffle into a few random skies, each with its low alignment (a short arrow), then
// settle into the real sky (the trusted sample, violet) with its longer arrow;
// then it starts again. Could luck have made the real one? The walkthrough
// below answers it.

import * as d3 from 'd3'
import { resultant, seededRandom } from '../stats.js'

const W = 360, H = 330
const cx = W / 2, cy = 150, R = 96
const RAD = Math.PI / 180
const RANDOM = 3                  // random skies before the real one
const STEP = 1100, HOLD = 3200    // ms per random sky, and on the real one
const pct = r => `${Math.round(r * 100)}%`

/** real: the trusted sample's objects. */
export function luckHead (root, { real }) {
  const n = real.length
  const rnd = seededRandom(49)
  const skies = [...Array.from({ length: RANDOM }, () => real.map(() => rnd() * 360)), real.map(o => o.varpi_deg)]

  root.innerHTML = `<svg class="luck-head" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="A compass of ${n} directions: a few random skies, each with a low alignment, then the real sky with a higher one.">
    <defs><marker id="lh2-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--text-primary)"/></marker></defs>
    <circle class="ring" cx="${cx}" cy="${cy}" r="${R}"/>
    <g class="dots"></g>
    <line class="arrow" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy}" marker-end="url(#lh2-head)"/>
    <circle cx="${cx}" cy="${cy}" r="3.5" fill="var(--sun)"/>
    <text class="name" x="${cx}" y="${cy + R + 48}" text-anchor="middle"></text>
    <text class="reach" x="${cx}" y="${cy + R + 70}" text-anchor="middle"></text>
  </svg>`
  const svg = d3.select(root).select('svg')
  const arrow = svg.select('.arrow'), name = svg.select('.name'), reach = svg.select('.reach')

  // stacked outward where they crowd, as on the clustering page's compass
  const place = degs => {
    const bins = new Map()
    return degs.map(d => {
      const b = Math.floor(d / 8), j = bins.get(b) ?? 0
      bins.set(b, j + 1)
      const rr = R + 8 + j * 8
      return [cx + rr * Math.cos(d * RAD), cy - rr * Math.sin(d * RAD)]
    })
  }
  const dots = svg.select('.dots').selectAll('circle').data(d3.range(n)).join('circle').attr('r', 3.6).attr('cx', cx).attr('cy', cy)

  function show (k, ms) {
    const isReal = k === skies.length - 1, st = resultant(skies[k]), pos = place(skies[k])
    dots.classed('real', isReal).transition().duration(ms).ease(d3.easeCubicOut).attr('cx', (d, i) => pos[i][0]).attr('cy', (d, i) => pos[i][1])
    arrow.transition().duration(ms).ease(d3.easeCubicOut)
      .attr('x2', cx + R * st.R * Math.cos(st.meanDeg * RAD)).attr('y2', cy - R * st.R * Math.sin(st.meanDeg * RAD))
    name.text(isReal ? 'The real sky' : 'A random sky').classed('real', isReal)
    reach.text(`${pct(st.R)} aligned`)
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { show(skies.length - 1, 0); return }
  let k = 0
  const next = () => { show(k, 700); const wait = k === skies.length - 1 ? HOLD : STEP; k = (k + 1) % skies.length; setTimeout(next, wait) }
  next()
}
