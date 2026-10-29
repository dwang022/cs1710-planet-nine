#!/usr/bin/env python3
"""Fetch the organisation logos the site shows (so far: the IAU's) from
Wikimedia Commons and record their credits from the Commons API.

Writes public/logos/<id>.svg and public/logos/credits.json, which the credits
page reads. Stdlib only: `python -P scripts/fetch_logos.py`.
"""
import json, os, re, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "logos")
API = "https://commons.wikimedia.org/w/api.php"
UA = "cs1710-planet-nine/1.0 (mailto:rluo@g.harvard.edu)"

LOGOS = [
    {"id": "iau", "commons": "File:IAU logo.svg", "what": "International Astronomical Union logo",
     "shown": "setting/planets.html, beside the definition of a planet"},
]


def api(params):
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def strip_tags(s):
    t = re.sub(r"<[^>]+>", "", s or "")
    t = re.sub(r"\s+", " ", t)
    return re.sub(r" ([,.;:])", r"\1", t).strip()


def info(title):
    d = api({"action": "query", "format": "json", "titles": title, "prop": "imageinfo",
             "iiprop": "url|size|mime|extmetadata",
             "iiextmetadatafilter": "LicenseShortName|LicenseUrl|Artist|Credit|Restrictions"})
    page = next(iter(d["query"]["pages"].values()))
    ii = page["imageinfo"][0]
    em = ii.get("extmetadata", {})
    g = lambda k: strip_tags(em.get(k, {}).get("value", ""))
    return {"url": ii["url"], "mime": ii["mime"], "size": [ii["width"], ii["height"]],
            "credit": g("Artist") or g("Credit"), "vectorised_by": g("Credit"),
            "license": g("LicenseShortName"), "license_url": em.get("LicenseUrl", {}).get("value", ""),
            "restrictions": g("Restrictions"),
            "source": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"))}


def main():
    os.makedirs(OUT, exist_ok=True)
    out = []
    for L in LOGOS:
        i = info(L["commons"])
        ext = {"image/svg+xml": "svg", "image/png": "png"}.get(i["mime"], "bin")
        req = urllib.request.Request(i["url"], headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        fn = f"{L['id']}.{ext}"
        with open(os.path.join(OUT, fn), "wb") as f:
            f.write(data)
        out.append({"id": L["id"], "file": fn, "what": L["what"], "shown": L["shown"], **i})
        print(f"{fn}: {len(data):,} bytes · {i['license']} · {i['credit']} · restrictions: {i['restrictions'] or 'none'}")
    with open(os.path.join(OUT, "credits.json"), "w", encoding="utf-8") as f:
        json.dump({"_what": "Organisation logos shown on the site, from Wikimedia Commons via scripts/fetch_logos.py. "
                            "Credits and restrictions were read from the Commons API; a trademarked logo identifies "
                            "the organisation and implies no endorsement.",
                   "logos": out}, f, indent=1, ensure_ascii=False)
        f.write("\n")


if __name__ == "__main__":
    main()
