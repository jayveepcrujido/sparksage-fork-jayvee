from __future__ import annotations

import discord
from discord.ext import commands
import db as database

class Onboarding(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def get_guild_settings(self, guild_id: str) -> dict:
        """Fetch all onboarding settings for a guild, falling back to defaults."""
        configs = await database.get_all_guild_config(guild_id)
        return {
            "enabled": configs.get("WELCOME_ENABLED", "false").lower() == "true",
            "dm_enabled": configs.get("WELCOME_DM_ENABLED", "false").lower() == "true",
            "channel_id": configs.get("WELCOME_CHANNEL_ID", ""),
            "message": configs.get("WELCOME_MESSAGE", f"Welcome {{user}} to {{server}}!"),
            "rules": configs.get("WELCOME_RULES", ""),
            "links": configs.get("WELCOME_LINKS", ""),
        }

    def create_welcome_embed(self, member: discord.Member, settings: dict) -> discord.Embed:
        welcome_text = settings["message"].format(
            user=member.mention,
            server=member.guild.name
        )
        
        embed = discord.Embed(
            title=f"Welcome to {member.guild.name}!",
            description=welcome_text,
            color=discord.Color.blue()
        )
        
        if settings["rules"]:
            embed.add_field(name="📜 Server Rules", value=settings["rules"], inline=False)
            
        if settings["links"]:
            embed.add_field(name="🔗 Important Links", value=settings["links"], inline=False)
            
        embed.set_thumbnail(url=member.display_avatar.url)
        embed.set_footer(text="Have questions? Just mention me anywhere or use /ask!")
        
        return embed

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        settings = await self.get_guild_settings(str(member.guild.id))
        
        # Log join to analytics
        await database.log_analytics(
            event_type="onboarding",
            guild_id=str(member.guild.id),
            user_id=str(member.id)
        )

        if not settings["enabled"] and not settings["dm_enabled"]:
            return

        embed = self.create_welcome_embed(member, settings)

        # Send to Channel
        if settings["enabled"] and settings["channel_id"]:
            try:
                channel = self.bot.get_channel(int(settings["channel_id"]))
                if not channel:
                    channel = await self.bot.fetch_channel(int(settings["channel_id"]))
                if channel:
                    await channel.send(content=member.mention, embed=embed)
            except Exception as e:
                print(f"Error sending welcome message to channel in {member.guild.name}: {e}")

        # Send to DM
        if settings["dm_enabled"]:
            try:
                await member.send(embed=embed)
            except discord.Forbidden:
                pass # Member has DMs closed
            except Exception as e:
                print(f"Error sending welcome message to DM for {member.name}: {e}")

async def setup(bot: commands.Bot):
    await bot.add_cog(Onboarding(bot))
