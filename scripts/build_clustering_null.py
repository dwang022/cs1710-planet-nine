#!/usr/bin/env python3
"""The 'is this just luck?' numbers.

For several cuts on the extreme TNO sample, measure how tightly the longitudes
of perihelion bunch up, then compare that against a null hypothesis in which
the same number of objects have perihelion directions drawn uniformly at random.

The statistic is the mean resultant length R of the longitude-of-perihelion
angles: R = 0 means perfectly spread out, R = 1 means all pointing the same way.

This null is deliberately naive: it assumes a survey that is equally likely to
find an object pointing in any direction. That is exactly the assumption
Shankman et al. (2017) and Napier et al. (2021) dispute, so the p-values here
are an upper bound on how surprising the clustering is, not the final word. The
site should present them that way.
"""
import json, math, os, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "processed")
N_TRIALS = 200_000
random.seed(1710)

CUTS = [
    {"id": "bb16_classic", "label": "a > 250 AU, q > 40 AU", "a_min": 250, "q_min": 40, "quality": False},
    {"id": "bb16_classic_good", "label": "a > 250 AU, q > 40 AU, multi-opposition", "a_min": 250, "q_min": 40, "quality": True},
    {"id": "etno_150_30", "label": "a > 150 AU, q > 30 AU", "a_min": 150, "q_min": 30, "quality": False},
    {"id": "etno_150_30_good", "label": "a > 150 AU, q > 30 AU, multi-opposition", "a_min": 150, "q_min": 30, "quality": True},
    {"id": "etno_200_35", "label": "a > 200 AU, q > 35 AU", "a_min": 200, "q_min": 35, "quality": False},
    {"id": "etno_200_35_good", "label": "a > 200 AU, q > 35 AU, multi-opposition", "a_min": 200, "q_min": 35, "quality": True},
]
# "quality" keeps only objects seen at more than one opposition (well_determined in
# etnos.json), the sample rule of Brown & Batygin (2019, 2021).


def resultant_length(angles_deg):
    n = len(angles_deg)
    if n == 0:
        return 0.0, None
    c = sum(math.cos(math.radians(a)) for a in angles_deg) / n
    s = sum(math.sin(math.radians(a)) for a in angles_deg) / n
    return math.hypot(c, s), math.degrees(math.atan2(s, c)) % 360.0


def null_distribution(n):
    return sorted(resultant_length([random.uniform(0, 360) for _ in range(n)])[0]
                  for _ in range(N_TRIALS))


def main():
    with open(os.path.join(OUT, "etnos.json")) as f:
        etnos = json.load(f)

    results = []
    for cut in CUTS:
        sel = [o for o in etnos
               if o["a_au"] >= cut["a_min"] and o["q_au"] >= cut["q_min"]
               and (o["well_determined"] if cut["quality"] else True)]
        n = len(sel)
        if n < 3:
            continue
        R, mean_dir = resultant_length([o["varpi_deg"] for o in sel])
        null = null_distribution(n)
        n_ge = sum(1 for v in null if v >= R)
        p = (n_ge + 1) / (N_TRIALS + 1)
        results.append({
            "id": cut["id"], "label": cut["label"],
            "a_min_au": cut["a_min"], "q_min_au": cut["q_min"],
            "well_determined_only": cut["quality"],
            "n_objects": n,
            "objects": [o["id"] for o in sel],
            "R_observed": round(R, 4),
            "mean_varpi_deg": round(mean_dir, 2),
            "p_value": round(p, 6),
            "one_in": round(1 / p) if p > 0 else None,
            "null_percentiles": {str(q): round(null[min(int(q / 100 * N_TRIALS), N_TRIALS - 1)], 4)
                                 for q in (50, 90, 95, 99, 99.9)},
            # Coarse histogram of the null, ready to plot behind the observed value.
            "null_histogram": {
                "bin_edges": [round(i / 40, 4) for i in range(41)],
                "counts": [sum(1 for v in null if i / 40 <= v < (i + 1) / 40) for i in range(40)],
            },
        })
        print(f"  {cut['label']:<42} n={n:<3} R={R:.3f} mean varpi={mean_dir:6.1f} deg  p={p:.5f} (1 in {round(1/p)})")

    with open(os.path.join(OUT, "clustering_null.json"), "w") as f:
        json.dump({
            "_what": "Observed longitude-of-perihelion clustering versus a uniform-random null, for several cuts on the extreme TNO sample.",
            "_statistic": "Mean resultant length R of the longitudes of perihelion. R = 0 is perfectly spread out, R = 1 is perfectly aligned.",
            "_caution": [
                "The null assumes surveys are equally likely to discover an object pointing in any direction. They are not. This is the central dispute in the field, so these p-values are an upper bound on how surprising the clustering is.",
                "Published bias-corrected analyses give roughly 1 in 500 (Brown & Batygin 2019); bias-modelled survey-only analyses give results consistent with no clustering at all (Napier et al. 2021).",
                "Results move when objects are added, removed, or when the quality cut changes. That sensitivity is itself worth showing the user.",
            ],
            "_n_trials": N_TRIALS, "_seed": 1710,
            "cuts": results,
        }, f, indent=1)
    print(f"\nwrote clustering_null.json ({len(results)} cuts)")


main()
