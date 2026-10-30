// Part 1, page 3: every known body beyond Neptune, and the few the case for
// Planet Nine rests on.
//
// A map seen from above, the Sun in the middle, everything where it was in
// June 2026, in the same flat projection as the distance page (orbits.js
// flatPoint). The 7,000-odd bodies of positions.json are painted once onto a
// canvas (and again only when the map is resized or the level changes from
// "all" to a narrower one), so switching levels never redraws them one by
// one. The level's own objects are violet dots in an SVG layer above;
// pointing at one draws its orbit and gives its distances. A toggle draws the
// orbits of the whole level.

import * as d3 from 'd3'
import { showTip, hideTip } from './tooltip.js'
import { flatPoint, flatOrbit, trueAnomaly } from '../orbits.js'
import { fmtAu } from './distance.js'

const NEPTUNE_AU = 30.1
const nameOf = d => d.name || d.provisional_desig || d.id
const NICE = [5, 10, 20, 50, 100, 200]

/**
 * @param tnos    { x, y } in tenths of an AU (positions.json)
 * @param objects the extreme objects, each with `levels`, the ids of the levels it belongs to
 * @param asOf    the catalogue's date, printed small in the corner ("June 2026")
 */
export function makeCatalogue (root, { tnos, objects, asOf }) {
  root.classList.add('cat-map')
  const canvas = d3.select(root).append('canvas').node()
  const svg = d3.select(root).append('svg').attr('role', 'img')
    .attr('aria-label', 'Map seen from above of every known body beyond Neptune, with the extreme objects marked.')
  const gNep = svg.append('g'), gOrbits = svg.append('g'), gDots = svg.append('g'), gSun = svg.append('g'), gLbl = svg.append('g').style('pointer-events', 'none')
  gSun.append('use').attr('href', '#art-sun')

  const objs = objects.map(o => {
    const [x, y] = flatPoint(o.a_au, o.e, o.varpi_deg, trueAnomaly(o.mean_anom_deg, o.e))
    return { ...o, x, y, now_au: Math.hypot(x, y), pts: flatOrbit(o.a_au, o.e, o.varpi_deg, 360) }
  })
  const R = d3.max(objs, o => o.now_au) * 1.06            // the frame: out to the farthest of them today

  let W = 800, H = 500, level = 'all', hot = null, showOrbits = false, painted = null
  let k = 1, X = x => x, Y = y => y

  function paint () {
    const dpr = window.devicePixelRatio || 1
    const key = `${W}x${H}@${dpr}:${level === 'all'}`
    if (key === painted) return
    painted = key
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = level === 'all' ? 'rgba(228,225,214,.62)' : 'rgba(140,139,131,.32)'
    const r = level === 'all' ? 1.25 : 1.05
    ctx.beginPath()
    for (let i = 0; i < tnos.x.length; i++) {
      const px = X(tnos.x[i] / 10), py = Y(tnos.y[i] / 10)
      ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, 2 * Math.PI)
    }
    ctx.fill()
  }

  function draw () {
    k = (Math.min(W, H) / 2 - 18) / R
    X = x => W / 2 + x * k; Y = y => H / 2 - y * k
    paint()
    const sunR = 9
    gSun.select('use').attr('x', W / 2 - sunR).attr('y', H / 2 - sunR).attr('width', 2 * sunR).attr('height', 2 * sunR)
    gNep.selectAll('circle').data([NEPTUNE_AU]).join('circle').attr('class', 'dist-orbit')
      .attr('cx', W / 2).attr('cy', H / 2).attr('r', d => d * k)

    const inLevel = level === 'all' ? [] : objs.filter(o => o.levels.includes(level))
    const line = o => 'M' + o.pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join('L')
    const orbits = showOrbits ? inLevel : inLevel.filter(o => o.id === hot)
    gOrbits.selectAll('path').data(orbits, o => o.id).join('path')
      .attr('class', o => `cat-orbit${o.id === hot ? ' hot' : ''}`).attr('d', line)

    const dots = gDots.selectAll('g').data(inLevel, o => o.id).join(enter => {
      const g = enter.append('g')
      g.append('circle').attr('class', 'now').attr('r', 3.4)
      g.append('circle').attr('class', 'hit').attr('r', 8)
      return g
    })
    dots.attr('class', o => `obj${o.id === hot ? ' hot' : hot ? ' dim' : ''}`)
      .on('pointerenter', over).on('pointermove', over).on('pointerleave', out)
    dots.select('.now').attr('cx', o => X(o.x)).attr('cy', o => Y(o.y))
    dots.select('.hit').attr('cx', o => X(o.x)).attr('cy', o => Y(o.y))
    dots.filter(o => o.id === hot).raise()

    // a ruler in the lime of distances, and Neptune's orbit named
    const nice = NICE.filter(n => n * k <= 130).pop()
    const y0 = H - 16
    gLbl.selectAll('g.dist-ruler').data([0]).join(e => {
      const g = e.append('g').attr('class', 'dist-ruler')
      g.append('line').attr('class', 'bar'); g.append('line').attr('class', 't1'); g.append('line').attr('class', 't2')
      g.append('text').attr('class', 'dist-lbl au')
      return g
    }).call(g => {
      g.select('.bar').attr('x1', 14).attr('x2', 14 + nice * k).attr('y1', y0).attr('y2', y0)
      g.select('.t1').attr('x1', 14).attr('x2', 14).attr('y1', y0 - 5).attr('y2', y0 + 5)
      g.select('.t2').attr('x1', 14 + nice * k).attr('x2', 14 + nice * k).attr('y1', y0 - 5).attr('y2', y0 + 5)
      g.select('text').attr('x', 14).attr('y', y0 - 10).text(fmtAu(nice))
    })
    gLbl.selectAll('text.asof').data(asOf ? [asOf] : []).join('text').attr('class', 'dist-lbl muted small asof')
      .attr('x', W - 12).attr('y', 20).attr('text-anchor', 'end').text(d => `JPL catalogue, as of ${d}`)
    gLbl.selectAll('text.nep').data([0]).join('text').attr('class', 'dist-lbl muted small nep')
      .attr('x', W / 2).attr('y', H / 2 - NEPTUNE_AU * k - 6).attr('text-anchor', 'middle').text("Neptune's orbit")
  }

  function over (ev, o) {
    if (hot !== o.id) { hot = o.id; draw() }
    showTip(ev, `<b>${nameOf(o)}</b>
      <dl><dt>nearest to the Sun</dt><dd class="au">${fmtAu(o.q_au)}</dd>
      <dt>where it is now</dt><dd class="au">${fmtAu(o.now_au)}</dd>
      <dt>farthest from the Sun</dt><dd class="au">${fmtAu(o.Q_au)}</dd></dl>`)
  }
  function out () { hot = null; hideTip(); draw() }
  window.addEventListener('scroll', () => { if (hot) out() }, { passive: true })

  new ResizeObserver(() => {
    const r = root.getBoundingClientRect()
    if (r.width < 10 || (r.width === W && r.height === H)) return
    W = r.width; H = r.height
    svg.attr('viewBox', `0 0 ${W} ${H}`)
    draw()
  }).observe(root)

  return {
    setLevel (id) { level = id; hot = null; draw() },
    setOrbits (on) { showOrbits = on; draw() },
  }
}
