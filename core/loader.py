
import importlib
import pkgutil
import asyncio
from fastapi import FastAPI
import producers  # plugins folder

active_plugins = []

def discover_and_load_plugins(app: FastAPI):
    """Scans the producers directory and loads any valid plugins."""
    for _, module_name, _ in pkgutil.iter_modules(producers.__path__): # scanning 'producers' folder for .py files names
        # import module using its name
        module = importlib.import_module(f"producers.{module_name}")
        
        # check if the loaded file contains the required entry point function 'register_plugin'
        if hasattr(module, "register_plugin"):
            plugin_instance = module.register_plugin() # create instance of the plugin class
            active_plugins.append(plugin_instance)
            
            # If the plugin has a webhook router, attach it to FastAPI
            if plugin_instance.router:
                app.include_router(plugin_instance.router)
                
    return active_plugins

async def start_all_plugins():
    for plugin in active_plugins:
        asyncio.create_task(plugin.start())

async def stop_all_plugins():
    for plugin in active_plugins:
        await plugin.stop()