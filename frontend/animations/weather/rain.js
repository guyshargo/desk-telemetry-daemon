const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;

// Scene landmarks in virtual coordinates (480x270)
const CAMPFIRE = { x: 192, y: 196, glowRadius: 92 };
const SIGNBOARD_TOP = { xMin: 294, xMax: 442, y: 117 };
const GROUND_Y_MIN = 214;
const GROUND_Y_MAX = 268;
const RAINDROP_COUNT = 115;

let rainCanvas = null;
let rainCtx = null;
let rainAnimationId = null;
let raindrops = [];
let splashes = [];

function createRaindrop(randomY = false) {
    const foreground = Math.random() > 0.45;
    return {
        x: Math.random() * (VIRTUAL_WIDTH + 40) - 20,
        y: randomY ? Math.random() * VIRTUAL_HEIGHT : -10 - Math.random() * 40,
        vx: foreground ? 0.65 : 0.4,
        vy: foreground ? 5.2 + Math.random() * 1.4 : 3.6 + Math.random() * 1.0,
        length: foreground ? 6 : 4,
        foreground,
        groundY: GROUND_Y_MIN + Math.random() * (GROUND_Y_MAX - GROUND_Y_MIN)
    };
}

function spawnSplash(x, y, warm) {
    if (splashes.length > 45) return;
    splashes.push({
        x: Math.round(x),
        y: Math.round(y),
        age: 0,
        maxAge: 6,
        warm
    });
}

function getDropColor(x, y, foreground, isNight) {
    const dist = Math.hypot(x - CAMPFIRE.x, y - CAMPFIRE.y);

    // Drops near the bonfire catch orange light
    if (dist < CAMPFIRE.glowRadius) {
        return foreground ? "rgba(255, 198, 132, 0.78)" : "rgba(255, 176, 102, 0.45)";
    }

    if (isNight) {
        return foreground ? "rgba(175, 208, 242, 0.62)" : "rgba(130, 165, 205, 0.34)";
    }
    return foreground ? "rgba(220, 236, 252, 0.72)" : "rgba(185, 210, 235, 0.42)";
}

function drawRaindrop(drop, isNight) {
    rainCtx.fillStyle = getDropColor(drop.x, drop.y, drop.foreground, isNight);
    const startX = Math.round(drop.x);
    const startY = Math.round(drop.y);
    const shiftX = drop.vx > 0.5 ? 1 : 0;

    for (let step = 0; step < drop.length; step++) {
        const px = startX - (step > drop.length / 2 ? shiftX : 0);
        const py = startY - step;
        if (py >= 0 && py < VIRTUAL_HEIGHT) {
            rainCtx.fillRect(px, py, 1, 1);
        }
    }
}

function updateRaindrops(isNight) {
    for (let i = 0; i < raindrops.length; i++) {
        const drop = raindrops[i];
        const prevY = drop.y;

        drop.x += drop.vx;
        drop.y += drop.vy;

        const hitSignboard =
            drop.foreground &&
            drop.x >= SIGNBOARD_TOP.xMin &&
            drop.x <= SIGNBOARD_TOP.xMax &&
            prevY < SIGNBOARD_TOP.y &&
            drop.y >= SIGNBOARD_TOP.y &&
            Math.random() < 0.35;

        if (hitSignboard) {
            spawnSplash(drop.x, SIGNBOARD_TOP.y, false);
            raindrops[i] = createRaindrop(false);
            continue;
        }

        if (drop.y >= drop.groundY) {
            if (drop.foreground && Math.random() < 0.55) {
                const nearFire = Math.hypot(drop.x - CAMPFIRE.x, drop.groundY - CAMPFIRE.y) < CAMPFIRE.glowRadius;
                spawnSplash(drop.x, drop.groundY, nearFire);
            }
            raindrops[i] = createRaindrop(false);
            continue;
        }

        drawRaindrop(drop, isNight);
    }
}

function updateSplashes() {
    for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.age++;
        if (s.age > s.maxAge) {
            splashes.splice(i, 1);
            continue;
        }

        const alpha = (1 - s.age / s.maxAge) * 0.65;
        rainCtx.fillStyle = s.warm
            ? `rgba(255, 198, 132, ${alpha})`
            : `rgba(205, 228, 248, ${alpha})`;

        const spread = s.age <= 2 ? 1 : 2;
        rainCtx.fillRect(s.x - spread, s.y - 1, 1, 1);
        rainCtx.fillRect(s.x + spread, s.y - 1, 1, 1);
    }
}

function renderRainFrame() {
    if (!rainCtx) return;

    const isNight = document.body.dataset.timeOfDay === "night";
    rainCtx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    updateRaindrops(isNight);
    updateSplashes();

    rainAnimationId = requestAnimationFrame(renderRainFrame);
}

function startRain() {
    if (rainAnimationId !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    rainCanvas = document.getElementById("weather-canvas");
    if (!rainCanvas) return;

    rainCanvas.width = VIRTUAL_WIDTH;
    rainCanvas.height = VIRTUAL_HEIGHT;
    rainCtx = rainCanvas.getContext("2d");

    raindrops = [];
    for (let i = 0; i < RAINDROP_COUNT; i++) {
        raindrops.push(createRaindrop(true));
    }
    splashes = [];

    rainAnimationId = requestAnimationFrame(renderRainFrame);
}

function stopRain() {
    if (rainAnimationId !== null) {
        cancelAnimationFrame(rainAnimationId);
        rainAnimationId = null;
    }

    raindrops = [];
    splashes = [];

    if (rainCtx && rainCanvas) {
        rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
    }
}

window.RainEffect = {
    start: startRain,
    stop: stopRain
};