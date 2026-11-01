// Part 2, page 2: could the lean be luck? A walkthrough (charts/luck.js) that
// builds the luck test in front of the reader, fake solar systems flying onto
// the pile, then one chart of what the published studies conclude beside our
// own counts (charts/odds.js).
//
// One number per claim: the steps quote the 200,000-trial simulations in
// clustering_null.json and draw their piles from the same file, so the pile,
// the count beside the real arrow and the odds in the card all agree; the
// published odds are each paper's own abstract (published_odds.json).

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { makeLuck } from '../charts/luck.js'
import { luckHead } from '../charts/luckhead.js'
import { drawOdds } from '../charts/odds.js'
import { scrolly } from '../scrolly.js'
import { resultant, oneIn } from '../stats.js'
import { selected, withAlignment, STRICT, LOOSE } from '../sample.js'

const $ = s => document.querySelector(s)

async function main () {
  const { etnos, clustering_null: nulls, published_odds: published } = await loadData('etnos', 'clustering_null', 'published_odds')
  const TRIALS = nulls._n_trials
  let story = 'one'

  // the stored pile for a fixed sample
  const cutFor = (a, q, good) => nulls.cuts.find(c => c.a_min_au === a && c.q_min_au === q && c.well_determined_only === good)
  function pileFor (s) {
    const cut = cutFor(s.aMin, s.qMin, !!s.quality)
    const beat = Math.max(0, Math.round(cut.p_value * (TRIALS + 1) - 1))
    return { counts: cut.null_histogram.counts, trials: TRIALS, beat, p: cut.p_value, n: cut.n_objects }
  }
  const current = s => { const objs = withAlignment(selected(etnos, s)); return { objs, stats: resultant(objs.map(o => o.varpi_deg)) } }
  const sampleFor = step => step === 'catch' ? LOOSE : STRICT
  const readout = (s, n) => `<b>${n}</b> objects · ${s.quality ? 'seen in more than one season' : 'including those seen once'}`

  // step 6: one row per distance cut, the objects seen in more than one season against every object
  const cutRows = [...new Set(nulls.cuts.map(c => `${c.a_min_au}/${c.q_min_au}`))].map(k => {
    const [a, q] = k.split('/').map(Number)
    const good = cutFor(a, q, true), all = cutFor(a, q, false)
    return good && all && { a, title: `Out past ${a} AU, never closer than ${q} AU`, good: { oneIn: oneIn(good.p_value) }, all: { oneIn: oneIn(all.p_value) } }
  }).filter(Boolean).sort((x, y) => x.a - y.a)

  const luck = makeLuck($('#chartLuck'))
  function renderLuck () {
    const sample = sampleFor(story)
    const { objs, stats } = current(sample)
    $('#luckReadout').innerHTML = story === 'cuts' ? '' : readout(sample, stats.n)
    const pile = pileFor(sample)
    const got = `${pile.beat.toLocaleString()} of ${pile.trials.toLocaleString()} fakes were as aligned`
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
    }
    luck.update({ n: stats.n, real: objs, quality: sample.quality, nullDist: pile, ...scenes[story] })
  }

  // --- numbers quoted in the text ---------------------------------------------------
  const s = current(STRICT), l = current(LOOSE)
  const sp = pileFor(STRICT), lp = pileFor(LOOSE)
  const nums = {
    strictN: s.stats.n, strictOdds: oneIn(sp.p).toLocaleString(), trials: TRIALS.toLocaleString(),
    looseN: l.stats.n, looseOdds: oneIn(lp.p).toLocaleString(), extraN: l.stats.n - s.stats.n,
    realPct: `${Math.round(s.stats.R * 100)}%`,
    // how many trusted objects each cut keeps, nearest first
    cutNs: nulls.cuts.filter(c => c.well_determined_only).sort((a, b) => a.a_min_au - b.a_min_au)
      .map(c => `${c.n_objects} past <span class="k-au">${c.a_min_au} AU</span>`).join(', '),
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.innerHTML = nums[el.dataset.n] ?? '—' })

  // --- the head: a few random skies, then the real one ---------------------------------
  luckHead($('#luckHead'), { real: s.objs })

  renderLuck()
  scrolly($('#luckStory'), { onStep: (i, step) => { story = step; renderLuck() } })

  // --- what the studies conclude, by author, and our own test, on one axis ------------------
  drawOdds($('#chartOdds'), [
    { heading: 'Published studies' },
    ...published.studies.map(d => ({
      label: d.label, detail: d.plain_detail, side: d.side,
      // a study that finds chance is shown as that, in words, whether its abstract gives a range or no number
      ...(d.p ? { oneIn: oneIn(d.p) } : {}),
    })),
    { heading: 'Our test, above' },
    { label: `${sp.n} objects seen in more than one season`, detail: 'no allowance for where telescopes looked', oneIn: oneIn(sp.p), side: 'ours' },
    { label: `All ${lp.n}, adding those seen once`, detail: 'no allowance for where telescopes looked', oneIn: oneIn(lp.p), side: 'ours' },
  ])
}

main().catch(showLoadError)
