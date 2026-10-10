from datetime import date
from typing import Any

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from ..auth import current_department
from ..database import get_db
from ..models import Department
from ..schemas import ProjectCreate
from ..services.conflicts import find_conflicts
from ..services.csv_import import MAX_ROWS, parse_rows
from ..services.roads import load_roads
from .projects import add_project, check_line

router = APIRouter(prefix="/api")


def decode(raw: bytes) -> str:
    for enc in ("utf-8-sig", "cp1252"):  # Excel on Windows often saves CSV as cp1252
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    return raw.decode("latin-1")


@router.post("/import/preview")
async def preview(file: UploadFile = File(...), dept: Department = Depends(current_department),
                  db: Session = Depends(get_db)):
    """Reads a CSV and shows what would be imported. Saves nothing."""
    raw = await file.read()
    if len(raw) > 1_000_000:
        raise HTTPException(413, "The CSV is larger than 1 MB.")
    roads = load_roads()
    result = parse_rows(decode(raw), [r["name"] for r in roads])
    geo = {r["name"]: r["coordinates"] for r in roads}
    for r in result["rows"]:
        r["geometry"] = geo.get(r["road"]) if r["road"] else None
        r["clashes"] = []
        if not r["errors"] and r["geometry"]:
            v = r["values"]
            r["clashes"] = [c["id"] for c in find_conflicts(
                db, r["geometry"], date.fromisoformat(v["planned_start"]), date.fromisoformat(v["planned_end"]))]
    return result


class Commit(BaseModel):
    rows: list[dict[str, Any]]


@router.post("/import/commit")
def commit(body: Commit = Body(...), dept: Department = Depends(current_department), db: Session = Depends(get_db)):
    """Saves the rows the user confirmed. Each row is validated again; bad rows are reported, not saved."""
    if len(body.rows) > MAX_ROWS:
        raise HTTPException(413, f"At most {MAX_ROWS} rows per import.")
    created, errors, warnings = [], [], []
    for i, raw in enumerate(body.rows):
        try:
            data = ProjectCreate.model_validate(raw)
            check_line(data.geometry)
        except ValidationError as e:
            errors.append({"index": i, "errors": [f"{'.'.join(map(str, x['loc']))}: {x['msg']}" for x in e.errors()]})
            continue
        except HTTPException as e:
            errors.append({"index": i, "errors": [e.detail]})
            continue
        clashes = find_conflicts(db, data.geometry, data.planned_start, data.planned_end)
        p = add_project(db, dept, data.model_dump(), "import")
        created.append(p.code)
        if clashes:
            warnings.append({"project": p.code, "title": p.title, "clashes_with": [c["id"] for c in clashes]})
    db.commit()
    return {"created": len(created), "project_ids": created, "rejected": len(errors), "errors": errors, "warnings": warnings}
