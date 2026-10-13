import * as d3 from 'd3'
import './style.css'
import { resultant, rayleighP, nullDistribution, formatP } from './stats.js'
import { PLANET_NINE, angleDiff, semiLatusRectum } from './orbits.js'
import { drawOrbits } from './charts/orbits.js'
import { drawRose } from './charts/rose.js'
import { drawNull } from './charts/nulldist.js'
import { drawSkyMap } from './charts/skymap.js'
import { drawMatrix } from './charts/matrix.js'
import { drawTimeline } from './charts/timeline.js'
import { drawPlacement, scorePlanet, physicalProperties } from './charts/placeplanet.js'

const DEFAULTS = { aMin: 150, qMin: 30, quality: true, showP9: true }
const state = { ...DEFAULTS }
// Your planet starts at the published best fit, so the first thing you see is
// what the literature actually proposes.
const PLANET_DEFAULTS = { a: 460, e: 0.30, i: 16, varpi: 247, node: 97, mass: 6.9, albedo: 0.4 }
const planet = { ...PLANET_DEFAULTS }
const ui = { survey: null, alt: null, paper: null }

let ETNOS = [], CUTS = [], SURVEYS = [], PAPERS = null
let SKY = null, PERIHELIA = [], ALTS = null, PREDICTIONS = null

const $ = s => document.querySelector(s)
const fmt = d3.format(',.0f')

// --------------------------------------------------------------------------

function selected () {
  return ETNOS.filter(o =>
    o.a_au >= state.aMin && (o.q_au ?? 0) >= state.qMin &&
    (!state.quality || o.well_determined))
}

function withAlignment (objects) {
  return objects.map(o => {
    const d = angleDiff(o.varpi_deg, PLANET_NINE.varpi_deg)
    return { ...o, delta_varpi_deg: d, alignment: Math.abs(d) > 90 ? 'anti-aligned' : 'aligned' }
  })
}

// --------------------------------------------------------------------------
// live panels (react to the sliders)
// --------------------------------------------------------------------------

function render () {
  const objs = withAlignment(selected())
  const stats = resultant(objs.map(o => o.varpi_deg))
  const p = rayleighP(stats.n, stats.R)
  const nd = nullDistribution(Math.max(stats.n, 2), 4000)

  $('#statN').textContent = stats.n
  $('#statNd').textContent = `of ${ETNOS.length} known extreme objects`
  $('#statR').textContent = stats.R.toFixed(3)
  $('#statDir').textContent = stats.n ? `${stats.meanDeg.toFixed(0)}°` : '—'

  const f = formatP(p)
  $('#statP').textContent = stats.n >= 3 ? f.odds.replace('about ', '') : '—'
  $('#statPd').textContent = stats.n >= 3
    ? `random orbits line up this well ${f.odds}`
    : 'need at least 3 objects'
  const tile = $('#statPtile')
  tile.classList.toggle('is-strong', p < 0.05 && stats.n >= 3)
  tile.classList.toggle('is-weak', p >= 0.05 && stats.n >= 3)

  // Scale to the perihelion arcs, not the aphelia: the arcs are what carries
  // the direction, and a view big enough to hold a 5,000 AU aphelion crushes
  // every one of them into a dot. When Planet Nine is shown the view opens out
  // far enough to include its perihelion (~320 AU) so both can be compared.
  const reach = objs.map(o => semiLatusRectum(o.a_au, o.e)).sort(d3.ascending)
  let maxAu = Math.max(120, (d3.quantile(reach, 0.95) || 140) * 1.18)
  if (state.showP9) {
    maxAu = Math.max(maxAu, PLANET_NINE.a_au * (1 - PLANET_NINE.e) * 1.22)
  }
  drawOrbits($('#chartOrbits'), { objects: objs, showP9: state.showP9, maxAu, stats })
  drawRose($('#chartRose'), { objects: objs, stats, showP9: state.showP9 })
  drawNull($('#chartNull'), { nullDist: nd, observedR: stats.R, p })

  const beat = nd.values.filter(v => v >= stats.R).length
  $('#nullSub').textContent =
    `${stats.n} objects. Of 4,000 random universes, ${beat.toLocaleString()} looked at least this aligned.`

  renderVerdict(stats, p)
  renderTable(objs)
  if (SKY) renderSky(new Set(objs.map(o => o.id)))
  renderScaleStrip(objs)
  renderBuild(objs, stats, maxAu)
}

