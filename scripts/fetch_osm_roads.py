"""Run ONCE on your own machine (needs internet), then commit the output file:

    pip install httpx
    python scripts/fetch_osm_roads.py                      # default: Adyar, Chennai
    python scripts/fetch_osm_roads.py 12.98 80.24 13.02 80.27   # south west north east

Data (c) OpenStreetMap contributors, ODbL. Mention this in your README.
"""
import json
import math
import sys
from pathlib import Path

import httpx

OUT = Path(__file__).resolve().parents[1] / "backend" / "data" / "roads_demo.geojson"
bbox = [float(x) for x in sys.argv[1:5]] if len(sys.argv) >= 5 else [12.98, 80.24, 13.02, 80.27]
query = f"""[out:json][timeout:60];
way["highway"~"^(primary|secondary|tertiary|residential)$"]["name"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
out geom;"""


def length_m(pts):
    return sum(math.hypot((b[0] - a[0]) * 111320 * math.cos(math.radians(a[1])), (b[1] - a[1]) * 110540)
               for a, b in zip(pts, pts[1:]))


r = httpx.post("https://overpass-api.de/api/interpreter", data={"data": query}, timeout=90)
r.raise_for_status()
best = {}
for el in r.json()["elements"]:
    pts = [[g["lon"], g["lat"]] for g in el.get("geometry", [])]
    name = el.get("tags", {}).get("name")
    if len(pts) >= 2 and name and length_m(pts) >= 150 and length_m(pts) > best.get(name, (0, None))[0]:
        best[name] = (length_m(pts), pts)
top = sorted(best.items(), key=lambda kv: -kv[1][0])[:15]
feats = [{"type": "Feature", "properties": {"name": n, "length_m": round(L)},
          "geometry": {"type": "LineString", "coordinates": pts}} for n, (L, pts) in top]
OUT.write_text(json.dumps({"type": "FeatureCollection", "features": feats}), encoding="utf-8")
print(f"Saved {len(feats)} roads to {OUT}")
