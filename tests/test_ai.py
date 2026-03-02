import pytest

import db
import config
import providers
import utils.ai as ai


@pytest.mark.asyncio
async def test_ask_ai_routing(monkeypatch):
    # prepare environment: free providers available
    monkeypatch.setattr(providers, "_clients", {"gemini": True, "groq": True})
    config.FREE_FALLBACK_CHAIN = ["gemini", "groq", "openrouter"]

    # stub out database helpers
    async def fake_get_history(channel_id):
        return []
    monkeypatch.setattr(ai, "get_history", fake_get_history)

    async def fake_get_channel_provider(cid):
        return None
    monkeypatch.setattr(db, "get_channel_provider", fake_get_channel_provider)

    # capture override provider argument
    called = {}
    def fake_chat(history, sys_prompt, override_provider=None):
        called['override'] = override_provider
        return "resp", "prov", 0, 0, 0, 0
    monkeypatch.setattr(providers, "chat", fake_chat)

    # simple message should route to the first free provider (gemini)
    resp, prov = await ai.ask_ai(123, "user", "hi")
    assert called.get('override') == "gemini"

    # longer/complex message should not trigger auto-routing
    called.clear()
    resp, prov = await ai.ask_ai(123, "user", "please explain python iterators in detail")
    assert called.get('override') is None
