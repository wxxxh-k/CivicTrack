from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..auth import current_department
from ..database import get_db
from ..models import Department, Project, Report
from ..schemas import REPORT_CATEGORIES
from ..services.clustering import cluster_reports
from ..services.exif import process_photo
from ..services.geometry import distance_to_line

router = APIRouter(prefix="/api")
MAX_PHOTO_BYTES = 6 * 1024 * 1024
VERIFY_WITHIN_M = 100.0  # a report counts as "at the site" if the location is this close to the project line


def report_out(r: Report):
    return {"id": r.id, "project_id": r.project.code, "category": r.category, "note": r.note, "lat": r.lat,
            "lng": r.lng, "photo": r.photo, "location_source": r.location_source,
            "distance_m": None if r.distance_m is None else round(r.distance_m),
            "location_verified": r.location_verified, "status": r.status, "source": r.source, "created_at": r.created_at}


@router.post("/reports", status_code=201)
async def create_report(project_code: str = Form(...), category: str = Form(...), note: str = Form(""),
                        lat: Optional[float] = Form(None), lng: Optional[float] = Form(None),
                        photo: Optional[UploadFile] = File(None), db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.code == project_code).first()
    if not p:
        raise HTTPException(404, "Project not found")
    if category not in REPORT_CATEGORIES:
        raise HTTPException(422, f"category must be one of {REPORT_CATEGORIES}")
    note = note.strip()[:1000]
    data_url, gps = None, None
    if photo is not None and photo.filename:
        raw = await photo.read()
        if len(raw) > MAX_PHOTO_BYTES:
            raise HTTPException(413, "Photo is larger than 6 MB. Choose a smaller one.")
        try:
            data_url, gps = process_photo(raw)
        except ValueError as e:
            raise HTTPException(422, str(e))
    if not note and not data_url:
        raise HTTPException(422, "Add a photo or a short description.")
    if (lat is None) != (lng is None):
        raise HTTPException(422, "Send both lat and lng, or neither.")
    if lat is not None and not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(422, "Location is out of range.")
    source = "device" if lat is not None else None
    if lat is None and gps:  # fall back to the location stored inside the photo
        (lat, lng), source = gps, "photo"
    dist = distance_to_line(lat, lng, p.geometry) if lat is not None else None
    r = Report(project_id=p.id, category=category, note=note, lat=lat, lng=lng, photo=data_url,
               location_source=source, distance_m=dist,
               location_verified=dist is not None and dist <= VERIFY_WITHIN_M)
    db.add(r)
    db.commit()
    db.refresh(r)
    return report_out(r)


@router.get("/reports")
def list_reports(project_code: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Report).join(Project)
    if project_code:
        q = q.filter(Project.code == project_code)
    return [report_out(r) for r in q.order_by(Report.id.desc()).limit(100)]


@router.get("/reports/clusters")
def clusters(project_code: str, db: Session = Depends(get_db)):
    rows = db.query(Report).join(Project).filter(Project.code == project_code, Report.status == "Open").order_by(Report.id).all()
    return [{"category": c[0].category, "count": len(c), "report_ids": [r.id for r in c],
             "lat": c[0].lat, "lng": c[0].lng} for c in cluster_reports(rows)]


@router.post("/reports/{report_id}/resolve")
def resolve(report_id: int, dept: Department = Depends(current_department), db: Session = Depends(get_db)):
    r = db.get(Report, report_id)
    if not r:
        raise HTTPException(404, "Report not found")
    if r.project.department_id != dept.id:
        raise HTTPException(403, f"Only {r.project.department.name} can resolve this report.")
    r.status = "Resolved"
    db.commit()
    return report_out(r)
