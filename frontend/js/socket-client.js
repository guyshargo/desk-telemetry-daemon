import { showNotification, transitionBaseScreen, updateMediaContent } from './ui-renderer.js';
import { isMockMode } from './dev-tools.js';

export function initSocketClient() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
        if (isMockMode()) return;

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
        if (isMockMode()) return;

        transitionBaseScreen("view-idle", () => {
            const idleEl = document.querySelector('.idle-pulse');
            idleEl.innerText = "CONNECTION LOST";
            idleEl.className = "idle-pulse brand-youtube"; 
            idleEl.style.animation = "none";
        });
    };

    return socket;
}
