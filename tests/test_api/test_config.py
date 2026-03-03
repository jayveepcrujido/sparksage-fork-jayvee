import pytest
from api.main import create_app
from api.deps import get_current_user

# Mock authentication
async def mock_get_current_user():
    return {"user_id": "test_admin", "role": "admin"}

@pytest.fixture
def auth_client(client):
    client.app.dependency_overrides[get_current_user] = mock_get_current_user
    yield client
    client.app.dependency_overrides = {}

def test_get_config(auth_client):
    response = auth_client.get("/api/config")
    assert response.status_code == 200
    assert "config" in response.json()
    # Check masking
    assert response.json()["config"]["JWT_SECRET"].startswith("***")

def test_update_config(auth_client):
    payload = {"values": {"BOT_PREFIX": "!!!"}}
    response = auth_client.put("/api/config", json=payload)
    assert response.status_code == 200
    
    # Verify change
    get_resp = auth_client.get("/api/config")
    assert get_resp.json()["config"]["BOT_PREFIX"] == "!!!"
