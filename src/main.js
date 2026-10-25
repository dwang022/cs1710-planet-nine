import * as d3 from 'd3'
import './style.css'
import { animateValue, interpolateAngle, interpolateLog, duration, EASE } from './motion.js'
import { resultant, rayleighP, nullDistribution, formatP, seededRandom } from './stats.js'
import { PLANET_NINE, angleDiff, semiLatusRectum } from './orbits.js'
import { drawSkyMap, depthColour, deepestAt, galacticPoint, eclipticPoint } from './charts/skymap.js'
import { makeLean } from './charts/lean.js'
import { makeLuck } from './charts/luck.js'
import { drawMatrix } from './charts/matrix.js'
import { drawTimeline } from './charts/timeline.js'
import { drawPlacement, scorePlanet, physicalProperties } from './charts/placeplanet.js'
import { makeScatter } from './charts/scatter.js'
import { makeDistance, fmtAu, lightTime } from './charts/distance.js'
import { makeLineup } from './charts/lineup.js'
import { scrolly, initReveals, scrollyProgress } from './scrolly.js'
import { sprite } from './art.js'

const DEFAULTS = { aMin: 150, qMin: 30, aMax: Infinity, qMax: Infinity, quality: true, showP9: true }
const state = { ...DEFAULTS }
// Your planet starts at the published best fit, so the first thing you see is
// what the literature actually proposes.
const PLANET_DEFAULTS = { a: 460, e: 0.30, i: 16, varpi: 247, node: 97, mass: 6.9, albedo: 0.4 }
const planet = { ...PLANET_DEFAULTS }
const ui = { survey: null, alt: null, paper: null }

let ETNOS = [], CUTS = [], SURVEYS = [], PAPERS = null
let SKY = null, PERIHELIA = [], ALTS = null, PREDICTIONS = null
let scatter = null
let lean = null, luck = null
let distance = null, lineup = null, PLANETS = []
let distKeys = [1.75, 11.5, 34, 56, 700, 1000, 3000]
let distProgress = { k: 0, t: 0 }
let remeasureDist = () => {}

// The story steps. Each scripted step draws the sample it describes, so the
// numbers in the text and the picture always agree; the last "explore" step of
// each section follows whatever the reader sets. Scripted steps only read
// their sample: the reader's filters in `state` are never changed by scrolling.
const STRICT = { aMin: 150, qMin: 30, aMax: Infinity, qMax: Infinity, quality: true }
const LOOSE = { ...STRICT, quality: false }
const story = { lineup: 'nine', dist: 'home', lean: 'one', luck: 'one', sky: 'sky' }
const leanSample = step => step === 'explore' ? state : STRICT
const luckSample = step => step === 'explore' ? state : step === 'catch' || step === 'cuts' ? LOOSE : STRICT
let leanView = 'orbits'
const SEDNA = '90377'

// One null distribution per sample size, so stepping back and forth through the
// story does not reshuffle the pile under the reader. Seeded by sample size, so
// the count quoted in the text is the same on every visit.
const nullCache = new Map()
function nullFor (n) {
  n = Math.max(n, 2)
  if (!nullCache.has(n)) nullCache.set(n, nullDistribution(n, 4000, 40, seededRandom(1710 + n)))
  return nullCache.get(n)
}

const $ = s => document.querySelector(s)
const fmt = d3.format(',.0f')

// --------------------------------------------------------------------------

/** The one filter on the page: the reader's controls, or a story step's sample. */
function selected (s = state) {
  return ETNOS.filter(o =>
    o.a_au >= s.aMin && o.a_au <= s.aMax &&
    (o.q_au ?? 0) >= s.qMin && (o.q_au ?? 0) <= s.qMax &&
    (!s.quality || o.well_determined))
}

const boxed = () => isFinite(state.aMax) || isFinite(state.qMax)

/** Drive every control from one place, so the story and the charts agree. */
function applyState (patch) {
  Object.assign(state, patch)
  syncControls()
  render()
}

