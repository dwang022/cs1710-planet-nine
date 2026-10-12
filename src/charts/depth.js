// Why hasn't anyone found it?
//
// The sky map answers "where did we look" and the answer is boring: nearly
// everywhere. The real constraint is depth. Surveys that cover the whole sky
// cannot see faint things, and surveys that can see faint things cover almost
// nothing. Plotting both axes at once makes that tradeoff the whole picture.
//
// Infrared surveys are left out on purpose: their limiting magnitudes are in
// different bands and are not comparable to an optical V or r.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'

const W = 740, H = 440
const M = { top: 22, right: 30, bottom: 56, left: 68 }
const SKY_SQ_DEG = 41253          // the whole celestial sphere

export function drawDepth (root, { surveys, p9MagRange = [22, 25], activeSurvey }) {
  const optical = surveys.filter(s =>
    s.depth_mag != null && s.area_sq_deg != null && s.wavelength === 'optical')

  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'Each survey plotted by how much sky it covers against how faint it can see. Planet Nine’s predicted brightness is shown as a band.')

  const iw = W - M.left - M.right, ih = H - M.top - M.bottom
  const x = d3.scaleLog().domain([900, 50000]).range([0, iw])
  // Magnitude runs backwards: bigger number means fainter. Putting bigger
  // numbers higher means "further up = sees fainter things = deeper".
  const y = d3.scaleLinear().domain([19.5, 26.8]).range([ih, 0])

  let g = svg.select('g.plot')
  if (g.empty()) g = svg.append('g').attr('class', 'plot').attr('transform', `translate(${M.left},${M.top})`)

  // --- the band Planet Nine is predicted to fall in ------------------------
  g.selectAll('rect.p9band').data([p9MagRange]).join('rect')
    .attr('class', 'p9band')
    .attr('x', 0).attr('width', iw)
    .attr('y', d => y(d[1])).attr('height', d => y(d[0]) - y(d[1]))
    .attr('fill', 'var(--series-3)').attr('fill-opacity', 0.12)
  g.selectAll('text.p9lab').data([p9MagRange]).join('text')
    .attr('class', 'p9lab axis-label')
    .attr('x', 8).attr('y', d => y(d[1]) + 15)
    .attr('fill', 'var(--series-3)').attr('font-weight', 600)
    .text('Planet Nine is predicted to be this faint')

  // --- axes ----------------------------------------------------------------
  let gx = g.select('g.x')
  if (gx.empty()) gx = g.append('g').attr('class', 'x axis').attr('transform', `translate(0,${ih})`)
  gx.call(d3.axisBottom(x)
    .tickValues([1000, 5000, 10000, 41253])
    .tickFormat(v => v === 41253 ? 'whole sky' : `${Math.round(100 * v / SKY_SQ_DEG)}%`))
  gx.selectAll('text').attr('class', 'axis-label')

  let gy = g.select('g.y')
  if (gy.empty()) gy = g.append('g').attr('class', 'y axis')
  gy.call(d3.axisLeft(y).ticks(6))
  gy.selectAll('text').attr('class', 'axis-label')

  g.selectAll('text.xlab').data([0]).join('text').attr('class', 'xlab axis-label')
    .attr('x', iw / 2).attr('y', ih + 42).attr('text-anchor', 'middle')
    .text('how much of the sky it photographed')
  g.selectAll('text.ylab').data([0]).join('text').attr('class', 'ylab axis-label')
    .attr('transform', `translate(-48,${ih / 2}) rotate(-90)`).attr('text-anchor', 'middle')
    .text('how faint it could see  →  deeper')

  // --- corner annotations --------------------------------------------------
  const notes = [
    { x: 1400, y: 26.3, t: 'deep enough, but almost no sky', anchor: 'start' },
    { x: 34000, y: 20.0, t: 'covers everything, far too shallow', anchor: 'end' },
  ]
  g.selectAll('text.note').data(notes).join('text')
    .attr('class', 'note axis-label')
    .attr('x', d => x(d.x)).attr('y', d => y(d.y))
    .attr('text-anchor', d => d.anchor)
    .attr('fill', 'var(--text-muted)').attr('font-style', 'italic')
    .text(d => d.t)

  // --- the surveys ---------------------------------------------------------
  const pts = g.selectAll('g.sv').data(optical, d => d.id)
  pts.exit().remove()
  const en = pts.enter().append('g').attr('class', 'sv')
  en.append('circle')
  en.append('text').attr('class', 'axis-label')
  const all = en.merge(pts)

  all.attr('transform', d => `translate(${x(d.area_sq_deg)},${y(d.depth_mag)})`)
  all.select('circle')
    .attr('r', d => activeSurvey === d.id ? 11 : 8)
    .attr('fill', d => d.future ? 'none' : d.color_hex)
    .attr('stroke', d => d.color_hex)
    .attr('stroke-width', d => d.future ? 2.5 : 2)
    .attr('stroke-dasharray', null)
    .attr('opacity', d => activeSurvey && activeSurvey !== d.id ? 0.3 : 1)
  all.select('text')
    .attr('x', d => d.area_sq_deg > 20000 ? -14 : 14)
    .attr('y', 4)
    .attr('text-anchor', d => d.area_sq_deg > 20000 ? 'end' : 'start')
    .attr('fill', 'var(--text-secondary)')
    .attr('font-weight', d => activeSurvey === d.id ? 600 : 400)
    .attr('opacity', d => activeSurvey && activeSurvey !== d.id ? 0.35 : 1)
    .text(d => d.future ? `${shortName(d)} (from 2025)` : shortName(d))

  all.on('pointerenter', (ev, d) => showTip(ev, `
      <div class="t-name">${d.name}</div>
      <dl>
        <dt>sees down to</dt><dd>${d.depth_mag} mag</dd>
        <dt>sky covered</dt><dd>${Math.round(100 * d.area_sq_deg / SKY_SQ_DEG)}%</dd>
        <dt>years</dt><dd>${d.years[0]}–${d.years[1]}</dd>
      </dl>
      <div style="margin-top:6px;color:var(--text-secondary)">${
        d.depth_mag >= p9MagRange[0]
          ? 'Deep enough to see Planet Nine — if it looked in the right place.'
          : 'Too shallow to see Planet Nine anywhere on its orbit.'}</div>`))
    .on('pointerleave', hideTip)
}

function shortName (s) {
  return s.name
    .replace(' Subaru Strategic Program', '')
    .replace(' Observatory / LSST', ' / LSST')
    .replace('Vera C. Rubin', 'Rubin')
    .replace(' 3pi', '')
    .replace(' Sky Survey', '')
    .replace('Zwicky Transient Facility', 'ZTF')
    .replace('Dark Energy Survey', 'DES')
}
