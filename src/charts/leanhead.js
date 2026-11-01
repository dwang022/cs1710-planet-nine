// The clustering page's head, and the Evidence part's first picture: the solar
// system seen from above, the view the distance page already taught. The Sun
// and the giant planets' rings sit in the middle; round them the six orbits
// that first pointed to Planet Nine draw in one by one, all stretching the
// same way; last, Planet Nine's predicted orbit fades in, stretching the other
// way, still a question mark. It foreshadows the part: the steps below test
// the lean on every trusted object, ask whether luck could make it, and what
// else might.
//
// Real orbits (elements from etnos.json and orbits.js), laid flat. Distances
// are square-rooted so Jupiter and a 1,000 AU orbit fit one picture (the
// distance page has the true scale); every direction is exact.

import * as d3 from 'd3'
import { flatOrbit, flatPoint, planetAt, PLANET_NINE } from '../orbits.js'

const W = 560, H = 480
const cx = W / 2, cy = H / 2
const R = 225                     // pixels for EDGE_AU
const EDGE_AU = 1100
const k = R / Math.sqrt(EDGE_AU)
const GIANTS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune']

// [x, y] in AU → pixels, the distance square-rooted, the direction kept
function warp ([x, y]) {
  const r = Math.hypot(x, y)
  if (!r) return [cx, cy]
  const s = k * Math.sqrt(r) / r
  return [cx + x * s, cy - y * s]
}
const path = pts => d3.line()(pts.map(warp))

/** six: the objects to draw; planets: planets.json rows; jd: the date the planets are placed at. */
export function leanHead (root, { six, planets, jd }) {
  const giants = planets.filter(p => GIANTS.includes(p.name)).map(p => planetAt(p, jd))
  const objs = [...six].sort((a, b) => a.varpi_deg - b.varpi_deg)
  // Planet Nine drawn at its far end, where it would be faintest
  const [px, py] = warp(flatPoint(PLANET_NINE.a_au, PLANET_NINE.e, PLANET_NINE.varpi_deg, 180))
  const nep = giants.find(p => p.name === 'Neptune')
  const [nx, ny] = warp(flatPoint(nep.a, nep.e, nep.varpi, nep.nu))

  root.innerHTML = `
  <svg class="lean-head" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="The solar system seen from above. Round the planets, ${objs.length} distant orbits all stretch the same way; Planet Nine's predicted orbit stretches the other.">
    ${giants.map(p => `<path class="lh-ring" d="${path(flatOrbit(p.a, p.e, p.varpi, 120))}"/>`).join('')}
    ${objs.map((o, i) => `<path class="lh-orbit" pathLength="1" style="animation-delay:${400 + i * 380}ms"
      d="${path(flatOrbit(o.a_au, o.e, o.varpi_deg, 240))}"/>`).join('')}
    <path class="lh-p9" d="${path(flatOrbit(PLANET_NINE.a_au, PLANET_NINE.e, PLANET_NINE.varpi_deg, 240))}"/>
    ${giants.map(p => {
      const [x, y] = warp(flatPoint(p.a, p.e, p.varpi, p.nu))
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" style="fill:var(--c-${p.name.toLowerCase()})"/>`
    }).join('')}
    <use href="#art-sun" x="${cx - 8}" y="${cy - 8}" width="16" height="16"/>
    <text class="halo lh-lbl" data-planet="Neptune" x="${(nx + (nx > cx ? 8 : -8)).toFixed(1)}" y="${(ny + 5).toFixed(1)}"
      text-anchor="${nx > cx ? 'start' : 'end'}">Neptune</text>
    <g class="lh-p9-mark">
      <use href="#art-planet-nine" x="${(px - 18).toFixed(1)}" y="${(py - 18).toFixed(1)}" width="36" height="36"/>
      <text class="halo lh-lbl p9-svg" x="${px.toFixed(1)}" y="${(py + (py > cy ? 36 : -26)).toFixed(1)}" text-anchor="middle">Planet Nine</text>
    </g>
  </svg>`
}
