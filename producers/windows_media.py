import asyncio
from winrt.windows.media.control import GlobalSystemMediaTransportControlsSessionManager, GlobalSystemMediaTransportControlsSessionPlaybackStatus
from core.broker import event_queue

main_loop = None
manager = None
tracked_sessions = set()
local_currently_playing = False  

def is_local_player(app_id):
    """Returns True only if the app is a local video player (VLC, Movies & TV)."""
    app = (app_id or "").lower()
    return any(player in app for player in ["vlc", "movies"])

async def evaluate_local_state():
    """Sweeps only local desktop apps. Web idle is now handled purely by Tampermonkey."""
    global local_currently_playing
    playing_session = None

    # Sweep only for local media apps, ignoring web browsers completely
    for session in manager.get_sessions():
        if not is_local_player(session.source_app_user_model_id):
            continue
            
        playback = session.get_playback_info()
        if playback and playback.playback_status == GlobalSystemMediaTransportControlsSessionPlaybackStatus.PLAYING:
            playing_session = session
            break
    
    if playing_session:
        local_currently_playing = True
        props = await playing_session.try_get_media_properties_async()
        
        await event_queue.put({
            "event_type": "media",
            "source": "local_video",
            "title": props.title or "Unknown Title",
            "body": props.artist or ""
        })
        
    elif local_currently_playing:
        # If the local desktop app is paused/closed, push idle
        local_currently_playing = False
        await event_queue.put({
            "event_type": "idle",
            "source": "system",
            "title": "",
            "body": ""
        })

def on_media_changed(session, args):
    if main_loop:
        asyncio.run_coroutine_threadsafe(evaluate_local_state(), main_loop)

def on_sessions_changed(sender, args):
    if not main_loop:
        return
        
    for session in sender.get_sessions():
        # Immediately ignore anything that isn't a local player
        if not is_local_player(session.source_app_user_model_id):
            continue
            
        session_key = session.source_app_user_model_id or str(id(session))
        
        if session_key not in tracked_sessions:
            session.add_media_properties_changed(on_media_changed)
            tracked_sessions.add(session_key)
            
    if main_loop:
        asyncio.run_coroutine_threadsafe(evaluate_local_state(), main_loop)

async def start_media_listener(loop):
    global main_loop, manager
    main_loop = loop
    
    manager = await GlobalSystemMediaTransportControlsSessionManager.request_async()
    manager.add_sessions_changed(on_sessions_changed)
    
    on_sessions_changed(manager, None)