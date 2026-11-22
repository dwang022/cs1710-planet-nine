// The brightness model for Planet Nine, used by the search page's sky story and its spotting game: from a mass and a
// distance, the planet's width, temperature and visual magnitude.
//
// The model is read from planet_nine_predictions.json (physical_properties.brightness_model), where every number
// carries its source: radius = mass / 3 Earth radii (the rule the 2021 fit and the 2024 search use), Neptune's albedo,
// and the standard reflected-light magnitude, which reproduces Linder & Mordasini's published V for their model
// planets. Temperature is read off Linder & Mordasini's grid. Why m/3 and not their larger radii is said in the data
// file's `_choice`.

import * as d3 from 'd3'

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
  // the same formula from a width in Earth radii directly (the Hide Planet Nine game sets the width, not the mass)
  const magnitudeR = (radiusEarths, r, p = bm.albedo.value) =>
    5 * Math.log10(1329 / (2 * radiusEarths * EARTH_KM * Math.sqrt(p))) + 5 * Math.log10(r * (r - 1))
  const magnitude = (m, r, p = bm.albedo.value) => magnitudeR(radius(m), r, p)
  return {
    radius, teff, magnitude, magnitudeR,
    albedo: bm.albedo.value,
    limitV: bm.detection.V_50pct,
    tempRange: [grid.mass_earths[0], grid.mass_earths[grid.mass_earths.length - 1]],
    coolest: grid.T_eff_K[0],
  }
}
