// Sketch DW5 — where the telescopes have looked.
//
// An all-sky map (equal-area Mollweide) carrying three real layers:
//   1. survey footprints, from surveys.json
//   2. the predicted path of Planet Nine, computed from Brown & Batygin 2021
//   3. the perihelion direction of every extreme object, from its elements
// Nothing here is invented; the footprints are schematic dec/RA bands and are
// labelled as such in the caption.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'
import { registerHighlight, setHover } from '../highlight.js'

const W = 940, H = 500
const M = { top: 26, right: 16, bottom: 34, left: 16 }
const D = Math.PI / 180

// J2000 galactic frame constants (IAU): north galactic pole and the galactic
// longitude of the north celestial pole. Checked against the galactic centre
// (l=0, b=0 -> RA 266.405, Dec -28.936) and the anticentre.
const NGP_RA = 192.85948 * D, NGP_DEC = 27.12825 * D, L_NCP = 122.93192 * D
const OBLIQUITY = 23.439291 * D

// Depth is the real constraint on this search, so the map is shaded by it:
// how faint could anyone see at this patch of sky? One hue, dark (shallow) to
// bright (deep), on the dark surface.
const DEPTH_RANGE = [20.0, 26.0]
export const depthColour = d3.scaleLinear()
  .domain(DEPTH_RANGE).clamp(true)
  .range(['#1d2a31', '#8fd3e2'])
  .interpolate(d3.interpolateLab)

/**
 * The declination band to actually draw and test against: the calibrated one,
 * squeezed so the band's solid angle matches the survey's published area.
 * See scripts/calibrate_footprints.py.
 */
export function footprintDec (s) { return s.dec_range_calibrated || s.dec_range }

/** Does this survey's depth shading apply at this point? */
function covers (s, raDeg, decDeg) {
  if (!s.ra_ranges || !footprintDec(s)) return false
  if (s.footprint_area_verified === false) return false
  const [d0, d1] = footprintDec(s)
  if (decDeg < d0 || decDeg > d1) return false
  return s.ra_ranges.some(([r0, r1]) => raDeg >= r0 && raDeg <= r1)
}

/** The faintest magnitude anyone has reached at this position, or null. */
export function deepestAt (surveys, raDeg, decDeg, { includeFuture = false } = {}) {
  let best = null
  for (const s of surveys) {
    if (s.wavelength !== 'optical' || s.depth_mag == null) continue
    if (!includeFuture && s.future) continue
    if (!covers(s, raDeg, decDeg)) continue
    if (best === null || s.depth_mag > best) best = s.depth_mag
  }
  return best
}

/** Galactic (l, b) in degrees -> equatorial [RA, Dec] in degrees. */
function galacticToEquatorial (lDeg, bDeg) {
  const l = lDeg * D, b = bDeg * D
  const sinDec = Math.sin(NGP_DEC) * Math.sin(b) +
    Math.cos(NGP_DEC) * Math.cos(b) * Math.cos(L_NCP - l)
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)))
  const y = Math.cos(b) * Math.sin(L_NCP - l)
  const x = Math.cos(NGP_DEC) * Math.sin(b) -
    Math.sin(NGP_DEC) * Math.cos(b) * Math.cos(L_NCP - l)
  const ra = ((NGP_RA + Math.atan2(y, x)) / D % 360 + 360) % 360
  return [ra, dec / D]
}

/** Equatorial [RA, Dec] in degrees -> galactic latitude b in degrees. */
function galacticLatitude (raDeg, decDeg) {
  const ra = raDeg * D, dec = decDeg * D
  const sinB = Math.sin(NGP_DEC) * Math.sin(dec) +
    Math.cos(NGP_DEC) * Math.cos(dec) * Math.cos(ra - NGP_RA)
  return Math.asin(Math.max(-1, Math.min(1, sinB))) / D
}

