// The photographed sky (search/how.html, #sky): how astronomers search for Planet Nine, and where it could still
// be hiding, told in three stages on one pinned picture.
//
//   1. From Earth to the sky  an observatory on Earth photographing one patch of the sky, beside the sky as a
//      sphere; the sphere unrolls into the oval map (scroll-driven), then the celestial equator and the ecliptic.
//   2. How deeply have we searched?  the oval moves left and becomes "How faint might Planet Nine be?" (its predicted
//      path shaded by the magnitude it would have there); a second oval fades in on the right, "How deeply have we
//      searched?" (the surveys shaded by the faintest magnitude their photos reach). One projection, one orientation
//      and one colour scale for magnitude on both, so the eye can compare them patch for patch.
//   3. Where could it still be hiding?  on the right map the path is marked where the photos reach as faint as the
//      planet would be there and where they do not; then the Milky Way, then Rubin.
//
// What is measured and what is assumed (data/README.md, surveys.json, planet_nine_predictions.json):
//   - the path is one orbit, the 2021 fit (p9_sky_track.json); the thin lines are its 1-sigma variants;
//   - the planet's magnitude at each point follows the brightness model the search papers use (brightnessModel in
//     charts/placeplanet.js) for one of two planets, both inside the 2021 fit's ranges, which the reader switches;
//   - survey outlines are schematic bands sized to each survey's published area, and depths are single-photo
//     limits, so the verdicts on the path are a sketch: no percentage is computed from them.
//
// Every layer is kept in the DOM and eased in or out per step (named D3 transitions, so a fast scroll retargets
// rather than stacks), so scrolling back replays the story in reverse. Readers who ask for less motion get the
// same states without the easing, and the sphere jumps straight to the oval.

import * as d3 from 'd3'
import { mollweideIn, footprintDec, deepestAt, galacticPoint, galacticLatitude, eclipticPoint, OBLIQUITY_DEG, skyMagColour, SKY_MAG_DOMAIN, SKY_COVER_OPACITY } from './skymap.js'
import { OBSERVATORY } from '../art.js'

export { OBLIQUITY_DEG }

// each panel draws into the same 3:2 box. The oval is 880 × 440, exactly 2:1, in the middle of it; the room above
// and below holds the panel's title and its switch, so neither covers the map. The first stage uses the box's
// full height: the sphere is drawn larger than the oval is tall (RS), and shrinks to the oval's height as it unrolls.
const W = 900, H = 600
const OX = 10, OY = 80, OW = 880, OH = 440
const RS = 285
const CX = OX + OW / 2, CY = OY + OH / 2, R = OH / 2
const D = Math.PI / 180
const moll = mollweideIn(OX, OY, OW, OH)
const clampRA = ra => Math.min(359.99, Math.max(0.01, ra))
const P = (ra, dec) => moll(clampRA(ra), dec)
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
const T = () => reduce.matches ? 0 : 650

// One scale for magnitude on both maps (skymap.js, shared with the game): a planet's magnitude on the left, the
// faintest magnitude the photos reach on the right. Lighter is a bigger number, that is, fainter.
export const MAG_DOMAIN = SKY_MAG_DOMAIN
export const magColour = skyMagColour
const VERDICT = { deep: '#ffffff', shallow: 'var(--series-2)', none: 'var(--text-muted)' }
const MILKY = '#dcc48a'

