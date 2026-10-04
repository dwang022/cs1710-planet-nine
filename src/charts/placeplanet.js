// Sketch "put the planet anywhere" + physical properties.
//
// The user dials in an orbit; we score it against published constraints.
// Every term in the score traces to a number we verified from a paper:
//
//  A. Anti-alignment. Batygin & Brown's mechanism requires the planet's
//     perihelion to sit ~180 degrees from the clustered objects'. We measure
//     against the mean direction of the CURRENT sample, which is real data.
//  B. Agreement with Brown & Batygin (2021) marginalized posterior:
//     a = 460.7 +178.8/-103.3 AU, e = 0.3 +/-0.1, i = 15.6 +5.2/-5.4 deg.
//  C. Already-searched. Brown & Batygin (2024) rule out the planet to V=21.5
//     over most of the sky; a planet bright enough to have been seen, but not
//     seen, is disfavoured.

import * as d3 from 'd3'
import { orbitPath, positionAt } from '../orbits.js'

// Linder & Mordasini (2016) publish a 10 Mearth / 700 AU model: R = 3.7 Rearth,
// T_eff = 47 K. We scale from that single anchor; the scaling is OURS.
const LM_ANCHOR = { mass: 10, dist: 700, radius: 3.7, teff: 47, V: 21.7 }

export function physicalProperties (massEarths, distanceAu, albedo) {
  // Sub-Neptune mass-radius scaling, anchored on Linder & Mordasini's point.
  const radius = LM_ANCHOR.radius * Math.pow(massEarths / LM_ANCHOR.mass, 0.27)
  // Residual internal heat dominates; cooling luminosity scales roughly with
  // mass, and T_eff with (L/R^2)^(1/4).
  const teff = LM_ANCHOR.teff * Math.pow(massEarths / LM_ANCHOR.mass, 0.17)
    * Math.pow(LM_ANCHOR.radius / radius, 0.5)
  // Reflected light: flux ~ albedo * R^2 / d^4.
  const dV = -2.5 * Math.log10(
    (albedo / 0.4) * Math.pow(radius / LM_ANCHOR.radius, 2) *
    Math.pow(LM_ANCHOR.dist / distanceAu, 4))
  return { radius, teff, V: LM_ANCHOR.V + dV }
}

/** Score a user-placed planet, 0-100, with the reasons broken out. */
export function scorePlanet ({ a, e, i, varpi }, observedMeanVarpi, albedo, mass) {
  const terms = []

  // A. anti-alignment with the real objects
  const sep = Math.abs(((varpi - observedMeanVarpi + 540) % 360) - 180)
  const antiScore = Math.max(0, 1 - Math.abs(sep - 180) / 90)
  terms.push({
    key: 'Points opposite the objects',
    score: antiScore,
    detail: `${Math.abs(sep).toFixed(0)}° from the cluster — the mechanism needs about 180°`,
    cite: 'Batygin & Brown 2016',
  })

  // B. agreement with the published posterior
  const gauss = (v, mu, lo, hi) => Math.exp(-0.5 * Math.pow((v - mu) / (v < mu ? lo : hi), 2))
  const aS = gauss(a, 460.7, 103.3, 178.8)
  const eS = gauss(e, 0.30, 0.1, 0.1)
  const iS = gauss(i, 15.6, 5.4, 5.2)
  terms.push({
    key: 'Matches the published orbit fit',
    score: (aS + eS + iS) / 3,
    detail: `a ${a.toFixed(0)} AU vs 461 (+179/−103) · e ${e.toFixed(2)} vs 0.30±0.10 · i ${i.toFixed(0)}° vs 16°±5`,
    cite: 'Brown & Batygin 2021, Fig. 8',
  })

  // C. would we already have found it?
  // Use the time-averaged orbital distance a(1 + e^2/2): by Kepler's second law
  // an eccentric body spends most of its time near the far end of its orbit,
  // which is why the papers quote magnitudes "near aphelion".
  const typicalDist = a * (1 + e * e / 2)
  const { V } = physicalProperties(mass, typicalDist, albedo)
  const hideScore = V > 21.5 ? 1 : Math.max(0, (V - 19) / 2.5)
  terms.push({
    key: 'Could still be undetected',
    score: hideScore,
    detail: V > 21.5
      ? `brightness V ≈ ${V.toFixed(1)} — fainter than every search so far, so it could still be hiding`
      : `brightness V ≈ ${V.toFixed(1)} — Pan-STARRS1 reached V 21.5 and found nothing, so this spot is largely ruled out`,
    cite: 'Brown & Batygin 2024 (V = 21.5 limit)',
  })

  const total = Math.round(100 * d3.mean(terms, t => t.score))
  return { total, terms, V }
}

/** Small top-down diagram of the user's planet against the real objects. */
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

  const obj = g.selectAll('path.o').data(objects, d => d.id)
  obj.exit().remove()
  obj.enter().append('path').attr('class', 'o').attr('fill', 'none')
    .merge(obj)
    .attr('d', d => line(orbitPath(d.a_au, d.e, d.i_deg, d.node_deg, d.argperi_deg)))
    .attr('stroke', 'var(--series-1)').attr('stroke-width', 1).attr('opacity', 0.32)

  const argperi = (planet.varpi - planet.node + 360) % 360
  g.selectAll('path.user').data([planet]).join('path')
    .attr('class', 'user').attr('fill', 'none')
    .attr('stroke', 'var(--series-2)').attr('stroke-width', 3)
    .attr('d', d => line(orbitPath(d.a, d.e, d.i, d.node, argperi)))

  g.selectAll('circle.userperi').data([planet]).join('circle')
    .attr('class', 'userperi').attr('r', 7)
    .attr('fill', 'var(--series-2)')
    .attr('stroke', 'var(--surface-1)').attr('stroke-width', 2)
    .attr('cx', d => px(positionAt(d.a, d.e, d.i, d.node, argperi, 0)))
    .attr('cy', d => py(positionAt(d.a, d.e, d.i, d.node, argperi, 0)))

  svg.selectAll('circle.sun').data([0]).join('circle')
    .attr('class', 'sun').attr('cx', cx).attr('cy', cy).attr('r', 3.5)
    .attr('fill', 'var(--sun)')
}
