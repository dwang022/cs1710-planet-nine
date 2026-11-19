// The probability page's pictures (rebuilt 2026-11-17 and 18, in seven rounds). Batygin and Brown's luck test, drawn
// with the clustering page's compass, both clues side by side, numbered 1 (which way the orbits stretch out) and 2
// (which way they tilt) on the pictures, never in the cards.
//
// makeLuck, one copy per walkthrough:
//   compasses  two, as on the clustering page: a dot just past the circle and a faint arrow for each orbit of a set,
//              their middle a solid arrow, and how tight the set is as a wedge, the middle plus and minus their
//              spread, its number small and in the part's red. The sets: the six of 2016 (violet), six known objects
//              picked at random (white), today's 62 (violet, smaller dots, stacked in finer slices so none overlap).
//              Pointing at an orbit of the six or of today's opens its card, as on the clustering page; a click keeps
//              it. The known objects are dots round both, one each: they appear at their own directions, then settle
//              into stacks, one per 10° slice; a sample's objects light up in their stacks in both. While nothing is
//              below them the compasses have the picture to themselves, each grown about its own centre.
//   piles      under each compass, a histogram of the spread of every sample for that clue, the tighter to the left,
//              the six (or today's objects) marked by a thin line over the bars with its angle, the samples at least as
//              tight in violet. Blocks drop onto both at once, quicker and quicker; then the build script's 100,000
//              fill them at once, and samples keep feeding in, a block flying from each compass to its bar.
//   squares    multiplying (2026-11-18, asked for): every sample placed across by how tight its stretch is and up by
//              how tight its tilt is (its rank, tightest at the corner), with axes; the share as tight as the six in
//              the stretch a strip up the left edge, in the tilt a band along the foot; beside it the sum, compact,
//              each number named. Then three squares, the corner enlarged twice, to one dot per sample. Today's
//              objects: the square and its sum, the corner large enough to see (multiplied, as in 2016: the relation
//              between the two is only taken up under "Does it hold up?").
// makeRelated   are the two unrelated: how often a sample's tilt is as tight as the six's, among all the samples of a
//              million and among those whose stretch is as tight, as two bars; the part past what unrelated spreads
//              would give in ember.
// makeLineTool  where the line is drawn, its own figure: today's 62 reliable orbits by how far out each is on average
//              (across, log) and its closest point to the Sun (up), a line the reader drags (it snaps to the distances
//              the build script tested), the orbits beyond it violet; under it, on the same distances, luck's odds with
//              the line at each, the one in use lit; a switch for only the orbits clear of Neptune.
//
// The stretch's wedge is drawn round the Sun, but its number is the paper's spread on the sky; the two differ by under
// a degree for the six (36.2 and 36.8; scripts/build_bb2016.py). Every number comes from bb2016.json, so the pictures,
// the counts and the cards agree; the falling blocks and the cycling samples are illustrations, computed on the page
// from the same data. Words on the pictures are a few words each (CLAUDE.md, Writing).

import * as d3 from 'd3'
import { oneIn, spreadOf, skySpread, closestOnSky } from '../stats.js'
import './luck.css'

const RAD = Math.PI / 180
const T = 600
const FILL_MS = 650               // a pile filling in, quickly (2026-11-18, asked for)
const DROPS = 160                 // samples dropping onto the piles, one after another, quicker and quicker:
const DROP_FIRST = 110, DROP_LAST = 10, DROP_EASE = 0.965   // ms before the next, from the first to the fastest
const FEED_MS = 520               // once the piles are full, a new sample this often, its blocks flying to their bars
const CYCLE = 1500
const KINDS = ['stretch', 'tilt']
const NUM = { stretch: '1', tilt: '2' }
const NAME = { stretch: 'Which way they stretch out', tilt: 'Which way they tilt' }
const BIN = 2, MAXDEG = 120       // the piles: 2° bins up to 120°
const fmt = n => n.toLocaleString('en-US')
const pct = p => `${+(100 * p).toPrecision(2)}%`
const wrap = d => ((d % 360) + 360) % 360

/** The direction of an orbit's closest point round the Sun (ecliptic longitude), as the build script's. */
export const closestLon = o => closestOnSky(o)[0]
export { spreadOf, skySpread }

/** An orbit's card, as on the clustering page: it opens on pointing and stays while the pointer is on the dot or the
 *  card; a click keeps it until its close button or Escape. */
export function objectCard (root) {
  d3.select(root).style('position', 'relative')
  const card = d3.select(root).append('div').attr('class', 'pick-card').attr('hidden', true).attr('role', 'dialog')
  let picked = null, pinned = false, closing = null
  const nameOf = o => o.name || o.provisional_desig || o.id
  function show (o) {
    picked = o
    card.attr('hidden', null).html(`
      <button type="button" class="pick-close" aria-label="Close">×</button>
      <div class="pick-name">${nameOf(o)}</div>
      <dl><dt>stretches out toward</dt><dd>${Math.round(wrap(o.varpi_deg + 180))}°</dd>
        <dt>tilts toward</dt><dd>${Math.round(wrap(o.node_deg + 90))}°</dd>
        <dt>closest to the Sun</dt><dd class="au">${o.q_au.toFixed(0)} AU</dd>
        <dt>farthest from the Sun</dt><dd class="au">${d3.format(',.0f')(o.a_au * (1 + o.e))} AU</dd></dl>`)
    card.select('.pick-close').on('click', close)
  }
  function close () { clearTimeout(closing); picked = null; pinned = false; card.attr('hidden', true) }
  card.on('mouseenter', () => clearTimeout(closing))
    .on('mouseleave', () => { if (!pinned) { clearTimeout(closing); closing = setTimeout(close, 260) } })
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && picked) close() })
  return {
    hover: o => { clearTimeout(closing); if (picked?.id !== o.id) { pinned = false; show(o) } },
    leave: () => { if (!pinned) { clearTimeout(closing); closing = setTimeout(close, 260) } },
    pick: o => { clearTimeout(closing); if (picked?.id !== o.id) show(o); pinned = true },
    close,
  }
}

/** A clue's number in its ring, then a few words. anchor: 'start' (the ring at 0), 'middle', or 'end' (the words
 *  end at 0). Without a number, the words alone. Returns the width. */
export function cue (g, n, text, { anchor = 'start', cls = 'lk-note', big = false } = {}) {
  g.selectAll('*').remove()
  const rr = n ? (big ? 9.5 : 7.5) : 0, gap = n && text ? (big ? 8 : 5) : 0
  const t = g.append('text').attr('class', cls).text(text || '')
  const w = text ? t.node().getComputedTextLength() : 0
  const tot = 2 * rr + gap + w
  const left = anchor === 'start' ? 0 : anchor === 'end' ? -tot : -tot / 2
  t.attr('x', left + 2 * rr + gap).attr('y', big ? 6 : 4.5)
  if (n) {
    g.append('circle').attr('class', 'lk-cn').attr('cx', left + rr).attr('r', rr)
    g.append('text').attr('class', 'lk-cn-n').attr('x', left + rr).attr('y', big ? 4.4 : 3.6)
      .attr('text-anchor', 'middle').style('font-size', big ? '12.5px' : '10px').text(n)
  }
  return tot
}

/** Where the pieces sit in a panel w × h pixels: two columns (1 left, 2 right), the compasses or the squares above,
 *  the piles below. */
function layoutFor (w, h) {
  const W = Math.round(Math.max(440, Math.min(980, (w || 900) / 0.95)))
  const H = Math.round(Math.max(460, Math.min(W * 1.7, W * (h || 620) / (w || 900))))
  const small = W < 600
  const split = Math.round(H * (small ? 0.52 : 0.54))
  const titleY = small ? 22 : 28
  const footH = small ? 38 : 48                    // the set's name and the known objects' key under both
  const Rt = Math.max(60, Math.min(W / 4 - (small ? 6 : 14), (split - titleY - 20 - footH) / 2))
  const out = Math.round(Rt * (small ? 0.38 : 0.42))   // the set's dots, then the known objects' stacks, past the circle
  const r = Rt - out, cy = titleY + 18 + Rt
  const comps = Object.fromEntries(KINDS.map((k, i) => [k, { cx: W * (i ? 0.75 : 0.25), cy, r, out, titleY }]))
  const pileTop = split + (small ? 54 : 70), pileBottom = H - (small ? 42 : 52)
  return { W, H, small, split, comps, footY: cy + Rt + (small ? 16 : 22),
    piles: {
      stretch: { x0: small ? 14 : 30, x1: W / 2 - (small ? 10 : 26), top: pileTop, bottom: pileBottom },
      tilt: { x0: W / 2 + (small ? 10 : 26), x1: W - (small ? 14 : 30), top: pileTop, bottom: pileBottom },
    },
    pileTitleY: split + (small ? 22 : 30),
    top: { x0: small ? 10 : 18, x1: W - (small ? 10 : 18), y0: 6, y1: split - 6 } }
}

