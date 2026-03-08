from fastapi import APIRouter, Depends, HTTPException
from api.deps import get_current_user
import db
import providers
import config

router = APIRouter()


@router.get("")
async def list_conversations(guild_id: str | None = None, user: dict = Depends(get_current_user)):
    # fetch stored channel stats
    channels = await db.list_channels(guild_id)

    # map ids → names using bot helper (used elsewhere for Channel Tuning)
    from bot import get_all_channels
    all_channels = get_all_channels()
    if guild_id:
        name_map = {c["id"]: c.get("name") for c in all_channels if c["guild_id"] == guild_id}
    else:
        name_map = {c["id"]: c.get("name") for c in all_channels}

    for ch in channels:
        ch["channel_name"] = name_map.get(ch.get("channel_id"))

    return {"channels": channels}


@router.get("/search")
async def search_conversations(q: str, guild_id: str | None = None, limit: int = 100, user: dict = Depends(get_current_user)):
    """Search stored messages using a full-text index."""
    results = await db.search_messages(q, guild_id, limit)
    return {"query": q, "results": results}


@router.get("/export/{channel_id}")
async def export_conversation(channel_id: str, format: str = "json", user: dict = Depends(get_current_user)):
    """Export conversation messages in JSON or PDF format."""
    messages = await db.get_messages(channel_id, limit=1000)
    if format == "json":
        return {"channel_id": channel_id, "messages": messages}

    # generate a simple PDF if requested
    if format == "pdf":
        from io import BytesIO
        try:
            from fpdf import FPDF
        except ImportError:
            raise HTTPException(status_code=400, detail="PDF export requires fpdf package")

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        title = f"Conversation {channel_id}".encode("latin-1", "replace").decode("latin-1")
        pdf.cell(0, 10, title, ln=True)
        pdf.ln(5)
        for m in messages:
            content = f"[{m['role']}] {m['content']}"
            # fpdf v1.7.2 only supports latin-1. Replace unencodable characters.
            line = content.encode("latin-1", "replace").decode("latin-1")
            pdf.multi_cell(0, 8, line)
        buf = BytesIO()
        pdf.output(buf)
        buf.seek(0)
        from fastapi.responses import StreamingResponse
        return StreamingResponse(buf, media_type="application/pdf")

    raise HTTPException(status_code=400, detail="Unsupported format")


@router.post("/tag/{channel_id}")
async def tag_conversation(channel_id: str, user: dict = Depends(get_current_user)):
    """Ask the AI to suggest a topic for a channel and store it."""
    # gather recent conversation text
    messages = await db.get_messages(channel_id, limit=100)
    text = "\n".join(m["content"] for m in messages)
    prompt = (
        "Given the following Discord conversation, provide a brief topic or "
        "category in one or two words.\n\n" + text
    )
    # reuse providers.chat directly
    response, provider_name, *_ = providers.chat([
        {"role": "user", "content": prompt}
    ], config.SYSTEM_PROMPT)
    topic = response.strip().split("\n")[0]
    await db.set_channel_topic(channel_id, topic)
    return {"channel_id": channel_id, "topic": topic, "provider": provider_name}


@router.get("/{channel_id}")
async def get_conversation(channel_id: str, user: dict = Depends(get_current_user)):
    messages = await db.get_messages(channel_id, limit=100)

    # also attempt to resolve channel name using the same helper
    from bot import get_all_channels
    channel_name = None
    for c in get_all_channels():
        if c.get("id") == channel_id:
            channel_name = c.get("name")
            break

    return {"channel_id": channel_id, "channel_name": channel_name, "messages": messages}


@router.delete("/{channel_id}")
async def delete_conversation(channel_id: str, user: dict = Depends(get_current_user)):
    await db.clear_messages(channel_id)
    return {"status": "ok"}
