// Part 1, page 3: every observatory that has reported a position of one of
// the 90 extreme objects, on a world map.
//
// One dot per site (codes within SITE_KM of each other share it), sized by how
// many positions its telescopes reported. Where the sites crowd (Hawaii, the
// American Southwest, Europe, northern Chile) an inset laid over empty ocean
// or empty land enlarges them, joined by a thin line to the area it shows,
// which the world map outlines instead of drawing its dots. Country borders
// are drawn faintly. Rubin, the newest, is rose (the site's colour for what
// comes next) with a callout saying why it stands out. Hubble, the one in
// orbit, sits at the top, above the globe, as a button with its own dot. The
// bottom-left corner holds the size scale. The reader is a map pin.
// Clicking a dot (or Hubble) opens a card that stays until it is closed: a
// photograph where we have one (public/telescopes, read from credits.json),
// what the site measured, and its telescopes. locate() puts the reader on the
// map and opens the nearest site's card.
//
// Every number comes from observatories.json (scripts/build_observatories.py),
// which reads the Minor Planet Center's own records. The reader's location is
// used in the browser only, to measure distances; it is never sent anywhere.

import * as d3 from 'd3'
import { feature, mesh } from 'topojson-client'
import { url } from '../data.js'

const fmt = d3.format(',')
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const SITE_KM = 5                         // telescopes this close share a dot
const RUBIN = 'X05'                       // rose everywhere on the site: what comes next
const km = (a, b) => d3.geoDistance([a.lon, a.lat], [b.lon, b.lat]) * 6371

const W = 960, H = 470
// Each inset: the area it enlarges (bbox, lon/lat) and where it is drawn
// (box, in the map's pixels), placed where no site and little land lies under
// it: Hawaiʻi in the North Pacific above the islands, the Southwest in the
// South Pacific, Africa to the Indian Ocean, the South Atlantic. RUBIN_NOTE is
// the callout beside the Chilean inset.
const INSETS = [
  { name: 'Hawaiʻi', bbox: [[-156.75, 18.85], [-154.75, 21.05]], box: [16, 22, 108, 94] },
  { name: 'Southwest US', bbox: [[-118, 30.9], [-104.8, 36.1]], box: [10, 212, 252, 156] },
  { name: 'Europe', bbox: [[-19, 27.4], [21.5, 52.6]], box: [556, 206, 226, 172] },
  { name: 'Northern Chile', bbox: [[-71.4, -30.7], [-70.2, -28.8]], box: [388, 290, 100, 146] },
]
const RUBIN_NOTE = [496, 392, 178, 44]
const within = (s, p) => s.lon >= p.bbox[0][0] && s.lon <= p.bbox[1][0] && s.lat >= p.bbox[0][1] && s.lat <= p.bbox[1][1]

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
function describe (s, photos) {
  const codes = s.scopes.map(r => r.code)
  const photo = photos.find(p => p.codes.some(c => codes.includes(c)))
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
// this scale, so every site can be picked. Returns site → [x, y].
function separate (pts, gap = 1.5) {
  const p = pts.map(d => ({ ...d, x: d.xy[0], y: d.xy[1] }))
  for (let k = 0; k < 60; k++) {
    let moved = false
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const a = p[i], b = p[j]
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy)
        const need = a.r + b.r + gap
        if (d >= need) continue
        if (d < 1e-6) { dx = 1; dy = 0; d = 1 }
        const push = (need - d) / 2
        a.x -= dx / d * push; a.y -= dy / d * push
        b.x += dx / d * push; b.y += dy / d * push
        moved = true
      }
    }
    if (!moved) break
  }
  return new Map(p.map(d => [d.s, [d.x, d.y]]))
}

