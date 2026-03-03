from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands
import db as database

class Permissions(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    permissions_group = app_commands.Group(
        name="permissions",
        description="Manage command role restrictions",
        default_permissions=discord.Permissions(administrator=True)
    )

    async def command_autocomplete(
        self,
        interaction: discord.Interaction,
        current: str,
    ) -> list[app_commands.Choice[str]]:
        # Get all slash commands from the tree
        commands = [cmd.name for cmd in self.bot.tree.walk_commands() if not isinstance(cmd, app_commands.Group)]
        # Include common commands if tree isn't fully synced or for groups
        fallback_commands = ["ask", "clear", "summarize", "review", "faq", "provider"]
        all_commands = sorted(list(set(commands + fallback_commands)))
        
        return [
            app_commands.Choice(name=cmd, value=cmd)
            for cmd in all_commands if current.lower() in cmd.lower()
        ][:25]

    @permissions_group.command(name="set", description="Restrict a command to a specific role")
    @app_commands.autocomplete(command=command_autocomplete)
    @app_commands.describe(command="The command name to restrict", role="The role that should be allowed to use it")
    async def set_permission(self, interaction: discord.Interaction, command: str, role: discord.Role):
        await database.set_command_permission(command, str(interaction.guild_id), str(role.id))
        await interaction.response.send_message(
            f"Command `/{command}` is now restricted to users with the {role.mention} role.",
            allowed_mentions=discord.AllowedMentions.none()
        )

    @permissions_group.command(name="remove", description="Remove a role restriction from a command")
    @app_commands.autocomplete(command=command_autocomplete)
    @app_commands.describe(command="The command name", role="The role to remove from the allowed list")
    async def remove_permission(self, interaction: discord.Interaction, command: str, role: discord.Role):
        await database.remove_command_permission(command, str(interaction.guild_id), str(role.id))
        await interaction.response.send_message(
            f"Removed {role.mention} role restriction from `/{command}`.",
            allowed_mentions=discord.AllowedMentions.none()
        )

    @permissions_group.command(name="list", description="List all command role restrictions")
    async def list_permissions(self, interaction: discord.Interaction):
        perms = await database.list_command_permissions(str(interaction.guild_id))
        if not perms:
            await interaction.response.send_message("No command role restrictions set.")
            return

        # Group by command
        grouped = {}
        for p in perms:
            cmd = p["command_name"]
            if cmd not in grouped:
                grouped[cmd] = []
            role = interaction.guild.get_role(int(p["role_id"]))
            role_mention = role.mention if role else f"Unknown Role ({p['role_id']})"
            grouped[cmd].append(role_mention)

        embed = discord.Embed(title="Command Role Restrictions", color=discord.Color.blue())
        for cmd, roles in grouped.items():
            embed.add_field(name=f"/{cmd}", value=", ".join(roles), inline=False)

        await interaction.response.send_message(embed=embed)

async def setup(bot: commands.Bot):
    await bot.add_cog(Permissions(bot))
