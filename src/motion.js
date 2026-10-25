// Display-only motion for values that change with the filters. The numbers are
// always computed immediately; only what is drawn on screen eases toward them.

import * as d3 from 'd3'

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

// Decelerating, like the scroll reveals: quick to respond, soft to settle.
export const EASE = d3.easeCubicOut
export const duration = () => reduce.matches ? 0 : 500

/** Odds span 1 in 2 to 1 in 100,000: ease them in log space so every step looks even. */
export const interpolateLog = (a, b) => {
  const la = Math.log(a), lb = Math.log(b)
  return t => Math.exp(la + (lb - la) * t)
}

/** Angles take the short way round: 350° → 10° passes through 0°, not 180°. */
export const interpolateAngle = (a, b) => {
  const d = ((b - a) % 360 + 540) % 360 - 180
  return t => a + d * t
}

/**
 * Ease the number shown in `el` toward `to`. It starts from whatever is on
 * screen this frame, so dragging a slider retargets the running tween instead
 * of restarting it. `draw(v, done)` writes the text; `done` is true on the final
 * frame, so callers can print the exact formatted value. A null or non-finite
 * `to` (or reduced motion) is drawn immediately.
 */
export function animateValue (el, to, draw, interpolate = d3.interpolateNumber) {
  const sel = d3.select(el)
  const from = el.__shown
  const ok = v => v != null && Number.isFinite(v)
  if (!ok(from) || !ok(to) || !duration()) {
    sel.interrupt('value')
    el.__shown = el.__to = ok(to) ? to : undefined
    draw(to, true)
    return
  }
  if (to === el.__to) return          // already heading there
  el.__to = to
  const i = interpolate(from, to)
  sel.transition('value').duration(duration()).ease(EASE)
    .tween('value', () => t => { const v = i(t); el.__shown = v; draw(v, t === 1) })
}
