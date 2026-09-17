"""Small local history of generations submitted by this application."""

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "data" / "jobs.sqlite3"


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            prompt TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    columns = {row[1] for row in connection.execute("PRAGMA table_info(jobs)")}
    if "video_format" not in columns:
        connection.execute("ALTER TABLE jobs ADD COLUMN video_format TEXT")
    if "duration_seconds" not in columns:
        connection.execute("ALTER TABLE jobs ADD COLUMN duration_seconds INTEGER")
    if "quality" not in columns:
        connection.execute("ALTER TABLE jobs ADD COLUMN quality TEXT")
    return connection


def record_job(job_id: str, prompt: str, video_format: str, duration_seconds: int, quality: str) -> None:
    with _connect() as connection:
        connection.execute(
            "INSERT OR IGNORE INTO jobs (id, prompt, created_at, video_format, duration_seconds, quality) VALUES (?, ?, ?, ?, ?, ?)",
            (job_id, prompt, datetime.now(timezone.utc).isoformat(), video_format, duration_seconds, quality),
        )


def list_jobs(limit: int = 50) -> list[dict]:
    with _connect() as connection:
        rows = connection.execute(
            "SELECT id, prompt, created_at, video_format, duration_seconds, quality FROM jobs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]

