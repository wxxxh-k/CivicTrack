"""Road geometry for the demo area.

Real roads come from OpenStreetMap: run scripts/fetch_osm_roads.py once and commit
backend/data/roads_demo.geojson. If that file is missing, a small set of illustrative
roads is used so the app always starts. FALLBACK coordinates are approximate.
"""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parents[2] / "data" / "roads_demo.geojson"

FALLBACK = [
    {"name": "Lake View Road", "coordinates": [[80.2520, 13.0060], [80.2545, 13.0062], [80.2570, 13.0065], [80.2595, 13.0066]]},
    {"name": "Velachery Main Road", "coordinates": [[80.2500, 12.9900], [80.2508, 12.9925], [80.2515, 12.9950], [80.2524, 12.9975]]},
    {"name": "Station Road", "coordinates": [[80.2600, 13.0000], [80.2602, 13.0025], [80.2606, 13.0050], [80.2608, 13.0075]]},
    {"name": "Guindy School Road", "coordinates": [[80.2420, 13.0100], [80.2440, 13.0105], [80.2460, 13.0112], [80.2480, 13.0118]]},
    {"name": "Market Street", "coordinates": [[80.2550, 12.9960], [80.2575, 12.9962], [80.2600, 12.9965], [80.2625, 12.9968]]},
]


def load_roads():
    try:
        feats = json.loads(DATA.read_text(encoding="utf-8"))["features"]
        roads = [{"name": f["properties"]["name"], "coordinates": f["geometry"]["coordinates"]}
                 for f in feats if f["geometry"]["type"] == "LineString" and len(f["geometry"]["coordinates"]) >= 2]
        return roads or FALLBACK
    except (OSError, KeyError, ValueError):
        return FALLBACK


def roads_by_name():
    return {r["name"].casefold(): r["coordinates"] for r in load_roads()}
