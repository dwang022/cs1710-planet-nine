// How the proposal changed, version 2 (timeline page, 2026-11-10): one paper at a time. On the left a picture of
// the estimate (the Sun, a ruler out to 1,050 AU with the planet at the paper's distance and its range shaded under
// it, and a mass scale with Earth for comparison); on the right a card with the paper's numbers, what kind of paper
// it is and how it compares with the one before, and a small overview of every paper with the chosen one lit. A row
// of papers under the picture chooses; two papers in one year are two buttons.
//
// Every number is read from planet_nine_predictions.json, as version 1 (the retired charts/proposals.js) read it: a range only
// where the paper gives one (its own range, or its value with its published errors), a single value only where it
// gives one, a floor where it gives a floor. Where a paper gives only a range, the picture puts the planet at the
// middle of it and says so; the card shows the range alone. Phan et al. 2025 is a candidate sighting, not a model:
// it is drawn in ember, its distance is where the object would be now (not an average), and it is never compared as
// a revision. The planet's drawn size is illustrative (it grows a little with mass), not a radius; the page no longer
// says so (the note was cut on 2026-11-21, asked for).

import * as d3 from 'd3'
import { svgMarkup } from '../art.js'

const D = { lo: 0, hi: 1050 }       // the distance scale, AU, as version 1's
const MASS = { lo: 0, hi: 21 }      // the mass scale, Earth masses, as version 1's
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
const ms = n => reduce.matches ? 0 : n
const DUR = 520

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const short = p => p.label.replace('Batygin, Adams, Brown & Becker 2019 (review)', 'Batygin et al. 2019')
  .replace(' (observational constraints)', '').replace(' (headline values)', ', abstract')
  .replace(' (marginalized posterior)', ', full fit').replace(' (IRAS/AKARI far-IR candidate)', '').replace(' (after the searches)', '')

// what kind of paper each is, one or two plain sentences on it (from the notes in planet_nine_predictions.json), and
// the one or two phrases in those sentences lit in the part's lime (2026-11-20, asked for): exact words of the sentence,
// so the wording never changes; a phrase not found is left plain
const ABOUT = {
  batygin_brown_2016: ['First proposal', 'The founding paper. It sets a floor on the mass and gives an example orbit to show the idea works, not a fit to the data.', ['founding paper', 'example orbit']],
  brown_batygin_2016: ['Ranges from simulations', 'The same authors match many simulated planets to the observed orbits and keep the ones that work, giving wide ranges in both distance and mass.', ['simulated planets', 'wide ranges']],
  millholland_laughlin_2017: ['A different method', 'A separate team asks the objects to move in step with the planet. Its orbit points a different way from Brown and Batygin’s.', ['move in step with the planet', 'points a different way']],
  batygin_2019: ['Review', 'A review by the original authors and colleagues, with narrower ranges than the first proposal.', ['narrower ranges']],
  brown_batygin_2021_abstract: ['Fit to the observed orbits', 'A statistical fit to the observed objects that allows for where telescopes looked. These are the headline numbers from its abstract.', ['statistical fit', 'where telescopes looked']],
  brown_batygin_2021_posterior: ['Fit to the observed orbits', 'The same 2021 paper’s full fit, read from its figures. The rest of this site uses these numbers.', ['full fit']],
  brown_batygin_2024: ['Update after the searches', 'After three sky surveys ruled out much of the 2021 range, the middle of the planets still allowed.', ['ruled out much of the 2021 range']],
  phan_2025: ['Candidate sighting', 'Not a model estimate. One possible faint object in two old infrared surveys. Two sightings cannot give an orbit, so this is its distance now, and it is not a detection.', ['possible faint object', 'not a detection']],
}

// a sentence, escaped, with its key phrases wrapped for the lime (style.css, .pv-hi)
const lit = (text, phrases = []) => phrases.reduce((h, ph) => h.replace(esc(ph), `<em class="pv-hi">${esc(ph)}</em>`), esc(text))

