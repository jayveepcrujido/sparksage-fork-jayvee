import os
import pytest
import asyncio
import aiosqlite
from fastapi.testclient import TestClient
from api.main import create_app
import db
import config

# Use a test database
TEST_DB_PATH = "test_sparksage.db"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(autouse=True)
async def setup_test_db():
    """Initialize a fresh test database for each test."""
    # Override database path
    db.DATABASE_PATH = TEST_DB_PATH
    
    # Clean up old test DB if it exists
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    
    # Init DB tables
    await db.init_db()
    
    yield
    
    # Close and cleanup
    await db.close_db()
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except PermissionError:
            pass # Sometimes file is still locked by aiosqlite

@pytest.fixture
def client():
    """Return a FastAPI test client."""
    app = create_app()
    with TestClient(app) as c:
        yield c

@pytest.fixture
def mock_provider(monkeypatch):
    """Mock the AI provider chat call."""
    import providers
    
    def mock_chat(messages, system_prompt, override_provider=None):
        return "Mock AI response", "gemini", 100, 50, 40, 60
        
    monkeypatch.setattr(providers, "chat", mock_chat)
    return mock_chat
