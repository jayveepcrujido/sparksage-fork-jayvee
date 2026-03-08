import discord
from discord.ext import commands
from discord import app_commands
import random

FACTS = [
    {
        "title": "Arrival of Magellan (1521)",
        "fact": "Ferdinand Magellan arrived in the Philippines on March 16, 1521, landing in Homonhon Island. He was later killed in the Battle of Mactan by Datu Lapu-Lapu, making Lapu-Lapu the first Filipino hero to resist foreign colonization.",
        "era": "Pre-Colonial / Spanish Era"
    },
    {
        "title": "The Name 'Philippines' (1542)",
        "fact": "Spanish explorer Ruy López de Villalobos named the archipelago 'Las Islas Filipinas' in honor of Prince Philip of Asturias, who later became King Philip II of Spain.",
        "era": "Spanish Era"
    },
    {
        "title": "Manila as Capital (1571)",
        "fact": "Miguel López de Legazpi established Manila as the capital of the Spanish colony on June 24, 1571, after defeating the local Muslim ruler Rajah Sulayman. This marked the beginning of Spanish colonial rule.",
        "era": "Spanish Era"
    },
    {
        "title": "The Galleon Trade (1565–1815)",
        "fact": "For 250 years, the Manila Galleon Trade connected Asia and the Americas, making Manila one of the most important trading hubs in the world. Silver from Mexico was exchanged for silk, porcelain, and spices from Asia.",
        "era": "Spanish Era"
    },
    {
        "title": "Execution of José Rizal (1896)",
        "fact": "National hero José Rizal was executed by the Spanish colonial government on December 30, 1896, at Bagumbayan (now Luneta Park). His death ignited the Philippine Revolution against Spain.",
        "era": "Spanish Era"
    },
    {
        "title": "The Cry of Pugad Lawin (1896)",
        "fact": "On August 23, 1896, Andrés Bonifacio and the Katipunan tore their cedulas (tax certificates) in Pugad Lawin, signaling the start of the Philippine Revolution against Spain.",
        "era": "Spanish Era"
    },
    {
        "title": "Declaration of Independence (1898)",
        "fact": "General Emilio Aguinaldo declared Philippine independence from Spain on June 12, 1898, in Kawit, Cavite — the first declaration of independence in Asia. The sun on the Philippine flag represents this historic moment.",
        "era": "Revolution Era"
    },
    {
        "title": "Treaty of Paris (1898)",
        "fact": "Spain ceded the Philippines to the United States for $20 million through the Treaty of Paris on December 10, 1898, without consulting the Filipino people — triggering the Philippine-American War.",
        "era": "American Era"
    },
    {
        "title": "Philippine-American War (1899–1902)",
        "fact": "The Philippine-American War was one of the bloodiest conflicts in Filipino history. Estimates suggest over 200,000 Filipino civilians died from combat, famine, and disease before the U.S. declared the war officially over in 1902.",
        "era": "American Era"
    },
    {
        "title": "Commonwealth Era (1935)",
        "fact": "The Philippine Commonwealth was established on November 15, 1935, with Manuel Quezon as its first president. It was a transitional government preparing the Philippines for full independence from the United States.",
        "era": "American Era"
    },
    {
        "title": "Fall of Bataan (1942)",
        "fact": "On April 9, 1942, Filipino and American forces surrendered to Japan at Bataan, leading to the infamous Bataan Death March — a 65-mile forced march where thousands of prisoners died from exhaustion, starvation, and brutality.",
        "era": "Japanese Occupation"
    },
    {
        "title": "Liberation of Manila (1945)",
        "fact": "The Battle of Manila in February 1945 between American and Japanese forces resulted in the near-total destruction of Intramuros. Over 100,000 Filipino civilians were killed, making it one of the worst urban battles of World War II.",
        "era": "Japanese Occupation"
    },
    {
        "title": "Full Independence (1946)",
        "fact": "The Philippines gained full independence from the United States on July 4, 1946, becoming the first Southeast Asian country to gain independence after World War II. Manuel Roxas became the first president of the Third Republic.",
        "era": "Post-War Era"
    },
    {
        "title": "Martial Law (1972)",
        "fact": "President Ferdinand Marcos declared Martial Law on September 21, 1972, suspending civil rights and shutting down Congress. The period lasted until 1981 and is marked by widespread human rights abuses and political repression.",
        "era": "Marcos Era"
    },
    {
        "title": "Assassination of Ninoy Aquino (1983)",
        "fact": "Senator Benigno 'Ninoy' Aquino Jr. was assassinated on August 21, 1983, upon returning to the Philippines after exile. His death galvanized the opposition against Marcos and set the stage for the People Power Revolution.",
        "era": "Marcos Era"
    },
    {
        "title": "People Power Revolution (1986)",
        "fact": "The EDSA People Power Revolution on February 22–25, 1986 was a peaceful mass uprising that ousted President Ferdinand Marcos without a single shot fired. It became a global symbol of nonviolent democracy.",
        "era": "Post-Marcos Era"
    },
    {
        "title": "The Chocolate Hills of Bohol",
        "fact": "The Chocolate Hills in Bohol — over 1,200 perfectly cone-shaped hills — are a geological wonder formed from coral deposits over millions of years. They turn brown in dry season, resembling chocolate drops, and were declared a National Geological Monument in 1988.",
        "era": "Geography & Culture"
    },
    {
        "title": "The Philippines is an Archipelago",
        "fact": "The Philippines is made up of 7,641 islands, making it one of the largest archipelagos in the world. It is divided into three main island groups: Luzon, Visayas, and Mindanao.",
        "era": "Geography & Culture"
    },
]

ERA_COLORS = {
    "Pre-Colonial / Spanish Era": 0xC0392B,
    "Spanish Era": 0xE67E22,
    "Revolution Era": 0xF1C40F,
    "American Era": 0x2980B9,
    "Japanese Occupation": 0x7D3C98,
    "Post-War Era": 0x27AE60,
    "Marcos Era": 0x717D7E,
    "Post-Marcos Era": 0x1ABC9C,
    "Geography & Culture": 0x2ECC71,
}


class PhilippineHistory(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="phfact", description="Get a random historical fact about the Philippines")
    async def phfact(self, interaction: discord.Interaction):
        entry = random.choice(FACTS)
        color = ERA_COLORS.get(entry["era"], 0x3498DB)

        embed = discord.Embed(
            title=f"🇵🇭 {entry['title']}",
            description=entry["fact"],
            color=color
        )
        embed.set_footer(text=f"Era: {entry['era']}  •  Use /phfact for another fact")
        await interaction.response.send_message(embed=embed)

    @app_commands.command(name="phfacts_list", description="See all available eras of Philippine history covered")
    async def phfacts_list(self, interaction: discord.Interaction):
        eras = sorted(set(f["era"] for f in FACTS))
        era_list = "\n".join(f"• {era}" for era in eras)
        embed = discord.Embed(
            title="🇵🇭 Philippine History — Eras Covered",
            description=f"Use `/phfact` to get a random fact from any of these eras:\n\n{era_list}",
            color=0x3498DB
        )
        embed.set_footer(text=f"{len(FACTS)} facts total")
        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(PhilippineHistory(bot))
