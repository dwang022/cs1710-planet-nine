#!/usr/bin/env python3
"""Each alternative explanation against the two clues the Evidence pages teach, and what it needs.

The clues are the clustering page's: the distant orbits stretch out the same way (clustering of the longitude of
perihelion) and tilt the same way (clustering of the orbital poles). For each idea this writes, into
data/processed/alternatives.json and its copy in public/data/:

  fits    {stretch, tilt}: {v, text, cite}, where v is
            yes       a paper shows it producing that clue, lasting to today
            times     it does, but only for a while, in idealised simulations
            disputed  one paper predicts it, a later fuller one finds none
            fades     no paper shows it, and a pattern nothing holds in place fades within a few hundred million years
            unshown   no paper shows it
            no        a paper finds the opposite (the angles spread every way)
            chance    the idea is that there is no real pattern: how often luck matches it is computed on the page
            apparent  the pattern would only seem to be there, from where telescopes looked
  needs   {tier, text, cite}: what it asks us to accept that has not been seen, on the ladder in `tiers`
  issue     its main problem, the last line of its card; gist, the few words on pointing at it on the map
  groups    ideas the page would show as one, with that item's own text (none since 2026-11-18); the ideas are in
            the page's order

Read from the papers (PDF pages of the arXiv versions; checked 2026-11-18). Text in {braces} is filled on the page
from bb2016.json, so the luck numbers are the probability page's. Values are our reading of the papers, not a ranking
they make; the page says so.
"""
import json, os, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "processed", "alternatives.json")
PUB = os.path.join(ROOT, "public", "data", "alternatives.json")

BB16 = "10.3847/0004-6256/151/2/22"
REVIEW = "10.1016/j.physrep.2019.01.009"
BB19 = "10.3847/1538-3881/aaf051"
BB21 = "10.3847/1538-3881/ac2056"
SHANKMAN = "10.3847/1538-3881/aa7aed"
NAPIER = "10.3847/PSJ/abe53e"
DES = "10.3847/1538-4365/ac3914"
SEFILIAN = "10.3847/1538-3881/aaf0fc"
MADIGAN = "10.3847/1538-3881/aad95c"
ZDERIC = "10.3847/2041-8213/ab91a0"
MORBIDELLI = "10.1086/424617"
TRUJILLO = "10.1038/nature13156"
PFALZNER = "10.1038/s41550-024-02349-x"
MATHUR = "10.3847/1538-3881/acef1e"
VOKROUHLICKY = "10.3847/1538-4357/ad40a3"
SCHOLTZ = "10.1103/PhysRevLett.125.051103"

TIERS = ["Nothing new", "One unseen body", "Much unseen matter", "New physics"]

# The ideas in the page's order, from the most familiar to the least (2026-11-18, asked for): the planet, luck, where
# telescopes looked, then the rest. Each its own point on the map and its own card (luck and where telescopes looked
# were one item for a day, “No real pattern”, and were separated again, asked for).
ORDER = ["planet_nine", "small_sample", "observational_bias", "stellar_flyby", "self_gravitating_disk",
         "inclination_instability", "modified_gravity", "primordial_black_hole"]


def f(v, text, *cite):
    return {"v": v, "text": text, "cite": list(cite)}


def say(text, *cite):
    return {"text": text, "cite": list(cite)}


ZTF = "10.3847/1538-3881/ac32dd"        # Brown et al. 2022, the ZTF search
PS1 = "10.3847/1538-3881/ad24e9"        # Brown & Batygin 2024, the Pan-STARRS1 search

