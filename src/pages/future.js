// Part 3, page 4: the depth gap, what to watch, and when we might know.

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawField, PICK } from '../charts/field.js'

const $ = s => document.querySelector(s)

/** A brightness ruler: survey depths as markers, the planet's predicted range as a band. */
function drawDepth (root, surveys, p9) {
  const W = 900, H = 250, M = { left: 40, right: 40 }
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', `Brightness ruler from magnitude 19 to 26. Survey limits: ${surveys.map(s => `${s.name} ${s.depth_mag}`).join(', ')}. Planet Nine predicted between ${p9.min} and ${p9.max}.`)
  svg.selectAll('*').remove()
  const x = d3.scaleLinear().domain([19, 26.5]).range([M.left, W - M.right])
  const y = 150
  svg.append('rect').attr('x', x(p9.min)).attr('width', x(p9.max) - x(p9.min)).attr('y', y - 24).attr('height', 48).attr('rx', 8)
    .attr('fill', 'var(--series-3)').attr('opacity', .18)
  svg.append('text').attr('x', (x(p9.min) + x(p9.max)) / 2).attr('y', y + 72).attr('text-anchor', 'middle').attr('font-size', 13).attr('font-weight', 600).attr('fill', '#5cc79c')
    .text(`green band: Planet Nine's predicted brightness, magnitude ${p9.min} to ${p9.max}`)
  svg.append('line').attr('x1', x(19)).attr('x2', x(26.5)).attr('y1', y).attr('y2', y).attr('stroke', 'var(--text-muted)').attr('stroke-width', 1.5)
  svg.selectAll('text.t').data(d3.range(19, 27)).join('text').attr('class', 't axis-label').attr('x', d => x(d)).attr('y', y + 22).attr('text-anchor', 'middle').text(d => d)
  svg.selectAll('line.t').data(d3.range(19, 27)).join('line').attr('class', 't').attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', y - 5).attr('y2', y + 5).attr('stroke', 'var(--text-muted)')
  svg.append('text').attr('class', 'axis-label').attr('x', x(19)).attr('y', y + 44).text('brighter ←')
  svg.append('text').attr('class', 'axis-label').attr('x', x(26.5)).attr('y', y + 44).attr('text-anchor', 'end').text('→ fainter')
  svg.append('text').attr('class', 'axis-label').attr('x', (x(19) + x(26.5)) / 2).attr('y', y + 44).attr('text-anchor', 'middle').text('how faint a survey can see (magnitude)')

  const rows = surveys.slice().sort((a, b) => a.depth_mag - b.depth_mag)
  const g = svg.selectAll('g.s').data(rows).join('g').attr('class', 's')
  g.append('line').attr('x1', d => x(d.depth_mag)).attr('x2', d => x(d.depth_mag)).attr('y1', (d, i) => y - 34 - (i % 4) * 26).attr('y2', y)
    .attr('stroke', d => d.future ? '#F08BB4' : d.depth_mag >= p9.min ? '#8fd3e2' : 'var(--text-secondary)').attr('stroke-width', 2).attr('stroke-dasharray', d => d.future ? '4 3' : null)
  g.append('circle').attr('cx', d => x(d.depth_mag)).attr('cy', y).attr('r', 5).attr('fill', d => d.future ? '#F08BB4' : d.depth_mag >= p9.min ? '#8fd3e2' : 'var(--text-secondary)')
  g.append('text').attr('class', 'halo').attr('x', d => x(d.depth_mag)).attr('y', (d, i) => y - 40 - (i % 4) * 26).attr('text-anchor', 'middle')
    .attr('font-size', 12).attr('font-weight', 600).attr('fill', d => d.future ? '#F08BB4' : 'var(--text-primary)')
    .text(d => `${d.short} · ${d.depth_mag}`)
}

async function main () {
  const { surveys: sv, planet_nine_predictions: PRED, field_timeline: FIELD, papers: PAPERS } = await loadData('surveys', 'planet_nine_predictions', 'field_timeline', 'papers')
  const SHORT = { ps1: 'Pan-STARRS1', css: 'Catalina', ztf: 'ZTF', des: 'Dark Energy Survey', ossos: 'OSSOS', hsc_ssp: 'Subaru HSC (small area)', lsst: 'Rubin 2026–36' }
  const optical = sv.surveys.filter(s => s.wavelength === 'optical' && s.depth_mag != null).map(s => ({ ...s, short: SHORT[s.id] || s.name }))
  const V = PRED.physical_properties.apparent_V_mag
  drawDepth($('#chartDepth'), optical, { min: V.min, max: V.max })

  const ex = PRED.search_exclusions
  $('#futureStats').innerHTML = [
    ['Ruled out so far', `${Math.round(ex.ps1_2024_cumulative.fraction_excluded * 100)}%`, 'of the predicted planets, by Pan-STARRS1, ZTF and DES together'],
    ['Deepest search so far', `V ${ex.ps1_2024_cumulative.depth_V}`, 'Pan-STARRS1; the planet is predicted at 21 to 25'],
    ['Rubin reaches', 'V 24.5', 'in a single visit, over 18,000 square degrees, hundreds of times each'],
    ['Survey runs', '2026 → 2036', 'began 29 June 2026'],
  ].map(([k, v, d]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('')

  drawField($('#nextLedger'), { timeline: FIELD, papers: PAPERS.papers, legend: $('#nextLegend'), filter: PICK.next, dated: false, lanes: ['next'] })
}

main().catch(showLoadError)
