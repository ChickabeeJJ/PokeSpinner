// PokeSpinner — Types, moves, TMs, spawn pools, held items and save-shape helpers.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// MODULE 1: GLOBAL STATE & CORE CONSTANTS
// ==========================================
let audioMuted = false;
let audioCtx = null;
let nextCatchUid = 1;
let animationFrameId = null; // Used to stop the infinite loop

const TYPES = ["normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
const TYPE_MATCHUPS = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2.0, ice: 2.0, bug: 2.0, rock: 0.5, dragon: 0.5, steel: 2.0 },
    water: { fire: 2.0, water: 0.5, grass: 0.5, ground: 2.0, rock: 2.0, dragon: 0.5 },
    electric: { water: 2.0, electric: 0.5, grass: 0.5, ground: 0, flying: 2.0, dragon: 0.5 },
    grass: { fire: 0.5, water: 2.0, grass: 0.5, poison: 0.5, ground: 2.0, flying: 0.5, bug: 0.5, rock: 2.0, dragon: 0.5, steel: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2.0, ice: 0.5, ground: 2.0, flying: 2.0, dragon: 2.0, steel: 0.5 },
    fighting: { normal: 2.0, ice: 2.0, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2.0, ghost: 0, dark: 2.0, steel: 2.0, fairy: 0.5 },
    poison: { grass: 2.0, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2.0 },
    ground: { fire: 2.0, electric: 2.0, grass: 0.5, poison: 2.0, flying: 0, bug: 0.5, rock: 2.0, steel: 2.0 },
    flying: { electric: 0.5, grass: 2.0, fighting: 2.0, bug: 2.0, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2.0, poison: 2.0, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2.0, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2.0, ghost: 0.5, dark: 2.0, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2.0, ice: 2.0, fighting: 0.5, ground: 0.5, flying: 2.0, bug: 2.0, steel: 0.5 },
    ghost: { normal: 0, psychic: 2.0, ghost: 2.0, dark: 0.5 },
    dragon: { dragon: 2.0, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2.0, ghost: 2.0, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2.0, rock: 2.0, steel: 0.5, fairy: 2.0 },
    fairy: { fire: 0.5, fighting: 2.0, poison: 0.5, dragon: 2.0, dark: 2.0, steel: 0.5 }
};

