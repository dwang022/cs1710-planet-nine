// Part 1, page 3: every observatory that has reported a position of one of
// the 90 extreme objects, on a world map.
//
// One dot per site (codes within SITE_KM of each other share it), sized by how
// many positions its telescopes reported, with a violet core (the colour of the
// objects) sized by how many of the extreme objects were first found there. Where the sites crowd (Hawaii, the
// American Southwest, Europe, northern Chile) an inset laid over empty ocean
// or empty land enlarges them, joined by a thin line to the area it shows.
// On the world map those sites are thin white rings, all one size: where they
// are, not how many (their dots, at the key's scale, are in the inset). A ring
// and its dot light up together, and clicking a ring opens the site's card.
// Country borders
// are drawn faintly. Rubin, the newest, has a callout with its name in pink (the site's
// colour for what comes next) saying why it stands out: it has
// found every extreme object discovered since it opened (`recent`, counted in
// pages/data.js). Hubble, the one in
// orbit, sits in the top right corner the globe leaves empty, as a button with
// its own dot. Under it, on the map, a pin button finds the site nearest the
// reader (a pulse at the pin's tip until it is used); the reader then appears as
// a map pin joined to that site. The South Pacific, bottom left, holds the size scale.
// Pointing at a dot (or Hubble) opens its card, which stays while the pointer
// is on the dot or the card; a click keeps it open until it is closed (readers
// did not think to click). The card: a photograph where we have one
// (public/telescopes, read from credits.json), what the site measured, and the
// names of the objects discovered there. Readers mixed up
// "positions" and "found here", so the two are "positions measured" (every time
// a telescope measured where one of the objects was) and "objects discovered"
// (the first to see it).
//
// Every number comes from observatories.json (scripts/build_observatories.py),
// which reads the Minor Planet Center's own records. The reader's location is
// used in the browser only, to measure distances; it is never sent anywhere
// (said here, not on the page).

import * as d3 from 'd3'
import { feature, mesh } from 'topojson-client'
import { url } from '../data.js'

const fmt = d3.format(',')
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const SITE_KM = 5                         // telescopes this close share a dot
const RUBIN = 'X05'                       // hot pink everywhere on the site: what comes next
const km = (a, b) => d3.geoDistance([a.lon, a.lat], [b.lon, b.lat]) * 6371

// The map shows only the band of latitudes between BAND's two (north, south):
// no site lies near either pole, so cutting the Arctic and Antarctica away
// makes the map wide rather than tall and lets it fit on one screen.
const W = 960, H = 408
const BAND = [72, -56]
// Each inset: the area it enlarges (bbox, lon/lat) and where it is drawn
// (box, in the map's pixels), placed where no site lies under it: Hawaiʻi in
// the North Pacific above the islands, the Southwest in the South Pacific
// clear of Central America, Europe over Africa (between Brazil's coast and
// India), northern Chile in the South Atlantic. RUBIN_NOTE is the callout
// below Europe, beside the Chilean inset (its width is a minimum: it grows to its words).
const INSETS = [
  { name: 'Hawaiʻi', bbox: [[-156.75, 18.85], [-154.75, 21.05]], box: [8, 14, 88, 98] },
  { name: 'Southwest US', bbox: [[-118, 30.9], [-104.8, 36.1]], box: [8, 182, 226, 134] },
  { name: 'Europe', bbox: [[-19, 27.4], [21.5, 52.6]], box: [490, 140, 166, 196] },
  { name: 'Northern Chile', bbox: [[-71.4, -30.7], [-70.2, -28.8]], box: [388, 270, 94, 132] },
]
const RUBIN_NOTE = [490, 346, 166, 58]        // one column with Europe's inset above it: the same left edge and width
const within = (s, p) => s.lon >= p.bbox[0][0] && s.lon <= p.bbox[1][0] && s.lat >= p.bbox[0][1] && s.lat <= p.bbox[1][1]
const RING = 2, RING_HIT = 6                  // an inset's site on the world map: the ring, and the reach of a click on it

