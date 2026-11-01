// The search, page 1: where the telescopes have looked, the searches so far, and
// a planet the reader can place against them. Every number in the copy is
// computed here from the data (the [data-n] spans in search/how.html).

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError, url } from '../data.js'
import { drawSkyMap, depthColour, deepestAt, galacticPoint, eclipticPoint, DEEP_MAG, skyThumb } from '../charts/skymap.js'
import { drawField, PICK } from '../charts/field.js'
import { drawPlacement, scorePlanet, brightnessModel } from '../charts/placeplanet.js'
import { scrolly } from '../scrolly.js'
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
  const { etnos, surveys: sv, p9_sky_track: SKY, etno_perihelion_sky: peri, planet_nine_predictions: PREDICTIONS, field_timeline: FIELD, papers: PAPERS, planets: PLANETS } =
    await loadData('etnos', 'surveys', 'p9_sky_track', 'etno_perihelion_sky', 'planet_nine_predictions', 'field_timeline', 'papers', 'planets')
  // Surveys carry no colour of their own: the map shades them by depth, and only Rubin (what comes next) is rose.
  const SURVEYS = sv.surveys.map(s => ({ ...s, short: SHORT[s.id] || s.name }))
  const PERIHELIA = peri.objects
  const sample = STRICT
  const objs = withAlignment(selected(etnos, sample))
  const visibleIds = new Set(objs.map(o => o.id))
  let story = 'sky', survey = null

  // --- the sky map -----------------------------------------------------------------------
  function skyScene (step) {
    const at = (ra, dec, text, o = {}) => ({ ra, dec, text, ...o })
    const [eRa, eDec] = eclipticPoint(150)
    const [gRa, gDec] = galacticPoint(150, 0)
    // The legend names the predicted path; the map labels only what the cards introduce.
    const ecl = at(eRa, eDec, 'ecliptic', { dy: 24, colour: 'var(--text-secondary)', size: 14 })
    const mw = at(gRa, gDec, 'Milky Way', { dy: -18, colour: '#dcc48a', size: 16 })
    const des = at(15, -52, 'Dark Energy Survey', { colour: '#ece6d8', size: 14 })
    const hsc = at(180, 19, 'Subaru (HSC)', { dy: -16, colour: '#ece6d8', size: 14 })
    const lsst = at(110, -40, 'Rubin Observatory', { colour: 'var(--series-4-ink)', size: 15 })
    const off = { surveys: 'none', track: false, unsearched: false, milky: false, perihelia: false, future: false, notes: [] }
    const scenes = {
      sky: { notes: [ecl] },
      track: { track: true, notes: [ecl] },
      coverage: { surveys: 'coverage', track: true },
      depth: { surveys: 'depth', track: true },
      deep: { surveys: 'deep', track: true, notes: [des, hsc] },
      unsearched: { surveys: 'deep', track: true, unsearched: true },
      milky: { surveys: 'depth', track: true, unsearched: true, milky: true, notes: [mw] },
      future: { surveys: 'depth', track: true, unsearched: true, milky: true, future: true, notes: [lsst] },
      explore: { surveys: 'depth', track: true, unsearched: true, milky: true, perihelia: true },
    }
    return { ...off, ...scenes[step] }
  }
  // Each label is its own span: the legend items are flex rows, and site.js wraps "Planet Nine" in a
  // span of its own, which would otherwise become a separate flex item with a gap after it.
  const briefOnly = PERIHELIA.some(d => visibleIds.has(d.id) && !d.well_determined)
  function renderSkyLegend (L) {
    const sw = (bg, extra = '') => `<span class="legend-swatch" style="background:${bg};${extra}"></span>`
    const ramp = `linear-gradient(90deg, ${d3.range(0, 1.01, 0.1).map(t => depthColour(20 + t * 6)).join(',')})`
    const items = []
    if (L.track) items.push(`${sw('var(--p9)')}<span>Planet Nine’s predicted path</span>`)
    if (L.surveys === 'coverage') items.push(`${sw('#4a4852')}<span>photographed by a sky survey</span>`)
    if (L.surveys === 'depth' || L.surveys === 'deep') items.push(`<span>shallow photos</span><span class="depth-ramp" style="background:${ramp}"></span><span>deep</span>`)
    if (L.unsearched) items.push(`${sw('var(--series-2)')}<span>path not yet searched deeply</span>`)
    if (L.milky) items.push(`${sw('#dcc48a')}<span>Milky Way</span>`)
    if (L.future) items.push(`${sw('transparent', 'border:2px dashed var(--series-4)')}<span>Rubin Observatory</span>`)
    if (L.perihelia) items.push(`${sw('var(--series-1)', 'border-radius:50%')}<span>direction each object points</span>`)
    if (L.perihelia && briefOnly) items.push(`${sw('var(--series-1)', 'border-radius:50%;opacity:.4')}<span>seen in one season only</span>`)
    $('#skyLegend').innerHTML = items.map(i => `<div class="legend-item">${i}</div>`).join('')
  }
  function renderSky () {
    const scene = skyScene(story)
    drawSkyMap($('#chartSky'), { surveys: SURVEYS, track: SKY, perihelia: PERIHELIA, activeSurvey: story === 'explore' ? survey : null, visibleIds, scene })
    renderSkyLegend(scene)
    $('#surveyChips').hidden = story !== 'explore'
  }
  // Only surveys the map actually draws get a chip (OSSOS has no verified footprint).
  $('#surveyChips').innerHTML = SURVEYS.filter(s => s.dec_range && s.ra_ranges && s.footprint_area_verified !== false).map(s =>
    `<button class="chip" data-id="${s.id}" aria-pressed="false">${s.future ? '<span class="dot" style="background:var(--series-4)"></span>' : ''}${s.short}</button>`).join('')
  $('#surveyChips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return
    survey = survey === b.dataset.id ? null : b.dataset.id
    $('#surveyChips').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.id === survey)))
    renderSky()
  })

  // --- numbers quoted in the text ----------------------------------------------------------
  const SKY_SQ_DEG = 41253
  const optical = SURVEYS.filter(v => v.wavelength === 'optical' && !v.future && v.depth_mag != null)
  const deepSurveys = optical.filter(v => v.depth_mag >= DEEP_MAG && v.area_sq_deg && v.footprint_area_verified !== false)
  const deepArea = d3.sum(deepSurveys, v => v.area_sq_deg)
  const nom = SKY.tracks.find(t => t.label === 'nominal').points
  const thin = nom.filter(pt => { const d = deepestAt(SURVEYS, pt.ra_deg, pt.dec_deg); return d === null || d < DEEP_MAG })
  const rubin = thin.filter(pt => (deepestAt(SURVEYS, pt.ra_deg, pt.dec_deg, { includeFuture: true }) ?? 0) >= DEEP_MAG)
  const V = PREDICTIONS.physical_properties.apparent_V_mag
  const ruled = PREDICTIONS.search_exclusions.ps1_2024_cumulative.fraction_excluded
  const nums = {
    deepPct: Math.round(100 * deepArea / SKY_SQ_DEG),
    thinPct: Math.round(100 * thin.length / nom.length),
    lsstPct: Math.round(100 * rubin.length / Math.max(1, thin.length)),
    ruledPct: Math.round(100 * ruled),
    deepN: word(deepSurveys.length),
    deepMag: DEEP_MAG,
    vMin: V.min, vMax: V.max,
    // the deepest any survey covering more than half the sky reaches
    wideDepth: d3.max(optical.filter(v => (v.area_sq_deg ?? 0) > SKY_SQ_DEG / 2), v => v.depth_mag),
    lsstMag: SURVEYS.find(v => v.future)?.depth_mag,
    lsstStart: SURVEYS.find(v => v.future)?.years[0],
    lsstEnd: SURVEYS.find(v => v.future)?.years[1],
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })

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
  $('#beatPath').insertAdjacentHTML('afterbegin', skyThumb(SURVEYS, SKY, { show: 'path' }))
  $('#beatSearch').insertAdjacentHTML('afterbegin', ring(ruled))

  renderSky()
  scrolly($('#skyStory'), { onStep: (i, step) => { story = step; renderSky() } })
  // phones get a cropped map with heavier marks; redraw when the screen crosses over
  window.matchMedia('(max-width: 700px)').addEventListener('change', renderSky)

  // --- the searches so far -----------------------------------------------------------------------
  // The key lists only the lanes these rows use (a search's finders may hang a for or against reading off it).
  const used = new Set(FIELD.entries.filter(PICK.searches).flatMap(e => [e.lane, e.branch?.side]))
  drawField($('#searchLedger'), { timeline: FIELD, papers: PAPERS.papers, legend: $('#searchLegend'), filter: PICK.searches, future: false, lanes: ['data', 'for', 'against'].filter(l => used.has(l)) })

  // --- put a planet out there -----------------------------------------------------------------------
  const model = brightnessModel(PREDICTIONS.physical_properties.brightness_model)
  // Two starting points, both read from the data: the 2021 fit (Figure 8 medians), rounded to the dials'
  // steps, and the 2024 update after the searches, which moved only the distance, stretch and mass.
  const fit = PREDICTIONS.orbit_predictions.find(p => p.is_default)
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
}

main().catch(showLoadError)
