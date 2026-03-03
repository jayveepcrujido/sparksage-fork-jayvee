from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.deps import get_current_user
import db

router = APIRouter()

class FAQCreate(BaseModel):
    guild_id: str
    question: str
    answer: str
    match_keywords: str

@router.get("")
async def list_faqs(guild_id: str | None = None, user: dict = Depends(get_current_user)):
    faqs = await db.list_faqs(guild_id)
    return {"faqs": faqs}

@router.post("")
async def create_faq(data: FAQCreate, user: dict = Depends(get_current_user)):
    await db.add_faq(
        data.guild_id,
        data.question,
        data.answer,
        data.match_keywords,
        created_by=user.get("username", "admin")
    )
    return {"status": "ok"}

@router.delete("/{faq_id}")
async def delete_faq(faq_id: int, user: dict = Depends(get_current_user)):
    await db.delete_faq(faq_id)
    return {"status": "ok"}