function syncControls () {
  $('#aMin').value = state.aMin; $('#aMinV').textContent = Math.round(state.aMin)
  $('#qMin').value = state.qMin; $('#qMinV').textContent = Math.round(state.qMin)
  $('#quality').checked = state.quality
  $('#showP9').checked = state.showP9
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

  // Tiles ease from the old value to the new one; the final frame prints
  // exactly what the original formatting would have.
  const statN = $('#statN'), statR = $('#statR'), statDir = $('#statDir')
  animateValue(statN, stats.n, v => { statN.textContent = Math.round(v) })
  $('#statNd').textContent = `of ${ETNOS.length} known extreme objects`
  animateValue(statR, stats.R, v => { statR.textContent = v.toFixed(3) })
  animateValue(statDir, stats.n ? stats.meanDeg : null, (v, done) => {
    statDir.textContent = v == null ? '—'
      : `${(done ? stats.meanDeg : ((v % 360) + 360) % 360).toFixed(0)}°`
  }, interpolateAngle)

  const f = formatP(p)
  const statP = $('#statP'), statPd = $('#statPd')
  animateValue(statP, stats.n >= 3 ? 1 / p : null, (v, done) => {
    if (v == null) { statP.textContent = '—'; statPd.textContent = 'need at least 3 objects'; return }
    const odds = done ? f.odds : `about 1 in ${Math.round(v).toLocaleString()}`
    statP.textContent = odds.replace('about ', '')
    statPd.textContent = `random orbits line up this well ${odds}`
  }, interpolateLog)
  const tile = $('#statPtile')
  tile.classList.toggle('is-strong', p < 0.05 && stats.n >= 3)
  tile.classList.toggle('is-weak', p >= 0.05 && stats.n >= 3)

  const maxAu = state.showP9 ? viewScale(objs).withP9 : viewScale(objs).objects
  renderLean()
  renderLuck()

  if (scatter) {
    const ids = new Set(objs.map(o => o.id))
    scatter.update(state.quality ? ETNOS.filter(o => o.well_determined) : ETNOS,
      o => ids.has(o.id))
    scatter.setSelection(boxed() ? state : null)
  }
  $('#selChip').innerHTML = boxed()
    ? `<span style="display:inline-flex;align-items:center;gap:10px;background:#199e7022;border:1px solid var(--series-3);
         border-radius:999px;padding:6px 14px;font-size:.82rem">
         Showing reach ${fmt(state.aMin)}–${fmt(state.aMax)} AU, closest ${state.qMin.toFixed(0)}–${state.qMax.toFixed(0)} AU
         <button id="clearBox" style="background:none;border:0;color:var(--series-3);cursor:pointer;font:inherit;padding:0">clear ✕</button>
       </span>`
    : `<span style="font-size:.82rem;color:var(--text-muted)">No box drawn — showing everything the sliders allow.</span>`
  const cb = $('#clearBox')
  if (cb) cb.addEventListener('click', () => applyState({ aMin: DEFAULTS.aMin, qMin: DEFAULTS.qMin, aMax: Infinity, qMax: Infinity }))

  renderVerdict(stats, p)
  renderTable(objs)
  if (SKY) renderSky(new Set(objs.map(o => o.id)))
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

// --------------------------------------------------------------------------
// 01 — how far away: a continuous zoom from the Sun outward
// --------------------------------------------------------------------------

/**
 * The width of the view, in AU, at each story card. Scrolling eases between
 * them in log space, so every step of the zoom feels the same size. The later
 * keys come from the objects drawn: their typical reach, Planet Nine's widest
 * predicted range, and the farthest point any of them reaches.
 */
function distKeyframes (objs) {
  const farObj = objs.length ? objs.reduce((m, o) => (o.Q_au > m.Q_au ? o : m)) : null
  const far = farObj && distance ? distance.viewFor(farObj) : 1000
  const as = objs.map(o => o.a_au).sort(d3.ascending)
  const extreme = Math.max(420, (d3.quantile(as, 0.75) || 500) * 1.6)
  const p9 = distance ? distance.p9.QMax * 1.12 : extreme
  const keys = [1.75, 11.5, 34, 56, extreme, Math.max(extreme, p9), far]
  for (let i = 1; i < keys.length; i++) keys[i] = Math.max(keys[i], keys[i - 1] * 1.05)
  return keys
}

/**
 * The zoom-out sits in the introduction, before the reader has chosen
 * anything, so it draws one fixed group: the well-measured extreme objects
 * (the default sample). Briefly observed orbits are left out because their
 * far ends are too uncertain to put on a ruler.
 */
function renderDistance () {
  if (!distance) return
  const objs = withAlignment(selected(STRICT))
  const far = objs.length ? objs.reduce((m, o) => (o.Q_au > m.Q_au ? o : m)) : null
  distKeys = distKeyframes(objs)
  distance.update({ objects: objs, showP9: true, far, step: story.dist })
  $('#distFarAu').textContent = far ? `${fmtAu(far.Q_au)} (${far.name || far.provisional_desig || far.id})` : '—'
  applyDistView()
}

/** Hold at a card's keyframe while it is being read; ease between cards. */
function applyDistView () {
  if (!distance) return
  const { k, t } = distProgress
  const a = distKeys[Math.min(k, distKeys.length - 1)]
  const b = distKeys[Math.min(k + 1, distKeys.length - 1)]
  const u = Math.min(1, Math.max(0, (t - 0.25) / 0.5))
  const s = u * u * (3 - 2 * u)
  const view = Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * s)
  distance.setView(view)
  $('#distReadout').innerHTML = `Sun out to <b>${fmtAu(view)}</b> · light takes <b>${lightTime(view)}</b> to cross this view`
}

