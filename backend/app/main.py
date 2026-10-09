from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import auth, models  # noqa: F401  (models must be imported so tables are created)
from .config import CORS_ORIGINS
from .database import Base, SessionLocal, engine
from .routers import admin, analytics, conflicts, imports, projects, reports, weather
from .seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)  # only fills an empty database
    yield


app = FastAPI(title="CivicTrack API", version="0.2.0", lifespan=lifespan,
              description="Public works transparency. Records marked source=demo are fictional.")

app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])

for r in (auth.router, projects.router, conflicts.router, reports.router, imports.router,
          analytics.router, weather.router, admin.router):
    app.include_router(r)


@app.get("/")
def root():
    return {"name": "CivicTrack API", "version": "0.2.0", "docs": "/docs"}
