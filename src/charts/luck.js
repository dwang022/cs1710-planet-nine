// Section 03 — "could this just be luck?", built up in front of the reader.
//
// One solar system on a compass, with its average-direction arrow, and where
// that solar system's arrow length lands among many others: side by side in a
// wide panel, the compass above the pile in a squarer one or on a phone. The
// drawing's units follow the panel's shape, so it fills the panel and its text
// stays readable instead of being letterboxed and shrunk.
//
// The story starts with a single fake solar system, drops fake ones into the
// pile one block at a time, then fills in the whole pile at once, and only then
// brings in the real objects. The reader sees the null distribution being made
// before being asked to compare anything against it.

import * as d3 from 'd3'
import { resultant } from '../stats.js'

const RAD = Math.PI / 180
const T = 650
const BIN = 0.025

/** Where everything sits in a panel w × h pixels wide. */
function layoutFor (w, h) {
  if (!w || !h || w / h >= 1.45) {
    return {
      W: 960, H: 500, tall: false, ring: { cx: 175, cy: 270, r: 118 }, reach: 60, step: 9, dotR: 4.5,
      hist: { x0: 400, x1: 935, top: 70, bottom: 420 }, titleY: 52, histTitleY: 30,
    }
  }
  const W = Math.round(Math.max(440, Math.min(820, w / 0.95)))
  const H = Math.round(W * h / w)
  const small = W < 520
  const reach = small ? 34 : 52
  const split = Math.round(H * 0.5)
  const r = Math.max(40, Math.min(W * 0.2, (split - 56 - 2 * reach - 40) / 2))
  return {
    W, H, tall: true, ring: { cx: W / 2, cy: 56 + reach + r, r }, reach, step: small ? 6 : 8, dotR: small ? 3.4 : 4.2,
    hist: { x0: 34, x1: W - 30, top: split + 58, bottom: H - 52 }, titleY: 22, histTitleY: split + 14,
  }
}

