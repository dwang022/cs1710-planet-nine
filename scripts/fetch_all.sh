#!/usr/bin/env bash
# Rebuild every dataset from scratch. Needs network access; no third-party
# Python packages (stdlib only).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data/raw data/processed

echo "==> JPL Small-Body Database (a > 30 AU)"
./scripts/fetch_jpl.sh

echo "==> Minor Planet Center distant-object catalogue"
curl -sSL -m 300 -o data/raw/mpc_distant_extended.json.gz \
  "https://www.minorplanetcenter.net/Extended_Files/distant_extended.json.gz"

echo "==> Minor Planet Center numbered-object discovery list"
curl -sSL -m 300 -o data/raw/mpc_numbered_discovery.txt \
  "https://www.minorplanetcenter.net/iau/lists/NumberedMPs.txt"

echo "==> Joining catalogues"
python3 scripts/build_tnos.py

echo "==> Discovery circumstances"
python3 scripts/build_discovery.py

echo "==> Calibrating survey footprints to published areas"
python3 scripts/calibrate_footprints.py

echo "==> Sky geometry"
python3 scripts/build_sky.py

echo "==> Clustering significance"
python3 scripts/build_clustering_null.py

echo "==> Bibliography (Crossref)"
python3 scripts/fetch_papers.py

echo
echo "Done. Curated files (planets.json, planet_nine_predictions.json,"
echo "surveys.json, alternatives.json) are hand-maintained and not regenerated."
