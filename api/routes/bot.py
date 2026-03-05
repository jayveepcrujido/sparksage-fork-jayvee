from fastapi import APIRouter, Depends, HTTPException
from api.deps import get_current_user
import db
import httpx # Import httpx
import config # Import config for BOT_SERVICE_URL

router = APIRouter()

BOT_SERVICE_URL = config.BOT_SERVICE_URL # Get bot service URL from config

@router.get("/status")
async def bot_status(user: dict = Depends(get_current_user)):
    if not BOT_SERVICE_URL:
        raise HTTPException(status_code=500, detail="Bot service URL is not configured.")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BOT_SERVICE_URL}/bot/status")
            response.raise_for_status() # Raise an exception for bad status codes
            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Could not connect to bot service: {e}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Bot service returned an error: {e.response.text}")


@router.get("/stats")
async def bot_stats(user: dict = Depends(get_current_user)):
    return await db.get_usage_stats()


@router.get("/channels")
async def bot_channels(user: dict = Depends(get_current_user)):
    # This currently relies on the bot object directly.
    # If get_all_channels also needs to come from the bot service, 
    # it would need a similar HTTP call.
    from bot import get_all_channels
    channels = get_all_channels()
    return {"channels": channels}
