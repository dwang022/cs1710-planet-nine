// The Evidence Constellation (timeline page, "How the proposal changed", version 3, 2026-11-17): the odds chart of the
// probability page (charts/odds.js) drawn as a patch of night sky. Same rows, same numbers, same axis: each study's
// result sits at "1 in N" on the same logarithmic scale (1 to 100,000), further right being rarer by chance under that
// study's own assumptions, with the usual bar of 1 in 20 as a thin glowing line and a faint wash beyond it.
//
//   - Each result is a four-pointed star with a soft halo, in the odds chart's colours: the case for a planet, violet
//     for our test; a faint tail runs to it from the axis's start, as the odds chart's line does. No line joins one
//     study to another.
//   - The rows keep the odds chart's two groups, not allowing and allowing for where telescopes looked, each a faint
//     region with its heading. A study that finds the alignment consistent with chance and gives no single number is
//     never placed on the scale: those sit after the axis, past a thin divider, under a muted heading that names
//     their group, side by side as outlined ember stars (2026-11-17: they were in a dashed box inside the group).
//   - Pointing at a study, focusing it (Tab) or tapping it opens a small card: its name, the objects it counted, its
//     result, a plain line on what the result says and, for a published study, its abstract's own words (quote in
//     published_odds.json) and a link to the paper. A click or tap keeps it open; Escape or a tap elsewhere closes it.
//   - Stars behind twinkle slowly and the halos breathe; none of it with reduced motion (style.css).
//
// rows: as drawOdds takes them ({ heading } starts a group; { label, detail, side, oneIn?, doi?, quote?, plain? }),
// built by pages/timeline.js from published_odds.json and clustering_null.json. `trials`: the simulations behind our
// test. Nothing here computes a value.

import * as d3 from 'd3'

const fmt = d3.format(',')
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const COLOUR = { for: 'var(--for)', against: 'var(--series-2)', ours: 'var(--series-1)' }
const INK = { for: 'var(--for-ink)', against: 'var(--series-2-ink)', ours: 'var(--series-1-ink)' }
// a four-pointed star of radius r, its points drawn in
const star = r => {
  const k = r * 0.22
  return `M0,${-r} C${k},${-k} ${k},${-k} ${r},0 C${k},${k} ${k},${k} 0,${r} C${-k},${k} ${-k},${k} ${-r},0 C${-k},${-k} ${-k},${-k} 0,${-r} Z`
}
function rng (seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}

