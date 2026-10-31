// Part 1, page 2: the zoom-out from Earth to the farthest known orbits.
// (The discovery frames, catalogues and grid are on the next page, data.js.)

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { makeDistance, fmtAu, lightTime, lightDays, KUIPER } from '../charts/distance.js'
import { drawAuRuler } from '../charts/auruler.js'
import { scrolly, scrollyProgress } from '../scrolly.js'
import { planetAt } from '../orbits.js'
import { STRICT, selected } from '../sample.js'

const $ = s => document.querySelector(s)

async function main () {
  const { etnos, planets, planet_nine_predictions: preds, positions } = await loadData('etnos', 'planets', 'planet_nine_predictions', 'positions')

  drawAuRuler($('#auRuler'), planets.planets)

  // --- the zoom-out ------------------------------------------------------------
  // Everything on the map is where it was on the catalogue date the positions were built for.
  const PLANETS = planets.planets.map(p => planetAt(p, positions.epoch_jd))
  const bb21 = preds.orbit_predictions.find(p => p.is_default)
  const distance = makeDistance($('#chartDist'), {
    planets: PLANETS,
    p9: { a: bb21.a_au, e: bb21.e, varpi: bb21.varpi_deg, aErr: bb21.a_au_err, eErr: bb21.e_err, varpiErr: bb21.varpi_deg_err },
    voyager: positions.voyager_1,
  })

  // The zoom-out draws one fixed group, the extreme objects seen in more than one
  // season: orbits seen in one season only have far ends too uncertain to draw.
  const objs = selected(etnos, STRICT)
  const far = objs.reduce((m, o) => (o.Q_au > m.Q_au ? o : m))

  const order = [...document.querySelectorAll('#distStory .step')].map(s => s.dataset.step)
  let progress = { k: 0, t: 0 }
  distance.update({ objects: objs, far, step: order[0] })
  // Each card has a frame; scrolling through the middle half of a card glides to the next one's.
  function applyView () {
    const { k, t } = progress
    const a = order[Math.min(k, order.length - 1)], b = order[Math.min(k + 1, order.length - 1)]
    const u = Math.min(1, Math.max(0, (t - 0.25) / 0.5)), s = u * u * (3 - 2 * u)
    distance.glide(a, b, s)
    const w = distance.width()
    $('#distReadout').innerHTML = `This view is <b class="k-au">${fmtAu(w)}</b> across · light takes <b>${lightTime(w)}</b> to cross it`
  }
  scrolly($('#distStory'), { onStep: (i, s) => distance.update({ step: s }) })
  scrollyProgress($('#distStory'), (k, t) => { progress = { k, t }; applyView() })
  applyView()

  // --- numbers quoted in the text ------------------------------------------------
  // p9q and p9Q are the head's question: the two ends of Planet Nine's best-fit orbit.
  const P = Object.fromEntries(PLANETS.map(p => [p.name, p]))
  const drawn = distance.objects()
  const nowMax = d3.max(drawn, o => o.now_au)
  const years = d3.format(',.2r')
  const nums = {
    strictN: objs.length,
    p9q: fmtAu(distance.p9.q), p9Q: fmtAu(distance.p9.Q),
    rockyAu: fmtAu(Math.ceil(P.Mars.a * (1 + P.Mars.e))), jupAu: fmtAu(Math.round(P.Jupiter.a)),
    earthLight: lightTime(P.Earth.a),
    nowMin: fmtAu(d3.min(drawn, o => o.now_au)), nowMax: fmtAu(nowMax),
    nearN: drawn.filter(o => o.now_au <= KUIPER[1]).length, beltEdge: fmtAu(KUIPER[1]),
    medQ: fmtAu(d3.median(objs, o => o.Q_au)),
    minP: years(d3.min(objs, o => o.period_yr)), maxP: years(d3.max(objs, o => o.period_yr)),
    farAu: fmtAu(100),
    bandMin: fmtAu(distance.p9.bandMin), bandMax: fmtAu(distance.p9.bandMax),
    p9Light: `${lightDays(distance.p9.q)} to ${lightDays(distance.p9.Q)} days`,
    voyAu: fmtAu(positions.voyager_1.r_au),
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })
}

main().catch(showLoadError)
