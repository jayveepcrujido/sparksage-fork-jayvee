from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import auth, config, providers, bot, conversations, wizard, faq, permissions, guilds, prompts, channel_providers, analytics, plugins, autotranslate
import db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_db()
    await db.sync_env_to_db()
    yield
    await db.close_db()


def create_app() -> FastAPI:
    app = FastAPI(title="SparkSage API", version="1.0.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "https://nurturing-bravery-production.up.railway.app"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(config.router, prefix="/api/config", tags=["config"])
    app.include_router(providers.router, prefix="/api/providers", tags=["providers"])
    app.include_router(bot.router, prefix="/api/bot", tags=["bot"])
    app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
    app.include_router(wizard.router, prefix="/api/wizard", tags=["wizard"])
    app.include_router(faq.router, prefix="/api/faqs", tags=["faq"])
    app.include_router(permissions.router, prefix="/api/permissions", tags=["permissions"])
    app.include_router(guilds.router, prefix="/api/guilds", tags=["guilds"])
    app.include_router(prompts.router, prefix="/api/prompts", tags=["prompts"])
    app.include_router(channel_providers.router, prefix="/api/channel-providers", tags=["channel-providers"])
    app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
    app.include_router(plugins.router, prefix="/api/plugins", tags=["plugins"])
    app.include_router(autotranslate.router, prefix="/api/autotranslate", tags=["autotranslate"]) # Add autotranslate router

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    @app.get("/api/debug/routes")
    async def debug_routes():
        routes_list = [{"path": route.path, "name": route.name, "methods": list(route.methods)}
                       for route in app.routes if hasattr(route, "path") and hasattr(route, "name") and hasattr(route, "methods")]
        return {"routes": routes_list}

    return app