export function drawConstellation (root, rows, { trials } = {}) {
  // the rows in their groups: each group's results on the scale; its findings of chance go below the axis
  const groups = []
  for (const r of rows) {
    if (r.heading) groups.push({ heading: r.heading, onScale: [], chance: [] })
    else groups.at(-1)[r.oneIn ? 'onScale' : 'chance'].push(r)
  }
  root.classList.add('ec')
  root.innerHTML = '<div class="ec-tip" role="tooltip" id="ecTip" hidden></div>'
  const tip = root.querySelector('.ec-tip')
  let open = null, pinned = null

  function draw () {
    const narrow = root.clientWidth < 640
    const W = narrow ? 440 : 900
    const NAME = narrow ? 18 : 30
    const AX0 = narrow ? 30 : 340, AX1 = W - (narrow ? 44 : 56)
    const ROW = narrow ? 58 : 44, LINE = narrow ? 24 : 0
    const HEAD = 36, GAP = 16, TOP = 60
    const x = d3.scaleLog().domain([1, 100000]).range([AX0, AX1]).clamp(true)

    // vertical layout: each group a region of its rows on the scale; the axis and its caption; then, past a divider,
    // the findings of chance, side by side
    let y = TOP
    for (const g of groups) {
      g.y0 = y
      g.rowsY = g.onScale.map((_, i) => y + HEAD + i * ROW + (narrow ? ROW - 16 : ROW / 2))   // the star's line
      y += HEAD + g.onScale.length * ROW + 8
      g.y1 = y
      y += GAP
    }
    const axisY = y - GAP + 12
    const chance = groups.flatMap(grp => grp.chance.map(d => ({ d, grp })))
    const chanceGroups = [...new Set(chance.map(c => c.grp.heading))]
    const divY = axisY + 86, chanceT = divY + 28, chanceY = chanceT + (narrow && chanceGroups.length === 1 ? 46 : 32)
    const H = chance.length ? chanceY + (narrow ? 46 : 30) : axisY + 82

    const svg = d3.select(root).selectAll('svg').data([0]).join('svg').attr('class', 'ec-svg')
      .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'group')
      .attr('aria-label', 'Evidence Constellation: how often chance alone would line the orbits up as well as each study measured, under that study’s assumptions; further right is rarer. Each study is a star you can focus for details.')
    svg.selectAll('*').remove()
    const defs = svg.append('defs')
    for (const side of Object.keys(COLOUR)) {
      const h = defs.append('radialGradient').attr('id', `ec-halo-${side}`)
      h.append('stop').attr('offset', 0).attr('style', `stop-color:${COLOUR[side]};stop-opacity:.55`)
      h.append('stop').attr('offset', 0.35).attr('style', `stop-color:${COLOUR[side]};stop-opacity:.18`)
      h.append('stop').attr('offset', 1).attr('style', `stop-color:${COLOUR[side]};stop-opacity:0`)
      const t = defs.append('linearGradient').attr('id', `ec-tail-${side}`)
      t.append('stop').attr('offset', 0).attr('style', `stop-color:${COLOUR[side]};stop-opacity:0`)
      t.append('stop').attr('offset', 1).attr('style', `stop-color:${COLOUR[side]};stop-opacity:.5`)
    }
    defs.append('filter').attr('id', 'ec-blur').attr('x', '-50%').attr('y', '-5%').attr('width', '200%').attr('height', '110%')
      .append('feGaussianBlur').attr('stdDeviation', 3)

    // the sky: a fixed scatter of faint stars, a few twinkling, behind everything
    const rand = rng(1710)
    const sky = svg.append('g').attr('class', 'ec-sky').attr('aria-hidden', 'true')
    for (let i = 0; i < (narrow ? 70 : 140); i++) {
      const tw = rand() < 0.14
      sky.append('circle').attr('class', tw ? 'ec-dust tw' : 'ec-dust')
        .attr('cx', (rand() * W).toFixed(1)).attr('cy', (rand() * H).toFixed(1))
        .attr('r', (0.35 + rand() * rand() * 1.1).toFixed(2)).attr('opacity', (0.18 + rand() * 0.45).toFixed(2))
        .attr('style', tw ? `--d:${(2.5 + rand() * 3.5).toFixed(1)}s;--dl:${(-rand() * 5).toFixed(1)}s` : null)
    }

    // the regions, each with its heading
    const reg = svg.append('g').attr('class', 'ec-regions')
    for (const g of groups) {
      reg.append('rect').attr('class', 'ec-region').attr('x', 8).attr('y', g.y0).attr('width', W - 16).attr('height', g.y1 - g.y0).attr('rx', 12)
      reg.append('text').attr('class', 'ec-region-t').attr('x', NAME).attr('y', g.y0 + 22).text(g.heading)
    }

    // the navigation grid, the wash past 1 in 20 and its glowing line, and the words either side of it
    const ticks = narrow ? [1, 20, 1000, 100000] : [2, 5, 20, 100, 1000, 10000, 100000]   // the ones labelled
    const marks = [...new Set([1, ...ticks])]   // a tick at the axis's start either way
    const grid = svg.append('g').attr('class', 'ec-grid').attr('aria-hidden', 'true')
    for (const v of marks) grid.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', TOP - 6).attr('y2', axisY)
    const bar = svg.append('g').attr('aria-hidden', 'true')
    bar.append('rect').attr('class', 'ec-wash').attr('x', x(20)).attr('y', TOP - 18).attr('width', x(100000) - x(20)).attr('height', axisY - TOP + 18)
    bar.append('line').attr('class', 'ec-bar-glow').attr('x1', x(20)).attr('x2', x(20)).attr('y1', TOP - 18).attr('y2', axisY).attr('filter', 'url(#ec-blur)')
    bar.append('line').attr('class', 'ec-bar').attr('x1', x(20)).attr('x2', x(20)).attr('y1', TOP - 18).attr('y2', axisY)
    bar.append('text').attr('class', 'ec-rare').attr('x', x(20) + 8).attr('y', TOP - 28).text('rarer than 1 in 20 →')
    if (!narrow) bar.append('text').attr('class', 'ec-often').attr('x', x(20) - 8).attr('y', TOP - 28).attr('text-anchor', 'end').text('← luck does this often')

    // the axis along the foot: ticks and their values, and what the scale is
    const ax = svg.append('g').attr('class', 'ec-axis').attr('aria-hidden', 'true')
    ax.append('line').attr('class', 'ec-axis-line').attr('x1', AX0).attr('x2', AX1).attr('y1', axisY).attr('y2', axisY)
    for (const v of marks) {
      ax.append('line').attr('class', 'ec-tick').attr('x1', x(v)).attr('x2', x(v)).attr('y1', axisY - 4).attr('y2', axisY + 4)
      if (ticks.includes(v)) ax.append('text').attr('class', 'ec-tl').attr('x', x(v)).attr('y', axisY + 20).text(`1 in ${fmt(v)}`)
    }
    // what the scale asks, centred under it, and which way is which at its two ends (2026-11-17)
    ax.append('text').attr('class', 'ec-axis-t').attr('x', (AX0 + AX1) / 2).attr('text-anchor', 'middle').attr('y', axisY + 44)
      .text('How likely is chance alone to explain these orbital patterns?')
    ax.append('text').attr('class', 'ec-dir').attr('x', AX0).attr('y', axisY + 64).text('More likely')
    ax.append('text').attr('class', 'ec-dir').attr('x', AX1).attr('text-anchor', 'end').attr('y', axisY + 64).text('Less likely →')

    // a study: its row (or entry), a star, its value; focusable, with a card on pointing, focus or tap
    const entries = []
    const addStar = (g, d, cx, cy, hollow) => {
      g.append('circle').attr('class', 'ec-halo').attr('cx', cx).attr('cy', cy).attr('r', hollow ? 15 : 20).attr('fill', `url(#ec-halo-${d.side})`)
      g.append('g').attr('transform', `translate(${cx},${cy})`)   // placed by its group, so the star itself can grow
        .append('path').attr('class', hollow ? 'ec-mark is-hollow' : 'ec-mark').attr('d', star(hollow ? 9 : 11)).attr('style', `--c:${COLOUR[d.side]}`)
      if (!hollow) g.append('circle').attr('class', 'ec-core').attr('cx', cx).attr('cy', cy).attr('r', 2.4)
    }
    const layer = svg.append('g').attr('class', 'ec-stars')
    for (const grp of groups) {
      grp.onScale.forEach((d, i) => {
        const cy = grp.rowsY[i], ny = cy - LINE, cx = x(d.oneIn)
        const g = layer.append('g').attr('class', `ec-row is-${d.side}`)
        g.append('rect').attr('class', 'ec-hit').attr('x', 14).attr('y', ny - (narrow ? 18 : ROW / 2 - 2)).attr('width', W - 28).attr('height', ROW - 4).attr('rx', 9)
        const name = g.append('text').attr('class', 'ec-name').attr('x', NAME).attr('y', ny + 5)
        name.append('tspan').text(d.label)
        if (d.detail) name.append('tspan').attr('class', 'ec-detail').attr('dx', 9).text(d.detail)
        g.append('rect').attr('class', 'ec-tail').attr('x', x(1)).attr('y', cy - 1).attr('width', Math.max(0, cx - x(1) - 6)).attr('height', 2).attr('fill', `url(#ec-tail-${d.side})`)
        addStar(g, d, cx, cy, false)
        g.append('text').attr('class', 'ec-val').attr('x', cx + 17).attr('y', cy + 5).attr('fill', INK[d.side]).text(`1 in ${fmt(d.oneIn)}`)
        entries.push({ g, d, grp, cx, cy })
      })
    }
    // the findings of chance: a thin divider under the axis's caption, a muted heading naming their group (or groups),
    // then the studies side by side, never on the scale
    if (chance.length) {
      const c = layer.append('g').attr('class', 'ec-chance')
      c.append('line').attr('class', 'ec-divider').attr('x1', 18).attr('x2', W - 18).attr('y1', divY).attr('y2', divY)
      const t = c.append('text').attr('class', 'ec-chance-t').attr('x', NAME).attr('y', chanceT)
      t.append('tspan').text('Studies finding results consistent with chance')
      if (chanceGroups.length === 1) {
        const which = chanceGroups[0].charAt(0).toLowerCase() + chanceGroups[0].slice(1)
        if (narrow) t.append('tspan').attr('class', 'ec-chance-g').attr('x', NAME).attr('dy', 18).text(which)
        else t.append('tspan').attr('class', 'ec-chance-g').text(` · ${which}`)
      }
      const colW = (W - 2 * NAME) / chance.length
      chance.forEach(({ d, grp }, i) => {
        const cx = NAME + 12 + i * colW, cy = chanceY
        const g = layer.append('g').attr('class', `ec-row is-${d.side}`)
        g.append('rect').attr('class', 'ec-hit').attr('x', cx - 18).attr('y', cy - 18).attr('width', colW - 8).attr('height', narrow ? 46 : 36).attr('rx', 9)
        addStar(g, d, cx, cy, true)
        const name = g.append('text').attr('class', 'ec-name').attr('x', cx + 20).attr('y', cy + 5)
        name.append('tspan').text(d.label)
        if (d.detail) {
          if (narrow) g.append('text').attr('class', 'ec-detail').attr('x', cx + 20).attr('y', cy + 23).text(d.detail)
          else name.append('tspan').attr('class', 'ec-detail').attr('dx', 9).text(d.detail)
        }
        entries.push({ g, d, grp, cx, cy })
      })
    }

    for (const e of entries) {
      const { g, d } = e
      g.attr('tabindex', 0).attr('role', 'button').attr('aria-label', `${d.label}${d.detail ? `, ${d.detail}` : ''}: ${result(d)}. ${e.grp.heading}.`)
        .on('pointerenter', ev => { if (ev.pointerType === 'mouse' && !pinned) show(e) })
        .on('pointerleave', ev => { if (ev.pointerType === 'mouse' && !pinned) hide() })
        .on('focus', () => { if (!pinned || pinned === e.d) show(e) })
        .on('blur', () => { if (!pinned) hide() })
        .on('click', ev => { ev.stopPropagation(); if (pinned === d) { pinned = null; hide() } else { pinned = d; show(e) } })
        .on('keydown', ev => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); if (pinned === d) { pinned = null; hide() } else { pinned = d; show(e) } }
        })
    }
  }

  const result = d => d.oneIn ? `1 in ${fmt(d.oneIn)}` : 'consistent with chance'
  const year = d => (String(d.label).match(/\b(19|20)\d{2}\b/) || [])[0]
  function card (d, grp) {
    const said = d.side === 'ours'
      ? `In ${fmt(trials)} simulated solar systems with orbits pointing every way, about 1 in ${fmt(d.oneIn)} lined up at least this well.`
      : d.oneIn
        ? `Under this study’s assumptions, chance alone would line the orbits up this well about 1 in ${fmt(d.oneIn)} times.`
        : 'This study found the alignment consistent with chance, so it gives no odds to place on the scale.'
    const yr = year(d)
    return `<p class="ec-tip-name">${esc(yr ? d.label.replace(yr, '').trim() : d.label)}${yr ? ` <span>${yr}</span>` : ''}</p>
      <p class="ec-tip-res" style="color:${INK[d.side]}">${esc(result(d).replace(/^c/, 'C'))}</p>
      <dl class="ec-tip-facts">
        ${d.plain || d.detail ? `<div><dt>Counted</dt><dd>${esc(d.plain || d.detail)}</dd></div>` : ''}
        <div><dt>Method</dt><dd>${esc(grp.heading)}</dd></div>
      </dl>
      <p class="ec-tip-say">${said}</p>
      ${d.quote ? `<p class="ec-tip-quote">“${esc(d.quote)}”</p>` : ''}
      ${d.doi ? `<a class="ec-tip-link" href="https://doi.org/${esc(d.doi)}" target="_blank" rel="noopener">The paper ↗</a>` : ''}`
  }
  function show (e) {
    if (open) open.g.classed('is-open', false)
    open = e
    e.g.classed('is-open', true).attr('aria-describedby', 'ecTip')
    tip.innerHTML = card(e.d, e.grp)
    tip.hidden = false
    tip.classList.toggle('is-pinned', pinned === e.d)
    // beside the star, kept inside the picture; above it when there is no room below
    const box = root.getBoundingClientRect(), s = e.g.select('.ec-mark').node().getBoundingClientRect()
    const mx = s.left + s.width / 2 - box.left, my = s.top + s.height / 2 - box.top
    const tw = tip.offsetWidth, th = tip.offsetHeight
    let left = mx + 20, top = my + 16
    if (left + tw > box.width - 8) left = mx - 20 - tw
    if (left < 8) left = Math.max(8, Math.min(box.width - tw - 8, mx - tw / 2))
    if (top + th > box.height - 8) top = Math.max(8, my - 16 - th)
    tip.style.left = `${left}px`; tip.style.top = `${top}px`
  }
  function hide () {
    if (open) open.g.classed('is-open', false).attr('aria-describedby', null)
    open = null; tip.hidden = true
  }
  document.addEventListener('pointerdown', ev => { if (pinned && !root.contains(ev.target)) { pinned = null; hide() } })
  root.addEventListener('pointerdown', ev => { if (pinned && !ev.target.closest('.ec-row, .ec-tip')) { pinned = null; hide() } })
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && open) { pinned = null; hide() } })

  draw()
  let w = root.clientWidth
  new ResizeObserver(() => { if (Math.abs(root.clientWidth - w) > 20) { w = root.clientWidth; pinned = null; hide(); draw() } }).observe(root)
}
