// Part 3, page 2: the debate, a paper at a time from 2014 to 2026 (charts/debate.js), and how the proposed planet
// changed. (The ledger this page used to hold, charts/field.js, still serves the search and future pages.)
// How the proposed planet has changed: the dashboard (charts/proposals2.js). It had three versions while the team compared them;
// the focused one (3) became the only one on 2026-11-20, and the Evidence Constellation under it was cut the same day.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawDebate, debatePapers, allPapersHTML } from '../charts/debate.js'
import { drawDebateHead } from '../charts/debatehead.js'
import { drawProposalsV2 } from '../charts/proposals2.js'

const $ = s => document.querySelector(s)
const span = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/**
 * The year strip under the picture: a button per year with a small mark per paper that year (for above the year,
 * against below it), a line behind them that fills to the year shown, previous and next either side, and a play
 * button that steps on a year at a time. Any other control stops the play.
 *
 * Playing, each year stays long enough to read (2026-11-21, asked for: 1.7 s a year was too quick, then a little
 * quicker than the first try): 2.2 s and 0.75 s more for each new paper, a year with none 1.3 s. The first year, on
 * screen since the page opened, moves on after 1.2 s. The line fills on towards the next
 * year as the time runs, so the wait is seen, and it holds while the pointer is on the paper panel or on a paper, while
 * the debate is scrolled out of view and while the tab is hidden.
 *
 * At the last year the strip becomes the summary of the whole debate (2026-11-21, asked for): each year's papers
 * stacked as columns, for above the line and against below, and pointing at a year gives its headline.
 */
