// The intro screen: a telescope looking at Planet Nine, shooting stars, the
// skin picker beside the planet, Start, and one button per part.

import { PAGES, GROUPS, currentSkin, setSkin } from '../site.js'
import { svgMarkup } from '../art.js'
import { SKINS, SKIN_IDS } from '../skins.js'
import { url } from '../data.js'

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

// --- the scene: telescope bottom-left, the planet up its line of sight ------

// The telescope art points 34 degrees above horizontal from its pivot; the
// planet sits on that line so the telescope really is looking at it. The skin
// picker is placed beside the planet from the same numbers (see skins()).
const T = { x: 60, y: 250, w: 240, h: 180 }
const LENS = [T.x + 124.8 * 1.5, T.y + 41.8 * 1.5]
const ANG = 34 * Math.PI / 180, DIST = 370
const P9 = [LENS[0] + DIST * Math.cos(ANG), LENS[1] - DIST * Math.sin(ANG)]
const SIZE = 170
const BOX = [880, 420]

function scene () {
  const root = document.getElementById('scene')
  const stars = Array.from({ length: 26 }, (_, i) => {
    const s = (i * 9301 + 49297) % 233280 / 233280, t = (i * 7919 + 104729) % 15485863 / 15485863
    const o = (0.15 + t * 0.4).toFixed(2)
    return `<circle cx="${(40 + s * 800).toFixed(0)}" cy="${(10 + t * 330).toFixed(0)}" r="${(0.8 + (i % 3) * 0.5).toFixed(1)}" fill="#fff" opacity="${o}"><animate attributeName="opacity" values="${o};${(0.6 + s * 0.3).toFixed(2)};${o}" dur="${(2.5 + s * 3).toFixed(1)}s" repeatCount="indefinite"/></circle>`
  }).join('')
  root.innerHTML = `<svg viewBox="0 0 ${BOX[0]} ${BOX[1]}" aria-hidden="true">
    ${reduce.matches ? '' : stars}
    <line class="sight" x1="${LENS[0].toFixed(0)}" y1="${LENS[1].toFixed(0)}" x2="${(P9[0] - 92 * Math.cos(ANG)).toFixed(0)}" y2="${(P9[1] + 92 * Math.sin(ANG)).toFixed(0)}"/>
    <use href="#art-telescope" x="${T.x}" y="${T.y}" width="${T.w}" height="${T.h}"/>
    <g class="p9-float"><use href="#art-planet-nine" x="${(P9[0] - SIZE / 2).toFixed(0)}" y="${(P9[1] - SIZE / 2).toFixed(0)}" width="${SIZE}" height="${SIZE}" style="color:#fff"/></g>
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
    m.style.left = `${Math.random() * w * 0.9}px`; m.style.top = `${Math.random() * h * 0.45}px`
    m.style.setProperty('--angle', `${18 + Math.random() * 22}deg`)
    m.style.setProperty('--dist', `${260 + Math.random() * 420}px`)
    m.style.setProperty('--len', `${90 + Math.random() * 120}px`)
    m.style.setProperty('--dur', `${0.9 + Math.random() * 0.9}s`)
    sky.appendChild(m)
    m.addEventListener('animationend', () => m.remove())
  }
  const loop = () => { one(); if (Math.random() < 0.25) setTimeout(one, 180 + Math.random() * 300); setTimeout(loop, 1600 + Math.random() * 3200) }
  setTimeout(loop, 700)
}

// --- the skin picker, beside the planet -----------------------------------------

function skins () {
  const pick = document.getElementById('skinPick')
  // to the right of the planet, vertically centred on it (percentages of the scene box)
  pick.style.left = `${((P9[0] + SIZE / 2 + 26) / BOX[0] * 100).toFixed(2)}%`
  pick.style.top = `${(P9[1] / BOX[1] * 100).toFixed(2)}%`
  const draw = () => {
    const cur = currentSkin()
    pick.innerHTML = `<span class="skin-k">Made of</span>` + SKIN_IDS.map(id =>
      `<button type="button" data-skin="${id}" aria-pressed="${id === cur}">${svgMarkup('planet-nine-mark', { skin: id, size: 22 })}<span>${SKINS[id].name}</span></button>`).join('')
  }
  pick.addEventListener('click', e => {
    const b = e.target.closest('button[data-skin]'); if (!b) return
    setSkin(b.dataset.skin)
    draw()
  })
  draw()
}

// --- one button per part --------------------------------------------------------

function parts () {
  document.getElementById('parts').innerHTML = GROUPS.map(g => {
    const first = PAGES.find(p => p.group === g)
    return `<a class="btn-part" href="${url(first.path)}">${g}</a>`
  }).join('')
}

scene()
meteors()
skins()
parts()
