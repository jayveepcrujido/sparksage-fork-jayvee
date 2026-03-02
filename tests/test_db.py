import pytest
import db

@pytest.mark.asyncio
async def test_add_get_messages():
    channel_id = "test_channel"
    await db.add_message(channel_id, "user", "Hello bot")
    await db.add_message(channel_id, "assistant", "Hello human", provider="gemini")
    
    history = await db.get_messages(channel_id)
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"
    assert history[1]["provider"] == "gemini"

@pytest.mark.asyncio
async def test_clear_messages():
    channel_id = "clear_me"
    await db.add_message(channel_id, "user", "Delete this")
    await db.clear_messages(channel_id)
    
    history = await db.get_messages(channel_id)
    assert len(history) == 0

@pytest.mark.asyncio
async def test_faq_operations():
    guild_id = "guild_1"
    await db.add_faq(guild_id, "Is it free?", "Yes", "free,cost")
    
    faqs = await db.list_faqs(guild_id)
    assert len(faqs) == 1
    assert faqs[0]["question"] == "Is it free?"
    
    await db.delete_faq(faqs[0]["id"], guild_id)
    faqs_after = await db.list_faqs(guild_id)
    assert len(faqs_after) == 0

@pytest.mark.asyncio
async def test_analytics_logging():
    await db.log_analytics(
        event_type="command",
        guild_id="g1",
        provider="groq",
        tokens_used=150,
        estimated_cost=0.001
    )
    
    summary = await db.get_analytics_summary(days=1)
    assert summary["total_cost"] == 0.001
    assert any(p["name"] == "groq" for p in summary["provider_distribution"])


@pytest.mark.asyncio
async def test_search_and_topic():
    # add some messages across two channels and guilds
    await db.add_message("chan1", "user", "hello world", guild_id="g1")
    await db.add_message("chan1", "assistant", "world domination plans", guild_id="g1")
    await db.add_message("chan2", "user", "kubernetes cluster setup", guild_id="g2")
    await db.add_message("chan2", "assistant", "follow best practices", guild_id="g2")

    results = await db.search_messages("world")
    assert any(m["content"].startswith("hello world") for m in results)

    results_g1 = await db.search_messages("world", guild_id="g1")
    assert all(m["channel_id"] == "chan1" for m in results_g1)

    # topic tag operations
    assert await db.get_channel_topic("chan1") is None
    await db.set_channel_topic("chan1", "greeting")
    assert await db.get_channel_topic("chan1") == "greeting"
