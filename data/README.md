# Planet Nine — data

Everything the site's pages need. Run `./scripts/fetch_all.sh` to rebuild
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

**`catalogue_samples.json`** — Sedna's raw record from each catalogue (the JPL
query row with all 46 fields, the MPC distant-object record, and its line in
the MPC numbered-object list), plus row counts and the JPL query itself. Built
by `scripts/build_catalogue_samples.py` from the raw downloads in
`../FinalProject/data/raw` (falling back to `data/raw/`). Shown on the
distance page so readers see what the stored data actually looks like.

**`tnos.csv`** — 8,079 small bodies with semi-major axis > 30 AU. JPL orbital
elements joined to the Minor Planet Center's independent solution for the same
object, so you can show where the two catalogues disagree (`a_disagreement_pct`,
`mpc_U`). 7,286 of 8,079 cross-match. `varpi_deg` (longitude of perihelion,
Ω + ω) is the angle the whole clustering argument is about. `well_determined` is
the papers' sample rule: seen at more than one opposition (MPC `Num_opps` ≥ 2;
where the MPC has no count, an arc of a year or more), as in Brown & Batygin
2019 and 2021. The site calls it "seen in more than one year". Use it —
one-opposition orbits move a lot. (Until 2026-10-30 the site used a stricter rule
of its own: condition code ≤ 3, at least 3 oppositions, arc ≥ 1 year, which kept
44 of the 90.)

**`etnos.json`** — the 90 extreme objects (a > 150 AU, q > 30 AU), with
`delta_varpi_deg` and `alignment` measured against Planet Nine's predicted
longitude of perihelion (ϖ₉ = 246.7°). 62 were seen at more than one opposition. Note that
numbered objects are keyed by number, so `2015 BP519` appears as id `768325`;
use the `provisional_desig` column to build a search index users can actually
type into.

**`tno_summary.json`** — sample counts for each standard cut.

**`discoveries.csv`** — who found each object, where, and when. Only numbered
objects have an official MPC discovery record (1,050 of 8,079; 18 of the 90
extreme objects), so unnumbered ones fall back to JPL's first-observation date.
The `discovery_source` column says which you are looking at.

**`clustering_null.json`** — the "is this just luck?" numbers. For six cuts on
the extreme sample it gives the observed mean resultant length R of the
longitudes of perihelion, a 200,000-trial uniform-random null distribution with
histogram, and a p-value. The headline result is how much the answer moves with
the cut:

| cut | n | R | p |
|---|---|---|---|
| a > 250, q > 40 | 23 | 0.170 | 0.52 |
| a > 250, q > 40, more than one opposition | 21 | 0.192 | 0.47 |
| a > 150, q > 30 | 90 | 0.082 | 0.55 |
| a > 150, q > 30, more than one opposition | 62 | 0.249 | 0.020 |
| a > 200, q > 35 | 42 | 0.124 | 0.53 |
| a > 200, q > 35, more than one opposition | 36 | 0.195 | 0.26 |

That sensitivity is the story, not a bug. **The null assumes surveys are equally
likely to find an object pointing in any direction, which is exactly what
Shankman et al. (2017) and Napier et al. (2021) dispute.** These p-values are an
upper bound on how surprising the clustering is. Say so on the page. The
probability page draws its guided piles from these histograms and quotes these
p-values, so the pile, the count and the odds agree.

**`luck_extras.json`** — luck tests beyond the one in
`clustering_null.json`, by `scripts/build_luck_extras.py` (no page reads it since the probability page was rebuilt
on `bb2016.json` on 2026-11-18; kept as a record of the checks), on the page's sample
(a > 150, q > 30, more than one opposition), seed 1710. Two arrows per object,
as on the two Evidence pages: *pointing*, towards its closest point to the Sun
(varpi), and *tilt*, towards the half of its orbit raised above the planets'
plane (node + 90°). Each test's statistic is R, the length of the average arrow.
Checked on 2026-11-17:

