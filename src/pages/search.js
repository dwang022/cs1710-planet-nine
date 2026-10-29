// Part 3, page 1: where the telescopes have looked, the searches so far, and
// a planet the reader can place against them.

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawSkyMap, depthColour, deepestAt, galacticPoint, eclipticPoint } from '../charts/skymap.js'
import { drawField, PICK } from '../charts/field.js'
import { drawPlacement, scorePlanet, physicalProperties } from '../charts/placeplanet.js'
import { scrolly } from '../scrolly.js'
import { resultant } from '../stats.js'
import { PLANET_NINE, semiLatusRectum } from '../orbits.js'
import { loadSample, selected, withAlignment } from '../sample.js'

const $ = s => document.querySelector(s)
const fmt = d3.format(',.0f')
const PLANET_DEFAULTS = { a: 460, e: 0.30, i: 16, varpi: 247, node: 97, mass: 6.9, albedo: 0.4 }

async function main () {
  const { etnos, surveys: sv, p9_sky_track: SKY, etno_perihelion_sky: peri, planet_nine_predictions: PREDICTIONS, field_timeline: FIELD, papers: PAPERS } =
    await loadData('etnos', 'surveys', 'p9_sky_track', 'etno_perihelion_sky', 'planet_nine_predictions', 'field_timeline', 'papers')
  const SURVEYS = sv.surveys
  const PERIHELIA = peri.objects
  const objs = withAlignment(selected(etnos, loadSample()))
  const visibleIds = new Set(objs.map(o => o.id))
  let story = 'sky', survey = null

  // --- the sky map -----------------------------------------------------------------------
  function skyScene (step) {
    const nom = SKY.tracks.find(t => t.label === 'nominal').points
    const at = (ra, dec, text, o = {}) => ({ ra, dec, text, ...o })
    const [eRa, eDec] = eclipticPoint(150)
    const [gRa, gDec] = galacticPoint(150, 0)
    const tp = nom[Math.floor(nom.length * 0.62)]
    const ecl = at(eRa, eDec, 'the ecliptic: where the planets travel', { dy: 24, colour: 'var(--text-secondary)', size: 14 })
    const trk = at(tp.ra_deg, tp.dec_deg, 'Planet Nine’s predicted path', { dy: -18, colour: '#5cc79c', size: 16 })
    const mw = at(gRa, gDec, 'Milky Way', { dy: -18, colour: '#e8dcc0', size: 16 })
    const des = at(15, -52, 'Dark Energy Survey', { colour: '#cfeef5', size: 14 })
    const hsc = at(180, 19, 'Subaru (HSC)', { dy: -16, colour: '#cfeef5', size: 14 })
    const lsst = at(110, -40, 'Rubin Observatory, 2026–2036', { colour: '#F08BB4', size: 15 })
    const off = { surveys: 'none', track: false, unsearched: false, milky: false, perihelia: false, future: false, notes: [] }
    const scenes = {
      sky: { notes: [ecl] },
      track: { track: true, notes: [ecl, trk] },
      coverage: { surveys: 'coverage', track: true, notes: [trk] },
      depth: { surveys: 'depth', track: true },
      deep: { surveys: 'deep', track: true, notes: [des, hsc] },
      unsearched: { surveys: 'deep', track: true, unsearched: true },
      milky: { surveys: 'depth', track: true, unsearched: true, milky: true, notes: [mw] },
      future: { surveys: 'depth', track: true, unsearched: true, milky: true, future: true, notes: [lsst] },
      explore: { surveys: 'depth', track: true, unsearched: true, milky: true, perihelia: true },
    }
    return { ...off, ...scenes[step] }
  }
  function renderSkyLegend (L) {
    const sw = (bg, extra = '') => `<span class="legend-swatch" style="background:${bg};${extra}"></span>`
    const ramp = `linear-gradient(90deg, ${d3.range(0, 1.01, 0.1).map(t => depthColour(20 + t * 6)).join(',')})`
    const items = []
    if (L.track) items.push(`${sw('var(--series-3)')}Planet Nine’s predicted path`)
    if (L.surveys === 'coverage') items.push(`${sw('#556b77')}photographed by a sky survey`)
    if (L.surveys === 'depth' || L.surveys === 'deep') items.push(`<span style="width:110px;height:11px;border-radius:3px;background:${ramp};border:1px solid var(--rule)"></span> how faint the photos reach: shallow → <b style="color:#8fd3e2">deep</b>`)
    if (L.unsearched) items.push(`${sw('var(--series-2)')}path not yet searched deeply`)
    if (L.milky) items.push(`${sw('#e8dcc0')}Milky Way`)
    if (L.future) items.push(`${sw('transparent', 'border:2px dashed #F08BB4')}Rubin Observatory (2026–2036)`)
    if (L.perihelia) items.push(`${sw('var(--series-1)', 'border-radius:50%')}direction each object points`)
    $('#skyLegend').innerHTML = items.map(i => `<div class="legend-item">${i}</div>`).join('')
  }
  function renderSky () {
    const scene = skyScene(story)
    drawSkyMap($('#chartSky'), { surveys: SURVEYS, track: SKY, perihelia: PERIHELIA, activeSurvey: story === 'explore' ? survey : null, visibleIds, scene })
    renderSkyLegend(scene)
    $('#surveyChips').hidden = story !== 'explore'
  }
  $('#surveyChips').innerHTML = SURVEYS.filter(s => s.dec_range).map(s =>
    `<button class="chip" data-id="${s.id}" aria-pressed="false"><span class="dot" style="background:${s.color_hex}"></span>${s.name}</button>`).join('')
  $('#surveyChips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return
    survey = survey === b.dataset.id ? null : b.dataset.id
    $('#surveyChips').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.id === survey)))
    renderSky()
  })

  // --- numbers quoted in the text ----------------------------------------------------------
  const SKY_SQ_DEG = 41253
  const deepArea = d3.sum(SURVEYS.filter(v => v.wavelength === 'optical' && !v.future && (v.depth_mag ?? 0) >= 23.5 && v.area_sq_deg), v => v.area_sq_deg)
  const nom = SKY.tracks.find(t => t.label === 'nominal').points
  const thin = nom.filter(pt => { const d = deepestAt(SURVEYS, pt.ra_deg, pt.dec_deg); return d === null || d < 23.5 })
  const rubin = thin.filter(pt => (deepestAt(SURVEYS, pt.ra_deg, pt.dec_deg, { includeFuture: true }) ?? 0) >= 23.5)
  const nums = {
    deepPct: Math.round(100 * deepArea / SKY_SQ_DEG),
    thinPct: Math.round(100 * thin.length / nom.length),
    lsstPct: Math.round(100 * rubin.length / Math.max(1, thin.length)),
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })

  const ex = PREDICTIONS.search_exclusions
  const done = ex.ps1_2024_cumulative.fraction_excluded
  $('#searchStats').innerHTML = [
    ['Of the places the prediction allows…', `${Math.round(done * 100)}%`, 'already searched and ruled out'],
    ['…leaving', `${Math.round((1 - done) * 100)}%`, 'the faint end, much of it near the Milky Way'],
    ['Deepest search so far', `V ${ex.ps1_2024_cumulative.depth_V}`, 'Pan-STARRS1, nothing found'],
    ['Could settle it', 'Rubin / LSST', '2026–2036: should find it or end the idea'],
  ].map(([k, v, d]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('')

  renderSky()
  scrolly($('#skyStory'), { onStep: (i, step) => { story = step; renderSky() } })

  // --- the searches so far -----------------------------------------------------------------------
  drawField($('#searchLedger'), { timeline: FIELD, papers: PAPERS.papers, legend: $('#searchLegend'), filter: PICK.searches, future: false, lanes: ['data', 'for', 'against'] })

  // --- put a planet out there -----------------------------------------------------------------------
  const planet = { ...PLANET_DEFAULTS }
  const stats = resultant(objs.map(o => o.varpi_deg))
  const reach = objs.map(o => semiLatusRectum(o.a_au, o.e)).sort(d3.ascending)
  const maxAu = Math.max(Math.max(120, (d3.quantile(reach, 0.95) || 140) * 1.18), PLANET_NINE.a_au * (1 - PLANET_NINE.e) * 1.22)
  const dials = [
    { k: 'a', label: 'Distance (average)', min: 200, max: 1200, step: 10, unit: ' AU' },
    { k: 'e', label: 'How stretched', min: 0, max: 0.8, step: 0.01, unit: '' },
    { k: 'i', label: 'Tilt', min: 0, max: 45, step: 1, unit: '°' },
    { k: 'varpi', label: 'Which way it leans', min: 0, max: 359, step: 1, unit: '°' },
    { k: 'mass', label: 'Mass', min: 1, max: 20, step: 0.1, unit: ' × Earth' },
  ]
  function renderBuildControls () {
    $('#buildControls').innerHTML = dials.map(d => `
      <div class="ctrl">
        <label for="b-${d.k}">${d.label} <b><span id="bv-${d.k}">${planet[d.k]}</span>${d.unit}</b></label>
        <input type="range" id="b-${d.k}" min="${d.min}" max="${d.max}" step="${d.step}" value="${planet[d.k]}" />
      </div>`).join('') + '<button class="btn-reset" type="button" id="buildReset">Back to the published fit</button>'
    for (const d of dials) {
      $(`#b-${d.k}`).addEventListener('input', e => {
        planet[d.k] = +e.target.value
        $(`#bv-${d.k}`).textContent = d.step < 1 ? (+e.target.value).toFixed(2) : e.target.value
        renderBuild()
      })
    }
    $('#buildReset').addEventListener('click', () => { Object.assign(planet, PLANET_DEFAULTS); renderBuildControls(); renderBuild() })
  }
  function renderBuild () {
    drawPlacement($('#chartPlace'), { objects: objs, planet, maxAu: Math.max(maxAu, planet.a * (1 + planet.e) * 0.75) })
    const { total, terms } = scorePlanet(planet, stats.meanDeg, planet.albedo, planet.mass)
    const colour = total >= 67 ? 'var(--series-3)' : total >= 34 ? 'var(--series-2)' : 'var(--text-muted)'
    $('#scoreBox').innerHTML = `
      <div class="score-head"><span class="num" style="color:${colour}">${total}</span><span class="of">/ 100: how well your planet fits the evidence</span></div>
      ${terms.map(t => `<div class="score-term">
        <div class="st-top"><span>${t.key}</span><b>${Math.round(t.score * 100)}%</b></div>
        <div class="st-bar"><i style="width:${(t.score * 100).toFixed(0)}%;background:${colour}"></i></div>
        <div class="st-detail">${t.detail}</div><div class="st-cite">${t.cite}</div></div>`).join('')}`
    const props = physicalProperties(planet.mass, planet.a * (1 + planet.e * planet.e / 2), planet.albedo)
    const yrs = Math.pow(planet.a, 1.5)
    $('#propGrid').innerHTML = [
      ['Width', `${(props.radius * 2).toFixed(1)}×`, "Earth's diameter"],
      ['Surface temperature', `${props.teff.toFixed(0)} K`, `${(props.teff - 273.15).toFixed(0)} °C: it glows with its own leftover heat`],
      ['Brightness', `V ${props.V.toFixed(1)}`, props.V > 21.5 ? 'too faint for the searches that have looked' : 'bright enough that we should have seen it'],
      ['One orbit takes', `${fmt(yrs)} yr`, 'last time it was here, humans had no cities'],
    ].map(([k, v, d]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('')
    $('#propNote').innerHTML = `<strong>Even the published best guess does not score 100.</strong> That is not a bug: searches have
      already eliminated the bright, nearby part of its range, which is why astronomers keep pushing the planet further out and fainter.
      Size and temperature are scaled from the one published model point we could verify (Linder &amp; Mordasini 2016 give a 10 Earth-mass
      planet at 700 AU a radius of 3.7 Earths and 47 K); the scaling between grid points is <strong>ours</strong>. Brightness assumes an
      albedo of 0.4, inside the 0.2 to 0.75 range Brown &amp; Batygin (2021) adopt.`
  }
  renderBuildControls(); renderBuild()
}

main().catch(showLoadError)