// --------------------------------------------------------------------------
// 02-04 — the three stories
// --------------------------------------------------------------------------

function current (s = state) {
  const objs = withAlignment(selected(s))
  return { objs, stats: resultant(objs.map(o => o.varpi_deg)) }
}

/** What the pinned graphic is showing, so a story step never passes for the reader's filters. */
function readout (s, n) {
  const own = s === state
  const note = own && boxed() ? ' · your custom group'
    : !own && Object.keys(s).some(k => s[k] !== state[k]) ? ' · this step’s sample; your filters return on the last card'
      : ''
  return `<b>${n}</b> objects · ${s.quality ? 'well-measured orbits only' : 'including briefly seen orbits'}${note}`
}

/**
 * Scale the orbit view to the perihelion arcs, not the aphelia: the arcs carry
 * the direction, and a view big enough for a 5,000 AU aphelion crushes every
 * one of them into a dot. With Planet Nine shown the view opens out far enough
 * to include its perihelion (~320 AU).
 */
function viewScale (objs) {
  const reach = objs.map(o => semiLatusRectum(o.a_au, o.e)).sort(d3.ascending)
  const objects = Math.max(120, (d3.quantile(reach, 0.95) || 140) * 1.18)
  return { objects, withP9: Math.max(objects, PLANET_NINE.a_au * (1 - PLANET_NINE.e) * 1.22) }
}

function renderLean () {
  if (!lean) return
  const sample = leanSample(story.lean)
  const { objs, stats } = current(sample)
  $('#leanReadout').innerHTML = readout(sample, stats.n)
  const sc = viewScale(objs)
  const halfCount = objs.filter(o => Math.abs(angleDiff(o.varpi_deg, stats.meanDeg)) <= 90).length
  const only = new Set([SEDNA])
  const scenes = {
    one: { only, labels: { sun: true, neptune: true, closest: true } },
    point: { only, pointer: true, compass: true, labels: { sun: true } },
    all: { stagger: true, fadeOrbits: true, labels: { sun: true, neptune: true } },
    half: { half: true, fadeOrbits: true, labels: { half: true } },
    ring: { layout: 'ring', compass: true },
    arrow: { layout: 'ring', compass: true, mean: true, labels: { mean: true } },
    p9: { maxAu: sc.withP9, mean: true, p9: true, fadeOrbits: true, labels: { p9: true } },
    explore: {
      layout: leanView, compass: leanView === 'ring', mean: true, p9: state.showP9,
      maxAu: state.showP9 ? sc.withP9 : sc.objects, labels: { p9: state.showP9 },
    },
  }
  lean.update(objs, stats, {
    layout: 'orbits', maxAu: sc.objects, focus: SEDNA, halfCount, labels: {},
    ...scenes[story.lean],
  })
}

