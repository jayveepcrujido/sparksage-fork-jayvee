import discord
from discord.ext import commands
from discord import app_commands
import random

class Trivia(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.questions = [
            {"q": "What is the capital of France?", "a": "Paris"},
            {"q": "Which planet is known as the Red Planet?", "a": "Mars"},
            {"q": "Who wrote 'Romeo and Juliet'?", "a": "William Shakespeare"},
            {"q": "What is the largest ocean on Earth?", "a": "Pacific"},
            {"q": "What is the square root of 64?", "a": "8"}
        ]

    @app_commands.command(name="trivia", description="Get a random trivia question")
    async def trivia(self, interaction: discord.Interaction):
        question = random.choice(self.questions)
        msg = f"**Trivia Question:** {question['q']}\n"
        msg += f"*(Answer: ||{question['a']}||)*"
        await interaction.response.send_message(msg)

async def setup(bot: commands.Bot):
    await bot.add_cog(Trivia(bot))
