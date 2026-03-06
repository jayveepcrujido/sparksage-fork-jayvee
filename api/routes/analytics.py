from __future__ import annotations

from fastapi import APIRouter, Depends
from api.deps import get_current_user
import db

router = APIRouter()

@router.get("/summary")
async def get_analytics_summary(days: int = 7, guild_id: str | None = None, user: dict = Depends(get_current_user)):
    summary = await db.get_analytics_summary(days, guild_id)
    return summary

@router.get("/history")
async def get_analytics_history(limit: int = 100, user: dict = Depends(get_current_user)):
    db_conn = await db.get_db()
    cursor = await db_conn.execute(
        "SELECT * FROM analytics ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = await cursor.fetchall()
    return {"history": [dict(r) for r in rows]}
