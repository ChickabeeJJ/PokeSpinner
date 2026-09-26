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
- `sw.js` + `manifest.webmanifest` + `icons/` — offline play and install.
  Add any new game file to `SHELL_FILES` in `sw.js`.

## Building
- After adding Tailwind classes in HTML/JS: `npm install` once, then
  `npm run build:css`, and commit `css/tailwind.css`.

## Workflow
- The owner wants every change committed **and pushed to `main`** (fast-forward
  from the working branch), always, without asking.
- Extra scripts/files are welcome when they make the game better; keep the site
  runnable by opening `index.html`.
