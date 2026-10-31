// Writes the standalone art files in public/art/ from src/art.js:
//
//   public/art/svg/NAME.svg               every body, transparent background
//   public/art/svg/planet-nine*-dark.svg  the logo variants on dark and light tiles
//   public/art/png/NAME-SIZE.png          rasters at a few sizes (needs Edge or Chrome)
//   public/art/index.html                 a contact sheet of everything, with usage
//
// Run with:  node scripts/export_art.mjs          (add --no-png to skip rasters)
//
// PNGs are rendered by whichever of Microsoft Edge or Google Chrome is
// installed, in headless mode with a transparent default background. Without
// either, the SVGs and the sheet are still written and the script says so.

import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { ART, NAMES, svgMarkup } from '../src/art.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'art')
const SVG_DIR = join(OUT, 'svg')
const PNG_DIR = join(OUT, 'png')
const WANT_PNG = !process.argv.includes('--no-png')

const LOGOS = ['planet-nine', 'planet-nine-mark', 'planet-nine-mono', 'planet-nine-lockup']
const BODIES = NAMES.filter(n => !LOGOS.includes(n))
const BGS = ['none', 'dark', 'light']
const LOGO_SIZES = [64, 128, 256, 512]
const BODY_SIZES = [64, 256]

mkdirSync(SVG_DIR, { recursive: true })
mkdirSync(PNG_DIR, { recursive: true })

// --- SVG --------------------------------------------------------------------

const files = []   // { name, bg, svg, size }
const suffix = bg => bg === 'none' ? '' : `-${bg}`
const nominal = name => ART[name].box ? 720 : 256

for (const name of LOGOS) {
  for (const bg of BGS) {
    const file = `${name}${suffix(bg)}.svg`
    writeFileSync(join(SVG_DIR, file), svgMarkup(name, { size: nominal(name), bg }))
    files.push({ name, bg, svg: file })
  }
}
for (const name of BODIES) {
  const file = `${name}.svg`
  writeFileSync(join(SVG_DIR, file), svgMarkup(name, { size: 256 }))
  files.push({ name, bg: 'none', svg: file })
}
console.log(`wrote ${files.length} SVG files to public/art/svg/`)

// --- PNG --------------------------------------------------------------------

function findBrowser () {
  const candidates = process.platform === 'win32'
    ? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe']
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
      : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge']
  return candidates.find(existsSync)
}

