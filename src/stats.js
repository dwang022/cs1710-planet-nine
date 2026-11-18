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

/**
 * Rayleigh test for uniformity on the circle. Returns the probability that a
 * sample of n directions drawn uniformly at random would be at least as
 * concentrated as the observed R.
 *
 * Series expansion from Mardia & Jupp, Directional Statistics. Verified against
 * a 200,000-trial Monte Carlo at every sample cut used here: agreement within
 * 5%, and within 1% everywhere except the smallest p-values.
 */
export function rayleighP (n, R) {
  if (n < 2) return 1
  const z = n * R * R
  const p = Math.exp(-z) * (
    1 + (2 * z - z * z) / (4 * n)
      - (24 * z - 132 * z * z + 76 * z ** 3 - 9 * z ** 4) / (288 * n * n)
  )
  return Math.min(1, Math.max(0, p))
}

/**
 * Monte Carlo null: draw `trials` samples of n uniform random directions and
 * return their R values, binned. This is what the histogram shows - the same
 * procedure the user could run by hand, not a formula they have to trust.
 */
export function nullDistribution (n, trials = 4000, bins = 40, random = Math.random) {
  const counts = new Array(bins).fill(0)
  const values = []
  for (let t = 0; t < trials; t++) {
    let c = 0, s = 0
    for (let i = 0; i < n; i++) {
      const a = random() * 2 * Math.PI
      c += Math.cos(a); s += Math.sin(a)
    }
    const R = Math.hypot(c / n, s / n)
    values.push(R)
    counts[Math.min(bins - 1, Math.floor(R * bins))]++
  }
  return { counts, bins, trials, values }
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

export function formatP (p) {
  const odds = `about 1 in ${oneIn(p).toLocaleString()}`
  if (p >= 0.2) return { text: p.toFixed(2), odds }
  if (p >= 0.001) return { text: p.toFixed(3), odds }
  return { text: p.toExponential(1), odds }
}
