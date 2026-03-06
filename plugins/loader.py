import os
import json
import importlib.util
import inspect
import discord
from discord.ext import commands
import db as database

PLUGINS_DIR = "plugins"

class PluginLoader:
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.loaded_plugins = {} # name -> manifest

    async def scan_plugins(self):
        """Scan the plugins directory for valid manifests."""
        plugins = []
        if not os.path.exists(PLUGINS_DIR):
            return []

        for item in os.listdir(PLUGINS_DIR):
            item_path = os.path.join(PLUGINS_DIR, item)
            manifest_path = os.path.join(item_path, "plugin.json")
            
            if os.path.isdir(item_path) and os.path.exists(manifest_path):
                try:
                    with open(manifest_path, "r") as f:
                        manifest = json.load(f)
                        manifest["id"] = item # directory name is the ID
                        plugins.append(manifest)
                except Exception as e:
                    print(f"[PLUGINS] Error reading manifest for {item}: {e}")
        return plugins

    async def load_all_enabled(self):
        """Load all plugins that are marked as enabled in the DB."""
        enabled_names = await database.get_enabled_plugins()
        all_available = await self.scan_plugins()
        
        for manifest in all_available:
            if manifest["id"] in enabled_names:
                await self.load_plugin(manifest["id"])

    async def load_plugin(self, plugin_id: str) -> bool:
        """Load a specific plugin by ID."""
        try:
            # If already loaded, unload first to refresh
            if plugin_id in self.loaded_plugins:
                await self.unload_plugin(plugin_id)

            manifest_path = os.path.join(PLUGINS_DIR, plugin_id, "plugin.json")
            if not os.path.exists(manifest_path):
                print(f"[PLUGINS] Manifest not found for {plugin_id}")
                return False
                
            with open(manifest_path, "r") as f:
                manifest = json.load(f)
            
            cog_file = manifest.get("cog")
            if not cog_file:
                print(f"[PLUGINS] No cog file defined for {plugin_id}")
                return False

            # Try to find the actual cog file
            potential_files = [
                cog_file,
                f"{cog_file}.py",
                "cog.py",
                "main.py",
                f"{plugin_id}.py"
            ]
            
            cog_path = None
            found_cog_file = None
            for pf in potential_files:
                p = os.path.join(PLUGINS_DIR, plugin_id, pf)
                if os.path.exists(p) and not os.path.isdir(p):
                    cog_path = p
                    found_cog_file = pf
                    break
            
            if not cog_path:
                print(f"[PLUGINS] Could not find a valid cog file for {plugin_id}. Checked: {potential_files}")
                return False

            # Dynamic import
            # Replace hyphens with underscores in module name to ensure it's a valid identifier
            safe_id = plugin_id.replace("-", "_")
            module_name = f"plugins.{safe_id}.{found_cog_file.replace('.py', '')}"
            
            spec = importlib.util.spec_from_file_location(module_name, cog_path)
            if not spec or not spec.loader:
                print(f"[PLUGINS] Failed to create module spec for {cog_path}")
                return False
                
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Call setup if it exists
            if hasattr(module, "setup"):
                try:
                    if inspect.iscoroutinefunction(module.setup):
                        await module.setup(self.bot)
                    else:
                        module.setup(self.bot)
                except discord.ClientException as ce:
                    if "already loaded" in str(ce):
                        print(f"[PLUGINS] {plugin_id} cogs were already in bot, proceeding...")
                    else:
                        raise ce
                
                manifest["_found_cog_file"] = found_cog_file
                self.loaded_plugins[plugin_id] = manifest
                print(f"[PLUGINS] Loaded: {manifest.get('name', plugin_id)} v{manifest.get('version', '1.0.0')} from {found_cog_file}")
                
                # Sync commands
                try:
                    await self.bot.tree.sync()
                    print(f"[PLUGINS] Synced slash commands for {plugin_id}")
                except Exception as sync_e:
                    print(f"[PLUGINS] Failed to sync commands for {plugin_id}: {sync_e}")
                    
                return True
            else:
                print(f"[PLUGINS] No setup function in {found_cog_file}")
                return False

        except Exception as e:
            print(f"[PLUGINS] Failed to load {plugin_id}: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def unload_plugin(self, plugin_id: str) -> bool:
        """Unload a specific plugin by ID."""
        try:
            if plugin_id not in self.loaded_plugins:
                return False
            
            manifest = self.loaded_plugins[plugin_id]
            cog_file = manifest.get("_found_cog_file") or manifest.get("cog")
            
            # Use same naming convention as load_plugin
            safe_id = plugin_id.replace("-", "_")
            module_name = f"plugins.{safe_id}.{cog_file.replace('.py', '')}"
            
            # Simple approach: find cogs belonging to this module
            to_remove = []
            for name, cog in self.bot.cogs.items():
                if cog.__module__ == module_name:
                    to_remove.append(name)
            
            for cog_name in to_remove:
                await self.bot.remove_cog(cog_name)
            
            del self.loaded_plugins[plugin_id]
            print(f"[PLUGINS] Unloaded: {plugin_id}")
            return True
        except Exception as e:
            print(f"[PLUGINS] Failed to unload {plugin_id}: {e}")
            return False

    async def reload_plugin(self, plugin_id: str) -> bool:
        """Reload a specific plugin."""
        await self.unload_plugin(plugin_id)
        return await self.load_plugin(plugin_id)

# Global instance initialized in bot.py
loader = None
