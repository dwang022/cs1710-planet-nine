// Part 3, page 2: the debate, a paper at a time from 2014 to 2026 (charts/debate.js), and how the proposed planet
// changed. (The ledger this page used to hold, charts/field.js, still serves the search and future pages.)
// How the proposal changed: the dashboard (charts/proposals2.js). It had three versions while the team compared them;
// the focused one (3) became the only one on 2026-11-20, and the Evidence Constellation under it was cut the same day.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawDebate, debatePapers } from '../charts/debate.js'
import { drawDebateHead } from '../charts/debatehead.js'
import { drawProposalsV2 } from '../charts/proposals2.js'

const $ = s => document.querySelector(s)
const span = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

/**
 * The year strip under the picture: a button per year with a small mark per paper that year (for above the year,
 * against below it), a line behind them that fills to the year shown, previous and next either side, and a play
 * button that steps on a year at a time. Any other control stops the play.
 */
function debate ({ items, debate: D }) {
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

  let year = y0, timer = 0
  const chart = drawDebate($('#dbStage'), {
    year: $('#dbYear'), headline: $('#dbHeadline'), countFor: $('#dbFor'), countAgainst: $('#dbAgainst'), panel: $('#dbPanel'),
  }, {
    items,
    debate: D,
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
}

drawDebateHead($('#dhArt'))

async function main () {
  const { field_timeline: FIELD, papers: PAPERS, planet_nine_predictions: PRED, debate: DEBATE } =
    await loadData('field_timeline', 'papers', 'planet_nine_predictions', 'debate')
  const items = debatePapers({ papers: PAPERS.papers, timeline: FIELD, debate: DEBATE })
  debate({ items, debate: DEBATE })

  // how the proposal changed: one paper at a time (charts/proposals2.js)
  drawProposalsV2($('#chartProposals2'), PRED.orbit_predictions)

  // on a wide screen the picture's card runs down to the foot of the right column (style.css), and the spare height
  // is shared out inside it: half between the distance and mass scales, a quarter above the picture, the rest above
  // the note at the foot. Measured here, as the right column's height changes with the paper chosen.
  // --pv-extra in pixels for the card's margins; --pv-extra-u in the picture's own units for the mass scale's shift.
  const pic = $('#chartProposals2 .pv-pic'), pvSvg = $('#chartProposals2 .pv-svg'), note = $('#chartProposals2 .pv-pic-note')
  const fitPic = () => {
    if (!matchMedia('(min-width: 901px)').matches) { pic.style.removeProperty('--pv-extra'); pic.style.removeProperty('--pv-extra-u'); return }
    const cs = getComputedStyle(pic), ns = getComputedStyle(note)
    const natural = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) +
      pvSvg.getBoundingClientRect().height + note.getBoundingClientRect().height + 2 + parseFloat(ns.marginBottom)   // 2: the note's own top margin (style.css)
    // against the right column's foot, not the card's own height (which the margins set here can hold up)
    const target = $('#chartProposals2 .pv-right').getBoundingClientRect().bottom - pic.getBoundingClientRect().top
    const extra = Math.max(0, target - natural)
    const scale = pvSvg.getBoundingClientRect().width / pvSvg.viewBox.baseVal.width
    pic.style.setProperty('--pv-extra', `${extra.toFixed(1)}px`)
    pic.style.setProperty('--pv-extra-u', `${(extra / scale).toFixed(1)}px`)
  }
  new ResizeObserver(fitPic).observe($('#chartProposals2 .pv-right'))
  new ResizeObserver(fitPic).observe(pvSvg)

  fitPic()
}

main().catch(showLoadError)
