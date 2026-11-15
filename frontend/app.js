const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws`;
const socket = new WebSocket(wsUrl);

// State Tracking
let mockMode = false;
let mockState = null;
const notificationReplayPeriodMs = 4000;
const notificationExitDurationMs = 200;
let currentScreen = "view-idle";
let notificationTimeout = null;
let notificationPreviewInterval = null;
let notificationPreviewTimeout = null;
let transitionTimeout = null;
let mediaMockInterval = null;
let mediaUpdateTimeout = null;
let mediaUpdateFrame = null;
let activeBgVideoSrc = "";
const mockStates = ["view-idle", "view-media", "notification-popup"];
const mediaMockExamples = [
    { source: "Spotify", title: "Midnight City", artist: "M83" },
    { source: "YouTube", title: "A Walk", artist: "Tycho" },
    { source: "Twitch", title: "Live: Just Chatting", artist: "shroud" },
    { source: "VLC", title: "Dreams", artist: "Fleetwood Mac" }
];

function updateBackground() {
    const video = document.getElementById("bg-video");
    const source = document.getElementById("bg-video-src");
    if (!video || !source) return;

    const isNight = document.body.dataset.timeOfDay === "night";
    const nextVideo = isNight ? "assets/bonfire_night.mp4" : "assets/bonfire_day.mp4";

    if (nextVideo === activeBgVideoSrc) return;
    activeBgVideoSrc = nextVideo;

    video.style.opacity = 0;
    setTimeout(() => {
        source.src = nextVideo;
        video.load();
        video.play().catch(e => console.warn("Auto-play prevented:", e));
        video.style.opacity = 1;
    }, 200);
}

document.addEventListener("weatherchange", updateBackground);
updateBackground();

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

function renderWeatherSwitcher(activeWeather) {
    document.querySelectorAll(".weather-switcher [data-weather]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.weather === activeWeather));
    });
}

document.querySelectorAll(".weather-switcher [data-weather]").forEach((button) => {
    button.addEventListener("click", () => {
        const weather = button.dataset.weather;
        window.WeatherEngine?.setWeatherVariant(weather, null, true);
        renderWeatherSwitcher(weather);
    });
});

document.addEventListener("weatherchange", (event) => {
    if (event.detail && event.detail.weather) {
        renderWeatherSwitcher(event.detail.weather);
    }
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
        if (focusedStatePicker) {
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
        return;
    }
    else if (event.key.toLowerCase() === "h") {
        const shouldHide = !document.querySelector(".state-switcher").hidden;
        document.querySelector(".state-switcher").hidden = shouldHide;
        const weatherSwitcher = document.querySelector(".weather-switcher");
        if (weatherSwitcher) weatherSwitcher.hidden = shouldHide;
        event.preventDefault();
        return;
    }

    const stateIndex = Number(event.key) - 1;
    if (focusedStatePicker && Number.isInteger(stateIndex) && stateIndex >= 0 && stateIndex < mockStates.length) {
        switchToMockState(mockStates[stateIndex]);
        event.preventDefault();
    }
});

renderWeatherSwitcher(document.body.dataset.weather || "clear-day");

window.addEventListener("popstate", () => {
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

if (mockMode) renderMockState(mockState);