| test | n | trials | pointing | tilt | both at once |
|---|---|---|---|---|---|
| first seen before 2016 (`then_2016`) | 43 | 200,000 | R 0.338, 1 in 145 | | |
| random orientations (`random`) | 62 | 1,000,000 | 1 in 49 | R 0.303, 1 in 320 | 1 in 15,000 (65 cases) |
| found where telescopes looked (`looking`, `src: ours`) | 62 | 200,000 | 1 in 9 | 1 in 112 | 1 in 1,100 |

*First seen* is the date of the MPC's discovery observation (the line marked
`*` in the cached observations, `data/raw/mpc_obs/`), or the year in the
provisional designation where none is marked (only 2013 RA109). Today's orbits
are used, so this is the alignment the 2016 objects show now, not what was
measured in 2016. *Random orientations* gives each simulated object a random
closest-point direction and, independently, a random tilt direction, so the
both-at-once odds are close to the product of the two (1/49 × 1/320). The
`random` and `looking` entries carry both piles and a two-way grid (`grid.cells`,
`[pointing bin, tilt bin, count]`, bins of 2.5%) that the page draws.

*Found where telescopes looked* is **our rough allowance**, not a finding. A
distant object is seen almost only near its closest point to the Sun, so each
simulated object sits at its closest point on a spot of sky where one of the
7,119 objects with a > 30 AU in the team's raw JPL download was first seen (its
heliocentric ecliptic longitude and latitude on its first night, from its orbit,
moved by up to 5° and 1°), keeping the tilt of one of the real objects; a spot
farther from the plane than that tilt is drawn again. The spot and the tilt fix
the orbit's orientation, so both arrows follow. Those spots are uneven: few where
the Milky Way crosses, and mostly within a few degrees of the plane (half within
3.3°). It ignores survey depth and distance, and that the Kuiper belt is not
spread evenly itself. Brown & Batygin (2019) model the surveys and still find
about 1 in 500; Napier et al. (2021) find the bunching consistent with chance.
The page says so. Batygin & Brown (2016) combined the same two clues for their
six objects (0.7% for where they point, 1% for their poles, 0.007% together),
drawing their random sets from the orbits of all known objects with q > 30 and
a > 50 AU.

Since 2026-11-17 the probability page no longer reads `luck_extras.json` or
`clustering_null.json` (it reads `bb2016.json`, below); both stay, with their
scripts, for the archived charts in `search/timeline.html`.

**`bb2016.json`** — Batygin & Brown (2016)'s luck test reproduced, by
`scripts/build_bb2016.py` (seed 2016), for the probability page. **The six**:
Sedna, 2012 VP113, 2004 VN112, 2010 GB174, 2007 TG422, 2013 RF98 (today's orbits
from `etnos.json`). **Statistic 1**: each orbit's closest point placed on the sky
(the ecliptic longitude and latitude of its perihelion direction); the spread is
the root-mean-square angle from each to the normalised average direction, as the
paper words it. Six: 36.2°. **Statistic 2**, the paper's "RMS spread of the polar
angles": read as the direction of each projected pole, which is the node less
90°, so the root-mean-square difference of each node from their circular mean.
Six: 29.8°. Two other readings (the 3-D angle between poles, and the pole's
position angle on the sky at perihelion) give about 4% where the paper says 1%;
this one about 1%. **The allowance**, as theirs: draw six of every object with
q > 30 AU and a > 50 AU first seen before 2016 (numbered: discovery date in
`NumberedMPs.txt`; otherwise the year in the provisional designation), 827 in
the team's JPL download, 100,000 times, as the paper (`published.draws`; the page
drew a million from round 4 until round 6, 2026-11-17, when readers asked why it
did not match the paper). The check on multiplying (`joint_check`) runs the same
draws on, with the same seed, to 1,000,000, so its first 100,000 are `repro`'s:
at 100,000 so few draws are tight in both clues that their count is left to
chance (11 in one run, 19 in another). That pool is
a little larger than theirs, as some objects first seen in 2013–2015 were
announced after January 2016; pools cut at 2013, 2014 and 2015 (`sensitivity`)
give products of 0.005% to 0.014%. Checked on 2026-11-17:

