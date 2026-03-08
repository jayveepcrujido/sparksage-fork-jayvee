from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.deps import get_current_user
import db

router = APIRouter()

class AutoResponseCreate(BaseModel):
    guild_id: str
    keyword: str
    response: str
    match_type: str = "contains"
    is_case_sensitive: bool = False

class AutoResponseUpdate(BaseModel):
    keyword: str
    response: str
    match_type: str
    is_case_sensitive: bool

@router.get("")
async def list_responses(guild_id: str | None = None, user: dict = Depends(get_current_user)):
    responses = await db.list_auto_responses(guild_id)
    return {"auto_responses": responses}

@router.post("")
async def create_response(data: AutoResponseCreate, user: dict = Depends(get_current_user)):
    await db.add_auto_response(
        data.guild_id, 
        data.keyword, 
        data.response, 
        data.match_type, 
        data.is_case_sensitive
    )
    return {"status": "ok"}

@router.put("/{response_id}")
async def update_response(response_id: int, data: AutoResponseUpdate, user: dict = Depends(get_current_user)):
    await db.update_auto_response(
        response_id, 
        data.keyword, 
        data.response, 
        data.match_type, 
        data.is_case_sensitive
    )
    return {"status": "ok"}

@router.delete("/{response_id}")
async def delete_response(response_id: int, guild_id: str | None = None, user: dict = Depends(get_current_user)):
    await db.delete_auto_response(response_id, guild_id)
    return {"status": "ok"}
