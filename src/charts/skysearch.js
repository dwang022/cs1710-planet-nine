// The photographed sky (search/how.html, #sky): how astronomers search for Planet Nine, and where it could still
// be hiding, told on one pinned picture (rebuilt 2026-11-20, asked for: two maps side by side, nine cards and a
// planet switch were too dense).
//
//   1. From Earth to the sky  an observatory on Earth photographing one patch of the sky, beside the sky as a
//      sphere with the same patch on it (both pulse together, so the eye links them); the sphere unrolls into the
//      oval map (scroll-driven) and the line the Sun and planets follow appears, in the Sun's gold.
//   2. The path  the oval alone, with Planet Nine's predicted path and the other orbits the fit allows.
//   3. How faint  the oval moves left and a magnitude panel fades in beside it: a ruler of brightness with the
//      planet's range from its closest point to its farthest, the planet riding its path with a ring on the bar.
//   4. Search deeper  the surveys on the map, shaded by the faintest magnitude their photos reach, the two
//      searches of them as lines on the ruler, and a line the reader drags; the path marked seen, maybe or missed,
//      the bar gaining a tail out to the faintest planet the fit allows. (The shading had its own step for an hour
//      on 2026-11-20 and was folded back, asked for.)
//   5. What is left  Rubin's area (its published limits: south of a declination, plus the North Ecliptic Spur),
//      Rubin's line on the ruler, and the Milky Way. Pointing at the path marks that spot on the ruler.
//
// What is measured and what is assumed (data/README.md, surveys.json, planet_nine_predictions.json):
//   - the path is one orbit, the 2021 fit (p9_sky_track.json); the thin lines are its 1-sigma variants;
//   - the planet's magnitude at each point follows the brightness model the search papers use (brightnessModel in
//     charts/placeplanet.js) for the fit's mass and the reflectivity the reader picks;
//   - survey outlines are schematic bands sized to each survey's published area (Rubin's follows its published
//     limits instead, skymap.js footprintTop), and depths are single-photo limits, so the verdicts on the path are
//     a sketch: no percentage is computed from them.
//
// Every layer is kept in the DOM and eased in or out per step (named D3 transitions, so a fast scroll retargets
// rather than stacks), so scrolling back replays the story in reverse. Readers who ask for less motion get the
// same states without the easing, and the sphere jumps straight to the oval.

import * as d3 from 'd3'
import { mollweideIn, footprintDec, footprintTop, deepestAt, galacticPoint, galacticLatitude, eclipticPoint, OBLIQUITY_DEG, skyMagColour, SKY_MAG_DOMAIN, SKY_COVER_OPACITY } from './skymap.js'
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

// The scale that shades each survey by the faintest magnitude its photos reach (skymap.js, shared with the game).
// Lighter is a bigger number, that is, fainter.
export const MAG_DOMAIN = SKY_MAG_DOMAIN
export const magColour = skyMagColour
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
  patch: { cap: 1, axes: 0, ecl: 0, track: 0, mag: 0, fp: 0, verdict: 0, gal: 0, rubin: 0 },
  path: { solo: 1, cap: 0, axes: 0, ecl: 1, track: 1, mag: 0, fp: 0, verdict: 0, gal: 0, rubin: 0 },
  faint: { pair: 1, cap: 0, axes: 0, ecl: 0.7, track: 1, mag: 1, ride: 1, fp: 0, verdict: 0, gal: 0, rubin: 0 },
  deep: { pair: 1, cap: 0, axes: 0, ecl: 0.7, track: 1, mag: 1, fp: SKY_COVER_OPACITY, verdict: 1, slide: 1, gal: 0, rubin: 0 },
  left: { pair: 1, cap: 0, axes: 0, ecl: 0.7, track: 1, mag: 1, fp: SKY_COVER_OPACITY, verdict: 1, slide: 1, gal: 1, rubin: 1 },
}
export const STEPS = Object.keys(SCENES)

