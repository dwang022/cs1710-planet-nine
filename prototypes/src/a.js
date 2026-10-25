// Prototype A — cross-filter. One selection drives both downstream views.

import './shared.css'
import { loadObjects, applySelection, summarise, fmtOdds, VERDICT } from './data.js'
import { makeScatter } from './charts/scatter.js'
import { drawRose } from './charts/rose.js'
import { drawNull } from './charts/nulldist.js'

const $ = s => document.querySelector(s)
let OBJECTS = []
let scatter = null
let selection = null
let qualityOnly = false
let tried = 0

const PRESETS = {
  all: null,
  detached: { a0: 150, a1: 20000, q0: 45, q1: 90 },
  near: { a0: 150, a1: 20000, q0: 30, q1: 45 },
  far: { a0: 250, a1: 20000, q0: 30, q1: 90 },
}

function current () {
  return applySelection(OBJECTS, selection ? { ...selection, qualityOnly } : { a0: 0, a1: 1e9, q0: 0, q1: 1e9, qualityOnly })
}

function render () {
  const sel = current()
  const stats = summarise(sel)

  drawRose($('#rose'), { stats, colour: 'var(--a)', size: 300 })
  drawNull($('#null'), { stats, colour: 'var(--a)' })

  $('#roN').textContent = stats.n
  $('#roR').textContent = stats.n >= 3 ? stats.R.toFixed(3) : '—'
  const v = VERDICT(stats.p)
  const pEl = $('#roP')
  pEl.textContent = stats.n >= 3 ? fmtOdds(stats.p) : '—'
  pEl.className = 'v ' + (stats.n < 3 ? '' : v.tone === 'good' ? 'good' : v.tone === 'bad' ? 'bad' : '')
  $('#nullSub').textContent = stats.n >= 3
    ? `${stats.n} objects. Of ${stats.nullDist.trials.toLocaleString()} random universes, ${stats.beat.toLocaleString()} agreed at least this well — ${v.text}.`
    : 'Select at least 3 objects.'

  // redraw the scatter so the dots reflect the quality filter
  scatter = makeScatter($('#scatter'), {
    objects: qualityOnly ? OBJECTS.filter(o => o.well_determined) : OBJECTS,
    brushes: [],
    onBrush: s => { selection = s; bump(); render() },
  })
}

let bumpTimer = null
function bump () {
  clearTimeout(bumpTimer)
  bumpTimer = setTimeout(() => {
    tried++
    $('#counter').textContent = `selections tried: ${tried}`
  }, 400)
}

async function init () {
  OBJECTS = await loadObjects()
  render()

  document.querySelectorAll('[data-preset]').forEach(b =>
    b.addEventListener('click', () => {
      selection = PRESETS[b.dataset.preset]
      bump()
      render()
      scatter.setSelection(selection)
    }))
  $('#clear').addEventListener('click', () => {
    selection = null; render(); scatter.clear()
  })
  $('#qualityOnly').addEventListener('change', e => {
    qualityOnly = e.target.checked; render()
    if (selection) scatter.setSelection(selection)
  })
}

init().catch(e => {
  document.body.insertAdjacentHTML('afterbegin',
    `<div class="wrap" style="padding:30px;color:var(--b)">Could not load data: ${e.message}</div>`)
  console.error(e)
})