/** A paper's numbers: the value it gives (or none), the range it gives (or none), where the picture puts it. */
function estimate (p) {
  const err = (v, e) => v != null && e ? [v + e[0], v + e[1]] : null
  const aRange = p.a_au_range || p.distance_au_range || err(p.a_au, p.a_au_err)
  const mRange = p.mass_earths_range || err(p.mass_earths, p.mass_earths_err)
  const mid = r => r ? (r[0] + r[1]) / 2 : null
  return {
    a: p.a_au ?? null, aRange, aAt: p.a_au ?? mid(aRange), aMid: p.a_au == null && !!aRange,
    m: p.mass_earths ?? null, mRange, mMin: p.mass_earths_min ?? null,
    mAt: p.mass_earths ?? mid(mRange) ?? p.mass_earths_min,
  }
}

const fmtA = v => `${Math.round(v)}`
const fmtM = v => (Math.round(v * 10) / 10).toString()
// the words for a distance and a mass, as the card writes them (also used for the comparison line)
const distWords = e => e.a != null ? `${fmtA(e.a)} AU` : e.aRange ? `${fmtA(e.aRange[0])}–${fmtA(e.aRange[1])} AU` : 'not given'
const massWords = e => e.m != null ? `${fmtM(e.m)}` : e.mRange ? `${fmtM(e.mRange[0])}–${fmtM(e.mRange[1])}` : e.mMin != null ? `at least ${fmtM(e.mMin)}` : 'not given'

