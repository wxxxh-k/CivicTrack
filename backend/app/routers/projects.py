from datetime import date
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload

from ..auth import current_department
from ..database import get_db
from ..models import Department, Project, ProjectUpdate
from ..schemas import DeadlineUpdate, ProjectCreate
from ..services.conflicts import find_conflicts, suggest_joint_window
from ..services.geometry import length_m
from ..services.roads import load_roads
from ..services.status import derive_status, project_out

router = APIRouter(prefix="/api")


def get_project_or_404(db: Session, code: str) -> Project:
    p = db.query(Project).options(joinedload(Project.department)).filter(Project.code == code).first()
    if not p:
        raise HTTPException(404, "Project not found")
    return p


def own_or_403(p: Project, dept: Department):
    if p.department_id != dept.id:
        raise HTTPException(403, f"Only {p.department.name} can change this project.")


def add_project(db: Session, dept: Department, data: dict, source: str) -> Project:
    p = Project(code=f"tmp-{uuid4().hex[:10]}", department_id=dept.id, original_end=data["planned_end"],
                source=source, progress=0, **data)
    db.add(p)
    db.flush()
    p.code = f"CT-{p.id:03d}"
    return p


@router.get("/roads")
def roads():
    return load_roads()


@router.get("/projects")
def list_projects(q: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    rows = db.query(Project).options(joinedload(Project.department), joinedload(Project.reports)).order_by(Project.id).all()
    out = [project_out(p) for p in rows]
    if q:
        n = q.casefold()
        out = [p for p in out if n in " ".join([p["title"], p["area"], p["department"], p["contractor"], p["work_type"]]).casefold()]
    if status and status.casefold() != "all":
        out = [p for p in out if p["status"].casefold() == status.casefold()]
    return out


@router.get("/projects/{code}")
def get_project(code: str, db: Session = Depends(get_db)):
    return project_out(get_project_or_404(db, code))


@router.get("/projects/{code}/updates")
def project_updates(code: str, db: Session = Depends(get_db)):
    p = get_project_or_404(db, code)
    return [{"kind": u.kind, "old_end": u.old_end, "new_end": u.new_end, "reason": u.reason,
             "by": u.by_department, "at": u.created_at} for u in p.updates]


@router.post("/projects", status_code=201)
def create_project(body: ProjectCreate, force: bool = False, dept: Department = Depends(current_department),
                   db: Session = Depends(get_db)):
    if length_m(body.geometry) < 5:
        raise HTTPException(422, "The project line is too short. Pick a longer stretch of road.")
    conflicts = find_conflicts(db, body.geometry, body.planned_start, body.planned_end)
    if conflicts and not force:
        return JSONResponse(status_code=409, content=jsonable_encoder({
            "detail": "Possible clash with nearby work",
            "conflicts": conflicts,
            "suggestion": suggest_joint_window(body.planned_start, body.planned_end, conflicts)}))
    p = add_project(db, dept, body.model_dump(), "official")
    db.commit()
    db.refresh(p)
    return project_out(p)


@router.post("/projects/{code}/deadline")
def change_deadline(code: str, body: DeadlineUpdate, dept: Department = Depends(current_department),
                    db: Session = Depends(get_db)):
    p = get_project_or_404(db, code)
    own_or_403(p, dept)
    if p.state:
        raise HTTPException(409, "This project is already closed.")
    if body.new_end < p.planned_start:
        raise HTTPException(422, "The new end date cannot be before the start date.")
    if body.new_end == p.planned_end:
        raise HTTPException(422, "That is already the end date.")
    db.add(ProjectUpdate(project_id=p.id, kind="deadline", old_end=p.planned_end, new_end=body.new_end,
                         reason=body.reason, by_department=dept.name))
    if body.new_end > p.planned_end:
        p.slips += 1
    p.planned_end, p.delay_reason = body.new_end, body.reason
    db.commit()
    return project_out(p)


@router.post("/projects/{code}/complete")
def complete(code: str, dept: Department = Depends(current_department), db: Session = Depends(get_db)):
    p = get_project_or_404(db, code)
    own_or_403(p, dept)
    if p.state:
        raise HTTPException(409, "This project is already closed.")
    db.add(ProjectUpdate(project_id=p.id, kind="completed", old_end=p.planned_end, new_end=date.today(),
                         reason="Marked complete", by_department=dept.name))
    p.state, p.progress = "done", 100
    db.commit()
    return project_out(p)