// --- the sphere, before it is unrolled: the same orientation as the oval (RA 180 in the middle, RA growing to the
// left, as the sky is seen from inside), so the morph moves every point straight to its place on the map
function ortho (ra, dec) {
  const lam = (180 - ra) * D, phi = dec * D
  return { x: CX + RS * Math.cos(phi) * Math.sin(lam), y: CY - RS * Math.sin(phi), front: Math.cos(phi) * Math.cos(lam) >= 0 }
}
const ease = d3.easeCubicInOut
function morphPoint (ra, dec, t) {
  const o = ortho(ra, dec), [mx, my] = P(ra, dec), k = ease(t)
  return { x: o.x + (mx - o.x) * k, y: o.y + (my - o.y) * k, front: o.front }
}
/** A line on the sphere at morph stage t, split into the stretches on the near side and those on the far side. */
function morphLine (pts, t) {
  const near = [], far = []
  let run = null, side = null, prevRa = null
  for (const [ra, dec] of pts) {
    const p = morphPoint(ra, dec, t)
    // a jump across the map's edge (RA 0/360) breaks the line on the oval
    if (run && (p.front !== side || (prevRa !== null && Math.abs(ra - prevRa) > 180))) { (side ? near : far).push(run); run = null }
    if (!run) { run = []; side = p.front }
    run.push([p.x, p.y]); prevRa = ra
  }
  if (run) (side ? near : far).push(run)
  const d = runs => runs.filter(r => r.length > 1).map(r => d3.line()(r)).join(' ')
  return { near: d(near), far: d(far) }
}
// the outline: the sphere's rim is a circle of radius RS, the oval an ellipse of 2R by R, so one turns into the other
function outlineAt (t) {
  const k = ease(t), rx = RS + (2 * R - RS) * k, ry = RS + (R - RS) * k
  return d3.range(0, 361, 4).map(a => [CX + rx * Math.cos(a * D), CY + ry * Math.sin(a * D)])
}
const lineOn = (pts) => {
  const segs = []; let cur = [], prev = null
  for (const [ra, dec] of pts) {
    if (prev !== null && Math.abs(ra - prev) > 180) { segs.push(cur); cur = [] }
    cur.push(P(ra, dec)); prev = ra
  }
  segs.push(cur)
  return segs.filter(s => s.length > 1).map(s => d3.line()(s)).join(' ')
}
// a circle on the sky (the patch one telescope photographs), as RA/Dec points
function cap (ra0, dec0, rad) {
  const a0 = ra0 * D, d0 = dec0 * D, r = rad * D
  return d3.range(0, 361, 6).map(b => {
    const br = b * D
    const dec = Math.asin(Math.sin(d0) * Math.cos(r) + Math.cos(d0) * Math.sin(r) * Math.cos(br))
    const ra = a0 + Math.atan2(Math.sin(br) * Math.sin(r) * Math.cos(d0), Math.cos(r) - Math.sin(d0) * Math.sin(dec))
    return [((ra / D) % 360 + 360) % 360, dec / D]
  })
}
const PATCH = { ra: 196, dec: 24, r: 22 }     // illustrative, said so in the caption

// --- the scene each step shows
const SCENES = {
  patch: { pair: 0, cap: 1, grat: 1, axes: 0, eq: 0, ecl: 0, track: 0, mag: 0, fp: 0, verdict: 0, gal: 0, rubin: 0 },
  flatten: { pair: 0, cap: 1, grat: 1, axes: 1, eq: 1, ecl: 0, track: 0, mag: 0, fp: 0, verdict: 0, gal: 0, rubin: 0 },
  ecliptic: { solo: 1, pair: 0, cap: 0, grat: 1, axes: 1, eq: 1, ecl: 1, track: 0, mag: 0, fp: 0, verdict: 0, gal: 0, rubin: 0 },
  path: { solo: 1, pair: 0, cap: 0, grat: 1, axes: 0, eq: 0.4, ecl: 1, track: 1, mag: 0, fp: 0, verdict: 0, gal: 0, rubin: 0 },
  faint: { pair: 1, cap: 0, grat: 1, axes: 0, eq: 0, ecl: 0.6, track: 1, mag: 1, fp: 0, verdict: 0, gal: 0, rubin: 0 },
  deep: { pair: 1, cap: 0, grat: 1, axes: 0, eq: 0, ecl: 0.6, track: 1, mag: 1, fp: 1, verdict: 0, gal: 0, rubin: 0 },
  compare: { pair: 1, cap: 0, grat: 1, axes: 0, eq: 0, ecl: 0.6, track: 1, mag: 1, fp: SKY_COVER_OPACITY, verdict: 1, gal: 0, rubin: 0 },
  milky: { pair: 1, cap: 0, grat: 1, axes: 0, eq: 0, ecl: 0.6, track: 1, mag: 1, fp: SKY_COVER_OPACITY, verdict: 1, gal: 1, rubin: 0 },
  rubin: { pair: 1, cap: 0, grat: 1, axes: 0, eq: 0, ecl: 0.6, track: 1, mag: 1, fp: SKY_COVER_OPACITY, verdict: 1, gal: 1, rubin: 1 },
}
export const STEPS = Object.keys(SCENES)

