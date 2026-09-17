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
    return connection


def record_job(job_id: str, prompt: str) -> None:
    with _connect() as connection:
        connection.execute(
            "INSERT OR IGNORE INTO jobs (id, prompt, created_at) VALUES (?, ?, ?)",
            (job_id, prompt, datetime.now(timezone.utc).isoformat()),
        )


def list_jobs(limit: int = 50) -> list[dict[str, str]]:
    with _connect() as connection:
        rows = connection.execute(
            "SELECT id, prompt, created_at FROM jobs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]

