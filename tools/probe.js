// Spicetify state probe — for verifying a setup in a client you cannot screenshot.
//
// Spotify is blocked from macOS screen-recording automation in some setups, and
// its renderer writes nothing useful to chrome_debug.log. This extension asks
// the live DOM the questions you would otherwise answer by looking, and writes
// the answers to localStorage, which IS readable from disk:
//
//   macOS: ~/Library/Caches/com.spotify.client/Browser/Local Storage/leveldb/
//   Linux: ~/.cache/spotify/Browser/Local Storage/leveldb/
//
//   cd "<that path>" && strings * | grep -o '{"at":"[^}]*}' | tail -1
//
// Install:  copy to Extensions/, add to `extensions` in config-xpui.ini,
//           `spicetify apply`, relaunch, read, then REMOVE it again.
//
// Edit the `report` object to ask about whatever you are debugging. The two
// rules that matter:
//
//   1. Read the real names out of the source you are testing. Guessing a CSS
//      variable or class name gives you a false negative that looks exactly
//      like a real failure. Half the fields in the first version of this file
//      were wrong for that reason.
//   2. Wait for the shell to finish mounting. Buttons other extensions add are
//      registered late; probing too early reports them missing.
(async function probe() {
    while (!Spicetify?.Player?.data) await new Promise(r => setTimeout(r, 100));
    await new Promise(r => setTimeout(r, 5000));

    const cs = getComputedStyle(document.documentElement);
    const v  = name => cs.getPropertyValue(name).trim() || "ABSENT";

    const report = {
        at: new Date().toISOString(),

        // Theme: is the stylesheet loaded, and did replace_colors run?
        // Pick a custom property only your theme defines — if it resolves,
        // user.css is live.
        themeVar:  v("--glass-blur"),
        spiceMain: v("--spice-main"),

        // Theme script: did it reach the DOM and paint?
        backdrop:        !!document.getElementById("ios26-backdrop"),
        backdropPainted: [...(document.getElementById("ios26-backdrop")?.children || [])]
                             .some(l => l.style.backgroundImage),

        // Extensions: are their buttons actually registered?
        spicyFullscreen: !!document.getElementById("SpicyLyrics_FullscreenButton"),
        spicyPopup:      !!document.getElementById("SpicyLyrics_PopupLyricsButton"),
        pipButton:       !!document.querySelector('[data-testid="pip-toggle-button"]'),
        waveLoaded:      !!window.__wavePlayerLoaded,
        extraControls:   document.querySelectorAll(".main-nowPlayingBar-extraControls button").length,
    };

    localStorage.setItem("spicetify-probe", JSON.stringify(report));
    console.log("[probe]", report);
})();
