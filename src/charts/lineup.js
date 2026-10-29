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
const RAD = Math.PI / 180

// Slot order, drawn size and a vertical stagger so the labels never collide.
const SLOTS = [
  { name: 'Mercury', size: 26, dy: 18 }, { name: 'Venus', size: 34, dy: -16 }, { name: 'Earth', size: 36, dy: 12 },
  { name: 'Mars', size: 30, dy: -18 }, { name: 'Jupiter', size: 64, dy: 8 }, { name: 'Saturn', size: 72, dy: -20 },
  { name: 'Uranus', size: 46, dy: 12 }, { name: 'Neptune', size: 44, dy: -14 }, { name: 'Pluto', size: 22, dy: 22, dwarf: true },
]
const X0 = 150, DX = 84, P9X = 910
const DROP = 74            // how far Pluto falls when it stops being a planet

const FACTS = {
  Mercury: 'Known since antiquity.', Venus: 'Known since antiquity.', Earth: 'You are here.',
  Mars: 'Known since antiquity.', Jupiter: 'Known since antiquity.', Saturn: 'Known since antiquity.',
  Uranus: 'Found in 1781, the first planet discovered with a telescope.',
  Neptune: 'Found in 1846, on paper before in the sky: its pull on Uranus gave it away.',
  Pluto: 'Found in 1930. A planet until 24 August 2006; a dwarf planet since.',
}
const EDITION = {
  nine: ['1930 – 2006 edition', 'nine planets'],
  neighbours: ['1992 – 2005', "Pluto's neighbourhood fills up"],
  rules: ['2006', 'the IAU defines the word'],
  eight: ['2006 edition', 'eight planets, one dwarf planet'],
  'nine-again': ['2016 edition', 'eight planets and one proposed'],
}
const COUNT = {
  nine: '9 planets',
  neighbours: '9 planets, and a crowded neighbourhood',
  rules: '9 planets, 3 conditions',
  eight: '8 planets + 1 dwarf planet',
  'nine-again': '8 planets + 1 dwarf planet + 1 proposed',
}

// A small seeded generator so the Kuiper belt speckle is the same on every visit.
function lcg (seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 } }

