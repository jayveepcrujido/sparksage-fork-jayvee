from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from api.deps import get_current_user
import config
import providers
import db

router = APIRouter()


class SetPrimaryRequest(BaseModel):
    provider: str


@router.get("")
async def list_providers(user: dict = Depends(get_current_user)):
    result = []
    for name, info in config.PROVIDERS.items():
        result.append({
            "name": name,
            "display_name": info["name"],
            "model": info["model"],
            "free": info["free"],
            "configured": providers.is_provider_configured(name),
            "enabled": info.get("enabled", True),
            "is_primary": name == config.AI_PROVIDER,
        })
    return {"providers": result, "fallback_order": providers.FALLBACK_ORDER}


class TestProviderRequest(BaseModel):
    provider: str


@router.post("/test")
async def test_provider(body: TestProviderRequest, user: dict = Depends(get_current_user)):
    result = providers.test_provider(body.provider)
    return result


class ToggleProviderRequest(BaseModel):
    provider: str
    enabled: bool


@router.put("/toggle")
async def toggle_provider(body: ToggleProviderRequest, user: dict = Depends(get_current_user)):
    if body.provider not in config.PROVIDERS:
        return {"error": f"Unknown provider: {body.provider}"}

    disabled = [d.strip().lower() for d in config.DISABLED_PROVIDERS.split(",") if d.strip()]
    
    if body.enabled:
        if body.provider in disabled:
            disabled.remove(body.provider)
    else:
        if body.provider not in disabled:
            disabled.append(body.provider)
            
    new_disabled = ",".join(disabled)
    await db.set_config("DISABLED_PROVIDERS", new_disabled)
    config.DISABLED_PROVIDERS = new_disabled
    
    # Refresh providers
    config.PROVIDERS = config._build_providers()
    providers.reload_clients()
    
    return {"status": "ok", "enabled": body.enabled}


@router.put("/primary")
async def set_primary(body: SetPrimaryRequest, user: dict = Depends(get_current_user)):
    if body.provider not in config.PROVIDERS:
        return {"error": f"Unknown provider: {body.provider}"}

    await db.set_config("AI_PROVIDER", body.provider)
    config.AI_PROVIDER = body.provider
    config.PROVIDERS = config._build_providers()
    providers.reload_clients()

    return {"status": "ok", "primary": body.provider}
