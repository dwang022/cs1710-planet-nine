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
| 02 | **DW1** — the evidence | 90 extreme orbits from above, plus the same objects reduced to one angle each | `etnos.json` |
| 03 | **RL3** — is it luck? | Observed alignment against 4,000 random universes, recomputed live | `clustering_null.json` |
| 04 | **DW5** — where telescopes look | Mollweide all-sky map: survey footprints, Planet Nine's predicted path, each object's perihelion direction | `surveys.json`, `p9_sky_track.json`, `etno_perihelion_sky.json` |
| 05 | **Put a planet anywhere** + physical properties | Place your own planet; scored on three cited criteria, with size/temperature/brightness derived | `planet_nine_predictions.json` |
| 06 | **GG8** — what else explains it | Eight hypotheses against the four things any of them must account for | `alternatives.json` |
| 07 | **RL5** — who supports it | 25 papers by year and stance, sized by citations | `papers.json` |

Four controls at the top drive every panel at once: how far out the orbit goes,
closest approach, an orbit-quality filter, and Planet Nine on/off.

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
  charts/           one module per visualisation
public/data/        the processed datasets the page fetches
scripts/            the Python pipeline that builds those datasets
```

Rebuild the datasets from source with `./scripts/fetch_all.sh`.
