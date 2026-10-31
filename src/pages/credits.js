// Credits: who made the site and where the data, photographs and drawings
// come from. Outside the walkthrough (see PAGES in site.js). The photograph
// credits are read from the files the fetch scripts wrote, so they can never
// drift from what was actually downloaded.

import '../site.js'
import { url } from '../data.js'

// Whose portrait each file in public/field is; the file names are surnames.
const PORTRAITS = { bannister: 'Michele Bannister', batygin: 'Konstantin Batygin', brown: 'Mike Brown', trujillo: 'Chad Trujillo' }

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
    const rows = tracking.images.map(im => ({ what: im.caption, credit: im.credit, license: im.license, href: im.source }))
    for (const p of telescopes.photos) rows.push({ what: `${p.name}, ${p.place}`, credit: p.credit, license: p.license, href: p.source })
    // the game's exposures: one row per round, then each archive's acknowledgement once, word for word
    for (const r of game.rounds) {
      rows.push({ what: `${r.object}, ${r.date}: ${r.telescope.split(',')[0]} exposures for the game on the data page`, credit: r.credit, license: r.terms ? `${r.license}, ${r.terms}` : r.license, href: r.source })
    }
    const acks = [...new Set(game.rounds.map(r => r.acknowledgement).filter(Boolean))]
    const instrument = r => r.telescope.split(',')[0]
    for (const ack of acks) {
      const users = game.rounds.filter(x => x.acknowledgement === ack), tel = instrument(users[0])
      // one camera can carry several acknowledgements (each names its programme): say whose
      const shared = acks.filter(a => instrument(game.rounds.find(x => x.acknowledgement === a)) === tel).length > 1
      rows.push({ what: `Acknowledgement for the ${tel} data${shared ? ` (${users.map(x => x.object).join(', ')})` : ''}`, credit: ack })
    }
    for (const l of logos.logos) rows.push({ what: l.what, credit: l.credit, license: l.license + (l.restrictions ? `, ${l.restrictions}` : ''), href: l.source })
    // CREDITS.md lines read: - `file.jpg` — credit · licence · url
    for (const m of portraits.matchAll(/^- `([^`]+)` — (.+?) · (.+?) · (\S+)$/gm)) {
      const stem = m[1].replace(/\.\w+$/, '')
      rows.push({ what: `Portrait of ${PORTRAITS[stem] || stem}`, credit: m[2], license: m[3], href: m[4] })
    }
    root.innerHTML = rows.map(r =>
      `<li><span>${r.what}</span><span class="muted">${[r.credit, r.license, r.href && `<a href="${r.href}">source</a>`].filter(Boolean).join(' · ')}</span></li>`).join('')
  } catch {
    root.innerHTML = '<li><span>The credits could not be loaded.</span><span class="muted">See credits.json in public/tracking, public/telescopes and public/logos, public/game/game.json, and public/field/CREDITS.md.</span></li>'
  }
}

// Every paper in papers.json, each with an anchor (cite-brown-batygin-2019) that a
// superscript elsewhere on the site links to; once drawn, the page scrolls to it.
async function papers () {
  const root = document.getElementById('paperList')
  try {
    const data = await fetch(url('data/papers.json')).then(r => r.json())
    const list = (data.papers || Object.values(data).find(Array.isArray)).slice().sort((a, b) => a.year - b.year)
    const slug = l => 'cite-' + l.replace(/\(.*?\)/g, '').replace(/&/g, ' ').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const strip = s => String(s || '').replace(/<[^>]+>/g, '')
    root.innerHTML = list.map(p => `<li id="${slug(p.label)}"><span><b>${strip(p.label)}</b><br>${strip(p.title)}</span>
      <span class="muted">${(p.authors || []).slice(0, 3).join(', ')}${(p.authors || []).length > 3 ? ' et al.' : ''} · ${strip(p.journal)} · <a href="${p.url}">doi</a></span></li>`).join('')
    if (location.hash.startsWith('#cite-')) document.querySelector(location.hash)?.scrollIntoView({ block: 'center' })
  } catch {
    root.innerHTML = '<li><span>The papers could not be loaded.</span><span class="muted">See papers/README.md.</span></li>'
  }
}

photos()
papers()