/**
 * Draws the story into `root` (an element holding .ss-earth, .ss-a and .ss-b panels, each with an <svg>).
 *   surveys     surveys.json's list
 *   track       p9_sky_track.json
 *   planets     { fit, faint }: the best fit and the smallest, darkest planet the fit allows, each
 *               { label, magnitude(r_au), hidden(limit) } (hidden: the share of its orbit, by time, spent fainter)
 *   limitV      the magnitude at which the searches so far catch half the planets: where the slider starts
 *   stops       [{ name, mag, cls }], the real searches marked on the ruler
 * Returns { step(name), morph(t), survey(id) }.
 */
export function drawSkySearch (root, { surveys, track, planets, limitV, stops = [], onPick }) {
  const svgA = d3.select(root).select('.ss-a svg'), svgB = d3.select(root).select('.ss-b svg')
  const svgE = d3.select(root).select('.ss-earth svg')
  for (const s of [svgA, svgB, svgE]) s.attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet')

  const nom = track.tracks.find(t => t.label === 'nominal')
  const variants = track.tracks.filter(t => t.label !== 'nominal')
  const pts = nom.points.map(p => ({ ...p, xy: P(p.ra_deg, p.dec_deg) }))
  const rubinSurvey = surveys.find(s => s.future)
  let scene = SCENES.patch, sceneName = 'patch', morphT = 0, active = null

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
    svgE.html(`
      <!-- Earth's drawing fills 80% of its box (art.js, R = 40 of 50), so the box is scaled up to make ER its radius -->
      <defs><clipPath id="ss-earth-clip"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>
      <g clip-path="url(#ss-earth-clip)">
        <circle class="ss-sky-circle" cx="${E[0]}" cy="${E[1]}" r="${SKY}"/>
        <path class="ss-beam" d="M${lens[0]},${lens[1]} L${p1[0]},${p1[1]} A${SKY},${SKY} 0 0 1 ${p2[0]},${p2[1]} Z"/>
        <path class="ss-patch-arc ss-pulse" d="${arc(SKY, p1, p2)}"/>
        <use href="#art-earth" x="${E[0] - ER / 0.8}" y="${E[1] - ER / 0.8}" width="${2 * ER / 0.8}" height="${2 * ER / 0.8}"/>
        <use href="#art-observatory" x="${ox}" y="${oy}" width="${ow}" height="${oh}"/>
        <text class="ss-note is-strong" x="${p2[0] + 16}" y="${p2[1] + 12}">one patch</text>
        <text class="ss-note" x="40" y="${E[1] - SKY * 0.91}" text-anchor="start">the sky around Earth</text>
      </g>`)
  }

  // --- the map: the sphere that unrolls into the oval, and every layer drawn on it
  {
    const svg = svgA
    svg.html('')
    const defs = svg.append('defs')
    defs.append('clipPath').attr('id', 'ss-clip-a').append('path').attr('d', d3.line()(outlineAt(1)) + 'Z')
    const g = defs.append('radialGradient').attr('id', 'ss-sphere').attr('cx', '38%').attr('cy', '34%').attr('r', '70%')
    g.append('stop').attr('offset', 0).attr('stop-color', '#262a36')
    g.append('stop').attr('offset', 1).attr('stop-color', '#0c0c0e')
    svg.append('path').attr('class', 'ss-outline')
    svg.append('g').attr('class', 'ss-grat')
    const clip = svg.append('g').attr('class', 'ss-layers').attr('clip-path', 'url(#ss-clip-a)')
    clip.append('g').attr('class', 'ss-gal')
    clip.append('g').attr('class', 'ss-fp')
    clip.append('g').attr('class', 'ss-rubin')
    svg.append('path').attr('class', 'ss-ecl')
    svg.append('g').attr('class', 'ss-cap')
    clip.append('g').attr('class', 'ss-track')
    clip.append('g').attr('class', 'ss-verdict')
    svg.append('g').attr('class', 'ss-notes')
    svg.append('g').attr('class', 'ss-hover')
    svg.append('use').attr('class', 'ss-rider').attr('href', '#art-planet-nine').attr('width', 52).attr('height', 52).style('opacity', 0)
  }

  // --- the graticule, redrawn as the sphere unrolls
  const GRAT = [
    ...d3.range(-60, 90, 30).map(dec => ({ k: 'p' + dec, pts: d3.range(0, 361, 3).map(ra => [ra, dec]) })),
    ...d3.range(0, 360, 30).map(ra => ({ k: 'm' + ra, pts: d3.range(-90, 91, 3).map(dec => [ra, Math.max(-89.9, Math.min(89.9, dec))]) })),
  ]
  const capPts = cap(PATCH.ra, PATCH.dec, PATCH.r)
  const capMid = () => { const p = morphPoint(PATCH.ra, PATCH.dec - PATCH.r, morphT); return [p.x, p.y] }

  function drawMorph () {
    const t = morphT
    svgA.select('.ss-outline').attr('d', d3.line()(outlineAt(t)) + 'Z')
      .style('fill', t < 1 ? 'url(#ss-sphere)' : null)
    // the far side of the sphere shows as it opens out
    const farOpacity = Math.max(0, Math.min(1, (t - 0.12) / 0.5))
    const lines = GRAT.map(g => ({ k: g.k, ...morphLine(g.pts.map(([ra, d]) => [clampRA(ra), d]), t) }))
    const gl = svgA.select('.ss-grat').selectAll('g.gl').data(lines, d => d.k).join(e => { const g = e.append('g').attr('class', 'gl'); g.append('path').attr('class', 'near'); g.append('path').attr('class', 'far'); return g })
    gl.select('.near').attr('d', d => d.near)
    gl.select('.far').attr('d', d => d.far).style('opacity', farOpacity)
    // the photographed patch: on the near side throughout, so it needs no splitting; its name rides under it
    const c = capPts.map(([ra, dec]) => { const p = morphPoint(ra, dec, t); return [p.x, p.y] })
    svgA.select('.ss-cap').selectAll('path').data([0]).join('path').attr('class', 'ss-pulse').attr('d', d3.line()(c) + 'Z')
    const [mx, my] = capMid()
    svgA.select('.ss-cap').selectAll('text').data([0]).join('text').attr('class', 'ss-cap-lbl')
      .attr('x', mx).attr('y', my + 34).text('the same patch').style('opacity', Math.max(0, 1 - 2.5 * t))
  }

  // --- the line the Sun and planets follow (the ecliptic)
  const ECL = lineOn(d3.range(0, 361, 2).map(l => eclipticPoint(l)))
  svgA.select('.ss-ecl').attr('d', ECL)

  // --- the Milky Way: a band 15 degrees either side of the galactic plane
  const band = (() => {
    const up = d3.range(0, 361, 2).map(l => galacticPoint(l, 15)), lo = d3.range(0, 361, 2).map(l => galacticPoint(l, -15))
    const split = arr => { const segs = []; let cur = [], prev = null; for (const [ra, dec] of arr) { if (prev !== null && Math.abs(ra - prev) > 180) { segs.push(cur); cur = [] } cur.push(P(ra, dec)); prev = ra } segs.push(cur); return segs.filter(s => s.length > 1) }
    const a = split(up), b = split(lo)
    return d3.range(Math.min(a.length, b.length)).map(i => d3.line()(a[i].concat(b[i].slice().reverse())) + 'Z').join(' ')
  })()
  {
    const g = svgA.select('.ss-gal')
    g.append('path').attr('class', 'ss-galband').attr('d', band)
    g.append('path').attr('class', 'ss-galplane').attr('d', lineOn(d3.range(0, 361, 2).map(l => galacticPoint(l, 0))))
  }

  // --- the surveys, shaded by the faintest magnitude their photos reach, shallowest painted first so the
  // deepest wins where they overlap. Visible light only (the infrared all-sky surveys are not drawn), and only the
  // surveys whose published area we could confirm (surveys.json, footprint_area_verified).
  const ring = (s, ra0, ra1) => {
    const lo = Math.max(-88, footprintDec(s)[0]), top = ra => Math.min(88, footprintTop(s, ra)), r = []
    for (let ra = ra0; ra <= ra1; ra += 1.5) r.push(P(ra, lo))
    for (let d = lo; d <= top(ra1); d += 1.5) r.push(P(ra1, d))
    for (let ra = ra1; ra >= ra0; ra -= 1.5) r.push(P(ra, top(ra)))
    for (let d = top(ra0); d >= lo; d -= 1.5) r.push(P(ra0, d))
    return d3.line()(r) + 'Z'
  }
  const drawn = surveys.filter(s => s.wavelength === 'optical' && s.depth_mag != null && s.ra_ranges && footprintDec(s) && s.footprint_area_verified !== false)
  const patches = drawn.filter(s => !s.future).sort((a, b) => a.depth_mag - b.depth_mag)
    .flatMap(s => s.ra_ranges.map(([a, b], i) => ({ s, i, d: ring(s, a, b) })))
  svgA.select('.ss-fp').selectAll('path.ss-fpath').data(patches, p => p.s.id + p.i).join('path')
    .attr('class', 'ss-fpath').attr('d', p => p.d).attr('fill', p => magColour(p.s.depth_mag))
    .attr('tabindex', -1).attr('role', 'button').attr('aria-label', p => `${p.s.short || p.s.name}: details`)
    .on('click', (e, p) => onPick?.(p.s, e))
    .on('keydown', (e, p) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick?.(p.s, e) } })
  // the survey the reader picked, outlined over everything else (its area, whatever is painted on top of it)
  svgA.select('.ss-fp').append('path').attr('class', 'ss-pick')
  if (rubinSurvey) {
    svgA.select('.ss-rubin').selectAll('path').data(rubinSurvey.ra_ranges.map(([a, b]) => ring(rubinSurvey, a, b))).join('path')
      .attr('class', 'ss-rubinpath').attr('d', d => d)
  }

  // --- the path: the thin variants, the nominal in Planet Nine's colour, and over it, once the surveys are on,
  // the verdict (deep enough or too shallow) and the stretches Rubin could catch
  const segs = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    if (Math.abs(a.ra_deg - b.ra_deg) > 180) continue
    segs.push({ i, d: d3.line()([a.xy, b.xy]) })
  }
  const NOM = lineOn(pts.map(p => [p.ra_deg, p.dec_deg]))
  const trackA = svgA.select('.ss-track')
  trackA.selectAll('path.ss-var').data(variants).join('path').attr('class', 'ss-var').attr('d', v => lineOn(v.points.map(p => [p.ra_deg, p.dec_deg])))
  trackA.append('path').attr('class', 'ss-core-edge').attr('d', NOM)
  trackA.append('path').attr('class', 'ss-core').attr('d', NOM)
  const vA = svgA.select('.ss-verdict')
  vA.append('path').attr('class', 'ss-under').attr('d', NOM)
  vA.append('g').attr('class', 'ss-vsegs').selectAll('path').data(segs).join('path').attr('d', s => s.d)
  vA.append('g').attr('class', 'ss-rsegs').selectAll('path').data(segs).join('path').attr('d', s => s.d)

  // the stretches crossing the Milky Way
  const buriedRuns = []
  { let run = []; for (const p of pts) { if (Math.abs(galacticLatitude(p.ra_deg, p.dec_deg)) <= 15) run.push(p); else if (run.length) { buriedRuns.push(run); run = [] } } if (run.length) buriedRuns.push(run) }
  svgA.select('.ss-gal').selectAll('path.ss-buried').data(buriedRuns).join('path').attr('class', 'ss-buried')
    .attr('d', run => lineOn(run.map(p => [p.ra_deg, p.dec_deg])))

  // --- how faint the planet would be at each point, for the best fit and for the smallest, darkest planet the fit
  // allows, and the verdict there against the depth the reader searches to (the slider on the ruler, starting at
  // the magnitude where the searches so far catch half the planets): seen either way, missed only if the planet
  // is the small, dark one, or missed either way. On the last step Rubin's limit counts inside Rubin's area.
  // (Until 2026-11-20 the verdict compared the planet with the deepest photo of each spot, which marked nearly the
  // whole path "deep enough": a photo that could show the planet is not a search that would have found it.)
  const KEYS = ['fit', 'faint']
  const Vof = { fit: pts.map(p => planets.fit.magnitude(p.r_au)), faint: pts.map(p => planets.faint.magnitude(p.r_au)) }
  const inRubin = pts.map(p => !!rubinSurvey && deepestAt([rubinSurvey], p.ra_deg, p.dec_deg, { includeFuture: true }) !== null)
  let L = limitV ?? 21.5
  const limitAt = i => scene.rubin && inRubin[i] ? Math.max(L, rubinSurvey.depth_mag) : L
  const verdictOf = i => { const l = limitAt(i); return Vof.faint[i] <= l ? 'deep' : Vof.fit[i] <= l ? 'maybe' : 'shallow' }
  const VCOL = { deep: '#ffffff', maybe: '#ffc7ad', shallow: 'var(--series-2)' }

  // --- the magnitude panel (right): a ruler of brightness, brighter to the left. On it the two planets' ranges,
  // each from its closest point to the Sun to its farthest; the real searches as named stops; and, from the step
  // that brings the surveys, a handle the reader drags to search deeper (arrow keys too), with what that depth
  // would still miss written under the ruler.
  const rExt = d3.extent(pts, p => p.r_au)
  const M0 = 17, M1 = 26.5, LMIN = 19, LMAX = 26
  const mx = d3.scaleLinear([M0, M1], [70, W - 70])
  const AXY = 352, BH = 24, ROW = { fit: 250 }
  const svgR = svgB
  svgR.html('')
  {
    const ax = svgR.append('g').attr('class', 'sm-axis')
    ax.append('line').attr('x1', mx(M0)).attr('x2', mx(M1)).attr('y1', AXY).attr('y2', AXY)
    ax.selectAll('g').data(d3.range(M0, M1 + 0.01, 1)).join('g').attr('transform', m => `translate(${mx(m)},${AXY})`)
      .call(g => g.append('line').attr('y2', 9)).call(g => g.append('text').attr('y', 36).text(m => m))
    svgR.append('text').attr('class', 'sm-end').attr('x', mx(M0)).attr('y', AXY + 70).text('← brighter')
    svgR.append('text').attr('class', 'sm-end').attr('x', mx(M1)).attr('y', AXY + 70).attr('text-anchor', 'end').text('fainter →')
    svgR.append('text').attr('class', 'sm-end').attr('x', (mx(M0) + mx(M1)) / 2).attr('y', AXY + 70).attr('text-anchor', 'middle').text('magnitude')
    // the real searches: a faint line through the ruler, its name above (staggered so neighbours never collide)
    const gs = svgR.append('g').attr('class', 'sm-stops')
    stops.forEach((st, k) => {
      const g = gs.append('g').attr('class', `sm-stop ${st.cls || ''}`).attr('transform', `translate(${mx(st.mag)},0)`)
        .attr('role', 'button').attr('tabindex', -1).attr('aria-label', `Search to magnitude ${st.mag}, ${st.name}`)
        .on('click', () => setLimit(st.mag))
        .on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLimit(st.mag) } })
      const y = k % 2 ? 122 : 88
      g.append('line').attr('y1', y + 10).attr('y2', AXY)
      g.append('rect').attr('x', -70).attr('y', y - 26).attr('width', 140).attr('height', 34).attr('fill', 'transparent')
      g.append('text').attr('y', y).text(st.name)
    })
    // one planet, one bar (2026-11-20, asked for: two bars read as two planets): the best fit from its closest point
    // to its farthest, and from the surveys' step on a tail fading out to the faintest planet the fit allows
    const fa = planets.fit.magnitude(rExt[0]), fb = planets.fit.magnitude(rExt[1]), tb = planets.faint.magnitude(rExt[1])
    {
      const y = ROW.fit
      svgR.append('defs').append('linearGradient').attr('id', 'sm-tail-g')
        .selectAll('stop').data([[0, 0.65], [1, 0.16]]).join('stop').attr('offset', d => d[0]).attr('stop-opacity', d => d[1])
      svgR.append('rect').attr('class', 'sm-tail').attr('y', y).attr('height', BH).attr('rx', BH / 2)
        .attr('x', mx(fb) - BH / 2).attr('width', mx(tb) - mx(fb) + BH).attr('fill', 'url(#sm-tail-g)')
      svgR.append('text').attr('class', 'sm-name sm-tail-lbl').attr('x', (mx(fb) + mx(tb)) / 2).attr('y', y + BH + 30)
        .attr('text-anchor', 'middle').text('or fainter')
      svgR.append('rect').attr('class', 'sm-band is-fit').attr('y', y).attr('height', BH).attr('rx', BH / 2)
        .attr('x', mx(fa) - BH / 2).attr('width', mx(fb) - mx(fa) + BH)
      svgR.append('line').attr('class', 'sm-whisk').attr('y1', y + BH / 2).attr('y2', y + BH / 2).style('opacity', 0)
      svgR.append('circle').attr('class', 'sm-here is-fit').attr('cy', y + BH / 2).attr('r', 16).style('opacity', 0)
    }
    svgR.append('text').attr('class', 'sm-where').attr('x', mx(fa) + 30).attr('y', ROW.fit - 12).attr('text-anchor', 'end')
      .html(`closest <tspan class="sm-au">${Math.round(rExt[0])} AU</tspan>`)
    svgR.append('text').attr('class', 'sm-where').attr('x', mx(fb) - 30).attr('y', ROW.fit - 12)
      .html(`farthest <tspan class="sm-au">${Math.round(rExt[1])} AU</tspan>`)
    // the handle
    const h = svgR.append('g').attr('class', 'sm-handle').attr('role', 'slider').attr('tabindex', -1)
      .attr('aria-label', 'How faint the search reaches, in magnitudes').attr('aria-valuemin', LMIN).attr('aria-valuemax', LMAX)
    h.append('line').attr('y1', 160).attr('y2', AXY + 10)
    h.append('rect').attr('class', 'sm-grab').attr('x', -30).attr('y', 150).attr('width', 60).attr('height', AXY - 140).attr('fill', 'transparent')
    h.append('circle').attr('cy', AXY).attr('r', 13)
    h.append('path').attr('class', 'sm-grip').attr('d', `M-5,${AXY - 4} L-9,${AXY} L-5,${AXY + 4} M5,${AXY - 4} L9,${AXY} L5,${AXY + 4}`)
    const toMag = e => {
      const m = svgR.node().getScreenCTM(); if (!m) return L
      return mx.invert(new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()).x)
    }
    h.on('pointerdown', e => { e.preventDefault(); h.node().setPointerCapture(e.pointerId); h.classed('is-drag', true); root.classList.add('was-slid') })
      .on('pointermove', e => { if (h.classed('is-drag')) setLimit(toMag(e)) })
      .on('pointerup pointercancel', () => h.classed('is-drag', false))
      .on('keydown', e => {
        const d = { ArrowRight: 0.1, ArrowUp: 0.1, ArrowLeft: -0.1, ArrowDown: -0.1, PageUp: 1, PageDown: -1 }[e.key]
        if (d === undefined) return
        e.preventDefault(); root.classList.add('was-slid'); setLimit(L + d)
      })
    svgR.append('text').attr('class', 'sm-read').attr('x', W / 2).attr('y', AXY + 122)
    svgR.append('text').attr('class', 'sm-read is-2').attr('x', W / 2).attr('y', AXY + 156)
  }
  const fmt = v => v.toFixed(1), pct = f => `${Math.round(100 * f)}%`
  function setLimit (v) {
    v = Math.round(Math.max(LMIN, Math.min(LMAX, v)) * 10) / 10
    if (v === L) return
    L = v; colour(0); readout()
  }

  // --- labels on the map
  const [gRa, gDec] = galacticPoint(150, 0)
  const NOTES = {
    north: { at: [CX, OY + 34], text: 'north', when: s => s.axes },
    south: { at: [CX, OY + OH - 22], text: 'south', when: s => s.axes },
    ecl: { at: [CX, CY + 118], text: 'the Sun and planets move along the dotted line', when: s => s.solo, cls: 'is-sun' },
    mw: { at: P(gRa, gDec), dy: -16, text: 'Milky Way', when: s => s.gal, cls: 'is-milky' },
    rubin: { at: P(30, -48), text: 'Rubin', when: s => s.rubin, cls: 'is-rubin' },
  }
  function notes () {
    const list = Object.entries(NOTES).map(([k, n]) => ({ k, ...n }))
    svgA.select('.ss-notes').selectAll('text').data(list, d => d.k).join('text')
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
    root.classList.toggle('is-slide', !!s.slide)
    root.classList.toggle('is-rubin', !!s.rubin)
    root.classList.toggle('can-hover', !!s.mag)
    fade(svgA.select('.ss-cap'), s.cap)
    fade(svgA.select('.ss-ecl'), s.ecl)
    fade(svgA.select('.ss-track'), s.track)
    fade(svgA.select('.ss-fp'), s.fp)
    svgA.selectAll('.ss-fpath').attr('tabindex', s.fp ? 0 : -1).style('pointer-events', s.fp ? null : 'none')
    fade(svgA.select('.ss-verdict'), s.verdict)
    fade(svgA.select('.ss-rsegs'), s.rubin, 'rubinsegs')
    fade(svgA.select('.ss-gal'), s.gal)
    fade(svgA.select('.ss-rubin'), s.rubin)
    svgR.select('.sm-handle').attr('tabindex', s.slide ? 0 : -1)
    svgR.selectAll('.sm-stop').attr('tabindex', function () { return s.slide && (s.rubin || !this.classList.contains('is-rubin')) ? 0 : -1 })
    notes(); colour(T()); readout(); ride()
  }
  // the marks that follow the depth searched to
  function colour (dur) {
    svgA.select('.ss-vsegs').selectAll('path').transition('colour').duration(dur).attr('stroke', s => VCOL[verdictOf(s.i)])
    svgA.select('.ss-rsegs').selectAll('path').style('opacity', s => inRubin[s.i] ? 1 : 0)
    svgR.select('.sm-handle').attr('transform', `translate(${mx(L)},0)`).attr('aria-valuenow', L).attr('aria-valuetext', `magnitude ${fmt(L)}`)
  }

  // --- what is written under the ruler: at a spot on the path, how faint each planet would be there; otherwise,
  // from the surveys' step on, what a search to the handle's depth would still miss
  let at = null          // the point of the path being read: under the pointer, or where the planet rides
  function readout () {
    const r1 = svgR.select('.sm-read:not(.is-2)'), r2 = svgR.select('.sm-read.is-2')
    svgR.select('.sm-here').style('opacity', at == null ? 0 : 1).attr('cx', at == null ? null : mx(Vof.fit[at]))
    svgR.select('.sm-whisk').style('opacity', at == null || !scene.slide ? 0 : 1)
      .attr('x1', at == null ? null : mx(Vof.fit[at]) + 16).attr('x2', at == null ? null : Math.max(mx(Vof.fit[at]) + 16, mx(Vof.faint[at])))
    svgA.select('.ss-hover').selectAll('circle').data(at == null || scene.ride ? [] : [pts[at]]).join('circle')
      .attr('class', 'ss-mark').attr('r', 11).attr('cx', p => p.xy[0]).attr('cy', p => p.xy[1])
    if (at != null) {
      r1.attr('class', 'sm-read').text(`Here, ${Math.round(pts[at].r_au)} AU from the Sun, it would be magnitude`)
      r2.attr('class', 'sm-read is-2').text(scene.slide ? `${fmt(Vof.fit[at])}, or as faint as ${fmt(Vof.faint[at])}` : fmt(Vof.fit[at]))
    } else if (scene.slide) {
      const a = planets.fit.hidden(L), b = planets.faint.hidden(L)
      r1.attr('class', 'sm-read').text(`A search to magnitude ${fmt(L)} misses it`)
      r2.attr('class', `sm-read is-2 ${b > 0 ? 'is-shallow' : ''}`).text(b <= 0 ? 'nowhere on its orbit'
        : a <= 0 ? `up to ${pct(b)} of the time`
          : `${pct(a)} to ${pct(b)} of the time`)
    } else { r1.attr('class', 'sm-read is-idle').text(''); r2.attr('class', 'sm-read is-2 is-idle').text('') }
  }
  let hover = null
  svgA.on('pointermove', e => {
    if (!scene.mag) return
    const m = svgA.node().getScreenCTM(); if (!m) return
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    let best = null, bd = 46 * 46
    pts.forEach((p, i) => { const dx = p.xy[0] - pt.x, dy = p.xy[1] - pt.y, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i } })
    hover = best
    if (!scene.ride || best != null) { at = best; readout(); place() }
  }).on('pointerleave', () => { hover = null; if (!scene.ride) { at = null; readout() } })

  // --- the planet riding its path (the brightness step): at Kepler's pace, slow where it is far, so the reader
  // sees it fade as it goes out and linger there. The points are evenly spaced in angle round the Sun, so the time
  // spent at each goes as its distance squared (equal areas in equal times).
  const LAP_MS = 16000
  const cum = []; { let t = 0; for (const p of pts) { t += p.r_au * p.r_au; cum.push(t) } }
  const rider = svgA.select('.ss-rider')
  function place () { if (at != null) rider.attr('x', pts[at].xy[0] - 26).attr('y', pts[at].xy[1] - 26) }
  let raf = 0, t0 = null
  function frame (now) {
    raf = 0
    if (!scene.ride) return
    if (t0 == null) t0 = now
    if (hover == null) {
      const f = ((now - t0) % LAP_MS) / LAP_MS
      const i = Math.min(pts.length - 1, d3.bisectLeft(cum, f * cum[cum.length - 1]))
      if (i !== at) { at = i; readout(); place() }
    }
    raf = requestAnimationFrame(frame)
  }
  function ride () {
    const on = !!scene.ride
    rider.transition('ride').duration(T()).style('opacity', on ? 1 : 0)
    if (!on) { if (hover == null) { at = null } return }
    if (reduce.matches) { at = d3.maxIndex(pts, p => p.r_au); readout(); place(); return }   // still, at its far end
    if (!raf) raf = requestAnimationFrame(frame)
  }

  drawMorph(); apply()

  return {
    step (name) {
      if (!SCENES[name] || name === sceneName) return
      sceneName = name; scene = SCENES[name]
      at = hover = null
      // what is left is shown against the searches so far, wherever the reader left the line
      if (name === 'left' && limitV != null) L = limitV
      apply()
    },
    morph (t) {
      t = Math.max(0, Math.min(1, t))
      if (Math.abs(t - morphT) < 0.002 && t !== 0 && t !== 1) return
      morphT = t; drawMorph()
    },
    /** Outline one survey's area on the map (null clears it). */
    survey (id) {
      active = id
      const s = surveys.find(v => v.id === active)
      svgA.select('.ss-pick').attr('d', s && s.ra_ranges ? s.ra_ranges.map(([a, b]) => ring(s, a, b)).join(' ') : null)
        .classed('is-rubin', !!s?.future)
    },
  }
}
