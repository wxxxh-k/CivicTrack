# Video LINK
[🎬Demo Video](https://drive.google.com/file/d/1IVkKZQGlsBV-qbHReGYs-FpYHUl6u4uE/view?usp=drive_link)

[🌐 Visit the Live Website](https://civictrack-4uwg.onrender.com)
# CivicTrack — Public Works Transparency Platform

CivicTrack is a web-based public infrastructure monitoring platform designed to improve transparency and coordination between public works departments. It helps users track infrastructure projects, report on-site issues, monitor project progress, and identify scheduling conflicts between nearby roadworks.

## Features

- **Project Monitoring:** Track infrastructure projects, budgets, contractors, deadlines, and completion status.
- **Interactive Map:** Visualize project locations and road segments on an interactive map.
- **Conflict Detection:** Identify potential scheduling conflicts between projects based on road geometry and timelines.
- **Citizen Issue Reporting:** Submit reports with descriptions, categories, photos, and location information.
- **Report Clustering:** Group nearby open reports to identify recurring infrastructure issues.
- **Department Coordination:** Update project deadlines, record changes, and manage project completion.
- **Weather Insights:** Retrieve weather forecasts for project locations to assess potential weather-related risks.
- **Analytics Dashboard:** Monitor department performance, overdue projects, deadline changes, and unresolved reports.
- **CSV Import:** Import project information from CSV files.

## Tech Stack

| Component | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI and Maps | CSS, Leaflet, React Leaflet, Lucide React |
| Backend | Python, FastAPI |
| Database | SQLAlchemy, SQLite, PostgreSQL support |
| Validation | Pydantic |
| Geospatial Processing | Shapely |
| Image Processing | Pillow |
| Testing | pytest |
| Containerization | Docker |

## Architecture

```text
React + TypeScript Frontend
          |
          | REST API
          v
     FastAPI Backend
          |
          +-- Project Management
          +-- Conflict Detection
          +-- Citizen Reports
          +-- Analytics
          +-- Weather Insights
          +-- CSV Import
          |
          v
 SQLAlchemy Database Layer
          |
          v
    SQLite / PostgreSQL
```

## Getting Started

### Prerequisites

- Python 3.10 or later
- Node.js and npm
- Git (optional)

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd CivicTrack
```

Replace `<your-repository-url>` with your GitHub repository URL.

### 2. Configure Environment Variables

Create a `.env` file in the project root using `.env.example` as a reference.

Example configuration:

```env
DATABASE_URL=sqlite:///./civictrack.db
SECRET_KEY=replace-with-a-secure-random-secret
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
SEED_DEMO=true
ADMIN_RESET_KEY=
DEMO_LOGIN=true
SERVICE_BBOX=12.70,79.90,13.45,80.50
```

Ensure the backend loads these environment variables before starting. Use secure secrets and disable demo-only settings in production.

### 3. Run the Backend

Open a terminal in the project root.

**Windows PowerShell:**

```powershell
cd backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn app.main:app --reload
```

**macOS/Linux:**

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend URLs:

- API: http://127.0.0.1:8000
- Swagger API documentation: http://127.0.0.1:8000/docs

### 4. Run the Frontend

Open a second terminal from the project root.

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually:

http://localhost:5173

### 5. Build the Frontend

```bash
cd frontend
npm run build
```

The production build is generated in `frontend/dist`.

## Running with Docker

Build the image from the project root:

```bash
docker build -t civictrack .
```

Run the container:

```bash
docker run --rm -p 8000:8000 civictrack
```

Open http://localhost:8000.

Configure persistent database storage and production environment variables before deploying.

## Testing

Run the backend tests:

```bash
cd backend
python -m pytest
```

Run a specific test file:

```bash
python -m pytest tests/test_conflicts.py
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List and filter projects |
| GET | `/api/projects/{code}` | Retrieve project details |
| GET | `/api/projects/{code}/updates` | View project update history |
| POST | `/api/projects` | Create a project |
| POST | `/api/projects/{code}/deadline` | Update a project deadline |
| POST | `/api/projects/{code}/complete` | Mark a project as completed |
| GET | `/api/roads` | Retrieve road data |
| GET | `/api/conflicts` | List potential scheduling conflicts |
| POST | `/api/conflicts/check` | Check a project for conflicts |
| POST | `/api/reports` | Submit a citizen report |
| GET | `/api/reports` | Retrieve reports |
| GET | `/api/reports/clusters` | Group nearby open reports |
| POST | `/api/reports/{report_id}/resolve` | Resolve a report |
| GET | `/api/analytics/departments` | Retrieve department analytics |
| GET | `/api/projects/{code}/weather` | Retrieve weather information |

For complete request and response details, visit `/docs` while the backend is running.

## Project Structure

```text
CivicTrack/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── auth.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── seed.py
│   ├── data/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── geo.ts
│   │   └── styles.css
│   ├── package.json
│   └── index.html
├── .env.example
├── .gitignore
├── Dockerfile
└── README.md
```

## Security and Data Notes

- Demo data should not be treated as verified official government information.
- Never commit passwords, API keys, or production secrets.
- Exclude virtual environments, `node_modules`, local databases, and generated files from Git.
- Use secure authentication and persistent database storage for production deployments.
- Validate uploaded files and restrict access to administrative operations.

## Future Improvements

- Integration with verified government infrastructure datasets.
- Improved notifications for citizens and departments.
- Advanced traffic-disruption and project coordination analysis.
- Enhanced historical analytics and reporting.
- Automated deployment and expanded integration testing.


---

**CivicTrack — Making public infrastructure progress more transparent, accountable, and coordinated.**
```
