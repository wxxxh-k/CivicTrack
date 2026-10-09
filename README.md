# CivicTrack — Public Works Transparency MVP

A starter MVP for monitoring public infrastructure projects and identifying possible scheduling conflicts.

## Features
- Public dashboard with project counts and status filters
- Search projects by title, area, department, or contractor
- Project cards with budget, dates, progress, and delay reasons
- Coordination alerts for projects that share a road segment and have overlapping planned dates
- FastAPI backend with sample data and API endpoints
- Clearly marked demo data

## Tech stack
- Frontend: React, TypeScript, Vite, plain CSS
- Backend: FastAPI, Pydantic
- Next step: replace in-memory demo records with PostgreSQL/PostGIS

## Run locally

### 1. Start the backend
Requirements: Python 3.10+

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

### 2. Start the frontend in another terminal
Requirements: Node.js 18+

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

The frontend uses the Vite development proxy to send `/api` requests to FastAPI on port 8000.

## Demo data
All projects are fictional sample records for demonstration. They must not be represented as official government data.

## Current limitations
- No login or role-based access yet
- Data is stored in memory and resets when the backend restarts
- Coordination matching currently uses shared `road_segment_id` values and overlapping date ranges; it is not yet full PostGIS geometry analysis
- Map integration, photo evidence, audit logs, and persistent database are planned next

## Suggested next improvements
1. Add PostgreSQL/PostGIS models and migrations.
2. Add secure official login and server-side role checks.
3. Track project update history and deadline revisions.
4. Add citizen reports with location and photo uploads.
5. Add tests for conflict detection edge cases.
