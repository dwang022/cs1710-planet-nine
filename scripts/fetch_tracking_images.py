#!/usr/bin/env python3
"""Fetch the real discovery photographs for the tracking exhibit from Wikimedia
Commons, split the multi-panel ones into single frames the page can blink
between, and record every credit from the Commons API.

Writes public/tracking/*.{jpg,png,gif}, public/tracking/credits.json (read by
the page) and public/tracking/CREDITS.md. Pillow is needed; on this machine run
it as `python -P scripts/fetch_tracking_images.py` (`-I` hides the user
site-packages where Pillow lives).

Each entry below: the Commons title, the output stem, and how to cut it:
  panels   split the image into N equal vertical strips (left to right)
  trim     fraction [left, top, right, bottom] cut off the whole image first
  trims    one [left, top, right, bottom] per panel, applied after the split
  width    resize each output to this width (height follows)
  keep     copy the original bytes unchanged (animated GIFs)
"""
import io, json, os, re, time, urllib.parse, urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "tracking")
API = "https://commons.wikimedia.org/w/api.php"
UA = "cs1710-planet-nine/1.0 (mailto:rluo@g.harvard.edu)"

IMAGES = [
    {"id": "pluto", "commons": "File:Pluto discovery plates.png", "panels": 2, "width": 700,
     "trim": [0.0, 0.0, 0.0, 0.0],
     "trims": [[0.005, 0.145, 0.035, 0.095], [0.03, 0.145, 0.015, 0.095]],
     "caption": "Clyde Tombaugh's two plates, 23 and 29 January 1930, Lowell Observatory. Pluto is the dot that moved (arrowed).",
     "dates": ["23 Jan 1930", "29 Jan 1930"]},
    {"id": "sedna", "commons": "File:Sedna Discovery Image.jpg", "panels": 3, "width": 600,
     "trim": [0.0, 0.0, 0.0, 0.0],
     "caption": "Sedna's discovery frames, 14 November 2003, Samuel Oschin Telescope, Palomar: three exposures over three hours.",
     "dates": ["06:32 UT", "08:05 UT", "09:38 UT"]},
    {"id": "vp113", "commons": "File:2012 VP113 DECam 2012-11-05 annotated.gif", "keep": True,
     "caption": "2012 VP113 on 5 November 2012 in the Dark Energy Camera on the 4-metre Blanco telescope, Cerro Tololo: the grey dot that moves between exposures.",
     "dates": []},
    {"id": "bp519", "commons": "File:Geyagugv DECam 2015-01-17 annotated.png", "panels": 1, "width": 900,
     "trim": [0.0, 0.0, 0.0, 0.0],
     "caption": "2015 BP519 (circled) on 17 January 2015, the Dark Energy Survey's camera. A survey built for cosmology found one of the most extreme orbits known.",
     "dates": []},
    {"id": "comparator", "commons": "File:Zeiss Blink comparator at Lowell Observatory used in the discovery of Pluto by Clyde Tombaugh in 1930.jpg", "panels": 1, "width": 700,
     "trim": [0.08, 0.05, 0.08, 0.05],
     "caption": "The Zeiss blink comparator Tombaugh used: two plates, one eyepiece, a shutter that flips between them.",
     "dates": []},
]


def api(params):
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def info(title):
    d = api({"action": "query", "format": "json", "titles": title, "prop": "imageinfo",
             "iiprop": "url|size|mime|extmetadata",
             "iiextmetadatafilter": "LicenseShortName|LicenseUrl|Artist|Credit|DateTimeOriginal"})
    page = next(iter(d["query"]["pages"].values()))
    if "imageinfo" not in page:
        raise SystemExit(f"not on Commons: {title}")
    ii = page["imageinfo"][0]
    meta = {k: re.sub(r"<[^>]+>", "", v.get("value", "")).strip() for k, v in ii.get("extmetadata", {}).items()}
    return ii, meta


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def main():
    os.makedirs(OUT, exist_ok=True)
    credits = []
    for im in IMAGES:
        ii, meta = info(im["commons"])
        data = fetch(ii["url"])
        files = []
        if im.get("keep"):
            ext = {"image/gif": "gif", "image/png": "png"}.get(ii["mime"], "jpg")
            name = f"{im['id']}.{ext}"
            open(os.path.join(OUT, name), "wb").write(data)
            files.append(name)
        else:
            img = Image.open(io.BytesIO(data)).convert("RGB")
            w, h = img.size
            l, t, r, b = im["trim"]
            img = img.crop((int(w * l), int(h * t), int(w * (1 - r)), int(h * (1 - b))))
            w, h = img.size
            n = im["panels"]
            for k in range(n):
                panel = img.crop((int(w * k / n), 0, int(w * (k + 1) / n), h))
                if im.get("trims"):
                    l2, t2, r2, b2 = im["trims"][k]
                    cw, ch = panel.size
                    panel = panel.crop((int(cw * l2), int(ch * t2), int(cw * (1 - r2)), int(ch * (1 - b2))))
                pw = im["width"]
                panel = panel.resize((pw, round(panel.size[1] * pw / panel.size[0])), Image.LANCZOS)
                name = f"{im['id']}{'-' + str(k + 1) if n > 1 else ''}.jpg"
                panel.save(os.path.join(OUT, name), "JPEG", quality=86, optimize=True, progressive=True)
                files.append(name)
        c = {
            "id": im["id"], "files": files, "dates": im["dates"], "caption": im["caption"],
            "credit": meta.get("Artist") or meta.get("Credit") or "unknown",
            "license": meta.get("LicenseShortName") or "see source",
            "license_url": meta.get("LicenseUrl") or "",
            "source": ii.get("descriptionurl") or "",
            "original_size": [ii.get("width"), ii.get("height")],
        }
        credits.append(c)
        print(f"{im['id']:<11} {ii['width']}x{ii['height']} -> {', '.join(files)}  [{c['license']}] {c['credit'][:60]}")
        time.sleep(0.3)

    doc = {"_what": "Real discovery photographs for the tracking exhibit, from Wikimedia Commons via scripts/fetch_tracking_images.py. Credits were read from the Commons API.",
           "_fetched": time.strftime("%Y-%m-%d"), "images": credits}
    with open(os.path.join(OUT, "credits.json"), "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")
    lines = ["# Photo credits for the tracking exhibit", "",
             "Every image is a Wikimedia Commons file, fetched and cut by `scripts/fetch_tracking_images.py`.",
             "Credit, licence and source were read from the Commons API, not typed.", ""]
    for c in credits:
        lines.append(f"- `{'`, `'.join(c['files'])}` — {c['credit']} · {c['license']} · {c['source']}")
    open(os.path.join(OUT, "CREDITS.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"\n{len(credits)} images -> {OUT}")


main()
