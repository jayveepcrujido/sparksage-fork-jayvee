from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.deps import get_current_user
import db
from plugins import loader as plugin_loader

router = APIRouter()

class PluginToggle(BaseModel):
    name: str
    enabled: bool

@router.get("")
async def list_plugins(user: dict = Depends(get_current_user)):
    if not plugin_loader.loader:
        return {"plugins": []}
        
    available = await plugin_loader.loader.scan_plugins()
    enabled_states = await db.get_plugin_states()
    
    for p in available:
        p["enabled"] = enabled_states.get(p["id"], False)
        
    return {"plugins": available}

@router.post("/toggle")
async def toggle_plugin(body: PluginToggle, user: dict = Depends(get_current_user)):
    if not plugin_loader.loader:
        raise HTTPException(status_code=500, detail="Plugin system not initialized")
        
    await db.set_plugin_enabled(body.name, body.enabled)
    
    if body.enabled:
        success = await plugin_loader.loader.load_plugin(body.name)
        if not success:
            # We still return 200 but with an error flag so the UI can show a warning
            # instead of a generic 500 error
            return {"status": "error", "message": f"Plugin {body.name} was enabled but failed to load. Check bot logs.", "enabled": True}
    else:
        await plugin_loader.loader.unload_plugin(body.name)
        
    return {"status": "ok", "enabled": body.enabled}

@router.post("/reload/{name}")
async def reload_plugin(name: str, user: dict = Depends(get_current_user)):
    if not plugin_loader.loader:
        raise HTTPException(status_code=500, detail="Plugin system not initialized")
        
    success = await plugin_loader.loader.reload_plugin(name)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to reload plugin {name}")
        
    return {"status": "ok"}