export function makeLuck (root) {
  let L = layoutFor(0, 0)
  const svg = d3.select(root).append('svg').attr('role', 'img')
  const defs = svg.append('defs')
  defs.append('marker').attr('id', 'luck-head').attr('viewBox', '0 0 10 10')
    .attr('refX', 7).attr('refY', 5).attr('markerWidth', 13).attr('markerHeight', 13)
    .attr('markerUnits', 'userSpaceOnUse')
    .attr('orient', 'auto').append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', 'var(--text-primary)')

  // --- one solar system ---------------------------------------------------
  const gRing = svg.append('g')
  const ringTitle = gRing.append('text').attr('text-anchor', 'middle').attr('font-size', 16).attr('font-weight', 600)
  // the key for the faint dots, shown when objects seen in one season are counted
  const ringKey = gRing.append('g').attr('class', 'luck-key').attr('opacity', 0)
  const k1 = ringKey.append('g'), k2 = ringKey.append('g')
  k1.append('circle').attr('r', 4.5).attr('fill', 'var(--series-1)')
  k1.append('text').attr('x', 9).attr('y', 4).text('seen in more than one season')
  k2.append('circle').attr('r', 4.5).attr('fill', 'var(--series-1)').attr('opacity', 0.4)
  k2.append('text').attr('x', 9).attr('y', 4).text('one season')
  const ringCircle = gRing.append('circle').attr('fill', 'none').attr('stroke', 'var(--text-muted)').attr('stroke-opacity', 0.5)
  const ringSun = gRing.append('circle').attr('r', 3.5).attr('fill', 'var(--sun)')
  const gRingDots = gRing.append('g')
  const ringArrow = gRing.append('line')
    .attr('stroke', 'var(--text-primary)').attr('stroke-width', 3.5)
    .attr('stroke-linecap', 'round').attr('marker-end', 'url(#luck-head)')
  const ringFoot = gRing.append('text').attr('text-anchor', 'middle').attr('font-size', 14).attr('font-weight', 600)

  // the hand-off from one solar system to its block in the pile
  const handoff = svg.append('path').attr('fill', 'none')
    .attr('stroke', 'var(--text-muted)').attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3 5').attr('opacity', 0)

  // --- the pile -----------------------------------------------------------
  const gHist = svg.append('g')
  const gAxis = gHist.append('g')
  const axisLabel = gHist.append('text').attr('class', 'axis-label').attr('text-anchor', 'middle').attr('font-size', 13)
    .text('average arrow length  →  more lined up')
  const histTitle = gHist.append('text').attr('font-size', 16).attr('font-weight', 600).attr('fill', 'var(--text-primary)')
  const histSub = gHist.append('text').attr('font-size', 13).attr('fill', 'var(--text-muted)')
  const gBars = gHist.append('g')
  const gBlocks = gHist.append('g')
  const gObs = gHist.append('g').attr('opacity', 0)
  gObs.append('line').attr('stroke', 'var(--series-1)').attr('stroke-width', 3)
  gObs.append('circle').attr('r', 6).attr('fill', 'var(--series-1)')
    .attr('stroke', 'var(--surface-1)').attr('stroke-width', 2)
  const obsLabel = gObs.append('text').attr('class', 'halo').attr('font-size', 15)
    .attr('font-weight', 600).attr('fill', 'var(--series-1-ink)')
  const obsLabel2 = gObs.append('text').attr('class', 'halo').attr('font-size', 13)
    .attr('fill', 'var(--text-secondary)')
  const pileLabel = gHist.append('text').attr('class', 'halo').attr('font-size', 14)
    .attr('font-weight', 600).attr('fill', 'var(--text-secondary)').attr('text-anchor', 'middle')
    .attr('opacity', 0)

  // --- the published ways of choosing the objects ---------------------------
  const gCuts = svg.append('g').attr('opacity', 0).style('pointer-events', 'none')

  let blocks = []
  let blockId = 0
  let timer = null
  let x = d3.scaleLinear()
  let last = null

  function stopTimer () { if (timer) { timer.stop(); timer = null } }

  /** Size the drawing to the panel and put the fixed pieces in place. */
  function arrange () {
    L = layoutFor(root.clientWidth, root.clientHeight)
    const { ring: R, hist: Hs } = L
    svg.attr('viewBox', `0 0 ${L.W} ${L.H}`)
    ringTitle.attr('x', R.cx).attr('y', L.titleY)
    ringKey.attr('transform', `translate(${R.cx - 138},${L.titleY + 20})`)
    k2.attr('transform', 'translate(196,0)')
    ringCircle.attr('cx', R.cx).attr('cy', R.cy).attr('r', R.r)
    ringSun.attr('cx', R.cx).attr('cy', R.cy)
    ringArrow.attr('x1', R.cx).attr('y1', R.cy)
    ringFoot.attr('x', R.cx).attr('y', R.cy + R.r + L.reach + 14)
    gAxis.attr('transform', `translate(0,${Hs.bottom})`)
    axisLabel.attr('x', (Hs.x0 + Hs.x1) / 2).attr('y', Hs.bottom + 40)
    histTitle.attr('x', Hs.x0).attr('y', L.histTitleY)
    histSub.attr('x', Hs.x0).attr('y', L.histTitleY + 22)
  }

  /** Draw one solar system on the compass. */
  function drawRing (angles, { real, quality }) {
    const { ring: R } = L
    const st = resultant(angles.map(a => a.deg))
    const placed = []
    const bins = d3.group(angles.map((a, i) => ({ ...a, i })), a => Math.floor(a.deg / 9))
    for (const [, g] of bins) g.forEach((a, k) => placed.push({ ...a, rr: Math.min(R.r + L.step + k * L.step, R.r + L.reach) }))
    const dots = gRingDots.selectAll('circle').data(placed, d => d.key)
    dots.exit().remove()
    dots.enter().append('circle')
      .attr('stroke', 'var(--surface-1)').attr('stroke-width', 1)
      .attr('cx', R.cx).attr('cy', R.cy)
      .merge(dots)
      .attr('r', L.dotR)
      .attr('fill', real ? 'var(--series-1)' : 'var(--text-secondary)')
      .attr('opacity', d => d.faint ? 0.4 : 1)
      .transition().duration(real ? T : 300)
      .attr('cx', d => R.cx + d.rr * Math.cos(d.deg * RAD))
      .attr('cy', d => R.cy - d.rr * Math.sin(d.deg * RAD))
    ringArrow.transition().duration(real ? T : 300)
      .attr('x2', R.cx + R.r * st.R * Math.cos(st.meanDeg * RAD))
      .attr('y2', R.cy - R.r * st.R * Math.sin(st.meanDeg * RAD))
    ringTitle.text(real ? 'The real objects' : 'A fake solar system')
      .attr('fill', real ? 'var(--series-1-ink)' : 'var(--text-primary)')
    ringKey.transition().duration(T).attr('opacity', real && !quality ? 1 : 0)
    ringFoot.text(`arrow length ${st.R.toFixed(2)}`)
      .attr('fill', real ? 'var(--series-1-ink)' : 'var(--text-primary)')
    return st
  }

  function randomAngles (n) {
    return d3.range(n).map(i => ({ key: 'r' + i, deg: Math.random() * 360 }))
  }

  function drawBlocks (animateLast) {
    const { ring: R, hist: Hs } = L
    const bw = x(BIN) - x(0)
    const stack = new Map()
    const placed = blocks.map(b => {
      const bin = Math.floor(b.R / BIN)
      const k = stack.get(bin) || 0
      stack.set(bin, k + 1)
      return { ...b, bx: Math.min(x(bin * BIN), Hs.x1 - bw) + 1, by: Hs.bottom - (k + 1) * 11 }
    })
    const sel = gBlocks.selectAll('rect').data(placed, d => d.id)
    sel.exit().transition().duration(300).attr('opacity', 0).remove()
    sel.enter().append('rect').attr('rx', 2)
      .attr('fill', 'var(--text-secondary)')
      .attr('x', d => animateLast ? (L.tall ? R.cx : R.cx + R.r + 40) : d.bx)
      .attr('y', d => animateLast ? (L.tall ? R.cy + R.r : R.cy) : d.by)
      .attr('width', Math.max(2, bw - 2)).attr('height', 9)
      .attr('opacity', 0)
      .merge(sel)
      .transition().duration(animateLast ? 450 : T).ease(d3.easeCubicOut)
      .attr('x', d => d.bx).attr('y', d => d.by)
      .attr('width', Math.max(2, bw - 2))
      .attr('opacity', 1)
  }

  function update (s) {
    stopTimer()
    last = s
    arrange()
    const { ring: R, hist: Hs } = L
    const nd = s.nullDist
    // The axis reaches the last fake solar system with any count: a small
    // sample spreads them far past 0.5, and a bar beyond the axis would be
    // drawn outside the chart. Bins are BIN wide, so this stays on a bin edge.
    const reach = nd ? d3.max(nd.counts, (c, i) => c ? (i + 1) * BIN : 0) : 0
    const xMax = Math.min(1, Math.max(s.xMax || 0.5, reach))
    x = d3.scaleLinear().domain([0, xMax]).range([Hs.x0, Hs.x1])
    gAxis.transition().duration(T)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.1f')))
    gAxis.selectAll('text').attr('class', 'axis-label').attr('font-size', 12)
    gAxis.selectAll('line, path').attr('stroke', 'var(--rule)')

    histTitle.text(s.histTitle || '')
    histSub.text(s.histSub || '')

    // --- the compass --------------------------------------------------------
    gRing.transition().duration(T).attr('opacity', s.cuts ? 0 : 1)
    if (s.ring === 'real') {
      drawRing(s.real.map(o => ({ key: o.id, deg: o.varpi_deg, faint: !o.well_determined })), { real: true, quality: s.quality })
    } else if (s.ring === 'random' && !s.animate) {
      const st = drawRing(randomAngles(s.n), { real: false })
      if (s.blocks === 'one') blocks = [{ id: 'b0', R: st.R }]
    }

    // --- blocks, bars, or neither -----------------------------------------
    if (s.blocks === 'none') blocks = []
    if (s.blocks !== 'animate') drawBlocks(false)
    gBlocks.transition().duration(T).attr('opacity', s.blocks === 'none' ? 0 : 1)

    handoff.transition().duration(T).attr('opacity', s.blocks === 'one' ? 0.8 : 0)
    if (s.blocks === 'one' && blocks[0]) {
      const bx = x(Math.floor(blocks[0].R / BIN) * BIN) + (x(BIN) - x(0)) / 2
      handoff.attr('d', L.tall
        ? `M${R.cx + R.r * 0.3},${R.cy + R.r + 10} C${R.cx + R.r * 0.3},${R.cy + R.r + 90} ${bx},${Hs.bottom - 110} ${bx},${Hs.bottom - 16}`
        : `M${R.cx + R.r * 0.9},${R.cy - 40} C${R.cx + 230},${R.cy - 140} ${bx},${Hs.bottom - 140} ${bx},${Hs.bottom - 16}`)
    }

    const maxC = nd ? d3.max(nd.counts) : 1
    const y = d3.scaleLinear().domain([0, maxC]).range([0, Hs.bottom - Hs.top - 54])
    const shown = nd && s.bars ? nd.counts.slice(0, Math.floor(xMax / BIN + 1e-9)) : []
    const bars = gBars.selectAll('rect').data(shown, (d, i) => i)
    bars.exit().transition().duration(T / 2).attr('height', 0).attr('y', Hs.bottom).remove()
    bars.enter().append('rect').attr('rx', 2)
      .attr('y', Hs.bottom).attr('height', 0)
      .merge(bars)
      .attr('x', (d, i) => x(i * BIN) + 1)
      .attr('width', Math.max(1, x(BIN) - x(0) - 2))
      .transition().duration(T).delay((d, i) => i * 12)
      .attr('fill', (d, i) => s.observed != null && (i + 1) * BIN > s.observed ? 'var(--series-1)' : 'var(--surface-3)')
      .attr('fill-opacity', (d, i) => s.observed != null && (i + 1) * BIN > s.observed ? 0.75 : 1)
      .attr('y', d => Hs.bottom - y(d)).attr('height', d => y(d))

    // The label sits to the left of the pile's peak; when the peak is hard
    // against the axis there is no room, and the bars speak for themselves.
    const peak = nd ? nd.counts.indexOf(maxC) : 0
    if (nd && s.bars && s.pileText && x(peak * BIN) - Hs.x0 > 150) {
      pileLabel.text(s.pileText)
        .transition().duration(T)
        .attr('x', x(peak * BIN) - 10).attr('text-anchor', 'end')
        .attr('y', Hs.bottom - y(maxC) * 0.6)
        .attr('opacity', 1)
    } else pileLabel.transition().duration(T / 2).attr('opacity', 0)

    // --- the real value ---------------------------------------------------
    if (s.observed != null) {
      const ox = x(Math.min(s.observed, xMax))
      const right = ox > Hs.x1 - 210
      gObs.select('line').transition().duration(T).attr('x1', ox).attr('x2', ox)
        .attr('y1', Hs.top + 10).attr('y2', Hs.bottom)
      gObs.select('circle').transition().duration(T).attr('cx', ox).attr('cy', Hs.top + 10)
      obsLabel.text(`the real objects: ${s.observed.toFixed(2)}`)
        .transition().duration(T)
        .attr('x', ox + (right ? -12 : 12)).attr('y', Hs.top + 15)
        .attr('text-anchor', right ? 'end' : 'start')
      obsLabel2.text(s.obsText || '')
        .transition().duration(T)
        .attr('x', ox + (right ? -12 : 12)).attr('y', Hs.top + 36)
        .attr('text-anchor', right ? 'end' : 'start')
    }
    gObs.transition().duration(T).attr('opacity', s.observed != null ? 1 : 0)

    gHist.transition().duration(T).attr('opacity', s.cuts ? 0 : 1)
    drawCuts(s.cuts)

    // --- many fake solar systems, one at a time --------------------------
    if (s.blocks === 'animate') {
      if (!blocks.length || blocks.length >= 60) blocks = blocks.slice(0, 1)
      timer = d3.interval(() => {
        if (blocks.length >= 60) { stopTimer(); return }
        const st = drawRing(randomAngles(s.n), { real: false })
        blocks.push({ id: 'b' + (++blockId), R: st.R })
        drawBlocks(true)
      }, 420)
    }
  }

  /**
   * One row per distance cut, each with two marks on one odds axis: the
   * objects seen in more than one season (a violet dot) and every object (a
   * grey ring). Their odds sit above and below the line so they never collide.
   * rows: [{ title, good: { oneIn }, all: { oneIn } }]
   */
  function drawCuts (rows) {
    gCuts.transition().duration(T).attr('opacity', rows ? 1 : 0)
    if (!rows) return
    gCuts.selectAll('*').remove()
    const tall = L.tall
    const left = tall ? 34 : 40
    const x0 = tall ? 40 : 440, x1 = tall ? L.W - 52 : 930
    const top = tall ? 128 : 150, rowH = tall ? Math.min(190, (L.H - top - 110) / rows.length) : 92
    const trackDy = tall ? 52 : 0
    const xl = d3.scaleLog().domain([1, 1000]).range([x0, x1]).clamp(true)
    const bottom = top + (rows.length - 1) * rowH + trackDy + 58

    // the key: the two marks
    const key = gCuts.append('g').attr('class', 'luck-key').attr('transform', `translate(${left},${tall ? 40 : 70})`)
    key.append('circle').attr('cx', 6).attr('r', 6).attr('fill', 'var(--series-1)')
    key.append('text').attr('x', 18).attr('y', 4).text('seen in more than one season')
    key.append('circle').attr('cx', 236).attr('r', 5.5).attr('fill', 'none').attr('stroke', 'var(--text-secondary)').attr('stroke-width', 2)
    key.append('text').attr('x', 248).attr('y', 4).text('every object')

    // the usual bar: 1 in 20
    const bandTop = top + trackDy - 34
    gCuts.append('rect').attr('x', xl(20)).attr('y', bandTop).attr('width', xl(1000) - xl(20))
      .attr('height', bottom - bandTop - 18).attr('fill', 'var(--p9)').attr('opacity', 0.08)
    gCuts.append('line').attr('x1', xl(20)).attr('x2', xl(20)).attr('y1', bandTop).attr('y2', bottom - 18)
      .attr('stroke', 'var(--p9)').attr('stroke-width', 1.5)
    gCuts.append('text').attr('x', xl(20) + 8).attr('y', bandTop - 8).attr('font-size', 13)
      .attr('fill', 'var(--p9-ink)').attr('font-weight', 600).text('past the usual bar, 1 in 20')
    const axis = gCuts.append('g').attr('transform', `translate(0,${bottom - 14})`)
      .call(d3.axisBottom(xl).tickValues([1, 2, 5, 20, 100, 1000]).tickFormat(d => `1 in ${d3.format(',')(d)}`))
    axis.selectAll('text').attr('class', 'axis-label').attr('font-size', 12)
    axis.selectAll('line, path').attr('stroke', 'var(--rule)')

    rows.forEach((c, i) => {
      const yy = top + i * rowH, ty = yy + trackDy
      gCuts.append('text').attr('x', left).attr('y', yy + (tall ? 0 : 5)).attr('font-size', 14.5).attr('font-weight', 600)
        .attr('fill', 'var(--text-primary)')
        // distances in AU in their lime
        .selectAll('tspan').data(c.title.split(/(\d[\d,]* AU)/).filter(Boolean)).join('tspan')
        .attr('class', d => (/ AU$/.test(d) ? 'au' : null)).text(d => d)
      gCuts.append('line').attr('x1', xl(1)).attr('x2', xl(1000)).attr('y1', ty).attr('y2', ty)
        .attr('stroke', 'var(--rule)').attr('stroke-width', 1)
      const g = xl(Math.max(1, c.good.oneIn)), a = xl(Math.max(1, c.all.oneIn))
      gCuts.append('line').attr('x1', Math.min(g, a)).attr('x2', Math.max(g, a)).attr('y1', ty).attr('y2', ty)
        .attr('stroke', 'var(--text-muted)').attr('stroke-width', 2)
      gCuts.append('circle').attr('cx', a).attr('cy', ty).attr('r', 9).attr('fill', 'var(--surface-1)')
        .attr('stroke', 'var(--text-secondary)').attr('stroke-width', 2.2)
      gCuts.append('circle').attr('cx', g).attr('cy', ty).attr('r', 6.5).attr('fill', 'var(--series-1)')
      gCuts.append('text').attr('x', g).attr('y', ty - 15).attr('text-anchor', 'middle').attr('font-size', 13.5)
        .attr('font-weight', 600).attr('fill', 'var(--series-1-ink)').text(`1 in ${c.good.oneIn.toLocaleString()}`)
      gCuts.append('text').attr('x', a).attr('y', ty + 26).attr('text-anchor', 'middle').attr('font-size', 13)
        .attr('fill', 'var(--text-secondary)').text(`1 in ${c.all.oneIn.toLocaleString()}`)
    })
  }

  // redraw when the panel changes shape (a phone turning, a window resized)
  let raf = 0
  new ResizeObserver(() => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => { if (last) update(last) })
  }).observe(root)

  return { update, stop: stopTimer }
}
