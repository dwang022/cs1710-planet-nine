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
import { fontsReady } from './fonts.js'

export const PAGES = [
  { id: 'intro', path: 'index.html', title: 'The search for Planet Nine', short: 'Start' },
  { id: 'planets', path: 'setting/planets.html', group: 'Background', title: 'Nine, eight, nine?', short: 'Planets' },
  { id: 'distance', path: 'setting/distance.html', group: 'Background', title: 'Far from home', short: 'Distance' },
  { id: 'data', path: 'setting/data.html', group: 'Background', title: 'The data', short: 'Data' },
  { id: 'clustering', path: 'insights/clustering.html', group: 'Evidence', title: 'The orbits lean the same way', short: 'Clustering' },
  { id: 'probability', path: 'insights/probability.html', group: 'Evidence', title: 'Could it just be luck?', short: 'Probability' },
  { id: 'alternatives', path: 'insights/alternatives.html', group: 'Evidence', title: 'What else could explain it', short: 'Alternatives' },
  { id: 'search', path: 'search/how.html', group: 'The search', title: 'Why nobody has found it', short: 'The search' },
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

/** Planet Nine's colour everywhere on the page is the chosen skin's: the flat colour for thin strokes,
 *  the gradient for its name (--p9-text in HTML, #g-p9's stops in SVG). Nothing else changes with the skin. */
function publishColour (sk) {
  const st = document.documentElement.style
  const [c1, c2] = sk.stops || [sk.colour, sk.colour]
  st.setProperty('--p9', sk.colour)
  st.setProperty('--p9-ink', sk.colour)
  st.setProperty('--p9-text', sk.text || `linear-gradient(180deg, ${c1}, ${c2})`)
  st.setProperty('--p9-1', c1)
  st.setProperty('--p9-2', c2)
}

// The gradient charts letter Planet Nine's name with (fill: url(#g-p9)), between its skin's two stops.
const PAINTS = `<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true" focusable="false"><defs>
  <linearGradient id="g-p9" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--p9-1)"/><stop offset="1" style="stop-color:var(--p9-2)"/></linearGradient>
</defs></svg>`

const pageId = () => document.body.dataset.page || 'intro'
const here = () => PAGES.find(p => p.id === pageId()) || PAGES[0]

function injectSprite () {
  const div = document.createElement('div')
  div.id = 'artSprite'
  div.innerHTML = sprite(NAMES, { skin: currentSkin() })
  document.body.prepend(div)
  div.insertAdjacentHTML('afterend', PAINTS)
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
// Names written in colour (CLAUDE.md, Colour): Planet Nine in its skin's lettering, each planet and the
// Sun in its own colour. A line break may fall between "Planet" and "Nine" in the source. "Earth masses",
// "Earth-mass" and "Earth radii" are units, not Earth, and stay plain.
// The test is a separate, non-global pattern: a global one used with test() keeps the place it stopped,
// which matchAll() inherits, so the matches would be missed and the text rewritten unchanged, which the
// watcher below would see and tint again, forever. (It froze the clustering page.)
const NAME_SRC = String.raw`Planet\s+Nine|\b(?:Mercury|Venus|Earth|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Sun)\b(?![\s-](?:mass|radi))`
const NAME_TEST = new RegExp(NAME_SRC)
const LEAVE = 'svg, script, style, textarea, option, .p9-name, .k-p9, .pl-name, [data-no-tint]'

function tintName (root) {
  if (!root || root.nodeType !== 1) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => NAME_TEST.test(n.nodeValue) && !n.parentElement?.closest(LEAVE) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  })
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  for (const n of nodes) {
    const matches = [...n.nodeValue.matchAll(new RegExp(NAME_SRC, 'g'))]
    if (!matches.length) continue                         // never rewrite a text unchanged: the watcher would loop
    const frag = document.createDocumentFragment()
    let at = 0
    for (const m of matches) {
      if (m.index > at) frag.append(n.nodeValue.slice(at, m.index))
      const s = document.createElement('span')
      if (/^Planet/.test(m[0])) { s.className = 'p9-name'; s.textContent = 'Planet Nine' } else { s.className = 'pl-name'; s.dataset.planet = m[0]; s.textContent = m[0] }
      frag.append(s)
      at = m.index + m[0].length
    }
    if (at < n.nodeValue.length) frag.append(n.nodeValue.slice(at))
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
// Each page's <head> keeps the body hidden until now, so a click never shows the
// page unstyled (white, in dev, where the CSS arrives through JS) or without its bar.
// It waits for the fonts too, at most 600 ms, so the letters do not swap in view.
Promise.race([fontsReady, new Promise(r => setTimeout(r, 600))])
  .then(() => { document.documentElement.dataset.ready = '' })
