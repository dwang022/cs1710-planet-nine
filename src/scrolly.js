// Scrollytelling: a pinned graphic beside a column of short step cards.
//
// The step whose card crosses the middle of the viewport is the active one.
// Each section supplies its own onStep, which redraws the pinned graphic for
// that step, so scrolling back up replays the story in reverse for free.

import './scrolly.css'

export function scrolly (root, { onStep, line }) {
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
  // the cards are read below it, so the band sits lower. A section whose graphic is not centred on the screen
  // passes `line`, a function giving the band's height as a fraction of the screen; it is read again on resize.
  let io = null
  function observe () {
    io?.disconnect()
    const at = line ? Math.round(Math.max(0.05, Math.min(0.95, line())) * 1000) / 10
      : window.matchMedia('(max-width: 900px)').matches ? 75 : 50
    io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) activate(steps.indexOf(e.target))
      }
    }, { rootMargin: `-${at}% 0px -${100 - at}% 0px`, threshold: 0 })
    steps.forEach(s => io.observe(s))
  }
  observe()
  if (line) window.addEventListener('resize', observe)

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
