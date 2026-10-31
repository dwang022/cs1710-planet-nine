// Part 2, page 2: the streetlight. A crowd of orbits pointing in every
// direction, a telescope that only photographed part of the sky, and the
// bunching that appears in what it found. The reader sets how much sky was
// covered and in how many patches, on the picture itself; the true population
// never changes. Beside it, what the survey found against the whole population.

import * as d3 from 'd3'
import { resultant, rayleighP, seededRandom, oneIn } from '../stats.js'

const W = 520, H = 470
const RING = { cx: 260, cy: 212, r: 150 }
const RAD = Math.PI / 180
const N = 60

export function makeBias ({ view, controls, result }) {
  const state = { cover: 40, patches: 2, seed: 7 }
  let rnd = seededRandom(state.seed)
  let angles = []
  let centres = []

  const svg = d3.select(view).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'A compass of orbit directions. Shaded wedges show where a survey looked; only the orbits inside them are found, and those alone can look bunched even though the whole population is spread evenly.')
  svg.append('defs').append('marker').attr('id', 'bias-head').attr('viewBox', '0 0 10 10').attr('refX', 7).attr('refY', 5)
    .attr('markerWidth', 13).attr('markerHeight', 13).attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto')
    .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', 'currentColor')
  const gWedges = svg.append('g')
  svg.append('circle').attr('cx', RING.cx).attr('cy', RING.cy).attr('r', RING.r).attr('fill', 'none').attr('stroke', 'var(--text-muted)').attr('stroke-opacity', .5)
  svg.append('circle').attr('cx', RING.cx).attr('cy', RING.cy).attr('r', 3.5).attr('fill', 'var(--sun)')
  const gDots = svg.append('g')
  const arrowAll = svg.append('line').attr('stroke', 'var(--text-muted)').attr('stroke-width', 3).attr('stroke-linecap', 'round').style('color', 'var(--text-muted)').attr('marker-end', 'url(#bias-head)')
  const arrowFound = svg.append('line').attr('stroke', 'var(--text-primary)').attr('stroke-width', 4).attr('stroke-linecap', 'round').style('color', 'var(--text-primary)').attr('marker-end', 'url(#bias-head)')

  function resample () {
    rnd = seededRandom(state.seed)
    angles = d3.range(N).map(i => ({ i, deg: rnd() * 360 }))
    centres = d3.range(3).map(() => rnd() * 360)
  }

  /** The wedges the survey covered: `patches` equal arcs totalling `cover` percent of the circle. */
  function wedges () {
    const each = 360 * state.cover / 100 / state.patches
    return centres.slice(0, state.patches).map(c => ({ c, a0: c - each / 2, a1: c + each / 2 }))
  }
  const inside = (deg, ws) => ws.some(w => { const d = ((deg - w.c + 540) % 360) - 180; return Math.abs(d) <= (w.a1 - w.a0) / 2 })

  function draw () {
    const ws = wedges()
    const arc = d3.arc().innerRadius(0).outerRadius(RING.r + 26)
    gWedges.selectAll('path').data(ws).join('path')
      .attr('transform', `translate(${RING.cx},${RING.cy})`)
      .attr('d', w => arc({ startAngle: (90 - w.a1) * RAD, endAngle: (90 - w.a0) * RAD }))
      .attr('fill', '#ece6d8').attr('opacity', 0.13)
    gWedges.selectAll('text').data(ws).join('text').attr('class', 'halo')
      .attr('x', w => RING.cx + (RING.r * 0.55) * Math.cos(w.c * RAD)).attr('y', w => RING.cy - (RING.r * 0.55) * Math.sin(w.c * RAD) + 4)
      .attr('text-anchor', 'middle').attr('font-size', 12).attr('font-weight', 600).attr('fill', '#ece6d8').text('surveyed')

    const tagged = angles.map(a => ({ ...a, found: inside(a.deg, ws) }))
    const bins = d3.group(tagged.slice().sort((a, b) => a.deg - b.deg), a => Math.floor(a.deg / 8))
    const placed = []
    for (const [, g] of bins) g.forEach((a, j) => placed.push({ ...a, rr: RING.r + 8 + j * 9 }))
    gDots.selectAll('circle').data(placed, d => d.i).join('circle')
      .attr('r', d => d.found ? 4.6 : 3.2)
      .attr('cx', d => RING.cx + d.rr * Math.cos(d.deg * RAD)).attr('cy', d => RING.cy - d.rr * Math.sin(d.deg * RAD))
      .attr('fill', d => d.found ? 'var(--series-1)' : 'var(--text-muted)').attr('opacity', d => d.found ? 1 : 0.35)
      .attr('stroke', 'var(--surface-1)').attr('stroke-width', 1)

    const found = tagged.filter(a => a.found)
    const sf = resultant(found.map(a => a.deg)), sa = resultant(tagged.map(a => a.deg))
    const end = (st, r) => [RING.cx + r * st.R * Math.cos(st.meanDeg * RAD), RING.cy - r * st.R * Math.sin(st.meanDeg * RAD)]
    const ef = end(sf, RING.r), ea = end(sa, RING.r)
    arrowFound.attr('x1', RING.cx).attr('y1', RING.cy).attr('x2', ef[0]).attr('y2', ef[1]).attr('opacity', found.length >= 3 ? 1 : 0)
    arrowAll.attr('x1', RING.cx).attr('y1', RING.cy).attr('x2', ea[0]).attr('y2', ea[1])

    // beside the picture: what the survey found, the whole population, and a word or two
    const pf = rayleighP(sf.n, sf.R), pa = rayleighP(sa.n, sa.R)
    const odds = p => `luck alone, about 1 in ${oneIn(p).toLocaleString()}`
    const fake = found.length >= 3 && pf < 0.05
    result.innerHTML = `
      <div class="bias-card found">
        <div class="k"><i class="bias-mark"></i>What the survey found</div>
        <div class="v">${found.length >= 3 ? `arrow length ${sf.R.toFixed(2)}` : 'too few found'}</div>
        <div class="d">${found.length} of ${N} objects${found.length >= 3 ? ` · ${odds(pf)}` : ''}</div>
      </div>
      <div class="bias-card all">
        <div class="k"><i class="bias-mark"></i>Whole population</div>
        <div class="v">arrow length ${sa.R.toFixed(2)}</div>
        <div class="d">${N} objects · ${odds(pa)}</div>
      </div>
      <p class="verdict${fake ? ' against' : ''}"><b>${fake ? 'A false alignment' : 'About as random as the truth'}</b></p>`
  }

  // the controls, on the picture
  controls.innerHTML = `
    <label class="lbl" for="biasCover">Sky photographed <input type="range" id="biasCover" min="10" max="100" step="5" value="${state.cover}" /> <b><span id="biasCoverV">${state.cover}</span>%</b></label>
    <span class="lbl" id="biasPatchK">Patches</span>
    <div class="seg" role="group" aria-labelledby="biasPatchK" id="biasPatch">${[1, 2, 3].map(n => `<button type="button" data-n="${n}" aria-pressed="${n === state.patches}">${n}</button>`).join('')}</div>
    <button type="button" class="pic-btn" id="biasNew">New sky</button>`
  const $ = s => controls.querySelector(s)
  $('#biasCover').addEventListener('input', e => { state.cover = +e.target.value; $('#biasCoverV').textContent = state.cover; draw() })
  $('#biasPatch').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    state.patches = +b.dataset.n
    $('#biasPatch').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.n === state.patches)))
    draw()
  })
  $('#biasNew').addEventListener('click', () => { state.seed = (state.seed * 7919 + 13) % 100003; resample(); draw() })

  resample(); draw()
  return { draw }
}