# The cards' text, each naming what it is about (no "it" or "their" without a clear noun just before; 2026-11-18,
# asked for): how the idea deals with the stretch and with the tilt (`fits`), and its main problem (`issue`). `gist` is
# the few words shown on pointing at the idea on the map.
FITS = {
    # Batygin & Brown 2016 abstract and p10; review p31-32 (beyond about 250 AU; planes follow its plane); 4 Gyr runs
    "planet_nine": {
        "stretch": f("yes", "A planet's pull would keep the distant orbits stretched out opposite to the planet's orbit, "
                     "for billions of years.", BB16, REVIEW),
        "tilt": f("yes", "The same pull would tilt the orbits the same way as the planet's orbit.", BB16, BB21, REVIEW),
    },
    # the probability page's test: samples of today's known objects, which carry where telescopes looked
    "small_sample": {
        "stretch": f("chance", "In {p_stretch} of random samples of known objects, the orbits stretch out as tightly as today's."),
        "tilt": f("chance", "In {p_tilt} of the samples, the orbits tilt as tightly."),
    },
    # Shankman 2017 p6 (4 objects beyond 250 AU, no evidence of clustering); Napier 2021 abstract (14 objects, varpi
    # and poles together, consistent with uniform at 17-94%); Bernardinelli 2022 p19
    "observational_bias": {
        "stretch": f("apparent", "Telescopes find distant objects mostly where they happen to look, so the objects found "
                     "could seem to stretch out one way even if the real ones do not.", SHANKMAN),
        "tilt": f("apparent", "The same could make the orbits seem to tilt one way. Surveys that tracked where they pointed "
                  "find no clear sign of either.", SHANKMAN, NAPIER, DES),
    },
    # Morbidelli & Levison 2004, Trujillo & Sheppard 2014 and Pfalzner et al. 2024 do not measure varpi or the poles;
    # review p21: with nothing to maintain it, the alignment becomes uniform within a few hundred million years
    "stellar_flyby": {
        "stretch": f("fades", "A star passing the young Sun could have lifted orbits like Sedna's, but no study shows the "
                     "star lining the orbits up.", MORBIDELLI, PFALZNER),
        "tilt": f("fades", "No study shows the star lining up the tilt either.", PFALZNER),
    },
    # Sefilian & Touma 2019: varpi confined anti-aligned with the disk (p1, p9), lasting while the disk stays put
    # (p15); no confinement of the nodes, r = 0.02 (p10)
    "self_gravitating_disk": {
        "stretch": f("yes", "A lopsided ring of small icy bodies could hold the orbits stretched out opposite to the ring.",
                     SEFILIAN),
        "tilt": f("no", "In the same simulations, the orbits still tilt every way.", SEFILIAN),
    },
    # Madigan et al. 2018 (the swarm tips itself out of the plane); Zderic et al. 2020: varpi clustering in idealised
    # simulations, the mode dispersing and recurring (p3, p4); the out-of-plane clustering disappears (p3); review p70:
    # no explanation for the confinement of the poles
    "inclination_instability": {
        "stretch": f("times", "Enough distant objects could pull one another out of the planets' plane. In simplified "
                     "simulations, the orbits then stretch out one way.", MADIGAN, ZDERIC),
        "tilt": f("unshown", "No study shows the orbits tilting the same way.", ZDERIC, REVIEW),
    },
    # Brown & Mathur 2023: far ends towards the Galactic centre (p7, p55), poles "as random as possible" (p48);
    # Vokrouhlicky et al. 2024 p3: "Apsidal alignment was not present in our numerical simulations"
    "modified_gravity": {
        "stretch": f("disputed", "If gravity worked differently far from the Sun, one version would stretch the orbits out "
                     "towards the centre of the Galaxy. More detailed simulations found no lining up.", MATHUR, VOKROUHLICKY),
        "tilt": f("no", "That version would leave the orbits tilting every way.", MATHUR),
    },
    # Scholtz & Unwin 2020 p1: the black hole stands in for Planet Nine as "a new gravitational source"; at hundreds of
    # AU its pull is a planet's of the same mass (our reading: the paper does not model the orbits)
    "primordial_black_hole": {
        "stretch": f("yes", "Planet Nine could be a black hole from the early universe, with a planet's mass but no bigger "
                     "than a bowling ball. The black hole's pull would stretch the orbits out just as a planet's would.",
                     SCHOLTZ),
        "tilt": f("yes", "The orbits would tilt the same way too.", SCHOLTZ),
    },
}

