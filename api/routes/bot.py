from fastapi import APIRouter, Depends
from api.deps import get_current_user
import db

router = APIRouter()


@router.get("/status")
async def bot_status(user: dict = Depends(get_current_user)):
    from bot import get_bot_status
    status = await get_bot_status()
    return status


@router.get("/stats")
async def bot_stats(user: dict = Depends(get_current_user)):
    return await db.get_usage_stats()


@router.get("/channels")
async def bot_channels(user: dict = Depends(get_current_user)):
    from bot import get_all_channels
    channels = get_all_channels()
    return {"channels": channels}
