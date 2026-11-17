# desk-telemetry-daemon

A modular Python WebSocket daemon and kiosk-style frontend dashboard that relays real-time media and notification telemetry from browser sessions and local VLC media player onto an ambient desktop interface.

---

## 🏗️ Architecture Overview

```
[ VLC Player ] ----(HTTP API)----> [ VLC Plugin ] ──┐
                                                    │
[ Browser / Tab ] --(Tampermonkey)--> [ Web Producer ] ──┼──> [ FastAPI Broker ] --(WebSocket)--> [ Frontend Dashboard ]
                                                    │     (Async Queue)                         (Kiosk UI & Weather Engine)
```

- **Backend**: Built on **FastAPI**, managing a central asynchronous event broker, dynamic plugin discovery, and a high-performance WebSocket endpoint.
- **Producers**: 
  - **VLC Plugin**: Polls VLC's local web interface for active playback state and metadata.
  - **Web Producer**: Receives telemetry pushed by the Tampermonkey browser script.
- **Frontend**: A responsive, kiosk-ready HTML/CSS/JS dashboard featuring video-backed ambient themes, dynamic weather effects, and a robust overlay for media playback and notifications.

---

## ✨ Key Features

- **Real-time Telemetry WebSocket**: Instant push updates from media sources and notifications to the dashboard UI.
- **Ambient Weather & Time-of-Day Lighting**: Automatically adjusts visual contrast, lighting filters, and particle simulations (rain, snow, fog, stormy weather) based on live meteorological data or manual switchers.
- **Responsive Notice Board Overlay**: Precise coordinate synchronization and responsive padding ensuring event details stay neatly within the background board boundaries across all screen sizes.
- **Robust Text Handling**: Graceful text wrapping and flexbox stability for ultra-long titles (150+ chars) and special characters/diacritics.
- **Dev Tools & Stress Testing**: Built-in mock state switchers and dedicated stress-test views for evaluating edge cases.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Modern Web Browser (Chrome, Firefox, Brave, Safari)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<username>/desk-telemetry-daemon.git
   cd desk-telemetry-daemon
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt # (or fastapi, uvicorn, etc.)
   ```

4. **Run the daemon:**
   * **Terminal (Development):**
     ```bash
     python main.py
     # Or via uvicorn directly:
     uvicorn main:app --host 0.0.0.0 --port 8000
     ```
   * **System Tray (Background / Windows):**
     Install tray dependencies (`pip install pystray pillow`), then run `python tray.py`—or create a Windows shortcut pointing to your virtual environment's `pythonw.exe` to launch silently with a tray icon:
     * **Target:** `"<path-to-repo>\venv\Scripts\pythonw.exe" "<path-to-repo>\tray.py"`
     * **Start in:** `<path-to-repo>`
   ```

5. **Open the Dashboard:**
   Navigate to `http://localhost:8000` in your browser.

---

## 🛠️ Development & Testing

- **Stress Scenarios**: Access `http://localhost:8000/media-state-stress.html` to test edge cases (long titles, missing artists, special characters, squeezed flex containers).
- **Mock Controls**: Press `H` or use the built-in floating nav to toggle weather and mock view states during local development.
