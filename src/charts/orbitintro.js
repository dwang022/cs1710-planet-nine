// Three small drawings that open the clustering page, before the pattern: what
// an orbit is, in the manner of orbitart.js (300 × 170 boxes, the object in
// violet, laid out by the .definition list). They are drawn from one real
// orbit, Sedna's, to scale, after a planet's near-circle for contrast: a
// circle round the Sun, with no near end; Sedna's oval with the Sun at its
// focus, over the circle it was pulled from, drawn faintly round the Sun through
// the near end, where the push that did it (an arrow) happened; and the line from the Sun through the near end.

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
  // the planet's circle in the first drawing: as tall as the oval
  const R = (b * s).toFixed(1)

  return {
    // 1. a planet's orbit: nearly a circle, the Sun in the middle, no near or far end
    circle: () => `${open}<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" style="stroke:var(--c-neptune)" stroke-width="1.8"/>
      <use href="#art-sun" x="${cx - 9}" y="${cy - 9}" width="18" height="18"/>
      <circle cx="${(cx + +R).toFixed(1)}" cy="${cy}" r="3.4" style="fill:var(--c-neptune)"/></svg>`,

    // 2. the circle pulled long into an oval, the Sun off-centre at one focus; the push that did it is an arrow
    // along the orbit at the near end, where a push sends an object out to the far side
    oval: () => `${open}<circle cx="${sun[0].toFixed(1)}" cy="${cy}" r="${(near[0] - sun[0]).toFixed(1)}" fill="none" style="stroke:var(--c-neptune)" stroke-opacity="0.6" stroke-width="1.4" stroke-dasharray="3 3"/>
      ${oval()}${sunArt}
      <path d="M${(near[0] + 9).toFixed(1)},${cy + 12} L${(near[0] + 9).toFixed(1)},${cy - 20} M${(near[0] + 4).toFixed(1)},${cy - 13} L${(near[0] + 9).toFixed(1)},${cy - 20} L${(near[0] + 14).toFixed(1)},${cy - 13}"
        fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${near[0].toFixed(1)}" cy="${cy}" r="3.4" fill="${VIOLET}"/>
      <circle cx="${far[0].toFixed(1)}" cy="${cy}" r="3.4" fill="${VIOLET}"/></svg>`,

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
