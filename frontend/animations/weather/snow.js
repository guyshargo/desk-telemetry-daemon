(() => {
    const VIRTUAL_WIDTH = 480;
    const VIRTUAL_HEIGHT = 270;

    const CAMPFIRE = { x: 192, y: 196, glowRadius: 95 };
    const SIGNBOARD_TOP = { xMin: 294, xMax: 442, y: 117 };
    const GROUND_Y_MIN = 214;
    const GROUND_Y_MAX = 268;
    const SNOWFLAKE_COUNT = 95;

    let canvas = null;
    let ctx = null;
    let animationId = null;
    let flakes = [];
    let settled = [];
    let tick = 0;

    function createFlake(randomY = false) {
        const foreground = Math.random() > 0.55;
        return {
            x: Math.random() * (VIRTUAL_WIDTH + 30) - 15,
            y: randomY ? Math.random() * VIRTUAL_HEIGHT : -4 - Math.random() * 20,
            vy: foreground ? 0.8 + Math.random() * 0.45 : 0.42 + Math.random() * 0.3,
            wind: foreground ? 0.28 : 0.16,
            swayAmp: foreground ? 0.45 : 0.25,
            swaySpeed: 0.02 + Math.random() * 0.02,
            phase: Math.random() * Math.PI * 2,
            size: foreground ? 2 : 1,
            groundY: GROUND_Y_MIN + Math.random() * (GROUND_Y_MAX - GROUND_Y_MIN)
        };
    }

    function addSettledSnow(x, y) {
        if (settled.length > 85) return;
        const distToFire = Math.hypot(x - CAMPFIRE.x, y - CAMPFIRE.y);
        // Snow melts immediately too close to the fire
        if (distToFire < 46) return;

        settled.push({
            x: Math.round(x),
            y: Math.round(y),
            width: Math.random() > 0.5 ? 2 : 1,
            age: 0,
            maxAge: distToFire < CAMPFIRE.glowRadius ? 90 : 240
        });
    }

    function getFlakeColor(x, y, foreground, isNight) {
        const dist = Math.hypot(x - CAMPFIRE.x, y - CAMPFIRE.y);
        if (dist < CAMPFIRE.glowRadius) {
            return foreground ? "rgba(255, 214, 165, 0.9)" : "rgba(255, 195, 135, 0.65)";
        }
        if (isNight) {
            return foreground ? "rgba(220, 235, 255, 0.85)" : "rgba(180, 205, 238, 0.55)";
        }
        return foreground ? "rgba(255, 255, 255, 0.92)" : "rgba(235, 245, 255, 0.65)";
    }

    function renderFrame() {
        if (!ctx) return;
        tick++;

        const isNight = document.body.dataset.timeOfDay === "night";
        ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        // Draw settled pixel snow specks
        for (let i = settled.length - 1; i >= 0; i--) {
            const s = settled[i];
            s.age++;
            if (s.age > s.maxAge) {
                settled.splice(i, 1);
                continue;
            }
            const alpha = (1 - s.age / s.maxAge) * 0.7;
            ctx.fillStyle = isNight
                ? `rgba(215, 232, 252, ${alpha})`
                : `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(s.x, s.y - 1, s.width, 1);
        }

        // Update and draw falling snowflakes
        for (let i = 0; i < flakes.length; i++) {
            const f = flakes[i];
            const prevY = f.y;

            f.y += f.vy;
            f.x += f.wind + Math.sin(tick * f.swaySpeed + f.phase) * f.swayAmp;

            if (f.x > VIRTUAL_WIDTH + 10) f.x = -10;
            if (f.x < -10) f.x = VIRTUAL_WIDTH + 10;

            const hitSignboard =
                f.size === 2 &&
                f.x >= SIGNBOARD_TOP.xMin &&
                f.x <= SIGNBOARD_TOP.xMax &&
                prevY < SIGNBOARD_TOP.y &&
                f.y >= SIGNBOARD_TOP.y &&
                Math.random() < 0.3;

            if (hitSignboard) {
                addSettledSnow(f.x, SIGNBOARD_TOP.y);
                flakes[i] = createFlake(false);
                continue;
            }

            if (f.y >= f.groundY) {
                if (f.size === 2 && Math.random() < 0.4) {
                    addSettledSnow(f.x, f.groundY);
                }
                flakes[i] = createFlake(false);
                continue;
            }

            ctx.fillStyle = getFlakeColor(f.x, f.y, f.size === 2, isNight);
            ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size);
        }

        animationId = requestAnimationFrame(renderFrame);
    }

    function startSnow() {
        if (animationId !== null) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        canvas = document.getElementById("weather-canvas");
        if (!canvas) return;

        canvas.width = VIRTUAL_WIDTH;
        canvas.height = VIRTUAL_HEIGHT;
        ctx = canvas.getContext("2d");

        flakes = Array.from({ length: SNOWFLAKE_COUNT }, () => createFlake(true));
        settled = [];
        tick = 0;

        animationId = requestAnimationFrame(renderFrame);
    }

    function stopSnow() {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        flakes = [];
        settled = [];
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    window.SnowEffect = { start: startSnow, stop: stopSnow };
})();