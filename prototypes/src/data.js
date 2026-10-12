// Shared data + selection logic for both prototypes.
//
// Data is the same verified ETNO table the main site uses (90 objects,
// a > 150 AU, q > 30 AU; JPL elements cross-checked against the MPC).

import { resultant, rayleighP, nullDistribution } from './stats.js'

export async function loadObjects () {
  const r = await fetch('/data/etnos.json')
  if (!r.ok) throw new Error(`etnos.json → ${r.status}`)
  return r.json()
}

/**
 * A selection is a box in (a, q) space plus an optional quality requirement.
 * Crucially, none of these axes is the longitude of perihelion: selecting on
 * the angle we then test for clustering would guarantee a result.
 */
export function applySelection (objects, sel) {
  if (!sel) return objects
  return objects.filter(o =>
    o.a_au >= sel.a0 && o.a_au <= sel.a1 &&
    o.q_au >= sel.q0 && o.q_au <= sel.q1 &&
    (!sel.qualityOnly || o.well_determined))
}

/** Everything the downstream views need, for one selection. */
export function summarise (objects, trials = 3000) {
  const stats = resultant(objects.map(o => o.varpi_deg))
  const p = rayleighP(stats.n, stats.R)
  const nd = nullDistribution(Math.max(stats.n, 2), trials)
  const beat = nd.values.filter(v => v >= stats.R).length
  return { ...stats, p, nullDist: nd, beat, objects }
}

export function fmtOdds (p) {
  if (!isFinite(p) || p <= 0) return '—'
  return `1 in ${Math.round(1 / p).toLocaleString()}`
}

export const VERDICT = p =>
  p < 0.01 ? { text: 'beats chance', tone: 'good' }
    : p < 0.05 ? { text: 'suggestive', tone: 'mid' }
      : { text: 'looks like luck', tone: 'bad' }