| | ours (100,000 draws) | Batygin & Brown 2016 (100,000) |
|---|---|---|
| closest points as tight as the six | 0.98% (982) | 0.7% |
| tilts as tight | 0.92% (919) | 1% |
| the two multiplied | 0.009%, 1 in 11,000 (the page: less than 1 in 10,000) | 0.007%, 1 in 14,000 ("about 3.8σ") |
| both in the same draw (`joint_check`, the same draws on to 1,000,000) | 126 of 1,000,000, 1.4 × the 90 the product predicts (9,727 × 9,227 / 1,000,000); 1 in 7,900 | (not tested) |

Why ours is about 0.97% where theirs is 0.7% (audited 2026-11-17, every run on
1,000,000 draws, so the Monte Carlo error is about ±1% of the share; at the
paper's 100,000 draws it is about ±4%, so even a perfect repeat would land
within ±5% of 0.7% only four times in five). The method follows section 2 word
for word: each closest point placed in ecliptic coordinates; the root-mean-square
angular distance from each to the average position of the six drawn; six drawn
at random, without replacement, from "the collection of all objects with q > 30
AU and a > 50 AU", the six themselves included; "as tightly clustered" read as at
least as tight; 100,000 draws. Its one open word does not matter: reading "the
average perihelion position" as the mean of the ecliptic longitudes and latitudes
rather than the mean direction gives 0.988% against 0.979%. No bug was found: no
object of the pool lacks a date, and the discovery dates parse correctly (Sedna
2003-11-14, 2015 TG387 2015-10-13). What cannot be repeated is their catalogue.
The pool is every object *first seen* before 2016, but 573 of its 827 were first
seen in 2013–2015 (105, 194, 274), and many of those were likely announced only
after January 2016, when Batygin and Brown drew theirs (the large surveys of
those years, OSSOS and DES, published their objects from 2016 on); the download
has no announcement dates (unverified which), and today's orbits stand in for the
2016 ones. Bracketing it, a pool certainly public by 2016 (first seen before 2013,
plus the six; 255 objects) gives 0.83% for the closest points and 0.65% for the
tilt; ours (827) gives 0.97% and 0.91%; pools cut at 2014 and 2015 give 1.15%
and 1.30% for the closest points. Their 0.7% lies below every pool and their 1%
above every pool, so no single faithful pool repeats both, and none was chosen
to: the page keeps the paper's literal pool (first seen before 2016) and says
what Batygin and Brown found beside our figure.

