let currentScreen = "view-idle";
let notificationTimeout = null;
let transitionTimeout = null;
let mediaUpdateTimeout = null;
let mediaUpdateFrame = null;

export function getCurrentScreen() {
    return currentScreen;
}

export function setCurrentScreen(screen) {
    currentScreen = screen;
}

export function getBrandClass(source) {
    const s = (source || "").toLowerCase();
    if (s.includes("spotify")) return "brand-spotify";
    if (s.includes("youtube")) return "brand-youtube";
    if (s.includes("twitch")) return "brand-twitch";
    if (s.includes("whatsapp")) return "brand-whatsapp";
    if (s.includes("vlc")) return "brand-vlc";
    return "brand-default";
}

export function updateMediaContent(source, title, artist) {
    const screen = document.getElementById("view-media");
    const content = screen.querySelector(".media-content");
    const sourceEl = document.getElementById("media-source");
    const updateContent = () => {
        const cleanTitle = (title || "").trim();

        sourceEl.innerText = source;
        sourceEl.className = `source-label ${getBrandClass(source)}`;
        document.getElementById("media-title").innerText = cleanTitle;
        document.getElementById("media-artist").innerText = artist;

        content.classList.toggle("is-short-title", cleanTitle.length > 0 && cleanTitle.length <= 18);
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

export function transitionBaseScreen(newScreenId, updateDOMCallback, immediate = false) {
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

export function hideNotification() {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
    document.getElementById('notification-popup').classList.remove('show');
}

export function showNotification(source, title, body) {
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
