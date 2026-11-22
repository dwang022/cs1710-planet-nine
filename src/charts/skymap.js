// Sky geometry shared by the search page: the equal-area (Mollweide) projection fitted to a box, galactic and ecliptic
// coordinates, which survey covers a patch of sky and how faint it reaches there (surveys.json), and the small sky
// thumbnails in the page head. The sky story itself is charts/skysearch.js.

import * as d3 from 'd3'

const D = Math.PI / 180

// J2000 galactic frame constants (IAU): north galactic pole and the galactic
// longitude of the north celestial pole. Checked against the galactic centre
// (l=0, b=0 -> RA 266.405, Dec -28.936) and the anticentre.
const NGP_RA = 192.85948 * D, NGP_DEC = 27.12825 * D, L_NCP = 122.93192 * D
const OBLIQUITY = 23.439291 * D

// The depth a photo must reach to catch a faint Planet Nine (predicted at magnitude 21 to 25). Ours, not a
// published number: a survey bottoming out at 22 could only have caught the very brightest end of the range.
export const DEEP_MAG = 23.5
// the tilt of Earth's axis to its orbit, in degrees (IAU 2006), the angle between the ecliptic and the celestial equator
export const OBLIQUITY_DEG = 23.439291
// The site's one scale for magnitude on a sky map (2026-11-10): survey depth on the photographed sky's right-hand map,
// the planet's magnitude along its path on the left, the game's map and the page head's small oval. Dark space-blue
// for bright magnitudes (shallow photos), through a muted blue and a blue-teal, to a soft light teal at the faint end
// (the deepest photos): no white and no flat grey, so a deep survey's strip reads as deeper, not as a hole in the
// map. Sky with no visible-light survey in our data is the map's own dark navy (--sky-empty in style.css), never a
// made-up depth.
export const SKY_MAG_DOMAIN = [19, 26]
// How strongly the survey regions are laid over the dark sky: the whole layer at once (not region by region, so an
// overlap never stacks brighter), the navy showing through. The photographed sky's maps use it once the path is drawn
// over them, and the game always.
export const SKY_COVER_OPACITY = 0.45
export const skyMagColour = d3.scaleLinear()
  .domain([19, 21.5, 23.5, 26]).clamp(true)
  .range(['#1e3256', '#2f5a8c', '#3b8aa6', '#8ccfc9'])
  .interpolate(d3.interpolateLab)

/**
 * The declination band to actually draw and test against: the calibrated one,
 * squeezed so the band's solid angle matches the survey's published area.
 * See scripts/calibrate_footprints.py.
 */
export function footprintDec (s) { return s.dec_range_calibrated || s.dec_range }

/** Equatorial [RA, Dec] in degrees -> ecliptic latitude in degrees. */
export function eclipticLatitude (raDeg, decDeg) {
  const ra = raDeg * D, dec = decDeg * D
  return Math.asin(Math.sin(dec) * Math.cos(OBLIQUITY) - Math.cos(dec) * Math.sin(OBLIQUITY) * Math.sin(ra)) / D
}

/**
 * The northern edge of a survey's area at one right ascension. A band's is its upper declination. Rubin's follows
 * its published definition (surveys.json, `footprint`): everything south of a declination, and north of that the
 * North Ecliptic Spur, up to an ecliptic latitude; the edge is whichever is farther north.
 */
export function footprintTop (s, raDeg) {
  const hi = footprintDec(s)[1]
  if (!s.footprint) return hi
  let a = -30, b = 60   // ecliptic latitude grows with declination over this range, so halve to the limit
  for (let k = 0; k < 24; k++) { const m = (a + b) / 2; if (eclipticLatitude(raDeg, m) < s.footprint.ecl_lat_max) a = m; else b = m }
  return Math.max(s.footprint.dec_max, a)
}

