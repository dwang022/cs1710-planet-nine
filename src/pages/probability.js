// Part 2: could it just be luck? (Rebuilt 2026-11-17 and 18, round 7.) Two walkthroughs on copies of one picture
// (charts/luck.js, makeLuck), then two figures of their own:
//
//   Testing for “luck”   the six orbits of 2016 on two compasses, their spreads; generating a sample (telescopes did not
//                        search evenly, so Batygin and Brown drew on the 827 known objects); one random sample; samples
//                        dropping onto two piles; 100,000 of them, as the paper drew, samples still feeding in; both at
//                        once, the square of every sample by its two spreads beside the sum; the square's corner
//                        enlarged twice.
//   Today’s objects      the same on the 62 reliable orbits: the compasses, samples dropping, the piles, the square and
//                        its sum (multiplied, as in 2016).
//   Does it hold up?     are the two unrelated (makeRelated): how often the tilt is as tight among all samples of a
//                        million and among those whose stretch is.
//   Where the line is drawn (makeLineTool): today's orbits with a line the reader drags, luck's odds at each distance.
//
// One number per claim: every figure comes from bb2016.json (scripts/build_bb2016.py: 100,000 samples as the paper,
// the same samples on to a million for the count of those tight in both, today's lines at nine distances).

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { makeLuck, makeRelated, makeLineTool } from '../charts/luck.js'
import { luckHead } from '../charts/luckhead.js'
import { scrolly } from '../scrolly.js'
import { oneIn } from '../stats.js'
import { watchClues } from '../clues.js'

const $ = s => document.querySelector(s)
const fmt = n => n.toLocaleString('en-US')
// a share as a percentage to two significant figures: 0.0097 → 0.97%, 0.00007 → 0.007%
const pct = p => `${+(p * 100).toPrecision(2)}%`
const deg = d => `${Math.round(d)}°`

// “stretch out” and “tilt” in the part's red wherever the page writes them, as on the clustering page (clues.js)
watchClues()

/** How many times as many known objects the fullest 10° slice of directions holds as the emptiest, as the compasses stack them. */
function sliceRatio (degs) {
  const slices = Array(36).fill(0)
  for (const d of degs) slices[Math.floor((((d % 360) + 360) % 360) / 10)]++
  return Math.round(Math.max(...slices) / Math.min(...slices))
}
/** “4” or “4 to 5”: the two compasses' ratios, as a range where they differ. */
const ratioText = (a, b) => a === b ? `${a}` : `${Math.min(a, b)} to ${Math.max(a, b)}`

