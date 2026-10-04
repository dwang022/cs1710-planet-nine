#!/usr/bin/env python3
"""Who found each distant object, where, and when.

Joins the MPC's numbered-minor-planet discovery list onto our TNO table. Only
numbered objects have an official discovery record, so unnumbered designations
fall back to the first-observation date from JPL.
"""
import csv, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "data", "processed")

LINE = re.compile(
    r"^\s*\((?P<num>\d+)\)\s+(?P<rest>.*?)\s{2,}"
    r"(?P<year>\d{4}) (?P<month>\d{2}) (?P<day>\d{2})\*?\s+"
    r"(?P<tail>.+?)\s*$")
# Some rows carry a numeric MPC reference between the site and the discoverers.
REF_PREFIX = re.compile(r"^\d+\s+")


def main():
    disc = {}
    with open(os.path.join(RAW, "mpc_numbered_discovery.txt"), encoding="utf-8", errors="replace") as f:
        for line in f:
            m = LINE.match(line.rstrip("\n"))
            if not m:
                continue
            # `rest` is "Name   Principal_desig" or just the designation.
            parts = re.split(r"\s{2,}", m.group("rest").strip())
            tail = re.split(r"\s{2,}", m.group("tail").strip())
            site = tail[0].strip()
            discoverers = REF_PREFIX.sub("", " ".join(tail[1:]).strip())
            disc[m.group("num")] = {
                "discovery_date": f"{m.group('year')}-{m.group('month')}-{m.group('day')}",
                "discovery_site": site,
                "discoverers": discoverers or None,
                "provisional_desig": parts[-1] if len(parts) > 1 else None,
            }

    print(f"parsed {len(disc)} discovery records")
    rows, matched = [], 0
    with open(os.path.join(OUT, "tnos.csv")) as f:
        for r in csv.DictReader(f):
            d = disc.get(r["id"].strip())
            if d:
                matched += 1
            rows.append({
                "id": r["id"], "name": r["name"], "a_au": float(r["a_au"]),
                "q_au": float(r["q_au"]) if r["q_au"] else None,
                "discovery_date": d["discovery_date"] if d else None,
                "discovery_site": d["discovery_site"] if d else None,
                "discoverers": d["discoverers"] if d else None,
                "first_obs_jpl": r["first_obs"] or None,
                "discovery_source": "MPC numbered-object discovery list" if d else "JPL first observation (no official discovery record)",
            })

    with open(os.path.join(OUT, "discoveries.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    extreme = [r for r in rows if r["a_au"] >= 150 and (r["q_au"] or 0) >= 30]
    print(f"{len(rows)} objects, {matched} with an official MPC discovery record")
    print(f"{sum(1 for r in extreme if r['discovery_date'])}/{len(extreme)} extreme objects have one")
    for r in sorted(extreme, key=lambda x: -x["a_au"])[:6]:
        print(f"  {r['id']:<13} {r['discovery_date'] or r['first_obs_jpl']}  {r['discovery_site'] or '-'}")


main()
