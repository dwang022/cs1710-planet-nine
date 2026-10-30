// Part 1, page 3: the head graphic. An observatory (art.js) looks at one
// distant object, a plain dot. Behind it on the sky are the positions measured
// on earlier nights, dimmer the older they are; the orbit fitted through them
// runs on faintly both ways, past and future. Three callouts, spread across the
// width, carry the page's numbers, all from observatories.json: how many
// observatories, how many positions, how many objects.
//
// The callouts are HTML laid over the drawing (so their text keeps its size at
// any width); on narrow screens they drop below it in a row. Schematic: the
// path and the positions are drawn, not measured. Nothing moves.

import { OBSERVATORY } from '../art.js'

const W = 1200, H = 280
const T = { x: 236, y: 120, w: 208, h: 156 }                     // the observatory, at 1.3× its 160 × 120 drawing
const LENS = [T.x + OBSERVATORY.lens[0] * 1.3, T.y + OBSERVATORY.lens[1] * 1.3]
const ANG = OBSERVATORY.angle * Math.PI / 180
const OBJ = [LENS[0] + 252 * Math.cos(ANG), LENS[1] - 252 * Math.sin(ANG)]   // on the line of sight
// The object's path across the sky: a wide, gentle curve that passes through it.
const bend = x => ((x - 720) / 420) ** 2 * 80
const arcY = x => OBJ[1] - bend(OBJ[0]) + bend(x)
const MEASURED = [430, OBJ[0]]                                    // the stretch of the path with positions on it
const NIGHTS = [0, 0.09, 0.15, 0.3, 0.38, 0.55, 0.63, 0.78, 0.88]  // where along it the earlier positions fall

const pathFrom = (x0, x1, step = 6) => {
  const pts = []
  for (let x = x0; x < x1; x += step) pts.push([x, arcY(x)])
  pts.push([x1, arcY(x1)])
  return 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(',')).join('L')
}

export function drawDataHero (root, { nGround, nObjects, nObs, cut }) {
  const frac = x => x - Math.floor(x)
  const stars = Array.from({ length: 46 }, (_, i) => {
    const s = frac(i * 0.618034 + 0.31), t = frac(i * 0.754878 + 0.07)
    return `<circle cx="${(10 + s * 1180).toFixed(0)}" cy="${(8 + t * 250).toFixed(0)}" r="${(0.7 + (i % 3) * 0.45).toFixed(1)}" fill="#fff" opacity="${(0.1 + t * 0.28).toFixed(2)}"/>`
  }).join('')
  // the earlier positions, older ones dimmer
  const dots = NIGHTS.map((f, i) => {
    const x = MEASURED[0] + f * (MEASURED[1] - MEASURED[0])
    return `<circle class="hero-pos" cx="${x.toFixed(1)}" cy="${arcY(x).toFixed(1)}" r="3.6" opacity="${(0.22 + 0.6 * i / (NIGHTS.length - 1)).toFixed(2)}"/>`
  }).join('')
  const dotAt = f => { const x = MEASURED[0] + f * (MEASURED[1] - MEASURED[0]); return [x, arcY(x)] }
  const [px, py] = dotAt(0.15)
  const pct = ([x, y]) => `left:${(100 * x / W).toFixed(2)}%;top:${(100 * y / H).toFixed(2)}%`
  const C = { obs: [58, 186], pos: [215, 12], obj: [760, 86] }      // where each callout's top-left corner sits

  root.classList.add('data-hero')
  root.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="An observatory's telescope looking at a distant object. Positions measured on earlier nights trace its path behind it; the orbit fitted through them runs on faintly in both directions.">
      ${stars}
      <path class="hero-arc past" d="${pathFrom(150, MEASURED[0])}"/>
      <path class="hero-arc measured" d="${pathFrom(...MEASURED)}"/>
      <path class="hero-arc future" d="${pathFrom(OBJ[0], 1190)}"/>
      <line class="hero-sight" x1="${LENS[0].toFixed(1)}" y1="${LENS[1].toFixed(1)}" x2="${(OBJ[0] - 12 * Math.cos(ANG)).toFixed(1)}" y2="${(OBJ[1] + 12 * Math.sin(ANG)).toFixed(1)}"/>
      ${dots}
      <circle class="hero-obj" cx="${OBJ[0].toFixed(1)}" cy="${OBJ[1].toFixed(1)}" r="6.5"/>
      <use href="#art-observatory" x="${T.x}" y="${T.y}" width="${T.w}" height="${T.h}"/>
      <g class="hero-tails">
        <line x1="${C.obs[0] + 150}" y1="${C.obs[1] + 26}" x2="${T.x + 44}" y2="${T.y + 108}"/>
        <line x1="${C.pos[0] + 160}" y1="${C.pos[1] + 26}" x2="${(px - 6).toFixed(0)}" y2="${(py - 3).toFixed(0)}"/>
        <line x1="${C.obj[0]}" y1="${C.obj[1] + 22}" x2="${(OBJ[0] + 9).toFixed(0)}" y2="${(OBJ[1] + 6).toFixed(0)}"/>
      </g>
    </svg>
    <div class="hero-callout" style="${pct(C.obs)}"><b>${nGround}</b><span>observatories</span></div>
    <div class="hero-callout" style="${pct(C.pos)}"><b>${nObs}</b><span>positions measured</span></div>
    <div class="hero-callout" style="${pct(C.obj)}"><b>${nObjects}</b><span>objects averaging past <span class="k-au">${cut} AU</span></span></div>`
}