const MOVES_DB = {
    tackle: { type: "normal", power: 40, category: "physical" },
    scratch: { type: "normal", power: 40, category: "physical" },
    "quick-attack": { type: "normal", power: 40, category: "physical" },
    bite: { type: "dark", power: 60, category: "physical" },
    "flamethrower": { type: "fire", power: 90, category: "special" },
    "ember": { type: "fire", power: 40, category: "special" },
    "hydro-pump": { type: "water", power: 110, category: "special" },
    "water-gun": { type: "water", power: 40, category: "special" },
    "surf": { type: "water", power: 90, category: "special" },
    "solar-beam": { type: "grass", power: 120, category: "special" },
    "vine-whip": { type: "grass", power: 45, category: "physical" },
    "thunderbolt": { type: "electric", power: 90, category: "special" },
    "spark": { type: "electric", power: 65, category: "physical" },
    "ice-beam": { type: "ice", power: 90, category: "special" },
    "psychic": { type: "psychic", power: 90, category: "special" },
    "earthquake": { type: "ground", power: 100, category: "physical" },
    "rock-slide": { type: "rock", power: 75, category: "physical" },
    "wing-attack": { type: "flying", power: 60, category: "physical" },
    "shadow-ball": { type: "ghost", power: 80, category: "special" },
    "dragon-claw": { type: "dragon", power: 80, category: "physical" },
    "outrage": { type: "dragon", power: 120, category: "physical" },
    "iron-tail": { type: "steel", power: 100, category: "physical" },
    "dazzling-gleam": { type: "fairy", power: 80, category: "special" },
    "hyper-beam": { type: "normal", power: 150, category: "special" },
    "razor-leaf": { type: "grass", power: 55, category: "physical" },
    "sleep-powder": { type: "grass", power: 0, category: "status", effect: { target: "foe", status: "sleep" } },
    "leech-seed": { type: "grass", power: 0, category: "status", effect: { target: "foe", status: "leech" } },
    "growl": { type: "normal", power: 0, category: "status", effect: { target: "foe", stat: "atk", stages: -1 } },
    "tail-whip": { type: "normal", power: 0, category: "status", effect: { target: "foe", stat: "def", stages: -1 } },
    "bubble": { type: "water", power: 40, category: "special" },
    "withdraw": { type: "water", power: 0, category: "status", effect: { target: "self", stat: "def", stages: 1 } },
    "rapid-spin": { type: "normal", power: 50, category: "physical" },
    "metal-claw": { type: "steel", power: 50, category: "physical" },
    "leer": { type: "normal", power: 0, category: "status", effect: { target: "foe", stat: "def", stages: -1 } },
    "smokescreen": { type: "normal", power: 0, category: "status", effect: { target: "foe", stat: "accuracy", stages: -1 } },
    "dragon-rage": { type: "dragon", power: 40, category: "special" },
    "slash": { type: "normal", power: 70, category: "physical" },
    "thunder-shock": { type: "electric", power: 40, category: "special" },
    "thunder-wave": { type: "electric", power: 0, category: "status", effect: { target: "foe", status: "para" } },
    "double-kick": { type: "fighting", power: 60, category: "physical" },
    "poison-sting": { type: "poison", power: 15, category: "physical" },
    "fury-attack": { type: "normal", power: 45, category: "physical" },
    "peck": { type: "flying", power: 35, category: "physical" },
    "gust": { type: "flying", power: 40, category: "special" },
    "sand-attack": { type: "ground", power: 0, category: "status", effect: { target: "foe", stat: "accuracy", stages: -1 } },
    "confusion": { type: "psychic", power: 50, category: "special" },
    "string-shot": { type: "bug", power: 0, category: "status", effect: { target: "foe", stat: "speed", stages: -2 } },
    "bug-bite": { type: "bug", power: 60, category: "physical" },
    "harden": { type: "normal", power: 0, category: "status", effect: { target: "self", stat: "def", stages: 1 } },
    "mud-slap": { type: "ground", power: 20, category: "special" },
    "water-pulse": { type: "water", power: 60, category: "special" },
    "flame-wheel": { type: "fire", power: 60, category: "physical" },
    "rollout": { type: "rock", power: 30, category: "physical" },
    "defense-curl": { type: "normal", power: 0, category: "status", effect: { target: "self", stat: "def", stages: 1 } },
    "magnitude": { type: "ground", power: 50, category: "physical" },
    "body-slam": { type: "normal", power: 85, category: "physical" },
    "take-down": { type: "normal", power: 90, category: "physical" },
    "wrap": { type: "normal", power: 15, category: "physical" },
    "acid": { type: "poison", power: 40, category: "special" },
    "sludge-bomb": { type: "poison", power: 90, category: "special" },
    "mega-drain": { type: "grass", power: 40, category: "special" },
    "stun-spore": { type: "grass", power: 0, category: "status", effect: { target: "foe", status: "para" } },
    "absorb": { type: "grass", power: 20, category: "special" },
    "zen-headbutt": { type: "psychic", power: 80, category: "physical" },
    "aerial-ace": { type: "flying", power: 60, category: "physical" },
    "crunch": { type: "dark", power: 80, category: "physical" },
    "twister": { type: "dragon", power: 40, category: "special" },
    "aqua-tail": { type: "water", power: 90, category: "physical" },
    "headbutt": { type: "normal", power: 70, category: "physical" },
    "disable": { type: "normal", power: 0, category: "status", effect: { target: "foe", stat: "speed", stages: -1 } },
    "hypnosis": { type: "psychic", power: 0, category: "status", effect: { target: "foe", status: "sleep" } },
    "lick": { type: "ghost", power: 30, category: "physical" },
    "low-kick": { type: "fighting", power: 50, category: "physical" },
    "karate-chop": { type: "fighting", power: 50, category: "physical" },
    "seismic-toss": { type: "fighting", power: 60, category: "physical" },
    "rest": { type: "psychic", power: 0, category: "status", effect: { target: "self", heals: "full" } },
    "amnesia": { type: "psychic", power: 0, category: "status", effect: { target: "self", stat: "spAtk", stages: 2 } },
    "pound": { type: "normal", power: 40, category: "physical" },
    "sing": { type: "normal", power: 0, category: "status", effect: { target: "foe", status: "sleep" } },
    "double-slap": { type: "normal", power: 45, category: "physical" },
    "covet": { type: "normal", power: 60, category: "physical" },
    "swift": { type: "normal", power: 60, category: "special" },
    "charm": { type: "fairy", power: 0, category: "status", effect: { target: "foe", stat: "atk", stages: -2 } },
    "moonblast": { type: "fairy", power: 95, category: "special" },
    "disarming-voice": { type: "fairy", power: 40, category: "special" },
    "power-gem": { type: "rock", power: 80, category: "special" },
    "ancient-power": { type: "rock", power: 60, category: "special" },
    "night-shade": { type: "ghost", power: 50, category: "special" },
    "hex": { type: "ghost", power: 65, category: "special" },
    "sucker-punch": { type: "dark", power: 70, category: "physical" },
    "play-rough": { type: "fairy", power: 90, category: "physical" },
    "iron-head": { type: "steel", power: 80, category: "physical" },
    "flash-cannon": { type: "steel", power: 80, category: "special" },
    "poison-jab": { type: "poison", power: 80, category: "physical" },
    "cross-poison": { type: "poison", power: 70, category: "physical" },
    "x-scissor": { type: "bug", power: 80, category: "physical" },
    "signal-beam": { type: "bug", power: 75, category: "special" },
    "fly": { type: "flying", power: 90, category: "physical" },
    "brave-bird": { type: "flying", power: 120, category: "physical" },
    "drill-peck": { type: "flying", power: 80, category: "physical" },
    "dig": { type: "ground", power: 80, category: "physical" },
    "bulldoze": { type: "ground", power: 60, category: "physical" },
    "bone-rush": { type: "ground", power: 50, category: "physical" },
    "rock-throw": { type: "rock", power: 50, category: "physical" },
    "rock-blast": { type: "rock", power: 50, category: "physical" },
    "psybeam": { type: "psychic", power: 65, category: "special" },
    "aurora-beam": { type: "ice", power: 65, category: "special" },
    "icy-wind": { type: "ice", power: 55, category: "special" },
    "ice-shard": { type: "ice", power: 40, category: "physical" },
    "blizzard": { type: "ice", power: 110, category: "special" },
    "fire-spin": { type: "fire", power: 35, category: "special" },
    "fire-fang": { type: "fire", power: 65, category: "physical" },
    "fire-punch": { type: "fire", power: 75, category: "physical" },
    "flame-charge": { type: "fire", power: 50, category: "physical" },
    "thunder-fang": { type: "fire", power: 65, category: "physical" },
    "thunder": { type: "electric", power: 110, category: "special" },
    "discharge": { type: "electric", power: 80, category: "special" },
    "electro-ball": { type: "electric", power: 60, category: "special" },
    "nuzzle": { type: "electric", power: 20, category: "physical" },
    "feint-attack": { type: "dark", power: 60, category: "physical" },
    "fury-swipes": { type: "normal", power: 36, category: "physical" },
    "pay-day": { type: "normal", power: 40, category: "physical" },
    "power-whip": { type: "grass", power: 120, category: "physical" },
    "seed-bomb": { type: "grass", power: 80, category: "physical" },
    "giga-drain": { type: "grass", power: 75, category: "special" },
    "energy-ball": { type: "grass", power: 90, category: "special" },
    "sludge": { type: "poison", power: 65, category: "special" },
    "mud-bomb":     { type: "ground",  power: 65, category: "special" },
    // ── Additional battle moves ──────────────────────────────────────────
    "confuse-ray":  { type: "ghost",   power: 0,  category: "status", effect: { target: "foe", status: "confuse" } },
    "sweet-kiss":   { type: "fairy",   power: 0,  category: "status", effect: { target: "foe", status: "confuse" } },
    "supersonic":   { type: "normal",  power: 0,  category: "status", effect: { target: "foe", status: "confuse" } },
    "flatter":      { type: "dark",    power: 0,  category: "status", effect: { target: "foe", status: "confuse" } },
    "swagger":      { type: "normal",  power: 0,  category: "status", effect: { target: "foe", status: "confuse" } },
    "hurricane":    { type: "flying",  power: 110, category: "special" },
    "air-slash":    { type: "flying",  power: 75,  category: "special" },
    "darkpulse":    { type: "dark",    power: 80,  category: "special" },
    "foul-play":    { type: "dark",    power: 95,  category: "physical" },
    "night-slash":  { type: "dark",    power: 70,  category: "physical" },
    "u-turn":       { type: "bug",     power: 70,  category: "physical" },
    "megahorn":     { type: "bug",     power: 120, category: "physical" },
    "leech-life":   { type: "bug",     power: 80,  category: "physical" },
    "scald":        { type: "water",   power: 80,  category: "special" },
    "waterfall":    { type: "water",   power: 80,  category: "physical" },
    "close-combat": { type: "fighting", power: 120, category: "physical" },
    "drain-punch":  { type: "fighting", power: 75,  category: "physical" },
    "aura-sphere":  { type: "fighting", power: 80,  category: "special" },
    "mach-punch":   { type: "fighting", power: 40,  category: "physical" },
    "superpower":   { type: "fighting", power: 120, category: "physical" },
    "shadow-claw":  { type: "ghost",   power: 70,  category: "physical" },
    "shadow-sneak": { type: "ghost",   power: 40,  category: "physical" },
    "poltergeist":  { type: "ghost",   power: 110, category: "physical" },
    "heat-wave":    { type: "fire",    power: 95,  category: "special" },
    "overheat":     { type: "fire",    power: 130, category: "special" },
    "dragon-pulse": { type: "dragon",  power: 85,  category: "special" },
    "draco-meteor": { type: "dragon",  power: 130, category: "special" },
    "flash":        { type: "normal",  power: 0,   category: "status", effect: { target: "foe", stat: "accuracy", stages: -1 } },
    "reflect":      { type: "psychic", power: 0,   category: "status", effect: { target: "self", stat: "def", stages: 1 } },
    "light-screen": { type: "psychic", power: 0,   category: "status", effect: { target: "self", stat: "spDef", stages: 1 } },
    "dragon-dance": { type: "dragon",  power: 0,   category: "status", effect: { target: "self", multiStat: [{stat:"atk",stages:1},{stat:"speed",stages:1}] } },
    "quiver-dance": { type: "bug",     power: 0,   category: "status", effect: { target: "self", multiStat: [{stat:"spAtk",stages:1},{stat:"spDef",stages:1},{stat:"speed",stages:1}] } },
    "shell-smash":  { type: "normal",  power: 0,   category: "status", effect: { target: "self", multiStat: [{stat:"atk",stages:2},{stat:"spAtk",stages:2},{stat:"speed",stages:2}] } },
    "work-up":      { type: "normal",  power: 0,   category: "status", effect: { target: "self", multiStat: [{stat:"atk",stages:1},{stat:"spAtk",stages:1}] } },
    "iron-defense": { type: "steel",   power: 0,   category: "status", effect: { target: "self", stat: "def", stages: 2 } },
    "acid-armor":   { type: "poison",  power: 0,   category: "status", effect: { target: "self", stat: "def", stages: 2 } },
    "roost":        { type: "flying",  power: 0,   category: "status", effect: { target: "self", heals: "half" } },
    "recover":      { type: "normal",  power: 0,   category: "status", effect: { target: "self", heals: "half" } },
    "synthesis":    { type: "grass",   power: 0,   category: "status", effect: { target: "self", heals: "half" } },
    "morning-sun":  { type: "normal",  power: 0,   category: "status", effect: { target: "self", heals: "half" } },
    "moonlight":    { type: "fairy",   power: 0,   category: "status", effect: { target: "self", heals: "half" } },
    "geomancy":     { type: "fairy",   power: 0,   category: "status", effect: { target: "self", multiStat: [{stat:"spAtk",stages:2},{stat:"spDef",stages:2},{stat:"speed",stages:2}] } },
    "metal-sound":  { type: "steel",   power: 0,   category: "status", effect: { target: "foe", stat: "spDef", stages: -2 } },
    "taunt":        { type: "dark",    power: 0,   category: "status", effect: { target: "foe", stat: "spAtk", stages: -1 } },
    "encore":       { type: "normal",  power: 0,   category: "status", effect: { target: "foe", stat: "speed", stages: -1 } },
    "throat-chop":  { type: "dark",    power: 80,  category: "physical" },
    "flip-turn":    { type: "water",   power: 60,  category: "physical" },
    "lunge":        { type: "bug",     power: 80,  category: "physical" },
    "headlong-rush":{ type: "ground",  power: 100, category: "physical" },
    "scale-shot":   { type: "dragon",  power: 60,  category: "physical" },
    "meteor-beam":  { type: "rock",    power: 120, category: "special" },
    "stone-edge":   { type: "rock",    power: 100, category: "physical" },
    "smart-strike": { type: "steel",   power: 70,  category: "physical" },
    "sunsteel-strike":{ type: "steel", power: 100, category: "physical" },
    "moongeist-beam":{ type: "ghost",  power: 100, category: "special" },
    "thunderous-kick":{ type: "fighting",power:90, category: "physical" },
    "surging-strikes":{ type: "water", power: 25,  category: "physical" },
    "glacial-lance":{ type: "ice",     power: 120, category: "physical" },
    "astral-barrage":{ type: "ghost",  power: 120, category: "special" },
    "wicked-blow":  { type: "dark",    power: 80,  category: "physical" },
    "spirit-break": { type: "fairy",   power: 75,  category: "physical" },
    // ── Setup / Status TM moves ──────��─��─────────────────────────────────
    "calm-mind":    { type: "psychic",  power: 0,  category: "status", effect: { target: "self",  multiStat: [{stat:"spAtk",stages:1},{stat:"spDef",stages:1}] } },
    "swords-dance": { type: "normal",   power: 0,  category: "status", effect: { target: "self",  stat: "atk",   stages: 2 } },
    "nasty-plot":   { type: "dark",     power: 0,  category: "status", effect: { target: "self",  stat: "spAtk", stages: 2 } },
    "bulk-up":      { type: "fighting", power: 0,  category: "status", effect: { target: "self",  multiStat: [{stat:"atk",stages:1},{stat:"def",stages:1}] } },
    "agility":      { type: "psychic",  power: 0,  category: "status", effect: { target: "self",  stat: "speed", stages: 2 } },
    "toxic":        { type: "poison",   power: 0,  category: "status", effect: { target: "foe",   status: "poison" } },
    "will-o-wisp":  { type: "fire",     power: 0,  category: "status", effect: { target: "foe",   status: "burn" } },
    "screech":      { type: "normal",   power: 0,  category: "status", effect: { target: "foe",   stat: "def",   stages: -2 } },
    "charm":        { type: "fairy",    power: 0,  category: "status", effect: { target: "foe",   stat: "atk",   stages: -2 } },
    "cotton-spore": { type: "grass",    power: 0,  category: "status", effect: { target: "foe",   stat: "speed", stages: -2 } },
    "tickle":       { type: "normal",   power: 0,  category: "status", effect: { target: "foe",   multiStat: [{stat:"atk",stages:-1},{stat:"def",stages:-1}] } }
};

