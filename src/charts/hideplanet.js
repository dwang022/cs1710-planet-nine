// Hide Planet Nine (search/how.html, #build, version 2): the reader makes a planet of their own and asks whether the
// telescopes so far could have seen it. An experiment beside the original "Put a planet out there" (version 1).
//
// Three dials (distance, width, reflectivity) set how bright the planet would look; a click on the sky map sets
// where it is. Everything the game says is read from the data or computed from it:
//   - brightness: the reflected-light magnitude the search papers use (brightness_model in
//     planet_nine_predictions.json, via brightnessModel in charts/placeplanet.js), seen at opposition. It is an
//     estimate for a made-up planet, and the card says so beside the papers' own expectation (V about 22);
//   - what the photos reach at that spot: the deepest single-photo limit among the surveys whose outline covers it
//     (surveys.json; outlines are simplified bands sized to each survey's published area, said so in the caption);
//   - what the searches catch: the combined ZTF, DES and Pan-STARRS1 search finds 94% of planets brighter than
//     V 20.5 and half at 21.5 (Brown, Holman & Batygin 2024), and its surviving space lies near the Milky Way.
// There is no score. The verdict is one of three plain outcomes, and a spot no survey covers is "insufficient
// survey information", never a successful hiding place.
//
// "Does your planet fit the orbital evidence?" (folded) compares the planet with the 2021 fit's published ranges and
// with the real objects' average direction; each line says inside or outside, nothing is added up.

import * as d3 from 'd3'
import { mollweideIn, footprintDec, deepestAt, galacticLatitude, galacticPoint, SKY_COVER_OPACITY } from './skymap.js'
import { magColour, MAG_DOMAIN } from './skysearch.js'
import { svgMarkup } from '../art.js'
import { currentSkin } from '../site.js'
import { animateValue } from '../motion.js'

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
const D = Math.PI / 180

// the map: the same projection, orientation and colour scale as the photographed sky
const MW = 900, MH = 460, OX = 10, OY = 10, OW = 880, OH = 440
const moll = mollweideIn(OX, OY, OW, OH)
const clampRA = ra => Math.min(359.99, Math.max(0.01, ra))
const P = (ra, dec) => moll(clampRA(ra), dec)
/** The inverse: a point on the map back to [RA, Dec], or null outside the oval. */
function unproject (x, y) {
  const u = (x - (OX + OW / 2)) / (OW / 2) * 2 * Math.SQRT2, v = ((OY + OH / 2) - y) / (OH / 2) * Math.SQRT2
  if ((u / (2 * Math.SQRT2)) ** 2 + (v / Math.SQRT2) ** 2 > 1) return null
  const th = Math.asin(Math.max(-1, Math.min(1, v / Math.SQRT2)))
  const dec = Math.asin(Math.max(-1, Math.min(1, (2 * th + Math.sin(2 * th)) / Math.PI))) / D
  const lam = Math.PI * u / (2 * Math.SQRT2 * Math.cos(th))
  return [((180 - lam / D) % 360 + 360) % 360, dec]
}
const lineOn = pts => {
  const segs = []; let cur = [], prev = null
  for (const [ra, dec] of pts) { if (prev !== null && Math.abs(ra - prev) > 180) { segs.push(cur); cur = [] } cur.push(P(ra, dec)); prev = ra }
  segs.push(cur)
  return segs.filter(s => s.length > 1).map(s => d3.line()(s)).join(' ')
}

const SEARCHED = ['ps1', 'ztf', 'des']
const MARK_R = 19               // the map marker's planet, in screen pixels: 38 across        // the surveys the 2024 combined search used
const fmt1 = v => v.toFixed(1)

/**
 * Draws the game into `root`. Returns { show() } for when its version is switched to.
 *   surveys, track      surveys.json's list (with .short names), p9_sky_track.json
 *   model               brightnessModel(...)
 *   fit, after          the 2021 fit (Figure 8 medians) and the 2024 update, from planet_nine_predictions.json
 *   detection           { v94, v50 }, the combined searches' efficiency (brightness_model.detection)
 *   objects, meanVarpi  the trusted sample with its perihelion longitudes, and their average direction
 *   cite(slug, n)       a superscript to the credits page
 */
