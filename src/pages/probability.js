// Part 2, page 2: the luck test, the streetlight exhibit, and the published odds.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { makeLuck } from '../charts/luck.js'
import { makeBias } from '../charts/bias.js'
import { drawOdds } from '../charts/odds.js'
import { scrolly } from '../scrolly.js'
import { resultant, rayleighP, nullDistribution, formatP, seededRandom } from '../stats.js'
import { loadSample, selected, withAlignment, renderControls, STRICT, LOOSE } from '../sample.js'

const $ = s => document.querySelector(s)

async function main () {
  const { etnos, clustering_null: nulls } = await loadData('etnos', 'clustering_null')
  const CUTS = nulls.cuts
  const state = loadSample()
  let story = 'one'

  // One null distribution per sample size, seeded, so the pile never reshuffles under the reader.
  const nullCache = new Map()
  const nullFor = n => {
    n = Math.max(n, 2)
    if (!nullCache.has(n)) nullCache.set(n, nullDistribution(n, 4000, 40, seededRandom(1710 + n)))
    return nullCache.get(n)
  }
  const current = s => { const objs = withAlignment(selected(etnos, s)); return { objs, stats: resultant(objs.map(o => o.varpi_deg)) } }
  const sampleFor = step => step === 'explore' ? state : step === 'catch' || step === 'cuts' ? LOOSE : STRICT
  const readout = (s, n) => `<b>${n}</b> objects · ${s.quality ? 'well-measured orbits only' : 'including briefly seen orbits'}${s !== state && Object.keys(s).some(k => s[k] !== state[k]) ? ' · this step’s sample; your filters return on the last card' : ''}`

  const cutsView = () => CUTS.map(c => ({
    title: `Out past ${c.a_min_au} AU, never closer than ${c.q_min_au} AU`,
    detail: `${c.well_determined_only ? 'well-measured orbits only' : 'every object, including briefly seen'} · ${c.n_objects} objects`,
    one_in: Math.round(1 / rayleighP(c.n_objects, c.R_observed)),
    p_value: rayleighP(c.n_objects, c.R_observed),
  }))

  const luck = makeLuck($('#chartLuck'))
  function renderLuck () {
    const sample = sampleFor(story)
    const { objs, stats } = current(sample)
    $('#luckReadout').innerHTML = readout(sample, stats.n)
    const nd = nullFor(stats.n)
    const beat = nd.values.filter(v => v >= stats.R).length
    const blocksText = { histTitle: 'Where each fake solar system lands', histSub: 'each block is one fake solar system' }
    const real = {
      ring: 'real', blocks: 'none', bars: true, observed: stats.R,
      obsText: `${beat.toLocaleString()} of 4,000 fakes got this far`,
      histTitle: 'The real objects, against luck',
      histSub: 'blue bars: fake solar systems at least as lined up as the real ones',
      pileText: 'what luck produces',
    }
    const scenes = {
      one: { ring: 'random', blocks: 'one', ...blocksText },
      many: { ring: 'random', blocks: 'animate', animate: true, ...blocksText },
      all: { ring: 'random', blocks: 'none', bars: true, pileText: 'what luck produces', histTitle: '4,000 fake solar systems', histSub: 'the taller the bar, the more of them landed there' },
      real,
      catch: { ...real, pileText: null, obsText: `${beat.toLocaleString()} of 4,000 fakes got this far: it sits inside the pile` },
      cuts: { ...real, cuts: cutsView() },
      explore: { ...real, xMax: Math.min(1, Math.max(0.5, stats.R * 1.15)) },
    }
    luck.update({ n: stats.n, real: objs, quality: sample.quality, nullDist: nd, ...scenes[story] })
    if (story === 'explore') renderVerdict(stats)
  }

  function renderVerdict (stats) {
    const el = $('#verdict')
    if (stats.n < 3) { el.innerHTML = ''; return }
    const p = rayleighP(stats.n, stats.R), f = formatP(p), good = p < 0.05
    const headline = p < 0.01 ? 'Luck is a poor explanation.' : p < 0.05 ? 'Suggestive, but not proof.' : 'This is exactly what luck looks like.'
    const body = p < 0.01
      ? `Random data lines up this well only ${f.odds}. Something is organising these orbits, though "something" need not be a planet.`
      : p < 0.05 ? `Random data reaches this level ${f.odds}. Interesting, and well short of what astronomers usually demand.`
        : `Random data is this aligned ${f.odds}. With this sample there is no signal to explain.`
    el.innerHTML = `<div class="note" style="border-left-color:${good ? 'var(--series-3)' : 'var(--series-2)'};background:${good ? '#34d39910' : '#ff6a3d10'}">
      <div class="note-k" style="color:${good ? '#6ee7b7' : '#ffa07a'}">What this sample says</div><p><strong>${headline}</strong> ${body}</p></div>`
  }

  // --- numbers quoted in the text ---------------------------------------------------
  const s = current(STRICT), l = current(LOOSE)
  const sp = rayleighP(s.stats.n, s.stats.R), lp = rayleighP(l.stats.n, l.stats.R)
  const nums = {
    strictN: s.stats.n, strictR: s.stats.R.toFixed(2),
    strictBeat: nullFor(s.stats.n).values.filter(v => v >= s.stats.R).length,
    strictOdds: Math.round(1 / sp).toLocaleString(),
    looseN: l.stats.n, looseR: l.stats.R.toFixed(2), looseOdds: Math.round(1 / lp).toLocaleString(),
    extraN: l.stats.n - s.stats.n,
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })

  renderControls($('#luckControls'), state, renderLuck, { note: 'shared with the previous page' })
  renderLuck()
  scrolly($('#luckStory'), { onStep: (i, step) => { story = step; renderLuck() } })

  // --- the streetlight -------------------------------------------------------------------
  makeBias({ view: $('#biasView'), controls: $('#biasControls'), result: $('#biasResult') })

  // --- the published odds -------------------------------------------------------------------
  drawOdds($('#chartOdds'), [
    { label: 'Batygin & Brown 2016', detail: 'the six founding objects, no bias correction · 0.007%', oneIn: 14000, side: 'for' },
    { label: 'Brown & Batygin 2019', detail: 'after modelling where the surveys looked · 0.2%', oneIn: 500, side: 'for' },
    { label: 'Brown & Batygin 2021', detail: 'bias-corrected, the current orbit fit · 99.6% significance', oneIn: 250, side: 'for' },
    { label: 'Napier et al. 2021', detail: '14 objects from three surveys with full detection records', range: [1, 6], side: 'against' },
    { label: 'Shankman et al. 2017 (OSSOS)', detail: 'eight objects from one bias-tracked survey: consistent with uniform', range: [1, 3], side: 'against' },
    { label: 'This site, well-measured orbits', detail: `${s.stats.n} objects, plain test, no bias correction`, oneIn: Math.round(1 / sp), side: 'ours' },
    { label: 'This site, every extreme object', detail: `${l.stats.n} objects including briefly seen ones`, oneIn: Math.max(1, Math.round(1 / lp)), side: 'ours' },
  ])
}

main().catch(showLoadError)
