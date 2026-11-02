// Part 3, page 2: the compact ledger, told as a story down a line of years, and how the proposed planet changed.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawField, PICK } from '../charts/field.js'
import { icon } from '../charts/fieldart.js'
import { drawProposals } from '../charts/proposals.js'

const $ = s => document.querySelector(s)

// The key above the ledger: each lane's icon in its badge (colour and shape together), its name in its colour and
// what it holds. The names are the ledger's own lanes; the colours are field.css's.
const KEY = [
  ['is-for', 'planet', 'For Planet Nine', 'Research supporting the Planet Nine hypothesis.'],
  ['is-against', 'noplanet', 'Against Planet Nine', 'Research challenging the hypothesis or offering competing explanations.'],
  ['is-data', 'object', 'Data and searches', 'Observations, discoveries and telescope searches that inform the debate.'],
]

/**
 * The ledger as a story: a line down the year gutter that fills as the reader moves down it, a marker per year
 * (passed years filled, the year being read lit and its label brighter), and each year's rows coming in one after
 * another. The rows' entrance itself is the ledger's (charts/field.js: is-in on entering, off once out of view);
 * this orders it within a year, dims a row once it has passed above the reading area (rather than letting it
 * vanish), notes which side a row left by so it comes back from that side, and fades each year's label the same way.
 * Everything that follows the scroll shares one rAF-throttled listener.
 */
function storyLine (root) {
  root.classList.add('is-story')
  root.insertAdjacentHTML('afterbegin', '<div class="tl-line" aria-hidden="true"><i></i></div>')
  const fill = root.querySelector('.tl-line i')
  const years = [...root.querySelectorAll('.fy')]
  // within a year, rows come in in their order, a beat apart (capped, so a long year never waits)
  for (const y of years) y.querySelectorAll('.fr').forEach((r, i) => r.style.setProperty('--i', Math.min(i, 4)))

  const reveal = document.documentElement.classList.contains('has-reveal')
  const rows = [...root.querySelectorAll('.fr')]
  // Each row's place on the page, from layout (offsetTop ignores the entrance's transform, which a bounding box
  // would include, so a row still settling is judged where it will end, not where it is mid-slide). Re-measured
  // whenever the ledger changes size: fonts, images, a narrower screen.
  let place = []
  const docTop = el => { let t = 0; for (; el; el = el.offsetParent) t += el.offsetTop; return t }
  const measure = () => { place = rows.map(r => { const t = docTop(r); return [t, t + r.offsetHeight] }) }
  measure()
  let raf = 0
  function update () {
    raf = 0
    const H = window.innerHeight
    // the reading line: a little above the middle of the screen, where the eye is while scrolling
    const line = H * 0.42
    const box = fill.parentElement.getBoundingClientRect()
    fill.style.transform = `scaleY(${Math.max(0, Math.min(1, (line - box.top) / box.height))})`
    let current = -1
    years.forEach((y, i) => { if (y.getBoundingClientRect().top <= line) current = i })
    years.forEach((y, i) => {
      y.classList.toggle('is-past', i < current)
      y.classList.toggle('is-current', i === current)
    })
    if (!reveal) return
    // Above the reading area (the screen below the nav and the pinned lane names) a row dims rather than vanishing.
    // Which side a row or a year last left by decides which way it comes back. Measured here, on the frame, not by an
    // observer: a fast scroll can carry a row from below the screen to above it without ever crossing a boundary.
    const y0 = window.scrollY
    rows.forEach((r, i) => {
      const top = place[i][0] - y0, bottom = place[i][1] - y0
      r.classList.toggle('is-dim', bottom <= H * 0.2)
      if (bottom <= H * 0.2) r.dataset.from = 'above'
      else if (top >= H) r.dataset.from = 'below'
    })
    for (const y of years) {
      const b = y.getBoundingClientRect()
      if (b.bottom <= 0) y.dataset.from = 'above'
      else if (b.top >= H) y.dataset.from = 'below'
    }
  }
  // only when the ledger animates its rows (not for readers who ask for less motion)
  if (reveal) {
    // a year's label comes in with its year and goes once the year is out of view: the ledger's two margins, so a
    // year sitting on the edge cannot flicker between the two
    const seen = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) e.target.classList.add('is-seen')
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })
    const gone = new IntersectionObserver(es => {
      for (const e of es) if (!e.isIntersecting) e.target.classList.remove('is-seen')
    }, { rootMargin: '10% 0px 10% 0px', threshold: 0 })
    years.forEach(y => { seen.observe(y); gone.observe(y) })
  }
  const request = () => { if (!raf) raf = requestAnimationFrame(update) }
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', request)
  new ResizeObserver(() => { measure(); request() }).observe(root)
  update()
}

async function main () {
  const { field_timeline: FIELD, papers: PAPERS, planet_nine_predictions: PRED } = await loadData('field_timeline', 'papers', 'planet_nine_predictions')
  $('#ledgerKey').innerHTML = KEY.map(([cls, ic, name, text]) => `<li class="${cls}">
    <span class="fr-icon" aria-hidden="true">${icon(ic)}</span>
    <span><b>${name}</b><span>${text}</span></span></li>`).join('')
  drawField($('#fieldTimeline'), { timeline: FIELD, papers: PAPERS.papers, filter: PICK.all, compact: true, future: false, lanes: ['for', 'against', 'data'] })
  storyLine($('#fieldTimeline'))
  // phones get their own layout of the chart (time running down); redraw when the screen crosses over
  const chart = $('#chartProposals')
  const draw = () => drawProposals(chart, PRED.orbit_predictions)
  draw()
  window.matchMedia('(max-width: 640px)').addEventListener('change', draw)
  // How the proposal changed comes in once, the first time about a third of it is on screen: the papers' marks in a wave
  // from 2016 on (style.css). Its frame (titles, axes, labels) is there from the start. Readers who ask for less motion
  // get it all at once.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    chart.classList.add('is-waiting')
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return
      chart.classList.remove('is-waiting')
      io.disconnect()
    }, { threshold: 0.3 })
    io.observe(chart)
  }
}

main().catch(showLoadError)
