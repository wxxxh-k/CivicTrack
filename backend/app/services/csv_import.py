"""Forgiving CSV reader for department uploads.

Accepts many header spellings ("Project Name", "Start Date", "Estimated Cost"...), several date
formats (day first, as is usual in India), money like "Rs. 12,50,000" or "4.5 lakh", and
suggests the closest known road when a name does not match. Nothing is saved here."""
import csv
import difflib
import io
import re
from datetime import date, datetime

from ..constants import WORK_TYPES

MAX_ROWS = 500
REQUIRED = ["title", "road", "planned_start", "planned_end"]

ALIASES = {
    "title": ["title", "project", "project name", "name", "work", "work name", "name of work", "name of the work"],
    "work_type": ["work type", "type", "category", "work category", "type of work"],
    "area": ["area", "locality", "ward", "zone", "neighbourhood", "neighborhood", "division"],
    "road": ["road", "road name", "street", "street name", "location", "road street"],
    "planned_start": ["planned start", "start", "start date", "planned start date", "from", "from date",
                      "commencement", "commencement date", "date of commencement"],
    "planned_end": ["planned end", "end", "end date", "planned end date", "to", "to date", "completion",
                    "completion date", "target completion", "finish date", "due date", "target finish"],
    "contractor": ["contractor", "contractor name", "agency", "executing agency", "awarded to"],
    "budget_inr": ["budget", "budget inr", "cost", "estimated cost", "estimated value", "estimate", "amount", "value"],
    "description": ["description", "details", "remarks", "scope", "scope of work"],
    "tender_id": ["tender id", "tender no", "tender number", "tender ref", "tender reference", "tender"],
    "source_url": ["source url", "url", "link", "source link", "tender link", "source"],
    "dates_estimated": ["dates estimated", "estimated dates", "dates are estimated", "estimated"],
}
LOOKUP = {alias: canon for canon, names in ALIASES.items() for alias in names}
DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d %b %Y", "%d %B %Y", "%d-%b-%Y", "%d/%m/%y", "%d-%m-%y"]


def norm_header(h: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (h or "").lower()).strip()


def parse_date(v: str):
    v = (v or "").strip()
    for f in DATE_FORMATS:
        try:
            return datetime.strptime(v, f).date()
        except ValueError:
            pass
    return None


def parse_money(v: str):
    """'4,20,000' | 'Rs. 4.2 lakh' | '₹1.5 Cr' | '' -> int rupees. Returns None if unreadable."""
    v = (v or "").strip().lower()
    if not v:
        return 0
    m = re.fullmatch(r"(?:rs\.?|inr|₹)?\s*([\d,]*\.?\d+)\s*(lakhs?|lacs?|l|crores?|cr)?\.?", v)
    if not m:
        return None
    n = float(m.group(1).replace(",", ""))
    unit = m.group(2) or ""
    mult = 1e7 if unit.startswith("cr") else 1e5 if unit else 1
    return int(round(n * mult))


def parse_work_type(v: str):
    v = (v or "").strip().lower()
    for wt in WORK_TYPES:
        if v and v[:4] == wt.lower()[:4]:
            return wt
    if "drain" in v or "storm" in v:
        return "Drainage"
    return "Other"


def _truthy(v):
    return (v or "").strip().lower() in ("yes", "y", "true", "1", "estimated")


def parse_rows(text: str, road_names: list):
    """Returns {"columns": {...}, "unmapped": [...], "rows": [...], "file_errors": [...]}.
    Each row: {"row", "values", "errors", "suggestions", "notes", "road"}."""
    try:
        dialect = csv.Sniffer().sniff(text[:2048], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.reader(io.StringIO(text), dialect)
    try:
        header = next(reader)
    except StopIteration:
        return {"columns": {}, "unmapped": [], "rows": [], "file_errors": ["The file is empty."]}
    cols, unmapped = {}, []
    for i, h in enumerate(header):
        canon = LOOKUP.get(norm_header(h))
        if canon and canon not in cols:
            cols[canon] = i
        elif h.strip():
            unmapped.append(h.strip())
    missing = [c for c in REQUIRED if c not in cols]
    if missing:
        return {"columns": {k: header[i] for k, i in cols.items()}, "unmapped": unmapped, "rows": [],
                "file_errors": [f"Could not find a column for: {', '.join(missing)}. Columns found: "
                                f"{', '.join(h.strip() for h in header if h.strip()) or 'none'}."]}
    by_name = {n.casefold(): n for n in road_names}
    rows, seen = [], set()
    for n, raw in enumerate(reader, start=2):
        if not any((c or "").strip() for c in raw):
            continue
        if len(rows) >= MAX_ROWS:
            return {"columns": {k: header[i] for k, i in cols.items()}, "unmapped": unmapped, "rows": rows,
                    "file_errors": [f"Only the first {MAX_ROWS} rows are read."]}
        g = lambda k: (raw[cols[k]].strip() if k in cols and cols[k] < len(raw) else "")
        errs, notes, suggestions = [], [], []
        title = g("title")
        if len(title) < 3:
            errs.append("Title must be at least 3 characters.")
        road_in = g("road")
        road = by_name.get(road_in.casefold())
        if not road_in:
            errs.append("Road is missing. Choose one in the preview, or place it on the map.")
        elif not road:
            suggestions = difflib.get_close_matches(road_in, road_names, n=3, cutoff=0.5)
            errs.append(f"Road '{road_in}' is not in the map data. Choose a road in the preview, or place it on the map.")
        s, e = parse_date(g("planned_start")), parse_date(g("planned_end"))
        if not s:
            errs.append("Start date not understood (use DD/MM/YYYY or YYYY-MM-DD).")
        if not e:
            errs.append("End date not understood (use DD/MM/YYYY or YYYY-MM-DD).")
        if s and e and e < s:
            errs.append("End date is before the start date.")
        budget = parse_money(g("budget_inr"))
        if budget is None:
            errs.append(f"Budget '{g('budget_inr')}' not understood. Use numbers like 450000 or 4.5 lakh.")
            budget = 0
        wt_in = g("work_type")
        wt = parse_work_type(wt_in)
        if wt_in and wt == "Other" and wt_in.lower() != "other":
            notes.append(f"Work type '{wt_in}' set to Other.")
        area = g("area")
        if len(area) < 2:
            area = "Not specified"
        url = g("source_url")
        if url and not url.startswith(("http://", "https://")):
            notes.append("Source link ignored: it must start with http:// or https://.")
            url = ""
        key = (title.casefold(), road_in.casefold(), g("planned_start"))
        if key in seen:
            errs.append("Duplicate of an earlier row.")
        seen.add(key)
        rows.append({"row": n, "road": road, "errors": errs, "notes": notes, "suggestions": suggestions,
                     "values": {"title": title, "work_type": wt, "area": area, "road": road or road_in,
                                "planned_start": s.isoformat() if s else g("planned_start"),
                                "planned_end": e.isoformat() if e else g("planned_end"),
                                "contractor": g("contractor") or "To be announced", "budget_inr": budget,
                                "description": g("description"), "tender_id": g("tender_id") or None,
                                "source_url": url or None, "dates_estimated": _truthy(g("dates_estimated"))}})
    return {"columns": {k: header[i] for k, i in cols.items()}, "unmapped": unmapped, "rows": rows, "file_errors": []}
