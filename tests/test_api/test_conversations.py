import pytest
import db


@pytest.mark.asyncio
async def test_search_endpoint(client):
    # authenticate admin
    client.post("/api/auth/login", json={"password": ""})  # will fall back to DB which is empty
    # but login requires ADMIN_PASSWORD set, so we set via env
    import os
    os.environ["ADMIN_PASSWORD"] = "pw"
    login = client.post("/api/auth/login", json={"password": "pw"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # seed some messages
    await db.add_message("chanA", "user", "kubernetes cluster example", guild_id="g1")
    await db.add_message("chanA", "assistant", "explanation of kubernetes", guild_id="g1")
    await db.add_message("chanB", "user", "something else", guild_id="g2")

    resp = client.get("/api/conversations/search", params={"q": "kubernetes"}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data
    assert any("kubernetes" in m["content"] for m in data["results"])

    # filter by guild_id
    resp2 = client.get("/api/conversations/search", params={"q": "kubernetes", "guild_id": "g2"}, headers=headers)
    assert resp2.status_code == 200
    assert resp2.json()["results"] == []


@pytest.mark.asyncio
async def test_export_and_tag(client, mock_provider):
    import os
    os.environ["ADMIN_PASSWORD"] = "pw"
    login = client.post("/api/auth/login", json={"password": "pw"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    await db.add_message("chanX", "user", "first message", guild_id="g3")
    await db.add_message("chanX", "assistant", "second message", guild_id="g3")

    # JSON export
    resp = client.get("/api/conversations/export/chanX", params={"format": "json"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["channel_id"] == "chanX"
    assert len(resp.json()["messages"]) == 2

    # PDF export (fpdf may not be installed so skip if error)
    resp_pdf = client.get("/api/conversations/export/chanX", params={"format": "pdf"}, headers=headers)
    if resp_pdf.status_code == 400:
        # package missing
        assert "requires fpdf" in resp_pdf.json()["detail"]
    else:
        assert resp_pdf.status_code == 200
        assert resp_pdf.headers["content-type"] == "application/pdf"

    # tagging uses mock_provider which returns static response
    # monkeypatch ensures providers.chat returns "Mock AI response"
    resp_tag = client.post("/api/conversations/tag/chanX", headers=headers)
    assert resp_tag.status_code == 200
    data = resp_tag.json()
    assert data["channel_id"] == "chanX"
    assert "topic" in data
