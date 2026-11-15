// Part 3, page 2: the debate, a paper at a time from 2014 to 2026 (charts/debate.js), and how the proposed planet
// changed. (The ledger this page used to hold, charts/field.js, still serves the search and future pages.)

import '../site.js'
import { loadData, showLoadError, url } from '../data.js'
import { drawDebate, debatePapers } from '../charts/debate.js'
import { drawProposals } from '../charts/proposals.js'
import { drawProposalsV2 } from '../charts/proposals2.js'

const $ = s => document.querySelector(s)
const span = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

/**
 * The year strip under the picture: a button per year with a small mark per paper that year (for above the year,
 * against below it), a line behind them that fills to the year shown, previous and next either side, and a play
 * button that steps on a year at a time. Any other control stops the play.
 */
function debate ({ items, debate: D, papers }) {
  const [y0, y1] = D.range
  const strip = $('#dbYears')
  const marks = (y, s) => '<i></i>'.repeat(items.filter(d => d.year === y && d.side === s).length)
  strip.innerHTML = '<li class="db-track" aria-hidden="true"><i></i></li>' + span(y0, y1).map(y => `<li>
    <button type="button" data-year="${y}" aria-label="${y}">
      <span class="db-m is-for" aria-hidden="true">${marks(y, 'for')}</span>
      <b class="db-long">${y}</b><b class="db-short" aria-hidden="true">’${String(y).slice(2)}</b>
      <span class="db-m is-against" aria-hidden="true">${marks(y, 'against')}</span>
    </button></li>`).join('')
  const fill = strip.querySelector('.db-track i')
  const buttons = [...strip.querySelectorAll('button')]
  const prev = $('#dbPrev'), next = $('#dbNext'), play = $('#dbPlay')

  // which mark: ?v=1 or ?v=2 in the address, else the last one chosen here, else version 1 (dots). A new key, so a
  // choice stored when the versions were layouts does not carry over.
  const KEY = 'p9-debate-marker'
  const fromUrl = { 1: 'dots', 2: 'thumbs' }[new URLSearchParams(location.search).get('v')]
  let stored = null
  try { stored = localStorage.getItem(KEY) } catch {}
  const marker = fromUrl || (stored === 'thumbs' ? 'thumbs' : 'dots')

  let year = y0, timer = 0
  const chart = drawDebate($('#dbStage'), {
    year: $('#dbYear'), headline: $('#dbHeadline'), countFor: $('#dbFor'), countAgainst: $('#dbAgainst'), panel: $('#dbPanel'),
  }, {
    items,
    debate: D,
    marker,
    onYear: y => {
      for (const b of buttons) {
        const by = +b.dataset.year
        b.classList.toggle('is-past', by < y)
        if (by === y) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current')
      }
      fill.style.transform = `scaleX(${(y - y0) / (y1 - y0)})`
      prev.disabled = y <= y0
      next.disabled = y >= y1
    },
  })
  const go = y => { year = Math.max(y0, Math.min(y1, y)); chart.show(year) }
  const stop = () => { clearInterval(timer); timer = 0; play.textContent = year >= y1 ? 'Replay' : 'Play' }

  strip.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { stop(); go(+b.dataset.year) } })
  prev.addEventListener('click', () => { stop(); go(year - 1) })
  next.addEventListener('click', () => { stop(); go(year + 1) })
  // left and right step through the years from anywhere on the strip
  $('.db-time').addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault(); stop(); go(year + (e.key === 'ArrowRight' ? 1 : -1))
    if (e.target.closest('.db-years')) buttons[year - y0].focus()
  })
  play.addEventListener('click', () => {
    if (timer) { stop(); return }
    if (year >= y1) go(y0)
    play.textContent = 'Pause'
    timer = setInterval(() => { go(year + 1); if (year >= y1) stop() }, 1700)
  })
  go(y0)

  // the version toggle: the same year, the same places and the same paper, the marks crossfading
  const seg = [...document.querySelectorAll('.db-version button')]
  const mark = m => seg.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.marker === m)))
  mark(marker)
  for (const b of seg) {
    b.addEventListener('click', () => {
      mark(b.dataset.marker)
      chart.marker(b.dataset.marker)
      try { localStorage.setItem(KEY, b.dataset.marker) } catch {}
    })
  }

  const left = papers.filter(p => p.stance === 'neutral' || p.year < y0).length
  $('#dbCaption').innerHTML = `Which side a paper is on is <strong>our</strong> reading of its abstract. The ${left} papers
    in our sample that report data or predictions without taking a side, or came before ${y0}, are left out of the picture.
    The sample is chosen, not every paper written, so the counts describe it, not opinion ·
    <a href="${url('credits.html')}#papers">every paper</a>`
}

async function main () {
  const { field_timeline: FIELD, papers: PAPERS, planet_nine_predictions: PRED, debate: DEBATE } =
    await loadData('field_timeline', 'papers', 'planet_nine_predictions', 'debate')
  const items = debatePapers({ papers: PAPERS.papers, timeline: FIELD, debate: DEBATE })
  debate({ items, debate: DEBATE, papers: PAPERS.papers })

  // phones get their own layout of the chart (time running down); redraw when the screen crosses over
  const chart = $('#chartProposals')
  const draw = () => { if (!$('#proposalsV1').hidden) drawProposals(chart, PRED.orbit_predictions) }
  window.matchMedia('(max-width: 640px)').addEventListener('change', draw)
  // two versions of how the proposal changed (2026-11-10): 1 the original charts, unchanged; 2 one paper at a time
  // (charts/proposals2.js). ?pv=1 or ?pv=2 in the address, else the last one chosen here, else version 2.
  const PV_KEY = 'p9-proposals-version'
  let pvStored = null
  try { pvStored = localStorage.getItem(PV_KEY) } catch {}
  const pvUrl = new URLSearchParams(location.search).get('pv')
  let v2 = null
  const showPv = v => {
    $('#proposalsV1').hidden = v !== '1'
    $('#proposalsV2').hidden = v !== '2'
    document.querySelectorAll('.pv-version button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)))
    if (v === '1') draw()
    else if (!v2) v2 = drawProposalsV2($('#chartProposals2'), PRED.orbit_predictions)
  }
  showPv(pvUrl === '1' || pvUrl === '2' ? pvUrl : pvStored === '1' ? '1' : '2')
  document.querySelector('.pv-version').addEventListener('click', e => {
    const b = e.target.closest('button[data-v]'); if (!b) return
    showPv(b.dataset.v)
    try { localStorage.setItem(PV_KEY, b.dataset.v) } catch {}
  })
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