/** root: the panel; data: bb2016.json; etnos: the catalogue, for today's objects and every orbit's card. */
export function makeLuck (root, data, etnos) {
  let L = layoutFor(0, 0)
  const svg = d3.select(root).append('svg').attr('role', 'img').attr('class', 'lk')
  const card = objectCard(root)
  const uid = Math.random().toString(36).slice(2, 8)
  const defs = svg.append('defs')
  const head = (id, fill, size) => defs.append('marker').attr('id', `${id}-${uid}`).attr('viewBox', '0 0 10 10').attr('refX', 7)
    .attr('refY', 5).attr('markerWidth', size).attr('markerHeight', size).attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto')
    .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', fill)
  head('lk-head', 'var(--text-secondary)', 7)
  head('lk-headw', 'var(--text-primary)', 10)
  const url = id => `url(#${id}-${uid})`
  // the samples as a faint texture in the squares: the whole, and the corner enlarged once
  const patterns = [0, 1].map(k => {
    const p = defs.append('pattern').attr('id', `lk-cells${k}-${uid}`).attr('patternUnits', 'userSpaceOnUse')
    return { p, dot: p.append('circle').attr('class', 'lk-cell') }
  })

  // --- the sets the compasses can show --------------------------------------------------------
  const six = data.six, pool16 = data.pool_2016, poolToday = data.pool_today
  const farOf = lon => wrap(lon + 180), tiltOf = node => wrap(node + 90)
  const POOLS = {
    '2016': { n: pool16.n, stretch: pool16.points.map(p => farOf(p[0])), tilt: pool16.node_deg.map(tiltOf) },
    today: { n: poolToday.n, stretch: poolToday.points.map(p => farOf(p[0])), tilt: (poolToday.node_deg || []).map(tiltOf) },
  }
  const byId = new Map(etnos.map(o => [o.id, o]))
  const cuts = data.today.map(r => ({ ...r, objs: r.ids.map(id => byId.get(id)).filter(Boolean) }))
  const cutOf = () => cuts.find(r => r.a_min_au === 150 && r.q_min_au === 30)
  const R16 = data.repro

  // --- the compasses (each grows about its own centre while they have the picture to themselves) ---------
  const gRow = svg.append('g').attr('class', 'lk-row').attr('opacity', 0)
  const comps = Object.fromEntries(KINDS.map(kind => {
    const g = gRow.append('g').attr('class', `lk-comp is-${kind}`)
    const cp = { kind, g, title: gRow.append('g').attr('class', 'lk-ctitle'),
      gPool: g.append('g').attr('class', 'lk-pool').attr('opacity', 0),
      ring: g.append('circle').attr('class', 'lk-ring'), wedge: g.append('path').attr('class', 'lk-wedge'),
      gSpokes: g.append('g'), mid: g.append('line').attr('class', 'lk-mid'), gDots: g.append('g'),
      sun: g.append('circle').attr('class', 'lk-sun').attr('r', 4.5),
      wlbl: g.append('text').attr('class', 'lk-wlbl halo').attr('text-anchor', 'middle'), poolShown: null }
    return [kind, cp]
  }))
  const foot = gRow.append('text').attr('class', 'lk-foot').attr('text-anchor', 'middle')
  // the known objects' key, under the set's name: a dot and what it stands for
  const poolKey = gRow.append('g').attr('class', 'lk-pool-key').attr('opacity', 0)
  poolKey.append('circle').attr('cx', 4).attr('cy', 6).attr('r', 3)
  const poolKeyTxt = poolKey.append('text').attr('class', 'lk-note')

  // --- the piles, one under each compass ------------------------------------------------------
  const gPiles = svg.append('g').attr('class', 'lk-piles').attr('opacity', 0)
  const pileTitle = gPiles.append('text').attr('class', 'lk-title').attr('text-anchor', 'middle')
  const piles = Object.fromEntries(KINDS.map(kind => {
    const g = gPiles.append('g')
    const pl = { kind, g, gAxis: g.append('g'), axisLbl: g.append('g'), gBars: g.append('g'), gBlocks: g.append('g'),
      gFeed: g.append('g'), x: d3.scaleLinear(), blocks: [], topAt: () => 0 }
    // the marker over the bars, so none covers it
    pl.gObs = g.append('g').attr('opacity', 0)
    pl.obsLine = pl.gObs.append('line').attr('class', 'lk-obs')
    pl.obsDot = pl.gObs.append('circle').attr('class', 'lk-obs-dot').attr('r', 4.5)
    pl.obsLbl = pl.gObs.append('text').attr('class', 'lk-obs-lbl halo')
    pl.obsLbl2 = pl.gObs.append('text').attr('class', 'lk-note halo')
    return [kind, pl]
  }))

  // --- the squares, and the sum beside the first -------------------------------------------------------------------
  const gSq = svg.append('g').attr('class', 'lk-sq').attr('opacity', 0)
  const gLinks = gSq.append('g').attr('class', 'lk-sq-links')
  const sqs = [0, 1, 2].map(k => {
    const g = gSq.append('g').attr('class', `lk-square s${k}`).attr('opacity', 0)
    return { k, g, place: null, bg: g.append('rect').attr('class', 'lk-sq-bg'), tex: g.append('rect').attr('class', 'lk-sq-tex'),
      a: g.append('rect').attr('class', 'lk-sq-a'), b: g.append('rect').attr('class', 'lk-sq-b'),
      both: g.append('rect').attr('class', 'lk-sq-both'), gDots: g.append('g'),
      box: g.append('rect').attr('class', 'lk-sq-box').attr('opacity', 0),
      mark: g.append('circle').attr('class', 'lk-sq-box').attr('opacity', 0),
      gx: g.append('g').attr('class', 'lk-sq-axis'), gy: g.append('g').attr('class', 'lk-sq-axis'),
      xl: g.append('g'), yl: g.append('g'), title: g.append('text').attr('class', 'lk-sq-title'),
      lx: g.append('text').attr('class', 'lk-sq-count halo') }
  })
  const gEq = gSq.append('g').attr('class', 'lk-eq').attr('opacity', 0)

  let timers = [], last = null, shown = {}, sqShown = 0
  const stop = () => { for (const t of timers) t.stop(); timers = [] }
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // --- compass pieces ------------------------------------------------------------------------
  const C = cp => L.comps[cp.kind]
  const pt = (cp, deg, r) => [C(cp).cx + r * Math.cos(deg * RAD), C(cp).cy - r * Math.sin(deg * RAD)]
  function sector (cp, mid, s, r) {
    const a = Math.min(179.5, s)
    const arc = d3.range(mid - a, mid + a + 0.01, 2).concat([mid + a]).map(d => pt(cp, d, r))
    return `M${C(cp).cx},${C(cp).cy}L${arc.map(p => p.map(v => v.toFixed(1)).join(',')).join('L')}Z`
  }
  /** Where the compasses go. Alone, each grows about its own centre to fill its half of the picture (as large as lets
   *  its dots, and the known objects' stacks when they are shown, fit); with the piles below, as laid out. */
  let footNow = 0
  function placeCompasses (alone, withPool, first) {
    const c0 = L.comps.stretch, gapT = L.small ? 16 : 22
    const ext = withPool ? c0.out + 8 : (L.small ? 30 : 40)
    const titleOff = (withPool ? c0.r + c0.out : c0.r + ext) + gapT
    let k = 1, cyT = c0.cy
    if (alone) {
      const above = titleOff + 14, below = c0.r + ext + (withPool ? 52 : 34)
      k = Math.min(L.small ? 1.6 : 1.55, (L.W / 4 - 6) / (c0.r + ext), (L.H - 24) / (above + below))
      cyT = (L.H - k * (above + below)) / 2 + k * above
    }
    footNow = cyT + k * (withPool ? c0.r + c0.out : c0.r + ext) + gapT
    const move = sel => first || reduced() ? sel : sel.transition('slide').duration(T * 1.5).ease(d3.easeCubicInOut)
    for (const cp of Object.values(comps)) {
      const { cx, cy, r } = C(cp)
      cp.ring.attr('cx', cx).attr('cy', cy).attr('r', r)
      cp.sun.attr('cx', cx).attr('cy', cy)
      cue(cp.title, NUM[cp.kind], NAME[cp.kind], { anchor: 'middle', cls: 'lk-title', big: true })
      move(cp.title).attr('transform', `translate(${cx},${(cyT - k * titleOff - 4).toFixed(1)})`)
      move(cp.g).attr('transform', `translate(${cx},${cyT.toFixed(1)}) scale(${k.toFixed(3)}) translate(${-cx},${-cy})`)
      // the spread's number one size on screen however large the compass is drawn (2026-11-18, asked for)
      cp.wlbl.style('font-size', `${((L.small ? 11 : 12.5) / k).toFixed(2)}px`)
    }
    foot.attr('x', L.W / 2)
    move(foot).attr('y', footNow)
  }

  /** set: { tone: 'six' | 'draw' | 'today', label, dirs: { stretch, tilt: [{ key, deg }] }, spread: { stretch, tilt }, picked? } */
  function drawSet (set, ms = T) {
    for (const cp of Object.values(comps)) drawSetOn(cp, set.dirs[cp.kind], set.spread[cp.kind], set.tone, ms)
    foot.text(set.label2 ? `${set.label} · ${set.label2}` : set.label).attr('class', `lk-foot is-${set.tone}`)
    // the objects drawn, lit in their stacks round both compasses
    const picked = set.picked || new Set()
    for (const cp of Object.values(comps)) {
      cp.gPool.selectAll('circle').classed('is-picked', d => picked.has(d.j)).attr('r', d => picked.has(d.j) ? d.rad * 2.2 : d.rad)
        .filter(d => picked.has(d.j)).raise()
    }
  }
  function drawSetOn (cp, dirs, s, tone, ms) {
    const { r, cx, cy } = C(cp)
    // dots just past the circle, each at the first ring outward where it touches no dot already placed, so none
    // overlap (2026-11-18, asked for: stacking by slices still let today's 62 overlap)
    const many = dirs.length > 12
    const step = many ? (L.small ? 4.6 : 6) : (L.small ? 7 : 9), dr = many ? (L.small ? 2 : 2.6) : (L.small ? 4 : 5)
    const base = many ? 7 : 11, levels = many ? 5 : 3, clear2 = (2 * dr + 0.6) ** 2
    const taken = []
    const placed = [...dirs].sort((p, q) => wrap(p.deg) - wrap(q.deg)).map(d => {
      let lvl = 0
      for (; lvl < levels - 1; lvl++) {
        const [x, y] = pt(cp, d.deg, r + base + lvl * step)
        if (!taken.some(([u, v]) => (u - x) ** 2 + (v - y) ** 2 < clear2)) break
      }
      taken.push(pt(cp, d.deg, r + base + lvl * step))
      return { ...d, rr: r + base + lvl * step }
    })
    const dots = cp.gDots.selectAll('circle').data(placed, d => d.key)
    dots.exit().transition().duration(ms / 2).attr('opacity', 0).remove()
    dots.enter().append('circle').attr('r', dr).attr('opacity', 0)
      .attr('cx', d => pt(cp, d.deg, d.rr)[0]).attr('cy', d => pt(cp, d.deg, d.rr)[1])
      .merge(dots).attr('class', `lk-dot is-${tone}`).attr('r', dr)
      .style('cursor', d => byId.has(d.key) ? 'pointer' : null)
      .on('pointerenter', (ev, d) => { const o = byId.get(d.key); if (o) card.hover(o) })
      .on('pointerleave', () => card.leave())
      .on('click', (ev, d) => { const o = byId.get(d.key); if (o) card.pick(o) })
      .transition().duration(ms).attr('opacity', 1)
      .attr('cx', d => pt(cp, d.deg, d.rr)[0]).attr('cy', d => pt(cp, d.deg, d.rr)[1])
    const spokes = cp.gSpokes.selectAll('line').data(placed, d => d.key)
    spokes.exit().transition().duration(ms / 2).attr('opacity', 0).remove()
    spokes.enter().append('line').attr('opacity', 0).attr('x1', cx).attr('y1', cy)
      .attr('x2', d => pt(cp, d.deg, r - 3)[0]).attr('y2', d => pt(cp, d.deg, r - 3)[1])
      .attr('marker-end', url('lk-head'))
      .merge(spokes).attr('class', 'lk-spoke').attr('x1', cx).attr('y1', cy)
      .transition().duration(ms).attr('opacity', placed.length > 12 ? 0.3 : 0.7)
      .attr('x2', d => pt(cp, d.deg, r - 3)[0]).attr('y2', d => pt(cp, d.deg, r - 3)[1])
    // the wedge: the middle plus and minus the spread
    const { mid } = spreadOf(dirs.map(d => d.deg))
    cp.wedge.attr('class', `lk-wedge is-${tone}`).transition().duration(ms).attrTween('d', function () {
      const prev = this.__wedge || { mid, s: 0 }
      const dm = ((mid - prev.mid + 540) % 360) - 180
      const im = d3.interpolate(prev.mid, prev.mid + dm), is = d3.interpolate(prev.s, s)
      return t => { this.__wedge = { mid: wrap(im(t)), s: is(t) }; return sector(cp, im(t), is(t), r) }
    })
    // their middle, a solid arrow
    cp.mid.attr('marker-end', url('lk-headw')).attr('x1', cx).attr('y1', cy)
      .transition().duration(ms).attr('x2', pt(cp, mid, r - 2)[0]).attr('y2', pt(cp, mid, r - 2)[1])
    // the spread's number inside the wedge, off the middle line, small (2026-11-18, asked for: it had covered the arrows)
    const at = mid - Math.min(0.5 * s, 28)
    const [lx, ly] = pt(cp, at, r * 0.58)
    cp.wlbl.text(`spread ${Math.round(s)}°`).transition().duration(ms).attr('x', lx).attr('y', ly + 4)
  }

  /** The known objects round both compasses, one dot each, in a stack per 10° slice: kind '2016' or 'today'. */
  function drawPool (kind) {
    const P = POOLS[kind]
    for (const cp of Object.values(comps)) {
      const { r, out } = C(cp)
      const items = P[cp.kind].map((deg, j) => ({ j, deg }))
      const slices = d3.range(36).map(() => [])
      for (const d of items) slices[Math.floor(d.deg / 10) % 36].push(d)
      for (const sl of slices) sl.sort((a, b) => a.deg - b.deg)
      const most = d3.max(slices, sl => sl.length)
      // the dots as large as lets the fullest slice fit between the set's dots and the edge of the compass
      const r0 = r + (L.small ? 27 : 35), room = r + out - r0 - 2, w0 = r0 * 10 * RAD * 0.86
      let sp = 7, k = 1
      for (; sp > 1; sp -= 0.1) { k = Math.max(1, Math.floor(w0 / sp)); if (Math.ceil(most / k) * sp <= room) break }
      const rad = Math.max(0.7, sp * 0.4)
      const pos = []
      slices.forEach((sl, i) => sl.forEach((d, q) => {
        const row = Math.floor(q / k), col = q % k, rr = r0 + row * sp + sp / 2
        const a = i * 10 + 5 + ((col - (k - 1) / 2) * sp / rr) / RAD
        const [x0, y0] = pt(cp, a, rr)
        const [ex, ey] = pt(cp, d.deg, r0 + ((d.j * 7919) % 97) / 97 * room * 0.5)
        pos.push({ j: d.j, x: x0, y: y0, ex, ey, rad })
      }))
      const fresh = cp.poolShown !== kind
      const sel = cp.gPool.selectAll('circle').data(pos, d => `${kind}-${d.j}`)
      sel.exit().remove()
      const en = sel.enter().append('circle').attr('class', 'lk-pdot').attr('r', rad)
      if (fresh && !reduced()) {
        // each object at its own direction first, then into its slice's stack
        en.attr('cx', d => d.ex).attr('cy', d => d.ey).attr('opacity', 0)
          .transition().delay((d, i) => (i % 120) * 4).duration(T).attr('opacity', 1)
          .transition().delay(T * 0.9).duration(T * 1.8).ease(d3.easeCubicInOut).attr('cx', d => d.x).attr('cy', d => d.y)
      } else en.attr('cx', d => d.x).attr('cy', d => d.y)
      sel.attr('r', rad).transition().duration(T * 1.6).ease(d3.easeCubicInOut).attr('cx', d => d.x).attr('cy', d => d.y).attr('opacity', 1)
      cp.poolShown = kind
    }
    // what a dot is (2026-11-18, asked for: no year, no “one dot each”)
    poolKeyTxt.text(`${fmt(P.n)} objects averaging over 50 AU out`)
      .attr('x', 12).attr('y', 10.5)
    const w = 12 + poolKeyTxt.node().getComputedTextLength()
    poolKey.attr('transform', `translate(${L.W / 2 - w / 2},${footNow + 12})`)
  }

  // --- pile pieces --------------------------------------------------------------------------
  function pileAxes (pl) {
    const P = L.piles[pl.kind]
    pl.x = d3.scaleLinear().domain([0, MAXDEG]).range([P.x0, P.x1])
    pl.gAxis.attr('transform', `translate(0,${P.bottom})`)
      .call(d3.axisBottom(pl.x).ticks(L.small ? 3 : 6).tickFormat(d => `${d}°`).tickSizeOuter(0))
    pl.gAxis.selectAll('text').attr('class', 'axis-label')
    pl.gAxis.selectAll('line, path').attr('stroke', 'var(--rule)')
    // what the axis counts, in words (2026-11-18, asked for: no clue numbers here)
    cue(pl.axisLbl, null, `spread of the ${pl.kind === 'tilt' ? 'tilt' : 'stretch'}`, { anchor: 'middle', cls: 'axis-label' })
    pl.axisLbl.attr('transform', `translate(${(P.x0 + P.x1) / 2},${P.bottom + (L.small ? 32 : 36)})`)
  }
  /** A histogram of spreads (2° bins) with the observed spread marked by a thin line over the bars; it fills in when
   *  asked. */
  function drawPile (pl, h, obs, { fill, after }) {
    const P = L.piles[pl.kind], x = pl.x
    const counts = h.counts.slice(0, MAXDEG / BIN)
    const most = d3.max(counts)
    const y = d3.scaleLinear().domain([0, most]).range([0, P.bottom - P.top - (L.small ? 40 : 56)])
    pl.topAt = bin => P.bottom - y(counts[Math.min(counts.length - 1, bin)] || 0)
    const tight = i => (i + 1) * BIN <= obs + 1e-9
    const bars = pl.gBars.selectAll('rect').data(counts).join('rect').attr('rx', 1)
      .attr('x', (d, i) => x(i * BIN) + 0.5).attr('width', Math.max(1, x(BIN) - x(0) - 1))
      .attr('class', (d, i) => tight(i) ? 'lk-bar is-tight' : 'lk-bar')
    const ox = x(obs)
    pl.obsLine.attr('x1', ox).attr('x2', ox).attr('y1', P.top - 6).attr('y2', P.bottom)
    pl.obsDot.attr('cx', ox).attr('cy', P.top - 6)
    const right = ox > (P.x0 + P.x1) / 2, ax = ox + (right ? -9 : 9)
    // just the angle (2026-11-18, asked for): violet says whose
    pl.obsLbl.attr('x', ax).attr('y', P.top - 1).attr('text-anchor', right ? 'end' : 'start').text(`${Math.round(obs)}°`)
    pl.obsLbl2.attr('x', ax).attr('y', P.top + (L.small ? 15 : 17)).attr('text-anchor', right ? 'end' : 'start')
    pl.gObs.raise().transition().duration(T).attr('opacity', 1)
    const set = f => {
      bars.attr('y', d => P.bottom - y(d * f)).attr('height', d => y(d * f))
      pl.obsLbl2.text(f < 1 ? '' : L.small ? after.short : after.long)
    }
    if (fill && !reduced()) {
      set(0)
      const t = d3.timer(ms => { const f = Math.min(1, ms / FILL_MS); set(d3.easeCubicOut(f)); if (f >= 1) { t.stop(); set(1) } })
      timers.push(t)
    } else set(1)
  }
  /** The blocks dropped so far, stacked at their spreads; they flatten as the stacks grow, so the pile fits. Every
   *  block already down is set at its place at once (2026-11-18: blocks still flying to an old place left gaps in
   *  narrow piles); only the newest moves, falling from its compass while the drops are slow, fading in after. */
  function drawBlocks (pl, animateLast) {
    const P = L.piles[pl.kind], x = pl.x, bw = x(BIN) - x(0)
    const stack = new Map()
    const placed = pl.blocks.map(b => {
      const bin = Math.min(MAXDEG / BIN - 1, Math.floor(b.s / BIN)), k = stack.get(bin) || 0
      stack.set(bin, k + 1)
      return { ...b, k, bin }
    })
    const tallest = d3.max([...stack.values()]) || 1
    const step = Math.min(L.small ? 8 : 10, (P.bottom - P.top - 24) / tallest), hgt = Math.max(1.2, step * 0.8)
    const { cx } = L.comps[pl.kind]
    const sel = pl.gBlocks.selectAll('rect').data(placed, d => d.id)
    sel.exit().remove()
    sel.interrupt().attr('x', d => x(d.bin * BIN) + 0.5).attr('y', d => P.bottom - (d.k + 1) * step).attr('height', hgt).attr('opacity', 1)
    const fly = animateLast && pl.blocks.length < 24
    const en = sel.enter().append('rect').attr('class', 'lk-block').attr('rx', 1).attr('width', Math.max(2, bw - 1)).attr('height', hgt)
    if (fly) {
      en.attr('x', cx - bw / 2).attr('y', footNow - 4).attr('opacity', 0)
        .transition().duration(240).ease(d3.easeCubicIn)
        .attr('x', d => x(d.bin * BIN) + 0.5).attr('y', d => P.bottom - (d.k + 1) * step).attr('opacity', 1)
    } else {
      en.attr('x', d => x(d.bin * BIN) + 0.5).attr('y', d => P.bottom - (d.k + 1) * step)
        .attr('opacity', animateLast ? 0 : 1).transition().duration(animateLast ? 120 : 0).attr('opacity', 1)
    }
  }
  /** Once the piles are full, a new sample: its blocks fly from the compasses onto their bars and melt in. */
  function feedOne (set) {
    for (const pl of Object.values(piles)) {
      const x = pl.x, bw = x(BIN) - x(0), bin = Math.min(MAXDEG / BIN - 1, Math.floor(set.spread[pl.kind] / BIN))
      const { cx } = L.comps[pl.kind]
      pl.gFeed.append('rect').attr('class', 'lk-block').attr('rx', 1).attr('width', Math.max(2, bw - 1)).attr('height', 6)
        .attr('x', cx - bw / 2).attr('y', footNow - 4)
        .transition().duration(380).ease(d3.easeCubicIn).attr('x', x(bin * BIN) + 0.5).attr('y', pl.topAt(bin) - 6)
        .transition().duration(260).attr('opacity', 0).remove()
    }
  }

  // --- the squares --------------------------------------------------------------------------------
  // the shares: the 100,000 samples of 2016, or today's; both multiplied, as Batygin and Brown did
  function sharesFor (kind) {
    const r = kind === 'todaySum' ? cutOf() : null
    const S = r || R16
    return { N: S.draws, a: S.closest.p, b: S.tilt.p, both: S.product, today: !!r, nBoth: Math.round(S.product * S.draws) }
  }
  const SIDES = [1, 0.1, Math.sqrt(100 / 100000)]   // 100,000 samples, the 1,000 in the corner, the 100 in its corner
  /** One square, in its own frame (0 to S, the corner at the bottom left): the samples as tight in the stretch a strip
   *  up the left edge, in the tilt a band along the foot, the corner where they cross. side: the share of the samples'
   *  ranks the square spans. */
  function drawSquare (q, S, sh, side, { delay = 0, grow, axes }) {
    const aF = Math.min(1, sh.a / side), bF = Math.min(1, sh.b / side)
    q.bg.attr('width', S).attr('height', S)
    // a faint, even texture of samples (one dot for many in the whole; one for each in the first enlargement)
    if (q.k < 2) {
      const per = q.k === 0 ? (L.small ? 24 : 36) : Math.sqrt(1000), c = S / per, pat = patterns[q.k]
      pat.p.attr('width', c).attr('height', c)
      pat.dot.attr('cx', c / 2).attr('cy', c / 2).attr('r', Math.max(0.55, c * (q.k === 0 ? 0.12 : 0.2)))
      q.tex.attr('width', S).attr('height', S).style('fill', `url(#lk-cells${q.k}-${uid})`)
    } else q.tex.attr('width', 0)
    const strips = [[q.a, 0, 0, aF * S, S, 0], [q.b, aF * S, S - bF * S, S - aF * S, bF * S, 1], [q.both, 0, S - bF * S, aF * S, bF * S, 2]]
    for (const [el, x, y, w, h, i] of strips) {
      if (grow && !reduced()) el.attr('x', 0).attr('y', i === 0 ? 0 : S).attr('width', i === 0 ? 0 : w).attr('height', i === 0 ? S : 0)
      el.transition().duration(grow ? T * 1.1 : T).delay(delay + (grow ? i * T : 0)).attr('x', x).attr('y', y).attr('width', w).attr('height', h)
    }
    // the last, one dot per sample
    const n = q.k === 2 ? 100 : 0, cs = S / 10
    const cat = d => {
      const fx = (d % 10 + 0.5) / 10, fy = (Math.floor(d / 10) + 0.5) / 10
      return fx < aF ? (fy < bF ? 'both' : 'a') : (fy < bF ? 'b' : 'none')
    }
    q.gDots.selectAll('circle').data(d3.range(n)).join('circle')
      .attr('cx', d => (d % 10 + 0.5) * cs).attr('cy', d => S - (Math.floor(d / 10) + 0.5) * cs)
      .attr('r', d => cs * (cat(d) === 'both' ? 0.36 : 0.24)).attr('class', d => `lk-sq-dot is-${cat(d)}`)
    // axes on the whole square only: the share of the samples, tightest first; where a strip is wide enough to read,
    // its edge ticked in violet
    for (const el of [q.gx, q.gy, q.xl, q.yl]) el.attr('opacity', axes ? 1 : 0)
    if (axes) {
      const ticksFor = share => share > 0.05 ? [share, 0.5, 1] : [0, 0.5, 1]
      const axis = (g, ax, share) => {
        g.call(ax.tickValues(ticksFor(share)).tickFormat(v => v === 0 ? '0' : pct(v)).tickSize(4).tickSizeOuter(0))
        g.selectAll('text').attr('class', 'axis-label'); g.selectAll('line, path').attr('stroke', 'var(--rule)')
        g.selectAll('.tick').classed('is-edge', d => d === share)
      }
      axis(q.gx.attr('transform', `translate(0,${S})`), d3.axisBottom(d3.scaleLinear().range([0, S])), sh.a)
      axis(q.gy, d3.axisLeft(d3.scaleLinear().range([S, 0])), sh.b)
      cue(q.xl, null, L.small ? 'stretch, tightest first →' : 'samples by their stretch, tightest first →', { cls: 'axis-label' })
      q.xl.attr('transform', `translate(0,${S + (L.small ? 30 : 34)})`)
      cue(q.yl, null, L.small ? 'tilt, tightest first →' : 'by their tilt, tightest first →', { cls: 'axis-label' })
      q.yl.attr('transform', `translate(${L.small ? -34 : -44},${S}) rotate(-90)`)
    }
    q.title.attr('x', 0).attr('y', -10)
      .text(q.k === 0 ? `${fmt(sh.N)} samples${sh.today ? ', today' : ''}` : q.k === 1 ? 'the corner, 1,000' : 'its corner, 100')
  }
  /** sum: the whole square, the sum beside it; zoom: three squares, the corner enlarged twice; todaySum: today's. */
  function drawSquares (kind, entering) {
    const sh = sharesFor(kind), R = L.top
    const padL = L.small ? 44 : 58, padB = L.small ? 44 : 50, padT = 26
    const hAvail = R.y1 - R.y0 - padT - padB, wAvail = R.x1 - R.x0
    let places
    if (kind === 'zoom') {
      const gap = L.small ? 18 : 44
      const S = Math.max(70, Math.min((wAvail - padL - 2 * gap) / 3, hAvail))
      const x0 = R.x0 + padL + (wAvail - padL - 3 * S - 2 * gap) / 2, y = R.y0 + padT + (hAvail - S) / 2
      places = [0, 1, 2].map(k => ({ k, x: x0 + k * (S + gap), y, S }))
    } else {
      // the square on the left, the sum on the right; on a phone the sum under the square
      const S = Math.max(80, Math.min(hAvail - (L.small ? 54 : 0), wAvail * (L.small ? 0.5 : 0.4)))
      const x = L.small ? R.x0 + (wAvail - S) / 2 + padL / 2 : R.x0 + padL + 10, y = R.y0 + padT + (hAvail - (L.small ? 54 : 0) - S) / 2
      places = [{ k: 0, x, y, S }]
    }
    const prev = sqShown
    sqs.forEach(q => {
      const p = places.find(pp => pp.k === q.k)
      if (!p) { q.g.transition('show').duration(T / 2).attr('opacity', 0); q.place = null; return }
      const final = `translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) scale(1)`
      // the corners, new to the picture, grow out of their boxes in the square before
      const zoomIn = q.k > 0 && prev <= q.k && !reduced()
      const delay = zoomIn ? T * (0.8 + (q.k - 1) * 1.9) : 0
      if (zoomIn) {
        const pb = places[q.k - 1], s = pb.S * SIDES[q.k] / SIDES[q.k - 1]
        q.g.attr('opacity', 0).attr('transform', `translate(${pb.x.toFixed(1)},${(pb.y + pb.S - s).toFixed(1)}) scale(${(s / p.S).toFixed(4)})`)
          .transition('show').delay(delay).duration(T * 1.4).ease(d3.easeCubicInOut).attr('opacity', 1).attr('transform', final)
      } else if (q.place && !reduced() && (q.place.S !== p.S || q.place.x !== p.x)) {
        // the whole square moving and shrinking as the corners come in (or growing back)
        q.g.attr('transform', `translate(${q.place.x.toFixed(1)},${q.place.y.toFixed(1)}) scale(${(q.place.S / p.S).toFixed(4)})`)
          .transition('show').duration(T * 1.2).ease(d3.easeCubicInOut).attr('opacity', 1).attr('transform', final)
      } else q.g.transition('show').duration(T).attr('opacity', 1).attr('transform', final)
      q.place = p
      drawSquare(q, p.S, sh, SIDES[q.k], { delay: zoomIn ? delay + T : 0, grow: entering && q.k === 0, axes: q.k === 0 })
      const nxt = places.find(pp => pp.k === q.k + 1)
      const s = nxt ? p.S * SIDES[q.k + 1] / SIDES[q.k] : 0
      q.box.attr('x', 0).attr('y', p.S - s).attr('width', s).attr('height', s)
        .transition().duration(T).delay(nxt && prev <= q.k ? T * 0.4 + q.k * T * 1.9 : 0).attr('opacity', nxt ? 1 : 0)
      // a ring round the corner while it is too small to see, in the whole square alone
      const cw = Math.min(1, sh.a) * p.S
      q.mark.attr('cx', cw / 2).attr('cy', p.S - Math.min(1, sh.b) * p.S / 2).attr('r', L.small ? 8 : 11)
        .transition().duration(T).delay(entering ? T * 2.4 : 0).attr('opacity', q.k === 0 && places.length === 1 && cw < 8 ? 1 : 0)
      q.lx.attr('opacity', 0)
    })
    sqShown = places.length
    // the corner's count, in the last square of the zoom
    if (kind === 'zoom') {
      const q = sqs[2], p = places[2], side = SIDES[2]
      const aF = Math.min(1, sh.a / side), bF = Math.min(1, sh.b / side)
      q.lx.attr('x', aF * p.S + 6).attr('y', p.S - bF * p.S - 6).text(`${fmt(sh.nBoth)} as tight in both`)
        .transition().delay(prev < 3 ? T * 5 : 0).duration(T).attr('opacity', 1)
    }
    // the lines from each box to the corner it enlarges, behind the squares
    const links = places.slice(1).flatMap(p => {
      const pb = places[p.k - 1], s = pb.S * SIDES[p.k] / SIDES[p.k - 1]
      return [{ id: `${p.k}a`, k: p.k, x1: pb.x + s, y1: pb.y + pb.S - s, x2: p.x, y2: p.y }, { id: `${p.k}b`, k: p.k, x1: pb.x + s, y1: pb.y + pb.S, x2: p.x, y2: p.y + p.S }]
    })
    gLinks.selectAll('line').data(links, d => d.id).join(
      en => en.append('line').attr('opacity', 0),
      up => up,
      ex => ex.transition().duration(T / 2).attr('opacity', 0).remove())
      .attr('x1', d => d.x1).attr('y1', d => d.y1).attr('x2', d => d.x2).attr('y2', d => d.y2)
      .transition().duration(T).delay(d => prev < 3 && !reduced() ? T * (1.6 + (d.k - 1) * 1.9) : 0).attr('opacity', 1)
    drawSum(kind === 'zoom' ? null : places[0], sh, entering)
  }
  /** The sum beside the whole square, compact (2026-11-18, asked for): the two shares, multiplied, each named under it. */
  function drawSum (p, sh, entering) {
    gEq.transition().duration(T / 2).attr('opacity', p ? 1 : 0)
    if (!p) return
    const parts = [
      { k: 'a', text: pct(sh.a), sub: 'stretch', cls: 'lk-eq-num' }, { k: 'x', text: '×', cls: 'lk-eq-op' },
      { k: 'b', text: pct(sh.b), sub: 'tilt', cls: 'lk-eq-num' }, { k: 'e', text: '=', cls: 'lk-eq-op' },
      { k: 'c', text: pct(sh.both), sub: 'both', cls: 'lk-eq-res' },
    ]
    const gap = L.small ? 10 : 16
    const sel = gEq.selectAll('g.lk-eq-part').data(parts, d => d.k).join(en => {
      const g = en.append('g').attr('class', 'lk-eq-part')
      g.append('text').attr('class', d => d.cls).attr('text-anchor', 'middle')
      g.append('text').attr('class', 'lk-note lk-eq-sub').attr('text-anchor', 'middle')
      return g
    })
    sel.select(`text:first-child`).text(d => d.text)
    sel.select('.lk-eq-sub').text(d => d.sub || '')
    const widths = sel.nodes().map(n => n.querySelector('text').getComputedTextLength())
    const total = d3.sum(widths) + gap * (parts.length - 1)
    const cx = L.small ? L.W / 2 : (p.x + p.S + L.top.x1) / 2 + 10, cy = L.small ? p.y + p.S + 42 : p.y + p.S / 2
    let x = cx - total / 2
    sel.each(function (d, i) {
      const g = d3.select(this), w = widths[i]
      g.attr('transform', `translate(${(x + w / 2).toFixed(1)},${cy})`)
      g.select('.lk-eq-sub').attr('y', L.small ? 18 : 24)
      x += w + gap
      g.attr('opacity', entering && !reduced() ? 0 : 1)
      if (entering && !reduced()) g.transition().delay(T * (1.2 + i * 0.45)).duration(T / 2).attr('opacity', 1)
    })
    gEq.selectAll('text.lk-eq-count').data([0]).join('text').attr('class', 'lk-note lk-eq-count').attr('text-anchor', 'middle')
      .attr('x', cx).attr('y', cy + (L.small ? 38 : 50)).text(`about ${fmt(sh.nBoth)} of ${fmt(sh.N)} samples`)
  }

  // --- the sets -----------------------------------------------------------------------------
  const sixSet = () => ({ tone: 'six', label: 'The six orbits of 2016', label2: 'beyond 250 AU on average',
    spread: { stretch: R16.closest.spread_deg, tilt: R16.tilt.spread_deg },
    dirs: { stretch: six.map(o => ({ key: o.id, deg: farOf(o.closest[0]) })), tilt: six.map(o => ({ key: o.id, deg: tiltOf(o.node_deg) })) } })
  let drawK = 0
  /** Six of the known objects of 2016, picked at random: one of the build script's own samples, with both its directions. */
  const drawSetFrom = () => { const e = R16.examples[drawK++ % R16.examples.length]; return sampleOf(e.idx, e.spread) }
  const sampleOf = (idx, skyS) => {
    const dirs = {
      stretch: idx.map((j, i) => ({ key: `d${i}`, deg: farOf(pool16.points[j][0]) })),
      tilt: idx.map((j, i) => ({ key: `d${i}`, deg: tiltOf(pool16.node_deg[j]) })),
    }
    // the stretch's number is the paper's spread on the sky; the tilt's the spread of the tilts themselves
    return { tone: 'draw', label: 'Six known objects, picked at random', dirs, picked: new Set(idx),
      spread: { stretch: skyS ?? skySpread(idx.map(j => pool16.points[j])), tilt: spreadOf(dirs.tilt.map(d => d.deg)).spread } }
  }
  // a sample drawn on the page, for the blocks dropping and feeding in (an illustration)
  const freshSample = () => sampleOf(d3.shuffle(d3.range(pool16.points.length)).slice(0, 6))
  const todaySet = r => ({ tone: 'today', label: `Today, beyond ${r.a_min_au} AU`, label2: `${r.n} orbits`,
    spread: { stretch: r.closest.spread_deg, tilt: r.tilt.spread_deg },
    dirs: { stretch: r.objs.map(o => ({ key: o.id, deg: farOf(closestLon(o)) })), tilt: r.objs.map(o => ({ key: o.id, deg: tiltOf(o.node_deg) })) } })
  // as many of today's known objects as there are orbits beyond the line, picked at random (an illustration: the
  // piles and their shares come from the build script's draws)
  const todayDraw = r => {
    const idx = d3.shuffle(d3.range(poolToday.points.length)).slice(0, r.n)
    const dirs = {
      stretch: idx.map((j, i) => ({ key: `t${i}`, deg: farOf(poolToday.points[j][0]) })),
      tilt: idx.map((j, i) => ({ key: `t${i}`, deg: tiltOf((poolToday.node_deg || [])[j] ?? 0) })),
    }
    return { tone: 'draw', label: `${r.n} known objects, picked at random`, dirs, picked: new Set(idx),
      spread: { stretch: skySpread(idx.map(j => poolToday.points[j])), tilt: spreadOf(dirs.tilt.map(d => d.deg)).spread } }
  }

  // --- update ---------------------------------------------------------------------------------
  function update (s) {
    stop()
    last = s
    card.close()
    L = layoutFor(root.clientWidth, root.clientHeight)
    svg.attr('viewBox', `0 0 ${L.W} ${L.H}`).classed('is-small', L.small)
    svg.attr('aria-label', s.label || '')
    // which pieces are in the picture; a piece that comes while another goes waits for it
    const on = { comp: !!s.set && !s.square, piles: !!s.pile, sq: !!s.square }
    const first = !Object.values(shown).some(Boolean)
    const going = Object.keys(on).some(k => shown[k] && !on[k])
    const groups = { comp: gRow, piles: gPiles, sq: gSq }
    for (const [k, g] of Object.entries(groups)) {
      g.transition('fade').duration(T).delay(on[k] && !shown[k] && going ? T : 0).attr('opacity', on[k] ? 1 : 0)
        .style('pointer-events', on[k] ? null : 'none')
    }
    const was = shown
    shown = on
    if (!on.sq) sqShown = 0
    const today = s.set === 'today' || s.set === 'todayDraws' || s.square === 'todaySum' || s.pile === 'today'
    const sampler = today ? () => todayDraw(cutOf()) : freshSample

    // the compasses: alone, grown; with the piles below, at the top
    if (on.comp) {
      placeCompasses(!on.piles, !!s.pool, first || !was.comp)
      if (s.pool) drawPool(s.pool)
      else for (const cp of Object.values(comps)) cp.poolShown = null
      for (const cp of Object.values(comps)) cp.gPool.transition().duration(T).attr('opacity', s.pool ? 1 : 0)
      poolKey.transition().duration(T).attr('opacity', s.pool ? 1 : 0)
      const cycling = s.pile !== 'drop' && !s.feed
      if (s.set === 'six') drawSet(sixSet())
      else if (s.set === 'draws') {
        drawSet(drawSetFrom())
        if (cycling && !reduced()) timers.push(d3.interval(() => drawSet(drawSetFrom(), T * 0.8), CYCLE))
      } else if (s.set === 'today') drawSet(todaySet(cutOf()))
      else if (s.set === 'todayDraws') {
        drawSet(todayDraw(cutOf()))
        if (cycling && !reduced()) timers.push(d3.interval(() => drawSet(todayDraw(cutOf()), T * 0.8), CYCLE))
      }
    }
    if (on.sq) drawSquares(s.square, !was.sq)

    // the piles
    if (!on.piles) { for (const pl of Object.values(piles)) { pl.blocks = []; pl.gBlocks.selectAll('rect').remove() } return }
    const src = today ? cutOf() : R16
    for (const pl of Object.values(piles)) pileAxes(pl)
    pileTitle.attr('x', L.W / 2).attr('y', L.pileTitleY)
      .text(s.pile === 'drop' ? '' : `Histogram of the spreads of ${fmt(src.draws)} samples`)
    if (s.pile === 'drop') {
      for (const pl of Object.values(piles)) {
        pl.gBars.selectAll('rect').remove(); pl.gObs.attr('opacity', 0)
        if (pl.blocks.length >= DROPS) pl.blocks = []
        pl.gBlocks.attr('opacity', 1)
        drawBlocks(pl, false)
      }
      const addOne = animate => {
        const set = sampler()
        if (animate) drawSet(set, 60)
        for (const pl of Object.values(piles)) pl.blocks.push({ id: `b${pl.blocks.length}-${Math.random()}`, s: set.spread[pl.kind] })
      }
      if (reduced()) {
        while (piles.stretch.blocks.length < DROPS) addOne(false)
        for (const pl of Object.values(piles)) drawBlocks(pl, false)
      } else {
        // the first sample drops once the compasses have slid up and the piles have opened, then quicker and quicker
        let wait = DROP_FIRST
        const drop = () => {
          if (piles.stretch.blocks.length >= DROPS) return
          addOne(true)
          for (const pl of Object.values(piles)) drawBlocks(pl, true)
          wait = Math.max(DROP_LAST, wait * DROP_EASE)
          timers.push(d3.timeout(drop, wait))
        }
        timers.push(d3.timeout(drop, T * 1.6))
      }
      return
    }
    for (const pl of Object.values(piles)) {
      pl.blocks = []
      pl.gBlocks.selectAll('rect').transition().duration(T / 2).attr('opacity', 0).remove()
      const R = src[pl.kind === 'tilt' ? 'tilt' : 'closest']
      drawPile(pl, R.hist, R.spread_deg, { fill: s.fill,
        after: { long: `${fmt(R.n_as_tight)} of ${fmt(src.draws)} as tight (${pct(R.p)})`, short: `${pct(R.p)} as tight` } })
    }
    // samples keep coming, on a loop, each one's blocks flying to their bars (2026-11-18, asked for)
    if (s.feed && on.comp && !reduced()) {
      timers.push(d3.interval(() => { const set = sampler(); drawSet(set, 260); feedOne(set) }, FEED_MS))
    }
  }

  // redraw when the panel changes shape (a phone turning, a window resized), not on the first report
  let raf = 0, size = ''
  new ResizeObserver(() => {
    const now = `${root.clientWidth}x${root.clientHeight}`
    if (now === size) return
    const firstSize = !size
    size = now
    if (firstSize) return
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => { if (last) { sqShown = 0; for (const q of sqs) q.place = null; update({ ...last, fill: false }) } })
  }).observe(root)

  return { update, stop }
}

