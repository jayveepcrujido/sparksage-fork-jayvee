import discord
from discord.ext import commands
from discord import app_commands
import random

QUOTES = [
    ("The only way to do great work is to love what you do.", "Steve Jobs"),
    ("In the middle of every difficulty lies opportunity.", "Albert Einstein"),
    ("It does not matter how slowly you go as long as you do not stop.", "Confucius"),
    ("Life is what happens when you're busy making other plans.", "John Lennon"),
    ("The future belongs to those who believe in the beauty of their dreams.", "Eleanor Roosevelt"),
    ("Strive not to be a success, but rather to be of value.", "Albert Einstein"),
    ("You miss 100% of the shots you don't take.", "Wayne Gretzky"),
    ("Whether you think you can or you think you can't, you're right.", "Henry Ford"),
    ("The best time to plant a tree was 20 years ago. The second best time is now.", "Chinese Proverb"),
    ("An unexamined life is not worth living.", "Socrates"),
]


class QuoteOfTheDay(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="quote", description="Get a random inspirational quote")
    async def quote(self, interaction: discord.Interaction):
        text, author = random.choice(QUOTES)
        msg = f'**Quote of the Day**\n> "{text}"\n— *{author}*'
        await interaction.response.send_message(msg)


async def setup(bot: commands.Bot):
    await bot.add_cog(QuoteOfTheDay(bot))