function debate ({ items, debate: D }) {
  const [y0, y1] = D.range
  const strip = $('#dbYears')
  const nav = $('.db-time')
  const n = (y, s) => items.filter(d => d.year === y && d.side === s).length
  const marks = (y, s) => '<i></i>'.repeat(n(y, s))
  strip.innerHTML = '<li class="db-track" aria-hidden="true"><i></i></li>' + span(y0, y1).map(y => `<li>
    <button type="button" data-year="${y}" aria-label="${y}: ${n(y, 'for')} for, ${n(y, 'against')} against">
      <span class="db-m is-for" aria-hidden="true">${marks(y, 'for')}</span>
      <b class="db-long">${y}</b><b class="db-short" aria-hidden="true">’${String(y).slice(2)}</b>
      <span class="db-m is-against" aria-hidden="true">${marks(y, 'against')}</span>
    </button></li>`).join('')
  // the summary's columns are as tall as the most papers on one side in one year
  nav.style.setProperty('--db-stack', Math.max(...span(y0, y1).flatMap(y => [n(y, 'for'), n(y, 'against')])))
  const fill = strip.querySelector('.db-track i')
  const buttons = [...strip.querySelectorAll('button')]
  const prev = $('#dbPrev'), next = $('#dbNext'), play = $('#dbPlay')
  const sum = $('#dbSum')
  const sumIdle = sum.innerHTML

  let year = y0, run = null
  const chart = drawDebate($('#dbStage'), {
    year: $('#dbYear'), headline: $('#dbHeadline'), countFor: $('#dbFor'), countAgainst: $('#dbAgainst'), panel: $('#dbPanel'), strip,
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
      nav.classList.toggle('is-summary', y >= y1)
      if (y < y1) sum.innerHTML = sumIdle
    },
  })
  const go = y => { year = Math.max(y0, Math.min(y1, y)); chart.show(year) }

  // --- play: one year's wait is an animation of the line towards the next year; when it ends the year steps on.
  // It pauses for any of a few reasons and runs again when none is left (`holds`): the pointer resting on the paper
  // panel or on a paper ('read'), the debate scrolled mostly out of view ('away'), the tab hidden ('hidden').
  const dwell = y => { const k = items.filter(d => d.year === y).length; return y === y0 ? 1200 : k ? 2200 + 750 * k : 1300 }
  const frac = y => (y - y0) / (y1 - y0)
  const holds = new Set()
  const sync = () => { if (!run) return; if (holds.size) { if (run.playState === 'running') run.pause() } else if (run.playState === 'paused') run.play() }
  const hold = (why, on) => { if (on) holds.add(why); else holds.delete(why); sync(); fill.classList.toggle('is-held', !!run && holds.has('read')) }
  function wait () {
    if (year >= y1) { stop(); return }
    run = fill.animate([{ transform: `scaleX(${frac(year)})` }, { transform: `scaleX(${frac(year + 1)})` }],
      { duration: dwell(year), easing: 'linear' })
    const mine = run
    reading()   // pauses it at once if the reader is on a paper or the debate is out of view
    sync()
    run.onfinish = () => {
      if (run !== mine) return
      run = null
      // the line is already where the next year puts it: set it there without the usual ease
      fill.style.transition = 'none'
      try { go(year + 1) } finally {
        void fill.offsetWidth
        fill.style.transition = ''
        // a step that throws never leaves the play stuck on 'Pause'
        wait()
      }
    }
  }
  function stop () {
    const r = run
    run = null
    r?.cancel()
    fill.classList.remove('is-held')
    play.textContent = year >= y1 ? 'Replay' : 'Play'
  }

  strip.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { stop(); go(+b.dataset.year) } })
  prev.addEventListener('click', () => { stop(); go(year - 1) })
  next.addEventListener('click', () => { stop(); go(year + 1) })
  // left and right step through the years from anywhere on the strip
  nav.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault(); stop(); go(year + (e.key === 'ArrowRight' ? 1 : -1))
    if (e.target.closest('.db-years')) buttons[year - y0].focus()
  })
  play.addEventListener('click', () => {
    if (run) { stop(); return }
    if (year >= y1) go(y0)
    play.textContent = 'Pause'
    wait()
  })
  // Reading holds the play: a mouse resting on one paper, its sheet in the picture, its card in the panel's list, or the
  // panel while it shows a paper (the whole panel held it at first, 2026-11-21, which stopped the play wherever a mouse
  // was left to rest on the right). While it holds, the strip's line pulses. What is under the pointer is looked up from its
  // last position, not tracked with enter and leave, which a page scrolling under a still pointer (or a picture changing
  // under it) can miss, leaving the play paused for good. It is looked up again as the pointer moves, as the page
  // scrolls and as each year starts.
  const panelEl = $('#dbPanel'), stage = $('#dbStage')
  let pointer = null, queued = false
  function reading () {
    const el = pointer && document.elementFromPoint(pointer[0], pointer[1])
    hold('read', !!el && (!!el.closest?.('#dbStage .db-dot, #dbPanel .db-new button') || (panelEl.classList.contains('is-paper') && panelEl.contains(el))))
  }
  const later = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; reading() }) } }
  window.addEventListener('pointermove', e => { pointer = e.pointerType === 'mouse' ? [e.clientX, e.clientY] : null; later() }, { passive: true })
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; later() })
  window.addEventListener('scroll', later, { passive: true })
  // out of view or in a hidden tab, the play waits where it is
  // (away: under 30% of the picture in view, or of the window when the picture is taller than the window)
  new IntersectionObserver(([e]) => hold('away', e.intersectionRect.height < 0.3 * Math.min(e.boundingClientRect.height, innerHeight)),
    { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.6, 1] }).observe(stage)
  document.addEventListener('visibilitychange', () => hold('hidden', document.hidden))

  // the summary: a year pointed at or focused gives its headline under the strip
  const say = b => {
    if (!nav.classList.contains('is-summary')) return
    const y = b ? +b.dataset.year : null
    sum.innerHTML = y ? `<b>${y}</b> ${esc(D.headlines[y] || '')}` : sumIdle
  }
  strip.addEventListener('pointerover', e => say(e.target.closest('button')))
  strip.addEventListener('pointerleave', () => say(null))
  strip.addEventListener('focusin', e => say(e.target.closest('button')))
  strip.addEventListener('focusout', () => say(null))

  // every paper as a static list, opened from the finale's button and closed from its own
  const all = $('#dbAll')
  all.innerHTML = allPapersHTML(items, D)
  const openBtn = () => document.querySelector('.db-all-btn')
  const showAll = on => {
    all.hidden = !on
    openBtn()?.setAttribute('aria-expanded', String(on))
    if (on) all.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }
  $('#dbStage').addEventListener('click', e => { if (e.target.closest('.db-all-btn')) showAll(all.hidden) })
  all.querySelector('.db-all-close').addEventListener('click', () => { showAll(false); openBtn()?.focus({ preventScroll: true }); $('#debate').scrollIntoView({ block: 'start' }) })
  go(y0)
}

drawDebateHead($('#dhArt'))

async function main () {
  const { field_timeline: FIELD, papers: PAPERS, planet_nine_predictions: PRED, debate: DEBATE } =
    await loadData('field_timeline', 'papers', 'planet_nine_predictions', 'debate')
  const items = debatePapers({ papers: PAPERS.papers, timeline: FIELD, debate: DEBATE })
  debate({ items, debate: DEBATE })

  // how the proposed planet has changed: one paper at a time (charts/proposals2.js)
  drawProposalsV2($('#chartProposals2'), PRED.orbit_predictions)

  // on a wide screen the picture's card runs down to the foot of the right column (style.css), and the spare height
  // is shared out inside it: half between the distance and mass scales, a quarter above the picture, the rest under it
  // (the note on the planet's size and the bands was cut on 2026-11-21, asked for). Measured here, as the right column's height changes with the paper chosen.
  // --pv-extra in pixels for the card's margins; --pv-extra-u in the picture's own units for the mass scale's shift.
  const pic = $('#chartProposals2 .pv-pic'), pvSvg = $('#chartProposals2 .pv-svg')
  const fitPic = () => {
    if (!matchMedia('(min-width: 901px)').matches) { pic.style.removeProperty('--pv-extra'); pic.style.removeProperty('--pv-extra-u'); return }
    const cs = getComputedStyle(pic)
    const natural = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) +
      pvSvg.getBoundingClientRect().height
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