/** Does this survey's depth shading apply at this point? */
function covers (s, raDeg, decDeg) {
  if (!s.ra_ranges || !footprintDec(s)) return false
  if (s.footprint_area_verified === false) return false
  const [d0] = footprintDec(s)
  if (decDeg < d0 || decDeg > footprintTop(s, raDeg)) return false
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
export function galacticLatitude (raDeg, decDeg) {
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

/** Equatorial [RA, Dec] of a point on the galactic plane, for labels. */
export const galacticPoint = galacticToEquatorial
export const eclipticPoint = eclipticToEquatorial

/** The same equal-area projection, fitted to a box: for the small drawings in a page head and the sky story
    (charts/skysearch.js). */
export function mollweideIn (left, top, iw, ih) {
  return (raDeg, decDeg) => {
    const lam = (180 - raDeg) * Math.PI / 180
    const phi = Math.max(-89.99, Math.min(89.99, decDeg)) * Math.PI / 180
    let th = phi
    for (let k = 0; k < 20; k++) {
      const den = 2 + 2 * Math.cos(2 * th)
      if (Math.abs(den) < 1e-9) break
      const d = (2 * th + Math.sin(2 * th) - Math.PI * Math.sin(phi)) / den
      th -= d
      if (Math.abs(d) < 1e-12) break
    }
    const x = (2 * Math.SQRT2 / Math.PI) * lam * Math.cos(th)
    const y = Math.SQRT2 * Math.sin(th)
    return [left + iw / 2 + (x / (2 * Math.SQRT2)) * (iw / 2), top + ih / 2 - (y / Math.SQRT2) * (ih / 2)]
  }
}

/**
 * A small whole-sky oval (an SVG string, 100 × 100 box) for a page head, drawn from the same data as the map:
 *   show 'deep'  every footprint dim, the ones at least DEEP_MAG deep lit
 *   show 'path'  Planet Nine's predicted path, the stretches `mark` picks in ember (by default those photographed
 *                only shallower than DEEP_MAG)
 */
export function skyThumb (surveys, track, { show = 'deep', mark = null } = {}) {
  const P = mollweideIn(2, 26, 96, 48)
  const clamp = ra => Math.min(359.99, Math.max(0.01, ra))
  const line = pts => d3.line()(pts.map(([ra, dec]) => P(clamp(ra), dec)))
  const outline = [...d3.range(-89.9, 90, 3).map(d => [0.01, d]), ...d3.range(89.9, -90, -3).map(d => [359.99, d])]
  const id = `sky-thumb-${show}`
  const body = []
  if (show === 'deep') {
    const drawn = surveys.filter(s => s.wavelength === 'optical' && !s.future && s.ra_ranges && footprintDec(s) && s.footprint_area_verified !== false)
      .sort((a, b) => (a.depth_mag ?? 0) - (b.depth_mag ?? 0))
    for (const s of drawn) {
      const [d0, d1] = footprintDec(s)
      for (const [r0, r1] of s.ra_ranges) {
        const ring = [...d3.range(r0, r1 + 0.1, 3).map(ra => [ra, d0]), ...d3.range(d0, d1 + 0.1, 3).map(d => [r1, d]),
          ...d3.range(r1, r0 - 0.1, -3).map(ra => [ra, d1]), ...d3.range(d1, d0 - 0.1, -3).map(d => [r0, d])]
        body.push(`<path d="${line(ring)}Z" fill="${skyMagColour(s.depth_mag ?? SKY_MAG_DOMAIN[0])}" opacity="${(s.depth_mag ?? 0) >= DEEP_MAG ? 1 : 0.55}"/>`)
      }
    }
  } else {
    const nom = track.tracks.find(t => t.label === 'nominal').points
    const runs = (keep) => {
      const out = []; let run = [], prev = null
      for (const p of nom) {
        const ok = keep(p)
        if (ok && run.length && prev !== null && Math.abs(p.ra_deg - prev) > 180) { out.push(run); run = [] }
        if (ok) run.push([p.ra_deg, p.dec_deg]); else if (run.length) { out.push(run); run = [] }
        prev = p.ra_deg
      }
      if (run.length) out.push(run)
      return out.filter(r => r.length > 1)
    }
    for (const r of runs(() => true)) body.push(`<path d="${line(r)}" fill="none" stroke="var(--p9)" stroke-width="2"/>`)
    for (const r of runs(mark || (p => { const d = deepestAt(surveys, p.ra_deg, p.dec_deg); return d === null || d < DEEP_MAG }))) {
      body.push(`<path d="${line(r)}" fill="none" stroke="var(--series-2)" stroke-width="5" stroke-opacity=".6" stroke-linecap="round"/>`)
    }
  }
  return `<svg class="art sky-thumb" viewBox="0 0 100 100" aria-hidden="true">
    <defs><clipPath id="${id}"><path d="${line(outline)}Z"/></clipPath></defs>
    <path d="${line(outline)}Z" fill="var(--sky-empty)"/>
    <g clip-path="url(#${id})">${body.join('')}</g>
    <path d="${line(outline)}Z" fill="none" stroke="var(--text-muted)" stroke-width="1"/></svg>`
}
