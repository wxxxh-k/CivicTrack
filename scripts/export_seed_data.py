"""Save your REAL project records into backend/data/seed_data.json (commit that file).

A fresh database (for example the one you create on Neon) loads this file on first start, so the
deployed site opens with your real data, and it can always be restored if a free database is reset.

    python scripts/export_seed_data.py                       # everything except demo records
    python scripts/export_seed_data.py --exclude CT-008 CT-009   # also leave out these test records
    python scripts/export_seed_data.py --include-demo        # include the fictional demo records too

It reads the database in DATABASE_URL, or the local backend/civictrack.db by default.
Resident reports are not exported; they are live data and stay in the database.
"""
import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT / "backend")          # so the default sqlite file is backend/civictrack.db
sys.path.insert(0, str(ROOT / "backend"))

from app.database import SessionLocal  # noqa: E402
from app.models import Project  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--exclude", nargs="*", default=[], help="project codes to leave out, e.g. CT-008")
ap.add_argument("--include-demo", action="store_true")
args = ap.parse_args()

FIELDS = ["title", "work_type", "area", "contractor", "state", "progress", "budget_inr", "delay_reason",
          "description", "geometry", "slips", "source", "tender_id", "source_url", "dates_estimated"]

with SessionLocal() as db:
    projs = [p for p in db.query(Project).order_by(Project.id)
             if p.code not in args.exclude and (args.include_demo or p.source != "demo")]
    out = {"departments": sorted({p.department.name for p in projs}), "projects": [], "updates": []}
    for p in projs:
        row = {"ref": p.code, "department": p.department.name,
               "planned_start": p.planned_start.isoformat(), "planned_end": p.planned_end.isoformat(),
               "original_end": p.original_end.isoformat()}
        row.update({f: getattr(p, f) for f in FIELDS})
        out["projects"].append(row)
        for u in p.updates:
            out["updates"].append({"project": p.code, "kind": u.kind, "reason": u.reason, "by_department": u.by_department,
                                   "old_end": u.old_end.isoformat() if u.old_end else None,
                                   "new_end": u.new_end.isoformat() if u.new_end else None})

target = ROOT / "backend" / "data" / "seed_data.json"
target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"Saved {len(out['projects'])} projects and {len(out['updates'])} updates to {target}")
for p in out["projects"]:
    print(f"  {p['ref']}  [{p['source']}]  {p['title'][:70]}")