// ==========================================
// TECHNICAL MACHINE DATABASE
// ==========================================
const TM_DB = {
    tm01: { num:'01', name:'Body Slam',    move:'body-slam',    type:'normal',   power:85,  cost:700,  desc:'A full-body tackle. 30% chance to paralyze the target.' },
    tm02: { num:'02', name:'Dragon Claw',  move:'dragon-claw',  type:'dragon',   power:80,  cost:700,  desc:'Rakes with sharp dragon claws. Reliable damage.' },
    tm03: { num:'03', name:'Water Pulse',  move:'water-pulse',  type:'water',    power:60,  cost:400,  desc:'Attacks with a pulsing wave of water. May confuse.' },
    tm04: { num:'04', name:'Aerial Ace',   move:'aerial-ace',   type:'flying',   power:60,  cost:400,  desc:'A swift aerial attack that never misses.' },
    tm05: { num:'05', name:'Flamethrower', move:'flamethrower', type:'fire',     power:90,  cost:800,  desc:'Shoots a stream of fire. May burn the target.' },
    tm06: { num:'06', name:'Thunderbolt',  move:'thunderbolt',  type:'electric', power:90,  cost:800,  desc:'A strong electric blast. May paralyze the target.' },
    tm07: { num:'07', name:'Ice Beam',     move:'ice-beam',     type:'ice',      power:90,  cost:800,  desc:'A frigid beam of ice. May freeze the target.' },
    tm08: { num:'08', name:'Earthquake',   move:'earthquake',   type:'ground',   power:100, cost:1000, desc:'A powerful tremor hits all adjacent foes.' },
    tm09: { num:'09', name:'Psychic',      move:'psychic',      type:'psychic',  power:90,  cost:800,  desc:'A telekinetic blast. May lower the foe\'s Sp. Def.' },
    tm10: { num:'10', name:'Shadow Ball',  move:'shadow-ball',  type:'ghost',    power:80,  cost:700,  desc:'Hurls a shadowy blob. May lower the foe\'s Sp. Def.' },
    tm11: { num:'11', name:'Energy Ball',  move:'energy-ball',  type:'grass',    power:90,  cost:800,  desc:'Draws on nature\'s power. May lower foe\'s Sp. Def.' },
    tm12: { num:'12', name:'Sludge Bomb',  move:'sludge-bomb',  type:'poison',   power:90,  cost:800,  desc:'Unsanitary sludge attack. May poison the target.' },
    tm13: { num:'13', name:'Dig',          move:'dig',          type:'ground',   power:80,  cost:600,  desc:'Burrows underground, then strikes the next turn.' },
    tm14: { num:'14', name:'Rock Slide',   move:'rock-slide',   type:'rock',     power:75,  cost:600,  desc:'Drops large boulders. May cause flinching.' },
    tm15: { num:'15', name:'Surf',         move:'surf',         type:'water',    power:90,  cost:800,  desc:'A powerful wave attack that hits all nearby foes.' },
    tm16: { num:'16', name:'Fly',          move:'fly',          type:'flying',   power:90,  cost:700,  desc:'Soars high, then strikes on the following turn.' },
    tm17: { num:'17', name:'Poison Jab',   move:'poison-jab',   type:'poison',   power:80,  cost:600,  desc:'Stabs with a poisonous spike. May poison.' },
    tm18: { num:'18', name:'Iron Head',    move:'iron-head',    type:'steel',    power:80,  cost:700,  desc:'Slams with a hard metallic head. May flinch.' },
    tm19: { num:'19', name:'Flash Cannon', move:'flash-cannon', type:'steel',    power:80,  cost:700,  desc:'Gathers and fires light. May lower Sp. Def.' },
    tm20: { num:'20', name:'Discharge',    move:'discharge',    type:'electric', power:80,  cost:600,  desc:'A burst of electricity. May paralyze nearby foes.' },
    tm21: { num:'21', name:'Thunder',      move:'thunder',      type:'electric', power:110, cost:1000, desc:'A brutal lightning strike. May paralyze. 70% accurate.' },
    tm22: { num:'22', name:'Seed Bomb',    move:'seed-bomb',    type:'grass',    power:80,  cost:600,  desc:'Hurls a barrage of seeds. Direct and reliable.' },
    tm23: { num:'23', name:'Aqua Tail',    move:'aqua-tail',    type:'water',    power:90,  cost:700,  desc:'Strikes with a powerful water-coated tail.' },
    tm24: { num:'24', name:'Outrage',      move:'outrage',      type:'dragon',   power:120, cost:1200, desc:'Rampages 2-3 turns at full power, then confused.' },
    tm25: { num:'25', name:'Solar Beam',   move:'solar-beam',   type:'grass',    power:120, cost:1200, desc:'Charges one turn, then fires a blazing beam of light.' },
    tm26: { num:'26', name:'Calm Mind',    move:'calm-mind',    type:'psychic',  power:0,   cost:900,  desc:'Quietly focuses the mind. Raises Sp. Atk and Sp. Def by 1.' },
    tm27: { num:'27', name:'Swords Dance', move:'swords-dance', type:'normal',   power:0,   cost:800,  desc:'A frenetic dance. Sharply raises the user\'s Attack by 2.' },
    tm28: { num:'28', name:'Nasty Plot',   move:'nasty-plot',   type:'dark',     power:0,   cost:800,  desc:'Thinks bad thoughts. Sharply raises the user\'s Sp. Atk by 2.' },
    tm29: { num:'29', name:'Bulk Up',      move:'bulk-up',      type:'fighting', power:0,   cost:800,  desc:'Bulks up the body. Raises the user\'s Attack and Defense by 1.' },
    tm30: { num:'30', name:'Agility',      move:'agility',      type:'psychic',  power:0,   cost:700,  desc:'Relaxes the body. Sharply raises the user\'s Speed by 2 stages.' },
    tm31: { num:'31', name:'Toxic',        move:'toxic',        type:'poison',   power:0,   cost:600,  desc:'Poisons the target. Poison damage stacks each turn.' },
    tm32: { num:'32', name:'Will-O-Wisp',  move:'will-o-wisp',  type:'fire',     power:0,   cost:600,  desc:'Shoots a sinister flame that inflicts a burn on the target.' },
    tm33: { num:'33', name:'Screech',      move:'screech',      type:'normal',   power:0,   cost:500,  desc:'An earsplitting screech that harshly lowers the foe\'s Defense by 2.' }
};

// Additional TM compatibility (Pokemon that can learn by TM but not by level-up in this game)
// Legendaries 143-151, 243-251 now have LEVELUP_MOVES so many moves auto-detect;
// entries here cover TMs whose move is NOT in those level-up tables.
const LEGENDARY_ALL = [143,144,145,146,149,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386,480,481,482,483,484,485,487,488,490,491,492,493];
const TM_COMPAT = {
    'tm01': [19,21,25,27,29,32,35,37,39,43,46,48,52,56,58,63,66,79,86,88,96,100,102,104,109,111,114,116,118,120,133,137,142,143,147,150,151,152,155,158,175,179,243,244,245,246,249,250,252,255,258,280,304,328,371,374,387,390,393,443,447,495,498,501,633,650,653,656,704,722,725,728,810,813,816,885,906,909,912],
    'tm02': [4,16,23,41,116,131,142,147,149,150,151,246,328,371,374,443,633,704,782,885],
    'tm03': [7,54,60,72,79,86,90,98,116,118,120,131,147,150,151,152,155,158,179,245,249,258,280,328,371,393,501,656,704,728,816,912],
    'tm04': [16,21,27,41,43,46,48,52,56,84,100,116,120,137,142,147,149,150,151,152,175,252,255,280,374,390,393,447,495,633,650,653,656,722,725,728,810,813],
    'tm05': [4,37,58,77,109,131,146,150,151,155,179,244,246,250,255,258,371,387,390,443,495,498,633,650,653,722,725,810,813,906,909],
    'tm06': [25,63,79,81,86,100,131,133,137,142,143,147,150,151,152,155,179,243,245,246,249,252,280,374,387,447,495,633,650,656,704,722,810,885],
    'tm07': [7,54,60,72,79,86,90,98,116,118,120,131,144,147,149,150,151,152,155,158,179,245,249,252,258,280,328,371,393,443,501,656,704,728,816,912],
    'tm08': [27,50,58,74,79,100,108,111,118,129,131,143,147,149,150,151,246,258,304,328,349,371,374,387,383,443,447,495,633,650,704,782,810],
    'tm09': [48,54,60,63,79,92,96,102,120,131,133,137,142,147,150,151,175,179,243,246,249,250,251,280,374,447,495,633,650,653,656,704,722,725,728,810],
    'tm10': [48,54,63,79,92,96,102,133,137,142,150,151,243,244,249,252,280,374,447,633,650,653,656,704,722,725,728,810],
    'tm11': [1,43,46,48,69,102,104,108,114,131,133,150,151,152,175,251,252,280,387,390,393,495,633,650,704,722,810,906],
    'tm12': [23,29,32,43,69,72,88,98,109,114,131,150,151,246,252,328,387,495,650,704],
    'tm13': [27,50,74,100,104,111,131,143,149,150,151,246,258,304,328,387,443,447,495,633,704,782],
    'tm14': [74,104,111,118,131,142,147,149,150,151,246,304,328,349,371,374,387,443,633,704,782,810],
    'tm15': [7,54,60,72,79,86,90,98,116,118,120,129,131,143,144,147,149,150,151,152,155,158,179,245,249,258,280,349,393,443,501,633,656,704,728,816,885],
    'tm16': [16,21,41,63,84,116,120,131,137,142,144,145,146,147,149,150,151,252,255,280,374,393,447,495,633,650,653,656,704,722,810],
    'tm17': [23,29,32,43,69,72,88,98,109,114,150,151,246,252,304,328,387,495,650,704],
    'tm18': [74,81,100,104,111,131,142,143,149,150,151,246,304,328,349,371,374,387,443,633,704,782,810,885],
    'tm19': [74,81,100,104,111,131,137,143,149,150,151,246,304,328,349,371,374,443,704,782,810,885],
    'tm20': [25,81,100,133,137,143,145,147,150,151,175,179,243,252,280,374,447,633,704,810],
    'tm21': [25,81,100,131,133,137,143,145,147,150,151,175,179,243,252,280,374,447,633,704,810,885],
    'tm22': [1,46,69,102,104,108,114,131,150,151,152,175,251,252,280,387,390,393,495,633,650,704,722,810,906],
    'tm23': [7,54,60,72,79,86,90,98,116,118,120,129,131,147,149,150,151,152,158,245,258,349,393,501,656,728,816],
    'tm24': [4,16,23,41,116,131,142,147,149,150,151,246,328,371,374,443,633,704,782,885],
    'tm25': [1,43,46,48,69,102,104,114,131,146,150,151,152,175,250,251,252,280,387,390,393,495,633,650,704,722,810,906],
    // ── New status TMs ──────────────────────────────────────────────────────
    // TM26 Calm Mind — psychic/special sweepers
    'tm26': [63,64,65,79,80,92,93,94,96,97,120,121,122,124,131,133,144,145,146,147,148,149,150,151,175,196,243,244,245,249,250,251,280,281,374,443,447,495,633,650,653,656,704,722,725,728,810],
    // TM27 Swords Dance — physical attackers
    'tm27': [4,6,19,21,27,52,56,58,66,84,92,104,111,112,118,123,127,128,129,130,131,142,143,147,148,149,150,151,252,255,304,387,390,443,447,495,498,633,650,653,722,810],
    // TM28 Nasty Plot — special attackers / dark types
    'tm28': [52,92,93,94,131,150,151,198,215,228,243,249,251,280,495,650,653,656,704,722,728,810],
    // TM29 Bulk Up — fighting and bulky physical
    'tm29': [56,57,58,66,67,68,106,107,108,143,148,149,150,151,252,255,304,387,390,447,498,632,633,650,810],
    // TM30 Agility — fast or setup-oriented
    'tm30': [25,63,65,81,84,100,116,133,135,145,148,149,150,151,179,243,280,374,443,447,495,633,650,704,722,810,885],
    // TM31 Toxic — wide compatibility (most non-Poison/Steel)
    'tm31': [1,4,7,10,13,16,19,21,23,25,27,29,32,35,37,39,41,43,46,48,50,52,54,56,58,60,63,66,72,74,77,79,81,84,86,88,90,92,96,98,100,102,104,108,109,111,114,116,118,120,129,131,133,137,142,143,144,145,146,147,148,149,150,151,152,155,158,175,179,243,244,245,246,249,250,251,252,255,258,280,304,328,349,371,374,387,390,393,443,447,495,498,501,633,650,653,656,704,722,725,728,810,813,816,885,906,909,912],
    // TM32 Will-O-Wisp — fire types and ghost types
    'tm32': [4,6,37,38,58,77,78,92,93,94,109,110,146,150,151,155,156,157,244,250,255,256,257,390,391,392,495,498,499,500,650,651,652,722,723,724,810,813,814],
    // TM33 Screech — wide compatibility
    'tm33': [10,13,19,21,23,25,27,29,32,37,39,41,43,46,48,52,56,58,60,63,66,72,74,77,79,84,86,88,90,92,96,98,100,104,108,109,111,114,116,118,120,129,131,142,143,147,148,149,150,151,152,155,158,175,179,246,252,255,258,280,304,328,371,387,390,393,443,447,495,498,501,633,650,653,656,704,722,725,728,810,813,816,885,906,909,912]
};

