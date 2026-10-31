// Part 1, page 3: the head graphic, the full width of the page and, on a wide
// screen, behind the page title, so the whole head is one sky. An observatory
// (art.js) on a low rise looks along its line of sight at one distant object, a
// plain dot. Behind it are the positions measured on earlier nights, dimmer the
// older they are; the orbit fitted through them arches faintly across the whole
// sky, past and future. Further along the horizon, smaller with distance and
// turned to face back, other observatories each look along their own faint line
// of sight at one of the earlier positions: many sites, many nights. The page's
// three numbers, all from observatories.json,
// sit beside what they count with no boxes: the observatories by the building,
// the positions along the measured stretch, the objects by the object. Stars
// keep clear of the drawing and its words, and now and then a shooting star
// crosses (meteors.js). Below STACK px wide the picture sits under the title,
// centred, and the numbers drop into a row under it.
//
// Laid out in the panel's own pixels, so the words keep their size at any
// width, and redrawn when the width changes. Schematic: the path and the
// positions are drawn, not measured.

import { OBSERVATORY } from '../art.js'
import { meteors } from '../meteors.js'

const NIGHTS = [0, 0.09, 0.15, 0.3, 0.38, 0.55, 0.63, 0.78, 0.88]  // where along the measured stretch the earlier positions fall
const f1 = v => v.toFixed(1)
const STACK = 840                                                 // keep in step with the media queries in style.css

function layout (w, title) {
  const phone = w < STACK
  const h = phone ? 290 : 470
  const s = phone ? 1 : 1.3                                       // the observatory, at s × its 160 × 120 drawing
  const T = { w: 160 * s, h: 120 * s }
  T.y = h - T.h - 4
  const a = OBSERVATORY.angle * Math.PI / 180
  const objY = phone ? 64 : 76
  // how far right of the observatory its line of sight meets the object's height
  const reach = OBSERVATORY.lens[0] * s + (T.y + OBSERVATORY.lens[1] * s - objY) / Math.tan(a)
  // a quarter of the way in on a wide screen, so the scene runs edge to edge, but never so far that the
  // object's words lose their room on its right; centred when stacked
  T.x = phone ? Math.max(6, (w - reach - 60) / 2) : Math.max(6, Math.min(w * 0.26 - 40, w - 236 - reach))
  const lens = [T.x + OBSERVATORY.lens[0] * s, T.y + OBSERVATORY.lens[1] * s]
  const obj = [T.x + reach, objY]                                 // on the line of sight
  // the orbit: an arch through the object, highest a little to its right, meeting
  // the ground at the left edge
  const xA = obj[0] + (phone ? 0.1 : 0.16) * w
  const k = (h - 24 - obj[1]) / (xA ** 2 - (obj[0] - xA) ** 2)
  const arcY = x => obj[1] + k * ((x - xA) ** 2 - (obj[0] - xA) ** 2)
  const measured = [obj[0] - (phone ? Math.min(0.5 * w, 260) : Math.max(0.26 * w, 250)), obj[0]]
  // the object's words to its right on one line where they fit, else on two, else above it
  const room = w - 16 - obj[0]
  const objLbl = room > 360 ? { x: obj[0] + 18, y: obj[1] + 30, anchor: 'start', lines: 1 }
    : room > 210 ? { x: obj[0] + 18, y: obj[1] + 30, anchor: 'start', lines: 2 }
      : { x: obj[0] + 10, y: obj[1] - 20, anchor: 'end', lines: 1 }
  // further observatories along the horizon to the right, turned to face left, each placed where its own
  // line of sight (the same angle, mirrored) meets one of the earlier positions; none that would crowd
  // another, the first observatory and its words, or the edge
  const others = []
  if (!phone) {
    const taken = [[T.x - 20, T.x + T.w + 200]]
    for (const [t, sc] of [[0.15, 0.78], [0.55, 0.6], [0.3, 0.5]]) {
      const dot = [measured[0] + t * (measured[1] - measured[0])]
      dot.push(arcY(dot[0]))
      const ow = 160 * sc, oh = 120 * sc, oy = h - oh - 4
      const ly = oy + OBSERVATORY.lens[1] * sc
      const lx = dot[0] + (ly - dot[1]) / Math.tan(a)
      const ox = lx - (160 - OBSERVATORY.lens[0]) * sc
      if (ox + ow > w - 10 || taken.some(([x0, x1]) => ox < x1 + 12 && ox + ow > x0 - 12)) continue
      taken.push([ox, ox + ow])
      others.push({ x: ox, y: oy, w: ow, h: oh, lens: [lx, ly], dot })
    }
  }
  return { phone, w, h, T, a, lens, obj, arcY, measured, objLbl, title, others }
}

