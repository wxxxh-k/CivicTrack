from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

WORK_TYPES = ["Road", "Drainage", "Water", "Footpath", "Electricity", "Sewer", "Other"]
REPORT_CATEGORIES = ["Work stalled", "Poor quality", "Safety hazard", "No signboard", "Other"]


def check_geometry(v):
    if not isinstance(v, list) or len(v) < 2:
        raise ValueError("geometry needs at least 2 points as [longitude, latitude]")
    for pt in v:
        if len(pt) != 2 or not (-180 <= pt[0] <= 180) or not (-90 <= pt[1] <= 90):
            raise ValueError("each point must be [longitude, latitude] within valid ranges")
    return v


class ProjectCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    work_type: str = "Road"
    area: str = Field(min_length=2, max_length=80)
    contractor: str = Field(default="To be announced", max_length=120)
    planned_start: date
    planned_end: date
    budget_inr: int = Field(default=0, ge=0)
    description: str = Field(default="", max_length=1000)
    geometry: list[list[float]]

    _geo = field_validator("geometry")(check_geometry)

    @field_validator("work_type")
    @classmethod
    def work_type_ok(cls, v):
        if v not in WORK_TYPES:
            raise ValueError(f"work_type must be one of {WORK_TYPES}")
        return v

    @model_validator(mode="after")
    def dates_ok(self):
        if self.planned_end < self.planned_start:
            raise ValueError("planned_end must be on or after planned_start")
        return self


class ConflictCheck(BaseModel):
    geometry: list[list[float]]
    planned_start: date
    planned_end: date
    exclude_code: Optional[str] = None

    _geo = field_validator("geometry")(check_geometry)

    @model_validator(mode="after")
    def dates_ok(self):
        if self.planned_end < self.planned_start:
            raise ValueError("planned_end must be on or after planned_start")
        return self


class DeadlineUpdate(BaseModel):
    new_end: date
    reason: str = Field(min_length=5, max_length=500)


class LoginIn(BaseModel):
    department_id: int
