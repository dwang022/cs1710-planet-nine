// The search, page 3: the depth gap, what to watch, and when we might know.

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawField, PICK } from '../charts/field.js'

const $ = s => document.querySelector(s)
const SKY_SQ_DEG = 41253
const NARROW = '(max-width: 640px)'
const skyShare = d => `${Math.max(1, Math.round(100 * d.area_sq_deg / SKY_SQ_DEG))}% of sky`
const ink = (d, p9) => d.future ? 'var(--series-4)' : d.depth_mag >= p9.min ? '#ece6d8' : 'var(--text-secondary)'

/**
 * A brightness ruler: each survey's limit as a marker, labelled with its name, its depth and how much of
 * the sky it covers; the planet's predicted range as a band in its own colour. The key is the band's label
 * and the ruler's two ends, so no caption explains it. Phones get the same ruler standing up.
 */
function drawDepth (root, surveys, p9) {
  if (window.matchMedia(NARROW).matches) return drawDepthTall(root, surveys, p9)
  const W = 900, H = 270, M = { left: 40, right: 40 }
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', `Brightness ruler from magnitude 19 to 26. Survey limits: ${surveys.map(s => `${s.short} ${s.depth_mag}`).join(', ')}. Planet Nine predicted between ${p9.min} and ${p9.max}.`)
  svg.selectAll('*').remove()
  const x = d3.scaleLinear().domain([19, 26.5]).range([M.left, W - M.right])
  const y = 160
  svg.append('rect').attr('x', x(p9.min)).attr('width', x(p9.max) - x(p9.min)).attr('y', y - 24).attr('height', 48).attr('rx', 8)
    .attr('fill', 'var(--p9)').attr('opacity', .18)
  svg.append('text').attr('x', (x(p9.min) + x(p9.max)) / 2).attr('y', y + 72).attr('text-anchor', 'middle').attr('font-size', 13).attr('font-weight', 600).attr('fill', 'var(--p9-ink)')
    .text('Planet Nine’s predicted brightness')
  svg.append('line').attr('x1', x(19)).attr('x2', x(26.5)).attr('y1', y).attr('y2', y).attr('stroke', 'var(--text-muted)').attr('stroke-width', 1.5)
  svg.selectAll('text.t').data(d3.range(19, 27)).join('text').attr('class', 't axis-label').attr('x', d => x(d)).attr('y', y + 22).attr('text-anchor', 'middle').text(d => d)
  svg.selectAll('line.t').data(d3.range(19, 27)).join('line').attr('class', 't').attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', y - 5).attr('y2', y + 5).attr('stroke', 'var(--text-muted)')
  svg.append('text').attr('class', 'axis-label').attr('x', x(19)).attr('y', y + 44).text('brighter ←')
  svg.append('text').attr('class', 'axis-label').attr('x', x(26.5)).attr('y', y + 44).attr('text-anchor', 'end').text('→ fainter')
  svg.append('text').attr('class', 'axis-label').attr('x', (x(19) + x(26.5)) / 2).attr('y', y + 44).attr('text-anchor', 'middle').text('magnitude')

  // Four label tiers of two lines (name and depth; share of the sky), so neighbours never collide. A label
  // near either end hangs inward; two surveys at the same depth hang either side of their shared stem.
  const rows = surveys.slice().sort((a, b) => a.depth_mag - b.depth_mag)
  const tier = i => y - 40 - (i % 4) * 30
  const twin = d => rows.filter(o => o.depth_mag === d.depth_mag)
  const anchor = d => {
    const tw = twin(d)
    if (tw.length > 1) return tw.indexOf(d) === 0 ? 'end' : 'start'
    return x(d.depth_mag) > W - M.right - 60 ? 'end' : x(d.depth_mag) < M.left + 60 ? 'start' : 'middle'
  }
  const lx = d => x(d.depth_mag) + (twin(d).length > 1 ? (anchor(d) === 'end' ? -7 : 7) : 0)
  const g = svg.selectAll('g.s').data(rows).join('g').attr('class', 's')
  g.append('line').attr('x1', d => x(d.depth_mag)).attr('x2', d => x(d.depth_mag))
    .attr('y1', (d, i) => twin(d).length > 1 ? tier(i) - 10 : tier(i) + 20).attr('y2', y)
    .attr('stroke', d => ink(d, p9)).attr('stroke-width', 2).attr('stroke-dasharray', d => d.future ? '4 3' : null)
  g.append('circle').attr('cx', d => x(d.depth_mag)).attr('cy', y).attr('r', 5).attr('fill', d => ink(d, p9))
  const t = g.append('text').attr('class', 'halo').attr('y', (d, i) => tier(i)).attr('text-anchor', anchor)
    .attr('font-size', 12).attr('font-weight', 600).attr('fill', d => d.future ? 'var(--series-4-ink)' : 'var(--text-primary)')
  t.append('tspan').attr('x', lx).text(d => `${d.short} ${d.depth_mag}`)
  // how much of the sky: only where the area is published (OSSOS has none we could verify)
  t.filter(d => d.area_sq_deg).append('tspan').attr('x', lx).attr('dy', 14).attr('font-weight', 400).attr('fill', 'var(--text-muted)').text(skyShare)
}

