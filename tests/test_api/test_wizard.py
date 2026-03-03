import pytest
from api.deps import get_current_user

async def mock_get_current_user():
    return {"user_id": "test_admin", "role": "admin"}

@pytest.fixture
def auth_client(client):
    client.app.dependency_overrides[get_current_user] = mock_get_current_user
    yield client
    client.app.dependency_overrides = {}

def test_wizard_status(client):
    # Public endpoint
    response = client.get("/api/wizard/status")
    assert response.status_code == 200
    assert "completed" in response.json()

def test_update_wizard_step(auth_client):
    payload = {
        "step": 0,
        "data": {"discordToken": "test_token_1234567890"}
    }
    response = auth_client.put("/api/wizard/step", json=payload)
    assert response.status_code == 200
    
    # Verify status updated
    status = auth_client.get("/api/wizard/status").json()
    assert status["data"]["0"]["discordToken"] == "test_token_1234567890"

def test_complete_wizard(auth_client):
    payload = {
        "config": {
            "DISCORD_TOKEN": "final_token",
            "AI_PROVIDER": "gemini"
        }
    }
    response = auth_client.post("/api/complete", json=payload) # The prefix is /api in main.py but wizard router has no prefix in include_router? 
    # Actually app.include_router(wizard.router, prefix="/api/wizard", tags=["wizard"])
    # Wait, let me check api/main.py
    
    # Checked: app.include_router(wizard.router, prefix="/api/wizard", tags=["wizard"])
    # But wizard.py has @router.post("/complete")
    # So it should be /api/wizard/complete
    
    response = auth_client.post("/api/wizard/complete", json=payload)
    assert response.status_code == 200
    
    # Check if wizard is marked as completed
    status = auth_client.get("/api/wizard/status").json()
    assert status["completed"] is True
