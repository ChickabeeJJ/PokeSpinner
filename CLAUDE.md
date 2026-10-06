# PokeSpinner

Browser Pokémon game: spin a wheel to find wild Pokémon, catch them, battle
trainers on an Adventure map, run Safari Zone trips and daily quests. Static
site, no bundler — open `index.html` or serve the folder.

## Layout
- `index.html` — markup only; loads the CSS and the scripts in order.
- `css/tailwind.css` — pre-built Tailwind utilities (generated, committed).
- `css/game.css` — the cartoon theme, battle scene and every view.
- `css/features.css` — weather, quests, Safari Zone, Kurt's Workshop.
- `js/*.js` — classic scripts sharing one global scope, loaded in the order
  listed in `index.html` (data → state → systems → views → `main.js` boot).
  Top-level `let`/`const`/`function` in one file are visible to the others,
  so avoid names that clash with browser globals (e.g. `AudioContext`).
  - `features.js` — weather, daily quests, apricorns/Kurt's Workshop, Safari Zone.
    Other systems hook in through `gameEvent(name, data)` / `onGameEvent(fn)`
    (defined in `state.js`): events `spin`, `catch`, `battleWin`, `craft`.
  - `data-types.js` — species ids by type (generated from PokéAPI).
  - `world.js` — the animated background (time-of-day sky, weather, flyers).
  - `translate.js` — live translation: code and markup stay in English and the
    page is translated as it renders, using `js/lang/<code>.js` packs (official
    PokéAPI names + UI phrases). Build packs with `python3 tools/i18n/build.py`;
    add/modify phrases in `tools/i18n/phrases/*.tsv` (en + 8 languages, `{x}`
    placeholders, `{n}` = number). Keep new UI text as whole English sentences
    so they can be matched. Keep game data (Pokémon names) in English.
- Full-screen overlays must live directly under `<body>` (panels use
  backdrop-filter, which traps `position: fixed`); `battle.js` hoists them.
- Non-commercial fan project: **no ads or monetisation** anywhere (no AdSense,
  no portal ads). The "Buy me a coffee" links (`data-coffee`) stay visible.
- `platform.js` (first script, in `<head>`) — web vs. CrazyGames. On CrazyGames
  it loads SDK v3 for loading/gameplay events, `happytime` and saves via
  `Portal.storage`; it never requests ads. `tools/build-crazygames.sh` packages it.
- `sw.js` + `manifest.webmanifest` + `icons/` — offline play and install.
  Add any new game file to `SHELL_FILES` in `sw.js`.

## Building
- After adding Tailwind classes in HTML/JS: `npm install` once, then
  `npm run build:css`, and commit `css/tailwind.css`.

## Workflow
- The owner wants every change committed **and pushed to `main`** (fast-forward
  from the working branch), always, without asking.
- Portal builds with ads live on their own branches: `crazygames`, `yandex`,
  `playhop`, `poki`, `gamemonetize` (shared core `js/platform.js` + per-portal
  `js/sdk-adapter.js`; package with `bash tools/build-portal.sh`). **Never merge
  them into `main`.** Game fixes made on `main` should be merged into each of them.
- Extra scripts/files are welcome when they make the game better; keep the site
  runnable by opening `index.html`.