async function main () {
  const { etnos, bb2016: bb } = await loadData('etnos', 'bb2016')

  // --- Testing for “luck”: one change a step ------------------------------------------------
  const luck = makeLuck($('#chartLuck'), bb, etnos)
  const luckScenes = {
    six: { set: 'six', label: 'The six orbits of 2016 on two compasses, which way each stretches out and which way each tilts, each set’s spread a wedge.' },
    pool: { set: 'six', pool: '2016', label: 'Round both compasses, each known object as a dot, stacked by its direction.' },
    draws: { set: 'draws', pool: '2016', label: 'Six known objects picked at random, again and again, lit in their stacks round both compasses, with both spreads.' },
    drop: { set: 'draws', pool: '2016', pile: 'drop', label: 'Samples dropping onto two piles, one for each spread, quicker and quicker.' },
    repro: { set: 'draws', pool: '2016', pile: 'repro', fill: true, feed: true, label: 'Histograms of the spreads of 100,000 samples, the six orbits of 2016 marked far out in each tight tail, samples still feeding in.' },
    multiply: { square: 'sum', pile: 'repro', label: 'Every sample placed by its two spreads, tightest at the corner, beside the two shares multiplied.' },
    zoom: { square: 'zoom', pile: 'repro', label: 'The corner of the square enlarged twice, to one dot per sample: about 9 of 100,000 as tight in both.' },
  }
  luck.update(luckScenes.six)
  scrolly($('#luckStory'), { onStep: (i, step) => luck.update(luckScenes[step]) })

  // --- Today’s objects -------------------------------------------------------------------------
  const todayChart = makeLuck($('#chartToday'), bb, etnos)
  const todayScenes = {
    today: { set: 'today', cut: '150', pool: 'today', label: 'Today’s 62 reliable orbits on the two compasses, much wider wedges than the six’s, with the 1,589 objects known today round them.' },
    todayDraws: { set: 'todayDraws', cut: '150', pool: 'today', pile: 'drop', label: 'Samples of 62 of today’s known objects dropping onto two piles, quicker and quicker.' },
    todayPile: { set: 'todayDraws', cut: '150', pool: 'today', pile: 'today', fill: true, feed: true, label: 'Histograms of the spreads of 100,000 samples of today’s objects, samples still feeding in.' },
    todayBoth: { square: 'todaySum', cut: '150', pile: 'today', label: 'Every sample of today’s objects placed by its two spreads, beside the two shares multiplied: the corner is large enough to see.' },
  }
  todayChart.update(todayScenes.today)
  scrolly($('#todayStory'), { onStep: (i, step) => todayChart.update(todayScenes[step]) })

  // --- Does it hold up?, and where the line is drawn ---------------------------------------------
  makeRelated($('#chartRelated'), bb)
  makeLineTool($('#lineView'), bb, etnos)

  // --- numbers quoted in the text -------------------------------------------------------
  const R = bb.repro, J = bb.joint_check, pub = bb.published
  const cut = (a, q = 30) => bb.today.find(r => r.a_min_au === a && r.q_min_au === q)
  const today = cut(150), today250 = cut(250), q42 = bb.today.find(r => r.q_min_au > 30)
  const cutOdds = bb.today.filter(r => r.q_min_au === 30).map(r => oneIn(r.both.p))
  const far = p => p[0] + 180, tilt = n => n + 90
  const nums = {
    pubBoth: pct(pub.both.p),
    // the product as a round “less than 1 in …”: 1 in 11,000 reads as less than 1 in 10,000
    lessThan: fmt(10 ** Math.floor(Math.log10(1 / R.product))), productN: fmt(Math.round(R.product * R.draws)), pubBothOdds: fmt(oneIn(pub.both.p)), pubPeri: pct(pub.closest.p), pubTilt: pct(pub.tilt.p),
    pubDraws: fmt(pub.draws.n),
    sixSpread: deg(R.closest.spread_deg), sixTiltSpread: deg(R.tilt.spread_deg),
    poolN: fmt(bb.pool_2016.n), draws: fmt(R.draws),
    poolRatio: ratioText(sliceRatio(bb.pool_2016.points.map(far)), sliceRatio(bb.pool_2016.node_deg.map(tilt))),
    periP: pct(R.closest.p), tiltP: pct(R.tilt.p),
    productOdds: fmt(oneIn(R.product)),
    jointN: fmt(J.both_n), jointPred: fmt(Math.round(J.product_expects_n)), jointOdds: fmt(oneIn(J.both_n / J.draws)),
    jointDraws: fmt(J.draws), jointA: fmt(J.closest_n), jointProductOdds: fmt(oneIn(J.product_expects_n / J.draws)),
    todayN: today.n, todaySpread: deg(today.closest.spread_deg), todayTiltSpread: deg(today.tilt.spread_deg),
    poolTodayN: fmt(bb.pool_today.n),
    todayP: pct(today.closest.p), todayTiltP: pct(today.tilt.p), todayOdds: fmt(oneIn(today.product)), today250N: today250.n,
    cutMin: fmt(Math.min(...cutOdds)), cutMax: fmt(Math.max(...cutOdds)), q42Odds: fmt(oneIn(q42.both.p)), q42Au: q42.q_min_au,
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })

  // --- the head: a few pretend skies drawn from the known objects, then the six of 2016, each with its spread ---------
  const draws = R.examples.slice(0, 3).map(e => ({ dirs: e.idx.map(j => (bb.pool_2016.points[j][0] + 180) % 360), spread: e.spread }))
  luckHead($('#luckHead'), { six: bb.six, spread: R.closest.spread_deg, draws })
}

main().catch(showLoadError)
