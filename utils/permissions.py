from __future__ import annotations

import discord
from discord import app_commands
import db as database

async def check_permission(user: discord.Member | discord.User, command_name: str, guild_id: str | None) -> bool:
    """Check if a user has permission to use a command in a guild."""
    if not guild_id:
        return True
        
    # Admins bypass all checks
    if isinstance(user, discord.Member) and user.guild_permissions.administrator:
        print(f"[DEBUG] Permission: Administrator {user} bypassed check for {command_name}")
        return True

    allowed_roles = await database.get_allowed_roles(command_name, guild_id)
    
    # If no roles are defined, the command is public
    if not allowed_roles:
        print(f"[DEBUG] Permission: {command_name} is public in {guild_id}")
        return True
        
    # Check if user has any of the allowed roles
    if isinstance(user, discord.Member):
        user_role_ids = [str(role.id) for role in user.roles]
        if any(role_id in allowed_roles for role_id in user_role_ids):
            print(f"[DEBUG] Permission: {user} has allowed role for {command_name}")
            return True
            
    print(f"[DEBUG] Permission: {user} DENIED for {command_name} (Allowed roles: {allowed_roles})")
    return False

def has_command_permission():
    """Decorator to check if a user has permission to use an app command."""
    async def predicate(interaction: discord.Interaction) -> bool:
        command_name = interaction.command.name
        guild_id = str(interaction.guild_id)
        
        allowed = await check_permission(interaction.user, command_name, guild_id)
        
        if allowed:
            return True
            
        # If we got here, they don't have permission
        try:
            await interaction.response.send_message(
                "You don't have the required roles to use this command.",
                ephemeral=True
            )
        except:
            pass
        return False

    return app_commands.check(predicate)
