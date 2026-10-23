from fastapi import APIRouter, Request
from core.broker import publish_event
from core.plugin import TelemetryPlugin

router = APIRouter()

@router.post("/webhook")
async def receive_webhook(request: Request):
    """Catches media and notification events from Tampermonkey."""
    data = await request.json()
    await publish_event("web", {
        "event_type": data.get("event_type", "notification"), 
        "source": data.get("source", "unknown"),
        "title": data.get("title", "New Alert"),
        "body": data.get("body", "")
    })
    return {"status": "queued"}

class WebMediaPlugin(TelemetryPlugin):
    @property
    def router(self):
        return router  # Expose the APIRouter to the core loader

def register_plugin():
    """Entry point for loader."""
    return WebMediaPlugin()