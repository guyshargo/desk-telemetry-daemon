// ==UserScript==
// @name         Universal Browser Telemetry
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @connect      127.0.0.1
// ==/UserScript==

const TAB_ID = Math.random().toString(36).substring(2, 15);
let lastUnreadCount = 0;
let wasPlaying = false;

function sendWebhook(payload) {
    GM_xmlhttpRequest({
        method: "POST",
        url: "http://localhost:8000/webhook",
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({ tab_id: TAB_ID, ...payload })
    });
}

// Triggers the exact millisecond you close a tab
window.addEventListener("beforeunload", () => {
    if (wasPlaying) {
        wasPlaying = false;
        sendWebhook({
            event_type: "idle",
            source: "system",
            title: "",
            body: ""
        });
        const start = Date.now();
        while (Date.now() - start < 50) {}
    }
});

function checkTelemetry() {
    const host = window.location.hostname;

    // 1. WhatsApp Web Notifications
    if (host.includes("whatsapp.com")) {
        const match = document.title.match(/^\((\d+)\)/);
        const currentUnread = match ? parseInt(match[1]) : 0;

        if (currentUnread > lastUnreadCount) {
            sendWebhook({
                event_type: "notification",
                source: "whatsapp",
                title: "WhatsApp",
                body: `You have ${currentUnread} new message(s)`
            });
        }
        lastUnreadCount = currentUnread;
        return;
    }

    // 2. Extract Media Data for THIS Tab Only
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
    } else if (host.includes("twitch.tv")) {
        source = "twitch";
        const video = document.querySelector("video");

        if (video && !video.paused) {
            isPlaying = true;
            const channelName = document.querySelector('h1.tw-title')?.textContent || window.location.pathname.split('/')[1] || "Twitch Stream";
            const streamTitle = document.querySelector('[data-a-target="stream-title"]')?.textContent || "Live Stream";
            const category = document.querySelector('[data-a-target="stream-game-link"]')?.textContent || "";

            currentTitle = streamTitle;
            currentArtist = category ? `${channelName} • ${category}` : channelName;
        }
    } else if (navigator.mediaSession && navigator.mediaSession.metadata) {
        currentTitle = navigator.mediaSession.metadata.title || "";
        currentArtist = navigator.mediaSession.metadata.artist || "";

        const mediaEl = document.querySelector("video, audio");
        const domPlaying = mediaEl ? (!mediaEl.paused && !mediaEl.ended) : true;
        isPlaying = (navigator.mediaSession.playbackState === "playing") && domPlaying;

        if (host.includes("music.youtube")) source = "youtube_music";
        else if (host.includes("youtube.com")) source = "youtube";
        else source = host.replace("www.", "");
    }

    // 3. Send Heartbeat While Playing, or Single Idle Event on Pause
    if (currentTitle && isPlaying) {
        wasPlaying = true;
        sendWebhook({
            event_type: "media",
            source: source,
            title: currentTitle,
            body: currentArtist
        });
    } else if (wasPlaying) {
        wasPlaying = false;
        sendWebhook({
            event_type: "idle",
            source: "system",
            title: "",
            body: ""
        });
    }
}

// Unthrottled 2-second timer via inline Web Worker (with fallback for strict CSP sites)
try {
    const timerBlob = new Blob([`setInterval(() => postMessage("tick"), 2000);`], { type: "application/javascript" });
    const timerWorker = new Worker(URL.createObjectURL(timerBlob));
    timerWorker.onmessage = checkTelemetry;
} catch (e) {
    setInterval(checkTelemetry, 2000);
}