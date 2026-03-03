import os
from dotenv import load_dotenv

load_dotenv()

discord_token = os.getenv("DISCORD_TOKEN")

if discord_token:
    print(f"DISCORD_TOKEN successfully loaded. Length: {len(discord_token)}")
    print(f"First 5 characters: {discord_token[:5]} Last 5 characters: {discord_token[-5:]}")
else:
    print("DISCORD_TOKEN not found in environment variables.")
