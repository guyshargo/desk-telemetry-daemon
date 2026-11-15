import { setWeatherVariant } from './weather/weather-engine.js';
import { showNotification, hideNotification, transitionBaseScreen, updateMediaContent } from './ui-renderer.js';

let mockMode = false;
let mockState = null;
const notificationReplayPeriodMs = 4000;
const notificationExitDurationMs = 200;
let notificationPreviewInterval = null;
let notificationPreviewTimeout = null;
let mediaMockInterval = null;
let mediaMockIndex = 0;

const mockStates = ["view-idle", "view-media", "notification-popup"];
const mediaMockExamples = [
    { source: "Spotify", title: "Midnight City", artist: "M83" },
    { source: "YouTube", title: "A Walk", artist: "Tycho" },
    { source: "Twitch", title: "Live: Just Chatting", artist: "shroud" },
    { source: "VLC", title: "Dreams", artist: "Fleetwood Mac" }
];

export function isMockMode() {
    return mockMode;
}

export function getMockState() {
    return mockState;
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

export function setMockState(state) {
    mockMode = true;
    mockState = state;

    const query = new URLSearchParams(window.location.search);
    query.set("__state", state);
    history.pushState(null, "", `${window.location.pathname}?${query}${window.location.hash}`);
    renderMockState(state);
}

export function renderMockState(state) {
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
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            notificationPreviewInterval = setInterval(
                replayMockNotificationEntrance,
                notificationReplayPeriodMs - notificationExitDurationMs
            );
        }
    }
}

export function switchToMockState(state) {
    if (mockStates.includes(state) && state !== mockState) setMockState(state);
}

function syncDevControlsVisibility() {
    const params = new URLSearchParams(window.location.search);
    const isDevMode =
        params.get("dev") === "1" ||
        params.has("__state") ||
        params.has("__weather");

    document.querySelectorAll(".state-switcher, .weather-switcher").forEach((nav) => {
        nav.hidden = !isDevMode;
    });
}

export function updateMockModeFromUrl() {
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

export function renderWeatherSwitcher(activeWeather) {
    document.querySelectorAll(".weather-switcher [data-weather]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.weather === activeWeather));
    });
}

export function initDevTools() {
    syncDevControlsVisibility();

    document.querySelectorAll(".state-switcher [data-state]").forEach((button) => {
        button.addEventListener("click", () => switchToMockState(button.dataset.state));
    });

    document.querySelectorAll(".weather-switcher [data-weather]").forEach((button) => {
        button.addEventListener("click", () => {
            const weather = button.dataset.weather;
            setWeatherVariant(weather, null, true);
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
        syncDevControlsVisibility();
        updateMockModeFromUrl();
    });

    updateMockModeFromUrl();
    if (mockMode) {
        renderMockState(mockState);
    }
}
