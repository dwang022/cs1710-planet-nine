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

const W = 940, H = 500
const M = { top: 26, right: 16, bottom: 34, left: 16 }
const D = Math.PI / 180

// J2000 galactic frame constants (IAU): north galactic pole and the galactic
// longitude of the north celestial pole. Checked against the galactic centre
// (l=0, b=0 -> RA 266.405, Dec -28.936) and the anticentre.
const NGP_RA = 192.85948 * D, NGP_DEC = 27.12825 * D, L_NCP = 122.93192 * D
const OBLIQUITY = 23.439291 * D

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

export function drawSkyMap (root, { surveys, track, perihelia, activeSurvey, showTrack, showPerihelia, visibleIds }) {
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'All-sky map showing survey coverage, the predicted path of Planet Nine, and the perihelion direction of each extreme object.')

  const iw = W - M.left - M.right, ih = H - M.top - M.bottom
  const projection = d3.geoMollweide
    ? d3.geoMollweide()
    : null

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
    if (!s.dec_range || !s.ra_ranges) continue
    for (const [ra0, ra1] of s.ra_ranges) {
      const [d0, d1] = s.dec_range
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

  const fp = layers.selectAll('path.fp').data(patches, (d, i) => d.s.id + '-' + i)
  fp.exit().remove()
  fp.enter().append('path').attr('class', 'fp')
    .merge(fp)
    .attr('d', d => d3.line()(d.ring) + 'Z')
    .attr('fill', d => d.s.color_hex)
    .attr('stroke', d => d.s.color_hex)
    .attr('stroke-width', 1)
    .attr('fill-opacity', d => activeSurvey === d.s.id ? 0.34
      : activeSurvey ? 0.03
        : (d.s.area_sq_deg || 0) > 20000 ? 0.045 : 0.15)
    .attr('stroke-opacity', d => activeSurvey === d.s.id ? 0.95 : (activeSurvey ? 0.1 : 0.38))
    .style('cursor', 'pointer')
    .on('pointerenter', (ev, d) => showTip(ev, `
      <div class="t-name">${d.s.name}</div>
      <dl>
        <dt>years</dt><dd>${d.s.years[0]}–${d.s.years[1]}</dd>
        <dt>depth</dt><dd>${d.s.depth_mag ? 'V/r ≈ ' + d.s.depth_mag : 'infrared'}</dd>
        <dt>area</dt><dd>${d.s.area_sq_deg ? d3.format(',')(d.s.area_sq_deg) + ' sq°' : 'see note'}</dd>
      </dl>`))
    .on('pointerleave', hideTip)

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
    .attr('fill-opacity', 0.1)
    .attr('stroke', 'none')
  layers.selectAll('path.galplane').data([0]).join('path')
    .attr('class', 'galplane')
    .attr('d', segmentedPath(d3.range(0, 361, 2).map(l => galacticToEquatorial(l, 0))))
    .attr('fill', 'none').attr('stroke', '#e8dcc0')
    .attr('stroke-width', 1.2).attr('stroke-opacity', 0.45)

  // --- predicted Planet Nine path -----------------------------------------
  const trackData = showTrack ? track.tracks : []
  const tk = layers.selectAll('path.track').data(trackData, d => d.label)
  tk.exit().remove()
  tk.enter().append('path').attr('class', 'track')
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

  // --- where the predicted path is hardest to search -----------------------
  // The surviving parameter space is concentrated where Planet Nine's orbit
  // crosses the galactic plane. Mark those stretches explicitly rather than
  // leaving the reader to spot the overlap.
  const nominal = track.tracks.find(t => t.label === 'nominal')
  const buried = []
  if (showTrack && nominal) {
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
    .attr('fill', '#e8dcc0').attr('font-weight', 600).attr('text-anchor', 'middle')
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
    .on('pointerenter', (ev, d) => showTip(ev, `
      <div class="t-name">${d.name || d.id}</div>
      <dl><dt>perihelion RA</dt><dd>${d.peri_ra_deg.toFixed(1)}°</dd>
      <dt>dec</dt><dd>${d.peri_dec_deg.toFixed(1)}°</dd>
      <dt>distance</dt><dd>${d3.format(',.0f')(d.a_au)} AU</dd></dl>`))
    .on('pointerleave', hideTip)

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
