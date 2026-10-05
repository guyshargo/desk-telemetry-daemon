import asyncio

event_queue = asyncio.Queue()

# Memory dictionary to track what is currently playing on each platform
active_states = {
    "web": None,
    "vlc": None
}

# Tracks which platform currently owns the physical screen
current_displayed = None

async def publish_event(producer_name, event):
    """Smart router that remembers previous states so they aren't lost when one app closes."""
    global current_displayed
    event_type = event.get("event_type")

    if event_type == "notification":
        # Notifications always push immediately and don't affect media state
        await event_queue.put(event)
        
    elif event_type == "media":
        # Save this media as the current active item for this producer, then push it
        active_states[producer_name] = event
        current_displayed = producer_name
        await event_queue.put(event)
        
    elif event_type == "idle":
        # Clear this producer's state
        active_states[producer_name] = None

        # Only push a new event to the screen if the app that just stopped was the one actively being displayed
        if current_displayed == producer_name:
        
            # If VLC stopped but Web is still playing, restore Web display
            if producer_name == "vlc" and active_states["web"]:
                current_displayed = "web"
                await event_queue.put(active_states["web"])
                
            # If Web stopped but VLC is still playing, restore VLC display
            elif producer_name == "web" and active_states["vlc"]:
                current_displayed = "vlc"
                await event_queue.put(active_states["vlc"])
                
            # If EVERYTHING is stopped, push the idle command to display
            else:
                current_displayed = None
                await event_queue.put({
                    "event_type": "idle",
                    "source": "system",
                    "title": "",
                    "body": ""
                })