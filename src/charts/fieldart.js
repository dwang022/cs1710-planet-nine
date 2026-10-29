// Small explanatory drawings for the section 07 rows: one diagram per entry,
// so a reader sees at a glance what the paper did (aligned orbits, a tilted
// orbit, a fraction of the predicted planet searched, a 1-in-500 grid), plus
// the icons that mark each lane. Flat, thin and muted, like src/art.js. Every
// function returns a markup string; the lane colour comes in as currentColor.

const W = 240, H = 120
const MUTED = '#8c8b83'
const SUN = '#e8c46a'

const svg = inner => `<svg class="fd" viewBox="0 0 ${W} ${H}" aria-hidden="true">${inner}</svg>`
const sun = (x, y, r = 4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${SUN}"/>`
const text = (x, y, s, size = 9, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" font-family="ui-monospace, Menlo, monospace" ${extra}>${s}</text>`

/** Deterministic jitter, so the same entry draws the same picture on every load. */
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }
function rng (seed) {
  let t = seed
  return () => {
    t = (t + 0x6D2B79F5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** A Keplerian orbit with the Sun at (fx, fy), perihelion pointing `deg` degrees from +x. */
function orbit (fx, fy, a, e, deg, attrs) {
  const th = deg * Math.PI / 180
  const cx = fx - a * e * Math.cos(th), cy = fy - a * e * Math.sin(th)
  const ry = a * Math.sqrt(1 - e * e)
  return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${a}" ry="${ry.toFixed(1)}" transform="rotate(${deg.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="none" ${attrs}/>`
}

/** Part of an orbit, between true anomalies nu0 and nu1 (radians from perihelion). */
function arc (fx, fy, a, e, deg, nu0, nu1, attrs, n = 28) {
  const th = deg * Math.PI / 180
  const pts = []
  for (let i = 0; i <= n; i++) {
    const nu = nu0 + (nu1 - nu0) * i / n
    const r = a * (1 - e * e) / (1 + e * Math.cos(nu))
    pts.push(`${(fx + r * Math.cos(th + nu)).toFixed(1)},${(fy + r * Math.sin(th + nu)).toFixed(1)}`)
  }
  return `<polyline points="${pts.join(' ')}" fill="none" ${attrs}/>`
}

// --- the diagrams ------------------------------------------------------------

/** Distant orbits seen from above: aligned or not, with the proposed planet if asked. */
function orbits ({ n = 6, aligned = true, jitter = 14, planet = false, region = false, highlight = false, anti = false, big = false, footprints = false, dashed = false, far = false }, seed) {
  const r = rng(seed)
  const [fx, fy] = [120, 60]
  const dash = dashed ? 'stroke-dasharray="3 3"' : ''
  let out = ''
  for (let i = 0; i < n; i++) {
    const a = aligned ? 36 + r() * 20 : 20 + r() * 14
    const e = 0.8 + r() * 0.08
    const deg = aligned ? (r() - 0.5) * 2 * jitter : r() * 360
    out += orbit(fx, fy, a, e, deg, `stroke="${MUTED}" stroke-width="1.1" opacity=".75" ${dash}`)
  }
  if (highlight) {
    const a = big ? 62 : 54
    const deg = anti ? 180 + (r() - 0.5) * 14 : (r() - 0.5) * 14
    out += orbit(fx, fy, a, 0.86, deg, 'stroke="currentColor" stroke-width="2.2"')
  }
  if (footprints) {
    // where a survey happened to point
    out += [[28, 18, 46, 34], [150, 70, 52, 30], [96, 86, 40, 24]].map(([x, y, w, h]) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="currentColor" opacity=".16" stroke="currentColor" stroke-opacity=".6" stroke-width="1"/>`).join('')
  }
  if (planet) {
    const pa = far ? 76 : 56   // `far`: the planet pushed out, as Ammonite's finders argue
    out += orbit(fx, fy, pa, 0.5, 180, 'stroke="var(--fl-for)" stroke-width="1.8" stroke-dasharray="4 3"')
    if (region) out += arc(fx, fy, pa, 0.5, 180, Math.PI - 0.55, Math.PI + 0.55, 'stroke="var(--fl-for)" stroke-width="7" stroke-linecap="round" opacity=".45"')
    out += `<circle cx="${fx + pa * 1.5}" cy="${fy}" r="3.6" fill="var(--fl-for)"/>`
  }
  out += sun(fx, fy)
  return svg(out)
}

/** An orbit tilted out of the plane of the planets, seen edge-on. */
function tilt ({ deg = 54 }) {
  const [fx, fy] = [120, 74]
  let out = `<line x1="14" y1="${fy}" x2="226" y2="${fy}" stroke="${MUTED}" stroke-width="1" stroke-dasharray="3 3"/>`
  out += [28, 56, 84].map(d => `<circle cx="${fx - d}" cy="${fy}" r="2" fill="${MUTED}"/><circle cx="${fx + d}" cy="${fy}" r="2" fill="${MUTED}"/>`).join('')
  out += orbit(fx, fy, 40, 0.9, 180 - deg, 'stroke="currentColor" stroke-width="2.2"')
  // the angle between the plane and the orbit
  const a0 = 0, a1 = -deg * Math.PI / 180
  out += `<path d="M ${fx + 26} ${fy} A 26 26 0 0 0 ${(fx + 26 * Math.cos(a1)).toFixed(1)} ${(fy + 26 * Math.sin(a1)).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="1" opacity=".8"/>`
  out += text(fx + 30, fy - 14, `${deg}°`, 10, 'fill="currentColor" font-weight="700"')
  out += sun(fx, fy)
  return svg(out)
}

/** The predicted planet's orbit, with the fraction a search has ruled out. */
function search ({ pct = 0, dashed = false, label = 'ruled out' }) {
  const [cx, cy, rx, ry] = [120, 62, 100, 40]
  let out = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${MUTED}" stroke-width="1.4" ${dashed ? 'stroke-dasharray="4 4"' : ''}/>`
  if (pct > 0) {
    const n = 64, t0 = -Math.PI / 2, t1 = t0 + 2 * Math.PI * pct / 100
    const pts = []
    for (let i = 0; i <= n; i++) {
      const t = t0 + (t1 - t0) * i / n
      pts.push(`${(cx + rx * Math.cos(t)).toFixed(1)},${(cy + ry * Math.sin(t)).toFixed(1)}`)
    }
    out += `<polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" opacity=".9"/>`
    out += text(cx, cy + 8, `${pct}%`, 26, 'text-anchor="middle" fill="currentColor" font-weight="700"')
    out += text(cx, cy + 24, label, 9, `text-anchor="middle" fill="${MUTED}"`)
  } else {
    out += text(cx, cy + 4, label, 10, `text-anchor="middle" fill="${MUTED}"`)
  }
  return svg(out)
}

/** No Saturn-sized body out to a given distance. */
function limit ({ au = '28,000 AU' }) {
  const [x, y] = [120, 62]
  let out = [18, 34, 50].map(r => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${MUTED}" stroke-width="1" stroke-dasharray="3 3"/>`).join('')
  const sx = x + 50 * Math.cos(-0.6), sy = y + 50 * Math.sin(-0.6)
  out += `<g transform="translate(${sx.toFixed(1)} ${sy.toFixed(1)})">
    <ellipse rx="11" ry="3" transform="rotate(-20)" fill="none" stroke="currentColor" stroke-width="1.2"/>
    <circle r="5" fill="var(--surface-1)" stroke="currentColor" stroke-width="1.6"/>
    <line x1="-10" y1="10" x2="10" y2="-10" stroke="var(--fl-against)" stroke-width="2.2" stroke-linecap="round"/></g>`
  out += text(x + 54, y + 6, au, 9, `fill="${MUTED}"`)
  out += `<circle cx="${x - 24}" cy="${y + 14}" r="2.2" fill="var(--fl-for)"/>`
  out += text(x - 20, y + 17, 'P9?', 8, 'fill="var(--fl-for)"')
  out += sun(x, y)
  return svg(out)
}

/** Saturn's measured position crosses some directions off. */
function constraint () {
  const [x, y] = [120, 62]
  const R = 54
  const wedge = (a0, a1) => {
    const p = a => `${(x + R * Math.cos(a)).toFixed(1)} ${(y + R * Math.sin(a)).toFixed(1)}`
    return `<path d="M ${x} ${y} L ${p(a0)} A ${R} ${R} 0 0 1 ${p(a1)} Z" fill="var(--fl-against)" opacity=".22"/>`
  }
  let out = `<circle cx="${x}" cy="${y}" r="${R}" fill="none" stroke="${MUTED}" stroke-width="1" stroke-dasharray="3 3"/>`
  out += wedge(2.1, 3.3) + wedge(-1.2, -0.5)
  out += `<circle cx="${x}" cy="${y}" r="32" fill="none" stroke="${MUTED}" stroke-width="1"/>`
  const sx = x + 32 * Math.cos(-0.3), sy = y + 32 * Math.sin(-0.3)
  out += `<ellipse cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" rx="9" ry="2.5" transform="rotate(-20 ${sx.toFixed(1)} ${sy.toFixed(1)})" fill="none" stroke="currentColor" stroke-width="1.2"/>
    <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="4.5" fill="currentColor"/>`
  out += text(x - 70, y - 30, '✕', 12, 'fill="var(--fl-against)"') + text(x + 52, y + 48, '✕', 12, 'fill="var(--fl-against)"')
  out += sun(x, y)
  return svg(out)
}

/** Many small bodies aligning themselves; the planet crossed out. */
function swarm (_, seed) {
  const r = rng(seed)
  const [fx, fy] = [152, 60]
  let out = ''
  for (let i = 0; i < 18; i++) {
    out += orbit(fx, fy, 28 + r() * 26, 0.84, (r() - 0.5) * 18, 'stroke="currentColor" stroke-width="1" opacity=".55"')
  }
  out += `<circle cx="34" cy="60" r="13" fill="none" stroke="${MUTED}" stroke-width="1.4" stroke-dasharray="3 3"/>
    <line x1="24" y1="70" x2="44" y2="50" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>`
  out += sun(fx, fy)
  return svg(out)
}

/** The same patch of sky in two surveys decades apart; one source moved. */
function candidate ({ dashed = false }, seed) {
  const r = rng(seed)
  const frame = (x, label) => `<rect x="${x}" y="18" width="76" height="84" rx="3" fill="#ffffff05" stroke="${MUTED}" stroke-width="1"/>` +
    text(x + 4, 13, label, 8, `fill="${MUTED}"`)
  let out = frame(26, 'IRAS · 1983') + frame(138, 'AKARI · 2006')
  for (let i = 0; i < 12; i++) {
    const dx = 6 + r() * 64, dy = 24 + r() * 72
    out += `<circle cx="${(26 + dx).toFixed(1)}" cy="${dy.toFixed(1)}" r="1.1" fill="${MUTED}"/><circle cx="${(138 + dx).toFixed(1)}" cy="${dy.toFixed(1)}" r="1.1" fill="${MUTED}"/>`
  }
  const d = dashed ? 'stroke-dasharray="3 3"' : ''
  out += `<circle cx="50" cy="78" r="4.5" fill="${dashed ? 'none' : 'currentColor'}" stroke="currentColor" stroke-width="1.6" ${d}/>
    <circle cx="186" cy="44" r="4.5" fill="${dashed ? 'none' : 'currentColor'}" stroke="currentColor" stroke-width="1.6" ${d}/>
    <line x1="58" y1="74" x2="176" y2="48" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3" opacity=".8"/>
    <path d="M 176 48 l -7 -1 l 4 6 z" fill="currentColor" opacity=".8"/>`
  return svg(out)
}

/** A telescope sweeping the sky: how much of the survey is done. */
function survey ({ progress = 0, dashed = false }) {
  let out = `<path d="M 26 102 V 62 A 28 28 0 0 1 82 62 V 102 Z" fill="#ffffff08" stroke="${MUTED}" stroke-width="1.2"/>
    <line x1="54" y1="36" x2="54" y2="62" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
  const filled = Math.round(progress * 32)
  let k = 0
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++, k++) {
      const x = 106 + col * 17, y = 22 + row * 20
      out += k < filled
        ? `<rect x="${x}" y="${y}" width="15" height="18" rx="2" fill="currentColor" opacity=".85"/>`
        : `<rect x="${x}" y="${y}" width="15" height="18" rx="2" fill="none" stroke="${MUTED}" stroke-width="1" ${dashed ? 'stroke-dasharray="2 2"' : ''}/>`
    }
  }
  return svg(out)
}

/** One in five hundred: a grid of 500 dots with one lit. */
function odds () {
  let out = ''
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 25; col++) {
      const lit = row === 9 && col === 16
      out += `<circle cx="${22 + col * 8.2}" cy="${12 + row * 5}" r="${lit ? 3.4 : 1.3}" fill="${lit ? 'currentColor' : MUTED}" opacity="${lit ? 1 : 0.75}"/>`
    }
  }
  return svg(out)
}

const TYPES = { orbits, tilt, search, limit, constraint, swarm, candidate, survey, odds }

/** Draw the diagram an entry asks for: { type, ...params }. */
export function diagram (spec, id = '') {
  const fn = TYPES[spec.type]
  return fn ? fn(spec, hash(id || spec.type)) : ''
}

// --- icons -------------------------------------------------------------------
// 24 x 24, stroked in currentColor, so the lane colour and the shape say the
// same thing twice.

const ICONS = {
  planet: `<svg class="fi" viewBox="0 0 100 100" aria-hidden="true"><use href="#art-planet-nine"/></svg>`,
  noplanet: `<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 2.4"/><line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  object: `<svg class="fi" viewBox="0 0 100 100" aria-hidden="true"><use href="#art-tno-1"/></svg>`,
  search: `<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  candidate: `<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="2.2" fill="currentColor"/><line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  constraint: `<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 12 L20 7.5 A8.5 8.5 0 0 0 13 3.6 Z" fill="currentColor" opacity=".6"/><path d="M12 12 L4 16.5 A8.5 8.5 0 0 0 11 20.4 Z" fill="currentColor" opacity=".6"/></svg>`,
  survey: `<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 V12 A8 8 0 0 1 20 12 V20 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><line x1="12" y1="5" x2="12" y2="12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  next: `<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.2 3"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/></svg>`,
}

export const icon = name => ICONS[name] || ''
