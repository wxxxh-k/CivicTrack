from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Project
from ..schemas import ConflictCheck
from ..services.conflicts import find_conflicts, suggest_joint_window

router = APIRouter(prefix="/api")


@router.get("/conflicts")
def all_conflicts(db: Session = Depends(get_db)):
    live = db.query(Project).options(joinedload(Project.department)).filter(Project.state.is_(None)).all()
    out, seen = [], set()
    for p in live:
        for c in find_conflicts(db, p.geometry, p.planned_start, p.planned_end, exclude_id=p.id):
            if c["status"] in ("Completed", "Cancelled"):
                continue
            pair = tuple(sorted((p.code, c["id"])))
            if pair in seen:
                continue
            seen.add(pair)
            same = c["kind"] == "same_stretch"
            out.append({
                "id": "-".join(pair), "project_a": p.code, "project_a_title": p.title,
                "project_b": c["id"], "project_b_title": c["title"], "area": p.area,
                "kind": c["kind"], "shared_m": c["shared_m"], "gap_days": c["gap_days"],
                "overlap_start": max(p.planned_start, c["planned_start"]) if c["time_overlap"] else None,
                "overlap_end": min(p.planned_end, c["planned_end"]) if c["time_overlap"] else None,
                "message": ("These works share the same stretch of road" if same else "These works are next to each other")
                           + (" at overlapping dates. Review the schedules together." if c["time_overlap"]
                              else f" within {max(c['gap_days'], 0)} days of each other."),
            })
    out.sort(key=lambda c: (c["kind"] != "same_stretch", c["gap_days"]))
    return out


@router.post("/conflicts/check")
def check(body: ConflictCheck, db: Session = Depends(get_db)):
    excl = None
    if body.exclude_code:
        p = db.query(Project).filter(Project.code == body.exclude_code).first()
        excl = p.id if p else None
    c = find_conflicts(db, body.geometry, body.planned_start, body.planned_end, exclude_id=excl)
    return {"conflicts": c, "suggestion": suggest_joint_window(body.planned_start, body.planned_end, c)}
