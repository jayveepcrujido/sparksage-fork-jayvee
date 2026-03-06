import discord
from discord.ext import commands, tasks
import datetime
import config
import db as database
from utils.ai import ask_ai

class DigestCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.daily_digest.start()

    def cog_unload(self):
        self.daily_digest.cancel()

    @tasks.loop(minutes=1)
    async def daily_digest(self):
        now = datetime.datetime.now()
        current_time = now.strftime("%H:%M")

        for guild in self.bot.guilds:
            guild_id = str(guild.id)
            
            # Get guild-specific digest config
            is_enabled = await database.get_guild_config_value(guild_id, "DIGEST_ENABLED", "false")
            if is_enabled != "true":
                # Fallback to global if not set specifically for guild? 
                # Better to require explicit enablement per guild or use global as default.
                # Let's use global config as default if not overridden.
                if not config.DIGEST_ENABLED:
                    continue
            
            digest_time = await database.get_guild_config_value(guild_id, "DIGEST_TIME", config.DIGEST_TIME)
            if current_time != digest_time:
                continue

            digest_channel_id = await database.get_guild_config_value(guild_id, "DIGEST_CHANNEL_ID", config.DIGEST_CHANNEL_ID)
            if not digest_channel_id:
                continue

            print(f"[DIGEST] Starting daily digest for guild {guild.name} ({guild_id}) at {current_time}")
            
            # Collect messages from past 24h for THIS guild
            db = await database.get_db()
            cursor = await db.execute(
                """
                SELECT role, content, channel_id, created_at 
                FROM conversations 
                WHERE guild_id = ? AND created_at > datetime('now', '-1 day')
                ORDER BY created_at ASC
                """,
                (guild_id,)
            )
            rows = await cursor.fetchall()
            
            if not rows:
                print(f"[DIGEST] No activity in the last 24 hours for {guild.name}.")
                continue

            # Format activity for summarization
            activity_text = ""
            for row in rows:
                role = "User" if row["role"] == "user" else "SparkSage"
                content = row["content"][:200] + "..." if len(row["content"]) > 200 else row["content"]
                activity_text += f"[{row['created_at']}] {role}: {content}\n"

            # Summarize with AI
            summary_prompt = (
                f"You are SparkSage. Below is a log of your conversations in the Discord server '{guild.name}' over the last 24 hours. "
                "Please provide a concise and engaging daily digest for the server members, highlighting interesting "
                "topics discussed or questions answered. Keep it friendly and brief.\n\n"
                f"{activity_text}"
            )

            try:
                response, provider = await ask_ai(
                    channel_id=0,
                    user_name="System",
                    message="Generate daily digest summary.",
                    system_prompt=summary_prompt,
                    category="digest",
                    event_type="digest",
                    guild_id=guild.id
                )

                # Post to digest channel
                try:
                    channel = guild.get_channel(int(digest_channel_id))
                    if not channel:
                        channel = await guild.fetch_channel(int(digest_channel_id))
                except:
                    channel = None

                if channel:
                    embed = discord.Embed(
                        title="📅 Daily Digest",
                        description=response,
                        color=discord.Color.blue(),
                        timestamp=datetime.datetime.now()
                    )
                    embed.set_footer(text=f"Powered by {provider}")
                    await channel.send(embed=embed)
                    print(f"[DIGEST] Digest sent to channel {digest_channel_id} in {guild.name}")
                else:
                    print(f"[DIGEST] Error: Could not find channel {digest_channel_id} in {guild.name}")
            except Exception as e:
                print(f"[DIGEST] Error generating or sending digest for {guild.name}: {e}")

    @daily_digest.before_loop
    async def before_daily_digest(self):
        await self.bot.wait_until_ready()

async def setup(bot):
    await bot.add_cog(DigestCog(bot))
