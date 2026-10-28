# Planet Nine — data

Everything the five chosen sketches need. Run `./scripts/fetch_all.sh` to rebuild
from source (network required, Python 3 stdlib only, no pip installs).

```
data/raw/         untouched downloads
data/processed/   what the site actually loads
scripts/          fetch + build
```

## Which dataset feeds which sketch

| Sketch | Files |
|---|---|
| **DW1** — What is the evidence for Planet Nine | `etnos.json`, `tnos.csv`, `planets.json`, `clustering_null.json` |
| **DW5** — Sky view: where do telescopes look | `surveys.json`, `p9_sky_track.json`, `etno_perihelion_sky.json` |
| **RL3** — How likely everything just lines up | `clustering_null.json`, `etnos.json`, `surveys.json` (the bias argument) |
| **"Put the planet anywhere"** + physical properties | `planet_nine_predictions.json`, `planets.json`, `etnos.json` |
| **RL5** — Who supports it, for and against | `field_timeline.json`, `papers.json` |
| **GG8** — What else could explain the evidence | `alternatives.json`, `papers.json`, `clustering_null.json` |

## Processed files

**`tnos.csv`** — 8,079 small bodies with semi-major axis > 30 AU. JPL orbital
elements joined to the Minor Planet Center's independent solution for the same
object, so you can show where the two catalogues disagree (`a_disagreement_pct`,
`mpc_U`). 7,286 of 8,079 cross-match. `varpi_deg` (longitude of perihelion,
Ω + ω) is the angle the whole clustering argument is about. `well_determined` is
a boolean quality gate: condition code ≤ 3, at least 3 oppositions, arc ≥ 1 year.
Use it — one-opposition orbits move a lot.

**`etnos.json`** — the 90 extreme objects (a > 150 AU, q > 30 AU), with
`delta_varpi_deg` and `alignment` measured against Planet Nine's predicted
longitude of perihelion (ϖ₉ = 246.7°). 44 are well determined. Note that
numbered objects are keyed by number, so `2015 BP519` appears as id `768325`;
use the `provisional_desig` column to build a search index users can actually
type into.

**`tno_summary.json`** — sample counts for each standard cut.

**`discoveries.csv`** — who found each object, where, and when. Only numbered
objects have an official MPC discovery record (1,050 of 8,079; 18 of the 90
extreme objects), so unnumbered ones fall back to JPL's first-observation date.
The `discovery_source` column says which you are looking at.

**`clustering_null.json`** — the "is this just luck?" numbers. For five cuts on
the extreme sample it gives the observed mean resultant length R of the
longitudes of perihelion, a 200,000-trial uniform-random null distribution with
histogram, and a p-value. The headline result is how much the answer moves with
the cut:

| cut | n | R | p |
|---|---|---|---|
| a > 250, q > 40 | 23 | 0.170 | 0.52 |
| a > 250, q > 40, well determined | 15 | 0.453 | 0.043 |
| a > 150, q > 30 | 90 | 0.082 | 0.55 |
| a > 150, q > 30, well determined | 44 | 0.332 | 0.007 |
| a > 200, q > 35 | 42 | 0.124 | 0.53 |

That sensitivity is the story, not a bug. **The null assumes surveys are equally
likely to find an object pointing in any direction, which is exactly what
Shankman et al. (2017) and Napier et al. (2021) dispute.** These p-values are an
upper bound on how surprising the clustering is. Say so on the page.

**`p9_sky_track.json`** — the predicted sky path of Planet Nine, computed from
Brown & Batygin (2021), plus six variants spanning their 1σ spreads in ϖ, Ω and
i. Perihelion at RA 247°, Dec −14°; aphelion at RA 67°, Dec +14°.

This is the orbit implied by their posterior **median** elements. It is not
their published probability map — their Figure 9 density peaks near RA 45°.
Different quantities, not a contradiction, but don't label either "where Planet
Nine is". The real probability map needs their MCMC samples, which aren't
published machine-readably.

