// Section 00 — the planet lineup, after the Outer Wilds planetary chart: the
// Sun at the left, every planet on its own arc, names in capitals. Not to
// scale in any way. The story steps crowd Pluto's neighbourhood, drop Pluto
// to dwarf-planet status, and finally pencil in a ninth planet with a
// question mark. Bodies are drawn from the sprite in art.js.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'
import { PLANET_ART } from '../art.js'

const W = 1000, H = 440
const SUN = { x: 8, y: 240, r: 120 }
const T = 650

// Slot order, drawn size and a vertical stagger so the labels never collide.
const SLOTS = [
  { name: 'Mercury', size: 26, dy: 18 }, { name: 'Venus', size: 34, dy: -16 }, { name: 'Earth', size: 36, dy: 12 },
  { name: 'Mars', size: 30, dy: -18 }, { name: 'Jupiter', size: 64, dy: 8 }, { name: 'Saturn', size: 72, dy: -20 },
  { name: 'Uranus', size: 46, dy: 12 }, { name: 'Neptune', size: 44, dy: -14 }, { name: 'Pluto', size: 22, dy: 22, dwarf: true },
]
const X0 = 150, DX = 84, P9X = 910
const DROP = 104           // how far Pluto falls when it stops being a planet: below the count, out of it
// The count: a number on each planet's own arc, all on one line under the names, like beads on the
// orbits. The last one is larger and in the count's colour (nine in Pluto's, eight white, the ninth in
// Planet Nine's), as the title's three words are.
const NUM_Y = 340

const FACTS = {
  Mercury: 'Known since antiquity.', Venus: 'Known since antiquity.', Earth: 'You are here.',
  Mars: 'Known since antiquity.', Jupiter: 'Known since antiquity.', Saturn: 'Known since antiquity.',
  Uranus: 'Found in 1781, the first planet discovered with a telescope.',
  Neptune: 'Found in 1846, on paper before in the sky: its pull on Uranus gave it away.',
  Pluto: 'Found in 1930. A planet until 24 August 2006; a dwarf planet since.',
}
// The years in the chart's title: what each edition means is in the step
// card beside it, and the planets themselves are drawn.
const YEARS = {
  nine: '1930 – 2006',
  neighbours: '1992 – 2005',
  rules: '2006',
  eight: '2006',
  'nine-again': '2016',
}

// A small seeded generator so the Kuiper belt speckle is the same on every visit.
function lcg (seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 } }

