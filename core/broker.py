import asyncio
import time

event_queue = asyncio.Queue()

# Tracks every active media stream independently, e.g. {"web:abc123": {...}, "vlc": {...}}
active_sessions = {}
current_displayed_id = None
WEB_SESSION_TIMEOUT = 8.0


def _pick_latest_session():
    """Purges expired web tabs and returns (session_id, event) for the most recently started media."""
    now = time.time()
    expired = [
        sid for sid, entry in active_sessions.items()
        if sid.startswith("web:") and (now - entry["last_seen"] > WEB_SESSION_TIMEOUT)
    ]
    for sid in expired:
        del active_sessions[sid]

    if not active_sessions:
        return None, None

    winner_id, winner_entry = max(
        active_sessions.items(),
        key=lambda item: item[1]["started_at"]
    )
    return winner_id, winner_entry["event"]


async def publish_event(producer_name, event):
    """Routes events, queues overlapping media by start time, and restores previous media when the latest stops."""
    global current_displayed_id
    event_type = event.get("event_type")
    session_id = event.pop("session_id", producer_name)
    now = time.time()

    if event_type == "notification":
        await event_queue.put(event)
        return

    if event_type == "media":
        existing = active_sessions.get(session_id)
        is_new_or_changed = (
            not existing
            or existing["event"].get("title") != event.get("title")
            or existing["event"].get("source") != event.get("source")
        )
        # Keep original start time on heartbeats so background tabs don't steal focus back
        started_at = now if is_new_or_changed else existing["started_at"]

        active_sessions[session_id] = {
            "event": event,
            "started_at": started_at,
            "last_seen": now
        }

        winner_id, winner_event = _pick_latest_session()
        if winner_id == session_id and (is_new_or_changed or current_displayed_id != winner_id):
            current_displayed_id = winner_id
            await event_queue.put(winner_event)

    elif event_type == "idle":
        active_sessions.pop(session_id, None)
        winner_id, winner_event = _pick_latest_session()

        if winner_id:
            if winner_id != current_displayed_id:
                current_displayed_id = winner_id
                await event_queue.put(winner_event)
        elif current_displayed_id is not None:
            current_displayed_id = None
            await event_queue.put({
                "event_type": "idle",
                "source": "system",
                "title": "",
                "body": ""
            })


async def reap_stale_sessions():
    """Background watchdog: restores previous media or returns to idle if a browser tab closes silently."""
    global current_displayed_id
    while True:
        await asyncio.sleep(2)
        if current_displayed_id is not None:
            winner_id, winner_event = _pick_latest_session()
            if not winner_id:
                current_displayed_id = None
                await event_queue.put({
                    "event_type": "idle",
                    "source": "system",
                    "title": "",
                    "body": ""
                })
            elif winner_id != current_displayed_id:
                current_displayed_id = winner_id
                await event_queue.put(winner_event)


def get_current_event():
    """Returns the currently displayed media event for newly connected WebSocket clients."""
    _, winner_event = _pick_latest_session()
    return winner_event