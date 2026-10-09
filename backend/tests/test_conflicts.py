from datetime import date
from types import SimpleNamespace

from app.services.conflicts import WINDOW_DAYS, classify, date_gap
from app.services.geometry import distance_to_line, haversine, length_m, relate
from app.services.status import days_overdue, derive_status

LINE = [[80.2520, 13.0060], [80.2545, 13.0062], [80.2570, 13.0065]]


def test_same_road_is_same_stretch():
    dist, shared = relate(LINE, LINE)
    assert dist == 0 and classify(dist, shared) == "same_stretch"


def test_overlapping_partial_stretch():
    part = [[80.2545, 13.0062], [80.2570, 13.0065], [80.2600, 13.0068]]
    assert classify(*relate(LINE, part)) == "same_stretch"


def test_perpendicular_junction_is_nearby_not_same():
    cross = [[80.2545, 13.0040], [80.2545, 13.0080]]
    dist, shared = relate(LINE, cross)
    assert dist < 1 and shared < 40 and classify(dist, shared) == "nearby"


def test_far_apart_is_no_conflict():
    far = [[80.30, 13.05], [80.31, 13.05]]
    assert classify(*relate(LINE, far)) is None


def test_date_gap():
    d = date
    assert date_gap(d(2026, 1, 1), d(2026, 1, 31), d(2026, 1, 15), d(2026, 2, 15)) < 0  # overlap
    assert date_gap(d(2026, 1, 1), d(2026, 1, 10), d(2026, 1, 20), d(2026, 1, 30)) == 10
    assert date_gap(d(2026, 1, 1), d(2026, 1, 10), d(2026, 9, 1), d(2026, 9, 30)) > WINDOW_DAYS


def test_geometry_helpers():
    assert 500 < length_m(LINE) < 600
    assert haversine(13.0, 80.0, 13.0, 80.0) == 0
    assert distance_to_line(13.0062, 80.2545, LINE) < 5
    assert distance_to_line(13.0200, 80.2545, LINE) > 1000


def test_status():
    t = date(2026, 10, 10)
    mk = lambda s, e, st=None: SimpleNamespace(planned_start=s, planned_end=e, state=st)
    assert derive_status(mk(date(2026, 11, 1), date(2026, 11, 9)), t) == "Planned"
    assert derive_status(mk(date(2026, 10, 1), date(2026, 10, 20)), t) == "Ongoing"
    assert derive_status(mk(date(2026, 9, 1), date(2026, 10, 1)), t) == "Delayed"
    assert derive_status(mk(date(2026, 9, 1), date(2026, 10, 1), "done"), t) == "Completed"
    assert days_overdue(mk(date(2026, 9, 1), date(2026, 10, 1)), t) == 9
