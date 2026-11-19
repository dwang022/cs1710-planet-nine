// Part 2, page 1: the orbits line up, both ways at once. The head shows the six orbits of 2016 from above (they
// stretch out the same way) and from the side (they tilt the same way), each view labelled with its clue; one
// walkthrough then measures both clues side by side with the same method (two dials, charts/dial.js); then what a
// planet's gravity would do to them (charts/compare.js).
//
// Every number on the page is computed here, on load, from etnos.json and the fixed trusted sample.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { makeDial, stretchOf, tiltOf } from '../charts/dial.js'
import { makeCompare } from '../charts/compare.js'
import { leanHead } from '../charts/leanhead.js'
import { tiltHead } from '../charts/tilthead.js'
import { scrolly } from '../scrolly.js'
import { resultant, spreadOf, skySpread, closestOnSky } from '../stats.js'
import { PLANET_NINE, angleDiff, isOriginalSix } from '../orbits.js'
import { selected, STRICT } from '../sample.js'
import { watchClues } from '../clues.js'

const $ = s => document.querySelector(s)

// “stretch out” and “tilt” in the part's red wherever this page writes them: the titles, the cards, the dials'
// captions and labels, the cartoon's notes (2026-11-17, asked for; clues.js)
watchClues()

const SEDNA = '90377'