// Hubble: a silver tube shaded round, its darker aft shroud, the aperture door
// open at the front, two antenna masts, and the two solar wings in their own
// blue (the one blue besides Earth's, Neptune's and the ocean skin: Hubble's own).
const HUBBLE_DEFS = `
  <linearGradient id="hb-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f5f6"/><stop offset=".45" stop-color="#c6cace"/><stop offset="1" stop-color="#7a7f85"/></linearGradient>
  <linearGradient id="hb-aft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9cdd2"/><stop offset=".5" stop-color="#8e949a"/><stop offset="1" stop-color="#52575d"/></linearGradient>
  <linearGradient id="hb-panel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#245f80"/><stop offset=".5" stop-color="#4aa9c9"/><stop offset="1" stop-color="#235b7a"/></linearGradient>`
const HUBBLE = `<g class="hubble-art" transform="rotate(-16)">
  <line x1="3" y1="-11" x2="3" y2="11" stroke="#8c8b83" stroke-width="1.4"/>
  <rect x="-3" y="-41" width="12" height="30" rx="1" fill="url(#hb-panel)" stroke="#173f56"/>
  <rect x="-3" y="11" width="12" height="30" rx="1" fill="url(#hb-panel)" stroke="#173f56"/>
  <path d="M-3,-33.5H9M-3,-26H9M-3,-18.5H9M3,-41V-11M-3,18.5H9M-3,26H9M-3,33.5H9M3,11V41" stroke="#173f56" stroke-width=".6" opacity=".75"/>
  <rect x="-30" y="-9" width="38" height="18" rx="3" fill="url(#hb-body)" stroke="#5d6166"/>
  <path d="M-22,-9V9M-14,-9V9M-6,-9V9" stroke="#8a8e93" stroke-width=".6" opacity=".7"/>
  <rect x="8" y="-10" width="18" height="20" rx="2.5" fill="url(#hb-aft)" stroke="#4a4e53"/>
  <ellipse cx="-30" cy="0" rx="2.4" ry="8.4" fill="#22252a"/>
  <path d="M-30,-9 L-41,-20 L-37.5,-23.5 L-27.5,-10.5 Z" fill="#d6d9dc" stroke="#6e7378"/>
  <line x1="-9" y1="-9" x2="-17" y2="-21" stroke="#a4a8ad" stroke-width=".9"/><circle cx="-18" cy="-22.6" r="2.6" fill="#e2e4e7" stroke="#6e7378" stroke-width=".7"/>
  <line x1="-9" y1="9" x2="-17" y2="21" stroke="#a4a8ad" stroke-width=".9"/><circle cx="-18" cy="22.6" r="2.6" fill="#e2e4e7" stroke="#6e7378" stroke-width=".7"/>
</g>`

// The reader, as a map pin whose tip is on their place.
const pin = (x, y) => `M${x},${y} C${x - 2},${y - 6} ${x - 8},${y - 10} ${x - 8},${y - 16} A8,8 0 1 1 ${x + 8},${y - 16} C${x + 8},${y - 10} ${x + 2},${y - 6} ${x},${y} Z`

/** Group observatory codes into sites. */
function sites (obs, photos) {
  const placed = obs.observatories.filter(r => r.lat != null).sort((a, b) => b.n_obs - a.n_obs)
  const out = []
  for (const r of placed) {
    const s = out.find(s => km(s, r) < SITE_KM)
    if (s) s.scopes.push(r)
    else out.push({ lon: r.lon, lat: r.lat, scopes: [r] })
  }
  return out.map(s => describe(s, photos)).sort((a, b) => b.n_obs - a.n_obs)
}

