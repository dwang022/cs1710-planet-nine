// Circular statistics for the clustering claim.
//
// The statistic is the mean resultant length R of the longitudes of perihelion:
// R = 0 means the perihelion directions are spread evenly around the sky,
// R = 1 means they all point the same way.

const RAD = Math.PI / 180

/** The middle and the spread of a set of directions (degrees): the circular mean, and the root-mean-square angle of
 *  each from it, Batygin and Brown's measure of how tightly the six orbits of 2016 line up (2016, section 2). The
 *  clustering and probability pages both use it, so their numbers agree. */
export function spreadOf (degs) {
  let c = 0, s = 0
  for (const d of degs) { c += Math.cos(d * RAD); s += Math.sin(d * RAD) }
  const mid = ((Math.atan2(s, c) / RAD) % 360 + 360) % 360
  const dev = degs.map(d => ((d - mid + 540) % 360) - 180)
  return { mid, spread: Math.sqrt(dev.reduce((t, x) => t + x * x, 0) / (degs.length || 1)) }
}
/** The paper's spread on the sky: the root-mean-square angle from each [lon, lat] (degrees) to their average
 *  direction. For where the orbits stretch out it is taken over their closest points on the sky, as the paper did. */
export function skySpread (pts) {
  const v = pts.map(([l, b]) => [Math.cos(b * RAD) * Math.cos(l * RAD), Math.cos(b * RAD) * Math.sin(l * RAD), Math.sin(b * RAD)])
  const m = [0, 1, 2].map(k => v.reduce((t, p) => t + p[k], 0)), n = Math.hypot(...m) || 1
  const ang = p => Math.acos(Math.max(-1, Math.min(1, (p[0] * m[0] + p[1] * m[1] + p[2] * m[2]) / n)))
  return Math.sqrt(v.reduce((t, p) => t + ang(p) ** 2, 0) / (v.length || 1)) / RAD
}
/** Where an orbit comes closest to the Sun, on the sky: [ecliptic longitude, latitude], degrees. */
export function closestOnSky (o) {
  const i = o.i_deg * RAD, O = o.node_deg * RAD, w = o.argperi_deg * RAD
  const x = Math.cos(O) * Math.cos(w) - Math.sin(O) * Math.sin(w) * Math.cos(i)
  const y = Math.sin(O) * Math.cos(w) + Math.cos(O) * Math.sin(w) * Math.cos(i)
  const z = Math.sin(w) * Math.sin(i)
  return [((Math.atan2(y, x) / RAD) % 360 + 360) % 360, Math.asin(Math.max(-1, Math.min(1, z))) / RAD]
}

/** Mean resultant length and mean direction of a set of angles (degrees). */
export function resultant (anglesDeg) {
  const n = anglesDeg.length
  if (n === 0) return { R: 0, meanDeg: 0, n: 0 }
  let c = 0, s = 0
  for (const a of anglesDeg) { c += Math.cos(a * RAD); s += Math.sin(a * RAD) }
  c /= n; s /= n
  return { R: Math.hypot(c, s), meanDeg: (Math.atan2(s, c) / RAD + 360) % 360, n }
}

/** Small seeded generator (mulberry32), so a simulation can be repeated exactly. */
export function seededRandom (seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6D2B79F5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Format a p-value the way a reader can act on. */
/** The N in "1 in N": whole below 1,000, two significant figures above (1 in 98,000, not 1 in 97,714). */
export function oneIn (p) {
  const n = 1 / p
  return n < 1000 ? Math.max(1, Math.round(n)) : +n.toPrecision(2)
}
