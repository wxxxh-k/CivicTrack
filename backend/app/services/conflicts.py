from datetime import date, timedelta
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from ..models import Project
from .geometry import relate
from .status import derive_status

SAME_M = 40.0     # at least this much of the other road runs alongside: same stretch
NEAR_M = 50.0     # closer than this (a junction or the next block): nearby
WINDOW_DAYS = 120  # work this close in time counts as a clash


def date_gap(a_start: date, a_end: date, b_start: date, b_end: date) -> int:
    """Days between two work windows. Negative means they overlap."""
    return (max(a_start, b_start) - min(a_end, b_end)).days


def classify(dist: float, shared: float) -> Optional[str]:
    if shared >= SAME_M:
        return "same_stretch"
    if dist <= NEAR_M:
        return "nearby"
    return None


def find_conflicts(db: Session, geometry, start: date, end: date, exclude_id: Optional[int] = None):
    q = db.query(Project).options(joinedload(Project.department)).filter(
        or_(Project.state.is_(None), Project.state != "cancelled"))
    out = []
    for p in q:
        if exclude_id is not None and p.id == exclude_id:
            continue
        gap = date_gap(start, end, p.planned_start, p.planned_end)
        if gap > WINDOW_DAYS:
            continue
        dist, shared = relate(geometry, p.geometry)
        kind = classify(dist, shared)
        if not kind:
            continue
        out.append({
            "id": p.code, "title": p.title, "department": p.department.name, "area": p.area,
            "planned_start": p.planned_start, "planned_end": p.planned_end,
            "status": derive_status(p), "kind": kind, "shared_m": round(shared),
            "gap_days": gap, "time_overlap": gap < 0,
        })
    out.sort(key=lambda c: (c["kind"] != "same_stretch", c["gap_days"]))
    return out


def suggest_joint_window(start: date, end: date, conflicts):
    """One combined work window covering the new project and every clashing one still to be done."""
    live = [c for c in conflicts if c["status"] not in ("Completed", "Cancelled")]
    if not live:
        # Only recently finished work nearby: suggest waiting out the window after it.
        if conflicts:
            latest = max(c["planned_end"] for c in conflicts)
            return {"type": "wait", "start": latest + timedelta(days=WINDOW_DAYS), "end": None,
                    "note": "Nearby work finished recently. Consider scheduling after the road has settled."}
        return None
    s = min([start] + [c["planned_start"] for c in live])
    e = max([end] + [c["planned_end"] for c in live])
    return {"type": "joint", "start": s, "end": e,
            "note": "Run these works together so the road is opened once."}
