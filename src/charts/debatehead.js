// The debate page's head (search/timeline.html): a decorative Planet Nine beside the title, half in light and half in
// shadow, for the evidence and the doubt (2026-11-19, asked for). Decoration, not data: no numbers, no years.
//
// It is the reader's own Planet Nine (2026-11-20, asked for): the skin chosen on the intro, read through site.js's
// currentSkin() and redrawn on its p9:skin event, drawn by art.js's svgMarkup exactly as everywhere else, without its
// question mark. The skin's own soft shade (skins.js, shade()) is taken out, since this drawing has its own light. In
// one 300-unit box centred on the planet:
//   - the drawing, turning slowly in place, so every skin's features (the cheese's holes, the nine-ball's 9, the
//     black hole's ring) stay whole as it turns (style.css, .dh-spin);
//   - over it, clipped to the disc and held still: the limb darkening towards the edge, the night side's shadow, a
//     highlight and a rim on the lit edge, in one group that swings slowly about the centre, so the line between day
//     and night drifts (.dh-light). The shadow is soft enough that the features still show through it;
//   - round it a faint atmosphere in the skin's colour, and a few dim stars.
// The whole drawing floats a few pixels up and down. With reduced motion everything holds still (style.css).

import { skin as skinFor } from '../skins.js'
import { svgMarkup } from '../art.js'
import { currentSkin } from '../site.js'

const R = 92                     // the planet's radius in the drawing's box
// the reader's drawing without its question mark or its own shade, scaled so its body (radius 40 in a 100 box) is
// the circle of radius R
function planet (id) {
  const size = 2 * R / 0.8
  const art = svgMarkup('planet-nine', { size, skin: id, question: false }).replace(/<circle [^>]*fill="#06100e"[^>]*\/>/g, '')
  return `<g transform="translate(${-size / 2},${-size / 2})">${art}</g>`
}

// a few dim stars round the planet, from a fixed seed so every visit sees the same ones; none behind the disc
function stars () {
  let seed = 23
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const out = []
  while (out.length < 16) {
    const x = -150 + rnd() * 300, y = -150 + rnd() * 300
    if (Math.hypot(x, y) < R + 26) continue
    const tw = rnd() < 0.4 ? ` class="dh-tw" style="--d:${(3 + rnd() * 4).toFixed(1)}s;--dl:-${(rnd() * 5).toFixed(1)}s"` : ''
    out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6 + rnd() * 0.9).toFixed(2)}" fill="#fff" opacity="${(0.25 + rnd() * 0.45).toFixed(2)}"${tw}/>`)
  }
  return out.join('')
}

function markup (id) {
  const s = skinFor(id)
  const st = (o, c, a = 1) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`
  return `<svg class="dh-svg" viewBox="-150 -150 300 300" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="dh-air" r="${R + 46}" cx="0" cy="0" gradientUnits="userSpaceOnUse">
        ${st((R - 4) / (R + 46), s.colour, 0.34)}${st((R + 8) / (R + 46), s.colour, 0.14)}${st(1, s.colour, 0)}</radialGradient>
      <radialGradient id="dh-limb" r="${R}" cx="0" cy="0" gradientUnits="userSpaceOnUse">
        ${st(0.66, '#05070d', 0)}${st(0.92, '#05070d', 0.16)}${st(1, '#05070d', 0.36)}</radialGradient>
      <linearGradient id="dh-night" x1="${-R}" x2="${R}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
        ${st(0.4, '#05070d', 0)}${st(0.53, '#05070d', 0.42)}${st(0.66, '#05070d', 0.6)}${st(1, '#05070d', 0.66)}</linearGradient>
      <radialGradient id="dh-shine" r="${R * 0.75}" cx="${-R * 0.42}" cy="${-R * 0.3}" gradientUnits="userSpaceOnUse">
        ${st(0, '#fff', 0.2)}${st(1, '#fff', 0)}</radialGradient>
      <linearGradient id="dh-rim" x1="${-R}" x2="${R}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
        ${st(0, '#fff', 0.55)}${st(0.4, '#fff', 0)}</linearGradient>
      <clipPath id="dh-clip"><circle r="${R}"/></clipPath>
    </defs>
    <g class="dh-stars">${stars()}</g>
    <circle class="dh-air" r="${R + 46}" fill="url(#dh-air)"/>
    <g class="dh-spin">${planet(id)}</g>
    <g clip-path="url(#dh-clip)">
      <circle r="${R}" fill="url(#dh-limb)"/>
      <g class="dh-light">
        <rect x="${-2 * R}" y="${-2 * R}" width="${4 * R}" height="${4 * R}" fill="url(#dh-night)"/>
        <circle r="${R}" fill="url(#dh-shine)"/>
        <circle r="${R - 1}" fill="none" stroke="url(#dh-rim)" stroke-width="2"/>
      </g>
    </g>
  </svg>`
}

/** Draws the planet into `el` and keeps it in the reader's skin. */
export function drawDebateHead (el) {
  el.innerHTML = `<div class="dh-float">${markup(currentSkin())}</div>`
  document.addEventListener('p9:skin', e => { el.querySelector('.dh-float').innerHTML = markup(e.detail) })
}
