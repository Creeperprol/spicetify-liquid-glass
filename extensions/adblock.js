// Ad blocking for the Spotify desktop client.
//
// Three layers, because Spotify serves ads through three separate paths:
//
//   1. Product state. The client decides whether to run its ad managers from the
//      `ads` product-state key. Overriding it to "0" makes the client's own
//      toggle switch the audio, video-takeover and display managers off.
//   2. Ad slots. Each placement (preroll, stream, hpto, leaderboard, podcast
//      midrolls...) is a slot in the ads core. Every slot is cleared now and on
//      every event it fires, so anything that does get scheduled is dropped.
//   3. CSS. Whatever display ad still reaches the DOM is hidden.
//
// The APIs are found by shape, not by path. Spotify renames the internals
// between builds; a method like `putOverridesValues` or `clearSlot` survives far
// longer than the object chain that leads to it. Names below were read out of
// build 1.3.5.3058's xpui-modules.js.
//
// No MutationObserver on document.head here: fix-playbar-overlap.js already owns
// the one head-pinned <style>, and a second one black-screens the client (see
// README). The rules below use !important and attribute hooks, so they don't
// need to be last in head to win.
(function adblock() {
  const TAG = "[adblock]";

  // From the slot table in xpui-modules.js.
  const SLOTS = [
    "preroll", "stream", "hpto", "leaderboard",
    "embedded-npv", "embedded-playlist", "embedded-playlist-leavebehind",
    "podcast-preroll", "podcast-postroll",
    "podcast-midroll-1", "podcast-midroll-2", "podcast-midroll-3",
    "podcast-midroll-4", "podcast-midroll-5",
    "podcast-creator-sponsorship-1", "podcast-creator-sponsorship-2",
  ];

  const CSS = `
    [data-testid="home-ads-container"],
    [data-testid="home-ad-card"],
    [data-testid="embedded-ad"],
    [data-testid="embedded-ad-carousel"],
    [data-testid="canvas-ad-container"],
    [data-testid="ad-companion-card"],
    [data-testid="ads-video-player-npv"],
    [data-testid="video-player-ad-wrapper"],
    [data-testid="standalone-video-ad-player"],
    [data-testid="survey-ad"],
    [data-testid="leavebehind-advertiser"],
    [data-testid="upsell-download-app-button"] {
      display: none !important;
    }
  `;

  function injectCss() {
    if (!document.head) { setTimeout(injectCss, 100); return; }
    if (document.getElementById("adblock-css")) return;
    const el = document.createElement("style");
    el.id = "adblock-css";
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  // Depth-limited search for the first object that has every named method.
  function findByMethods(root, methods, depth = 4, seen = new WeakSet()) {
    if (!root || typeof root !== "object" || seen.has(root) || depth < 0) return null;
    seen.add(root);
    if (methods.every((m) => typeof root[m] === "function")) return root;
    for (const key of Object.keys(root)) {
      let child;
      try { child = root[key]; } catch { continue; }
      const hit = findByMethods(child, methods, depth - 1, seen);
      if (hit) return hit;
    }
    return null;
  }

  async function overrideProductState(Platform) {
    const productState =
      Platform.UserAPI?._product_state ||
      Platform.UserAPI?._product_state_service ||
      Platform.ProductStateAPI?.productStateApi ||
      findByMethods(Platform, ["putOverridesValues", "subValues"], 3);
    if (!productState) { console.warn(TAG, "product state API not found"); return; }

    const apply = () =>
      productState.putOverridesValues({ pairs: { ads: "0" } })
        .catch((e) => console.warn(TAG, "override failed", e));
    await apply();
    // The server pushes product state again on reconnect; re-assert when it does.
    productState.subValues?.({ keys: ["ads"] }, ({ pairs } = {}) => {
      if (pairs?.ads && pairs.ads !== "0") apply();
    });
  }

  function disableManagers(AdManagers) {
    for (const [name, manager] of Object.entries(AdManagers)) {
      if (typeof manager?.disable !== "function") continue;
      try { manager.disable(); } catch (e) { console.warn(TAG, `disable ${name}`, e); }
    }
    AdManagers.audio?.audioApi?.cosmosConnector?.increaseStreamTime?.(-100000000000);
  }

  function clearSlots(core) {
    for (const slot of SLOTS) {
      const clear = () => Promise.resolve().then(() => core.clearSlot(slot)).catch(() => {});
      clear();
      // Clear only when an ad actually arrives. Clearing fires a slot event of
      // its own, so clearing on every event would feed itself.
      try {
        core.subscribeToSlot(slot, ({ adSlotEvent } = {}) => { if (adSlotEvent?.ad) clear(); });
      } catch { /* slot not created in this build */ }
    }
  }

  async function init() {
    const Platform = window.Spicetify?.Platform;
    if (!Platform?.AdManagers) { setTimeout(init, 300); return; }
    const { AdManagers } = Platform;

    await overrideProductState(Platform);
    disableManagers(AdManagers);

    const core =
      AdManagers.audio?.inStreamApi?.adsCoreConnector ||
      findByMethods(AdManagers, ["clearSlot", "subscribeToSlot"]);
    if (core) clearSlots(core);
    else console.warn(TAG, "ads core connector not found; slots not cleared");

    console.log(TAG, "active");
  }

  injectCss();
  init().catch((e) => console.warn(TAG, e));
})();