// A site's name and place come from its photograph if it has one, else from the MPC's name ("name, place").
// The photograph is its busiest telescope's (the scopes come sorted by positions), so a shared summit
// shows the telescopes that did the work.
function describe (s, photos) {
  const codes = s.scopes.map(r => r.code)
  const photo = codes.map(c => photos.find(p => p.codes.includes(c))).find(Boolean)
  const [mpcName, mpcPlace] = s.scopes[0].name.split(/,\s*(?=[^,]+$)/)
  return {
    ...s, photo,
    name: photo?.name || mpcName, place: photo?.place || mpcPlace || '',
    n_obs: d3.sum(s.scopes, r => r.n_obs),
    objects: new Set(s.scopes.flatMap(r => r.objects)),
    found: new Set(s.scopes.flatMap(r => r.discovered)),
    first: d3.min(s.scopes, r => r.first_year), last: d3.max(s.scopes, r => r.last_year),
    next: codes.includes(RUBIN),
  }
}

// Nudge apart dots that would overlap (sites a few kilometres apart in the
// Southwest), keeping each as close to its place as it can: a pixel or two at
// this scale, so every site can be picked. A `fixed` dot holds its place and
// only pushes the others (an inset's ring on the world map).
// Within `bounds` ([x0, y0, x1, y1], an inset's ground below its name) every
// dot is kept whole. Returns site → [x, y].
function separate (pts, gap = 1.5, bounds = null) {
  const p = pts.map(d => ({ ...d, x: d.xy[0], y: d.xy[1] }))
  const keep = d => {
    if (!bounds || d.fixed) return
    d.x = Math.min(Math.max(d.x, bounds[0] + d.r), bounds[2] - d.r)
    d.y = Math.min(Math.max(d.y, bounds[1] + d.r), bounds[3] - d.r)
  }
  p.forEach(keep)
  for (let k = 0; k < 60; k++) {
    let moved = false
    p.forEach(keep)
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const a = p[i], b = p[j]
        if (a.fixed && b.fixed) continue
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy)
        const need = a.r + b.r + gap
        if (d >= need) continue
        if (d < 1e-6) { dx = 1; dy = 0; d = 1 }
        const ka = a.fixed ? 0 : b.fixed ? 1 : 0.5, kb = 1 - ka
        a.x -= dx / d * (need - d) * ka; a.y -= dy / d * (need - d) * ka
        b.x += dx / d * (need - d) * kb; b.y += dy / d * (need - d) * kb
        moved = true
      }
    }
    if (!moved) break
  }
  p.forEach(keep)
  return new Map(p.map(d => [d.s, [d.x, d.y]]))
}

// The objects' names in a card: named ones first (Sedna), then by designation, which runs by year.
const byName = (a, b) => (/^\d/.test(a) - /^\d/.test(b)) || a.localeCompare(b, 'en', { numeric: true })

