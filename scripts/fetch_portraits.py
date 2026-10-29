#!/usr/bin/env python3
"""Fetch the photos and figures for the section 07 timeline from Wikimedia Commons.

Reads data/processed/field_timeline.json. Every `photos[]` entry and every
`figure` names a Commons file; this script asks the Commons API for that
file's thumbnail, licence and author, downloads the thumbnail, crops it
(square for a photo, 2:1 for a figure marked `wide`) around an optional
focus point, and writes a JPEG to public/field/. It then writes the licence,
author and source URL back into the JSON (so nothing about attribution is
typed by hand), copies the JSON to public/data/, and writes
public/field/CREDITS.md.

Needs Pillow. On this machine run it as `python -P scripts/fetch_portraits.py`
(`-I` would hide the user site-packages where Pillow lives).

  focus  [x, y] fractions of the image the crop is centred on (default a
         little above the middle, which suits head-and-shoulders portraits)
  zoom   fraction of the largest possible crop to keep (default 1)
  wide   true for a 2:1 figure (720 x 360); otherwise a 240 x 240 square
"""
import io, json, os, re, shutil, time, urllib.parse, urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "processed", "field_timeline.json")
PUB = os.path.join(ROOT, "public", "data", "field_timeline.json")
OUT = os.path.join(ROOT, "public", "field")
API = "https://commons.wikimedia.org/w/api.php"
UA = "cs1710-planet-nine/1.0 (mailto:danielwang@g.harvard.edu)"
SQUARE = (240, 240)        # drawn at 56-72 px
WIDE = (720, 360)          # drawn up to ~470 px wide
THUMB_W = 1200             # request a thumbnail this wide, never the original


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
    return re.sub(r"<[^>]+>", "", s or "").strip()


def fetch_bytes(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def crop(img, focus, zoom, size):
    """The largest crop with `size`'s aspect ratio, scaled by zoom, centred on focus."""
    img = img.convert("RGB")
    w, h = img.size
    aspect = size[0] / size[1]
    cw = min(w, h * aspect) * max(0.2, min(1.0, zoom))
    ch = cw / aspect
    fx, fy = focus
    left = int(min(max(w * fx - cw / 2, 0), w - cw))
    top = int(min(max(h * fy - ch / 2, 0), h - ch))
    return img.crop((left, top, int(left + cw), int(top + ch))).resize(size, Image.LANCZOS)


def main():
    doc = json.load(open(SRC, encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    seen = {}       # output name -> credit dict, so an image used twice is fetched once
    for e in doc["entries"]:
        images = list(e.get("photos", []))
        if e.get("figure"):
            images.append(e["figure"])
        for p in images:
            wide = bool(p.get("wide"))
            name = p["file"] + ("-wide" if wide else "")
            if name in seen:
                p.update(seen[name])
                continue
            ii, meta = info(p["commons"])
            img = Image.open(io.BytesIO(fetch_bytes(ii.get("thumburl") or ii["url"])))
            out = crop(img, p.get("focus", [0.5, 0.5] if wide else [0.5, 0.45]), p.get("zoom", 1.0),
                       WIDE if wide else SQUARE)
            path = os.path.join(OUT, name + ".jpg")
            out.save(path, "JPEG", quality=82, optimize=True, progressive=True)
            credit = {
                "src": f"/field/{name}.jpg",
                "credit": strip_html(meta.get("Artist")) or strip_html(meta.get("Credit")) or "unknown",
                "license": meta.get("LicenseShortName") or "see source",
                "license_url": meta.get("LicenseUrl") or "",
                "source": ii.get("descriptionurl") or "",
            }
            p.update(credit)
            seen[name] = credit
            kb = os.path.getsize(path) // 1024
            print(f"  {name:<16} {img.size[0]}x{img.size[1]} -> {out.size[0]}x{out.size[1]} {kb:>3} KB  {credit['license']:<14} {credit['credit'][:50]}")
            time.sleep(0.3)

    doc["_photos_fetched"] = time.strftime("%Y-%m-%d")
    with open(SRC, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")
    shutil.copyfile(SRC, PUB)

    lines = ["# Photo credits for section 07", "",
             "Every image is a Wikimedia Commons file, cropped by `scripts/fetch_portraits.py`.",
             "Credit, licence and source were read from the Commons API, not typed.", ""]
    for name, c in sorted(seen.items()):
        lines.append(f"- `{name}.jpg` — {c['credit']} · {c['license']} · {c['source']}")
    with open(os.path.join(OUT, "CREDITS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"\n{len(seen)} images -> {OUT}")


main()
