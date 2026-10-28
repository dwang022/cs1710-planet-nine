#!/usr/bin/env python3
"""Build the Planet Nine consensus timeline.

Every entry is pinned to a DOI we verified by hand against Crossref, so the
titles, dates, authors and citation counts are fetched rather than typed.
The `stance` field is our own editorial reading of each abstract.

  supports    - argues the clustering is real and a planet is the best explanation
  against     - argues the clustering is an artefact of how we searched, or rules
                out parameter space the planet was supposed to occupy
  alternative - accepts the signal but proposes something other than a planet
  neutral     - characterises, constrains or supplies data without taking a side
"""
import json, os, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "processed", "papers.json")
UA = "cs1710-planet-nine/1.0 (mailto:danielwang@g.harvard.edu)"

# (doi, stance, short label for the timeline, one-line summary)
PAPERS = [
 ("10.1038/nature13156", "supports", "Trujillo & Sheppard 2014",
  "Discovery of 2012 VP113. First to point out that the distant objects share an argument of perihelion, and to suggest a super-Earth as the cause."),
 ("10.1088/0004-637X/781/1/4", "against", "Luhman 2014 (WISE)",
  "An all-sky infrared search rules out a Saturn-mass body within 10,000 AU. A small, cold Planet Nine stays allowed."),
 ("10.3847/0004-6256/151/2/22", "supports", "Batygin & Brown 2016",
  "The founding paper. Six distant objects share an orbital orientation, and a ~10 Earth-mass planet on an anti-aligned orbit reproduces it."),
 ("10.3847/2041-8205/824/2/L23", "supports", "Brown & Batygin 2016",
  "Maps which parts of the predicted orbit existing surveys have already searched and excluded."),
 ("10.3847/2041-8205/824/2/L22", "supports", "Malhotra et al. 2016",
  "Period ratios among the extreme objects look like resonances with an unseen planet near 665 AU."),
 ("10.1051/0004-6361/201628227", "neutral", "Fienga et al. 2016 (Cassini)",
  "Cassini ranging to Saturn narrows where a massive planet could sit without visibly perturbing the giant planets."),
 ("10.1051/0004-6361/201628350", "neutral", "Linder & Mordasini 2016",
  "Thermal-evolution models predicting the planet's radius, temperature and brightness. The source of most 'what would it look like' numbers."),
 ("10.3847/2041-8205/824/2/L25", "neutral", "Fortney et al. 2016",
  "Predicts the planet's atmosphere and spectrum, and which wavelengths would detect it."),
 ("10.3847/2041-8205/822/1/L2", "neutral", "Cowan et al. 2016 (CMB)",
  "Proposes millimetre-wave cosmology surveys as an independent search channel."),
 ("10.3847/1538-3881/aa7aed", "against", "Shankman et al. 2017 (OSSOS VI)",
  "The clustering may be a selection effect. Surveys point where it is convenient to point, and that alone can shape the sample."),
 ("10.3847/1538-3881/153/3/91", "supports", "Millholland & Laughlin 2017",
  "Fits the planet's orbit by requiring mean-motion resonances with the known extreme objects."),
 ("10.3847/1538-3881/aad042", "supports", "Becker et al. 2018 (2015 BP519)",
  "2015 BP519's 54-degree inclination is difficult to produce without a massive distant perturber."),
 ("10.3847/1538-3881/aad95c", "alternative", "Madigan et al. 2018",
  "A self-gravitating population of distant bodies can tilt and align itself with no planet involved."),
 ("10.1016/j.physrep.2019.01.009", "supports", "Batygin et al. 2019 (review)",
  "The definitive review. Revises the planet to 5-10 Earth masses, a = 400-800 AU, e = 0.2-0.5, i = 15-25 degrees, explaining clustering beyond a ~ 250 AU."),
 ("10.3847/1538-3881/aaf051", "supports", "Brown & Batygin 2019",
  "Quantifies the significance of the clustering after modelling known survey biases: about 1 in 500 by chance."),
 ("10.3847/1538-3881/aaf0fc", "alternative", "Sefilian & Rafikov 2019",
  "A massive self-gravitating disk of small bodies can produce the same clustering with no planet."),
 ("10.1103/PhysRevLett.125.051103", "alternative", "Scholtz & Unwin 2020",
  "Same mass, same orbit, but a grapefruit-sized primordial black hole instead of a planet."),
 ("10.1051/0004-6361/202037919", "neutral", "Fienga et al. 2020 (INPOP19a)",
  "Updated planetary ephemerides further restrict where a massive perturber can hide."),
 ("10.3847/2041-8213/ab91a0", "alternative", "Zderic & Madigan 2020",
  "Shows the inclination instability also produces apsidal clustering, directly mimicking the Planet Nine signal."),
 ("10.3847/PSJ/abe53e", "against", "Napier et al. 2021",
  "Pooling three surveys with characterised detection efficiency, the clustering is not statistically significant."),
 ("10.3847/1538-3881/ac2056", "supports", "Brown & Batygin 2021",
  "Bias-corrected orbit fit; clustering significant at 99.6% confidence. Headline values are 6.2 Earth masses, a = 380 AU, i = 16 degrees, q = 300 AU. The site's default planet uses this paper's full marginalized posterior instead (Figure 8), because it is the only published set that includes both angles needed to place it on the sky."),
 ("10.3847/1538-4365/ac3914", "against", "Bernardinelli et al. 2022 (DES)",
  "815 TNOs from six years of DES with a published bias model. Primarily a catalogue paper, but it reports that its 16 extreme objects (a > 150 AU, q > 30 AU) are consistent with azimuthal isotropy."),
 ("10.3847/1538-3881/ac32dd", "against", "Brown et al. 2022 (ZTF search)",
  "A direct search of the ZTF archive finds no candidate to V = 20.5, ruling out 56% of the predicted Planet Nine parameter space."),
 ("10.3847/1538-3881/ad24e9", "against", "Brown & Batygin 2024 (Pan-STARRS1 search)",
  "Rules out the Brown & Batygin (2021) Planet Nine to a 50% completion depth of V = 21.5. With ZTF and DES, 78% of the predicted parameter space is now excluded; what remains is faint and near where the northern galactic plane crosses the ecliptic."),
 ("10.1017/pasa.2025.10024", "supports", "Phan et al. 2025 (IRAS/AKARI)",
  "One far-infrared candidate from two all-sky surveys 23 years apart, implying 500-700 AU and 7-17 Earth masses. Two detections cannot fix an orbit, so this stays a candidate until followed up."),
 ("10.3847/1538-4357/ac2307", "neutral", "Naess et al. 2021 (ACT)",
  "A blind millimetre-wave search over 18,000 square degrees finds no significant detection, rules out roughly 17% (5 Earth masses) or 9% (10 Earth masses) of the parameter space, and lists ten weak candidates for follow-up."),
 ("10.1038/s41550-025-02595-7", "against", "Chen et al. 2025 (Ammonite)",
  "Discovery of 2023 KQ14, a Sedna-like object with q = 66 AU and a = 252 AU. Its orbit does not align with the other Sedna-like objects, and its long-term stability favours a hypothetical planet on a larger orbit (about 500 AU) rather than a closer one."),
 ("10.3847/2041-8213/ae3a75", "against", "Cheng, Li & Yang 2026 (2017 OF201)",
  "A roughly 700 km dwarf-planet candidate on an 830 AU orbit with perihelion at 45 AU (posted May 2025). Its longitude of perihelion lies outside the observed clustering, which the authors call a challenge to the dynamical evidence for Planet Nine."),
]

