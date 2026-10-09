import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./civictrack.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
ADMIN_RESET_KEY = os.getenv("ADMIN_RESET_KEY", "")
DEMO_LOGIN = os.getenv("DEMO_LOGIN", "true").lower() == "true"