async function main () {
  const { etnos } = await loadData('etnos')

  // every step describes the fixed trusted sample, so its quoted numbers never move
  const objs = selected(etnos, STRICT)
  const six = objs.filter(isOriginalSix)
  const lit = new Set(six.map(o => o.id))
  // each set's middle, and its spread as Batygin and Brown measured it, the probability page's measure, so the two
  // pages' numbers agree: for where they stretch out, over their closest points on the sky; for the tilt, of the tilts
  const measure = (list, angleOf, sky) => ({ ...resultant(list.map(angleOf)),
    spread: sky ? skySpread(list.map(closestOnSky)) : spreadOf(list.map(angleOf)).spread })
  const stretch = measure(objs, stretchOf, true), tilt = measure(objs, tiltOf, false)
  const sixStretch = measure(six, stretchOf, true), sixTilt = measure(six, tiltOf, false)
  const sedna = etnos.find(o => o.id === SEDNA)

  // --- numbers quoted in the text ---------------------------------------------------
  const deg = a => `${Math.round(a)}°`
  const nums = {
    // the year it was found, from its designation (2003 VB12)
    sednaFound: (sedna.provisional_desig || '').slice(0, 4),
    sednaI: deg(sedna.i_deg), sednaTilt: deg(tiltOf(sedna)),
    strictN: stretch.n, strictSpread: deg(stretch.spread), tiltSpread: deg(tilt.spread),
    sixSpread: deg(sixStretch.spread), tiltSixSpread: deg(sixTilt.spread),
    p9Gap: `${Math.round(Math.abs(angleDiff((PLANET_NINE.node_deg + 90) % 360, sixTilt.meanDeg)))}°`,
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })

  // --- the head: the six orbits that started it, from above and from the side, then Planet Nine, to scale ---
  leanHead($('#leanHead'), { six: etnos.filter(isOriginalSix) })
  tiltHead($('#tiltHead'), { six: etnos.filter(isOriginalSix) })
  // the paper's terms hang off the plain words: a leader line by default; ?sci=bubble or ?sci=hover shows the other
  // two looks tried on 2026-11-17 (a small bubble popping up under the words, or the term only on pointing)
  const sci = new URLSearchParams(location.search).get('sci')
  if (['leader', 'bubble', 'hover'].includes(sci)) $('.clu-views').dataset.sci = sci
  // each drawing is fitted inside its box; --u (its units per screen pixel) keeps the words one size on screen in both
  for (const el of document.querySelectorAll('.clu-views svg[viewBox]')) {
    const vb = el.viewBox.baseVal
    new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect()
      if (width > 0 && height > 0) el.style.setProperty('--u', Math.max(vb.width / width, vb.height / height).toFixed(3))
    }).observe(el)
  }

  // --- the walkthrough: two dials, one method --------------------------------------------
  // Sedna first, both dials open: its whole orbit from above, stretched out to one side (Neptune's orbit, at this
  // scale, would hide under the Sun), and from the side, tilted out of the planets' plane (2026-11-17, asked for: the first step had been a
  // close view of Neptune's orbit and Sedna's closest point, with the tilt dial opening on step 3). Then Sedna's two
  // arrows, each with the other dial stepped back (the tilt arrow comes when the camera tips up from the side and is
  // measured like the stretch), then every step does the same thing to both: every object's arrow, their middle and their spread, the six lit with their own. Planet Nine comes in one dial at a time: the stretch dial draws the six orbits and its orbit (the tilt
  // dial quiet), then the tilt dial alone adds its orbit, raised half filled, and its arrow to the compass.
  const only = new Set([SEDNA])
  const FAR = 1150                      // AU from the Sun to the dial's edge once Sedna is seen whole (its far end is ~1,010 AU out)
  const sednaArrow = { view: 'top', au: FAR, only, orbit: true, pointer: true, compass: true, sweep: true }
  const ring = { layout: 'ring', compass: true, spokes: true }
  const align = { ...ring, mean: true, spread: true, labels: { mean: true } }
  const sixScene = (litStats) => ({ ...ring, lit, litStats, mean: true, spread: true, labels: { arrows: true } })
  const sedSide = { view: 'side', au: 1100, only, plane: true, orbit: true }
  const sednaTop = { view: 'top', au: 1100, only, orbit: true, nodeLine: true, pointer: true, rightAngle: true }
  // the stretch dial alone: the compass goes, then the six orbits come, then Planet Nine's
  const p9Stretch = { view: 'top', au: FAR, only: lit, sixOrbits: true, p9Orbit: true, p9: true, lit, litStats: sixStretch,
    mean: true, old: false, delays: { six: 0.4, p9: 0.85 }, labels: { p9: true, arrows: true } }
  const scenes = {
    stretch: {
      // the camera off the Sun, on the middle of Sedna's orbit, which fills the dial; Neptune's orbit at the Sun
      one: { view: 'top', fit: true, only, orbit: true, neptune: true, labels: { sun: true, neptune: true, orbit: true } },
      stretch: { ...sednaArrow, labels: { sun: true, far: true } },
      side: sednaArrow, above: sednaArrow, arrow: sednaArrow,
      all: ring, align, six: sixScene(sixStretch),
      p9: p9Stretch, p9tilt: p9Stretch,
    },
    tilt: {
      one: { ...sedSide, fit: true, labels: { plane: true, orbit: true } }, stretch: { ...sedSide, fit: true, labels: { plane: true, orbit: true } },
      // from the side, looking along the hinge: the orbit a tipped line, its angle to the plane
      side: { ...sedSide, tiltAngle: true, labels: { sun: true, plane: true, orbit: true } },
      // the camera tips up and the arrow comes: at right angles to the hinge, into the raised half (the lid)
      above: { ...sednaTop, plane: true, lid: true, labels: { halves: true, hinge: true } },
      // counted from the right, like the stretch
      arrow: { ...sednaTop, compass: true, sweep: true, lid: true, labels: { hinge: true } },
      all: ring, align, six: sixScene(sixTilt), p9: sixScene(sixTilt),
      // the tilt dial alone: step 8's compass, the alignment's circles and everyone's average stepping out of the way,
      // then Planet Nine's orbit (drawn small, inside the compass) with its raised half filled, then its arrow
      p9tilt: { ...ring, lit, litStats: sixTilt, mean: true, old: false, au: 1600, p9Orbit: true, p9Lid: true, p9: true,
        delays: { p9: 0.4, p9arrow: 1.3 }, labels: { arrows: true, p9: true } },
    },
  }
  const dials = {
    stretch: { chart: makeDial($('#dialStretch'), { kind: 'stretch' }), stats: stretch },
    tilt: { chart: makeDial($('#dialTilt'), { kind: 'tilt' }), stats: tilt },
  }
  const pair = $('#dialPair')
  // Sedna's stretch is measured with the tilt dial stepped back, then its tilt with the stretch dial stepped back;
  // Planet Nine comes in one dial at a time, the dial that does not change stepping back
  const quiet = { stretch: 'tilt', side: 'stretch', p9: 'tilt', p9tilt: 'stretch' }
  function render (step) {
    for (const [kind, d] of Object.entries(dials)) {
      pair.querySelector(`.dial-panel[data-kind="${kind}"]`).classList.toggle('is-quiet', quiet[step] === kind)
      d.chart.close()
      d.chart.update(objs, d.stats, { focus: SEDNA, labels: {}, ...scenes[kind][step] })
    }
  }
  render('one')
  scrolly($('#clusterStory'), { onStep: (i, step) => render(step) })

  // --- what a planet's gravity would do: no planet beside a planet ---------------------------
  // it ends on the six orbits of 2016, as the head draws them
  makeCompare({ root: $('#compareView'), six: etnos.filter(isOriginalSix) })
}

main().catch(showLoadError)
