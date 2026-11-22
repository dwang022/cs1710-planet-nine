#!/usr/bin/env python3
"""Pull one real record for the same object (Sedna) out of each raw catalogue,
so the site can show what the data actually looks like where it is stored.

Reads the raw downloads the team keeps in the FinalProject folder beside this
repo (../FinalProject/data/raw), falling back to this repo's data/raw. Writes
data/processed/catalogue_samples.json (no page loads it, so there is no copy in public/data/) with:

  jpl        Sedna's row from the JPL Small-Body Database query, as field: value
  mpc        Sedna's record from the Minor Planet Center distant-object file
  numbered   Sedna's line from the MPC numbered-minor-planet discovery list
  counts     how many bodies each file holds, for the page's numbers
  query      the JPL query that produced the file

Stdlib only. Run from anywhere: python -P scripts/build_catalogue_samples.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CANDIDATES = [
    os.path.join(os.path.dirname(ROOT), "FinalProject", "data", "raw"),
    os.path.join(ROOT, "data", "raw"),
]
OUTS = [os.path.join(ROOT, "data", "processed", "catalogue_samples.json")]

JPL_FILES = ["jpl_sbdb_a_gt30_asteroids.json", "jpl_sbdb_a_gt30.json"]
MPC_FILES = ["distant_extended.json", "mpc_distant_extended.json"]
NUM_FILES = ["NumberedMPs.txt", "mpc_numbered_discovery.txt"]

JPL_QUERY = {
    "endpoint": "https://ssd-api.jpl.nasa.gov/sbdb_query.api",
    "sb-kind": "a",
    "sb-cdata": '{"AND":["a|GT|30"]}',
    "full-prec": "true",
    "fields": "spkid,full_name,pdes,name,prefix,kind,class,H,G,diameter,albedo,orbit_id,epoch,epoch_cal,e,a,q,i,om,w,ma,ad,n,tp_cal,per_y,moid,moid_jup,t_jup,sigma_e,sigma_a,sigma_q,sigma_i,sigma_om,sigma_w,sigma_ad,sigma_per,source,soln_date,producer,data_arc,first_obs,last_obs,n_obs_used,condition_code,rms,two_body",
}


def find(names):
    for d in CANDIDATES:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return p
    raise SystemExit(f"none of {names} found in {CANDIDATES}")


def main():
    jpl_path, mpc_path, num_path = find(JPL_FILES), find(MPC_FILES), find(NUM_FILES)

    jpl = json.load(open(jpl_path, encoding="utf-8"))
    fields = jpl["fields"]
    rows = jpl["data"]
    sedna = next(r for r in rows if r[fields.index("name")] == "Sedna")
    jpl_rec = {f: v for f, v in zip(fields, sedna)}

    mpc = json.load(open(mpc_path, encoding="utf-8"))
    mpc_rec = next(r for r in mpc if r.get("Name") == "Sedna")
    distant = [r for r in mpc if (r.get("a") or 0) > 30]

    numbered_line = None
    n_numbered = 0
    with open(num_path, encoding="utf-8", errors="replace") as f:
        for line in f:
            n_numbered += 1
            if re.match(r"\s*\(90377\)", line):
                numbered_line = line.rstrip("\n")

    out = {
        "_what": "One real record per catalogue for the same object, Sedna, exactly as the raw files hold it. Built by scripts/build_catalogue_samples.py from the team's raw downloads.",
        "_fetched_from": {"jpl": os.path.basename(jpl_path), "mpc": os.path.basename(mpc_path), "numbered": os.path.basename(num_path)},
        "query": JPL_QUERY,
        "counts": {
            "jpl_rows_a_gt_30": len(rows),
            "jpl_fields": len(fields),
            "mpc_distant_rows": len(mpc),
            "mpc_distant_a_gt_30": len(distant),
            "mpc_numbered_lines": n_numbered,
        },
        "jpl": jpl_rec,
        "mpc": mpc_rec,
        "numbered": numbered_line,
        "numbered_columns": "number · name · discovery date · discovery site · discoverer(s), fixed-width text",
    }
    for out_path in OUTS:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=1, ensure_ascii=False)
            f.write("\n")
    print(f"wrote catalogue_samples.json: JPL {len(rows)} rows x {len(fields)} fields, MPC {len(mpc)} rows, numbered {n_numbered} lines")


main()
