# The search for Planet Nine

CS 1710 (Harvard, data visualization) final project by Daniel Wang, Gabriel
Gonzalez and Russell Rui Luo. A multi-page, data-grounded walkthrough of the
case for a ninth planet: every chart is built from real telescope catalogues;
the only synthetic data is the explicitly labelled random-universe simulation
and the two cartoon exhibits (herding, streetlight), which say so on the page.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (Vite, multi-page)
npm run build      # static bundle into dist/
npm run preview    # serve dist/ on :4173
```

Python helpers are stdlib-only except the two image fetchers, which need
Pillow. On Windows run them as `python -P script.py` (not `-I`, which hides
the user site-packages). Set `PYTHONIOENCODING=utf-8` when a script prints
non-ASCII.

## The pages

Nine pages in three parts. Each page is one HTML file at the repo root plus
one module in `src/pages/`; the shared chrome comes from `src/site.js`.
`src/site.js` exports `PAGES`, the single source of truth for titles, order and
groups: the top bar, the previous/next footer and the intro's skip-ahead
links are all generated from it.

| Page | Module | What it holds |
|---|---|---|
| `index.html` | `pages/intro.js` | Title, telescope aimed at Planet Nine, shooting stars, Start, the skin picker, skip-ahead links |
| `setting/planets.html` | `pages/planets.js` | Lineup scrolly (9 → 8 → 9?), Pluto's reclassification with the sad-face callout, the IAU definition and scorecard table |
| `setting/distance.html` | `pages/distance.js` | Zoom-out scrolly (planets on arcs, extreme objects as range bars with a "now" dot), real discovery frames in blink players, arc-vs-disagreement chart, JPL and MPC cards with Sedna's raw records, the grid of all 8,079 bodies |
| `insights/clustering.html` | `pages/clustering.js` | Lean scrolly (one orbit → compass → arrow → Planet Nine), filters in the last card, brush-to-select scatter and table, the herding exhibit |
| `insights/probability.html` | `pages/probability.js` | Luck scrolly (build the null distribution), filters, the streetlight exhibit, published odds on one axis |
| `search/how.html` | `pages/search.js` | Sky-map scrolly (coverage → depth → Rubin), search stats, ledger of searches, put-a-planet-out-there |
| `search/alternatives.html` | `pages/alternatives.js` | Eight explanations × four tests matrix, detail panel, ledger of the case against |
| `search/timeline.html` | `pages/timeline.js` | Compact ledger of every major paper, how the proposed planet changed |
| `search/future.html` | `pages/future.js` | Brightness ruler (survey depths vs predicted magnitude), "what comes next" rows, a dated schedule, what would confirm or end it |

Adding a page: create the HTML (copy a sibling: `<body data-page="ID">`, a
`.page-head` with `<div data-page-head>`, sections with `class="part wrap"`),
add its module in `src/pages/` (first line `import '../site.js'`), register it
in `PAGES` in `src/site.js` and in `pages` in `vite.config.js`.

## Layout

```
index.html, setting/, insights/, search/   the nine pages (Vite MPA inputs in vite.config.js)
src/
  site.js        shared chrome: sprite injection, skin persistence, nav, page head, footer, base-URL link fix-up
  site.css       nav, page head, footer, intro screen, catalogue cards
  style.css      design tokens (validated palette), shared components, chart styles
  art.js         every hand-drawn body as pure SVG strings (Planet Nine in any skin, Sun, planets, TNOs, telescope)
  skins.js       the seven Planet Nine skins: what the planet might be made of
  data.js        loadData('etnos', ...) → public/data/*.json, honouring BASE_URL
  sample.js      which extreme objects count: shared filter state (localStorage), STRICT/LOOSE samples, control rendering
  scrolly.js     pinned-graphic scrollytelling (step activation, continuous progress)
  stats.js       circular statistics: resultant length, Rayleigh test, Monte Carlo null
  orbits.js      Keplerian geometry, verified against JPL Horizons; PLANET_NINE elements
  highlight.js   one object highlighted across every chart on a page
  motion.js      eased number tweens
  pages/         one module per page
  charts/        one module per visualisation (see headers); field.js is the ledger, fieldart.js its drawings,
                 herd.js and bias.js the two cartoon exhibits, tracking.js the blink players, arc chart and grid
public/data/     processed datasets the pages fetch (copies of data/processed/)
public/art/      the drawings as standalone SVG/PNG with a contact sheet (node scripts/export_art.mjs)
public/field/    portraits for the ledger (scripts/fetch_portraits.py), credits in CREDITS.md
public/tracking/ real discovery photographs for the tracking exhibit (scripts/fetch_tracking_images.py), credits.json
data/            processed datasets, README.md (what each file is, what was verified), SOURCES.md (every source)
scripts/         the Python pipeline; scripts/exploration/ holds teammates' one-off plots
papers/          README.md indexes every paper read; the PDFs are gitignored
docs/            the sketches PDF and exploration figures
prototypes/      the week-9 coordinated-view prototypes (separate app, deployed to GitHub Pages)
```

Raw catalogue downloads live in the sibling folder `../FinalProject/data/raw`
(the team's analysis repo); `scripts/build_catalogue_samples.py` reads them
from there, falling back to `data/raw/`.

## Conventions

- **Art.** Add bodies to `src/art.js` as pure markup functions and re-export
  with `node scripts/export_art.mjs`. Flat shapes, same-hue outline, soft
  bands, thin halo (dashed for Planet Nine). Planet Nine always keeps its
  question mark, in every skin. The sad Pluto appears only in the callout at
  the moment of reclassification.
- **Skins.** `src/skins.js` holds the seven skins (ice giant, rocky super-Earth,
  ocean world, iron world, primordial black hole, cheese, nine-ball). The
  choice is stored in `localStorage` under `p9-skin`; `site.js` rebuilds the
  sprite's Planet Nine symbols, so every `<use href="#art-planet-nine">`
  follows it. Chart code never hard-codes a skin.
- **Data.** Charts read `public/data/*.json` through `loadData()`. Never
  invent a number: every quoted value is computed from the data on load or
  carries a `src` tag in its JSON. Values tagged `ours` are presented as our
  assumption, never as a finding. See `data/README.md` for what was verified
  and what remains unverified.
- **Copy.** Plain, measured register; light touches, no jokes. Say "closest
  point to the Sun", not perihelion, on first use; define AU once per page.
  Never refer to controls the reader has not reached yet. One claim per
  ledger row. Stances and lanes are *our* reading of abstracts; say so.
- **Colour.** `--series-1` blue is the objects, `--series-2` orange is the
  comparison or warning, `--series-3` green is Planet Nine. Colour follows
  the entity, never its rank. Nothing is encoded in colour alone (shape, text
  or a table always carries the same meaning).
- **Links.** Write root-relative hrefs (`/setting/planets.html`); `site.js`
  rewrites them if `BASE_URL` is not `/`. Data and asset URLs go through
  `url()` in `data.js`.
- **Filters.** The clustering and probability pages share one sample state
  (`sample.js`, key `p9-sample`). Guided steps use the fixed STRICT/LOOSE
  samples so their quoted numbers never move; only the last "your turn" step
  follows the reader.

## Verifying a change

Build, serve with `npm run preview`, and screenshot with headless Chrome over
the DevTools protocol (Node 24 has a global WebSocket); a ~1360×900 viewport
and `Page.captureScreenshot` with a clip. Add `is-active` to `.step` and
`is-in` to `.fr` before capturing so revealed content is visible. Plain
`--screenshot` with a tall window is useless: scrolly steps are sized in `vh`.
