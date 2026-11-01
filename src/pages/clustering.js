// Part 2, page 1: the orbits lean the same way, and what could do it.

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { makeLean } from '../charts/lean.js'
import { makeCompare, COMPARE } from '../charts/compare.js'
import { orbitIntro } from '../charts/orbitintro.js'
import { leanHead } from '../charts/leanhead.js'
import { scrolly } from '../scrolly.js'
import { resultant } from '../stats.js'
import { PLANET_NINE, angleDiff, semiLatusRectum, isOriginalSix } from '../orbits.js'
import { selected, withAlignment, STRICT, LOOSE } from '../sample.js'

const $ = s => document.querySelector(s)
const fmt = d3.format(',.0f')
const SEDNA = '90377'
const NEPTUNE_AU = 30.07   // Neptune's average distance, as in charts/lean.js

async function main () {
  const { etnos, planets } = await loadData('etnos', 'planets')
  let story = 'one'

  // every step describes the fixed trusted sample, so its quoted numbers never move
  const current = s => { const objs = withAlignment(selected(etnos, s)); return { objs, stats: resultant(objs.map(o => o.varpi_deg)) } }

  // Scale the orbit view to the perihelion arcs, not the aphelia: the arcs carry the direction.
  function viewScale (objs) {
    const reach = objs.map(o => semiLatusRectum(o.a_au, o.e)).sort(d3.ascending)
    const objects = Math.max(120, (d3.quantile(reach, 0.95) || 140) * 1.18)
    return objects
  }

  // the key: each mark as it appears on the picture
  const KEY = {
    dot: '<svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="var(--series-1)"/></svg>closest point to the Sun',
    orbit: '<svg viewBox="0 0 24 14"><path d="M1,12 Q12,0 23,12" fill="none" stroke="var(--series-1)" stroke-width="2"/></svg>orbit',
    arrow: '<svg viewBox="0 0 24 14"><path d="M2,7 H18 M14,3 L20,7 L14,11" fill="none" stroke="var(--text-primary)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>average direction',
  }
  function drawKey (sc) {
    const on = ['dot', sc.layout === 'orbits' && 'orbit', sc.mean && 'arrow'].filter(Boolean)
    $('#leanKey').innerHTML = on.map(k => `<li class="legend-item">${KEY[k]}</li>`).join('')
  }

  const lean = makeLean($('#chartLean'))
  function renderLean () {
    const { objs, stats } = current(STRICT)
    const halfCount = objs.filter(o => Math.abs(angleDiff(o.varpi_deg, stats.meanDeg)) <= 90).length
    $('#leanReadout').innerHTML = `<b>${stats.n}</b> objects · seen in more than one season`
    const only = new Set([SEDNA])
    const scenes = {
      one: { only, labels: { sun: true, neptune: true, closest: true } },
      point: { only, pointer: true, compass: true, labels: { sun: true } },
      all: { stagger: true, fadeOrbits: true, labels: { sun: true, neptune: true } },
      half: { half: true, fadeOrbits: true, labels: { half: true } },
      ring: { layout: 'ring', compass: true },
      arrow: { layout: 'ring', compass: true, mean: true, labels: { mean: true, rim: true } },
    }
    const scene = { layout: 'orbits', maxAu: viewScale(objs), focus: SEDNA, halfCount, labels: {}, ...scenes[story] }
    lean.update(objs, stats, scene)
    drawKey(scene)
  }

  // --- numbers quoted in the cards -----------------------------------------------
  const s = current(STRICT)
  const half = s.objs.filter(o => Math.abs(angleDiff(o.varpi_deg, s.stats.meanDeg)) <= 90).length
  const nums = {
    sednaDeg: etnos.find(o => o.id === SEDNA).varpi_deg.toFixed(0),
    sednaQ: `${etnos.find(o => o.id === SEDNA).q_au.toFixed(0)} AU`,
    sednaX: Math.round(etnos.find(o => o.id === SEDNA).q_au / NEPTUNE_AU * 2) / 2,
    strictN: s.stats.n, strictHalf: half, strictHalfExpect: Math.round(s.stats.n / 2), strictPct: `${Math.round(s.stats.R * 100)}%`,
    looseExtra: current(LOOSE).stats.n - s.stats.n,
    p9Mass: Math.round(PLANET_NINE.mass_earths),
    lineUp: COMPARE.linedUp,
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })

  // --- the head: the planets (on the catalogue's date), the six orbits that started it, then Planet Nine ---
  leanHead($('#leanHead'), { six: etnos.filter(isOriginalSix), planets: planets.planets, jd: etnos[0].epoch_jd })

  // --- what an orbit is, before the pattern: Sedna's orbit, drawn to scale -----------------
  const intro = orbitIntro(etnos.find(o => o.id === SEDNA))
  document.querySelectorAll('#orbits .definition li[data-art]').forEach(li => {
    li.insertAdjacentHTML('afterbegin', `<figure class="rule-fig" aria-hidden="true">${intro[li.dataset.art]()}</figure>`)
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
  renderLean()
  renderTable(s.objs)
  scrolly($('#leanStory'), { onStep: (i, step) => { story = step; lean.close(); renderLean() } })

  // --- what a planet would do: no planet beside a planet ---------------------------------
  makeCompare({ root: $('#compareView'), bar: $('#compareBar'), stage: $('#compareView').parentElement, planets: planets.planets, jd: etnos[0].epoch_jd })
}

main().catch(showLoadError)