function renderLuck () {
  if (!luck) return
  const sample = luckSample(story.luck)
  const { objs, stats } = current(sample)
  $('#luckReadout').innerHTML = readout(sample, stats.n)
  const nd = nullFor(stats.n)
  const beat = nd.values.filter(v => v >= stats.R).length
  const blocksText = { histTitle: 'Where each fake solar system lands', histSub: 'each block is one fake solar system' }
  const real = {
    ring: 'real', blocks: 'none', bars: true, observed: stats.R,
    obsText: `${beat.toLocaleString()} of 4,000 fakes got this far`,
    histTitle: 'The real objects, against luck',
    histSub: 'blue bars: fake solar systems at least as lined up as the real ones',
    pileText: 'what luck produces',
  }
  const scenes = {
    one: { ring: 'random', blocks: 'one', ...blocksText },
    many: { ring: 'random', blocks: 'animate', animate: true, ...blocksText },
    all: {
      ring: 'random', blocks: 'none', bars: true, pileText: 'what luck produces',
      histTitle: '4,000 fake solar systems', histSub: 'the taller the bar, the more of them landed there',
    },
    real,
    // The real value now sits on the pile itself, so it labels itself.
    catch: { ...real, pileText: null, obsText: `${beat.toLocaleString()} of 4,000 fakes got this far: it sits inside the pile` },
    cuts: { ...real, cuts: cutsView() },
    explore: { ...real, xMax: Math.min(1, Math.max(0.5, stats.R * 1.15)) },
  }
  luck.update({ n: stats.n, real: objs, quality: sample.quality, nullDist: nd, ...scenes[story.luck] })
}

/** The five published sample definitions, in words a reader can parse. */
function cutsView () {
  return CUTS.map(c => ({
    title: `Out past ${c.a_min_au} AU, never closer than ${c.q_min_au} AU`,
    detail: `${c.well_determined_only ? 'well-measured orbits only' : 'every object, including briefly seen'} · ${c.n_objects} objects`,
    // Same Rayleigh formula as the rest of the page, so every "1 in N" agrees.
    one_in: Math.round(1 / rayleighP(c.n_objects, c.R_observed)),
    p_value: rayleighP(c.n_objects, c.R_observed),
  }))
}

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
  const lsst = at(110, -40, 'Rubin Observatory, 2025–2035', { colour: '#F08BB4', size: 15 })
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
  if (L.surveys === 'depth' || L.surveys === 'deep') {
    items.push(`<span style="width:110px;height:11px;border-radius:3px;background:${ramp};border:1px solid var(--rule)"></span>
      how faint the photos reach: shallow → <b style="color:#8fd3e2">deep</b>`)
  }
  if (L.unsearched) items.push(`${sw('var(--series-2)')}path not yet searched deeply`)
  if (L.milky) items.push(`${sw('#e8dcc0')}Milky Way`)
  if (L.future) items.push(`${sw('transparent', 'border:2px dashed #F08BB4')}Rubin Observatory (2025–2035)`)
  if (L.perihelia) items.push(`${sw('var(--series-1)', 'border-radius:50%')}direction each object points`)
  $('#skyLegend').innerHTML = items.map(i => `<div class="legend-item">${i}</div>`).join('')
}

/** Numbers quoted in the story text, all computed from the data on load. */
function fillStoryNumbers () {
  const sample = patch => {
    const objs = selected(patch)
    const st = resultant(objs.map(o => o.varpi_deg))
    return { objs, st, p: rayleighP(st.n, st.R) }
  }
  const s = sample(STRICT), l = sample(LOOSE)
  const half = s.objs.filter(o => Math.abs(angleDiff(o.varpi_deg, s.st.meanDeg)) <= 90).length

  const SKY_SQ_DEG = 41253
  const deepArea = d3.sum(SURVEYS.filter(v =>
    v.wavelength === 'optical' && !v.future && (v.depth_mag ?? 0) >= 23.5 && v.area_sq_deg), v => v.area_sq_deg)
  const nom = SKY.tracks.find(t => t.label === 'nominal').points
  const thin = nom.filter(pt => { const d = deepestAt(SURVEYS, pt.ra_deg, pt.dec_deg); return d === null || d < 23.5 })
  const rubin = thin.filter(pt => (deepestAt(SURVEYS, pt.ra_deg, pt.dec_deg, { includeFuture: true }) ?? 0) >= 23.5)

  const nums = {
    sednaDeg: ETNOS.find(o => o.id === SEDNA).varpi_deg.toFixed(0),
    strictN: s.st.n,
    strictHalf: half,
    strictHalfExpect: Math.round(s.st.n / 2),
    strictR: s.st.R.toFixed(2),
    strictBeat: nullFor(s.st.n).values.filter(v => v >= s.st.R).length,
    strictOdds: Math.round(1 / s.p).toLocaleString(),
    looseN: l.st.n,
    looseR: l.st.R.toFixed(2),
    looseOdds: Math.round(1 / l.p).toLocaleString(),
    extraN: l.st.n - s.st.n,
    deepPct: Math.round(100 * deepArea / SKY_SQ_DEG),
    thinPct: Math.round(100 * thin.length / nom.length),
    lsstPct: Math.round(100 * rubin.length / Math.max(1, thin.length)),
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })
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
  const mark = (fill, half) => `<svg width="18" height="18" viewBox="-11 -11 22 22" aria-hidden="true">
      <circle r="9" fill="none" stroke="${fill}" stroke-width="2"/>
      ${half === 'full' ? `<circle r="9" fill="${fill}"/>` : ''}
      ${half === 'half' ? `<path d="M 0,-9 A 9,9 0 0,1 0,9 Z" fill="${fill}"/>` : ''}
    </svg>`
  $('#matrixLegend').innerHTML = `
    <div class="legend-item">${mark('var(--series-3)', 'full')}Accounts for it</div>
    <div class="legend-item">${mark('var(--series-2)', 'half')}Partly accounts for it</div>
    <div class="legend-item">${mark('var(--text-muted)', 'none')}Does not account for it</div>`
}

