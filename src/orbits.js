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

/** Sample a full orbit as an array of [x, y, z], for drawing the ellipse. */
export function orbitPath (a, e, iDeg, nodeDeg, argperiDeg, steps = 180) {
  const pts = []
  for (let k = 0; k <= steps; k++) {
    pts.push(positionAt(a, e, iDeg, nodeDeg, argperiDeg, (k / steps) * 360))
  }
  return pts
}

/**
 * Sample only part of an orbit, between two true anomalies.
 *
 * Drawing nu = -90 to +90 gives the arc around perihelion: the half of the
 * orbit that actually carries the directional information. The rest of the
 * ellipse sweeps out to hundreds of AU and, at the scale needed to contain it,
 * crushes every perihelion into a dot at the centre.
 */
export function orbitArc (a, e, iDeg, nodeDeg, argperiDeg, nu0 = -90, nu1 = 90, steps = 90) {
  const pts = []
  for (let k = 0; k <= steps; k++) {
    pts.push(positionAt(a, e, iDeg, nodeDeg, argperiDeg, nu0 + (k / steps) * (nu1 - nu0)))
  }
  return pts
}

/** Radius at true anomaly +/-90, the semi-latus rectum - how far the arc reaches. */
export function semiLatusRectum (a, e) { return a * (1 - e * e) }

/** The perihelion point - the end of the orbit that the clustering is about. */
export function perihelionPoint (o) {
  return positionAt(o.a_au, o.e, o.i_deg, o.node_deg, o.argperi_deg, 0)
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

/** Circular difference a - b, wrapped to [-180, 180]. */
export function angleDiff (a, b) {
  return ((a - b + 540) % 360) - 180
}
