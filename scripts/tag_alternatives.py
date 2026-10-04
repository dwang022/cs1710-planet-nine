#!/usr/bin/env python3
"""Tag each alternative explanation against the four things any successful
theory has to account for, so the site can draw a comparison matrix instead of
asking the reader to parse eight paragraphs.

Tags are assigned from the `explains` / `struggles_with` text already written
into alternatives.json, which was itself written from the papers' abstracts.
Values: "yes" (the hypothesis accounts for it), "partial", "no".
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHENOMENA = [
    {"id": "clustering", "label": "Orbits bunched in one direction",
     "plain": "The distant objects' closest-approach points lean the same way."},
    {"id": "detached", "label": "Objects cut off from Neptune",
     "plain": "Bodies like Sedna never come close enough for Neptune to have moved them."},
    {"id": "inclined", "label": "Steeply tilted orbits",
     "plain": "Some distant objects orbit far out of the plane of the planets."},
    {"id": "nondetection", "label": "Nothing has been found",
     "plain": "A decade of searching has turned up no planet."},
]

# id -> {phenomenon: verdict}
TAGS = {
    "planet_nine":            {"clustering": "yes", "detached": "yes", "inclined": "yes", "nondetection": "no"},
    "observational_bias":     {"clustering": "yes", "detached": "no", "inclined": "no", "nondetection": "yes"},
    "self_gravitating_disk":  {"clustering": "yes", "detached": "yes", "inclined": "no", "nondetection": "yes"},
    "inclination_instability":{"clustering": "yes", "detached": "partial", "inclined": "yes", "nondetection": "yes"},
    "stellar_flyby":          {"clustering": "partial", "detached": "yes", "inclined": "partial", "nondetection": "yes"},
    "primordial_black_hole":  {"clustering": "yes", "detached": "yes", "inclined": "yes", "nondetection": "yes"},
    "modified_gravity":       {"clustering": "partial", "detached": "no", "inclined": "no", "nondetection": "yes"},
    "small_sample":           {"clustering": "yes", "detached": "no", "inclined": "no", "nondetection": "yes"},
}

path = os.path.join(ROOT, "data", "processed", "alternatives.json")
doc = json.load(open(path))
doc["phenomena"] = PHENOMENA
doc["_matrix_note"] = (
    "`scorecard` on each alternative says whether that hypothesis accounts for each "
    "phenomenon: yes / partial / no. These are our readings of the explains and "
    "struggles_with fields, which were written from the papers' abstracts. They are "
    "a summary for navigation, not a quantitative result.")
missing = []
for a in doc["alternatives"]:
    if a["id"] in TAGS:
        a["scorecard"] = TAGS[a["id"]]
    else:
        missing.append(a["id"])
json.dump(doc, open(path, "w"), indent=1)
print(f"tagged {len(doc['alternatives']) - len(missing)}/{len(doc['alternatives'])} alternatives"
      + (f"; MISSING {missing}" if missing else ""))
