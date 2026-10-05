const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws`;
const socket = new WebSocket(wsUrl);

// State Tracking
let currentScreen = "view-idle";
let notificationTimeout = null;
let transitionTimeout = null;

function getBrandClass(source) {
    const s = (source || "").toLowerCase();
    if (s.includes("spotify")) return "brand-spotify";
    if (s.includes("youtube")) return "brand-youtube";
    if (s.includes("twitch")) return "brand-twitch";
    if (s.includes("whatsapp")) return "brand-whatsapp";
    if (s.includes("vlc")) return "brand-vlc";
    if (s.includes("media_player")) return "brand-media-player";
    return "brand-default";
}

function transitionBaseScreen(newScreenId, updateDOMCallback) {
    const currentEl = document.getElementById(currentScreen);
    const newEl = document.getElementById(newScreenId);

    clearTimeout(transitionTimeout);
    currentEl.classList.remove('active');

    transitionTimeout = setTimeout(() => {
        updateDOMCallback();
        newEl.classList.add('active');
        currentScreen = newScreenId;
    }, 400); 
}

function showNotification(source, title, body) {
    const popup = document.getElementById('notification-popup');
    const sourceEl = document.getElementById('notif-source');
    
    sourceEl.innerText = source;
    sourceEl.className = `source-label ${getBrandClass(source)}`;
    document.getElementById('notif-title').innerText = title;
    document.getElementById('notif-body').innerText = body;

    popup.classList.add('show');

    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        popup.classList.remove('show');
    }, 6000); 
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.event_type === "notification") {
        showNotification(data.source, data.title, data.body);
    } 
    else if (data.event_type === "media") {
        transitionBaseScreen("view-media", () => {
            const sourceEl = document.getElementById('media-source');
            sourceEl.innerText = data.source;
            sourceEl.className = `source-label ${getBrandClass(data.source)}`;
            document.getElementById('media-title').innerText = data.title;
            document.getElementById('media-artist').innerText = data.body;
        });
    }
    else if (data.event_type === "idle") {
        // Explicitly handle the new idle event from Tampermonkey
        transitionBaseScreen("view-idle", () => {
            const idleEl = document.querySelector('.idle-pulse');
            idleEl.innerText = "AWAITING TELEMETRY";
            idleEl.className = "idle-pulse";
            idleEl.style.animation = "pulse 2s infinite";
        });
    }
};

socket.onopen = () => console.log("WebSocket Connected!");
socket.onclose = () => {
    transitionBaseScreen("view-idle", () => {
        const idleEl = document.querySelector('.idle-pulse');
        idleEl.innerText = "CONNECTION LOST";
        idleEl.className = "idle-pulse brand-youtube"; 
        idleEl.style.animation = "none";
    });
};
