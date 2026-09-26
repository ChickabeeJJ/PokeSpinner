// PokeSpinner — The single mutable game state object.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// Tiny event bus so optional systems (quests, apricorns…) can react to play
const GAME_LISTENERS = [];
function onGameEvent(fn) { GAME_LISTENERS.push(fn); }
function gameEvent(name, data) {
    for (const fn of GAME_LISTENERS) { try { fn(name, data || {}); } catch (e) { console.error('gameEvent', name, e); } }
}

let gameState = {
    coins: 100,
    xp: 0,
    level: 1,
    username: "",
    gymBadges: [],
    balls: { poke: 5, great: 0, ultra: 0, master: 0 },
    language: 'en',
    starterSelected: false,
    solvedGymPuzzles: [],
    pokedex: [],
    pcBox: [],
    team: [],
    selectedBall: 'poke',
    wheel: { spinning: false, currentAngle: 0, spinSpeed: 0, targetRarity: 'Common', pointerPos: 0, lastWedgeAudio: -1 },
    currentEncounter: null,
    encounterShiny: false,
    catchMinigame: { active: false, ringScale: 1.0, contracting: true, score: 0 },
    inventoryItems: { oran_berry: 0, leftovers: 0, choice_band: 0, wise_glasses: 0, antidote: 0, burn_heal: 0, ice_heal: 0, awakening: 0, paralyze_heal: 0, full_heal: 0, full_restore: 0, fire_stone: 0, water_stone: 0, thunder_stone: 0, leaf_stone: 0, ice_stone: 0, dawn_stone: 0, dusk_stone: 0, moon_stone: 0, shiny_stone: 0, assault_vest: 0, exp_share: 0, scope_lens: 0, weakness_policy: 0, life_orb: 0, potion: 0, super_potion: 0, hyper_potion: 0, max_potion: 0, ether: 0, max_ether: 0, elixir: 0, max_elixir: 0, attack_boost: 0, defense_boost: 0, speed_boost: 0, special_boost: 0, ability_capsule: 0, nature_mint: 0, vitamin_a: 0, vitamin_b: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_f: 0 },
    unlockedStages: 1, 
    unlockedRegions: [1],
    profileGenIndex: 0,
    activeBattleStage: null,
    battleType: 'trainers',
    endlessRunDefeats: 0,
    battle: { active: false, bossPokemon: null, fighterPokemon: null, fighterHP: 0, bossHP: 0, fighterMaxHP: 0, bossMaxHP: 0, oranUsed: false, bossOranUsed: false, statStages: { player: {atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0}, boss: {atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0} }, statusConds: { player: null, boss: null } },
    dexUI: { page: 1, pageSize: 9, total: 1025, search: "", rarity: "all" },
    autoBattler: false,
    autoBattlerStage: null,
    tmsOwned: {},
    shinyCharm: false
};
