// Three small drawings that open the clustering page, before the pattern: what
// an orbit is, in the manner of orbitart.js (300 × 170 boxes, the object in
// violet, laid out by the .definition list). They are drawn from one real
// orbit, Sedna's, to scale: the oval with the Sun at its focus; the same oval
// with a dot every equal stretch of time, from Kepler's equation, so the dots
// crowd at the far end; and the line from the Sun through the near end.

import { trueAnomaly } from '../orbits.js'

const VIOLET = '#a78bfa', FAINT = '#5a5a64'
const RAD = Math.PI / 180
const open = '<svg viewBox="0 0 300 170" aria-hidden="true">'

export function orbitIntro ({ a_au: a, e }) {
  // the near end to the right, the oval reaching back across the box
  const s = 128 / a, cx = 140, cy = 88, b = a * Math.sqrt(1 - e * e)
  const sun = [cx + a * e * s, cy]
  const at = nu => {
    const r = a * (1 - e * e) / (1 + e * Math.cos(nu * RAD))
    return [sun[0] + r * s * Math.cos(nu * RAD), cy - r * s * Math.sin(nu * RAD)]
  }
  const oval = (stroke = VIOLET, w = 1.8) => `<ellipse cx="${cx}" cy="${cy}" rx="${(a * s).toFixed(1)}" ry="${(b * s).toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${w}"/>`
  const sunArt = `<use href="#art-sun" x="${(sun[0] - 9).toFixed(1)}" y="${(cy - 9).toFixed(1)}" width="18" height="18"/>`
  const near = at(0), far = at(180)

  return {
    // 1. an oval, the Sun off-centre at one focus
    oval: () => `${open}${oval()}${sunArt}
      <circle cx="${near[0].toFixed(1)}" cy="${cy}" r="3.4" fill="${VIOLET}"/>
      <circle cx="${far[0].toFixed(1)}" cy="${cy}" r="3.4" fill="${VIOLET}"/></svg>`,

    // 2. a dot every equal stretch of time: they crowd at the far end
    time: () => {
      const dots = Array.from({ length: 24 }, (_, k) => at(trueAnomaly(k * 15, e)))
      return `${open}${oval(FAINT, 1.4)}${sunArt}
        ${dots.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${VIOLET}"/>`).join('')}</svg>`
    },

    // 3. the direction it points: from the Sun through the near end
    point: () => {
      const tip = [near[0] + 22, cy]
      return `${open}${oval(FAINT, 1.4)}${sunArt}
        <path d="M${sun[0].toFixed(1)},${cy} L${tip[0].toFixed(1)},${cy} M${(tip[0] - 7).toFixed(1)},${cy - 5} L${tip[0].toFixed(1)},${cy} L${(tip[0] - 7).toFixed(1)},${cy + 5}"
          fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${near[0].toFixed(1)}" cy="${cy}" r="3.4" fill="${VIOLET}"/></svg>`
    },
  }
}
