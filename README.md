# The Evidence for Planet Nine

CS 1710 final project — Daniel Wang, Gabriel Gonzalez, Russell Rui Luo.

An interactive, data-grounded walkthrough of the case for a ninth planet.
Every chart is built from real telescope catalogues; nothing is synthesised
except the explicitly-labelled random-universe simulation in section 03.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # static bundle into dist/
npm run preview    # serve the built bundle on :4173
```

## What's on the page

The six sketches chosen in the Decide section of the process book:

| § | Sketch | What it shows | Data |
|---|---|---|---|
| 00 | — | Introduction: the nine planets, Pluto's 2006 reclassification, and a proposed ninth; the IAU's three conditions scored on familiar objects; a scroll-driven zoom-out from Earth to the farthest well-measured object | `planets.json`, `etnos.json` |
| 02 | **DW1** — the evidence | 90 extreme orbits from above, plus the same objects reduced to one angle each | `etnos.json` |
| 03 | **RL3** — is it luck? | Observed alignment against 4,000 random universes, recomputed live | `clustering_null.json` |
| 04 | **DW5** — where telescopes look | Mollweide all-sky map: survey footprints, Planet Nine's predicted path, each object's perihelion direction | `surveys.json`, `p9_sky_track.json`, `etno_perihelion_sky.json` |
| 05 | **Put a planet anywhere** + physical properties | Place your own planet; scored on three cited criteria, with size/temperature/brightness derived | `planet_nine_predictions.json` |
| 06 | **GG8** — what else explains it | Eight hypotheses against the four things any of them must account for | `alternatives.json` |
| 07 | **RL5** — who supports it | A ledger: one full-width row per paper, year by year, each a one-line claim with a small drawing of the point (aligned orbits, a tilted orbit, the fraction of the predicted planet a search ruled out). Rows for a planet open from the left in green, rows against from the right in orange; data and searches are boxed in blue and branch toward the side their authors favour; key papers are larger; what comes next sits at the bottom | `field_timeline.json`, `papers.json` |

Four controls at the top drive every panel at once: how far out the orbit goes,
closest approach, an orbit-quality filter, and Planet Nine on/off.

The zoom-out in Section 00 draws the default sample (well-measured orbits
only) and does not follow the filters, since it comes before them.

## The thing worth demoing

Switch off **"Only well-measured orbits"**. The sample jumps from 44 objects to
90, alignment collapses from 0.332 to 0.082, and the verdict flips from
*"luck is a poor explanation"* (1 in 137) to *"this is exactly what luck looks
like"* (1 in 2). The conclusion depends on a choice the analyst makes — which is
the honest state of this field, and the whole point of the page.

## Accuracy

- Orbital maths verified against **JPL Horizons** on four real objects:
  agreement 2.5″–4.5″.
- The live p-value uses the Rayleigh test, checked against a 200,000-trial
  Monte Carlo at every sample cut: agreement within 5%.
- Brightness model reproduces its Linder & Mordasini (2016) anchor exactly, and
  independently lands Batygin & Brown's 2016 orbit at V = 22.4, inside their
  published 22 < V < 25.
- Every paper summary was checked against the paper's own abstract.
- Section 07's cards retell those summaries in plain language and link to the
  paper; the 2026 entries link to Rubin Observatory's own announcements.

Full provenance in [`data/SOURCES.md`](data/SOURCES.md); corrections and
remaining unverified claims in [`data/README.md`](data/README.md).

## Layout

```
index.html          page structure and copy
src/
  main.js           state, wiring, all panel rendering
  stats.js          circular statistics (resultant length, Rayleigh, Monte Carlo)
  orbits.js         Keplerian geometry, verified against Horizons
  style.css         design tokens; validated colourblind-safe palette
  field.css         section 07's timeline (loaded by charts/field.js)
  art.js            the hand-drawn bodies: Planet Nine logo, Sun, planets, TNOs
  charts/           one module per visualisation (lineup.js and distance.js
                    are the two scroll-driven openers; field.js is section 07's ledger,
                    fieldart.js its small diagrams and lane icons)
public/data/        the processed datasets the page fetches
public/art/         the same drawings as standalone SVG and PNG files, with a
                    contact sheet at /art/ (rebuild: node scripts/export_art.mjs)
public/field/       the section 07 photos, cropped square from Wikimedia Commons
                    by scripts/fetch_portraits.py, with their licences in CREDITS.md
scripts/            the Python pipeline that builds those datasets
papers/             every paper the site cites: README.md is the generated index of
                    links, access and which PDFs are on disk; the PDFs themselves
                    are ignored by git (scripts/build_paper_index.py --fetch gets
                    the open-access ones)
```

Rebuild the datasets from source with `./scripts/fetch_all.sh`.
