// The search, page 3: the depth gap, what to watch, and when we might know.

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawField, PICK } from '../charts/field.js'
// the site's scroll entrances (.reveal, is-in, --reveal-ease): the ledger's cards below use its easing too
import '../scrolly.css'

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
function drawDepth (root, surveys, p9, { detail = false } = {}) {
  if (window.matchMedia(NARROW).matches) return drawDepthTall(root, surveys, p9, { detail })
  if (detail) return drawDepthDetail(root, surveys, p9)
  const W = 900, H = 270, M = { left: 40, right: 40 }
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', `Brightness ruler from magnitude 19 to 26. Survey limits: ${surveys.map(s => `${s.short} ${s.depth_mag}`).join(', ')}. Planet Nine predicted between ${p9.min} and ${p9.max}.`)
  svg.selectAll('*').remove()
  const x = d3.scaleLinear().domain([19, 26.5]).range([M.left, W - M.right])
  const y = 160
  svg.append('rect').attr('x', x(p9.min)).attr('width', x(p9.max) - x(p9.min)).attr('y', y - 24).attr('height', 48).attr('rx', 8)
    .attr('fill', 'var(--p9)').attr('opacity', .18)
  svg.append('text').attr('class', 'p9-svg').attr('x', (x(p9.min) + x(p9.max)) / 2).attr('y', y + 72).attr('text-anchor', 'middle').attr('font-size', 13).attr('font-weight', 600).attr('fill', 'var(--p9-ink)')
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
  // --i: each survey's place left to right, for the chart's entrance (style.css)
  const g = svg.selectAll('g.s').data(rows).join('g').attr('class', 's').style('--i', (d, i) => i)
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

/**
 * Version 2's ruler: the same ruler, band, axis and markers as drawDepth, with each label carrying the survey's
 * years under its name and depth, and the axis and band saying what they are (higher is fainter; the band is an
 * estimated range). The labels are three lines, so they are placed rather than dealt into fixed tiers: each takes
 * the lowest tier where it overlaps no label already there and no other survey's stem passes through it, and its own
 * stem crosses no label below it. Two surveys at the same depth (OSSOS and Rubin) hang either side of one stem.
 */
function drawDepthDetail (root, surveys, p9) {
  const W = 900, H = 330, M = { left: 40, right: 40 }
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', `Brightness ruler from magnitude 19 to 26, higher numbers fainter. Survey limits: ${surveys.map(s => `${s.short} ${s.depth_mag} (${s.years[0]} to ${s.years[1]})`).join(', ')}. Planet Nine estimated between ${p9.min} and ${p9.max}.`)
  svg.selectAll('*').remove()
  const x = d3.scaleLinear().domain([19, 26.5]).range([M.left, W - M.right])
  const y = 236
  svg.append('rect').attr('x', x(p9.min)).attr('width', x(p9.max) - x(p9.min)).attr('y', y - 24).attr('height', 48).attr('rx', 8)
    .attr('fill', 'var(--p9)').attr('opacity', .11)
  const band = svg.append('text').attr('class', 'p9-svg').attr('x', (x(p9.min) + x(p9.max)) / 2).attr('y', y + 70).attr('text-anchor', 'middle')
  band.append('tspan').attr('font-size', 13).attr('font-weight', 600).attr('fill', 'var(--p9-ink)').text('Planet Nine’s estimated brightness')
  band.append('tspan').attr('x', (x(p9.min) + x(p9.max)) / 2).attr('dy', 16).attr('font-size', 12).attr('fill', 'var(--text-muted)').text('a range from the models, not a measured value')
  svg.append('line').attr('x1', x(19)).attr('x2', x(26.5)).attr('y1', y).attr('y2', y).attr('stroke', 'var(--text-muted)').attr('stroke-width', 1.5)
  svg.selectAll('text.t').data(d3.range(19, 27)).join('text').attr('class', 't axis-label').attr('x', d => x(d)).attr('y', y + 22).attr('text-anchor', 'middle').text(d => d)
  svg.selectAll('line.t').data(d3.range(19, 27)).join('line').attr('class', 't').attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', y - 5).attr('y2', y + 5).attr('stroke', 'var(--text-muted)')
  svg.append('text').attr('class', 'axis-label').attr('x', x(19)).attr('y', y + 44).text('brighter ←')
  svg.append('text').attr('class', 'axis-label').attr('x', x(26.5)).attr('y', y + 44).attr('text-anchor', 'end').text('→ fainter')
  svg.append('text').attr('class', 'axis-label').attr('x', x(19)).attr('y', y + 60).text('magnitude: the higher the number, the fainter')

  const rows = surveys.slice().sort((a, b) => a.depth_mag - b.depth_mag)
  const twin = d => rows.filter(o => o.depth_mag === d.depth_mag)
  const anchor = d => {
    const tw = twin(d)
    if (tw.length > 1) return tw.indexOf(d) === 0 ? 'end' : 'start'
    return x(d.depth_mag) > W - M.right - 70 ? 'end' : x(d.depth_mag) < M.left + 70 ? 'start' : 'middle'
  }
  const lx = d => x(d.depth_mag) + (twin(d).length > 1 ? (anchor(d) === 'end' ? -7 : 7) : 0)
  const g = svg.selectAll('g.s').data(rows).join('g').attr('class', 's').style('--i', (d, i) => i)
  const t = g.append('text').attr('class', 'halo').attr('text-anchor', anchor)
    .attr('font-size', 13.5).attr('font-weight', 700).attr('fill', d => d.future ? 'var(--series-4-ink)' : 'var(--text-primary)')
  t.append('tspan').attr('x', lx).text(d => `${d.short} ${d.depth_mag}`)
  t.append('tspan').attr('x', lx).attr('dy', 15).attr('font-size', 11).attr('font-weight', 400).attr('fill', 'var(--text-secondary)').attr('fill-opacity', .85)
    .text(d => d.future ? `${d.years[0]}–${d.years[1]}, planned` : `${d.years[0]}–${d.years[1]}`)
  // how much of the sky: only where the area is published (OSSOS has none we could verify)
  t.filter(d => d.area_sq_deg).append('tspan').attr('x', lx).attr('dy', 13).attr('font-size', 11).attr('font-weight', 400).attr('fill', 'var(--text-muted)').text(skyShare)

  // place the labels: measure each, choose which way it hangs off its marker so no other survey's marker stands
  // under it where it can help (centred first, then to the left, then to the right; twins keep theirs), then the
  // lowest free tier (see above). Each box keeps a little air either side, so neighbours never touch.
  const TIER0 = y - 60, STEP = 54, PAD = 8
  const boxes = rows.map((d, i) => {
    const w = t.nodes()[i].getBBox().width, sx = x(d.depth_mag), isTwin = twin(d).length > 1
    const boxFor = a => {
      const cx = sx + (isTwin ? (a === 'end' ? -7 : 7) : 0)
      const left = a === 'end' ? cx - w : a === 'start' ? cx : cx - w / 2
      return { a, cx, left: left - PAD, right: left + w + PAD }
    }
    const tries = isTwin ? [anchor(d)] : [...new Set([anchor(d), 'end', 'start'])]
    const clear = c => c.left >= 0 && c.right <= W && rows.every(o => o.depth_mag === d.depth_mag || x(o.depth_mag) <= c.left || x(o.depth_mag) >= c.right)
    const pick = tries.map(boxFor).find(clear) || boxFor(anchor(d))
    return { d, ...pick, sx }
  })
  // each label hangs the way chosen
  t.attr('text-anchor', (d, i) => boxes[i].a).selectAll('tspan').attr('x', function () { return boxes[rows.indexOf(d3.select(this.parentNode).datum())].cx })
  const placed = []
  for (const b of boxes) {
    for (let tier = 0; tier < 6; tier++) {
      const free = placed.every(o => {
        const sideBySide = o.right <= b.left || b.right <= o.left
        if (o.tier === tier && !sideBySide) return false                                   // two labels in one tier
        const own = Math.abs(o.sx - b.sx) < 0.5                                             // a twin shares the stem
        if (!own && o.tier > tier && o.sx > b.left && o.sx < b.right) return false         // a higher stem through it
        if (!own && o.tier < tier && b.sx > o.left && b.sx < o.right) return false         // its stem through a lower label
        return true
      })
      if (free) { b.tier = tier; break }
    }
    if (b.tier == null) b.tier = 5
    placed.push(b)
  }
  const top = b => TIER0 - b.tier * STEP - 28                       // the label's first line, three lines above its tier
  t.attr('y', (d, i) => top(boxes[i]))
  g.insert('line', 'text').attr('x1', d => x(d.depth_mag)).attr('x2', d => x(d.depth_mag))
    .attr('y1', (d, i) => twin(d).length > 1 ? top(boxes[i]) - 10 : top(boxes[i]) + 34).attr('y2', y)
    .attr('stroke', d => ink(d, p9)).attr('stroke-width', 2).attr('stroke-dasharray', d => d.future ? '4 3' : null)
  g.insert('circle', 'text').attr('cx', d => x(d.depth_mag)).attr('cy', y).attr('r', 5).attr('fill', d => ink(d, p9))
  // the frame starts just above the highest label, however many tiers the labels needed
  const highest = d3.min(boxes, b => top(b)) - 16
  svg.attr('viewBox', `0 ${highest.toFixed(0)} ${W} ${(H - highest).toFixed(0)}`)
}

/** Phones: the ruler standing up, brighter at the top, each label to the right of its marker, drawn at 1:1. Version 2
    (detail) adds each survey's years and says what the band and the axis are. */
function drawDepthTall (root, surveys, p9, { detail = false } = {}) {
  const W = Math.max(280, Math.round(root.clientWidth || 320)), H = detail ? 600 : 540
  const AX = 52, LX = AX + 34
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', `Brightness ruler from magnitude 19 to 26. Survey limits: ${surveys.map(s => `${s.short} ${s.depth_mag}`).join(', ')}. Planet Nine predicted between ${p9.min} and ${p9.max}.`)
  svg.selectAll('*').remove()
  const y = d3.scaleLinear().domain([19, 26.5]).range([60, H - 34])
  // the key: the band's colour and what it is
  svg.append('rect').attr('x', 4).attr('y', 6).attr('width', 16).attr('height', 12).attr('rx', 3).attr('fill', 'var(--p9)').attr('opacity', .35)
  svg.append('text').attr('class', 'p9-svg').attr('x', 28).attr('y', 16).attr('font-size', 12.5).attr('font-weight', 600).attr('fill', 'var(--p9-ink)').text(detail ? 'Planet Nine’s estimated brightness' : 'Planet Nine’s predicted brightness')
  if (detail) svg.append('text').attr('x', 28).attr('y', 32).attr('font-size', 11.5).attr('fill', 'var(--text-muted)').text('a range from the models, not a measured value')
  svg.append('rect').attr('x', AX - 14).attr('width', W - AX + 10).attr('y', y(p9.min)).attr('height', y(p9.max) - y(p9.min)).attr('rx', 8)
    .attr('fill', 'var(--p9)').attr('opacity', detail ? .09 : .14)
  svg.append('line').attr('x1', AX).attr('x2', AX).attr('y1', y(19)).attr('y2', y(26.5)).attr('stroke', 'var(--text-muted)').attr('stroke-width', 1.5)
  const ticks = d3.range(19, 27)
  svg.selectAll('line.t').data(ticks).join('line').attr('class', 't').attr('x1', AX - 5).attr('x2', AX + 5).attr('y1', d => y(d)).attr('y2', d => y(d)).attr('stroke', 'var(--text-muted)')
  svg.selectAll('text.t').data(ticks).join('text').attr('class', 't axis-label').attr('font-size', 12).attr('x', AX - 10).attr('y', d => y(d) + 4).attr('text-anchor', 'end').text(d => d)
  svg.append('text').attr('class', 'axis-label').attr('font-size', 12).attr('x', AX).attr('y', y(19) - 14).attr('text-anchor', 'middle').text('↑ brighter')
  svg.append('text').attr('class', 'axis-label').attr('font-size', 12).attr('x', AX).attr('y', H - 8).attr('text-anchor', 'middle').text('↓ fainter')
  svg.append('text').attr('class', 'axis-label').attr('font-size', 12).attr('transform', `translate(12,${(y(19) + y(26.5)) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text(detail ? 'magnitude: higher is fainter' : 'magnitude')

  // labels to the right, pushed apart where markers crowd, each tied to its marker by a thin line
  const rows = surveys.slice().sort((a, b) => a.depth_mag - b.depth_mag)
  let prev = -Infinity
  for (const d of rows) { d.ly = Math.max(y(d.depth_mag) + 4, prev + (detail ? 52 : 32)); prev = d.ly }
  const g = svg.selectAll('g.s').data(rows).join('g').attr('class', 's').style('--i', (d, i) => i)
  g.append('path').attr('d', d => `M${AX},${y(d.depth_mag)} L${AX + 14},${y(d.depth_mag)} L${LX - 6},${d.ly - 4}`)
    .attr('fill', 'none').attr('stroke', d => ink(d, p9)).attr('stroke-width', 1.5).attr('stroke-dasharray', d => d.future ? '4 3' : null)
  g.append('circle').attr('cx', AX).attr('cy', d => y(d.depth_mag)).attr('r', 5).attr('fill', d => ink(d, p9))
  const t = g.append('text').attr('class', 'halo').attr('x', LX).attr('y', d => d.ly)
    .attr('font-size', detail ? 13.5 : 13).attr('font-weight', detail ? 700 : 600).attr('fill', d => d.future ? 'var(--series-4-ink)' : 'var(--text-primary)')
  t.append('tspan').text(d => `${d.short} ${d.depth_mag}`)
  if (detail) t.append('tspan').attr('x', LX).attr('dy', 15).attr('font-size', 11).attr('font-weight', 400).attr('fill', 'var(--text-secondary)').attr('fill-opacity', .85).text(d => d.future ? `${d.years[0]}–${d.years[1]}, planned` : `${d.years[0]}–${d.years[1]}`)
  t.filter(d => d.area_sq_deg).append('tspan').attr('x', LX).attr('dy', detail ? 14 : 15).attr('font-size', detail ? 11 : 12).attr('font-weight', 400).attr('fill', 'var(--text-muted)').text(skyShare)
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

/**
 * Bring elements in as they reach the screen and reset them once they are well off it, so they come in again from
 * either direction: the ledger's two observers (charts/field.js), the bottom 8% of the screen to enter and 10% past
 * its edges to leave, so an element on the boundary cannot flicker. The look is scrolly.css's .reveal (or, for the
 * chart, style.css); readers who ask for less motion get everything shown.
 */
function revealOnScroll (els) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
  document.documentElement.classList.add('has-reveal')
  // Put each element in its waiting look at once, with its transition off for that moment: otherwise one already drawn
  // (the beats, at the top) would start fading out toward it, and come in from part way when it is marked in.
  for (const el of els) el.style.transition = 'none'
  for (const el of els) void getComputedStyle(el).opacity
  for (const el of els) el.style.transition = ''
  const enter = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) e.target.classList.add('is-in') }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })
  const leave = new IntersectionObserver(es => { for (const e of es) if (!e.isIntersecting) e.target.classList.remove('is-in') }, { rootMargin: '10% 0px 10% 0px', threshold: 0 })
  // site.js keeps the page hidden until its fonts are in (data-ready); start watching only then, or what is on screen
  // at load would play its entrance unseen
  const root = document.documentElement
  const start = () => requestAnimationFrame(() => { for (const el of els) { enter.observe(el); leave.observe(el) } })
  if (root.hasAttribute('data-ready')) return start()
  const mo = new MutationObserver(() => { if (root.hasAttribute('data-ready')) { mo.disconnect(); start() } })
  mo.observe(root, { attributes: true, attributeFilter: ['data-ready'] })
}

async function main () {
  // The entrances: the three beats one after another, left to right; each row of the schedule on its own; the two
  // verdicts together; the ruler's surveys from brightest to faintest once it is on screen (style.css). Set up before
  // the data loads, while site.js still keeps the page hidden, so the beats at the top are first painted waiting and
  // play as the page appears.
  const beats = [...document.querySelectorAll('.page-head .beats li')]
  beats.forEach((li, i) => { li.classList.add('reveal'); li.style.setProperty('--reveal-delay', `${i * 170}ms`) })
  const rows = [...document.querySelectorAll('#when .when li')]
  const verdicts = $('#verdicts .verdict-cards')
  const question = $('#finalQuestion')   // its parts follow it in, one after another (style.css)
  for (const el of [...rows, verdicts, question]) el.classList.add('reveal')
  revealOnScroll([...beats, ...rows, verdicts, $('#chartDepth'), question, $('#finalQuestion2'), $('#chartDepth2')])   // version 2's question comes in the same way

  // The reader's verdict: one answer at a time, changeable until Submit, then a thank-you in the question's place.
  // Nothing is kept or sent, and no tallies are shown.
  const submit = question.querySelector('.cq-submit')
  question.querySelector('.cq-choices').addEventListener('click', e => {
    const b = e.target.closest('.cq-btn'); if (!b) return
    question.querySelectorAll('.cq-choices .cq-btn').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
    submit.disabled = false
  })
  submit.addEventListener('click', () => {
    question.classList.add('is-submitted')
    question.querySelector('.cq-ask').inert = true
    question.querySelector('.cq-thanks').focus({ preventScroll: true })
  })

  // Version 2's vote, with its own state: one planet at a time, changeable until Submit, then the same thank-you.
  const q2 = $('#finalQuestion2'), submit2 = q2.querySelector('.cq-submit')
  q2.querySelector('.fv-choices').addEventListener('click', e => {
    const b = e.target.closest('.fv-pl'); if (!b) return
    q2.querySelectorAll('.fv-pl').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
    submit2.disabled = false
  })
  submit2.addEventListener('click', () => {
    q2.classList.add('is-submitted')
    q2.querySelector('.cq-ask').inert = true
    q2.querySelector('.cq-thanks').focus({ preventScroll: true })
  })

  // The version switch: ?v=1 or ?v=2, else the last one chosen here, else version 1. Each version keeps its own state
  // (its answer, its thank-you) while hidden.
  const KEY = 'p9-future-version'
  let stored = null
  try { stored = localStorage.getItem(KEY) } catch {}
  const fromUrl = new URLSearchParams(location.search).get('v')
  function showVersion (v) {
    $('#futureV1').hidden = v !== '1'
    $('#futureV1Beats').hidden = v !== '1'
    $('#futureV2').hidden = v !== '2'
    document.querySelectorAll('#futureVersion button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)))
  }
  showVersion(fromUrl === '1' || fromUrl === '2' ? fromUrl : stored === '2' ? '2' : '1')
  $('#futureVersion').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    showVersion(b.dataset.v)
    try { localStorage.setItem(KEY, b.dataset.v) } catch {}
    document.dispatchEvent(new CustomEvent('p9:future-version'))
  })

  const { surveys: sv, planet_nine_predictions: PRED, field_timeline: FIELD, papers: PAPERS } = await loadData('surveys', 'planet_nine_predictions', 'field_timeline', 'papers')
  const SHORT = { ps1: 'Pan-STARRS1', css: 'Catalina', ztf: 'ZTF', des: 'Dark Energy Survey', ossos: 'OSSOS', hsc_ssp: 'Subaru', lsst: 'Rubin' }
  const optical = sv.surveys.filter(s => s.wavelength === 'optical' && s.depth_mag != null).map(s => ({ ...s, short: SHORT[s.id] || s.name }))
  const V = PRED.physical_properties.apparent_V_mag
  const p9 = { min: V.min, max: V.max }
  const lsst = optical.find(s => s.future)
  // the deepest survey covering more than half the sky, before Rubin
  const wide = d3.max(optical.filter(s => !s.future && (s.area_sq_deg ?? 0) > SKY_SQ_DEG / 2), s => s.depth_mag)

  const nums = { lsstMag: lsst?.depth_mag, lsstStart: lsst?.years[0], lsstEnd: lsst?.years[1] }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })
  $('#beatStart').insertAdjacentHTML('afterbegin', '<svg class="art" viewBox="0 0 160 120" aria-hidden="true"><use href="#art-observatory"/></svg>')
  $('#beatReach').insertAdjacentHTML('afterbegin', miniRuler(p9, wide, lsst.depth_mag))
  $('#beatEnd').insertAdjacentHTML('afterbegin', '<svg class="art" viewBox="0 0 100 100" aria-hidden="true"><use href="#art-planet-nine"/></svg>')

  const draw = () => {
    drawDepth($('#chartDepth'), optical, p9)
    // version 2's copy, drawn while visible (its labels are measured), or when version 2 is first shown
    if (!$('#futureV2').hidden) drawDepth($('#chartDepth2'), optical, p9, { detail: true })
  }
  draw()
  document.addEventListener('p9:future-version', draw)
  window.matchMedia(NARROW).addEventListener('change', draw)

  // one lane, so the ledger draws no key; its cards come in by themselves (charts/field.js), their drawings after them
  drawField($('#nextLedger'), { timeline: FIELD, papers: PAPERS.papers, filter: PICK.next, dated: false, lanes: ['next'] })

  // version 2's middle milestone: the same small ruler as version 1's second beat
  $('#fvRuler').innerHTML = miniRuler(p9, wide, lsst.depth_mag)

}

main().catch(showLoadError)
