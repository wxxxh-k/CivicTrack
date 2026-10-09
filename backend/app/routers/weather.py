from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.geometry import centroid
from ..services.weather import get_forecast, rain_risk
from .projects import get_project_or_404

router = APIRouter(prefix="/api")


@router.get("/projects/{code}/weather")
def project_weather(code: str, db: Session = Depends(get_db)):
    p = get_project_or_404(db, code)
    lat, lng = centroid(p.geometry)
    f = get_forecast(db, lat, lng)
    if not f:
        return {"available": False, "note": "Weather is temporarily unavailable."}
    return {"available": True, "stale": f["stale"], "fetched_at": f["fetched_at"],
            **rain_risk(f["days"], p.planned_start, p.planned_end)}