/**
 * Draws the story into `root` (an element holding .ss-earth, .ss-a and .ss-b panels, each with an <svg>).
 *   surveys     surveys.json's list
 *   track       p9_sky_track.json
 *   planets     { key: { label, magnitude(r_au) } }, the planets the reader can test
 * Returns { step(name), morph(t), planet(key), survey(id) }.
 */
export function drawSkySearch (root, { surveys, track, planets, onPick }) {
  const svgA = d3.select(root).select('.ss-a svg'), svgB = d3.select(root).select('.ss-b svg')
  const svgE = d3.select(root).select('.ss-earth svg')
  for (const s of [svgA, svgB, svgE]) s.attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet')

  const nom = track.tracks.find(t => t.label === 'nominal')
  const variants = track.tracks.filter(t => t.label !== 'nominal')
  const pts = nom.points.map(p => ({ ...p, xy: P(p.ra_deg, p.dec_deg) }))
  const rubinSurvey = surveys.find(s => s.future)
  let scene = SCENES.patch, sceneName = 'patch', morphT = 0, planetKey = Object.keys(planets)[0], active = null

  // --- the observatory on Earth (left panel, stage 1). The telescope's line of sight leaves the lens at the
  // drawing's own angle and meets the sky, drawn as a circle round Earth, where the photographed patch lies.
  {
    const E = [330, 815], ER = 330, SKY = 720
    const s = 1.85, ow = 160 * s, oh = 120 * s
    const ox = E[0] - ow / 2, oy = E[1] - ER - oh + 8 * s
    const lens = [ox + OBSERVATORY.lens[0] * s, oy + OBSERVATORY.lens[1] * s]
    const hit = (ang) => {      // where a ray from the lens at `ang` above horizontal meets the sky circle
      const dx = Math.cos(ang * D), dy = -Math.sin(ang * D)
      const fx = lens[0] - E[0], fy = lens[1] - E[1]
      const b = fx * dx + fy * dy, c = fx * fx + fy * fy - SKY * SKY
      const k = -b + Math.sqrt(b * b - c)
      return [lens[0] + k * dx, lens[1] + k * dy]
    }
    const half = 6, a = OBSERVATORY.angle
    const p1 = hit(a + half), p2 = hit(a - half)
    const arc = (r, from, to) => `M${from[0]},${from[1]} A${r},${r} 0 0 1 ${to[0]},${to[1]}`
    const horizonY = E[1] - ER
    svgE.html(`
      <!-- Earth's drawing fills 80% of its box (art.js, R = 40 of 50), so the box is scaled up to make ER its radius -->
      <defs><clipPath id="ss-earth-clip"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>
      <g clip-path="url(#ss-earth-clip)">
        <path class="ss-sky-above" d="M${E[0] - SKY},${horizonY} A${SKY},${SKY} 0 0 1 ${E[0] + SKY},${horizonY} Z"/>
        <circle class="ss-sky-circle" cx="${E[0]}" cy="${E[1]}" r="${SKY}"/>
        <path class="ss-beam" d="M${lens[0]},${lens[1]} L${p1[0]},${p1[1]} A${SKY},${SKY} 0 0 1 ${p2[0]},${p2[1]} Z"/>
        <path class="ss-patch-arc" d="${arc(SKY, p1, p2)}"/>
        <line class="ss-horizon" x1="${E[0] - SKY}" y1="${horizonY}" x2="${E[0] + SKY + 200}" y2="${horizonY}"/>
        <use href="#art-earth" x="${E[0] - ER / 0.8}" y="${E[1] - ER / 0.8}" width="${2 * ER / 0.8}" height="${2 * ER / 0.8}"/>
        <use href="#art-observatory" x="${ox}" y="${oy}" width="${ow}" height="${oh}"/>
        <text class="ss-note" x="${W - 24}" y="${horizonY - 16}" text-anchor="end">horizon</text>
        <text class="ss-note is-strong" x="${p2[0] + 16}" y="${p2[1] + 12}">one patch</text>
        <text class="ss-note" x="40" y="${E[1] - SKY * 0.91}" text-anchor="start">the sky, as a sphere</text>
      </g>`)
  }

  // --- the two maps share their frame; A also carries the sphere
  function frame (svg, id, morphs) {
    svg.html('')
    const defs = svg.append('defs')
    defs.append('clipPath').attr('id', `ss-clip-${id}`).append('path').attr('d', d3.line()(outlineAt(1)) + 'Z')
    if (morphs) {
      const g = defs.append('radialGradient').attr('id', 'ss-sphere').attr('cx', '38%').attr('cy', '34%').attr('r', '70%')
      g.append('stop').attr('offset', 0).attr('stop-color', '#262a36')
      g.append('stop').attr('offset', 1).attr('stop-color', '#0c0c0e')
    }
    svg.append('path').attr('class', 'ss-outline')
    svg.append('g').attr('class', 'ss-grat')
    const clip = svg.append('g').attr('class', 'ss-layers').attr('clip-path', `url(#ss-clip-${id})`)
    clip.append('g').attr('class', 'ss-gal')
    clip.append('g').attr('class', 'ss-fp')
    clip.append('g').attr('class', 'ss-rubin')
    svg.append('path').attr('class', 'ss-eq')
    svg.append('path').attr('class', 'ss-ecl')
    svg.append('g').attr('class', 'ss-cap')
    clip.append('g').attr('class', 'ss-track')
    clip.append('g').attr('class', 'ss-verdict')
    svg.append('g').attr('class', 'ss-notes')
    svg.append('g').attr('class', 'ss-hover')
  }
  frame(svgA, 'a', true)
  frame(svgB, 'b', false)

  // --- the graticule on both (A's is redrawn as the sphere unrolls)
  const GRAT = [
    ...d3.range(-60, 90, 30).map(dec => ({ k: 'p' + dec, eq: dec === 0, pts: d3.range(0, 361, 3).map(ra => [ra, dec]) })),
    ...d3.range(0, 360, 30).map(ra => ({ k: 'm' + ra, pts: d3.range(-90, 91, 3).map(dec => [ra, Math.max(-89.9, Math.min(89.9, dec))]) })),
  ]
  const OUTLINE = d3.line()(outlineAt(1)) + 'Z'
  svgB.select('.ss-outline').attr('d', OUTLINE)
  svgB.select('.ss-grat').selectAll('path').data(GRAT.filter(g => !g.eq)).join('path').attr('d', g => lineOn(g.pts.map(([ra, d]) => [clampRA(ra), d])))
  const capPts = cap(PATCH.ra, PATCH.dec, PATCH.r)

  function drawMorph () {
    const t = morphT
    svgA.select('.ss-outline').attr('d', d3.line()(outlineAt(t)) + 'Z')
      .style('fill', t < 1 ? 'url(#ss-sphere)' : null)
    // the far side of the sphere shows as it opens out
    const farOpacity = Math.max(0, Math.min(1, (t - 0.12) / 0.5))
    const lines = GRAT.filter(g => !g.eq).map(g => ({ k: g.k, ...morphLine(g.pts.map(([ra, d]) => [clampRA(ra), d]), t) }))
    const gl = svgA.select('.ss-grat').selectAll('g.gl').data(lines, d => d.k).join(e => { const g = e.append('g').attr('class', 'gl'); g.append('path').attr('class', 'near'); g.append('path').attr('class', 'far'); return g })
    gl.select('.near').attr('d', d => d.near)
    gl.select('.far').attr('d', d => d.far).style('opacity', farOpacity)
    // the celestial equator: a parallel like the others, drawn brighter once the cards name it
    const eq = morphLine(d3.range(0, 361, 3).map(ra => [clampRA(ra), 0]), t)
    svgA.select('.ss-eq').attr('d', eq.near + ' ' + (farOpacity > 0.5 ? eq.far : ''))
    // the photographed patch: on the near side throughout, so it needs no splitting
    const c = capPts.map(([ra, dec]) => { const p = morphPoint(ra, dec, t); return [p.x, p.y] })
    svgA.select('.ss-cap').selectAll('path').data([0]).join('path').attr('d', d3.line()(c) + 'Z')
  }

  // --- the ecliptic and the celestial equator on B (A's equator morphs above)
  const ECL = lineOn(d3.range(0, 361, 2).map(l => eclipticPoint(l)))
  svgA.select('.ss-ecl').attr('d', ECL)
  svgB.select('.ss-ecl').attr('d', ECL)
  svgB.select('.ss-eq').attr('d', lineOn(d3.range(0, 361, 3).map(ra => [clampRA(ra), 0])))

  // --- the Milky Way: a band 15 degrees either side of the galactic plane, on both maps
  const band = (() => {
    const up = d3.range(0, 361, 2).map(l => galacticPoint(l, 15)), lo = d3.range(0, 361, 2).map(l => galacticPoint(l, -15))
    const split = arr => { const segs = []; let cur = [], prev = null; for (const [ra, dec] of arr) { if (prev !== null && Math.abs(ra - prev) > 180) { segs.push(cur); cur = [] } cur.push(P(ra, dec)); prev = ra } segs.push(cur); return segs.filter(s => s.length > 1) }
    const a = split(up), b = split(lo)
    return d3.range(Math.min(a.length, b.length)).map(i => d3.line()(a[i].concat(b[i].slice().reverse())) + 'Z').join(' ')
  })()
  for (const svg of [svgA, svgB]) {
    const g = svg.select('.ss-gal')
    g.append('path').attr('class', 'ss-galband').attr('d', band)
    g.append('path').attr('class', 'ss-galplane').attr('d', lineOn(d3.range(0, 361, 2).map(l => galacticPoint(l, 0))))
  }

  // --- the surveys on B, shaded by the faintest magnitude their photos reach, shallowest painted first so the
  // deepest wins where they overlap. Visible light only (the infrared all-sky surveys are not drawn), and only the
  // surveys whose published area we could confirm (surveys.json, footprint_area_verified).
  const ring = (s, ra0, ra1) => {
    const [d0, d1] = footprintDec(s), lo = Math.max(-88, d0), hi = Math.min(88, d1), r = []
    for (let ra = ra0; ra <= ra1; ra += 1.5) r.push(P(ra, lo))
    for (let d = lo; d <= hi; d += 1.5) r.push(P(ra1, d))
    for (let ra = ra1; ra >= ra0; ra -= 1.5) r.push(P(ra, hi))
    for (let d = hi; d >= lo; d -= 1.5) r.push(P(ra0, d))
    return d3.line()(r) + 'Z'
  }
  const drawn = surveys.filter(s => s.wavelength === 'optical' && s.depth_mag != null && s.ra_ranges && footprintDec(s) && s.footprint_area_verified !== false)
  const patches = drawn.filter(s => !s.future).sort((a, b) => a.depth_mag - b.depth_mag)
    .flatMap(s => s.ra_ranges.map(([a, b], i) => ({ s, i, d: ring(s, a, b) })))
  svgB.select('.ss-fp').selectAll('path').data(patches, p => p.s.id + p.i).join('path')
    .attr('class', 'ss-fpath').attr('d', p => p.d).attr('fill', p => magColour(p.s.depth_mag))
    .attr('tabindex', -1).attr('role', 'button').attr('aria-label', p => `${p.s.short || p.s.name}: details`)
    .on('click', (e, p) => onPick?.(p.s, e))
    .on('keydown', (e, p) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick?.(p.s, e) } })
  if (rubinSurvey) {
    svgB.select('.ss-rubin').selectAll('path').data(rubinSurvey.ra_ranges.map(([a, b]) => ring(rubinSurvey, a, b))).join('path')
      .attr('class', 'ss-rubinpath').attr('d', d => d)
  }

  // --- the path. On A: the thin variants, the nominal in Planet Nine's colour, and under it, once the cards reach
  // magnitude, a wider stroke shaded by the magnitude the planet would have at each point. On B: the verdict.
  const segs = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    if (Math.abs(a.ra_deg - b.ra_deg) > 180) continue
    segs.push({ i, d: d3.line()([a.xy, b.xy]) })
  }
  const trackA = svgA.select('.ss-track')
  trackA.selectAll('path.ss-var').data(variants).join('path').attr('class', 'ss-var').attr('d', v => lineOn(v.points.map(p => [p.ra_deg, p.dec_deg])))
  trackA.append('g').attr('class', 'ss-mag').selectAll('path').data(segs).join('path').attr('d', s => s.d)
  trackA.append('path').attr('class', 'ss-core-edge').attr('d', lineOn(pts.map(p => [p.ra_deg, p.dec_deg])))
  trackA.append('path').attr('class', 'ss-core').attr('d', lineOn(pts.map(p => [p.ra_deg, p.dec_deg])))
  const vB = svgB.select('.ss-verdict')
  vB.append('path').attr('class', 'ss-under').attr('d', lineOn(pts.map(p => [p.ra_deg, p.dec_deg])))
  vB.append('g').attr('class', 'ss-vsegs').selectAll('path').data(segs).join('path').attr('d', s => s.d)
  vB.append('g').attr('class', 'ss-rsegs').selectAll('path').data(segs).join('path').attr('d', s => s.d)

  // the stretches crossing the Milky Way, on both maps, and their label
  const buriedRuns = []
  { let run = []; for (const p of pts) { if (Math.abs(galacticLatitude(p.ra_deg, p.dec_deg)) <= 15) run.push(p); else if (run.length) { buriedRuns.push(run); run = [] } } if (run.length) buriedRuns.push(run) }
  for (const svg of [svgA, svgB]) {
    svg.select('.ss-gal').selectAll('path.ss-buried').data(buriedRuns).join('path').attr('class', 'ss-buried')
      .attr('d', run => lineOn(run.map(p => [p.ra_deg, p.dec_deg])))
  }

  // what the planet being tested would look like at each point, and the verdict there
  const verdictAt = (p, V, future = false) => {
    const d = deepestAt(surveys, p.ra_deg, p.dec_deg, { includeFuture: future })
    return d === null ? 'none' : d >= V ? 'deep' : 'shallow'
  }
  const rubinAt = (p, V) => rubinSurvey && rubinSurvey.depth_mag >= V && deepestAt([rubinSurvey], p.ra_deg, p.dec_deg, { includeFuture: true }) !== null
  let V = [], verdict = []
  function evaluate () {
    const m = planets[planetKey].magnitude
    V = pts.map(p => m(p.r_au))
    verdict = pts.map((p, i) => verdictAt(p, V[i]))
  }

  // --- labels on the maps
  const [eRa, eDec] = eclipticPoint(150)
  const [gRa, gDec] = galacticPoint(150, 0)
  const NOTES = {
    north: { at: [CX, OY + 34], text: 'north', when: s => s.axes },
    south: { at: [CX, OY + OH - 22], text: 'south', when: s => s.axes },
    around: { at: [CX, CY + 92], text: '← position around the sky →', when: s => s.axes, cls: 'is-dim' },
    eq: { at: P(118, 0), dy: -12, text: 'celestial equator', when: s => s.eq >= 1 && !s.ecl },
    ecl: { at: P(eRa, eDec), dy: 30, text: 'ecliptic', when: s => s.ecl >= 1 && !s.track },
    mw: { at: P(gRa, gDec), dy: -16, text: 'Milky Way', when: s => s.gal, cls: 'is-milky' },
  }
  const NOTES_B = {
    mw: NOTES.mw,
    rubin: { at: P(30, -48), text: 'Rubin', when: s => s.rubin, cls: 'is-rubin' },
  }
  function notes (svg, set) {
    const list = Object.entries(set).map(([k, n]) => ({ k, ...n }))
    svg.select('.ss-notes').selectAll('text').data(list, d => d.k).join('text')
      .attr('class', d => `ss-label ${d.cls || ''}`).attr('x', d => d.at[0]).attr('y', d => d.at[1] + (d.dy || 0))
      .text(d => d.text)
      .transition('show').duration(T()).style('opacity', d => d.when(scene) ? 1 : 0)
  }

  // --- applying a scene: every layer eased to its opacity for the step
  const fade = (sel, o, name = 'show') => sel.transition(name).duration(T()).style('opacity', o)
  function apply () {
    const s = scene
    root.classList.toggle('is-pair', !!s.pair)
    root.classList.toggle('is-solo', !!s.solo)
    root.classList.toggle('is-mag', !!s.mag)
    // once the path is shaded by magnitude, the other orbits step back so the shading reads
    fade(svgA.selectAll('.ss-var'), s.mag ? 0.25 : 1, 'var')
    fade(svgA.select('.ss-cap'), s.cap)
    fade(svgA.select('.ss-eq'), s.eq); fade(svgB.select('.ss-eq'), s.eq)
    fade(svgA.select('.ss-ecl'), s.ecl); fade(svgB.select('.ss-ecl'), s.ecl * (s.pair ? 1 : 0))
    fade(svgA.select('.ss-track'), s.track)
    fade(svgA.select('.ss-mag'), s.mag)
    fade(svgB.select('.ss-fp'), s.fp)
    svgB.selectAll('.ss-fpath').attr('tabindex', s.rubin ? 0 : -1).style('pointer-events', s.fp ? null : 'none')
    fade(svgB.select('.ss-verdict'), s.verdict)
    fade(svgB.select('.ss-rsegs'), s.rubin, 'rubinsegs')
    fade(svgA.select('.ss-gal'), s.gal); fade(svgB.select('.ss-gal'), s.gal)
    fade(svgB.select('.ss-rubin'), s.rubin)
    notes(svgA, NOTES); notes(svgB, NOTES_B)
    root.classList.toggle('can-hover', !!s.mag)
  }
  // the colours that follow the planet being tested, eased when it changes
  function colour (dur) {
    svgA.select('.ss-mag').selectAll('path').transition('colour').duration(dur).attr('stroke', s => magColour(V[s.i]))
    svgB.select('.ss-vsegs').selectAll('path').transition('colour').duration(dur)
      .attr('stroke', s => VERDICT[verdict[s.i]])
      .attr('stroke-dasharray', s => verdict[s.i] === 'none' ? '4 6' : null)
    svgB.select('.ss-rsegs').selectAll('path').transition('colour').duration(dur)
      .style('opacity', s => rubinAt(pts[s.i], V[s.i]) ? 1 : 0)
  }

  // --- pointing at the path, on either map, marks the same point on both and reads out the comparison there
  const read = root.querySelector('.ss-read')
  const fmt = v => v.toFixed(1)
  function mark (i) {
    for (const svg of [svgA, svgB]) {
      svg.select('.ss-hover').selectAll('circle').data(i == null ? [] : [pts[i]]).join('circle')
        .attr('class', 'ss-mark').attr('r', 11).attr('cx', p => p.xy[0]).attr('cy', p => p.xy[1])
    }
    if (!read) return
    if (i == null) { read.innerHTML = ''; return }
    const d = deepestAt(surveys, pts[i].ra_deg, pts[i].dec_deg)
    const v = verdict[i]
    read.innerHTML = `<span>Planet Nine here <b>${fmt(V[i])}</b></span><span>Photos reach <b>${d == null ? '—' : fmt(d)}</b></span>` +
      (scene.verdict ? `<span class="is-${v}">${v === 'deep' ? 'Deep enough' : v === 'shallow' ? 'Too shallow' : 'No photos'}</span>` : '')
  }
  for (const svg of [svgA, svgB]) {
    svg.on('pointermove', e => {
      if (!scene.mag) return
      const m = svg.node().getScreenCTM(); if (!m) return
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
      let best = null, bd = 46 * 46
      pts.forEach((p, i) => { const dx = p.xy[0] - pt.x, dy = p.xy[1] - pt.y, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i } })
      mark(best)
    }).on('pointerleave', () => mark(null))
  }

  evaluate(); colour(0); drawMorph(); apply()

  return {
    step (name) {
      if (!SCENES[name] || name === sceneName) return
      sceneName = name; scene = SCENES[name]
      apply()
      if (!scene.mag) mark(null)
    },
    morph (t) {
      t = Math.max(0, Math.min(1, t))
      if (Math.abs(t - morphT) < 0.002 && t !== 0 && t !== 1) return
      morphT = t; drawMorph()
    },
    planet (key) {
      if (!planets[key] || key === planetKey) return
      planetKey = key; evaluate(); colour(T())
      if (read && read.innerHTML) read.innerHTML = ''
    },
    survey (id) {
      active = id
      svgB.selectAll('.ss-fpath').classed('is-active', p => p.s.id === active)
    },
    verdicts: () => verdict.slice(),
  }
}
