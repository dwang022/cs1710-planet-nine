// The Planet Nine debate (search/timeline.html): one mark per paper, revealed year by year from 2014 to 2026, the
// papers for a planet inside the reader's Planet Nine on the left, the papers against in a faint enclosure on the right
// (under it on a phone). Each paper is a small sheet of paper in its side's colour (thumbs, up for and down against,
// until 2026-11-21; the coloured-dot version and its toggle were removed on 2026-11-17).
//
// The planet carries the balance (2026-11-21, asked for): it is drawn whole only for the share of papers so far that
// are for, from its left, and the rest of it is a dotted outline, as the Maybe planet of the future page's vote. A
// paper for fills it back out, a paper against knocks a sliver off its right side, towards the papers against. It is
// the share of papers in our sample, not a measure of who is right, and never falls to nothing (the first is for).
// Played forward a year at a time, each new paper flies up from its year on the strip under the picture and lands in
// its place, and the counts and the planet change as it lands.
//
// Which papers and which side come from papers.json ('stance', our reading of each abstract: supports → for;
// against and alternative → against; neutral papers stay in the data but are not drawn). The one line on what a
// paper does to the argument comes from field_timeline.json where the ledger retold it, else from debate.json,
// which also holds each year's headline (data/processed/debate.json says how each was written).
//
// Motion is one keyed D3 join per change of year, so a dot is the same element for its whole life:
//   - a mark's place is polar about its group's centre and eases along an arc from wherever it is this frame, so a
//     click mid-transition retargets instead of jumping;
//   - each group is a sunflower spiral in the order the papers appeared: each keeps its angle, and the spiral
//     tightens as papers join (inside the planet) or spreads to its room (the cluster);
//   - new papers fade and grow in, a beat apart; going back, later papers fade and shrink away and the rest close up.
// Three named transitions per dot (move, fade, grow) so each interrupts only its own kind.

import * as d3 from 'd3'
import { animateValue } from '../motion.js'
import { au } from './field.js'
import { svgMarkup } from '../art.js'
import { currentSkin } from '../site.js'

const W = 640                   // the width the labels' size is set against
const R = 196                 // the Planet Nine circle
const R_IN = R - 46           // the spiral never reaches past this
const SPIRAL = 37             // spacing of the spiral while it has room
const DOT = 10                // a mark's spacing radius: the hit circle, the halo and the enclosure are set from it
const SHEET_SIZE = 30         // a sheet's height: a little more than a dot's width, still clear of its neighbours
const FLY = 700               // a paper's flight from the strip to its place, in ms
const GAP = 440               // between one paper's take-off and the next
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const SIDE = { for: 'For Planet Nine', against: 'Against Planet Nine' }

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
// titles from Crossref carry a little markup (subscripts, italics); keep those, drop the rest; a title set in
// capitals is set in sentence case so it reads like the others
function title (t) {
  let s = String(t || '').replace(/<(?!\/?(sub|sup|i)>)[^>]*>/g, '')
  if (!/[a-z]/.test(s.replace(/<[^>]*>/g, ''))) {
    s = s.charAt(0) + s.slice(1).toLowerCase()
    for (const n of ['Sun', 'Kuiper', 'Planet Nine', 'Wide-Field Infrared Survey Explorer', 'CMB']) s = s.replace(new RegExp(`\\b${n}\\b`, 'gi'), n)
  }
  return s.replace(/<i>/g, ' <i>').replace(/\s+/g, ' ').trim()
}
const authors = a => !a?.length ? '' : a.length <= 3 ? a.join(', ') : `${a[0]} et al.`
// A text cut into segments at its key phrases (debate.json's 'highlights', 2026-11-20): each phrase is found by its
// exact words, overlaps and phrases not found are dropped, and the segments are written in order, the phrases in the
// part's lime (style.css, .db-hi). Each segment is escaped and its distances set in gold (au()) on its own.
function segments (text, phrases = []) {
  const s = String(text ?? '')
  const spans = phrases.map(p => [s.indexOf(p), p.length]).filter(([i]) => i >= 0).sort((a, b) => a[0] - b[0])
  const out = []
  let at = 0
  for (const [i, n] of spans) {
    if (i < at) continue
    if (i > at) out.push({ text: s.slice(at, i) })
    out.push({ text: s.slice(i, i + n), hi: true })
    at = i + n
  }
  if (at < s.length) out.push({ text: s.slice(at) })
  return out
}
// a paper's line ends in a full stop wherever it is written (the ledger's lines have none, debate.json's do)
const sentence = t => { const s = String(t ?? '').trim(); return !s || /[.!?]$/.test(s) ? s : s + '.' }
const rich = (text, phrases) => segments(text, phrases)
  .map(g => g.hi ? `<em class="db-hi">${au(esc(g.text))}</em>` : au(esc(g.text))).join('')

/** The static list of every paper (2026-11-21, asked for: a version to read once the animation is done), opened from
    the finale: a line down the middle with each year on it, the papers for to its left and against to its right (one
    column on a phone), each a sheet in its side's colour, its name linking to the paper and its one line on what it does
    to the argument, the key phrases lit as in the panel. Years with no paper in the sample are left out. */
export function allPapersHTML (items, debate) {
  const years = [...new Set(items.map(d => d.year))].sort((a, b) => a - b)
  const sheet = `<svg class="db-all-sheet" viewBox="0 0 24 24" aria-hidden="true"><path class="db-sheet" d="${SHEET}"/><path class="db-fold" d="${SHEET_FOLD}"/><path class="db-lines" d="${SHEET_LINES}"/></svg>`
  const card = d => `<li class="db-all-p is-${d.side}">${sheet}<div>
      <a class="db-all-name" href="${esc(d.paper.arxiv_url || d.paper.url)}" rel="noopener" target="_blank">${esc(d.paper.label)}</a>
      <p>${rich(sentence(d.why), debate.highlights?.[d.id]?.why)}</p>
      <span class="db-all-side" data-no-tint>${SIDE[d.side]}</span></div></li>`
  const side = (y, s) => items.filter(d => d.year === y && d.side === s)
  return `<div class="db-all-head"><h3>Every paper, ${years[0]}–${years[years.length - 1]}</h3>
      <button class="pic-btn db-all-close" type="button">Close</button></div>
    <div class="db-all-sides" aria-hidden="true" data-no-tint><span class="is-for">FOR PLANET NINE</span><span class="is-against">AGAINST PLANET NINE</span></div>
    <ol class="db-all-years">${years.map(y => `<li class="db-all-y">
      <ul class="db-all-col is-for">${side(y, 'for').map(card).join('')}</ul>
      <span class="db-all-yr">${y}</span>
      <ul class="db-all-col is-against">${side(y, 'against').map(card).join('')}</ul></li>`).join('')}</ol>`
}

