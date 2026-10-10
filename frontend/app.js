const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws`;
const socket = new WebSocket(wsUrl);

// State Tracking
let currentScreen = "view-idle";
let notificationTimeout = null;
let notificationPreviewInterval = null;
let notificationPreviewTimeout = null;
let transitionTimeout = null;
let mediaMockInterval = null;
let mediaUpdateTimeout = null;
let mediaUpdateFrame = null;
const mockStates = ["view-idle", "view-media", "notification-popup"];
const mediaMockExamples = [
    { source: "Spotify", title: "Midnight City", artist: "M83" },
    { source: "YouTube", title: "A Walk", artist: "Tycho" },
    { source: "Twitch", title: "Live: Just Chatting", artist: "shroud" },
    { source: "VLC", title: "Dreams", artist: "Fleetwood Mac" }
];
const variants = ["signal", "aurora", "pixel"];
const notificationReplayPeriodMs = 3000;
const notificationExitDurationMs = 150;
let mockState = new URLSearchParams(window.location.search).get("__state");
if (!mockStates.includes(mockState)) mockState = null;
let mockMode = mockState !== null;
let mediaMockIndex = 0;
let activeVariant = new URLSearchParams(window.location.search).get("__variant");
if (!variants.includes(activeVariant)) activeVariant = "signal";
document.body.dataset.variant = activeVariant;

function renderVariantPicker() {
    document.querySelectorAll(".variant-picker [data-variant]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.variant === activeVariant));
    });
}

function setVariant(variant) {
    if (!variants.includes(variant)) return;

    activeVariant = variant;
    document.body.dataset.variant = variant;
    renderVariantPicker();

    const query = new URLSearchParams(window.location.search);
    query.set("__variant", variant);
    history.pushState(null, "", `${window.location.pathname}?${query}${window.location.hash}`);
}

function getBrandClass(source) {
    const s = (source || "").toLowerCase();
    if (s.includes("spotify")) return "brand-spotify";
    if (s.includes("youtube")) return "brand-youtube";
    if (s.includes("twitch")) return "brand-twitch";
    if (s.includes("whatsapp")) return "brand-whatsapp";
    if (s.includes("vlc")) return "brand-vlc";
    return "brand-default";
}

function updateMediaContent(source, title, artist) {
    const screen = document.getElementById("view-media");
    const content = screen.querySelector(".media-content");
    const sourceEl = document.getElementById("media-source");
    const updateContent = () => {
        sourceEl.innerText = source;
        sourceEl.className = `source-label ${getBrandClass(source)}`;
        document.getElementById("media-title").innerText = title;
        document.getElementById("media-artist").innerText = artist;
    };

    clearTimeout(mediaUpdateTimeout);
    if (mediaUpdateFrame !== null) {
        cancelAnimationFrame(mediaUpdateFrame);
        mediaUpdateFrame = null;
    }

    if (currentScreen !== "view-media" || !screen.classList.contains("active")) {
        content.classList.remove("is-changing");
        updateContent();
        return;
    }

    content.classList.add("is-changing");
    mediaUpdateTimeout = setTimeout(() => {
        updateContent();
        mediaUpdateFrame = requestAnimationFrame(() => {
            content.classList.remove("is-changing");
            mediaUpdateFrame = null;
            mediaUpdateTimeout = null;
        });
    }, 140);
}

function transitionBaseScreen(newScreenId, updateDOMCallback, immediate = false) {
    const currentEl = document.getElementById(currentScreen);
    const newEl = document.getElementById(newScreenId);

    if (newScreenId === currentScreen) {
        updateDOMCallback();
        return;
    }

    clearTimeout(transitionTimeout);
    currentEl.classList.remove('active');

    updateDOMCallback();

    const activateScreen = () => {
        newEl.classList.add('active');
        currentScreen = newScreenId;
    };

    if (immediate) {
        activateScreen();
    } else {
        currentScreen = newScreenId;
        transitionTimeout = setTimeout(activateScreen, 150);
    }
}

function hideNotification() {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
    document.getElementById('notification-popup').classList.remove('show');
}

function clearNotificationPreview() {
    clearInterval(notificationPreviewInterval);
    clearTimeout(notificationPreviewTimeout);
    notificationPreviewInterval = null;
    notificationPreviewTimeout = null;
}

function replayMockNotificationEntrance() {
    if (!mockMode || mockState !== "notification-popup") return;

    const popup = document.getElementById("notification-popup");
    popup.classList.remove("show");
    notificationPreviewTimeout = setTimeout(() => {
        if (mockMode && mockState === "notification-popup") {
            popup.classList.add("show");
        }
        notificationPreviewTimeout = null;
    }, 150);
}

function clearMediaMockRotation() {
    clearInterval(mediaMockInterval);
    mediaMockInterval = null;
}

function showNotification(source, title, body) {
    const popup = document.getElementById('notification-popup');
    const logoEl = document.getElementById('notif-logo');
    const titleEl = document.getElementById('notif-title');
    const bodyEl = document.getElementById('notif-body');
    const sourceName = (source || "").trim() || "Unknown source";
    const logoInitials = {
        spotify: "SP",
        youtube: "YT",
        twitch: "TW",
        whatsapp: "WA",
        vlc: "VLC"
    };
    const sourceKey = sourceName.toLowerCase();

    logoEl.innerText = logoInitials[sourceKey] || sourceName.slice(0, 2).toUpperCase();
    logoEl.className = `notification-logo ${getBrandClass(sourceName)}`;
    logoEl.setAttribute("aria-label", `${sourceName} notification`);
    titleEl.innerText = title;
    titleEl.title = title;
    bodyEl.innerText = body;
    bodyEl.title = body;

    popup.classList.add('show');

    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        popup.classList.remove('show');
        notificationTimeout = null;
    }, 6000); 
}

function setMockState(state) {
    mockMode = true;
    mockState = state;

    const query = new URLSearchParams(window.location.search);
    query.set("__state", state);
    history.pushState(null, "", `${window.location.pathname}?${query}${window.location.hash}`);
    renderMockState(state);
}

function renderMockState(state) {
    clearNotificationPreview();
    clearMediaMockRotation();
    document.querySelectorAll(".state-switcher [data-state]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.state === state));
    });

    if (state === "view-idle") {
        hideNotification();
        transitionBaseScreen("view-idle", () => {
            const idleEl = document.querySelector('.idle-pulse');
            idleEl.innerText = "AWAITING TELEMETRY";
            idleEl.className = "idle-pulse";
            idleEl.style.animation = "pulse 2s infinite";
        }, true);
    } else if (state === "view-media") {
        hideNotification();
        mediaMockIndex = 0;
        const renderMediaExample = () => {
            const example = mediaMockExamples[mediaMockIndex];
            updateMediaContent(example.source, example.title, example.artist);
        };
        transitionBaseScreen("view-media", () => {
            renderMediaExample();
        }, true);
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            mediaMockInterval = setInterval(() => {
                mediaMockIndex = (mediaMockIndex + 1) % mediaMockExamples.length;
                renderMediaExample();
            }, 3000);
        }
    } else if (state === "notification-popup") {
        transitionBaseScreen("view-idle", () => {
            const idleEl = document.querySelector('.idle-pulse');
            idleEl.innerText = "AWAITING TELEMETRY";
            idleEl.className = "idle-pulse";
            idleEl.style.animation = "pulse 2s infinite";
        }, true);
        showNotification("WhatsApp", "Maya Chen", "Are we still on for dinner at 7?");
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            notificationPreviewInterval = setInterval(
                replayMockNotificationEntrance,
                notificationReplayPeriodMs - notificationExitDurationMs
            );
        }
    }
}

function switchToMockState(state) {
    if (mockStates.includes(state) && state !== mockState) setMockState(state);
}

function updateMockModeFromUrl() {
    const state = new URLSearchParams(window.location.search).get("__state");
    if (mockStates.includes(state)) {
        mockState = state;
        mockMode = true;
        renderMockState(state);
    } else {
        mockState = null;
        mockMode = false;
        clearNotificationPreview();
        clearMediaMockRotation();
        hideNotification();
        document.querySelectorAll(".state-switcher [data-state]").forEach((button) => {
            button.setAttribute("aria-pressed", "false");
        });
    }
}

document.querySelectorAll(".state-switcher [data-state]").forEach((button) => {
    button.addEventListener("click", () => switchToMockState(button.dataset.state));
});

document.querySelectorAll(".variant-picker [data-variant]").forEach((button) => {
    button.addEventListener("click", () => setVariant(button.dataset.variant));
});

document.addEventListener("keydown", (event) => {
    if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.defaultPrevented ||
        event.target.isContentEditable ||
        event.target.closest("input, textarea, select")
    ) return;

    const focusedStatePicker = event.target.closest(".state-switcher");
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (!focusedStatePicker) {
            const activeIndex = variants.indexOf(activeVariant);
            const direction = event.key === "ArrowRight" ? 1 : -1;
            const nextIndex = (activeIndex + direction + variants.length) % variants.length;
            setVariant(variants[nextIndex]);
            document.querySelector(`[data-variant="${variants[nextIndex]}"]`).scrollIntoView({
                block: "nearest",
                inline: "nearest"
            });
            event.preventDefault();
            return;
        }

        const activeIndex = mockStates.indexOf(mockState);
        const startIndex = activeIndex === -1 ? 0 : activeIndex;
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (startIndex + direction + mockStates.length) % mockStates.length;
        switchToMockState(mockStates[nextIndex]);
        document.querySelector(`[data-state="${mockStates[nextIndex]}"]`).scrollIntoView({
            block: "nearest",
            inline: "nearest"
        });
        event.preventDefault();
    }
    else if (event.key.toLowerCase() === "h") {
        const shouldHide = !document.querySelector(".state-switcher").hidden;
        document.querySelector(".state-switcher").hidden = shouldHide;
        document.querySelector(".variant-picker").hidden = shouldHide;
        event.preventDefault();
        return;
    }

    const stateIndex = Number(event.key) - 1;
    if (focusedStatePicker && Number.isInteger(stateIndex) && stateIndex >= 0 && stateIndex < mockStates.length) {
        switchToMockState(mockStates[stateIndex]);
        event.preventDefault();
    } else if (!focusedStatePicker && Number.isInteger(stateIndex) && stateIndex >= 0 && stateIndex < variants.length) {
        setVariant(variants[stateIndex]);
        event.preventDefault();
    }
});

window.addEventListener("popstate", () => {
    const query = new URLSearchParams(window.location.search);
    const variant = query.get("__variant");
    activeVariant = variants.includes(variant) ? variant : "signal";
    document.body.dataset.variant = activeVariant;
    renderVariantPicker();
    updateMockModeFromUrl();
});

socket.onmessage = (event) => {
    if (mockMode) return;

    const data = JSON.parse(event.data);
    
    if (data.event_type === "notification") {
        showNotification(data.source, data.title, data.body);
    } 
    else if (data.event_type === "media") {
        transitionBaseScreen("view-media", () => {
            updateMediaContent(data.source, data.title, data.body);
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
    if (mockMode) return;

    transitionBaseScreen("view-idle", () => {
        const idleEl = document.querySelector('.idle-pulse');
        idleEl.innerText = "CONNECTION LOST";
        idleEl.className = "idle-pulse brand-youtube"; 
        idleEl.style.animation = "none";
    });
};

renderVariantPicker();
if (mockMode) renderMockState(mockState);
