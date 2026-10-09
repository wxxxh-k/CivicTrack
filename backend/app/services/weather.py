"""Rain forecast from Open-Meteo (free, no key). Cached in the database; if the API is down,
the last saved forecast is returned and marked stale, so the app never breaks on it."""
from datetime import date, datetime, timedelta, timezone
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from ..models import WeatherCache

URL = "https://api.open-meteo.com/v1/forecast"
TTL = timedelta(hours=3)
MODERATE_MM, HIGH_MM = 15.0, 40.0  # our own heuristic thresholds, in mm per day


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def get_forecast(db: Session, lat: float, lng: float) -> Optional[dict]:
    key = f"{round(lat, 2)},{round(lng, 2)}"
    row = db.get(WeatherCache, key)
    now = datetime.now(timezone.utc)
    if row and now - _aware(row.fetched_at) < TTL:
        return {"days": row.payload["days"], "stale": False, "fetched_at": _aware(row.fetched_at).isoformat()}
    try:
        r = httpx.get(URL, params={
            "latitude": lat, "longitude": lng, "timezone": "Asia/Kolkata", "forecast_days": 7,
            "daily": "precipitation_sum,precipitation_probability_max"}, timeout=5.0)
        r.raise_for_status()
        d = r.json()["daily"]
        days = [{"date": t, "mm": m or 0, "prob": p or 0} for t, m, p in
                zip(d["time"], d["precipitation_sum"], d["precipitation_probability_max"])]
        if row:
            row.payload, row.fetched_at = {"days": days}, now
        else:
            db.add(WeatherCache(key=key, payload={"days": days}, fetched_at=now))
        db.commit()
        return {"days": days, "stale": False, "fetched_at": now.isoformat()}
    except Exception:
        db.rollback()
        if row:
            return {"days": row.payload["days"], "stale": True, "fetched_at": _aware(row.fetched_at).isoformat()}
        return None


def rain_risk(days, start: date, end: date) -> dict:
    window = [d for d in days if start <= date.fromisoformat(d["date"]) <= end]
    if not window:
        return {"level": "unknown", "note": "Work window is outside the 7-day forecast.", "days": []}
    peak = max(d["mm"] for d in window)
    level = "high" if peak >= HIGH_MM else "moderate" if peak >= MODERATE_MM else "low"
    return {"level": level, "peak_mm": peak, "days": window,
            "note": {"high": "Heavy rain forecast during the work window.",
                     "moderate": "Rain likely on some work days.", "low": "No significant rain forecast."}[level]}
