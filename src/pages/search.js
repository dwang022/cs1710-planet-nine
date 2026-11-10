// The search, page 1: where the telescopes have looked, the searches so far, and
// a planet the reader can place against them. Every number in the copy is
// computed here from the data (the [data-n] spans in search/how.html).

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError, url } from '../data.js'
import { deepestAt, DEEP_MAG, skyThumb } from '../charts/skymap.js'
import { drawSkySearch, STEPS, magColour, MAG_DOMAIN, OBLIQUITY_DEG } from '../charts/skysearch.js'
import { PICK, legend } from '../charts/field.js'
import { drawSearchSteps } from '../charts/searchsteps.js'
import { drawPlacement, scorePlanet, brightnessModel } from '../charts/placeplanet.js'
import { drawHideGame } from '../charts/hideplanet.js'
import { scrolly, scrollyProgress } from '../scrolly.js'
import { resultant } from '../stats.js'
import { PLANET_NINE, semiLatusRectum } from '../orbits.js'
import { selected, withAlignment, STRICT } from '../sample.js'

const $ = s => document.querySelector(s)
const fmt = d3.format(',.0f')
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const word = n => WORDS[n] ?? String(n)
/** A superscript citation to the paper's entry on the credits page. */
const cite = (slug, n) => `<sup class="cite"><a href="${url('credits.html#cite-' + slug)}">${n}</a></sup>`

// Plain names for the map's chips and cards; the data file keeps the formal ones.
const SHORT = {
  ps1: 'Pan-STARRS1', css: 'Catalina Sky Survey', ztf: 'Zwicky Transient Facility', des: 'Dark Energy Survey',
  ossos: 'OSSOS', hsc_ssp: 'Subaru (HSC)', wise: 'WISE', iras_akari: 'IRAS and AKARI', lsst: 'Rubin Observatory',
}

