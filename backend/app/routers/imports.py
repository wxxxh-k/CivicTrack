from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..auth import current_department
from ..database import get_db
from ..models import Department
from ..services.conflicts import find_conflicts
from ..services.csv_import import parse_rows
from ..services.roads import roads_by_name
from .projects import add_project

router = APIRouter(prefix="/api")


@router.post("/import/projects")
async def import_projects(file: UploadFile = File(...), dept: Department = Depends(current_department),
                          db: Session = Depends(get_db)):
    raw = await file.read()
    if len(raw) > 1_000_000:
        raise HTTPException(413, "CSV is larger than 1 MB.")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(422, "The file must be UTF-8 text (save as CSV UTF-8).")
    rows, errors = parse_rows(text, roads_by_name())
    warnings = []
    for r in rows:
        c = find_conflicts(db, r["geometry"], r["planned_start"], r["planned_end"])
        p = add_project(db, dept, r, "import")
        if c:
            warnings.append({"project": p.code, "title": p.title, "clashes_with": [x["id"] for x in c]})
    db.commit()
    return {"created": len(rows), "rejected": len(errors), "errors": errors, "warnings": warnings}
