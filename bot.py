from __future__ import annotations

import discord
from discord.ext import commands
from discord import app_commands
import config
import providers
import db as database
from utils.ai import get_history, ask_ai
from utils.permissions import check_permission
from plugins import loader as plugin_loader

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix=config.BOT_PREFIX, intents=intents)

MAX_HISTORY = 20


async def get_bot_status() -> dict:
    """Return bot status info for the dashboard API."""
    is_ready = bot.is_ready()
    guild_list = bot.guilds
    
    # Get guild count from DB as fallback or addition
    db_guild_count = await database.get_total_guilds()
    guild_count = max(len(guild_list), db_guild_count)
    
    print(f"[DEBUG] get_bot_status: ready={is_ready}, bot_guilds={len(guild_list)}, db_guilds={db_guild_count}, user={bot.user}")
    
    if is_ready and bot.user:
        return {
            "online": True,
            "username": str(bot.user),
            "latency_ms": round(bot.latency * 1000, 1) if bot.latency is not None else None,
            "guild_count": guild_count,
            "guilds": [{"id": str(g.id), "name": g.name, "member_count": g.member_count} for g in guild_list],
        }
    return {
        "online": False, 
        "username": None, 
        "latency_ms": None, 
        "guild_count": db_guild_count, 
        "guilds": []
    }


def get_all_channels() -> list[dict]:
    """Return a list of all text channels across all guilds."""
    if not bot.is_ready():
        print("[DEBUG] get_all_channels: Bot not ready yet.")
        return []

    channels = []
    print(f"[DEBUG] get_all_channels: Searching in {len(bot.guilds)} guilds")
    for guild in bot.guilds:
        for channel in guild.text_channels:
            channels.append({
                "id": str(channel.id),
                "name": channel.name,
                "guild_name": guild.name,
                "guild_id": str(guild.id)
            })
    print(f"[DEBUG] get_all_channels: Found {len(channels)} total channels")
    return sorted(channels, key=lambda x: (x["guild_name"], x["name"]))


def get_guild_roles(guild_id: str) -> list[dict]:
    """Return list of roles for a guild."""
    try:
        if not guild_id:
            return []
        
        print(f"[DEBUG] get_guild_roles for ID: {guild_id}")
        
        # Try to find the guild in the bot's cache
        guild = bot.get_guild(int(guild_id))
        
        if not guild:
            # Fallback: Search all guilds manually (sometimes cache lookup by ID is finicky)
            print(f"[DEBUG] Guild {guild_id} not found by ID. Searching in {len(bot.guilds)} guilds...")
            for g in bot.guilds:
                if str(g.id) == str(guild_id):
                    guild = g
                    break
        
        if not guild:
            print(f"[DEBUG] Guild {guild_id} still not found. Known: {[g.id for g in bot.guilds]}")
            return []
        
        roles = []
        # Sort roles by position (highest first)
        sorted_roles = sorted(guild.roles, key=lambda r: r.position, reverse=True)
        
        for r in sorted_roles:
            # Skip managed roles (bots/integrations) and @everyone
            if r.managed or r.is_default():
                continue
                
            roles.append({
                "id": str(r.id),
                "name": r.name,
                "color": f"#{r.color.value:06x}" if r.color.value else "#99aab5"
            })
            
        print(f"[DEBUG] Found {len(roles)} roles for guild: {guild.name}")
        return roles
    except Exception as e:
        print(f"Error in get_guild_roles: {e}")
        import traceback
        traceback.print_exc()
        return []


# --- Events ---


_extensions_loaded = False

@bot.event
async def on_ready():
    global _extensions_loaded
    if not _extensions_loaded:
        _extensions_loaded = True
        # Initialize database when bot is ready
        await database.init_db()
        await database.sync_env_to_db()

        # Verify intents
        if not bot.intents.message_content:
            print("CRITICAL: Message Content Intent is NOT enabled in the code or Discord portal.")
        if not bot.intents.members:
            print("CRITICAL: Members Intent is NOT enabled in the code or Discord portal.")

        await bot.load_extension("cogs.general")
        await bot.load_extension("cogs.summarize")
        await bot.load_extension("cogs.code_review")
        await bot.load_extension("cogs.faq")
        await bot.load_extension("cogs.onboarding")
        await bot.load_extension("cogs.permissions")
        await bot.load_extension("cogs.digest")
        await bot.load_extension("cogs.moderation")
        await bot.load_extension("cogs.translate")
        await bot.load_extension("cogs.plugins")

        # Initialize Plugins
        plugin_loader.loader = plugin_loader.PluginLoader(bot)
        await plugin_loader.loader.load_all_enabled()

        available = providers.get_available_providers()
        primary = config.AI_PROVIDER
        provider_info = config.PROVIDERS.get(primary, {})

        print(f"SparkSage is online as {bot.user}")
        print(f"Connected to {len(bot.guilds)} guilds:")
        for g in bot.guilds:
            print(f" - {g.name} ({g.id})")
        
        print(f"Primary provider: {provider_info.get('name', primary)} ({provider_info.get('model', '?')})")
        print(f"Fallback chain: {' -> '.join(available)}")

        try:
            synced = await bot.tree.sync()
            print(f"Synced {len(synced)} slash command(s)")
        except Exception as e:
            print(f"Failed to sync commands: {e}")
    else:
        print("[DEBUG] Bot is already ready, skipping extension loading.")

@bot.event
async def on_message(message: discord.Message):
    # Debug: Log all messages the bot hears
    print(f"[DEBUG] Global on_message: {message.author}: {message.content[:50]} (Mod Enabled: {config.MODERATION_ENABLED})")

    if message.author == bot.user:
        return

    # Respond when mentioned
    if bot.user in message.mentions:
        # Check permission for 'ask' command
        guild_id = str(message.guild.id) if message.guild else None
        if not await check_permission(message.author, "ask", guild_id):
            await message.reply("You don't have permission to use the AI chat in this server.")
            return

        clean_content = message.content.replace(f"<@{bot.user.id}>", "").strip()
        if not clean_content:
            clean_content = "Hello!"

        async with message.channel.typing():
            response, provider_name = await ask_ai(
                message.channel.id, 
                message.author.display_name, 
                clean_content,
                guild_id=message.guild.id if message.guild else None,
                user_id=message.author.id,
                event_type="mention"
            )

        # Split long responses (Discord 2000 char limit)
        for i in range(0, len(response), 2000):
            await message.reply(response[i : i + 2000])

    await bot.process_commands(message)

# --- Run ---

def main():
    if not config.DISCORD_TOKEN:
        print("Error: DISCORD_TOKEN not set. Copy .env.example to .env and fill in your tokens.")
        return

    available = providers.get_available_providers()
    if not available:
        print("Error: No AI providers configured. Add at least one API key to .env")
        print("Free options: GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY")
        return

    bot.run(config.DISCORD_TOKEN)


if __name__ == "__main__":
    main()
