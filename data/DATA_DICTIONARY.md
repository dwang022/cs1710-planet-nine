# Data dictionary

Every dataset in the repository: what it is, how it is made, which page uses it, and what each field means.

- `data/processed/` holds every processed dataset. The Python scripts in `scripts/` build them from the raw
  catalogue downloads (`./scripts/fetch_all.sh`, which saves the raw files to `data/raw/`, gitignored for size), and a
  few are kept by hand.
- `public/data/` holds copies of the files the site loads, byte for byte the same as in `data/processed/`.
- `data/README.md` has the longer notes on each file: what was checked, against what, and what remains unverified.
  `data/SOURCES.md` lists every source.

Distances are in AU (astronomical units, the Earth–Sun distance, about 150 million km). Angles are in degrees.
Brightness is in magnitudes, where a larger number means fainter. In JSON files, keys starting with `_` (`_what`,
`_caution`, `_src` and so on) are notes for people, not data.

## Which page uses which file

| Page | Files |
|---|---|
| `setting/planets.html` | none (its few facts are written in the page) |
| `setting/distance.html` | `etnos.json`, `planets.json`, `positions.json`, `planet_nine_predictions.json` |
| `setting/data.html` | `etnos.json`, `positions.json`, `observatories.json`, plus `public/telescopes/credits.json`, `public/tracking/credits.json`, `public/game/game.json` |
| `insights/clustering.html` | `etnos.json` |
| `insights/probability.html` | `etnos.json`, `bb2016.json` |
| `insights/alternatives.html` | `alternatives.json`, `bb2016.json`, `etnos.json`, `papers.json` |
| `search/how.html` | `surveys.json`, `p9_sky_track.json`, `planet_nine_predictions.json`, `field_timeline.json`, `papers.json`, `planets.json` |
| `search/timeline.html` | `debate.json`, `papers.json`, `field_timeline.json`, `planet_nine_predictions.json` |
| `search/future.html` | `surveys.json`, `papers.json` |
| `credits.html` | `papers.json`, and the credit files of the photographs and logos |

## Files the site loads

### `etnos.json`
The 90 extreme trans-Neptunian objects (average distance from the Sun of at least 150 AU, closest distance at least 30 AU), one record each, with JPL's orbit, the Minor Planet Center's (MPC) independent orbit for comparison, and how each one's orbit direction sits relative to Planet Nine's predicted orbit. 62 of the 90 are `well_determined`.
Built by `scripts/build_tnos.py` from the JPL Small-Body Database query (a > 30 AU) joined to the MPC distant-object catalogue (`distant_extended.json.gz`); it is the subset of `tnos.csv` passing the cut. Used by `setting/distance.html`, `setting/data.html`, `insights/clustering.html`, `insights/probability.html`, `insights/alternatives.html`.

A top-level array of records, sorted by `a_au` descending. Missing values are `null`.

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id` | string | | JPL's primary designation: the number for numbered objects (`"90377"` is Sedna, `"768325"` is 2015 BP519), otherwise the provisional designation (`"2020 MQ53"`). The key other files use for an object |
| `provisional_desig` | string | | The year-based designation (`"2003 VB12"`), taken from the parentheses at the end of `full_name`, else `id` if it is already one, else the MPC's principal designation. Lets numbered objects be searched by the name people know |
| `spkid` | integer | | JPL's SPK-ID, its internal numeric identifier |
| `name` | string | | Proper name if the object has one (`"Sedna"`), else empty |
| `full_name` | string | | JPL's full name, e.g. `"90377 Sedna (2003 VB12)"` |
| `orbit_class` | string | | JPL's orbit class; `"TNO"` (trans-Neptunian object) for all 90 |
| `a_au` | number | AU | Semi-major axis: the orbit's average distance from the Sun (half its long axis) |
| `e` | number | | Eccentricity: 0 is a circle, close to 1 a very stretched oval |
| `i_deg` | number | degrees | Inclination: tilt of the orbit relative to the ecliptic (the plane of Earth's orbit, roughly the planets' plane) |
| `node_deg` | number | degrees | Longitude of the ascending node (Ω): the direction, measured round the ecliptic, where the orbit crosses that plane heading north |
| `argperi_deg` | number | degrees | Argument of perihelion (ω): the angle, within the orbit's own plane, from the ascending node to the perihelion (the orbit's closest point to the Sun) |
| `varpi_deg` | number | degrees | Longitude of perihelion (ϖ = Ω + ω, mod 360): the direction of the orbit's closest point. The angle the clustering argument is about |
| `mean_anom_deg` | number | degrees | Mean anomaly at `epoch_jd`: where along its orbit the body is, as the fraction of one orbital period elapsed since perihelion, in degrees |
| `tp_jd` | number | Julian date | Time of perihelion passage |
| `q_au` | number | AU | Perihelion distance: closest distance to the Sun |
| `Q_au` | number | AU | Aphelion distance: farthest distance from the Sun (the orbit's far end) |
| `period_yr` | number | years | Orbital period |
| `epoch_jd` | number | Julian date | The date the elements refer to (most are 2461200.5, 2026-06-09) |
| `H_mag` | number | magnitudes | Absolute magnitude: brightness at a standard distance; smaller means brighter, so usually larger |
| `diameter_km` | number or null | km | JPL's measured diameter, where one exists (null for almost all) |
| `albedo` | number or null | | JPL's measured reflectivity (0 to 1), where one exists |
| `condition_code` | string or null | | JPL's orbit condition code, `"0"` (well determined) to `"9"` (very poor); ordinal |
| `n_obs` | number | | Number of observations JPL used in its fit (stored as a float) |
| `data_arc_days` | number | days | Time between the first and last observation JPL used |
| `first_obs`, `last_obs` | string (YYYY-MM-DD) | | Dates of the first and last observation JPL used |
| `mpc_a_au` | number or null | AU | The MPC's semi-major axis for the same object; null if not matched |
| `mpc_q_au` | number or null | AU | The MPC's perihelion distance |
| `mpc_e` | number or null | | The MPC's eccentricity |
| `mpc_U` | string or null | | The MPC's uncertainty parameter, `"0"` (best) to `"9"` (worst) |
| `mpc_num_opps` | integer or null | | Number of oppositions at which the object was observed. An opposition is when the object is opposite the Sun in Earth's sky, the once-a-year best time to see it, so this is roughly the number of years it was seen |
| `mpc_arc_years` | string or null | | Span of years observed, e.g. `"1990-2026"`; null for objects seen at one opposition (or not matched) |
| `well_determined` | boolean | | The papers' sample rule: seen at more than one opposition (`mpc_num_opps` ≥ 2; where the MPC has no count, `data_arc_days` ≥ 365). The site calls it “seen in more than one year” |
| `a_disagreement_pct` | number or null | % | How far the MPC's semi-major axis differs from JPL's: \|mpc_a − a\| / a × 100 |
| `delta_varpi_deg` | number | degrees | `varpi_deg` minus Planet Nine's predicted longitude of perihelion (246.7°, Brown & Batygin 2021), wrapped to −180..180 |
| `alignment` | string | | `"anti-aligned"` if \|`delta_varpi_deg`\| > 90 (the orbit's closest point lies on the opposite side from Planet Nine's, the clustered case in Batygin and Brown's framing), else `"aligned"` |

### `positions.json`
Where every known trans-Neptunian object (7,295 bodies of class TNO in `tnos.csv`) and Voyager 1 were on JPL's catalogue date, 2026-06-09, laid flat on the ecliptic for a map seen from above. Each body keeps its true distance from the Sun, in the direction of its longitude of perihelion plus its true anomaly; only the tilt is dropped.
Built by `scripts/build_positions.py` from `tnos.csv` (each body carried to the date by two-body motion) and JPL Horizons (Voyager 1, target −31). Used by `setting/distance.html`, `setting/data.html`.

Top-level keys: `_what`, `_source` (notes), `epoch_jd`, `epoch_cal`, `tnos`, `voyager_1`.

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `epoch_jd` | number | Julian date | The date of every position (the epoch most `tnos.csv` rows share) |
| `epoch_cal` | string | | The same date, `YYYY-MM-DD` |
| `tnos.n` | integer | | Number of bodies (7,295; one TNO with no mean anomaly is left out) |
| `tnos.units` | string | | Note on the coordinates |
| `tnos.x`, `tnos.y` | array of integers | tenths of an AU | Parallel arrays, one entry per body: position in the ecliptic plane, Sun at the origin, x toward the vernal equinox (the direction from which ecliptic longitude is counted). Divide by 10 for AU. Bodies are in `tnos.csv` row order but carry no ids |
| `voyager_1.r_au` | number | AU | Voyager 1's distance from the Sun |
| `voyager_1.lon_deg` | number | degrees | Its ecliptic longitude (direction round the ecliptic from the vernal equinox) |
| `voyager_1.outward_au_per_yr` | number | AU per year | How fast its distance from the Sun grows |
| `voyager_1.xyz_au` | array of 3 numbers | AU | Heliocentric ecliptic J2000 position x, y, z |
| `voyager_1.src` | string | | Source note |

### `observatories.json`
Every observatory that has reported a position of one of the 90 extreme objects (4,916 positions from 66 MPC observatory codes: 64 on Earth, the Hubble Space Telescope, and one code for occultation reports), and for each object its nights of observation and JPL's formal uncertainties on its orbit.
Built by `scripts/build_observatories.py` from the MPC observations API (80-column observation records), the MPC observatory-code list (places), and, for the uncertainties, the team's raw JPL Small-Body Database download. Used by `setting/data.html`.

Top-level keys: `_what`, `_source`, `_fetched` (date of the API pull, 2026-10-29), `_sigma_rule` (notes); `n_objects` (90), `n_obs` (total positions, 4,916), `n_observatories` (66); `observatories` (array); `objects` (keyed by object id).

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `observatories[].code` | string | | MPC observatory code, e.g. `F51`, `X05` (Rubin) |
| `observatories[].name` | string | | Name in the MPC code list, e.g. `Pan-STARRS 1, Haleakala` |
| `observatories[].lon` | number or null | degrees | East longitude, −180..180; null for codes with no place on Earth (Hubble, occultation reports) |
| `observatories[].lat` | number or null | degrees | Geodetic latitude, converted from the MPC's parallax constants; null as for `lon` |
| `observatories[].n_obs` | integer | | Positions it reported of the 90 objects |
| `observatories[].n_objects` | integer | | How many of the 90 it observed |
| `observatories[].first_year`, `last_year` | integer | year | Years of its first and last such position |
| `observatories[].discovered` | array of strings | | Ids of objects whose discovery observation (marked `*` in the MPC record) came from this code |
| `observatories[].objects` | array of strings | | Ids of every object it observed |
| `objects.<id>` | object | | One entry per extreme object, keyed by `etnos.json`'s `id` |
| `objects.<id>.n_obs` | integer | | Positions reported of this object (satellite and roving-observer lines skipped) |
| `objects.<id>.n_nights` | integer | | Number of distinct entries in `nights` |
| `objects.<id>.n_observatories` | integer | | How many observatory codes reported it |
| `objects.<id>.nights` | array of numbers | decimal years | Dates it was observed, rounded to 0.01 year (about 3.7 days), so close nights merge |
| `objects.<id>.sigma_q_au` | number or null | AU | JPL's formal (1-sigma) uncertainty on the perihelion distance (closest point to the Sun); null where there is no estimate or JPL's solution covers a different observed arc (`_sigma_rule`; 17 objects) |
| `objects.<id>.sigma_Q_au` | number or null | AU | JPL's uncertainty on the aphelion distance (far end) |
| `objects.<id>.sigma_a_au` | number or null | AU | JPL's uncertainty on the semi-major axis (average distance) |

### `planets.json`
J2000 orbital elements, with their rates of change per century, for the eight planets and Pluto, plus radius, mass and a display colour, for the solar-system backdrop. Approximate elements valid 1800–2050 (Pluto 1850–2200).
Hand-maintained (listed as curated in `scripts/fetch_all.sh`, not regenerated) from JPL/Standish “Keplerian Elements for Approximate Positions of the Major Planets”. Used by `setting/distance.html`, `search/how.html`.

Top-level keys: `_source` (note), `_units` and `_physical_units` (unit notes per field), `planets` (array of 9, Mercury to Pluto).

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `planets[].name` | string | | Planet name |
| `planets[].a` | number | AU | Semi-major axis (average distance from the Sun) at J2000 (JD 2451545.0) |
| `planets[].e` | number | | Eccentricity |
| `planets[].I` | number | degrees | Inclination to the ecliptic |
| `planets[].L` | number | degrees | Mean longitude: where the planet is along its orbit, as an angle from the vernal equinox |
| `planets[].varpi` | number | degrees | Longitude of perihelion (direction of the closest point) |
| `planets[].Omega` | number | degrees | Longitude of the ascending node |
| `planets[].rates.{a, e, I, L, varpi, Omega}` | number | the element's unit per Julian century | How fast each element changes |
| `planets[].radius_km` | number | km | Radius |
| `planets[].mass_earths` | number | Earth masses | Mass |
| `planets[].color_hex` | string | | Display colour, `#rrggbb` |

