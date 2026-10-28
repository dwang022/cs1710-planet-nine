#!/usr/bin/env python3
"""Generate data/SOURCES.md from the datasets themselves, so the citation list
can never drift from what the pipeline actually used."""
import json, os, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "SOURCES.md")
P = os.path.join(ROOT, "data", "processed")

STANCE_ORDER = ["supports", "against", "alternative", "neutral"]
STANCE_TITLE = {
    "supports": "Supports the hypothesis",
    "against": "Against it, or narrowing where it can hide",
    "alternative": "Alternative explanations",
    "neutral": "Neutral: data, constraints and characterisation",
}

HEAD = """# Sources

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

{n} papers. **`stance` is our editorial reading of each abstract, not a label
the authors chose** — say so wherever the site displays it. Citation counts are
Crossref's, which undercount astronomy badly (the field cites through arXiv and
ADS); treat them as relative weight only.

Every summary below was checked against the paper's own abstract or full text,
except where marked ⚠. arXiv links are given where a preprint exists ({na} of
{n}); they are free to read, unlike several of the journal versions.

> **Note on link checking:** `doi.org` links to Astronomy & Astrophysics papers,
> and `minorplanetcenter.net`, return HTTP 403 to automated checkers. They work
> normally in a browser. The API endpoints listed above return 400/405 to bare
> requests because they expect query parameters — also expected.

"""

FOOT = """
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

*Generated {date} by `scripts/build_sources_doc.py`.*
"""


def main():
    papers = json.load(open(os.path.join(P, "papers.json"), encoding="utf-8"))["papers"]
    body = []
    for stance in STANCE_ORDER:
        group = [p for p in papers if p["stance"] == stance]
        group.sort(key=lambda p: (p.get("year") or 0, p.get("label") or ""))
        body.append(f"### {STANCE_TITLE[stance]} ({len(group)})\n")
        for p in group:
            flag = "" if p.get("summary_checked_against_abstract", True) else " ⚠"
            authors = p.get("authors") or []
            if len(authors) > 3:
                who = f"{authors[0]} et al."
            else:
                who = ", ".join(authors) or "—"
            cites = p.get("citations_crossref")
            cites = f"{cites} Crossref citations" if cites is not None else "citation count unavailable"
            links = f"[doi]({p['url']})"
            if p.get("arxiv_url"):
                links += f" · [arXiv:{p['arxiv']}]({p['arxiv_url']})"
            body.append(
                f"**{p['label']}**{flag}  \n"
                f"{who} ({p['year']}). *{p['title']}*. {p.get('journal') or ''}  \n"
                f"{links} · {cites}  \n"
                f"{p['summary']}\n")
        body.append("")

    n_arxiv = sum(1 for p in papers if p.get("arxiv_url"))
    doc = (HEAD.replace("{n}", str(len(papers))).replace("{na}", str(n_arxiv))
           + "\n".join(body)
           + FOOT.replace("{date}", time.strftime("%Y-%m-%d")))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(doc)
    print(f"wrote {OUT} ({len(papers)} papers, {len(doc.splitlines())} lines)")


main()
