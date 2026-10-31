// The distance page's head: the Sun, Mercury, Venus and Earth at their true
// distances, with a ruler from the Sun to Earth marking one AU. Pure markup in
// the zoom-out chart's style (dashed orbits, dist-lbl labels), drawn with the
// sprite's bodies; each planet named in its own colour, and the ruler running
// from the Sun's gold to Earth's blue: the AU is the distance between them.
// Distances come from planets.json; the drawn sizes are not to scale.

const W = 560, H = 176
const SUN = { x: 58, y: 68, s: 90 }
const EARTH_X = 520                       // where 1 AU lands
const LOOK = { Mercury: 24, Venus: 34, Earth: 36 }
const RULER_Y = 156

const use = (name, x, y, s) =>
  `<use href="#art-${name}" x="${(x - s / 2).toFixed(1)}" y="${(y - s / 2).toFixed(1)}" width="${s}" height="${s}"/>`

// The visible stretch of an orbit: an arc round the Sun, as tall as the box allows.
function arc (r) {
  const t = Math.asin(Math.min(1, (SUN.y - 6) / r))
  const x = SUN.x + r * Math.cos(t), dy = r * Math.sin(t)
  return `<path class="dist-orbit" d="M${x.toFixed(1)},${(SUN.y - dy).toFixed(1)} A${r},${r} 0 0 1 ${x.toFixed(1)},${(SUN.y + dy).toFixed(1)}"/>`
}

export function drawAuRuler (root, planets) {
  const k = EARTH_X - SUN.x                      // pixels per AU
  const bodies = Object.keys(LOOK).map(name => ({ name, a: planets.find(p => p.name === name).a, s: LOOK[name] }))
  const lx = SUN.x + k / 2                       // the ruler's label sits in a gap at its middle
  root.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="The Sun, Mercury, Venus and Earth drawn at their true distances. A ruler from the Sun to Earth marks one AU.">
    ${bodies.map(b => arc(b.a * k)).join('')}
    ${use('sun', SUN.x, SUN.y, SUN.s)}
    ${bodies.map(b => use(b.name.toLowerCase(), SUN.x + b.a * k, SUN.y, b.s) +
      `<text class="dist-lbl" data-planet="${b.name}" x="${(SUN.x + b.a * k).toFixed(1)}" y="${SUN.y + b.s * 0.4 + 18}" text-anchor="middle">${b.name}</text>`).join('')}
    <defs><linearGradient id="au-ruler" gradientUnits="userSpaceOnUse" x1="${SUN.x}" x2="${EARTH_X}" y1="0" y2="0">
      <stop offset="0" style="stop-color:var(--au)"/><stop offset="1" style="stop-color:var(--au-2)"/></linearGradient></defs>
    <g class="dist-ruler" style="--ruler:url(#au-ruler)">
      <line x1="${SUN.x}" x2="${lx - 30}" y1="${RULER_Y}" y2="${RULER_Y}"/><line x1="${lx + 30}" x2="${EARTH_X}" y1="${RULER_Y}" y2="${RULER_Y}"/>
      <line x1="${SUN.x}" x2="${SUN.x}" y1="${RULER_Y - 6}" y2="${RULER_Y + 6}"/><line x1="${EARTH_X}" x2="${EARTH_X}" y1="${RULER_Y - 6}" y2="${RULER_Y + 6}"/>
    </g>
    <text class="dist-lbl focus au" x="${lx}" y="${RULER_Y + 5}" text-anchor="middle">1 AU</text>
  </svg>`
}
