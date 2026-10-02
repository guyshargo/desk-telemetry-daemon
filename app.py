import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.responses import FileResponse

app = FastAPI()

@app.get("/")
async def get():
    return FileResponse("index.html")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Dummy Spotify track data
    dummy_tracks = [
        {"event": "media_play", "source": "spotify", "title": "Bury the Light", "artist": "Casey Edwards"},
        {"event": "media_play", "source": "spotify", "title": "Night City", "artist": "The Midnight"},
        {"event": "media_play", "source": "spotify", "title": "Resonance", "artist": "HOME"}
    ]
    
    try:
        while True:
            for track in dummy_tracks:
                # Push the JSON event through the WebSocket
                await websocket.send_json(track)
                # Wait 5 seconds before changing to the next track
                await asyncio.sleep(5)
                
    except WebSocketDisconnect:
        print("Client disconnected from WebSocket.")