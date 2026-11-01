// Which extreme objects count. The reader no longer chooses: every page uses
// the trusted sample (as the papers do) or, where it says so, every object.

import { angleDiff, PLANET_NINE } from './orbits.js'


/** The fixed samples every page describes, so quoted numbers never move: the trusted one, and every object. */
export const STRICT = { aMin: 150, qMin: 30, aMax: Infinity, qMax: Infinity, quality: true }
export const LOOSE = { ...STRICT, quality: false }

/** The objects that pass a sample definition. */
export function selected (etnos, s) {
  return etnos.filter(o =>
    o.a_au >= s.aMin && o.a_au <= s.aMax &&
    (o.q_au ?? 0) >= s.qMin && (o.q_au ?? 0) <= s.qMax &&
    (!s.quality || o.well_determined))
}

/** Tag each object with which side of the predicted planet it points. */
export function withAlignment (objects) {
  return objects.map(o => {
    const d = angleDiff(o.varpi_deg, PLANET_NINE.varpi_deg)
    return { ...o, delta_varpi_deg: d, alignment: Math.abs(d) > 90 ? 'anti-aligned' : 'aligned' }
  })
}
