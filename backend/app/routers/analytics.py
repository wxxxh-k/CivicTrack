from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Department, Project
from ..services.status import days_overdue, derive_status

router = APIRouter(prefix="/api")


@router.get("/analytics/departments")
def scorecard(db: Session = Depends(get_db)):
    out = []
    for d in db.query(Department).order_by(Department.name):
        ps = db.query(Project).options(joinedload(Project.reports)).filter(Project.department_id == d.id).all()
        overdue = [p for p in ps if derive_status(p) == "Delayed"]
        out.append({"department": d.name, "projects": len(ps), "deadlines_moved": sum(p.slips for p in ps),
                    "overdue": len(overdue),
                    "avg_days_overdue": round(sum(days_overdue(p) for p in overdue) / len(overdue)) if overdue else 0,
                    "open_reports": sum(1 for p in ps for r in p.reports if r.status == "Open")})
    out.sort(key=lambda r: (-r["overdue"], -r["deadlines_moved"]))
    return out
