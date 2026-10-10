from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Department(Base):
    __tablename__ = "departments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(24), unique=True, index=True)  # public id, e.g. CT-001
    title: Mapped[str] = mapped_column(String(120))
    work_type: Mapped[str] = mapped_column(String(40))
    area: Mapped[str] = mapped_column(String(80))
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    contractor: Mapped[str] = mapped_column(String(120), default="To be announced")
    planned_start: Mapped[date] = mapped_column(Date)
    planned_end: Mapped[date] = mapped_column(Date)
    original_end: Mapped[date] = mapped_column(Date)
    state: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)  # None | done | cancelled
    progress: Mapped[int] = mapped_column(Integer, default=0)
    budget_inr: Mapped[int] = mapped_column(Integer, default=0)
    delay_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    geometry: Mapped[list] = mapped_column(JSON)  # [[lng, lat], ...]
    slips: Mapped[int] = mapped_column(Integer, default=0)  # times the deadline was pushed later
    source: Mapped[str] = mapped_column(String(12), default="official")  # demo | official | import
    tender_id: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    dates_estimated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    department: Mapped[Department] = relationship()
    updates: Mapped[list["ProjectUpdate"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="ProjectUpdate.id")
    reports: Mapped[list["Report"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Report.id")


class ProjectUpdate(Base):
    """Audit trail: every deadline change or completion, with who and why."""
    __tablename__ = "project_updates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # deadline | completed
    old_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    new_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    reason: Mapped[str] = mapped_column(Text, default="")
    by_department: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    project: Mapped[Project] = relationship(back_populates="updates")


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    category: Mapped[str] = mapped_column(String(40))
    note: Mapped[str] = mapped_column(Text, default="")
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    photo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # compressed JPEG as a data URL
    location_source: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # device | photo
    distance_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(12), default="Open")
    source: Mapped[str] = mapped_column(String(12), default="citizen")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    project: Mapped[Project] = relationship(back_populates="reports")


class WeatherCache(Base):
    __tablename__ = "weather_cache"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