function renderVerdict (stats, p) {
  const el = $('#verdict')
  if (stats.n < 3) { el.innerHTML = ''; return }
  const f = formatP(p)
  const good = p < 0.05
  const headline = p < 0.01 ? 'Luck is a poor explanation.'
    : p < 0.05 ? 'Suggestive — but not proof.'
      : 'This is exactly what luck looks like.'
  const body = p < 0.01
    ? `Random data lines up this well only ${f.odds}. Something is organising these orbits — though "something" need not be a planet.`
    : p < 0.05
      ? `Random data reaches this level ${f.odds}. Interesting, and well short of what astronomers usually demand.`
      : `Random data is this aligned ${f.odds}. With this sample there is no signal to explain.`
  el.innerHTML = `
    <div class="note" style="border-left-color:${good ? 'var(--series-3)' : 'var(--series-2)'};background:${good ? '#199e7010' : '#d9592610'}">
      <div class="note-k" style="color:${good ? '#5cc79c' : '#eba181'}">What this sample says</div>
      <p><strong>${headline}</strong> ${body}</p>
    </div>`
}

function renderTable (objs) {
  const rows = objs.slice().sort((a, b) => b.a_au - a.a_au).map(o => `
    <tr>
      <td>${o.name || o.provisional_desig || o.id}</td>
      <td class="num">${fmt(o.a_au)}</td><td class="num">${o.q_au.toFixed(1)}</td>
      <td class="num">${o.i_deg.toFixed(1)}</td><td class="num">${o.varpi_deg.toFixed(1)}</td>
      <td><span class="tag ${o.alignment === 'anti-aligned' ? 'anti' : 'ali'}">${o.alignment}</span></td>
      <td>${o.well_determined ? 'well measured' : 'short arc'}</td>
    </tr>`).join('')
  $('#dataTable').querySelector('tbody').innerHTML = rows ||
    '<tr><td colspan="7" style="padding:18px;text-align:center">No objects match.</td></tr>'
}

/** Gives "AU" a physical meaning before any chart asks the reader to use it. */
function renderScaleStrip (objs) {
  const far = d3.max(objs, o => o.a_au * (1 + o.e)) || 1000
  const rows = [
    { nm: 'Earth', q: 'average distance', au: 1, c: 'var(--series-1)' },
    { nm: 'Neptune', q: 'average distance', au: 30.1, c: 'var(--neptune)' },
    { nm: 'Pluto', q: 'average distance', au: 39.5, c: 'var(--text-muted)' },
    { nm: 'Planet Nine', q: 'predicted average distance', au: PLANET_NINE.a_au, c: 'var(--series-3)' },
    { nm: 'Farthest point', q: 'reached by any object in view', au: far, c: 'var(--series-2)' },
  ]
  const x = d3.scaleSqrt().domain([0, far]).range([0, 100])
  $('#scaleStrip').innerHTML = rows.map(r => `
    <div class="scale-row">
      <span class="nm">${r.nm}<small>${r.q}</small></span>
      <span class="bar"><i style="width:${x(r.au).toFixed(1)}%;background:${r.c}"></i></span>
      <span class="au">${r.au < 10 ? r.au : fmt(r.au)} AU</span>
    </div>`).join('')
}

// --------------------------------------------------------------------------
// 05 — build your planet
// --------------------------------------------------------------------------

function renderBuildControls () {
  const dials = [
    { k: 'a', label: 'Distance (average)', min: 200, max: 1200, step: 10, unit: ' AU' },
    { k: 'e', label: 'How stretched', min: 0, max: 0.8, step: 0.01, unit: '' },
    { k: 'i', label: 'Tilt', min: 0, max: 45, step: 1, unit: '°' },
    { k: 'varpi', label: 'Which way it leans', min: 0, max: 359, step: 1, unit: '°' },
    { k: 'mass', label: 'Mass', min: 1, max: 20, step: 0.1, unit: ' × Earth' },
  ]
  $('#buildControls').innerHTML = dials.map(d => `
    <div class="ctrl">
      <label for="b-${d.k}">${d.label} <b><span id="bv-${d.k}">${planet[d.k]}</span>${d.unit}</b></label>
      <input type="range" id="b-${d.k}" min="${d.min}" max="${d.max}" step="${d.step}" value="${planet[d.k]}" />
    </div>`).join('')
  for (const d of dials) {
    $(`#b-${d.k}`).addEventListener('input', e => {
      planet[d.k] = +e.target.value
      $(`#bv-${d.k}`).textContent = d.step < 1 ? (+e.target.value).toFixed(2) : e.target.value
      render()
    })
  }
}

