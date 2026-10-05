from fastapi import APIRouter, Request
from core.broker import event_queue

# APIRouter allows us to split FastAPI routes across multiple files
router = APIRouter()

@router.post("/webhook")
async def receive_webhook(request: Request):
    """Catches media and notification events from Tampermonkey."""
    data = await request.json()
    await event_queue.put({
        "event_type": data.get("event_type", "notification"), 
        "source": data.get("source", "unknown"),
        "title": data.get("title", "New Alert"),
        "body": data.get("body", "")
    })
    return {"status": "queued"}