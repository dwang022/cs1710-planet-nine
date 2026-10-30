# The search for Planet Nine

CS 1710 final project — Daniel Wang, Gabriel Gonzalez, Russell Rui Luo.

A nine-page, data-grounded walkthrough of the case for a ninth planet: the
setting, the insight that a few dozen distant orbits lean the same way, and the
search that has not yet found it. Every chart is built from real telescope
catalogues; the only synthesised data is the explicitly labelled random-universe
simulation and two cartoon exhibits that say so on the page.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # static bundle into dist/
npm run preview    # serve the built bundle on :4173
```

## The pages

An intro screen (the title, a telescope aimed at Planet Nine, shooting stars, a
Start button, three part buttons, and a carousel for what the planet is made
of), then three parts, with a credits page outside the walkthrough:

| Part | Page | What it holds | Data |
|---|---|---|---|
| 1 · Background | `setting/planets.html` | Nine planets → eight → nine?: three beats, the lineup, Pluto's reclassification, the IAU's three requirements with drawings, scored on familiar objects | `planets.json` |
| | `setting/distance.html` | How far 322 to 599 AU is: a to-scale AU ruler, then a zoom-out over a map of the solar system seen from above, from the rocky planets to the farthest orbit (the extreme objects where they are, each orbit drawn on hover and all of them on one card; Planet Nine's predicted orbit) | `etnos.json`, `planets.json`, `planet_nine_predictions.json`, `positions.json` |
| | `setting/data.html` | A telescope finding an arc, with the page's numbers; a world map of every observatory that measured the extreme objects (a card per site, the one nearest you); three drawings from pictures to orbits; a tracking game on real discovery frames; Pluto, Sedna and 2015 BP519 in small blink players; every known body beyond Neptune narrowed to the 90, the 62 seen in more than one season, and the 6 that started it; how long each was watched and how well that pins its orbit | `observatories.json`, `positions.json`, `etnos.json`, `telescopes/credits.json`, `game/game.json`, `tracking/credits.json` |
| 2 · Evidence | `insights/clustering.html` | The orbits lean the same way, built up from one orbit to a compass arrow; filters for which objects count; the herding exhibit: place a planet and watch random orbits sort themselves | `etnos.json` |
| | `insights/probability.html` | Could it be luck: 4,000 fake solar systems; the sample-dependence catch; the streetlight exhibit (where telescopes looked); every paper's odds on one axis | `etnos.json`, `clustering_null.json` |
| | `insights/alternatives.html` | Eight explanations against four tests; the case against, paper by paper | `alternatives.json`, `papers.json`, `field_timeline.json` |
| 3 · The search | `search/how.html` | Sky map of coverage and depth with Planet Nine's predicted path; the searches so far and what each ruled out; put a planet out there and score it | `surveys.json`, `p9_sky_track.json`, `etno_perihelion_sky.json`, `planet_nine_predictions.json`, `field_timeline.json`, `papers.json` |
| | `search/timeline.html` | Ten years of argument in a compact ledger; how the proposed planet changed | `field_timeline.json`, `papers.json`, `planet_nine_predictions.json` |
| | `search/future.html` | Survey depths vs predicted brightness; what to watch; when we might know; what would confirm or end it | `surveys.json`, `planet_nine_predictions.json`, `field_timeline.json` |

The Planet Nine drawing comes in seven skins (ice giant, rock world,
ocean world, iron world, primordial black hole, cheese, nine-ball). The reader
picks one on the intro screen; every page draws the planet that way, and
everything that stands for it, down to the words "Planet Nine", takes that
skin's colour.

How the site is written and coloured (plain science communication, one
meaning per accent, Planet Nine in the skin's colour, no rings or glows) is
set out in `CLAUDE.md`, along with how to verify a change.

## The thing worth demoing

On the probability page, switch off **"Only objects seen in more than one
season"** (the papers' own rule). The sample jumps from 62 objects to 90, the
alignment collapses from 0.25 to 0.08, and the verdict flips from *"Suggestive"*
(about 1 in 49) to *"Looks like luck"* (about 1 in 2). Raise the distance cut to
the classic 250 AU and even the trusted sample looks like luck. The conclusion depends on a choice the
analyst makes, which is the honest state of this field. Then run the streetlight
exhibit beneath it to see how uneven sky coverage alone can bunch what a survey
finds.

## Accuracy

- Orbital maths verified against **JPL Horizons** on four real objects:
  agreement 2.5″–4.5″.
- The live p-value uses the Rayleigh test, checked against a 200,000-trial
  Monte Carlo at every sample cut: agreement within 5%.
- Brightness model reproduces its Linder & Mordasini (2016) anchor exactly, and
  independently lands Batygin & Brown's 2016 orbit at V = 22.4, inside their
  published 22 < V < 25.
- Every paper summary was checked against the paper's own abstract; the ledger
  rows retell those summaries and link to the paper.
- The discovery photographs and the IAU's mark are Wikimedia Commons files
  with their licences read from the Commons API (`public/tracking/credits.json`,
  `public/logos/credits.json`); the credits page lists them.
- The herding and streetlight exhibits are cartoons of a mechanism, labelled
  as such on the page; nothing in them is presented as a measurement.

Full provenance in [`data/SOURCES.md`](data/SOURCES.md); corrections and
remaining unverified claims in [`data/README.md`](data/README.md).

## Layout

See [`CLAUDE.md`](CLAUDE.md) for the full map and the conventions. In short:

```
index.html, setting/, insights/, search/   the ten pages (one Vite entry each); credits.html outside the walkthrough
src/site.js        shared chrome: sprite, skin, nav, footer; PAGES is the page list
src/pages/         one module per page
src/charts/        one module per visualisation; rulesart.js draws the three requirements
src/art.js         the hand-drawn bodies; src/skins.js the Planet Nine skins
src/sample.js      which extreme objects count (shared between the insight pages)
public/data/       the processed datasets the pages fetch
public/art/        the drawings as SVG/PNG, with a contact sheet (node scripts/export_art.mjs)
public/tracking/   the real discovery frames (python -P scripts/fetch_tracking_images.py)
public/field/      portraits for the ledger (python -P scripts/fetch_portraits.py)
public/logos/      the IAU's mark with its credit (python -P scripts/fetch_logos.py)
data/, scripts/    the datasets and the Python pipeline that builds them
papers/            index of every paper read (PDFs gitignored)
docs/              the sketches PDF and exploration figures
prototypes/        the week-9 coordinated-view prototypes (separate app)
```

Rebuild the datasets from source with `./scripts/fetch_all.sh`. The raw
catalogue downloads also live in the team's analysis folder beside this repo
(`../FinalProject/data/raw`), which `scripts/build_catalogue_samples.py` reads.