export function makeScopeMap (root, obs, photos = []) {
  const all = sites(obs, photos)
  const hubbleRow = obs.observatories.find(r => r.code === '250')
  const hubble = hubbleRow && describe({ lon: null, lat: null, scopes: [hubbleRow] }, photos)
  const r = d3.scaleSqrt().domain([0, d3.max(all, s => s.n_obs)]).range([0, 22])
  const radius = (s, k = 1) => Math.max(2.6, r(s.n_obs) * k)

  root.classList.add('scope-stage')
  const svg = d3.select(root).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
    .attr('aria-label', 'World map of every observatory that has measured one of the 90 extreme objects, with insets for Hawaii, the American Southwest, Europe and northern Chile. Select a dot for its details.')
  const card = d3.select(root).append('div').attr('class', 'scope-card').attr('hidden', true).node()
  const proj = d3.geoEqualEarth()
  const path = d3.geoPath(proj)
  const gLand = svg.append('g'), gLink = svg.append('g'), gDots = svg.append('g'), gYou = svg.append('g')
  const gInsets = svg.append('g'), gKey = svg.append('g').attr('class', 'scope-key')
  svg.append('defs').html(HUBBLE_DEFS)
  const insets = INSETS.map(p => ({ ...p, proj: d3.geoMercator() }))

  let you = null, open = null

  // the size scale in the empty corner bottom left; Hubble above the globe, top right
  function drawKey () {
    const steps = [10, 100, 1000].filter(v => v <= r.domain()[1])
    const base = H - 24
    const g = gKey.append('g')
    g.append('text').attr('class', 'key-lbl muted').attr('x', 22).attr('y', base - 58).text('positions reported')
    let x = 22
    for (const v of steps) {
      const rr = Math.max(2.6, r(v))
      g.append('circle').attr('class', 'site key').attr('cx', x + rr).attr('cy', base - rr).attr('r', rr)
      g.append('text').attr('class', 'key-lbl').attr('x', x + rr).attr('y', base + 16).attr('text-anchor', 'middle').text(fmt(v))
      x += 2 * rr + 20
    }
    if (!hubble) return
    const h = gKey.append('g').attr('class', 'hubble').attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', `Hubble Space Telescope, in orbit: ${hubble.n_obs} positions`).attr('transform', `translate(${W - 226},8)`)
    h.append('rect').attr('class', 'hubble-pill').attr('width', 218).attr('height', 56).attr('rx', 28)
    h.append('circle').attr('class', 'site').attr('cx', 24).attr('cy', 28).attr('r', radius(hubble))
    h.append('g').attr('transform', 'translate(76,28) scale(.68)').html(HUBBLE)
    h.append('text').attr('class', 'key-lbl strong').attr('x', 114).attr('y', 25).text('Hubble')
    h.append('text').attr('class', 'key-lbl muted').attr('x', 114).attr('y', 40).text('in orbit')
    h.append('text').attr('class', 'key-lbl more').attr('x', 196).attr('y', 34).attr('text-anchor', 'middle').text('›')
    h.on('click', ev => show(hubble, ev.currentTarget))
      .on('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); show(hubble, ev.currentTarget) } })
  }

  // The 1:50m outlines keep Maui and La Palma, which carry telescopes; they load only on this page.
  import('world-atlas/countries-50m.json').then(({ default: topo }) => {
    const land = feature(topo, topo.objects.land)
    const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b)
    proj.fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' })
    gLand.append('path').attr('class', 'map-sphere').attr('d', path({ type: 'Sphere' }))
    gLand.append('path').attr('class', 'map-grat').attr('d', path(d3.geoGraticule10()))
    gLand.append('path').attr('class', 'map-land').attr('d', path(land))
    gLand.append('path').attr('class', 'map-border').attr('d', path(borders))
    for (const [i, p] of insets.entries()) {
      const [x, y, w, h] = p.box
      p.proj.fitExtent([[x + 8, y + 22], [x + w - 8, y + h - 8]], { type: 'Feature', geometry: { type: 'MultiPoint', coordinates: p.bbox } })
      // the area on the world map, outlined, and a line from it to its inset
      const [ax0, ay0] = proj([p.bbox[0][0], p.bbox[1][1]]), [ax1, ay1] = proj([p.bbox[1][0], p.bbox[0][1]])
      const area = [Math.min(ax0, ax1) - 3, Math.min(ay0, ay1) - 3, Math.abs(ax1 - ax0) + 6, Math.abs(ay1 - ay0) + 6]
      const [cx, cy] = [area[0] + area[2] / 2, area[1] + area[3] / 2]
      const near = [Math.min(Math.max(cx, x), x + w), Math.min(Math.max(cy, y), y + h)]
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
      p.lbl = g.append('g')
    }
    drawKey()
    drawDots()
  })

  function drawDots () {
    const order = all.slice().sort((a, b) => b.n_obs - a.n_obs)     // small dots on top, so every one can be picked
    const cls = s => `site${s.next ? ' next' : ''}${s === open ? ' open' : ''}`
    const wire = sel => sel.attr('tabindex', 0).attr('role', 'button').attr('aria-label', s => `${s.name}: ${fmt(s.n_obs)} positions`)
      .on('click', (ev, s) => show(s, ev.currentTarget))
      .on('keydown', (ev, s) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); show(s, ev.currentTarget) } })
    gDots.selectAll('circle').data(order.filter(s => !insets.some(p => within(s, p))), s => s.name + s.lon).join('circle').attr('class', cls)
      .attr('cx', s => proj([s.lon, s.lat])[0]).attr('cy', s => proj([s.lon, s.lat])[1]).attr('r', s => radius(s))
      .call(wire)
    for (const p of insets) {
      if (!p.g) continue
      const here = order.filter(s => within(s, p))
      const at = separate(here.map(s => ({ s, xy: p.proj([s.lon, s.lat]), r: radius(s, 0.5) })))
      p.g.selectAll('circle').data(here, s => s.name + s.lon).join('circle').attr('class', cls)
        .attr('cx', s => at.get(s)[0]).attr('cy', s => at.get(s)[1]).attr('r', s => radius(s, 0.5))
        .call(wire)
      // Rubin, called out to the east of its inset with why: it is the newest, and
      // what it alone has found already (its site also holds Gemini South)
      const rubin = here.filter(s => s.next).map(s => ({ site: s, row: s.scopes.find(t => t.code === RUBIN) }))
      const note = p.lbl.selectAll('g.rubin-note').data(rubin).join(e => {
        const g = e.append('g').attr('class', 'rubin-note')
        g.append('path').attr('class', 'rubin-lead')
        g.append('rect').attr('class', 'rubin-box')
        g.append('text').attr('class', 'rubin-lbl'); g.append('text').attr('class', 'rubin-sub')
        return g
      })
      const [nx, ny, nw, nh] = RUBIN_NOTE
      note.select('path').attr('d', d => { const [dx, dy] = p.proj([d.site.lon, d.site.lat]); return `M${dx + 6},${dy} L${nx},${ny + nh / 2}` })
      note.select('rect').attr('x', nx).attr('y', ny).attr('width', nw).attr('height', nh).attr('rx', 8)
      note.select('.rubin-lbl').attr('x', nx + 10).attr('y', ny + 18).text('Rubin Observatory')
      note.select('.rubin-sub').attr('x', nx + 10).attr('y', ny + 34).text(d => `the newest, ${d.row.discovered.length} found since ${d.row.first_year}`)
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

  // --- the card -------------------------------------------------------------------
  function show (s, anchor, km = null) {
    open = s
    s.near = km != null
    const years = s.first === s.last ? `${s.first}` : `${s.first}–${s.last}`
    const scopes = s.scopes.length > 1
      ? `<ul class="sc-scopes">${s.scopes.map(t => `<li><span>${esc(t.name)}</span><b>${fmt(t.n_obs)}</b></li>`).join('')}</ul>` : ''
    card.innerHTML = `
      <button type="button" class="sc-close" aria-label="Close">×</button>
      ${s.photo ? `<img src="${url(`telescopes/${s.photo.file}`)}" alt="" width="720" height="480">`
        : '<div class="sc-art" aria-hidden="true"><svg viewBox="0 0 160 120"><use href="#art-observatory" width="160" height="120"/></svg></div>'}
      <div class="sc-body">
        ${km != null ? `<span class="sc-near">Nearest to you, about ${fmt(Math.round(km / 10) * 10)} km away</span>` : ''}
        <b class="sc-name">${esc(s.name)}</b>
        <span class="sc-place">${s.place ? `${esc(s.place)} · ` : ''}${years}</span>
        <dl class="sc-stats">
          <div><dt>positions</dt><dd>${fmt(s.n_obs)}</dd></div>
          <div><dt>objects</dt><dd>${s.objects.size}</dd></div>
          <div><dt>found here</dt><dd>${s.found.size}</dd></div>
        </dl>
        ${scopes}
        ${s.photo ? `<span class="sc-credit">Photo ${esc(s.photo.credit)} · ${esc(s.photo.license)}</span>` : ''}
      </div>`
    card.hidden = false
    card.querySelector('.sc-close').addEventListener('click', close)
    drawDots()
    const img = card.querySelector('img')
    place(anchor)
    if (img && !img.complete) img.addEventListener('load', () => place(anchor), { once: true })
  }
  function close () { card.hidden = true; if (open) open.near = false; open = null; drawDots() }
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
  }

  return { locate }
}
