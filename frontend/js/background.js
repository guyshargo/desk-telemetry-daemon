let activeBgVideoSrc = "";

export function updateBackground() {
    const video = document.getElementById("bg-video");
    const source = document.getElementById("bg-video-src");
    if (!video || !source) return;

    const isNight = document.body.dataset.timeOfDay === "night";
    const nextVideo = isNight ? "assets/bonfire_night.mp4" : "assets/bonfire_day.mp4";

    if (nextVideo === activeBgVideoSrc) return;
    activeBgVideoSrc = nextVideo;

    video.style.opacity = 0;
    setTimeout(() => {
        source.src = nextVideo;
        video.load();
        video.play().catch(e => console.warn("Auto-play prevented:", e));
        video.style.opacity = 1;
    }, 200);
}

export function initBackground() {
    document.addEventListener("weatherchange", updateBackground);
    updateBackground();
}
