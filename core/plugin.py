
class TelemetryPlugin:
    """Base interface for all telemetry data sources."""
    
    async def start(self):
        """Called when the daemon boots up. Start background loops here."""
        pass
        
    async def stop(self):
        """Called during shutdown to clean up sockets/memory."""
        pass
        
    @property
    def router(self):
        """Override this if the plugin needs to expose a FastAPI webhook route."""
        return None