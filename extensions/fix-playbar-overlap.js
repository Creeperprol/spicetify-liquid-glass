// Spicy Lyrics ships an oversized (40x40) fullscreen button that bleeds into its
// neighbour in the playbar's right cluster. Normalise it to the row's 32x32 metrics.
(function fixOverlap() {
  if (!document.head) { setTimeout(fixOverlap, 100); return; }
  if (document.getElementById("fix-playbar-overlap")) return;

  const el = document.createElement("style");
  el.id = "fix-playbar-overlap";
  el.textContent = `
    #SpicyLyrics_FullscreenButton,
    #SpicyLyrics_PopupLyricsButton {
      width: 32px !important;
      height: 32px !important;
      min-width: 32px !important;
      min-height: 32px !important;
      flex: 0 0 32px !important;
      padding: 0 !important;
      margin: 0 !important;
      align-self: center !important;
      transform: none !important;
    }
    #SpicyLyrics_PopupLyricsButton { margin-right: 6px !important; }
    #SpicyLyrics_FullscreenButton svg,
    #SpicyLyrics_PopupLyricsButton svg {
      width: 16px !important;
      height: 16px !important;
    }

    /* Wave Player owns the miniplayer button (see wave-spicy-compat.js).
       It sits beside Spicy's 40x40 fullscreen button, so it needs the same
       normalising, and an order that keeps it left of it. */
    .main-nowPlayingBar-extraControls [data-testid="pip-toggle-button"] {
      width: 32px !important;
      height: 32px !important;
      min-width: 32px !important;
      min-height: 32px !important;
      flex: 0 0 32px !important;
      padding: 0 !important;
      align-self: center !important;
      order: 99999 !important;
    }
    .main-nowPlayingBar-extraControls [data-testid="pip-toggle-button"] svg {
      width: 16px !important;
      height: 16px !important;
    }

    /* Give the whole cluster consistent spacing so nothing can touch. */
    .main-nowPlayingBar-right .main-nowPlayingBar-extraControls {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
    }
  `;
  document.head.appendChild(el);

  new MutationObserver(() => {
    if (document.head.lastElementChild !== el) document.head.appendChild(el);
  }).observe(document.head, { childList: true });
})();
