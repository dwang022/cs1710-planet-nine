// The future page's pictures (rebuilt 2026-11-18, asked for: the sky map, with Rubin's view brightening year by year,
// read as a glow on a night sky; the page wanted simple pictures). Flat drawings in the site's style (src/art.js):
//
//   HOW     how Rubin searches, four small drawings in a row (rewritten 2026-11-18, asked for: a dot shifting between
//           photos repeated the data page and sounded too sure): it photographs the sky over it patch by patch (a dome of
//           patches, tonight's in its pink); software takes an earlier photo of each patch from the new one, leaving only
//           what changed, flagged; asteroids race across the sky while a distant object barely moves, tracing a small loop
//           each year that gives its distance; and at one distance Pluto would be too faint to register while a planet far
//           bigger shows, so distance and brightness give a size
//   OTHER   the other searches, a drawing each: the infrared candidates' old sightings and the deep photo that would
//           check them; the planet's own heat reaching a dish; new orbits that cluster or scatter
//
// (A timeline chart of Rubin's photos adding up over the ten years, with our estimates as dashed spans, was tried the
// same day and cut as confusing, asked for: it had no axis for the photos. The survey's dates are beats in the head.)
//
// Colour by meaning: Rubin, its photos and what its software flags hot pink (what comes next), the infrared candidates
// ember (as the timeline page draws the candidate), the distant objects violet, the planet in its own drawing, the rest
// (stars, asteroids, frames) white and grey. Words on the pictures are a few each; the captions say what the pictures mean.

const f1 = n => +n.toFixed(1)
const svg = (inner, w = 240, h = 140, y0 = 0) => `<svg class="fx-art" viewBox="0 ${y0} ${w} ${h}" aria-hidden="true" focusable="false">${inner}</svg>`
const frame = (x, y, w, h, cls = '') => `<rect class="fx-frame ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`
const STARS = [[0.18, 0.24], [0.72, 0.18], [0.42, 0.58], [0.85, 0.7], [0.2, 0.82], [0.6, 0.86]]
const stars = (x, y, w, h, r = 1.6) => STARS.map(([u, v]) => `<circle class="fx-star" cx="${f1(x + u * w)}" cy="${f1(y + v * h)}" r="${r}"/>`).join('')

/** A small dish antenna, its base at (x, y). */
const dish = (x, y) => `<g class="fx-dish">
  <path d="M${x - 16},${y - 30} Q${x},${y - 6} ${x + 16},${y - 30}" />
  <line x1="${x}" y1="${y - 18}" x2="${x - 9}" y2="${y - 36}"/><circle cx="${x - 10}" cy="${y - 38}" r="2.4"/>
  <path d="M${x - 4},${y - 17} L${x - 8},${y} M${x + 4},${y - 17} L${x + 8},${y} M${x - 12},${y} L${x + 12},${y}"/></g>`

/** A Sun and a handful of long orbits round it, their far ends `dirs` degrees round from +x. */
function orbits (cx, cy, dirs, a = 26, e = 0.72) {
  return dirs.map(d => {
    const rad = d * Math.PI / 180, c = a * e
    const ox = cx + c * Math.cos(rad), oy = cy - c * Math.sin(rad)
    return `<ellipse class="fx-orbit" cx="${f1(ox)}" cy="${f1(oy)}" rx="${a}" ry="${f1(a * Math.sqrt(1 - e * e))}" transform="rotate(${f1(-d)} ${f1(ox)} ${f1(oy)})"/>`
  }).join('') + `<circle class="fx-sun" cx="${cx}" cy="${cy}" r="3.2"/>`
}

