import asyncio
from winrt.windows.media.control import GlobalSystemMediaTransportControlsSessionManager
from core.broker import event_queue

main_loop = None
manager = None
current_session = None

async def fetch_and_queue_media(session):
    """Fetches the metadata and pushes it to the central broker."""
    if session:
        props = await session.try_get_media_properties_async()
        await event_queue.put({
            "event_type": "media",
            "source": "windows",
            "title": props.title or "Unknown Title",
            "body": props.artist or "Unknown Artist"
        })

def on_media_changed(session, args):
    if main_loop:
        asyncio.run_coroutine_threadsafe(fetch_and_queue_media(session), main_loop)

def on_sessions_changed(sender, args):
    global current_session
    # When a new app takes over audio, update the global session so it isn't garbage collected
    current_session = sender.get_current_session()
    if current_session:
        current_session.add_media_properties_changed(on_media_changed)
        if main_loop:
            asyncio.run_coroutine_threadsafe(fetch_and_queue_media(current_session), main_loop)

async def start_media_listener(loop):
    """Initializes the Windows media hooks and keeps them in memory."""
    global main_loop, manager, current_session
    main_loop = loop
    
    # Assigning to the global manager prevents Python from deleting the listener
    manager = await GlobalSystemMediaTransportControlsSessionManager.request_async()
    manager.add_sessions_changed(on_sessions_changed)
    
    current_session = manager.get_current_session()
    if current_session:
        current_session.add_media_properties_changed(on_media_changed)
        await fetch_and_queue_media(current_session)