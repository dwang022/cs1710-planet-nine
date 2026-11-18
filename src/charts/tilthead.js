// The clustering page's second head view: the same six orbits as the first (leanhead.js), seen from the side, along the
// plane the planets share, so that plane is one level line through the Sun. Looked at from this side, which is
// square to the way the six tilt on average, every one of them rises above the line on the same side; Planet
// Nine's predicted orbit fades in last, tilted the same way (it stretches out opposite them, but tilts with
// them). The walkthrough below measures the tilt of every reliable orbit.
//
// Real orbits (elements from etnos.json and orbits.js), drawn to scale, the same scale across and up, so the
// tilts are their real angles. The viewing side is computed from the six, never fixed by hand. As on the
// view from above, Planet Nine then goes round its orbit at Kepler's pace while the head is in view; with
// reduced motion it stays at its far end. It shares the view from above's styles (.lean-head) for the drawing in;
// its words keep one size on screen through --u, set in pages/clustering.js.

import * as d3 from 'd3'
import { positionAt, trueAnomaly, PLANET_NINE } from '../orbits.js'
import { resultant } from '../stats.js'

const W = 600, H_MIN = 260
const PAD = 34
const LAP_MS = 24000
const STAGGER_MS = 170
const RAD = Math.PI / 180

/** six: the objects to draw. Returns the direction the picture looks across (its right-hand side), in degrees. */
export function tiltHead (root, { six }) {
  // the side the six tilt towards on average goes to the right, so they rise on the right
  const right = resultant(six.map(o => (o.node_deg + 90) % 360)).meanDeg
  const across = ([x, y, z]) => [x * Math.cos(right * RAD) + y * Math.sin(right * RAD), z]
  const orbit = (a, e, i, node, peri) => d3.range(0, 361, 1.5).map(nu => across(positionAt(a, e, i, node, peri, nu)))
  const objs = [...six].sort((a, b) => a.i_deg - b.i_deg)
  const orbits = objs.map(o => orbit(o.a_au, o.e, o.i_deg, o.node_deg, o.argperi_deg))
  const P9 = PLANET_NINE
  const p9Orbit = orbit(P9.a_au, P9.e, P9.i_deg, P9.node_deg, P9.argperi_deg)

  // fitted across; the picture is only as tall as the orbits need, the plane's label and Planet Nine's name
  const all = [...orbits, p9Orbit].flat()
  const [x0, x1] = d3.extent(all, p => p[0]), [y0, y1] = d3.extent(all, p => p[1])
  const k = (W - 2 * PAD) / (x1 - x0)
  const H = Math.round(Math.max(H_MIN, (y1 - y0) * k + 2 * PAD + 24))
  const ox = W / 2 - k * (x0 + x1) / 2, oy = H / 2 + k * (y0 + y1) / 2
  const warp = ([x, y]) => [ox + x * k, oy - y * k]
  const path = pts => d3.line()(pts.map(warp))
  const p9At = nu => warp(across(positionAt(P9.a_au, P9.e, P9.i_deg, P9.node_deg, P9.argperi_deg, nu)))
  const [px, py] = p9At(180)
  const lbl = (x, y) => [x, y + (y > oy ? 30 : -22)]       // its name on the open side of the plane's line
  const [lx, ly] = lbl(px, py)

  root.innerHTML = `
  <svg class="lean-head tilt-head" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="Seen from the side, the plane of the planets is a level line through the Sun. ${objs.length} distant orbits all rise above it on the same side; Planet Nine's predicted orbit is tilted the same way.">
    <line class="th-plane" x1="0" x2="${W}" y1="${oy.toFixed(1)}" y2="${oy.toFixed(1)}"/>
    <text class="th-plane-lbl halo" x="${W - 6}" y="${(oy + 20).toFixed(1)}" text-anchor="end">the plane of the planets</text>
    ${orbits.map((pts, i) => `<path class="lh-orbit" pathLength="1" style="animation-delay:${150 + i * STAGGER_MS}ms"
      d="${path(pts)}"/>`).join('')}
    <path class="lh-p9" d="${path(p9Orbit)}"/>
    <use href="#art-sun" x="${(ox - 8).toFixed(1)}" y="${(oy - 8).toFixed(1)}" width="16" height="16"/>
    <g class="lh-p9-mark">
      <use class="lh-p9-body" href="#art-planet-nine" x="-16" y="-16" width="32" height="32" transform="translate(${px.toFixed(1)},${py.toFixed(1)})"/>
      <text class="halo lh-lbl p9-svg" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">Planet Nine</text>
    </g>
  </svg>`

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return right
  const mark = root.querySelector('.lh-p9-mark'), body = mark.querySelector('.lh-p9-body'), name = mark.querySelector('text')
  let visible = true, raf = 0, t0 = null, elapsed = 0
  function frame (now) {
    if (t0 == null) t0 = now - elapsed
    elapsed = now - t0
    const [x, y] = p9At(trueAnomaly(180 + 360 * elapsed / LAP_MS, P9.e))
    const [ax, ay] = lbl(x, y)
    body.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`)
    name.setAttribute('x', ax.toFixed(1)); name.setAttribute('y', ay.toFixed(1))
    raf = visible ? requestAnimationFrame(frame) : 0
  }
  const start = () => { if (!raf && visible) { t0 = null; raf = requestAnimationFrame(frame) } }
  mark.addEventListener('animationend', start, { once: true })
  new IntersectionObserver(es => {
    visible = es.some(e => e.isIntersecting)
    if (visible && mark.getAnimations?.().every(a => a.playState === 'finished')) start()
  }).observe(root)
  return right
}
