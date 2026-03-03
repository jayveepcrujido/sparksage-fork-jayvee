import pytest
import providers
import config

def test_fallback_order(monkeypatch):
    config.AI_PROVIDER = "openai"
    config.FREE_FALLBACK_CHAIN = ["gemini", "groq"]
    
    # Mock providers to all be enabled
    mock_providers = {
        "openai": {"enabled": True},
        "gemini": {"enabled": True},
        "groq": {"enabled": True}
    }
    monkeypatch.setattr(config, "PROVIDERS", mock_providers)
    
    # We need to manually trigger the internal builder if we change config
    order = providers._build_fallback_order()
    
    assert order[0] == "openai"
    assert "gemini" in order
    assert "groq" in order

def test_available_providers(monkeypatch):
    # Mock providers to all be enabled
    mock_providers = {
        "openai": {"enabled": True},
        "gemini": {"enabled": True},
        "groq": {"enabled": True}
    }
    monkeypatch.setattr(config, "PROVIDERS", mock_providers)
    
    # Mock _clients to have gemini and groq
    monkeypatch.setattr(providers, "_clients", {"gemini": True, "groq": True})
    monkeypatch.setattr(providers, "FALLBACK_ORDER", ["gemini", "groq", "openai"])
    
    available = providers.get_available_providers()
    assert "gemini" in available
    assert "groq" in available
    assert "openai" not in available

def test_pricing_calculation():
    # Verify pricing is defined for core providers
    assert "gemini" in config.PROVIDER_PRICING
    assert "openai" in config.PROVIDER_PRICING
    assert len(config.PROVIDER_PRICING["openai"]) == 2 # input, output


def test_simple_query_routing(monkeypatch):
    # simulate that only free providers are configured
    monkeypatch.setattr(providers, "_clients", {"gemini": True, "groq": True})
    config.FREE_FALLBACK_CHAIN = ["gemini", "groq"]

    # short message should route to first available free provider
    assert providers.choose_provider_for_query("hi") == "gemini"
    assert providers.choose_provider_for_query("how r u") == "gemini"

    # longer message should not be considered simple
    long_msg = "please explain the difference between a list and a tuple in python"
    assert providers.choose_provider_for_query(long_msg) is None

    # if no free clients exist, routing returns None
    monkeypatch.setattr(providers, "_clients", {"openai": True})
    assert providers.choose_provider_for_query("hi") is None
