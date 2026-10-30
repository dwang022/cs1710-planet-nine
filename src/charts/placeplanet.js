// Put a planet out there: the reader dials in an orbit and a mass, and the planet
// is scored against three published constraints, each traced to a paper:
//
//  A. Anti-alignment. Batygin & Brown's mechanism needs the planet's closest
//     point about 180 degrees from the clustered objects'. Measured against the
//     mean direction of the reader's current sample, which is real data.
//  B. Agreement with the Brown & Batygin (2021) fit (Figure 8 medians):
//     a = 460.7 +178.8/-103.3 AU, e = 0.3 +/-0.1, i = 15.6 +5.2/-5.4 deg.
//  C. Could it still be hiding? The share of its orbit the planet spends fainter
//     than the searches' 50% depth (Brown, Holman & Batygin 2024: V = 21.5).
//
// The brightness model is read from planet_nine_predictions.json
// (physical_properties.brightness_model), where every number carries its source:
// radius = mass / 3 Earth radii (the rule the 2021 fit and the 2024 search use),
// Neptune's albedo, and the standard reflected-light magnitude, which reproduces
// Linder & Mordasini's published V for their model planets. Temperature is read
// off Linder & Mordasini's grid. Why m/3 and not their larger radii is said in the
// data file's `_choice`.

import * as d3 from 'd3'
import { orbitPath, positionAt } from '../orbits.js'

const EARTH_KM = 6371

/** The model from physical_properties.brightness_model: width, temperature and magnitude from mass and distance. */
export function brightnessModel (bm) {
  const grid = bm.linder_mordasini_grid
  const lm = grid.mass_earths.map(Math.log)
  const radius = m => m / 3
  // temperature: linear in log mass between the grid's points; outside the grid, no number (see `inGrid`)
  const teff = m => {
    const x = Math.log(m)
    const k = Math.max(0, Math.min(lm.length - 2, d3.bisectRight(lm, x) - 1))
    const t = (x - lm[k]) / (lm[k + 1] - lm[k])
    return grid.T_eff_K[k] + t * (grid.T_eff_K[k + 1] - grid.T_eff_K[k])
  }
  const magnitude = (m, r, p = bm.albedo.value) =>
    5 * Math.log10(1329 / (2 * radius(m) * EARTH_KM * Math.sqrt(p))) + 5 * Math.log10(r * (r - 1))
  return {
    radius, teff, magnitude,
    albedo: bm.albedo.value,
    limitV: bm.detection.V_50pct,
    tempRange: [grid.mass_earths[0], grid.mass_earths[grid.mass_earths.length - 1]],
    coolest: grid.T_eff_K[0],
  }
}

/**
 * Brightness along the orbit, and the share of the time the planet spends fainter
 * than the searches' limit. Where on its orbit it is now is unknown, so every point
 * counts by the time spent there: uniform steps in mean anomaly, Kepler's equation
 * for the distance.
 */
