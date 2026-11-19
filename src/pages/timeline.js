// Part 3, page 2: the debate, a paper at a time from 2014 to 2026 (charts/debate.js), and how the proposed planet
// changed. (The ledger this page used to hold, charts/field.js, still serves the search and future pages.)
// How the proposal changed has two versions (2026-11-17): 1 the dashboard alone; 2 the dashboard and, under it,
// the probability page's two charts, "Where you draw the line" and "What the studies conclude" (charts/cuts.js, charts/odds.js).

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawDebate, debatePapers } from '../charts/debate.js'
import { drawProposalsV2 } from '../charts/proposals2.js'
import { drawOdds } from '../charts/odds.js'
import { oddsLink } from '../charts/oddslink.js'
import { drawConstellation } from '../charts/constellation.js'
import { drawCuts } from '../charts/cuts.js'
import { oneIn } from '../stats.js'
import { STRICT, LOOSE } from '../sample.js'

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

/**
 * The rows of the probability page's odds chart, built exactly as pages/probability.js builds them (our test is the
 * stored 200,000-trial result for the fixed STRICT and LOOSE samples in clustering_null.json; each study is its abstract
 * in published_odds.json). Version 2 draws them with drawOdds as they are; version 3 with the Evidence Constellation
 * (charts/constellation.js), whose cards also read each study's plain_detail and quote. drawOdds ignores those, and doi.
 */
function oddsRows ({ published, nulls }) {
  const cutFor = (a, q, good) => nulls.cuts.find(c => c.a_min_au === a && c.q_min_au === q && c.well_determined_only === good)
  const sp = cutFor(STRICT.aMin, STRICT.qMin, !!STRICT.quality), lp = cutFor(LOOSE.aMin, LOOSE.qMin, !!LOOSE.quality)
  const study = d => ({
    label: d.label, detail: d.count, side: d.side, doi: d.doi, plain: d.plain_detail, quote: d.quote,
    ...(d.p ? { oneIn: oneIn(d.p) } : {}),
  })
  return [
    { heading: 'Not allowing for where telescopes looked' },
    ...published.studies.filter(d => !d.allows_for_looking).map(study),
    { label: `Our test`, detail: `${sp.n_objects} seen in more than one year`, oneIn: oneIn(sp.p_value), side: 'ours' },
    { label: `Our test`, detail: `all ${lp.n_objects}, with those seen once`, oneIn: oneIn(lp.p_value), side: 'ours' },
    { heading: 'Allowing for where telescopes looked' },
    ...published.studies.filter(d => d.allows_for_looking).map(study),
  ]
}

// version 2's odds chart, with the chosen paper lit on it (charts/oddslink.js)
function evidence (data) {
  const link = oddsLink($('#pvChartOdds'))   // before drawing, so the first draw is lit too
  drawOdds($('#pvChartOdds'), oddsRows(data))
  return link
}

// version 2's cut-off chart, drawn the first time version 2 is shown (so it measures its real width)
function cutoffs ({ nulls }) {
  const cutFor = (a, q, good) => nulls.cuts.find(c => c.a_min_au === a && c.q_min_au === q && c.well_determined_only === good)
  const cutRows = [...new Set(nulls.cuts.map(c => `${c.a_min_au}/${c.q_min_au}`))].map(k => {
    const [a, q] = k.split('/').map(Number)
    const good = cutFor(a, q, true), all = cutFor(a, q, false)
    return good && all && { a, q, good: { n: good.n_objects, oneIn: oneIn(good.p_value) }, all: { n: all.n_objects, oneIn: oneIn(all.p_value) } }
  }).filter(Boolean).sort((x, y) => x.a - y.a)
  drawCuts($('#pvChartCuts'), cutRows)
}

