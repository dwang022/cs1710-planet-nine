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
