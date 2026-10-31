// Part 2, page 2: the luck test, the streetlight exhibit, and the published odds.
//
// One number per claim: the guided steps quote the 200,000-trial simulations in
// clustering_null.json and draw their piles from the same file, so the pile,
// the count beside the real arrow and the odds in the card all agree. The
// reader's own sample, on the last step, gets its own seeded simulation, and
// its verdict is read from that same pile.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { makeLuck } from '../charts/luck.js'
import { makeBias } from '../charts/bias.js'
import { drawOdds } from '../charts/odds.js'
import { scrolly } from '../scrolly.js'
import { resultant, nullDistribution, seededRandom, oneIn } from '../stats.js'
import { loadSample, selected, withAlignment, renderControls, STRICT, LOOSE } from '../sample.js'

const $ = s => document.querySelector(s)
const RAD = Math.PI / 180

async function main () {
  const { etnos, clustering_null: nulls, published_odds: published } = await loadData('etnos', 'clustering_null', 'published_odds')
  const TRIALS = nulls._n_trials
  const state = loadSample()
  let story = 'one'

  // --- the piles ------------------------------------------------------------------
  // A stored pile when the sample is one of the published cuts, else a seeded one
  // of its own (kept per size, so it never reshuffles under the reader).
  const storedFor = s => (s.aMax === Infinity && s.qMax === Infinity)
    ? nulls.cuts.find(c => c.a_min_au === s.aMin && c.q_min_au === s.qMin && c.well_determined_only === !!s.quality)
    : null
  const simCache = new Map()
  function pileFor (s, n, R) {
    const cut = storedFor(s)
    if (cut && cut.n_objects === n) {
      const beat = Math.max(0, Math.round(cut.p_value * (TRIALS + 1) - 1))
      return { counts: cut.null_histogram.counts, trials: TRIALS, beat, p: cut.p_value }
    }
    const m = Math.max(n, 2)
    if (!simCache.has(m)) simCache.set(m, nullDistribution(m, 20000, 40, seededRandom(1710 + m)))
    const sim = simCache.get(m)
    const beat = sim.values.filter(v => v >= R).length
    return { counts: sim.counts, trials: sim.trials, beat, p: (beat + 1) / (sim.trials + 1) }
  }
  const odds = p => `1 in ${oneIn(p).toLocaleString()}`

  const current = s => { const objs = withAlignment(selected(etnos, s)); return { objs, stats: resultant(objs.map(o => o.varpi_deg)) } }
  const sampleFor = step => step === 'explore' ? state : step === 'catch' ? LOOSE : STRICT
  const readout = (s, n) => `<b>${n}</b> objects · ${s.quality ? 'seen in more than one season' : 'including those seen once'}`

  // step 6: one row per distance cut, the objects seen in more than one season against every object
  const cutRows = [...new Set(nulls.cuts.map(c => `${c.a_min_au}/${c.q_min_au}`))].map(k => {
    const [a, q] = k.split('/').map(Number)
    const pick = good => nulls.cuts.find(c => c.a_min_au === a && c.q_min_au === q && c.well_determined_only === good)
    const good = pick(true), all = pick(false)
    return good && all && { a, title: `Out past ${a} AU, never closer than ${q} AU`, good: { oneIn: oneIn(good.p_value) }, all: { oneIn: oneIn(all.p_value) } }
  }).filter(Boolean).sort((x, y) => x.a - y.a)

  const luck = makeLuck($('#chartLuck'))
  function renderLuck () {
    const sample = sampleFor(story)
    const { objs, stats } = current(sample)
    $('#luckReadout').innerHTML = story === 'cuts' ? '' : readout(sample, stats.n)
    const pile = pileFor(sample, stats.n, stats.R)
    const got = `${pile.beat.toLocaleString()} of ${pile.trials.toLocaleString()} fakes got this far`
    const blocksText = { histTitle: 'Where each fake solar system lands', histSub: '' }
    const real = {
      ring: 'real', blocks: 'none', bars: true, observed: stats.R, obsText: got,
      histTitle: 'The real objects, against luck', histSub: 'violet: as lined up as the real ones',
      pileText: 'what luck produces',
    }
    const scenes = {
      one: { ring: 'random', blocks: 'one', ...blocksText },
      many: { ring: 'random', blocks: 'animate', animate: true, ...blocksText },
      all: { ring: 'random', blocks: 'none', bars: true, pileText: 'what luck produces', histTitle: `${pile.trials.toLocaleString()} fake solar systems`, histSub: '' },
      real,
      catch: { ...real, pileText: null },
      cuts: { ...real, cuts: cutRows },
      explore: { ...real, xMax: Math.min(1, Math.max(0.5, stats.R * 1.15)) },
    }
    luck.update({ n: stats.n, real: objs, quality: sample.quality, nullDist: pile, ...scenes[story] })
    if (story === 'explore') renderVerdict(stats, pile)
  }

  // a word or two and the odds, read from the pile on the chart
  function renderVerdict (stats, pile) {
    const el = $('#verdict')
    if (stats.n < 3) { el.innerHTML = ''; return }
    const p = pile.p
    const word = p < 0.01 ? 'Unlikely to be luck' : p < 0.05 ? 'Suggestive' : 'Looks like luck'
    const text = pile.beat === 0 ? `fewer than 1 in ${pile.trials.toLocaleString()}` : `about ${odds(p)}`
    el.innerHTML = `<p class="verdict ${p < 0.05 ? 'for' : 'against'}"><b>${word}</b> · ${text}</p>`
  }

  // --- numbers quoted in the text ---------------------------------------------------
  const s = current(STRICT), l = current(LOOSE)
  const sp = pileFor(STRICT, s.stats.n, s.stats.R), lp = pileFor(LOOSE, l.stats.n, l.stats.R)
  const nums = {
    strictN: s.stats.n, strictOdds: oneIn(sp.p).toLocaleString(), trials: TRIALS.toLocaleString(),
    looseN: l.stats.n, looseOdds: oneIn(lp.p).toLocaleString(), extraN: l.stats.n - s.stats.n,
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })

  // --- the head: three small compasses drawn from the data -------------------------
  const compass = (objs, { wedge } = {}) => {
    const c = 50, r = 30
    const dots = objs.map(o => {
      const a = o.varpi_deg * RAD, rr = r + 7
      return `<circle cx="${(c + rr * Math.cos(a)).toFixed(1)}" cy="${(c - rr * Math.sin(a)).toFixed(1)}" r="2.6" class="${o.well_determined ? 'in' : 'out'}"/>`
    }).join('')
    const st = resultant(objs.map(o => o.varpi_deg))
    const tip = [c + r * st.R * Math.cos(st.meanDeg * RAD), c - r * st.R * Math.sin(st.meanDeg * RAD)]
    const w = wedge ? `<path class="wedge" d="M50,50 L${50 + 46 * Math.cos(20 * RAD)},${50 - 46 * Math.sin(20 * RAD)} A46,46 0 0,0 ${50 + 46 * Math.cos(100 * RAD)},${50 - 46 * Math.sin(100 * RAD)} Z"/>` : ''
    return `<svg class="art head-compass" viewBox="0 0 100 100" aria-hidden="true">${w}<circle class="ring" cx="50" cy="50" r="${r}"/>${dots}
      ${wedge ? '' : `<line class="arrow" x1="50" y1="50" x2="${tip[0].toFixed(1)}" y2="${tip[1].toFixed(1)}"/>`}<circle class="sun" cx="50" cy="50" r="3"/></svg>`
  }
  // a cartoon sky for the third beat: orbits all round, the ones in the surveyed wedge found
  const fakeSky = Array.from({ length: 36 }, (_, i) => ({ varpi_deg: i * 10 + 5, well_determined: i * 10 + 5 > 20 && i * 10 + 5 < 100 }))
  $('#beatStrict').insertAdjacentHTML('afterbegin', compass(s.objs))
  $('#beatLoose').insertAdjacentHTML('afterbegin', compass(l.objs))
  $('#beatSky').insertAdjacentHTML('afterbegin', compass(fakeSky, { wedge: true }))

  renderControls($('#luckControls'), state, renderLuck, { note: 'also sets the previous page', showP9: false })
  renderLuck()
  scrolly($('#luckStory'), { onStep: (i, step) => { story = step; renderLuck() } })

  // --- the streetlight -------------------------------------------------------------------
  makeBias({ view: $('#biasView'), controls: $('#biasControls'), result: $('#biasResult') })

  // --- the published odds, as each abstract gives them, and our own test -------------------
  drawOdds($('#chartOdds'), [
    ...published.studies.map(d => ({
      label: d.label, detail: d.detail, side: d.side,
      ...(d.p ? { oneIn: oneIn(d.p) } : d.p_range ? { range: [1 / d.p_range[1], 1 / d.p_range[0]] } : {}),
    })),
    { label: 'Our test', detail: `${s.stats.n} objects seen in more than one season, no bias correction`, oneIn: oneIn(sp.p), side: 'ours' },
  ])
}

main().catch(showLoadError)
