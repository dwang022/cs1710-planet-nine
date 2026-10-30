// The intro screen: an observatory looking at Planet Nine, shooting stars, the
// skin carousel (arrows either side of the planet, its name beneath), Start,
// and one button per part.

import { PAGES, GROUPS, currentSkin, setSkin } from '../site.js'
import { svgMarkup, OBSERVATORY } from '../art.js'
import { SKINS, SKIN_IDS } from '../skins.js'
import { url } from '../data.js'

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

// --- the scene: an observatory bottom-left, the planet up its line of sight ---

// The observatory's telescope points OBSERVATORY.angle degrees above horizontal
// from its far end (art.js); the planet sits on that line so the telescope
// really is looking at it. The skin
// carousel is laid over the planet's bounds from the same numbers (see skins()).
const T = { x: 60, y: 250, w: 240, h: 180 }
const LENS = [T.x + OBSERVATORY.lens[0] * (T.w / 160), T.y + OBSERVATORY.lens[1] * (T.h / 120)]
const ANG = OBSERVATORY.angle * Math.PI / 180, DIST = 370
const P9 = [LENS[0] + DIST * Math.cos(ANG), LENS[1] - DIST * Math.sin(ANG)]
const SIZE = 170
const BOX = [880, 420]

function scene () {
  const root = document.getElementById('scene')
  // golden-ratio sequences spread the stars evenly without clumping or rows
  const frac = x => x - Math.floor(x)
  const stars = Array.from({ length: 26 }, (_, i) => {
    const s = frac(i * 0.618034 + 0.17), t = frac(i * 0.754878 + 0.41)
    const o = (0.15 + t * 0.4).toFixed(2)
    return `<circle cx="${(40 + s * 800).toFixed(0)}" cy="${(10 + t * 330).toFixed(0)}" r="${(0.8 + (i % 3) * 0.5).toFixed(1)}" fill="#fff" opacity="${o}"><animate attributeName="opacity" values="${o};${(0.6 + s * 0.3).toFixed(2)};${o}" dur="${(2.5 + s * 3).toFixed(1)}s" repeatCount="indefinite"/></circle>`
  }).join('')
  root.innerHTML = `<svg viewBox="0 0 ${BOX[0]} ${BOX[1]}" aria-hidden="true">
    ${reduce.matches ? '' : stars}
    <line class="sight" x1="${LENS[0].toFixed(0)}" y1="${LENS[1].toFixed(0)}" x2="${(P9[0] - 92 * Math.cos(ANG)).toFixed(0)}" y2="${(P9[1] + 92 * Math.sin(ANG)).toFixed(0)}"/>
    <use href="#art-observatory" x="${T.x}" y="${T.y}" width="${T.w}" height="${T.h}"/>
    <g class="p9-float"><g class="p9-swap"><use href="#art-planet-nine" x="${(P9[0] - SIZE / 2).toFixed(0)}" y="${(P9[1] - SIZE / 2).toFixed(0)}" width="${SIZE}" height="${SIZE}" style="color:#fff"/></g></g>
  </svg>`
}

// --- shooting stars ---------------------------------------------------------

function meteors () {
  if (reduce.matches) return
  const sky = document.getElementById('skyCanvas')
  const one = () => {
    if (document.hidden) return
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
  // A hidden tab pauses the animations but not the timers, so meteors made
  // while away would all streak at once on return: clear them instead.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sky.querySelectorAll('.meteor').forEach(m => m.remove()) })
}

// --- the skin carousel: arrows either side of the planet, its name beneath ------

// The planet in the scene is the thing being chosen: every <use> of Planet Nine
// follows the skin, so switching redraws it in place. The picker box is laid
// over the planet's own bounds (percentages of the scene box); the arrows hang
// off its sides and the name off its bottom edge, so they track the planet at
// any width.
const CHEVRON = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`

function skins () {
  const pick = document.getElementById('skinPick')
  pick.style.left = `${((P9[0] - SIZE / 2) / BOX[0] * 100).toFixed(2)}%`
  pick.style.top = `${((P9[1] - SIZE / 2) / BOX[1] * 100).toFixed(2)}%`
  pick.style.width = `${(SIZE / BOX[0] * 100).toFixed(2)}%`
  pick.style.height = `${(SIZE / BOX[1] * 100).toFixed(2)}%`
  pick.innerHTML = `
    <button type="button" class="skin-arrow prev" data-dir="-1" aria-label="Previous look">${CHEVRON('M15 5l-7 7 7 7')}</button>
    <button type="button" class="skin-arrow next" data-dir="1" aria-label="Next look">${CHEVRON('M9 5l7 7-7 7')}</button>
    <div class="skin-name" aria-live="polite"></div>`
  const name = pick.querySelector('.skin-name')
  const show = () => { name.textContent = SKINS[currentSkin()].name }
  const step = dir => {
    const i = SKIN_IDS.indexOf(currentSkin())
    setSkin(SKIN_IDS[(i + dir + SKIN_IDS.length) % SKIN_IDS.length])
    show()
    const g = document.querySelector('#scene .p9-swap')
    if (g && !reduce.matches) { g.classList.remove('is-swap'); void g.getBoundingClientRect(); g.classList.add('is-swap') }
  }
  pick.addEventListener('click', e => { const b = e.target.closest('.skin-arrow'); if (b) step(+b.dataset.dir) })
  pick.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
  })
  show()
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
