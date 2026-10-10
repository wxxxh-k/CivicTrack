"""Demo data. Safe to run repeatedly: it only seeds an empty database.
Every record is marked source="demo" and is fictional. Road geometry comes from
data/roads_demo.geojson (OpenStreetMap) when present."""
import json
from datetime import date, timedelta
from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session

from .models import Department, Project, ProjectUpdate, Report
from .services.geometry import centroid
from .services.roads import load_roads

DEPTS = ["Roads & Highways", "Stormwater Department", "Water Supply Board", "Electricity Board", "Corporation Works"]


SEED_FILE = Path(__file__).resolve().parents[1] / "data" / "seed_data.json"


def ensure_departments(db: Session, extra=()):
    have = {d.name for d in db.query(Department)}
    for n in [*DEPTS, *extra]:
        if n not in have:
            db.add(Department(name=n))
            have.add(n)
    db.commit()


def _d(v):
    return date.fromisoformat(v) if v else None


def load_seed_file(db: Session) -> bool:
    """Load the real baseline records from data/seed_data.json into an EMPTY database.
    Create the file with: python scripts/export_seed_data.py"""
    if db.query(Project).count() > 0 or not SEED_FILE.exists():
        return False
    data = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    ensure_departments(db, data.get("departments", []))
    D = {d.name: d for d in db.query(Department)}
    made = {}
    for p in data["projects"]:
        row = dict(p)
        ref, dept = row.pop("ref"), D[row.pop("department")]
        for k in ("planned_start", "planned_end", "original_end"):
            row[k] = _d(row[k])
        proj = Project(code=f"tmp-{uuid4().hex[:10]}", department_id=dept.id, **row)
        db.add(proj)
        db.flush()
        proj.code = f"CT-{proj.id:03d}"
        made[ref] = proj
    for u in data.get("updates", []):
        proj = made.get(u["project"])
        if proj:
            db.add(ProjectUpdate(project_id=proj.id, kind=u["kind"], old_end=_d(u.get("old_end")), new_end=_d(u.get("new_end")),
                                 reason=u.get("reason", ""), by_department=u["by_department"]))
    db.commit()
    return True


def _p(db, dept, road, **kw):
    d = date.today()
    start, end, orig = d + timedelta(days=kw.pop("s")), d + timedelta(days=kw.pop("e")), d + timedelta(days=kw.pop("o"))
    p = Project(code=f"tmp-{uuid4().hex[:10]}", department_id=dept.id, geometry=road["coordinates"],
                planned_start=start, planned_end=end, original_end=orig, source="demo", **kw)
    db.add(p)
    db.flush()
    p.code = f"CT-{p.id:03d}"
    return p


def seed(db: Session) -> bool:
    if db.query(Project).count() > 0:
        return False
    for n in DEPTS:
        if not db.query(Department).filter_by(name=n).first():
            db.add(Department(name=n))
    db.flush()
    D = {d.name: d for d in db.query(Department)}
    R = load_roads()
    r = lambda i: R[i % len(R)]  # works with any number of fetched roads
    rows = [
        (D["Roads & Highways"], r(0), dict(title="Lake View Road resurfacing", work_type="Road", area="Adyar", contractor="MetroBuild Works",
         s=-9, e=14, o=14, progress=55, budget_inr=4200000, description="Resurfacing and footpath repair on the corridor.")),
        (D["Stormwater Department"], r(0), dict(title="Lake View Road drainage upgrade", work_type="Drainage", area="Adyar", contractor="BlueLine Infra",
         s=-3, e=26, o=19, slips=1, progress=30, budget_inr=3100000, delay_reason="Utility relocation is taking longer than planned.",
         description="Drainage capacity improvements along the same road.")),
        (D["Water Supply Board"], r(1), dict(title="Community water pipeline renewal", work_type="Water", area="Velachery", contractor="ClearFlow Projects",
         s=-30, e=-2, o=-2, state="done", progress=100, budget_inr=1850000, description="Replacement of an aging water pipeline.")),
        (D["Roads & Highways"], r(1), dict(title="Velachery road relaying", work_type="Road", area="Velachery", contractor="SafeStreet Civil",
         s=10, e=25, o=25, budget_inr=2100000, description="Relaying after the pipeline works.")),
        (D["Corporation Works"], r(3), dict(title="School Zone footpath repairs", work_type="Footpath", area="Guindy", contractor="SafeStreet Civil",
         s=12, e=31, o=31, budget_inr=1250000, description="Footpath repairs and accessibility improvements near a school.")),
        (D["Roads & Highways"], r(4), dict(title="Market Street resurfacing", work_type="Road", area="T. Nagar", contractor="MetroBuild Works",
         s=-2, e=19, o=19, progress=68, budget_inr=2750000, description="Surface repairs and repainting of crossings.")),
        (D["Water Supply Board"], r(2), dict(title="Station Road sewer extension", work_type="Sewer", area="Adyar", contractor="ClearFlow Projects",
         s=-40, e=-5, o=-25, slips=1, progress=85, budget_inr=3300000, delay_reason="Contractor moved its crew to another site.",
         description="Connect homes to the main sewer.")),
    ]
    made = [_p(db, dept, road, **kw) for dept, road, kw in rows]
    lat, lng = centroid(made[0].geometry)
    db.add(Report(project_id=made[0].id, category="Safety hazard", note="Loose gravel at the edge of the road.",
                  lat=lat, lng=lng, location_source="device", distance_m=2.0, location_verified=True, source="demo"))
    db.commit()
    return True
