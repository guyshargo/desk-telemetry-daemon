import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import FileResponse

from core.broker import event_queue
from producers.windows_media import start_media_listener

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Boot up the background producers when the server starts
    loop = asyncio.get_running_loop()
    await start_media_listener(loop)
    
    yield  # Server runs here
    
    # --- SHUTDOWN LOGIC ---



# pass lifespan context manager into the FastAPI app
app = FastAPI(lifespan=lifespan)

@app.get("/")
async def get():
    return FileResponse("index.html")

@app.post("/webhook")
async def receive_webhook(request: Request):
    """Passive producer: Catches alerts from GitHub or browser extensions."""
    data = await request.json()
    await event_queue.put({
        "event_type": "notification",
        "source": data.get("source", "unknown"),
        "title": data.get("title", "New Alert"),
        "body": data.get("body", "")
    })
    return {"status": "queued"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            event = await event_queue.get()
            await websocket.send_json(event)
    except WebSocketDisconnect:
        print("Client disconnected.")