**`etno_perihelion_sky.json`** — where each extreme object's perihelion points
on the sky. Overlay these on the survey footprints and the clustering claim is
visible directly.

**`surveys.json`** — 9 surveys with footprint, depth, years, and a note on what
each one does or does not rule out. Footprints are declination bands plus RA
ranges: a schematic of ragged real boundaries.

Each band also carries **`dec_range_calibrated`**, squeezed about its centre so
its solid angle matches the area the survey actually published
(`scripts/calibrate_footprints.py`). This matters because the sky map shades by
depth and lets the deepest survey win a patch: uncalibrated, Subaru HSC's band
covered 8,074 deg² against a published 1,400, so the two *deepest* surveys were
also the two most inflated, and the map claimed roughly a fifth of the sky was
deeply searched when the truth is about 4%. Calibration only ever shrinks a
band. Surveys with `footprint_area_verified: false` (OSSOS, whose area we could
not confirm) are drawn but excluded from depth shading. OSSOS is deliberately given as a whole rather than
per-block; the real pointings live in the OSSOS Survey Simulator.

**`planets.json`** — J2000 Keplerian elements plus per-century rates for the
eight planets and Pluto (JPL/Standish approximate elements, valid 1800–2050),
with radius, mass and a colour for the solar-system backdrop.

**`planet_nine_predictions.json`** — seven published orbit predictions, 2016 to
2025, showing how the planet has shrunk and moved closer over a decade;
physical properties; `search_exclusions` (how much of the space is already
ruled out); and `designer_slider_ranges` for the Designer page.

Every numeric field carries a **`src` tag**: `abstract` (quoted from the paper's
abstract), `paper` (read from its body or figures), `derived` (computed by us
from published values), or `ours` (our own assumption — *not* a published
number). Anything tagged `ours` must not be presented to users as a finding.

**`papers.json`** — 28 papers, 2014–2026, pinned to DOIs verified one by one,
with Crossref titles, dates, authors and citation counts. Every summary was
checked against the paper's own abstract (Luhman 2014, which has no preprint,
against the journal PDF). `stance` is **our** editorial
reading (supports / against / alternative / neutral), not a label the authors
chose. Current split: 10 supports, 8 against, 4 alternative, 6 neutral — a
property of the sample we picked, not a measurement of community opinion.

**`field_timeline.json`** — the entries on the section 07 timeline: which of
the papers we judged major, which lane each goes in (`lane`: support / against /
data / future; a data entry may `branch` toward the side its authors favour, and
an empty search carries the fraction it `excluded`), whether it is a `key` paper, a plain-language retelling of its
abstract-checked summary, who did the work, and the photo shown with it. Hand
curated; `scripts/fetch_portraits.py` fills in each photo's credit, licence and
source from the Wikimedia Commons API and writes the cropped images to
`public/field/`. The 2026 entry (Rubin's survey start and first dwarf-planet
candidate) and the four `future` entries cite announcements and preprints
rather than refereed papers, and are labelled as such on the page. The full
reading list, with which PDFs are on disk, is `papers/README.md` (generated by
`scripts/build_paper_index.py`; `--fetch` downloads every open-access copy).

**`alternatives.json`** — 8 competing explanations, each with what it explains,
what its critics say it fails to explain, a status, and links back into
`papers.json`. Includes "there is no pattern" and "small-number coincidence" as
first-class options.

## Sources

- JPL Small-Body Database Query API — `ssd-api.jpl.nasa.gov/sbdb_query.api`
- Minor Planet Center — `Extended_Files/distant_extended.json.gz`, `iau/lists/NumberedMPs.txt`
- Crossref REST API — `api.crossref.org`
- JPL/Standish approximate planetary elements — `ssd.jpl.nasa.gov/planets/approx_pos.html`

## What was verified, and how

