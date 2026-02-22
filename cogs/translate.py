import discord
from discord.ext import commands
from discord import app_commands
import config
import providers
import db as database
import json
from utils.permissions import has_command_permission

def _robust_json_loads(text: str):
    """
    Attempts to load JSON from text. If direct loading fails, it tries to extract
    a JSON object from within the text by finding the first '{' and last '}'.
    """
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        # Attempt to find JSON within the string
        first_brace = text.find('{')
        last_brace = text.rfind('}')
        if first_brace != -1 and last_brace != -1 and first_brace < last_brace:
            json_substring = text[first_brace : last_brace + 1]
            try:
                return json.loads(json_substring)
            except json.JSONDecodeError:
                # If parsing the substring also fails, re-raise the original error
                raise e from None
        # If no braces found or cannot extract valid JSON, re-raise the original error
        raise e from None

class TranslateCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        # Ignore messages from bots and empty messages
        if message.author.bot or not message.content:
            return

        # Ignore if auto-translate is not globally enabled
        if not config.AUTO_TRANSLATE_ENABLED:
            return

        # Check if auto-translate is enabled for this specific channel
        setting_data = await database.get_channel_autotranslate_setting(str(message.channel.id))
        if setting_data:
            _, enabled, target_language = setting_data
        else:
            enabled, target_language = False, None
        if not enabled or not target_language:
            return

        # Check if the message starts with the bot prefix or is a command to avoid translating commands
        if message.content.startswith(self.bot.command_prefix) or message.content.startswith("/"):
            return

        # Define a system prompt for language detection and translation
        base_system_prompt = (
            "You are a professional language detection and translation AI. "
            "Your task is to detect the language of the provided text. "
            "If the detected language is NOT "
            f"'{target_language}' (case-insensitive), then translate the text into '{target_language}'. "
            "If the detected language IS already "
            f"'{target_language}', respond with the original text without translation. "
            "You MUST respond ONLY with a JSON object. "
            "The JSON object MUST contain the following keys: "
            "`original_language` (the detected language of the input text), "
            "`translated_language` (the target language of the translation, which should be '{target_language}'), "
            "`original_text` (the original text provided), and "
            "`translated_text` (the translated text, or original text if no translation was needed)."
            f"\n\nOriginal Message:\n{message.content}"
        )
        
        channel_system_prompt = await database.get_channel_prompt(str(message.channel.id))
            
        if channel_system_prompt:
            system_prompt = f"{channel_system_prompt}\n\n{base_system_prompt}"
        else:
            system_prompt = base_system_prompt

        try:
            # Use providers.chat to detect language and translate
            response_text, provider, total_tokens, latency_ms, input_tokens, output_tokens = providers.chat(
                messages=[{"role": "user", "content": "Please detect the language and translate if necessary."}],
                system_prompt=system_prompt,
                override_provider=await database.get_channel_provider(str(message.channel.id))
            )

            translation_data = _robust_json_loads(response_text)
            original_language = translation_data.get("original_language", "Unknown")
            translated_text = translation_data.get("translated_text", message.content)
            
            # Only send a message if translation actually occurred or language was detected different
            if original_language.lower() != target_language.lower() and translated_text != message.content:
                # Log analytics for auto-translation
                await database.log_analytics(
                    event_type="auto_translation",
                    guild_id=str(message.guild.id) if message.guild else None,
                    channel_id=str(message.channel.id),
                    user_id=str(message.author.id),
                    provider=provider,
                    tokens_used=total_tokens,
                    latency_ms=latency_ms,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens
                )
                
                # Send the translated message
                await message.channel.send(
                    f"**{message.author.display_name}** ({original_language} ➡️ {target_language}):\n{translated_text}"
                )

        except json.JSONDecodeError:
            print(f"[AUTO-TRANSLATE] JSON Decode Error for message: {message.content[:50]}... Raw: {response_text}")
        except Exception as e:
            print(f"[AUTO-TRANSLATE] Error processing auto-translation for message: {message.content[:50]}... Error: {e}")

    @app_commands.command(name="translate", description="Translate text to a target language")
    @app_commands.describe(
        text="The text to translate",
        target_language="The language you want to translate to (e.g. Spanish, Japanese, Tagalog)"
    )
    @has_command_permission()
    async def translate_slash(self, interaction: discord.Interaction, text: str, target_language: str):
        if not config.TRANSLATE_ENABLED:
            await interaction.response.send_message("Translation feature is currently disabled.", ephemeral=True)
            return

        await interaction.response.defer()
        
        try:
            # We pass the target prompt directly
            base_system_prompt = (
                "You are a professional translator. "
                "Your task is to translate the provided text. "
                "You MUST respond ONLY with a JSON object. "
                "The JSON object MUST contain the following keys: "
                "`original_language` (the detected language of the input text), "
                "`translated_language` (the target language of the translation), "
                "`original_text` (the original text provided), and "
                "`translated_text` (the translated text)."
                f"Translate the provided text into {target_language}. "
                "Maintain the original tone and context."
                f"\n\nOriginal Message:\n{text}"
            )
            
            channel_system_prompt = await database.get_channel_prompt(str(interaction.channel_id))
            
            if channel_system_prompt:
                system_prompt = f"{channel_system_prompt}\n\n{base_system_prompt}"
            else:
                system_prompt = base_system_prompt
            
            response_text, provider, total_tokens, latency_ms, input_tokens, output_tokens = providers.chat(
                messages=[{"role": "user", "content": "Please translate the original message."}],
                system_prompt=system_prompt,
                override_provider=await database.get_channel_provider(str(interaction.channel_id))
            )
            
            # Log analytics
            await database.log_analytics(
                event_type="translation",
                guild_id=str(interaction.guild_id) if interaction.guild else None,
                channel_id=str(interaction.channel_id),
                user_id=str(interaction.user.id),
                provider=provider,
                tokens_used=total_tokens,
                latency_ms=latency_ms,
                input_tokens=input_tokens,
                output_tokens=output_tokens
            )
            
            
            try:
                translation_data = _robust_json_loads(response_text)
                original_text = translation_data.get("original_text", text)
                original_language = translation_data.get("original_language", "Unknown")
                translated_text = translation_data.get("translated_text", "Translation failed.")
                translated_language = translation_data.get("translated_language", target_language)

                embed = discord.Embed(
                    title="Translation Result",
                    color=discord.Color.blue()
                )
                embed.add_field(name=f"Original ({original_language})", value=original_text[:1024], inline=False)
                embed.add_field(name=f"Translated ({translated_language})", value=translated_text[:1024], inline=False)
                embed.set_footer(text=f"Powered by {provider}")

                await interaction.followup.send(embed=embed)

            except json.JSONDecodeError:
                await interaction.followup.send(f"Sorry, I received an invalid response from the AI. Raw response: {response_text}")
            except Exception as e:
                print(f"[TRANSLATE] Error processing translation response: {e}")
                await interaction.followup.send("Sorry, I encountered an error while formatting the translation.")
        except Exception as e:
            print(f"[TRANSLATE] Error: {e}")
            await interaction.followup.send("Sorry, I encountered an error while translating.")

    # Removed do_translate as it's now integrated via ask_ai

    # Removed do_translate as it's now integrated via ask_ai

    autotranslate_group = app_commands.Group(name="autotranslate", description="Manage channel auto-translation settings")

    @autotranslate_group.command(name="set", description="Enable auto-translation for this channel to a target language")
    @app_commands.describe(target_language="The language to automatically translate to (e.g., Spanish, Japanese)")
    @has_command_permission()
    async def autotranslate_set(self, interaction: discord.Interaction, target_language: str):
        if not config.AUTO_TRANSLATE_ENABLED:
            await interaction.response.send_message("Auto-translation feature is currently disabled globally.", ephemeral=True)
            return

        if not interaction.guild:
            await interaction.response.send_message("This command can only be used in a server channel.", ephemeral=True)
            return

        await database.set_channel_autotranslate_setting(
            str(interaction.channel_id), str(interaction.guild_id), True, target_language
        )
        await interaction.response.send_message(f"Auto-translation enabled for this channel! Messages will be translated to **{target_language}**.")

    @autotranslate_group.command(name="disable", description="Disable auto-translation for this channel")
    @has_command_permission()
    async def autotranslate_disable(self, interaction: discord.Interaction):
        if not interaction.guild:
            await interaction.response.send_message("This command can only be used in a server channel.", ephemeral=True)
            return

        await database.delete_channel_autotranslate_setting(str(interaction.channel_id))
        await interaction.response.send_message("Auto-translation disabled for this channel.")

    @autotranslate_group.command(name="status", description="Show auto-translation status for this channel")
    async def autotranslate_status(self, interaction: discord.Interaction):
        if not interaction.guild:
            await interaction.response.send_message("This command can only be used in a server channel.", ephemeral=True)
            return

        setting_data = await database.get_channel_autotranslate_setting(str(interaction.channel_id))
        if setting_data:
            _, enabled, target_language = setting_data
        else:
            enabled, target_language = False, None

        if enabled:
            await interaction.response.send_message(f"Auto-translation is **ENABLED** for this channel. Target language: **{target_language}**.")
        else:
            await interaction.response.send_message("Auto-translation is **DISABLED** for this channel.")

async def setup(bot):
    cog = TranslateCog(bot)
    await bot.add_cog(cog)