export function drawHideGame (root, { surveys, track, model, fit, after, detection, objects, meanVarpi, cite }) {
  // --- the dials. Ranges from the papers: reflectivity is Brown & Batygin's 0.2 to 0.75; widths cover the 2021 fit's
  // mass range under the papers' rule (mass / 3) and Linder & Mordasini's larger model planets; distances span
  // everywhere the 2021 fit's orbits reach, with room either side.
  const DEFAULT = {
    r: after?.current_distance_au ?? Math.round(fit.a_au),
    w: +(fit.mass_earths / 3).toFixed(1),
    p: model.albedo,
    ra: track.aphelion.ra_deg, dec: track.aphelion.dec_deg,
    varpi: Math.round(fit.varpi_deg), i: Math.round(fit.i_deg),
  }
  const DIALS = [
    { k: 'r', label: 'Distance from the Sun', min: 200, max: 1000, step: 10, show: v => `<span class="k-au">${v}&nbsp;AU</span>` },
    { k: 'w', label: 'Size', min: 1.5, max: 6.5, step: 0.1, show: v => `${(+v).toFixed(1)}× Earth’s width` },
    { k: 'p', label: 'Reflectivity', min: fit.albedo_range[0], max: fit.albedo_range[1], step: 0.01, show: v => `albedo ${(+v).toFixed(2)}` },
  ]
  const ADV = [
    { k: 'varpi', label: 'Which way its orbit points', min: 0, max: 359, step: 1, show: v => `${v}°` },
    { k: 'i', label: 'Tilt', min: 0, max: 45, step: 1, show: v => `${v}°` },
  ]
  const st = { ...DEFAULT }

  // the 2021 fit's published ranges, for the orbital evidence panel
  const aLo = fit.a_au + fit.a_au_err[0], aHi = fit.a_au + fit.a_au_err[1]
  const rangeR = [aLo * (1 - fit.e), aHi * (1 + fit.e)]                        // closest to farthest, over the fit's a
  const mLo = fit.mass_earths + fit.mass_earths_err[0], mHi = fit.mass_earths + fit.mass_earths_err[1]
  const rangeW = [mLo / 3, mHi / 3]
  const rangeVarpi = [fit.varpi_deg + fit.varpi_deg_err[0], fit.varpi_deg + fit.varpi_deg_err[1]]
  const rangeI = [fit.i_deg + fit.i_deg_err[0], fit.i_deg + fit.i_deg_err[1]]

  const dial = d => `<label class="hp-dial" for="hp-${d.k}"><span class="hp-dial-k"><span>${d.label}</span> <b id="hp-v-${d.k}">${d.show(st[d.k])}</b></span>
    <input type="range" id="hp-${d.k}" min="${d.min}" max="${d.max}" step="${d.step}" value="${st[d.k]}"></label>`

  root.innerHTML = `
    <div class="hp">
      <div class="hp-left">
        <div class="hp-left-head"><p class="hp-k">Your Planet Nine</p>
          <button type="button" class="hp-reset" id="hp-reset" aria-label="Reset planet"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 6.2A5 5 0 1 1 3 9.6"/><path d="M2.6 2.8v3.6h3.6"/></svg><span>Reset</span></button></div>
        <div class="hp-planet"><svg viewBox="-120 -120 240 240" aria-hidden="true">
          <defs><radialGradient id="hp-glow"><stop offset=".62" style="stop-color:var(--p9);stop-opacity:.42"/><stop offset=".8" style="stop-color:var(--p9);stop-opacity:.16"/><stop offset="1" style="stop-color:var(--p9);stop-opacity:0"/></radialGradient></defs>
          <g class="hp-scale"><circle class="hp-halo" r="118" fill="url(#hp-glow)"/><g class="hp-art"></g><circle class="hp-veil" r="88"/></g>
        </svg></div>
        <dl class="hp-facts">
          <div><dt>Distance</dt><dd id="hp-f-r"></dd></div>
          <div><dt>Size</dt><dd id="hp-f-w"></dd></div>
          <div><dt>Reflectivity</dt><dd id="hp-f-p"></dd></div>
          <div class="is-mag"><dt>Brightness</dt><dd><span class="hp-mag-word">magnitude</span> <b id="hp-f-v">—</b></dd></div>
        </dl>
        <div class="hp-dials">${DIALS.map(dial).join('')}</div>
        <!-- how the brightness is worked out, folded under the dials: the reflected-light law, a live comparison with the
             starting planet (read from the same model.magnitudeR the game uses, so it can never disagree with the
             magnitude above), and what the law assumes. It replaced the one-line note of rules of thumb. -->
        <details class="hp-calc">
          <summary>How is brightness calculated?</summary>
          <div class="hp-calc-in">
            <p class="hp-calc-f"><span aria-hidden="true">F ∝ <i>A</i> · <i>R</i><sup>2</sup> / <i class="is-d">d</i><sup>4</sup></span>
              <span class="hp-sr">Brightness is proportional to albedo times radius squared, divided by distance to the fourth power.</span></p>
            <p class="hp-calc-terms"><i>A</i> albedo · <i>R</i> radius · <i class="is-d">d</i> distance</p>
            <div class="hp-calc-live">
              <p class="hp-calc-x"><b id="hp-c-x">1×</b> <span>the starting brightness</span> <span class="hp-calc-mag">magnitude <b id="hp-c-v">—</b></span></p>
            </div>
            <p class="hp-calc-note">Farther = fainter. Bigger or more reflective = brighter.</p>
          </div>
        </details>
      </div>
      <div class="hp-right">
        <div class="hp-map pic">
        <div class="hp-key legend" aria-hidden="true">
          <div class="legend-item"><span class="legend-swatch" style="background:var(--sky-empty);border:1px solid #ffffff38"></span><span>no photos here</span></div>
          <div class="legend-item"><span>photos reach magnitude</span><svg class="mag-key" viewBox="-8 0 136 28" style="width:136px;height:28px">
            <defs><linearGradient id="hp-ramp">${d3.range(0, 1.001, 0.1).map(t => `<stop offset="${t}" stop-color="${magColour(MAG_DOMAIN[0] + t * (MAG_DOMAIN[1] - MAG_DOMAIN[0]))}"/>`).join('')}</linearGradient></defs>
            <rect x="0" y="1" width="120" height="10" rx="2" fill="var(--sky-empty)"/><rect x="0" y="1" width="120" height="10" rx="2" fill="url(#hp-ramp)" opacity="${SKY_COVER_OPACITY}"/>${[20, 22, 24, 26].map(m => `<text x="${((m - MAG_DOMAIN[0]) / (MAG_DOMAIN[1] - MAG_DOMAIN[0]) * 120).toFixed(1)}" y="25">${m}</text>`).join('')}</svg><span class="mag-ends">deeper →</span></div>
          <div class="legend-item"><span class="legend-line" style="background:var(--p9);height:3px"></span><span>predicted path (2021 fit)</span></div>
          <div class="legend-item"><span class="legend-swatch" style="background:#dcc48a;opacity:.6"></span><span>Milky Way</span></div>
          <div class="legend-item"><span class="legend-swatch" style="background:transparent;border:2px dashed var(--series-4)"></span><span>Rubin, from 2026</span></div>
        </div>
        <svg viewBox="0 0 ${MW} ${MH}" role="application" tabindex="0"
          aria-label="Sky map. Click, or use the arrow keys, to move your planet."></svg>
          <p class="pic-note hp-map-note">Click the map to move your planet</p>
</div>
        <div class="hp-ruler"><svg viewBox="0 0 1000 66" aria-hidden="true"></svg><p class="hp-ruler-ends" aria-hidden="true"><span>← brighter</span><span>fainter →</span></p></div>
        <!-- the result: the verdict first and largest, in its status colour, with one sentence on why; under it the two
             measurements it rests on, each a small label, a large number and a short line; the two buttons beside -->
        <div class="hp-out" aria-live="polite">
          <div class="hp-out-main">
            <p class="hp-res-k">Search status</p>
            <p class="hp-res-verdict" id="hp-r-x"></p>
            <p class="hp-res-why" id="hp-r-why"></p>
          </div>
          <div class="hp-out-metrics">
            <div class="hp-metric"><p class="hp-res-k">Predicted brightness</p><p class="hp-metric-v" id="hp-r-v"></p><p class="hp-metric-d" id="hp-r-vd"></p></div>
            <div class="hp-metric"><p class="hp-res-k">Telescope sensitivity</p><p class="hp-metric-v" id="hp-r-s"></p><p class="hp-metric-d" id="hp-r-sd"></p></div>
          </div>
        </div>
      </div>
    </div>
    <details class="hp-orbit">
      <summary>Does your planet fit the orbital evidence?</summary>
      <div class="hp-orbit-in">
        <svg class="hp-dir" viewBox="-130 -130 260 260" aria-hidden="true"></svg>
        <div>
          <div class="hp-dials">${ADV.map(dial).join('')}</div>
          <ul class="hp-checks" id="hp-checks"></ul>
        </div>
      </div>
    </details>`

  const $ = s => root.querySelector(s)
  const map = d3.select(root).select('.hp-map > svg')     // the map itself, not the key's colour ramp beside it
  const ruler = d3.select(root).select('.hp-ruler svg')

  // --- the planet: the reader's own Planet Nine (the skin chosen on the intro), without its question mark, scaled by
  // its width; a veil darkens it as its reflectivity falls (an illustration of "darker", not a measurement)
  const art = d3.select(root).select('.hp-art')
  const drawArt = skin => art.html(`<g transform="translate(-110,-110)">${svgMarkup('planet-nine', { size: 220, skin, question: false })}</g>`)
  // the map's marker: the same drawing at 100 units, scaled to its size on screen by sizeHint
  const drawMarker = skin => map.select('.hp-you-art').html(svgMarkup('planet-nine', { size: 100, skin, question: false }))
  drawArt(currentSkin())
  document.addEventListener('p9:skin', e => { drawArt(e.detail); drawMarker(e.detail) })

  // --- the map, drawn once: the oval, the surveys by depth (visible light, published area confirmed), the Milky Way,
  // Rubin's outline, the 2021 fit's path and its spread, and the reader's planet
  const ring = (s, ra0, ra1) => {
    const [d0, d1] = footprintDec(s), lo = Math.max(-88, d0), hi = Math.min(88, d1), r = []
    for (let ra = ra0; ra <= ra1; ra += 1.5) r.push(P(ra, lo))
    for (let d = lo; d <= hi; d += 1.5) r.push(P(ra1, d))
    for (let ra = ra1; ra >= ra0; ra -= 1.5) r.push(P(ra, hi))
    for (let d = hi; d >= lo; d -= 1.5) r.push(P(ra0, d))
    return d3.line()(r) + 'Z'
  }
  const optical = surveys.filter(s => s.wavelength === 'optical' && s.depth_mag != null && s.ra_ranges && footprintDec(s) && s.footprint_area_verified !== false)
  const outline = d3.line()(d3.range(0, 361, 4).map(a => [OX + OW / 2 + OW / 2 * Math.cos(a * D), OY + OH / 2 + OH / 2 * Math.sin(a * D)])) + 'Z'
  map.html(`<defs><clipPath id="hp-clip"><path d="${outline}"/></clipPath></defs>
    <path class="hp-oval" d="${outline}"/>
    <g clip-path="url(#hp-clip)">
      <g class="hp-fp" opacity="${SKY_COVER_OPACITY}">${optical.filter(s => !s.future).sort((a, b) => a.depth_mag - b.depth_mag)
        .flatMap(s => s.ra_ranges.map(([a, b]) => `<path d="${ring(s, a, b)}" fill="${magColour(s.depth_mag)}"/>`)).join('')}</g>
      <path class="hp-gal" d="${(() => {
        const split = arr => { const segs = []; let cur = [], prev = null; for (const [ra, dec] of arr) { if (prev !== null && Math.abs(ra - prev) > 180) { segs.push(cur); cur = [] } cur.push(P(ra, dec)); prev = ra } segs.push(cur); return segs.filter(s => s.length > 1) }
        const a = split(d3.range(0, 361, 2).map(l => galacticPoint(l, 15))), b = split(d3.range(0, 361, 2).map(l => galacticPoint(l, -15)))
        return d3.range(Math.min(a.length, b.length)).map(i => d3.line()(a[i].concat(b[i].slice().reverse())) + 'Z').join(' ')
      })()}"/>
      <g class="hp-grat">${[-60, -30, 0, 30, 60].map(dec => `<path d="${lineOn(d3.range(0, 361, 3).map(ra => [ra, dec]))}"/>`).join('')}</g>
      ${optical.filter(s => s.future).flatMap(s => s.ra_ranges.map(([a, b]) => `<path class="hp-rubin" d="${ring(s, a, b)}"/>`)).join('')}
      ${track.tracks.filter(t => t.label !== 'nominal').map(t => `<path class="hp-var" d="${lineOn(t.points.map(p => [p.ra_deg, p.dec_deg]))}"/>`).join('')}
      <path class="hp-path-edge" d="${lineOn(track.tracks.find(t => t.label === 'nominal').points.map(p => [p.ra_deg, p.dec_deg]))}"/>
      <path class="hp-path" d="${lineOn(track.tracks.find(t => t.label === 'nominal').points.map(p => [p.ra_deg, p.dec_deg]))}"/>
    </g>
    <path class="hp-oval-edge" d="${outline}"/>
    <g class="hp-labels" aria-hidden="true">${(() => {
      const [gRa, gDec] = galacticPoint(150, 0)
      const low = track.tracks.find(t => t.label === 'nominal').points.reduce((m, p) => p.dec_deg < m.dec_deg ? p : m)
      const at = (ra, dec) => P(ra, dec).map(v => v.toFixed(1))
      const [mx, my] = at(gRa, gDec), [rx, ry] = at(30, -48), [px, py] = at(low.ra_deg, low.dec_deg)
      return `<text class="hp-lbl is-milky" data-x="${mx}" data-y="${my}" data-dy="-12">Milky Way</text>
        <text class="hp-lbl is-rubin" data-x="${rx}" data-y="${ry}" data-dy="4">Rubin</text>
        <line class="hp-lbl-lead" data-x="${px}" data-y="${py}"/>
        <text class="hp-lbl is-path" data-x="${px}" data-y="${py}" data-dy="30">Predicted path</text>`
    })()}</g>
    <g class="hp-you"><circle class="hp-you-glow" r="22"/><circle class="hp-you-edge" r="12"/><g class="hp-you-scale"><g class="hp-you-art" transform="translate(-50,-50)"></g></g><text class="hp-lbl hp-lbl-you" aria-hidden="true">Your Planet Nine</text></g>
    <g class="hp-hint" aria-hidden="true"><text class="hp-hint-glow" y="-34">Move Me Around!</text><text class="hp-hint-t" y="-34">Move Me Around!</text></g>`)
  const you = map.select('.hp-you')
  drawMarker(currentSkin())
  // the hint over the marker, until the planet is first moved on the map (a drag, a click or the arrow keys); then it
  // fades and does not come back on this visit, Reset planet included
  const hint = map.select('.hp-hint')
  let hintDone = false
  function hintMoved () {
    if (hintDone) return
    hintDone = true
    hint.classed('is-gone', true)
  }

  // --- what is true at the spot the planet is in
  function at (ra, dec) {
    let best = null
    for (const s of optical) {
      if (s.future) continue
      if (deepestAt([s], ra, dec) === null) continue
      if (!best || s.depth_mag > best.depth_mag) best = s
    }
    const rubin = optical.find(s => s.future && deepestAt([s], ra, dec, { includeFuture: true }) !== null)
    const searched = surveys.some(s => SEARCHED.includes(s.id) && deepestAt([s], ra, dec) !== null)
    return { best, rubin, searched, crowded: Math.abs(galacticLatitude(ra, dec)) <= 15 }
  }
  // the outcome: one of three, from the planet's brightness and the facts at its spot
  function outcome (V, a) {
    if (!a.best) return { key: 'none', label: 'Insufficient survey information', why: 'No visible-light survey in our data covers this part of the sky.' }
    if (a.searched && !a.crowded && V <= detection.v50) {
      return { key: 'seen', label: 'Potentially detectable', why: `At magnitude ${fmt1(V)}, it is brighter than ${V <= detection.v94 ? `${detection.v94}, where the searches here catch 94% of planets` : `${detection.v50}, where the searches here still catch about half`}.` }
    }
    if (a.searched && a.crowded && V <= detection.v50) {
      return { key: 'hidden', label: 'Not ruled out by these observations', why: `Bright enough for the searches, but lost among the Milky Way’s crowded stars.` }
    }
    if (V <= a.best.depth_mag) {
      return { key: 'hidden', label: 'Not ruled out by these observations', why: `${a.best.short}’s photos here are deep enough to show it, but no published search has looked this faint.` }
    }
    return { key: 'hidden', label: 'Not ruled out by these observations', why: `At magnitude ${fmt1(V)}, it is fainter than the deepest photos here (${a.best.short}, ${a.best.depth_mag}).` }
  }

  // --- the ruler: magnitude along a line, with what reaches where
  const RX = d3.scaleLinear().domain([18, 26.5]).range([30, 970]).clamp(true)
  ruler.html(`<line class="hp-r-axis" x1="${RX(18)}" x2="${RX(26.5)}" y1="36" y2="36"/>
    ${d3.range(18, 27).map(m => `<line class="hp-r-tick" x1="${RX(m)}" x2="${RX(m)}" y1="32" y2="40"/><text class="hp-r-n" x="${RX(m)}" y="52">${m}</text>`).join('')}
    <text class="hp-r-end" x="${RX(18)}" y="64" text-anchor="start">brighter</text><text class="hp-r-end" x="${RX(26.5)}" y="64" text-anchor="end">fainter</text>
    <g class="hp-r-search" style="transform:translateX(${RX(detection.v50)}px)"><line y1="14" y2="40"/><text x="-6" y="10" text-anchor="end">searches find half</text></g>
    <g class="hp-r-photo"><line y1="14" y2="40"/><text x="6" y="10" text-anchor="start"></text></g>
    <g class="hp-r-rubin" style="transform:translateX(${RX(optical.find(s => s.future)?.depth_mag ?? 24.5)}px)"><line y1="18" y2="40"/><text y="10" text-anchor="middle">Rubin</text></g>
    <g class="hp-r-you"><circle cy="36" r="7"/></g>`)

  // --- the orbital evidence: a view from above, the objects' directions round a ring, their average, the direction
  // opposite it (where Batygin and Brown's planet points), the 2021 fit's spread, and the reader's planet
  const dir = d3.select(root).select('.hp-dir')
  const pt = (deg, r) => [r * Math.cos(deg * D), -r * Math.sin(deg * D)]
  const wedge = (a0, a1, r) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M0,0 L${x0},${y0} A${r},${r} 0 0 0 ${x1},${y1} Z` }
  dir.html(`<circle class="hp-d-ring" r="100"/>
    <path class="hp-d-fit" d="${wedge(rangeVarpi[0], rangeVarpi[1], 100)}"/>
    ${objects.map(o => { const [x, y] = pt(o.varpi_deg, 100); return `<circle class="hp-d-obj" cx="${x}" cy="${y}" r="5"/>` }).join('')}
    <line class="hp-d-mean" x1="0" y1="0" x2="${pt(meanVarpi, 82)[0]}" y2="${pt(meanVarpi, 82)[1]}"/>
    <line class="hp-d-opp" x1="0" y1="0" x2="${pt(meanVarpi + 180, 100)[0]}" y2="${pt(meanVarpi + 180, 100)[1]}"/>
    <circle class="hp-d-sun" r="6"/>
    <g class="hp-d-you"><line x1="0" y1="0" x2="88" y2="0"/><circle cx="88" r="7"/></g>
    <text class="hp-d-t" x="${pt(meanVarpi - 14, 58)[0]}" y="${pt(meanVarpi - 14, 58)[1] + 4}">their average</text>`)

  // --- drawing the state
  const dur = () => reduce.matches ? 0 : 450
  function update ({ moved = false } = {}) {
    const V = model.magnitudeR(st.w, st.r, st.p)
    const a = at(st.ra, st.dec)
    const out = outcome(V, a)
    // the planet: width and reflectivity
    d3.select(root).select('.hp-scale').style('transform', `scale(${(0.66 + 0.34 * (st.w - 1.5) / 5).toFixed(3)})`)
    d3.select(root).select('.hp-veil').style('opacity', ((0.75 - st.p) / 0.55 * 0.34).toFixed(3))
    $('#hp-f-r').innerHTML = `<span class="k-au">${st.r}&nbsp;AU</span>`
    $('#hp-f-w').textContent = `${st.w.toFixed(1)}× Earth’s width`
    $('#hp-f-p').textContent = `albedo ${st.p.toFixed(2)}`
    animateValue($('#hp-f-v'), V, (v, done) => { $('#hp-f-v').textContent = fmt1(done ? V : v) })
    calc(V)
    // the map's marker, glided to its spot
    const [x, y] = P(st.ra, st.dec)
    you.transition('move').duration(moved ? dur() : 0).ease(d3.easeCubicOut).attr('transform', `translate(${x},${y})`)
    if (!hintDone) hint.attr('transform', `translate(${x},${y})`)
    // a fixed label the marker (with its name under it) has come over steps back, so neither is covered; it comes back
    // when the marker moves on
    clearLabels(x, y)
    you.classed('is-seen', out.key === 'seen').classed('is-none', out.key === 'none')
    // the ruler
    ruler.select('.hp-r-you').style('transform', `translateX(${RX(V)}px)`).classed('is-seen', out.key === 'seen')
    ruler.select('.hp-r-photo').style('opacity', a.best ? 1 : 0).style('transform', `translateX(${RX(a.best?.depth_mag ?? 18)}px)`)
      .select('text').text(a.best ? `photos here: ${a.best.depth_mag}` : '')
    ruler.select('.hp-r-rubin').style('opacity', a.rubin ? 1 : 0.25)
    // the result: the verdict and its first sentence, then the two measurements
    const root2 = $('.hp-out')
    root2.dataset.key = out.key
    $('#hp-r-x').textContent = out.label
    $('#hp-r-why').textContent = out.why
    $('#hp-r-v').innerHTML = `${fmt1(V)}<span class="hp-metric-u">mag</span>`
    $('#hp-r-vd').textContent = V <= detection.v50 ? `Bright enough for the searches, which find half at ${detection.v50}` : `Fainter than ${detection.v50}, where the searches find only half`
    $('#hp-r-s').innerHTML = a.best ? `${a.best.depth_mag}<span class="hp-metric-u">mag</span>` : '—'
    $('#hp-r-sd').innerHTML = a.best
      ? `${a.best.short}’s photos here: <span class="${V <= a.best.depth_mag ? 'k-ok' : 'k-warn'}">${V <= a.best.depth_mag ? 'deep enough' : 'too shallow'}</span>`
      : 'No photos here in our data'
    checks(V)
    return { V, a, out }
  }
  // the brightness section: how bright the planet is next to the starting one (DEFAULT's dials), from the game's own
  // magnitudes (a ratio of fluxes is 10^(-0.4 ΔV)), and that magnitude
  // the three, so each dial's share is the ratio with only that dial moved, and the shares multiply to the whole.
  const V0 = model.magnitudeR(DEFAULT.w, DEFAULT.r, DEFAULT.p)
  const ratio = V => 10 ** (-0.4 * (V - V0))
  const times = x => d3.format('.2~r')(x)
  function calc (V) {
    const x = ratio(V)
    $('#hp-c-x').textContent = `${times(x)}×`
    $('#hp-c-v').textContent = fmt1(V)
  }
  function checks () {
    const inside = (v, [lo, hi]) => v >= lo && v <= hi
    const off = ((st.varpi - (meanVarpi + 180)) % 360 + 540) % 360 - 180
    const rows = [
      [inside(st.r, rangeR), `Distance: the 2021 fit’s orbits run from about <span class="k-au">${Math.round(rangeR[0])} to ${Math.round(rangeR[1])}&nbsp;AU</span>`],
      [inside(st.w, rangeW), `Size: its mass range, ${fmt1(mLo)} to ${fmt1(mHi)} Earth masses, means ${fmt1(rangeW[0])} to ${fmt1(rangeW[1])}× Earth’s width under the papers’ rule`],
      [inside(st.varpi, rangeVarpi), `Direction: your orbit points ${Math.abs(Math.round(off))}° from straight opposite the objects; the fit allows ${Math.round(rangeVarpi[0])}° to ${Math.round(rangeVarpi[1])}°`],
      [inside(st.i, rangeI), `Tilt: the fit allows ${Math.round(rangeI[0])}° to ${Math.round(rangeI[1])}°`],
    ]
    $('#hp-checks').innerHTML = rows.map(([ok, t]) => `<li class="${ok ? 'is-in' : 'is-out'}"><b>${ok ? 'Inside' : 'Outside'}</b><span>${t}</span></li>`).join('') +
      `<li class="hp-checks-src">The ranges are the 2021 fit’s${cite('brown-batygin-2021', 1)}; a planet pointing opposite the objects is what holds them in line in Batygin and Brown’s model${cite('batygin-brown-2016', 3)}. Nothing here is added up into a score.</li>`
    const [x, y] = pt(st.varpi, 88)
    dir.select('.hp-d-you line').attr('x2', x).attr('y2', y)
    dir.select('.hp-d-you circle').attr('cx', x).attr('cy', y)
  }

  // --- the controls
  for (const d of [...DIALS, ...ADV]) {
    const input = $(`#hp-${d.k}`)
    input.addEventListener('input', () => { st[d.k] = +input.value; $(`#hp-v-${d.k}`).innerHTML = d.show(st[d.k]); update() })
  }
  function syncDials () { for (const d of [...DIALS, ...ADV]) { $(`#hp-${d.k}`).value = st[d.k]; $(`#hp-v-${d.k}`).innerHTML = d.show(st[d.k]) } }
  // the map: click or drag to move the planet; arrow keys nudge it 5 degrees
  const svgNode = map.node()
  // the hint's words at one size on screen (about 13px, a little larger on a phone) however large the map is drawn,
  // their baseline a few pixels above the marker's glow
  function clearLabels (x, y) {
    const k = svgNode.getScreenCTM()?.a
    if (!k) return
    const you = { l: x - 60 / k, r: x + 60 / k, t: y - (MARK_R + 10) / k, b: y + (MARK_R + 26) / k }
    map.selectAll('.hp-labels .hp-lbl').each(function () {
      const b = this.getBBox()
      const near = b.x < you.r && you.l < b.x + b.width && b.y < you.b && you.t < b.y + b.height
      this.classList.toggle('is-near', near)
    })
  }
  function sizeHint () {
    const k = svgNode.getScreenCTM()?.a
    if (!k) return
    const px = window.matchMedia('(max-width: 900px)').matches ? 12 : 13
    hint.selectAll('text').style('font-size', `${(px / k).toFixed(2)}px`).attr('y', (-(MARK_R + 10) / k).toFixed(2))
    // the marker: the drawing scaled so the planet's body is MARK_R px in radius on screen, a dark ring just round it,
    // the glow a little wider
    map.select('.hp-you-scale').attr('transform', `scale(${(2 * MARK_R / 0.8 / k / 100).toFixed(4)})`)
    map.select('.hp-you-edge').attr('r', ((MARK_R + 1) / k).toFixed(2)).style('stroke-width', `${(2.5 / k).toFixed(2)}px`)
    map.select('.hp-you-glow').attr('r', ((MARK_R + 9) / k).toFixed(2))
    // the map's labels: 12px words with a dark edge, placed from their anchors in screen pixels
    map.selectAll('.hp-labels .hp-lbl').each(function () {
      const t = d3.select(this), dy = +this.dataset.dy
      t.attr('x', this.dataset.x).attr('y', (+this.dataset.y + dy / k).toFixed(2))
        .style('font-size', `${(12 / k).toFixed(2)}px`).style('stroke-width', `${(3.5 / k).toFixed(2)}px`)
    })
    // the path's leader: from just under the curve to just over its label
    map.select('.hp-lbl-lead').each(function () {
      const x = +this.dataset.x, y = +this.dataset.y
      d3.select(this).attr('x1', x).attr('x2', x).attr('y1', (y + 5 / k).toFixed(2)).attr('y2', (y + 18 / k).toFixed(2)).style('stroke-width', `${(1.2 / k).toFixed(2)}px`)
    })
    // the marker's own name, small and quiet, just under its glow; it travels with the marker
    map.select('.hp-lbl-you').attr('y', ((MARK_R + 15) / k).toFixed(2))
      .style('font-size', `${(11 / k).toFixed(2)}px`).style('stroke-width', `${(3 / k).toFixed(2)}px`)
  }
  new ResizeObserver(sizeHint).observe(svgNode)
  const moveTo = (e, glide) => {
    const m = svgNode.getScreenCTM(); if (!m) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    const sky = unproject(p.x, p.y); if (!sky) return
    st.ra = sky[0]; st.dec = sky[1]; hintMoved(); update({ moved: glide })
    $('.hp-map-note').classList.add('is-gone')
  }
  let dragging = false
  map.on('pointerdown', e => { svgNode.classList.remove('is-kb'); dragging = true; svgNode.setPointerCapture?.(e.pointerId); moveTo(e, true) })
    .on('pointermove', e => { if (dragging) moveTo(e, false) })
    .on('pointerup pointercancel', () => { dragging = false })
    .on('keydown', e => {
      svgNode.classList.add('is-kb')
      const k = { ArrowLeft: [5, 0], ArrowRight: [-5, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[e.key]
      if (!k) return
      e.preventDefault()
      st.ra = ((st.ra + k[0]) % 360 + 360) % 360; st.dec = Math.max(-85, Math.min(85, st.dec + k[1])); hintMoved()
      update({ moved: true })
    })

  // Reset planet: every dial and the planet's spot back to the start; the result under the map follows, as it does
  // for every change (there is no separate test: the verdict is always the current planet's)
  $('#hp-reset').addEventListener('click', () => {
    Object.assign(st, DEFAULT); syncDials()
    update({ moved: true })
  })

  update()
  return { show: () => update() }
}
