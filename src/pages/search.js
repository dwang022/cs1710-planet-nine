// The search, page 1: where the telescopes have looked, the searches so far, and
// a game in which the reader searches for the planet. Every number in the copy is
// computed here from the data (the [data-n] spans in search/how.html).

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError, url } from '../data.js'
import { DEEP_MAG, skyThumb } from '../charts/skymap.js'
import { drawSkySearch, STEPS, magColour, MAG_DOMAIN } from '../charts/skysearch.js'
import { PICK } from '../charts/field.js'
import { drawSearchSteps } from '../charts/searchsteps.js'
import { brightnessModel } from '../charts/placeplanet.js'
import { drawBlinkHunt } from '../charts/blinkhunt.js'
import { scrolly, scrollyProgress } from '../scrolly.js'

const $ = s => document.querySelector(s)
/** A superscript citation to the paper's entry on the credits page. */
const cite = (slug, n) => `<sup class="cite"><a href="${url('credits.html#cite-' + slug)}">${n}</a></sup>`

// Plain names for the map's chips and cards; the data file keeps the formal ones.
const SHORT = {
  ps1: 'Pan-STARRS1', css: 'Catalina Sky Survey', ztf: 'Zwicky Transient Facility', des: 'Dark Energy Survey',
  ossos: 'OSSOS', hsc_ssp: 'Subaru (HSC)', wise: 'WISE', iras_akari: 'IRAS and AKARI', lsst: 'Rubin Observatory',
}

