from types import SimpleNamespace as R

from app.services.clustering import cluster_reports


def test_groups_nearby_same_category():
    a = R(lat=13.0, lng=80.0, category="Safety hazard")
    b = R(lat=13.00010, lng=80.0, category="Safety hazard")   # ~11 m away
    c = R(lat=13.00010, lng=80.0, category="Poor quality")    # same place, other category
    d = R(lat=13.01, lng=80.0, category="Safety hazard")      # ~1 km away
    e = R(lat=None, lng=None, category="Safety hazard")       # no location
    assert [len(x) for x in cluster_reports([a, b, c, d, e])] == [2, 1, 1, 1]
