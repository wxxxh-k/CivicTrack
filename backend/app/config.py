import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./civictrack.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
ADMIN_RESET_KEY = os.getenv("ADMIN_RESET_KEY", "")
DEMO_LOGIN = os.getenv("DEMO_LOGIN", "true").lower() == "true"

def _bbox():
    try:
        v = tuple(float(x) for x in os.getenv("SERVICE_BBOX", "12.70,79.90,13.45,80.50").split(","))
        assert len(v) == 4
        return v
    except Exception:
        return (12.70, 79.90, 13.45, 80.50)


# (min_lat, min_lng, max_lat, max_lng): projects outside this box are rejected. Defaults to the Chennai region.
SERVICE_BBOX = _bbox()
MAX_LINE_M = float(os.getenv("MAX_LINE_M", "5000"))