### `bb2016.json`
Batygin & Brown (2016)'s luck test reproduced: how often six objects drawn at random from the known distant objects are as tightly clustered as the six that first suggested Planet Nine, then the same test on today's catalogue at several distance cuts. "Spread" throughout is the root-mean-square angle between each object's direction and the group's middle; the smaller, the tighter.

Built by `scripts/build_bb2016.py` from the team's JPL Small-Body Database download (objects with q > 30 AU and a > 50 AU), MPC `NumberedMPs.txt` (discovery dates) and `etnos.json`; the `published` and `studies` blocks are typed into the script from the papers.
Used by `insights/probability.html` and `insights/alternatives.html` (today's multiplied odds). `studies` and `sensitivity` are not read by the site (`studies` only by an archived, commented-out block in `search/timeline.html`).

Top-level keys: `_what`, `_src` (notes); `seed`, `draws`; `six`, `middle`; `pool_2016`, `pool_today`; `repro`, `sensitivity`, `joint_check`, `today`; `published`, `studies`.

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `seed` | int | | Random seed of the 2016 run (2016) |
| `draws` | int | count | Random samples per run (100,000, as the paper) |
| `six[].id`, `six[].name` | string | | Designation and name of each of the six 2016 objects |
| `six[].closest` | [float, float] | degrees | Ecliptic longitude and latitude of the direction of the orbit's closest point to the Sun |
| `six[].node_deg` | float | degrees | Longitude of ascending node; the page's tilt direction is this + 90° |
| `six[].varpi_deg` | float | degrees | Longitude of perihelion; the page's stretch direction is this + 180° |
| `middle` | [float, float] | degrees | Longitude and latitude of the six's average closest-point direction (not read by the site) |
| `pool_2016.first_seen_before` | int | year | Pool cut: objects first seen before this year |
| `pool_2016.n` | int | count | Objects in the 2016 pool (827) |
| `pool_2016.points` | list of [lon, lat] | degrees | Closest-point direction of every pool object, one pair each |
| `pool_2016.node_deg` | list of float | degrees | Ascending node of every pool object, same order as `points` |
| `pool_today.n`, `.points`, `.node_deg` | as above | | The same for every such object known today (1,589), no date cut |
| `repro.n` | int | count | Objects per sample (6) |
| `repro.pool_n`, `repro.draws`, `repro.seed` | int | count | Pool size, number of samples, seed of this run |
| `repro.closest.spread_deg` | float | degrees | Spread of the six's closest points on the sky |
| `repro.closest.n_as_tight` | int | count | Samples at least as tight as the six |
| `repro.closest.p` | float | share (0–1) | `n_as_tight / draws` |
| `repro.closest.hist.bin_deg` | int | degrees | Histogram bin width (2°) |
| `repro.closest.hist.counts` | list of 65 int | count | Samples per spread bin, 0–130°; the last bin also holds anything wider |
| `repro.tilt.*` | as `closest` | | Same, for the spread of the ascending nodes (the tilt) |
| `repro.product` | float | share (0–1) | `closest.p × tilt.p`, the paper's way of combining the two |
| `repro.both.n_as_tight`, `repro.both.p` | int, float | count, share | Samples tight in both at once, and their share |
| `repro.examples[].idx` | list of 6 int | | Indices into `pool_2016.points` of one of the first 80 samples, kept for the animation |
| `repro.examples[].spread` | float | degrees | That sample's closest-point spread |
| `sensitivity[].first_seen_before` | int | year | Earlier pool cut (2013, 2014, 2015) |
| `sensitivity[].pool_n` | int | count | Pool size at that cut |
| `sensitivity[].closest_p`, `.tilt_p`, `.product`, `.both_p` | float | share (0–1) | The `repro` results rerun on that smaller pool |
| `joint_check.draws`, `.seed` | int | | 1,000,000 samples, same seed, so the first 100,000 are `repro`'s |
| `joint_check.first_draws_are` | string | | Which run the first draws repeat (`"repro"`) |
| `joint_check.closest_n`, `.tilt_n`, `.both_n` | int | count | Samples as tight as the six in closest points, in tilt, in both |
| `joint_check.product_expects_n` | float | count | Samples tight in both that multiplying predicts |
| `joint_check.ratio` | float | | `both_n / product_expects_n` (above 1: the two clues are related) |
| `today[].a_min_au` | int | AU | Cut: average distance (semi-major axis) above this (150–400) |
| `today[].q_min_au` | int | AU | Cut: closest point above this (30, or 42 for orbits clear of Neptune) |
| `today[].ids` | list of string | | Ids (as in `etnos.json`) of the objects passing the cut, seen in more than one year |
| `today[].n`, `.pool_n`, `.draws`, `.seed` | int | count | Objects in the cut, pool size, samples, seed (2016 + a + q) |
| `today[].closest.*`, `.tilt.*`, `.product`, `.both.*` | as in `repro` | | The luck test for that cut, sampling `n` from `pool_today` |
| `today[].middle` | [float, float] | degrees | The cut's average closest-point direction |
| `today[].points` | list of [lon, lat] | degrees | Each cut object's closest-point direction, same order as `ids` |
| `published.closest.p`, `.tilt.p`, `.both.p` | float | share (0–1) | The paper's own figures (0.7%, 1%, 0.007%) |
| `published.draws.n` | int | count | The paper's number of samples |
| `published.*.src` | string | | Where in the paper the figure is, with its words |
| `studies[].label` | string | | Paper, as cited |
| `studies[].objects` | int | count | Objects the study tested |
| `studies[].allowance` | string | | How the study allowed for where telescopes looked, in plain words |
| `studies[].p` | float or null | share (0–1) | Chance of the clustering by luck as the paper gives it; null where it gives none |
| `studies[].p_hi` | float | share (0–1) | Upper end where the paper gives a range (Napier et al. 2021 only) |
| `studies[].side` | string | | `for` or `against` a planet |
| `studies[].src` | string | | Where the number is quoted from |

### `papers.json`
The 32 papers the site cites, 2004–2026, each pinned to a verified DOI, with Crossref metadata, a one-line summary checked against the abstract, and our reading of which side it takes ("stance").

Built by `scripts/fetch_papers.py` from the Crossref REST API (DOIs, stances, labels, summaries and arXiv ids are typed in the script); later label edits were made in the script and this file together without re-fetching, so `_fetched` and the citation counts date from 2026-10-30.
Used by `search/how.html`, `search/timeline.html`, `search/future.html`, `insights/alternatives.html` and `credits.html`.

Top-level keys: `_what`, `_caution` (list of four warnings), `_stance_values` (the four stances defined), `_fetched` (date), `_source`, `n_papers`, `stance_counts` (papers per stance), `papers`.

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `papers[].doi` | string | | DOI |
| `papers[].label` | string | | Short citation shown on the site (e.g. “Batygin & Brown 2016”); its lowercased, hyphenated form is the credits page's `cite-` anchor |
| `papers[].title` | string | | Title from Crossref (may hold HTML such as `<sub>`) |
| `papers[].authors` | list of string | | Author names from Crossref |
| `papers[].first_author` | string | | First author |
| `papers[].n_authors` | int | count | Number of authors |
| `papers[].year` | int | year | Year published |
| `papers[].date` | string | | Publication date, as precise as Crossref gives (`YYYY`, `YYYY-MM` or `YYYY-MM-DD`) |
| `papers[].journal` | string | | Journal |
| `papers[].citations_crossref` | int | count | Crossref citation count on `_fetched` (undercounts astronomy; relative weight only) |
| `papers[].url` | string | | DOI link |
| `papers[].arxiv`, `papers[].arxiv_url` | string or null | | arXiv id and link; null for three papers with none |
| `papers[].stance` | string | | Our reading of the abstract: `supports` (a planet), `against` (artefact of searching, or rules out where it could be), `alternative` (another cause), `neutral` (takes no side) |
| `papers[].summary` | string | | One- or two-sentence summary of the finding |
| `papers[].summary_checked_against_abstract` | bool | | Summary checked against the paper's abstract (true for all) |
| `papers[].resolved` | bool | | The DOI resolved at Crossref (true for all; the script sets it on every fetched paper) |

### `debate.json`
The text for the timeline page's debate picture, where each paper from 2014 on is a mark for or against a planet (side taken from `stance` in `papers.json`; neutral papers left out): a headline per year, a one-line "why it matters" for papers the ledger does not retell, and the phrases to highlight. All of it is our reading (`src: ours`).

Hand-maintained.
Used by `search/timeline.html`.

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `_what`, `_caution` | string, list of string | | Notes: how sides and years are assigned, and that the sample is chosen, not a census |
| `src` | string | | `ours` |
| `range` | [int, int] | year | First and last year of the debate (2014, 2026) |
| `headlines.<year>` | string | | One-line headline for that year, keyed by year as a string (13 years) |
| `why.<doi>` | string | | One line on what the paper does to the argument, for 12 papers; others take theirs from `field_timeline.json` |
| `highlights.<doi>.why` | list of string | | Exact phrases of the paper's `why` line set in the part's colour |
| `highlights.<doi>.summary` | list of string | | Exact phrases of its `papers.json` summary set in the part's colour (24 papers) |

### `field_timeline.json`
The ledger of major papers and searches, one entry per result, with which lane it goes in (for a planet, against, data, what comes next), a plain title and line, a schematic drawing and optional portraits. The search page's "searches so far" steps and the timeline page's debate (years, order and "why" lines) draw on it.

Hand-maintained; `scripts/fetch_portraits.py` fills each photo's `src`, `credit`, `license`, `license_url`, `source` and `_photos_fetched` from Wikimedia Commons.
Used by `search/how.html` and `search/timeline.html`.

Top-level keys: `_what`, `_caution` (list of notes), `_lanes` (the four lanes defined), `_photos_fetched` (date), `entries` (22 records).

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `entries[].id` | string | | Short id (e.g. `vp113-2014`) |
| `entries[].year` | int | year | Year of the result (absent on the four `next` entries) |
| `entries[].order` | int | | Order within its year (or within `next`) |
| `entries[].lane` | string | | Our reading: `for`, `against`, `data` (an object, limit, search or survey) or `next` (a search under way or proposed) |
| `entries[].kind` | string | | What sort of result (`object`, `search`, `limit`, `survey`, `candidate`, `bias`, `proposal`, `fit`, `odds`, …); picks the icon and the search page's filter |
| `entries[].doi` | string | | The paper in `papers.json` (absent for Rubin's start and the `next` entries) |
| `entries[].title` | string | | What the result means for the search, one line |
| `entries[].line` | string | | One or two lines of context |
| `entries[].key` | bool | | A key paper (styled as key; in compact views only key entries show their drawing) |
| `entries[].also` | list of string | | DOIs of other papers linked from the entry |
| `entries[].links[].label`, `.url` | string | | Links for entries without a refereed paper (announcements, preprints) |
| `entries[].excluded.pct` | int | percent | Share of the predicted planets an empty search ruled out |
| `entries[].excluded.text` | string | | What that percentage refers to |
| `entries[].branch.side` | string | | `for` or `against`: the conclusion the authors drew from a data entry |
| `entries[].branch.of` | string | | `orbit` where the branch argues against the proposed orbit, not against a planet |
| `entries[].branch.from` | string | | Small label for the branch row (e.g. “What its finders concluded”) |
| `entries[].branch.title`, `.line`, `.diagram` | string, object | | The branch row's title, line and drawing |
| `entries[].diagram.type` | string | | Drawing in `src/charts/fieldart.js`: `orbits`, `search`, `candidate`, `survey`, `limit`, `constraint`, `tilt`, `swarm`, `odds` (schematic, not measured) |
| `entries[].diagram.n`, `.aligned`, `.jitter` | int, bool, int | count, –, degrees | `orbits`: how many orbits, whether they line up, how far they scatter |
| `entries[].diagram.planet`, `.region`, `.far` | bool | | `orbits`: draw a planet's orbit, its likely stretch, or the planet pushed farther out |
| `entries[].diagram.highlight`, `.anti`, `.big` | bool | | `orbits`: one orbit drawn bold, pointing the opposite way, larger |
| `entries[].diagram.footprints` | bool | | `orbits`: survey patches drawn over them |
| `entries[].diagram.pct`, `.label`, `.note` | int, string, string | percent | `search`: share ruled out, the word under it, a small note |
| `entries[].diagram.au` | string | | `limit`: the distance written on it |
| `entries[].diagram.deg` | int | degrees | `tilt`: the tilt drawn |
| `entries[].diagram.years` | [int, int] | year | `survey`: first and last year of the survey |
| `entries[].diagram.progress` | float | | (unclear: set on `next-rubin`, not read by `fieldart.js`) |
| `entries[].diagram.dashed` | bool | | Drawn dashed (not yet happened) |
| `entries[].photos[].file` | string | | Output name of the portrait in `public/field/` |
| `entries[].photos[].alt` | string | | Who is pictured |
| `entries[].photos[].commons` | string | | The Wikimedia Commons file |
| `entries[].photos[].focus` | [float, float] | share (0–1) | Point of the image the crop centres on |
| `entries[].photos[].zoom` | float | share (0–1) | Fraction of the largest crop kept |
| `entries[].photos[].src` | string | | Path of the cropped portrait |
| `entries[].photos[].credit`, `.license`, `.license_url`, `.source` | string | | Author, licence and source page, from the Commons API |

### `alternatives.json`
The eight competing explanations for the clustering of the extreme orbits (Planet Nine, luck, where telescopes looked, a passing star, a heavy disk, a tilting swarm, different gravity, a primordial black hole), each judged against the two clues (the orbits stretch out and tilt the same way), with what it needs that nobody has seen and its main problem. The verdicts are our reading of the papers, not a ranking the papers make.

Built by `scripts/tag_alternatives.py` (writes `fits`, `needs`, `issue`, `gist`, `tiers`, `groups` and the page order into a file whose older fields are hand-maintained; it writes both `data/processed/` and `public/data/`). `scripts/build_paper_index.py` also reads `key_dois`.
Used by `insights/alternatives.html`.

Top-level keys: `_what`, `_caution` (notes), `_fields` (a short gloss of each record field), `tiers` (list of 4 strings: the rows of the page's figure, "Nothing new", "One unseen body", "Much unseen matter", "New physics"), `groups` (ideas the page would show as one; empty since 2026-11-18), `alternatives` (8 records, in the page's order).

Fields of one record in `alternatives[]`:

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id` | string | | Key (e.g. `planet_nine`, `small_sample`, `observational_bias`); `charts/altart.js` keys its drawings by it |
| `short` | string | | Short name shown on the head, the figure and the card titles ("A planet", "Luck") |
| `gist` | string | | A few words on what the idea is, shown on pointing at it in the figure |
| `fits.stretch.v`, `fits.tilt.v` | string | | Verdict for each clue: `yes` (a paper shows it, lasting to today), `times` (only for a while, in idealised simulations), `disputed` (predicted, then not found by a fuller paper), `fades` (no paper shows it and an unheld pattern would fade), `unshown` (no paper shows it), `no` (a paper finds the opposite), `chance` (no real pattern; luck's odds computed on the page), `apparent` (only seems there, from where telescopes looked). Sets the idea's place across the figure (yes/chance/apparent count 1, times/disputed 0.5) |
| `fits.<clue>.text` | string | | One plain sentence on how the idea deals with that clue; `{p_stretch}`, `{p_tilt}`, `{odds}` placeholders are filled on the page from `bb2016.json` |
| `fits.<clue>.cite` | list of strings | | DOIs (entries in `papers.json`) shown as superscript citations |
| `needs.tier` | integer | | Index into `tiers` (0 to 3): the figure's row, what the idea relies on that has never been observed |
| `needs.text`, `needs.cite` | string, list of strings | | That need in a sentence, and its DOIs |
| `issue.text`, `issue.cite` | string, list of strings | | The idea's main problem, the last line of its card, and its DOIs |
| `key_dois` | list of strings | | Every DOI the record cites (union of the cites above and older ones); read by `build_paper_index.py` |
| `name` | string | | Longer name ("A ninth planet"); not read by the current page |
| `tag` | string | | A few words on how the idea works; not read by the current page |
| `one_liner` | string | | One-sentence summary; not read by the current page |
| `explain[]`, `struggles[]` | list of `{text, cite}` | | Older plain-word sentences on what the idea explains and where it falls short; not read by the current page |
| `mechanism` | string | | Technical description of the mechanism; not read by the site |
| `explains`, `struggles_with` | list of strings | | What it accounts for, and what its critics say it does not; not read by the site |
| `status` | string | | Editorial standing: `mainstream`, `viable`, `fringe` or `largely-excluded` (the file's own `_caution` calls it editorial); not read by the site |
| `sketch_cue` | string | | Old note on what to draw; not read by the site |
| `color_hex` | string | | Old colour for the idea; not read by the site (colours now follow the site's palette) |
| `note` | string | | Extra remark (only `stellar_flyby`); not read by the site |

### `planet_nine_predictions.json`
The published predictions for Planet Nine: eight orbit and mass estimates from 2016 to 2025 (seven model papers and one infrared candidate), how much of the predicted space the searches have ruled out, and the physical properties, including the brightness model the search page uses. These are model inferences, not measurements.

Hand-maintained (`scripts/fetch_all.sh` lists it as curated; `scripts/build_paper_index.py` reads its DOIs).
Used by `setting/distance.html` (the best-fit orbit), `search/how.html` (the best fit, the brightness model and `search_exclusions`), `search/timeline.html` (`orbit_predictions`, "How the proposed planet has changed").

Top-level keys: `_what`, `_caution`, `_provenance` (notes; `_what` still names a "Designer page" that no longer exists), `orbit_predictions` (8 records), `search_exclusions`, `physical_properties`, `designer_slider_ranges`.

**`src` tags.** Every value names where it came from: `abstract` (quoted from the paper's abstract), `paper` (read from the paper's body or figures), `derived` (computed by us from published values), `ours` (our own assumption or interpolation, never a published number). In `orbit_predictions` `src` is an object mapping a field name to its tag, often with a short parenthetical; elsewhere it is a string beginning with the tag.

Fields of one record in `orbit_predictions[]` (each paper carries only the fields it gives; `_err` fields are `[minus, plus]` offsets from the value, `_range` fields are `[min, max]`):

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `ref` | string | | Key (e.g. `brown_batygin_2021_posterior`) |
| `label` | string | | Paper's name as shown |
| `year` | integer | years | Publication year |
| `doi` | string | | The paper's DOI (an entry in `papers.json`) |
| `note` | string | | What kind of estimate it is and caveats |
| `src` | object | | Field name → source tag (see above) |
| `is_default` | boolean | | True on the one record the site treats as the best fit (Brown & Batygin 2021 posterior medians) |
| `candidate` | boolean | | True for Phan et al. 2025, a candidate sighting rather than a model |
| `mass_earths`, `mass_earths_err` | number, [number, number] | Earth masses | Mass and its uncertainty |
| `mass_earths_min` | number | Earth masses | A mass floor only (Batygin & Brown 2016) |
| `mass_earths_range` | [number, number] | Earth masses | Mass range where the paper gives only a range |
| `a_au`, `a_au_err`, `a_au_range` | number / pair | AU | Semi-major axis (average distance), its uncertainty or range |
| `q_au`, `q_au_err`, `q_au_range` | number / pair | AU | Closest point to the Sun (perihelion distance) |
| `aphelion_au`, `aphelion_au_err` | number, pair | AU | Farthest point from the Sun (2024 update) |
| `current_distance_au`, `current_distance_au_err` | number, pair | AU | Distance now, median of the surviving population (2024 update) |
| `distance_au_range` | [number, number] | AU | The candidate's distance now (Phan et al. 2025) |
| `e`, `e_err`, `e_range` | number / pair | | Eccentricity (0 circle, towards 1 more stretched) |
| `e_derived`, `e_range_derived` | number / pair | | Eccentricity computed by us from the paper's a and q (or aphelion) |
| `i_deg`, `i_deg_err`, `i_deg_range` | number / pair | degrees | Inclination to the planets' plane |
| `varpi_deg`, `varpi_deg_err` | number, pair | degrees | Longitude of perihelion: the direction of the closest point |
| `Omega_deg`, `Omega_deg_err` | number, pair | degrees | Longitude of the ascending node |
| `argperi_deg` | number | degrees | Argument of perihelion (Millholland & Laughlin 2017) |
| `mean_anomaly_deg` | number | degrees | Position along the orbit (Millholland & Laughlin 2017) |
| `period_yr` | number | years | Orbital period (Millholland & Laughlin 2017) |
| `search_region.ra_deg`, `search_region.dec_deg` | [number, number] | degrees | Sky box the paper suggests searching (right ascension, declination) |
| `V_mag`, `V_mag_err`, `V_mag_range` | number / pair | magnitudes | Predicted visible brightness (larger is fainter) |
| `albedo_range` | [number, number] | | Reflectivity range adopted (Brown & Batygin 2021) |
| `clustering_confidence_pct` | number | percent | Confidence that the clustering is real, from the abstract (Brown & Batygin 2021) |

`search_exclusions` (read by `search/how.html`):

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `ztf_2022.fraction_excluded`, `ps1_2024_cumulative.fraction_excluded` | number | fraction | Share of the 2021 predictions ruled out by the ZTF search (0.56) and by Pan-STARRS1, ZTF and DES together (0.78) |
| `<search>.depth_V`, `.depth_note` | number, string | magnitudes | How faint the search reached, and at what detection efficiency |
| `<search>.doi`, `.src` | string | | The search paper and source tag |
| `ps1_2024_cumulative.combines` | list of strings | | The surveys pooled in the 78% |
| `remaining_space`, `src`, `_what` | string | | Where the unsearched predictions remain (faint, near the northern galactic plane), and its source |

`physical_properties`:

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `brightness_model.radius_rule` | `{formula, src}` | | Radius = mass / 3 (Earth radii from Earth masses), as the search papers use |
| `brightness_model.albedo.value` | number | | Reflectivity used, 0.41 (Neptune's) |
| `brightness_model.magnitude_formula` | `{formula, src}` | | Reflected-light magnitude from diameter, albedo and distance |
| `brightness_model.check`, `.check_2024` | object | Earth masses, AU, magnitudes | Our formula's V against a published V for the same planet (`V_computed`, `V_published`) |
| `brightness_model.linder_mordasini_grid` | object of lists | Earth masses, Earth radii, K, magnitudes | Linder & Mordasini 2016's grid: radius, temperature and V at 700 AU for 5, 10, 20, 50 Earth masses |
| `brightness_model.detection.V_94pct`, `.V_50pct` | number | magnitudes | Brightness at which the combined searches catch 94% and 50% of planets (20.5, 21.5) |
| `brightness_model.hiding_rule` | `{rule, src}` | | The share of the orbit (by time) spent fainter than `V_50pct` counts as hidden (`ours`) |
| `brightness_model._what`, `._choice` | string | | Notes on the model and why r = m/3 was chosen |
| `linder_mordasini_anchor` | object | Earth masses, AU, Earth radii, K, magnitudes | One published model point (10 Earth masses at 700 AU) and V near aphelion by mass; not read by the site |
| `mass_earths`, `radius_earths`, `effective_temperature_k`, `albedo`, `apparent_V_mag`, `orbital_period_yr` | `{min, max, best, unit?, confidence, src, note?}` | as named | Summary ranges with a best value and our confidence (low, moderate); several are `ours`; not read by the site |
| `composition` | `{options, best, confidence, src}` | | Possible make-ups; not read by the site |
| `likely_appearance` | `{src, note, plausible_colors_hex}` | | Plausible colours, an artist's choice (`ours`); not read by the site |
| `_source`, `_caution` | string | | Notes |

`designer_slider_ranges` (`_src` = `ours`): `[min, max]` bounds for `mass_earths` (Earth masses), `radius_earths` (Earth radii), `a_au` (AU), `e`, `i_deg` (degrees), `albedo`, `temperature_k` (K), for a Designer page that no longer exists. Not read by the site.

### `surveys.json`
Nine sky surveys that have looked, or will look, for Planet Nine and for distant objects (Pan-STARRS1, Catalina, ZTF, DES, OSSOS, Subaru HSC, WISE, IRAS + AKARI, Rubin), each with a schematic footprint, depth and years. Footprints are declination bands crossed with right-ascension ranges, except Rubin's, which follows its published definition.

Hand-maintained; `dec_range_calibrated` is written by `scripts/calibrate_footprints.py`.
Used by `search/how.html` (the photographed sky, the survey buttons and cards, Rubin's area and depth) and `search/future.html` (Rubin's start and end years).

Top-level keys: `_what`, `_caution`, `_units`, `_footprint_calibration` (notes), `galactic_plane_note` (where the unsearched space is), `_verification` (`checked`, `verified_from_abstracts`, `not_verified`, `guidance`: which values were checked against papers and which come from general knowledge), `p9_search_coverage` (the ZTF 0.56 and cumulative 0.78 excluded fractions, the surveys pooled, what remains; not read by the site, which takes these from `planet_nine_predictions.json`), `surveys` (9 records).

Fields of one record in `surveys[]`:

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id` | string | | Key (`ps1`, `css`, `ztf`, `des`, `ossos`, `hsc_ssp`, `wise`, `iras_akari`, `lsst`) |
| `name`, `facility` | string | | Survey name and where its telescope is |
| `years` | [integer, integer] | years | First and last year of the survey (Rubin's from its start on 29 June 2026, plus ten years) |
| `band`, `wavelength` | string | | Filter (e.g. `r`, `W1/W2`) and wavelength family (`optical`, `mid-infrared`, `far-infrared`); the sky map shades only optical surveys |
| `depth_mag` | number or null | magnitudes | Approximate single-photo limiting magnitude (null for IRAS + AKARI) |
| `stacked_depth_mag` | number | magnitudes | Depth of stacked photos (PS1, DES, Rubin only); not read by the site |
| `area_sq_deg` | number or null | square degrees | Published area (null for OSSOS, unconfirmed) |
| `dec_range` | [number, number] | degrees | Raw schematic declination band |
| `dec_range_calibrated` | [number, number] | degrees | The band squeezed about its centre so its area matches `area_sq_deg`; used for depth shading (7 surveys) |
| `ra_ranges` | list of [number, number] | degrees | Right-ascension ranges, 0 to 360 |
| `footprint_area_verified` | boolean | | False (OSSOS) means drawn but left out of depth shading |
| `footprint` | `{dec_max, ecl_lat_max}` | degrees | Rubin only: everything south of declination +12 plus the sky north of that up to ecliptic latitude +10 |
| `future` | boolean | | True for Rubin, the survey still to come |
| `visits` | `{wfd, nes, dusty_plane}` | photos per pointing | Rubin only: median visits in the main area, the North Ecliptic Spur and the dusty plane |
| `visits_per_field_10yr` | integer | photos | Rubin only: design median visits per field over ten years; not read by the site |
| `p9_relevance` | string | | What the survey did or will do for the Planet Nine question, with a `[verified: ...]` note |
| `color_hex` | string | | Old colour for the survey; not read by the site |
| `footprint_note`, `area_note`, `pointing_note`, `depth_note` | string | | Caveats on the footprint, area, pointings and depth |
| `years_src`, `depth_src`, `area_src`, `visits_src` | string | | Sources for Rubin's years, depth, area and visits |

### `p9_sky_track.json`
The predicted path of Planet Nine across the sky, computed from Brown & Batygin 2021's posterior median orbit, plus six variant paths that each shift one angle by its quoted 1-sigma spread; together they give a band. Derived, not observed: where on the path the planet is, is unknown.

Built by `scripts/build_sky.py` from the Brown & Batygin 2021 elements written into the script.
Used by `search/how.html` (the predicted path on the sky map and its distance range).

Top-level keys: `_what`, `_caution`, `_source_elements` (notes), `perihelion` and `aphelion` (one point each, the same fields as a track point; not read by the site), `tracks` (7 records).

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `tracks[].label` | string | | `nominal` (the best fit) or the variant, e.g. `varpi +15.1`, `Omega -15.5`, `i +5.2` |
| `tracks[].elements.a_au` | number | AU | Semi-major axis |
| `tracks[].elements.e` | number | | Eccentricity |
| `tracks[].elements.i_deg` | number | degrees | Inclination |
| `tracks[].elements.varpi_deg` | number | degrees | Longitude of perihelion |
| `tracks[].elements.Omega_deg` | number | degrees | Longitude of the ascending node |
| `tracks[].points[]` | list of 180 | | Points round the orbit, every 2 degrees of true anomaly |
| `points[].true_anomaly_deg` | integer | degrees | Angle round the orbit from the closest point (0 perihelion, 180 aphelion) |
| `points[].r_au` | number | AU | Distance from the Sun |
| `points[].ra_deg`, `points[].dec_deg` | number | degrees | Sky position, right ascension and declination (heliocentric) |
| `points[].ecl_lon_deg`, `points[].ecl_lat_deg` | number | degrees | Sky position in ecliptic longitude and latitude; not read by the site |
| `points[].est_V_mag` | number | magnitudes | Rough brightness, anchored by us at V = 22 at 300 AU and scaled as reflected light (`ours`); not read by the site, which uses the brightness model in `planet_nine_predictions.json` |

## Analysis files

Built along the way and kept for the analysis behind the site, but not loaded by any page. They are only in `data/processed/`.

### `tnos.csv`
Every body in JPL's Small-Body Database with a semi-major axis over 30 AU (8,079 rows), JPL's orbit joined to the MPC's independent solution where the two cross-match (7,286 rows). Besides the 7,296 trans-Neptunian objects it includes comets and a few other classes.
Built by `scripts/build_tnos.py` from the JPL Small-Body Database query (a > 30 AU, `data/raw/jpl_sbdb_a_gt_30.json`) and the MPC distant-object catalogue (`data/raw/mpc_distant_extended.json.gz`). Not loaded by the site (analysis only); it is the input to `etnos.json`, `discoveries.csv`, `positions.json` and other build scripts (no copy in `public/data/`).

One row per body, sorted by `a_au` descending. Empty cells are missing values; booleans are written `True`/`False`. The columns are the same as `etnos.json`'s first 34 fields (that file adds `delta_varpi_deg` and `alignment`):

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id` | string | | JPL's primary designation: the number for numbered objects, else the provisional designation (comets without their `C/` prefix, e.g. `2004 R2`) |
| `provisional_desig` | string | | The designation in parentheses at the end of `full_name`, else `id` if it is a year-based designation, else the MPC's principal designation. For comets this picks up the comet's name instead (`ASAS`, `Peltier`), since that is what JPL puts in parentheses |
| `spkid` | integer | | JPL's SPK-ID |
| `name` | string | | Proper name, if any |
| `full_name` | string | | JPL's full name |
| `orbit_class` | string | | JPL's orbit class: `TNO` 7,296; `COM` (comet) 733; `JFc`, `CTc`, `HTC` (other comet classes); `AMO`, `CEN` (Amor asteroid, centaur) |
| `a_au` | number | AU | Semi-major axis: average distance from the Sun |
| `e` | number | | Eccentricity |
| `i_deg` | number | degrees | Inclination to the ecliptic |
| `node_deg` | number | degrees | Longitude of the ascending node (Ω) |
| `argperi_deg` | number | degrees | Argument of perihelion (ω) |
| `varpi_deg` | number | degrees | Longitude of perihelion, (Ω + ω) mod 360: the direction of the closest point |
| `mean_anom_deg` | number | degrees | Mean anomaly at the epoch |
| `tp_jd` | number | Julian date | Time of perihelion passage |
| `q_au` | number | AU | Perihelion distance (closest to the Sun) |
| `Q_au` | number | AU | Aphelion distance (farthest); enormous for near-parabolic comets |
| `period_yr` | number | years | Orbital period |
| `epoch_jd` | number | Julian date | Epoch of the elements (5,546 rows share 2461200.5, 2026-06-09) |
| `H_mag` | number | magnitudes | Absolute magnitude (blank for most comets) |
| `diameter_km` | number | km | JPL's measured diameter, where one exists |
| `albedo` | number | | JPL's measured reflectivity, where one exists |
| `condition_code` | integer | | JPL orbit condition code, 0 (well determined) to 9 (very poor); blank for 647 rows |
| `n_obs` | number | | Observations used in JPL's fit |
| `data_arc_days` | number | days | Observed arc JPL's fit spans |
| `first_obs`, `last_obs` | date | | First and last observation JPL used |
| `mpc_a_au`, `mpc_q_au`, `mpc_e` | number | AU, AU, — | The MPC's semi-major axis, perihelion distance and eccentricity; blank if unmatched |
| `mpc_U` | integer | | MPC uncertainty parameter, 0 (best) to 9 (worst) |
| `mpc_num_opps` | integer | | Number of oppositions (roughly, years) at which it was observed |
| `mpc_arc_years` | string | | Years spanned, `YYYY-YYYY`; blank for single-opposition or unmatched objects |
| `well_determined` | boolean | | Seen at more than one opposition (MPC count ≥ 2, else JPL arc ≥ 365 days): the papers' sample rule. 4,809 True |
| `a_disagreement_pct` | number | % | \|MPC a − JPL a\| / JPL a × 100; blank if unmatched |

### `discoveries.csv`
Who found each body in `tnos.csv`, where and when (8,079 rows, one per body). Only numbered objects have an official MPC discovery record (1,050 rows; 18 of the 90 extreme objects); the rest fall back to JPL's first-observation date.
Built by `scripts/build_discovery.py` from the MPC numbered-minor-planet discovery list (`NumberedMPs.txt`) joined to `tnos.csv`. Not loaded by the site (analysis only); no copy in `public/data/`.

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id` | string | | Designation, as `tnos.csv`'s `id` |
| `name` | string | | Proper name, if any |
| `a_au` | number | AU | Semi-major axis (copied from `tnos.csv`) |
| `q_au` | number | AU | Perihelion distance (copied from `tnos.csv`) |
| `discovery_date` | date | | Official discovery date from the MPC list; blank if none |
| `discovery_site` | string | | Discovery site as the MPC list names it (e.g. `Mauna Kea`, `Haleakala`); blank if none |
| `discoverers` | string | | Discoverer(s) or survey as the MPC list gives them (e.g. `Pan-STARRS 1`); blank if none |
| `first_obs_jpl` | date | | First observation in JPL's orbit fit (the fallback date) |
| `discovery_source` | string | | Which of the two the row rests on: `MPC numbered-object discovery list` or `JPL first observation (no official discovery record)` |

### `catalogue_samples.json`
One real record for the same object, Sedna, from each raw catalogue exactly as stored (JPL's query row, the MPC distant-object record, the line in the MPC numbered-object list), plus row counts and the JPL query itself, to show what the raw data looks like.
Built by `scripts/build_catalogue_samples.py` from the team's raw downloads in `../FinalProject/data/raw` (falling back to `data/raw/`). Not loaded by the site (analysis only); data/README.md says it is shown on the distance page, but nothing in `src/` loads it.

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `_what` | string | | Note |
| `_fetched_from.{jpl, mpc, numbered}` | string | | File names of the three raw files read |
| `query.endpoint`, `query.sb-kind`, `query.sb-cdata`, `query.full-prec`, `query.fields` | string | | The JPL Small-Body Database query that produced the JPL file: endpoint, kind `a` (asteroids only), constraint a > 30 AU, full precision, the 46 fields requested |
| `counts.jpl_rows_a_gt_30` | integer | | Rows in that JPL file (7,313) |
| `counts.jpl_fields` | integer | | Fields per JPL row (46) |
| `counts.mpc_distant_rows` | integer | | Records in the MPC distant-object file (8,312) |
| `counts.mpc_distant_a_gt_30` | integer | | Of those, with a > 30 AU (7,283) |
| `counts.mpc_numbered_lines` | integer | | Lines in the MPC numbered-object list (895,910) |
| `jpl.*` | strings (mostly), as JPL returns them | | Sedna's JPL row, 46 fields: identifiers (`spkid`, `full_name`, `pdes`, `name`, `prefix`, `kind`, `class`); brightness and size (`H` absolute magnitude, `G` slope, `diameter`, `albedo`); the orbit (`orbit_id`, `epoch`, `epoch_cal`, `e`, `a`, `q`, `i`, `om` node, `w` argument of perihelion, `ma` mean anomaly, `ad` aphelion, `n` mean motion in degrees a day, `tp_cal` perihelion date, `per_y` period in years); `moid`, `moid_jup` (closest approach between its orbit and Earth's / Jupiter's, AU); `t_jup` (Tisserand parameter with respect to Jupiter); `sigma_*` (1-sigma uncertainties of e, a, q, i, om, w, ad, period); solution metadata (`source`, `soln_date`, `producer`, `data_arc` in days, `first_obs`, `last_obs`, `n_obs_used`, `condition_code`, `rms` residual, `two_body`) |
| `mpc.*` | mixed, as the MPC file holds them | | Sedna's MPC record, 31 fields: `H`, `G`, `Num_obs`, `rms`, `U` (uncertainty parameter), `Arc_years`, `Perturbers`, `Perturbers_2`, `Number`, `Name`, `Principal_desig`, `Epoch` (JD), `M` (mean anomaly), `Peri` (argument of perihelion), `Node`, `i`, `e`, `n`, `a`, `Ref`, `Num_opps`, `Computer`, `Hex_flags`, `Last_obs`, `Tp` (perihelion time, JD), `Orbital_period` (years), `Perihelion_dist`, `Aphelion_dist`, `Semilatus_rectum` (AU), `Synodic_period` (years), `Orbit_type` |
| `numbered` | string | | Sedna's fixed-width line from the numbered-object list |
| `numbered_columns` | string | | What that line's columns are: number, name, discovery date, discovery site, discoverer(s) |

### `tno_summary.json`
Counts for each standard cut of the a > 30 AU catalogue, written alongside `tnos.csv` and `etnos.json`.
Built by `scripts/build_tnos.py` from the same JPL and MPC sources. Not loaded by the site (analysis only).

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `source_jpl` | string | | JPL source note |
| `source_mpc` | string | | MPC source note |
| `n_objects_a_gt_30` | integer | | Bodies with a > 30 AU (8,079; the rows of `tnos.csv`) |
| `n_matched_to_mpc` | integer | | Of those, cross-matched to an MPC record (7,286) |
| `n_a_gt_100` | integer | | Bodies with a ≥ 100 AU (1,001) |
| `n_etno_a150_q30` | integer | | Extreme objects, a ≥ 150 AU and q ≥ 30 AU (90; the rows of `etnos.json`) |
| `n_a250_q40` | integer | | The stricter 2016-style cut, a ≥ 250 AU and q ≥ 40 AU (23) |
| `etno_cut.a_au_min`, `etno_cut.q_au_min` | number | AU | The extreme-object cut (150, 30) |
| `planet_nine_varpi_deg_assumed` | number | degrees | Planet Nine's predicted longitude of perihelion used for `delta_varpi_deg` (246.7, Brown & Batygin 2021) |
| `n_etno_well_determined` | integer | | Extreme objects seen at more than one opposition (62) |
| `anti_aligned_fraction` | number | | Share of the 90 extreme objects marked `anti-aligned` (0.511) |

### `luck_extras.json`
Extra luck tests on the 62-object sample (a > 150 AU, q > 30 AU, seen in more than one year), measuring alignment as R, the length of the average of the objects' unit arrows (0 = pointing every way, 1 = all one way), against random orientations and against a rough allowance of our own for where telescopes looked.

Built by `scripts/build_luck_extras.py` from `etnos.json`, the MPC observations cached in `data/raw/mpc_obs/` (discovery dates) and the team's raw JPL download (spots of sky where objects were first seen).
Not loaded by the site (analysis only); the probability page moved to `bb2016.json` on 2026-11-17.

Top-level keys: `_what`, `_statistic`, `_sample` (notes); `_seed`; `n_objects`; `pointing_observed`, `tilt_observed`; `then_2016`, `random`, `looking`.

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `_seed` | int | | Random seed (1710) |
| `n_objects` | int | count | Objects in the sample (62) |
| `pointing_observed.R` | float | | R of the arrows towards each closest point (longitude of perihelion) |
| `pointing_observed.mean_deg` | float | degrees | Direction of their average arrow |
| `tilt_observed.R`, `.mean_deg` | float | –, degrees | Same for the tilt arrows (ascending node + 90°) |
| `then_2016._what` | string | | Note: the pointing test on the sample's objects first seen before 2016 |
| `then_2016.n_objects`, `.objects` | int, list of string | count | Those objects and their ids |
| `then_2016.n_trials` | int | count | Simulated sets (200,000) |
| `then_2016.R_observed`, `.mean_varpi_deg` | float | –, degrees | Their R and average direction |
| `then_2016.p_value` | float | share (0–1) | `(n_as_aligned + 1) / (n_trials + 1)` |
| `then_2016.one_in` | int | | `1 / p_value`, rounded |
| `then_2016.n_as_aligned` | int | count | Simulated sets with R at least the observed |
| `then_2016.null_histogram.bin_edges` | list of 41 float | | Bin edges in R, 0 to 1 in steps of 0.025 |
| `then_2016.null_histogram.counts` | list of 40 int | count | Simulated sets per bin |
| `random._what` | string | | Note: each simulated object gets a random closest-point direction and, independently, a random tilt |
| `random.n_trials` | int | count | Simulated sets (1,000,000) |
| `random.pointing.*`, `random.tilt.*` | object | | `p_value`, `one_in`, `n_as_aligned`, `null_histogram` as in `then_2016`, for each arrow |
| `random.both.*` | object | | `p_value`, `one_in`, `n_as_aligned` for sets at least as aligned in both at once |
| `random.grid.bin` | float | | Grid cell width in R (0.025) |
| `random.grid.cells` | list of [int, int, int] | | `[pointing bin, tilt bin, count]` for every non-empty cell of the two-way histogram |
| `looking._what`, `looking.src` | string | | Note on the method; `src` is `ours` (our assumption, not a finding) |
| `looking.n_spots` | int | count | Spots of sky where known objects beyond Neptune were first seen (7,119) |
| `looking.n_trials` | int | count | Simulated sets (200,000) |
| `looking.pointing.*`, `.tilt.*`, `.both.*`, `.grid.*` | as in `random` | | The same tests with simulated objects placed where telescopes found real ones |

### `clustering_null.json`
The first "is this just luck?" test: for six cuts on the extreme-object sample, how aligned the longitudes of perihelion are (R, 0 = spread out, 1 = all one way) against 200,000 sets of random directions. The random sets assume telescopes could find an object in any direction, so these odds are an upper bound on how surprising the clustering is.

Built by `scripts/build_clustering_null.py` from `etnos.json` (it writes only `data/processed/`; the `public/data/` copy is identical).
Not loaded by the site (analysis only); an archived, commented-out block in `search/timeline.html` still names it.

Top-level keys: `_what`, `_statistic`, `_caution` (list of three warnings), `_n_trials` (200,000), `_seed` (1710), `cuts`.

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `cuts[].id` | string | | Short name of the cut (e.g. `etno_150_30_good`) |
| `cuts[].label` | string | | The cut in words |
| `cuts[].a_min_au` | int | AU | Minimum average distance (semi-major axis); the code keeps a ≥ this |
| `cuts[].q_min_au` | int | AU | Minimum closest point; the code keeps q ≥ this |
| `cuts[].well_determined_only` | bool | | Only objects seen in more than one year |
| `cuts[].n_objects`, `cuts[].objects` | int, list of string | count | Objects in the cut and their ids |
| `cuts[].R_observed` | float | | R of their longitudes of perihelion |
| `cuts[].mean_varpi_deg` | float | degrees | Their average longitude of perihelion |
| `cuts[].p_value` | float | share (0–1) | Share of random sets at least as aligned, `(n + 1) / (trials + 1)` |
| `cuts[].one_in` | int | | `1 / p_value`, rounded |
| `cuts[].null_percentiles.50` … `.99.9` | float | | R of the random sets at the 50th, 90th, 95th, 99th, 99.9th percentile |
| `cuts[].null_histogram.bin_edges` | list of 41 float | | Bin edges in R, 0 to 1 in steps of 0.025 |
| `cuts[].null_histogram.counts` | list of 40 int | count | Random sets per bin |

### `published_odds.json`
Each study's own answer to "how often would chance alone produce the clustering?", quoted from its abstract, for an odds chart.

Hand-maintained (checked against the PDFs on 2026-10-30; `scripts/build_sources_doc.py` reads it for the sources document).
Not loaded by the site (analysis only); the odds chart that read it is archived in a comment in `search/timeline.html`.

Top-level keys: `_what`, `_src` (what `abstract` and `derived` mean), `_fields` (notes on three fields), `studies` (5 records).

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `studies[].label` | string | | Paper, as cited |
| `studies[].doi` | string | | Its DOI |
| `studies[].side` | string | | `for` or `against` a planet |
| `studies[].detail` | string | | What the study counted, in technical words |
| `studies[].plain_detail` | string | | The same in plain words, shown under the authors |
| `studies[].quote` | string | | The sentence the number comes from |
| `studies[].p` | float or null | share (0–1) | Chance by luck; null where the abstract gives no number (Shankman et al. 2017); absent where a range is given |
| `studies[].p_range` | [float, float] | share (0–1) | Low and high chance where the abstract gives a range (Napier et al. 2021) |
| `studies[].src` | string | | `abstract` (quoted) or `derived` (converted by us, e.g. 99.6% confidence → 0.4%) |
| `studies[].allows_for_looking` | bool | | Whether the study allows for where telescopes looked |
| `studies[].count` | string or null | | How many objects (and surveys) it counted, as shown; null where the abstract gives none |

### `etno_perihelion_sky.json`
Where on the sky the closest point (perihelion) of each of the 90 extreme objects (a > 150 AU, q > 30 AU) lies, for overlaying on the survey footprints.

Built by `scripts/build_sky.py` from `data/processed/etnos.json`.
Not loaded by the site (analysis only).

Top-level keys: `_what`, `_caution` (notes), `n` (90), `objects` (90 records).

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id` | string | | Designation (e.g. `2020 MQ53`) |
| `name` | string | | Proper name, empty for most (3 of 90 named) |
| `a_au` | number | AU | Semi-major axis |
| `q_au` | number | AU | Closest distance to the Sun |
| `i_deg` | number | degrees | Inclination |
| `varpi_deg` | number | degrees | Longitude of perihelion |
| `delta_varpi_deg` | number | degrees | `varpi_deg` minus Planet Nine's 246.7, wrapped to -180 to 180 |
| `alignment` | string | | `anti-aligned` if the difference is over 90 degrees (closest point opposite Planet Nine's, the clustered side), else `aligned` |
| `well_determined` | boolean | | Seen in more than one year (62 true); false orbits can shift with more data |
| `peri_ra_deg`, `peri_dec_deg` | number | degrees | Sky direction of the perihelion, right ascension and declination |
| `peri_ecl_lon_deg`, `peri_ecl_lat_deg` | number | degrees | The same in ecliptic longitude and latitude |

## Image and logo manifests

Written by the fetch scripts next to the images they describe, and read for the credits.

### `public/game/game.json`
Manifest of the real archive exposures used by the tracking game: four rounds, each one distant object's frames over a few nights, aligned on the stars, with the object's pixel position and time in each frame and the archive's credit. Also lists objects that were tried and set aside.

Built by `scripts/fetch_game_sequences.py` from the NOIRLab Astro Data Archive (DECam) and the Canadian Astronomy Data Centre (CFHT MegaCam), positions from the Minor Planet Center or JPL Horizons.
Used by `setting/data.html` (the tracking game, `charts/spotgame.js`) and `credits.html`.

Top-level keys: `_what`, `_positions` (pixel convention: origin top-left, y down, times mid-exposure UT), `_fetched`, `rounds` (4), `skipped` (15 records of `id`, `object`, `why`).

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id`, `object` | string | | Round key and the object's name |
| `date`, `telescope` | string | | Nights covered, in words, and the camera and telescope |
| `files` | list of strings | | Image files in `public/game/`, one per frame |
| `size` | [integer, integer] | pixels | Frame width and height |
| `positions` | list of [number, number] | pixels | The object's x, y in each frame |
| `times` | list of strings | | Mid-exposure time of each frame, UT |
| `frames_are`, `filter`, `frame_filters` | string, string, list of lists | | What a frame is (single exposure, mean of two, or colour composite) and the filters in it |
| `colour` | object or null | | For a colour round: which filter went to `blue`, `green`, `red`, the colour `balance`, and `motion_px` (how far the object moved within each composite, pixels) |
| `scale_arcsec_px` | number | arcseconds per pixel | Plate scale |
| `exposure_s` | list of numbers | seconds | Exposure time of each frame |
| `archive_files` | list of strings | | Archive file and extension behind each frame |
| `positions_from` | string | | How the positions were computed and their fit error |
| `check_offsets_px`, `check_median_px`, `check_snr` | list, number, list | pixels | Check against the pixels: offset of the brightest residual from each computed position, their median, and that residual's signal-to-noise |
| `credit`, `license`, `license_url`, `terms`, `acknowledgement`, `source` | string | | Archive credit, licence, when the data became public, the required acknowledgement, and a source link |

### `public/tracking/credits.json`
Manifest of three real discovery photographs (Pluto, Sedna, 2015 BP519) shown as blink players, with their credits read from the Wikimedia Commons API.

Built by `scripts/fetch_tracking_images.py` from Wikimedia Commons.
Used by `setting/data.html` (the three discoveries, `charts/tracking.js`) and `credits.html`.

Top-level keys: `_what`, `_fetched`, `images` (3).

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id` | string | | Key (`pluto`, `sedna`, `bp519`) |
| `files` | list of strings | | Image files in `public/tracking/` |
| `dates` | list of strings | | Date of each photo |
| `caption` | string | | What the photos show |
| `credit`, `license`, `license_url`, `source` | string | | Author, licence and its link, Commons page |
| `original_size` | [integer, integer] | pixels | Size of the original on Commons |

### `public/telescopes/credits.json`
Manifest of 21 photographs of the observatories that measured the extreme objects most, each tied to its Minor Planet Center observatory codes so the map can put it on the right site.

Built by `scripts/fetch_telescope_photos.py` from Wikimedia Commons (one local photograph, Cupillari, with its credit written in the script).
Used by `setting/data.html` (the site cards on the world map, `charts/scopes.js`) and `credits.html`.

Top-level keys: `_what`, `_fetched`, `photos` (21).

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id`, `file` | string | | Key and image file in `public/telescopes/` |
| `codes` | list of strings | | MPC observatory codes the photo stands for |
| `name`, `place` | string | | Observatory name and location shown on the card |
| `credit`, `license`, `license_url`, `source` | string | | Author, licence and its link, source page (`license` is empty for the local Cupillari photograph) |
| `original_size` | [integer, integer] | pixels | Size of the original |

### `public/logos/credits.json`
Manifest of the two organisation logos the site shows (the IAU's and JPL's), with credits and trademark restrictions read from the Wikimedia Commons API.

Built by `scripts/fetch_logos.py` from Wikimedia Commons.
Used by `credits.html` (the logos themselves appear on `setting/planets.html` and `setting/data.html`).

Top-level keys: `_what`, `logos` (2).

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id`, `file` | string | | Key and SVG file in `public/logos/` |
| `mono_file` | string | | The white version (JPL only, `jpl-mono.svg`) |
| `what`, `shown` | string | | What the logo is and where the site shows it |
| `url`, `mime` | string | | Download URL and file type |
| `size` | [integer, integer] | pixels | Original size |
| `credit`, `vectorised_by` | string | | Author and who drew the vector version |
| `license`, `license_url`, `restrictions`, `source` | string | | Licence and its link, restrictions (`trademarked`), Commons page |
