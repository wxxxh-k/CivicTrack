"""Minimal signed-token auth. Demo sign-in lets judges enter as a department with one click.
For production, replace with real accounts (and set DEMO_LOGIN=false)."""
import base64
import hashlib
import hmac
import json
import time
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .config import DEMO_LOGIN, SECRET_KEY
from .database import get_db
from .models import Department
from .schemas import LoginIn

router = APIRouter(prefix="/api")


def _sign(body: str) -> str:
    return hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).hexdigest()


def make_token(dept_id: int, ttl: int = 12 * 3600) -> str:
    body = base64.urlsafe_b64encode(json.dumps({"d": dept_id, "exp": int(time.time()) + ttl}).encode()).decode().rstrip("=")
    return f"{body}.{_sign(body)}"


def parse_token(token: str) -> Optional[int]:
    try:
        body, sig = token.split(".")
        if not hmac.compare_digest(sig, _sign(body)):
            return None
        data = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        return data["d"] if data["exp"] > time.time() else None
    except Exception:
        return None


def current_department(authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)) -> Department:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Sign in as a department to do this.")
    dept_id = parse_token(authorization[7:])
    dept = db.get(Department, dept_id) if dept_id else None
    if not dept:
        raise HTTPException(401, "Your session has expired. Sign in again.")
    return dept


@router.get("/departments")
def departments(db: Session = Depends(get_db)):
    return [{"id": d.id, "name": d.name} for d in db.query(Department).order_by(Department.name)]


@router.post("/auth/demo-login")
def demo_login(body: LoginIn, db: Session = Depends(get_db)):
    if not DEMO_LOGIN:
        raise HTTPException(403, "Demo sign-in is disabled.")
    dept = db.get(Department, body.department_id)
    if not dept:
        raise HTTPException(404, "Department not found.")
    return {"token": make_token(dept.id), "department": {"id": dept.id, "name": dept.name}}