export function orbitBrightness ({ a, e, mass }, model, n = 720) {
  let hidden = 0
  for (let k = 0; k < n; k++) {
    const M = 2 * Math.PI * (k + 0.5) / n
    let E = M
    for (let it = 0; it < 30; it++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    const r = a * (1 - e * Math.cos(E))
    if (model.magnitude(mass, r) > model.limitV) hidden++
  }
  return {
    brightest: model.magnitude(mass, a * (1 - e)),
    faintest: model.magnitude(mass, a * (1 + e)),
    hidden: hidden / n,
  }
}

/**
 * Score a user-placed planet, 0-100, with the reasons broken out. Each term's
 * `cite` is the slug of its paper on the credits page (credits.html#cite-...).
 */
export function scorePlanet (planet, observedMeanVarpi, model) {
  const { a, e, i, varpi } = planet
  const terms = []

  // A. anti-alignment with the real objects
  const sep = Math.abs(((varpi - observedMeanVarpi + 540) % 360) - 180)
  terms.push({
    key: 'Points away from the objects',
    score: Math.max(0, 1 - Math.abs(sep - 180) / 90),
    detail: `${sep.toFixed(0)}° from them; about 180° needed`,
    cite: 'batygin-brown-2016',
  })

  // B. agreement with the published fit
  const POST = { a: [460.7, 103.3, 178.8], e: [0.30, 0.1, 0.1], i: [15.6, 5.4, 5.2] }
  const gauss = (v, [mu, lo, hi]) => Math.exp(-0.5 * Math.pow((v - mu) / (v < mu ? lo : hi), 2))
  const span = ([mu, lo, hi], f) => `${f(mu - lo)}–${f(mu + hi)}`
  terms.push({
    key: 'Matches the published fit',
    score: (gauss(a, POST.a) + gauss(e, POST.e) + gauss(i, POST.i)) / 3,
    detail: `<span class="k-au">${a.toFixed(0)} AU</span> (fit ${span(POST.a, v => v.toFixed(0))}) · stretch ${e.toFixed(2)} (${span(POST.e, v => v.toFixed(1))}) · tilt ${i.toFixed(0)}° (${span(POST.i, v => v.toFixed(0))}°)`,
    cite: 'brown-batygin-2021',
  })

  // C. would the searches have seen it?
  const b = orbitBrightness(planet, model)
  terms.push({
    key: 'Could still be hiding',
    score: b.hidden,
    detail: `magnitude ${b.brightest.toFixed(1)} to ${b.faintest.toFixed(1)} along its orbit; searches reached ${model.limitV}`,
    cite: 'brown-batygin-2024',
  })

  return { total: Math.round(100 * d3.mean(terms, t => t.score)), terms, brightness: b }
}

/** Top-down picture of the reader's planet against the real extreme orbits. */
export function drawPlacement (root, { objects, planet, maxAu }) {
  const S = 460, cx = S / 2, cy = S / 2
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${S} ${S}`)
    .attr('role', 'img')
    .attr('aria-label', 'Your planet drawn against the real extreme orbits, seen from above.')

  const r = d3.scaleLinear().domain([0, maxAu]).range([0, S / 2 - 10])
  const px = p => cx + r(p[0]), py = p => cy - r(p[1])
  const line = d3.line().x(px).y(py)

  let g = svg.select('g.pp')
  if (g.empty()) {
    const defs = svg.append('defs')
    const cp = defs.append('clipPath').attr('id', 'pp-clip')
    cp.append('circle').attr('cx', cx).attr('cy', cy).attr('r', S / 2 - 10)
    g = svg.append('g').attr('class', 'pp').attr('clip-path', 'url(#pp-clip)')
  }

  g.selectAll('circle.ring').data(r.ticks(3).filter(d => d > 0)).join('circle')
    .attr('class', 'ring').attr('cx', cx).attr('cy', cy).attr('r', d => r(d))
    .attr('fill', 'none').attr('stroke', 'var(--rule)')
  // the rings say how far out they are, in AU (lime, like every distance on the site)
  g.selectAll('text.ringl').data(r.ticks(3).filter(d => d > 0)).join('text')
    .attr('class', 'ringl axis-label au halo').attr('x', cx + 4).attr('y', d => cy - r(d) - 4).text(d => `${d} AU`)

  const obj = g.selectAll('path.o').data(objects, d => d.id)
  obj.exit().remove()
  obj.enter().append('path').attr('class', 'o').attr('fill', 'none')
    .merge(obj)
    .attr('d', d => line(orbitPath(d.a_au, d.e, d.i_deg, d.node_deg, d.argperi_deg)))
    .attr('stroke', 'var(--series-1)').attr('stroke-width', 1).attr('opacity', 0.32)

  // The reader's planet is a Planet Nine, so it takes the chosen skin's colour and icon, at its closest point.
  const argperi = (planet.varpi - planet.node + 360) % 360
  g.selectAll('path.user').data([planet]).join('path')
    .attr('class', 'user').attr('fill', 'none')
    .attr('stroke', 'var(--p9)').attr('stroke-width', 3)
    .attr('d', d => line(orbitPath(d.a, d.e, d.i, d.node, argperi)))

  const ICON = 30
  const peri = positionAt(planet.a, planet.e, planet.i, planet.node, argperi, 0)
  svg.selectAll('use.userperi').data([planet]).join('use')
    .attr('class', 'userperi').attr('href', '#art-planet-nine')
    .attr('width', ICON).attr('height', ICON)
    .attr('x', px(peri) - ICON / 2).attr('y', py(peri) - ICON / 2)

  svg.selectAll('use.sun').data([0]).join('use')
    .attr('class', 'sun').attr('href', '#art-sun')
    .attr('x', cx - 7).attr('y', cy - 7).attr('width', 14).attr('height', 14)
}
