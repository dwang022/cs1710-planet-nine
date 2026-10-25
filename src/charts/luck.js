// Section 03 — "could this just be luck?", built up in front of the reader.
//
// Left: one solar system on a compass, with its average-direction arrow.
// Right: where that solar system's arrow length lands among many others.
//
// The story starts with a single fake solar system, drops fake ones into the
// histogram one block at a time, then fills in all 4,000 at once, and only then
// brings in the real objects. The reader sees the null distribution being made
// before being asked to compare anything against it.

import * as d3 from 'd3'
import { resultant } from '../stats.js'
import { showTip, hideTip } from './tooltip.js'

const W = 960, H = 500
const RAD = Math.PI / 180
const T = 650

const RING = { cx: 175, cy: 270, r: 118 }
const HIST = { x0: 400, x1: 935, top: 70, bottom: 420 }
const BIN = 0.025

export function makeLuck (root) {
  const svg = d3.select(root).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
  const defs = svg.append('defs')
  defs.append('marker').attr('id', 'luck-head').attr('viewBox', '0 0 10 10')
    .attr('refX', 7).attr('refY', 5).attr('markerWidth', 13).attr('markerHeight', 13)
    .attr('markerUnits', 'userSpaceOnUse')
    .attr('orient', 'auto').append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', 'var(--text-primary)')

  // --- left: one solar system --------------------------------------------
  const gRing = svg.append('g')
  const ringTitle = gRing.append('text').attr('x', RING.cx).attr('y', 52)
    .attr('text-anchor', 'middle').attr('font-size', 16).attr('font-weight', 600)
  const ringSub = gRing.append('text').attr('x', RING.cx).attr('y', 74)
    .attr('text-anchor', 'middle').attr('font-size', 13).attr('fill', 'var(--text-muted)')
  gRing.append('circle').attr('cx', RING.cx).attr('cy', RING.cy).attr('r', RING.r)
    .attr('fill', 'none').attr('stroke', 'var(--text-muted)').attr('stroke-opacity', 0.5)
  gRing.append('circle').attr('cx', RING.cx).attr('cy', RING.cy).attr('r', 3.5).attr('fill', 'var(--sun)')
  const gRingDots = gRing.append('g')
  const ringArrow = gRing.append('line')
    .attr('x1', RING.cx).attr('y1', RING.cy).attr('x2', RING.cx).attr('y2', RING.cy)
    .attr('stroke', 'var(--text-primary)').attr('stroke-width', 3.5)
    .attr('stroke-linecap', 'round').attr('marker-end', 'url(#luck-head)')
  const ringFoot = gRing.append('text').attr('x', RING.cx).attr('y', RING.cy + RING.r + 52)
    .attr('text-anchor', 'middle').attr('font-size', 14).attr('font-weight', 600)

  // the hand-off from one solar system to its block in the histogram
  const handoff = svg.append('path').attr('fill', 'none')
    .attr('stroke', 'var(--text-muted)').attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3 5').attr('opacity', 0)

  // --- right: the histogram ----------------------------------------------
  const gHist = svg.append('g')
  const gAxis = gHist.append('g').attr('transform', `translate(0,${HIST.bottom})`)
  gHist.append('text').attr('class', 'axis-label')
    .attr('x', (HIST.x0 + HIST.x1) / 2).attr('y', HIST.bottom + 44).attr('text-anchor', 'middle')
    .attr('font-size', 13)
    .text('how lined up: the length of the average arrow  →  more lined up')
  const histTitle = gHist.append('text').attr('x', HIST.x0).attr('y', 30)
    .attr('font-size', 16).attr('font-weight', 600).attr('fill', 'var(--text-primary)')
  const histSub = gHist.append('text').attr('x', HIST.x0).attr('y', 52)
    .attr('font-size', 13).attr('fill', 'var(--text-muted)')
  const gBars = gHist.append('g')
  const gBlocks = gHist.append('g')
  const gObs = gHist.append('g').attr('opacity', 0)
  gObs.append('line').attr('stroke', 'var(--series-1)').attr('stroke-width', 3)
  gObs.append('circle').attr('r', 6).attr('fill', 'var(--series-1)')
    .attr('stroke', 'var(--surface-1)').attr('stroke-width', 2)
  const obsLabel = gObs.append('text').attr('class', 'halo').attr('font-size', 15)
    .attr('font-weight', 600).attr('fill', '#8fbdf0')
  const obsLabel2 = gObs.append('text').attr('class', 'halo').attr('font-size', 13)
    .attr('fill', 'var(--text-secondary)')
  const pileLabel = gHist.append('text').attr('class', 'halo').attr('font-size', 14)
    .attr('font-weight', 600).attr('fill', 'var(--text-secondary)').attr('text-anchor', 'middle')
    .attr('opacity', 0)

  // --- the five published sample definitions ------------------------------
  const gCuts = svg.append('g').attr('opacity', 0).style('pointer-events', 'none')

  let blocks = []
  let blockId = 0
  let timer = null
  let x = d3.scaleLinear()

  function stopTimer () { if (timer) { timer.stop(); timer = null } }

  /** Draw one solar system on the compass. */
  function drawRing (angles, { real, quality }) {
    const st = resultant(angles.map(a => a.deg))
    const placed = []
    const bins = d3.group(angles.map((a, i) => ({ ...a, i })), a => Math.floor(a.deg / 9))
    for (const [, g] of bins) g.forEach((a, k) => placed.push({ ...a, rr: RING.r + 9 + k * 9 }))
    const dots = gRingDots.selectAll('circle').data(placed, d => d.key)
    dots.exit().remove()
    dots.enter().append('circle').attr('r', 4.5)
      .attr('stroke', 'var(--surface-1)').attr('stroke-width', 1)
      .attr('cx', RING.cx).attr('cy', RING.cy)
      .merge(dots)
      .attr('fill', real ? 'var(--series-1)' : 'var(--text-secondary)')
      .attr('opacity', d => d.faint ? 0.4 : 1)
      .transition().duration(real ? T : 300)
      .attr('cx', d => RING.cx + Math.min(d.rr, RING.r + 60) * Math.cos(d.deg * RAD))
      .attr('cy', d => RING.cy - Math.min(d.rr, RING.r + 60) * Math.sin(d.deg * RAD))
    ringArrow.transition().duration(real ? T : 300)
      .attr('x2', RING.cx + RING.r * st.R * Math.cos(st.meanDeg * RAD))
      .attr('y2', RING.cy - RING.r * st.R * Math.sin(st.meanDeg * RAD))
    ringTitle.text(real ? 'The real objects' : 'A fake solar system')
      .attr('fill', real ? '#8fbdf0' : 'var(--text-primary)')
    ringSub.text(real
      ? `${angles.length} objects${quality ? ', well-measured only' : ', including briefly seen'}`
      : `${angles.length} objects pointed at random`)
    ringFoot.text(`arrow length ${st.R.toFixed(2)}`)
      .attr('fill', real ? '#8fbdf0' : 'var(--text-primary)')
    return st
  }

  function randomAngles (n) {
    return d3.range(n).map(i => ({ key: 'r' + i, deg: Math.random() * 360 }))
  }

  function drawBlocks (animateLast) {
    const bw = x(BIN) - x(0)
    const stack = new Map()
    const placed = blocks.map(b => {
      const bin = Math.floor(b.R / BIN)
      const k = stack.get(bin) || 0
      stack.set(bin, k + 1)
      return { ...b, bx: Math.min(x(bin * BIN), HIST.x1 - bw) + 1, by: HIST.bottom - (k + 1) * 11 }
    })
    const sel = gBlocks.selectAll('rect').data(placed, d => d.id)
    sel.exit().transition().duration(300).attr('opacity', 0).remove()
    sel.enter().append('rect').attr('rx', 2)
      .attr('fill', 'var(--text-secondary)')
      .attr('x', d => animateLast ? RING.cx + RING.r + 40 : d.bx)
      .attr('y', d => animateLast ? RING.cy : d.by)
      .attr('width', Math.max(2, bw - 2)).attr('height', 9)
      .attr('opacity', 0)
      .merge(sel)
      .transition().duration(animateLast ? 450 : T).ease(d3.easeCubicOut)
      .attr('x', d => d.bx).attr('y', d => d.by)
      .attr('width', Math.max(2, bw - 2))
      .attr('opacity', 1)
  }

  /** Side by side when there is room; stacked on a phone. */
  function arrange () {
    const narrow = root.clientWidth < 640
    svg.attr('viewBox', narrow ? '0 0 600 1000' : `0 0 ${W} ${H}`)
    gRing.attr('transform', narrow ? 'translate(125,0)' : null)
    gHist.attr('transform', narrow ? 'translate(-360,500)' : null)
    gCuts.attr('transform', narrow ? 'translate(0,260) scale(0.62)' : null)
    handoff.style('display', narrow ? 'none' : null)
  }

  function update (s) {
    stopTimer()
    arrange()
    const nd = s.nullDist
    // The axis reaches the last fake solar system with any count: a small
    // sample spreads them far past 0.5, and a bar beyond the axis would be
    // drawn outside the chart. Bins are BIN wide, so this stays on a bin edge.
    const reach = nd ? d3.max(nd.counts, (c, i) => c ? (i + 1) * BIN : 0) : 0
    const xMax = Math.min(1, Math.max(s.xMax || 0.5, reach))
    x = d3.scaleLinear().domain([0, xMax]).range([HIST.x0, HIST.x1])
    gAxis.transition().duration(T)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.1f')))
    gAxis.selectAll('text').attr('class', 'axis-label').attr('font-size', 12)
    gAxis.selectAll('line, path').attr('stroke', 'var(--rule)')

    histTitle.text(s.histTitle || '')
    histSub.text(s.histSub || '')

    // --- the left compass --------------------------------------------------
    gRing.transition().duration(T).attr('opacity', s.cuts ? 0 : 1)
    if (s.ring === 'real') {
      drawRing(s.real.map(o => ({ key: o.id, deg: o.varpi_deg, faint: !o.well_determined })), { real: true, quality: s.quality })
    } else if (s.ring === 'random' && !s.animate) {
      const angles = randomAngles(s.n)
      const st = drawRing(angles, { real: false })
      if (s.blocks === 'one') blocks = [{ id: 'b0', R: st.R }]
    }

    // --- blocks, bars, or neither -----------------------------------------
    if (s.blocks === 'none') blocks = []
    if (s.blocks !== 'animate') drawBlocks(false)
    gBlocks.transition().duration(T).attr('opacity', s.blocks === 'none' ? 0 : 1)

    handoff.transition().duration(T).attr('opacity', s.blocks === 'one' ? 0.8 : 0)
    if (s.blocks === 'one' && blocks[0]) {
      const bx = x(Math.floor(blocks[0].R / BIN) * BIN) + (x(BIN) - x(0)) / 2
      handoff.attr('d', `M${RING.cx + RING.r * 0.9},${RING.cy - 40} C${RING.cx + 230},${RING.cy - 140} ${bx},${HIST.bottom - 140} ${bx},${HIST.bottom - 16}`)
    }

    const maxC = nd ? d3.max(nd.counts) : 1
    const y = d3.scaleLinear().domain([0, maxC]).range([0, HIST.bottom - HIST.top - 30])
    const shown = nd && s.bars ? nd.counts.slice(0, Math.floor(xMax / BIN + 1e-9)) : []
    const bars = gBars.selectAll('rect').data(shown, (d, i) => i)
    bars.exit().transition().duration(T / 2).attr('height', 0).attr('y', HIST.bottom).remove()
    bars.enter().append('rect').attr('rx', 2)
      .attr('y', HIST.bottom).attr('height', 0)
      .merge(bars)
      .attr('x', (d, i) => x(i * BIN) + 1)
      .attr('width', Math.max(1, x(BIN) - x(0) - 2))
      .on('pointermove', (ev, d) => {
        const i = nd.counts.indexOf(d)
        showTip(ev, `<div class="t-name">Arrow length ${(i * BIN).toFixed(3)}–${((i + 1) * BIN).toFixed(3)}</div>
          ${d.toLocaleString()} of ${nd.trials.toLocaleString()} fake solar systems`)
      })
      .on('pointerleave', hideTip)
      .transition().duration(T).delay((d, i) => i * 12)
      .attr('fill', (d, i) => s.observed != null && (i + 1) * BIN > s.observed ? 'var(--series-1)' : 'var(--surface-3)')
      .attr('fill-opacity', (d, i) => s.observed != null && (i + 1) * BIN > s.observed ? 0.75 : 1)
      .attr('y', d => HIST.bottom - y(d)).attr('height', d => y(d))

    // label the pile itself, at its peak
    // The label sits to the left of the pile's peak; when the peak is hard
    // against the axis there is no room, and the bars speak for themselves.
    const peak = nd ? nd.counts.indexOf(maxC) : 0
    if (nd && s.bars && s.pileText && x(peak * BIN) - HIST.x0 > 150) {
      pileLabel.text(s.pileText)
        .transition().duration(T)
        .attr('x', x(peak * BIN) - 10).attr('text-anchor', 'end')
        .attr('y', HIST.bottom - y(maxC) * 0.6)
        .attr('opacity', 1)
    } else pileLabel.transition().duration(T / 2).attr('opacity', 0)

    // --- the real value ---------------------------------------------------
    if (s.observed != null) {
      const ox = x(Math.min(s.observed, xMax))
      const right = ox > HIST.x1 - 210
      gObs.select('line').transition().duration(T).attr('x1', ox).attr('x2', ox)
        .attr('y1', HIST.top + 10).attr('y2', HIST.bottom)
      gObs.select('circle').transition().duration(T).attr('cx', ox).attr('cy', HIST.top + 10)
      obsLabel.text(`the real objects: ${s.observed.toFixed(2)}`)
        .transition().duration(T)
        .attr('x', ox + (right ? -12 : 12)).attr('y', HIST.top + 15)
        .attr('text-anchor', right ? 'end' : 'start')
      obsLabel2.text(s.obsText || '')
        .transition().duration(T)
        .attr('x', ox + (right ? -12 : 12)).attr('y', HIST.top + 36)
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

  function drawCuts (cuts) {
    gCuts.transition().duration(T).attr('opacity', cuts ? 1 : 0)
    if (!cuts) return
    const top = 110, rowH = 62
    const xl = d3.scaleLog().domain([1, 1000]).range([440, 930])
    gCuts.selectAll('*').remove()
    gCuts.append('text').attr('x', 40).attr('y', 36).attr('font-size', 18).attr('font-weight', 600)
      .attr('fill', 'var(--text-primary)').text('Same test, five published ways of choosing the objects')
    gCuts.append('text').attr('x', 40).attr('y', 60).attr('font-size', 14).attr('fill', 'var(--text-muted)')
      .text('How often does luck produce this much lining up? Further right = harder to blame on luck.')
    // threshold
    gCuts.append('rect').attr('x', xl(20)).attr('y', top - 22).attr('width', xl(1000) - xl(20))
      .attr('height', cuts.length * rowH + 4).attr('fill', 'var(--series-3)').attr('opacity', 0.08)
    gCuts.append('line').attr('x1', xl(20)).attr('x2', xl(20)).attr('y1', top - 22).attr('y2', top + cuts.length * rowH - 18)
      .attr('stroke', 'var(--series-3)').attr('stroke-width', 1.5)
    gCuts.append('text').attr('x', xl(20) + 8).attr('y', top - 30).attr('font-size', 13)
      .attr('fill', '#5cc79c').attr('font-weight', 600).text('past the usual bar (1 in 20) → probably not luck')
    const axis = gCuts.append('g').attr('transform', `translate(0,${top + cuts.length * rowH - 14})`)
      .call(d3.axisBottom(xl).tickValues([1, 2, 5, 20, 100, 1000]).tickFormat(d => `1 in ${d3.format(',')(d)}`))
    axis.selectAll('text').attr('class', 'axis-label').attr('font-size', 12)
    axis.selectAll('line, path').attr('stroke', 'var(--rule)')

    cuts.forEach((c, i) => {
      const yy = top + i * rowH
      const strong = c.p_value < 0.05
      const col = strong ? 'var(--series-3)' : 'var(--series-2)'
      gCuts.append('text').attr('x', 40).attr('y', yy).attr('font-size', 14).attr('font-weight', 600)
        .attr('fill', 'var(--text-primary)').text(c.title)
      gCuts.append('text').attr('x', 40).attr('y', yy + 19).attr('font-size', 12.5)
        .attr('fill', 'var(--text-muted)').text(c.detail)
      gCuts.append('line').attr('x1', xl(1)).attr('x2', xl(Math.max(1, c.one_in))).attr('y1', yy - 4).attr('y2', yy - 4)
        .attr('stroke', col).attr('stroke-width', 2).attr('opacity', 0.5)
      gCuts.append('circle').attr('cx', xl(Math.max(1, c.one_in))).attr('cy', yy - 4).attr('r', 8).attr('fill', col)
      gCuts.append('text').attr('x', xl(Math.max(1, c.one_in)) + 14).attr('y', yy + 1)
        .attr('font-size', 14).attr('font-weight', 600).attr('fill', col)
        .text(`1 in ${c.one_in.toLocaleString()}`)
    })
  }

  return { update, stop: stopTimer }
}
