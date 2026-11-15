const weatherVariants = [
    "clear-day",
    "clear-night",
    "cloudy",
    "foggy",
    "rainy",
    "snowy",
    "stormy"
];

function getWeatherVariant(weatherCode, isDay, cloudCover = 0) {
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
    window.RainEffect?.stop();
    window.SnowEffect?.stop();
    window.StormEffect?.stop();
    window.FogEffect?.stop();
    window.CloudEffect?.stop();
}

function syncWeatherEffect(variant) {
    stopAllWeatherEffects();

    if (variant === "cloudy") {
        window.CloudEffect?.start?.();
    } else if (variant === "rainy") {
        window.RainEffect?.start?.();
    } else if (variant === "snowy") {
        window.SnowEffect?.start?.();
    } else if (variant === "stormy") {
        window.StormEffect?.start?.();
    } else if (variant === "foggy") {
        window.FogEffect?.start?.();
    }
}

function setTimeOfDay(isDay) {
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

function setWeatherVariant(variant, isDay = null, isManual = false) {
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

function updateWeather(weatherData) {
    if (manualOverride) return;

    const isDay = weatherData.is_day === 1;
    const variant = getWeatherVariant(
        weatherData.weather_code,
        isDay,
        weatherData.cloud_cover
    );

    setWeatherVariant(variant, isDay, false);
}

// Expose the engine for weather.js and console testing.
window.WeatherEngine = {
    updateWeather,
    setWeatherVariant,
    setTimeOfDay,
    getWeatherVariant
};