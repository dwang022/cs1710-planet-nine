// The sample selector, brought over from the week-9 prototypes.
//
// Drag a box to choose which objects every other view uses. Both axes are
// independent of the direction an orbit leans, which is the quantity the rest
// of the page tests - selecting on that angle and then measuring it would
// manufacture the result.
//
// Built once and then updated, rather than redrawn: rebuilding a d3 brush while
// a drag is in flight destroys the gesture half-way through.

import * as d3 from 'd3'
import { registerHighlight, setHover } from '../highlight.js'

const W = 700, H = 420
const M = { top: 14, right: 18, bottom: 52, left: 62 }

export function makeScatter (root, { onBrush }) {
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'Each object plotted by how far its orbit reaches and how close it comes to the Sun. Drag a box to choose a group.')

  const iw = W - M.left - M.right, ih = H - M.top - M.bottom
  const x = d3.scaleLog().domain([140, 15000]).range([0, iw])
  const y = d3.scaleLinear().domain([28, 84]).range([ih, 0])

  const g = svg.append('g').attr('class', 'plot').attr('transform', `translate(${M.left},${M.top})`)

  g.append('g').attr('class', 'x axis').attr('transform', `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickValues([150, 300, 1000, 3000, 10000]).tickFormat(d3.format(',')))
    .selectAll('text').attr('class', 'axis-label')
  g.append('g').attr('class', 'y axis')
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text').attr('class', 'axis-label')

  g.append('text').attr('class', 'axis-label')
    .attr('x', iw / 2).attr('y', ih + 40).attr('text-anchor', 'middle')
    .text('average distance from the Sun (AU)')
  g.append('text').attr('class', 'axis-label')
    .attr('transform', `translate(-44,${ih / 2}) rotate(-90)`).attr('text-anchor', 'middle')
    .text('closest it ever comes to the Sun (AU)')

  // Neptune's influence runs out around 45 AU; above that line nothing the
  // known planets do can explain how these orbits got their shape.
  g.append('line')
    .attr('x1', 0).attr('x2', iw).attr('y1', y(45)).attr('y2', y(45))
    .attr('stroke', 'var(--text-muted)').attr('stroke-width', 1).attr('opacity', .55)
  g.append('text').attr('class', 'axis-label')
    .attr('x', iw - 4).attr('y', y(45) - 7).attr('text-anchor', 'end')
    .text('out of Neptune\'s reach')

  const gDots = g.append('g').attr('class', 'dots')
  const gb = g.append('g').attr('class', 'brush')

  let suppress = false
  let dragging = false
  const brush = d3.brush().extent([[0, 0], [iw, ih]])
    .on('start', () => { if (!suppress) dragging = true })
    .on('end', ev => {
      dragging = false
      if (suppress) return
      if (!ev.selection) { onBrush(null); return }
      const [[x0, y0], [x1, y1]] = ev.selection
      // A stray click produces a zero-size box; treat it as "clear".
      if (Math.abs(x1 - x0) < 4 || Math.abs(y1 - y0) < 4) { onBrush(null); return }
      onBrush({ aMin: x.invert(x0), aMax: x.invert(x1), qMin: y.invert(y1), qMax: y.invert(y0) })
    })
  gb.call(brush)
  gb.selectAll('.selection')
    .attr('fill', 'var(--series-1)').attr('fill-opacity', .1)
    .attr('stroke', 'var(--series-1-ink)').attr('stroke-width', 1.5)

  registerHighlight(id => {
    gDots.selectAll('circle.obj')
      .attr('stroke', d => d.id === id ? 'var(--text-primary)' : 'var(--surface-1)')
      .attr('stroke-width', d => d.id === id ? 2.5 : 1)
      .attr('r', d => d.id === id ? 8 : (d.well_determined ? 5 : 3.5))
  })

  return {
    /** Swap the dots without touching the brush. */
    update (objects, inSelection) {
      const dots = gDots.selectAll('circle.obj').data(objects, d => d.id)
      dots.exit().remove()
      dots.enter().append('circle').attr('class', 'obj')
        .attr('stroke', 'var(--surface-1)').attr('stroke-width', 1)
        .on('pointerenter', (ev, d) => setHover(d.id))
        .on('pointerleave', () => setHover(null))
        .merge(dots)
        .attr('cx', d => x(d.a_au)).attr('cy', d => y(d.q_au))
        .attr('r', d => d.well_determined ? 5 : 3.5)
        .attr('fill', d => inSelection(d) ? 'var(--series-1)' : 'var(--text-muted)')
        .attr('opacity', d => inSelection(d) ? (d.well_determined ? .9 : .4) : .18)
    },
    /** Move the brush from outside without re-firing its handlers. */
    setSelection (sel) {
      if (dragging) return
      suppress = true
      if (sel && isFinite(sel.aMax) && isFinite(sel.qMax)) {
        gb.call(brush.move, [[x(sel.aMin), y(sel.qMax)], [x(sel.aMax), y(sel.qMin)]])
      } else {
        gb.call(brush.move, null)
      }
      suppress = false
    },
    isDragging: () => dragging,
  }
}
