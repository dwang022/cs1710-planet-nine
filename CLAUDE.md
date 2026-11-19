# The search for Planet Nine

CS 1710 (Harvard, data visualization) final project by Daniel Wang, Gabriel
Gonzalez and Russell Rui Luo. A multi-page, data-grounded walkthrough of the
case for a ninth planet: every chart is built from real telescope catalogues;
the only synthetic data is the explicitly labelled random-universe simulation
and the cartoon on the clustering page (no planet beside a planet); the page stopped calling its orbits made-up on 2026-11-16, at the user's request.

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
| `setting/planets.html` | `pages/planets.js` | Three beats, lineup scrolly (9 → 8 → 9?) with the count as a numbered bead on each orbit under the names, the last one large in the count's colour (Pluto's 9 goes as Pluto drops below the row, the ninth is “9?”), each body's pointer card a fact with no distance (the distance page has those), Pluto's reclassification with the sad-face callout, the three requirements with drawings (`charts/rulesart.js`) and the scorecard table (each object drawn large beside its name, one screen tall even at 1366×768, 2026-11-16) |
| `setting/distance.html` | `pages/distance.js` | Head with Planet Nine's distance (computed on load), the question on its own line, and a to-scale Sun-to-Earth ruler for the AU (`charts/auruler.js`); zoom-out scrolly over a map seen from above, everything where it was in June 2026: the planets on their orbits, each labelled with its distance in AU under its name (over it when the space below is taken), the Kuiper belt as a faint ring filled with dots for its icy bodies (decoration, not data; they fade out when the evidence arrives), Voyager 1 (`positions.json`), the extreme objects seen in more than one year as dots (pointing at one draws its orbit and writes how far it is now beside it and its farthest at the far end; one card shows all the orbits), Planet Nine's best-fit orbit with its icon, and the uncertainty band; on the last card, as the camera arrives, the sky fills with dim stars (decoration, not data), the Sun turns from its drawing into one small star among them, and every object but the farthest fades away |
| `setting/data.html` | `pages/data.js` | Head graphic of an observatory finding an arc, the full width of the page and behind the title on a wide screen, the page's three numbers written beside what they count (no boxes; along the arc for the positions), smaller observatories further along the horizon each looking at an earlier position, stars kept clear of the drawing, shooting stars now and then (`charts/datahero.js`, `meteors.js`); below 840 px it stacks with the numbers in a row; a titled world map of every observatory, cut to the latitudes between 72°N and 56°S and never taller than the screen, with country borders and insets laid over empty sea and land (Hawaiʻi above the islands in the North Pacific, the Southwest US in the South Pacific clear of Central America, Europe over Africa, Northern Chile in the South Atlantic; on the world map an inset's sites are thin, faint white rings, all one size (a place, not a value), inside an outline that marks what the inset enlarges; a ring and its dot in the inset light up together and clicking a ring opens the site's card; one square-root size scale on the map, in the insets and in the key; every other site, on the world map and in the insets, is nudged a pixel or two so none overlap; Europe's inset and Rubin's note share one column), the key compact (circles on a line, values under them, each scale's name under those), the map in Earth's own dark colours (navy sea, green-grey land), each site a sand disc sized by “positions measured” with a violet core sized by “objects discovered” there (readers mixed up “positions” and “found here”; two scales in the key), Rubin's dot like the rest with its name in pink in a callout saying it found every extreme object discovered since it opened (counted on load), a card per site that opens on pointing (readers did not click) and stays while the pointer is on the dot or the card, a click keeping it (the photograph of its busiest telescope, every site that found an object has one, or the observatory drawing where no free photograph exists; numbers; the names of the objects discovered there; no list of a summit's telescopes), Hubble as a small card in the top corner, under it on the map a “Near me” pill as wide as Hubble's and lined up with it, a pulsing map pin and the word centred in it (“Locating…” while it asks) (no privacy note on the page; the code says the location never leaves the browser) (`charts/scopes.js`); three drawings from pictures to orbits, the first two night frames side by side with the same stars and one dot moved (“A dot that moves is much closer.”) (`charts/orbitart.js`); the tracking game on real archive frames spanning a few nights (four rounds; the object crosses a quarter to half the frame; one round in colour), the round buttons headed “Level” (bare numbers confused readers), the hard ones set apart; the first two (the brightest) “Easy · path shown” with a lane of two dashed rails either side of the track, never over it, the last two “Hard · no path shown”, controls on the image, every play starting with the arrow on the object, the picture asking for the click without words when the frames stop (its edge pulses, a tapping pointer in the bar, then Submit pulses), the reveal ringing each stop rather than covering it (`charts/spotgame.js`); three more discoveries in a row; JPL's catalogue (only JPL is named there; its logo on the right in white, `public/logos/jpl-mono.svg`), every known body beyond Neptune on a map that fits one screen, centred and only as wide as the query panel and the square map beside it, with the panel on it (known objects beyond Neptune › with extreme orbits › and reliable orbits › that first pointed to Planet Nine; choosing a row runs the query to it, its definition beneath; the orbits toggle in the panel) (`charts/catalogue.js`, `pages/data.js`); what makes an orbit reliable, one line (every year an object is seen again its orbit is known better; like earlier studies we count those seen in more than one year), then how long each extreme object was watched against how uncertain its far end is, the key drawn in the chart over the columns it explains (a sample row labelled only “one night”, “first” and “latest”; a colour bar from “precise” to “rough”), the whole section, title, line and chart, on one screen (`--arc-head` measured in `pages/data.js`), the groups named on the chart with how long they were watched (years, months), the uncertainty dim grey to bright ember and thicker as it grows with the column past 10% faintly ember, the objects with no estimate yet as one hatched block with the words on it, the chart never taller than the screen and its axes at head and foot (`charts/arcs.js`) |
| `insights/clustering.html` | `pages/clustering.js` | The Evidence part's opening picture beside the title: the six orbits that first pointed to Planet Nine drawing in round the Sun, then Planet Nine's orbit on the far side (real elements, to scale and fitted to the orbits, 2026-11-16: square-rooted distances made Planet Nine's oval look like a circle round the Sun; at this scale the giant planets would be a dot under it, so they are not drawn), all in under three seconds, after which Planet Nine goes round its orbit at Kepler's pace for as long as the head is in view (`charts/leanhead.js`; the section of three drawings of what an orbit is, “An orbit points somewhere”, was cut on 2026-11-16 as repeating the scrolly's second step); lean scrolly in seven steps (Sedna and why it matters → compass → arrow and alignment, with a guide to the circle, ending on “What could line them up?” → the proposed planet's predicted orbit, by Batygin and Brown), always the trusted sample, with a key drawn above it and a card per object that opens on pointing (as the map's cards) and stays on a click; a collapsed table of every number; “How a planet would line them up” (`charts/compare.js`), its intro saying the planet would throw out the orbits that point its way and turn the rest (the cartoon's paper cited on it): one compact panel (2026-11-16), the picture With a planet, drawn like the head (to scale, no rings round the Sun, but Planet Nine's orbit stretched to e = 0.65 from about 0.3, a cartoon liberty taken on 2026-11-16 so the orbits pointing its way visibly run along its path and the others only cut across it; the head keeps the real shape) and no taller than the screen allows, and beside it a column with a small No planet picture and, under it, the notes, so nothing covers the drawing (on a phone the column goes under the picture); no clock and no counts (a cartoon: its years and tallies meant nothing). Without the planet the sixteen make-believe orbits stay scattered; with it, the planet goes round its orbit in two acts, so its two effects are seen apart (in reality they happen together): first the orbits lined up with it are flung, one at a time, each at a moment the planet really passes it (a flash where they meet, the object shoots off along a dotted trail that ends inside the picture, below its title, and its orbit fades), while the rest hold still; then the orbits it never meets lean in towards the far side together, each the short way and keeping half its angle from it, so none crosses another and the turn stays gentle (random targets had made them look as if they oscillated; keeping a quarter looked too drastic), with no orbit picked out, each leaving a faint dashed copy where it started and a violet curved arrow at its far end. The notes are one plain sentence each, three with a small label (Flung out, Spared, Turned round), put as likelihoods, the run pausing on each until Continue, on every run, Play again's too (watch how Planet Nine changes the orbits of these objects, and Start; the first object flung away: same-way orbits run alongside its path, so are likely to be flung out; once the last is gone: the others rarely cross its path, so are much less likely to be; the orbits a quarter of the way round; at the end, the orbits that remain lean opposite to Planet Nine's, and with no planet would still point in every direction, with Play again as the note's button; each note says one thing once). The survivor “in step” with its ringed crossings was cut on 2026-11-16, as were the key, the “Simplified, not a simulation” caption, the closing line and “How the cartoon works”. It replaced the herding exhibit, the scrolly's filters and a find-the-planet game, which were too hard for a general reader to learn from |
| `insights/probability.html` | `pages/probability.js` | Title, a lede with the real arrow's reach, and the question, beside one compass that sets the question (`charts/luckhead.js`: a few random skies with short arrows, then the real sky with its longer one, on a loop); luck walkthrough in five steps (`charts/luck.js`: what randomness looks like, one simulated solar system (“simulated”, never “fake”), then simulated solar systems dropping onto the pile one after another (quickly), the whole 200,000-trial pile, the real arrow in its tail with the odds as the card's bold line, adding the objects seen once), its piles and odds read from the stored simulations; “Where you draw the line”, the distance cut-offs as a chart of their own drawn like the odds chart (`charts/cuts.js`; it was the scrolly's last step until 2026-11-07); “What the studies conclude”, its intro naming where telescopes looked in one sentence (a section on the biases was tried and cut: the Alternatives page and the search page's sky map explain them): one odds chart (`charts/odds.js`), one line per row (authors, a short count in grey from `count` in `published_odds.json`), grouped by whether each allows for where telescopes looked (`allows_for_looking`), our test for the trusted sample and every object in the first group, read from `published_odds.json` and `clustering_null.json`; no caption under it. The reader filters, the shuffle-it-yourself version and the streetlight exhibit were cut |
| `insights/alternatives.html` | `pages/alternatives.js` | Title and lede beside the stage (`charts/althead.js`: the six bunched orbits, fitted by their own extent, and round them each explanation's mark and short name appearing one by one, quickly); “What any explanation must fit”, the four clues as a `.definition.four` row, a drawing each (`charts/clueart.js`: the six orbits, Sedna clear of Neptune's ring, a tilted orbit seen edge-on, an empty search spot on the predicted path) and the `plain` line from `alternatives.json`, since two of them appear nowhere earlier; “Each idea against the clues” (no counts in titles: the number of ideas and clues is our choice): the scorecard (Explains it, Partly, Doesn't) with a clue filter on it (`charts/matrix.js`: the clue column heads are the toggles, a tick box over each name, “Click a clue →” under “The idea” until the first press; an idea that does not explain a required clue fades, a partial one stays; a count “3 fit” in the last head; a chip row above the table was tried and cut as one band too many), the key under the table, each row opening in place with a drawing and a few short sentences; an easter egg: with the black-hole skin, opening the black hole's row sends every other idea's drawing and marks spiralling into it and back, and “Your pick” under its name; closes the Evidence part. The ledger of the case against was cut: each open row already says where its idea stands, and the timeline holds every paper |
| `search/how.html` | `pages/search.js` | Three sections in story order (2026-11-10): what the searches ruled out, where telescopes looked, then the reader's own planet. First “The searches so far”, the ledger's search rows one at a time along a line of years with Previous and Next (`charts/searchsteps.js`), with a little less air round it, laid out large (2026-11-10: rail, card and buttons one column up to 1300px, the card at least 290px tall with larger words and a drawing column up to 540px, Previous and Next on the card's edges and the count centred; styles scoped to `#searches` in style.css, since field.css's rows serve other pages); then “The photographed sky” in three stages on one pinned picture (`charts/skysearch.js`, redesigned 2026-11-09): from Earth to the sky (an observatory photographing one patch beside the sky as a sphere, which unrolls into the oval with the scroll; the celestial equator, the ecliptic), how deeply we have searched (the oval centres, then slides left as “How faint might Planet Nine be?”, the predicted path shaded by the magnitude the planet would have there, beside “How deeply have we searched?”, each survey shaded by how faint its photos reach, one projection and one magnitude scale on both; a switch on the left map tests the best fit or a smaller, darker planet inside the same fit), where it could still be hiding (the path on the right map marked deep enough or too shallow, the Milky Way, Rubin; pointing at the path marks the same point on both maps and reads out both numbers). Percentages come only from the brightness model (time spent fainter than the searches’ limit) or the papers (78%), never from the schematic survey outlines. Then the activity in two versions kept for comparison (a Version 1 / Version 2 switch above it, stored as `p9-build-version`, `?game=1|2`): put-a-planet-out-there, unchanged, and “Hide Planet Nine” (`charts/hideplanet.js`, 2026-11-09): the reader's planet (their skin, no question mark) with three dials (distance, width, albedo 0.2–0.75), its magnitude from the papers' reflected-light formula; under the dials a folded “How is brightness calculated?” (2026-11-10, shortened the same day: F ∝ A·R²/d⁴, one line naming A, R and d, d in the AU gold; a live “N× the starting brightness” and the magnitude, both from the game's own model.magnitudeR as 10^(−0.4ΔV) against the default dials; one line “Farther = fainter. Bigger or more reflective = brighter.”; it replaced the one-line rules-of-thumb note); a click on the photographed sky's map places it; a ruler sets its magnitude against the photos there, the searches' 50% limit and Rubin; three plain outcomes (Potentially detectable, Not ruled out by these observations, Insufficient survey information, never a win for missing data), no score; “Does your planet fit the orbital evidence?” folded, each line inside or outside the 2021 fit's ranges. Laid out as one screen (2026-11-09): the dashboard spans the content width (about a quarter for the planet and dials, the rest for the sky), the map's height follows the screen's (`--hp-map-h`, 240–560 px, the oval kept 2:1 and centred in its panel; select it as `.hp-map > svg`, since the key's colour ramp is also an svg in that panel), its key one click-through line along the panel's foot, its features labelled on the map itself as on the photographed sky's (2026-11-10: “Milky Way” in sand and pink “Rubin” at that map's anchors, Rubin's inside its footprint, “Predicted path” under the curve's low point with a short leader, a small grey “Your Planet Nine” under the marker that travels with it; the marker itself is the reader's own Planet Nine (the skin chosen on the intro, the same `svgMarkup` drawing as the panel's, no question mark), its body 38px across on screen over a glow whose colour gives the outcome, both drawings redrawn together on `p9:skin`; 12px on screen at any map size, a fixed label fading back while the marker sits on it), the ruler under it, then the result read as a conclusion (2026-11-10): the search status as a large verdict in its status colour with one muted sentence, under it predicted brightness and telescope sensitivity as two metrics (small capital label, large number, muted line), all in one quiet dark panel with a thin rule above the two numbers and a one-line sentence per outcome (2026-11-10); a small Reset button with a reset icon in the planet card's top-right corner beside its heading (accessible name “Reset planet”), and until the planet is first moved on the map (drag, click or arrow keys) a small pulsing “Move Me Around!” over its marker, held at about 13px whatever the map's size, taking no pointer and not read out, gone for the visit once the planet moves (Reset planet does not bring it back), grouped by space rather than rules; there is no test step or popup, the verdict is always the current planet's (2026-11-10), the assumptions folded below; it fits 1366×768 and 1920×1080 with the heading at the top, and a shorter screen scrolls |
| `search/timeline.html` | `pages/timeline.js` | The Planet Nine debate (`charts/debate.js`): the year, its headline (`debate.json`) and two counts over one mark per paper in `papers.json` from 2014 on (neutral papers not drawn): the papers for inside the reader's own Planet Nine on the left, the papers against in a faint dashed enclosure on the right that grows with them (stacked under the planet on a phone), each group a sunflower spiral in order of appearance, the labels “FOR PLANET NINE” and “AGAINST PLANET NINE” in their marks' colours on one line above both groups. A year strip below (a mark per paper, previous, next, play); a mark eases along an arc, new ones fade and grow in a beat apart, going back they fade out and the rest close up, all keyed D3 transitions that retarget mid-flight. Hover or focus previews a paper in the panel beside it, click pins it (the one place a hover shows details, asked for on 2026-11-09); unpinned, the panel lists the year's new papers. Drawn as a patch of space (asked for on 2026-11-09): a navy starfield on its own layer behind (fixed seed, a few stars twinkling), the planet the skin chosen on the intro without its question mark (drawn with `svgMarkup` from `art.js`, `question: false`, under a dark veil so the marks stay the brightest thing on it; a skin changed while the page is open, even in another tab, crossfades in through site.js's `p9:skin` event) with a soft halo, each mark with a soft halo of its colour; these glows are the one exception to the no-glows rule, which covers the drawings in art.js. Each paper is a thumb on an invisible hit circle: up for, down against, a drawn SVG shape, not an emoji (2026-11-17: the coloured-dot version and its Version 1 / Version 2 toggle were removed). The earlier orbit layout (papers against round a ring) was removed. The range's last year (2026, no paper of its own in the sample) is a finale (2026-11-10): the counts above fly diagonally into the middle of the stage, growing (one pair of flyers over the section, laid out at the final box and moved by one transform, so the stage never clips them and an interrupted flight restarts from where it is), the papers fade, a smiling face over the for total and a frowning one over the against total fade in, in the debate's for and against colours (for follows the skin), with “The evidence remains divided. The search continues.” and “Papers in our sample, 2014–2025” (computed); going back reverses it; reduced motion swaps at once. Then how the proposed planet changed, one paper at a time (`charts/proposals2.js`, 2026-11-10; the original two charts, `charts/proposals.js`, and the version switch were removed on 2026-11-17): the Sun, a ruler to 1,050 AU with the planet (the reader's skin, its size illustrative) at the paper's distance and its range shaded, a mass scale with Earth at 1 and the same Planet Nine drawing, small, at the paper's mass where it gives one value, a card (year, kind of paper, distance and mass with their ranges, a sentence on the paper and how it compares with the paper before, side by side under small labels when the card is 420 px or wider (a container query), stacked below that, its DOI on its own line at the foot; the card as tall as its content), a small overview of every paper with the chosen one lit, and a button per paper above the picture (2026-11-17; underneath it until then) (2016 and 2021 each have two; a grid as wide as the picture, four by two on a wide screen, the year large and white over the name, the chosen one tinted and edged in the planet's colour, ember for the candidate, a 2px lift on hover); a range only where the paper gives one, a range-only paper drawn at its middle and labelled so, the 2024 update's untranscribed range said to be not shown, Phan et al. 2025 in ember as a candidate whose distance is its distance now and never compared as a revision; transitions of about half a second that retarget when clicked fast, none with reduced motion. It replaced the ledger told as a story. Three versions of the section kept while the team compares them (2026-11-17; a “Version 1 · Original / Version 2 · Expanded / Version 3 · Focused” switch above its heading, version 1 on every load, `?pv=2` or `?pv=3` opens that one, nothing stored): 1 the dashboard alone; 2 a story in two parts (elements marked `data-pv` show in their version only): its own intro under the title; “Part 1 · The prediction”, “What kind of planet are scientists looking for?”, over the same dashboard (one element, never redrawn, so the chosen paper stays); a rule; “Part 2 · The evidence”, “How convincing is the evidence?”, over the probability page's “Where you draw the line” and “What the studies conclude” with their titles a level down (h4), their keys, cards and charts as on that page, drawn by the same `drawCuts` and `drawOdds` from rows `pages/timeline.js` builds exactly as `pages/probability.js` does (the SVGs checked identical at 1360, 820 and 390 px); then a takeaway edged in Planet Nine's colour. The paper chosen in part 1 is lit on the odds chart only when it is the same paper, matched by DOI (`charts/oddslink.js`: a band behind the row, its dot pulsing once, other rows at 0.62, put back after each redraw; `drawProposalsV2`'s optional `onSelect` reports the choice): Batygin & Brown 2016 and both Brown & Batygin 2021 entries; the 2019 review is not Brown & Batygin 2019 and stays unlinked; 3 (focused) as plain as version 1 on top (version 1's intro, the dashboard straight under it, no part labels or part 1 heading; its paper buttons the year alone, 46px tall, the paper's name kept for screen readers, styled under `#proposals[data-pv-on="3"]`, which pages/timeline.js sets to the version shown; the distance and mass picture on the constellation's night sky, in CSS only: its navy and two sparse tiles of faint stars, Planet Nine with a faint blue and gold drop-shadow glow, the labels' dark edge in the navy; above 900 px its card runs down to the foot of the right column, pages/timeline.js measuring the spare height against that column (never the card itself) as `--pv-extra` / `--pv-extra-u`, a quarter above the picture, half between the distance and mass scales (the mass scale is one `<g class="pv-mass">` in proposals2.js, untransformed in other versions), the note at the foot, eased over .45s as the paper changes), then a rule, “Why do scientists disagree?” with one line, a compact key of star shapes, and the Evidence Constellation (`charts/constellation.js`, 2026-11-17): the odds chart's rows (built once by `oddsRows()` in pages/timeline.js for both charts) on a navy starfield like the debate's stage, each result a four-pointed star with a halo at its “1 in N” on the same 1-to-100,000 log axis, a faint tail from the axis's start, the two groups as faint regions with their headings, the 1-in-20 bar a thin glowing line over a faint wash; under the axis, centred on it, “How likely is chance alone to explain these orbital patterns?”, and under that “More likely” and “Less likely →” at its two ends; the findings of chance (Napier, Shankman) never on the scale: after the axis and its caption, past a thin divider, under a muted “Studies finding results consistent with chance · allowing for where telescopes looked”, side by side as outlined ember stars on the sky itself (a dashed box inside the group, tried first, read as a warning); pointing, focus or a tap opens a card (name and year, what it counted from `plain_detail`, method, result, a plain line, the abstract's quote, a DOI link), a click or tap keeps it, Escape or a tap elsewhere closes it; dust twinkles and halos breathe, none with reduced motion; never linked to the chosen paper. Version 2 keeps drawOdds, and no takeaway box (removed 2026-11-17: the charts carry it); `data-pv` lists the versions an element shows in (“1 3” for version 1's intro, “2 3” for the evidence block and odds chart), the odds chart drawn the first time 2 or 3 opens and the cut-off chart the first time 2 does |
| `search/future.html` | `pages/future.js` | Brightness ruler (survey depths vs predicted magnitude), "what comes next" rows, a dated schedule, what would confirm or end it Two versions kept while the team compares them (2026-11-09; a Version 1 / Version 2 switch in the head's top-right, stored as `p9-future-version`, `?v=1|2`): Version 1 everything above, unchanged (`#futureV1` and the beats); Version 2 (`#futureV2`) a shorter ending: the three milestones straight under the page title, with no heading of their own (2026-11-10) ( each tagged Under way, Our estimate or Survey's planned end, the years from surveys.json), “The telescope that could settle it” (version 1's ruler, drawn by the same `drawDepth` with `{ detail: true }`: each survey's years from surveys.json, the axis and the band saying what they are, labels placed into free tiers so none overlap, each hung centred, left or right of its marker so no other marker stands under it (2026-11-10: names larger and bold, years and sky share smaller and quieter, the band fainter), a key and a one-line takeaway under it), “What would settle the debate?” (two cards in the debate's colours), and the vote as three planets: Yes is the reader's Planet Nine with a smile where its question mark would be (`planet-yes` in `art.js`, 2026-11-10, in the question mark's colours), No and Maybe two made-up bodies in `art.js` (`planet-no`, `planet-maybe`); nothing stored or sent, its state its own |
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
  charts/        one module per visualisation (see headers); field.js is the ledger, fieldart.js its drawings, debate.js the timeline page's debate,
                 compare.js (no planet beside a planet) the cartoon, skysearch.js the photographed sky (skymap.js keeps the projection helpers and the head's thumbnails), shuffle.js the luck test, tracking.js the blink players, datahero.js,
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
| The three parts: their names in the top bar, the intro's part links, the Continue button's part when the next page opens a new part | sky blue, rose, lime (2026-11-16: three hue families; the earlier light blue, lavender and teal all read as blue) | `--part-background`, `--part-evidence`, `--part-search` |
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
credits link in its corner and no colophon. Every page in the walkthrough has the same button, the last page's (“The end”, back to
the start) included; the credits page has none. Keeping on scrolling at a page's foot
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