// Maps evolved form ID → direct pre-evolution ID so TM/move checks walk the chain
const PRE_EVO_MAP = {
    // Gen 1 starters
    2:1,   3:2,   5:4,   6:5,   8:7,   9:8,
    // Bugs
    11:10, 12:11, 14:13, 15:14,
    // Birds / misc
    17:16, 18:17, 20:19, 22:21, 24:23,
    // Sandshrew, Nidoran lines
    28:27, 30:29, 31:30, 33:32, 34:33,
    // Clefairy, Vulpix, Jigglypuff (already had some)
    36:35, 38:37, 40:39,
    // Zubat line, Oddish line
    42:41, 44:43, 45:44,
    // Paras, Venonat, Diglett, Meowth, Psyduck, Mankey
    47:46, 49:48, 51:50, 53:52, 55:54, 57:56,
    // Growlithe, Poliwag line
    59:58, 61:60, 62:61,
    // Abra line, Machop line, Bellsprout line
    64:63, 65:64, 67:66, 68:67, 70:69, 71:70,
    // Tentacool, Geodude line
    73:72, 75:74, 76:75,
    // Ponyta, Slowpoke, Magnemite, Doduo
    78:77, 80:79, 82:81, 85:84,
    // Seel, Grimer, Shellder, Gastly line
    87:86, 89:88, 91:90, 93:92, 94:93,
    // Drowzee, Krabby, Voltorb, Exeggcute, Cubone
    97:96, 99:98, 101:100, 103:102, 105:104,
    // Koffing, Rhyhorn, Horsea, Goldeen, Staryu
    110:109, 112:111, 117:116, 119:118, 121:120,
    // Eevee evolutions
    134:133, 135:133, 136:133, 196:133, 197:133, 700:133,
    // Omanyte, Kabuto
    139:138, 141:140,
    // Dragon line
    148:147, 149:148,
    // Gen 2 starters + misc
    153:152, 154:153, 156:155, 157:156, 159:158, 160:159,
    // Togepi, Mareep line
    175:174, 176:175, 180:179, 181:180,
    // Flaaffy→Mareep (already 180:179)
    // Snubbull, Houndour, Larvitar line
    210:209, 229:228, 247:246, 248:247,
    // Ralts line
    281:280, 282:281,
    // Togekiss
    468:175,
    // Gen 3 starters
    253:252, 254:253, 256:255, 257:256, 259:258, 260:259,
    // Beldum line
    375:374, 376:375,
    // Bagon line
    372:371, 373:372,
    // Gen 4 starters
    388:387, 389:388, 391:390, 392:391, 394:393, 395:394,
    // Gible line
    444:443, 445:444,
    // Riolu
    448:447,
    // Gen 5 starters
    496:495, 497:496, 499:498, 500:499, 502:501, 503:502,
    // Deino line
    634:633, 635:634,
    // Gen 6 starters
    651:650, 652:651, 654:653, 655:654, 657:656, 658:657,
    // Gen 7 starters
    723:722, 724:723, 726:725, 727:726, 729:728, 730:729,
    // Jangmo-o line
    783:782, 784:783,
    // Gen 8 starters
    811:810, 812:811, 814:813, 815:814, 817:816, 818:817,
    // Dreepy line
    886:885, 887:886,
    // Gen 9 starters
    907:906, 908:907, 910:909, 911:910, 913:912, 914:913
};

function canLearnTM(pokemon, tmKey) {
    const tm = TM_DB[tmKey];
    if (!tm) return false;
    const moveSlug = tm.move;
    // Official compatibility (any learn method) once the learnset is loaded
    const ls = LEARNSETS[pokemon.id];
    if (ls && ls.all && ls.all.length) return ls.all.includes(moveSlug);
    // Walk the pre-evolution chain (up to 4 steps) so evolved forms inherit compatibility
    let checkId = pokemon.id;
    for (let depth = 0; depth < 4; depth++) {
        const lvlMoves = LEVELUP_MOVES[checkId];
        if (lvlMoves) {
            for (const lvlSet of Object.values(lvlMoves)) {
                if (lvlSet.includes(moveSlug)) return true;
            }
        }
        const extra = TM_COMPAT[tmKey];
        if (extra && extra.includes(checkId)) return true;
        const preEvo = PRE_EVO_MAP[checkId];
        if (!preEvo) break;
        checkId = preEvo;
    }
    return false;
}

const BASIC_POKEMON_POOLS = {
    Common: {
        gen1: [1,4,7,10,13,16,19,21,23,27,29,32,35,37,39,41,43,46,48,50,52,54,56,58,60,63,66,69,72,74,77,79,81,84,86,88,90,92,96,98,100,102,104,108,109,111,114,116,118,120,129,147],
        gen2: [152,155,158,161,163,165,167,170,172,173,174,175,177,179,183,187,190,191,193,194,198,200,204,206,207,209,211,213,214,215,216,218,220,222,223,225,226,228,231,234,235,236,238,239,240,241,246],
        gen3: [252,255,258,261,263,265,270,273,276,278,280,283,285,287,290,293,296,298,299,300,304,307,309,311,312,314,315,316,318,320,322,325,328,331,333,335,336,337,338,339,341,343,345,347,349,351,352,353,355,357,358,359,360,361,363,366],
        gen4: [387,390,393,396,399,401,403,406,408,410,412,415,417,418,420,422,425,427,431,434,436,438,439,440,441,442,443,446,447,449,451,453,455,456,458,459],
        gen5: [495,498,501,504,506,509,511,513,515,517,519,522,524,527,529,531,532,535,538,539,540,543,546,548,550,551,554,556,557,559,561,562,564,566,568,570,572,574,577,580,582,585,587,588,590,592,594,595,597,599,602,605,607,610,613,615,616,618,619,621,622,624,626,627,629,631,632,633],
        gen6: [650,653,656,659,661,664,667,669,672,674,676,677,679,682,684,686,688,690,692,694,696,698,701,702,703,704,707,708,710,712,714],
        gen7: [722,725,728,731,734,736,739,741,742,744,746,747,749,751,753,755,757,759,761,764,765,766,767,769,771,774,775,776,778,779,780,781,782],
        gen8: [810,813,816,819,821,824,827,829,831,833,835,837,840,843,845,846,848,850,852,854,856,859,868,870,871,872,874,875,876,877,878,884,885],
        gen9: [906,909,912,915,917,919,921,924,926,928,931,932,934,935,938,940,941,942,943,944,945,946,947,948,949,950,951,952,953,954,955,956,957]
    },
    Rare: {
        gen1: [1,4,7,25,37,39,58,63,66,79,111,116,133,147],
        gen2: [152,155,158,175,179,194,215,228,246],
        gen3: [252,255,258,280,304,328,349,361,363],
        gen4: [387,390,393,403,443,447,459],
        gen5: [495,498,501,532,610,633],
        gen6: [650,653,656,704],
        gen7: [722,725,728,782],
        gen8: [810,813,816,885],
        gen9: [906,909,912]
    },
    Epic: {
        gen1: [1,4,7,58,63,66,111,131,133,137,142,147],
        gen2: [152,155,158,175,246],
        gen3: [252,255,258,280,304,328,349,371,374],
        gen4: [387,390,393,443,447],
        gen5: [495,498,501,633],
        gen6: [650,653,656,704],
        gen7: [722,725,728,782],
        gen8: [810,813,816,885],
        gen9: [906,909,912]
    },
    Legendary: {
        gen1: [1,4,7,131,137,142,147],
        gen2: [152,155,158,246],
        gen3: [252,255,258,371,374],
        gen4: [387,390,393,443],
        gen5: [495,498,501,633],
        gen6: [650,653,656],
        gen7: [722,725,728],
        gen8: [810,813,816],
        gen9: [906,909,912]
    }
};

