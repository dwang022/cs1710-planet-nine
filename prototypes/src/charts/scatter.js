// The selector: distance out vs. closest approach, one dot per object.
//
// Both axes are deliberately independent of longitude of perihelion. Brushing
// on the angle we then test for clustering would manufacture the result.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'

const W = 640, H = 460
const M = { top: 16, right: 18, bottom: 54, left: 62 }

export function makeScatter (root, { objects, onBrush, brushes = [] }) {
  const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'Scatter of orbit size against closest approach. Drag to select a group of objects.')

  const iw = W - M.left - M.right, ih = H - M.top - M.bottom
  // a spans 151 to 13,940 AU with a long tail, so log keeps the bulk readable.
  const x = d3.scaleLog().domain([140, 15000]).range([0, iw])
  const y = d3.scaleLinear().domain([28, 84]).range([ih, 0])

  let g = svg.select('g.plot')
  if (g.empty()) g = svg.append('g').attr('class', 'plot').attr('transform', `translate(${M.left},${M.top})`)

  // axes
  let gx = g.select('g.x')
  if (gx.empty()) gx = g.append('g').attr('class', 'x axis').attr('transform', `translate(0,${ih})`)
  gx.call(d3.axisBottom(x).tickValues([150, 300, 1000, 3000, 10000]).tickFormat(d3.format(',')))
  gx.selectAll('text').attr('class', 'axis-label')

  let gy = g.select('g.y')
  if (gy.empty()) gy = g.append('g').attr('class', 'y axis')
  gy.call(d3.axisLeft(y).ticks(5))
  gy.selectAll('text').attr('class', 'axis-label')

  g.selectAll('text.xlab').data([0]).join('text').attr('class', 'xlab axis-label')
    .attr('x', iw / 2).attr('y', ih + 40).attr('text-anchor', 'middle')
    .text('how far out the orbit goes (AU, log scale)')
  g.selectAll('text.ylab').data([0]).join('text').attr('class', 'ylab axis-label')
    .attr('transform', `translate(${-44},${ih / 2}) rotate(-90)`).attr('text-anchor', 'middle')
    .text('closest approach to the Sun (AU)')

  // Neptune's reach: the line below which Neptune can still push things around
  g.selectAll('line.neptune').data([0]).join('line').attr('class', 'neptune')
    .attr('x1', 0).attr('x2', iw).attr('y1', y(45)).attr('y2', y(45))
    .attr('stroke', 'var(--text-muted)').attr('stroke-width', 1).attr('opacity', .5)
  g.selectAll('text.neplab').data([0]).join('text').attr('class', 'neplab axis-label')
    .attr('x', iw - 4).attr('y', y(45) - 6).attr('text-anchor', 'end')
    .text('above here, Neptune cannot reach them')

  // dots
  const dots = g.selectAll('circle.obj').data(objects, d => d.id)
  dots.enter().append('circle').attr('class', 'obj')
    .attr('stroke', 'var(--surface-1)').attr('stroke-width', 1)
    .merge(dots)
    .attr('cx', d => x(d.a_au)).attr('cy', d => y(d.q_au))
    .attr('r', d => d.well_determined ? 5.5 : 4)
    .attr('fill', 'var(--text-secondary)')
    .attr('opacity', d => d.well_determined ? .85 : .35)
    .on('pointerenter', (ev, d) => showTip(ev, `
      <div class="nm">${d.name || d.provisional_desig || d.id}</div>
      reach ${d3.format(',.0f')(d.a_au)} AU · closest ${d.q_au.toFixed(1)} AU<br>
      leans ${d.varpi_deg.toFixed(0)}° · ${d.well_determined ? 'well measured' : 'short arc'}`))
    .on('pointerleave', hideTip)
  dots.exit().remove()

  // persistent rectangles for selections that are not currently being dragged
  const rects = g.selectAll('rect.saved').data(brushes.filter(b => b.sel))
  rects.exit().remove()
  rects.enter().append('rect').attr('class', 'saved')
    .merge(rects)
    .attr('x', b => x(b.sel.a0)).attr('width', b => Math.max(0, x(b.sel.a1) - x(b.sel.a0)))
    .attr('y', b => y(b.sel.q1)).attr('height', b => Math.max(0, y(b.sel.q0) - y(b.sel.q1)))
    .attr('fill', b => b.colour).attr('fill-opacity', .1)
    .attr('stroke', b => b.colour).attr('stroke-width', 1.5)
    .attr('pointer-events', 'none')

  // the live brush
  let gb = g.select('g.brush')
  if (gb.empty()) gb = g.append('g').attr('class', 'brush')
  // brush.move fires the same events a drag does, so programmatic moves are
  // suppressed - otherwise clearing the brush reports "nothing selected" and
  // wipes the group we just assigned.
  let suppress = false
  const brush = d3.brush()
    .extent([[0, 0], [iw, ih]])
    .on('brush end', ev => {
      if (suppress) return
      if (!ev.selection) { onBrush(null); return }
      const [[x0, y0], [x1, y1]] = ev.selection
      onBrush({
        a0: x.invert(x0), a1: x.invert(x1),
        q0: y.invert(y1), q1: y.invert(y0),
      })
    })
  gb.call(brush)
  gb.selectAll('.selection')
    .attr('fill', 'var(--a)').attr('fill-opacity', .13)
    .attr('stroke', 'var(--a)').attr('stroke-width', 1.5)

  function quietly (fn) { suppress = true; fn(); suppress = false }

  return {
    clear () { quietly(() => gb.call(brush.move, null)) },
    /** Drive the brush from a preset, in data units. */
    setSelection (sel) {
      quietly(() => {
        if (!sel) { gb.call(brush.move, null); return }
        gb.call(brush.move, [[x(sel.a0), y(sel.q1)], [x(sel.a1), y(sel.q0)]])
      })
    },
    setColour (c) {
      gb.selectAll('.selection').attr('fill', c).attr('stroke', c)
    },
  }
}
