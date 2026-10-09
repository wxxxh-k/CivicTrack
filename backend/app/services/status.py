from datetime import date


def derive_status(p, today=None):
    today = today or date.today()
    if p.state == "done":
        return "Completed"
    if p.state == "cancelled":
        return "Cancelled"
    if p.planned_end < today:
        return "Delayed"
    if p.planned_start > today:
        return "Planned"
    return "Ongoing"


def days_overdue(p, today=None):
    today = today or date.today()
    if p.state or p.planned_end >= today:
        return 0
    return (today - p.planned_end).days


def project_out(p, today=None):
    today = today or date.today()
    return {
        "id": p.code, "title": p.title, "work_type": p.work_type, "area": p.area,
        "department": p.department.name, "contractor": p.contractor,
        "planned_start": p.planned_start, "planned_end": p.planned_end, "original_end": p.original_end,
        "status": derive_status(p, today), "progress": p.progress, "budget_inr": p.budget_inr,
        "delay_reason": p.delay_reason, "description": p.description, "geometry": p.geometry,
        "slips": p.slips, "days_overdue": days_overdue(p, today), "source": p.source,
        "report_count": len(p.reports),
    }
