// Part 2, page 2: how the odds move with which objects count. One row per
// distance cut-off, drawn like the odds chart below it (odds.js): the name on
// the left, then the row's odds on a shared "1 in N" axis with the usual bar,
// 1 in 20, shaded. Each row carries two marks: the objects seen in more than
// one year (a violet dot) and every object (a grey ring), joined by a line, with
// their odds above and below it so they never collide. On a phone each row's
// name sits above its line.

import * as d3 from 'd3'

/** rows: [{ a, q, good: { n, oneIn }, all: { n, oneIn } }], nearest cut-off first */
export function drawCuts (root, rows) {
  const draw = () => {
    const narrow = root.clientWidth < 640
    const W = narrow ? 440 : 900
    const M = narrow ? { top: 62, right: 24, bottom: 12, left: 16 } : { top: 62, right: 40, bottom: 12, left: 320 }
    const ROW = narrow ? 108 : 74, LINE = narrow ? 60 : 0
    const H = M.top + rows.length * ROW + M.bottom
    const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
      .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', 'How often luck would line the orbits up this well, for each cut-off: ' + rows.map(r =>
        `out past ${r.a} AU, ${r.good.n} objects seen in more than one year: 1 in ${r.good.oneIn}; all ${r.all.n}: 1 in ${r.all.oneIn}`).join('; '))
    const x = d3.scaleLog().domain([1, 1000]).range([narrow ? 24 : M.left, W - M.right]).clamp(true)
    const end = M.top + rows.length * ROW

    svg.selectAll('*').remove()
    // the usual bar: 1 in 20
    svg.append('rect').attr('x', x(20)).attr('y', M.top - 34 + LINE).attr('width', x(1000) - x(20)).attr('height', rows.length * ROW + 6 - LINE)
      .attr('fill', 'var(--for)').attr('opacity', 0.06)
    svg.append('line').attr('x1', x(20)).attr('x2', x(20)).attr('y1', M.top - 34 + LINE).attr('y2', end - 28)
      .attr('stroke', 'var(--for)').attr('stroke-width', 1.5)
    svg.append('text').attr('x', x(20) + 8).attr('y', M.top - 42).attr('font-size', 12.5).attr('font-weight', 600).attr('fill', 'var(--for-ink)')
      .text('rarer than 1 in 20')

    const axis = svg.append('g').attr('transform', `translate(0,${end - 24})`)
      .call(d3.axisBottom(x).tickValues([1, 2, 5, 20, 100, 1000]).tickFormat(d => `1 in ${d3.format(',')(d)}`))
    axis.selectAll('text').attr('class', 'axis-label').attr('font-size', 12)
    axis.selectAll('line, path').attr('stroke', 'var(--rule)')

    const g = svg.selectAll('g.row').data(rows).join('g').attr('class', 'row')
      .attr('transform', (d, i) => `translate(0,${M.top + i * ROW})`)
    // the name: the cut-off, distances in AU in their gold, and how many objects it keeps
    const name = g.append('text').attr('x', narrow ? M.left : 0).attr('y', 4).attr('font-size', 14).attr('font-weight', 600).attr('fill', 'var(--text-primary)')
    name.append('tspan').text('Out past ')
    name.append('tspan').attr('class', 'au').text(d => `${d.a} AU`)
    name.append('tspan').text(', never closer than ')
    name.append('tspan').attr('class', 'au').text(d => `${d.q} AU`)
    g.append('text').attr('x', narrow ? M.left : 0).attr('y', 22).attr('font-size', 12).attr('fill', 'var(--text-muted)')
      .text(d => `${d.good.n} seen in more than one year, ${d.all.n} in all`)

    const t = g.append('g').attr('transform', `translate(0,${LINE})`)
    t.append('line').attr('x1', d => x(Math.min(d.good.oneIn, d.all.oneIn))).attr('x2', d => x(Math.max(d.good.oneIn, d.all.oneIn)))
      .attr('stroke', 'var(--text-muted)').attr('stroke-width', 2)
    t.append('circle').attr('cx', d => x(d.all.oneIn)).attr('r', 8).attr('fill', 'var(--surface-1)')
      .attr('stroke', 'var(--text-secondary)').attr('stroke-width', 2)
    t.append('circle').attr('cx', d => x(d.good.oneIn)).attr('r', 6.5).attr('fill', 'var(--series-1)')
    t.append('text').attr('class', 'halo').attr('x', d => x(d.good.oneIn)).attr('y', -14).attr('text-anchor', 'middle')
      .attr('font-size', 13.5).attr('font-weight', 600).attr('fill', 'var(--series-1-ink)').text(d => `1 in ${d3.format(',')(d.good.oneIn)}`)
    t.append('text').attr('class', 'halo').attr('x', d => x(d.all.oneIn)).attr('y', 25).attr('text-anchor', 'middle')
      .attr('font-size', 13).attr('fill', 'var(--text-secondary)').text(d => `1 in ${d3.format(',')(d.all.oneIn)}`)
  }
  draw()
  let w = root.clientWidth
  new ResizeObserver(() => { if (Math.abs(root.clientWidth - w) > 20) { w = root.clientWidth; draw() } }).observe(root)
}