ISSUES = {
    "planet_nine": say("No search has found the planet yet.", ZTF, PS1),
    # Napier 2021 (consistent with uniform at 17-94%) and Bernardinelli 2022 (p = 0.88-0.95 for 16 objects)
    "small_sample": say("Both together happen in only about 1 in {odds} samples (though studies of other surveys find "
                        "the pattern far less unusual).", NAPIER, DES),
    # Brown & Batygin 2019 p5: combined varpi and pole clustering, 0.2% with each object's bias modelled
    "observational_bias": say("Allowing for where telescopes looked, Brown and Batygin still put the chance of clustering "
                              "this strong at 0.2%.", BB19),
    "stellar_flyby": say("With nothing to hold it in place, any pattern would fade within a few hundred million years.", REVIEW),
    "self_gravitating_disk": say("The ring would need about 10 Earth masses, but estimates allow only a few tenths.", SEFILIAN),
    # Zderic et al. 2020 p1 (O(20 Earth masses)), p3-4 (the mode disperses and recurs); Sefilian & Touma 2019 p12
    "inclination_instability": say("The swarm would need about 20 Earth masses far out, much more than estimates allow. "
                                   "Simulations also showed that the clustering did not last.", ZDERIC, SEFILIAN),
    # Brown & Mathur 2023 p26 ("in tension with the Cassini bound"); Vokrouhlicky et al. 2024 p10 (the ephemerides)
    "modified_gravity": say("If gravity changed far from the Sun, the planets would move slightly differently too. Precise "
                            "tracking of Saturn shows no such change, as the idea's own authors note.", MATHUR, VOKROUHLICKY),
    # Scholtz & Unwin 2020 p1-3: a hypothetical population, suggested by microlensing events; likely impossible to see
    "primordial_black_hole": say("Black holes this small are still hypothetical, and none has ever been confirmed. A black "
                                 "hole would also reflect no sunlight, so a search for a planet would never see one.", SCHOLTZ),
}

GIST = {
    "planet_nine": "An unseen planet far beyond Neptune.",
    "small_sample": "The orbits line up by chance.",
    "observational_bias": "Telescopes found only the objects where they looked.",
    "stellar_flyby": "A star that passed close to the young Sun.",
    "self_gravitating_disk": "A heavy, lopsided ring of small icy bodies.",
    "inclination_instability": "Distant objects that pull one another out of the plane.",
    "modified_gravity": "Gravity that works differently far from the Sun.",
    "primordial_black_hole": "Planet Nine as a black hole from the early universe.",
}

GROUPS = []

NEEDS = {
    "planet_nine": {"tier": 1, "text": "A planet several times Earth's mass, hundreds of AU out, not yet found.",
                    "cite": [BB21]},
    "small_sample": {"tier": 0, "text": "Nothing new, only luck. About 1 in {odds} samples are as tight in both.", "cite": []},
    # Brown & Batygin 2019 p5: combined varpi and pole clustering, 0.2% with each object's bias modelled
    # (the map's one card for luck and where telescopes looked reads luck's line, then this one)
    "observational_bias": {"tier": 0, "text": "Allowing for where telescopes looked, Brown and Batygin still find only a "
                           "0.2% chance of clustering this strong.", "cite": [BB19]},
    # Pfalzner et al. 2024 p1: a 0.8 solar-mass star at about 110 AU, most likely in the birth cluster (p5)
    "stellar_flyby": {"tier": 0, "text": "Nothing new. The Sun formed among other stars, and one may have passed within "
                      "about 110 AU.", "cite": [PFALZNER, MORBIDELLI]},
    # Sefilian & Touma 2019 Table 1 (10 Earth masses, 40-750 AU) and p12 ("at most a few tenth of Earth masses")
    "self_gravitating_disk": {"tier": 2, "text": "About 10 Earth masses of small bodies, but estimates allow only a few tenths.",
                              "cite": [SEFILIAN]},
    # Zderic et al. 2020 p1: O(20 Earth masses) between about 100 and 1000 AU
    "inclination_instability": {"tier": 2, "text": "About 20 Earth masses of small bodies far out.", "cite": [ZDERIC]},
    # Brown & Mathur 2023 p26: "in tension with the Cassini bound"
    "modified_gravity": {"tier": 3, "text": "A change to gravity far from the Sun.", "cite": [MATHUR]},
    # Scholtz & Unwin 2020 p3-5: likely impossible to detect without dark matter; a ten-pin bowling ball at 10 Earth masses
    "primordial_black_hole": {"tier": 3, "text": "A kind of black hole never seen, left over from the early universe and "
                              "captured by the Sun. It would be no bigger than a bowling ball and reflect no sunlight.",
                              "cite": [SCHOLTZ]},
}