function renderSky (visibleIds) {
  if (visibleIds) renderSky.ids = visibleIds
  const scene = skyScene(story.sky)
  drawSkyMap($('#chartSky'), {
    surveys: SURVEYS, track: SKY, perihelia: PERIHELIA,
    activeSurvey: story.sky === 'explore' ? ui.survey : null,
    visibleIds: renderSky.ids,
    scene,
  })
  renderSkyLegend(scene)
  $('#surveyChips').hidden = story.sky !== 'explore'
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
    ['Of the places the prediction allows…', `${Math.round(done * 100)}%`, 'already searched and ruled out'],
    ['…leaving', `${Math.round((1 - done) * 100)}%`, 'the faint end, much of it near the Milky Way'],
    ['Deepest search so far', `V ${ex.ps1_2024_cumulative.depth_V}`, 'Pan-STARRS1, nothing found'],
    ['Could settle it', 'Rubin / LSST', '2025–2035: should find it or end the idea'],
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
  // Moving a slider drops any drawn box, so the two controls never disagree.
  aMin.addEventListener('input', () => {
    state.aMin = +aMin.value; state.aMax = Infinity; state.qMax = Infinity
    $('#aMinV').textContent = state.aMin; render()
  })
  qMin.addEventListener('input', () => {
    state.qMin = +qMin.value; state.aMax = Infinity; state.qMax = Infinity
    $('#qMinV').textContent = state.qMin; render()
  })
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
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { setBarHeight(); render(); renderMatrix(); remeasureDist() }, 180) })
  setBarHeight()

  $('#leanToggle').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    leanView = b.dataset.v
    renderLeanToggle()
    render()
  })
  renderLeanToggle()
}

/**
 * Section 01's "Back to Your Turn" links. Each lands its story's explore step
 * where that story activates steps (mid-screen; lower on phones, below the
 * pinned graphic), so the right picture is showing on arrival. Only scrolls:
 * the filters are left exactly as the reader set them.
 */
function bindYourTurn () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  const go = (step, behavior) => {
    const at = window.matchMedia('(max-width: 900px)').matches ? 0.78 : 0.5
    const r = step.getBoundingClientRect()
    window.scrollTo({ top: window.scrollY + r.top + r.height / 2 - innerHeight * at, behavior })
    step.focus({ preventScroll: true })
  }
  document.querySelectorAll('a[data-your-turn]').forEach(a => a.addEventListener('click', e => {
    const step = document.querySelector(a.hash)
    if (!step) return
    e.preventDefault()
    history.pushState(null, '', a.hash)
    go(step, reduce.matches ? 'instant' : 'smooth')
  }))
  // A shared link or a reload lands the same way, now that the charts exist.
  const step = pendingTurn && document.querySelector(pendingTurn)
  if (step) {
    history.replaceState(null, '', pendingTurn)
    go(step, 'instant')
  }
}

/** The pinned graphics sit below the sticky control bar, whatever its height. */
function setBarHeight () {
  const bar = $('#controls')
  const h = getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0
  document.documentElement.style.setProperty('--bar-h', `${h}px`)
}

function renderLeanToggle () {
  $('#leanToggle').querySelectorAll('button').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.v === leanView)))
}

