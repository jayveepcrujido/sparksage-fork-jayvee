import asyncio
from db import search_messages

async def test():
    results = await search_messages('you', guild_id=None)
    print(f'Search results for "you": {len(results)} matches')
    for r in results[:2]:
        print(f'  - {r["content"][:60]}')
    
    # Test another search
    results2 = await search_messages('conservative', guild_id=None)
    print(f'\nSearch results for "conservative": {len(results2)} matches')

asyncio.run(test())
