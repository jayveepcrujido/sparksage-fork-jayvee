from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands
from utils.ai import ask_ai
from utils.permissions import has_command_permission

class CodeReview(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="review", description="Review a code snippet")
    @app_commands.describe(
        code="The code snippet to review",
        language="Programming language hint (optional)"
    )
    @has_command_permission()
    async def review(
        self, 
        interaction: discord.Interaction, 
        code: str, 
        language: str | None = None
    ):
        """Analyze code for bugs, style, performance, and security."""
        await interaction.response.defer()

        system_prompt = (
            "You are a senior code reviewer. Analyze the code for:\n"
            "1. Bugs and potential errors\n"
            "2. Style and best practices\n"
            "3. Performance improvements\n"
            "4. Security concerns.\n"
            "Respond with markdown formatting using code blocks."
        )

        lang_str = f" in {language}" if language else ""
        user_content = f"Please review this code{lang_str}:\n\n```\n{code}\n```"

        try:
            # Use the ask_ai helper which handles DB storage and history
            response, provider_name = await ask_ai(
                interaction.channel_id,
                interaction.user.display_name,
                user_content,
                system_prompt=system_prompt,
                category="code_review",
                guild_id=interaction.guild_id,
                guild_name=interaction.guild.name if interaction.guild else None,
                user_id=interaction.user.id
            )

            # Split long responses (Discord 2000 char limit)
            first = True
            for i in range(0, len(response), 2000):
                part = response[i : i + 2000]
                if first:
                    await interaction.followup.send(part)
                    first = False
                else:
                    await interaction.channel.send(part)

        except Exception as e:
            await interaction.followup.send(f"Error during code review: {e}")

async def setup(bot: commands.Bot):
    await bot.add_cog(CodeReview(bot))
