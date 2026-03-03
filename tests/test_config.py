import pytest
import config
import db

@pytest.mark.asyncio
async def test_reload_from_db():
    # Setup some dummy DB config
    test_config = {
        "BOT_PREFIX": "?",
        "AI_PROVIDER": "groq",
        "MAX_TOKENS": "512",
        "WELCOME_ENABLED": "true"
    }
    
    # Run the reload
    config.reload_from_db(test_config)
    
    # Assert values were updated correctly
    assert config.BOT_PREFIX == "?"
    assert config.AI_PROVIDER == "groq"
    assert config.MAX_TOKENS == 512
    assert config.WELCOME_ENABLED is True

@pytest.mark.asyncio
async def test_sync_env_to_db():
    # Set a unique prefix in config
    original_prefix = config.BOT_PREFIX
    config.BOT_PREFIX = "test!"
    
    # Sync to DB
    await db.sync_env_to_db()
    
    # Verify it exists in DB
    val = await db.get_config("BOT_PREFIX")
    assert val == "test!"
    
    # Restore
    config.BOT_PREFIX = original_prefix