export const HOW = {
  // the sky over the observatory as a dome of patches, photographed one at a time: tonight's so far in Rubin's pink,
  // the one being taken now outlined bright, the rest still to come tonight
  sky: () => {
    const cx = 120, cy = 120, R = 108, sz = 9, gap = 2, step = sz + gap, ground = cy - 4
    const cols = Math.floor((2 * R) / step), x0 = cx - (cols * step - gap) / 2
    const cells = []
    for (let row = 0; ; row++) {
      const y = ground - 3 - sz - row * step
      if (y < cy - R) break
      for (let c = 0; c < cols; c++) {
        const x = x0 + c * step
        const inside = [[x, y], [x + sz, y], [x, y + sz], [x + sz, y + sz]].every(([u, v]) => Math.hypot(u - cx, v - cy) <= R - 5)
        const underScope = x + sz > cx - 27 && x < cx + 27 && y + sz > ground - 42
        if (inside && !underScope) cells.push({ x, y, c, row })
      }
    }
    // Rubin's order through the night: column by column, from one side of the sky towards the other
    cells.sort((p, q) => p.c - q.c || p.row - q.row)
    const done = Math.round(cells.length * 0.42)
    const dx = Math.sqrt(R * R - (cy - ground) ** 2)
    return svg(`
      <path class="fx-dome" d="M${f1(cx - dx)},${ground} A${R},${R} 0 0 1 ${f1(cx + dx)},${ground}"/>
      <line class="fx-ground" x1="4" y1="${ground}" x2="236" y2="${ground}"/>
      ${cells.map(({ x, y }, i) => `<rect class="fx-patch${i < done ? ' is-done' : ''}${i === done ? ' is-now' : ''}" x="${f1(x)}" y="${f1(y)}" width="${sz}" height="${sz}" rx="1.5"/>`).join('')}
      <use href="#art-observatory" x="${cx - 26}" y="${ground - 38}" width="52" height="39"/>`, 240, 120)
  },
  // a new photo less an earlier one of the same patch leaves only what changed: the dot that moved, flagged
  difference: () => {
    const y = 18, w = 62, h = 62, xs = [6, 89, 172]
    const pos = [[0.66, 0.36], [0.5, 0.44]]                // the moving dot in the new photo, and in the earlier one
    const dot = (x, [u, v], cls = 'fx-star') => `<circle class="${cls}" cx="${f1(x + u * w)}" cy="${f1(y + v * h)}" r="1.6"/>`
    const sign = (x, t) => `<text class="fx-op" x="${x}" y="${y + h / 2 + 5}" text-anchor="middle">${t}</text>`
    return svg(`
      ${frame(xs[0], y, w, h)}${stars(xs[0], y, w, h)}${dot(xs[0], pos[0])}
      ${sign((xs[0] + w + xs[1]) / 2, '−')}
      ${frame(xs[1], y, w, h)}${stars(xs[1], y, w, h)}${dot(xs[1], pos[1])}
      ${sign((xs[1] + w + xs[2]) / 2, '=')}
      ${frame(xs[2], y, w, h)}${dot(xs[2], pos[0], 'fx-star is-left')}
      <circle class="fx-flag" cx="${f1(xs[2] + pos[0][0] * w)}" cy="${f1(y + pos[0][1] * h)}" r="7"/>
      ${['new', 'earlier', 'moved'].map((t, i) => `<text class="fx-cap" x="${xs[i] + w / 2}" y="${y + h + 16}" text-anchor="middle">${t}</text>`).join('')}`, 240, 120, -8)
  },
  // asteroids race across the frame in a few nights; a distant object barely moves, tracing a small loop over a year
  // as the Earth goes round (the smaller the loop, the farther away)
  tracks: () => {
    // each asteroid's sightings on four nights, oldest faintest, joined by a faint line
    const track = (x, y, dx, dy) => `<line class="fx-path" x1="${x}" y1="${y}" x2="${f1(x + 3 * dx)}" y2="${f1(y + 3 * dy)}"/>` +
      [0, 1, 2, 3].map(k => `<circle class="fx-ast" cx="${f1(x + k * dx)}" cy="${f1(y + k * dy)}" r="2.2" opacity="${(0.4 + 0.2 * k).toFixed(2)}"/>`).join('')
    // the distant object over a year: a slow drift plus the Earth's yearly swing, which turns it back on itself once
    const at = t => [40 + 30 * t + 12 * Math.sin(2 * Math.PI * t), 70 - 4 * t - 8 * Math.cos(2 * Math.PI * t)]
    const loop = Array.from({ length: 49 }, (_, i) => at(i / 48)).map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)},${f1(y)}`).join('')
    const months = Array.from({ length: 13 }, (_, m) => at(m / 12))
    return svg(`${frame(10, 8, 220, 92)}
      ${track(24, 22, 30, 6)}${track(140, 18, 24, 10)}${track(96, 90, 30, -8)}
      <path class="fx-path is-far" d="${loop}"/>
      ${months.map(([x, y], m) => `<circle class="fx-far" cx="${f1(x)}" cy="${f1(y)}" r="1.8" opacity="${(0.35 + 0.65 * m / 12).toFixed(2)}"/>`).join('')}
      <text class="fx-cap" x="121" y="45">asteroids</text>
      <text class="fx-cap" x="55" y="92" text-anchor="middle">distant</text>`, 240, 120, -6)
  },
  // at the same distance, Pluto would be too faint to register, while a planet far bigger shows as a dot Rubin flags
  size: () => {
    const body = (x, y, w, h, fx, fy, faint) => `${frame(x, y, w, h)}${stars(x, y, w, h, 1.4)}
      <circle class="fx-star${faint ? ' is-faint' : ' is-left'}" cx="${f1(x + fx * w)}" cy="${f1(y + fy * h)}" r="${faint ? 1.3 : 2.4}"/>
      ${faint ? '' : `<circle class="fx-flag" cx="${f1(x + fx * w)}" cy="${f1(y + fy * h)}" r="7"/>`}`
    return svg(`
      <use href="#art-pluto" x="54" y="20" width="24" height="24"/>
      <use href="#art-planet-nine" x="150" y="0" width="48" height="48"/>
      ${body(34, 54, 64, 44, 0.55, 0.4, true)}${body(142, 54, 64, 44, 0.55, 0.4, false)}
      <text class="fx-lab is-pluto" x="66" y="114" text-anchor="middle">Pluto</text>
      <text class="fx-lab p9-svg" x="174" y="114" text-anchor="middle">Planet Nine</text>`, 240, 120)
  },
}

export const OTHER = {
  // two old sightings on the predicted track, and the deep photo where the candidate should be now
  infrared: () => svg(`
    <path class="fx-track" d="M18,96 Q120,24 222,58"/>
    <circle class="fx-cand" cx="40" cy="80" r="4"/><circle class="fx-cand" cx="82" cy="58" r="4"/>
    ${frame(170, 30, 44, 44)}<circle class="fx-ghost" cx="192" cy="52" r="3.6"/>
    <text class="fx-cap" x="192" y="22" text-anchor="middle">?</text>`, 240, 120),
  // the planet's own warmth, picked up by a dish
  heat: () => svg(`
    <use href="#art-planet-nine" x="16" y="38" width="44" height="44"/>
    ${[0, 1, 2].map(k => `<path class="fx-wave" opacity="${1 - k * 0.28}" d="M${78 + k * 22},${36 + k * 2} Q${92 + k * 22},60 ${78 + k * 22},${84 - k * 2}"/>`).join('')}
    ${dish(196, 96)}`, 240, 120),
  // new orbits that line up, and new orbits that point every way
  orbits: () => svg(`
    ${orbits(66, 60, [182, 196, 210, 224, 238, 252])}
    <line class="fx-div" x1="120" y1="18" x2="120" y2="102"/>
    ${orbits(176, 60, [10, 70, 130, 190, 250, 310], 22)}`, 240, 120),
}
