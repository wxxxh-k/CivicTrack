import hmac
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from ..config import ADMIN_RESET_KEY, MAX_LINE_M, SERVICE_BBOX
from ..database import get_db
from ..models import Project, Report, ProjectUpdate, WeatherCache
from ..seed import seed

router = APIRouter(prefix="/api")


@router.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("select 1"))
        database = "ok"
    except Exception:
        database = "down"
    newest = db.query(func.max(WeatherCache.fetched_at)).scalar()
    return {"status": "ok" if database == "ok" else "degraded", "database": database,
            "demo_data": db.query(Project).filter(Project.source == "demo").count() > 0,
            "weather_cache_newest": newest.isoformat() if newest else None}


@router.post("/admin/reset-demo")
def reset_demo(x_admin_key: Optional[str] = Header(default=None), db: Session = Depends(get_db)):
    """Wipes ALL projects and reports, then reloads the demo data."""
    if not ADMIN_RESET_KEY or not hmac.compare_digest(x_admin_key or "", ADMIN_RESET_KEY):
        raise HTTPException(403, "Reset is disabled or the key is wrong.")
    for model in (Report, ProjectUpdate, Project):
        db.query(model).delete()
    db.commit()
    seed(db)
    return {"reset": True}


@router.get("/config")
def public_config():
    return {"service_bbox": SERVICE_BBOX, "max_line_m": MAX_LINE_M}
