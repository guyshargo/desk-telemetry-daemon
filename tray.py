import os
import sys
import threading
import uvicorn
import pystray
from PIL import Image, ImageDraw
from main import app

if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = sys.stdout

# Configure Uvicorn to run on your local network so the phone can reach it
config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="warning")
server = uvicorn.Server(config)

def create_tray_icon():
    """Generates a simple 64x64 dark icon with a green status dot."""
    image = Image.new("RGB", (64, 64), color=(18, 18, 22))
    draw = ImageDraw.Draw(image)
    draw.ellipse((16, 16, 48, 48), fill=(0, 230, 118))
    return image

def on_exit(icon, item):
    """Signals Uvicorn to shut down gracefully and removes the tray icon."""
    server.should_exit = True
    icon.stop()

def run_tray():
    menu = pystray.Menu(
        pystray.MenuItem("Desk Telemetry Daemon (Running)", lambda: None, enabled=False),
        pystray.MenuItem("Exit", on_exit)
    )
    icon = pystray.Icon("desk_telemetry", create_tray_icon(), "Desk Telemetry Daemon", menu)
    icon.run()

if __name__ == "__main__":
    # Start the tray icon in a background daemon thread
    tray_thread = threading.Thread(target=run_tray, daemon=True)
    tray_thread.start()

    # Run the FastAPI/Uvicorn server on the main thread
    server.run()