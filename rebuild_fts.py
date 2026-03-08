import asyncio
import db

async def rebuild_fts():
    print("Initializing DB...")
    await db.init_db()
    conn = await db.get_db()
    
    print("Dropping old FTS table...")
    try:
        await conn.execute("DROP TABLE IF EXISTS conversations_fts")
    except Exception as e:
        print(f"Error dropping FTS: {e}")

    print("Recreating FTS table...")
    # Using default tokenizer for max compatibility, but ensuring all data is synced
    await conn.execute("""
        CREATE VIRTUAL TABLE conversations_fts USING fts5(
            content, 
            channel_id, 
            guild_id, 
            content='conversations', 
            content_rowid='id'
        )
    """)
    
    print("Syncing data from conversations to FTS...")
    await conn.execute("""
        INSERT INTO conversations_fts(rowid, content, channel_id, guild_id)
        SELECT id, content, channel_id, guild_id FROM conversations
    """)
    
    await conn.commit()
    print("FTS rebuild complete. All existing conversations are now indexed.")

if __name__ == "__main__":
    asyncio.run(rebuild_fts())
