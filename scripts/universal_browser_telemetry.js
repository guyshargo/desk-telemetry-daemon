// ==UserScript==
// @name         Universal Browser Telemetry
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      localhost
// @connect      127.0.0.1
// ==/UserScript==

// Generate a unique ID for this specific browser tab
const TAB_ID = Math.random().toString(36).substring(2, 15);
let lastUnreadCount = 0;

setInterval(() => {
    const host = window.location.hostname;

    // WhatsApp Web Notifications
    if (host.includes("whatsapp.com")) {
        const match = document.title.match(/^\((\d+)\)/);
        const currentUnread = match ? parseInt(match[1]) : 0;

        if (currentUnread > lastUnreadCount) {
            GM_xmlhttpRequest({
                method: "POST",
                url: "http://localhost:8000/webhook",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({
                    event_type: "notification",
                    source: "whatsapp",
                    title: "WhatsApp",
                    body: `You have ${currentUnread} new message(s)`
                })
            });
        }
        lastUnreadCount = currentUnread;
        return;
    }

    // Extract Media Data
    let currentTitle = "";
    let currentArtist = "";
    let source = "browser";
    let isPlaying = false;

    if (host.includes("spotify")) {
        source = "spotify";
        if (document.title.includes(" • ")) {
            const parts = document.title.split(" • ");
            currentTitle = parts[0].trim();
            currentArtist = parts[1].trim();
            isPlaying = true;
        }
    } else if (navigator.mediaSession && navigator.mediaSession.metadata) {
        currentTitle = navigator.mediaSession.metadata.title;
        currentArtist = navigator.mediaSession.metadata.artist || "";
        // Only consider it playing if the browser explicitly says so
        isPlaying = (navigator.mediaSession.playbackState === "playing");

        if (host.includes("music.youtube")) source = "youtube_music";
        else if (host.includes("youtube.com")) source = "youtube";
        else if (host.includes("twitch.tv")) source = "twitch";
        else source = host.replace("www.", "");
    }

    // Global Tab Management
    let state = GM_getValue("media_tabs_state", {});
    const now = Date.now();

    // Clean up dead or paused tabs (no action in the last 5 seconds)
    for (let id in state) {
        if (now - state[id].lastSeen > 5000) {
            delete state[id];
        }
    }

    // Update this tab's heartbeat if it is actively playing media
    if (currentTitle && isPlaying) {
        let startedAt = now;

        // If we were already playing this exact song, keep the original start time
        if (state[TAB_ID] && state[TAB_ID].title === currentTitle) {
            startedAt = state[TAB_ID].startedAt;
        }

        state[TAB_ID] = {
            title: currentTitle,
            artist: currentArtist,
            source: source,
            startedAt: startedAt,
            lastSeen: now
        };
    } else {
        // If the user pauses the video, immediately delete this tab from the active pool
        delete state[TAB_ID];
    }

    // Save the shared state so other tabs can read it
    GM_setValue("media_tabs_state", state);

    // Determine the Winner (Most recently started)
    let winnerId = null;
    let latestStart = 0;

    for (let id in state) {
        if (state[id].startedAt > latestStart) {
            latestStart = state[id].startedAt;
            winnerId = id;
        }
    }

    // Push to Webhook
    const lastPushedId = GM_getValue("last_pushed_tab_id", "");
    const lastPushedTitle = GM_getValue("last_pushed_title", "");

    if (winnerId) {
        const winner = state[winnerId];

        // Only trigger the webhook if a NEW tab took over, OR the current winner changed songs
        if (winnerId !== lastPushedId || winner.title !== lastPushedTitle) {
            GM_setValue("last_pushed_tab_id", winnerId);
            GM_setValue("last_pushed_title", winner.title);

            GM_xmlhttpRequest({
                method: "POST",
                url: "http://localhost:8000/webhook",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({
                    event_type: "media",
                    source: winner.source,
                    title: winner.title,
                    body: winner.artist
                })
            });
        }
    } else {
        // Explicitly tell the server that all tabs are paused or closed
        if (lastPushedId !== "IDLE_STATE") {
            GM_setValue("last_pushed_tab_id", "IDLE_STATE");
            GM_setValue("last_pushed_title", "");

            GM_xmlhttpRequest({
                method: "POST",
                url: "http://localhost:8000/webhook",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({
                    event_type: "idle",
                    source: "system",
                    title: "",
                    body: ""
                })
            });
        }
    }
}, 2000);