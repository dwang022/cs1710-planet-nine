// Part 2, page 2: what the papers conclude about the odds, on one axis.
// Each row is a published result (or this site's own calculation) placed at
// "1 in N": how often chance alone would produce the alignment the study
// measured. Further right is harder to blame on luck. A range is drawn as a
// bar; a study that gives no number says "consistent with chance" and has no
// mark. On a phone each row's name sits above its line. A row with only a
// `heading` starts a group (our shuffles, then the published studies).

import * as d3 from 'd3'

/**
 * rows: [{ label, detail, oneIn | range: [lo, hi] | neither, side: 'for' | 'against' | 'ours' } | { heading }]
 */
export function drawOdds (root, rows) {
  const draw = () => {
    const narrow = root.clientWidth < 640
    const W = narrow ? 440 : 900
    const M = narrow ? { top: 52, right: 24, bottom: 44, left: 16 } : { top: 46, right: 40, bottom: 44, left: 320 }
    const ROW = narrow ? 70 : 50, LINE = narrow ? 38 : 0
    const H = M.top + rows.length * ROW + M.bottom
    const svg = d3.select(root).selectAll('svg').data([0]).join('svg')
      .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', 'How often luck would line the orbits up this well, one row per count: ' + rows.filter(r => !r.heading).map(r => `${r.label}: ${r.range ? `between 1 in ${Math.round(r.range[1])} and 1 in ${Math.round(r.range[0])}, consistent with chance` : r.oneIn ? `1 in ${r.oneIn}` : 'consistent with chance'}`).join('; '))
    const x = d3.scaleLog().domain([1, 100000]).range([narrow ? 24 : M.left, W - M.right]).clamp(true)
    const colour = { for: 'var(--for)', against: 'var(--series-2)', ours: 'var(--series-1)' }
    const ink = { for: 'var(--for-ink)', against: 'var(--series-2-ink)', ours: 'var(--series-1-ink)' }
    const end = M.top + rows.length * ROW

    svg.selectAll('*').remove()
    // the usual bar: 1 in 20
    svg.append('rect').attr('x', x(20)).attr('y', M.top - 24 + LINE).attr('width', x(100000) - x(20)).attr('height', rows.length * ROW + 12 - LINE)
      .attr('fill', 'var(--for)').attr('opacity', 0.06)
    svg.append('line').attr('x1', x(20)).attr('x2', x(20)).attr('y1', M.top - 24 + LINE).attr('y2', end - 12)
      .attr('stroke', 'var(--for)').attr('stroke-width', 1.5)
    svg.append('text').attr('x', x(20) + 8).attr('y', M.top - 30 + (narrow ? -6 : 0)).attr('font-size', 12.5).attr('font-weight', 600).attr('fill', 'var(--for-ink)')
      .text('rare: rarer than 1 in 20')
    if (!narrow) {
      svg.append('text').attr('x', x(20) - 8).attr('y', M.top - 30).attr('font-size', 12.5).attr('font-weight', 600).attr('fill', 'var(--text-muted)').attr('text-anchor', 'end')
        .text('luck does this often')
    }

    const axis = svg.append('g').attr('transform', `translate(0,${end - 8})`)
      .call(d3.axisBottom(x).tickValues(narrow ? [1, 20, 1000, 100000] : [1, 2, 5, 20, 100, 1000, 10000, 100000]).tickFormat(d => `1 in ${d3.format(',')(d)}`))
    axis.selectAll('text').attr('class', 'axis-label').attr('font-size', 12)
    axis.selectAll('line, path').attr('stroke', 'var(--rule)')

    const all = svg.selectAll('g.row').data(rows).join('g').attr('class', 'row')
      .attr('transform', (d, i) => `translate(0,${M.top + i * ROW})`)
    all.filter(d => d.heading).append('text').attr('class', 'odds-heading').attr('x', narrow ? M.left : 0).attr('y', 8).text(d => d.heading)
    const g = all.filter(d => !d.heading)
    g.append('text').attr('x', narrow ? M.left : 0).attr('y', 4).attr('font-size', 14).attr('font-weight', 600).attr('fill', 'var(--text-primary)').text(d => d.label)
    g.append('text').attr('x', narrow ? M.left : 0).attr('y', 22).attr('font-size', 12).attr('fill', 'var(--text-muted)').text(d => d.detail)
    const t = g.append('g').attr('transform', `translate(0,${LINE})`)
    const reach = d => d.range ? d.range[1] : d.oneIn
    t.filter(d => reach(d)).append('line').attr('x1', x(1)).attr('x2', d => x(reach(d))).attr('y1', 0).attr('y2', 0)
      .attr('stroke', d => colour[d.side]).attr('stroke-width', 2).attr('opacity', 0.35)
    t.filter(d => d.range).append('rect').attr('x', d => x(d.range[0])).attr('width', d => Math.max(6, x(d.range[1]) - x(d.range[0])))
      .attr('y', -7).attr('height', 14).attr('rx', 7).attr('fill', d => colour[d.side]).attr('opacity', 0.85)
    t.filter(d => d.oneIn).append('circle').attr('cx', d => x(d.oneIn)).attr('cy', 0).attr('r', 8).attr('fill', d => colour[d.side])
    // a number sits after its mark; a finding of chance stays left of the 1-in-20 line, above its bar if it has one
    const chance = d => !d.oneIn
    t.append('text').attr('class', 'halo')
      .attr('x', d => chance(d) ? x(20) - 10 : x(reach(d)) + 14)
      .attr('y', d => chance(d) && d.range ? -13 : 5)
      .attr('text-anchor', d => chance(d) ? 'end' : 'start')
      .attr('font-size', 14).attr('font-weight', 600)
      .attr('fill', d => ink[d.side])
      .text(d => d.oneIn ? `1 in ${d3.format(',')(d.oneIn)}` : 'consistent with chance')
  }
  draw()
  let w = root.clientWidth
  new ResizeObserver(() => { if (Math.abs(root.clientWidth - w) > 20) { w = root.clientWidth; draw() } }).observe(root)
}
