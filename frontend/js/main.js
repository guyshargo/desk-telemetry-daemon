import { initializeWeather } from './weather/weather-api.js';
import { initBackground } from './background.js';
import { initSocketClient } from './socket-client.js';
import { initDevTools } from './dev-tools.js';

document.addEventListener("DOMContentLoaded", () => {
    initBackground();
    initSocketClient();
    initDevTools();
    initializeWeather();
});
