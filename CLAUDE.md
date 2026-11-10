# The search for Planet Nine

CS 1710 (Harvard, data visualization) final project by Daniel Wang, Gabriel
Gonzalez and Russell Rui Luo. A multi-page, data-grounded walkthrough of the
case for a ninth planet: every chart is built from real telescope catalogues;
the only synthetic data is the explicitly labelled random-universe simulation
and the cartoon on the clustering page (no planet beside a planet), which says so on the page.

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
| `index.html` | `pages/intro.js` | Title, an observatory aimed at Planet Nine, shooting stars, Start, the three parts as words under it in their hues (“or skip to”; buttons beside Start read as three starts), the skin carousel on the planet (arrows either side, name beneath) |
| `setting/planets.html` | `pages/planets.js` | Three beats, lineup scrolly (9 → 8 → 9?) with the count as a numbered bead on each orbit under the names, the last one large in the count's colour (Pluto's 9 goes as Pluto drops below the row, the ninth is “9?”), Pluto's reclassification with the sad-face callout, the three requirements with drawings (`charts/rulesart.js`) and the scorecard table |
| `setting/distance.html` | `pages/distance.js` | Head with Planet Nine's distance (computed on load), the question on its own line, and a to-scale Sun-to-Earth ruler for the AU (`charts/auruler.js`); zoom-out scrolly over a map seen from above, everything where it was in June 2026: the planets on their orbits, each labelled with its distance in AU under its name (over it when the space below is taken), the Kuiper belt as a faint ring filled with dots for its icy bodies (decoration, not data; they fade out when the evidence arrives), Voyager 1 (`positions.json`), the extreme objects seen in more than one year as dots (pointing at one draws its orbit and writes how far it is now beside it and its farthest at the far end; one card shows all the orbits), Planet Nine's best-fit orbit with its icon, and the uncertainty band; on the last card, as the camera arrives, the sky fills with dim stars (decoration, not data), the Sun turns from its drawing into one small star among them, and every object but the farthest fades away |
| `setting/data.html` | `pages/data.js` | Head graphic of an observatory finding an arc, the full width of the page and behind the title on a wide screen, the page's three numbers written beside what they count (no boxes; along the arc for the positions), smaller observatories further along the horizon each looking at an earlier position, stars kept clear of the drawing, shooting stars now and then (`charts/datahero.js`, `meteors.js`); below 840 px it stacks with the numbers in a row; a titled world map of every observatory, cut to the latitudes between 72°N and 56°S and never taller than the screen, with country borders and insets laid over empty sea and land (Hawaiʻi above the islands in the North Pacific, the Southwest US in the South Pacific clear of Central America, Europe over Africa, Northern Chile in the South Atlantic; on the world map an inset's sites are thin, faint white rings, all one size (a place, not a value), inside an outline that marks what the inset enlarges; a ring and its dot in the inset light up together and clicking a ring opens the site's card; one square-root size scale on the map, in the insets and in the key; every other site, on the world map and in the insets, is nudged a pixel or two so none overlap; Europe's inset and Rubin's note share one column), the key compact (circles on a line, values under them, each scale's name under those), the map in Earth's own dark colours (navy sea, green-grey land), each site a sand disc sized by “positions measured” with a violet core sized by “objects discovered” there (readers mixed up “positions” and “found here”; two scales in the key), Rubin's dot like the rest with its name in pink in a callout saying it found every extreme object discovered since it opened (counted on load), a card per site that opens on pointing (readers did not click) and stays while the pointer is on the dot or the card, a click keeping it (the photograph of its busiest telescope, every site that found an object has one, or the observatory drawing where no free photograph exists; numbers; the names of the objects discovered there; no list of a summit's telescopes), Hubble as a small card in the top corner, under it on the map a “Near me” pill as wide as Hubble's and lined up with it, a pulsing map pin and the word centred in it (“Locating…” while it asks) (no privacy note on the page; the code says the location never leaves the browser) (`charts/scopes.js`); three drawings from pictures to orbits, the first two night frames side by side with the same stars and one dot moved (“A dot that moves is much closer.”) (`charts/orbitart.js`); the tracking game on real archive frames spanning a few nights (four rounds; the object crosses a quarter to half the frame; one round in colour), the round buttons headed “Level” (bare numbers confused readers), the hard ones set apart; the first two (the brightest) “Easy · path shown” with a lane of two dashed rails either side of the track, never over it, the last two “Hard · no path shown”, controls on the image, every play starting with the arrow on the object, the picture asking for the click without words when the frames stop (its edge pulses, a tapping pointer in the bar, then Submit pulses), the reveal ringing each stop rather than covering it (`charts/spotgame.js`); three more discoveries in a row; JPL's catalogue (only JPL is named there; its logo on the right in white, `public/logos/jpl-mono.svg`), every known body beyond Neptune on a map that fits one screen, centred and only as wide as the query panel and the square map beside it, with the panel on it (known objects beyond Neptune › with extreme orbits › and reliable orbits › that first pointed to Planet Nine; choosing a row runs the query to it, its definition beneath; the orbits toggle in the panel) (`charts/catalogue.js`, `pages/data.js`); what makes an orbit reliable, one line (every year an object is seen again its orbit is known better; like earlier studies we count those seen in more than one year), then how long each extreme object was watched against how uncertain its far end is, the key drawn in the chart over the columns it explains (a sample row labelled only “one night”, “first” and “latest”; a colour bar from “precise” to “rough”), the whole section, title, line and chart, on one screen (`--arc-head` measured in `pages/data.js`), the groups named on the chart with how long they were watched (years, months), the uncertainty dim grey to bright ember and thicker as it grows with the column past 10% faintly ember, the objects with no estimate yet as one hatched block with the words on it, the chart never taller than the screen and its axes at head and foot (`charts/arcs.js`) |
| `insights/clustering.html` | `pages/clustering.js` | The Evidence part's opening picture beside the title: the giant planets' rings, the six orbits that first pointed to Planet Nine drawing in round them (real elements, distances square-rooted), then Planet Nine's orbit on the far side (`charts/leanhead.js`); three drawings of what an orbit is: a planet's near-circle, then Sedna's real orbit as an oval and its direction (`charts/orbitintro.js`); lean scrolly in seven steps (Sedna and why it matters → compass → arrow and alignment, with a guide to the circle, ending on “What could line them up?” → the proposed planet's predicted orbit, by Batygin and Brown), always the trusted sample, with a key drawn above it and a card per object that opens on pointing (as the map's cards) and stays on a click; a collapsed table of every number; “How a planet would line them up” (`charts/compare.js`), its intro saying what the planet does to the orbits: two pictures drawn like the head, No planet and With a planet, four billion years in one run: without the planet the sixteen make-believe orbits stay scattered; with it, the planet goes round its orbit and each orbit lined up with it is caught when the planet passes (a flash where they meet, the object shoots off past the edge along a dotted trail, its orbit fades, a count on the bar), while the ones pointing the opposite way stay and settle opposite it; one survivor whose path crosses the planet's is drawn bolder in violet (white means flung), its crossings ringed and its object going round in step with the planet, so it is elsewhere whenever the planet reaches a crossing. The explanation is pop-ups on the pictures, a sentence each, the run pausing on each until Continue (what the lines are and Start; the first object flung away, caught alone; the survivor in step, paused when the planet sits on a crossing; at the end, what is left and the picture with no planet); Play again runs straight through. Under it a key, one neutral line handing the question to the next pages, the cartoon caption and “How the cartoon works” folded below (where flung objects go, the resonances). It replaced the herding exhibit, the scrolly's filters and a find-the-planet game, which were too hard for a general reader to learn from |
| `insights/probability.html` | `pages/probability.js` | Title, a lede with the real arrow's reach, and the question, beside one compass that sets the question (`charts/luckhead.js`: a few random skies with short arrows, then the real sky with its longer one, on a loop); luck walkthrough in five steps (`charts/luck.js`: what randomness looks like, one simulated solar system (“simulated”, never “fake”), then simulated solar systems dropping onto the pile one after another (quickly), the whole 200,000-trial pile, the real arrow in its tail with the odds as the card's bold line, adding the objects seen once), its piles and odds read from the stored simulations; “Where you draw the line”, the distance cut-offs as a chart of their own drawn like the odds chart (`charts/cuts.js`; it was the scrolly's last step until 2026-11-07); “What the studies conclude”, its intro naming where telescopes looked in one sentence (a section on the biases was tried and cut: the Alternatives page and the search page's sky map explain them): one odds chart (`charts/odds.js`), one line per row (authors, a short count in grey from `count` in `published_odds.json`), grouped by whether each allows for where telescopes looked (`allows_for_looking`), our test for the trusted sample and every object in the first group, read from `published_odds.json` and `clustering_null.json`; no caption under it. The reader filters, the shuffle-it-yourself version and the streetlight exhibit were cut |
| `insights/alternatives.html` | `pages/alternatives.js` | Title and lede beside the stage (`charts/althead.js`: the six bunched orbits, fitted by their own extent, and round them each explanation's mark and short name appearing one by one, quickly); “What any explanation must fit”, the four clues as a `.definition.four` row, a drawing each (`charts/clueart.js`: the six orbits, Sedna clear of Neptune's ring, a tilted orbit seen edge-on, an empty search spot on the predicted path) and the `plain` line from `alternatives.json`, since two of them appear nowhere earlier; “Each idea against the clues” (no counts in titles: the number of ideas and clues is our choice): the scorecard (Explains it, Partly, Doesn't) with a clue filter on it (`charts/matrix.js`: the clue column heads are the toggles, a tick box over each name, “Click a clue →” under “The idea” until the first press; an idea that does not explain a required clue fades, a partial one stays; a count “3 fit” in the last head; a chip row above the table was tried and cut as one band too many), the key under the table, each row opening in place with a drawing and a few short sentences; an easter egg: with the black-hole skin, opening the black hole's row sends every other idea's drawing and marks spiralling into it and back, and “Your pick” under its name; closes the Evidence part. The ledger of the case against was cut: each open row already says where its idea stands, and the timeline holds every paper |
| `search/how.html` | `pages/search.js` | Sky-map scrolly (coverage → depth → Rubin), search stats, ledger of searches, put-a-planet-out-there |
| `search/timeline.html` | `pages/timeline.js` | Compact ledger of every major paper under a header pinned below the nav (← For a planet, Data and searches, Against a planet →): for rows hug the left, against rows the right (30% clear of the other side), data and searches full width; how the proposed planet changed |
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
  sample.js      which extreme objects count: the fixed STRICT/LOOSE samples, selected(), withAlignment()
  scrolly.js     pinned-graphic scrollytelling (step activation, continuous progress)
  stats.js       circular statistics: resultant length, Rayleigh test, Monte Carlo null
  orbits.js      Keplerian geometry, verified against JPL Horizons; PLANET_NINE elements
  highlight.js   one object highlighted across every chart on a page
  motion.js      eased number tweens
  meteors.js     shooting stars, on the intro and the data page's head
  pages/         one module per page
  charts/        one module per visualisation (see headers); field.js is the ledger, fieldart.js its drawings,
                 compare.js (no planet beside a planet) the cartoon, shuffle.js the luck test, tracking.js the blink players, datahero.js,
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
  "So far" box on any page (all cut on 2026-11-07). Group names drop "the" where
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
- **Papers are cited by superscript.** No formal citations in running text or
  captions (researchers may be named where the claim rests on who made it, above); a
  `<sup class="cite"><a href="/credits.html#cite-brown-batygin-2019">1</a></sup>`
  leads to the paper in the credits page's list. The anchor is `cite-` plus the
  paper's `label` in `papers.json`, lowercased and hyphenated. Chart rows that
  are themselves about a paper (the odds chart, the ledger) keep its label.
- **Messages in interactions are a word or two.** "Found", "Missed", a
  count; never a sentence that explains what the picture already shows.
  A verdict (`.verdict`, with `for` or `against`) is a bold word or two and
  the odds.
- **Plain, not childish.** Decided with the user on 2026-10-31 for the
  Evidence part: a general adult reader with no astronomy should follow every
  part, without the page talking down. One idea per picture, the fewest
  controls that let the reader do the thing, explanation as short pop-ups on
  the picture at the moment it matters (pausing an animation until Continue)
  rather than paragraphs under it, plain words over jargon (“allowing for
  where telescopes looked”, not “bias correction”). A walkthrough that builds
  a chart in front of the reader (the luck pile) is kept over a do-it-yourself
  toy. Name the researchers where a claim rests on who made it (“Brown and
  Batygin still find…”, the odds chart's rows), never “the same team” or “the
  planet's supporters”. Cut an exhibit that is clever but teaches little. Stay
  neutral: show what an idea predicts, not which side is right.
- **Controls sit on the image they control**: play and pause, the date of a
  frame, levels, replay, submit, the comparison's play button, the shuffle buttons.
  Use `.pic` on the panel and `.pic-bar` for the strip of controls along its
  foot (`.pic-btn`, `.pic-time`; `.pic-note` for a word or two on the picture);
  on a phone the bar drops under the picture. Details open on pointing in a card
  that stays while the pointer is on the object or the card; a click keeps it
  until its close button (or Escape). Decided with the user on 2026-11-07 after
  readers did not think to click: first the data page's map, then `.pick-card`
  on the clustering page.
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
| The case for a planet (ledger lane, verdicts, "past the usual bar", the odds chart's "for" side, a good fit) | Planet Nine's colour (it follows the skin; a fixed green was tried on 2026-10-31 and reverted) | `--for` (= `--p9`), `.k-for`, `--fl-for` |
| Each planet | its own flat colour, lifted from its drawing in `art.js` for text: its name wherever written, its chart labels | `--c-earth` …, `.pl-name`, `text[data-planet]` |
| The Sun | gold, its name too | `--sun` |
| Distances in AU | **gold, number and unit together** (`150 AU`), the Sun's colour: a distance is measured from the Sun. A gradient on every number was tried and found distracting; the Sun-to-Earth idea lives on the ruler that defines the AU (distance page head), gold at the Sun to blue at Earth. Scale bars are gold | `--au`, `.k-au`, `.au`; `--au` → `--au-2` on the AU ruler |
| The distant objects | violet, and nothing else | `--series-1` |
| The case against, a warning, a miss, an uncertain orbit (dim grey to bright ember as it grows, on the data page's arcs chart) | ember | `--series-2` |
| The three parts: their names in the top bar, the intro's part links, the Continue button's part when the next page opens a new part | light blue, lavender, teal (a teammate's choice) | `--part-background`, `--part-evidence`, `--part-search` |
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
more than one year" on the page, never “season”, which readers did not know; `well_determined` in `etnos.json`, set by
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

The intro holds only the title, Start, the three parts as words under it, and the skin
carousel (the planet the observatory points at, an arrow either side, the name
beneath). The footer is one Continue button naming the next page (“Next”, its part in the
part's hue when it opens a new part) and ending in a round white arrow, with the
credits link in its corner and no colophon. Keeping on scrolling at a page's foot
opens the next page (`pullOn` in `site.js`): only scrolling that starts once the page
has come to rest there counts, a bar along the button fills as the reader goes on and
drains if they stop, and the page changes only when it is full; keys never trigger it; credits live on `credits.html`, outside the
walkthrough. Write root-relative hrefs (`/setting/planets.html`); `site.js`
rewrites them if `BASE_URL` is not `/`. Data and asset URLs go through
`url()` in `data.js`. The reader never picks which objects count: every page
uses the fixed STRICT sample (as the papers do) or, where it says so, LOOSE
(`sample.js`), so quoted numbers never move. A filter panel was tried and cut:
a general reader learned nothing from it.

## Verifying a change

Build, serve with `npm run preview`, and screenshot with headless Chrome over
the DevTools protocol (Node 24 has a global WebSocket); a ~1360×900 viewport
and `Page.captureScreenshot` with a clip. Add `is-active` to `.step` and
`is-in` to `.fr` before capturing so revealed content is visible. Plain
`--screenshot` with a tall window is useless: scrolly steps are sized in `vh`.
