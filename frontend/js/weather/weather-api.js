import { updateWeather } from './weather-engine.js';

const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";
const IP_GEO_URL = "https://get.geojs.io/v1/ip/geo.json";
const WEATHER_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

let userCoordinates = null;
let refreshTimerId = null;

function getBrowserCoordinates() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }),
            (error) => reject(error),
            {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 15 * 60 * 1000
            }
        );
    });
}

async function getIpCoordinates() {
    const response = await fetch(IP_GEO_URL);
    if (!response.ok) {
        throw new Error(`IP geolocation error: ${response.status}`);
    }

    const data = await response.json();
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw new Error("IP geolocation returned invalid coordinates.");
    }

    return { latitude, longitude };
}

async function resolveCoordinates() {
    try {
        return await getBrowserCoordinates();
    } catch (error) {
        console.warn("Browser geolocation unavailable, resolving via IP:", error.message);
        return await getIpCoordinates();
    }
}

async function fetchWeather(latitude, longitude) {
    const params = new URLSearchParams({
        latitude: latitude,
        longitude: longitude,
        current: "weather_code,is_day,temperature_2m,cloud_cover,wind_speed_10m",
        timezone: "auto"
    });

    const response = await fetch(`${WEATHER_API_URL}?${params}`);

    if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.current) {
        throw new Error("Weather API returned no current weather data.");
    }

    return data.current;
}

async function refreshWeather() {
    if (!userCoordinates) return;

    try {
        const weatherData = await fetchWeather(
            userCoordinates.latitude,
            userCoordinates.longitude
        );

        updateWeather(weatherData);

        console.log("Weather updated:", weatherData);
    } catch (error) {
        console.error("Failed to update weather:", error);
    }
}

export async function initializeWeather() {
    try {
        userCoordinates = await resolveCoordinates();
        console.log("Coordinates acquired:", userCoordinates);

        await refreshWeather();

        clearInterval(refreshTimerId);
        refreshTimerId = setInterval(refreshWeather, WEATHER_REFRESH_INTERVAL);
    } catch (error) {
        console.error("Failed to initialize weather:", error);
    }
}
