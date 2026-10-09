import csv
import io
from datetime import date

from ..schemas import WORK_TYPES

REQUIRED = ["title", "work_type", "area", "road", "planned_start", "planned_end"]
MAX_ROWS = 500


def parse_rows(text: str, roads: dict):
    """Validate a CSV. Returns (valid_rows, errors). `roads` maps lower-case road name -> coordinates."""
    reader = csv.DictReader(io.StringIO(text))
    cols = [c.strip().lower() for c in (reader.fieldnames or [])]
    missing = [c for c in REQUIRED if c not in cols]
    if missing:
        return [], [{"row": 1, "errors": [f"Missing column(s): {', '.join(missing)}"]}]
    valid, errors, seen = [], [], set()
    for n, raw in enumerate(reader, start=2):
        if n - 1 > MAX_ROWS:
            errors.append({"row": n, "errors": [f"Only the first {MAX_ROWS} rows are imported."]})
            break
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
        errs = []
        if len(row["title"]) < 3:
            errs.append("title must be at least 3 characters")
        if row["work_type"] not in WORK_TYPES:
            errs.append(f"work_type must be one of {WORK_TYPES}")
        if len(row["area"]) < 2:
            errs.append("area is required")
        coords = roads.get(row["road"].casefold())
        if coords is None:
            errs.append(f"unknown road '{row['road']}'")
        try:
            s, e = date.fromisoformat(row["planned_start"]), date.fromisoformat(row["planned_end"])
            if e < s:
                errs.append("planned_end is before planned_start")
        except ValueError:
            errs.append("dates must be YYYY-MM-DD")
            s = e = None
        budget = row.get("budget_inr", "") or "0"
        if not budget.isdigit():
            errs.append("budget_inr must be a whole number")
        key = (row["title"].casefold(), row["road"].casefold(), row["planned_start"])
        if key in seen:
            errs.append("duplicate of an earlier row")
        seen.add(key)
        if errs:
            errors.append({"row": n, "errors": errs})
            continue
        valid.append({"title": row["title"], "work_type": row["work_type"], "area": row["area"],
                      "contractor": row.get("contractor") or "To be announced", "planned_start": s,
                      "planned_end": e, "budget_inr": int(budget), "description": row.get("description", ""),
                      "geometry": coords})
    return valid, errors
