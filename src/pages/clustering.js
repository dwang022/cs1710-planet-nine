// Part 2, page 1: the orbits lean the same way, and the herding exhibit.

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { makeLean } from '../charts/lean.js'
import { makeScatter } from '../charts/scatter.js'
import { makeHerd } from '../charts/herd.js'
import { orbitIntro } from '../charts/orbitintro.js'
import { scrolly } from '../scrolly.js'
import { resultant } from '../stats.js'
import { PLANET_NINE, angleDiff, semiLatusRectum } from '../orbits.js'
import { loadSample, saveSample, selected, withAlignment, isBoxed, renderControls, STRICT, LOOSE, DEFAULTS } from '../sample.js'

const $ = s => document.querySelector(s)
const fmt = d3.format(',.0f')
const SEDNA = '90377'

async function main () {
  const { etnos } = await loadData('etnos')
  const state = loadSample()
  let story = 'one', leanView = 'orbits'

  const current = s => { const objs = withAlignment(selected(etnos, s)); return { objs, stats: resultant(objs.map(o => o.varpi_deg)) } }
  const sampleFor = step => step === 'explore' ? state : STRICT

  // Scale the orbit view to the perihelion arcs, not the aphelia: the arcs carry the direction.
  function viewScale (objs) {
    const reach = objs.map(o => semiLatusRectum(o.a_au, o.e)).sort(d3.ascending)
    const objects = Math.max(120, (d3.quantile(reach, 0.95) || 140) * 1.18)
    return { objects, withP9: Math.max(objects, PLANET_NINE.a_au * (1 - PLANET_NINE.e) * 1.22) }
  }
  function readout (s, n) {
    const own = s === state
    const box = own && isBoxed(s) ? ' · your box <button type="button" class="link-btn" id="clearBox">clear</button>' : ''
    return `<b>${n}</b> objects · ${s.quality ? 'seen in more than one season' : 'including those seen once'}${box}`
  }

  // the key: each mark as it appears on the picture
  const KEY = {
    dot: '<svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="var(--series-1)"/></svg>closest point to the Sun',
    orbit: '<svg viewBox="0 0 24 14"><path d="M1,12 Q12,0 23,12" fill="none" stroke="var(--series-1)" stroke-width="2"/></svg>orbit',
    arrow: '<svg viewBox="0 0 24 14"><path d="M2,7 H18 M14,3 L20,7 L14,11" fill="none" stroke="var(--text-primary)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>average direction',
    p9: '<svg viewBox="0 0 24 14"><path d="M1,12 Q12,0 23,12" fill="none" stroke="var(--p9)" stroke-width="2.4"/></svg><span class="p9-name" data-no-tint>Planet Nine</span>',
  }
  function drawKey (sc) {
    const on = [sc.layout !== 'sample' && 'dot', sc.layout === 'orbits' && 'orbit', sc.mean && 'arrow', sc.p9 && 'p9'].filter(Boolean)
    $('#leanKey').innerHTML = on.map(k => `<li class="legend-item">${KEY[k]}</li>`).join('')
  }

  const lean = makeLean($('#chartLean'))
  function renderLean () {
    const sample = sampleFor(story)
    const { objs, stats } = current(sample)
    $('#leanReadout').innerHTML = readout(sample, stats.n)
    $('#clearBox')?.addEventListener('click', () => { Object.assign(state, { aMin: DEFAULTS.aMin, qMin: DEFAULTS.qMin, aMax: Infinity, qMax: Infinity }); controls.sync(); saveSample(state); render() })
    // the third view, the sample, swaps the picture for the scatter
    const sampleView = story === 'explore' && leanView === 'sample'
    $('#chartScatter').hidden = !sampleView
    $('#chartLean > svg').style.display = sampleView ? 'none' : ''
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
        layout: leanView === 'sample' ? 'orbits' : leanView, compass: leanView === 'ring', mean: true, p9: state.showP9,
        maxAu: state.showP9 ? sc.withP9 : sc.objects, labels: { p9: state.showP9 },
      },
    }
    const scene = { layout: 'orbits', maxAu: sc.objects, focus: SEDNA, halfCount, labels: {}, ...scenes[story] }
    lean.update(objs, stats, scene)
    drawKey(sampleView ? { layout: 'sample' } : scene)
  }

  // --- numbers quoted in the cards -----------------------------------------------
  const s = current(STRICT)
  const half = s.objs.filter(o => Math.abs(angleDiff(o.varpi_deg, s.stats.meanDeg)) <= 90).length
  const nums = {
    sednaDeg: etnos.find(o => o.id === SEDNA).varpi_deg.toFixed(0),
    sednaQ: `${etnos.find(o => o.id === SEDNA).q_au.toFixed(0)} AU`,
    strictN: s.stats.n, strictHalf: half, strictHalfExpect: Math.round(s.stats.n / 2), strictR: s.stats.R.toFixed(2),
    looseExtra: current(LOOSE).stats.n - s.stats.n,
    p9Mass: Math.round(PLANET_NINE.mass_earths),
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })

  // --- what an orbit is, before the pattern: Sedna's orbit, drawn to scale -----------------
  const intro = orbitIntro(etnos.find(o => o.id === SEDNA))
  document.querySelectorAll('#orbits .definition li[data-art]').forEach(li => {
    li.insertAdjacentHTML('afterbegin', `<figure class="rule-fig" aria-hidden="true">${intro[li.dataset.art]()}</figure>`)
  })

  // --- the reader's sample: on the picture on a wide screen, in the last card on a phone ---
  const controls = renderControls($('#leanControls'), state, render, { note: 'also sets the next page' })
  const narrow = matchMedia('(max-width: 900px)')
  function placeControls () {
    const onPic = story === 'explore' && !narrow.matches
    const home = onPic ? $('#leanBar') : $('#leanControls')
    if (controls.el.parentElement !== home) home.appendChild(controls.el)
    $('#leanBar').hidden = !onPic
    $('#chartLean').classList.toggle('has-bar', onPic)
    $('#leanViews').hidden = story !== 'explore'
  }
  narrow.addEventListener('change', placeControls)
  const scatter = makeScatter($('#chartScatter'), {
    onBrush: box => {
      if (box) Object.assign(state, box)
      else Object.assign(state, { aMin: DEFAULTS.aMin, qMin: DEFAULTS.qMin, aMax: Infinity, qMax: Infinity })
      controls.sync(); saveSample(state); render()
    },
  })
  function renderTable (objs) {
    const rows = objs.slice().sort((a, b) => b.a_au - a.a_au).map(o => `
      <tr><td>${o.name || o.provisional_desig || o.id}</td>
      <td class="num">${fmt(o.a_au)}</td><td class="num">${o.q_au.toFixed(1)}</td>
      <td class="num">${o.i_deg.toFixed(1)}</td><td class="num">${o.varpi_deg.toFixed(1)}</td>
      <td><span class="tag ${o.alignment === 'anti-aligned' ? 'anti' : 'ali'}">${o.alignment}</span></td>
      <td>${o.well_determined ? 'more than one' : 'one'}</td></tr>`).join('')
    $('#dataTable tbody').innerHTML = rows || '<tr><td colspan="7" style="padding:18px;text-align:center">No objects match.</td></tr>'
  }
  function render () {
    const { objs } = current(state)
    renderLean()
    const ids = new Set(objs.map(o => o.id))
    scatter.update(state.quality ? etnos.filter(o => o.well_determined) : etnos, o => ids.has(o.id))
    scatter.setSelection(isBoxed(state) ? state : null)
    renderTable(objs)
  }
  $('#leanToggle').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    leanView = b.dataset.v
    $('#leanToggle').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === leanView)))
    renderLean()
  })
  $('#leanToggle').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === leanView)))

  render()
  scrolly($('#leanStory'), { onStep: (i, step) => { story = step; lean.close(); placeControls(); renderLean() } })

  // --- the herding exhibit -------------------------------------------------------------
  makeHerd({ view: $('#herdView'), controls: $('#herdControls'), result: $('#herdResult') })
}

main().catch(showLoadError)
