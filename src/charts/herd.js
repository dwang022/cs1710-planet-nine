// Part 2, page 1: "herd the orbits": put a planet somewhere and watch what it
// does to a crowd of randomly pointed orbits over four billion years.
//
// This is a cartoon of the mechanism in Batygin & Brown (2016), not a
// simulation of gravity. Two rules stand in for the dynamics:
//
//   1. The planet turns every orbit toward pointing the opposite way from its
//      own (anti-alignment). Each orbit then swings back and forth about that
//      direction, by its own amount and at its own pace: the "libration" in
//      the real dynamics.
//   2. An orbit that points the planet's way crosses its path and is, sooner
//      or later, thrown out of the picture.
//
// With no planet, neither rule applies and the orbits stay where they were.
// Heavier planets act faster (rule 1) and clear crossing orbits sooner (rule
// 2), so the pattern tightens with mass. Everything is seeded by the reader's
// choices, so the same choices always give the same outcome.

import * as d3 from 'd3'
import { resultant, rayleighP, seededRandom } from '../stats.js'

const W = 900, H = 560
const VIEW = { cx: 290, cy: 285, r: 252 }      // the top-down picture
const RING = { cx: 700, cy: 230, r: 112 }      // the compass summary
const SPAN_AU = 640                            // AU from the Sun to the picture's edge
const STEPS = 240                              // 240 steps = 4 billion years
const RUN_MS = 6000                            // how long a full run takes on screen
const N = 36
const PLANET = { a: 460, e: 0.3 }
const RAD = Math.PI / 180
const MASSES = [
  { id: 0, label: 'No planet', m: 0 },
  { id: 1, label: '5 Earth masses', m: 5 },
  { id: 2, label: '10 Earth masses', m: 10 },
]

const wrap180 = d => ((d + 540) % 360) - 180
const norm = d => ((d % 360) + 360) % 360
/** "1 in N" for a reader: past a million the exact figure stops meaning anything. */
const oddsText = p => p < 1e-6 ? 'less than 1 in a million' : `about 1 in ${Math.round(1 / p).toLocaleString()}`

/** An ellipse with the Sun at a focus and perihelion pointing `deg`, as SVG points. */
function ellipsePoints (a, e, deg, k, cx, cy, n = 72) {
  const th = deg * RAD, pts = []
  for (let i = 0; i <= n; i++) {
    const nu = (i / n) * 2 * Math.PI
    const r = a * (1 - e * e) / (1 + e * Math.cos(nu))
    pts.push([cx + r * k * Math.cos(th + nu), cy - r * k * Math.sin(th + nu)])
  }
  return pts
}

