import { start as startCloud, stop as stopCloud } from './effects/cloudy.js';
import { start as startRain, stop as stopRain } from './effects/rain.js';
import { start as startSnow, stop as stopSnow } from './effects/snow.js';
import { start as startStorm, stop as stopStorm } from './effects/storm.js';
import { start as startFog, stop as stopFog } from './effects/fog.js';

const weatherVariants = [
    "clear-day",
    "clear-night",
    "cloudy",
    "foggy",
    "rainy",
    "snowy",
    "stormy"
];

export function getWeatherVariant(weatherCode, isDay, cloudCover = 0) {
    if (weatherCode >= 95) return "stormy"; // 95, 96, 99: Thunderstorms
    if (weatherCode >= 85) return "snowy";  // 85–86: Snow showers
    if (weatherCode >= 80) return "rainy";  // 80–82: Rain showers
    if (weatherCode >= 70) return "snowy";  // 71–77: Snowfall & snow grains
    if (weatherCode >= 50) return "rainy";  // 51–67: Drizzle & rain
    if (weatherCode >= 40) return "foggy";  // 45, 48: Fog

    if (weatherCode === 3 || cloudCover > 60) return "cloudy";

    return isDay ? "clear-day" : "clear-night";
}

function stopAllWeatherEffects() {
    stopRain();
    stopSnow();
    stopStorm();
    stopFog();
    stopCloud();
}

function syncWeatherEffect(variant) {
    stopAllWeatherEffects();

    if (variant === "cloudy") {
        startCloud();
    } else if (variant === "rainy") {
        startRain();
    } else if (variant === "snowy") {
        startSnow();
    } else if (variant === "stormy") {
        startStorm();
    } else if (variant === "foggy") {
        startFog();
    }
}

export function setTimeOfDay(isDay) {
    const timeOfDay = isDay ? "day" : "night";
    if (document.body.dataset.timeOfDay === timeOfDay) return;

    document.body.dataset.timeOfDay = timeOfDay;
    document.dispatchEvent(new CustomEvent("weatherchange", {
        detail: {
            weather: document.body.dataset.weather,
            timeOfDay
        }
    }));
}

let manualOverride = false;

export function setWeatherVariant(variant, isDay = null, isManual = false) {
    if (!weatherVariants.includes(variant)) {
        console.warn(`Unknown weather variant: ${variant}`);
        return;
    }

    if (isManual) {
        manualOverride = true;
    }

    document.body.dataset.weather = variant;
    syncWeatherEffect(variant);

    if (typeof isDay === "boolean") {
        setTimeOfDay(isDay);
    } else if (variant === "clear-day" || variant === "clear-night") {
        setTimeOfDay(variant === "clear-day");
    }

    document.dispatchEvent(new CustomEvent("weatherchange", {
        detail: {
            weather: variant,
            timeOfDay: document.body.dataset.timeOfDay || (variant.includes("night") ? "night" : "day")
        }
    }));
}

export function updateWeather(weatherData) {
    if (manualOverride) return;

    const isDay = weatherData.is_day === 1;
    const variant = getWeatherVariant(
        weatherData.weather_code,
        isDay,
        weatherData.cloud_cover
    );

    setWeatherVariant(variant, isDay, false);
}
