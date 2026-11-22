// Which extreme objects count. The reader never chooses: every page uses the trusted sample, as the papers do
// (beyond 150 AU on average, closest point beyond 30 AU, seen in more than one year).

/** The fixed sample every page describes, so quoted numbers never move. */
export const STRICT = { aMin: 150, qMin: 30, aMax: Infinity, qMax: Infinity, quality: true }

/** The objects that pass a sample definition. */
export function selected (etnos, s) {
  return etnos.filter(o =>
    o.a_au >= s.aMin && o.a_au <= s.aMax &&
    (o.q_au ?? 0) >= s.qMin && (o.q_au ?? 0) <= s.qMax &&
    (!s.quality || o.well_determined))
}
