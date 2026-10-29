// Part 2, page 1: the orbits lean the same way, and the herding exhibit.

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { makeLean } from '../charts/lean.js'
import { makeScatter } from '../charts/scatter.js'
import { makeHerd } from '../charts/herd.js'
import { scrolly } from '../scrolly.js'
import { resultant } from '../stats.js'
import { PLANET_NINE, angleDiff, semiLatusRectum } from '../orbits.js'
import { loadSample, saveSample, selected, withAlignment, isBoxed, renderControls, STRICT, DEFAULTS } from '../sample.js'

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
    const note = own && isBoxed(s) ? ' · your custom group' : !own && Object.keys(s).some(k => s[k] !== state[k]) ? ' · this step’s sample; your filters return on the last card' : ''
    return `<b>${n}</b> objects · ${s.quality ? 'well-measured orbits only' : 'including briefly seen orbits'}${note}`
  }

  const lean = makeLean($('#chartLean'))
  function renderLean () {
    const sample = sampleFor(story)
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
    lean.update(objs, stats, { layout: 'orbits', maxAu: sc.objects, focus: SEDNA, halfCount, labels: {}, ...scenes[story] })
  }

  // --- numbers quoted in the cards -----------------------------------------------
  const s = current(STRICT)
  const half = s.objs.filter(o => Math.abs(angleDiff(o.varpi_deg, s.stats.meanDeg)) <= 90).length
  const nums = {
    sednaDeg: etnos.find(o => o.id === SEDNA).varpi_deg.toFixed(0),
    strictN: s.stats.n, strictHalf: half, strictHalfExpect: Math.round(s.stats.n / 2), strictR: s.stats.R.toFixed(2),
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })

  // --- the reader's sample: controls in the last card, the scatter and the table below
  const controls = renderControls($('#leanControls'), state, render, { note: 'also sets the next page' })
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
      <td>${o.well_determined ? 'well measured' : 'short arc'}</td></tr>`).join('')
    $('#dataTable tbody').innerHTML = rows || '<tr><td colspan="7" style="padding:18px;text-align:center">No objects match.</td></tr>'
  }
  function render () {
    const { objs } = current(state)
    renderLean()
    const ids = new Set(objs.map(o => o.id))
    scatter.update(state.quality ? etnos.filter(o => o.well_determined) : etnos, o => ids.has(o.id))
    scatter.setSelection(isBoxed(state) ? state : null)
    $('#selChip').innerHTML = isBoxed(state)
      ? `<span style="display:inline-flex;align-items:center;gap:10px;background:#199e7022;border:1px solid var(--series-3);border-radius:999px;padding:6px 14px;font-size:.82rem">
           Showing reach ${fmt(state.aMin)}–${fmt(state.aMax)} AU, closest ${state.qMin.toFixed(0)}–${state.qMax.toFixed(0)} AU
           <button id="clearBox" style="background:none;border:0;color:var(--series-3);cursor:pointer;font:inherit;padding:0">clear ✕</button></span>`
      : `<span style="font-size:.82rem;color:var(--text-muted)">No box drawn: showing everything the filters allow.</span>`
    $('#clearBox')?.addEventListener('click', () => { Object.assign(state, { aMin: DEFAULTS.aMin, qMin: DEFAULTS.qMin, aMax: Infinity, qMax: Infinity }); controls.sync(); saveSample(state); render() })
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
  scrolly($('#leanStory'), { onStep: (i, step) => { story = step; $('#leanToggle').hidden = step !== 'explore'; renderLean() } })

  // --- the herding exhibit -------------------------------------------------------------
  makeHerd({ view: $('#herdView'), controls: $('#herdControls'), result: $('#herdResult') })
}

main().catch(showLoadError)
