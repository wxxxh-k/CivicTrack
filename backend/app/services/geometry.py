"""Geometry helpers. Lines are [[lng, lat], ...]. Distances are in metres.

Both lines are projected to a local flat plane (equirectangular) around the first
line's latitude, which is accurate to well under 1% at city scale.
"""
import math

from shapely.geometry import LineString, Point

M_PER_DEG_LAT = 110540.0
M_PER_DEG_LNG_EQ = 111320.0


def _line_m(coords, lat0):
    k = M_PER_DEG_LNG_EQ * math.cos(math.radians(lat0))
    return LineString([(x * k, y * M_PER_DEG_LAT) for x, y in coords])


def length_m(coords) -> float:
    return _line_m(coords, coords[0][1]).length


def relate(a, b, buffer_m=15.0):
    """Return (min distance in metres, metres of b that run alongside a)."""
    lat0 = a[0][1]
    A, B = _line_m(a, lat0), _line_m(b, lat0)
    return A.distance(B), B.intersection(A.buffer(buffer_m)).length


def haversine(lat1, lng1, lat2, lng2) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def distance_to_line(lat, lng, coords) -> float:
    k = M_PER_DEG_LNG_EQ * math.cos(math.radians(lat))
    return Point(lng * k, lat * M_PER_DEG_LAT).distance(_line_m(coords, lat))


def centroid(coords):
    """Return (lat, lng) of the middle of the line."""
    lat0 = coords[0][1]
    k = M_PER_DEG_LNG_EQ * math.cos(math.radians(lat0))
    c = _line_m(coords, lat0).interpolate(0.5, normalized=True)
    return c.y / M_PER_DEG_LAT, c.x / k