**`today`**: the same method on today's objects seen in more than one year
(`well_determined`), drawn from every object with q > 30 AU and a > 50 AU known
today (1,589), 100,000 draws each, at nine distances (a above 150, 175, 200, 225,
250, 275, 300, 350 and 400 AU), each with q > 30 AU and with q > 42 AU (Brown &
Batygin 2021's choice of orbits clear of Neptune), for the page's line the reader
drags. Since 2026-11-18 the page quotes the product of the two shares, as
Batygin and Brown multiplied in 2016 (the relation between the two clues is only
taken up after today's section); counted in the same draws in brackets: a > 150
AU (62 objects, the sample the data and clustering pages use) 1 in 49 (1 in 52);
a > 175 (50) 1 in 75 (1 in 84); a > 200 (42) 1 in 6; a > 250 (33) 1 in 4; a > 300
(27) 1 in 9; a > 400 (15) 1 in 3; clear of Neptune, a > 150 (21) 1 in 26 (1 in
28). The two differ by under a tenth at every line. Beyond
150 AU, 8.4% of draws are at least as tight on the sky and 24% on the tilt;
beyond 250 AU, 49% on the sky. Each cut keeps its objects' closest points on the
sky (`points`) and their `middle`. Checked with the site's alignment
measure on the same draws: a > 250, 36% for where they stretch and 35% for the
tilt; a > 150, 8% each. The random-direction tests (`uniform_spread`, the six's spread against 1,000,000
sets of six random directions, 1 in 87; `uniform`, their alignment, 1 in 68) were
dropped from the file on 2026-11-17: the page makes one kind of draw, from the
known objects, and a second kind confused readers. The page draws every spread
as a wedge on a compass round the Sun, but the stretch's number is the paper's
spread on the sky; for the six the two are 36.8° and 36.2°, and for the 80 draws
the page shows they differ by under a degree in the middle and within 5° in 9 of
10 (at most 27°, a draw whose objects lie far from the plane in the same
direction); 82% of the known objects lie within 20° of the plane.
**`studies`**: each study's result as its paper states it (no page draws them
since 2026-11-17; the scale that did is archived in a comment in search/timeline.html)
(`src`), with how it allowed for where telescopes looked: Brown & Batygin 2019
0.2% and 2021 0.4%; Shankman et al. 2017 (OSSOS, 8 objects) consistent with a
uniform distribution, no single figure; Napier et al. 2021 (14 objects, three
surveys) 17%–94%; Bernardinelli et al. 2022 (DES, 16 objects beyond 150 AU)
p = 0.88 for the longitude of perihelion. Checked against `papers/`. The page
(`charts/luck.js`) also draws, from this file, the objects known before 2016 and
today round two compasses, one dot each, stacked by 10° slice (`pool_2016`,
`pool_today`, each object at the direction of its far end, the longitude of its
closest point plus 180°, and of its tilt, the node plus 90°, from `node_deg`, which
`pool_today` carries since round 5, the draws unchanged; the fullest slice of 2016
holds 46 and the emptiest 11 by the stretch, 47 and 9 by the tilt), 80 of the draws
(`repro.examples`) cycling on both compasses with their objects lit in the stacks,
each draw's tilt spread computed on the page from the same objects, and today's
objects at each line (from `today[].ids` and `etnos.json`). **`joint_check`**: the counts of `repro`'s draws carried on to 1,000,000 (the
same seed; `first_draws_are`): 9,727 as tight on the sky, 9,227 on the tilt, 126 in
both where the product predicts 89.8 (`product_expects_n`), a ratio of 1.4. The
page shows it as two bars: how often the tilt is as tight among all the draws
(9,227 of 1,000,000, 0.92%) and among the draws whose closest points are as tight
(126 of 9,727, 1.3%). The square of the
first section (every draw placed by its rank on each spread, tightest at the
corner) uses `repro`'s shares: if the two spreads are unrelated the draws fill it
evenly and the corner holds their product, 9 of 100,000; its arrangement is an
illustration, only the shares come from this file. The overall correlation of the
two spreads across draws is about zero (r = −0.007 in 200,000 draws on the page's
pool); the relation is in the tight tail only, which is why it is shown as a count.

**`published_odds.json`** — each study's own answer to "how often would chance
produce this?", quoted from its abstract (`quote`, `src`): 0.007% (Batygin &
Brown 2016), 0.2% (Brown & Batygin 2019), 99.6% confidence (Brown & Batygin
2021, so 0.4%, `derived`), 17% to 94% (Napier et al. 2021), and Shankman et al.
2017's "consistent with ... a uniform underlying angular distribution", which
gives no number and is drawn without a mark. Checked against `papers/`.

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
ranges: a schematic of ragged real boundaries. Rubin's area is the exception
(checked 2026-11-20): it follows the survey's published definition, everything
south of declination +12 plus the North Ecliptic Spur, the sky north of that up
to ecliptic latitude +10 (`footprint`; Schwamb et al. 2023, arXiv:2303.02355,
sec. 4.1; survey-strategy.lsst.io, baseline v5.3.0). Those two limits enclose
27,170 square degrees against the published 19.6k + 7.5k. The spur gets a median
of 155 visits per pointing in g, r, i and z, against about 800 in the main area
(`visits`). Its single-photo depth is r ~ 24.3 (Brown & Batygin 2021, sec. 7).
Against the best-fit path this means the whole stretch too faint for the
searches so far lies inside Rubin's area; the 11% of the orbit (by time) outside
it is near the closest point, where the planet would be bright. The earlier band
(declination -62 to -1, squeezed to 18,000 square degrees) left most of the
faint stretch outside, which was wrong. Schwamb et al. also note that Rubin's
own moving-object pipeline only links objects out to about 100 to 150 AU, so a
Planet Nine search in Rubin's data is a separate effort; the site does not say
this yet (the paper is not in papers.json). Rubin's years (2026 to 2036,
`years_src`) follow its survey's start on the night of 29 June 2026; the How and
Future pages read them from here.

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

