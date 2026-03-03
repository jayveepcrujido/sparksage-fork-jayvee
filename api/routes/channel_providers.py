from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from api.deps import get_current_user
import db

router = APIRouter()

class ChannelProviderUpdate(BaseModel):
    channel_id: str
    guild_id: str
    provider: str

@router.get("")
async def list_providers(guild_id: str | None = None, user: dict = Depends(get_current_user)):
    providers = await db.list_channel_providers(guild_id)
    return {"channel_providers": providers}

@router.post("")
async def set_provider(body: ChannelProviderUpdate, user: dict = Depends(get_current_user)):
    await db.set_channel_provider(body.channel_id, body.guild_id, body.provider)
    return {"status": "ok"}

@router.delete("/{channel_id}")
async def delete_provider(channel_id: str, user: dict = Depends(get_current_user)):
    await db.delete_channel_provider(channel_id)
    return {"status": "ok"}
