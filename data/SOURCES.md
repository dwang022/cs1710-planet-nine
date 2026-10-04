# Sources

Every source behind the Planet Nine visualisation, with links. Generated from
the datasets by `scripts/build_sources_doc.py` — regenerate it rather than
editing by hand.

Daniel Wang · Gabriel Gonzalez · Russell Rui Luo — CS 1710

---

## 1. Data catalogues and APIs

### Small-body orbits

**JPL Small-Body Database Query API** — primary orbital elements for all 8,079
bodies with a > 30 AU.
- Endpoint: <https://ssd-api.jpl.nasa.gov/sbdb_query.api>
- Documentation: <https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html>
- Landing page: <https://ssd.jpl.nasa.gov/tools/sbdb_query.html>
- Query used: `sb-cdata={"AND":["a|GT|30"]}`, 36 fields, full precision
- Feeds: `tnos.csv`, `etnos.json`

**Minor Planet Center — distant object catalogue** — the IAU's independent
orbit solution for the same objects, used to cross-check JPL and surface
disagreement.
- File: <https://www.minorplanetcenter.net/Extended_Files/distant_extended.json.gz>
- Index of extended files: <https://www.minorplanetcenter.net/data>
- Feeds: the `mpc_*` columns and `a_disagreement_pct` in `tnos.csv`

**Minor Planet Center — numbered minor planets** — discovery date, site and
discoverer.
- File: <https://www.minorplanetcenter.net/iau/lists/NumberedMPs.txt>
- Feeds: `discoveries.csv`

### Planets and ephemerides

**JPL — Keplerian Elements for Approximate Positions of the Major Planets**
(Standish). J2000 elements plus per-century rates, valid 1800–2050.
- <https://ssd.jpl.nasa.gov/planets/approx_pos.html>
- Feeds: `planets.json`

**JPL Horizons API** — used only to *verify* our coordinate transforms, not as
a data source. Agreement 2.5″–4.5″ on four test objects.
- Endpoint: <https://ssd.jpl.nasa.gov/api/horizons.api>
- Documentation: <https://ssd-api.jpl.nasa.gov/doc/horizons.html>
- Web interface: <https://ssd.jpl.nasa.gov/horizons/app.html>

### Literature metadata

**Crossref REST API** — DOIs, titles, authors, publication dates, citation counts.
- Endpoint: <https://api.crossref.org/works>
- Documentation: <https://api.crossref.org/swagger-ui/index.html>
- Feeds: `papers.json`

**arXiv API** — abstracts and full-text PDFs, used to check every claim we make
about every paper.
- Endpoint: <http://export.arxiv.org/api/query>
- Documentation: <https://info.arxiv.org/help/api/index.html>

---

## 2. Sources we could not use

These are worth knowing about: two of them are the obvious next additions.

| Source | Link | Why not |
|---|---|---|
| **OSSOS Survey Simulator** | <https://github.com/OSSOS/SurveySimulator> | Not pulled. Holds the per-pointing detection efficiencies that would let us *compute* the selection-bias argument instead of illustrating it. **Biggest gap.** |
| **DES Y6 bias model** | released with <https://doi.org/10.3847/1538-4365/ac3914> | Not pulled. Same role as above for the southern sample. |
| **Planet Nine MCMC posterior samples** | — | Not published machine-readably. Without them we have a median-orbit sky track, not a real probability map. |
| **NASA ADS** | <https://ui.adsabs.harvard.edu/help/api/> | Needs an API token. Its citation counts are far better than Crossref's for astronomy. |
| **Semantic Scholar Graph API** | <https://api.semanticscholar.org/graph/v1> | Rate-limited (HTTP 429) without a key. Fell back to Crossref. |
| **Luhman 2014 (WISE)** | <https://doi.org/10.1088/0004-637X/781/1/4> | No arXiv preprint, so we could not read the abstract to verify its mass limits. Flagged in the data. |

---

## 3. Bibliography

25 papers. **`stance` is our editorial reading of each abstract, not a label
the authors chose** — say so wherever the site displays it. Citation counts are
Crossref's, which undercount astronomy badly (the field cites through arXiv and
ADS); treat them as relative weight only.

Every summary below was checked against the paper's own abstract or full text,
except where marked ⚠. arXiv links are given where a preprint exists (21 of
25); they are free to read, unlike several of the journal versions.

> **Note on link checking:** `doi.org` links to Astronomy & Astrophysics papers,
> and `minorplanetcenter.net`, return HTTP 403 to automated checkers. They work
> normally in a browser. The API endpoints listed above return 400/405 to bare
> requests because they expect query parameters — also expected.

