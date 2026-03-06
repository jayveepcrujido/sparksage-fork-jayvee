from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated, Optional
import db as database
from api.deps import get_current_user
from pydantic import BaseModel # Import BaseModel

# Define Pydantic schemas for request/response bodies
class AutoTranslateSettingBase(BaseModel):
    channel_id: str
    guild_id: str
    enabled: bool
    target_language: Optional[str] = None # Optional as it might be null if disabled

class AutoTranslateSettingCreate(AutoTranslateSettingBase):
    pass # No additional fields for creation

class AutoTranslateSetting(AutoTranslateSettingBase):
    class Config:
        from_attributes = True

router = APIRouter()

@router.get("/{channel_id}", response_model=AutoTranslateSetting)
async def get_autotranslate_setting(
    channel_id: str,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    setting_data = await database.get_channel_autotranslate_setting(channel_id)
    
    if setting_data:
        guild_id, enabled, target_language = setting_data
        return AutoTranslateSetting(
            channel_id=channel_id,
            guild_id=guild_id,
            enabled=enabled,
            target_language=target_language
        )
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auto-translate setting not found")


@router.post("", response_model=AutoTranslateSetting)
async def set_autotranslate_setting(
    setting_data: AutoTranslateSettingCreate,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    await database.set_channel_autotranslate_setting(
        setting_data.channel_id,
        setting_data.guild_id,
        setting_data.enabled,
        setting_data.target_language
    )
    return AutoTranslateSetting(
        channel_id=setting_data.channel_id,
        guild_id=setting_data.guild_id,
        enabled=setting_data.enabled,
        target_language=setting_data.target_language
    )

@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_autotranslate_setting(
    channel_id: str,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    await database.delete_channel_autotranslate_setting(channel_id)
    return {} # Return an empty dict for 204 No Content