/** Every paper the picture draws, each with a stable id (its DOI), side, year, finding and why. */
export function debatePapers ({ papers, timeline, debate }) {
  const ledger = new Map(timeline.entries.filter(e => e.doi).map(e => [e.doi, e]))
  const [y0, y1] = debate.range
  const side = s => s === 'supports' ? 'for' : (s === 'against' || s === 'alternative') ? 'against' : null
  return papers.map(p => {
    const e = ledger.get(p.doi)
    const why = debate.why[p.doi] || (e && (e.branch?.title || e.title))
    return { id: p.doi, side: side(p.stance), year: e ? e.year : p.year, order: e ? e.order : 99, date: p.date || '', paper: p, why }
  }).filter(d => d.side && d.year >= y0 && d.year <= y1)
    .sort((a, b) => a.year - b.year || a.order - b.order || a.date.localeCompare(b.date))
}

// --- the layout: the planet on the left and the papers against in a loose cluster on the right; on a phone the
// cluster sits under the planet, since side by side the marks would be too small to tap. It gives the frame
// (viewBox), where the planet and the labels sit, and every mark's place, polar about a centre:
// { cx, cy, a (radians, 0 = up, clockwise), r }.
const CLUSTER = 40            // spacing of the cluster against while it has room
const CLUSTER_R = 150         // the cluster never grows wider than this
function spiral (list, out, cx, cy, k) {
  list.forEach((d, i) => out.set(d.id, { cx, cy, a: i * GOLDEN + 0.6, r: k * Math.sqrt(i + 0.5) }))
}
// The labels, in their marks' colours, above their groups. The sheet (each paper's mark) is on a 24-unit grid: a page
// with its top corner folded and three lines of text, the same for both sides; its colour and its place say which.
const SPLIT_WORDS = ['FOR PLANET NINE', 'AGAINST PLANET NINE']
const SHEET = 'M5 2h10.5L20 6.5V22H5z'
const SHEET_FOLD = 'M15.5 2v4.5H20'
const SHEET_LINES = 'M8.2 11h8.6M8.2 14.5h8.6M8.2 18h5.6'
// The planet's whole part, from its left edge to x (about its centre), holds the share s of its disc: the edge solved
// from the area of a circle left of a vertical line. Whole is the full width and its halo too.
const edgeFor = s => {
  if (s >= 0.999) return R + 40
  const left = x => (R * R * Math.acos(-x / R) + x * Math.sqrt(R * R - x * x)) / (Math.PI * R * R)
  let lo = -R, hi = R
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (left(m) < s) lo = m; else hi = m }
  return (lo + hi) / 2
}
const shareOf = list => { const f = list.filter(d => d.side === 'for').length; return list.length ? f / list.length : 1 }
const LABEL_GAP = 26          // from the top of a group (the planet, the cluster's enclosure) to its label
// the cluster's enclosure: a faint rounded region round the papers against, its half-size following the cluster
const ENCL_PAD = 34, ENCL_MIN = 96
const clusterK = n => Math.min(CLUSTER, CLUSTER_R / Math.sqrt(Math.max(n, 1)))
const enclHalf = n => Math.max(ENCL_MIN, n ? clusterK(n) * Math.sqrt(n - 0.5) + DOT + 2.5 + ENCL_PAD : 0)
const LAYOUT = narrow => narrow
  ? { w: 640, h: 1060, planet: [320, 262], cluster: [320, 790], words: SPLIT_WORDS }
  : { w: 940, h: 580, planet: [262, 296], cluster: [700, 296], words: SPLIT_WORDS }
function places (shown, g) {
  const inside = shown.filter(d => d.side === 'for'), outside = shown.filter(d => d.side === 'against')
  const out = new Map()
  spiral(inside, out, g.planet[0], g.planet[1], Math.min(SPIRAL, R_IN / Math.sqrt(Math.max(inside.length, 1))))
  spiral(outside, out, g.cluster[0], g.cluster[1], clusterK(outside.length))
  return out
}
const xy = p => [p.cx + p.r * Math.sin(p.a), p.cy - p.r * Math.cos(p.a)]
const at = ([x, y]) => `translate(${x.toFixed(2)},${y.toFixed(2)})`
// a point as an angle and a distance about a pivot
const polar = ([x, y], [px, py]) => ({ a: Math.atan2(x - px, -(y - py)), r: Math.hypot(x - px, y - py) })
// The stars behind the picture: decoration, drawn once from a fixed seed so every visit sees the same sky. Small,
// white or faintly warm or blue-white, never the size or colour of a paper's mark; none show on the planet (it is
// opaque over them). One in six twinkles, each on its own beat (style.css; off for readers who ask for less motion).
function starfield () {
  let seed = 9
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const tints = ['#ffffff', '#ffffff', '#ffffff', '#fff1dc', '#dce8ff']
  const out = []
  while (out.length < 150) {
    const x = rnd() * 1000, y = rnd() * 1000
    const big = rnd() < 0.08
    const r = big ? 1.5 + rnd() * 0.6 : 0.5 + rnd() * 0.8
    const o = big ? 0.75 : 0.18 + rnd() * 0.45
    const fill = tints[Math.floor(rnd() * tints.length)]
    const tw = rnd() < 1 / 6 ? ` class="tw" style="--d:${(2.5 + rnd() * 4).toFixed(1)}s;--dl:-${(rnd() * 6).toFixed(1)}s"` : ''
    out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${fill}" opacity="${o.toFixed(2)}"${tw}/>`)
  }
  return `<svg class="db-stars" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${out.join('')}</svg>`
}

// The reader's Planet Nine in a skin, without its question mark (the papers for sit on its face), centred on (0, 0) and scaled so its body (radius 40 in the drawing's 100 box)
// is the circle of radius R the papers for sit in.
function planetArt (skin) {
  const size = 2 * R / 0.8
  return `<g transform="translate(${-size / 2},${-size / 2})">${svgMarkup('planet-nine', { size, skin, question: false })}</g>`
}

