import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

from core.broker import event_queue
from core.loader import discover_and_load_plugins, start_all_plugins, stop_all_plugins


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dynamically discover modules in 'producers' and mount their webhooks
    discover_and_load_plugins(app)
    
    # start the start() method on all discovered plugins
    await start_all_plugins()
    
    yield  
    
    # shut down plugins on exit
    await stop_all_plugins()

app = FastAPI(lifespan=lifespan)

discover_and_load_plugins(app)


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