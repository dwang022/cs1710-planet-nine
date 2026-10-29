// Part 1, page 2: the zoom-out from Earth to the farthest known orbits.
// (The discovery frames, catalogues and grid are on the next page, data.js.)

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { makeDistance, fmtAu, lightTime } from '../charts/distance.js'
import { scrolly, scrollyProgress } from '../scrolly.js'
import { PLANET_NINE } from '../orbits.js'
import { STRICT, selected, withAlignment } from '../sample.js'

const $ = s => document.querySelector(s)
const fmt = d3.format(',.0f')

async function main () {
  const { etnos, planets, planet_nine_predictions: preds } = await loadData('etnos', 'planets', 'planet_nine_predictions')
  const PLANETS = planets.planets.map(p => ({ name: p.name, a: p.a, e: p.e, q: p.a * (1 - p.e), Q: p.a * (1 + p.e) }))

  // --- the zoom-out ------------------------------------------------------------
  const bb21 = preds.orbit_predictions.find(p => p.is_default) || {}
  const distance = makeDistance($('#chartDist'), {
    planets: PLANETS,
    p9: { a: PLANET_NINE.a_au, e: PLANET_NINE.e, aErr: bb21.a_au_err || [0, 0], eErr: bb21.e_err || [0, 0] },
  })
  $('#distP9q').textContent = fmt(distance.p9.q); $('#distP9Q').textContent = fmt(distance.p9.Q)
  $('#distP9min').textContent = fmt(distance.p9.qMin); $('#distP9max').textContent = fmt(distance.p9.QMax)

  // The zoom-out draws one fixed group, the well-measured extreme objects:
  // briefly observed orbits have far ends too uncertain to put on a ruler.
  const objs = withAlignment(selected(etnos, STRICT))
  const far = objs.reduce((m, o) => (o.Q_au > m.Q_au ? o : m))
  $('#distFarAu').textContent = `${fmtAu(far.Q_au)} (${far.name || far.provisional_desig || far.id})`

  // The width of the view, in AU, at each card; scrolling eases between them in log space.
  const as = objs.map(o => o.a_au).sort(d3.ascending)
  const extreme = Math.max(420, (d3.quantile(as, 0.75) || 500) * 1.6)
  const keys = [1.75, 11.5, 34, 56, extreme, Math.max(extreme, distance.p9.QMax * 1.12), distance.viewFor(far)]
  for (let i = 1; i < keys.length; i++) keys[i] = Math.max(keys[i], keys[i - 1] * 1.05)

  let step = 'home', progress = { k: 0, t: 0 }
  distance.update({ objects: objs, showP9: true, far, step })
  function applyView () {
    const { k, t } = progress
    const a = keys[Math.min(k, keys.length - 1)], b = keys[Math.min(k + 1, keys.length - 1)]
    const u = Math.min(1, Math.max(0, (t - 0.25) / 0.5)), s = u * u * (3 - 2 * u)
    const view = Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * s)
    distance.setView(view)
    $('#distReadout').innerHTML = `Sun out to <b>${fmtAu(view)}</b> · light takes <b>${lightTime(view)}</b> to cross this view`
  }
  scrolly($('#distStory'), { onStep: (i, s) => { step = s; distance.update({ step: s }) } })
  scrollyProgress($('#distStory'), (k, t) => { progress = { k, t }; applyView() })

  // --- numbers quoted in the text ------------------------------------------------
  const nums = { strictN: objs.length }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })

}

main().catch(showLoadError)