// the short way round between two angles
const turn = (a, b) => { const d = ((b - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; return t => a + d * t }

/**
 * Draws the debate into `root` and returns { show(year) }. `ui` holds the elements round
 * the picture: year, headline, countFor, countAgainst, panel.
 */
export function drawDebate (root, ui, { items, debate, onYear }) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  const ms = n => reduce.matches ? 0 : n
  const byId = new Map(items.map(d => [d.id, d]))

  // The scene is drawn once and never touched again by show(): a starfield behind (its own SVG, sliced to fill the
  // stage, pointer-events off), then the planet, the enclosure of the papers against, and the marks on top. The planet is the reader's own Planet Nine: the same drawing (art.js) in the skin chosen on the intro, stored
  // by site.js, scaled so its body is exactly the circle the papers for sit in. Over it a dark veil, so every skin's
  // colours and features (the cheese's holes, the nine-ball's stripe) stay recognisable but quiet,
  // and the papers' dots, outlined and haloed, are the brightest things on it. Round it a soft halo in the skin's
  // colour. When the skin changes while the page is open (site.js's p9:skin event) the new drawing fades in over the old.
  const s = (c, o) => `style="stop-color:${c};stop-opacity:${o}"`
  root.innerHTML = starfield() + `<svg class="db-svg is-split" role="group" aria-label="Papers for Planet Nine inside the planet on the left, papers against it in the cluster on the right">
    <defs>
      <radialGradient id="db-halo" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${R + 34}">
        <stop offset="${(R - 6) / (R + 34)}" ${s('var(--p9)', 0.3)}/><stop offset="${(R + 6) / (R + 34)}" ${s('var(--p9)', 0.12)}/><stop offset="1" ${s('var(--p9)', 0)}/></radialGradient>
      <radialGradient id="db-veil" cx="42%" cy="38%" r="70%">
        <stop offset="0" ${s('#05070d', 0.42)}/><stop offset=".7" ${s('#05070d', 0.5)}/><stop offset="1" ${s('#05070d', 0.62)}/></radialGradient>
      <radialGradient id="db-glow-for"><stop offset=".35" ${s('var(--p9)', 0.45)}/><stop offset="1" ${s('var(--p9)', 0)}/></radialGradient>
      <radialGradient id="db-glow-against"><stop offset=".35" ${s('var(--series-2)', 0.3)}/><stop offset="1" ${s('var(--series-2)', 0)}/></radialGradient>
      <clipPath id="db-whole"><rect class="db-cut is-whole" x="${-R - 40}" y="${-R - 40}" height="${2 * R + 80}" width="${2 * R + 80}"/></clipPath>
      <clipPath id="db-gone"><rect class="db-cut is-gone" x="${R + 40}" y="${-R - 40}" height="${2 * R + 80}" width="0"/></clipPath>
    </defs>
    <g class="db-planet" aria-hidden="true">
      <g clip-path="url(#db-whole)">
        <circle r="${R + 34}" fill="url(#db-halo)"/>
        <g class="db-art">${planetArt(currentSkin())}</g>
        <circle r="${R}" fill="url(#db-veil)"/>
        <circle class="db-rim" r="${R - 0.75}"/>
      </g>
      <g clip-path="url(#db-gone)"><circle class="db-ghost" r="${R - 1}"/></g>
      <line class="db-seam" x1="${R + 40}" x2="${R + 40}" y1="0" y2="0"/>
      <g class="db-chips"></g>
      <text class="db-label is-for" y="${-R + 30}">FOR PLANET NINE</text>
    </g>
    <text class="db-label is-against" aria-hidden="true">AGAINST PLANET NINE</text>
    <rect class="db-encl" rx="30" aria-hidden="true"/>
    <g class="db-fx" aria-hidden="true"></g>
    <g class="db-dots"></g>
  </svg>`
  const svg = d3.select(root).select('.db-svg')
  const layer = svg.select('.db-dots')
  const fx = svg.select('.db-fx'), chips = svg.select('.db-chips')

  // --- the planet's whole part: its edge, eased by one named transition on the whole part's rect (each step a tween
  // of the edge, so a new year or a click interrupts it wherever it is). The cut is a seam, a chord across the planet at
  // the edge, lit only while it moves: in the planet's colour as a paper for fills the planet out, in ember as a paper
  // against breaks a sliver off.
  const cutWhole = svg.select('.db-cut.is-whole'), cutGone = svg.select('.db-cut.is-gone'), seam = svg.select('.db-seam')
  let edgeNow = R + 40
  function setEdge (x) {
    edgeNow = x
    cutWhole.attr('width', (x + R + 40).toFixed(2))
    cutGone.attr('x', x.toFixed(2)).attr('width', Math.max(0, R + 40 - x).toFixed(2))
    const h = Math.sqrt(Math.max(0, R * R - x * x))
    seam.attr('x1', x.toFixed(2)).attr('x2', x.toFixed(2)).attr('y1', (-h).toFixed(2)).attr('y2', h.toFixed(2))
  }
  // from a whole planet the edge starts at the disc's right side, not its halo's, so no time is spent off the planet
  const edgeTween = to => () => { const i = d3.interpolateNumber(to < R ? Math.min(edgeNow, R) : edgeNow, to); return t => setEdge(i(t)) }
  function lightSeam (gain, dur) {
    seam.attr('class', `db-seam is-${gain ? 'gain' : 'loss'}`).interrupt('seam').style('opacity', 1)
      .transition('seam').delay(dur).duration(700).ease(d3.easeCubicIn).style('opacity', 0)
  }
  // a paper against lands: shards break off along the seam as it moves in and drift a little way towards the paper
  // that broke them off, turning and fading (the planet's own coordinates, about its centre)
  const shard = () => {
    const n = 3 + Math.floor(Math.random() * 2), r = 5 + Math.random() * 5
    return 'M' + d3.range(n).map(i => { const a = i / n * 2 * Math.PI + Math.random() * 0.8; const k = r * (0.6 + Math.random() * 0.5); return `${(k * Math.cos(a)).toFixed(2)},${(k * Math.sin(a)).toFixed(2)}` }).join('L') + 'Z'
  }
  function chip (from, to, toward) {
    if (reduce.matches || to >= from) return
    const x0 = Math.max(to, -R), x1 = Math.min(from, R)
    const pc = planetAt(), aim = [toward[0] - pc[0], toward[1] - pc[1]]
    for (let i = 0; i < 9; i++) {
      const x = x0 + (0.55 + 0.45 * Math.random()) * (x1 - x0), h = Math.sqrt(Math.max(0, R * R - x * x))
      const y = (Math.random() * 2 - 1) * h * 0.85
      const go = 0.3 + Math.random() * 0.3, wob = (Math.random() * 2 - 1) * 50
      const tx = x + (aim[0] - x) * go, ty = y + (aim[1] - y) * go + wob
      const r0 = Math.random() * 360, r1 = r0 + (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 160)
      chips.append('path').attr('class', 'db-chip').attr('d', shard())
        .attr('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${r0.toFixed(0)})`)
        .transition().delay(i * 25).duration(1300 + Math.random() * 500).ease(d3.easeCubicOut)
        .attrTween('transform', () => {
          const ix = d3.interpolateNumber(x, tx), iy = d3.interpolateNumber(y, ty), ir = d3.interpolateNumber(r0, r1)
          return t => `translate(${ix(t).toFixed(1)},${iy(t).toFixed(1)}) rotate(${ir(t).toFixed(0)}) scale(${(1 - 0.5 * t).toFixed(2)})`
        })
        .style('opacity', 0)
        .remove()
    }
  }
  // a paper lands: a thin ring in its side's colour spreads from its place
  function ripple (d, p) {
    if (reduce.matches) return
    fx.append('circle').attr('class', `db-ripple is-${d.side}`).attr('r', 10).attr('transform', at(xy(p)))
      .transition().duration(700).ease(d3.easeCubicOut).attr('r', 36).style('stroke-width', 0.5).style('opacity', 0).remove()
  }
  // a paper in flight: a quadratic curve from the strip, rising above both ends, and a short fading trail behind it
  const bez = ([x0, y0], [cx, cy], [x1, y1]) => t => { const u = 1 - t; return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1] }
  const TRAIL = 0.24
  let trails = 0
  // where a paper takes off: its year's marks on the strip, in the picture's units (below the stage, so it rises in
  // from the stage's foot under its year; one under the panel comes in at the stage's right, a paper for left of the
  // papers against)
  function launch (d, g) {
    const el = ui.strip?.querySelector(`button[data-year="${d.year}"] .db-m.is-${d.side}`)
    const ctm = svg.node().getScreenCTM()
    if (!el || !ctm) return null
    const r = el.getBoundingClientRect()
    const pt = new DOMPoint(r.left + r.width / 2, r.top + r.height / 2).matrixTransform(ctm.inverse())
    // a paper for never crosses the papers against: side by side it rises from left of them, stacked on a phone from
    // the left edge (and swings up that side, see the flight)
    const sideBySide = g.cluster[1] === g.planet[1]
    const x = d.side !== 'for' ? pt.x : sideBySide ? Math.min(pt.x, (g.planet[0] + g.cluster[0]) / 2) : 30
    return [Math.max(30, Math.min(g.w - 30, x)), Math.max(pt.y, g.h + 30)]
  }

  // a new skin chosen while the page is open: the new drawing fades in over the old, which then goes. Nothing else
  // in the picture is touched, so the dots, the year and any paper being read carry on.
  document.addEventListener('p9:skin', e => {
    const art = svg.select('.db-art')
    const next = art.append('g').html(planetArt(e.detail)).style('opacity', 0)
    const old = art.selectAll(':scope > *').filter(function () { return this !== next.node() })
    // a hidden page (the skin was chosen in another tab) swaps at once: browsers pause animation in hidden tabs, and
    // a fade left waiting would show both drawings when the reader comes back
    const dur = document.hidden ? 0 : ms(600)
    if (!dur) { next.style('opacity', 1); old.remove(); return }
    next.transition('skin').duration(dur).ease(d3.easeCubicInOut).style('opacity', 1)
      .on('end', () => old.remove())
  })

  // --- the panel: one paper (hovered, focused or pinned), or the year's new papers
  let year = null, pinned = null, hovered = null, leaveTimer = 0, quiet = false
  const lit = d => debate.highlights?.[d.id] || {}   // the key phrases of a paper's two texts
  function paperHTML (d) {
    const p = d.paper
    const href = p.arxiv_url || p.url
    return `<div class="db-p-head">
        <span class="db-side is-${d.side}" data-no-tint><i aria-hidden="true"></i>${SIDE[d.side]}</span>
        ${pinned === d.id ? '<button class="db-close" type="button" aria-label="Close">×</button>' : ''}
      </div>
      <div class="db-body">
      <div class="db-sec"><h3 class="db-title">${title(p.title)}</h3>
      <p class="db-by">${esc(authors(p.authors))} · ${d.year}${p.journal ? ` · <span>${esc(p.journal.replace(/&amp;/g, '&'))}</span>` : ''}</p></div>
      <div class="db-sec"><h4>Main finding</h4><p>${rich(p.summary, lit(d).summary)}</p></div>
      <div class="db-sec"><h4>Why it matters</h4><p>${rich(sentence(d.why), lit(d).why)}</p></div>
      <div class="db-sec is-src"><h4>Source</h4><p><a href="${esc(href)}" rel="noopener" target="_blank">${esc(p.label)}${p.journal ? ' · ' + esc(p.journal.replace(/&amp;/g, '&')) : ''}</a></p></div>
      </div>`
  }
  function yearHTML () {
    const fresh = items.filter(d => d.year === year)
    // a year with no paper in the sample (2015): one line, centred in the panel (style.css, .db-panel.is-empty); the
    // last year keeps its own words, the panel being gone then
    if (!fresh.length && year !== LAST) return '<p class="db-p-empty">No <em class="db-hi">papers</em> in our sample for this year.</p>'
    return `<p class="db-p-eyebrow">New in ${year}</p>` + (fresh.length
      ? `<ul class="db-new">${fresh.map(d => `<li><button type="button" data-id="${esc(d.id)}" class="is-${d.side}">
          <i aria-hidden="true"></i><span><b>${esc(d.paper.label)}</b><span>${rich(sentence(d.why), lit(d).why)}</span></span></button></li>`).join('')}</ul>`
      : '<p class="db-p-none">No paper in this sample.</p>') +
      (year === LAST ? '' : '<p class="db-p-hint">Choose a paper to read it.</p>')
  }
  let shownKey = ''
  function panel () {
    const id = hovered || pinned
    const key = id ? `p:${id}:${pinned === id}` : `y:${year}`
    if (key === shownKey) return
    shownKey = key
    const el = ui.panel
    el.classList.toggle('is-pinned', !!pinned && id === pinned)
    el.innerHTML = id ? paperHTML(byId.get(id)) : yearHTML()
    el.classList.toggle('is-empty', !!el.querySelector('.db-p-empty'))
    el.classList.toggle('is-paper', !!id)
    // a paper longer than the panel scrolls under its head; its foot fades while there is more below (style.css)
    const body = el.querySelector('.db-body')
    if (body) {
      const more = () => body.classList.toggle('is-more', body.scrollTop + body.clientHeight < body.scrollHeight - 2)
      body.addEventListener('scroll', more, { passive: true })
      requestAnimationFrame(more)
    }
    el.classList.toggle('is-many', !id && el.querySelectorAll('.db-new li').length >= 3)   // style.css: tighter, to fit
    // a short fade and lift as the content changes, restarted each time
    el.classList.remove('is-swap'); void el.offsetWidth; el.classList.add('is-swap')
    // dots: the one being read is lit, the others dim
    layer.selectAll('.db-dot').classed('is-on', d => d.id === id).attr('aria-pressed', d => String(d.id === pinned))
    svg.classed('has-on', !!id)
  }
  ui.panel.addEventListener('click', e => {
    if (e.target.closest('.db-close')) { pin(null, true); return }
    const b = e.target.closest('button[data-id]')
    if (b) pin(b.dataset.id, false, true)
  })

  function pin (id, refocus = false, fromList = false) {
    const was = pinned
    pinned = id && id !== pinned ? id : null
    if (fromList && id) pinned = id
    hovered = null
    panel()
    // closing hands the keyboard back to the paper's sheet, but quietly: a sheet taking focus previews its paper,
    // which put the paper straight back in the panel instead of the year's list (2026-11-20)
    if (refocus && was) {
      quiet = true
      layer.selectAll('.db-dot').filter(d => d.id === was).node()?.focus({ preventScroll: true })
      quiet = false
    }
  }
  function hover (id) {
    clearTimeout(leaveTimer)
    if (id) { hovered = id; panel(); return }
    // leaving a dot: wait a moment, so moving from one dot to the next never flashes the default panel
    leaveTimer = setTimeout(() => { hovered = null; panel() }, 140)
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pinned) pin(null, true) })

  // --- the frame: the viewBox, the planet and the labels, eased together to the layout's geometry (a phone turning
  // past 640 px swaps side by side for stacked). On the first draw they are set outright.
  let geo = null
  function frame (g, dur) {
    const box = svg.node().viewBox.baseVal
    const from = geo && box && box.width ? [box.width, box.height] : null
    geo = g
    const planet = `translate(${g.planet[0]},${g.planet[1]})`, label = `translate(${g.label[0]},${g.label[1]})`
    // the labels keep one size on screen: a wider frame drawn into the same width gets larger letters
    const size = `${((narrowQ.matches ? 15 : 12) * g.w / W).toFixed(2)}px`
    svg.select('.db-label.is-for').text(g.words[0])
    svg.select('.db-label.is-against').text(g.words[1])
    if (!from || !dur) {
      svg.select('.db-label.is-for').interrupt('frame').attr('y', g.forY)
      svg.select('.db-encl').style('opacity', 1)
      svg.interrupt('frame').attr('viewBox', `0 0 ${g.w} ${g.h}`)
      svg.select('.db-planet').interrupt('frame').attr('transform', planet)
      svg.select('.db-label.is-against').interrupt('frame').attr('transform', label)
      svg.selectAll('.db-label').interrupt('frame').style('font-size', size)
      return
    }
    const iw = d3.interpolateNumber(from[0], g.w), ih = d3.interpolateNumber(from[1], g.h)
    const t = svg.transition('frame').duration(dur).ease(d3.easeCubicInOut)
    t.attrTween('viewBox', () => u => `0 0 ${iw(u).toFixed(2)} ${ih(u).toFixed(2)}`)
    svg.select('.db-planet').transition(t).attr('transform', planet)
    // one transition per label (two of the same name on one element would cancel each other): place and size together
    svg.select('.db-label.is-for').transition(t).attr('y', g.forY).style('font-size', size)
    svg.select('.db-label.is-against').transition(t).attr('transform', label).style('font-size', size)
  }

  // where the planet is this frame (mid-glide too), from its transform
  function planetAt () {
    const m = svg.select('.db-planet').node().transform.baseVal.consolidate()?.matrix
    return m ? [m.e, m.f] : geo.planet
  }

  // --- one keyed join: per year, and again (same papers, new places) when a phone turns past the breakpoint
  const narrowQ = window.matchMedia('(max-width: 640px)')
  // the enclosure's largest size, when every paper against is in: its label sits above that, so it never moves
  const enclMax = enclHalf(items.filter(d => d.side === 'against').length)
  const geometry = () => {
    const g = LAYOUT(narrowQ.matches)
    // side by side the two groups share a middle, so one height above the taller of the two serves both labels;
    // stacked, each label sits the same distance above its own group
    const top = g.cluster[1] === g.planet[1] ? Math.max(R, enclMax) : null
    g.forY = -(top ?? R) - LABEL_GAP
    g.label = [g.cluster[0], g.cluster[1] - (top ?? enclMax) - LABEL_GAP]
    return g
  }
  narrowQ.addEventListener('change', () => { if (year != null) render(year, true) })

  function show (y) {
    if (y === year) return
    render(y, false)
  }

  // the counts above the picture, eased to n papers for and against
  function tallyTo (n) {
    animateValue(ui.countFor, n.for, (v, done) => { ui.countFor.textContent = done ? n.for : Math.round(v) })
    animateValue(ui.countAgainst, n.against, (v, done) => { ui.countAgainst.textContent = done ? n.against : Math.round(v) })
  }

  function render (y, relayout) {
    const first = year == null
    const back = !first && y < year
    // one year forward: the new papers fly in from the strip (never on the first draw, which is off screen, on a jump
    // of several years, which would fly a dozen one by one, into the finale, which hides them, or with reduced motion)
    const flying = !first && y === year + 1 && y !== LAST && !relayout && !reduce.matches
    // a new year or a layout change cuts short any flight still going: its trail goes (a cut tween never reaches its
    // end, where the trail would have been cleared) and the paper carries on to its place along a gentle curve
    fx.selectAll('.db-trail').interrupt().transition().duration(ms(180)).style('opacity', 0).remove()
      .on('end', function () { const id = this.getAttribute('stroke')?.match(/#([^)]+)/)?.[1]; if (id) svg.select(`#${id}`).remove() })
    year = y
    const g = geometry()
    const pivotNow = relayout && geo ? planetAt() : null
    frame(g, relayout ? ms(820) : 0)
    const shown = items.filter(d => d.year <= y)
    const place = places(shown, g)
    const sel = layer.selectAll('.db-dot').data(shown, d => d.id)

    // leaving: fade and shrink, then go. Removed by hand on the fade's end, which an interrupting re-entry cancels.
    sel.exit()
      .classed('is-leaving', true).attr('tabindex', -1).attr('aria-hidden', 'true')
      .each(function () { d3.select(this).interrupt('move') })
      .call(s => s.transition('fade').duration(ms(420)).ease(d3.easeCubicIn).style('opacity', 0)
        .on('end', function () { if (this.classList.contains('is-leaving')) this.remove() }))
      .call(s => s.select('.db-grow').transition('grow').duration(ms(420)).ease(d3.easeCubicIn).attr('transform', 'scale(0.35)'))

    // entering: drawn at (or just short of) its place, transparent and small
    const fresh = sel.enter().append('g')
      .attr('class', d => `db-dot is-${d.side}`)
      .attr('tabindex', 0).attr('role', 'button')
      .each(function (d) {
        const p = place.get(d.id)
        const out = g.cluster ? p.r * 1.3 + 16 : p.r + 26
        this.__xy = (flying && launch(d, g)) || xy({ ...p, a: p.a + (d.side === 'for' ? 0.25 : -0.12), r: d.side === 'for' ? p.r * 0.55 : out })
        this.__fly = flying
        this.setAttribute('transform', at(this.__xy))
      })
      .style('opacity', 0)
    fresh.append('g').attr('class', 'db-grow').attr('transform', 'scale(0.35)')
      .call(g => g.append('circle').attr('class', 'db-hit').attr('r', DOT + 9))
      .call(g => g.append('circle').attr('class', 'db-halo').attr('r', DOT * 2.1).attr('fill', d => `url(#db-glow-${d.side})`))
      // the mark: a sheet of paper, centred on the paper's place
      .call(g => g.append('g').attr('class', 'db-tmark')
        .append('g').attr('transform', `translate(${-SHEET_SIZE / 2},${-SHEET_SIZE / 2}) scale(${SHEET_SIZE / 24})`)
        .call(g => g.append('path').attr('class', 'db-sheet').attr('d', SHEET))
        .call(g => g.append('path').attr('class', 'db-fold').attr('d', SHEET_FOLD))
        .call(g => g.append('path').attr('class', 'db-lines').attr('d', SHEET_LINES)))
    fresh
      .on('pointerenter', (e, d) => { if (e.pointerType === 'mouse') hover(d.id) })
      .on('pointerleave', (e) => { if (e.pointerType === 'mouse') hover(null) })
      .on('focus', (e, d) => { if (!quiet) hover(d.id) })
      .on('blur', () => hover(null))
      .on('click', (e, d) => { pin(d.id); e.currentTarget.focus({ preventScroll: true }) })
      .on('keydown', (e, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pin(d.id) } })

    const all = fresh.merge(sel)
    all.attr('aria-label', d => `${d.paper.label}, ${SIDE[d.side].toLowerCase()}. ${d.why}`)
    // which of the dots arriving now each one is, for the stagger
    const newIds = new Map(fresh.data().map((d, i) => [d.id, i]))
    // dots that were leaving and are wanted again come back from where they are
    const returning = sel.filter(function () { return this.classList.contains('is-leaving') })
    returning.classed('is-leaving', false).attr('tabindex', 0).attr('aria-hidden', null)
    // the ones staying close up first when papers leave, and make room as papers arrive
    const settle = back ? 160 : 0
    const arrive = i => flying ? 200 + i * GAP : (back ? 0 : 260) + i * 90

    // Each dot eases from where it is this frame, turning the short way about a pivot while its distance from it
    // eases, so it moves along an arc. Within a layout the pivot is the centre of the dot's group (the planet, the
    // ring, the cluster). When the layout changes it is the planet, gliding with it from where it is now to where it
    // goes: papers for ride along inside it, and papers against swing round it, never across it (they start and end
    // farther out than its edge, so every point between is too).
    const pivotFrom = pivotNow
    // version 2's enclosure: round the cluster as it now is, growing with the arrivals and shrinking after the
    // departures, on the dots' own timing, so it never jumps
    if (g.cluster) {
      const h = enclHalf(shown.filter(d => d.side === 'against').length)
      const e = svg.select('.db-encl')
      const box = sel => sel.attr('x', g.cluster[0] - h).attr('y', g.cluster[1] - h).attr('width', 2 * h).attr('height', 2 * h)
      if (e.attr('width') == null) box(e)
      else box(e.transition('encl').delay(relayout ? 0 : back ? ms(settle) : 0).duration(ms(relayout ? 820 : 700)).ease(d3.easeCubicInOut))
    }
    all.transition('move')
      .delay(d => relayout ? 0 : newIds.has(d.id) ? ms(arrive(newIds.get(d.id))) : ms(settle))
      .duration(d => ms(relayout ? 820 : newIds.has(d.id) ? (flying ? FLY : 640) : 720))
      .ease(d3.easeCubicInOut)
      .attrTween('transform', function (d) {
        const node = this, to = place.get(d.id)
        // a paper in flight: up from the strip along a curve that rises above both ends, turning a little as it goes
        // a flight cut short (a new year clicked before it landed): on to its place along a gentle curve, no trail
        if (this.__fly && !newIds.has(d.id)) {
          const p0 = node.__xy, p1 = xy(to)
          const curve = bez(p0, [(p0[0] + p1[0]) / 2, Math.min(p0[1], p1[1]) - 60], p1)
          return t => { node.__xy = curve(t); if (t >= 1) node.__fly = false; return at(node.__xy) }
        }
        if (this.__fly && newIds.has(d.id)) {
          const p0 = node.__xy, p1 = xy(to)
          // stacked on a phone, a paper for swings up the left side, clear of the papers against below the planet
          const cx = g.cluster[1] === g.planet[1] || d.side !== 'for' ? (p0[0] + p1[0]) / 2 + (p1[0] < p0[0] ? 40 : -40) : 0
          const curve = bez(p0, [cx, Math.min(p0[1], p1[1]) - 140], p1)
          const spin = d.side === 'for' ? -1 : 1
          // the trail fades from nothing at its tail to the paper's colour at the paper: a gradient of its own, laid
          // along the trail each frame
          const gid = `db-trail-${++trails}`
          const grad = svg.select('defs').append('linearGradient').attr('id', gid).attr('gradientUnits', 'userSpaceOnUse')
          grad.append('stop').attr('offset', 0).attr('class', `db-trail-stop is-${d.side}`).style('stop-opacity', 0)
          grad.append('stop').attr('offset', 1).attr('class', `db-trail-stop is-${d.side}`).style('stop-opacity', 0.85)
          const trail = fx.append('path').attr('class', 'db-trail').attr('stroke', `url(#${gid})`)
          return t => {
            node.__xy = curve(t)
            const t0 = Math.max(0, t - TRAIL), tail = curve(t0)
            trail.attr('d', 'M' + d3.range(9).map(k => curve(t0 + (t - t0) * k / 8).map(v => v.toFixed(1)).join(',')).join('L'))
            grad.attr('x1', tail[0]).attr('y1', tail[1]).attr('x2', node.__xy[0]).attr('y2', node.__xy[1])
            if (t >= 1) { node.__fly = false; trail.transition().duration(260).style('opacity', 0).remove().on('end', () => grad.remove()) }
            return `${at(node.__xy)} rotate(${(spin * 35 * (1 - t) * (1 - t)).toFixed(1)})`
          }
        }
        const p0 = pivotFrom || [to.cx, to.cy], p1 = relayout ? g.planet : [to.cx, to.cy]
        const A = polar(node.__xy, p0), B = polar(xy(to), p1)
        const ia = turn(A.a, B.a), ir = d3.interpolateNumber(A.r, B.r)
        const ipx = d3.interpolateNumber(p0[0], p1[0]), ipy = d3.interpolateNumber(p0[1], p1[1])
        return t => {
          const a = ia(t), r = ir(t)
          node.__xy = [ipx(t) + r * Math.sin(a), ipy(t) - r * Math.cos(a)]
          return at(node.__xy)
        }
      })
    // fade and grow only the ones arriving or returning; the rest are already there (a running fade is left alone)
    const appear = fresh.merge(returning)
    appear.transition('fade')
      .delay(d => ms(newIds.has(d.id) ? arrive(newIds.get(d.id)) : 0))
      .duration(ms(flying ? 220 : 560)).ease(d3.easeCubicOut).style('opacity', 1)
    // in flight a paper is a little smaller and grows to its size as it lands
    appear.select('.db-grow').transition('grow')
      .delay(d => ms(newIds.has(d.id) ? arrive(newIds.get(d.id)) + (flying ? FLY * 0.55 : 0) : 0))
      .duration(ms(620)).ease(d3.easeBackOut.overshoot(0.9)).attr('transform', 'scale(1)')
    if (flying) fresh.select('.db-grow').attr('transform', 'scale(0.7)')

    // The counts and the planet. Flying, each paper's landing steps them on: one chained step per paper, so a new
    // year, a click or a layout change interrupts what is left. Otherwise they ease straight to the year's numbers.
    const tally = list => ({ for: list.filter(d => d.side === 'for').length, against: list.filter(d => d.side === 'against').length })
    if (!relayout) {
      cutWhole.interrupt('edge')
      const before = shown.filter(d => !newIds.has(d.id))
      const landing = fresh.data()
      if (flying && landing.length) {
        tallyTo(tally(before))
        let t = null, prevEnd = 0
        landing.forEach((d, i) => {
          const so = before.concat(landing.slice(0, i + 1))
          // a paper for fills the planet out smoothly; a paper against snaps a sliver off
          const gain = d.side === 'for'
          const land = arrive(i) + FLY, dur = Math.min(gain ? 560 : 360, GAP - 20)
          t = (t ? t.transition() : cutWhole.transition('edge')).delay(land - prevEnd).duration(dur)
            .ease(gain ? d3.easeCubicInOut : d3.easeExpOut)
            .tween('edge', edgeTween(edgeFor(shareOf(so))))
            .on('start', () => {
              tallyTo(tally(so)); ripple(d, place.get(d.id))
              const to = edgeFor(shareOf(so))
              if (Math.abs(to - edgeNow) > 0.5 && to < R + 40) lightSeam(gain, dur)
              if (!gain) chip(edgeNow, to, xy(place.get(d.id)))
            })
          prevEnd = land + dur
        })
      } else {
        tallyTo(tally(shown))
        cutWhole.transition('edge').delay(ms(back ? settle : 0)).duration(ms(first ? 0 : 620)).ease(d3.easeCubicInOut)
          .tween('edge', edgeTween(edgeFor(shareOf(shown))))
      }
    }

    // the paper being read, gone from the picture: back to the year (a layout change keeps it)
    const visible = new Set(shown.map(d => d.id))
    if (pinned && !visible.has(pinned)) pinned = null
    if (hovered && !visible.has(hovered)) hovered = null
    panel()
    if (relayout) return
    // what's on screen above the picture
    words(ui.headline, debate.headlines[y] || '')
    if (ui.year.textContent !== String(y)) words(ui.year, String(y))
    const count = s => shown.filter(d => d.side === s).length
    finale(y === LAST, { for: count('for'), against: count('against') })
    onYear?.(y)
  }

  // --- the finale: the range's last year (2026, with no paper of its own in the sample) closes on the totals. The two
  // counts above the picture fly diagonally into the middle of the stage, growing as they go, while the papers fade
  // and a face fades in over each number; going back they fly home. The numbers in flight are one pair of flyers laid
  // over the section (so the stage's rounded clip never cuts them), each always laid out at the final number's box
  // and moved by one transform; a flight cut short starts the next from wherever its flyer is, so fast clicks, the
  // strip and Replay never jump or show a number twice.
  const LAST = debate.range[1]
  const through = d3.max(items, d => d.year)
  const face = happy => `<svg class="db-face" viewBox="-50 -50 100 100" aria-hidden="true">
      <circle r="44"/><circle class="db-eye" cx="-15" cy="-11" r="5.5"/><circle class="db-eye" cx="15" cy="-11" r="5.5"/>
      <path class="db-mouth" d="${happy ? 'M-22 9 Q0 31 22 9' : 'M-21 25 Q0 7 21 25'}"/></svg>`
  root.insertAdjacentHTML('beforeend', `<div class="db-final" aria-hidden="true" data-no-tint>
      <div class="db-final-sides">
        <div class="db-final-side is-for">${face(true)}<b class="db-fn"></b><span class="db-fl">FOR PLANET NINE</span></div>
        <div class="db-final-side is-against">${face(false)}<b class="db-fn"></b><span class="db-fl">AGAINST PLANET NINE</span></div>
      </div>
      <p class="db-final-words">The evidence remains divided. The search continues.</p>
      <p class="db-final-note">Papers in our sample, ${items.length ? d3.min(items, d => d.year) : ''}–${through}</p>
      <button class="pic-btn db-all-btn" type="button" aria-controls="dbAll" aria-expanded="false" tabindex="-1">All papers</button>
      ${items.some(d => d.year === LAST) ? '' : `<p class="db-final-none">No new papers in our sample for ${LAST}.</p>`}
    </div>`)
  const fin = root.querySelector('.db-final')
  const section = root.closest('section') || root.parentElement
  const counts = ui.countFor.closest('.db-counts')
  const ends = {
    for: { top: ui.countFor, mid: fin.querySelector('.is-for .db-fn') },
    against: { top: ui.countAgainst, mid: fin.querySelector('.is-against .db-fn') },
  }
  for (const [s, e] of Object.entries(ends)) {
    e.fly = document.createElement('b')
    e.fly.className = `db-fly is-${s}`
    e.fly.setAttribute('aria-hidden', 'true')
    section.append(e.fly)
  }
  // In the finale the stage widens over both columns and the paper panel fades away under it (2026-11-19, asked for:
  // the last year has no paper to read); going back, the stage narrows and the panel fades in again. The classes on
  // the grid set the end layout outright (style.css: .is-wide, .is-narrowing, where the panel is laid over its
  // column so it never squeezes); the move between is one animation of the grid's columns in pixels, from wherever
  // they are this frame, so a click mid-way retargets. widen() switches the layout and returns the function that
  // starts the motion, so the finale can measure the end layout before anything moves.
  const grid = root.parentElement
  let gridAnim = null
  function widen (on) {
    const cols = () => { const s = getComputedStyle(grid); return [s.gridTemplateColumns, s.columnGap] }
    const from = cols()
    gridAnim?.cancel(); gridAnim = null
    if (on) {
      grid.style.setProperty('--db-panel-w', `${ui.panel.offsetWidth}px`)
      grid.style.setProperty('--db-panel-h', `${ui.panel.offsetHeight}px`)
      grid.style.setProperty('--db-svg-h', `${svg.node().getBoundingClientRect().height}px`)
    }
    grid.classList.toggle('is-wide', on)
    grid.classList.toggle('is-narrowing', !on)
    const to = cols()
    const tracks = to[0].split(' ').map(parseFloat)
    if (!on) grid.style.setProperty('--db-panel-w', `${tracks.length > 1 ? tracks[tracks.length - 1] : grid.clientWidth}px`)
    return () => {
      const done = () => { gridAnim = null; if (!on) grid.classList.remove('is-narrowing') }
      const dur = ms(720)
      if (!dur || from[0] === to[0] || from[0].split(' ').length !== tracks.length) { done(); return }
      gridAnim = grid.animate([{ gridTemplateColumns: from[0], columnGap: from[1] }, { gridTemplateColumns: to[0], columnGap: to[1] }],
        { duration: dur, easing: 'cubic-bezier(.62,0,.3,1)' })
      gridAnim.onfinish = done
    }
  }

  let finalNow = false
  function finale (on, n) {
    // going home, the flyers keep the totals they carry; the counts above take over when they land
    if (on) for (const [s, e] of Object.entries(ends)) { e.mid.textContent = n[s]; e.fly.textContent = n[s] }
    if (on === finalNow) return
    finalNow = on
    fin.setAttribute('aria-hidden', String(!on))
    if (on) fin.setAttribute('aria-label', `Through ${through}: ${n.for} papers for Planet Nine, ${n.against} against. The evidence remains divided. The search continues.`)
    fin.setAttribute('role', on ? 'group' : 'presentation')
    fin.querySelector('.db-all-btn').tabIndex = on ? 0 : -1
    root.classList.toggle('is-final', on)
    counts.classList.toggle('is-away', on)
    const dur = ms(720)
    // where each number is now, before the layout changes under it
    const froms = Object.values(ends).map(e => (e.anim && e.anim.playState === 'running' ? e.fly : on ? e.top : e.mid).getBoundingClientRect())
    const move = widen(on)
    const sec = section.getBoundingClientRect()
    for (const [i, e] of Object.values(ends).entries()) {
      const from = froms[i]
      e.anim?.cancel()
      e.top.style.visibility = 'hidden'
      e.mid.style.visibility = 'hidden'
      if (!dur || !from.height) { (on ? e.mid : e.top).style.visibility = ''; e.fly.style.display = 'none'; continue }
      // the flyer sits on the middle number's box, in its type; every rect is reached by moving and scaling that box
      const base = e.mid.getBoundingClientRect()
      Object.assign(e.fly.style, { display: 'block', left: `${base.left - sec.left}px`, top: `${base.top - sec.top}px`,
        fontSize: getComputedStyle(e.mid).fontSize })
      const to = (on ? e.mid : e.top).getBoundingClientRect()
      const tf = r => `translate(${r.left - base.left}px, ${r.top - base.top}px) scale(${r.height / base.height})`
      e.anim = e.fly.animate([{ transform: tf(from) }, { transform: tf(to) }],
        { duration: dur, easing: 'cubic-bezier(.62,0,.3,1)', fill: 'forwards' })
      e.anim.onfinish = () => { (on ? e.mid : e.top).style.visibility = ''; e.fly.style.display = 'none' }
    }
    move()
  }

  // text that changes with the year: the old line slides out, the new one in (CSS, on .db-swap)
  function words (el, text) {
    if (el.dataset.text === text) return
    el.dataset.text = text
    const old = el.querySelector('.db-w.is-in')
    if (old && !reduce.matches) {
      old.classList.remove('is-in'); old.classList.add('is-out')
      setTimeout(() => old.remove(), 360)
    } else el.textContent = ''
    const span = document.createElement('span')
    span.className = 'db-w'
    span.innerHTML = au(esc(text))
    el.append(span)
    requestAnimationFrame(() => requestAnimationFrame(() => span.classList.add('is-in')))
    // never more than the one leaving and the one arriving, however fast the clicks
    const ws = el.querySelectorAll('.db-w')
    for (let i = 0; i < ws.length - 2; i++) ws[i].remove()
  }

  return { show }
}

