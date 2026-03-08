from __future__ import annotations

import config
import providers
import db as database
import httpx # Added import
from utils.rate_limiter import limiter

MAX_HISTORY = 20

async def get_history(channel_id: int) -> list[dict]:
    """Get conversation history for a channel from the database."""
    messages = await database.get_messages(str(channel_id), limit=MAX_HISTORY)
    return [{"role": m["role"], "content": m["content"]} for m in messages]


async def ask_ai(
    channel_id: int, 
    user_name: str, 
    message: str, 
    system_prompt: str | None = None,
    category: str | None = None,
    guild_id: int | None = None,
    user_id: int | None = None,
    event_type: str = "mention"
) -> tuple[str, str]:
    """Send a message to AI and return (response, provider_name).

    The implementation includes automatic routing: very short or trivial
    user messages are tagged as "simple" and the request is forwarded to a
    free provider (Gemini/Groq/OpenRouter) whenever one is available.  This
    behavior lowers costs and improves latency for everyday queries.  A
    channel-specific provider override (from the database) will take
    precedence over the automatic choice.
    """
    # Skip rate limiting for internal system calls (like digest)
    if channel_id != 0 and user_id:
        is_limited, reason = limiter.is_rate_limited(str(user_id), str(guild_id) if guild_id else None)
        if is_limited:
            # Log rate limit event
            await database.log_analytics(
                event_type="rate_limited",
                guild_id=str(guild_id) if guild_id else None,
                channel_id=str(channel_id),
                user_id=str(user_id)
            )
            return reason, "rate_limit"

    # Store user message in DB
    await database.add_message(
        str(channel_id), 
        "user", 
        f"{user_name}: {message}",
        category=category,
        guild_id=str(guild_id) if guild_id else None
    )

    history = await get_history(channel_id)
    
    # Determine system prompt
    channel_prompt = await database.get_channel_prompt(str(channel_id))
    
    if system_prompt:
        sys_prompt = system_prompt
    elif channel_prompt:
        sys_prompt = channel_prompt
    else:
        # Check for guild-specific persona
        persona_key = config.AI_PERSONA
        if guild_id:
            persona_key = await database.get_guild_config(str(guild_id), "AI_PERSONA", config.AI_PERSONA)
        
        # Use persona prompt if it exists, otherwise fallback to global system prompt
        sys_prompt = config.PERSONAS.get(persona_key, config.SYSTEM_PROMPT)

    # Check for channel-specific provider
    preferred_provider = await database.get_channel_provider(str(channel_id))
    
    # Automatic routing: if the user message is very simple we prefer a free
    # provider regardless of the configured primary, unless a channel override
    # is explicitly set.  This keeps costs down for trivial queries.
    auto_provider = None
    if not preferred_provider:
        auto_provider = providers.choose_provider_for_query(message)

    # Debug logging
    prompt_source = "CUSTOM" if (channel_prompt or system_prompt) else "GLOBAL"
    prov_source = (
        f"PREFERRED: {preferred_provider}" if preferred_provider
        else (f"AUTO: {auto_provider}" if auto_provider else "GLOBAL primary")
    )
    print(f"[AI] Channel {channel_id} using {prompt_source} prompt and {prov_source}")

    try:
        response, provider_name, total_tokens, latency, input_tokens, output_tokens = providers.chat(
            history, sys_prompt, override_provider=preferred_provider or auto_provider
        )
        
        # Calculate cost
        pricing = config.PROVIDER_PRICING.get(provider_name, [0.0, 0.0])
        estimated_cost = (input_tokens / 1_000_000 * pricing[0]) + (output_tokens / 1_000_000 * pricing[1])

        # Store assistant response in DB
        await database.add_message(
            str(channel_id), 
            "assistant", 
            response, 
            provider=provider_name,
            category=category,
            guild_id=str(guild_id) if guild_id else None
        )

        # Log Analytics
        await database.log_analytics(
            event_type=category or event_type,
            guild_id=str(guild_id) if guild_id else None,
            channel_id=str(channel_id),
            user_id=str(user_id) if user_id else None,
            provider=provider_name,
            tokens_used=total_tokens,
            latency_ms=latency,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=estimated_cost
        )

        return response, provider_name
    except RuntimeError as e:
        return f"Sorry, all AI providers failed: {e}", "none"


async def vector_search(user_id: str, query: str, limit: int = 5, min_score: float = 0.7) -> list[dict]:
    """Perform a vector search against the user's conversation history."""
    if not config.VECTOR_DB_URL:
        return []

    # Get embeddings for the query
    embedding = await providers.get_embedding(query)
    if not embedding:
        return []

    # Perform vector search
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{config.VECTOR_DB_URL}/query",
                json={
                    "user_id": user_id,
                    "embedding": embedding,
                    "limit": limit,
                    "min_score": min_score,
                },
                timeout=config.VECTOR_DB_TIMEOUT,
            )
            r.raise_for_status()  # Raise an exception for 4xx/5xx responses
            
            response_data = r.json()
            # Assuming the vector DB returns results under a 'results' key
            search_results = response_data.get("results", []) 
            
            return search_results # Return the actual results

    except httpx.HTTPStatusError as e:
        print(f"Error response from vector DB: {e.response.status_code} - {e.response.text}")
        return []
    except httpx.RequestError as e:
        print(f"Network error during vector search: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error during vector search: {e}")
        return []