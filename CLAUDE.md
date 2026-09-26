# PokeSpinner

Browser Pokémon game: spin a wheel to find wild Pokémon, catch them, and battle
trainers on an Adventure map. Static site, no build step: `index.html` holds the
markup, styles and game code (Tailwind Play CDN, PokéAPI for Pokémon/move data,
sprites from the PokeAPI and Showdown GitHub repos).

## Workflow
- The owner wants every change committed **and pushed to `main`** (fast-forward
  from the working branch), always, without asking.
- Extra scripts/files (e.g. splitting game code into `js/*.js`) are welcome when
  they make the game better; keep the site runnable by opening `index.html`.
