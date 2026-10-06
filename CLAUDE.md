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
- **Portal branch** (see the top of this file for which portal). `js/platform.js`
  is the shared portal core; `js/sdk-adapter.js` plugs in this portal's SDK via
  `Portal.use({...})`. The game only calls `Portal.*`: loading/gameplay events,
  `midgameAd()` at natural breaks (after a battle or a Safari trip, cooldown),
  `rewardedAd()` (5 free Poké Balls when out of balls / in the Mart),
  pause+mute during ads and when the tab is hidden, and `Portal.storage`
  (localStorage, mirrored to the portal's cloud save where it has one).
  External links and `data-web-only` parts are hidden in portal builds.
  Package with `bash tools/build-portal.sh` → `dist/pokespinner-<portal>.zip`.
- `sw.js` + `manifest.webmanifest` + `icons/` — offline play and install.
  Add any new game file to `SHELL_FILES` in `sw.js`.

## Building
- After adding Tailwind classes in HTML/JS: `npm install` once, then
  `npm run build:css`, and commit `css/tailwind.css`.

## Workflow
- Branches: `main` is the ad-free fan version (no SDKs, no ads). Each portal has
  its own branch with ads: `crazygames`, `yandex`, `playhop`, `poki`,
  `gamemonetize`. **Never merge a portal branch into `main`.** Commit and push
  portal work to that portal's branch; game fixes go to `main` and are then
  merged into each portal branch.
- Extra scripts/files are welcome when they make the game better; keep the site
  runnable by opening `index.html`.