// Legendary and Mythical Pokemon List for Special Encounters
const LEGENDARY_MYTHICAL_POKEMON = [
    // Gen 1 Legendaries
    150, 151,  // Mewtwo, Mew
    // Gen 2 Legendaries  
    243, 244, 245, 249, 250, 251,  // Raikou, Entei, Suicune, Lugia, Ho-Oh, Celebi
    // Gen 3 Legendaries
    377, 378, 379, 380, 381, 382, 383, 384, 385, 386,  // Regirock, Regice, Registeel, Latias, Latios, Kyogre, Groudon, Rayquaza, Jirachi, Deoxys
    // Gen 4 Legendaries
    480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493,  // Uxie, Mesprit, Azelf, Dialga, Palkia, Heatran, Regigigas, Giratina, Cresselia, Phione, Manaphy, Darkrai, Shaymin, Arceus
    // Gen 5 Legendaries
    494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649,  // Victini, Cobalion, Terrakion, Virizion, Tornadus, Thundurus, Landorus, Reshiram, Zekrom, Kyurem, Keldeo, Meloetta, Genesect
    // Gen 6 Legendaries
    716, 717, 718, 719, 720, 721,  // Xerneas, Yveltal, Zygarde, Diancie, Hoopa, Volcanion
    // Gen 7 Legendaries
    772, 773, 774, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799,  // Type: Null, Silvally, Tapu Koko, Tapu Lele, Tapu Bulu, Tapu Fini, Cosmog, Cosmoem, Solgaleo, Lunala, Necrozma, Magearna, Marshadow, Zeraora, Meltan, Melmetal
    // Gen 8 Legendaries
    880, 881, 882, 883, 884, 887, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898,  // Zacian, Zamazenta, Eternatus, Kubfu, Urshifu, Zarude, Regieleki, Regidrago, Glastrier, Spectrier, Calyrex, Enamorus, Chien-Pao, Wo-Chien, Ting-Lu, Chi-Yu, Roaring Moon, Iron Valiant
    // Gen 9 Legendaries
    898, 899, 900, 901, 902, 903, 904, 905, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020, 1021, 1022, 1023, 1024, 1025  // Koraidon, Miraidon, Wo-Chien, Chien-Pao, Ting-Lu, Chi-Yu, Roaring Moon, Iron Valiant, Walking Wake, Iron Leaves, Dipplin, Archaludon, Hydrapple, Okidogi, Munkidori, Fezandipiti, Ogerpon, Carmorine, Gouging Fire, Raging Bolt, Iron Boulder, Iron Crown, Iron Jugulis, Iron Moth, Iron Hands, Iron Thorns, Iron Treads, Terapagos, Pecharunt
];

