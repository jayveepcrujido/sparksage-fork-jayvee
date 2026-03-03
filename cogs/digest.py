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
        if not config.DIGEST_ENABLED or not config.DIGEST_CHANNEL_ID:
            return

        now = datetime.datetime.now()
        current_time = now.strftime("%H:%M")

        if current_time != config.DIGEST_TIME:
            return

        print(f"[DIGEST] Starting daily digest at {current_time}")
        
        # Collect messages from past 24h from the database
        db = await database.get_db()
        cursor = await db.execute(
            """
            SELECT role, content, channel_id, created_at 
            FROM conversations 
            WHERE created_at > datetime('now', '-1 day')
            ORDER BY created_at ASC
            """
        )
        rows = await cursor.fetchall()
        
        if not rows:
            print("[DIGEST] No activity in the last 24 hours.")
            return

        # Format activity for summarization
        activity_text = ""
        for row in rows:
            role = "User" if row["role"] == "user" else "SparkSage"
            content = row["content"][:200] + "..." if len(row["content"]) > 200 else row["content"]
            activity_text += f"[{row['created_at']}] {role}: {content}\n"

        # Summarize with AI
        summary_prompt = (
            "You are SparkSage. Below is a log of your conversations in the Discord server over the last 24 hours. "
            "Please provide a concise and engaging daily digest for the server members, highlighting interesting "
            "topics discussed or questions answered. Keep it friendly and brief.\n\n"
            f"{activity_text}"
        )

        try:
            # We use ask_ai but with a special system prompt
            # channel_id 0 for internal tracking if needed
            response, provider = await ask_ai(
                channel_id=0,
                user_name="System",
                message="Generate daily digest summary.",
                system_prompt=summary_prompt,
                category="digest",
                event_type="digest"
            )

            # Post to digest channel
            try:
                channel_id = int(config.DIGEST_CHANNEL_ID)
                channel = self.bot.get_channel(channel_id)
                if not channel:
                    channel = await self.bot.fetch_channel(channel_id)
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
                print(f"[DIGEST] Digest sent to channel {config.DIGEST_CHANNEL_ID}")
            else:
                print(f"[DIGEST] Error: Could not find channel {config.DIGEST_CHANNEL_ID}")
        except Exception as e:
            print(f"[DIGEST] Error generating or sending digest: {e}")

    @daily_digest.before_loop
    async def before_daily_digest(self):
        await self.bot.wait_until_ready()

async def setup(bot):
    await bot.add_cog(DigestCog(bot))
