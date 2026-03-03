from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from api.deps import get_current_user
import db

router = APIRouter()

class GuildConfigUpdate(BaseModel):
    values: dict[str, str]

@router.get("/{guild_id}/config")
async def get_guild_config(guild_id: str, user: dict = Depends(get_current_user)):
    config = await db.get_all_guild_config(guild_id)
    return {"config": config}

@router.put("/{guild_id}/config")
async def update_guild_config(guild_id: str, body: GuildConfigUpdate, user: dict = Depends(get_current_user)):
    await db.set_guild_config_bulk(guild_id, body.values)
    return {"status": "ok"}
