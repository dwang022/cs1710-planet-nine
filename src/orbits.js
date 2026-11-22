// Orbital geometry. Same transforms as scripts/build_sky.py, which were checked
// against JPL Horizons on four real objects and agreed to 2.5-4.5 arcseconds.

const RAD = Math.PI / 180

/**
 * Heliocentric ecliptic position (AU) at true anomaly nu, for Keplerian
 * elements in degrees. Returns [x, y, z] with the ecliptic as the xy-plane.
 */
export function positionAt (a, e, iDeg, nodeDeg, argperiDeg, nuDeg) {
  const i = iDeg * RAD, O = nodeDeg * RAD, w = argperiDeg * RAD, nu = nuDeg * RAD
  const r = a * (1 - e * e) / (1 + e * Math.cos(nu))
  const u = w + nu
  const cu = Math.cos(u), su = Math.sin(u)
  const cO = Math.cos(O), sO = Math.sin(O)
  const ci = Math.cos(i), si = Math.sin(i)
  return [
    r * (cO * cu - sO * su * ci),
    r * (sO * cu + cO * su * ci),
    r * (su * si),
  ]
}

/** True anomaly (degrees) from mean anomaly (degrees), solving Kepler's equation by Newton's method. */
export function trueAnomaly (mDeg, e) {
  const M = (((mDeg % 360) + 360) % 360) * RAD
  let E = e < 0.8 ? M : Math.PI
  for (let k = 0; k < 100; k++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= d
    if (Math.abs(d) < 1e-12) break
  }
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)) / RAD
}

/**
 * An orbit laid flat on the ecliptic: the point at true anomaly nu keeps its
 * true distance from the Sun and sits in the direction varpi + nu. Only the
 * tilt is dropped, so every distance on a flat map stays exact. Returns [x, y] in AU.
 */
export function flatPoint (a, e, varpiDeg, nuDeg) {
  const r = a * (1 - e * e) / (1 + e * Math.cos(nuDeg * RAD))
  const t = (varpiDeg + nuDeg) * RAD
  return [r * Math.cos(t), r * Math.sin(t)]
}

/** A whole flat orbit as [x, y] points, spaced evenly in eccentric anomaly so long ovals stay smooth. */
export function flatOrbit (a, e, varpiDeg, steps = 180) {
  const b = a * Math.sqrt(1 - e * e), c = Math.cos(varpiDeg * RAD), s = Math.sin(varpiDeg * RAD)
  const pts = []
  for (let k = 0; k <= steps; k++) {
    const E = (k / steps) * 2 * Math.PI
    const x = a * (Math.cos(E) - e), y = b * Math.sin(E)
    pts.push([x * c - y * s, x * s + y * c])
  }
  return pts
}

/**
 * A planet's elements on a Julian date, from the JPL/Standish approximate
 * elements in planets.json (J2000 values plus rates per century).
 * Returns { name, a, e, varpi, nu }, angles in degrees.
 */
export function planetAt (p, jd) {
  const T = (jd - 2451545.0) / 36525
  const at = k => p[k] + (p.rates?.[k] ?? 0) * T
  const a = at('a'), e = at('e'), varpi = at('varpi')
  return { name: p.name, a, e, varpi, nu: trueAnomaly(at('L') - varpi, e) }
}

/**
 * Planet Nine's predicted orbit: Brown & Batygin 2021 (AJ 162:219), the
 * marginalized posterior medians from their Figure 8 corner plot. That is the
 * only published set containing both angles, which the geometry needs.
 */
export const PLANET_NINE = {
  a_au: 460.7, e: 0.30, i_deg: 15.6, varpi_deg: 246.7, node_deg: 96.9,
  get argperi_deg () { return (this.varpi_deg - this.node_deg + 360) % 360 },
  mass_earths: 6.9,
  source: 'Brown & Batygin 2021, Fig. 8',
  doi: 'https://doi.org/10.3847/1538-3881/ac2056',
}

/** The six objects Batygin & Brown (2016) built the proposal on, by name or provisional designation. */
export const ORIGINAL_SIX = ['Sedna', '2012 VP113', '2004 VN112', '2010 GB174', '2007 TG422', '2013 RF98']
export const isOriginalSix = o => ORIGINAL_SIX.includes(o.name) || ORIGINAL_SIX.includes(o.provisional_desig)

/** Circular difference a - b, wrapped to [-180, 180]. */
export function angleDiff (a, b) {
  return ((a - b + 540) % 360) - 180
}
