import './scrolly.css'

// Scrollytelling: a pinned graphic beside a column of short step cards.
//
// The step whose card crosses the middle of the viewport is the active one.
// Each section supplies its own onStep, which redraws the pinned graphic for
// that step, so scrolling back up replays the story in reverse for free.

export function scrolly (root, { onStep }) {
  const steps = [...root.querySelectorAll('.step')]
  let active = -1

  function activate (i) {
    if (i === active) return
    active = i
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i))
    onStep(i, steps[i].dataset.step)
  }

  // A zero-height band across the viewport: whichever card is crossing it is
  // the one being read. On phones the graphic takes the top of the screen and
  // the cards are read below it, so the band sits lower.
  const at = window.matchMedia('(max-width: 900px)').matches ? 75 : 50
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) activate(steps.indexOf(e.target))
    }
  }, { rootMargin: `-${at}% 0px -${100 - at}% 0px`, threshold: 0 })
  steps.forEach(s => io.observe(s))

  // Clicking a dimmed card jumps to it, so nobody has to hunt for the trigger.
  steps.forEach(s => s.addEventListener('click', e => {
    if (s.classList.contains('is-active') || e.target.closest('a, button, input, label')) return
    s.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }))

  activate(0)
  return { current: () => steps[active]?.dataset.step }
}

/**
 * Draw the eye to a control the story just changed, so the reader learns what
 * the switch does by watching it move.
 */
export function pulse (el) {
  if (!el) return
  el.classList.remove('pulse')
  void el.offsetWidth // restart the animation
  el.classList.add('pulse')
}

/**
 * Continuous progress through a scrolly, for graphics that move with the
 * scroll rather than cutting between cards. Reports (k, t): the last step whose
 * card centre has passed the activation line, and how far the line has
 * travelled toward the next card's centre, 0 to 1. Before the first card it is
 * (0, 0); after the last, (last, 0). Returns a function that re-measures, for
 * callers whose layout changes without a scroll.
 */
export function scrollyProgress (root, onProgress) {
  const steps = [...root.querySelectorAll('.step')]
  let raf = 0
  function measure () {
    raf = 0
    const at = window.matchMedia('(max-width: 900px)').matches ? 0.75 : 0.5
    const line = window.innerHeight * at
    const mid = steps.map(s => { const r = s.getBoundingClientRect(); return r.top + r.height / 2 })
    let k = -1
    for (let i = 0; i < mid.length; i++) if (mid[i] <= line) k = i
    if (k < 0) return onProgress(0, 0)
    if (k >= mid.length - 1) return onProgress(mid.length - 1, 0)
    const t = (line - mid[k]) / (mid[k + 1] - mid[k])
    onProgress(k, Math.min(1, Math.max(0, t)))
  }
  const request = () => { if (!raf) raf = requestAnimationFrame(measure) }
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', request)
  measure()
  return request
}

// --------------------------------------------------------------------------
// Scroll-triggered reveals — experimental, self-contained, reversible.
// Remove the `initReveals()` call in main.js to switch it off entirely.
//
// Progressive enhancement: content is only ever hidden once this script has
// confirmed it can reveal it again (IntersectionObserver available, motion
// allowed). Elements replay their entrance each time they come back into view,
// in either scroll direction, but are only reset once they are completely off
// screen, so nothing ever disappears while you can see it. Nothing here touches
// the charts' data or handlers.

// Everything that eases in, in document order. Items that come into view in the
// same frame (the hero on load, a row of stat tiles) are staggered together.
const TARGETS = [
  // introduction
  '.hero > .hero-mark', '.hero > .eyebrow', '.hero > h1', '.hero > .byline', '.hero-hook',
  '.hero-fact', '.hero-start', '.hero-nav-k', '.hero-path li',
  // 00 — the rules table and the question
  '#planets .sub-title', '#planets .definition', '#planets .criteria-wrap', '#planets .primer .pc', '.hero-question',
  // every section heading
  'section .sec-head > *',
  // 01 — explanation → filters → statistics → distances → takeaway
  '#objects .controls', '#objects .stat', '#objects .turn-nav', '#objects .sub-head',
  '#objects .takeaway',
  // 06 — legend, then the scorecard (its rows cascade in via CSS)
  '#matrixLegend', '#alternatives > .card',
].join(', ')

const STEP_MS = 70      // stagger between items revealed together
const MAX_STEPS = 8     // so a long batch never lags more than ~0.5s

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

function revealAll (els) {
  els.forEach(el => el.classList.add('is-in'))
}

export function initReveals () {
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
  document.documentElement.classList.add('has-reveal')

  // If the visitor turns on reduced motion mid-visit, or prints, show everything.
  const bail = () => { enter.disconnect(); leave.disconnect(); revealAll(els) }
  motionQuery.addEventListener?.('change', e => { if (e.matches) bail() })
  window.addEventListener('beforeprint', bail)
}