# arXiv ids, each confirmed by an exact title match against the arXiv API.
# Papers absent here have no preprint we could find (Nature and A&A titles).
ARXIV = {
    "10.3847/0004-6256/151/2/22": "1601.05438",
    "10.3847/2041-8205/822/1/L2": "1602.05963",
    "10.1051/0004-6361/201628350": "1602.07465",
    "10.3847/2041-8205/824/2/L22": "1603.02196",
    "10.3847/2041-8205/824/2/L23": "1603.05712",
    "10.3847/2041-8205/824/2/L25": "1604.07424",
    "10.3847/1538-3881/153/3/91": "1612.07774",
    "10.3847/1538-3881/aa7aed": "1706.05348",
    "10.3847/1538-3881/aaf0fc": "1804.06859",
    "10.3847/1538-3881/aad95c": "1805.03651",
    "10.3847/1538-3881/aad042": "1805.05355",
    "10.3847/1538-3881/aaf051": "1901.07115",
    "10.1016/j.physrep.2019.01.009": "1902.10103",
    "10.1103/PhysRevLett.125.051103": "1909.11090",
    "10.3847/2041-8213/ab91a0": "2004.01198",
    "10.3847/PSJ/abe53e": "2102.05601",
    "10.3847/1538-3881/ac2056": "2108.09868",
    "10.3847/1538-4365/ac3914": "2109.03758",
    "10.3847/1538-3881/ac32dd": "2110.13117",
    "10.3847/1538-3881/ad24e9": "2401.17977",
    "10.1017/pasa.2025.10024": "2504.17288",
    "10.3847/1538-4357/ac2307": "2104.10264",
    "10.1038/s41550-025-02595-7": "2508.02162",
    "10.3847/2041-8213/ae3a75": "2505.15806",
}