doc = json.load(open(SRC, encoding="utf-8"))
for k in ("phenomena", "_matrix_note"):
    doc.pop(k, None)
order = ORDER
by = {a["id"]: a for a in doc["alternatives"]}
assert set(order) == set(by), (set(order) ^ set(by))
doc["alternatives"] = [by[i] for i in order]
for a in doc["alternatives"]:
    a.pop("scorecard", None)
    a["fits"] = FITS[a["id"]]
    a["issue"] = ISSUES[a["id"]]
    a["gist"] = GIST[a["id"]]
    a["needs"] = NEEDS[a["id"]]
    cited = {d for s in a["fits"].values() for d in s["cite"]} | set(a["needs"]["cite"]) | set(a["issue"]["cite"])
    a["key_dois"] = sorted(set(a.get("key_dois", [])) | cited)
doc.pop("families", None)
doc["groups"] = GROUPS
doc["tiers"] = TIERS
doc["_fields"].update({
    "fits": "each clue (stretch, tilt): v (yes, times, disputed, fades, unshown, no, chance, apparent), one plain sentence, cite = DOIs; "
            "written by scripts/tag_alternatives.py from the papers",
    "needs": "what it asks us to accept that has not been seen: tier (an index into tiers, the map's rows), a sentence, cite",
    "issue": "its main problem, one or two plain sentences and cite: the last line of its card",
    "gist": "a few words on what the idea is, shown on pointing at it on the map",
})
doc["_fields"].pop("tag", None)
doc["_what"] = ("Competing explanations for the clustering of extreme trans-Neptunian orbits, each against the two clues "
                "(they stretch out and tilt the same way) and what it needs. Drives insights/alternatives.html.")

# corrections from reading the papers (2026-11-18)
fix = {
    "inclination_instability": {"explains": None},
    "primordial_black_hole": {"tag": "a planet's mass, no bigger than a bowling ball"},
}
for a in doc["alternatives"]:
    if a["id"] == "inclination_instability":
        a["explains"] = [s.replace("Zderic & Madigan 2020", "Zderic et al. 2020") for s in a.get("explains", [])]
        for s in a.get("explain", []):
            s["text"] = s["text"].replace("Later computer models found it can also bunch the orbits in one direction, as a planet would.",
                                          "Later, in idealised computer models, the orbits also stretch out one way for a while.")
    if a["id"] == "modified_gravity":
        # no spacecraft named (2026-11-18, asked for)
        for st in a.get("struggles", []):
            st["text"] = st["text"].replace("measured very precisely by the Cassini spacecraft", "measured very precisely")
    if a["id"] == "primordial_black_hole":
        a["tag"] = fix["primordial_black_hole"]["tag"]
        for s in a.get("explain", []):
            s["text"] = s["text"].replace("about the size of a grapefruit", "no bigger than a bowling ball")

for p in (SRC, PUB):
    with open(p, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
print(f"{len(doc['alternatives'])} ideas; written to data/processed and public/data")
