import asyncio
import urllib.request
import base64
import json
from core.broker import publish_event

vlc_currently_playing = False
last_vlc_title = ""

def fetch_vlc_status():
    """Fetches the exact playback state directly from VLC's local web server."""
    req = urllib.request.Request("http://localhost:8080/requests/status.json")
    
    # VLC basic auth requires a blank username and the password we set ('admin')
    auth_string = base64.b64encode(b':admin').decode('ascii')
    req.add_header("Authorization", f"Basic {auth_string}")
    
    try:
        with urllib.request.urlopen(req, timeout=1) as response:
            return json.loads(response.read())
    except Exception:
        return None

async def poll_vlc_state():
    global vlc_currently_playing, last_vlc_title
    
    while True:
        vlc_data = await asyncio.to_thread(fetch_vlc_status)
        
        if vlc_data:
            state = vlc_data.get("state")
            
            if state == "playing":
                meta = vlc_data.get("information", {}).get("category", {}).get("meta", {})
                title = meta.get("title") or meta.get("filename") or "Unknown Video"
                
                # Only push to the dashboard if a NEW video started, or if it resumed from paused
                if not vlc_currently_playing or title != last_vlc_title:
                    vlc_currently_playing = True
                    last_vlc_title = title
                    
                    await publish_event("vlc", {
                        "event_type": "media",
                        "source": "vlc",
                        "title": title,
                        "body": ""
                    })
                
            elif vlc_currently_playing and state in ["paused", "stopped"]:
                # Instantly clear the dashboard when the video is paused
                vlc_currently_playing = False
                await publish_event("vlc", {
                    "event_type": "idle",
                    "source": "system",
                    "title": "",
                    "body": ""
                })
        else:
            # Clear the dashboard if the VLC program is completely closed
            if vlc_currently_playing:
                vlc_currently_playing = False
                await publish_event("vlc", {
                    "event_type": "idle",
                    "source": "system",
                    "title": "",
                    "body": ""
                })
                
        await asyncio.sleep(2)