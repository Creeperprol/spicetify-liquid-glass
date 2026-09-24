// Wave Player + Spicy Lyrics coexistence.
//
// Both extensions want the browser's single Document Picture-in-Picture window,
// and both want the playbar's `pip-toggle-button`. Left alone they fight: Spicy
// Lyrics hides that button to put its own Popup Lyrics button there, which
// leaves Wave Player's takeover with nothing to take over, and whichever one
// opens second force-closes the other's window.
//
// The split: Spicy Lyrics owns fullscreen lyrics, Wave Player owns the
// miniplayer. Turning Spicy's Popup Lyrics off gives both of those to a single
// owner and removes the PiP contention entirely.
//
// This file is deliberately settings-only. The matching CSS lives in
// fix-playbar-overlap.js, which pins its <style> to the end of document.head
// with a MutationObserver — a second element doing the same thing would fight
// it forever, mutating head in an unbroken loop, and Spotify never paints.
//
// Must run before Spicy Lyrics reads its settings blob, hence no waiting on
// Spicetify or the DOM. Spicetify injects native extensions ahead of the
// Marketplace bundle that carries Spicy Lyrics, so plain top-level code is
// early enough.
(function arbitrate() {
  const SETTINGS_KEY = "SL:settings";
  // Set once. If you turn Popup Lyrics back on in Spicy Lyrics' settings, that
  // choice sticks — this won't keep stamping over it.
  const MARKER = "wave-spicy-compat:popup-handed-to-waveplayer";

  if (localStorage.getItem(MARKER)) return;

  try {
    const blob = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    blob.popupLyricsAllowed = false;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(blob));
  } catch (e) {
    console.warn("[wave-spicy-compat]", e);
  }
  localStorage.setItem(MARKER, "1");
})();
