from __future__ import annotations

import time
from openai import OpenAI
import config


def _create_client(provider_name: str) -> OpenAI | None:
    """Create an OpenAI-compatible client for the given provider."""
    provider = config.PROVIDERS.get(provider_name)
    if not provider or not provider["api_key"]:
        return None

    extra_headers = {}
    if provider_name == "anthropic":
        extra_headers["anthropic-version"] = "2023-06-01"

    return OpenAI(
        base_url=provider["base_url"],
        api_key=provider["api_key"],
        default_headers=extra_headers or None,
    )


def _build_fallback_order() -> list[str]:
    """Build the provider fallback order: primary first, then enabled free providers."""
    primary = config.AI_PROVIDER
    order = []
    
    # Add primary if enabled
    if config.PROVIDERS.get(primary, {}).get("enabled", True):
        order.append(primary)
        
    for name in config.FREE_FALLBACK_CHAIN:
        if name not in order and config.PROVIDERS.get(name, {}).get("enabled", True):
            order.append(name)
    return order


def _build_clients() -> dict[str, OpenAI]:
    """Build clients for all configured providers."""
    clients = {}
    for name, info in config.PROVIDERS.items():
        if not info.get("enabled", True):
            continue
        client = _create_client(name)
        if client:
            clients[name] = client
    return clients


# Pre-build clients for all configured providers
_clients: dict[str, OpenAI] = _build_clients()
FALLBACK_ORDER = _build_fallback_order()


def reload_clients():
    """Rebuild all clients and fallback order from current config."""
    global _clients, FALLBACK_ORDER
    _clients = _build_clients()
    FALLBACK_ORDER = _build_fallback_order()


def _is_simple_query(text: str) -> bool:
    """Rudimentary heuristic to classify a message as a simple query.

    Currently based on word count and the presence of a question mark.  This
    is intentionally lightweight so it can run on every request without
    external dependencies.  The threshold may be tuned later or replaced with
    a more sophisticated classifier.
    """
    if not text or not text.strip():
        return False
    words = text.strip().split()
    # simple if fewer than 6 words and does not look like a multi‑sentence prompt
    if len(words) < 6 and text.count("?") <= 1:
        return True
    return False


def choose_provider_for_query(message: str) -> str | None:
    """Return a low‑cost provider for simple messages, or ``None`` if no
    special routing is needed.

    The priority is the order defined by ``config.FREE_FALLBACK_CHAIN``.  The
    caller can pass the result as ``override_provider`` to ``chat``.  If the
    message is not considered simple or no free providers are available this
    returns ``None``.
    """
    if not _is_simple_query(message):
        return None

    for name in config.FREE_FALLBACK_CHAIN:
        if name in _clients:
            return name
    return None


def get_available_providers() -> list[str]:
    """Return list of provider names that have valid API keys and are enabled."""
    return [
        name for name in FALLBACK_ORDER 
        if name in _clients and config.PROVIDERS.get(name, {}).get("enabled", True)
    ]


def is_provider_configured(name: str) -> bool:
    """Return True if the provider has an API key set in config."""
    prov = config.PROVIDERS.get(name)
    return bool(prov and prov.get("api_key"))


def test_provider(name: str) -> dict:
    """Test a provider with a minimal API call. Returns {success, latency_ms, error}."""
    provider = config.PROVIDERS.get(name)
    if not provider:
        return {"success": False, "latency_ms": 0, "error": f"Unknown provider: {name}"}

    client = _clients.get(name)
    if not client:
        # Try creating a fresh client in case config was just updated
        client = _create_client(name)
        if not client:
            return {"success": False, "latency_ms": 0, "error": "No API key configured"}

    try:
        start = time.time()
        response = client.chat.completions.create(
            model=provider["model"],
            max_tokens=10,
            messages=[{"role": "user", "content": "Hi"}],
        )
        latency = int((time.time() - start) * 1000)
        return {"success": True, "latency_ms": latency, "error": None}
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        return {"success": False, "latency_ms": latency, "error": str(e)}


def chat(messages: list[dict], system_prompt: str, override_provider: str | None = None) -> tuple[str, str, int, int, int, int]:
    """Send messages to AI and return (response_text, provider_name, total_tokens, latency_ms, input_tokens, output_tokens).

    Tries the override provider first (if given), then the primary provider, 
    then falls back through free providers.
    Raises RuntimeError if all providers fail.
    """
    errors = []
    
    # Build search order: override -> fallback order
    search_order = []
    if override_provider:
        search_order.append(override_provider)
    for name in FALLBACK_ORDER:
        if name not in search_order:
            search_order.append(name)

    for provider_name in search_order:
        client = _clients.get(provider_name)
        if not client:
            continue

        provider = config.PROVIDERS[provider_name]
        try:
            start_time = time.time()
            response = client.chat.completions.create(
                model=provider["model"],
                max_tokens=config.MAX_TOKENS,
                messages=[
                    {"role": "system", "content": system_prompt},
                    *messages,
                ],
            )
            latency_ms = int((time.time() - start_time) * 1000)
            text = response.choices[0].message.content
            
            total_tokens = response.usage.total_tokens if response.usage else 0
            input_tokens = response.usage.prompt_tokens if response.usage else 0
            output_tokens = response.usage.completion_tokens if response.usage else 0
            
            return text, provider_name, total_tokens, latency_ms, input_tokens, output_tokens

        except Exception as e:
            errors.append(f"{provider['name']}: {e}")
            continue

    error_details = "\n".join(errors)
    raise RuntimeError(f"All providers failed:\n{error_details}")
