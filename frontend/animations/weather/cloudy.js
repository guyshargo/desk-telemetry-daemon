(function () {
    const VIRTUAL_WIDTH = 480;
    const VIRTUAL_HEIGHT = 270;

    let canvas = null;
    let ctx = null;
    let rafId = null;
    let lastTime = 0;
    let clouds = [];

    function initCanvas() {
        canvas = document.getElementById("weather-canvas");
        if (!canvas) return false;
        canvas.width = VIRTUAL_WIDTH;
        canvas.height = VIRTUAL_HEIGHT;
        ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        return true;
    }

    function createCloud(layer, randomX = true) {
        // layer 0 = distant slow cloud bank, layer 1 = closer faster wisp
        const isBack = layer === 0;
        const width = isBack
            ? 110 + Math.floor(Math.random() * 85)
            : 65 + Math.floor(Math.random() * 55);
        const height = isBack
            ? 20 + Math.floor(Math.random() * 10)
            : 11 + Math.floor(Math.random() * 7);

        // Build stepped pixel-art puffs along the top of a flat cloud base
        const puffCount = isBack ? 4 : 3;
        const puffs = [];
        for (let i = 0; i < puffCount; i++) {
            const ratio = (i + 0.5) / puffCount;
            puffs.push({
                offsetX: Math.floor(width * ratio),
                radiusX: Math.floor((width / puffCount) * (0.55 + Math.random() * 0.25)),
                radiusY: Math.floor(height * (0.55 + Math.random() * 0.45))
            });
        }

        return {
            layer,
            x: randomX ? Math.random() * (VIRTUAL_WIDTH + width) - width : -width - Math.random() * 40,
            y: isBack
                ? 8 + Math.floor(Math.random() * 42)
                : 26 + Math.floor(Math.random() * 58),
            width,
            height,
            speed: isBack
                ? 3.2 + Math.random() * 2.2
                : 6.5 + Math.random() * 4.0,
            alpha: isBack ? 0.24 : 0.17,
            puffs
        };
    }

    function populateClouds() {
        clouds = [];
        for (let i = 0; i < 5; i++) clouds.push(createCloud(0, true));
        for (let i = 0; i < 5; i++) clouds.push(createCloud(1, true));
    }

    function drawPixelCloud(cloud) {
        const baseX = Math.round(cloud.x);
        const baseY = Math.round(cloud.y);
        const baseH = Math.max(4, Math.floor(cloud.height * 0.42));

        // 1. Top highlight rim (cool silver-blue)
        ctx.fillStyle = `rgba(210, 224, 240, ${cloud.alpha * 0.65})`;
        for (const puff of cloud.puffs) {
            for (let row = 0; row < puff.radiusY; row += 2) {
                const norm = 1 - row / puff.radiusY;
                const span = Math.floor(puff.radiusX * Math.sqrt(Math.max(0, norm)));
                if (span > 1) {
                    ctx.fillRect(baseX + puff.offsetX - span, baseY - row - 1, span * 2, 1);
                }
            }
        }

        // 2. Main cloud body (soft slate overcast)
        ctx.fillStyle = `rgba(148, 166, 190, ${cloud.alpha})`;
        ctx.fillRect(baseX + 6, baseY, cloud.width - 12, baseH);
        ctx.fillRect(baseX + 2, baseY + 2, cloud.width - 4, Math.max(2, baseH - 2));

        for (const puff of cloud.puffs) {
            for (let row = 0; row < puff.radiusY; row += 2) {
                const norm = 1 - row / puff.radiusY;
                const span = Math.floor(puff.radiusX * Math.sqrt(Math.max(0, norm)));
                if (span > 0) {
                    ctx.fillRect(baseX + puff.offsetX - span, baseY - row, span * 2, 2);
                }
            }
        }

        // 3. Subtle warm underbelly reflecting campfire glow
        ctx.fillStyle = `rgba(235, 175, 125, ${cloud.alpha * 0.42})`;
        ctx.fillRect(baseX + 8, baseY + baseH, cloud.width - 16, 2);
    }

    function renderFrame(now) {
        if (!ctx) return;
        const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
        lastTime = now;

        ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        for (let i = 0; i < clouds.length; i++) {
            const c = clouds[i];
            c.x += c.speed * dt;
            if (c.x > VIRTUAL_WIDTH + 20) {
                clouds[i] = createCloud(c.layer, false);
            }
            drawPixelCloud(clouds[i]);
        }

        rafId = requestAnimationFrame(renderFrame);
    }

    function startClouds() {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (!ctx && !initCanvas()) return;
        stopClouds();
        populateClouds();
        lastTime = performance.now();
        rafId = requestAnimationFrame(renderFrame);
    }

    function stopClouds() {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (ctx) {
            ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        }
    }

    window.CloudEffect = { start: startClouds, stop: stopClouds };
    window.startClouds = startClouds;
    window.stopClouds = stopClouds;
})();