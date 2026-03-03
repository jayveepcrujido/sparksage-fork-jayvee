import pytest
from api.deps import get_current_user

async def mock_get_current_user():
    return {"user_id": "test_admin", "role": "admin"}

@pytest.fixture
def auth_client(client):
    client.app.dependency_overrides[get_current_user] = mock_get_current_user
    yield client
    client.app.dependency_overrides = {}

def test_list_providers(auth_client):
    response = auth_client.get("/api/providers")
    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    assert len(data["providers"]) > 0
    assert "name" in data["providers"][0]

def test_set_primary_provider(auth_client):
    payload = {"provider": "groq"}
    response = auth_client.put("/api/providers/primary", json=payload)
    assert response.status_code == 200
    assert response.json()["primary"] == "groq"

def test_toggle_provider(auth_client):
    # Disable gemini
    payload = {"provider": "gemini", "enabled": False}
    response = auth_client.put("/api/providers/toggle", json=payload)
    assert response.status_code == 200
    assert response.json()["enabled"] is False
    
    # Verify in list
    list_resp = auth_client.get("/api/providers")
    gemini = next(p for p in list_resp.json()["providers"] if p["name"] == "gemini")
    assert gemini["enabled"] is False
