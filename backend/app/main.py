from datetime import date
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="CivicTrack API",
    description="Demo API for public works transparency. Seed records are fictional.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Project(BaseModel):
    id: str
    title: str
    work_type: str
    area: str
    department: str
    contractor: str
    planned_start: date
    planned_end: date
    status: str
    progress: int = Field(ge=0, le=100)
    budget_inr: int = Field(ge=0)
    delay_reason: Optional[str] = None
    road_segment_id: str
    description: str

PROJECTS: list[Project] = [
    Project(
        id="CT-001", title="Lake View Road resurfacing", work_type="Road",
        area="Adyar", department="Roads & Highways", contractor="MetroBuild Works",
        planned_start=date(2026, 10, 1), planned_end=date(2026, 10, 24),
        status="Ongoing", progress=55, budget_inr=4200000,
        road_segment_id="ROAD-ADYAR-01",
        description="Resurfacing and footpath repair on the Lake View Road corridor."
    ),
    Project(
        id="CT-002", title="Lake View Road drainage upgrade", work_type="Drainage",
        area="Adyar", department="Stormwater Department", contractor="BlueLine Infra",
        planned_start=date(2026, 10, 15), planned_end=date(2026, 11, 5),
        status="Delayed", progress=30, budget_inr=3100000,
        delay_reason="Utility relocation is taking longer than planned.",
        road_segment_id="ROAD-ADYAR-01",
        description="Drainage capacity improvements along the same road corridor."
    ),
    Project(
        id="CT-003", title="Community water pipeline renewal", work_type="Water",
        area="Velachery", department="Water Supply Board", contractor="ClearFlow Projects",
        planned_start=date(2026, 9, 12), planned_end=date(2026, 10, 12),
        status="Completed", progress=100, budget_inr=1850000,
        road_segment_id="ROAD-VEL-02",
        description="Replacement of an aging water pipeline and restoration of the road surface."
    ),
    Project(
        id="CT-004", title="School Zone footpath repairs", work_type="Footpath",
        area="Guindy", department="Roads & Highways", contractor="SafeStreet Civil",
        planned_start=date(2026, 10, 20), planned_end=date(2026, 11, 8),
        status="Planned", progress=0, budget_inr=1250000,
        road_segment_id="ROAD-GUI-04",
        description="Footpath repairs and accessibility improvements near a school zone."
    ),
    Project(
        id="CT-005", title="Market Street resurfacing", work_type="Road",
        area="T. Nagar", department="Roads & Highways", contractor="MetroBuild Works",
        planned_start=date(2026, 10, 8), planned_end=date(2026, 10, 29),
        status="Ongoing", progress=68, budget_inr=2750000,
        road_segment_id="ROAD-TN-03",
        description="Road surface repairs and repainting of pedestrian crossings."
    ),
]

@app.get("/")
def root():
    return {"name": "CivicTrack API", "version": "0.1.0", "docs": "/docs"}

@app.get("/api/health")
def health():
    return {"status": "ok", "demo_data": True}

@app.get("/api/projects", response_model=list[Project])
def list_projects(
    q: Optional[str] = Query(default=None, description="Search title, area, department, contractor"),
    status: Optional[str] = None,
):
    result = PROJECTS
    if q:
        needle = q.casefold()
        result = [
            p for p in result
            if needle in " ".join([p.title, p.area, p.department, p.contractor, p.work_type]).casefold()
        ]
    if status and status.casefold() != "all":
        result = [p for p in result if p.status.casefold() == status.casefold()]
    return result

@app.get("/api/projects/{project_id}", response_model=Project)
def get_project(project_id: str):
    for project in PROJECTS:
        if project.id == project_id:
            return project
    raise HTTPException(status_code=404, detail="Project not found")

@app.get("/api/conflicts")
def get_conflicts():
    """Demo detector: same road segment + overlapping planned date ranges."""
    conflicts = []
    active = [p for p in PROJECTS if p.status not in {"Completed", "Cancelled"}]
    for i, a in enumerate(active):
        for b in active[i + 1:]:
            if a.road_segment_id != b.road_segment_id:
                continue
            if a.planned_start <= b.planned_end and b.planned_start <= a.planned_end:
                overlap_start = max(a.planned_start, b.planned_start)
                overlap_end = min(a.planned_end, b.planned_end)
                conflicts.append({
                    "id": f"{a.id}-{b.id}",
                    "project_a": a.id,
                    "project_a_title": a.title,
                    "project_b": b.id,
                    "project_b_title": b.title,
                    "area": a.area,
                    "road_segment_id": a.road_segment_id,
                    "overlap_start": overlap_start,
                    "overlap_end": overlap_end,
                    "message": "These projects are scheduled on the same road segment during overlapping dates. Review the schedules together.",
                })
    return conflicts
