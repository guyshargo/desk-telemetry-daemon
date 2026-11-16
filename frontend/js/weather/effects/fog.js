const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;

let canvas = null;
let ctx = null;
let rafId = null;
let lastTime = 0;
let elapsed = 0;
let wisps = [];
let motes = [];

function initCanvas() {
    canvas = document.getElementById("weather-canvas");
    if (!canvas) return false;
    canvas.width = VIRTUAL_WIDTH;
    canvas.height = VIRTUAL_HEIGHT;
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    return true;
}

function createWisp(layer, randomX = true) {
    const isGround = layer === 2;
    const isFront = layer === 1;

    const w = isGround
        ? 190 + Math.floor(Math.random() * 110)
        : isFront
            ? 140 + Math.floor(Math.random() * 95)
            : 170 + Math.floor(Math.random() * 115);

    const h = isGround
        ? 12 + Math.floor(Math.random() * 6)
        : isFront
            ? 9 + Math.floor(Math.random() * 5)
            : 11 + Math.floor(Math.random() * 6);

    const skew = (Math.random() - 0.5) * 0.35;
    const rows = [];

    for (let dy = 0; dy < h; dy++) {
        const t = (dy + 0.5) / h;
        const profile = Math.pow(Math.sin(t * Math.PI), t > 0.55 ? 0.48 : 0.82);
        const span = Math.max(8, Math.floor(w * profile));
        const center = Math.floor(w * 0.5 + skew * (h * 0.5 - dy) * 3.5);

        const left = center - Math.floor(span * 0.5);
        const right = center + Math.floor(span * 0.5);
        const tipLen = Math.min(Math.floor(span * 0.3), 24);

        rows.push({
            dy,
            left,
            right,
            tipLen,
            fullDither: dy <= 1 || dy >= h - 2
        });
    }

    const baseY = isGround
        ? 212 + Math.floor(Math.random() * 48)
        : isFront
            ? 162 + Math.floor(Math.random() * 82)
            : 132 + Math.floor(Math.random() * 78);

    const speed = isGround
        ? 3.5 + Math.random() * 2.5
        : isFront
            ? 5.5 + Math.random() * 4.0
            : 2.4 + Math.random() * 2.2;

    const alpha = isGround
        ? 0.085 + Math.random() * 0.025
        : isFront
            ? 0.075 + Math.random() * 0.025
            : 0.06 + Math.random() * 0.025;

    return {
        layer,
        x: randomX
            ? Math.random() * (VIRTUAL_WIDTH + w) - w * 0.5
            : -w - Math.random() * 45,
        baseY,
        w,
        h,
        speed,
        bobAmp: isFront ? 1.5 : 1.0,
        bobSpeed: 0.45 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        alpha,
        rows
    };
}

function populateFog() {
    wisps = [];
    for (let i = 0; i < 8; i++) wisps.push(createWisp(0, true));
    for (let i = 0; i < 7; i++) wisps.push(createWisp(1, true));
    for (let i = 0; i < 4; i++) wisps.push(createWisp(2, true));

    motes = [];
    for (let i = 0; i < 20; i++) {
        motes.push({
            x: Math.random() * VIRTUAL_WIDTH,
            y: 140 + Math.random() * 120,
            speedX: 1.8 + Math.random() * 3.2,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.14 + Math.random() * 0.16
        });
    }
}

function drawWisp(wisp) {
    const wx = Math.round(wisp.x);
    const wy = Math.round(wisp.baseY + Math.sin(elapsed * wisp.bobSpeed + wisp.phase) * wisp.bobAmp);

    const wispCenterX = wx + wisp.w * 0.5;
    const distFromFire = Math.abs(wispCenterX - VIRTUAL_WIDTH * 0.5);
    const warmth = Math.max(0, 1 - distFromFire / 165);

    const r = Math.round(168 + warmth * 76);
    const g = Math.round(194 - warmth * 4);
    const b = Math.round(216 - warmth * 78);

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${wisp.alpha.toFixed(3)})`;

    for (const row of wisp.rows) {
        const y = wy + row.dy;
        if (y < 0 || y >= VIRTUAL_HEIGHT) continue;

        const startX = wx + row.left;
        const endX = wx + row.right;

        if (row.fullDither) {
            for (let px = startX; px < endX; px++) {
                if (((px + y) & 1) === 0) {
                    ctx.fillRect(px, y, 1, 1);
                }
            }
        } else {
            const coreStart = startX + row.tipLen;
            const coreEnd = endX - row.tipLen;

            for (let px = startX; px < coreStart; px++) {
                if (((px + y) & 1) === 0) {
                    ctx.fillRect(px, y, 1, 1);
                }
            }

            if (coreEnd > coreStart) {
                ctx.fillRect(coreStart, y, coreEnd - coreStart, 1);
            }

            for (let px = coreEnd; px < endX; px++) {
                if (((px + y) & 1) === 0) {
                    ctx.fillRect(px, y, 1, 1);
                }
            }
        }
    }
}

function renderFrame(now) {
    if (!ctx) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    elapsed += dt;

    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    for (let i = 0; i < wisps.length; i++) {
        const w = wisps[i];
        w.x += w.speed * dt;
        if (w.x > VIRTUAL_WIDTH + 30) {
            wisps[i] = createWisp(w.layer, false);
        }
        drawWisp(wisps[i]);
    }

    for (const m of motes) {
        m.x += m.speedX * dt;
        if (m.x > VIRTUAL_WIDTH + 4) m.x = -4;
        const mx = Math.round(m.x);
        const my = Math.round(m.y + Math.sin(elapsed * 0.9 + m.phase) * 1.5);

        const warmth = Math.max(0, 1 - Math.abs(mx - VIRTUAL_WIDTH * 0.5) / 145);
        const r = Math.round(195 + warmth * 60);
        const g = Math.round(212 - warmth * 18);
        const b = Math.round(228 - warmth * 95);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${m.alpha})`;
        ctx.fillRect(mx, my, 1, 1);
    }

    rafId = requestAnimationFrame(renderFrame);
}

export function start() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!ctx && !initCanvas()) return;
    stop();
    populateFog();
    lastTime = performance.now();
    rafId = requestAnimationFrame(renderFrame);
}

export function stop() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    if (ctx) {
        ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    }
}
