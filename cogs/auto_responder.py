from __future__ import annotations

import discord
from discord.ext import commands
import db as database

class AutoResponder(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot or not message.guild:
            return

        guild_id = str(message.guild.id)
        
        # Get all auto-responses for this guild
        responses = await database.list_auto_responses(guild_id)
        if not responses:
            return

        content = message.content
        
        for ar in responses:
            keyword = ar["keyword"]
            match_type = ar["match_type"]
            is_case_sensitive = bool(ar["is_case_sensitive"])
            response_text = ar["response"]

            # Matching logic
            triggered = False
            
            search_content = content if is_case_sensitive else content.lower()
            search_keyword = keyword if is_case_sensitive else keyword.lower()

            if match_type == "exact":
                if search_content.strip() == search_keyword.strip():
                    triggered = True
            else: # contains
                if search_keyword in search_content:
                    triggered = True

            if triggered:
                try:
                    await message.channel.send(response_text)
                    # Log to analytics if needed, but maybe too noisy for simple auto-responses
                    return # Only one response per message to avoid spam
                except Exception as e:
                    print(f"[AUTO-RESPONDER] Error sending response: {e}")

async def setup(bot: commands.Bot):
    await bot.add_cog(AutoResponder(bot))