- **Coordinate math** — propagated Sedna, 2000 CR105, 2007 TG422 and Alicanto
  from our own catalogue elements through `build_sky.py`'s transforms and
  compared heliocentric RA/Dec against **JPL Horizons**. Agreement 2.5″–4.5″,
  consistent with two-body propagation ignoring planetary perturbations. The
  transform is correct.
- **Every paper summary** — read against the actual abstract (arXiv API);
  Luhman 2014, which has no preprint, against the journal PDF in `papers/`.
- **Planet Nine's elements** — pulled the Brown & Batygin 2021 PDF and read the
  Figure 8 corner plot directly.
- **Survey exclusion numbers** — verified from the ZTF and Pan-STARRS1 search
  abstracts.

### Errors this caught and fixed

| What | Was | Now |
|---|---|---|
| Planet Nine ϖ₉ | 238° ±11 | **246.7° +15.1/−13.4** (BB21 Fig. 8) |
| Planet Nine Ω₉ | 94° ±20 | **96.9° +17.3/−15.5** |
| ϖ₉ used for ETNO alignment | 235° | **246.7°** (was also inconsistent with the sky track) |
| Millholland & Laughlin Ω | 94° | **50°** (and ω = 150°, so ϖ = 200°) |
| Batygin & Brown 2016 eccentricity | 0.6 | **0.7** |
| Batygin et al. 2019 mass / e | 4–6 M⊕, e 0.15–0.3 | **5–10 M⊕, e 0.2–0.5** |
| Brown & Batygin 2016 mass | 10 M⊕ | **5–20 M⊕**, q 150–350 AU |
| "Brown & Batygin 2025 rebuttal" | cited, arXiv 2505.08736 | **removed — fabricated.** That arXiv id is an unrelated particle-physics paper and no such paper was found |
| Bernardinelli 2022 stance | neutral | **against** — its 16 extreme TNOs are explicitly consistent with isotropy |
| Luhman 2014 WISE limits | "no Saturn-mass body within 10,000 AU" (widely repeated) | **no Saturn analog within 28,000 AU, no Jupiter analog within 82,000 AU** (26,000 AU for a Jupiter-mass brown dwarf on fainter models), read from the paper's abstract |
| Survey exclusion claim | "two-thirds of the orbit" (vague) | **56% (ZTF), 78% cumulative (PS1+ZTF+DES)** |
| `2015 BP519` lookup | absent (keyed as `768325`) | **`provisional_desig` column added** |

### Still unverified — do not quote without checking

- **All survey footprints** in `surveys.json`. The declination bands and RA
  ranges are our schematic approximations, not published boundaries. Fine for a
  map, not for any completeness claim.
- **PS1/CSS/ZTF/HSC/LSST areas and depths**, taken from general knowledge.
- **Physical properties tagged `ours`** — radius, temperature and the "best"
  albedo for a 6.2 M⊕ planet are our interpolations of the Linder & Mordasini
  grid, which is published only at 5/10/20/50 M⊕ and 280/700/1120 AU. The one
  anchor point they actually state (10 M⊕ at 700 AU → 3.7 R⊕, 47 K) is in the
  file as `linder_mordasini_anchor`.
- **The planet's colour.** No paper predicts one. Present it as an artist's
  choice.

## Known gaps

- No per-pointing survey footprints. If the bias argument needs real detection
  efficiencies, pull the OSSOS Survey Simulator or the DES bias model released
  with Bernardinelli et al. (2022). This is the single biggest gap: it is the
  difference between *illustrating* the bias argument and *computing* it.
- No Planet Nine posterior samples, so no real sky probability map.
- Citation counts come from Crossref, which undercounts astronomy badly
  (the field cites through arXiv and NASA ADS). Relative weight only. NASA ADS
  has better numbers but needs an API token.
- Discovery circumstances are missing for 72 of the 90 extreme objects, because
  they are unnumbered.