const LEVELUP_MOVES = {
    1: {1:["tackle","growl"],3:["vine-whip"],6:["growl"],9:["leech-seed"],12:["razor-leaf"],15:["sleep-powder"],20:["seed-bomb"],25:["take-down"],32:["solar-beam"]},
    4: {1:["scratch","growl"],4:["ember"],8:["smokescreen"],12:["dragon-rage"],17:["fire-fang"],21:["slash"],25:["flamethrower"],30:["fire-spin"],36:["dragon-claw"]},
    7: {1:["tackle","tail-whip"],3:["water-gun"],6:["withdraw"],9:["bubble"],12:["bite"],15:["rapid-spin"],20:["water-pulse"],25:["aqua-tail"],30:["hydro-pump"]},
    10: {1:["tackle","string-shot"],9:["bug-bite"]},
    13: {1:["poison-sting","string-shot"],9:["bug-bite"],12:["confusion"]},
    16: {1:["tackle","gust"],9:["quick-attack"],13:["twister"],17:["wing-attack"],25:["aerial-ace"],33:["fly"]},
    19: {1:["tackle","tail-whip"],4:["quick-attack"],7:["bite"],10:["fury-swipes"],16:["crunch"],20:["take-down"],24:["sucker-punch"]},
    21: {1:["peck","leer"],5:["fury-attack"],9:["aerial-ace"],13:["quick-attack"],21:["drill-peck"]},
    23: {1:["wrap","leer"],4:["poison-sting"],9:["bite"],12:["acid"],17:["sludge"],20:["crunch"],25:["sludge-bomb"]},
    25: {1:["thunder-shock","growl","tail-whip"],4:["thunder-wave"],8:["nuzzle"],12:["quick-attack"],15:["electro-ball"],20:["spark"],25:["discharge"],30:["thunderbolt"],35:["thunder"]},
    27: {1:["scratch","defense-curl"],3:["sand-attack"],7:["poison-sting"],9:["rollout"],13:["fury-swipes"],17:["slash"],21:["dig"],25:["earthquake"]},
    29: {1:["scratch","growl"],5:["poison-sting"],9:["tail-whip"],13:["double-kick"],17:["bite"],21:["crunch"],25:["poison-jab"]},
    32: {1:["leer","peck"],5:["poison-sting"],9:["double-kick"],13:["fury-attack"],17:["headbutt"],21:["crunch"],25:["poison-jab"]},
    35: {1:["pound","growl"],4:["sing"],8:["double-slap"],12:["disarming-voice"],16:["defense-curl"],20:["take-down"],24:["moonblast"]},
    37: {1:["ember","tail-whip"],4:["quick-attack"],7:["fire-spin"],12:["confuse-ray"],15:["flame-wheel"],20:["flamethrower"]},
    39: {1:["pound","sing"],3:["defense-curl"],5:["disarming-voice"],9:["double-slap"],13:["charm"],17:["body-slam"],21:["play-rough"]},
    41: {1:["absorb","leer"],5:["bite"],9:["wing-attack"],13:["confusion"],17:["swift"],21:["aerial-ace"],25:["crunch"]},
    43: {1:["absorb","growl"],5:["acid"],9:["sleep-powder"],13:["mega-drain"],17:["sludge"],21:["giga-drain"],25:["sludge-bomb"]},
    46: {1:["scratch","absorb"],6:["stun-spore"],11:["fury-swipes"],17:["leech-seed"],22:["slash"],27:["x-scissor"]},
    48: {1:["tackle","disable"],5:["confusion"],9:["absorb"],13:["stun-spore"],17:["psybeam"],21:["sleep-powder"],25:["psychic","signal-beam"]},
    50: {1:["scratch","sand-attack"],4:["growl"],7:["mud-slap"],12:["bulldoze"],15:["slash"],18:["dig"],21:["earthquake"]},
    52: {1:["scratch","growl"],6:["bite"],9:["pay-day"],14:["fury-swipes"],17:["feint-attack"],22:["slash"],25:["play-rough"]},
    54: {1:["scratch","tail-whip"],5:["water-gun"],9:["confusion"],13:["disable"],17:["water-pulse"],21:["zen-headbutt"],25:["aqua-tail"],29:["hydro-pump"]},
    56: {1:["scratch","leer"],5:["low-kick"],9:["fury-swipes"],13:["karate-chop"],17:["seismic-toss"],21:["cross-poison"],25:["take-down"]},
    58: {1:["ember","leer"],4:["bite"],8:["fire-fang"],12:["take-down"],16:["flame-wheel"],20:["crunch"],24:["flamethrower"],28:["play-rough"]},
    60: {1:["water-gun","hypnosis"],5:["bubble"],9:["mud-slap"],13:["body-slam"],17:["water-pulse"],21:["mud-bomb"],25:["hydro-pump"]},
    63: {1:["confusion"],16:["psybeam"],21:["confusion"],26:["psychic"]},
    66: {1:["low-kick","leer"],5:["karate-chop"],9:["seismic-toss"],13:["headbutt"],17:["take-down"],21:["body-slam"],25:["cross-poison"]},
    69: {1:["vine-whip","growl"],7:["wrap"],11:["sleep-powder"],15:["acid"],17:["razor-leaf"],21:["poison-jab"],25:["power-whip"]},
    72: {1:["poison-sting","acid"],5:["wrap"],9:["water-pulse"],13:["acid"],17:["sludge"],21:["hydro-pump"]},
    74: {1:["tackle","defense-curl"],4:["mud-slap"],8:["rock-throw"],12:["magnitude"],16:["rollout"],20:["bulldoze"],24:["rock-slide"],28:["earthquake"]},
    77: {1:["tackle","growl"],4:["ember"],8:["flame-charge"],12:["take-down"],16:["flame-wheel"],20:["fire-spin"],24:["fire-fang"],28:["flamethrower"]},
    79: {1:["tackle","growl"],5:["water-gun"],9:["confusion"],13:["headbutt"],17:["water-pulse"],21:["zen-headbutt"],25:["psychic"],29:["surf"]},
    81: {1:["tackle","thunder-shock"],5:["thunder-wave"],9:["spark"],13:["electro-ball"],17:["flash-cannon"],21:["discharge"],25:["thunderbolt"]},
    84: {1:["peck","growl"],5:["quick-attack"],9:["fury-attack"],13:["aerial-ace"],17:["drill-peck"],21:["take-down"],25:["fly"]},
    86: {1:["headbutt","growl"],5:["icy-wind"],9:["aqua-tail"],13:["ice-shard"],17:["aurora-beam"],21:["take-down"],25:["ice-beam"]},
    88: {1:["pound","poison-sting"],4:["mud-slap"],8:["sludge"],12:["disable"],16:["acid"],20:["sludge-bomb"],24:["crunch"]},
    90: {1:["tackle","withdraw"],8:["icy-wind"],13:["ice-shard"],20:["aurora-beam"],25:["ice-beam"]},
    92: {1:["lick","hypnosis"],5:["confusion"],8:["night-shade"],12:["sucker-punch"],16:["hex"],20:["shadow-ball"],25:["psychic"]},
    96: {1:["pound","hypnosis"],5:["confusion"],9:["headbutt"],13:["psybeam"],17:["zen-headbutt"],21:["psychic"]},
    98: {1:["bubble","leer"],5:["mud-slap"],9:["water-gun"],13:["metal-claw"],17:["water-pulse"],21:["crunch"],25:["aqua-tail"]},
    100: {1:["tackle","thunder-shock"],5:["spark"],9:["electro-ball"],13:["swift"],17:["discharge"],21:["thunderbolt"],25:["thunder"]},
    102: {1:["absorb","hypnosis"],5:["confusion"],9:["stun-spore"],13:["mega-drain"],17:["psybeam"],21:["energy-ball"],25:["solar-beam"]},
    104: {1:["growl","tail-whip"],3:["bone-rush"],7:["headbutt"],11:["leer"],13:["take-down"],17:["dig"],21:["body-slam"],25:["earthquake"]},
    108: {1:["lick","tackle"],5:["wrap"],9:["slam","body-slam"],13:["headbutt"],17:["take-down"],21:["power-whip"]},
    109: {1:["tackle","smokescreen"],4:["poison-sting"],8:["sludge"],12:["fire-spin"],16:["sludge-bomb"],20:["flamethrower"]},
    111: {1:["tackle","tail-whip"],5:["fury-attack"],9:["rock-throw"],13:["bulldoze"],17:["take-down"],21:["rock-slide"],25:["dig"],29:["earthquake"]},
    114: {1:["absorb","vine-whip"],4:["sleep-powder"],8:["mega-drain"],12:["stun-spore"],16:["giga-drain"],20:["seed-bomb"],24:["power-whip"]},
    116: {1:["water-gun","leer"],5:["bubble"],9:["smokescreen"],13:["water-pulse"],17:["twister"],21:["hydro-pump","dragon-claw"]},
    118: {1:["peck","tail-whip"],5:["water-gun"],9:["horn-attack"],13:["fury-attack"],17:["aqua-tail"],21:["waterfall","surf"]},
    120: {1:["tackle","harden"],4:["water-gun"],8:["rapid-spin"],12:["swift"],16:["water-pulse"],20:["power-gem"],24:["psychic"],28:["hydro-pump"]},
    129: {1:["tackle"],15:["tackle"]},
    131: {1:["water-gun","growl"],5:["sing"],9:["ice-shard"],13:["water-pulse"],17:["body-slam"],21:["ice-beam"],25:["surf"],29:["hydro-pump"]},
    133: {1:["tackle","tail-whip","growl"],5:["sand-attack"],9:["quick-attack"],13:["bite"],17:["swift"],20:["take-down"],25:["charm"]},
    137: {1:["tackle","confusion"],5:["psybeam"],9:["swift"],13:["discharge"],17:["psychic"],21:["flash-cannon"]},
    142: {1:["bite","wing-attack"],5:["aerial-ace"],9:["ancient-power"],13:["crunch"],17:["rock-slide"],21:["take-down"],25:["brave-bird"]},
    147: {1:["wrap","leer"],5:["twister"],9:["thunder-wave"],13:["dragon-rage"],17:["slam","body-slam"],21:["aqua-tail"],25:["dragon-claw"],30:["outrage"]},
    152: {1:["tackle","growl"],6:["razor-leaf"],9:["vine-whip"],12:["body-slam"],18:["seed-bomb"],22:["energy-ball"],26:["solar-beam"]},
    155: {1:["tackle","leer"],4:["ember"],8:["smokescreen"],12:["quick-attack"],17:["flame-wheel"],21:["flamethrower"],25:["swift"]},
    158: {1:["scratch","leer"],4:["water-gun"],8:["bite"],12:["ice-fang","ice-shard"],17:["slash"],21:["crunch"],25:["aqua-tail"],29:["hydro-pump"]},
    175: {1:["growl","charm"],5:["pound"],9:["swift"],13:["ancient-power"],17:["dazzling-gleam"],21:["moonblast"]},
    179: {1:["tackle","growl"],4:["thunder-shock"],8:["thunder-wave"],12:["electro-ball"],16:["take-down"],20:["discharge"],24:["thunderbolt"],28:["thunder"]},
    246: {1:["bite","leer"],5:["rock-throw"],9:["mud-slap"],13:["headbutt"],17:["rock-slide"],21:["crunch"],25:["earthquake"]},
    252: {1:["pound","leer"],5:["absorb"],9:["quick-attack"],13:["mega-drain"],17:["slam","body-slam"],21:["energy-ball"],25:["seed-bomb"]},
    255: {1:["scratch","growl"],5:["ember"],9:["sand-attack"],13:["peck"],17:["flame-charge"],21:["slash"],25:["flamethrower"],29:["brave-bird"]},
    258: {1:["tackle","growl"],5:["water-gun"],9:["mud-slap"],13:["headbutt"],17:["take-down"],21:["bulldoze"],25:["surf"],29:["hydro-pump"]},
    280: {1:["growl","confusion"],5:["double-slap"],9:["disarming-voice"],13:["psybeam"],17:["charm"],21:["psychic"],25:["dazzling-gleam"],29:["moonblast"]},
    304: {1:["tackle","harden"],4:["headbutt"],8:["metal-claw"],12:["rock-throw"],16:["iron-head"],20:["take-down"],24:["rock-slide"],28:["iron-tail"]},
    328: {1:["bite","sand-attack"],5:["mud-slap"],9:["bulldoze"],13:["dig"],17:["crunch"],21:["rock-slide"],25:["earthquake"],29:["outrage"]},
    349: {1:["tackle"],15:["tackle"],20:["water-gun"],25:["water-pulse"]},
    371: {1:["ember","bite"],5:["leer"],9:["headbutt"],13:["dragon-rage"],17:["crunch"],21:["dragon-claw"],25:["flamethrower"],30:["outrage"]},
    374: {1:["tackle","confusion"],5:["metal-claw"],9:["take-down"],13:["zen-headbutt"],17:["iron-head"],21:["psychic"],25:["flash-cannon"]},
    387: {1:["tackle","withdraw"],5:["absorb"],9:["razor-leaf"],13:["headbutt"],17:["mega-drain"],21:["leech-seed"],25:["seed-bomb"],29:["earthquake"]},
    390: {1:["scratch","leer"],5:["ember"],9:["fury-swipes"],13:["flame-wheel"],17:["slash"],21:["flamethrower"],25:["fire-spin"]},
    393: {1:["pound","growl"],5:["bubble"],9:["water-gun"],13:["peck"],17:["drill-peck"],21:["water-pulse"],25:["surf"],29:["hydro-pump"]},
    443: {1:["tackle","sand-attack"],5:["dragon-rage"],9:["bulldoze"],13:["take-down"],17:["dig"],21:["slash"],25:["dragon-claw"],29:["earthquake"],33:["outrage"]},
    447: {1:["quick-attack","leer"],5:["low-kick"],9:["metal-claw"],13:["karate-chop"],17:["headbutt"],21:["seismic-toss"],25:["bone-rush"]},
    495: {1:["tackle","leer"],5:["vine-whip"],9:["wrap"],13:["mega-drain"],17:["leech-seed"],21:["razor-leaf"],25:["energy-ball"],29:["seed-bomb"]},
    498: {1:["tackle","tail-whip"],5:["ember"],9:["take-down"],13:["flame-charge"],17:["headbutt"],21:["flamethrower"]},
    501: {1:["tackle","tail-whip"],5:["water-gun"],9:["fury-swipes"],13:["water-pulse"],17:["slash"],21:["aqua-tail"],25:["surf"]},
    633: {1:["tackle","bite"],5:["dragon-rage"],9:["headbutt"],13:["crunch"],17:["dragon-claw"],21:["body-slam"],25:["outrage"]},
    650: {1:["tackle","growl"],5:["vine-whip"],9:["rollout"],13:["bite"],17:["razor-leaf"],21:["seed-bomb"],25:["body-slam"]},
    653: {1:["scratch","tail-whip"],5:["ember"],9:["howl","growl"],13:["flame-charge"],17:["psybeam"],21:["fire-spin"],25:["flamethrower"]},
    656: {1:["pound","growl"],5:["bubble"],9:["quick-attack"],13:["lick"],17:["water-pulse"],21:["acrobatics","aerial-ace"],25:["surf"]},
    704: {1:["tackle","absorb"],5:["bubble"],9:["water-gun"],13:["mud-slap"],17:["dragon-rage"],21:["body-slam"],25:["muddy-water","water-pulse"]},
    722: {1:["tackle","growl"],4:["peck"],8:["razor-leaf"],11:["aerial-ace"],15:["seed-bomb"],19:["fly"],23:["energy-ball"],27:["brave-bird"]},
    725: {1:["scratch","ember"],4:["growl"],8:["lick"],11:["fire-fang"],15:["bite"],19:["flamethrower"],23:["crunch"]},
    728: {1:["pound","water-gun"],4:["growl"],8:["disarming-voice"],11:["aqua-tail"],15:["charm"],19:["bubble"],23:["moonblast"],27:["hydro-pump"]},
    782: {1:["tackle","leer"],5:["headbutt"],9:["iron-head"],13:["dragon-claw"],17:["take-down"],21:["outrage"]},
    810: {1:["tackle","growl"],5:["vine-whip"],9:["razor-leaf"],13:["headbutt"],17:["seed-bomb"],21:["body-slam"],25:["energy-ball"]},
    813: {1:["tackle","growl"],5:["ember"],9:["quick-attack"],13:["flame-charge"],17:["headbutt"],21:["flamethrower"],25:["fire-spin"]},
    816: {1:["pound","growl"],5:["water-gun"],9:["water-pulse"],13:["swift"],17:["aqua-tail"],21:["surf"],25:["hydro-pump"]},
    885: {1:["tackle","quick-attack"],5:["bite"],9:["dragon-rage"],13:["twister"],17:["dragon-claw"],21:["take-down"],25:["outrage"]},
    906: {1:["scratch","growl"],5:["vine-whip"],9:["razor-leaf"],13:["bite"],17:["seed-bomb"],21:["body-slam"],25:["energy-ball"]},
    909: {1:["tackle","leer"],5:["ember"],9:["bite"],13:["flame-charge"],17:["headbutt"],21:["flamethrower"],25:["crunch"]},
    912: {1:["pound","growl"],5:["water-gun"],9:["quick-attack"],13:["water-pulse"],17:["icy-wind"],21:["aqua-tail"],25:["ice-beam"]},
    // ── Evolved forms (stone & level-up evolutions reachable in-game) ──
    26:  {1:["thunder-shock","tail-whip"],12:["quick-attack","thunder-wave"],20:["spark","electro-ball"],28:["discharge","double-kick"],35:["thunderbolt"],45:["thunder","body-slam"]},
    36:  {1:["pound","sing"],8:["double-slap","defense-curl"],15:["disarming-voice","body-slam"],20:["swift","moonblast"],28:["take-down"],35:["play-rough"]},
    38:  {1:["ember","tail-whip"],12:["quick-attack","confuse-ray"],20:["flame-wheel"],28:["flamethrower","crunch"],35:["slash","fire-spin"],45:["body-slam"]},
    40:  {1:["pound","sing"],8:["double-slap","defense-curl"],15:["disarming-voice","body-slam"],20:["swift","moonblast"],28:["take-down"],35:["play-rough"]},
    44:  {1:["absorb","acid"],8:["sleep-powder","mega-drain"],15:["stun-spore","sludge"],20:["giga-drain"],25:["sludge-bomb"],32:["energy-ball"]},
    45:  {1:["absorb","acid"],8:["sleep-powder","mega-drain"],15:["stun-spore","sludge"],20:["giga-drain"],25:["sludge-bomb"],32:["energy-ball"],38:["solar-beam"]},
    59:  {1:["bite","leer"],12:["take-down","flame-wheel"],20:["crunch","flamethrower"],28:["quick-attack","slash"],35:["body-slam","fire-fang"],45:["fire-spin"]},
    62:  {1:["water-gun","bubble"],10:["body-slam","water-pulse"],20:["headbutt","take-down"],28:["surf","karate-chop"],35:["hydro-pump"],42:["seismic-toss"]},
    78:  {1:["ember","tail-whip"],12:["quick-attack","flame-wheel"],20:["slash","flamethrower"],28:["take-down","fire-fang"],35:["body-slam"],45:["fire-spin"]},
    87:  {1:["headbutt","growl"],8:["icy-wind","ice-shard"],16:["aurora-beam"],20:["aqua-tail","take-down"],25:["ice-beam"],30:["body-slam","surf"]},
    91:  {1:["icy-wind","withdraw"],8:["ice-shard","water-gun"],16:["aurora-beam","water-pulse"],22:["ice-beam","crunch"],28:["body-slam"],35:["hydro-pump"]},
    101: {1:["tackle","thunder-shock"],8:["spark","electro-ball"],15:["swift"],20:["discharge","take-down"],25:["thunderbolt"],30:["thunder","body-slam"]},
    121: {1:["tackle","harden"],8:["water-gun","swift"],15:["rapid-spin","water-pulse"],20:["power-gem","psychic"],25:["ice-beam"],30:["hydro-pump"]},
    134: {25:["water-pulse","quick-attack"],28:["aurora-beam"],32:["aqua-tail","body-slam"],36:["surf"],40:["ice-beam"],45:["hydro-pump"]},
    135: {25:["quick-attack","double-kick"],28:["thunder-wave","pin-missile"],32:["electro-ball","discharge"],36:["thunderbolt"],40:["thunder","body-slam"]},
    136: {25:["fire-fang","quick-attack"],28:["flame-wheel","bite"],32:["body-slam","flamethrower"],36:["slash"],40:["fire-spin","crunch"]},
    196: {25:["quick-attack","psybeam"],28:["swift","confusion"],32:["psychic"],36:["dazzling-gleam"],40:["shadow-ball","body-slam"]},
    197: {25:["bite","quick-attack"],28:["feint-attack","crunch"],32:["sucker-punch"],36:["shadow-ball","body-slam"],40:["take-down"]},
    281: {1:["growl","confusion"],8:["double-slap","disarming-voice"],15:["psybeam","charm"],20:["swift","psychic"],25:["dazzling-gleam"],30:["moonblast"]},
    468: {1:["growl","charm"],8:["pound","swift"],15:["disarming-voice","ancient-power"],20:["dazzling-gleam","aerial-ace"],25:["moonblast","wing-attack"],30:["play-rough","body-slam"]},
    700: {25:["quick-attack","disarming-voice"],28:["charm","swift"],32:["moonblast","body-slam"],36:["dazzling-gleam","play-rough"],40:["take-down"]},
    // ── Key Pokémon missing from level-up tables ──────────────────────────
    // Snorlax
    143: {1:["tackle","yawn"],10:["body-slam"],18:["crunch"],25:["earthquake"],30:["take-down"]},
    // Legendary birds
    144: {1:["peck","growl"],5:["ice-shard"],10:["icy-wind"],15:["ice-beam"],20:["aerial-ace"],25:["blizzard"],30:["ancient-power"]},
    145: {1:["peck","thunder-shock"],5:["thunder-wave"],10:["discharge"],15:["thunderbolt"],20:["aerial-ace"],25:["thunder"],30:["ancient-power"]},
    146: {1:["peck","ember"],5:["fire-spin"],10:["flame-charge"],15:["flamethrower"],20:["aerial-ace"],25:["fire-fang"],30:["ancient-power"]},
    // Dragonair & Dragonite (Dratini 147 already defined; chain walks cover most moves)
    148: {1:["wrap","leer"],5:["twister"],9:["thunder-wave"],15:["aqua-tail"],20:["dragon-claw"],25:["ice-beam"]},
    149: {1:["fire-punch","thunder-punch"],5:["wing-attack"],10:["dragon-claw"],15:["ice-beam"],20:["thunder"],25:["outrage"],30:["hyper-beam"]},
    // Mewtwo — can learn almost all TMs
    150: {1:["confusion","disable"],5:["psybeam"],10:["psychic"],15:["shadow-ball"],20:["thunderbolt"],25:["ice-beam"],30:["flamethrower"],35:["swift"],40:["hyper-beam"]},
    // Mew — universal learner
    151: {1:["pound","growl"],5:["psychic"],10:["thunderbolt"],15:["ice-beam"],20:["flamethrower"],25:["energy-ball"],30:["shadow-ball"],35:["earth-power"],40:["surf"]},
    // Legendary beasts
    243: {1:["thunder-shock","leer"],8:["thunder-wave"],15:["thunderbolt"],20:["discharge"],25:["crunch"],30:["thunder"],35:["swift"],40:["hyper-beam"]},
    244: {1:["ember","leer"],8:["fire-fang"],15:["flamethrower"],20:["crunch"],25:["fire-spin"],30:["swift"],35:["body-slam"],40:["hyper-beam"]},
    245: {1:["water-gun","leer"],8:["ice-shard"],15:["surf"],20:["ice-beam"],25:["crunch"],30:["aqua-tail"],35:["blizzard"],40:["hydro-pump"]},
    // Lugia & Ho-Oh
    249: {1:["gust","water-gun"],8:["aerial-ace"],15:["surf"],20:["ice-beam"],25:["psychic"],30:["shadow-ball"],35:["hydro-pump"]},
    250: {1:["gust","ember"],8:["aerial-ace"],15:["flamethrower"],20:["ancient-power"],25:["solar-beam"],30:["fire-spin"],35:["brave-bird"]},
    // Celebi
    251: {1:["confusion","growl"],5:["energy-ball"],10:["psychic"],15:["leaf-storm","ancient-power"],20:["shadow-ball"],25:["seed-bomb"]}
};

