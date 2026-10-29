// Part 1, page 2: how anyone knows where these objects are.
//
//   makeBlink      a blink comparator: the real discovery frames of one object,
//                  flipped between the way Tombaugh flipped his plates
//   drawArcChart   how long each extreme object has been watched, against how
//                  far the two catalogues' orbits for it disagree
//   drawGrid       every body in the catalogue as one cell, with the few that
//                  carry the Planet Nine argument lit up
//
// Nothing here is drawn from memory: the frames are Commons files fetched by
// scripts/fetch_tracking_images.py, the numbers come from etnos.json.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'
import { url } from '../data.js'

// --- the blink comparator -----------------------------------------------------

/**
 * frames  [{ src, label }]  one image per exposure, same field each time
 * credit  text for the caption's credit line
 * interval ms between flips
 */
export function makeBlink (root, { frames, caption, credit, license, licenseUrl, source, interval = 750, animated = false }) {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const many = frames.length > 1
  root.classList.add('blink')
  root.innerHTML = `
    <div class="blink-stage">${frames.map((f, i) => `<img src="${esc(f.src)}" alt="" loading="lazy" decoding="async" class="${i === 0 ? 'is-on' : ''}">`).join('')}</div>
    <div class="blink-bar">
      ${many ? `<button type="button" class="blink-play" aria-pressed="true" aria-label="Pause the blinking">❚❚</button>
      <span class="blink-dots" aria-hidden="true">${frames.map((f, i) => `<i class="${i === 0 ? 'is-on' : ''}"></i>`).join('')}</span>` : ''}
      <span class="blink-label">${many ? esc(frames[0].label) : animated ? 'animated: the exposures play on their own' : esc(frames[0].label || '')}</span>
    </div>
    <figcaption>${esc(caption)}<span class="blink-credit">${esc(credit)}${license ? ` · ${licenseUrl ? `<a href="${esc(licenseUrl)}" rel="noopener">${esc(license)}</a>` : esc(license)}` : ''}${source ? ` · <a href="${esc(source)}" rel="noopener">source</a>` : ''}</span></figcaption>`
  if (!many) return { stop () {} }

  const imgs = [...root.querySelectorAll('.blink-stage img')]
  const dots = [...root.querySelectorAll('.blink-dots i')]
  const label = root.querySelector('.blink-label')
  const play = root.querySelector('.blink-play')
  let k = 0, timer = null, wanted = true
  const show = i => {
    k = i
    imgs.forEach((im, j) => im.classList.toggle('is-on', j === i))
    dots.forEach((d, j) => d.classList.toggle('is-on', j === i))
    label.textContent = frames[i].label
  }
  const start = () => { if (!timer) timer = setInterval(() => show((k + 1) % frames.length), interval) }
  const stop = () => { if (timer) { clearInterval(timer); timer = null } }
  play.addEventListener('click', () => {
    wanted = !wanted
    play.setAttribute('aria-pressed', String(wanted))
    play.setAttribute('aria-label', wanted ? 'Pause the blinking' : 'Resume the blinking')
    play.textContent = wanted ? '❚❚' : '▶'
    wanted ? start() : stop()
  })
  root.querySelector('.blink-stage').addEventListener('click', () => { if (!wanted) show((k + 1) % frames.length) })
  // Only blink while on screen; a dozen timers on a long page would be wasteful.
  const io = new IntersectionObserver(es => { for (const e of es) (e.isIntersecting && wanted) ? start() : stop() }, { threshold: 0.2 })
  io.observe(root)
  return { stop: () => { stop(); io.disconnect() } }
}