async function main () {
  const { surveys: sv, p9_sky_track: SKY, planet_nine_predictions: PREDICTIONS, field_timeline: FIELD, papers: PAPERS, planets: PLANETS } =
    await loadData('surveys', 'p9_sky_track', 'planet_nine_predictions', 'field_timeline', 'papers', 'planets')
  // Surveys carry no colour of their own: the map shades them by depth, and only Rubin (what comes next) is pink.
  const SURVEYS = sv.surveys.map(s => ({ ...s, short: SHORT[s.id] || s.name }))

  // --- the photographed sky: three stages on one pinned picture (charts/skysearch.js) ------------------------
  // Two planets on the 2021 best-fit orbit (the one the sky path traces), both inside that fit's published ranges:
  // its median mass with Neptune's albedo (the model the search papers use), and its 1-sigma lower mass with the
  // paper's lowest albedo, the faintest planet the fit allows. Brightness follows brightnessModel
  // (charts/placeplanet.js). The reader does not choose between them: the ruler shows both ranges at once.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const model = brightnessModel(PREDICTIONS.physical_properties.brightness_model)
  const fit = PREDICTIONS.orbit_predictions.find(p => p.is_default)
  const TESTED = {
    fit: { label: 'best fit', mass: fit.mass_earths, albedo: model.albedo },
    faint: { label: 'faintest allowed', mass: +(fit.mass_earths + fit.mass_earths_err[0]).toFixed(1), albedo: fit.albedo_range[0] },
  }
  // the share of its orbit, by time, a planet spends fainter than a limit: each point of the orbit counts by the
  // time spent there (uniform steps in mean anomaly), since where on it the planet is now is unknown
  const hiddenShare = (p, limit = model.limitV) => {
    const n = 720; let k = 0
    for (let j = 0; j < n; j++) {
      const M = 2 * Math.PI * (j + 0.5) / n; let E = M
      for (let it = 0; it < 30; it++) E -= (E - fit.e * Math.sin(E) - M) / (1 - fit.e * Math.cos(E))
      if (p.magnitude(fit.a_au * (1 - fit.e * Math.cos(E))) > limit) k++
    }
    return k / n
  }
  for (const p of Object.values(TESTED)) { p.magnitude = r => model.magnitude(p.mass, r, p.albedo); p.hidden = limit => hiddenShare(p, limit) }
  const nomPts = SKY.tracks.find(t => t.label === 'nominal').points
  const rMin = d3.min(nomPts, p => p.r_au), rMax = d3.max(nomPts, p => p.r_au)

  const chipSurveys = SURVEYS.filter(s => s.wavelength === 'optical' && s.ra_ranges && s.dec_range && s.footprint_area_verified !== false && s.depth_mag != null)
  const card = $('#skyCard')
  function closeCard () { card.hidden = true; card.innerHTML = '' }
  function openSurvey (s) {
    const V = TESTED.fit
    const deepFor = s.depth_mag >= V.magnitude(rMax) ? 'Its photos could show the planet all along the path' : s.depth_mag >= V.magnitude(rMin) ? 'Its photos could show the planet only where it is brightest' : 'Its photos are too shallow to show the planet'
    card.hidden = false
    card.innerHTML = `<button type="button" class="pick-close" aria-label="Close">×</button>
      <div class="pick-name">${s.short}</div>
      <dl><dt>photos reach</dt><dd>magnitude ${s.depth_mag}</dd><dt>years</dt><dd>${s.years[0]}–${s.years[1]}</dd>
        ${s.area_sq_deg ? `<dt>sky covered</dt><dd>${Math.max(1, Math.round(100 * s.area_sq_deg / 41253))}%</dd>` : ''}</dl>
      <p class="sky-verdict">${deepFor}</p>`
    card.querySelector('.pick-close').addEventListener('click', () => pickSurvey(null))
  }
  // one survey at a time: its area outlined on the map, its card open, its button pressed (a button or its area)
  let survey = null
  function pickSurvey (id) {
    survey = id
    $('#surveyChips').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.id === survey)))
    sky.survey(survey)
    const s = SURVEYS.find(v => v.id === survey)
    if (s) openSurvey(s); else closeCard()
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) pickSurvey(null) })

  // the real searches, as stops on the ruler: each paper's own limit; Rubin's is its single-photo depth
  const X = PREDICTIONS.search_exclusions, lsst0 = SURVEYS.find(v => v.future)
  const STOPS = [
    { name: 'ZTF', mag: X.ztf_2022.depth_V },
    { name: 'Pan-STARRS1', mag: X.ps1_2024_cumulative.depth_V },
    ...(lsst0 ? [{ name: 'Rubin', mag: lsst0.depth_mag, cls: 'is-rubin' }] : []),
  ]
  const sky = drawSkySearch($('#skySearch'), { surveys: SURVEYS, track: SKY, planets: TESTED, limitV: model.limitV, stops: STOPS, onPick: s => pickSurvey(survey === s.id ? null : s.id) })

  // the key above the picture: what each mark on screen means, new items easing in. The magnitude ramp is drawn with
  // the same scale as both maps, its numbers under it.
  const rampKey = () => {
    const [m0, m1] = MAG_DOMAIN, w = 130
    const stops = d3.range(0, 1.001, 0.1).map(t => `<stop offset="${t}" stop-color="${magColour(m0 + t * (m1 - m0))}"/>`).join('')
    const ticks = [20, 22, 24, 26].map(m => `<text x="${((m - m0) / (m1 - m0) * w).toFixed(1)}" y="25">${m}</text>`).join('')
    return `<span>photos reach magnitude</span><svg class="mag-key" viewBox="-8 0 ${w + 16} 28" style="width:${w + 16}px;height:28px" aria-hidden="true">
      <defs><linearGradient id="mag-ramp">${stops}</linearGradient></defs>
      <rect x="0" y="1" width="${w}" height="10" rx="2" fill="url(#mag-ramp)"/>${ticks}</svg>`
  }
  const ln = (bg, h = 3, extra = '') => `<span class="legend-line" style="background:${bg};height:${h}px;${extra}"></span>`
  let keyShown = new Set()
  // only what is not named on the picture itself: the patch, the planets' line, the Milky Way and Rubin carry labels
  function renderKey (step) {
    const at = i => STEPS.indexOf(step) >= STEPS.indexOf(i)
    const items = []
    if (at('path')) items.push(`${ln('var(--p9)')}<span>predicted path</span>`, `${ln('var(--p9)', 1, 'opacity:.6')}<span>other orbits the fit allows</span>`)
    if (at('deep')) items.push(rampKey(), `${ln('#ffffff', 5)}<span>seen</span>`, `${ln('#ffc7ad', 5)}<span>maybe</span>`, `${ln('var(--series-2)', 5)}<span>missed</span>`)
    $('#skyLegend').innerHTML = items.map(i => `<div class="legend-item${keyShown.has(i) ? '' : ' is-new'}">${i}</div>`).join('')
    keyShown = new Set(items)
  }
  function onSkyStep (step) {
    sky.step(step)
    renderKey(step)
    // the survey buttons come with the surveys; Rubin's with Rubin
    const chips = $('#surveyChips'), on = STEPS.indexOf(step) >= STEPS.indexOf('deep')
    chips.classList.toggle('is-shown', on)
    chips.inert = !on
    chips.querySelectorAll('.chip[data-future]').forEach(c => { c.hidden = step !== 'left' })
    if (!on || (survey && SURVEYS.find(v => v.id === survey)?.future && step !== 'left')) pickSurvey(null)
    // with less motion the sphere is either whole or unrolled, never in between
    if (reduceMotion.matches) sky.morph(STEPS.indexOf(step) >= 1 ? 1 : 0)
  }
  $('#surveyChips').innerHTML = chipSurveys.map(s =>
    `<button class="chip" data-id="${s.id}"${s.future ? ' data-future hidden' : ''} aria-pressed="false">${s.future ? '<span class="dot" style="background:var(--series-4)"></span>' : ''}${s.short}</button>`).join('')
  $('#surveyChips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return
    pickSurvey(survey === b.dataset.id ? null : b.dataset.id)
  })

  // --- numbers quoted in the text ----------------------------------------------------------
  const SKY_SQ_DEG = 41253
  const optical = SURVEYS.filter(v => v.wavelength === 'optical' && !v.future && v.depth_mag != null)
  const deepSurveys = optical.filter(v => v.depth_mag >= DEEP_MAG && v.area_sq_deg && v.footprint_area_verified !== false)
  const deepArea = d3.sum(deepSurveys, v => v.area_sq_deg)
  const ruled = PREDICTIONS.search_exclusions.ps1_2024_cumulative.fraction_excluded
  const lsst = SURVEYS.find(v => v.future)
  const A = TESTED.fit
  const nums = {
    deepPct: Math.round(100 * deepArea / SKY_SQ_DEG),
    deepMag: DEEP_MAG,
    ruledPct: Math.round(100 * ruled),
    limitV: model.limitV, bHidden: Math.round(100 * hiddenShare(TESTED.faint)),
    aHidden: Math.round(100 * hiddenShare(A)),
    lsstMag: lsst?.depth_mag, lsstStart: lsst?.years[0], lsstEnd: lsst?.years[1],
  }
  const html = {
    rubinLine: lsst && lsst.depth_mag >= TESTED.faint.magnitude(rMax)
      ? `Its photos reach magnitude ${lsst.depth_mag}, deep enough for the whole path.`
      : `Its photos reach magnitude ${lsst.depth_mag}, deep enough for most of the path.`,
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })
  document.querySelectorAll('[data-n-html]').forEach(el => { el.innerHTML = html[el.dataset.nHtml] ?? '—' })

  // --- the head: three small drawings from the same data ----------------------------------
  // the predictions as a ring: the share ruled out grey, what is left in the planet's colour, the planet inside
  const ring = f => {
    const R = 36, c = 50, a = 2 * Math.PI * f
    const pt = t => [c + R * Math.sin(t), c - R * Math.cos(t)]
    const arc = (t0, t1, stroke, w) => `<path d="M${pt(t0).join(',')} A${R},${R} 0 ${t1 - t0 > Math.PI ? 1 : 0} 1 ${pt(t1).join(',')}" fill="none" stroke="${stroke}" stroke-width="${w}"/>`
    return `<svg class="art" viewBox="0 0 100 100" aria-hidden="true">${arc(0, a, 'var(--surface-3)', 10)}${arc(a, 2 * Math.PI - 0.001, 'var(--p9)', 10)}
      <use href="#art-planet-nine" x="32" y="32" width="36" height="36"/></svg>`
  }
  $('#beatSky').insertAdjacentHTML('afterbegin', skyThumb(SURVEYS, SKY, { show: 'deep' }))
  // the path, its stretches where the best fit is fainter than the searches' limit in ember (the same rule as the beat)
  $('#beatPath').insertAdjacentHTML('afterbegin', skyThumb(SURVEYS, SKY, { show: 'path', mark: p => A.magnitude(p.r_au) > model.limitV }))
  $('#beatSearch').insertAdjacentHTML('afterbegin', ring(ruled))

  // the story: each card sets the scene; between the first two the sphere unrolls with the scroll
  // Layout (desktop): the picture is pinned just under the nav at its own height, rather than centred in a
  // screen-tall box, so it starts right under the heading. Cards are read where the panels' middle is: the first card
  // is set level with the panels (its step keeps room below it, so the second card arrives only after some scrolling),
  // and the line that switches steps runs through the panels' middle. Phones keep the framework's own layout (the
  // picture across the top, cards read low on the screen). Re-measured whenever the picture or the first card resizes.
  const story = $('#skyStory'), graphic = story.querySelector('.scrolly-graphic')
  const stepEls = [...story.querySelectorAll('.step')], firstCard = stepEls[0].querySelector('.step-card')
  const narrowQ = window.matchMedia('(max-width: 900px)')
  let lineFrac = 0.5
  function layoutStory () {
    if (narrowQ.matches) {
      for (const p of ['--ss-first-pad', '--ss-first-h', '--ss-pin', '--ss-drop']) story.style.removeProperty(p)
      lineFrac = 0.75
      return
    }
    // Where the picture pins: in the middle of the screen below the nav (never higher than just under it), so the
    // group sits in the centre of the view rather than in a strip at the top. The gap under the heading is then set so
    // that, when the heading reaches the top of the screen, the picture is exactly at that place: it neither jumps
    // when it starts to pin nor leaves the first card behind.
    const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 72
    const gh = graphic.offsetHeight
    const pinTop = Math.round(Math.max(bar + 16, (window.innerHeight + bar - gh) / 2))
    const drop = parseFloat(story.style.getPropertyValue('--ss-drop')) || 0
    const head = document.querySelector('#sky .sec-head')
    const base = story.getBoundingClientRect().top - head.getBoundingClientRect().top - drop
    story.style.setProperty('--ss-pin', `${pinTop}px`)
    story.style.setProperty('--ss-drop', `${Math.max(0, Math.round(pinTop - (bar + 12) - base))}px`)
    const ss = $('#skySearch'), a = ss.querySelector('.ss-a')
    const mid = ss.offsetTop + a.offsetTop + a.offsetHeight / 2        // the panels' middle, from the picture's top
    story.style.setProperty('--ss-first-pad', `${Math.max(0, Math.round(mid - firstCard.offsetHeight / 2))}px`)
    story.style.setProperty('--ss-first-h', `${Math.round(graphic.offsetHeight)}px`)
    lineFrac = (pinTop + mid) / window.innerHeight
  }
  layoutStory()
  new ResizeObserver(layoutStory).observe(graphic)
  new ResizeObserver(layoutStory).observe(firstCard)
  window.addEventListener('resize', layoutStory)
  narrowQ.addEventListener('change', layoutStory)
  scrolly(story, { onStep: (i, step) => onSkyStep(step), line: () => lineFrac })
  // The sphere unrolls as the second card rises toward the line: flat once that card reaches it (the moment its
  // step switches on), whole while the card is still more than 45% of a screen below it, so it is always whole when
  // the reader arrives and the first card is the one being read.
  scrollyProgress(story, () => {
    if (reduceMotion.matches) return
    const d = stepEls[1].getBoundingClientRect().top - window.innerHeight * lineFrac
    sky.morph(1 - Math.max(0, Math.min(1, d / (0.45 * window.innerHeight))))
  })

  // --- the searches so far -----------------------------------------------------------------------
  // One milestone at a time along a line of years (charts/searchsteps.js), every card one design, so no key.
  drawSearchSteps($('#searchLedger'), { timeline: FIELD, papers: PAPERS.papers, filter: PICK.searches })

  // --- Spot Planet Nine (charts/blinkhunt.js) -------------------------------------------------------------------
  // The reader searches as the real searches do: spot the slow mover among stars, asteroids and glitches, then work
  // out how far the find is from its shift and how big from its brightness. What the find turns out to be is drawn
  // from the prediction: a distance on the best-fit orbit, a mass inside the fit's range, the papers' width rule.
  const neptune = PLANETS.planets.find(p => p.name === 'Neptune')
  drawBlinkHunt($('#spotGame'), {
    rRange: [rMin, rMax],
    massRange: [fit.mass_earths + fit.mass_earths_err[0], fit.mass_earths + fit.mass_earths_err[1]],
    widthOf: m => model.radius(m),
    periodYears: Math.pow(fit.a_au, 1.5),
    neptuneAu: neptune.a,
    neptuneWidth: neptune.radius_km / PLANETS.planets.find(p => p.name === 'Earth').radius_km,
  })
}

main().catch(showLoadError)
