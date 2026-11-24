// Credits: who made the site and where the data, papers, photographs and drawings
// come from. Outside the walkthrough (see PAGES in site.js). The photograph
// credits are read from the files the fetch scripts wrote, so they can never
// drift from what was actually downloaded.

import '../site.js'
import { url } from '../data.js'

// Whose portrait each file in public/field is; the file names are surnames.
// The object each discovery photograph in public/tracking shows.
const DISCOVERED = { pluto: 'Pluto', sedna: 'Sedna', bp519: '2015 BP519' }
const PORTRAITS = { bannister: 'Michele Bannister', batygin: 'Konstantin Batygin', brown: 'Mike Brown', trujillo: 'Chad Trujillo' }

// One credit: what it is, then who made it, the licence and a link, small and dim.
// Commons gives the uploader as the author of files moved from Wikipedia; say so plainly.
const who = c => String(c || '').replace(/^The original uploader was (.+?) at English Wikipedia\.?$/, 'Uploaded to Wikipedia by $1').replace(/\.$/, '')
const item = r => `<li><b>${r.what}</b>${r.sub ? `<span>${r.sub}</span>` : ''}
  <small>${[who(r.credit), r.license, r.href && `<a href="${r.href}">source</a>`].filter(Boolean).join(' · ')}</small></li>`
const group = (title, rows) => rows.length ? `<h3 class="cr-h">${title}</h3><ul class="cr-grid">${rows.map(item).join('')}</ul>` : ''

