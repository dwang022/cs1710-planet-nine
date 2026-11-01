// The alternatives page's head: the six orbits that first pointed to Planet
// Nine, bunched one way, drawn like the clustering page's head (real orbits
// laid flat, distances square-rooted, directions exact), and round them the
// suspects appearing one by one: each explanation's own mark (altart.js) with
// its short name. Eight ideas, one pattern; the table below weighs them.

import * as d3 from 'd3'
import { flatOrbit } from '../orbits.js'
import { ROW_ART } from './altart.js'

const S = 300
const FIT = 0.62                  // share of the box the orbits fill, inside the ring of suspects
// distance square-rooted, direction kept; [x, y] in AU → unscaled picture units, Sun at 0
function warp ([x, y]) {
  const r = Math.hypot(x, y)
  if (!r) return [0, 0]
  const s = Math.sqrt(r) / r
  return [x * s, -y * s]
}

/** six: the six objects; alternatives: alternatives.json rows (id, short). */
export function altHead (root, { six, alternatives }) {
  const n = alternatives.length
  // the orbits all stretch one way from the Sun: fit and centre them by their own extent, not by the Sun
  const paths = six.map(o => flatOrbit(o.a_au, o.e, o.varpi_deg, 200).map(warp))
  const all = paths.flat()
  const [x0, x1] = d3.extent(all, p => p[0]), [y0, y1] = d3.extent(all, p => p[1])
  const k = (S * FIT) / Math.max(x1 - x0, y1 - y0)
  const at = ([x, y]) => [S / 2 + (x - (x0 + x1) / 2) * k, S / 2 + (y - (y0 + y1) / 2) * k]
  const sun = at([0, 0])
  root.innerHTML = `<div class="alt-head" role="img" aria-label="Six distant orbits bunched one way, with ${n} suggested causes round them: ${alternatives.map(a => a.short).join(', ')}.">
    <svg viewBox="0 0 ${S} ${S}" aria-hidden="true">
      ${paths.map(p => `<path class="ah-orbit" d="${d3.line()(p.map(at))}"/>`).join('')}
      <use href="#art-sun" x="${(sun[0] - 7).toFixed(1)}" y="${(sun[1] - 7).toFixed(1)}" width="14" height="14"/>
    </svg>
    ${alternatives.map((a, i) => {
      // round the picture from the top, clockwise
      const t = (-90 + i * 360 / n) * Math.PI / 180
      return `<div class="ah-suspect" style="left:${(50 + 44 * Math.cos(t)).toFixed(1)}%;top:${(50 + 44 * Math.sin(t)).toFixed(1)}%;animation-delay:${600 + i * 350}ms">
        <span class="alt-ic-box">${ROW_ART[a.id]?.() || ''}</span><span class="ah-name">${a.short}</span></div>`
    }).join('')}
  </div>`
}
