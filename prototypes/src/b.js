// Prototype B — two selections, compared side by side. No filtering: both
// groups stay on screen so differences are read directly rather than
// remembered between drags.

import './shared.css'
import { loadObjects, applySelection, summarise, fmtOdds } from './data.js'
import { makeScatter } from './charts/scatter.js'
import { drawRose } from './charts/rose.js'
import { drawNull } from './charts/nulldist.js'

const $ = s => document.querySelector(s)
let OBJECTS = []
let scatter = null
let target = 'A'
let tried = 0
const groups = {
  A: { sel: null, label: 'Group A', colour: 'var(--a)' },
  B: { sel: null, label: 'Group B', colour: 'var(--b)' },
}

const PAIRS = {
  neptune: {
    A: { sel: { a0: 150, a1: 20000, q0: 45, q1: 90 }, label: 'Beyond Neptune’s reach (q > 45)' },
    B: { sel: { a0: 150, a1: 20000, q0: 30, q1: 45 }, label: 'Neptune can still reach (q < 45)' },
  },
  quality: {
    A: { sel: { a0: 150, a1: 20000, q0: 30, q1: 90, qualityOnly: true }, label: 'Well-measured orbits only' },
    B: { sel: { a0: 150, a1: 20000, q0: 30, q1: 90 }, label: 'Every object, however uncertain' },
  },
  distance: {
    A: { sel: { a0: 150, a1: 250, q0: 30, q1: 90 }, label: 'Nearer (a 150–250 AU)' },
    B: { sel: { a0: 250, a1: 20000, q0: 30, q1: 90 }, label: 'Further out (a > 250 AU)' },
  },
}

function statsFor (key) {
  const g = groups[key]
  if (!g.sel) return null
  return summarise(applySelection(OBJECTS, g.sel))
}

function paint (key, s) {
  const k = key.toLowerCase()
  const g = groups[key]
  $(`#title${key}`).textContent = g.label
  if (!s || s.n < 3) {
    $(`#sub${key}`).textContent = g.sel ? 'Fewer than 3 objects — nothing to test.' : 'No group selected yet.'
    $(`#${k}N`).textContent = s ? s.n : '—'
    $(`#${k}R`).textContent = '—'; $(`#${k}P`).textContent = '—'
    $(`#${k}P`).className = 'v'
    $(`#rose${key}`).innerHTML = ''
    $(`#null${key}`).innerHTML = ''
    return
  }
  drawRose($(`#rose${key}`), { stats: s, colour: g.colour, size: 240 })
  drawNull($(`#null${key}`), { stats: s, colour: g.colour, width: 320, height: 200 })
  $(`#sub${key}`).textContent =
    `${s.beat.toLocaleString()} of ${s.nullDist.trials.toLocaleString()} random universes agreed at least this well.`
  $(`#${k}N`).textContent = s.n
  $(`#${k}R`).textContent = s.R.toFixed(3)
  const pEl = $(`#${k}P`)
  pEl.textContent = fmtOdds(s.p)
  pEl.className = 'v ' + (s.p < 0.05 ? 'good' : 'bad')
}

function render () {
  const sa = statsFor('A'), sb = statsFor('B')
  paint('A', sa); paint('B', sb)

  scatter = makeScatter($('#scatter'), {
    objects: OBJECTS,
    brushes: [
      { sel: groups.A.sel, colour: '#3987e5' },
      { sel: groups.B.sel, colour: '#d95926' },
    ].filter(b => b.sel),
    onBrush: s => {
      groups[target].sel = s ? { ...s, qualityOnly: groups[target].sel?.qualityOnly } : null
      if (s) groups[target].label = `Group ${target} (drawn)`
      bump(); render()
    },
  })
  scatter.setColour(target === 'A' ? '#3987e5' : '#d95926')

  const v = $('#verdict')
  if (sa && sb && sa.n >= 3 && sb.n >= 3) {
    const strong = sa.R >= sb.R ? 'A' : 'B'
    const d = Math.abs(sa.R - sb.R)
    v.innerHTML = `<p><b>${groups[strong].label}</b> agrees more strongly —
      ${Math.max(sa.R, sb.R).toFixed(3)} against ${Math.min(sa.R, sb.R).toFixed(3)},
      a gap of ${d.toFixed(3)}. Odds by luck: ${fmtOdds(sa.p)} versus ${fmtOdds(sb.p)}.
      ${d < 0.08 ? 'That gap is small — be wary of reading much into it.' : ''}</p>`
  } else {
    v.innerHTML = '<p>Pick two groups to compare them.</p>'
  }
}

let bumpTimer = null
function bump () {
  clearTimeout(bumpTimer)
  bumpTimer = setTimeout(() => {
    tried++; $('#counter').textContent = `selections tried: ${tried}`
  }, 400)
}

function setTarget (t) {
  target = t
  $('#tgtA').setAttribute('aria-pressed', String(t === 'A'))
  $('#tgtB').setAttribute('aria-pressed', String(t === 'B'))
  // Show the target group's existing box in the live brush, so switching
  // groups reveals what is already there rather than wiping it.
  scatter.setColour(t === 'A' ? '#3987e5' : '#d95926')
  scatter.setSelection(groups[t].sel)
  render()
}

async function init () {
  OBJECTS = await loadObjects()
  render()
  $('#tgtA').addEventListener('click', () => setTarget('A'))
  $('#tgtB').addEventListener('click', () => setTarget('B'))
  document.querySelectorAll('[data-pair]').forEach(btn =>
    btn.addEventListener('click', () => {
      const p = PAIRS[btn.dataset.pair]
      groups.A.sel = p.A.sel; groups.A.label = p.A.label
      groups.B.sel = p.B.sel; groups.B.label = p.B.label
      bump(); render(); scatter.clear()
    }))
  $('#clear').addEventListener('click', () => {
    groups.A.sel = null; groups.A.label = 'Group A'
    groups.B.sel = null; groups.B.label = 'Group B'
    render(); scatter.clear()
  })
}

init().catch(e => {
  document.body.insertAdjacentHTML('afterbegin',
    `<div class="wrap" style="padding:30px;color:var(--b)">Could not load data: ${e.message}</div>`)
  console.error(e)
})
