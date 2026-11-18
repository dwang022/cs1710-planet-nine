// The probability page's head: one compass that sets up the question. Six dots, as many orbits as Batygin and
// Brown had in 2016, shuffle into a few pretend skies, each six known objects picked at random as the walkthrough
// below draws them (2026-11-17: they had been random directions, a second kind of draw the page no longer makes),
// each with its spread (a wedge round their middle, the measure the walkthrough uses), then settle into the six
// themselves (violet), with their narrow wedge; then it starts again. Each dot sits where its orbit stretches out
// (the far end, as on the clustering page). Could luck have made the real one? The walkthroughs below answer it.

import * as d3 from 'd3'
import { spreadOf } from './luck.js'

const W = 360, H = 330
const cx = W / 2, cy = 150, R = 96
const RAD = Math.PI / 180
const STEP = 1100, HOLD = 3200    // ms per random sky, and on the real one

/** six: the six of 2016 from bb2016.json (closest: where each comes closest on the sky); spread: theirs, in degrees;
 *  draws: a few pretend skies, { dirs (where each stretches out), spread }, from the build script's own draws. */
export function luckHead (root, { six, spread, draws }) {
  const n = six.length
  const real = six.map(o => (o.closest[0] + 180) % 360)
  const skies = [...draws.map(d => d.dirs), real]

  root.innerHTML = `<svg class="luck-head" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="A compass of ${n} directions: a few pretend skies of known objects picked at random, each with its spread as a wide wedge, then the six orbits of 2016 with a narrow one.">
    <path class="wedge"/>
    <circle class="ring" cx="${cx}" cy="${cy}" r="${R}"/>
    <g class="dots"></g>
    <circle cx="${cx}" cy="${cy}" r="3.5" fill="var(--sun)"/>
    <text class="name" x="${cx}" y="${cy + R + 48}" text-anchor="middle"></text>
    <text class="reach" x="${cx}" y="${cy + R + 70}" text-anchor="middle"></text>
  </svg>`
  const svg = d3.select(root).select('svg')
  const wedge = svg.select('.wedge'), name = svg.select('.name'), reach = svg.select('.reach')
  const pt = (deg, r) => [cx + r * Math.cos(deg * RAD), cy - r * Math.sin(deg * RAD)]
  const sector = (mid, s) => {
    const a = Math.min(179.5, s)
    return `M${cx},${cy}L` + [...d3.range(mid - a, mid + a, 3), mid + a].map(d => pt(d, R).map(v => v.toFixed(1)).join(',')).join('L') + 'Z'
  }

  // stacked outward where they crowd, as on the clustering page's compass
  const place = degs => {
    const bins = new Map()
    return degs.map(d => {
      const b = Math.floor(d / 8), j = bins.get(b) ?? 0
      bins.set(b, j + 1)
      return pt(d, R + 8 + j * 8)
    })
  }
  const dots = svg.select('.dots').selectAll('circle').data(d3.range(n)).join('circle').attr('r', 6).attr('cx', cx).attr('cy', cy)

  let prev = { mid: 0, s: 0 }
  function show (k, ms) {
    const isReal = k === skies.length - 1, pos = place(skies[k])
    const st = spreadOf(skies[k])
    const s = isReal ? spread : draws[k].spread
    dots.classed('real', isReal).transition().duration(ms).ease(d3.easeCubicOut).attr('cx', (d, i) => pos[i][0]).attr('cy', (d, i) => pos[i][1])
    const from = prev, dm = ((st.mid - from.mid + 540) % 360) - 180
    prev = { mid: st.mid, s }
    wedge.classed('real', isReal).transition().duration(ms).ease(d3.easeCubicOut)
      .attrTween('d', () => t => sector(from.mid + dm * t, from.s + (s - from.s) * t))
    name.text(isReal ? 'The six orbits of 2016' : 'Six orbits picked at random').classed('real', isReal)
    reach.text(`spread ${Math.round(s)}°`)
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { show(skies.length - 1, 0); return }
  let k = 0
  const next = () => { show(k, 700); const wait = k === skies.length - 1 ? HOLD : STEP; k = (k + 1) % skies.length; setTimeout(next, wait) }
  next()
}
