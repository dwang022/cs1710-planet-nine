// The clustering page's head, and the Evidence part's first picture: the solar
// system seen from above, the view the distance page already taught. Round the
// Sun the six orbits that first pointed to Planet Nine draw in one by one, all
// stretching the same way; last, Planet Nine's predicted orbit fades in,
// stretching the other way, still a question mark. It foreshadows the part: the
// steps below test the lean on every trusted object, ask whether luck could make
// it, and what else might.
//
// Real orbits (elements from etnos.json and orbits.js), laid flat and drawn to
// scale (2026-11-16: square-rooted distances had squeezed Planet Nine's oval into
// what looked like a circle round the Sun, so which way it points was lost). The
// picture is fitted to the orbits themselves, so the Sun sits off-centre, where
// they are. At this scale the giant planets would be a dot under the Sun, so
// they are not drawn.
//
// Once it has appeared, Planet Nine goes round its orbit and keeps going
// (asked for on 2026-11-16), at Kepler's pace (slow at the far end, quick at
// the near one), one lap in LAP_MS, while the head is in view. Its name rides
// with it on the outside of the orbit. With reduced motion it stays at its far end.

import * as d3 from 'd3'
import { flatOrbit, flatPoint, trueAnomaly, PLANET_NINE } from '../orbits.js'

const W = 560, H = 480
const PAD = 40                    // room round the orbits for Planet Nine and its name
const LAP_MS = 24000              // one lap of Planet Nine's orbit
const STAGGER_MS = 170            // between one orbit starting to draw and the next

/** six: the objects to draw. */
export function leanHead (root, { six }) {
  const objs = [...six].sort((a, b) => a.varpi_deg - b.varpi_deg)
  const p9Orbit = flatOrbit(PLANET_NINE.a_au, PLANET_NINE.e, PLANET_NINE.varpi_deg, 240)
  const orbits = objs.map(o => flatOrbit(o.a_au, o.e, o.varpi_deg, 240))
  // [x, y] in AU → pixels, one scale both ways, the orbits filling the picture
  const all = [...orbits, p9Orbit].flat()
  const [x0, x1] = d3.extent(all, p => p[0]), [y0, y1] = d3.extent(all, p => p[1])
  const k = Math.min((W - 2 * PAD) / (x1 - x0), (H - 2 * PAD) / (y1 - y0))
  const ox = W / 2 - k * (x0 + x1) / 2, oy = H / 2 + k * (y0 + y1) / 2
  const warp = ([x, y]) => [ox + x * k, oy - y * k]
  const path = pts => d3.line()(pts.map(warp))
  const [cx, cy] = warp([0, 0])
  // Planet Nine appears at its far end, where it would be faintest; its name sits outside the orbit
  const p9At = nu => warp(flatPoint(PLANET_NINE.a_au, PLANET_NINE.e, PLANET_NINE.varpi_deg, nu))
  const lblAt = ([x, y]) => {
    const r = Math.hypot(x - cx, y - cy) || 1, ux = (x - cx) / r, uy = (y - cy) / r
    // out from the Sun: far enough sideways to clear the planet with the whole word, less so above and below
    return [x + ux * (24 + 44 * Math.abs(ux)), y + uy * 30 + 5]
  }
  const [px, py] = p9At(180), [lx, ly] = lblAt([px, py])

  root.innerHTML = `
  <svg class="lean-head" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="The solar system seen from above, to scale. Round the Sun, ${objs.length} distant orbits all stretch the same way; Planet Nine's predicted orbit stretches the other.">
    ${orbits.map((pts, i) => `<path class="lh-orbit" pathLength="1" style="animation-delay:${150 + i * STAGGER_MS}ms"
      d="${path(pts)}"/>`).join('')}
    <path class="lh-p9" d="${path(p9Orbit)}"/>
    <use href="#art-sun" x="${(cx - 8).toFixed(1)}" y="${(cy - 8).toFixed(1)}" width="16" height="16"/>
    <g class="lh-p9-mark">
      <use class="lh-p9-body" href="#art-planet-nine" x="-18" y="-18" width="36" height="36" transform="translate(${px.toFixed(1)},${py.toFixed(1)})"/>
      <text class="halo lh-lbl p9-svg" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">Planet Nine</text>
    </g>
  </svg>`

  // --- then round and round -----------------------------------------------------------
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const mark = root.querySelector('.lh-p9-mark'), body = mark.querySelector('.lh-p9-body'), lbl = mark.querySelector('text')
  let visible = true, raf = 0, t0 = null, elapsed = 0
  function frame (now) {
    if (t0 == null) t0 = now - elapsed
    elapsed = now - t0
    // mean anomaly from the far end (180°), so it sets off from where it appeared
    const [x, y] = p9At(trueAnomaly(180 + 360 * elapsed / LAP_MS, PLANET_NINE.e))
    const [ax, ay] = lblAt([x, y])
    body.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`)
    lbl.setAttribute('x', ax.toFixed(1)); lbl.setAttribute('y', ay.toFixed(1))
    raf = visible ? requestAnimationFrame(frame) : 0
  }
  const start = () => { if (!raf && visible) { t0 = null; raf = requestAnimationFrame(frame) } }
  // it sets off once it has faded in; out of view it waits where it is
  mark.addEventListener('animationend', start, { once: true })
  new IntersectionObserver(es => {
    visible = es.some(e => e.isIntersecting)
    if (visible && mark.getAnimations?.().every(a => a.playState === 'finished')) start()
  }).observe(root)
}