export function makeHerd ({ view, controls, result }) {
  const k = VIEW.r / SPAN_AU
  const line = d3.line()
  const state = { dir: 60, massIdx: 2, step: 0, running: false, orbits: [], noise: null }

  // --- the picture ----------------------------------------------------------
  const svg = d3.select(view).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'A top-down picture of randomly pointed distant orbits around the Sun, with a planet you place. Running the model shows the orbits that point the planet\'s way being removed and the rest turning to point the opposite way.')
  const defs = svg.append('defs')
  defs.append('clipPath').attr('id', 'herd-clip').append('circle').attr('cx', VIEW.cx).attr('cy', VIEW.cy).attr('r', VIEW.r)
  defs.append('marker').attr('id', 'herd-head').attr('viewBox', '0 0 10 10').attr('refX', 7).attr('refY', 5)
    .attr('markerWidth', 14).attr('markerHeight', 14).attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto')
    .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', 'var(--text-primary)')

  const gView = svg.append('g').attr('clip-path', 'url(#herd-clip)')
  gView.append('circle').attr('cx', VIEW.cx).attr('cy', VIEW.cy).attr('r', VIEW.r).attr('fill', '#0c0c0e')
  for (const au of [200, 400, 600]) {
    gView.append('circle').attr('cx', VIEW.cx).attr('cy', VIEW.cy).attr('r', au * k).attr('fill', 'none').attr('stroke', 'var(--rule)')
    gView.append('text').attr('class', 'axis-label halo').attr('x', VIEW.cx + 4).attr('y', VIEW.cy - au * k - 4).text(`${au} AU`)
  }
  const gOrbits = gView.append('g')
  const gPlanet = gView.append('g')
  gPlanet.append('path').attr('class', 'herd-p9orbit').attr('fill', 'none').attr('stroke', 'var(--series-3)').attr('stroke-width', 2.2).attr('stroke-dasharray', '6 5')
  gPlanet.append('use').attr('href', '#art-planet-nine').attr('width', 34).attr('height', 34)
  gView.append('use').attr('href', '#art-sun').attr('x', VIEW.cx - 11).attr('y', VIEW.cy - 11).attr('width', 22).attr('height', 22)
  svg.append('circle').attr('cx', VIEW.cx).attr('cy', VIEW.cy).attr('r', VIEW.r).attr('fill', 'none').attr('stroke', 'var(--text-muted)').attr('stroke-opacity', .5)
  const clock = svg.append('text').attr('x', VIEW.cx).attr('y', VIEW.cy + VIEW.r + 24).attr('text-anchor', 'middle')
    .attr('font-size', 14).attr('font-weight', 600).attr('fill', 'var(--text-secondary)')
  svg.append('text').attr('x', VIEW.cx).attr('y', 22).attr('text-anchor', 'middle').attr('font-size', 15).attr('font-weight', 600).attr('fill', 'var(--text-primary)')
    .text('Seen from above: 36 distant orbits, and your planet')

  // --- the compass ---------------------------------------------------------
  const gRing = svg.append('g')
  gRing.append('text').attr('x', RING.cx).attr('y', 22).attr('text-anchor', 'middle').attr('font-size', 15).attr('font-weight', 600).attr('fill', 'var(--text-primary)')
    .text('Which way the surviving orbits point')
  gRing.append('circle').attr('cx', RING.cx).attr('cy', RING.cy).attr('r', RING.r).attr('fill', 'none').attr('stroke', 'var(--text-muted)').attr('stroke-opacity', .5)
  gRing.selectAll('text.deg').data([0, 90, 180, 270]).join('text').attr('class', 'deg axis-label')
    .attr('x', d => RING.cx + (RING.r + 16) * Math.cos(d * RAD)).attr('y', d => RING.cy - (RING.r + 16) * Math.sin(d * RAD) + 4)
    .attr('text-anchor', 'middle').text(d => `${d}°`)
  gRing.append('circle').attr('cx', RING.cx).attr('cy', RING.cy).attr('r', 3.5).attr('fill', 'var(--sun)')
  const spoke = gRing.append('line').attr('stroke', 'var(--series-3)').attr('stroke-width', 3).attr('stroke-dasharray', '2 6').attr('stroke-linecap', 'round')
  const gDots = gRing.append('g')
  const arrow = gRing.append('line').attr('stroke', 'var(--text-primary)').attr('stroke-width', 4).attr('stroke-linecap', 'round').attr('marker-end', 'url(#herd-head)')
  const ringFoot = gRing.append('text').attr('x', RING.cx).attr('y', RING.cy + RING.r + 44).attr('text-anchor', 'middle').attr('font-size', 14).attr('fill', 'var(--text-secondary)')
  const ringFoot2 = gRing.append('text').attr('x', RING.cx).attr('y', RING.cy + RING.r + 66).attr('text-anchor', 'middle').attr('font-size', 14).attr('fill', 'var(--text-secondary)')
  const spokeLabel = gRing.append('text').attr('class', 'halo').attr('font-size', 12.5).attr('font-weight', 600).attr('fill', 'var(--series-3-ink)')

  // --- the population --------------------------------------------------------
  const seed = () => 1710 + state.dir * 31 + state.massIdx * 7
  function seedOrbits () {
    const rnd = seededRandom(seed())
    state.orbits = d3.range(N).map(i => {
      const a = 180 + rnd() * 240
      const q = 35 + rnd() * 45
      // each orbit's own swing about anti-alignment: how far, how fast, and where in the cycle it starts
      return { i, a, e: 1 - q / a, varpi: 0, varpi0: rnd() * 360, amp: 20 + rnd() * 110, period: 70 + rnd() * 70, phase: rnd() * 2 * Math.PI, alive: true, gone: null }
    })
    for (const o of state.orbits) o.varpi = o.varpi0
    state.noise = seededRandom(seed() + 1)
    state.step = 0
  }

  /** One step of the cartoon dynamics. */
  function advance () {
    const s = MASSES[state.massIdx].m / 10
    const t = state.step
    if (s > 0) {
      const tau = 80 / s                         // how quickly the planet takes hold
      const relax = Math.exp(-t / tau)
      const anti = state.dir + 180
      for (const o of state.orbits) {
        if (!o.alive) continue
        // rule 1: the original direction fades out while a swing about anti-alignment fades in
        const dev0 = wrap180(o.varpi0 - anti)
        const swing = o.amp * Math.sin(2 * Math.PI * t / o.period + o.phase)
        o.varpi = norm(anti + dev0 * relax + swing * (1 - relax))
        // rule 2: an orbit pointing the planet's way gets thrown out, sooner or later
        const toward = Math.abs(wrap180(o.varpi - state.dir))
        if (toward < 60 && state.noise() < 0.025 * s * Math.cos(toward * RAD)) { o.alive = false; o.gone = t }
      }
    }
    state.step++
  }

  // --- drawing --------------------------------------------------------------
  function draw () {
    const alive = state.orbits.filter(o => o.alive)
    const sel = gOrbits.selectAll('g.o').data(state.orbits, d => d.i)
    const en = sel.enter().append('g').attr('class', 'o')
    en.append('path').attr('fill', 'none').attr('stroke-linejoin', 'round')
    en.append('circle').attr('r', 3.5)
    const all = en.merge(sel)
    const fade = d => d.alive ? 1 : Math.max(0, 1 - (state.step - d.gone) / 22)
    all.select('path')
      .attr('d', d => line(ellipsePoints(d.a, d.e, d.varpi, k, VIEW.cx, VIEW.cy)))
      .attr('stroke', d => d.alive ? 'var(--series-1)' : 'var(--series-2)')
      .attr('stroke-width', d => d.alive ? 1.3 : 2)
      .attr('opacity', d => d.alive ? 0.7 : fade(d))
    all.select('circle')
      .attr('cx', d => VIEW.cx + d.a * (1 - d.e) * k * Math.cos(d.varpi * RAD))
      .attr('cy', d => VIEW.cy - d.a * (1 - d.e) * k * Math.sin(d.varpi * RAD))
      .attr('fill', d => d.alive ? 'var(--series-1)' : 'var(--series-2)')
      .attr('opacity', fade)

    // the planet
    const m = MASSES[state.massIdx].m
    gPlanet.attr('opacity', m ? 1 : 0.18)
    gPlanet.select('path').attr('d', line(ellipsePoints(PLANET.a, PLANET.e, state.dir, k, VIEW.cx, VIEW.cy, 90)))
    const px = VIEW.cx + PLANET.a * (1 - PLANET.e) * k * Math.cos(state.dir * RAD)
    const py = VIEW.cy - PLANET.a * (1 - PLANET.e) * k * Math.sin(state.dir * RAD)
    gPlanet.select('use').attr('x', px - 17).attr('y', py - 17)

    clock.text(state.step === 0 ? 'now' : `${(state.step / STEPS * 4).toFixed(1)} billion years later`)

    // the compass
    const st = resultant(alive.map(o => o.varpi))
    const bins = d3.group(alive.slice().sort((a, b) => a.varpi - b.varpi), o => Math.floor(o.varpi / 10))
    const placed = []
    for (const [, grp] of bins) grp.forEach((o, j) => placed.push({ ...o, rr: RING.r + 9 + j * 9 }))
    gDots.selectAll('circle').data(placed, d => d.i).join('circle').attr('r', 4.2)
      .attr('fill', 'var(--series-1)').attr('stroke', 'var(--surface-1)').attr('stroke-width', 1)
      .attr('cx', d => RING.cx + d.rr * Math.cos(d.varpi * RAD)).attr('cy', d => RING.cy - d.rr * Math.sin(d.varpi * RAD))
    arrow.attr('x1', RING.cx).attr('y1', RING.cy)
      .attr('x2', RING.cx + RING.r * st.R * Math.cos(st.meanDeg * RAD)).attr('y2', RING.cy - RING.r * st.R * Math.sin(st.meanDeg * RAD))
      .attr('opacity', alive.length >= 3 ? 1 : 0)
    spoke.attr('x1', RING.cx).attr('y1', RING.cy)
      .attr('x2', RING.cx + RING.r * Math.cos(state.dir * RAD)).attr('y2', RING.cy - RING.r * Math.sin(state.dir * RAD))
      .attr('opacity', m ? 1 : 0.2)
    spokeLabel.attr('x', RING.cx + (RING.r * 0.62) * Math.cos(state.dir * RAD)).attr('y', RING.cy - (RING.r * 0.62) * Math.sin(state.dir * RAD) - 8)
      .attr('text-anchor', Math.cos(state.dir * RAD) < 0 ? 'end' : 'start').text(m ? 'the planet points this way' : '').attr('opacity', m ? 1 : 0)
    const p = rayleighP(st.n, st.R)
    ringFoot.text(`${alive.length} of ${N} orbits remain · arrow length ${st.R.toFixed(2)}`)
    ringFoot2.text(alive.length >= 3 ? `luck alone lines up ${alive.length} orbits this well ${oddsText(p)}` : '')
    return { alive, st, p }
  }

  // --- result text -----------------------------------------------------------
  function summarise () {
    const { alive, st, p } = draw()
    const m = MASSES[state.massIdx].m
    if (state.step < STEPS) { result.innerHTML = ''; return }
    if (!m) {
      result.innerHTML = `<div class="note" style="border-left-color:var(--text-muted);background:#ffffff08"><div class="note-k" style="color:var(--text-secondary)">What happened</div>
        <p><strong>Nothing herded the orbits.</strong> After four billion years all ${alive.length} still point every which way:
        arrow length ${st.R.toFixed(2)}, which luck produces about 1 in ${Math.round(1 / p)} times. That is what the outer solar system should look like with no planet out there.</p></div>`
      return
    }
    const sep = Math.abs(wrap180(st.meanDeg - state.dir))
    result.innerHTML = `<div class="note" style="border-left-color:var(--series-3);background:color-mix(in srgb, var(--series-3) 7%, transparent)"><div class="note-k" style="color:var(--series-3-ink)">What happened</div>
      <p><strong>${N - alive.length} of ${N} orbits were thrown out</strong>, nearly all of them ones that pointed the planet's way.
      The ${alive.length} that remain swing about a direction <strong>${sep.toFixed(0)}° from the planet's</strong>, close to opposite:
      arrow length ${st.R.toFixed(2)}, which luck alone produces ${oddsText(p)}.
      ${state.dir === 247 ? ' That is the published direction for Planet Nine; the real well-measured objects point toward about 67°.' : ''}</p></div>`
  }

  // --- running -----------------------------------------------------------------
  // d3.timer hands the callback the time since it started, so a paused run
  // resumes by adding the time its earlier steps would have taken.
  let timer = null
  function run () {
    if (timer) return
    if (state.step >= STEPS) { seedOrbits(); draw(); result.innerHTML = '' }
    state.running = true
    syncButtons()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      while (state.step < STEPS) advance()
      stop(); summarise(); return
    }
    const offset = state.step / STEPS * RUN_MS
    timer = d3.timer(elapsed => {
      const target = Math.min(STEPS, Math.floor((offset + elapsed) / RUN_MS * STEPS))
      while (state.step < target) advance()
      draw()
      if (state.step >= STEPS) { stop(); summarise() }
    })
  }
  function stop () { if (timer) { timer.stop(); timer = null } state.running = false; syncButtons() }
  function reset () { stop(); seedOrbits(); draw(); result.innerHTML = '' }

  // --- controls ----------------------------------------------------------------
  controls.innerHTML = `
    <div class="herd-ctrl">
      <div class="ctrl">
        <label for="herdDir">Where your planet's near end points <b><span id="herdDirV">${state.dir}</span>°</b></label>
        <input type="range" id="herdDir" min="0" max="359" step="1" value="${state.dir}" />
        <p class="filter-desc">Counter-clockwise from the right, like the compass.</p>
      </div>
      <div class="ctrl">
        <span class="filter-name" id="herdMassK">How heavy</span>
        <div class="seg" role="group" aria-labelledby="herdMassK" id="herdMass">${MASSES.map(x => `<button type="button" data-m="${x.id}" aria-pressed="${x.id === state.massIdx}">${x.label}</button>`).join('')}</div>
        <p class="filter-desc">Heavier takes hold faster and clears crossing orbits sooner. "No planet" is the control.</p>
      </div>
      <div class="herd-buttons">
        <button type="button" class="btn-primary" id="herdRun">Run 4 billion years</button>
        <button type="button" class="btn-reset" id="herdPreset">Published orbit: 247°, 7 Earth masses</button>
        <button type="button" class="btn-reset" id="herdReset">Reset</button>
      </div>
    </div>`
  const $ = s => controls.querySelector(s)
  const setMass = idx => {
    state.massIdx = idx
    $('#herdMass').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.m === state.massIdx)))
  }
  $('#herdDir').addEventListener('input', e => { state.dir = +e.target.value; $('#herdDirV').textContent = state.dir; reset() })
  $('#herdMass').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setMass(+b.dataset.m); reset() })
  $('#herdRun').addEventListener('click', () => state.running ? stop() : run())
  $('#herdReset').addEventListener('click', reset)
  $('#herdPreset').addEventListener('click', () => {
    state.dir = 247; $('#herdDir').value = 247; $('#herdDirV').textContent = 247
    setMass(2); reset(); run()
  })
  function syncButtons () {
    const b = $('#herdRun'); if (!b) return
    b.textContent = state.running ? 'Pause' : state.step >= STEPS ? 'Run it again' : state.step ? 'Resume' : 'Run 4 billion years'
  }

  reset()
  return { run, reset }
}