async function init () {
  const j = u => fetch(u).then(r => { if (!r.ok) throw new Error(`${u} → ${r.status}`); return r.json() })
  const [etnos, nulls, surveys, papers, sky, peri, alts, preds, planets] = await Promise.all([
    j('/data/etnos.json'), j('/data/clustering_null.json'), j('/data/surveys.json'),
    j('/data/papers.json'), j('/data/p9_sky_track.json'), j('/data/etno_perihelion_sky.json'),
    j('/data/alternatives.json'), j('/data/planet_nine_predictions.json'), j('/data/planets.json'),
  ])
  ETNOS = etnos; CUTS = nulls.cuts; SURVEYS = surveys.surveys; PAPERS = papers
  SKY = sky; PERIHELIA = peri.objects; ALTS = alts; PREDICTIONS = preds
  PLANETS = planets.planets.map(p => ({ name: p.name, a: p.a, e: p.e, q: p.a * (1 - p.e), Q: p.a * (1 + p.e) }))
  lineup = makeLineup($('#chartLineup'), { planets: PLANETS, readout: $('#lineupReadout') })

  lean = makeLean($('#chartLean'))
  luck = makeLuck($('#chartLuck'))
  fillStoryNumbers()
  renderLegend(); renderBuildControls()
  renderSurveyChips(); renderSearchStats()
  renderMatrix(); renderTimeline(); renderSources()

  scatter = makeScatter($('#chartScatter'), {
    onBrush: box => {
      if (box) Object.assign(state, box)
      else Object.assign(state, { aMin: DEFAULTS.aMin, qMin: DEFAULTS.qMin, aMax: Infinity, qMax: Infinity })
      syncControls()
      render()
    },
  })

  // The zoom-out's Planet Nine band spans the published orbit and its stated
  // uncertainty (Brown & Batygin 2021 posterior), so the range is theirs, not ours.
  const bb21 = PREDICTIONS.orbit_predictions.find(p => p.is_default) || {}
  distance = makeDistance($('#chartDist'), {
    planets: PLANETS,
    p9: { a: PLANET_NINE.a_au, e: PLANET_NINE.e, aErr: bb21.a_au_err || [0, 0], eErr: bb21.e_err || [0, 0] },
  })
  $('#distP9q').textContent = fmt(distance.p9.q); $('#distP9Q').textContent = fmt(distance.p9.Q)
  $('#distP9min').textContent = fmt(distance.p9.qMin); $('#distP9max').textContent = fmt(distance.p9.QMax)

  bind(); render()
  renderDistance()

  // A step change only redraws its own graphic; the filters stay as the reader left them.
  scrolly($('#lineupStory'), {
    onStep: (i, step) => { story.lineup = step; lineup.setStep(step) },
  })
  scrolly($('#distStory'), {
    onStep: (i, step) => { story.dist = step; distance.update({ step }) },
  })
  remeasureDist = scrollyProgress($('#distStory'), (k, t) => { distProgress = { k, t }; applyDistView() })
  scrolly($('#leanStory'), {
    onStep: (i, step) => {
      story.lean = step
      $('#leanToggle').hidden = step !== 'explore'
      renderLean()
    },
  })
  scrolly($('#luckStory'), {
    onStep: (i, step) => { story.luck = step; renderLuck() },
  })
  scrolly($('#skyStory'), {
    onStep: (i, step) => { story.sky = step; renderSky() },
  })
  bindYourTurn()
}

// The hand-drawn bodies, once, so <use href="#art-NAME"> works anywhere on the page.
document.body.insertAdjacentHTML('afterbegin', sprite())

initReveals()   // experimental scroll-triggered reveals; delete this line to disable

// Hold a shared #your-turn-NN link until the charts exist (bindYourTurn puts it
// back). Left in the URL, the browser starts its own smooth jump while the page
// is still loading, and wherever the two scrolls meet is where the reader lands.
const pendingTurn = /^#(your-turn-|dist-)/.test(location.hash) ? location.hash : null
if (pendingTurn) history.replaceState(null, '', location.pathname + location.search)

init().catch(err => {
  document.querySelector('main').insertAdjacentHTML('afterbegin',
    `<div class="wrap" style="padding:40px 24px;color:var(--series-2)">Could not load data: ${err.message}</div>`)
  console.error(err)
})
