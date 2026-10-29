// The chrome every page shares: the art sprite (in the reader's chosen Planet
// Nine skin), the top navigation, the footer with previous/next links, the
// starfield, and the base-URL fix-up for root-relative links.
//
// Each page's HTML sets <body data-page="ID"> and imports its own module from
// src/pages/, which imports this file first.

import './style.css'
import './site.css'
import { sprite, NAMES } from './art.js'
import { SKINS, DEFAULT_SKIN, skin as skinFor } from './skins.js'
import { url } from './data.js'

export const PAGES = [
  { id: 'intro', path: 'index.html', title: 'The search for Planet Nine', short: 'Start' },
  { id: 'planets', path: 'setting/planets.html', group: 'The setting', title: 'Nine planets, then eight, now perhaps nine', short: 'Planets' },
  { id: 'distance', path: 'setting/distance.html', group: 'The setting', title: 'How far away, and how we know', short: 'Distance' },
  { id: 'clustering', path: 'insights/clustering.html', group: 'The insight', title: 'The orbits lean the same way', short: 'Clustering' },
  { id: 'probability', path: 'insights/probability.html', group: 'The insight', title: 'Could it just be luck?', short: 'Probability' },
  { id: 'search', path: 'search/how.html', group: 'The search', title: 'How the search is done', short: 'The search' },
  { id: 'alternatives', path: 'search/alternatives.html', group: 'The search', title: 'What else could explain it', short: 'Alternatives' },
  { id: 'timeline', path: 'search/timeline.html', group: 'The search', title: 'Ten years of argument', short: 'Timeline' },
  { id: 'future', path: 'search/future.html', group: 'The search', title: 'What comes next', short: 'Future' },
]
export const GROUPS = ['The setting', 'The insight', 'The search']

const SKIN_KEY = 'p9-skin'

export function currentSkin () {
  try { const s = localStorage.getItem(SKIN_KEY); if (s && SKINS[s]) return s } catch {}
  return DEFAULT_SKIN
}

/** Remember a skin and redraw every Planet Nine on the page in it. */
export function setSkin (id) {
  if (!SKINS[id]) return
  try { localStorage.setItem(SKIN_KEY, id) } catch {}
  applySkin(id)
}

/** Replace the sprite's Planet Nine symbols; every <use> picks the change up at once. */
export function applySkin (id) {
  const holder = document.getElementById('artSprite')
  if (!holder) return
  holder.innerHTML = sprite(NAMES, { skin: id })
  document.documentElement.dataset.skin = id
}

const pageId = () => document.body.dataset.page || 'intro'
const here = () => PAGES.find(p => p.id === pageId()) || PAGES[0]

function injectSprite () {
  const div = document.createElement('div')
  div.id = 'artSprite'
  div.innerHTML = sprite(NAMES, { skin: currentSkin() })
  document.body.prepend(div)
  document.documentElement.dataset.skin = currentSkin()
}

function stars () {
  if (document.querySelector('.stars')) return
  const d = document.createElement('div')
  d.className = 'stars'
  d.setAttribute('aria-hidden', 'true')
  document.body.prepend(d)
}

/** The top bar: the mark, the three parts, and the pages in each. */
function nav () {
  const cur = here()
  if (cur.id === 'intro') return
  const groups = GROUPS.map(g => {
    const pages = PAGES.filter(p => p.group === g)
    return `<li class="nav-group${pages.some(p => p.id === cur.id) ? ' is-here' : ''}">
      <span class="nav-group-k">${g}</span>
      <ul>${pages.map(p => `<li><a href="${url(p.path)}"${p.id === cur.id ? ' aria-current="page"' : ''}>${p.short}</a></li>`).join('')}</ul>
    </li>`
  }).join('')
  const el = document.createElement('header')
  el.className = 'site-nav'
  el.innerHTML = `
    <div class="site-nav-in">
      <a class="nav-home" href="${url('index.html')}" aria-label="Back to the start">
        <svg class="art" viewBox="0 0 100 100" aria-hidden="true"><use href="#art-planet-nine-mark"/></svg>
        <span>The search for <b>Planet Nine</b></span>
      </a>
      <details class="nav-menu">
        <summary aria-label="Pages"><span></span><span></span><span></span></summary>
        <nav aria-label="Pages"><ul class="nav-groups">${groups}</ul></nav>
      </details>
    </div>`
  document.body.prepend(el)
  // Wide screens show the page links in the bar; narrow ones fold them into a menu.
  const details = el.querySelector('.nav-menu')
  const wide = window.matchMedia('(min-width: 1101px)')
  const fold = () => { details.open = wide.matches }
  fold(); wide.addEventListener('change', fold)
  // The pinned graphics in the scrolly sections sit below this bar.
  const setH = () => document.documentElement.style.setProperty('--bar-h', `${el.offsetHeight}px`)
  setH(); window.addEventListener('resize', setH)
}

/** Above the content: which part this is, its title, and where it sits in the sequence. */
function pageHead () {
  const cur = here()
  const slot = document.querySelector('[data-page-head]')
  if (!slot || cur.id === 'intro') return
  const siblings = PAGES.filter(p => p.group === cur.group)
  const k = siblings.indexOf(cur) + 1
  const part = GROUPS.indexOf(cur.group) + 1
  slot.innerHTML = `<div class="eyebrow">Part ${part} · ${cur.group} · page ${k} of ${siblings.length}</div>`
}

/** Below the content: where to go next, and the credits. */
function footer () {
  const cur = here()
  if (cur.id === 'intro') return
  const i = PAGES.indexOf(cur)
  const prev = PAGES[i - 1], next = PAGES[i + 1]
  const card = (p, dir) => p ? `<a class="pager ${dir}" href="${url(p.path)}">
      <span class="pager-k">${dir === 'prev' ? '← Previous' : 'Next →'}${p.group ? ` · ${p.group}` : ''}</span>
      <span class="pager-t">${p.title}</span></a>` : '<span></span>'
  const el = document.createElement('footer')
  el.className = 'site-foot wrap'
  el.innerHTML = `
    <nav class="pagers" aria-label="Previous and next">${card(prev, 'prev')}${card(next, 'next')}</nav>
    <p class="colophon">Daniel Wang · Gabriel Gonzalez · Russell Rui Luo — CS 1710, Harvard. Data fetched October 2026 from the
      <a href="https://ssd.jpl.nasa.gov/tools/sbdb_query.html">JPL Small-Body Database</a> and the
      <a href="https://www.minorplanetcenter.net/data">Minor Planet Center</a>. Planet Nine has never been seen; everything here describes an inference, not an observation.
      Full provenance in <a href="https://github.com/dwang022/cs1710-planet-nine/blob/main/data/SOURCES.md">data/SOURCES.md</a>.</p>`
  document.body.append(el)
}

/** Root-relative links written in the HTML ("/setting/planets.html") follow the deployment base. */
function fixLinks () {
  const base = (import.meta.env.BASE_URL || '/')
  if (base === '/') return
  document.querySelectorAll('a[href^="/"]:not([href^="//"])').forEach(a => {
    a.setAttribute('href', url(a.getAttribute('href')))
  })
  document.querySelectorAll('img[src^="/"]:not([src^="//"])').forEach(a => {
    a.setAttribute('src', url(a.getAttribute('src')))
  })
}

/** Skin name and blurb, for pages that mention the reader's choice. */
export const skinInfo = () => ({ id: currentSkin(), ...skinFor(currentSkin()) })

stars()
injectSprite()
nav()
pageHead()
footer()
fixLinks()
