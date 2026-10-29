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
    const [tracking, portraits, logos] = await Promise.all([
      fetch(url('tracking/credits.json')).then(r => r.json()),
      fetch(url('field/CREDITS.md')).then(r => r.text()),
      fetch(url('logos/credits.json')).then(r => r.json()),
    ])
    const rows = tracking.images.map(im => ({ what: im.caption, credit: im.credit, license: im.license, href: im.source }))
    for (const l of logos.logos) rows.push({ what: l.what, credit: l.credit, license: l.license + (l.restrictions ? `, ${l.restrictions}` : ''), href: l.source })
    // CREDITS.md lines read: - `file.jpg` — credit · licence · url
    for (const m of portraits.matchAll(/^- `([^`]+)` — (.+?) · (.+?) · (\S+)$/gm)) {
      const stem = m[1].replace(/\.\w+$/, '')
      rows.push({ what: `Portrait of ${PORTRAITS[stem] || stem}`, credit: m[2], license: m[3], href: m[4] })
    }
    root.innerHTML = rows.map(r =>
      `<li><span>${r.what}</span><span class="muted">${r.credit} · ${r.license} · <a href="${r.href}">source</a></span></li>`).join('')
  } catch {
    root.innerHTML = '<li><span>The credits could not be loaded.</span><span class="muted">See credits.json in public/tracking and public/logos, and public/field/CREDITS.md.</span></li>'
  }
}

photos()