export function makeLineup (root, { planets, readout }) {
  const au = new Map(planets.map(p => [p.name, p.a]))
  const svg = d3.select(root).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'A chart of the planets in a row from the Sun, with Pluto at the end. As the story advances, Pluto is reclassified and a ninth planet appears with a question mark.')

  svg.append('clipPath').attr('id', 'lu-clip').append('rect').attr('width', W).attr('height', H)
  const g = svg.append('g').attr('clip-path', 'url(#lu-clip)')

  // --- title -----------------------------------------------------------------
  svg.append('text').attr('class', 'lu-title').attr('x', W / 2).attr('y', 36).attr('text-anchor', 'middle')
    .text('Planetary chart of the Solar System')
  const sub = svg.append('text').attr('class', 'lu-sub').attr('x', W / 2).attr('y', 58).attr('text-anchor', 'middle')

  // --- bodies ------------------------------------------------------------------
  const slots = SLOTS.map((s, i) => ({ ...s, x: X0 + i * DX, y: SUN.y + s.dy, art: PLANET_ART[s.name] }))
  const p9 = { name: 'Planet Nine', x: P9X, y: SUN.y - 4, size: 50, art: 'planet-nine', p9: true }
  const dist = b => Math.hypot(b.x - SUN.x, b.y - SUN.y)

  const gArcs = g.append('g')
  const gKbo = g.append('g').attr('opacity', 0)
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
    .attr('stroke', d => d.p9 ? 'var(--series-3)' : colour[d.name])
    .attr('opacity', d => d.p9 ? 0 : 1)

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
  body.append('circle').attr('class', d => `lu-halo${d.p9 ? ' dashed' : ''}`).attr('r', d => d.size * 0.62 + 4)
  body.append('use').attr('href', d => `#art-${d.art}`)
    .attr('x', d => -d.size / 2).attr('y', d => -d.size / 2).attr('width', d => d.size).attr('height', d => d.size)
  body.append('text').attr('class', d => `lu-lbl${d.p9 ? ' p9' : ''}`).attr('text-anchor', 'middle')
    .attr('y', d => d.size * 0.62 + 20).text(d => d.p9 ? 'Planet Nine?' : d.name)
  body.append('text').attr('class', 'lu-lbl sub').attr('text-anchor', 'middle')
    .attr('y', d => d.size * 0.62 + 35).text('')

  // Pluto itself stays its usual self, only faded; the reaction goes in a
  // speech bubble beside it, so the face reads as a comment on the moment.
  const CO = { w: 190, h: 84 }
  gCallout.append('path').attr('class', 'lu-callout-box')
    .attr('d', `M8,0 H${CO.w - 8} a8,8 0 0 1 8,8 V${CO.h - 8} a8,8 0 0 1 -8,8 H30 l-16,16 l4,-16 H8 a8,8 0 0 1 -8,-8 V8 a8,8 0 0 1 8,-8 Z`)
  gCallout.append('use').attr('href', '#art-pluto-sad').attr('x', 8).attr('y', 16).attr('width', 52).attr('height', 52)
  gCallout.append('text').attr('class', 'lu-callout-t').attr('x', 66).attr('y', 30).text('24 Aug 2006')
  gCallout.append('text').attr('class', 'lu-callout-s').attr('x', 66).attr('y', 50).text('Pluto is reclassified')
  gCallout.append('text').attr('class', 'lu-callout-s').attr('x', 66).attr('y', 68).text('as a dwarf planet')

  function hover (ev, d) {
    showTip(ev, d.p9
      ? `<b>Planet Nine (predicted)</b><div>Proposed in 2016 by Konstantin Batygin and Mike Brown. Five to ten times Earth's mass, hundreds of AU out. Never observed.</div>`
      : `<b>${d.name}</b><div>${FACTS[d.name]}</div><div class="note">average distance from the Sun: ${au.get(d.name) < 10 ? au.get(d.name).toFixed(1) : Math.round(au.get(d.name))} AU</div>`)
  }

  // --- the story -----------------------------------------------------------------
  function setStep (step) {
    const dropped = step === 'eight' || step === 'nine-again'
    const crowded = step !== 'nine'
    const showP9 = step === 'nine-again'

    sub.text(`${EDITION[step][0]} · ${EDITION[step][1]}`)
    if (readout) readout.textContent = COUNT[step]

    gKbo.transition().duration(T).attr('opacity', crowded ? (dropped ? 0.55 : 1) : 0)
    body.transition().duration(T)
      .attr('transform', d => `translate(${d.x},${d.y + (d.dwarf && dropped ? DROP : 0)})`)
      .attr('opacity', d => d.p9 ? (showP9 ? 1 : 0) : d.dwarf && dropped ? 0.5 : 1)
    body.select('text.sub').text(d => d.dwarf && dropped ? 'dwarf planet · 2006' : d.p9 ? 'proposed 2016 · not yet observed' : '')
    // Pluto keeps its own face; the bubble beside it carries the reaction,
    // and only while the reclassification is the point of the step.
    const bx = Math.min(W - CO.w - 4, pluto.x + 16), by = pluto.y + DROP - CO.h - 36
    gCallout.attr('transform', `translate(${bx},${by})`)
      .transition().duration(T).attr('opacity', step === 'eight' ? 1 : 0)
    gArcs.selectAll('circle').transition().duration(T).attr('opacity', d => d.p9 ? (showP9 ? 1 : 0) : d.dwarf && dropped ? 0.4 : 1)

    // Notes beside Pluto: the crowd, then the scorecard.
    const notes = []
    const nx = pluto.x, ny = pluto.y + (dropped ? DROP : 0)
    if (step === 'neighbours') notes.push({ x: nx - 40, y: ny + 70, t: 'and thousands of others: Eris, Makemake, Haumea…', cls: '' })
    if (step === 'rules') {
      notes.push({ x: nx, y: ny + 62, t: 'orbits the Sun ✓', cls: 'good' })
      notes.push({ x: nx, y: ny + 80, t: 'round ✓', cls: 'good' })
      notes.push({ x: nx, y: ny + 98, t: 'cleared its orbit ✗', cls: 'bad' })
    }
    if (step === 'eight') notes.push({ x: nx, y: ny + 60, t: 'condition 3 not met', cls: 'bad' })
    if (step === 'nine-again') notes.push({ x: P9X - 2, y: p9.y - 56, t: 'predicted, not observed', cls: 'p9' })
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