async function photos () {
  const root = document.getElementById('photoCredits')
  try {
    const [tracking, portraits, logos, telescopes, game] = await Promise.all([
      fetch(url('tracking/credits.json')).then(r => r.json()),
      fetch(url('field/CREDITS.md')).then(r => r.text()),
      fetch(url('logos/credits.json')).then(r => r.json()),
      fetch(url('telescopes/credits.json')).then(r => r.json()),
      fetch(url('game/game.json')).then(r => (r.ok ? r.json() : { rounds: [] })).catch(() => ({ rounds: [] })),
    ])
    // the object's name, then the exhibit's caption cut to its first sentence, without the "(arrowed)" pointing at the picture
    const discovery = tracking.images.map(im => ({
      what: DISCOVERED[im.id] || im.id,
      sub: im.caption.split(/\.\s/)[0].replace(/\s*\((arrowed|circled)\)/, '').replace(/\.$/, ''),
      credit: im.credit, license: im.license, href: im.source,
    }))
    const cap = s => s[0].toUpperCase() + s.slice(1)
    const scopes = telescopes.photos.map(p => ({ what: p.name, sub: cap(p.place), credit: p.credit, license: p.license, href: p.source }))
    const instrument = r => r.telescope.split(',')[0]
    // "Dark Energy Camera, 4-metre Blanco telescope, Cerro Tololo" → "Dark Energy Camera on the Blanco telescope"
    const camera = r => { const [cam, scope] = r.telescope.split(',').map(x => x.trim()); return scope ? `${cam} on the ${scope.replace(/^[\d.]+-metre /, '')}` : cam }
    // the archive and programme from the credit; the release dates and terms stay in game.json and CREDITS.md
    const archive = r => { const m = /via the (.+?) \((program [^)]+)\)/.exec(r.credit || ''); return m ? `${m[1]}, ${m[2]}` : r.credit }
    const rounds = game.rounds.map(r => ({ what: r.object, sub: `${r.date}, ${camera(r)}`, credit: archive(r), href: r.source }))
    // each archive's acknowledgement once, word for word
    const acks = [...new Set(game.rounds.map(r => r.acknowledgement).filter(Boolean))]
    const ackRows = acks.map(ack => {
      const users = game.rounds.filter(x => x.acknowledgement === ack), tel = instrument(users[0])
      // one camera can carry several acknowledgements (each names its programme): say whose
      const shared = acks.filter(a => instrument(game.rounds.find(x => x.acknowledgement === a)) === tel).length > 1
      return `<li><b>${tel} data${shared ? ` (${users.map(x => x.object).join(', ')})` : ''}</b><p>${ack}</p></li>`
    })
    const people = []
    // CREDITS.md lines read: - `file.jpg` — credit · licence · url
    for (const m of portraits.matchAll(/^- `([^`]+)` — (.+?) · (.+?) · (\S+)$/gm)) {
      const stem = m[1].replace(/\.\w+$/, '')
      people.push({ what: PORTRAITS[stem] || stem, credit: m[2], license: m[3], href: m[4] })
    }
    const marks = logos.logos.map(l => ({ what: l.what, credit: l.credit, license: l.license + (l.restrictions ? `, ${l.restrictions}` : ''), href: l.source }))
    root.innerHTML = group('Discovery photographs', discovery) + group('Observatories on the map', scopes) +
      group('Photos in the tracking game', rounds) +
      // the archives ask for these word for word, so they are kept whole but folded away
      (ackRows.length ? `<details class="cr-acks"><summary>The archives’ acknowledgements</summary><ul>${ackRows.join('')}</ul></details>` : '') +
      group('Portraits', people) + group('Logos', marks)
  } catch {
    root.innerHTML = '<p class="cr-more">The credits could not be loaded. They are in public/tracking, public/telescopes, public/logos, public/game and public/field on GitHub.</p>'
  }
}

// Crossref's titles: some in capitals, some with words run into their <i> and <sub> tags.
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])
const ACRONYMS = new Set(['CMB'])
function tidy (title) {
  let t = String(title || '').replace(/<(?!\/?(i|sub|sup)>)[^>]+>/g, '')
    .replace(/([A-Za-z])<i>/g, '$1 <i>').replace(/<\/i>([A-Za-z])/g, '</i> $1').replace(/<\/sub>([A-Za-z(])/g, '</sub> $1')
  if (t.replace(/<[^>]+>/g, '') === t.replace(/<[^>]+>/g, '').toUpperCase()) {
    let first = true
    t = t.replace(/(<[^>]+>)|([A-Za-z][A-Za-z’']*)/g, (m, tag, word) => {
      if (tag) return tag
      const out = ACRONYMS.has(word) ? word : (!first && SMALL.has(word.toLowerCase())) ? word.toLowerCase() : word[0] + word.slice(1).toLowerCase()
      first = false
      return out
    }).replace(/: ([a-z])/g, (m, c) => ': ' + c.toUpperCase())
  }
  return t
}

// Every paper in papers.json, grouped by year, each with an anchor (cite-brown-batygin-2019)
// that a superscript elsewhere on the site links to; once drawn, the page scrolls to it.
async function papers () {
  const root = document.getElementById('paperList')
  try {
    const data = await fetch(url('data/papers.json')).then(r => r.json())
    const list = (data.papers || Object.values(data).find(Array.isArray)).slice().sort((a, b) => a.year - b.year)
    const slug = l => 'cite-' + l.replace(/\(.*?\)/g, '').replace(/&/g, ' ').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const strip = s => String(s || '').replace(/<[^>]+>/g, '')
    const authors = a => a.length > 3 ? `${a[0]} et al.` : a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a.at(-1)}` : a.join('')
    const cited = p => +(/(\d{4})\b(?!.*\d{4})/.exec(p.label.replace(/\(.*?\)/g, ''))?.[1] || p.year)
    list.sort((a, b) => cited(a) - cited(b))
    const years = [...new Set(list.map(cited))]
    root.innerHTML = years.map(y => `<div class="cr-year"><h3>${y}</h3><ul>${list.filter(p => cited(p) === y).map(p =>
      `<li id="${slug(p.label)}"><a class="cr-title" href="${p.url}">${tidy(p.title)}</a>
        <small>${authors(p.authors || [])} · ${strip(p.journal)}</small></li>`).join('')}</ul></div>`).join('')
    // :target is not re-evaluated for an element drawn after load, so the paper is marked by hand
    const target = location.hash.startsWith('#cite-') && document.getElementById(decodeURIComponent(location.hash.slice(1)))
    if (target) { target.classList.add('is-target'); target.scrollIntoView({ block: 'center' }) }
  } catch {
    root.innerHTML = '<p class="cr-more">The papers could not be loaded. They are listed in papers/README.md on GitHub.</p>'
  }
}

photos()
papers()
