#!/usr/bin/env bash
# Rebuild the prototypes and republish them to GitHub Pages.
#
# Publishes to the PUBLIC repo dwang022/cs1710-planet-nine-prototypes, which
# holds only the built output. The source stays in the private main repo.
#   live at https://dwang022.github.io/cs1710-planet-nine-prototypes/
set -euo pipefail
cd "$(dirname "$0")"

echo "==> building"
npm run build

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp -R dist/. "$WORK"/
touch "$WORK/.nojekyll"          # stop Pages running Jekyll over the output

echo "==> publishing"
cd "$WORK"
git init -q
git add -A
git -c user.name="Daniel Wang" -c user.email="dwang0422@gmail.com" \
    commit -q -m "Deploy prototypes $(date -u +%Y-%m-%dT%H:%MZ)"
git branch -M main
git remote add origin https://github.com/dwang022/cs1710-planet-nine-prototypes.git
# Force-push: this repo is a build artefact, its history is not worth keeping.
git push -q --force origin main

echo "==> done — live in about a minute at"
echo "    https://dwang022.github.io/cs1710-planet-nine-prototypes/"
