# spicetify-liquid-glass

Running [Wave Player](https://github.com/03x1/Wave-Player) and
[Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics) together under a
[Liquid Glass](https://github.com/MattRvfl/IOS26.EDAWARD) theme, so Spotify's
own chrome, the lyrics page and the miniplayer read as one product.

They do not coexist out of the box. This repo is the glue plus the notes —
including the parts that broke, because those cost more time than the setup.

Verified on **Spicetify 2.45.1 / Spotify 1.3.0.277 / macOS 15**.

---

## The conflict

Both extensions want the same two things.

**The playbar's miniplayer button.** Wave Player takes over
`[data-testid="pip-toggle-button"]` with a capture-phase handler. Spicy Lyrics
*hides* that same button (`display: none`) whenever its Popup Lyrics feature is
on, so it can put its own button there. Wave Player's takeover ends up with
nothing to take over.

**The Document Picture-in-Picture window.** There is exactly one per client.
Both call `requestWindow` on it, and Wave Player force-closes whatever already
holds it, so opening one kills the other.

## The fix: give each surface one owner

Spicy Lyrics owns fullscreen lyrics. Wave Player owns the miniplayer.

One setting does all of it. Turning Spicy Lyrics' Popup Lyrics off means it
stops hiding `pip-toggle-button`, which hands that button to Wave Player, drops
Spicy's popup button from the playbar, and leaves a single consumer of the PiP
window. [`extensions/wave-spicy-compat.js`](extensions/wave-spicy-compat.js)
writes it once, guarded by a marker key so re-enabling it in Spicy Lyrics'
settings sticks.

```
playbar: [ miniplayer → Wave Player ][ Spicy fullscreen ][ queue ][ device ]
```

## Install

Three upstreams, then two glue files. Nothing upstream is vendored here — see
[Licensing](#licensing).

**1. Wave Player** — `waveplayer.js` into `~/.config/spicetify/Extensions/`.

**2. Spicy Lyrics** — install `builds/v1.1/entrypoint.mjs` as
`Extensions/spicy-lyrics.js`. Prefer this over the Marketplace install; see
[Marketplace installs vanish](#marketplace-installs-vanish-silently). Note it
is only a loader — it fetches the real ~1.4 MB bundle from
`api.spicylyrics.org` at every startup, so it needs network and fails with its
own modal if the service is down. Check with
`curl https://api.spicylyrics.org/version`.

**3. A theme.** [IOS26.EDAWARD](https://github.com/MattRvfl/IOS26.EDAWARD) is
the recommendation — iOS 26 glass, an in-app settings panel, and an album-art
backdrop whose dimming adapts to each cover's measured luminance. Its README
says Windows-only; it works on macOS. [`themes/LiquidGlass`](themes/LiquidGlass)
here is a simpler alternative built from Spicy Lyrics' and Wave Player's own
token files.

**4. The glue** — the files from [`extensions/`](extensions/), then:

```ini
# ~/.config/spicetify/config-xpui.ini
extensions   = adblock.js|fix-playbar-overlap.js|waveplayer.js|wave-spicy-compat.js|spicy-lyrics.js
current_theme = IOS26.EDAWARD
color_scheme  = dark
```

```sh
spicetify apply
```

## Ad blocking

[`extensions/adblock.js`](extensions/adblock.js) is optional and independent of
the rest. It works in three layers, because Spotify serves ads three ways:

1. **Product state.** It overrides the `ads` key to `"0"`. The client then uses
   its own toggle to turn the audio, video-takeover and display ad managers off.
2. **Ad slots.** It clears each placement (`preroll`, `stream`, `hpto`,
   `leaderboard`, the podcast midrolls and the rest) once, then again whenever
   an ad lands in one.
3. **CSS.** Display ads that still reach the page are hidden through their
   `data-testid` hooks (`home-ads-container`, `embedded-ad`, ...).

It finds Spotify's APIs by the methods they have (`putOverridesValues`,
`clearSlot`), not by their path, because the paths change between builds. All
names come from build 1.3.5.3058 on Windows. It does **not** pin its `<style>`
to the end of head, for the reason in the next section. Check it is running in
DevTools (`spicetify enable-devtools`): the console should show
`[adblock] active`.

It hides ads. It does not unlock Premium. Skip limits, shuffle-only mobile
behaviour and audio quality stay as they are.

---

## Gotchas that cost real time

### Two head-pinned observers black-screen Spotify

A common way to keep theme CSS winning is to pin a `<style>` as
`document.head`'s last child with a `MutationObserver` that re-appends it:

```js
new MutationObserver(() => {
  if (document.head.lastElementChild !== el) document.head.appendChild(el);
}).observe(document.head, { childList: true });
```

Fine alone. Add a **second** extension doing the same and they never settle:
each re-append mutates the head and retriggers the other. The loop starves the
renderer and Spotify comes up black — no JS error, nothing in the log.

Keep exactly one such observer per profile. Here all playbar CSS lives in
`fix-playbar-overlap.js`, and `wave-spicy-compat.js` is settings-only.

### Marketplace installs vanish silently

Marketplace injects its extensions from records in the xpui origin's
localStorage. Those records can end up empty, and then the extension simply
stops loading — no error, no missing file, nothing on disk to inspect.

```sh
cd ~/Library/Caches/com.spotify.client/Browser/Local\ Storage/leveldb
strings * | grep -o "marketplace[^ ]*" | sort -u    # empty = nothing installed
```

A file in `Extensions/` is injected by `index.html` itself and cannot be lost
that way:

```sh
grep -o 'extensions/[a-z0-9-]*\.js' \
  /Applications/Spotify.app/Contents/Resources/Apps/xpui/index.html
```

Install natively. That is the whole lesson.

### Spotify's class names rot

Four of twelve `.main-*` selectors in a first pass at the theme did not exist in
build 1.3.0.277 — `main-playPauseButton-button`, `main-contextMenu-menu`,
`main-button-primary`, `main-yourLibraryX-navLink`. Check before writing CSS:

```sh
cd /Applications/Spotify.app/Contents/Resources/Apps/xpui
grep -rl "main-playPauseButton-button" *.js | wc -l     # 0 = gone
```

Prefer `data-testid` and `data-encore-id` hooks, which survive the class-name
hashing: `[data-testid="control-button-playpause"]`,
`[data-encore-id="buttonPrimary"]`.

### A near-stock palette looks like no theme at all

`replace_colors` can be working perfectly and the result still looks untouched,
because the palette is a few points off Spotify's defaults — `#0a0a0c` against
stock `#121212` is not a visible difference. Before blaming the plumbing, check
whether the colours were ever distinct. The tokens that carry the most weight,
by frequency in Spotify's own CSS:

```
649 --spice-text     287 --spice-sidebar    109 --spice-subtext
 79 --spice-card      75 --spice-button-active   67 --spice-main
```

---

## Debugging a client you can't screenshot

Spotify is blocked from screen automation in some setups and writes nothing
useful to `chrome_debug.log`. Guessing from symptoms cost three wrong diagnoses
here — a selector problem, then a palette problem, when the real fault was an
extension not loading at all.

What works: make the client answer. [`tools/probe.js`](tools/probe.js) reads the
live DOM and writes a report to localStorage, which is readable from disk.

```sh
cd ~/Library/Caches/com.spotify.client/Browser/Local\ Storage/leveldb
strings * | grep -o '{"at":"[^}]*}' | tail -1
```

```json
{"themeVar":"64px","spiceMain":"#0A0A0F","backdrop":true,"backdropPainted":true,
 "spicyFullscreen":true,"pipButton":true,"waveLoaded":true,"extraControls":9}
```

That single line settles theme-loaded, script-ran, and which extensions
registered their buttons. Two rules:

1. **Read the real names out of the source you are testing.** A guessed CSS
   variable or class name produces a false negative indistinguishable from a
   real failure. Half the fields in the first version of the probe were wrong
   this way, and the theme got blamed for it.
2. **Wait for the shell to mount.** Other extensions register buttons late;
   probing early reports them missing.

Remove the probe once the setup is confirmed.

---

## Licensing

No upstream code is vendored here, deliberately:

| Project | License | Why not bundled |
|---|---|---|
| [Wave Player](https://github.com/03x1/Wave-Player) | MIT | Redistributable, but kept upstream so it stays current |
| [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics) | AGPL-3.0 | Copyleft — bundling would relicense this repo |
| [IOS26.EDAWARD](https://github.com/MattRvfl/IOS26.EDAWARD) | none stated | No license file, so all rights reserved |

Everything in this repo is MIT. The `themes/LiquidGlass` palette and materials
are derived from the *design tokens* of Spicy Lyrics' `src/css/tokens.css` and
Wave Player's inline styles — the values and the reasoning, not their code.

## Credits

[03x1](https://github.com/03x1) · [Spikerko](https://github.com/Spikerko) ·
[MattRvfl](https://github.com/MattRvfl) · [Spicetify](https://spicetify.app)
