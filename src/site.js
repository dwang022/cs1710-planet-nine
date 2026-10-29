// The chrome every page shares: the art sprite (in the reader's chosen Planet
// Nine skin), the top navigation, the footer with its Continue button, the
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
  { id: 'planets', path: 'setting/planets.html', group: 'Background', title: 'Nine, eight, nine?', short: 'Planets' },
  { id: 'distance', path: 'setting/distance.html', group: 'Background', title: 'How far away', short: 'Distance' },
  { id: 'data', path: 'setting/data.html', group: 'Background', title: 'The data', short: 'Data' },
  { id: 'clustering', path: 'insights/clustering.html', group: 'Evidence', title: 'The orbits lean the same way', short: 'Clustering' },
  { id: 'probability', path: 'insights/probability.html', group: 'Evidence', title: 'Could it just be luck?', short: 'Probability' },
  { id: 'search', path: 'search/how.html', group: 'The search', title: 'Why nobody has found it', short: 'The search' },
  { id: 'alternatives', path: 'search/alternatives.html', group: 'The search', title: 'What else could explain it', short: 'Alternatives' },
  { id: 'timeline', path: 'search/timeline.html', group: 'The search', title: 'Ten years of argument', short: 'Timeline' },
  { id: 'future', path: 'search/future.html', group: 'The search', title: 'What comes next', short: 'Future' },
  // Outside the walkthrough: no group, no Continue leads to it, the nav sets it apart.
  { id: 'credits', path: 'credits.html', title: 'Credits', short: 'Credits', aside: true },
]
export const GROUPS = ['Background', 'Evidence', 'The search']

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
  publishColour(skinFor(id))
}

/** Planet Nine's colour everywhere on the page is the chosen skin's; some skins paint the lettering. */
function publishColour (sk) {
  const st = document.documentElement.style
  st.setProperty('--p9', sk.colour)
  st.setProperty('--p9-ink', sk.colour)
  st.setProperty('--p9-text', sk.text || sk.colour)
  document.documentElement.toggleAttribute('data-skin-text', !!sk.text)
  st.setProperty('--c-nine', sk.counts?.nine || 'var(--series-1)')
  st.setProperty('--c-eight', sk.counts?.eight || 'var(--series-2)')
}

const pageId = () => document.body.dataset.page || 'intro'
const here = () => PAGES.find(p => p.id === pageId()) || PAGES[0]

function injectSprite () {
  const div = document.createElement('div')
  div.id = 'artSprite'
  div.innerHTML = sprite(NAMES, { skin: currentSkin() })
  document.body.prepend(div)
  document.documentElement.dataset.skin = currentSkin()
  publishColour(skinFor(currentSkin()))
}

function stars () {
  if (document.querySelector('.stars')) return
  const d = document.createElement('div')
  d.className = 'stars'
  d.setAttribute('aria-hidden', 'true')
  document.body.prepend(d)
}

/** The top bar: the mark, the three parts and the pages in each, and the credits set apart. */
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
  const aside = PAGES.filter(p => p.aside).map(p =>
    `<li class="nav-aside"><a href="${url(p.path)}"${p.id === cur.id ? ' aria-current="page"' : ''}>${p.short}</a></li>`).join('')
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
        <nav aria-label="Pages"><ul class="nav-groups">${groups}${aside}</ul></nav>
      </details>
    </div>`
  document.body.prepend(el)
  // Wide screens show the page links in the bar; narrow ones fold them into a menu.
  const details = el.querySelector('.nav-menu')
  const wide = window.matchMedia('(min-width: 1280px)')
  const fold = () => { details.open = wide.matches }
  fold(); wide.addEventListener('change', fold)
  // The pinned graphics in the scrolly sections sit below this bar.
  const setH = () => document.documentElement.style.setProperty('--bar-h', `${el.offsetHeight}px`)
  setH(); window.addEventListener('resize', setH)
}

// Pages carry no "Part 3 · The search · page 2 of 4" eyebrow: the nav bar
// already says where the reader is, and the user asked for no descriptors a
// reader can work out alone. The part and position live in PAGES for anyone
// who needs them (the nav, the footer, the intro's three part buttons).

/** Below the content: one Continue button, and a small link to the credits. */
function footer () {
  const cur = here()
  if (cur.id === 'intro') return
  // The walkthrough reads in order; the nav is there for jumping about. Pages
  // outside it (the credits) and the last page send the reader back to the start.
  const main = PAGES.filter(p => !p.aside)
  const next = cur.aside ? null : main[main.indexOf(cur) + 1]
  const go = next
    ? `<a class="btn-continue" href="${url(next.path)}">Continue <span aria-hidden="true">→</span></a>`
    : `<a class="btn-continue" href="${url('index.html')}">Back to the start</a>`
  const credits = cur.aside ? '' : `<a class="foot-credits" href="${url('credits.html')}">Credits and sources</a>`
  const el = document.createElement('footer')
  el.className = 'site-foot wrap'
  el.innerHTML = `<nav class="continue" aria-label="Continue">${go}</nav>${credits}`
  document.body.append(el)
}

// --- the name --------------------------------------------------------------------

// Wherever the words "Planet Nine" are written, they take the planet's colour
// (--p9, the chosen skin's), in the title, the top bar, headings and running
// text alike. Chart text is left alone: the charts colour their own labels.
const NAME = /Planet Nine/
const LEAVE = 'svg, script, style, textarea, option, .p9-name, .k-p9, [data-no-tint]'

function tintName (root) {
  if (!root || root.nodeType !== 1) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => NAME.test(n.nodeValue) && !n.parentElement?.closest(LEAVE) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  })
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  for (const n of nodes) {
    const frag = document.createDocumentFragment()
    const parts = n.nodeValue.split('Planet Nine')
    parts.forEach((t, i) => {
      if (t) frag.append(t)
      if (i < parts.length - 1) { const s = document.createElement('span'); s.className = 'p9-name'; s.textContent = 'Planet Nine'; frag.append(s) }
    })
    n.replaceWith(frag)
  }
}

function watchName () {
  tintName(document.body)
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) tintName(n.nodeType === 3 ? n.parentElement : n)
  }).observe(document.body, { childList: true, subtree: true })
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
footer()
watchName()
fixLinks()