function renderBuild (objs, stats, maxAu) {
  drawPlacement($('#chartPlace'), {
    objects: objs, planet, maxAu: Math.max(maxAu, planet.a * (1 + planet.e) * 0.75),
  })

  const { total, terms, V } = scorePlanet(planet, stats.meanDeg, planet.albedo, planet.mass)
  const colour = total >= 67 ? 'var(--series-3)' : total >= 34 ? 'var(--series-2)' : 'var(--text-muted)'
  $('#scoreBox').innerHTML = `
    <div class="score-head">
      <span class="num" style="color:${colour}">${total}</span>
      <span class="of">/ 100 — how well your planet fits the evidence</span>
    </div>
    ${terms.map(t => `
      <div class="score-term">
        <div class="st-top"><span>${t.key}</span><b>${Math.round(t.score * 100)}%</b></div>
        <div class="st-bar"><i style="width:${(t.score * 100).toFixed(0)}%;background:${colour}"></i></div>
        <div class="st-detail">${t.detail}</div>
        <div class="st-cite">${t.cite}</div>
      </div>`).join('')}`

  const props = physicalProperties(planet.mass, planet.a * (1 + planet.e * planet.e / 2), planet.albedo)
  const yrs = Math.pow(planet.a, 1.5)
  $('#propGrid').innerHTML = [
    ['Width', `${(props.radius * 2).toFixed(1)}×`, "Earth's diameter"],
    ['Surface temperature', `${props.teff.toFixed(0)} K`, `${(props.teff - 273.15).toFixed(0)} °C — it glows with its own leftover heat`],
    ['Brightness', `V ${props.V.toFixed(1)}`, props.V > 21.5 ? 'too faint for the surveys that have looked' : 'bright enough that we should have seen it'],
    ['One orbit takes', `${fmt(yrs)} yr`, 'last time it was here, humans had no cities'],
  ].map(([k, v, d]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('')

  $('#propNote').innerHTML = `
    <strong>Even the published best guess does not score 100.</strong> That is not a bug:
    searches have already eliminated the bright, nearby part of its range, which is
    why astronomers keep pushing the planet further out and fainter.
    Size and temperature are scaled from the one published model point we could
    verify — Linder &amp; Mordasini (2016) give a 10 × Earth-mass planet at 700 AU
    a radius of 3.7 Earths and 47 K. The scaling between grid points is
    <strong>ours</strong>, not theirs. Brightness assumes an albedo of 0.4, inside the
    0.2–0.75 range Brown &amp; Batygin (2021) adopt.`
}

// --------------------------------------------------------------------------
// static panels
// --------------------------------------------------------------------------

function renderLegend () {
  $('#legendMain').innerHTML = `
    <div class="legend-item"><span class="legend-swatch" style="background:var(--series-1)"></span>Object — orbit well measured</div>
    <div class="legend-item"><span class="legend-swatch" style="background:var(--series-1);opacity:.4"></span>Object — seen only briefly, orbit uncertain</div>
    <div class="legend-item"><span class="legend-swatch" style="background:var(--series-3)"></span>Planet Nine (predicted)</div>
    <div class="legend-item"><span class="legend-swatch" style="background:var(--neptune)"></span>Neptune</div>
    <div class="legend-item"><span class="legend-swatch" style="background:var(--sun)"></span>Sun</div>`
  const mark = (fill, half) => `<svg width="18" height="18" viewBox="-11 -11 22 22" aria-hidden="true">
      <circle r="9" fill="none" stroke="${fill}" stroke-width="2"/>
      ${half === 'full' ? `<circle r="9" fill="${fill}"/>` : ''}
      ${half === 'half' ? `<path d="M 0,-9 A 9,9 0 0,1 0,9 Z" fill="${fill}"/>` : ''}
    </svg>`
  $('#skyLegend').innerHTML = `
    <div class="legend-item"><span class="legend-swatch" style="background:var(--series-3)"></span>Where Planet Nine would be</div>
    <div class="legend-item"><span class="legend-swatch" style="background:var(--series-1);border-radius:50%"></span>Direction each object leans</div>
    <div class="legend-item"><span class="legend-swatch" style="background:var(--text-secondary)"></span>Ecliptic — the plane of the planets</div>
    <div class="legend-item"><span class="legend-swatch" style="background:#e8dcc0"></span>Milky Way (±15°) — crowded, hard to search</div>`

  $('#matrixLegend').innerHTML = `
    <div class="legend-item">${mark('var(--series-3)', 'full')}Accounts for it</div>
    <div class="legend-item">${mark('var(--series-2)', 'half')}Partly accounts for it</div>
    <div class="legend-item">${mark('var(--text-muted)', 'none')}Does not account for it</div>`
}

function renderCutGrid () {
  $('#cutGrid').innerHTML = CUTS.map(c => `
    <div class="stat ${c.p_value < 0.05 ? 'is-strong' : 'is-weak'}">
      <div class="k">${c.label}</div>
      <div class="v">1 in ${c.one_in.toLocaleString()}</div>
      <div class="d">${c.n_objects} objects · alignment ${c.R_observed.toFixed(3)}</div>
    </div>`).join('')
}

function renderSky (visibleIds) {
  if (visibleIds) renderSky.ids = visibleIds
  drawSkyMap($('#chartSky'), {
    surveys: SURVEYS, track: SKY, perihelia: PERIHELIA,
    activeSurvey: ui.survey, showTrack: true, showPerihelia: true,
    visibleIds: renderSky.ids,
  })
}

function renderSurveyChips () {
  $('#surveyChips').innerHTML = SURVEYS
    .filter(s => s.dec_range)
    .map(s => `<button class="chip" data-id="${s.id}" aria-pressed="false">
      <span class="dot" style="background:${s.color_hex}"></span>${s.name}</button>`).join('')
  $('#surveyChips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return
    ui.survey = ui.survey === b.dataset.id ? null : b.dataset.id
    $('#surveyChips').querySelectorAll('.chip').forEach(c =>
      c.setAttribute('aria-pressed', String(c.dataset.id === ui.survey)))
    renderSky()
  })
}

function renderSearchStats () {
  const ex = PREDICTIONS.search_exclusions
  const done = ex.ps1_2024_cumulative.fraction_excluded
  $('#searchStats').innerHTML = [
    ['Of the predicted hiding places…', `${Math.round(done * 100)}%`, 'already searched and ruled out'],
    ['…leaving', `${Math.round((1 - done) * 100)}%`, 'faint, and near the crowded band of the Milky Way'],
    ['Deepest search so far', `V ${ex.ps1_2024_cumulative.depth_V}`, 'Pan-STARRS1 — nothing found'],
    ['Settles it', 'Rubin / LSST', 'starts 2025 — should find it or end the idea'],
  ].map(([k, v, d]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('')
}

function renderMatrix () {
  drawMatrix($('#chartMatrix'), {
    alternatives: ALTS.alternatives, phenomena: ALTS.phenomena,
    selected: ui.alt,
    onSelect: id => { ui.alt = id; renderMatrix(); renderAltDetail() },
  })
}

function renderAltDetail () {
  const el = $('#altDetail')
  const a = ALTS.alternatives.find(x => x.id === ui.alt)
  if (!a) { el.innerHTML = ''; return }
  const colours = { mainstream: 'var(--series-3)', viable: 'var(--series-1)', fringe: 'var(--series-2)' }
  const cites = (a.key_dois || []).map(doi => PAPERS.papers.find(p => p.doi === doi)).filter(Boolean)
  el.innerHTML = `
    <div class="detail">
      <div class="eyebrow">Selected explanation</div>
      <h4>${a.name} <span class="status-chip" style="background:${colours[a.status] || 'var(--surface-3)'}22;color:${colours[a.status] || 'var(--text-muted)'}">${a.status}</span></h4>
      <div class="d-lede">${a.one_liner}</div>
      <div class="detail-cols">
        <div><h5>Accounts for</h5><ul>${a.explains.map(x => `<li>${x}</li>`).join('')}</ul></div>
        <div><h5>Struggles with</h5><ul>${a.struggles_with.map(x => `<li>${x}</li>`).join('')}</ul></div>
      </div>
      ${cites.length ? `<p class="caption" style="margin-top:16px">Key papers: ${cites.map(c =>
        `<a href="${c.arxiv_url || c.url}">${c.label}</a>`).join(' · ')}</p>` : ''}
    </div>`
}

function renderTimeline () {
  drawTimeline($('#chartTimeline'), {
    papers: PAPERS.papers, selected: ui.paper,
    onSelect: doi => { ui.paper = doi; renderTimeline(); renderPaperDetail() },
  })
}

function renderPaperDetail () {
  const el = $('#paperDetail')
  const p = PAPERS.papers.find(x => x.doi === ui.paper)
  if (!p) { el.innerHTML = ''; return }
  el.innerHTML = `
    <div class="detail">
      <h4>${p.title}</h4>
      <div class="d-lede">${p.authors.slice(0, 4).join(', ')}${p.authors.length > 4 ? ' et al.' : ''}
        · ${p.journal || ''} · ${p.year}</div>
      <p style="margin:0 0 12px">${p.summary}</p>
      <p class="caption" style="margin:0">
        <a href="${p.arxiv_url || p.url}">${p.arxiv_url ? 'arXiv:' + p.arxiv : 'doi.org'}</a>
        · ${p.citations_crossref ?? '—'} Crossref citations
        · our stance label: <strong>${p.stance}</strong></p>
    </div>`
}

function renderSources () {
  const key = ['10.1038/nature13156', '10.3847/0004-6256/151/2/22', '10.3847/1538-3881/aa7aed',
    '10.3847/1538-3881/ac2056', '10.3847/PSJ/abe53e', '10.3847/1538-3881/ad24e9']
  $('#srcList').innerHTML = PAPERS.papers
    .filter(p => key.includes(p.doi)).sort((a, b) => a.year - b.year)
    .map(p => `<div class="src">
      <div class="yr">${p.year}</div>
      <div class="ttl"><b>${p.label}</b> — ${p.summary}
      <br><a href="${p.arxiv_url || p.url}">${p.arxiv_url ? 'arXiv:' + p.arxiv : 'doi.org'}</a></div>
    </div>`).join('')
}

// --------------------------------------------------------------------------

function bind () {
  const aMin = $('#aMin'), qMin = $('#qMin')
  aMin.addEventListener('input', () => { state.aMin = +aMin.value; $('#aMinV').textContent = state.aMin; render() })
  qMin.addEventListener('input', () => { state.qMin = +qMin.value; $('#qMinV').textContent = state.qMin; render() })
  $('#quality').addEventListener('change', e => { state.quality = e.target.checked; render() })
  $('#showP9').addEventListener('change', e => { state.showP9 = e.target.checked; render() })
  $('#reset').addEventListener('click', () => {
    Object.assign(state, DEFAULTS)
    aMin.value = DEFAULTS.aMin; qMin.value = DEFAULTS.qMin
    $('#aMinV').textContent = DEFAULTS.aMin; $('#qMinV').textContent = DEFAULTS.qMin
    $('#quality').checked = DEFAULTS.quality; $('#showP9').checked = DEFAULTS.showP9
    Object.assign(planet, PLANET_DEFAULTS)
    renderBuildControls()
    render()
  })
  let t
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { render(); renderSky(); renderMatrix() }, 180) })
}

async function init () {
  const j = u => fetch(u).then(r => { if (!r.ok) throw new Error(`${u} → ${r.status}`); return r.json() })
  const [etnos, nulls, surveys, papers, sky, peri, alts, preds] = await Promise.all([
    j('/data/etnos.json'), j('/data/clustering_null.json'), j('/data/surveys.json'),
    j('/data/papers.json'), j('/data/p9_sky_track.json'), j('/data/etno_perihelion_sky.json'),
    j('/data/alternatives.json'), j('/data/planet_nine_predictions.json'),
  ])
  ETNOS = etnos; CUTS = nulls.cuts; SURVEYS = surveys.surveys; PAPERS = papers
  SKY = sky; PERIHELIA = peri.objects; ALTS = alts; PREDICTIONS = preds

  renderLegend(); renderCutGrid(); renderBuildControls()
  renderSurveyChips(); renderSky(); renderSearchStats()
  renderMatrix(); renderTimeline(); renderSources()
  bind(); render()
}

init().catch(err => {
  document.querySelector('main').insertAdjacentHTML('afterbegin',
    `<div class="wrap" style="padding:40px 24px;color:var(--series-2)">Could not load data: ${err.message}</div>`)
  console.error(err)
})
