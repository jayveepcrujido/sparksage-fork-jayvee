import discord
from discord.ext import commands
from discord import app_commands
import db as database
from plugins import loader as plugin_loader
from utils.permissions import has_command_permission

class Plugins(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    plugin_group = app_commands.Group(name="plugin", description="Manage bot plugins")

    @plugin_group.command(name="list", description="List all available plugins")
    @has_command_permission()
    async def plugin_list(self, interaction: discord.Interaction):
        if not plugin_loader.loader:
            await interaction.response.send_message("Plugin system not initialized.", ephemeral=True)
            return

        available = await plugin_loader.loader.scan_plugins()
        enabled_states = await database.get_plugin_states()

        if not available:
            await interaction.response.send_message("No plugins found in the `plugins/` directory.", ephemeral=True)
            return

        embed = discord.Embed(title="🧩 Bot Plugins", color=discord.Color.blue())
        
        for p in available:
            is_enabled = enabled_states.get(p["id"], False)
            status = "✅ Enabled" if is_enabled else "❌ Disabled"
            desc = p.get("description", "No description provided.")
            author = p.get("author", "Unknown")
            version = p.get("version", "1.0.0")
            
            value = f"ID: `{p['id']}`\n"
            value += f"Status: **{status}**\n"
            value += f"Author: {author}\n"
            value += f"{desc}"
            
            embed.add_field(
                name=f"{p.get('name', p['id'])} v{version}",
                value=value,
                inline=False
            )
        
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @plugin_group.command(name="enable", description="Enable a plugin")
    @app_commands.describe(name="The ID of the plugin to enable")
    @has_command_permission()
    async def plugin_enable(self, interaction: discord.Interaction, name: str):
        if not plugin_loader.loader:
            await interaction.response.send_message("Plugin system not initialized.", ephemeral=True)
            return

        # Check if exists
        available = await plugin_loader.loader.scan_plugins()
        if not any(p["id"] == name for p in available):
            await interaction.response.send_message(f"Plugin `{name}` not found.", ephemeral=True)
            return

        await database.set_plugin_enabled(name, True)
        success = await plugin_loader.loader.load_plugin(name)
        
        if success:
            await interaction.response.send_message(f"Plugin `{name}` has been enabled and loaded.")
        else:
            await interaction.response.send_message(f"Plugin `{name}` was marked as enabled but failed to load. Check logs.")

    @plugin_group.command(name="disable", description="Disable a plugin")
    @app_commands.describe(name="The ID of the plugin to disable")
    @has_command_permission()
    async def plugin_disable(self, interaction: discord.Interaction, name: str):
        if not plugin_loader.loader:
            await interaction.response.send_message("Plugin system not initialized.", ephemeral=True)
            return

        await database.set_plugin_enabled(name, False)
        await plugin_loader.loader.unload_plugin(name)
        await interaction.response.send_message(f"Plugin `{name}` has been disabled and unloaded.")

async def setup(bot: commands.Bot):
    await bot.add_cog(Plugins(bot))