/** Redraw a figure to its panel's width (the words keep their size on screen), not on the first report. */
function fitWidth (root, render) {
  let size = 0, raf = 0
  const now = () => Math.round(root.clientWidth)
  render(now())
  size = now()
  new ResizeObserver(() => {
    if (Math.abs(now() - size) < 8) return
    size = now()
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => render(size))
  }).observe(root)
}

/** Are the two unrelated? How often a sample's tilt is as tight as the six's, among all the samples of a million and
 *  among those whose stretch is as tight: two bars, the part past what unrelated spreads would give in ember, a
 *  dashed line where the second would end if they were unrelated. The bars grow when the figure comes into view. */
export function makeRelated (root, data) {
  const J = data.joint_check
  const all = J.tilt_n / J.draws, given = J.both_n / J.closest_n
  let grown = false
  const quick = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  fitWidth(root, width => {
    d3.select(root).selectAll('svg').remove()
    // drawn at the panel's own width, so the words stay one size; on a phone each name above its bar
    const W = Math.max(300, Math.min(760, width || 680)), narrow = W < 540
    const rowsY = narrow ? [104, 196] : [108, 196], H = narrow ? 250 : 270
    const svg = d3.select(root).append('svg').attr('class', 'lk lk-rel').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', `Of all ${fmt(J.draws)} samples, ${pct(all)} have a tilt as tight as the six orbits of 2016; of the ${fmt(J.closest_n)} whose stretch is as tight, ${pct(given)} do.`)
    const x0 = narrow ? 8 : 236, x1 = W - (narrow ? 96 : 120)
    const xs = d3.scaleLinear().domain([0, given * 1.04]).range([x0, x1])
    svg.append('text').attr('class', 'lk-title').attr('x', narrow ? 8 : 20).attr('y', 32).text('Samples with a tilt as tight as the six’s')
    const rows = [
      { k: 'all', label: 'All samples', sub: `${fmt(J.tilt_n)} of ${fmt(J.draws)}`, p: all, y: rowsY[0] },
      { k: 'given', label: 'With a stretch as tight', sub: `${fmt(J.both_n)} of ${fmt(J.closest_n)}`, p: given, y: rowsY[1] },
    ]
    const bh = narrow ? 26 : 34
    const g = svg.selectAll('g.lk-rel-row').data(rows).join('g').attr('class', d => `lk-rel-row is-${d.k}`)
    g.append('text').attr('class', 'lk-rel-lbl').attr('x', narrow ? x0 : x0 - 16).attr('y', d => narrow ? d.y - bh / 2 - 9 : d.y + 5)
      .attr('text-anchor', narrow ? 'start' : 'end').text(d => d.label)
    g.append('rect').attr('class', 'lk-rel-bar').attr('x', x0).attr('y', d => d.y - bh / 2).attr('height', bh).attr('rx', 3)
      .attr('width', d => grown ? (d.k === 'given' ? xs(all) : xs(d.p)) - x0 : 0)
    // the part of the second bar past where unrelated spreads would end it
    g.filter(d => d.k === 'given').append('rect').attr('class', 'lk-rel-more').attr('x', xs(all)).attr('y', d => d.y - bh / 2)
      .attr('height', bh).attr('width', grown ? xs(given) - xs(all) : 0)
    g.append('text').attr('class', 'lk-rel-val').attr('x', d => xs(d.p) + 10).attr('y', d => d.y + 2).attr('opacity', grown ? 1 : 0).text(d => pct(d.p))
    g.append('text').attr('class', 'lk-note').attr('x', d => xs(d.p) + 10).attr('y', d => d.y + 19).attr('opacity', grown ? 1 : 0).text(d => d.sub)
    const guide = svg.append('line').attr('class', 'lk-rel-guide').attr('x1', xs(all)).attr('x2', xs(all))
      .attr('y1', rows[0].y - bh / 2 - 10).attr('y2', rows[1].y + bh / 2 + 10).attr('opacity', grown ? 1 : 0)
    if (grown) return
    const grow = () => {
      grown = true
      const q = quick()
      g.select('.lk-rel-bar').transition().delay(d => q ? 0 : (d.k === 'all' ? 200 : 1300)).duration(q ? 0 : 900).ease(d3.easeCubicOut)
        .attr('width', d => (d.k === 'given' ? xs(all) : xs(d.p)) - x0)
      g.select('.lk-rel-more').transition().delay(q ? 0 : 2200).duration(q ? 0 : 700).ease(d3.easeCubicOut).attr('width', xs(given) - xs(all))
      g.selectAll('.lk-rel-val, .lk-note').transition().delay(d => q ? 0 : (d.k === 'all' ? 1000 : 2800)).duration(400).attr('opacity', 1)
      guide.transition().delay(q ? 0 : 1100).duration(500).attr('opacity', 1)
    }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); grow() } }, { threshold: 0.5 })
    io.observe(root)
  })
}

