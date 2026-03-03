from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands
import db as database
from utils.permissions import has_command_permission

class FAQ(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot or not message.guild:
            return

        # Fetch FAQs for this guild
        faqs = await database.list_faqs(str(message.guild.id))
        content = message.content.lower()

        for faq in faqs:
            keywords = [k.strip().lower() for k in faq["match_keywords"].split(",") if k.strip()]
            
            # Simple confidence check: if any keyword is in the message
            # For higher confidence, we could check if all keywords match or use fuzzy matching
            match = False
            for kw in keywords:
                if kw in content:
                    match = True
                    break
            
            if match:
                await message.reply(f"**FAQ: {faq['question']}**\n{faq['answer']}")
                await database.increment_faq_usage(faq["id"])
                
                # Log to analytics
                await database.log_analytics(
                    event_type="faq",
                    guild_id=str(message.guild.id),
                    channel_id=str(message.channel.id),
                    user_id=str(message.author.id)
                )
                break # Only respond to the first matching FAQ

    faq_group = app_commands.Group(name="faq", description="Manage FAQ entries")

    @faq_group.command(name="add", description="Add a new FAQ entry")
    @app_commands.describe(
        question="The question being asked",
        answer="The answer to provide",
        keywords="Comma-separated keywords to trigger this FAQ"
    )
    @app_commands.checks.has_permissions(manage_messages=True)
    @has_command_permission()
    async def faq_add(
        self, 
        interaction: discord.Interaction, 
        question: str, 
        answer: str, 
        keywords: str
    ):
        await database.add_faq(
            str(interaction.guild_id),
            question,
            answer,
            keywords,
            created_by=str(interaction.user)
        )
        await interaction.response.send_message(f"FAQ added: **{question}**", ephemeral=True)

    @faq_group.command(name="list", description="List all FAQs for this server")
    @has_command_permission()
    async def faq_list(self, interaction: discord.Interaction):
        faqs = await database.list_faqs(str(interaction.guild_id))
        if not faqs:
            await interaction.response.send_message("No FAQs found for this server.", ephemeral=True)
            return

        embed = discord.Embed(title="Server FAQs", color=discord.Color.blue())
        for faq in faqs:
            embed.add_field(
                name=f"ID: {faq['id']} | {faq['question']}",
                value=f"Keywords: `{faq['match_keywords']}`\nUsed: {faq['times_used']} times",
                inline=False
            )
        
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @faq_group.command(name="remove", description="Remove an FAQ entry")
    @app_commands.describe(faq_id="The ID of the FAQ to remove")
    @app_commands.checks.has_permissions(manage_messages=True)
    @has_command_permission()
    async def faq_remove(self, interaction: discord.Interaction, faq_id: int):
        await database.delete_faq(faq_id, str(interaction.guild_id))
        await interaction.response.send_message(f"FAQ #{faq_id} removed.", ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(FAQ(bot))