const pngs = []
if (WANT_PNG) {
  const browser = findBrowser()
  if (!browser) {
    console.log('no Edge or Chrome found: skipping PNGs (SVGs are complete)')
  } else {
    const work = join(tmpdir(), 'p9-art-export')
    rmSync(work, { recursive: true, force: true })
    mkdirSync(work, { recursive: true })
    const jobs = []
    for (const f of files) {
      const sizes = LOGOS.includes(f.name) ? LOGO_SIZES : BODY_SIZES
      const [bw, bh] = ART[f.name].box || [100, 100]
      for (const size of sizes) {
        const w = size, h = Math.round(size * bh / bw)
        jobs.push({ ...f, w, h, png: `${f.name}${suffix(f.bg)}-${size}.png` })
      }
    }
    console.log(`rendering ${jobs.length} PNGs with ${browser} ...`)
    let n = 0
    for (const j of jobs) {
      const html = join(work, `${j.png}.html`)
      const svgUrl = pathToFileURL(join(SVG_DIR, j.svg)).href
      writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}img{display:block;width:${j.w}px;height:${j.h}px}</style></head><body><img src="${svgUrl}"></body></html>`)
      const out = join(PNG_DIR, j.png)
      const r = spawnSync(browser, [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--hide-scrollbars', '--default-background-color=00000000',
        `--user-data-dir=${join(work, 'profile')}`,
        `--window-size=${j.w},${j.h}`, `--screenshot=${out}`, '--virtual-time-budget=800',
        pathToFileURL(html).href,
      ], { stdio: 'ignore', timeout: 60000 })
      if (r.status === 0 && existsSync(out)) { pngs.push(j); n++ } else console.log(`  failed: ${j.png}`)
    }
    console.log(`wrote ${n} PNG files to public/art/png/`)
    rmSync(work, { recursive: true, force: true })
  }
}

// --- contact sheet ----------------------------------------------------------

const tile = (f, size = 96) => `<figure><div class="t ${f.bg}"><img src="svg/${f.svg}" width="${size}" alt=""></div><figcaption>${f.svg}</figcaption></figure>`
const sizesOf = name => LOGOS.includes(name) ? LOGO_SIZES : BODY_SIZES

const sheet = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Planet Nine art</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #121211; color: #c3c2b7; font: 15px/1.6 ui-sans-serif, -apple-system, "Segoe UI", Inter, system-ui, sans-serif; padding: 40px clamp(16px, 5vw, 64px); }
  h1 { color: #fff; font-size: 1.8rem; margin: 0 0 6px; letter-spacing: -0.02em; }
  h2 { color: #fff; font-size: 1.1rem; margin: 40px 0 10px; }
  p { max-width: 70ch; margin: 0 0 10px; }
  code, pre { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: .85em; }
  pre { background: #1a1a19; border: 1px solid #34342f; border-radius: 10px; padding: 14px 16px; overflow-x: auto; color: #e8e8e0; }
  .row { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; }
  figure { margin: 0; text-align: center; }
  figcaption { font: 11px/1.4 ui-monospace, Menlo, monospace; color: #8a8a80; margin-top: 6px; word-break: break-all; max-width: 150px; }
  .t { display: inline-flex; align-items: center; justify-content: center; padding: 10px; border-radius: 12px; border: 1px solid #34342f;
       background-image: linear-gradient(45deg, #2a2a28 25%, transparent 25%), linear-gradient(-45deg, #2a2a28 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a28 75%), linear-gradient(-45deg, transparent 75%, #2a2a28 75%);
       background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0; background-color: #1f1f1d; }
  .t.dark, .t.light { background-image: none; }
  .t.dark { background-color: #121211; } .t.light { background-color: #f4f2ec; border-color: #d8d5cc; }
  .light-bg { background: #f4f2ec; color: #1a1a19; padding: 18px; border-radius: 12px; display: inline-flex; gap: 20px; align-items: center; }
  table { border-collapse: collapse; font-size: .9rem; } td, th { text-align: left; padding: 4px 14px 4px 0; vertical-align: top; } th { color: #fff; }
  .art { width: 1.15em; height: 1.15em; vertical-align: -0.18em; }
</style></head><body>
<h1>Planet Nine art</h1>
<p>Everything the site draws by hand, in one place. Every file is an SVG (any size, any background), with PNG rasters beside it for slides and documents. Regenerate with <code>node scripts/export_art.mjs</code>; the drawings themselves live in <code>src/art.js</code>.</p>

<h2>The logo</h2>
<p>Use <code>planet-nine</code> wherever the planet is named. The question mark is the point: it is a predicted body, not a seen one. Its letters, like the lockup's, are traced from Space Grotesk, so every file keeps them without the font. The plain <code>mark</code> is for tiny sizes and inline text; <code>mono</code> takes <code>currentColor</code> for one-colour contexts; the <code>lockup</code> pairs it with a wordmark.</p>
<div class="row">${files.filter(f => f.name === 'planet-nine').map(f => tile(f, 120)).join('')}</div>
<div class="row" style="margin-top:14px">${files.filter(f => ['planet-nine-mark', 'planet-nine-mono'].includes(f.name)).map(f => tile(f, 72)).join('')}</div>
<div class="row" style="margin-top:14px">${files.filter(f => f.name === 'planet-nine-lockup').map(f => tile(f, 300)).join('')}</div>
<p style="margin-top:14px">Small, in running text and on a light surface:</p>
<div class="row"><span style="font-size:1.1rem"><img class="art" src="svg/planet-nine-mark.svg" alt=""> Planet Nine &nbsp;·&nbsp; <img class="art" src="svg/planet-nine.svg" alt=""> Planet Nine (predicted)</span>
<span class="light-bg"><img src="svg/planet-nine.svg" width="40" alt=""><b>Planet Nine</b><img src="svg/planet-nine-lockup-light.svg" height="48" alt=""></span></div>

<h2>The Sun and the planets</h2>
<p>Deliberately simple: one disc, one outline, a band or two. Pluto has a plain version and a sad one, used only at the moment it is reclassified. The Moon and Ceres are there for the planet-definition table.</p>
<div class="row">${files.filter(f => ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'pluto-sad', 'moon', 'ceres'].includes(f.name)).map(f => tile(f, f.name === 'sun' ? 110 : 84)).join('')}</div>

<h2>Trans-Neptunian objects</h2>
<p>Three looks so a swarm reads as many different rocks. Pick by hashing the object id, as the distance chart does.</p>
<div class="row">${files.filter(f => f.name.startsWith('tno-')).map(f => tile(f, 72)).join('')}</div>

<h2>Files</h2>
<table><tr><th>Name</th><th>SVG</th><th>PNG sizes</th></tr>
${NAMES.map(n => `<tr><td><code>${n}</code></td><td>${files.filter(f => f.name === n).map(f => `<code>svg/${f.svg}</code>`).join('<br>')}</td><td>${pngs.length ? sizesOf(n).map(s => `${s}px`).join(', ') + (LOGOS.includes(n) ? ' × none / dark / light' : '') : '(not rendered)'}</td></tr>`).join('\n')}
</table>

<h2>Using them</h2>
<pre>&lt;!-- as a file --&gt;
&lt;img src="/art/svg/planet-nine.svg" width="40" alt="Planet Nine"&gt;

&lt;!-- in the page, once main.js has injected the sprite --&gt;
&lt;svg class="art"&gt;&lt;use href="#art-planet-nine"/&gt;&lt;/svg&gt;

// in a chart
import { inline } from './art.js'
g.append('use').attr('href', '#art-sun').attr('width', 40).attr('height', 40)</pre>
</body></html>`
writeFileSync(join(OUT, 'index.html'), sheet)
console.log('wrote public/art/index.html')
