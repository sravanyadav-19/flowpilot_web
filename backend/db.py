# ==========================================================================
# FILE: backend/db.py  (Day 2 — database foundation)
# Engine + session factory. Reads DATABASE_URL; falls back to a local
# SQLite file (backend/dev.db) when it is not set, so you can run the app
# with zero database setup.
# ==========================================================================
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

try:
    from backend.models import Base  # noqa: F401  (registers models on Base.metadata)
except ModuleNotFoundError:  # running from inside backend/
    from models import Base  # noqa: F401  # type: ignore

BACKEND_DIR = Path(__file__).resolve().parent

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def _normalize_url(url: str) -> str:
    """Make any Postgres URL use the psycopg (v3) driver, whatever the user pastes."""
    if url.startswith("postgres://"):
        url = "postgresql" + url[len("postgres"):]
    if url.startswith("postgresql://") and "+" not in url.split("://", 1)[0]:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


if DATABASE_URL:
    engine = create_engine(_normalize_url(DATABASE_URL), pool_pre_ping=True)
    print("[OK] Database engine created from DATABASE_URL (PostgreSQL)")
else:
    sqlite_path = BACKEND_DIR / "dev.db"
    engine = create_engine(
        f"sqlite:///{sqlite_path}",
        connect_args={"check_same_thread": False},
    )
    print(f"[WARN] DATABASE_URL not set — using SQLite fallback: {sqlite_path}")
    print("[WARN] Data will NOT survive Render restarts. Set DATABASE_URL for PostgreSQL.")

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    """FastAPI dependency: yields a session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables if they don't exist. Called on app startup."""
    Base.metadata.create_all(bind=engine)