function scene (L, { nGround, nObjects, nObs, cut }) {
  const { phone, w, h, T, a, lens, obj, arcY, measured, objLbl, title, others } = L
  const pathFrom = (x0, x1, dy = 0, step = 6) => {
    const pts = []
    for (let x = x0; x < x1; x += step) pts.push([x, arcY(x) + dy])
    pts.push([x1, arcY(x1) + dy])
    return 'M' + pts.map(p => p.map(f1).join(',')).join('L')
  }
  const dots = NIGHTS.map((t, i) => {
    const x = measured[0] + t * (measured[1] - measured[0])
    return `<circle class="hero-pos" cx="${f1(x)}" cy="${f1(arcY(x))}" r="3.6" opacity="${(0.22 + 0.6 * i / (NIGHTS.length - 1)).toFixed(2)}"/>`
  }).join('')

  // the words, beside what they count (none on a phone: they go in the row below)
  const obsLbl = [T.x + T.w + 14, T.y + T.h - 22]
  const words = phone ? '' : `
      <path id="heroMeasured" d="${pathFrom(measured[0], measured[1], -16)}" fill="none"/>
      <text class="hero-words"><textPath href="#heroMeasured" startOffset="50%" text-anchor="middle"><tspan class="hero-n">${nObs}</tspan> positions measured</textPath></text>
      <text class="hero-words" x="${f1(obsLbl[0])}" y="${f1(obsLbl[1])}"><tspan class="hero-n">${nGround}</tspan> observatories</text>
      <text class="hero-words" x="${f1(objLbl.x)}" y="${f1(objLbl.y)}" text-anchor="${objLbl.anchor}">one of <tspan class="hero-n">${nObjects}</tspan> objects${objLbl.lines === 2 ? `<tspan x="${f1(objLbl.x)}" dy="21">averaging past</tspan>` : ' averaging past'} <tspan class="au">${cut} AU</tspan></text>`

  // stars, spread evenly by golden-ratio sequences, kept clear of the drawing and its words
  const near = (x, y, [x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1
  const keepOut = [
    [T.x - 50, T.y - 50, T.x + T.w + 40, h],                      // the observatory
    ...others.map(o => [o.x - 30, o.y - 30, o.x + o.w + 30, h]),
    [obj[0] - 26, obj[1] - 26, obj[0] + 26, obj[1] + 26],
    ...(phone ? [] : [[obsLbl[0] - 8, obsLbl[1] - 26, obsLbl[0] + 190, obsLbl[1] + 10],
      objLbl.anchor === 'start' ? [objLbl.x - 8, objLbl.y - 22, objLbl.x + (objLbl.lines === 2 ? 200 : 340), objLbl.y + (objLbl.lines === 2 ? 30 : 10)] : [objLbl.x - 340, objLbl.y - 22, objLbl.x + 8, objLbl.y + 10]]),
    ...(title ? [[title.x0 - 24, title.y0 - 24, title.x1 + 24, title.y1 + 24]] : []),   // the page title, laid over the sky
  ]
  const sights = [[lens, obj], ...others.map(o => [o.lens, o.dot])]
  const offSight = (x, y) => Math.min(...sights.map(([p, q]) => {   // distance from the nearest line of sight
    const L2 = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2
    const t = Math.max(0, Math.min(1, ((x - p[0]) * (q[0] - p[0]) + (y - p[1]) * (q[1] - p[1])) / L2))
    return Math.hypot(x - p[0] - t * (q[0] - p[0]), y - p[1] - t * (q[1] - p[1]))
  }))
  const frac = x => x - Math.floor(x)
  const stars = Array.from({ length: Math.round(w * h / 6500) }, (_, i) => {
    const sx = frac(i * 0.618034 + 0.31), sy = frac(i * 0.754878 + 0.07)
    return { x: 8 + sx * (w - 16), y: 8 + sy * (h - 40), r: 0.7 + (i % 3) * 0.45, o: 0.1 + sy * 0.28 }
  }).filter(p => !keepOut.some(b => near(p.x, p.y, b)) && Math.abs(p.y - arcY(p.x)) > 12 &&
    !(p.x > measured[0] - 20 && p.x < measured[1] && Math.abs(p.y - arcY(p.x) + 16) < 22) && offSight(p.x, p.y) > 12)
    .map(p => `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${p.r.toFixed(1)}" fill="#fff" opacity="${p.o.toFixed(2)}"/>`).join('')

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="An observatory's telescope looking at a distant object. Positions measured on earlier nights trace its path behind it; the orbit fitted through them arches faintly across the sky in both directions.">
      ${stars}
      <path class="hero-ground" d="M0,${h} V${h - 10} Q${f1(w * 0.3)},${h - 26} ${f1(w * 0.6)},${h - 12} T${w},${h - 14} V${h} Z"/>
      <path class="hero-arc past" d="${pathFrom(0, measured[0])}"/>
      <path class="hero-arc measured" d="${pathFrom(...measured)}"/>
      <path class="hero-arc future" d="${pathFrom(obj[0], w)}"/>
      <line class="hero-sight" x1="${f1(lens[0])}" y1="${f1(lens[1])}" x2="${f1(obj[0] - 12 * Math.cos(a))}" y2="${f1(obj[1] + 12 * Math.sin(a))}"/>
      ${others.map(o => `<line class="hero-sight far" x1="${f1(o.lens[0])}" y1="${f1(o.lens[1])}" x2="${f1(o.dot[0] + 8 * Math.cos(a))}" y2="${f1(o.dot[1] + 8 * Math.sin(a))}"/>`).join('')}
      ${dots}
      <circle class="hero-obj" cx="${f1(obj[0])}" cy="${f1(obj[1])}" r="6.5"/>
      <use href="#art-observatory" x="${f1(T.x)}" y="${f1(T.y)}" width="${T.w}" height="${T.h}"/>
      ${others.map(o => `<g transform="translate(${f1(o.x + o.w)} ${f1(o.y)}) scale(-1 1)"><use href="#art-observatory" width="${f1(o.w)}" height="${f1(o.h)}"/></g>`).join('')}
      ${words}
    </svg>`
}

export function drawDataHero (root, nums) {
  const { nGround, nObjects, nObs, cut } = nums
  root.classList.add('data-hero')
  root.innerHTML = `<div class="hero-scene"></div><div class="hero-meteors" aria-hidden="true"></div>
    <dl class="hero-row">
      <div><dt>observatories</dt><dd>${nGround}</dd></div>
      <div><dt>positions measured</dt><dd>${nObs}</dd></div>
      <div><dt>objects averaging past <span class="k-au">${cut} AU</span></dt><dd>${nObjects}</dd></div>
    </dl>`
  const host = root.querySelector('.hero-scene')
  let drawn = 0
  // the page title, where it sits over the scene (wide screens), so the stars keep clear of it
  const titleBox = () => {
    const t = root.parentElement.querySelector('h1')?.getBoundingClientRect(), r = root.getBoundingClientRect()
    return t && t.bottom > r.top ? { x0: t.left - r.left, y0: t.top - r.top, x1: t.right - r.left, y1: t.bottom - r.top } : null
  }
  const draw = () => {
    const w = Math.round(root.clientWidth)
    if (!w || w === drawn) return
    drawn = w
    host.innerHTML = scene(layout(w, titleBox()), nums)
  }
  draw()
  new ResizeObserver(draw).observe(root)
  meteors(root.querySelector('.hero-meteors'), { top: 0.5, dist: [220, 460], every: [2200, 5600] })
}
