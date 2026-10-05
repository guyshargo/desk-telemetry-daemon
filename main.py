import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

from core.broker import event_queue
from producers.windows_media import start_media_listener
from producers.web_media import router as web_media_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Boot up the native Windows OS media listener
    loop = asyncio.get_running_loop()
    await start_media_listener(loop)
    
    yield  


app = FastAPI(lifespan=lifespan)

# Register the Tampermonkey web events router
app.include_router(web_media_router)


async def listen_for_disconnect(websocket: WebSocket):
    """Listens for the client closing the tab or Uvicorn sending a shutdown signal."""
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass


async def send_telemetry_events(websocket: WebSocket):
    """Waits for new media/notifications and pushes them to the browser."""
    while True:
        event = await event_queue.get()
        await websocket.send_json(event)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    listen_task = asyncio.create_task(listen_for_disconnect(websocket))
    send_task = asyncio.create_task(send_telemetry_events(websocket))
    
    done, pending = await asyncio.wait(
        [listen_task, send_task],
        return_when=asyncio.FIRST_COMPLETED
    )
    
    for task in pending:
        task.cancel()

# Mounts the frontend folder (MUST be the last route)
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")