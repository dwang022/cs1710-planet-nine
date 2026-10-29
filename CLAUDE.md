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

Adding a page: create the HTML (copy a sibling: the `color-scheme` meta and
inline `<style>` in the head, which keep the page dark and hidden until
`site.js` sets `data-ready`, so a click never flashes white; `<body data-page="ID">`, a
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

### Writing

Science communication, not a textbook. The reader is a curious non-astronomer;
the register is plain and measured, light touches, no jokes.

- **Short and direct.** Titles of a few words ("Herd the orbits", "Eight
  planets"). Step cards are two or three bullets, one idea each, with at most
  one bold key line. A page head is a title plus a `.beats` row (year,
  drawing, one line) where the story has beats, otherwise one short lede.
- **Say only what is needed.** No resolution numbers, no formal names where a
  plain word does ("the International Astronomical Union has three
  requirements", not "Resolution B5"). No sentence that states what the
  reader already knows ("Nothing about Pluto changed. The definition did.")
  or what is implied ("never seen" beside "predicted"). No colon
  constructions ("Their answer: a planet"); write the sentence. No
  overstatement ("would most likely qualify", not "passes all three tests").
  Point ahead by talking about the search, not about "this site".
- **Text and picture never repeat each other.** The card says what the
  picture means; the picture is not labelled with it: no "nine planets"
  subtitle under nine drawn planets, no "dwarf planet · 2006" under a faded
  Pluto, no year in a callout when the chart title carries it. Callouts are a
  few words in a bubble sized to them; an icon in a callout only when it
  carries meaning (the sad Pluto). Never name Planet Nine's colour in copy
  ("this line", not "the green line"): it follows the skin.
- **No descriptors a reader can work out.** No "Part 3 · page 2 of 4"
  eyebrows, no "scroll slowly" hints, no label on the skin carousel, no
  "So far" box where it only restates the page. Group names drop "the" where
  it adds nothing: Background, Evidence, The search. Orientation for future
  work goes in HTML or JS comments, not on the page.
- **Plain words for terms.** "Closest point to the Sun", not perihelion, on
  first use; define AU once per page. Never refer to controls the reader has
  not reached. One claim per ledger row. Stances and lanes are *our* reading
  of abstracts; say so.
- **Visual hierarchy carries the reading order.** Column heads brighter than
  cells, headings brighter than body, one bold key line per card. Fill the
  width: three requirements side by side, beats across the head, not a
  paragraph in the left third of the screen.

### Colour

The "Deep Field" palette (tokens at the top of `src/style.css`): zinc
surfaces and four accents, each with one meaning everywhere. `--series-1`
violet is the objects we talk about (and links, the current page);
`--series-2` ember is the comparison, a warning, the case against;
`--series-3` aurora green is the case for a planet (ledger lane, check marks,
"passes the bar"); `--series-4` rose is what comes next (Rubin, proposed
searches). `-ink` variants are the same hues lifted for small text. The Sun
keeps its gold and the planets their natural colours. **No blue accents**:
blue appears only as Earth's and Neptune's own colour in the art, and as the
ocean-world skin, which the user asked to be deep blue. Colour follows the
entity, never its rank, and nothing is encoded in colour alone.

**Planet Nine is not in the palette.** Everything that stands for it takes
the chosen skin's colour, `--p9`, which `site.js` publishes from
`src/skins.js`: the orbit, dot and labels in the lean chart, the herding
planet, the lineup arc and label, the distance and brightness bands, the
predicted path on the sky map, `.k-p9`, `.k-ninth`, and every written
"Planet Nine", which `site.js` wraps in `.p9-name` at load and as content
arrives (chart text is left to the charts; `data-no-tint` opts an element
out). A skin may paint its lettering with a pattern through `text`
(`--p9-text`): gradients and bands only (icy bands, rock strata, cheese
gloss, the black hole's glow, the nine-ball's stripes), never spots, which
the thin strokes of letters chop up. On the planets page the three counts
keep one colour each wherever they appear: the first nine violet (`.k-nine`,
`--c-nine`), eight ember (`.k-eight`, `--c-eight`), the ninth `--p9`. A skin
whose colour would be confused with violet or ember swaps that count through
`counts` (gold for the first nine with the ocean world, rose for eight with
the iron world and the black hole). Bold text that carries a colour class is
never painted white by a list rule.

### Art

Add bodies to `src/art.js` as pure markup functions and re-export with
`node scripts/export_art.mjs`. Flat shapes, same-hue outline, soft bands.
**No rings, no glows**: Planet Nine carries no dashed halo, the lineup draws
no circles round the planets, and the intro's chosen planet is drawn plain
(the arrows and the name beneath are the selection cue). The question mark
alone marks Planet Nine as predicted, in every skin. The sad Pluto appears
only at the moment of reclassification: the 2006 beat on the planets page
and the callout in the lineup. Diagrams that are not bodies (the three
requirements) live in `src/charts/rulesart.js`. Third-party logos are shown
in monochrome, fetched with their credit by `scripts/fetch_logos.py`.

### Skins

`src/skins.js` holds the seven skins (ice giant, rock world, ocean world, iron
world, primordial black hole, cheese, nine-ball), each with `colour` and
optional `text` and `counts`. The choice is stored in `localStorage` under
`p9-skin`; `site.js` rebuilds the sprite's Planet Nine symbols, so every
`<use href="#art-planet-nine">` follows it, and publishes the colours. Chart
code never hard-codes a skin.

### Data and credits

Charts read `public/data/*.json` through `loadData()`. Never invent a number:
every quoted value is computed from the data on load or carries a `src` tag in
its JSON. Values tagged `ours` are presented as our assumption, never as a
finding. Image and logo credits are read from the files the fetch scripts
wrote (`public/tracking/credits.json`, `public/logos/credits.json`,
`public/field/CREDITS.md`), never typed. See `data/README.md` for what was
verified and what remains unverified.

### Chrome, links and filters

The intro holds only the title, Start, three part buttons, and the skin
carousel (the planet the telescope points at, an arrow either side, the name
beneath). The footer is one wide, muted Continue button with the credits link
in its corner and no colophon; credits live on `credits.html`, outside the
walkthrough. Write root-relative hrefs (`/setting/planets.html`); `site.js`
rewrites them if `BASE_URL` is not `/`. Data and asset URLs go through
`url()` in `data.js`. The clustering and probability pages share one sample
state (`sample.js`, key `p9-sample`); guided steps use the fixed STRICT/LOOSE
samples so their quoted numbers never move, and only the last "your turn"
step follows the reader.

## Verifying a change

Build, serve with `npm run preview`, and screenshot with headless Chrome over
the DevTools protocol (Node 24 has a global WebSocket); a ~1360×900 viewport
and `Page.captureScreenshot` with a clip. Add `is-active` to `.step` and
`is-in` to `.fr` before capturing so revealed content is visible. Plain
`--screenshot` with a tall window is useless: scrolly steps are sized in `vh`.