/** Build every blink player from public/tracking/credits.json. `slots` maps image id -> element. */
export function buildBlinks (credits, slots) {
  const out = []
  for (const im of credits.images) {
    const el = slots[im.id]
    if (!el) continue
    const frames = im.files.map((f, i) => ({ src: url(`tracking/${f}`), label: im.dates[i] || '' }))
    out.push(makeBlink(el, {
      frames, caption: im.caption, credit: im.credit, license: im.license, licenseUrl: im.license_url, source: im.source,
      animated: im.files.length === 1 && im.files[0].endsWith('.gif'),
    }))
  }
  return out
}

// --- arc length against catalogue disagreement ---------------------------------

const W = 760, H = 400
const M = { top: 26, right: 24, bottom: 54, left: 70 }

/**
 * Each dot is one extreme object: how many days it has been observed (x) and
 * how far the JPL and Minor Planet Center orbits for it disagree on its
 * average distance (y). The two catalogues fit the same photographs with
 * different software; when the arc is short the fits diverge.
 */
export function drawArcChart (root, etnos, { highlight = ['90377', '2020 MQ53', '2014 FE72'] } = {}) {
  const data = etnos.filter(o => o.a_disagreement_pct != null && o.data_arc_days > 0)
    .map(o => ({ ...o, dis: Math.max(0.0008, o.a_disagreement_pct) }))
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'Scatter plot: the longer an object has been observed, the less the two catalogues disagree about its orbit. Objects watched for under a year can disagree by tens of percent; after several years they agree to a fraction of a percent.')
  const iw = W - M.left - M.right, ih = H - M.top - M.bottom
  const x = d3.scaleLog().domain([12, 20000]).range([0, iw]).clamp(true)
  const y = d3.scaleLog().domain([0.0008, 150]).range([ih, 0]).clamp(true)
  const g = svg.selectAll('g.plot').data([0]).join('g').attr('class', 'plot').attr('transform', `translate(${M.left},${M.top})`)

  const xt = [[30, '1 month'], [365, '1 year'], [3652, '10 years']]
  const yt = [[0.001, '0.001%'], [0.01, '0.01%'], [0.1, '0.1%'], [1, '1%'], [10, '10%'], [100, '100%']]
  g.selectAll('line.gy').data(yt).join('line').attr('class', 'gy gridline')
    .attr('x1', 0).attr('x2', iw).attr('y1', d => y(d[0])).attr('y2', d => y(d[0]))
  g.selectAll('text.ty').data(yt).join('text').attr('class', 'ty axis-label')
    .attr('x', -8).attr('y', d => y(d[0]) + 4).attr('text-anchor', 'end').text(d => d[1])
  g.selectAll('line.gx').data(xt).join('line').attr('class', 'gx gridline')
    .attr('y1', 0).attr('y2', ih).attr('x1', d => x(d[0])).attr('x2', d => x(d[0]))
  g.selectAll('text.tx').data(xt).join('text').attr('class', 'tx axis-label')
    .attr('y', ih + 18).attr('x', d => x(d[0])).attr('text-anchor', 'middle').text(d => d[1])
  g.selectAll('text.xl').data([0]).join('text').attr('class', 'xl axis-label')
    .attr('x', iw / 2).attr('y', ih + 40).attr('text-anchor', 'middle')
    .text('how long the object has been watched (first photograph to latest)')
  g.selectAll('text.yl').data([0]).join('text').attr('class', 'yl axis-label')
    .attr('transform', `translate(-54,${ih / 2}) rotate(-90)`).attr('text-anchor', 'middle')
    .text('how much the two catalogues disagree on its average distance')

  // the one-year line, where this site's "well-measured" cut sits
  g.selectAll('rect.short').data([0]).join('rect').attr('class', 'short')
    .attr('x', 0).attr('y', 0).attr('width', x(365)).attr('height', ih)
    .attr('fill', 'var(--series-2)').attr('opacity', 0.06)
  g.selectAll('text.shortl').data([0]).join('text').attr('class', 'shortl axis-label halo')
    .attr('x', x(365) - 8).attr('y', ih - 10).attr('text-anchor', 'end').attr('fill', '#eba181').attr('font-weight', 600)
    .text('under a year: not trusted on this site')

  const dots = g.selectAll('circle.o').data(data, d => d.id).join('circle').attr('class', 'o')
    .attr('cx', d => x(d.data_arc_days)).attr('cy', d => y(d.dis))
    .attr('r', d => d.well_determined ? 5 : 4)
    .attr('fill', d => d.well_determined ? 'var(--series-1)' : 'var(--series-2)')
    .attr('fill-opacity', d => d.well_determined ? 0.85 : 0.7)
    .attr('stroke', 'var(--surface-1)').attr('stroke-width', 1)
    .style('cursor', 'default')
    .on('pointerenter', (ev, d) => showTip(ev, `<div class="t-name">${d.name || d.provisional_desig || d.id}</div>
      <dl><dt>watched for</dt><dd>${d.data_arc_days >= 365 ? (d.data_arc_days / 365.25).toFixed(1) + ' years' : d.data_arc_days + ' days'}</dd>
      <dt>observations</dt><dd>${d.n_obs ?? '—'}</dd>
      <dt>JPL distance</dt><dd>${d3.format(',.0f')(d.a_au)} AU</dd>
      <dt>MPC distance</dt><dd>${d3.format(',.0f')(d.mpc_a_au)} AU</dd>
      <dt>disagreement</dt><dd>${d.a_disagreement_pct < 0.01 ? '<0.01' : d.a_disagreement_pct.toFixed(d.a_disagreement_pct < 1 ? 2 : 0)}%</dd></dl>
      <div class="note">${d.well_determined ? 'well measured: used on this site' : 'seen briefly: shown, never counted'}</div>`))
    .on('pointerleave', hideTip)

  // name a few, so the reader has anchors
  const named = data.filter(d => highlight.includes(d.id))
  g.selectAll('text.nm').data(named, d => d.id).join('text').attr('class', 'nm halo')
    .attr('x', d => x(d.data_arc_days) + (d.data_arc_days > 5000 ? -9 : 9)).attr('y', d => y(d.dis) + (d.id === '2020 MQ53' ? 18 : 4))
    .attr('text-anchor', d => d.data_arc_days > 5000 ? 'end' : 'start')
    .attr('font-size', 12.5).attr('font-weight', 600).attr('fill', 'var(--text-primary)')
    .text(d => {
      const nm = d.name || d.provisional_desig || d.id
      if (d.id === '2020 MQ53') return `${nm}: 56 days, off by a factor of 20`
      if (d.id === '90377') return `${nm}: 35 years, agree to 0.002%`
      return nm
    })
  return { dots }
}