async function main () {
  const { etnos, surveys: sv, p9_sky_track: SKY, planet_nine_predictions: PREDICTIONS, field_timeline: FIELD, papers: PAPERS, planets: PLANETS } =
    await loadData('etnos', 'surveys', 'p9_sky_track', 'planet_nine_predictions', 'field_timeline', 'papers', 'planets')
  // Surveys carry no colour of their own: the map shades them by depth, and only Rubin (what comes next) is pink.
  const SURVEYS = sv.surveys.map(s => ({ ...s, short: SHORT[s.id] || s.name }))
  const sample = STRICT
  const objs = withAlignment(selected(etnos, sample))

  // --- the photographed sky: three stages on one pinned picture (charts/skysearch.js) ------------------------
  // The two planets the reader can test, both on the 2021 best-fit orbit (the one the sky path traces) and both inside
  // that fit's published ranges: its median mass and Neptune's albedo (the model the search papers use), and its 1σ
  // lower mass with the paper's lowest albedo. Brightness follows brightnessModel (charts/placeplanet.js).
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const model = brightnessModel(PREDICTIONS.physical_properties.brightness_model)
  const fit = PREDICTIONS.orbit_predictions.find(p => p.is_default)
  const smallMass = +(fit.mass_earths + fit.mass_earths_err[0]).toFixed(1)
  const darkAlbedo = fit.albedo_range[0]
  const TESTED = {
    fit: { label: 'Best fit', mass: fit.mass_earths, albedo: model.albedo },
    faint: { label: 'Smaller, darker', mass: smallMass, albedo: darkAlbedo },
  }
  for (const p of Object.values(TESTED)) p.magnitude = r => model.magnitude(p.mass, r, p.albedo)
  // the share of its orbit, by time, a planet spends fainter than the searches' 50% limit: each point of the orbit
  // counts by the time spent there (uniform steps in mean anomaly), since where on it the planet is now is unknown
  const hiddenShare = p => {
    const n = 720; let k = 0
    for (let j = 0; j < n; j++) {
      const M = 2 * Math.PI * (j + 0.5) / n; let E = M
      for (let it = 0; it < 30; it++) E -= (E - fit.e * Math.sin(E) - M) / (1 - fit.e * Math.cos(E))
      if (p.magnitude(fit.a_au * (1 - fit.e * Math.cos(E))) > model.limitV) k++
    }
    return k / n
  }
  const nomPts = SKY.tracks.find(t => t.label === 'nominal').points
  const rMin = d3.min(nomPts, p => p.r_au), rMax = d3.max(nomPts, p => p.r_au)

  const chipSurveys = SURVEYS.filter(s => s.wavelength === 'optical' && s.ra_ranges && s.dec_range && s.footprint_area_verified !== false && s.depth_mag != null)
  const card = $('#skyCard')
  function closeCard () { card.hidden = true; card.innerHTML = '' }
  function openSurvey (s) {
    const V = TESTED[tested]
    const deepFor = s.depth_mag >= V.magnitude(rMax) ? 'Deep enough all along the path' : s.depth_mag >= V.magnitude(rMin) ? 'Deep enough where the planet is brightest' : 'Too shallow anywhere on the path'
    card.hidden = false
    card.innerHTML = `<button type="button" class="pick-close" aria-label="Close">×</button>
      <div class="pick-name">${s.short}</div>
      <dl><dt>reaches</dt><dd>magnitude ${s.depth_mag}</dd><dt>years</dt><dd>${s.years[0]}–${s.years[1]}</dd>
        ${s.area_sq_deg ? `<dt>sky covered</dt><dd>${Math.max(1, Math.round(100 * s.area_sq_deg / 41253))}%</dd>` : ''}</dl>
      <p class="sky-verdict">${s.future ? 'From 2026 · ' : ''}${deepFor}</p>`
    card.querySelector('.pick-close').addEventListener('click', closeCard)
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) closeCard() })

  let tested = 'fit'
  const sky = drawSkySearch($('#skySearch'), { surveys: SURVEYS, track: SKY, planets: TESTED, onPick: s => openSurvey(s) })

  // the planet being tested: a switch on the left-hand map
  $('#skyPlanetSeg').innerHTML = Object.entries(TESTED).map(([k, p]) =>
    `<button type="button" data-k="${k}" aria-pressed="${k === tested}">${p.label}</button>`).join('')
  $('#skyPlanetSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    tested = b.dataset.k
    $('#skyPlanetSeg').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
    sky.planet(tested)
    if (!card.hidden) closeCard()
  })

  // the key above the picture: what each mark on screen means, new items easing in. The magnitude ramp is drawn with
  // the same scale as both maps, its numbers under it.
  const rampKey = () => {
    const [m0, m1] = MAG_DOMAIN, w = 150
    const stops = d3.range(0, 1.001, 0.1).map(t => `<stop offset="${t}" stop-color="${magColour(m0 + t * (m1 - m0))}"/>`).join('')
    const ticks = [20, 22, 24, 26].map(m => `<text x="${((m - m0) / (m1 - m0) * w).toFixed(1)}" y="25">${m}</text>`).join('')
    return `<span>magnitude</span><span class="mag-ends">brighter</span><svg class="mag-key" viewBox="-8 0 ${w + 16} 28" style="width:${w + 16}px;height:28px" aria-hidden="true">
      <defs><linearGradient id="mag-ramp">${stops}</linearGradient></defs>
      <rect x="0" y="1" width="${w}" height="10" rx="2" fill="url(#mag-ramp)"/>${ticks}</svg><span class="mag-ends">fainter</span>`
  }
  const sw = (bg, extra = '') => `<span class="legend-swatch" style="background:${bg};${extra}"></span>`
  const ln = (bg, h = 3, extra = '') => `<span class="legend-line" style="background:${bg};height:${h}px;${extra}"></span>`
  let keyShown = new Set()
  function renderKey (step) {
    const at = i => STEPS.indexOf(step) >= STEPS.indexOf(i)
    const items = []
    if (step === 'patch' || step === 'flatten') items.push(`${sw('#ffffff40', 'border:1px solid #ffffffa0')}<span>one patch of sky</span>`)
    if (at('flatten') && !at('faint')) items.push(`${ln('#ffffffb0', 2)}<span>celestial equator</span>`)
    if (at('ecliptic')) items.push(`${ln('#8c8b83', 2)}<span>ecliptic</span>`)
    if (at('path')) items.push(`${ln('var(--p9)')}<span>predicted path</span>`, `${ln('var(--p9)', 1, 'opacity:.5')}<span>other orbits the fit allows</span>`)
    if (at('faint')) items.push(rampKey())
    if (at('deep')) items.push(`${sw('var(--sky-empty)', 'border:1px solid #ffffff38')}<span>no survey photos in our data</span>`)
    if (at('compare')) items.push(`${ln('#ffffff', 5)}<span>deep enough</span>`, `${ln('var(--series-2)', 5)}<span>too shallow</span>`)
    if (at('milky')) items.push(`${sw('#dcc48a', 'opacity:.6')}<span>Milky Way</span>`)
    if (at('rubin')) items.push(`${sw('transparent', 'border:2px dashed var(--series-4)')}<span>Rubin, to ${nums.lsstMag}</span>`)
    $('#skyLegend').innerHTML = items.map(i => `<div class="legend-item${keyShown.has(i) ? '' : ' is-new'}">${i}</div>`).join('')
    keyShown = new Set(items)
  }
  function onSkyStep (step) {
    sky.step(step)
    renderKey(step)
    const chips = $('#surveyChips')
    chips.classList.toggle('is-shown', step === 'rubin')
    chips.inert = step !== 'rubin'
    if (step !== 'rubin') { if (!card.hidden) closeCard() }
    // with less motion the sphere is either whole or unrolled, never in between
    if (reduceMotion.matches) sky.morph(STEPS.indexOf(step) >= 1 ? 1 : 0)
  }
  $('#surveyChips').innerHTML = chipSurveys.map(s =>
    `<button class="chip" data-id="${s.id}" aria-pressed="false">${s.future ? '<span class="dot" style="background:var(--series-4)"></span>' : ''}${s.short}</button>`).join('')
  let survey = null
  $('#surveyChips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return
    survey = survey === b.dataset.id ? null : b.dataset.id
    $('#surveyChips').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.id === survey)))
    sky.survey(survey)
  })

  // --- numbers quoted in the text ----------------------------------------------------------
  const SKY_SQ_DEG = 41253
  const optical = SURVEYS.filter(v => v.wavelength === 'optical' && !v.future && v.depth_mag != null)
  const deepSurveys = optical.filter(v => v.depth_mag >= DEEP_MAG && v.area_sq_deg && v.footprint_area_verified !== false)
  const deepArea = d3.sum(deepSurveys, v => v.area_sq_deg)
  const ruled = PREDICTIONS.search_exclusions.ps1_2024_cumulative.fraction_excluded
  const wide = optical.filter(v => (v.area_sq_deg ?? 0) > SKY_SQ_DEG / 2)
  const byId = id => SURVEYS.find(v => v.id === id)
  const lsst = SURVEYS.find(v => v.future)
  const f1 = v => v.toFixed(1)
  const A = TESTED.fit, B = TESTED.faint
  // is every stretch of the path photographed by some survey in visible light? (schematic outlines, said so)
  const unphotographed = nomPts.filter(p => deepestAt(SURVEYS, p.ra_deg, p.dec_deg) === null).length
  const nums = {
    deepPct: Math.round(100 * deepArea / SKY_SQ_DEG),
    deepMag: DEEP_MAG,
    ruledPct: Math.round(100 * ruled),
    tilt: OBLIQUITY_DEG.toFixed(1),
    pathLat: Math.ceil(d3.max(nomPts, p => Math.abs(p.ecl_lat_deg))),
    aMass: A.mass, aBright: f1(A.magnitude(rMin)), aFaint: f1(A.magnitude(rMax)),
    bBright: f1(B.magnitude(rMin)), bFaint: f1(B.magnitude(rMax)),
    wideLo: d3.min(wide, v => v.depth_mag), wideHi: d3.max(wide, v => v.depth_mag),
    desMag: byId('des')?.depth_mag, hscMag: byId('hsc_ssp')?.depth_mag,
    limitV: model.limitV,
    aHidden: Math.round(100 * hiddenShare(A)), bHidden: Math.round(100 * hiddenShare(B)),
    lsstMag: lsst?.depth_mag, lsstStart: lsst?.years[0], lsstEnd: lsst?.years[1],
  }
  const html = {
    coverLine: unphotographed === 0
      ? 'Every stretch of the predicted path has been photographed by at least one survey.'
      : 'Most of the predicted path has been photographed by at least one survey; <span class="k-muted">a dashed stretch</span> has not.',
    rubinLine: lsst && lsst.depth_mag >= B.magnitude(rMax)
      ? `That is fainter than either planet here ever gets, so across the part of the path in its view, <span class="k-lsst">marked on the map</span>, it could catch them.`
      : `Across the part of the path in its view, <span class="k-lsst">marked on the map</span>, it could catch the planet where it is bright enough.`,
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
  // One milestone at a time along a line of years (charts/searchsteps.js), each drawn as the ledger draws it.
  // The key lists only the lanes these rows use (a search's finders may hang a for or against reading off it).
  const searches = FIELD.entries.filter(PICK.searches)
  const used = new Set(searches.flatMap(e => [e.lane, e.branch?.side]))
  $('#searchLegend').innerHTML = legend(['data', 'for', 'against'].filter(l => used.has(l)), { key: searches.some(e => e.key) })
  drawSearchSteps($('#searchLedger'), { timeline: FIELD, papers: PAPERS.papers, filter: PICK.searches })

  // --- put a planet out there -----------------------------------------------------------------------
  // Two starting points, both read from the data: the 2021 fit (Figure 8 medians), rounded to the dials'
  // steps, and the 2024 update after the searches, which moved only the distance, stretch and mass.
  const after = PREDICTIONS.orbit_predictions.find(p => p.ref === 'brown_batygin_2024')
  const PRESETS = {
    fit: {
      a: Math.round(fit.a_au / 10) * 10, e: fit.e, i: Math.round(fit.i_deg), varpi: Math.round(fit.varpi_deg),
      node: Math.round(fit.Omega_deg), mass: fit.mass_earths,
    },
  }
  if (after) PRESETS.after = { ...PRESETS.fit, a: after.a_au, e: after.e_derived, mass: after.mass_earths }
  const neptune = PLANETS.planets.find(p => p.name === 'Neptune')
  const neptuneYears = Math.pow(neptune.a, 1.5)
  const planet = { ...PRESETS.fit }
  const stats = resultant(objs.map(o => o.varpi_deg))
  const reach = objs.map(o => semiLatusRectum(o.a_au, o.e)).sort(d3.ascending)
  const maxAu = Math.max(Math.max(120, (d3.quantile(reach, 0.95) || 140) * 1.18), PLANET_NINE.a_au * (1 - PLANET_NINE.e) * 1.22)

  $('#placeLegend').innerHTML = `
    <div class="legend-item"><i class="legend-line" style="background:var(--p9)"></i><span>your planet</span></div>
    <div class="legend-item"><i class="legend-line" style="background:var(--series-1)"></i><span>${objs.length} extreme objects${sample.quality ? ' seen in more than one season' : ''}</span></div>`

  const dials = [
    { k: 'a', label: 'Average distance', min: 200, max: 1200, step: 10, unit: ' AU', cls: 'k-au' },
    { k: 'e', label: 'How stretched', min: 0, max: 0.8, step: 0.01, unit: '' },
    { k: 'i', label: 'Tilt', min: 0, max: 45, step: 1, unit: '°' },
    { k: 'varpi', label: 'Which way it points', min: 0, max: 359, step: 1, unit: '°' },
    { k: 'mass', label: 'Mass', min: 1, max: 20, step: 0.1, unit: ' Earths' },
  ]
  const show = (d, v) => d.step < 0.1 ? (+v).toFixed(2) : d.step < 1 ? (+v).toFixed(1) : String(v)
  // the dials sit on the picture, in its bar; the two starting points are buttons at the end of it
  function renderBuildControls () {
    $('#buildControls').innerHTML = dials.map(d => `
      <label class="lbl place-dial" for="b-${d.k}"><span class="place-dial-k">${d.label} <b${d.cls ? ` class="${d.cls}"` : ''}><span id="bv-${d.k}">${show(d, planet[d.k])}</span>${d.unit}</b></span>
        <input type="range" id="b-${d.k}" min="${d.min}" max="${d.max}" step="${d.step}" value="${planet[d.k]}" /></label>`).join('') +
      `<div class="place-presets">
        <button class="pic-btn" type="button" data-preset="fit">2021 fit</button>
        ${PRESETS.after ? '<button class="pic-btn" type="button" data-preset="after">After the searches</button>' : ''}
      </div>`
    for (const d of dials) {
      $(`#b-${d.k}`).addEventListener('input', e => {
        planet[d.k] = +e.target.value
        $(`#bv-${d.k}`).textContent = show(d, e.target.value)
        renderBuild()
      })
    }
    $('#buildControls').querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
      Object.assign(planet, PRESETS[b.dataset.preset]); renderBuildControls(); renderBuild()
    }))
  }
  // the papers behind the three scores, numbered in the order they appear in this section
  const CITE_N = { 'batygin-brown-2016': 1, 'brown-batygin-2021': 2, 'brown-batygin-2024': 3, 'linder-mordasini-2016': 4 }
  function renderBuild () {
    drawPlacement($('#chartPlace'), { objects: objs, planet, maxAu: Math.max(maxAu, planet.a * (1 + planet.e) * 0.75) })
    const { total, terms } = scorePlanet(planet, stats.meanDeg, model)
    // a good fit counts for a planet (its colour), a poor one against (ember)
    const colour = total >= 67 ? 'var(--p9-ink)' : total >= 34 ? 'var(--text-primary)' : 'var(--series-2-ink)'
    $('#scoreBox').innerHTML = `
      <div class="score-head"><span class="num" style="color:${colour}">${total}</span><span class="of">fit, out of 100</span></div>
      ${terms.map(t => `<div class="score-term">
        <div class="st-top"><span>${t.key}${cite(t.cite, CITE_N[t.cite])}</span><b>${Math.round(t.score * 100)}%</b></div>
        <div class="st-bar"><i style="width:${(t.score * 100).toFixed(0)}%;background:${colour}"></i></div>
        <div class="st-detail">${t.detail}</div></div>`).join('')}`
    const yrs = Math.pow(planet.a, 1.5)
    const inGrid = planet.mass >= model.tempRange[0]
    const teff = model.teff(planet.mass)
    $('#propGrid').innerHTML = [
      ['Width', `${model.radius(planet.mass).toFixed(1)}×`, 'as wide as Earth'],
      ['Temperature', inGrid ? `${teff.toFixed(0)} K` : `under ${model.coolest} K`,
        inGrid ? `${(teff - 273.15).toFixed(0).replace('-', '−')} °C, warmed by its own leftover heat` : 'colder than the lightest model planet'],
      ['One orbit takes', `${fmt(yrs)} years`, `${fmt(yrs / neptuneYears)} times as long as Neptune’s`],
    ].map(([k, v, d]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('')
  }
  $('#propNote').innerHTML = `<strong>The 2021 fit does not score 100.</strong> The searches since have ruled out the
    brighter part of its orbit, and the papers’ estimate has moved out to
    <span class="k-au">${after ? after.a_au : '—'} AU</span>${cite('brown-batygin-2024', CITE_N['brown-batygin-2024'])}. Width and
    brightness follow the model those papers use${cite('brown-batygin-2021', CITE_N['brown-batygin-2021'])}, with Neptune’s
    albedo${cite('linder-mordasini-2016', CITE_N['linder-mordasini-2016'])}; the temperature is read from published cooling
    models${cite('linder-mordasini-2016', CITE_N['linder-mordasini-2016'])}.`
  renderBuildControls(); renderBuild()

  // --- version 2, Hide Planet Nine (charts/hideplanet.js), beside the original for comparison ---------------------
  // Its papers are numbered in the order they appear in that version.
  const HIDE_N = { 'brown-batygin-2021': 1, 'brown-batygin-2024': 2, 'batygin-brown-2016': 3, 'linder-mordasini-2016': 4 }
  const hideCite = slug => cite(slug, HIDE_N[slug])
  const bmSrc = PREDICTIONS.physical_properties.brightness_model
  const game = drawHideGame($('#hideGame'), {
    surveys: SURVEYS, track: SKY, model, fit, after,
    detection: { v94: bmSrc.detection.V_94pct, v50: bmSrc.detection.V_50pct },
    objects: objs, meanVarpi: stats.meanDeg, cite: (slug) => hideCite(slug),
  })
  $('#hideNote').innerHTML = `Brightness is an estimate for a made-up planet: sunlight reflected off it, seen from Earth
    when it is opposite the Sun, with the formula the search papers use${hideCite('brown-batygin-2021')}; it ignores the
    planet’s own faint heat. The papers expect the planet still allowed to be about magnitude
    ${after?.V_mag ?? '—'}${hideCite('brown-batygin-2024')}. Albedo is the share of sunlight a surface reflects: Neptune’s is
    ${model.albedo}${hideCite('linder-mordasini-2016')}. “Searches find half” is the combined ZTF, DES and Pan-STARRS1
    search${hideCite('brown-batygin-2024')}. Survey outlines are simplified bands, each the area its survey published, so
    read a spot’s verdict as a sketch.`

  // the version switch: ?game=1 or ?game=2, else the last one chosen here, else version 1
  const BUILD_KEY = 'p9-build-version'
  let stored = null
  try { stored = localStorage.getItem(BUILD_KEY) } catch {}
  const fromUrl = new URLSearchParams(location.search).get('game')
  function showVersion (v) {
    $('#buildV1').hidden = v !== '1'
    $('#buildV2').hidden = v !== '2'
    $('#buildVersion').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)))
    if (v === '1') renderBuild(); else game.show()
  }
  showVersion(fromUrl === '2' || fromUrl === '1' ? fromUrl : stored === '2' ? '2' : '1')
  $('#buildVersion').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    showVersion(b.dataset.v)
    try { localStorage.setItem(BUILD_KEY, b.dataset.v) } catch {}
  })
}

main().catch(showLoadError)
