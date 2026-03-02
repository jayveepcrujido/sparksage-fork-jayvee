# SparkSage - AI Assistant for Discord

SparkSage is a versatile, AI-powered Discord bot designed to bring the power of large language models (LLMs) to your server. It can answer questions, summarize conversations, review code, and much more. It's built with Python, discord.py, and a Next.js dashboard for configuration.

## Features

- **Multi-Provider AI:** Supports various AI providers like Google Gemini, Groq, and OpenRouter.
- **Discord Integration:** Responds to mentions, slash commands, and can be configured for various automated tasks.
- **Web Dashboard:** A comprehensive web interface to configure the bot, manage permissions, and view analytics.
- **Plugin System:** Extend the bot's functionality with custom plugins.
- **Conversation Summaries:** Get summaries of channel conversations on demand.
- **Code Reviews:** Ask the bot to review code snippets.
- **Conversation Search & Export:** Search past chats, export as JSON or PDF, and auto‑tag topics.
- **Cost‑aware model routing:** simple questions are automatically sent to free providers for faster, cheaper responses.

## Prerequisites

- Python 3.10 or higher
- Node.js and npm (for the dashboard)

## Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-repo/sparksage.git
    cd sparksage
    ```

2.  **Install Python dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

3.  **Set up the configuration file:**
    Copy the example environment file:

    ```bash
    cp .env.example .env
    ```

    Now, you **must** edit the `.env` file. The most critical step is to add your Discord bot token.
    - Open the `.env` file in a text editor.
    - Find the line `DISCORD_TOKEN=your_discord_bot_token_here`.
    - Replace `your_discord_bot_token_here` with your actual bot token from the [Discord Developer Portal](https://discord.com/developers/applications).

    You should also set a new random string for `JWT_SECRET` for security.

4.  **Install dashboard dependencies:**
    ```bash
    cd dashboard
    npm install
    ```

## Running the Application

You need to run two processes: the Discord bot and the dashboard API.

1.  **Run the Discord Bot:**
    In the root directory of the project, run:

    ```bash
    python run.py
    ```

2.  **Run the Dashboard:**
    In a separate terminal, from the `dashboard` directory, run:
    ```bash
    npm run dev
    ```
    The dashboard will be available at `http://localhost:3000`.

## Login to the Dashboard

The first time you access the dashboard, you will be prompted for an admin password. This is set in your `.env` file with the `ADMIN_PASSWORD` variable. If you haven't set one, you can log in with an empty password.
