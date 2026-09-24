// LiquidGlass — album-art ambient layer.
//
// This is the part of Spicy Lyrics and Wave Player that you actually *see*:
// the cover art blown up, blurred and desaturated into an ambient wash that the
// chrome floats on. Spicy Lyrics does it behind its fullscreen page, Wave
// Player does it behind the PiP card. Neither reaches Spotify's main window, so
// the theme brings it there — that is what makes the three read as one product.
//
// Blur/saturate/brightness are Wave Player's values verbatim (waveplayer.js:636)
// so the main window and the miniplayer wash match exactly.
//
// Deliberately does NOT pin anything to document.head. An earlier version of
// this setup ran two head-pinning MutationObservers that re-appended in
// response to each other, looping forever and leaving Spotify black. One
// element, appended to body once, updated in place.
(async function LiquidGlassAmbient() {
    if (window.__liquidGlassAmbient) return;
    window.__liquidGlassAmbient = true;

    while (!Spicetify?.Player?.data || !Spicetify?.Platform) {
        await new Promise(r => setTimeout(r, 100));
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = document.createElement("div");
    root.id = "lg-ambient";
    // Two stacked layers so a track change can crossfade rather than snap.
    root.innerHTML = '<div class="lg-ambient-layer"></div><div class="lg-ambient-layer"></div>';
    document.body.prepend(root);

    const layers = [...root.children];
    let front = 0;

    function artOf(item) {
        const m = item?.metadata || {};
        return m.image_xlarge_url || m.image_large_url || m.image_url ||
               item?.album?.images?.slice(-1)[0]?.url || null;
    }

    function paint() {
        const url = artOf(Spicetify.Player.data?.item);
        if (!url) return;

        const next = layers[front ^ 1];
        if (next.dataset.url === url) return;

        // Preload, or the crossfade reveals an empty layer mid-transition.
        const img = new Image();
        img.onload = () => {
            next.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`;
            next.dataset.url = url;
            next.style.opacity = "1";
            layers[front].style.opacity = "0";
            front ^= 1;
        };
        img.src = url;
    }

    // Spotify re-uses the same URL scheme for local files it cannot resolve, so
    // a failed load just leaves the previous wash up rather than blanking it.
    Spicetify.Player.addEventListener("songchange", paint);
    paint();

    if (reduced) root.classList.add("lg-reduced");
})();