/** names: object id → the name to show (pages/data.js, from etnos.json). */
export function makeScopeMap (root, obs, photos = [], { recent = null, names = new Map() } = {}) {
  const all = sites(obs, photos)
  const hubbleRow = obs.observatories.find(r => r.code === '250')
  const hubble = hubbleRow && describe({ lon: null, lat: null, scopes: [hubbleRow] }, photos)
  // One size scale on the world map, in the insets and in the key: an inset enlarges the ground, not the dots.
  // At 16 px the busiest site still fits its inset (Hawaiʻi), and no core below needs its cap.
  const r = d3.scaleSqrt().domain([0, d3.max(all, s => s.n_obs)]).range([0, 16])
  const radius = s => Math.max(2.6, r(s.n_obs))
  // the core: objects first found there, never wider than most of its dot
  const rc = d3.scaleSqrt().domain([0, d3.max(all, s => s.found.size) || 1]).range([0, 7])
  const core = s => (s.found.size ? Math.min(radius(s) * 0.78, Math.max(1.5, rc(s.found.size))) : 0)

  root.classList.add('scope-stage')
  const svg = d3.select(root).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'World map of every observatory that has measured one of the 90 extreme objects, with insets for Hawaii, the American Southwest, Europe and northern Chile. Select a dot for its details.')
  const card = d3.select(root).append('div').attr('class', 'scope-card').attr('hidden', true).node()
  const proj = d3.geoEqualEarth()
  const path = d3.geoPath(proj)
  const gLand = svg.append('g'), gLink = svg.append('g')
  const gRings = svg.append('g').attr('aria-hidden', 'true'), gRingHits = svg.append('g').attr('aria-hidden', 'true')
  const gDots = svg.append('g'), gCores = svg.append('g').attr('class', 'site-cores'), gYou = svg.append('g')
  const gInsets = svg.append('g'), gKey = svg.append('g').attr('class', 'scope-key')
  svg.append('defs').html(HUBBLE_DEFS)
  const insets = INSETS.map(p => ({ ...p, proj: d3.geoMercator() }))

  let you = null, open = null
  let pinned = false, closing = null           // a click keeps the card; pointing only shows it

  // the size scale in the South Pacific, bottom left; Hubble in the top right corner, over the open sea
  // Each scale is a row of circles standing on one line, its values under them and its name under those.
  function drawKey () {
    const base = H - 38, slot = 34
    const g = gKey.append('g')
    const scale = (x0, name, values, cls, size) => {
      values.forEach((v, i) => {
        const rr = size(v), cx = x0 + slot * i + slot / 2
        g.append('circle').attr('class', cls).attr('cx', cx).attr('cy', base - rr).attr('r', rr)
        g.append('text').attr('class', 'key-lbl').attr('x', cx).attr('y', base + 13).attr('text-anchor', 'middle').text(fmt(v))
      })
      g.append('text').attr('class', 'key-lbl muted').attr('x', x0 + slot * values.length / 2).attr('y', base + 27).attr('text-anchor', 'middle').text(name)
      return x0 + slot * values.length
    }
    const x = scale(14, 'positions measured', [10, 100, 1000].filter(v => v <= r.domain()[1]), 'site key', v => Math.max(2.6, r(v)))
    // objects discovered there: violet discs at their own scale
    scale(x + 18, 'objects discovered', [1, 5, 20].filter(v => v <= rc.domain()[1]), 'site-core', v => Math.max(1.5, rc(v)))
    drawFind()
    if (!hubble) return
    // two rows, the dot and the drawing over the name, so it fits the corner the globe leaves empty
    const h = gKey.append('g').attr('class', 'hubble').attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', `Hubble Space Telescope, in orbit: ${hubble.n_obs} positions measured`).attr('transform', `translate(${W - 106},6)`)
    h.append('rect').attr('class', 'hubble-pill').attr('width', 100).attr('height', 90).attr('rx', 16)
    h.append('circle').attr('class', 'site').attr('cx', 22).attr('cy', 30).attr('r', radius(hubble))
    h.append('g').attr('transform', 'translate(66,30) scale(.56)').html(HUBBLE)
    h.append('text').attr('class', 'key-lbl strong').attr('x', 12).attr('y', 66).text('Hubble')
    h.append('text').attr('class', 'key-lbl muted').attr('x', 12).attr('y', 80).text('in orbit')
    h.append('text').attr('class', 'key-lbl more').attr('x', 84).attr('y', 77).attr('text-anchor', 'middle').text('›')
    hoverable(h, () => hubble)
  }

  // The reader's way onto the map: a pill under Hubble, the same width and lined up with it, holding a
  // map pin (a pulse at its tip until it is used) and a word or two; the pin and the words are centred
  // in it whatever they say. Pressed, it finds the site nearest the reader.
  const FIND = { x: W - 106, y: 104, w: 100, h: 34 }
  function drawFind () {
    const f = gKey.append('g').attr('class', 'find-me').attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', 'Show the telescope nearest you').attr('transform', `translate(${FIND.x},${FIND.y})`)
    f.append('rect').attr('class', 'find-pill').attr('width', FIND.w).attr('height', FIND.h).attr('rx', FIND.h / 2)
    const icon = f.append('g')
    icon.append('circle').attr('class', 'find-pulse').attr('cy', 8).attr('r', 3)
    icon.append('path').attr('class', 'find-pin').attr('d', pin(0, 0)).attr('transform', 'translate(0,8) scale(.7)')
    icon.append('circle').attr('class', 'find-pin-eye').attr('cy', 8 - 16 * 0.7).attr('r', 2.3)
    const lbl = f.append('text').attr('class', 'find-lbl').attr('y', FIND.h / 2 + 4.5)
    const say = t => {
      lbl.text(t)
      const tw = lbl.node().getComputedTextLength?.() || t.length * 6.5, iw = 12, gap = 7
      const x0 = (FIND.w - (iw + gap + tw)) / 2
      icon.attr('transform', `translate(${(x0 + iw / 2).toFixed(1)},${(FIND.h / 2 - 1).toFixed(1)})`)
      lbl.attr('x', (x0 + iw + gap).toFixed(1))
    }
    say('Near me')
    const go = () => {
      f.classed('used', true)
      if (!navigator.geolocation) { say('Unavailable'); return }
      say('Locating…')
      navigator.geolocation.getCurrentPosition(p => {
        say('Near me')
        locate(p.coords.latitude, p.coords.longitude)
      }, () => say('No location'), { timeout: 15000, maximumAge: 600000 })
    }
    f.on('click', go).on('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go() } })
  }

  // Pointing opens the card; leaving the dot (and not moving onto the card) lets it go; a click keeps it.
  function hoverable (sel, site, at = el => el) {
    sel.on('mouseenter.card', (ev, d) => { clearTimeout(closing); const s = site(d); if (open !== s) { pinned = false; show(s, at(ev.currentTarget, s)) } })
      .on('mouseleave.card', () => { if (!pinned) { clearTimeout(closing); closing = setTimeout(close, 260) } })
      .on('click.card', (ev, d) => { clearTimeout(closing); const s = site(d); if (open !== s) show(s, at(ev.currentTarget, s)); pinned = true })
      .on('keydown.card', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); show(site(d), at(ev.currentTarget, site(d))); pinned = true } })
  }
  card.addEventListener('mouseenter', () => clearTimeout(closing))
  card.addEventListener('mouseleave', () => { if (!pinned) closing = setTimeout(close, 260) })
  // a click on the open sea or land puts a kept card away
  svg.on('click.away', ev => { if (open && !ev.target.closest('.site, .ring-hit, .hubble, .find-me')) close() })

  // The 1:50m outlines keep Maui and La Palma, which carry telescopes; they load only on this page.
  import('world-atlas/countries-50m.json').then(({ default: topo }) => {
    const land = feature(topo, topo.objects.land)
    const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b)
    // the band fills the frame; the globe's curved sides stay, its top and bottom are cut flat
    proj.fitExtent([[6, 6], [W - 6, H - 6]], { type: 'MultiPoint', coordinates: [[-180, 0], [180, 0], [0, BAND[0]], [0, BAND[1]]] })
    svg.select('defs').append('clipPath').attr('id', 'map-band').append('rect').attr('x', 0).attr('y', 6).attr('width', W).attr('height', H - 12)
    gLand.attr('clip-path', 'url(#map-band)')
    gLand.append('path').attr('class', 'map-sphere').attr('d', path({ type: 'Sphere' }))
    gLand.append('path').attr('class', 'map-grat').attr('d', path(d3.geoGraticule10()))
    gLand.append('path').attr('class', 'map-land').attr('d', path(land))
    gLand.append('path').attr('class', 'map-border').attr('d', path(borders))
    for (const [i, p] of insets.entries()) {
      const [x, y, w, h] = p.box
      p.proj.fitExtent([[x + 8, y + 22], [x + w - 8, y + h - 8]], { type: 'Feature', geometry: { type: 'MultiPoint', coordinates: p.bbox } })
      // the area on the world map, outlined round its rings, and a line from it to its inset
      const xs = [], ys = []
      for (const c of p.bbox) { const [x, y] = proj(c); xs.push(x - RING, x + RING); ys.push(y - RING, y + RING) }
      const area = [d3.min(xs) - 3, d3.min(ys) - 3, d3.max(xs) - d3.min(xs) + 6, d3.max(ys) - d3.min(ys) + 6]
      const [cx, cy] = [area[0] + area[2] / 2, area[1] + area[3] / 2]
      // the line meets the box on the edge facing the area, clear of its rounded corners
      const cl = (v, a, b) => Math.min(Math.max(v, a), b), rx = 10
      const near = cy < y ? [cl(cx, x + rx, x + w - rx), y] : cy > y + h ? [cl(cx, x + rx, x + w - rx), y + h]
        : [cx < x ? x : x + w, cl(cy, y + rx, y + h - rx)]
      const from = [Math.min(Math.max(near[0], area[0]), area[0] + area[2]), Math.min(Math.max(near[1], area[1]), area[1] + area[3])]
      gLand.append('line').attr('class', 'inset-lead').attr('x1', from[0]).attr('y1', from[1]).attr('x2', near[0]).attr('y2', near[1])
      gLand.append('rect').attr('class', 'inset-area').attr('x', area[0]).attr('y', area[1]).attr('width', area[2]).attr('height', area[3]).attr('rx', 2)
      const g = gInsets.append('g').attr('class', 'inset')
      g.append('clipPath').attr('id', `inset-clip-${i}`).append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', 8)
      g.append('rect').attr('class', 'inset-box').attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', 8)
      g.append('path').attr('class', 'map-land').attr('clip-path', `url(#inset-clip-${i})`).attr('d', d3.geoPath(p.proj)(land))
      g.append('path').attr('class', 'map-border').attr('clip-path', `url(#inset-clip-${i})`).attr('d', d3.geoPath(p.proj)(borders))
      g.append('text').attr('class', 'inset-name').attr('x', x + 9).attr('y', y + 16).text(p.name)
      p.g = g.append('g')
      p.core = g.append('g').attr('class', 'site-cores')
      p.lbl = g.append('g')
    }
    drawKey()
    drawDots()
  })

  function drawDots () {
    const order = all.slice().sort((a, b) => b.n_obs - a.n_obs)     // small dots on top, so every one can be picked
    const cls = s => `site${s.next ? ' next' : ''}${s === open ? ' open' : ''}`
    const wire = sel => sel.attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', s => `${s.name}: ${fmt(s.n_obs)} positions measured, ${s.found.size} objects discovered`)
      .on('mouseenter', (ev, s) => light(s, true)).on('mouseleave', (ev, s) => light(s, false))
      .call(hoverable, s => s)
    // An inset's sites are rings on the world map, at their places, all one size (their dots would pile
    // up there; the inset pulls them apart). Pointing at a ring opens the card at the site's dot in the
    // inset; keys reach the site there, so the rings take no tab stop. The rings hold their places and
    // the other sites are nudged clear of them and of each other (two in Pennsylvania, 100 km apart, would touch).
    const crowd = order.filter(s => insets.some(p => within(s, p)))
    const world = order.filter(s => !insets.some(p => within(s, p)))
    const atW = separate([
      ...crowd.map(s => ({ s, xy: proj([s.lon, s.lat]), r: RING, fixed: true })),
      ...world.map(s => ({ s, xy: proj([s.lon, s.lat]), r: radius(s) })),
    ])
    gRings.selectAll('circle').data(crowd, s => s.name + s.lon).join('circle').attr('class', s => `ring${s === open ? ' open' : ''}`)
      .attr('cx', s => atW.get(s)[0]).attr('cy', s => atW.get(s)[1]).attr('r', RING)
    gRingHits.selectAll('circle').data(crowd, s => s.name + s.lon).join('circle').attr('class', 'ring-hit')
      .attr('cx', s => atW.get(s)[0]).attr('cy', s => atW.get(s)[1]).attr('r', RING_HIT)
      .on('mouseenter', (ev, s) => light(s, true)).on('mouseleave', (ev, s) => light(s, false))
      .call(hoverable, s => s, (el, s) => twin(s) || el)
    gDots.selectAll('circle').data(world, s => s.name + s.lon).join('circle').attr('class', cls)
      .attr('cx', s => atW.get(s)[0]).attr('cy', s => atW.get(s)[1]).attr('r', s => radius(s))
      .call(wire)
    gCores.selectAll('circle').data(world.filter(s => s.found.size), s => s.name + s.lon).join('circle').attr('class', 'site-core')
      .attr('cx', s => atW.get(s)[0]).attr('cy', s => atW.get(s)[1]).attr('r', s => core(s))
    for (const p of insets) {
      if (!p.g) continue
      const here = order.filter(s => within(s, p))
      const [bx, by, bw, bh] = p.box
      const at = separate(here.map(s => ({ s, xy: p.proj([s.lon, s.lat]), r: radius(s) })), 1.5, [bx + 6, by + 22, bx + bw - 6, by + bh - 6])
      p.g.selectAll('circle').data(here, s => s.name + s.lon).join('circle').attr('class', cls)
        .attr('cx', s => at.get(s)[0]).attr('cy', s => at.get(s)[1]).attr('r', s => radius(s))
        .call(wire)
      p.core.selectAll('circle').data(here.filter(s => s.found.size), s => s.name + s.lon).join('circle').attr('class', 'site-core')
        .attr('cx', s => at.get(s)[0]).attr('cy', s => at.get(s)[1]).attr('r', s => core(s))
      // Rubin, called out to the east of its inset with why: what it alone has found
      // since it opened, and how many of those wait to be seen again (its site also
      // holds Gemini South)
      const rubin = here.filter(s => s.next).map(s => ({ site: s, row: s.scopes.find(t => t.code === RUBIN) }))
      const note = p.lbl.selectAll('g.rubin-note').data(rubin).join(e => {
        const g = e.append('g').attr('class', 'rubin-note')
        g.append('path').attr('class', 'rubin-lead')
        g.append('rect').attr('class', 'rubin-box')
        g.append('text').attr('class', 'rubin-lbl')
        g.append('text').attr('class', 'rubin-sub'); g.append('text').attr('class', 'rubin-sub')
        return g
      })
      const [nx, ny, nw, nh] = RUBIN_NOTE
      // from the edge of Rubin's dot, where it is drawn
      note.select('path').attr('d', d => { const [dx, dy] = at.get(d.site); return `M${dx + radius(d.site) + 1},${dy} L${nx},${ny + nh / 2}` })
      note.select('rect').attr('x', nx).attr('y', ny).attr('width', nw).attr('height', nh).attr('rx', 8)
      note.select('.rubin-lbl').attr('x', nx + 10).attr('y', ny + 18).text('Rubin Observatory')
      // why it is singled out: where the new extreme objects are being found (recent, from pages/data.js),
      // on two lines so the note fits between Africa's tip and the frame's foot
      const why = !recent ? ['', '']
        : [recent.rubin === recent.all ? `found all ${recent.all} extreme objects` : `found ${recent.rubin} of the ${recent.all} extreme objects`,
          `discovered since ${recent.since}`]
      note.selectAll('.rubin-sub').attr('x', nx + 10).attr('y', (_, i) => ny + 34 + i * 14).text((_, i) => why[i])
      // the bubble fits its words
      note.each(function () {
        const g = d3.select(this)
        const tw = d3.max(g.selectAll('text').nodes(), t => t.getComputedTextLength())
        g.select('rect').attr('width', Math.max(nw, Math.ceil(tw) + 20))
      })
    }
    // the reader, as a map pin, and a great-circle line to the nearest site
    const youG = gYou.selectAll('g').data(you ? [you] : []).join(e => {
      const g = e.append('g').attr('class', 'you')
      g.append('path'); g.append('circle').attr('r', 3); g.append('text').attr('class', 'you-lbl').text('you')
      return g
    })
    youG.each(function (d) {
      const [x, y] = proj([d.lon, d.lat]), g = d3.select(this)
      g.select('path').attr('d', pin(x, y))
      g.select('circle').attr('cx', x).attr('cy', y - 16)
      g.select('text').attr('x', x + 11).attr('y', y - 12)
    })
    gLink.selectAll('path').data(you && open?.near ? [0] : []).join('path').attr('class', 'near-link')
      .attr('d', () => path({ type: 'LineString', coordinates: [[you.lon, you.lat], [open.lon, open.lat]] }))
  }

  // A site's dot in its inset, and a site's ring and dot lit together while either is pointed at.
  const twin = s => svg.selectAll('g.inset circle.site').filter(d => d === s).node()
  const light = (s, on) => svg.selectAll('circle.site, circle.ring').filter(d => d === s).classed('lit', on)

  // --- the card -------------------------------------------------------------------
  function show (s, anchor, km = null) {
    open = s
    s.near = km != null
    const years = s.first === s.last ? `${s.first}` : `${s.first}–${s.last}`
    // (the card once listed a shared summit's telescopes one by one; readers did not need them)
    // the objects discovered here, by name, in the objects' violet
    const found = [...s.found].map(id => names.get(id) || id).sort(byName)
    const foundList = found.length
      ? `<div class="sc-found"><span class="sc-found-k">Discovered here</span><ul>${found.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''
    card.innerHTML = `
      <button type="button" class="sc-close" aria-label="Close">×</button>
      ${s.photo ? `<img src="${url(`telescopes/${s.photo.file}`)}" alt="" width="720" height="480">`
        : '<div class="sc-art" aria-hidden="true"><svg viewBox="0 0 160 120"><use href="#art-observatory" width="160" height="120"/></svg></div>'}
      <div class="sc-body">
        ${km != null ? `<span class="sc-near">Nearest to you, about ${fmt(Math.round(km / 10) * 10)} km away</span>` : ''}
        <b class="sc-name">${esc(s.name)}</b>
        <span class="sc-place">${s.place ? `${esc(s.place)} · ` : ''}${years}</span>
        <dl class="sc-stats">
          <div><dt>positions measured</dt><dd>${fmt(s.n_obs)}</dd></div>
          <div><dt>objects followed</dt><dd>${s.objects.size}</dd></div>
          <div><dt>objects discovered</dt><dd>${s.found.size}</dd></div>
        </dl>
        ${foundList}
        ${s.photo ? `<span class="sc-credit">Photo ${[s.photo.credit, s.photo.license].filter(Boolean).map(esc).join(' · ')}</span>` : ''}
      </div>`
    card.hidden = false
    card.querySelector('.sc-close').addEventListener('click', close)
    drawDots()
    const img = card.querySelector('img')
    place(anchor)
    if (img && !img.complete) img.addEventListener('load', () => place(anchor), { once: true })
  }
  function close () { clearTimeout(closing); pinned = false; card.hidden = true; if (open) open.near = false; open = null; drawDots() }
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && open) close() })

  // Beside the dot where there is room; on a narrow map, docked along the bottom.
  function place (anchor) {
    const box = root.getBoundingClientRect(), a = anchor.getBoundingClientRect()
    const docked = box.width < 640
    card.classList.toggle('docked', docked)
    if (docked) { card.style.left = card.style.top = ''; return }
    const x = a.left + a.width / 2 - box.left, y = a.top + a.height / 2 - box.top
    const cw = card.offsetWidth, ch = card.offsetHeight
    card.style.left = `${x + 18 + cw < box.width ? x + 18 : Math.max(8, x - 18 - cw)}px`
    card.style.top = `${Math.min(Math.max(8, y - ch / 2), Math.max(8, box.height - ch - 8))}px`
  }

  /** Put the reader on the map and open the nearest site's card. */
  function locate (lat, lon) {
    you = { lat, lon }
    const nearest = d3.least(all, s => km(you, s))
    open = nearest
    drawDots()
    const dot = svg.selectAll('circle.site').filter(s => s === nearest).node() || root
    show(nearest, dot, km(you, nearest))
    pinned = true
  }

  return { locate }
}
