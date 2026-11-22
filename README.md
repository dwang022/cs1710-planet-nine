# The search for Planet Nine

CS 1710 final project by Daniel Wang, Gabriel Gonzalez and Russell Rui Luo.

A guided, interactive walkthrough of the case for a ninth planet beyond Neptune: what the clue is, how strong it is,
what else could explain it, and how astronomers are searching. Every chart is built from real telescope catalogues
and published papers. The only simulated pictures are labelled as such on the page.

- **Website:** https://dwang022.github.io/cs1710-planet-nine/
- **Screencast:** _add the video link here_

## Run it

You need [Node.js](https://nodejs.org/) 20.19 or newer (22.12+ recommended).

```bash
npm install
npm run dev        # http://localhost:5173, reloads as you edit
npm run build      # the static site, into dist/
npm run preview    # serve dist/ on http://localhost:4173
npm run serve      # serve dist/ and the vote's back end together on http://localhost:8080
```

The site is static apart from one question on the last page ("Do you think Planet Nine exists?"):

- Locally, `npm run dev` and `npm run preview` store the answers with a small Node back end, `server/poll.mjs`.
- On GitHub Pages the answers go to a Google Sheet through a small Apps Script, `server/google-sheet-poll.gs`. Its setup
  steps are at the top of that file.

**Deploying.** Every push to `main` builds the site and publishes it to GitHub Pages (`.github/workflows/pages.yml`).
The workflow reads the Apps Script's address from the repository variable `POLL_URL`.

**Rebuilding the data** is optional, since the processed data is committed. To rebuild it from the original
catalogues, run `./scripts/fetch_all.sh`. It needs network access and Python 3 (standard library only).

## Libraries

**The website**
- [D3](https://d3js.org/) 7.9: every chart and drawing
- [Vite](https://vite.dev/) 7: dev server and build
- [topojson-client](https://github.com/topojson/topojson-client) 3.1 and
  [world-atlas](https://github.com/topojson/world-atlas) 2.0: the world map of observatories on the data page
- [Fontsource](https://fontsource.org/): Space Grotesk and Space Mono, bundled so every device draws the same letters

**The Python scripts** use the standard library, with these exceptions:
- [Pillow](https://python-pillow.org/): the four image fetchers (`fetch_portraits.py`, `fetch_tracking_images.py`,
  `fetch_telescope_photos.py`, `fetch_game_sequences.py`)
- [fontTools](https://github.com/fonttools/fonttools): `build_glyphs.py`
- pandas, NumPy and Matplotlib: the exploration plots in `scripts/exploration/`

Everything else is our own code: the charts, the drawings of the planets and observatories, the orbital mechanics (checked
against JPL Horizons) and the statistics.

## Data

| Where | What |
|---|---|
| [`data/DATA_DICTIONARY.md`](data/DATA_DICTIONARY.md) | Every dataset: what it is, how it is built, which page uses it, and what each field means |
| [`data/README.md`](data/README.md) | How each dataset was built and checked, errors found and fixed, and what remains unverified |
| [`data/SOURCES.md`](data/SOURCES.md) | Every source: catalogues, papers, images |
| `data/processed/` | Every processed dataset |
| `public/data/` | Copies of the datasets the site loads |
| [`papers/README.md`](papers/README.md) | Index of the papers we read (the PDFs are not committed) |

The main sources:
- The [JPL Small-Body Database](https://ssd.jpl.nasa.gov/tools/sbdb_query.html) and the
  [Minor Planet Center](https://www.minorplanetcenter.net/) catalogues of distant objects
- The Minor Planet Center's observation records
- The published papers on Planet Nine and its alternatives, from 2014 to 2026

The raw catalogue downloads (about 80 MB) are not committed. `./scripts/fetch_all.sh` downloads them into `data/raw/`.

## The pages

Ten pages in three parts, plus a credits page:

| Part | Page | Module | What it shows |
|---|---|---|---|
| | `index.html` | `src/pages/intro.js` | Title, Start, and a choice of what Planet Nine looks like, used on every page |
| Background | `setting/planets.html` | `planets.js` | Nine planets, then eight, then maybe nine: how Pluto lost its place and what a planet is |
| | `setting/distance.html` | `distance.js` | How far out Planet Nine would be, zooming out over the solar system |
| | `setting/data.html` | `data.js` | Where the data comes from: the observatories, how a moving dot becomes an orbit, a tracking game on real photographs, and the catalogue narrowed to the objects that matter |
| Evidence | `insights/clustering.html` | `clustering.js` | The clue: the most distant orbits stretch out and tilt the same way, and how a planet could cause it |
| | `insights/probability.html` | `probability.js` | Could it be luck? The 2016 test rebuilt with 100,000 random samples, then rerun on today's orbits |
| | `insights/alternatives.html` | `alternatives.js` | Planet Nine and seven other explanations, compared side by side |
| The search | `search/how.html` | `search.js` | The searches so far, where telescopes have looked, and a game to spot the planet |
| | `search/timeline.html` | `timeline.js` | The debate year by year, and how the proposed planet has changed |
| | `search/future.html` | `future.js` | The Rubin Observatory's survey, other searches, and the reader's vote |
| | `credits.html` | `credits.js` | Every paper, dataset, image and library credited |

## Code layout

```
index.html, setting/, insights/, search/, credits.html   one HTML file per page
src/
  site.js, site.css    shared chrome: top bar, footer, page head; PAGES is the list of pages
  style.css            colours, type and the shared components
  pages/               one module per page
  charts/              one module per chart or drawing (each file starts with a comment saying what it draws)
  art.js, skins.js     the hand-drawn bodies, and the seven looks for Planet Nine
  orbits.js, stats.js  orbital geometry and circular statistics
  data.js              loads public/data/*.json
public/                data, images and credits the site serves
data/                  processed datasets and their documentation
scripts/               the Python pipeline that fetches and builds the data; scripts/exploration/ holds early plots
server/                the vote's back ends (Node locally, Google Apps Script on GitHub Pages)
docs/                  the design sketches and exploration figures
prototypes/            the week-9 prototypes (a separate app)
.github/workflows/     the GitHub Pages deploy
```

[`CLAUDE.md`](CLAUDE.md) holds the detailed design notes: every page section by section, and the writing, colour and
type conventions.
