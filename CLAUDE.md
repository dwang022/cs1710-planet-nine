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

Ten pages in three parts (Background, Evidence, The search), plus a credits page outside the walkthrough. Each
page is one HTML file at the repo root plus one module in `src/pages/`; the
shared chrome comes from `src/site.js`.
`src/site.js` exports `PAGES`, the single source of truth for titles, order and
groups: the top bar, the footer's Continue button and the intro's three part
links are all generated from it. The footer carries no colophon; credits,
sources and the inference-not-observation note live on `credits.html`.

| Page | Module | What it holds |
|---|---|---|
| `index.html` | `pages/intro.js` | Title, telescope aimed at Planet Nine, shooting stars, Start, three part buttons, the skin carousel on the planet (arrows either side, name beneath) |
| `setting/planets.html` | `pages/planets.js` | Three beats, lineup scrolly (9 → 8 → 9?), Pluto's reclassification with the sad-face callout, the three requirements with drawings (`charts/rulesart.js`) and the scorecard table |
| `setting/distance.html` | `pages/distance.js` | Zoom-out scrolly (planets on arcs, extreme objects as range bars with a "now" dot), the AU primer |
| `setting/data.html` | `pages/data.js` | Real discovery frames in blink players, arc-vs-disagreement chart, JPL and MPC cards with Sedna's raw records, the grid of all 8,079 bodies |
| `insights/clustering.html` | `pages/clustering.js` | Lean scrolly (one orbit → compass → arrow → Planet Nine), filters in the last card, brush-to-select scatter and table, the herding exhibit |
| `insights/probability.html` | `pages/probability.js` | Luck scrolly (build the null distribution), filters, the streetlight exhibit, published odds on one axis |
| `search/how.html` | `pages/search.js` | Sky-map scrolly (coverage → depth → Rubin), search stats, ledger of searches, put-a-planet-out-there |
| `search/alternatives.html` | `pages/alternatives.js` | Eight explanations × four tests matrix, detail panel, ledger of the case against |
| `search/timeline.html` | `pages/timeline.js` | Compact ledger of every major paper, how the proposed planet changed |
| `search/future.html` | `pages/future.js` | Brightness ruler (survey depths vs predicted magnitude), "what comes next" rows, a dated schedule, what would confirm or end it |
| `credits.html` | `pages/credits.js` | Who made it, the data, the photographs (read from `tracking/credits.json` and `field/CREDITS.md`), drawings and code. `aside: true` in `PAGES`: no group, no Continue leads to it, the nav sets it apart |

Adding a page: create the HTML (copy a sibling: `<body data-page="ID">`, a
`.page-head` with `<div data-page-head>`, sections with `class="part wrap"`),
add its module in `src/pages/` (first line `import '../site.js'`), register it
in `PAGES` in `src/site.js` and in `pages` in `vite.config.js`.

## Layout

```
index.html, setting/, insights/, search/   the ten pages (Vite MPA inputs in vite.config.js); credits.html sits outside the walkthrough
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
public/logos/    the IAU's mark (scripts/fetch_logos.py), credits.json; shown in monochrome beside the planet definition
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
  bands, no rings: Planet Nine carries no dashed halo, its question mark
  alone marks it as predicted, and the intro shows the chosen skin with a
  glow in its own colour rather than an outline. Planet Nine always keeps
  its question mark, in every skin. The sad Pluto appears only at the moment of reclassification: the 2006
  beat on the planets page and the callout in the lineup.
- **Skins.** `src/skins.js` holds the seven skins (ice giant, rock world,
  ocean world, iron world, primordial black hole, cheese, nine-ball). The
  choice is stored in `localStorage` under `p9-skin`; `site.js` rebuilds the
  sprite's Planet Nine symbols, so every `<use href="#art-planet-nine">`
  follows it, and publishes the skin's `colour` as `--p9` and `--p9-ink`. A
  skin may also give `text`, a CSS background painted through the lettering
  (`--p9-text`; the black hole glows, the nine-ball is striped white and
  yellow). Chart code never hard-codes a skin.
- **Data.** Charts read `public/data/*.json` through `loadData()`. Never
  invent a number: every quoted value is computed from the data on load or
  carries a `src` tag in its JSON. Values tagged `ours` are presented as our
  assumption, never as a finding. See `data/README.md` for what was verified
  and what remains unverified.
- **Copy.** Plain, measured register; light touches, no jokes. Say "closest
  point to the Sun", not perihelion, on first use; define AU once per page.
  Never refer to controls the reader has not reached yet. One claim per
  ledger row. Stances and lanes are *our* reading of abstracts; say so.
  Prefer short bullets (one idea each) to paragraphs in step cards, and a
  `.beats` row (year, drawing, one line) to a lede paragraph when a page's
  story has beats. Never say in the text what the picture already shows, or
  label in the picture what the card beside it says. Science communication,
  not a textbook: no resolution numbers, no formal names where a plain word
  does, and no sentence that states what the reader already knows.
- **Colour: the "Deep Field" palette** (tokens at the top of `src/style.css`).
  Zinc surfaces and four accents, each with one meaning everywhere:
  `--series-1` violet is the objects we talk about (and links, the current
  page); `--series-2` ember is the comparison, a warning, the case against;
  `--series-3` aurora green is the case for a planet (ledger lane, check
  marks, "passes the bar"); `--series-4` rose is what comes next (Rubin,
  proposed searches). **Planet Nine itself is not in the palette**: every
  mark and word that stands for it (its orbit, its band, its label, `.k-p9`,
  `.k-ninth`) uses `--p9`, which `site.js` sets to the chosen skin's `colour`,
  so the copy never names Planet Nine's colour ("this line", not "the green
  line"). `site.js` also tints the words "Planet Nine" wherever they are
  written (title, top bar, headings, running text) by wrapping them in
  `.p9-name`; chart text is left to the charts. Add `data-no-tint` to an
  element to opt out. `-ink` variants are the same
  hues lifted for small text. The Sun keeps its gold and the planets their
  natural colours. **No blue accents**: the user dislikes blue; blue appears
  only as Earth's and Neptune's own colour in the art, and as the ocean-world
  skin, which the user asked to be deep blue (image and lettering). Colour follows the
  entity, never its rank, and nothing is encoded in colour alone. On the
  planets page the three counts keep one colour each wherever they appear:
  the first nine violet, eight ember, and the proposed ninth in `--p9`, via
  `.k-nine`, `.k-eight`, `.k-ninth`. A skin whose colour would be confused
  with violet or ember swaps that count's colour through `counts` in
  `src/skins.js` (`--c-nine`, `--c-eight`).
- **No descriptors a reader can work out.** No "Part 3 · The search · page 2
  of 4" eyebrows, no "scroll slowly" hints, no "pick a look" explanations on
  the intro; the nav, the step counters and the controls carry that. Titles
  are short and direct ("Herd the orbits", not "Why a planet would do this:
  herd the orbits yourself"). Put orientation for future work in HTML or JS
  comments, not on the page.
- **The intro** holds only the title, Start, three part buttons, and the skin
  carousel: the planet the telescope points at, an arrow either side, the
  skin's name beneath. No label, no explanation.
- **Group names** are "Background", "Evidence" and "The search": drop "the"
  where it adds nothing.
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
