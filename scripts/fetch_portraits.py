#!/usr/bin/env python3
"""Fetch the photos for the section 07 timeline from Wikimedia Commons.

Reads data/processed/field_timeline.json. Every photo names a Commons file;
this script asks the Commons API for that file's thumbnail, licence and
author, downloads the thumbnail, crops it square around an optional focus
point, and writes a 240 px JPEG to public/field/. It then writes the
licence, author and source URL back into the JSON (so nothing about
attribution is typed by hand), copies the JSON to public/data/, and writes
public/field/CREDITS.md.

Needs Pillow. Re-run after changing a photo's `commons`, `focus` or `zoom`.

  focus  [x, y] fractions of the image the crop is centred on (default centre,
         a little above the middle, which suits head-and-shoulders portraits)
  zoom   fraction of the shorter side to keep (default 1 = the largest square)
"""
import io, json, os, shutil, sys, time, urllib.parse, urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "processed", "field_timeline.json")
PUB = os.path.join(ROOT, "public", "data", "field_timeline.json")
OUT = os.path.join(ROOT, "public", "field")
API = "https://commons.wikimedia.org/w/api.php"
UA = "cs1710-planet-nine/1.0 (mailto:danielwang@g.harvard.edu)"
SIZE = 240            # output pixels; drawn at 72-96 px, so this is 2.5-3x
THUMB_W = 1000        # request a thumbnail this wide, never the original


def api(params):
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def info(title):
    d = api({
        "action": "query", "format": "json", "titles": title,
        "prop": "imageinfo", "iiprop": "url|size|extmetadata",
        "iiurlwidth": THUMB_W,
        "iiextmetadatafilter": "LicenseShortName|LicenseUrl|Artist|Credit",
    })
    page = next(iter(d["query"]["pages"].values()))
    if "imageinfo" not in page:
        raise SystemExit(f"  !! not found on Commons: {title}")
    ii = page["imageinfo"][0]
    meta = {k: v.get("value", "") for k, v in ii.get("extmetadata", {}).items()}
    return ii, meta


def strip_html(s):
    import re
    return re.sub(r"<[^>]+>", "", s or "").strip()


def fetch_bytes(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def square(img, focus, zoom):
    img = img.convert("RGB")
    w, h = img.size
    side = int(min(w, h) * max(0.2, min(1.0, zoom)))
    fx, fy = focus
    cx, cy = w * fx, h * fy
    left = int(min(max(cx - side / 2, 0), w - side))
    top = int(min(max(cy - side / 2, 0), h - side))
    return img.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)


def main():
    doc = json.load(open(SRC, encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    seen = {}       # file stem -> credit dict, so a photo used twice is fetched once
    for e in doc["entries"]:
        for p in e.get("photos", []):
            stem = p["file"]
            if stem in seen:
                p.update(seen[stem])
                continue
            ii, meta = info(p["commons"])
            img = Image.open(io.BytesIO(fetch_bytes(ii.get("thumburl") or ii["url"])))
            out = square(img, p.get("focus", [0.5, 0.45]), p.get("zoom", 1.0))
            path = os.path.join(OUT, stem + ".jpg")
            out.save(path, "JPEG", quality=82, optimize=True, progressive=True)
            credit = {
                "src": f"/field/{stem}.jpg",
                "credit": strip_html(meta.get("Artist")) or strip_html(meta.get("Credit")) or "unknown",
                "license": meta.get("LicenseShortName") or "see source",
                "license_url": meta.get("LicenseUrl") or "",
                "source": ii.get("descriptionurl") or "",
            }
            p.update(credit)
            seen[stem] = credit
            kb = os.path.getsize(path) // 1024
            print(f"  {stem:<10} {img.size[0]}x{img.size[1]} -> {SIZE}px {kb:>3} KB  {credit['license']:<14} {credit['credit'][:60]}")
            time.sleep(0.3)

    doc["_photos_fetched"] = time.strftime("%Y-%m-%d")
    with open(SRC, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")
    shutil.copyfile(SRC, PUB)

    lines = ["# Photo credits for section 07", "",
             "Every image is a Wikimedia Commons file, cropped square by `scripts/fetch_portraits.py`.",
             "Credit, licence and source were read from the Commons API, not typed.", ""]
    for stem, c in sorted(seen.items()):
        lines.append(f"- `{stem}.jpg` — {c['credit']} · {c['license']} · {c['source']}")
    with open(os.path.join(OUT, "CREDITS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"\n{len(seen)} photos -> {OUT}")


main()
