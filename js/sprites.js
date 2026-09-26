// PokeSpinner — Sprite and item-art URLs with fallbacks.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// SPRITES — pixel sprites (PokéDoku / main-series look)
// ==========================================
const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const ITEM_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';
const BALL_SLUGS = { poke: 'poke-ball', great: 'great-ball', ultra: 'ultra-ball', master: 'master-ball' };
// Official Poké Ball art (dream-world illustration, or the pixel bag icon)
function ballIconUrl(type, art) { return `${ITEM_BASE}${art ? 'dream-world/' : ''}${BALL_SLUGS[type] || 'poke-ball'}.png`; }
const _ballArt = {};
Object.keys(BALL_SLUGS).forEach(k => { const im = new Image(); im.onload = () => { _ballArt[k] = im; if (typeof drawWheel === 'function') try { drawWheel(); } catch (e) {} }; im.src = ballIconUrl(k, true); });
function pixelSprite(id, shiny) { return `${SPRITE_BASE}${shiny ? 'shiny/' : ''}${id}.png`; }
function artworkSprite(id, shiny) { return `${SPRITE_BASE}other/official-artwork/${shiny ? 'shiny/' : ''}${id}.png`; }
// Ordered candidates for the battle field: animated Showdown sprite →
// static pixel sprite → official artwork. `back` = the player's own
// Pokémon, seen from behind like in the main games.
function battleSpriteCandidates(id, shiny, back) {
    const s = shiny ? 'shiny/' : '';
    const list = [`${SPRITE_BASE}other/showdown/${back ? 'back/' : ''}${s}${id}.gif`, `${SPRITE_BASE}${back ? 'back/' : ''}${s}${id}.png`];
    if (back) list.push(`${SPRITE_BASE}other/showdown/${s}${id}.gif`, `${SPRITE_BASE}${s}${id}.png`);
    list.push(artworkSprite(id, shiny));
    return list;
}
// Global fallback used by <img onerror>: walk the candidate list stored on the element
window._spriteFallback = function(img) {
    const list = (img.dataset.fallbacks || '').split('|').filter(Boolean);
    if (!list.length) { img.onerror = null; img.src = pixelSprite(0); return; }
    img.dataset.fallbacks = list.slice(1).join('|');
    img.src = list[0];
};
function normalizeOwnedSprite(p) {
    if (p && p.id) p.sprite = pixelSprite(p.id, !!p.isShiny);
    return p;
}