// onSelect (optional, 2026-11-17): called with the chosen paper's entry from planet_nine_predictions.json each time
// the choice changes, so the timeline page's version 2 can link it to the odds chart
export function drawProposalsV2 (root, predictions, { onSelect } = {}) {
  const papers = predictions.map((p, i) => ({ ...p, i, e: estimate(p) })).filter(p => p.e.aAt != null || p.e.mAt != null)
    .sort((a, b) => a.year - b.year || a.i - b.i)
  const start = Math.max(0, papers.findIndex(p => p.is_default))
  let cur = -1

  root.innerHTML = `
    <div class="pv">
      <div class="pv-left">
        <div class="pv-pick" role="group" aria-label="Choose a paper">
          ${papers.map((p, i) => `<button type="button" class="pv-btn${p.candidate ? ' is-cand' : ''}" data-i="${i}" aria-pressed="false">
            <span class="pv-btn-y">${p.year}</span><span class="pv-btn-n">${esc(short(p).replace(/ \d{4}/, ''))}</span></button>`).join('')}
        </div>
        <div class="pv-pic card">
          <svg class="pv-svg" viewBox="0 0 640 262" role="img" aria-label="The chosen paper's estimate: its distance from the Sun on a ruler from 0 to 1,050 AU and its mass on a scale from 0 to 21 Earth masses"></svg>
        </div>
      </div>
      <div class="pv-right">
        <article class="pv-card card" aria-live="polite">
          <p class="pv-meta"><span class="pv-year"></span><span class="pv-tag"></span></p>
          <h3 class="pv-title"></h3>
          <dl class="pv-vals">
            <div><dt class="pv-dk"></dt><dd><b class="pv-big k-au"><span class="pv-n" id="pvA"></span> AU</b><span class="pv-sub" id="pvAr"></span></dd></div>
            <div><dt>Mass</dt><dd><b class="pv-big"><span class="pv-n" id="pvM"></span></b> <span class="pv-unit">Earth masses</span><span class="pv-sub" id="pvMr"></span></dd></div>
          </dl>
          <div class="pv-text"></div>
        </article>
        <div class="pv-over card">
          <svg class="pv-osvg" viewBox="0 0 340 176" role="img" aria-label="Every paper's distance and mass, earliest on the left, the chosen one lit"></svg>
        </div>
      </div>
    </div>`

  const $ = s => root.querySelector(s)
  const buttons = [...root.querySelectorAll('.pv-btn')]

  // --- the picture: the ruler, the band, the planet; the mass scale, its band, its marker, Earth for comparison
  const svg = d3.select(root).select('.pv-svg')
  const X0 = 96, X1 = 618, YD = 92, YM = 210
  const MP = 26                     // the mass scale's planet: the same drawing as above, small, centred on its value
  const xA = d3.scaleLinear().domain([D.lo, D.hi]).range([X0, X1])
  const xM = d3.scaleLinear().domain([MASS.lo, MASS.hi]).range([X0, X1])
  svg.html(`
    <text class="pv-axis-t pv-axis-d" x="${X0}" y="20">Average distance from the Sun</text>
    <g transform="translate(14,${YD - 34})">${svgMarkup('sun', { size: 68 })}</g>
    <line class="pv-axis" x1="${X0}" x2="${X1}" y1="${YD}" y2="${YD}"/>
    ${[0, 200, 400, 600, 800, 1000].map(v => `<line class="pv-tick" x1="${xA(v)}" x2="${xA(v)}" y1="${YD - 4}" y2="${YD + 4}"/><text class="pv-tl au" x="${xA(v)}" y="${YD + 22}">${v}${v === 1000 ? ' AU' : ''}</text>`).join('')}
    <rect class="pv-band pv-band-a" y="${YD - 9}" height="18" rx="9"/>
    <g class="pv-planet"><g class="pv-scale"><g class="pv-art"><svg viewBox="0 0 100 100" width="100" height="100"><use href="#art-planet-nine"/></svg></g>
      <g class="pv-cand"><circle r="26" transform="translate(50,50)"/><circle r="9" transform="translate(50,50)"/></g></g>
      <text class="pv-plabel" y="-10"></text></g>
    <g class="pv-mass"><!-- the mass scale, as one group so a page can space it (the timeline's version 3); no transform here -->
    <text class="pv-axis-t pv-axis-m" x="${X0}" y="${YM - 40}">Mass, compared with Earth</text>
    <g transform="translate(30,${YM - 20})">${svgMarkup('earth', { size: 40 })}</g>
    <text class="pv-earth" x="50" y="${YM + 36}">Earth = 1</text>
    <line class="pv-axis" x1="${X0}" x2="${X1}" y1="${YM}" y2="${YM}"/>
    ${[0, 5, 10, 15, 20].map(v => `<line class="pv-tick" x1="${xM(v)}" x2="${xM(v)}" y1="${YM - 4}" y2="${YM + 4}"/><text class="pv-tl" x="${xM(v)}" y="${YM + 22}">${v}</text>`).join('')}
    <line class="pv-one" x1="${xM(1)}" x2="${xM(1)}" y1="${YM - 10}" y2="${YM + 10}"/>
    <rect class="pv-band pv-band-m" y="${YM - 9}" height="18" rx="9"/>
    <path class="pv-open" d="M0,0 L-9,-6 L-9,6 Z"/>
    <g class="pv-mdot" transform="translate(${X0},${YM})"><g class="pv-mdot-s"><svg x="${-MP / 2}" y="${-MP / 2}" width="${MP}" height="${MP}" viewBox="0 0 100 100"><use href="#art-planet-nine"/></svg></g></g>
    <text class="pv-mlabel" y="${YM - MP / 2 - 7}"></text></g>`)
  const planet = svg.select('.pv-planet')

  // --- the overview: every paper's distance and mass as version 1 draws them, the chosen one lit
  const osvg = d3.select(root).select('.pv-osvg')
  const OX0 = 34, OX1 = 330
  const ox = d3.scalePoint().domain(papers.map((p, i) => i)).range([OX0 + 10, OX1 - 10])
  const oyA = d3.scaleLinear().domain([0, 1050]).range([72, 18])
  const oyM = d3.scaleLinear().domain([0, 21]).range([150, 100])
  osvg.html(`
    <text class="pv-ot" x="0" y="10">Distance, AU</text><text class="pv-ot" x="0" y="94">Mass, Earth masses</text>
    ${[0, 500, 1000].map(v => `<line class="pv-og" x1="${OX0}" x2="${OX1}" y1="${oyA(v)}" y2="${oyA(v)}"/><text class="pv-oy au" x="${OX0 - 5}" y="${oyA(v) + 3.5}">${v}</text>`).join('')}
    ${[0, 10, 20].map(v => `<line class="pv-og" x1="${OX0}" x2="${OX1}" y1="${oyM(v)}" y2="${oyM(v)}"/><text class="pv-oy" x="${OX0 - 5}" y="${oyM(v) + 3.5}">${v}</text>`).join('')}
    ${papers.map((p, i) => {
      const e = p.e, x = ox(i)
      const col = (y, r, at, top) => (r ? `<line class="pv-or" x1="${x}" x2="${x}" y1="${y(r[0])}" y2="${y(Math.min(y.domain()[1], r[1]))}"/>` : '') +
        (at != null ? `<circle class="pv-od" cx="${x}" cy="${y(Math.min(y.domain()[1], at))}" r="3.6"/>` : '') +
        (top ? `<line class="pv-or" x1="${x}" x2="${x}" y1="${y(top)}" y2="${y(y.domain()[1])}"/>` : '')
      return `<g class="pv-oc${p.candidate ? ' is-cand' : ''}" data-i="${i}">
        <rect class="pv-ohit" x="${x - 15}" y="12" width="30" height="160"/>
        ${col(oyA, e.aRange, e.a, null)}${col(oyM, e.mRange, e.m, e.mMin != null && !e.mRange ? e.mMin : null)}
        <text class="pv-ox" x="${x}" y="170">’${String(p.year).slice(2)}</text></g>`
    }).join('')}`)
  osvg.selectAll('.pv-oc').on('click', function () { select(+this.dataset.i) })

  // numbers that ease from what is on screen to the new value; when the shape changes (one value to a range), they
  // are written at once under the card's fade
  function nums (el, to, fmt, sep = '–') {
    const from = el.__v
    el.__v = to
    const write = v => { el.textContent = v.map(fmt).join(sep) }
    d3.select(el).interrupt('n')
    if (!from || from.length !== to.length || !ms(DUR)) return write(to)
    const i = d3.interpolateArray(from, to)
    d3.select(el).transition('n').duration(ms(DUR)).ease(d3.easeCubicInOut).tween('text', () => t => write(i(t)))
  }

  function select (i, focus = false) {
    i = Math.max(0, Math.min(papers.length - 1, i))
    if (i === cur) return
    const prev = papers[cur], p = papers[i], e = p.e
    cur = i
    buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)))
    if (focus) buttons[i].focus()
    buttons[i].scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' })
    osvg.selectAll('.pv-oc').classed('is-on', function () { return +this.dataset.i === i })

    // the first drawing is set outright; every later choice eases, retargeting from wherever a running one has got to
    const t = () => d3.transition('pv').duration(prev ? ms(DUR) : 0).ease(d3.easeCubicInOut)
    const cand = !!p.candidate
    root.querySelector('.pv').classList.toggle('is-cand', cand)
    // the distance: the band (its range, or nothing), the planet at its value or the middle of its range
    const ar = e.aRange || [e.aAt, e.aAt]
    svg.select('.pv-band-a').transition(t()).attr('x', xA(ar[0]) - (e.aRange ? 0 : 9)).attr('width', e.aRange ? xA(ar[1]) - xA(ar[0]) : 18)
      .style('opacity', e.aRange ? 1 : 0)
    // the planet's drawn size grows a little with mass: an illustration, not a radius
    const size = 34 + 4 * Math.sqrt(e.mAt ?? 6)
    planet.transition(t()).attr('transform', `translate(${xA(e.aAt)},${YD})`)
    planet.select('.pv-scale').transition(t()).attr('transform', `translate(${-size / 2},${-size / 2}) scale(${size / 100})`)
    planet.select('.pv-art').transition(t()).style('opacity', cand ? 0 : 1)
    planet.select('.pv-cand').transition(t()).style('opacity', cand ? 1 : 0)
    planet.select('.pv-plabel').attr('y', -size / 2 - 8)
      .text(cand ? 'candidate, distance now' : e.aMid ? 'middle of the range' : '')
    // the mass: its band, its value (a dot), or its floor (a band running off the scale with an arrow)
    const mr = e.mRange || (e.mMin != null ? [e.mMin, MASS.hi] : [e.mAt, e.mAt])
    const hasBand = !!(e.mRange || e.mMin != null)
    svg.select('.pv-band-m').transition(t()).attr('x', xM(mr[0]) - (hasBand ? 0 : 9)).attr('width', hasBand ? xM(Math.min(MASS.hi, mr[1])) - xM(mr[0]) : 18)
      .style('opacity', hasBand ? 1 : 0)
    svg.select('.pv-open').attr('transform', `translate(${X1 + 10},${YM})`).transition(t()).style('opacity', e.mMin != null ? 1 : 0)
    svg.select('.pv-mdot').transition(t()).attr('transform', `translate(${xM(e.mAt)},${YM})`).style('opacity', e.m != null ? 1 : 0)
    svg.select('.pv-mlabel').transition(t()).attr('x', xM(e.mMin != null ? e.mMin : e.mAt))
    svg.select('.pv-mlabel').text(e.mMin != null ? `at least ${fmtM(e.mMin)}` : e.m != null ? `${fmtM(e.m)}×` : '')
    svg.select('.pv-axis-d').text(cand ? 'Distance from the Sun now' : 'Average distance from the Sun')

    // the card
    $('.pv-year').textContent = p.year
    $('.pv-tag').textContent = ABOUT[p.ref]?.[0] || ''
    $('.pv-title').textContent = short(p)
    $('.pv-dk').textContent = cand ? 'Distance from the Sun now' : 'Average distance from the Sun'
    nums($('#pvA'), e.a != null ? [e.a] : e.aRange || [], fmtA)
    const untranscribed = /uncertainties are not transcribed/.test(p.note || '')
    $('#pvAr').textContent = e.a != null ? (e.aRange && p.a_au_err ? `range ${fmtA(e.aRange[0])}–${fmtA(e.aRange[1])} AU` : untranscribed ? 'its published range is not shown here' : 'single value, no range given') : 'range only, no single value'
    nums($('#pvM'), e.m != null ? [e.m] : e.mRange || [e.mMin], fmtM)
    root.querySelector('.pv-vals > div:last-child .pv-big').classList.toggle('is-floor', e.mMin != null)
    $('#pvMr').textContent = e.m != null ? (e.mRange ? `range ${fmtM(e.mRange[0])}–${fmtM(e.mRange[1])}` : untranscribed ? 'its published range is not shown here' : 'single value, no range given')
      : e.mMin != null ? 'at least this; no upper limit given' : 'range only, no single value'
    // what kind of paper, and how it compares with the paper before it (never for the candidate, never as a revision)
    const before = papers.slice(0, i).reverse().find(o => !o.candidate)
    const compare = cand
      ? 'A sighting to follow up, not a new estimate from a model.'
      : !before ? 'The first estimate in this list.'
        : `Compared with ${esc(short(before))}: distance ${esc(distWords(before.e))} → ${esc(distWords(e))}; mass ${esc(massWords(before.e))} → ${esc(massWords(e))} Earth masses.`
    const text = $('.pv-text')
    // the paper and how it compares, side by side on a wide card, each under a small label; the source under both
    text.innerHTML = `<div class="pv-desc"><p class="pv-k">This paper</p><p>${lit(ABOUT[p.ref]?.[1] || '', ABOUT[p.ref]?.[2])}</p></div>
      <div class="pv-cmp"><p class="pv-k">${cand ? 'How to read it' : 'Change from before'}</p><p>${compare}</p></div>
      <p class="pv-src"><a href="https://doi.org/${esc(p.doi)}" rel="noopener" target="_blank">${esc(p.label)}</a></p>`
    text.classList.remove('is-swap'); void text.offsetWidth; if (prev) text.classList.add('is-swap')
    onSelect?.(p)
  }

  root.querySelector('.pv-pick').addEventListener('click', e => { const b = e.target.closest('.pv-btn'); if (b) select(+b.dataset.i) })
  root.querySelector('.pv-pick').addEventListener('keydown', e => {
    const k = { ArrowLeft: -1, ArrowRight: 1 }[e.key]
    if (k == null && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    select(e.key === 'Home' ? 0 : e.key === 'End' ? papers.length - 1 : cur + k, true)
  })
  select(start)
  return { select }
}