**`positions.json`** — where every known body beyond Neptune (the 7,295 of
class TNO in `tnos.csv`) and Voyager 1 were on JPL's catalogue date,
2026-06-09, for the distance page's map. Built by
`scripts/build_positions.py`: each body's mean anomaly is carried to that date
by two-body motion and its orbit laid flat on the ecliptic, so it keeps its
true distance from the Sun in the direction ϖ + ν (only the tilt is dropped).
Positions are in tenths of an AU. Voyager 1's position comes from JPL Horizons
(target −31) for the same date: 170.8 AU, moving outward 3.6 AU a year.

**`observatories.json`** — every telescope that has reported a position of one
of the 90 extreme objects, from the Minor Planet Center's observations API
(4,916 positions from 66 observatory codes; 64 have a place on Earth, Hubble
is in orbit, and one code marks occultation reports). Each code's place comes
from the MPC's observatory-code list (longitude and parallax constants,
converted to geodetic latitude). Per object: positions, nights (as decimal
years), how many observatories, and JPL's formal uncertainty on its closest
distance to the Sun (`sigma_q_au`, the data page's arc chart since 2026-11-16),
its far end (`sigma_Q_au`) and average distance (`sigma_a_au`) from the raw JPL
query; 17
objects have none: 16 found in 2025–26, and 2015 DR370. An uncertainty is kept
only where the raw query's orbit covers the same observed arc as the orbit in
`etnos.json`, within 15% (`_sigma_rule` in the file). 2015 DR370 is why: the
site's orbit spans 2015–2026 with Rubin's 2026 nights, but JPL re-solved it on
2026-10-07 from five days of 2015 alone (checked against JPL's live API on
2026-11-07; the MPC still links the 2026 nights to it), and that solution's
uncertainty read 37,000% of the far end. Built by
`scripts/build_observatories.py`, which caches the raw API answers in
`data/raw/mpc_obs/`; `--sigmas-only` re-reads just the uncertainties, with no
network.

Why the arc chart shows the closest point, not the far end (checked on
2026-11-16 against the same raw query, under the same 15% rule). The far end is
the least certain part of an orbit: 4 of the 61 reliable orbits with an estimate
have it uncertain by 10% or more, yet their closest distance is uncertain by
0.3%, 0.4%, 1% and 11% (2015 OB203, far end 93%), and the direction the orbit
points (`sigma_om` and `sigma_w` in quadrature, ignoring their covariance; not
stored) by 0.03° to 3°, and 14° for 2015 OB203. The closest distance's median
uncertainty is 0.01% for the reliable orbits and 29% for those seen in one year
only. `sigma_q_au` was added to the file on 2026-11-16 by the same logic as
`--sigmas-only`, run outside the script; re-running the script with
`--sigmas-only` gives the same file.

**`planets.json`** — J2000 Keplerian elements plus per-century rates for the
eight planets and Pluto (JPL/Standish approximate elements, valid 1800–2050),
with radius, mass and a colour for the solar-system backdrop.

**`planet_nine_predictions.json`** — eight published orbit predictions, 2016 to
2024 (the last, `brown_batygin_2024`, is the update after the searches), showing
how the planet has shrunk and moved closer over a decade; physical properties,
with `brightness_model` (radius, albedo and temperature behind the "put a planet
out there" score, each value tagged `paper`, `derived` or `ours`);
`search_exclusions` (how much of the space is already ruled out); and
`designer_slider_ranges`.

Every numeric field carries a **`src` tag**: `abstract` (quoted from the paper's
abstract), `paper` (read from its body or figures), `derived` (computed by us
from published values), or `ours` (our own assumption — *not* a published
number). Anything tagged `ours` must not be presented to users as a finding.

**`papers.json`** — 32 papers, 2004–2026, pinned to DOIs verified one by one,
with Crossref titles, dates, authors and citation counts. Every summary was
checked against the paper's own abstract (Luhman 2014, which has no preprint,
against the journal PDF). `stance` is **our** editorial
reading (supports / against / alternative / neutral), not a label the authors
chose. Current split: 10 supports, 8 against, 6 alternative, 8 neutral — a
property of the sample we picked, not a measurement of community opinion.

**`debate.json`** — the timeline page's debate picture (`src/charts/debate.js`): one dot per
paper in `papers.json` from 2014 to 2026, its side from `stance` (supports → for; against
and alternative → against; neutral papers are not drawn but stay in `papers.json`). Holds our
one-line headline per year and the "why it matters" line for papers `field_timeline.json`
does not retell (the rest come from its titles), each a retelling of the abstract-checked
summary. Tagged `ours`.

**`field_timeline.json`** — the rows of the ledger on the part 3 pages (the search,
alternatives, timeline and future pages each show a subset): which of the
papers we judged major, which lane each goes in (`lane`: for / against / data /
next), whether it is a `key` paper, a one-line `title` that says what the paper
did to the question and one `line` of context (both retellings of the
abstract-checked summary in `papers.json`), a `branch` where a data entry's
authors drew a conclusion, the fraction an empty search `excluded`, the
`diagram` to draw (a spec for `src/charts/fieldart.js`), and optional small
inline portraits. Hand curated; `scripts/fetch_portraits.py` fetches the
portraits from Wikimedia Commons and fills in credit, licence and source. The
2026 entry (Rubin's survey start and first dwarf-planet candidate) and the four
`next` entries cite announcements and preprints rather than refereed papers, and
are labelled as such on the page. The full reading list, with which PDFs are on
disk, is `papers/README.md` (generated by `scripts/build_paper_index.py`;
`--fetch` downloads every open-access copy).

**`alternatives.json`** — 8 competing explanations, each with what it explains,
what its critics say it fails to explain, a status, and links back into
`papers.json`. Includes "there is no pattern" and "small-number coincidence" as
first-class options. Since 2026-11-18 each also carries `fits` (for the two clues
the Evidence pages teach, that the orbits stretch out and tilt the same way: yes,
at times, disputed, would fade, not shown, no, or chance, each with one sentence
and its papers) and `needs` (a tier on a four-step ladder: nothing new, one unseen
body, much unseen matter, new physics), `issue` (its main problem, the last line of its card) and `gist` (the few words on pointing at it), plus `tiers` and `groups` (ideas the page would show as one; none since luck and where telescopes looked were separated again), the ideas in the page's order, most familiar first. These are
written by `scripts/tag_alternatives.py`, our reading of the papers with page
references in its comments; checked against the PDFs on 2026-11-18:

- the planet: stretch out opposite it beyond about 250 AU and tilt its way, for
  billions of years (Batygin & Brown 2016; the 2019 review, pp. 31–32);
- the heavy disk (Sefilian & Touma 2019): the stretch, anti-aligned with the disk,
  but no clustering of the nodes (r = 0.02, p. 10); about 10 Earth masses where
  they cite at most a few tenths (p. 12);
- the self-tilting swarm: Madigan et al. 2018 cluster the argument of perihelion,
  not the stretch; Zderic et al. 2020 (four authors; it had been labelled
  “Zderic & Madigan 2020”, a different paper) find the stretch clustering in
  idealised runs, coming and going, and no lasting tilt clustering; about 20 Earth
  masses;
- a passing star: none of Morbidelli & Levison 2004, Trujillo & Sheppard 2014 or
  Pfalzner et al. 2024 measures the stretch or the poles; with nothing to hold it,
  an alignment fades within a few hundred million years (review, p. 21);
- modified gravity: Brown & Mathur 2023 put the far ends towards the Galaxy's
  centre and leave the poles random (p. 48), and note the tension with Cassini
  (p. 26); Vokrouhlický et al. 2024 found no apsidal alignment in fuller
  simulations (p. 3);
- the black hole (Scholtz & Unwin 2020) stands in for the planet as “a new
  gravitational source”; that it steers the orbits the same way is our reading.

Luck's numbers are not in this file: the page fills them from `bb2016.json`, as
the probability page does.

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
- **PS1/CSS/ZTF/HSC areas and depths**, taken from general knowledge. Rubin's
  were checked on 2026-11-20 (below).
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