def fetch(doi):
    url = "https://api.crossref.org/works/" + urllib.parse.quote(doi)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["message"]


def main():
    papers = []
    for doi, stance, label, summary in PAPERS:
        try:
            m = fetch(doi)
        except urllib.error.HTTPError as exc:
            print(f"  !! {doi} -> {exc}")
            continue
        authors = [f"{a.get('given','')} {a.get('family','')}".strip() for a in m.get("author", [])]
        parts = m["issued"]["date-parts"][0]
        papers.append({
            "doi": doi,
            "label": label,
            "title": (m.get("title") or [""])[0],
            "authors": authors,
            "first_author": authors[0] if authors else None,
            "n_authors": len(authors),
            "year": parts[0],
            "date": "-".join(f"{p:02d}" if i else str(p) for i, p in enumerate(parts)),
            "journal": (m.get("container-title") or [""])[0],
            "citations_crossref": m.get("is-referenced-by-count"),
            "url": "https://doi.org/" + doi,
            "arxiv": ARXIV.get(doi),
            "arxiv_url": ("https://arxiv.org/abs/" + ARXIV[doi]) if doi in ARXIV else None,
            "stance": stance,
            "summary": summary,
            "summary_checked_against_abstract": doi != "10.1088/0004-637X/781/1/4",
            "resolved": True,
        })
        print(f"  {parts[0]} [{stance:<11}] {papers[-1]['citations_crossref']:>5} cites  {label}")
        time.sleep(0.5)

    papers.sort(key=lambda p: (p.get("year") or 9999, p.get("date") or ""))

    counts = {}
    for p in papers:
        counts[p["stance"]] = counts.get(p["stance"], 0) + 1

    doc = {
        "_what": "Curated timeline of the Planet Nine literature, for the 'who supports it' and 'what is the consensus' views.",
        "_caution": [
            "'stance' is our editorial reading of each abstract, not a label the authors chose. Say so on the site.",
            "Crossref citation counts undercount astronomy, which cites heavily through arXiv and NASA ADS. Use them as relative weight, not absolute impact.",
            "Every summary below was checked against the paper's own abstract (or full text) in October 2026, except where summary_checked_against_abstract is false.",
            "This is a deliberately chosen ~28-paper sample of a literature with hundreds of entries. It is not a census, and counting stances here does not measure community opinion.",
        ],
        "_stance_values": {
            "supports": "argues the clustering is real and a planet is the best explanation",
            "against": "argues the clustering is an artefact of how we searched, or rules out parameter space",
            "alternative": "accepts the signal but proposes something other than a planet",
            "neutral": "characterises, constrains or supplies data without taking a side",
        },
        "_fetched": time.strftime("%Y-%m-%d"),
        "_source": "Crossref REST API (api.crossref.org)",
        "n_papers": len(papers),
        "stance_counts": counts,
        "papers": papers,
    }
    with open(OUT, "w") as f:
        json.dump(doc, f, indent=1)
    print(f"\n{len(papers)} papers  {counts}")


main()