/** Ecliptic longitude in degrees (latitude 0) -> equatorial [RA, Dec]. */
function eclipticToEquatorial (lamDeg) {
  const lam = lamDeg * D
  const ra = ((Math.atan2(Math.sin(lam) * Math.cos(OBLIQUITY), Math.cos(lam)) / D) % 360 + 360) % 360
  const dec = Math.asin(Math.sin(OBLIQUITY) * Math.sin(lam)) / D
  return [ra, dec]
}

// Which layers a story step shows. The explore step shows everything.
export const ALL_LAYERS = {
  surveys: 'depth', track: true, unsearched: true, milky: true,
  perihelia: true, future: false, notes: [],
}
const T = 650

/** Equatorial [RA, Dec] of a point on the galactic plane, for labels. */
export const galacticPoint = galacticToEquatorial
export const eclipticPoint = eclipticToEquatorial

export function drawSkyMap (root, { surveys, track, perihelia, activeSurvey, visibleIds, scene = ALL_LAYERS }) {
  const L = { ...ALL_LAYERS, ...scene }
  const showTrack = L.track, showPerihelia = L.perihelia
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'All-sky map showing survey coverage, the predicted path of Planet Nine, and the perihelion direction of each extreme object.')

  const iw = W - M.left - M.right, ih = H - M.top - M.bottom
  // d3-geo-projection is not bundled; Mollweide is simple enough to inline.
  // x = (2R/pi) * lambda * cos(theta), y = R * sin(theta), with theta solved
  // from 2*theta + sin(2*theta) = pi * sin(phi).
  const Rx = iw / (2 * Math.sqrt(2)) * Math.SQRT2 / 2 * 2
  function mollweide (raDeg, decDeg) {
    // Centre the map on RA 180 so the map runs 0 -> 360 left to right.
    const lam = (180 - raDeg) * Math.PI / 180
    const phi = Math.max(-89.99, Math.min(89.99, decDeg)) * Math.PI / 180
    let th
    if (Math.abs(phi) > 1.5706) {
      // At the poles the Newton step divides by zero; theta is exactly +/- pi/2.
      th = Math.sign(phi) * Math.PI / 2
    } else {
      th = phi
      for (let k = 0; k < 20; k++) {
        const den = 2 + 2 * Math.cos(2 * th)
        if (Math.abs(den) < 1e-9) break
        const d = (2 * th + Math.sin(2 * th) - Math.PI * Math.sin(phi)) / den
        th -= d
        if (Math.abs(d) < 1e-12) break
      }
    }
    const x = (2 * Math.SQRT2 / Math.PI) * lam * Math.cos(th)
    const y = Math.SQRT2 * Math.sin(th)
    // normalise: x in [-2sqrt2, 2sqrt2], y in [-sqrt2, sqrt2]
    return [
      M.left + iw / 2 + (x / (2 * Math.SQRT2)) * (iw / 2),
      M.top + ih / 2 - (y / Math.SQRT2) * (ih / 2),
    ]
  }

  let g = svg.select('g.sky')
  if (g.empty()) g = svg.append('g').attr('class', 'sky')
  let layers = svg.select('g.sky-layers')

  // --- graticule + outline -------------------------------------------------
  const outline = []
  for (let d = -89.9; d <= 89.9; d += 1.5) outline.push(mollweide(0.001, d))
  outline.push(mollweide(0.001, 89.9))
  for (let d = 89.9; d >= -89.9; d -= 1.5) outline.push(mollweide(359.999, d))
  const outlineD = d3.line()(outline) + 'Z'
  // Clip every layer to the map boundary so nothing escapes the projection.
  let defs = svg.select('defs')
  if (defs.empty()) defs = svg.append('defs')
  if (defs.select('#sky-clip').empty()) {
    defs.append('clipPath').attr('id', 'sky-clip').append('path')
  }
  defs.select('#sky-clip').select('path').attr('d', outlineD)

  g.selectAll('path.outline').data([0]).join('path')
    .attr('class', 'outline')
    .attr('d', outlineD)
    .attr('fill', '#0e0e0d').attr('stroke', 'var(--text-muted)')
    .attr('stroke-width', 1.2).attr('stroke-opacity', 0.55)

  if (layers.empty()) layers = svg.append('g').attr('class', 'sky-layers').attr('clip-path', 'url(#sky-clip)')

  const gratDec = d3.range(-60, 90, 30)
  const gratRA = d3.range(60, 360, 60)
  const gl = layers.selectAll('path.grat').data([
    ...gratDec.map(d => d3.range(0, 361, 3).map(ra => mollweide(Math.min(359.99, Math.max(0.01, ra)), d))),
    ...gratRA.map(ra => d3.range(-90, 91, 3).map(d => mollweide(ra, d))),
  ])
  gl.join('path').attr('class', 'grat')
    .attr('d', pts => d3.line()(pts))
    .attr('fill', 'none').attr('stroke', 'var(--rule)').attr('stroke-width', 1)

  // --- survey footprints ---------------------------------------------------
  // Each footprint is a dec band crossed with one or more RA ranges.
  const patches = []
  for (const s of surveys) {
    if (!footprintDec(s) || !s.ra_ranges) continue
    // Only area-verified optical surveys may paint depth; the rest would claim
    // more deeply-searched sky than anyone actually searched.
    if (s.footprint_area_verified === false) continue
    for (const [ra0, ra1] of s.ra_ranges) {
      const [d0, d1] = footprintDec(s)
      // Declination is clamped off the poles: at dec = +/-90 every right
      // ascension collapses to one point, and joining through it draws a spike.
      // Trace the graticule cell: bottom parallel, up the eastern meridian,
      // back along the top parallel, down the western meridian. Every edge is
      // sampled, because in Mollweide meridians are curves - joining the
      // corners with straight lines cuts a chord across the whole map.
      const lo = Math.max(-88, d0), hi = Math.min(88, d1)
      const ring = []
      for (let ra = ra0; ra <= ra1; ra += 1.5) ring.push(mollweide(clampRA(ra), lo))
      for (let d = lo; d <= hi; d += 1.5) ring.push(mollweide(clampRA(ra1), d))
      for (let ra = ra1; ra >= ra0; ra -= 1.5) ring.push(mollweide(clampRA(ra), hi))
      for (let d = hi; d >= lo; d -= 1.5) ring.push(mollweide(clampRA(ra0), d))
      patches.push({ s, ring })
    }
  }
  function clampRA (ra) { return Math.min(359.99, Math.max(0.01, ra)) }

  // Painted shallowest first: a deeper survey drawn on top simply wins, which
  // turns overlapping footprints into a true "deepest reached here" map without
  // rasterising anything.
  patches.sort((a, b) => (a.s.depth_mag ?? 0) - (b.s.depth_mag ?? 0))

  // How each footprint is painted depends on the step: first just "someone
  // photographed this" in one flat tone, then shaded by depth, then with only
  // the deep-enough surveys left lit.
  const isDeep = s => (s.depth_mag ?? 0) >= 23.5 && s.wavelength === 'optical'
  const fpFill = d => {
    if (d.s.future) return '#F08BB4'
    if (L.surveys === 'coverage') return '#556b77'
    return d.s.depth_mag != null && d.s.wavelength === 'optical' ? depthColour(d.s.depth_mag) : '#1a2228'
  }
  const fpOpacity = d => {
    if (d.s.future) return L.future ? 0.22 : 0
    if (L.surveys === 'none') return 0
    if (L.surveys === 'coverage') return 0.45
    if (L.surveys === 'deep') return isDeep(d.s) ? 0.9 : 0.06
    return activeSurvey && activeSurvey !== d.s.id ? 0.25 : 0.62
  }
  const fp = layers.selectAll('path.fp').data(patches, (d, i) => d.s.id + '-' + i)
  fp.exit().remove()
  fp.enter().append('path').attr('class', 'fp').attr('fill-opacity', 0)
    .merge(fp)
    .attr('d', d => d3.line()(d.ring) + 'Z')
    .style('pointer-events', d => fpOpacity(d) > 0.1 ? null : 'none')
    .attr('stroke', d => d.s.future ? '#F08BB4' : activeSurvey === d.s.id ? d.s.color_hex : 'none')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', d => d.s.future ? '6 5' : null)
    .style('cursor', 'pointer')
    .on('pointerenter', (ev, d) => showTip(ev, `
      <div class="t-name">${d.s.name}</div>
      <dl>
        <dt>sees down to</dt><dd>${d.s.depth_mag ? 'mag ' + d.s.depth_mag : 'infrared'}</dd>
        <dt>years</dt><dd>${d.s.years[0]}–${d.s.years[1]}</dd>
      </dl>
      <div style="margin-top:6px;color:var(--text-secondary)">${
        (d.s.depth_mag ?? 0) >= 22
          ? 'Deep enough to spot Planet Nine here.'
          : 'Too shallow — Planet Nine could sit here unseen.'}</div>`))
    .on('pointerleave', hideTip)
    .transition().duration(T)
    .attr('fill', fpFill)
    .attr('fill-opacity', fpOpacity)
    .attr('stroke-opacity', d => d.s.future ? (L.future ? 0.9 : 0) : activeSurvey === d.s.id ? 1 : 0)

  // --- reference circles ---------------------------------------------------
  // The ecliptic is where the planets (and these objects) live. The galactic
  // plane is the Milky Way: crowded with stars, and the hardest place to pick
  // out something that moves. Where the two cross is the gap in the search.
  const eclipticPts = d3.range(0, 361, 2).map(lam => eclipticToEquatorial(lam))
  layers.selectAll('path.ecliptic').data([0]).join('path')
    .attr('class', 'ecliptic')
    .attr('d', segmentedPath(eclipticPts))
    .attr('fill', 'none').attr('stroke', 'var(--text-secondary)')
    .attr('stroke-width', 1.2).attr('stroke-opacity', 0.5)

  // A +/- 15 degree band either side of the galactic midplane.
  const galBand = [
    ...d3.range(0, 361, 2).map(l => galacticToEquatorial(l, 15)),
    ...d3.range(360, -1, -2).map(l => galacticToEquatorial(l, -15)),
  ]
  layers.selectAll('path.galband').data([0]).join('path')
    .attr('class', 'galband')
    .attr('d', bandPath(
      d3.range(0, 361, 2).map(l => galacticToEquatorial(l, 15)),
      d3.range(0, 361, 2).map(l => galacticToEquatorial(l, -15))))
    .attr('fill', '#e8dcc0')
    .attr('stroke', 'none')
    .transition().duration(T)
    .attr('fill-opacity', L.milky ? 0.13 : 0)
  layers.selectAll('path.galplane').data([0]).join('path')
    .attr('class', 'galplane')
    .attr('d', segmentedPath(d3.range(0, 361, 2).map(l => galacticToEquatorial(l, 0))))
    .attr('fill', 'none').attr('stroke', '#e8dcc0')
    .attr('stroke-width', 1.2)
    .transition().duration(T)
    .attr('stroke-opacity', L.milky ? 0.45 : 0)

  // --- predicted Planet Nine path -----------------------------------------
  const trackData = showTrack ? track.tracks : []
  const tk = layers.selectAll('path.track').data(trackData, d => d.label)
  tk.exit().transition().duration(T / 2).attr('opacity', 0).remove()
  tk.enter().append('path').attr('class', 'track')
    .attr('opacity', 0).call(e => e.transition().duration(T).attr('opacity', 1))
    .merge(tk)
    .attr('d', d => segmentedPath(d.points.map(p => [p.ra_deg, p.dec_deg])))
    .attr('fill', 'none')
    .attr('stroke', 'var(--series-3)')
    .attr('stroke-width', d => d.label === 'nominal' ? 2.6 : 1.1)
    .attr('stroke-opacity', d => d.label === 'nominal' ? 1 : 0.4)

  /** Fill between two parallel curves, split at the same wrap points. */
  function bandPath (upper, lower) {
    const up = splitOnWrap(upper), lo = splitOnWrap(lower)
    const out = []
    for (let i = 0; i < Math.min(up.length, lo.length); i++) {
      const a = up[i], b = lo[i].slice().reverse()
      if (a.length < 2 || b.length < 2) continue
      out.push(d3.line()(a.concat(b)) + 'Z')
    }
    return out.join(' ')
  }

  function splitOnWrap (pts) {
    const segs = []
    let cur = [], prevRA = null
    for (const [ra, dec] of pts) {
      if (prevRA !== null && Math.abs(ra - prevRA) > 180) { segs.push(cur); cur = [] }
      cur.push(mollweide(clampRA(ra), dec))
      prevRA = ra
    }
    segs.push(cur)
    return segs.filter(s => s.length > 1)
  }

  // break the path where it wraps across the map edge
  function segmentedPath (pts) {
    const segs = []
    let cur = []
    let prevRA = null
    for (const [ra, dec] of pts) {
      if (prevRA !== null && Math.abs(ra - prevRA) > 180) { segs.push(cur); cur = [] }
      cur.push(mollweide(clampRA(ra), dec))
      prevRA = ra
    }
    segs.push(cur)
    return segs.filter(s => s.length > 1).map(s => d3.line()(s)).join(' ')
  }

  // --- the predicted path, split by whether anyone looked deep enough ------
  // Planet Nine is predicted somewhere in magnitude 21-25. A survey bottoming
  // out at 22 could only ever have caught it at the very brightest end, so it
  // has not really excluded anything. 23.5 is the bar for ruling out a faint
  // one, and it is the threshold this line is split on.
  const P9_MAG = 23.5
  const nom = track.tracks.find(t => t.label === 'nominal')
  const unsearched = []
  if (showTrack && L.unsearched && nom) {
    let run = []
    for (const pt of nom.points) {
      const d = deepestAt(surveys, pt.ra_deg, pt.dec_deg)
      if (d === null || d < P9_MAG) run.push(pt)
      else if (run.length) { unsearched.push(run); run = [] }
    }
    if (run.length) unsearched.push(run)
  }
  const us = layers.selectAll('path.unsearched').data(unsearched)
  us.exit().remove()
  us.enter().append('path').attr('class', 'unsearched')
    .merge(us)
    .attr('d', run => segmentedPath(run.map(p => [p.ra_deg, p.dec_deg])))
    .attr('fill', 'none').attr('stroke', 'var(--series-2)')
    .attr('stroke-width', 7).attr('stroke-opacity', 0.55)
    .attr('stroke-linecap', 'round')

  // --- where the predicted path is hardest to search -----------------------
  // The surviving parameter space is concentrated where Planet Nine's orbit
  // crosses the galactic plane. Mark those stretches explicitly rather than
  // leaving the reader to spot the overlap.
  const nominal = track.tracks.find(t => t.label === 'nominal')
  const buried = []
  if (showTrack && L.milky && nominal) {
    let run = []
    for (const pt of nominal.points) {
      if (Math.abs(galacticLatitude(pt.ra_deg, pt.dec_deg)) <= 15) {
        run.push(pt)
      } else if (run.length) { buried.push(run); run = [] }
    }
    if (run.length) buried.push(run)
  }
  const bd = layers.selectAll('path.buried').data(buried)
  bd.exit().remove()
  bd.enter().append('path').attr('class', 'buried')
    .merge(bd)
    .attr('d', run => segmentedPath(run.map(p => [p.ra_deg, p.dec_deg])))
    .attr('fill', 'none').attr('stroke', '#e8dcc0')
    .attr('stroke-width', 6).attr('stroke-opacity', 0.5)
    .attr('stroke-linecap', 'round')

  const labelled = buried.filter(r => r.length > 6)
  const bl = layers.selectAll('text.buriedlabel').data(labelled)
  bl.exit().remove()
  bl.enter().append('text').attr('class', 'buriedlabel axis-label')
    .merge(bl)
    .style('fill', '#e8dcc0').attr('font-weight', 600).attr('text-anchor', 'middle')
    .attr('x', run => mollweide(clampRA(run[Math.floor(run.length / 2)].ra_deg),
      run[Math.floor(run.length / 2)].dec_deg)[0])
    .attr('y', run => mollweide(clampRA(run[Math.floor(run.length / 2)].ra_deg),
      run[Math.floor(run.length / 2)].dec_deg)[1] - 16)
    .text('lost in the Milky Way')

  // --- perihelion directions of the real objects ---------------------------
  const shown = visibleIds
    ? perihelia.filter(d => visibleIds.has(d.id))
    : perihelia
  const ph = layers.selectAll('circle.ph').data(showPerihelia ? shown : [], d => d.id)
  ph.exit().remove()
  ph.enter().append('circle').attr('class', 'ph')
    .attr('r', 4).attr('stroke', 'var(--surface-2)').attr('stroke-width', 1.2)
    .merge(ph)
    .attr('cx', d => mollweide(clampRA(d.peri_ra_deg), d.peri_dec_deg)[0])
    .attr('cy', d => mollweide(clampRA(d.peri_ra_deg), d.peri_dec_deg)[1])
    .attr('fill', 'var(--series-1)')
    .attr('opacity', d => d.well_determined ? 0.95 : 0.4)
    .on('pointerenter', (ev, d) => { setHover(d.id); showTip(ev, `
      <div class="t-name">${d.name || d.id}</div>
      <dl><dt>perihelion RA</dt><dd>${d.peri_ra_deg.toFixed(1)}°</dd>
      <dt>dec</dt><dd>${d.peri_dec_deg.toFixed(1)}°</dd>
      <dt>distance</dt><dd>${d3.format(',.0f')(d.a_au)} AU</dd></dl>`) })
    .on('pointerleave', () => { setHover(null); hideTip() })

  if (!root.__hl) {
    root.__hl = true
    registerHighlight(id => {
      d3.select(root).selectAll('circle.ph')
        .attr('r', d => d.id === id ? 7.5 : 4)
        .attr('fill', d => d.id === id ? 'var(--text-primary)' : 'var(--series-1)')
        .attr('stroke-width', d => d.id === id ? 2 : 1.2)
    })
  }

  // --- story annotations: each one names the thing it sits on ---------------
  let gNotes = svg.select('g.sky-notes')
  if (gNotes.empty()) gNotes = svg.append('g').attr('class', 'sky-notes')
  const nt = gNotes.selectAll('text.note').data(L.notes, d => d.text)
  nt.exit().transition().duration(T / 2).attr('opacity', 0).remove()
  nt.enter().append('text').attr('class', 'note halo').attr('opacity', 0)
    .merge(nt)
    .attr('x', d => mollweide(clampRA(d.ra), d.dec)[0] + (d.dx || 0))
    .attr('y', d => mollweide(clampRA(d.ra), d.dec)[1] + (d.dy || 0))
    .attr('text-anchor', d => d.anchor || 'middle')
    .attr('font-size', d => d.size || 15).attr('font-weight', 600)
    .attr('fill', d => d.colour || 'var(--text-primary)')
    .style('pointer-events', 'none')
    .text(d => d.text)
    .transition().duration(T).attr('opacity', 1)

  // --- axis labels ---------------------------------------------------------
  g.selectAll('text.ral').data(gratRA).join('text')
    .attr('class', 'ral axis-label')
    .attr('x', d => mollweide(d, 0)[0]).attr('y', M.top + ih + 18)
    .attr('text-anchor', 'middle')
    .text(d => `${d}°`)
  g.selectAll('text.ralt').data([0]).join('text')
    .attr('class', 'ralt axis-label')
    .attr('x', M.left + iw / 2).attr('y', M.top + ih + 32)
    .attr('text-anchor', 'middle')
    .text('right ascension — position around the sky')
}
