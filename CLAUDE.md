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
Pillow, and `scripts/build_glyphs.py`, which needs fontTools. On Windows run them as `python -P script.py` (not `-I`, which hides
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
| `index.html` | `pages/intro.js` | Title, an observatory aimed at Planet Nine, shooting stars, Start, three part buttons, the skin carousel on the planet (arrows either side, name beneath) |
| `setting/planets.html` | `pages/planets.js` | Three beats, lineup scrolly (9 → 8 → 9?), Pluto's reclassification with the sad-face callout, the three requirements with drawings (`charts/rulesart.js`) and the scorecard table |
| `setting/distance.html` | `pages/distance.js` | Head with Planet Nine's distance (computed on load), the question on its own line, and a to-scale Sun-to-Earth ruler for the AU (`charts/auruler.js`); zoom-out scrolly over a map seen from above, everything where it was in June 2026: the planets on their orbits, the Kuiper belt as a faint ring filled with dots for its icy bodies (decoration, not data; they fade out when the evidence arrives), Voyager 1 (`positions.json`), the extreme objects seen in more than one season as dots (pointing at one draws its orbit; one card shows all the orbits), Planet Nine's best-fit orbit with its icon, and the uncertainty band |
| `setting/data.html` | `pages/data.js` | Head graphic of an observatory finding an arc, the full width of the page and behind the title on a wide screen, the page's three numbers written beside what they count (no boxes; along the arc for the positions), smaller observatories further along the horizon each looking at an earlier position, stars kept clear of the drawing, shooting stars now and then (`charts/datahero.js`, `meteors.js`); below 840 px it stacks with the numbers in a row; a titled world map of every observatory with country borders and insets laid over empty sea and land (Hawaiʻi above the islands in the North Pacific, a large Southwest US in the South Pacific, Northern Chile in the South Atlantic, Europe over Africa and the Indian Ocean; sites too close to tell apart are nudged a pixel or two so none overlap), the map in Earth's own dark colours (navy sea, green-grey land), each site a sand disc sized by positions reported with a violet core sized by the extreme objects first found there (two scales in the key), Rubin's dot like the rest with its name in pink in a callout saying it found every extreme object discovered since it opened (counted on load), a card per site on click (the photograph of its busiest telescope, every site that found an object has one, or the observatory drawing where no free photograph exists; numbers; telescopes), Hubble as a pill in the top corner, "find the telescope nearest you" with a map pin (`charts/scopes.js`); three drawings from pictures to orbits (`charts/orbitart.js`); the tracking game on real archive frames spanning a few nights (four rounds; the object crosses a quarter to half the frame; one round in colour), controls on the image, every play starting with the arrow on the object, the reveal ringing each stop rather than covering it (`charts/spotgame.js`); three more discoveries in a row; JPL's catalogue (only JPL is named there; its logo on the right in white, `public/logos/jpl-mono.svg`), every known body beyond Neptune on a map the width of the page that fits one screen, with a query panel on it (known objects beyond Neptune › with extreme orbits › and reliable orbits › that first pointed to Planet Nine; choosing a row runs the query to it, its definition beneath; the orbits toggle in the panel) (`charts/catalogue.js`, `pages/data.js`); what makes an orbit reliable, one line on following the papers, then how long each extreme object was watched against how uncertain its far end is, the groups named on the chart (`charts/arcs.js`) |
| `insights/clustering.html` | `pages/clustering.js` | Three drawings of what an orbit is, from Sedna's real orbit (`charts/orbitintro.js`); lean scrolly (one orbit → compass → arrow → Planet Nine) with a key drawn above it and a card per object on click; on the last step the views (Orbits, Compass, Sample, the brush-to-select scatter) and the filters sit on the picture (in the card on a phone); a collapsed table of every number; the herding exhibit with its controls on the picture and a draggable planet |
| `insights/probability.html` | `pages/probability.js` | Head as three beats with compasses drawn from the data; luck scrolly (build the null distribution) whose piles and odds come from the stored 200,000-trial simulations, with a panel-shaped layout that stacks on a phone; step 6 compares each distance cut with and without the objects seen once; the streetlight exhibit with its controls on the picture; published odds on one axis, read from `published_odds.json` |
| `insights/alternatives.html` | `pages/alternatives.js` | Eight explanations × four tests matrix, detail panel, ledger of the case against; closes the Evidence part |
| `search/how.html` | `pages/search.js` | Sky-map scrolly (coverage → depth → Rubin), search stats, ledger of searches, put-a-planet-out-there |
| `search/timeline.html` | `pages/timeline.js` | Compact ledger of every major paper, how the proposed planet changed |
| `search/future.html` | `pages/future.js` | Brightness ruler (survey depths vs predicted magnitude), "what comes next" rows, a dated schedule, what would confirm or end it |
| `credits.html` | `pages/credits.js` | Who made it, the data, every paper cited (from `papers.json`, each with a `cite-` anchor), the photographs (read from the fetch scripts' credit files), drawings and code. `aside: true` in `PAGES`: no group, no Continue leads to it, the nav sets it apart |

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
  fonts.js       the two typefaces, bundled; fontsReady, which loadData() and the page reveal wait for
  glyphs.js      letters the drawings use, traced from Space Grotesk as paths (generated by scripts/build_glyphs.py)
  art.js         every hand-drawn body as pure SVG strings (Planet Nine in any skin, Sun, planets, TNOs, an observatory)
  skins.js       the seven Planet Nine skins: what the planet might be made of
  data.js        loadData('etnos', ...) → public/data/*.json, honouring BASE_URL
  sample.js      which extreme objects count: shared filter state (localStorage), STRICT/LOOSE samples, control rendering
  scrolly.js     pinned-graphic scrollytelling (step activation, continuous progress)
  stats.js       circular statistics: resultant length, Rayleigh test, Monte Carlo null
  orbits.js      Keplerian geometry, verified against JPL Horizons; PLANET_NINE elements
  highlight.js   one object highlighted across every chart on a page
  motion.js      eased number tweens
  meteors.js     shooting stars, on the intro and the data page's head
  pages/         one module per page
  charts/        one module per visualisation (see headers); field.js is the ledger, fieldart.js its drawings,
                 herd.js and bias.js the two cartoon exhibits, tracking.js the blink players, datahero.js,
                 scopes.js, spotgame.js, catalogue.js and arcs.js the data page
public/data/     processed datasets the pages fetch (copies of data/processed/)
public/art/      the drawings as standalone SVG/PNG with a contact sheet (node scripts/export_art.mjs)
public/field/    portraits for the ledger (scripts/fetch_portraits.py), credits in CREDITS.md
public/tracking/ real discovery photographs for the tracking exhibit (scripts/fetch_tracking_images.py), credits.json
public/telescopes/ one photograph per busy site, shown in the map's cards (scripts/fetch_telescope_photos.py), credits.json
public/game/     real archive exposures for the tracking game (DECam via NOIRLab, CFHT MegaCam via CADC), aligned on the stars,
                 with the object's position and time in each, from the MPC's positions or a JPL Horizons ephemeris
                 (positions_from); a colour round is a g/r/i set per frame (scripts/fetch_game_sequences.py), game.json; CREDITS.md
                 holds each archive's acknowledgement. scripts/fetch_game_frames.py (the older Commons GIFs) is superseded
public/logos/    the IAU's and JPL's marks (scripts/fetch_logos.py, which also writes JPL's in white, jpl-mono.svg), credits.json;
                 shown in monochrome beside the planet definition and the JPL catalogue
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
  paragraph in the left third of the screen. A section's intro runs up to
  115ch (`.sec-head p`), so a one-sentence intro stays on one line.
- **Keys, not captions.** An encoding is explained by a key drawn with the
  chart (the size scale with its values, a colour with its name, a sample
  row with what its parts are), never by a sentence such as "one dot per
  site, sized by...". The key is not titled "legend".
- **Credits under an image are one short, dim line**: the instrument or
  licence, the date, and a link to the credits page. Full citations live on
  `credits.html` only.
- **Papers are cited by superscript, never by name.** No author names or
  formal citations in running text or captions; a
  `<sup class="cite"><a href="/credits.html#cite-brown-batygin-2019">1</a></sup>`
  leads to the paper in the credits page's list. The anchor is `cite-` plus the
  paper's `label` in `papers.json`, lowercased and hyphenated. Chart rows that
  are themselves about a paper (the odds chart, the ledger) keep its label.
- **Messages in interactions are a word or two.** "Found", "Missed", a
  count; never a sentence that explains what the picture already shows.
  A verdict (`.verdict`, with `for` or `against`) is a bold word or two and
  the odds. The last step of a scrolly that hands over the filters is titled
  "Your turn".
- **Controls sit on the image they control**: play and pause, the date of a
  frame, levels, replay, submit, the streetlight's coverage, the herd's planet.
  Use `.pic` on the panel and `.pic-bar` for the strip of controls along its
  foot (`.pic-btn`, `.pic-time`; `.pic-note` for a word or two on the picture);
  on a phone the bar drops under the picture. Details open on click in a card
  that stays until its close button (or Escape), not on hover (`.pick-card` on
  the clustering page, the map's cards on the data page).
- **One number per claim.** A count and the odds quoted beside it come from the
  same simulation or the same file, never one from a formula and one from a
  sample. Large odds are rounded to two figures (`oneIn()` in `stats.js`).

### Colour

**Colour carries meaning and nothing else.** Decided with the user on
2026-10-31 (it replaced the "Deep Field" palette, whose violet also painted
the interface and whose green clashed with the default skin). Tokens are at
the top of `src/style.css`. Every hue on the site is one of these, and a new
coloured thing either takes one of these meanings or stays white and grey:

| What | Colour | Where it is set |
|---|---|---|
| The interface: buttons, links, the current page, focus rings, toggles, citation numbers, plain "yes" marks (✓, "accounts for", the game's Found) | white and grey, **no hue** | `--ui`, `--text-*` |
| Title emphasis | brightness, not hue: a title with `<em>` is grey, its key words white | `.page-head h1:has(em)` |
| Planet Nine | the chosen skin: its **two-tone gradient** for its name and lettering, its flat colour for thin strokes and dots. The only non-flat colour on the site | `--p9-text`, `#g-p9` in SVG; `--p9` |
| The case for a planet (ledger lane, verdicts, "past the usual bar", the odds chart's "for" side, a good fit) | Planet Nine's colour | `--p9`, `.k-for` |
| Each planet | its own flat colour, lifted from its drawing in `art.js` for text: its name wherever written, its chart labels | `--c-earth` …, `.pl-name`, `text[data-planet]` |
| The Sun | gold, its name too | `--sun` |
| Distances in AU | **gold, number and unit together** (`150 AU`), the Sun's colour: a distance is measured from the Sun. A gradient on every number was tried and found distracting; the Sun-to-Earth idea lives on the ruler that defines the AU (distance page head), gold at the Sun to blue at Earth. Scale bars are gold | `--au`, `.k-au`, `.au`; `--au` → `--au-2` on the AU ruler |
| The distant objects | violet, and nothing else | `--series-1` |
| The case against, a warning, a miss | ember | `--series-2` |
| What comes next (Rubin, proposed searches) | hot pink `#ff3dc8`, strong so Rubin stands out from the greys (the old soft rose did not); checked against every other colour on the page | `--series-4` |
| Background | near-black: space | `--surface-0` |
| The world map (data page) | Earth's own colours, dark and quiet: navy sea, green-grey land; sites are sand discs (positions) with violet cores (objects found there) | `.map-*`, `.site`, `.site-core` |

On the planets page the three counts follow the entity: the first nine in
Pluto's colour (Pluto made it nine, `--c-nine`), eight plain white
(`--c-eight`), the ninth in Planet Nine's gradient. `-ink` variants are the
same hues lifted for small text. Colour follows the entity, never its rank,
and nothing is encoded in colour alone.

Every written "Planet Nine" is wrapped in `.p9-name` by `site.js`, at load and
as content arrives (`data-no-tint` opts an element out; a line break between
the words is fine), and lettered in the gradient; every planet's name and "Sun"
likewise in `.pl-name[data-planet]`, in its colour ("Earth masses", "Earth-mass"
and "Earth radii" are units and stay plain). The lettering rule is scoped
`:root :is(...)` so no single-class colour paints over it. Chart code draws its own:
`fill: url(#g-p9)` for the name (`.p9-svg`), `var(--p9)` for strokes. Skins no
longer swap any other colour. `site.js` defines Planet Nine's SVG gradient once
per page (`#g-p9`).

**Blue** appears only as Earth's and Neptune's own colour, the Earth end of
the AU gradient, Hubble's solar panels on the data page's map (asked for),
and the ocean-world skin (asked for, deep blue). Bold text that carries a
colour class is never painted white by a list rule.

### Type

Space Grotesk for text and charts, Space Mono (its sibling) for the small
uppercase labels: `--font-sans` and `--font-mono` in `style.css`, both bundled
through `src/fonts.js` (`@fontsource`), so every device draws the same letters.
Space Mono comes in 400 and 700 only. `loadData()` waits for the fonts, so a
chart that measures its words measures these letters, and `site.js` shows the
page once they are in. Chart text follows `--font-sans` through the
`svg text` rule. The drawings in `art.js` set no text: Planet Nine's question
mark and the lockup's words are paths traced from Space Grotesk
(`src/glyphs.js`, from `scripts/build_glyphs.py`), so the exported files and
the favicon keep the same letters without the font; trace any new letter a
drawing needs the same way. Space Grotesk draws a straight `"` slanted, so copy
uses curly quotes (“planet”). The full nav bar is tight between 1280 and 1440 px;
a new page there needs its width checked.

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
world, primordial black hole, cheese, nine-ball). Each has a flat `colour`
(clearly apart from violet, ember and rose, since Planet Nine also stands for
the case for a planet), a `text` gradient for its lettering (gradients and
bands only, never spots, which the thin strokes of letters chop up) and
`stops`, the gradient's two ends for SVG. Each is meant to be unmistakable at
a glance. The choice is stored in `localStorage` under `p9-skin`; `site.js`
rebuilds the sprite's Planet Nine symbols, so every
`<use href="#art-planet-nine">` follows it, and publishes the colours. Chart
code never hard-codes a skin.

### Data and credits

Charts read `public/data/*.json` through `loadData()`. **Which extreme
objects count follows the papers**: seen at more than one opposition ("seen in
more than one season" on the page; `well_determined` in `etnos.json`, set by
`scripts/build_tnos.py`), as in Brown & Batygin 2019 and 2021, so the site can
say it uses the standard sample. Never hard-code its size. Never invent a number:
every quoted value is computed from the data on load or carries a `src` tag in
its JSON. Values tagged `ours` are presented as our assumption, never as a
finding. Image and logo credits are read from the files the fetch scripts
wrote (`public/tracking/credits.json`, `public/telescopes/credits.json`
(a site with no free photograph may use a local one in `data/photos/` with its
credit written in `scripts/fetch_telescope_photos.py`, as for Cupillari),
`public/game/game.json`, `public/logos/credits.json`,
`public/field/CREDITS.md`), never typed. See `data/README.md` for what was
verified and what remains unverified.

### Chrome, links and filters

The intro holds only the title, Start, three part buttons, and the skin
carousel (the planet the observatory points at, an arrow either side, the name
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