const HOLD_ITEMS_DB = {
    oran_berry: { name: "Oran Berry", cost: 40, desc: "Restores 30 HP once during battle when health falls below 30%", effect: "heal_low_hp", value: 30, type: "consumable" },
    antidote: { name: "Antidote", cost: 30, desc: "Cures poison status condition", effect: "cure_poison", type: "consumable" },
    burn_heal: { name: "Burn Heal", cost: 30, desc: "Cures burn status condition", effect: "cure_burn", type: "consumable" },
    ice_heal: { name: "Ice Heal", cost: 30, desc: "Cures freeze status condition", effect: "cure_freeze", type: "consumable" },
    awakening: { name: "Awakening", cost: 30, desc: "Cures sleep status condition", effect: "cure_sleep", type: "consumable" },
    paralyze_heal: { name: "Paralyze Heal", cost: 30, desc: "Cures paralysis status condition", effect: "cure_paralyze", type: "consumable" },
    full_heal: { name: "Full Heal", cost: 60, desc: "Restores all HP and cures all status conditions", effect: "full_restore", value: 100, type: "consumable" },
    full_restore: { name: "Full Restore", cost: 150, desc: "Fully heals a Pokemon during battle", effect: "full_restore", value: 999, type: "consumable" },
    fire_stone: { name: "Fire Stone", cost: 200, desc: "Evolves certain Pokemon like Eevee to Flareon", effect: "evolution", type: "evolution_stone" },
    water_stone: { name: "Water Stone", cost: 200, desc: "Evolves certain Pokemon like Eevee to Vaporeon", effect: "evolution", type: "evolution_stone" },
    thunder_stone: { name: "Thunder Stone", cost: 200, desc: "Evolves certain Pokemon like Eevee to Jolteon", effect: "evolution", type: "evolution_stone" },
    leaf_stone: { name: "Leaf Stone", cost: 200, desc: "Evolves certain Pokemon like Oddish to Gloom", effect: "evolution", type: "evolution_stone" },
    ice_stone: { name: "Ice Stone", cost: 200, desc: "Evolves certain Pokemon like Seel to Dewgong", effect: "evolution", type: "evolution_stone" },
    dawn_stone: { name: "Dawn Stone", cost: 250, desc: "Evolves certain Pokemon like Kirlia to Gardevoir", effect: "evolution", type: "evolution_stone" },
    dusk_stone: { name: "Dusk Stone", cost: 250, desc: "Evolves certain Pokemon like Lampent to Chandelure", effect: "evolution", type: "evolution_stone" },
    moon_stone: { name: "Moon Stone", cost: 200, desc: "Evolves certain Pokemon like Jigglypuff to Wigglytuff", effect: "evolution", type: "evolution_stone" },
    shiny_stone: { name: "Shiny Stone", cost: 250, desc: "Evolves certain Pokemon like Togetic to Togekiss", effect: "evolution", type: "evolution_stone" },
    leftovers: { name: "Leftovers", cost: 120, desc: "Gradually restores 1/16th of maximum HP at the end of every combat turn", effect: "heal_turn", value: 0.0625, type: "held_item" },
    choice_band: { name: "Choice Band", cost: 180, desc: "Boosts Physical move power by 50% continuously", effect: "boost_physical", value: 1.5, type: "held_item" },
    wise_glasses: { name: "Wise Glasses", cost: 180, desc: "Boosts Special move power by 25% continuously", effect: "boost_special", value: 1.25, type: "held_item" },
    assault_vest: { name: "Assault Vest", cost: 200, desc: "Boosts Sp. Def by 50%", effect: "boost_spdef", value: 1.5, type: "held_item" },
    exp_share: { name: "Exp. Share", cost: 150, desc: "Holder gains 50% of battle experience", effect: "boost_exp", value: 1.5, type: "held_item" },
    scope_lens: { name: "Scope Lens", cost: 160, desc: "Boosts critical hit ratio by 25%", effect: "boost_crit", value: 1.25, type: "held_item" },
    weakness_policy: { name: "Weakness Policy", cost: 170, desc: "When hit by super-effective move, raise Atk and Sp. Atk by 50%", effect: "boost_on_hit", value: 1.5, type: "held_item" },
    life_orb: { name: "Life Orb", cost: 190, desc: "Boosts all damage by 30% but costs 10% max HP per turn", effect: "boost_damage_cost_hp", value: 1.3, type: "held_item" },
    potion: { name: "Potion", cost: 20, desc: "Restores 20 HP", effect: "heal_hp", value: 20, type: "consumable" },
    super_potion: { name: "Super Potion", cost: 50, desc: "Restores 50 HP", effect: "heal_hp", value: 50, type: "consumable" },
    hyper_potion: { name: "Hyper Potion", cost: 100, desc: "Restores 100 HP", effect: "heal_hp", value: 100, type: "consumable" },
    max_potion: { name: "Max Potion", cost: 200, desc: "Restores all HP", effect: "heal_hp", value: 999, type: "consumable" },
    ether: { name: "Ether", cost: 60, desc: "Restores 10 PP to one move", effect: "restore_pp", value: 10, type: "consumable" },
    max_ether: { name: "Max Ether", cost: 120, desc: "Restores all PP to one move", effect: "restore_pp", value: 999, type: "consumable" },
    elixir: { name: "Elixir", cost: 80, desc: "Restores 10 PP to all moves", effect: "restore_all_pp", value: 10, type: "consumable" },
    max_elixir: { name: "Max Elixir", cost: 150, desc: "Restores all PP to all moves", effect: "restore_all_pp", value: 999, type: "consumable" },
    attack_boost: { name: "Attack Boost", cost: 90, desc: "Raises Attack by 50% until end of battle", effect: "stat_boost", stat: "attack", value: 1.5, type: "consumable" },
    defense_boost: { name: "Defense Boost", cost: 90, desc: "Raises Defense by 50% until end of battle", effect: "stat_boost", stat: "defense", value: 1.5, type: "consumable" },
    speed_boost: { name: "Speed Boost", cost: 90, desc: "Raises Speed by 50% until end of battle", effect: "stat_boost", stat: "speed", value: 1.5, type: "consumable" },
    special_boost: { name: "Special Boost", cost: 90, desc: "Raises Sp. Atk by 50% until end of battle", effect: "stat_boost", stat: "spa", value: 1.5, type: "consumable" },
    ability_capsule: { name: "Ability Capsule", cost: 250, desc: "Swaps a Pokemon's Ability to its alternate Ability", effect: "swap_ability", type: "item" },
    nature_mint: { name: "Nature Mint", cost: 180, desc: "Adjusts Pokemon nature to optimize stats", effect: "adjust_nature", type: "item" },
    vitamin_a: { name: "HP Up", cost: 75, desc: "Raises maximum HP", effect: "stat_permanent", stat: "hp", value: 10, type: "consumable" },
    vitamin_b: { name: "Attack", cost: 75, desc: "Raises Attack stat", effect: "stat_permanent", stat: "attack", value: 10, type: "consumable" },
    vitamin_c: { name: "Defense", cost: 75, desc: "Raises Defense stat", effect: "stat_permanent", stat: "defense", value: 10, type: "consumable" },
    vitamin_d: { name: "Sp. Atk", cost: 75, desc: "Raises Sp. Atk stat", effect: "stat_permanent", stat: "spa", value: 10, type: "consumable" },
    vitamin_e: { name: "Sp. Def", cost: 75, desc: "Raises Sp. Def stat", effect: "stat_permanent", stat: "spd", value: 10, type: "consumable" },
    vitamin_f: { name: "Speed", cost: 75, desc: "Raises Speed stat", effect: "stat_permanent", stat: "speed", value: 10, type: "consumable" }
};
const STONE_EVO_POKEMON = new Set([
    26, 27, 35, 36, 37, 38, 39, 40, 41, 42, 50, 51, 52, 53, 54, 55, 56, 57,
    58, 59, 60, 61, 62, 63, 66, 67, 74, 75, 81, 82, 90, 91, 92, 93, 100, 101,
    102, 103, 104, 105, 109, 110, 116, 117, 118, 119, 120, 121, 122, 123,
    133, 138, 139, 140, 141, 142, 143, 147, 148, 152, 153, 155, 156, 158, 159,
    161, 163, 164, 173, 174, 175, 177, 178, 183, 184, 185, 194, 195, 231, 246, 247, 258, 259, 261, 265, 266
]);
const STONE_EVOLUTION_MAP = {
    fire_stone: [{ from: 37, to: 38 }, { from: 58, to: 59 }, { from: 77, to: 78 }, { from: 133, to: 136 }],
    water_stone: [{ from: 60, to: 62 }, { from: 61, to: 62 }, { from: 90, to: 91 }, { from: 120, to: 121 }, { from: 133, to: 134 }],
    thunder_stone: [{ from: 25, to: 26 }, { from: 100, to: 101 }, { from: 133, to: 135 }],
    leaf_stone: [{ from: 43, to: 44 }, { from: 44, to: 45 }],
    ice_stone: [{ from: 86, to: 87 }, { from: 133, to: 87 }],
    moon_stone: [{ from: 35, to: 36 }, { from: 39, to: 40 }, { from: 174, to: 175 }],
    shiny_stone: [{ from: 175, to: 468 }, { from: 280, to: 281 }]
};