/** Where the line is drawn, its own figure (2026-11-18, asked for: as scrolly steps it changed too much at once).
 *  Today's 62 reliable orbits by how far out each is on average and its closest point to the Sun; a line the reader
 *  drags, snapping to the distances the build script tested; under it, on the same distances, luck's odds with the
 *  line at each (both shares multiplied, as in 2016), the one in use lit; a switch for only the orbits clear of
 *  Neptune (closest point beyond 42 AU, as Brown and Batygin now count them). Drawn at the panel's width. */
export function makeLineTool (root, data, etnos) {
  const byId = new Map(etnos.map(o => [o.id, o]))
  const card = objectCard(root)
  const rows = data.today
  const STOPS = [...new Set(rows.map(r => r.a_min_au))].sort((a, b) => a - b)
  const rowAt = (a, clear) => rows.find(r => r.a_min_au === a && r.q_min_au === (clear ? 42 : 30))
  const objs = rowAt(150, false).ids.map(id => byId.get(id)).filter(Boolean)       // the 62
  const odds = r => oneIn(r.product)
  let a = 250, clear = false, draw = () => {}

  // the switch, on the picture's bar (made once; the drawing below is redrawn to the panel's width)
  const bar = d3.select(root).append('div').attr('class', 'pic-bar lk-linebar')
  const lbl = bar.append('label').attr('class', 'toggle')
  lbl.append('input').attr('type', 'checkbox').on('change', ev => { clear = ev.target.checked; root.classList.add('is-touched'); draw(400) })
  lbl.append('span').attr('class', 'box')
  lbl.append('span').text('Only orbits clear of Neptune')

  fitWidth(root, width => {
    d3.select(root).selectAll('svg').remove()
    const W = Math.max(330, Math.min(940, width || 900)), narrow = W < 600
    const H = narrow ? 520 : 540
    const svg = d3.select(root).insert('svg', ':first-child').attr('class', 'lk lk-linetool').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'group')
      .attr('aria-label', 'Today’s reliable orbits, with a line the reader moves to choose which count, and luck’s odds for each line')
    const X0 = narrow ? 52 : 78, X1 = W - (narrow ? 12 : 28), T0 = narrow ? 92 : 66, T1 = narrow ? 290 : 280
    const O0 = T1 + (narrow ? 90 : 84), O1 = H - (narrow ? 46 : 48)
    const aMax = d3.max(objs, o => o.a_au)
    // the distances the line can take (150 to 400 AU) get most of the width; the far orbits share the rest
    const xs = d3.scaleLog().domain([140, 450, aMax * 1.12]).range([X0, X0 + (X1 - X0) * 0.64, X1])
    const ys = d3.scaleLinear().domain([30, Math.ceil(d3.max(objs, o => o.q_au) / 10) * 10]).range([T1, T0])
    const yo = d3.scaleLog().domain([2, 100]).range([O1, O0])

    // the orbits: how far out each is on average, its closest point
    svg.append('text').attr('class', 'lk-title').attr('x', narrow ? 8 : 16).attr('y', narrow ? 24 : 22).text('Today’s reliable orbits')
    const shade = svg.append('rect').attr('class', 'lk-lshade')
    const gx = svg.append('g').attr('transform', `translate(0,${T1})`)
      .call(d3.axisBottom(xs).tickValues((narrow ? [150, 200, 300, 1000] : [150, 200, 250, 300, 400, 1000, 2000]).filter(v => v < aMax * 1.12)).tickFormat(d => d).tickSizeOuter(0))
    const gy = svg.append('g').attr('transform', `translate(${X0},0)`).call(d3.axisLeft(ys).ticks(narrow ? 4 : 5).tickSizeOuter(0))
    for (const ax of [gx, gy]) { ax.selectAll('text').attr('class', 'axis-label au'); ax.selectAll('line, path').attr('stroke', 'var(--rule)') }
    svg.append('text').attr('class', 'axis-label').attr('x', (X0 + X1) / 2).attr('y', T1 + 34).attr('text-anchor', 'middle').text('how far out, on average (AU)')
    svg.append('text').attr('class', 'axis-label').attr('text-anchor', 'middle').attr('transform', `translate(${X0 - (narrow ? 34 : 42)},${(T0 + T1) / 2}) rotate(-90)`)
      .text(narrow ? 'closest point (AU)' : 'closest point to the Sun (AU)')
    const nepLine = svg.append('line').attr('class', 'lk-nep').attr('x1', X0).attr('x2', X1).attr('y1', ys(42)).attr('y2', ys(42)).attr('opacity', 0)
    const nepLbl = svg.append('text').attr('class', 'lk-nep-lbl halo').attr('x', X1 - 4).attr('y', ys(42) - 7).attr('text-anchor', 'end').attr('opacity', 0).text('clear of Neptune, 42 AU')
    const dots = svg.append('g').selectAll('circle').data(objs, o => o.id).join('circle').attr('class', 'lk-ldot').attr('r', narrow ? 4 : 5)
      .attr('cx', o => xs(o.a_au)).attr('cy', o => ys(o.q_au)).style('cursor', 'pointer')
      .on('pointerenter', (ev, o) => card.hover(o)).on('pointerleave', () => card.leave()).on('click', (ev, o) => card.pick(o))
    const count = svg.append('text').attr('class', 'lk-lcount halo').attr('x', X1 - 6).attr('y', T1 - 10).attr('text-anchor', 'end')

    // luck's odds, on the same distances
    svg.append('text').attr('class', 'lk-title').attr('x', narrow ? 8 : 16).attr('y', O0 - (narrow ? 34 : 30)).text('Luck’s odds with the line there')
    const goy = svg.append('g').attr('transform', `translate(${X0},0)`)
      .call(d3.axisLeft(yo).tickValues(narrow ? [2, 10, 100] : [2, 5, 10, 20, 50, 100]).tickFormat(d => `1 in ${d}`).tickSizeOuter(0))
    goy.selectAll('text').attr('class', 'axis-label'); goy.selectAll('line, path').attr('stroke', 'var(--rule)')
    const oddsPath = svg.append('path').attr('class', 'lk-od-path')
    const gOdds = svg.append('g')
    // the two lines people have drawn: Batygin and Brown's in 2016, this site's
    // the lines drawn so far: Batygin and Brown's in 2016, and later studies' (2026-11-18: not “this site”, which
    // is not where the 150 AU line comes from)
    svg.append('g').selectAll('text').data([{ a: 250, text: '2016' }, { a: 150, text: 'later studies' }])
      .join('text').attr('class', 'lk-od-mark').attr('x', d => xs(d.a)).attr('y', O1 + 34).attr('text-anchor', 'middle').text(d => d.text)

    // the line, and its handle along the top: dragged, it snaps to the nearest tested distance
    const gLine = svg.append('g').attr('class', 'lk-drag').attr('tabindex', 0).attr('role', 'slider')
      .attr('aria-label', 'Which orbits count: the distance beyond which they count').attr('aria-valuemin', STOPS[0]).attr('aria-valuemax', STOPS.at(-1))
    const hit = gLine.append('rect').attr('class', 'lk-drag-hit').attr('x', -16).attr('y', T0 - 30).attr('height', O1 - T0 + 30).attr('width', 32)
    gLine.append('line').attr('class', 'lk-lline is-on').attr('y1', T0 - 6).attr('y2', O1)
    // the handle just above the orbits, clear of the title over them
    // a pill with arrows either side, and until it is first moved a word saying so (2026-11-18, asked for: it did not
    // look like something to drag)
    const handle = gLine.append('g').attr('class', 'lk-handle').attr('transform', `translate(0,${T0 - 18})`)
    handle.append('rect').attr('x', -40).attr('y', -13).attr('width', 80).attr('height', 26).attr('rx', 13)
    const handleTxt = handle.append('text').attr('class', 'lk-handle-txt').attr('text-anchor', 'middle').attr('y', 4.5)
    handle.selectAll('path.lk-chev').data([-1, 1]).join('path').attr('class', 'lk-chev')
      .attr('d', d => `M${d * 47},-5L${d * 54},0L${d * 47},5`)
    handle.append('text').attr('class', 'lk-drag-hint').attr('x', 62).attr('y', 4.5).text('drag')
    void hit
    const nearest = x => STOPS.reduce((b, s) => Math.abs(xs(s) - x) < Math.abs(xs(b) - x) ? s : b, STOPS[0])
    const set = (to, ms = 260) => {
      if (to === a) return
      a = to; root.classList.add('is-touched')
      draw(ms)
    }
    gLine.call(d3.drag().on('start', () => gLine.classed('is-dragging', true))
      .on('drag', ev => set(nearest(ev.x), 180)).on('end', () => gLine.classed('is-dragging', false)))
    gLine.on('keydown', ev => {
      const i = STOPS.indexOf(a)
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { ev.preventDefault(); set(STOPS[Math.min(STOPS.length - 1, i + 1)]) }
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { ev.preventDefault(); set(STOPS[Math.max(0, i - 1)]) }
    })

    draw = ms => {
      const tr = sel => ms ? sel.transition().duration(ms).ease(d3.easeCubicOut) : sel
      const qMin = clear ? 42 : 30, cur = rowAt(a, clear)
      const lx = xs(a)
      tr(shade).attr('x', lx).attr('width', X1 - lx).attr('y', T0).attr('height', ys(qMin) - T0)
      tr(gLine).attr('transform', `translate(${lx},0)`)
      handleTxt.text(`${a} AU`)
      gLine.attr('aria-valuenow', a).attr('aria-valuetext', `${a} AU: ${cur.n} orbits count, luck 1 in ${fmt(odds(cur))}`)
      nepLine.transition().duration(300).attr('opacity', clear ? 1 : 0)
      nepLbl.transition().duration(300).attr('opacity', clear ? 1 : 0)
      dots.attr('class', o => o.a_au > a && o.q_au > qMin ? 'lk-ldot is-in' : 'lk-ldot')
      count.text(`${cur.n} of ${objs.length} count`)
      const fam = STOPS.map(s => ({ a: s, r: rowAt(s, clear) }))
      tr(oddsPath).attr('d', d3.line()(fam.map(d => [xs(d.a), yo(Math.min(100, odds(d.r)))])))
      gOdds.selectAll('g').data(fam, d => d.a).join(en => {
        const g = en.append('g').style('cursor', 'pointer').on('click', (ev, d) => set(d.a))
        g.append('circle'); g.append('text').attr('class', 'lk-od-lbl halo is-on').attr('text-anchor', 'middle')
        return g
      }).each(function (d) {
        const g = d3.select(this), on = d.a === a, y = yo(Math.min(100, odds(d.r)))
        tr(g.select('circle')).attr('cx', xs(d.a)).attr('cy', y).attr('r', on ? 7 : 4.5)
        g.select('circle').attr('class', on ? 'lk-od-dot is-on' : 'lk-od-dot')
        // the one in use named; the others read off the axis (named, they crowded)
        tr(g.select('text')).attr('x', xs(d.a)).attr('y', y - 14)
        g.select('text').text(on ? `1 in ${fmt(odds(d.r))}` : '')
      })
    }
    draw(0)
  })
}
