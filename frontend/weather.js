
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";
const WEATHER_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

let userCoordinates = null;

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

        window.WeatherEngine.updateWeather(weatherData);

        console.log("Weather updated:", weatherData);
    } catch (error) {
        console.error("Failed to update weather:", error);
    }
}

function initializeWeather() {
    if (!navigator.geolocation) {
        console.warn("Geolocation is not supported by this browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            userCoordinates = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            console.log("User location acquired.");

            await refreshWeather();

            // Refresh weather periodically.
            setInterval(refreshWeather, WEATHER_REFRESH_INTERVAL);
        },
        (error) => {
            console.warn("Could not access user location:", error.message);
        },
        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 30 * 60 * 1000
        }
    );
}

// Initialize after the page has loaded.
document.addEventListener("DOMContentLoaded", initializeWeather);