### Supports the hypothesis (10)

**Trujillo & Sheppard 2014**  
Chadwick A. Trujillo, Scott S. Sheppard (2014). *A Sedna-like body with a perihelion of 80 astronomical units*. Nature  
[doi](https://doi.org/10.1038/nature13156) · 275 Crossref citations  
Discovery of 2012 VP113. First to point out that the distant objects share an argument of perihelion, and to suggest a super-Earth as the cause.

**Batygin & Brown 2016**  
Konstantin Batygin, Michael E. Brown (2016). *EVIDENCE FOR A DISTANT GIANT PLANET IN THE SOLAR SYSTEM*. The Astronomical Journal  
[doi](https://doi.org/10.3847/0004-6256/151/2/22) · [arXiv:1601.05438](https://arxiv.org/abs/1601.05438) · 387 Crossref citations  
The founding paper. Six distant objects share an orbital orientation, and a ~10 Earth-mass planet on an anti-aligned orbit reproduces it.

**Brown & Batygin 2016**  
Michael E. Brown, Konstantin Batygin (2016). *OBSERVATIONAL CONSTRAINTS ON THE ORBIT AND LOCATION OF PLANET NINE IN THE OUTER SOLAR SYSTEM*. The Astrophysical Journal Letters  
[doi](https://doi.org/10.3847/2041-8205/824/2/L23) · [arXiv:1603.05712](https://arxiv.org/abs/1603.05712) · 97 Crossref citations  
Maps which parts of the predicted orbit existing surveys have already searched and excluded.

**Malhotra et al. 2016**  
Renu Malhotra, Kathryn Volk, Xianyu Wang (2016). *CORRALLING A DISTANT PLANET WITH EXTREME RESONANT KUIPER BELT OBJECTS*. The Astrophysical Journal Letters  
[doi](https://doi.org/10.3847/2041-8205/824/2/L22) · [arXiv:1603.02196](https://arxiv.org/abs/1603.02196) · 53 Crossref citations  
Period ratios among the extreme objects look like resonances with an unseen planet near 665 AU.

**Millholland & Laughlin 2017**  
Sarah Millholland, Gregory Laughlin (2017). *Constraints on Planet Nine’s Orbit and Sky Position within a Framework of Mean-motion Resonances*. The Astronomical Journal  
[doi](https://doi.org/10.3847/1538-3881/153/3/91) · [arXiv:1612.07774](https://arxiv.org/abs/1612.07774) · 43 Crossref citations  
Fits the planet's orbit by requiring mean-motion resonances with the known extreme objects.

**Becker et al. 2018 (2015 BP519)**  
J. C. Becker et al. (2018). *Discovery and Dynamical Analysis of an Extreme Trans-Neptunian Object with a High Orbital Inclination*. The Astronomical Journal  
[doi](https://doi.org/10.3847/1538-3881/aad042) · [arXiv:1805.05355](https://arxiv.org/abs/1805.05355) · 47 Crossref citations  
2015 BP519's 54-degree inclination is difficult to produce without a massive distant perturber.

**Batygin et al. 2019 (review)**  
Konstantin Batygin et al. (2019). *The planet nine hypothesis*. Physics Reports  
[doi](https://doi.org/10.1016/j.physrep.2019.01.009) · [arXiv:1902.10103](https://arxiv.org/abs/1902.10103) · 167 Crossref citations  
The definitive review. Revises the planet to 5-10 Earth masses, a = 400-800 AU, e = 0.2-0.5, i = 15-25 degrees, explaining clustering beyond a ~ 250 AU.

**Brown & Batygin 2019**  
Michael E. Brown, Konstantin Batygin (2019). *Orbital Clustering in the Distant Solar System*. The Astronomical Journal  
[doi](https://doi.org/10.3847/1538-3881/aaf051) · [arXiv:1901.07115](https://arxiv.org/abs/1901.07115) · 36 Crossref citations  
Quantifies the significance of the clustering after modelling known survey biases: about 1 in 500 by chance.

**Brown & Batygin 2021**  
Michael E. Brown, Konstantin Batygin (2021). *The Orbit of Planet Nine*. The Astronomical Journal  
[doi](https://doi.org/10.3847/1538-3881/ac2056) · [arXiv:2108.09868](https://arxiv.org/abs/2108.09868) · 53 Crossref citations  
Bias-corrected orbit fit; clustering significant at 99.6% confidence. Headline values are 6.2 Earth masses, a = 380 AU, i = 16 degrees, q = 300 AU. The site's default planet uses this paper's full marginalized posterior instead (Figure 8), because it is the only published set that includes both angles needed to place it on the sky.

**Phan et al. 2025 (IRAS/AKARI)**  
Terry Long Phan et al. (2025). *A search for Planet Nine with IRAS and AKARI data*. Publications of the Astronomical Society of Australia  
[doi](https://doi.org/10.1017/pasa.2025.10024) · [arXiv:2504.17288](https://arxiv.org/abs/2504.17288) · 2 Crossref citations  
One far-infrared candidate from two all-sky surveys 23 years apart, implying 500-700 AU and 7-17 Earth masses. Two detections cannot fix an orbit, so this stays a candidate until followed up.


### Against it, or narrowing where it can hide (6)

**Luhman 2014 (WISE)** ⚠  
K. L. Luhman (2013). *A SEARCH FOR A DISTANT COMPANION TO THE SUN WITH THE<i>WIDE-FIELD INFRARED SURVEY EXPLORER</i>*. The Astrophysical Journal  
[doi](https://doi.org/10.1088/0004-637X/781/1/4) · 86 Crossref citations  
An all-sky infrared search rules out a Saturn-mass body within 10,000 AU. A small, cold Planet Nine stays allowed.

**Shankman et al. 2017 (OSSOS VI)**  
Cory Shankman et al. (2017). *OSSOS. VI. Striking Biases in the Detection of Large Semimajor Axis Trans-Neptunian Objects*. The Astronomical Journal  
[doi](https://doi.org/10.3847/1538-3881/aa7aed) · [arXiv:1706.05348](https://arxiv.org/abs/1706.05348) · 77 Crossref citations  
The clustering may be a selection effect. Surveys point where it is convenient to point, and that alone can shape the sample.

**Napier et al. 2021**  
K. J. Napier et al. (2021). *No Evidence for Orbital Clustering in the Extreme Trans-Neptunian Objects*. The Planetary Science Journal  
[doi](https://doi.org/10.3847/PSJ/abe53e) · [arXiv:2102.05601](https://arxiv.org/abs/2102.05601) · 43 Crossref citations  
Pooling three surveys with characterised detection efficiency, the clustering is not statistically significant.

**Bernardinelli et al. 2022 (DES)**  
Pedro H. Bernardinelli et al. (2022). *A Search of the Full Six Years of the Dark Energy Survey for Outer Solar System Objects*. The Astrophysical Journal Supplement Series  
[doi](https://doi.org/10.3847/1538-4365/ac3914) · [arXiv:2109.03758](https://arxiv.org/abs/2109.03758) · 62 Crossref citations  
815 TNOs from six years of DES with a published bias model. Primarily a catalogue paper, but it reports that its 16 extreme objects (a > 150 AU, q > 30 AU) are consistent with azimuthal isotropy.

**Brown et al. 2022 (ZTF search)**  
Michael E. Brown, Konstantin Batygin (2022). *A Search for Planet Nine using the Zwicky Transient Facility Public Archive*. The Astronomical Journal  
[doi](https://doi.org/10.3847/1538-3881/ac32dd) · [arXiv:2110.13117](https://arxiv.org/abs/2110.13117) · 13 Crossref citations  
A direct search of the ZTF archive finds no candidate to V = 20.5, ruling out 56% of the predicted Planet Nine parameter space.

**Brown & Batygin 2024 (Pan-STARRS1 search)**  
Michael E. Brown, Matthew J. Holman, Konstantin Batygin (2024). *A Pan-STARRS1 Search for Planet Nine*. The Astronomical Journal  
[doi](https://doi.org/10.3847/1538-3881/ad24e9) · [arXiv:2401.17977](https://arxiv.org/abs/2401.17977) · 8 Crossref citations  
Rules out the Brown & Batygin (2021) Planet Nine to a 50% completion depth of V = 21.5. With ZTF and DES, 78% of the predicted parameter space is now excluded; what remains is faint and near where the northern galactic plane crosses the ecliptic.


### Alternative explanations (4)

**Madigan et al. 2018**  
Ann-Marie Madigan et al. (2018). *On the Dynamics of the Inclination Instability*. The Astronomical Journal  
[doi](https://doi.org/10.3847/1538-3881/aad95c) · [arXiv:1805.03651](https://arxiv.org/abs/1805.03651) · 16 Crossref citations  
A self-gravitating population of distant bodies can tilt and align itself with no planet involved.

**Sefilian & Rafikov 2019**  
Antranik A. Sefilian, Jihad R. Touma (2019). *Shepherding in a Self-gravitating Disk of Trans-Neptunian Objects*. The Astronomical Journal  
[doi](https://doi.org/10.3847/1538-3881/aaf0fc) · [arXiv:1804.06859](https://arxiv.org/abs/1804.06859) · 29 Crossref citations  
A massive self-gravitating disk of small bodies can produce the same clustering with no planet.

**Scholtz & Unwin 2020**  
Jakub Scholtz, James Unwin (2020). *What if Planet 9 is a Primordial Black Hole?*. Physical Review Letters  
[doi](https://doi.org/10.1103/PhysRevLett.125.051103) · [arXiv:1909.11090](https://arxiv.org/abs/1909.11090) · 82 Crossref citations  
Same mass, same orbit, but a grapefruit-sized primordial black hole instead of a planet.

**Zderic & Madigan 2020**  
Alexander Zderic et al. (2020). *Apsidal Clustering following the Inclination Instability*. The Astrophysical Journal Letters  
[doi](https://doi.org/10.3847/2041-8213/ab91a0) · [arXiv:2004.01198](https://arxiv.org/abs/2004.01198) · 8 Crossref citations  
Shows the inclination instability also produces apsidal clustering, directly mimicking the Planet Nine signal.


### Neutral: data, constraints and characterisation (5)

**Cowan et al. 2016 (CMB)**  
Nicolas B. Cowan, Gil Holder, Nathan A. Kaib (2016). *COSMOLOGISTS IN SEARCH OF PLANET NINE: THE CASE FOR CMB EXPERIMENTS*. The Astrophysical Journal Letters  
[doi](https://doi.org/10.3847/2041-8205/822/1/L2) · [arXiv:1602.05963](https://arxiv.org/abs/1602.05963) · 19 Crossref citations  
Proposes millimetre-wave cosmology surveys as an independent search channel.

**Fienga et al. 2016 (Cassini)**  
A. Fienga et al. (2016). *Constraints on the location of a possible 9th planet derived from the<i>Cassini</i>data*. Astronomy &amp; Astrophysics  
[doi](https://doi.org/10.1051/0004-6361/201628227) · 66 Crossref citations  
Cassini ranging to Saturn narrows where a massive planet could sit without visibly perturbing the giant planets.

**Fortney et al. 2016**  
Jonathan J. Fortney et al. (2016). *THE HUNT FOR PLANET NINE: ATMOSPHERE, SPECTRA, EVOLUTION, AND DETECTABILITY*. The Astrophysical Journal Letters  
[doi](https://doi.org/10.3847/2041-8205/824/2/L25) · [arXiv:1604.07424](https://arxiv.org/abs/1604.07424) · 33 Crossref citations  
Predicts the planet's atmosphere and spectrum, and which wavelengths would detect it.

**Linder & Mordasini 2016**  
Esther F. Linder, Christoph Mordasini (2016). *Evolution and magnitudes of candidate Planet Nine*. Astronomy &amp; Astrophysics  
[doi](https://doi.org/10.1051/0004-6361/201628350) · [arXiv:1602.07465](https://arxiv.org/abs/1602.07465) · 26 Crossref citations  
Thermal-evolution models predicting the planet's radius, temperature and brightness. The source of most 'what would it look like' numbers.

**Fienga et al. 2020 (INPOP19a)**  
A. Fienga et al. (2020). *New constraints on the location of P9 obtained with the INPOP19a planetary ephemeris*. Astronomy &amp; Astrophysics  
[doi](https://doi.org/10.1051/0004-6361/202037919) · 32 Crossref citations  
Updated planetary ephemerides further restrict where a massive perturber can hide.


---

## 4. Verification record

- **Coordinate transforms** checked against JPL Horizons on Sedna, 2000 CR105,
  2007 TG422 and Alicanto. Agreement 2.5″–4.5″, consistent with two-body
  propagation ignoring planetary perturbations.
- **Planet Nine's ϖ and Ω** (246.7°, 96.9°) read directly from the Figure 8
  corner plot of Brown & Batygin 2021, <https://arxiv.org/abs/2108.09868v2> —
  the abstract does not contain them.
- **Every paper summary** checked against its abstract via the arXiv API, except
  Luhman 2014.
- **Survey exclusion fractions** (56% ZTF, 78% cumulative) verified from the ZTF
  and Pan-STARRS1 search abstracts.

Corrections this process produced, and the claims still unverified, are listed
in [`README.md`](README.md).

---

*Generated 2026-10-04 by `scripts/build_sources_doc.py`.*
