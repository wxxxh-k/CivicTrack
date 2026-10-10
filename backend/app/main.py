from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import auth, models  # noqa: F401  (models must be imported so tables are created)
from .config import CORS_ORIGINS, SEED_DEMO
from .database import Base, SessionLocal, engine
from .routers import admin, analytics, conflicts, imports, projects, reports, weather
from .seed import ensure_departments, load_seed_file, seed

# The built frontend (npm run build). When present, this one server serves the site AND the API.
DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        ensure_departments(db)            # sign-in needs these, always
        if not load_seed_file(db) and SEED_DEMO:  # real records from the repo; demo records only if allowed
            seed(db)
    yield


app = FastAPI(title="CivicTrack API", version="0.3.0", lifespan=lifespan,
              description="Public works transparency. Records marked source=demo are fictional.")

app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])

for r in (auth.router, projects.router, conflicts.router, reports.router, imports.router,
          analytics.router, weather.router, admin.router):
    app.include_router(r)

if (DIST / "index.html").exists():
    if (DIST / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def site(path: str):
        if path.startswith("api/") or path == "api":
            raise HTTPException(404, "Not found")
        target = (DIST / path).resolve()
        if path and target.is_file() and str(target).startswith(str(DIST.resolve())):
            return FileResponse(target)
        return FileResponse(DIST / "index.html")  # single-page app: let the frontend handle the route
else:
    @app.get("/")
    def root():
        return {"name": "CivicTrack API", "version": "0.3.0", "docs": "/docs"}
