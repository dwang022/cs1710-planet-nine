// Scrollytelling — experimental, self-contained, reversible.
// Remove the `import './scrolly.js'` line in main.js to switch it off entirely.
//
// Progressive enhancement: content is only ever hidden once this script has
// confirmed it can reveal it again (IntersectionObserver available, motion
// allowed). Elements replay their entrance each time they come back into view,
// in either scroll direction, but are only reset once they are completely off
// screen, so nothing ever disappears while you can see it. Nothing here touches
// the charts' data or handlers.

import './scrolly.css'

// Everything that eases in, in document order. Items that come into view in the
// same frame (the hero on load, a row of stat tiles) are staggered together.
const TARGETS = [
  // introduction
  '.hero > .eyebrow', '.hero > h1', '.hero > .byline', '.hero-hook',
  '.hero-block', '.hero-purpose-title', '.hero-purpose-lead', '.hero-path li', '.hero-question',
  // every section heading
  'section .sec-head > *',
  // 01 — explanation → filters → statistics → distances → takeaway
  '#objects .controls', '#objects .stat', '#objects .sub-head',
  '#objects .scale-strip', '#objects .takeaway',
  // 06 — legend, then the scorecard (its rows cascade in via CSS)
  '#matrixLegend', '#alternatives > .card',
].join(', ')

const STEP_MS = 70      // stagger between items revealed together
const MAX_STEPS = 8     // so a long batch never lags more than ~0.5s

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

function revealAll (els) {
  els.forEach(el => el.classList.add('is-in'))
}

function init () {
  const els = [...document.querySelectorAll(TARGETS)]
  if (!els.length) return
  if (!('IntersectionObserver' in window) || motionQuery.matches) return

  // Two observers give hysteresis: an element animates in once it is a little
  // way into the viewport, but only resets after it has left a zone slightly
  // larger than the viewport. The gap between the two means an element sitting
  // on the edge can't flicker between states.
  const enter = new IntersectionObserver(entries => {
    let k = 0
    for (const e of entries) {
      if (!e.isIntersecting || e.target.classList.contains('is-in')) continue
      e.target.style.setProperty('--reveal-delay', `${Math.min(k++, MAX_STEPS) * STEP_MS}ms`)
      e.target.classList.add('is-in')
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })

  // threshold 0 + isIntersecting false = not a single pixel inside the zone.
  const leave = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) continue
      e.target.style.setProperty('--reveal-delay', '0ms')
      e.target.classList.remove('is-in')
    }
  }, { rootMargin: '10% 0px 10% 0px', threshold: 0 })

  els.forEach(el => { el.classList.add('reveal'); enter.observe(el); leave.observe(el) })
  document.documentElement.classList.add('scrolly')

  // If the visitor turns on reduced motion mid-visit, or prints, show everything.
  const bail = () => { enter.disconnect(); leave.disconnect(); revealAll(els) }
  motionQuery.addEventListener?.('change', e => { if (e.matches) bail() })
  window.addEventListener('beforeprint', bail)
}

init()