/** Phones: the ruler standing up, brighter at the top, each label to the right of its marker, drawn at 1:1. */
function drawDepthTall (root, surveys, p9) {
  const W = Math.max(280, Math.round(root.clientWidth || 320)), H = 540
  const AX = 52, LX = AX + 34
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', `Brightness ruler from magnitude 19 to 26. Survey limits: ${surveys.map(s => `${s.short} ${s.depth_mag}`).join(', ')}. Planet Nine predicted between ${p9.min} and ${p9.max}.`)
  svg.selectAll('*').remove()
  const y = d3.scaleLinear().domain([19, 26.5]).range([60, H - 34])
  // the key: the band's colour and what it is
  svg.append('rect').attr('x', 4).attr('y', 6).attr('width', 16).attr('height', 12).attr('rx', 3).attr('fill', 'var(--p9)').attr('opacity', .35)
  svg.append('text').attr('x', 28).attr('y', 16).attr('font-size', 12.5).attr('font-weight', 600).attr('fill', 'var(--p9-ink)').text('Planet Nine’s predicted brightness')
  svg.append('rect').attr('x', AX - 14).attr('width', W - AX + 10).attr('y', y(p9.min)).attr('height', y(p9.max) - y(p9.min)).attr('rx', 8)
    .attr('fill', 'var(--p9)').attr('opacity', .14)
  svg.append('line').attr('x1', AX).attr('x2', AX).attr('y1', y(19)).attr('y2', y(26.5)).attr('stroke', 'var(--text-muted)').attr('stroke-width', 1.5)
  const ticks = d3.range(19, 27)
  svg.selectAll('line.t').data(ticks).join('line').attr('class', 't').attr('x1', AX - 5).attr('x2', AX + 5).attr('y1', d => y(d)).attr('y2', d => y(d)).attr('stroke', 'var(--text-muted)')
  svg.selectAll('text.t').data(ticks).join('text').attr('class', 't axis-label').attr('font-size', 12).attr('x', AX - 10).attr('y', d => y(d) + 4).attr('text-anchor', 'end').text(d => d)
  svg.append('text').attr('class', 'axis-label').attr('font-size', 12).attr('x', AX).attr('y', y(19) - 14).attr('text-anchor', 'middle').text('↑ brighter')
  svg.append('text').attr('class', 'axis-label').attr('font-size', 12).attr('x', AX).attr('y', H - 8).attr('text-anchor', 'middle').text('↓ fainter')
  svg.append('text').attr('class', 'axis-label').attr('font-size', 12).attr('transform', `translate(12,${(y(19) + y(26.5)) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('magnitude')

  // labels to the right, pushed apart where markers crowd, each tied to its marker by a thin line
  const rows = surveys.slice().sort((a, b) => a.depth_mag - b.depth_mag)
  let prev = -Infinity
  for (const d of rows) { d.ly = Math.max(y(d.depth_mag) + 4, prev + 32); prev = d.ly }
  const g = svg.selectAll('g.s').data(rows).join('g').attr('class', 's')
  g.append('path').attr('d', d => `M${AX},${y(d.depth_mag)} L${AX + 14},${y(d.depth_mag)} L${LX - 6},${d.ly - 4}`)
    .attr('fill', 'none').attr('stroke', d => ink(d, p9)).attr('stroke-width', 1.5).attr('stroke-dasharray', d => d.future ? '4 3' : null)
  g.append('circle').attr('cx', AX).attr('cy', d => y(d.depth_mag)).attr('r', 5).attr('fill', d => ink(d, p9))
  const t = g.append('text').attr('class', 'halo').attr('x', LX).attr('y', d => d.ly)
    .attr('font-size', 13).attr('font-weight', 600).attr('fill', d => d.future ? 'var(--series-4-ink)' : 'var(--text-primary)')
  t.append('tspan').text(d => `${d.short} ${d.depth_mag}`)
  t.filter(d => d.area_sq_deg).append('tspan').attr('x', LX).attr('dy', 15).attr('font-size', 12).attr('font-weight', 400).attr('fill', 'var(--text-muted)').text(skyShare)
}

/** The second beat's drawing: the planet's band on a short ruler, the deepest wide search before Rubin, and Rubin. */
function miniRuler (p9, wide, rubin) {
  const x = d3.scaleLinear().domain([19, 26.5]).range([8, 92])
  const mark = (d, colour, h, dash = '') => `<line x1="${x(d)}" x2="${x(d)}" y1="${60 - h}" y2="60" stroke="${colour}" stroke-width="3"${dash ? ` stroke-dasharray="${dash}"` : ''}/><circle cx="${x(d)}" cy="60" r="4.5" fill="${colour}"/>`
  return `<svg class="art" viewBox="0 0 100 100" aria-hidden="true">
    <rect x="${x(p9.min)}" y="47" width="${x(p9.max) - x(p9.min)}" height="26" rx="5" fill="var(--p9)" opacity=".3"/>
    <line x1="${x(19)}" x2="${x(26.5)}" y1="60" y2="60" stroke="var(--text-muted)" stroke-width="2"/>
    ${mark(wide, 'var(--text-secondary)', 18)}${mark(rubin, 'var(--series-4)', 32, '4 3')}</svg>`
}

async function main () {
  const { surveys: sv, planet_nine_predictions: PRED, field_timeline: FIELD, papers: PAPERS } = await loadData('surveys', 'planet_nine_predictions', 'field_timeline', 'papers')
  const SHORT = { ps1: 'Pan-STARRS1', css: 'Catalina', ztf: 'ZTF', des: 'Dark Energy Survey', ossos: 'OSSOS', hsc_ssp: 'Subaru', lsst: 'Rubin' }
  const optical = sv.surveys.filter(s => s.wavelength === 'optical' && s.depth_mag != null).map(s => ({ ...s, short: SHORT[s.id] || s.name }))
  const V = PRED.physical_properties.apparent_V_mag
  const p9 = { min: V.min, max: V.max }
  const lsst = optical.find(s => s.future)
  // the deepest survey covering more than half the sky, before Rubin
  const wide = d3.max(optical.filter(s => !s.future && (s.area_sq_deg ?? 0) > SKY_SQ_DEG / 2), s => s.depth_mag)

  const nums = { lsstMag: lsst?.depth_mag, lsstEnd: lsst?.years[1] }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })
  $('#beatStart').insertAdjacentHTML('afterbegin', '<svg class="art" viewBox="0 0 160 120" aria-hidden="true"><use href="#art-observatory"/></svg>')
  $('#beatReach').insertAdjacentHTML('afterbegin', miniRuler(p9, wide, lsst.depth_mag))
  $('#beatEnd').insertAdjacentHTML('afterbegin', '<svg class="art" viewBox="0 0 100 100" aria-hidden="true"><use href="#art-planet-nine"/></svg>')

  const draw = () => drawDepth($('#chartDepth'), optical, p9)
  draw()
  window.matchMedia(NARROW).addEventListener('change', draw)

  // one lane, so the ledger draws no key
  drawField($('#nextLedger'), { timeline: FIELD, papers: PAPERS.papers, filter: PICK.next, dated: false, lanes: ['next'] })
}

main().catch(showLoadError)
