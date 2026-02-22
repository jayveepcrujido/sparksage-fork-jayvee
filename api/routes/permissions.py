from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
import asyncio
from pydantic import BaseModel
from api.deps import get_current_user
from bot import bot, get_all_command_names
import db

router = APIRouter()

class PermissionCreate(BaseModel):
    command_name: str
    guild_id: str
    role_id: str

@router.get("")
async def list_permissions(guild_id: str | None = None, user: dict = Depends(get_current_user)):
    perms = await db.list_command_permissions(guild_id)
    return {"permissions": perms}

@router.post("")
async def create_permission(body: PermissionCreate, user: dict = Depends(get_current_user)):
    await db.set_command_permission(body.command_name, body.guild_id, body.role_id)
    return {"status": "ok"}

@router.delete("/{command_name}/{guild_id}/{role_id}")
async def delete_permission(command_name: str, guild_id: str, role_id: str, user: dict = Depends(get_current_user)):
    await db.remove_command_permission(command_name, guild_id, role_id)
    return {"status": "ok"}

@router.get("/roles/{guild_id}")
async def list_roles(guild_id: str, user: dict = Depends(get_current_user)):
    from bot import get_guild_roles, bot
    import asyncio
    
    # Try cache first
    roles = get_guild_roles(guild_id)
    
    # If cache failed and bot is ready, try an async fetch safely
    if not roles and bot.is_ready():
        print(f"[DEBUG] API: Cache failed for guild {guild_id}, attempting async fetch...")
        try:
            # We must use run_coroutine_threadsafe because the bot is in a different event loop
            future = asyncio.run_coroutine_threadsafe(bot.fetch_guild(int(guild_id)), bot.loop)
            # Wait for it in this loop
            guild = await asyncio.wrap_future(future)
            
            if guild:
                # Same for fetch_roles
                future_roles = asyncio.run_coroutine_threadsafe(guild.fetch_roles(), bot.loop)
                guild_roles = await asyncio.wrap_future(future_roles)
                
                roles = [
                    {
                        "id": str(r.id),
                        "name": r.name,
                        "color": f"#{r.color.value:06x}" if r.color.value else "#99aab5"
                    }
                    for r in guild_roles
                    if not r.managed and not r.is_default()
                ]
                print(f"[DEBUG] API: Async fetch succeeded, found {len(roles)} roles")
        except Exception as e:
            print(f"Async fetch for guild {guild_id} failed: {e}")
            
    return {"roles": roles}


@router.get("/commands")
async def list_commands():
    """Return a list of all registered slash command names."""
    if not bot.is_ready():
        raise HTTPException(status_code=503, detail="Bot is not ready yet.")
    
    try:
        commands = await get_all_command_names()
        return {"commands": commands}
    except Exception as e:
        print(f"Failed to fetch commands from bot: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch commands from bot.")
