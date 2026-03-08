from __future__ import annotations

import discord
from discord.ext import commands
from discord import app_commands
import config
import providers
import db as database
from utils.ai import ask_ai
from utils.permissions import has_command_permission


class General(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="ask", description="Ask SparkSage a question")
    @app_commands.describe(question="Your question for SparkSage")
    @has_command_permission()
    async def ask(self, interaction: discord.Interaction, question: str):
        await interaction.response.defer()
        response, provider_name = await ask_ai(
            interaction.channel_id,
            interaction.user.display_name,
            question,
            guild_id=interaction.guild_id,
            guild_name=interaction.guild.name if interaction.guild else None,
            user_id=interaction.user.id,
        )
        provider_label = config.PROVIDERS.get(provider_name, {}).get("name", provider_name)
        footer = f"\n-# Powered by {provider_label}"

        for i in range(0, len(response), 1900):
            chunk = response[i : i + 1900]
            if i + 1900 >= len(response):
                chunk += footer
            await interaction.followup.send(chunk)

    @app_commands.command(name="clear", description="Clear SparkSage's conversation memory for this channel")
    @has_command_permission()
    async def clear_slash(self, interaction: discord.Interaction):
        """Slash command version of clear."""
        channel_id = str(interaction.channel_id)
        try:
            await database.clear_messages(channel_id)
            print(f"[DEBUG] Cleared history for channel {channel_id} via /clear")
            await interaction.response.send_message("Conversation history cleared!")
        except Exception as e:
            print(f"[ERROR] Clear command failed: {e}")
            await interaction.response.send_message("Failed to clear history.", ephemeral=True)

    @commands.command(name="clear")
    async def clear_text(self, ctx: commands.Context):
        """Text command version of clear (prefix)."""
        channel_id = str(ctx.channel.id)
        try:
            await database.clear_messages(channel_id)
            print(f"[DEBUG] Cleared history for channel {channel_id} via {config.BOT_PREFIX}clear")
            await ctx.send("Conversation history cleared!")
        except Exception as e:
            print(f"[ERROR] Clear command failed: {e}")
            await ctx.send("Failed to clear history.")

    @app_commands.command(name="provider", description="Show which AI provider SparkSage is currently using")
    @has_command_permission()
    async def provider(self, interaction: discord.Interaction):
        primary = config.AI_PROVIDER
        provider_info = config.PROVIDERS.get(primary, {})
        available = providers.get_available_providers()

        msg = f"**Current Provider:** {provider_info.get('name', primary)}\n"
        msg += f"**Model:** `{provider_info.get('model', '?')}`\n"
        msg += f"**Free:** {'Yes' if provider_info.get('free') else 'No (paid)'}\n"
        msg += f"**Fallback Chain:** {' -> '.join(available)}"
        await interaction.response.send_message(msg)

    @app_commands.command(name="sync", description="Force sync slash commands (Admin only)")
    @app_commands.checks.has_permissions(administrator=True)
    async def sync(self, interaction: discord.Interaction):
        """Manually sync slash commands with Discord."""
        await interaction.response.defer(ephemeral=True)
        try:
            synced = await self.bot.tree.sync()
            await interaction.followup.send(f"Successfully synced {len(synced)} command(s) globally.")
        except Exception as e:
            await interaction.followup.send(f"Failed to sync commands: {e}")

    prompt_group = app_commands.Group(name="prompt", description="Manage channel-specific AI personalities")

    @prompt_group.command(name="set", description="Set a custom AI personality for this channel")
    @app_commands.describe(text="The system prompt/personality for this channel")
    @has_command_permission()
    async def prompt_set(self, interaction: discord.Interaction, text: str):
        if not interaction.guild_id:
            await interaction.response.send_message("This command can only be used in a server.", ephemeral=True)
            return
            
        await database.set_channel_prompt(str(interaction.channel_id), str(interaction.guild_id), text)
        await interaction.response.send_message(f"Custom personality set for this channel!\n\n**New Prompt:** {text}")

    @prompt_group.command(name="reset", description="Reset this channel to the global AI personality")
    @has_command_permission()
    async def prompt_reset(self, interaction: discord.Interaction):
        await database.delete_channel_prompt(str(interaction.channel_id))
        await interaction.response.send_message("Channel personality reset to global default.")

    provider_group = app_commands.Group(name="channel-provider", description="Manage channel-specific AI providers")

    @provider_group.command(name="set", description="Set a specific AI provider for this channel")
    @app_commands.describe(provider="The AI provider to use (e.g. gemini, groq, openrouter)")
    @has_command_permission()
    async def channel_provider_set(self, interaction: discord.Interaction, provider: str):
        if not interaction.guild_id:
            await interaction.response.send_message("This command can only be used in a server.", ephemeral=True)
            return
            
        provider = provider.lower()
        valid_providers = list(config.PROVIDERS.keys())
        if provider not in valid_providers:
            await interaction.response.send_message(
                f"Invalid provider. Valid options are: {', '.join(valid_providers)}", 
                ephemeral=True
            )
            return
            
        await database.set_channel_provider(str(interaction.channel_id), str(interaction.guild_id), provider)
        await interaction.response.send_message(f"AI provider for this channel set to: **{provider}**")

    @provider_group.command(name="reset", description="Reset this channel to the global default AI provider")
    @has_command_permission()
    async def channel_provider_reset(self, interaction: discord.Interaction):
        await database.delete_channel_provider(str(interaction.channel_id))
        await interaction.response.send_message("Channel AI provider reset to global default.")


async def setup(bot: commands.Bot):
    await bot.add_cog(General(bot))