export function makeLineup (root) {
  const svg = d3.select(root).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'A chart of the planets in a row from the Sun, with Pluto at the end, each numbered. As the story advances, Pluto is reclassified and loses its number, leaving eight, and a ninth planet appears with a question mark.')

  svg.append('clipPath').attr('id', 'lu-clip').append('rect').attr('width', W).attr('height', H)
  const g = svg.append('g').attr('clip-path', 'url(#lu-clip)')

  // --- title -----------------------------------------------------------------
  const title = svg.append('text').attr('class', 'lu-title').attr('x', W / 2).attr('y', 40).attr('text-anchor', 'middle')

  // --- bodies ------------------------------------------------------------------
  const slots = SLOTS.map((s, i) => ({ ...s, x: X0 + i * DX, y: SUN.y + s.dy, art: PLANET_ART[s.name] }))
  const p9 = { name: 'Planet Nine', x: P9X, y: SUN.y - 4, size: 50, art: 'planet-nine', p9: true }
  const dist = b => Math.hypot(b.x - SUN.x, b.y - SUN.y)

  const gArcs = g.append('g')
  const gKbo = g.append('g').attr('opacity', 0)
  const gNums = g.append('g').attr('aria-hidden', 'true').style('pointer-events', 'none')
  const gSun = g.append('g')
  const gBodies = g.append('g')
  const gNotes = g.append('g').style('pointer-events', 'none')
  const gCallout = g.append('g').attr('class', 'lu-callout').attr('opacity', 0).style('pointer-events', 'none')

  gSun.append('use').attr('href', '#art-sun')
    .attr('x', SUN.x - SUN.r).attr('y', SUN.y - SUN.r).attr('width', SUN.r * 2).attr('height', SUN.r * 2)

  // One arc per body, centred on the Sun and passing through it, in the body's own colour.
  const colour = { Mercury: '#8c7f78', Venus: '#d9b98a', Earth: '#4f86c6', Mars: '#c1440e', Jupiter: '#c9a07a', Saturn: '#e3d6a8', Uranus: '#9fd8e0', Neptune: '#3f66c9', Pluto: '#c8ad94' }
  gArcs.selectAll('circle').data([...slots, p9], d => d.name).join('circle')
    .attr('class', d => `lu-arc${d.p9 ? ' dashed' : ''}`)
    .attr('cx', SUN.x).attr('cy', SUN.y).attr('r', dist)
    .attr('stroke', d => d.p9 ? 'var(--p9)' : colour[d.name])
    .attr('opacity', d => d.p9 ? 0 : 1)

  // The count, each number where its body's arc crosses the line NUM_Y (the arcs are centred on the Sun).
  const onArc = b => SUN.x + Math.sqrt(dist(b) ** 2 - (NUM_Y - SUN.y) ** 2)
  const nums = gNums.selectAll('g').data([...slots.map((s, i) => ({ ...s, n: `${i + 1}` })), { ...p9, n: '9?' }], d => d.name).join('g')
    .attr('class', d => `lu-num${d.p9 ? ' p9' : ''}`)
    .attr('transform', d => `translate(${onArc(d).toFixed(1)},${NUM_Y})`)
    .attr('opacity', d => d.p9 ? 0 : 1)
  nums.append('circle').attr('r', 14).attr('stroke', d => d.p9 ? 'var(--p9)' : colour[d.name])
  nums.append('text').attr('text-anchor', 'middle').attr('dy', '0.36em').text(d => d.n)

  // Pluto's neighbours: a speckle along its arc.
  const rnd = lcg(2006)
  const pluto = slots.find(s => s.dwarf)
  const rPl = dist(pluto)
  const kbo = d3.range(90).map(() => {
    const r = rPl + (rnd() - 0.5) * 70
    const a = (rnd() - 0.5) * 2 * Math.atan2(190, rPl)
    return { x: SUN.x + r * Math.cos(a), y: SUN.y + r * Math.sin(a), s: 1 + rnd() * 2.2 }
  }).filter(d => Math.hypot(d.x - pluto.x, d.y - pluto.y) > 28)
  gKbo.selectAll('circle').data(kbo).join('circle').attr('class', 'lu-kbo')
    .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.s)

  const body = gBodies.selectAll('g').data([...slots, p9], d => d.name).join('g')
    .attr('class', d => `lu-body${d.p9 ? ' p9' : ''}`)
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .attr('opacity', d => d.p9 ? 0 : 1)
    .on('pointerenter', hover).on('pointermove', hover).on('pointerleave', () => hideTip())
  body.append('use').attr('href', d => `#art-${d.art}`)
    .attr('x', d => -d.size / 2).attr('y', d => -d.size / 2).attr('width', d => d.size).attr('height', d => d.size)
  body.append('text').attr('class', d => `lu-lbl${d.p9 ? ' p9' : ''}`).attr('data-planet', d => d.p9 ? null : d.name).attr('text-anchor', 'middle')
    .attr('y', d => d.size * 0.62 + 20).text(d => d.p9 ? 'Planet Nine?' : d.name)

  // A speech bubble w by h with a 16px tail under x = tx, leaning by tdx.
  const bubble = (w, h, tx, tdx) =>
    `M8,0 H${w - 8} a8,8 0 0 1 8,8 V${h - 8} a8,8 0 0 1 -8,8 H${tx + 10} L${tx + tdx},${h + 16} L${tx - 6},${h} H8 a8,8 0 0 1 -8,-8 V8 a8,8 0 0 1 8,-8 Z`

  // Pluto itself stays its usual self, only faded; the reaction goes in a
  // speech bubble beside it, so the face reads as a comment on the moment.
  const CO = { w: 190, h: 84 }
  gCallout.append('path').attr('class', 'lu-callout-box').attr('d', bubble(CO.w, CO.h, 20, -6))
  gCallout.append('use').attr('href', '#art-pluto-sad').attr('x', 8).attr('y', 16).attr('width', 52).attr('height', 52)
  gCallout.append('text').attr('class', 'lu-callout-t').attr('x', 66).attr('y', 30).text('24 Aug 2006')
  gCallout.append('text').attr('class', 'lu-callout-s').attr('x', 66).attr('y', 50).text('Pluto is reclassified')
  gCallout.append('text').attr('class', 'lu-callout-s').attr('x', 66).attr('y', 68).text('as a dwarf planet')

  // The same bubble beside Planet Nine once it is pencilled in: a search, not a sighting.
  const CO2 = { w: 182, h: 62 }
  const gCallout2 = g.append('g').attr('class', 'lu-callout p9').attr('opacity', 0).style('pointer-events', 'none')
  const box2 = gCallout2.append('path').attr('class', 'lu-callout-box')
  const l1 = gCallout2.append('text').attr('class', 'lu-callout-s').attr('x', 14).attr('y', 27).text('Astronomers begin searching')
  const l2 = gCallout2.append('text').attr('class', 'lu-callout-s').attr('x', 14).attr('y', 47).html('for a possible <tspan class="p9">ninth planet</tspan>')
  // size the bubble to its words (the font is the reader's), falling back to a guess
  const tw = Math.max(l1.node().getComputedTextLength?.() || 0, l2.node().getComputedTextLength?.() || 0)
  if (tw > 0) CO2.w = Math.round(tw + 28)
  box2.attr('d', bubble(CO2.w, CO2.h, CO2.w - 40, 6))

  // A fact or two about each body; no distances (2026-11-16): the distance page is where they are told.
  function hover (ev, d) {
    showTip(ev, d.p9
      ? `<b>Planet Nine (predicted)</b><div>Proposed in 2016 by Konstantin Batygin and Mike Brown. Five to ten times Earth's mass, far beyond Neptune. Never observed.</div>`
      : `<b>${d.name}</b><div>${FACTS[d.name]}</div>`)
  }

  // --- the story -----------------------------------------------------------------
  function setStep (step) {
    const dropped = step === 'eight' || step === 'nine-again'
    const crowded = step !== 'nine'
    const showP9 = step === 'nine-again'

    title.text(`Planetary chart of the Solar System (${YEARS[step]})`)

    gKbo.transition().duration(T).attr('opacity', crowded ? (dropped ? 0.55 : 1) : 0)
    body.transition().duration(T)
      .attr('transform', d => `translate(${d.x},${d.y + (d.dwarf && dropped ? DROP : 0)})`)
      .attr('opacity', d => d.p9 ? (showP9 ? 1 : 0) : d.dwarf && dropped ? 0.5 : 1)
    // Pluto keeps its own face; the bubble beside it carries the reaction,
    // and only while the reclassification is the point of the step.
    const bx = Math.min(W - CO.w - 4, pluto.x + 16), by = pluto.y + DROP - CO.h - 36
    gCallout.attr('transform', `translate(${bx},${by})`)
      .transition().duration(T).attr('opacity', step === 'eight' ? 1 : 0)
    const bx2 = P9X - CO2.w + 40, by2 = p9.y - p9.size / 2 - 16 - CO2.h - 6
    gCallout2.attr('transform', `translate(${bx2},${by2})`)
      .transition().duration(T).attr('opacity', showP9 ? 1 : 0)
    gArcs.selectAll('circle').transition().duration(T).attr('opacity', d => d.p9 ? (showP9 ? 1 : 0) : d.dwarf && dropped ? 0.4 : 1)

    // The count: Pluto's 9 goes when Pluto drops, Neptune's 8 is then the last, and the ninth comes with a question mark.
    const last = showP9 ? 'Planet Nine' : dropped ? 'Neptune' : 'Pluto'
    nums.classed('last', d => d.name === last).attr('data-count', d => d.name !== last ? null : showP9 ? 'ninth' : dropped ? 'eight' : 'nine')
    nums.transition().duration(T).attr('opacity', d => d.p9 ? (showP9 ? 1 : 0) : d.dwarf && dropped ? 0 : 1)
    nums.select('circle').transition().duration(T).attr('r', d => d.name === last ? 20 : 14)

    // Notes under Pluto, below the count: the crowd, then the three checks. The drawing carries
    // the rest (the faded Pluto, the dashed Planet Nine); the card says what it means.
    const notes = []
    const nx = pluto.x, ny = pluto.y + (dropped ? DROP : 0)
    if (step === 'neighbours') notes.push({ x: nx - 40, y: ny + 124, t: 'and thousands of others: Eris, Makemake, Haumea…', cls: '' })
    if (step === 'rules') {
      notes.push({ x: nx, y: ny + 120, t: 'orbits the Sun ✓', cls: 'good' })
      notes.push({ x: nx, y: ny + 138, t: 'round ✓', cls: 'good' })
      notes.push({ x: nx, y: ny + 156, t: 'cleared its orbit ✗', cls: 'bad' })
    }
    gNotes.selectAll('text').data(notes, d => d.t).join(
      enter => enter.append('text').attr('class', d => `lu-note ${d.cls}`).attr('text-anchor', 'middle')
        .attr('x', d => Math.min(W - 8, d.x)).attr('y', d => d.y).text(d => d.t)
        .attr('opacity', 0).call(e => e.transition().duration(T).attr('opacity', 1)),
      update => update.transition().duration(T).attr('x', d => Math.min(W - 8, d.x)).attr('y', d => d.y),
      exit => exit.transition().duration(T / 2).attr('opacity', 0).remove())
  }

  setStep('nine')
  return { setStep }
}
