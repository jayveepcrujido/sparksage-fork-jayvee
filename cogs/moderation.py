import discord
from discord.ext import commands
import json
import config
import db as database
import providers

class ModerationCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot:
            return
            
        if not config.MODERATION_ENABLED:
            return

        # Prepare moderation prompt
        print(f"[DEBUG] Scanning message from {message.author}: {message.content[:50]}...")
        
        system_prompt = (
            "You are an expert content moderator for a Discord server. "
            "Your task is to analyze the provided message for toxicity, hate speech, severe insults, spam, or obvious rule violations. "
            f"Sensitivity level: {config.MODERATION_SENSITIVITY} (low = only flag extreme, high = flag mild issues). "
            "Output MUST be valid JSON and nothing else. "
            'Expected format: {"flagged": bool, "reason": "string", "severity": "low"|"medium"|"high"}'
        )
        
        user_message = f"User: {message.author.display_name}\nContent: {message.content}"

        try:
            # Using providers.chat directly for structured output
            response_text, provider, total_tokens, latency, input_tokens, output_tokens = providers.chat(
                messages=[{"role": "user", "content": user_message}],
                system_prompt=system_prompt
            )
            
            print(f"[DEBUG] Moderation AI ({provider}) response: {response_text}")
            
            # Log analytics for the moderation check itself
            await database.log_analytics(
                event_type="moderation_check",
                guild_id=str(message.guild.id) if message.guild else None,
                channel_id=str(message.channel.id),
                user_id=str(message.author.id),
                provider=provider,
                tokens_used=total_tokens,
                latency_ms=latency
            )
            
            # Extract JSON from response
            # Sometimes models wrap JSON in markdown blocks
            clean_json = response_text.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0].strip()
                
            try:
                data = json.loads(clean_json)
            except json.JSONDecodeError as je:
                print(f"[MODERATION] JSON Decode Error: {je}. Raw: {response_text}")
                return
            
            if data.get("flagged"):
                print(f"[MODERATION] FLAG: {message.author} in #{message.channel}. Reason: {data.get('reason')}")
                await self.flag_message(message, data, provider)
                
        except Exception as e:
            print(f"[MODERATION] Error checking message: {e}")
            import traceback
            traceback.print_exc()

    async def flag_message(self, message, data, provider):
        if not message.guild:
            return
            
        guild_id = str(message.guild.id)
        channel_id = str(message.channel.id)
        user_id = str(message.author.id)
        reason = data.get("reason", "Unknown violation")
        severity = data.get("severity", "medium").lower()

        # Log to DB
        await database.log_moderation_event(
            guild_id, channel_id, user_id, message.content, reason, severity
        )
        
        # Log to Analytics
        await database.log_analytics(
            event_type="moderation_flag",
            guild_id=guild_id,
            channel_id=channel_id,
            user_id=user_id
        )

        # Post to mod-log channel
        mod_channel_id = config.MOD_LOG_CHANNEL_ID
        if not mod_channel_id:
            return

        mod_channel = self.bot.get_channel(int(mod_channel_id))
        if not mod_channel:
            try:
                mod_channel = await self.bot.fetch_channel(int(mod_channel_id))
            except:
                print(f"[MODERATION] Mod log channel {mod_channel_id} not found.")
                return

        color = {
            "low": discord.Color.yellow(),
            "medium": discord.Color.orange(),
            "high": discord.Color.red()
        }.get(severity, discord.Color.greyple())

        embed = discord.Embed(
            title="🚩 Message Flagged for Review",
            color=color,
            timestamp=message.created_at
        )
        embed.add_field(name="User", value=f"{message.author.mention} ({message.author.id})", inline=True)
        embed.add_field(name="Channel", value=message.channel.mention, inline=True)
        embed.add_field(name="Severity", value=severity.upper(), inline=True)
        embed.add_field(name="Reason", value=reason, inline=False)
        embed.add_field(name="Message Content", value=message.content[:1024] or "(Empty)", inline=False)
        embed.set_footer(text=f"Analyzed by {provider}")

        # Action Buttons
        view = ModActionView(message)
        await mod_channel.send(embed=embed, view=view)

class ModActionView(discord.ui.View):
    def __init__(self, message: discord.Message):
        super().__init__(timeout=None)
        self.message = message

    @discord.ui.button(label="Dismiss", style=discord.ButtonStyle.secondary)
    async def dismiss(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("Flag dismissed.", ephemeral=True)
        await interaction.message.edit(view=None)

    @discord.ui.button(label="Delete Message", style=discord.ButtonStyle.danger)
    async def delete_msg(self, interaction: discord.Interaction, button: discord.ui.Button):
        try:
            await self.message.delete()
            await interaction.response.send_message("Message deleted.", ephemeral=True)
            await interaction.message.edit(view=None)
        except discord.Forbidden:
            await interaction.response.send_message("I don't have permission to delete that message.", ephemeral=True)
        except discord.NotFound:
            await interaction.response.send_message("Message already deleted.", ephemeral=True)

async def setup(bot):
    await bot.add_cog(ModerationCog(bot))