// --- the grid: every catalogued body, and the few that matter -------------------

/**
 * tiers  [{ n, label, colour }] from the outermost (all bodies) to the innermost
 *        (the six orbits the 2016 paper started from). Each tier's cells are
 *        the first n cells, so the tiers nest from the top-left corner.
 */
export function drawGrid (root, { tiers, cols = 128 }) {
  const total = tiers[0].n
  const rows = Math.ceil(total / cols)
  const cell = 7, gap = 1
  const GW = cols * cell, GH = rows * cell
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${GW} ${GH}`).attr('role', 'img')
    .attr('aria-label', tiers.map(t => `${t.n.toLocaleString()} ${t.label}`).join('; '))
  const tierOf = i => { let t = 0; for (let k = 0; k < tiers.length; k++) if (i < tiers[k].n) t = k; return tiers[t] }
  const cells = d3.range(total).map(i => ({ i, t: tierOf(i) }))
  svg.selectAll('rect').data(cells).join('rect')
    .attr('x', d => (d.i % cols) * cell).attr('y', d => Math.floor(d.i / cols) * cell)
    .attr('width', cell - gap).attr('height', cell - gap).attr('rx', 1)
    .attr('fill', d => d.t.colour).attr('fill-opacity', d => d.t.opacity ?? 1)
}