function shouldExcludeFromLevelUp(pokemonId) {
    // Only warn for pre-evolution forms that can still stone-evolve,
    // not for already-evolved forms that happen to be in the set.
    const stoneTargets = new Set();
    for (const pairs of Object.values(STONE_EVOLUTION_MAP)) {
        for (const {to} of pairs) stoneTargets.add(to);
    }
    return STONE_EVO_POKEMON.has(pokemonId) && !stoneTargets.has(pokemonId);
}

function getDefaultInventoryItems() {
    return Object.keys(HOLD_ITEMS_DB).reduce((acc, key) => { acc[key] = 0; return acc; }, {});
}

function normalizeSaveState(rawState = {}) {
    const normalizedTeam = Array.isArray(rawState.team) ? rawState.team.slice(0, 6) : [];
    while (normalizedTeam.length < 6) normalizedTeam.push(null);
    const normalized = {
        ...rawState,
        coins: rawState.coins ?? 100,
        xp: rawState.xp ?? 0,
        level: rawState.level ?? 1,
        balls: rawState.balls || { poke: 5, great: 0, ultra: 0, master: 0 },
        pokedex: Array.isArray(rawState.pokedex) ? rawState.pokedex : [],
        pcBox: Array.isArray(rawState.pcBox) ? rawState.pcBox : [],
        team: normalizedTeam,
        inventoryItems: {
            ...getDefaultInventoryItems(),
            ...(rawState.inventoryItems || {})
        },
        unlockedStages: rawState.unlockedStages ?? 1,
        unlockedRegions: Array.isArray(rawState.unlockedRegions) ? rawState.unlockedRegions : [1],
        profileGenIndex: rawState.profileGenIndex || 0,
        selectedBall: rawState.selectedBall || 'poke',
        activeBattleStage: rawState.activeBattleStage || null,
        battleType: rawState.battleType || 'campaign',
        endlessRunDefeats: rawState.endlessRunDefeats ?? 0,
        battle: rawState.battle || { active: false, bossPokemon: null, fighterPokemon: null, fighterHP: 0, bossHP: 0, fighterMaxHP: 0, bossMaxHP: 0, oranUsed: false, bossOranUsed: false, playerTeam: [], playerTeamIndex: 0, statStages: { player: {atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0}, boss: {atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0} }, statusConds: { player: null, boss: null } },
        dexUI: rawState.dexUI || { page: 1, pageSize: 9, total: 1025, search: '', rarity: 'all' },
        wheel: rawState.wheel || { spinning: false, currentAngle: 0, spinSpeed: 0, targetRarity: 'Common', pointerPos: 0, lastWedgeAudio: -1 },
        currentEncounter: rawState.currentEncounter || null,
        encounterShiny: !!rawState.encounterShiny,
        catchMinigame: rawState.catchMinigame || { active: false, ringScale: 1.0, contracting: true, score: 0 },
        username: typeof rawState.username === 'string' ? rawState.username : "",
        gymBadges: Array.isArray(rawState.gymBadges) ? rawState.gymBadges : [],
        endlessModeUnlocked: rawState.endlessModeUnlocked || false,
        autoBattler: rawState.autoBattler || false,
        autoBattlerStage: rawState.autoBattlerStage || null,
        tmsOwned: (rawState.tmsOwned && typeof rawState.tmsOwned === 'object') ? rawState.tmsOwned : {},
        shinyCharm: !!rawState.shinyCharm
    };
    return normalized;
}

function assignPokemonUids() {
    if (!gameState.pcBox || gameState.pcBox.length === 0) {
        nextCatchUid = 1;
        return;
    }
    let maxUid = 0;
    gameState.pcBox.forEach(p => { if (p.uid && p.uid > maxUid) maxUid = p.uid; });
    nextCatchUid = maxUid + 1;
    gameState.pcBox.forEach(p => { if (!p.uid) p.uid = nextCatchUid++; });
}

function getStoneEvolutionTarget(itemKey, pokemon) {
    const candidates = STONE_EVOLUTION_MAP[itemKey] || [];
    return candidates.find(entry => entry.from === pokemon.id)?.to || null;
}