async function main () {
  const { field_timeline: FIELD, papers: PAPERS, planet_nine_predictions: PRED, debate: DEBATE,
    published_odds: published, clustering_null: nulls } =
    await loadData('field_timeline', 'papers', 'planet_nine_predictions', 'debate', 'published_odds', 'clustering_null')
  const items = debatePapers({ papers: PAPERS.papers, timeline: FIELD, debate: DEBATE })
  debate({ items, debate: DEBATE })

  // how the proposal changed: one paper at a time (charts/proposals2.js; the original two charts were retired on 2026-11-17)
  // In version 2 the chosen paper is lit on the odds chart when that chart has a row for the same paper: matched by
  // DOI, so only Batygin & Brown 2016 and Brown & Batygin 2021 (both of its entries) link; any other paper leaves the
  // chart as it is. No value on either chart depends on the choice. Version 3's chart (the Evidence Constellation) is
  // never linked to the choice.
  const studyByDoi = new Map(published.studies.map(d => [d.doi, d]))
  let chosen = null, link = null, pvNow = '1'
  const lightUp = () => {
    const study = pvNow === '2' && chosen && studyByDoi.get(chosen.doi)
    link?.set(study ? study.doi : null)
    $('#pvLinkNote').innerHTML = study ? `Highlighted: <b>${study.label}</b>, the paper chosen above.` : ''
  }
  drawProposalsV2($('#chartProposals2'), PRED.orbit_predictions, { onSelect: p => { chosen = p; lightUp() } })

  // three versions of the section (2026-11-17): 1 the dashboard alone; 2 the story in two parts; 3 the same story with
  // only the odds chart. data-pv lists the versions an element shows in; the dashboard is never touched, so the chosen
  // paper stays. Version 1 on every load; ?pv=2 or ?pv=3 opens that version.
  // version 3 on a wide screen: the picture's card runs down to the foot of the right column (style.css), and the spare
  // height is shared out inside it: half between the distance and mass scales, a quarter above the picture, the
  // rest above the note at the foot. Measured here, as the right column's height changes with the paper chosen.
  // --pv-extra in pixels for the card's margins; --pv-extra-u in the picture's own units for the mass scale's shift.
  const pic = $('#chartProposals2 .pv-pic'), pvSvg = $('#chartProposals2 .pv-svg'), note = $('#chartProposals2 .pv-pic-note')
  const fitPic = () => {
    const on = $('#proposals').dataset.pvOn === '3' && matchMedia('(min-width: 901px)').matches
    if (!on) { pic.style.removeProperty('--pv-extra'); pic.style.removeProperty('--pv-extra-u'); return }
    const cs = getComputedStyle(pic), ns = getComputedStyle(note)
    const natural = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) +
      pvSvg.getBoundingClientRect().height + note.getBoundingClientRect().height + 2 + parseFloat(ns.marginBottom)   // 2: the note's own top margin (style.css); version 3's is auto
    // against the right column's foot, not the card's own height (which the margins set here can hold up)
    const target = $('#chartProposals2 .pv-right').getBoundingClientRect().bottom - pic.getBoundingClientRect().top
    const extra = Math.max(0, target - natural)
    const scale = pvSvg.getBoundingClientRect().width / pvSvg.viewBox.baseVal.width
    pic.style.setProperty('--pv-extra', `${extra.toFixed(1)}px`)
    pic.style.setProperty('--pv-extra-u', `${(extra / scale).toFixed(1)}px`)
  }
  new ResizeObserver(fitPic).observe($('#chartProposals2 .pv-right'))
  new ResizeObserver(fitPic).observe(pvSvg)

  let oddsDrawn = false, cutsDrawn = false, starsDrawn = false
  const showPv = v => {
    document.querySelectorAll('#proposals [data-pv]').forEach(el => { el.hidden = !el.dataset.pv.split(' ').includes(v) })
    $('#proposals').dataset.pvOn = v   // version-only styles (style.css: version 3's year-only buttons)
    pvNow = v
    // each chart drawn the first time its version is shown, so it measures its real width
    if (v === '2' && !oddsDrawn) { oddsDrawn = true; link = evidence({ published, nulls }) }
    if (v === '2' && !cutsDrawn) { cutsDrawn = true; cutoffs({ nulls }) }
    if (v === '3' && !starsDrawn) { starsDrawn = true; drawConstellation($('#pvChartConst'), oddsRows({ published, nulls }), { trials: nulls._n_trials }) }
    lightUp()   // lit in version 2 only
    fitPic()
    document.querySelectorAll('.pv-version button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)))
  }
  const pvAsked = new URLSearchParams(location.search).get('pv')
  showPv(pvAsked === '2' || pvAsked === '3' ? pvAsked : '1')
  $('.pv-version').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) showPv(b.dataset.v) })
}

main().catch(showLoadError)
