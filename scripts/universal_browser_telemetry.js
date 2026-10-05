// ==UserScript==
// @name         Universal Browser Telemetry
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      localhost
// @connect      127.0.0.1
// ==/UserScript==

const TAB_ID = Math.random().toString(36).substring(2, 15);
let lastUnreadCount = 0;

// Triggers the exact millisecond you close a tab
window.addEventListener("beforeunload", () => {
    let state = GM_getValue("media_tabs_state", {});

    if (state[TAB_ID]) {
        delete state[TAB_ID];
        GM_setValue("media_tabs_state", state);
    }

    // If this was the absolute last playing tab, instantly trigger the idle state
    if (Object.keys(state).length === 0) {
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
        // Force the browser to wait 50ms before destroying the tab.
        // This guarantees the HTTP request escapes into the background before the tab dies.
        const start = Date.now();
        while (Date.now() - start < 50) {}
    }
});

setInterval(() => {
    const host = window.location.hostname;

    // 1. WhatsApp Web Notifications
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

    // 2. Extract Media Data
    let currentTitle = "";
    let currentArtist = "";
    let source = "browser";
    let isPlaying = false;

    if (host.includes("spotify")) {
        source = "spotify";
        // Spotify fallback for DRM shields
        if (document.title.includes(" • ")) {
            const parts = document.title.split(" • ");
            currentTitle = parts[0].trim();
            currentArtist = parts[1].trim();
            isPlaying = true;
        }
    } else if (host.includes("twitch.tv")) {
        source = "twitch";
        const video = document.querySelector("video");

        if (video && !video.paused) {
            isPlaying = true;

            // Extract data directly from the webpage HTML elements instead of the tab title
            let channelName = document.querySelector('h1.tw-title')?.textContent || window.location.pathname.split('/')[1] || "Twitch Stream";
            let streamTitle = document.querySelector('[data-a-target="stream-title"]')?.textContent || "Live Stream";
            let category = document.querySelector('[data-a-target="stream-game-link"]')?.textContent || "";

            currentTitle = streamTitle;
            // Combines into "LordAethelstan • Just Chatting"
            currentArtist = category ? `${channelName} • ${category}` : channelName;
        }
    } else if (navigator.mediaSession && navigator.mediaSession.metadata) {
        // Other sites (YouTube, etc.) work fine with the standard API
        currentTitle = navigator.mediaSession.metadata.title;
        currentArtist = navigator.mediaSession.metadata.artist || "";
        isPlaying = (navigator.mediaSession.playbackState === "playing");

        if (host.includes("music.youtube")) source = "youtube_music";
        else if (host.includes("youtube.com")) source = "youtube";
        else source = host.replace("www.", "");
    }

    // 3. Global Tab Management
    let state = GM_getValue("media_tabs_state", {});
    const now = Date.now();

    for (let id in state) {
        if (now - state[id].lastSeen > 5000) {
            delete state[id];
        }
    }

    if (currentTitle && isPlaying) {
        let startedAt = now;
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
        delete state[TAB_ID];
    }

    GM_setValue("media_tabs_state", state);

    // 4. Determine the Winner
    let winnerId = null;
    let latestStart = 0;

    for (let id in state) {
        if (state[id].startedAt > latestStart) {
            latestStart = state[id].startedAt;
            winnerId = id;
        }
    }

    // 5. Push to Webhook
    const lastPushedId = GM_getValue("last_pushed_tab_id", "");
    const lastPushedTitle = GM_getValue("last_pushed_title", "");

    if (winnerId) {
        const winner = state[winnerId];

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
        // Triggers if the user simply PAUSES the last video (script remains running)
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