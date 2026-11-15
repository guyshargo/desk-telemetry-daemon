const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;

const CAMPFIRE = { x: 192, y: 196, glowRadius: 92 };
const SIGNBOARD_TOP = { xMin: 294, xMax: 442, y: 117 };
const GROUND_Y_MIN = 214;
const GROUND_Y_MAX = 268;
const STORM_DROP_COUNT = 175;

let canvas = null;
let ctx = null;
let animationId = null;
let drops = [];
let splashes = [];
let activeBolt = null;
let nextStrikeFrames = 120;

function createStormDrop(randomY = false) {
    const foreground = Math.random() > 0.4;
    return {
        x: Math.random() * (VIRTUAL_WIDTH + 90) - 60,
        y: randomY ? Math.random() * VIRTUAL_HEIGHT : -12 - Math.random() * 40,
        vx: foreground ? 1.65 : 1.15,
        vy: foreground ? 6.8 + Math.random() * 1.6 : 5.0 + Math.random() * 1.2,
        length: foreground ? 8 : 6,
        foreground,
        groundY: GROUND_Y_MIN + Math.random() * (GROUND_Y_MAX - GROUND_Y_MIN)
    };
}

function spawnSplash(x, y, warm) {
    if (splashes.length > 60) return;
    splashes.push({
        x: Math.round(x),
        y: Math.round(y),
        age: 0,
        maxAge: 5,
        warm
    });
}

function buildBoltSegments(startX, startY, endY, stepY, spread, canBranch) {
    const segments = [];
    let x = startX;
    let y = startY;

    while (y < endY) {
        const nextY = Math.min(y + stepY, endY);
        const nextX = x + (Math.random() - 0.45) * spread;
        segments.push({ x1: Math.round(x), y1: Math.round(y), x2: Math.round(nextX), y2: Math.round(nextY), main: canBranch });

        if (canBranch && Math.random() < 0.22 && y < endY * 0.75) {
            const branchEndY = y + 25 + Math.random() * 35;
            segments.push(...buildBoltSegments(nextX, nextY, branchEndY, 5, 7, false));
        }

        x = nextX;
        y = nextY;
    }
    return segments;
}

function triggerLightning() {
    const startX = 45 + Math.random() * 200;
    const endY = 125 + Math.random() * 45;
    activeBolt = {
        segments: buildBoltSegments(startX, 0, endY, 6, 9, true),
        age: 0,
        maxAge: 14
    };
    nextStrikeFrames = 200 + Math.floor(Math.random() * 340);
}

function drawPixelLine(x1, y1, x2, y2, thickness) {
    let dx = Math.abs(x2 - x1);
    let dy = Math.abs(y2 - y1);
    let sx = x1 < x2 ? 1 : -1;
    let sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        ctx.fillRect(x1, y1, thickness, 1);
        if (x1 === x2 && y1 === y2) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x1 += sx; }
        if (e2 < dx) { err += dx; y1 += sy; }
    }
}

function getLightningFlashAlpha() {
    if (!activeBolt) return 0;
    const a = activeBolt.age;
    if (a <= 2) return 0.42;
    if (a <= 4) return 0.1;
    if (a <= 6) return 0.34;
    return Math.max(0, 0.25 * (1 - (a - 6) / (activeBolt.maxAge - 6)));
}

function renderFrame() {
    if (!ctx) return;

    const isNight = document.body.dataset.timeOfDay === "night";
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    if (!activeBolt) {
        nextStrikeFrames--;
        if (nextStrikeFrames <= 0) triggerLightning();
    }

    const flashAlpha = getLightningFlashAlpha();
    if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(210, 230, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        const boltAlpha = Math.min(1, flashAlpha * 2.4);
        for (const seg of activeBolt.segments) {
            ctx.fillStyle = seg.main
                ? `rgba(245, 250, 255, ${boltAlpha})`
                : `rgba(175, 210, 255, ${boltAlpha * 0.75})`;
            drawPixelLine(seg.x1, seg.y1, seg.x2, seg.y2, seg.main ? 2 : 1);
        }

        activeBolt.age++;
        if (activeBolt.age > activeBolt.maxAge) {
            activeBolt = null;
        }
    }

    for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        const prevY = drop.y;

        drop.x += drop.vx;
        drop.y += drop.vy;

        const hitSignboard =
            drop.foreground &&
            drop.x >= SIGNBOARD_TOP.xMin &&
            drop.x <= SIGNBOARD_TOP.xMax &&
            prevY < SIGNBOARD_TOP.y &&
            drop.y >= SIGNBOARD_TOP.y &&
            Math.random() < 0.45;

        if (hitSignboard) {
            spawnSplash(drop.x, SIGNBOARD_TOP.y, false);
            drops[i] = createStormDrop(false);
            continue;
        }

        if (drop.y >= drop.groundY) {
            if (drop.foreground && Math.random() < 0.65) {
                const nearFire = Math.hypot(drop.x - CAMPFIRE.x, drop.groundY - CAMPFIRE.y) < CAMPFIRE.glowRadius;
                spawnSplash(drop.x, drop.groundY, nearFire);
            }
            drops[i] = createStormDrop(false);
            continue;
        }

        const nearFire = Math.hypot(drop.x - CAMPFIRE.x, drop.y - CAMPFIRE.y) < CAMPFIRE.glowRadius;
        if (flashAlpha > 0.15) {
            ctx.fillStyle = drop.foreground ? "rgba(235, 245, 255, 0.85)" : "rgba(195, 218, 248, 0.5)";
        } else if (nearFire) {
            ctx.fillStyle = drop.foreground ? "rgba(255, 198, 132, 0.78)" : "rgba(255, 176, 102, 0.45)";
        } else if (isNight) {
            ctx.fillStyle = drop.foreground ? "rgba(165, 200, 238, 0.68)" : "rgba(120, 155, 198, 0.36)";
        } else {
            ctx.fillStyle = drop.foreground ? "rgba(210, 228, 248, 0.76)" : "rgba(175, 200, 228, 0.44)";
        }

        const startX = Math.round(drop.x);
        const startY = Math.round(drop.y);
        for (let step = 0; step < drop.length; step++) {
            const px = startX - Math.floor(step * 0.25);
            const py = startY - step;
            if (py >= 0 && py < VIRTUAL_HEIGHT) {
                ctx.fillRect(px, py, 1, 1);
            }
        }
    }

    for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.age++;
        if (s.age > s.maxAge) {
            splashes.splice(i, 1);
            continue;
        }
        const alpha = (1 - s.age / s.maxAge) * 0.7;
        ctx.fillStyle = s.warm
            ? `rgba(255, 198, 132, ${alpha})`
            : `rgba(205, 228, 248, ${alpha})`;
        const spread = s.age <= 2 ? 1 : 2;
        ctx.fillRect(s.x - spread, s.y - 1, 1, 1);
        ctx.fillRect(s.x + spread, s.y - 1, 1, 1);
    }

    animationId = requestAnimationFrame(renderFrame);
}

export function start() {
    if (animationId !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    canvas = document.getElementById("weather-canvas");
    if (!canvas) return;

    canvas.width = VIRTUAL_WIDTH;
    canvas.height = VIRTUAL_HEIGHT;
    ctx = canvas.getContext("2d");

    drops = Array.from({ length: STORM_DROP_COUNT }, () => createStormDrop(true));
    splashes = [];
    activeBolt = null;
    nextStrikeFrames = 75;

    animationId = requestAnimationFrame(renderFrame);
}

export function stop() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    drops = [];
    splashes = [];
    activeBolt = null;
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}
