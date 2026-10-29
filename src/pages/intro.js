// The intro screen: a telescope looking at Planet Nine, shooting stars, the
// start button, the skin picker, and the skip-ahead links.

import { PAGES, GROUPS, currentSkin, setSkin } from '../site.js'
import { svgMarkup } from '../art.js'
import { SKINS, SKIN_IDS } from '../skins.js'
import { url } from '../data.js'

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

// --- the scene: telescope bottom-left, the planet up its line of sight ------

function scene () {
  const root = document.getElementById('scene')
  // The telescope art points 34 degrees above horizontal from its pivot; the
  // planet sits on that line so the telescope really is looking at it.
  const T = { x: 80, y: 250, w: 240, h: 180 }
  const lens = [T.x + 124.8 * 1.5, T.y + 41.8 * 1.5]
  const ang = 34 * Math.PI / 180, dist = 380
  const p9 = [lens[0] + dist * Math.cos(ang), lens[1] - dist * Math.sin(ang)]
  const size = 170
  const stars = Array.from({ length: 26 }, (_, i) => {
    const s = (i * 9301 + 49297) % 233280 / 233280, t = (i * 7919 + 104729) % 15485863 / 15485863
    return `<circle cx="${(40 + s * 800).toFixed(0)}" cy="${(10 + t * 330).toFixed(0)}" r="${(0.8 + (i % 3) * 0.5).toFixed(1)}" fill="#fff" opacity="${(0.15 + t * 0.4).toFixed(2)}"><animate attributeName="opacity" values="${(0.15 + t * 0.4).toFixed(2)};${(0.6 + s * 0.3).toFixed(2)};${(0.15 + t * 0.4).toFixed(2)}" dur="${(2.5 + s * 3).toFixed(1)}s" repeatCount="indefinite"/></circle>`
  }).join('')
  root.innerHTML = `<svg viewBox="0 0 880 420" aria-hidden="true">
    ${reduce.matches ? '' : stars}
    <line class="sight" x1="${lens[0].toFixed(0)}" y1="${lens[1].toFixed(0)}" x2="${(p9[0] - 92 * Math.cos(ang)).toFixed(0)}" y2="${(p9[1] + 92 * Math.sin(ang)).toFixed(0)}"/>
    <use href="#art-telescope" x="${T.x}" y="${T.y}" width="${T.w}" height="${T.h}"/>
    <g class="p9-float"><use href="#art-planet-nine" x="${(p9[0] - size / 2).toFixed(0)}" y="${(p9[1] - size / 2).toFixed(0)}" width="${size}" height="${size}" style="color:#fff"/></g>
    <text x="${p9[0].toFixed(0)}" y="${(p9[1] + size / 2 + 26).toFixed(0)}" text-anchor="middle" font-size="12" font-weight="600" letter-spacing="2" fill="#5cc79c" opacity=".85">PREDICTED · NOT YET SEEN</text>
    <text x="${(T.x + 120).toFixed(0)}" y="${(T.y + T.h + 2).toFixed(0)}" text-anchor="middle" font-size="12" letter-spacing="1.5" fill="#8a8a80">EARTH</text>
  </svg>`
}

// --- shooting stars ---------------------------------------------------------

function meteors () {
  if (reduce.matches) return
  const sky = document.getElementById('skyCanvas')
  const one = () => {
    const m = document.createElement('div')
    m.className = 'meteor'
    const w = innerWidth, h = Math.min(innerHeight, 900)
    const x = Math.random() * w * 0.9, y = Math.random() * h * 0.45
    const angle = 18 + Math.random() * 22
    const dist = 260 + Math.random() * 420
    m.style.left = `${x}px`; m.style.top = `${y}px`
    m.style.setProperty('--angle', `${angle}deg`)
    m.style.setProperty('--dist', `${dist}px`)
    m.style.setProperty('--len', `${90 + Math.random() * 120}px`)
    m.style.setProperty('--dur', `${0.9 + Math.random() * 0.9}s`)
    sky.appendChild(m)
    m.addEventListener('animationend', () => m.remove())
  }
  const loop = () => { one(); if (Math.random() < 0.25) setTimeout(one, 180 + Math.random() * 300); setTimeout(loop, 1600 + Math.random() * 3200) }
  setTimeout(loop, 700)
}

// --- the skin picker ----------------------------------------------------------

function skins () {
  const list = document.getElementById('skinList')
  const blurb = document.getElementById('skinBlurb')
  const draw = () => {
    const cur = currentSkin()
    list.innerHTML = SKIN_IDS.map(id => `<li><button type="button" data-skin="${id}" aria-pressed="${id === cur}">
      ${svgMarkup('planet-nine-mark', { skin: id, size: 44 })}<span>${SKINS[id].name}</span></button></li>`).join('')
    const s = SKINS[cur]
    blurb.innerHTML = `<b>${s.name}.</b> ${s.blurb} <small>· ${s.source}</small>`
  }
  list.addEventListener('click', e => {
    const b = e.target.closest('button[data-skin]'); if (!b) return
    setSkin(b.dataset.skin)
    draw()
  })
  draw()
}

// --- skip ahead ---------------------------------------------------------------

function skip () {
  const root = document.getElementById('skipGroups')
  root.innerHTML = GROUPS.map((g, gi) => {
    const pages = PAGES.filter(p => p.group === g)
    return `<div class="skip-group">
      <div class="skip-group-k"><b>Part ${gi + 1}</b> ${g}</div>
      <ol>${pages.map((p, i) => `<li><a href="${url(p.path)}"><span>${gi + 1}.${i + 1}</span>${p.title}</a></li>`).join('')}</ol>
    </div>`
  }).join('')
}

scene()
meteors()
skins()
skip()
