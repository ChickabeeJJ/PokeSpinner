// PokeSpinner — Accurate learnsets and move data from PokéAPI (cached).
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// ACCURATE LEARNSETS & MOVE DATA (PokéAPI)
// ==========================================
// Level-up learnsets come from the most recent main-series game that
// has data for the species; move stats/effects come from /move/{name}.
// Both are cached in localStorage so they're fetched once per species/move.
const VG_PREFERENCE = ['scarlet-violet','sword-shield','brilliant-diamond-shining-pearl','legends-arceus','ultra-sun-ultra-moon','sun-moon','lets-go-pikachu-lets-go-eevee','omega-ruby-alpha-sapphire','x-y','black-2-white-2','black-white','heartgold-soulsilver','platinum','diamond-pearl','firered-leafgreen','emerald','ruby-sapphire','crystal','gold-silver','yellow','red-blue'];
const LEARNSET_KEY = 'ps_learnsets_v1';
const MOVEDATA_KEY = 'ps_movedata_v1';
const _readCache = key => { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { return {}; } };
const LEARNSETS = _readCache(LEARNSET_KEY);   // id -> { vg, lv: [[level, move]...], all: [move...] }
const MOVE_CACHE = _readCache(MOVEDATA_KEY);  // move -> spec in MOVES_DB format
let _cacheSaveTimer = null;
function persistDataCaches() {
    clearTimeout(_cacheSaveTimer);
    _cacheSaveTimer = setTimeout(() => {
        try { localStorage.setItem(LEARNSET_KEY, JSON.stringify(LEARNSETS)); } catch (e) { /* quota — cache is optional */ }
        try { localStorage.setItem(MOVEDATA_KEY, JSON.stringify(MOVE_CACHE)); } catch (e) {}
    }, 800);
}

function parseLearnset(data) {
    const byVg = {};
    const all = new Set();
    for (const m of data.moves || []) {
        const name = m.move.name;
        all.add(name);
        for (const d of m.version_group_details || []) {
            if (d.move_learn_method.name !== 'level-up') continue;
            (byVg[d.version_group.name] = byVg[d.version_group.name] || []).push([d.level_learned_at, name]);
        }
    }
    const vg = VG_PREFERENCE.find(v => byVg[v] && byVg[v].length) || Object.keys(byVg)[0] || null;
    const seen = new Set();
    const lv = (byVg[vg] || [])
        .sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]))
        .filter(([l, mv]) => { const k = l + mv; if (seen.has(k)) return false; seen.add(k); return true; });
    return { vg, lv, all: [...all] };
}

const _learnsetInflight = {};
function ensureLearnset(id) {
    if (LEARNSETS[id]) return Promise.resolve(LEARNSETS[id]);
    if (_learnsetInflight[id]) return _learnsetInflight[id];
    _learnsetInflight[id] = fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) { LEARNSETS[id] = parseLearnset(data); persistDataCaches(); } return LEARNSETS[id] || null; })
        .catch(() => null)
        .finally(() => { delete _learnsetInflight[id]; });
    return _learnsetInflight[id];
}

const STAT_MAP = { attack:'atk', defense:'def', 'special-attack':'spAtk', 'special-defense':'spDef', speed:'speed', accuracy:'accuracy' };
const AILMENT_MAP = { paralysis:'para', sleep:'sleep', burn:'burn', poison:'poison', freeze:'freeze', confusion:'confuse', 'leech-seed':'leech' };
const SELF_TARGETS = new Set(['user','user-and-allies','users-field','user-or-ally','ally','all-allies']);

function convertApiMove(d) {
    const category = d.damage_class ? d.damage_class.name : 'physical';
    const spec = { type: d.type.name, power: d.power || (category === 'status' ? 0 : 60), category, accuracy: d.accuracy == null ? 100 : d.accuracy, pp: d.pp || 10, priority: d.priority || 0 };
    const meta = d.meta || {};
    const metaCat = meta.category ? meta.category.name : '';
    const stats = (d.stat_changes || []).map(s => ({ stat: STAT_MAP[s.stat.name], stages: s.change })).filter(s => s.stat);
    const ailment = meta.ailment && AILMENT_MAP[meta.ailment.name];
    if (category === 'status') {
        const effect = { target: SELF_TARGETS.has(d.target.name) ? 'self' : 'foe' };
        if (meta.healing > 0) { effect.heals = meta.healing >= 100 ? 'full' : 'half'; effect.target = 'self'; }
        else if (ailment) effect.status = ailment;
        else if (stats.length > 1) effect.multiStat = stats;
        else if (stats.length === 1) { effect.stat = stats[0].stat; effect.stages = stats[0].stages; }
        if (Object.keys(effect).length > 1) spec.effect = effect;
    } else {
        const sec = {};
        if (ailment) { sec.status = ailment; sec.chance = meta.ailment_chance || (metaCat === 'damage-ailment' ? 100 : 0); }
        if (stats.length) {
            sec.stats = stats;
            sec.statChance = meta.stat_chance || 100;
            sec.statTarget = metaCat === 'damage-raise' ? 'self' : 'foe';
        }
        if (meta.drain) sec.drain = meta.drain;               // + heals user, − recoil
        if (meta.min_hits && meta.max_hits > 1) sec.hits = [meta.min_hits, meta.max_hits];
        if (Object.keys(sec).length) spec.secondary = sec;
        if (meta.crit_rate) spec.highCrit = true;
    }
    return spec;
}

function getMove(name) {
    if (name === 'struggle') return STRUGGLE;
    return MOVE_CACHE[name] || MOVES_DB[name] || null;
}

const _moveInflight = {};
function ensureMoveData(names) {
    const missing = [...new Set((names || []).filter(n => n && !MOVE_CACHE[n]))];
    return Promise.all(missing.map(name => {
        if (!_moveInflight[name]) {
            _moveInflight[name] = fetch(`https://pokeapi.co/api/v2/move/${name}`)
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d) { MOVE_CACHE[name] = convertApiMove(d); persistDataCaches(); } })
                .catch(() => {})
                .finally(() => { delete _moveInflight[name]; });
        }
        return _moveInflight[name];
    }));
}

// Keep only moves the species can really know; refill from its level-up list
function validateMoveset(p) {
    const ls = LEARNSETS[p.id];
    if (!p || !ls || !ls.all || !ls.all.length) return false;
    const legal = new Set(ls.all);
    const before = JSON.stringify(p.moves || []);
    let moves = (p.moves || []).filter((m, i, arr) => legal.has(m) && arr.indexOf(m) === i);
    if (moves.length < 4) {
        for (const m of getMovesForLevel(p.id, p.level || 1).reverse()) {
            if (moves.length >= 4) break;
            if (!moves.includes(m)) moves.push(m);
        }
    }
    if (!moves.length) moves = getMovesForLevel(p.id, p.level || 1);
    p.moves = moves.slice(0, 4);
    if (p.moveBank) p.moveBank = p.moveBank.filter(m => legal.has(m) && !p.moves.includes(m));
    return JSON.stringify(p.moves) !== before;
}

// Background pass over the player's Pokémon: fetch learnsets, fix illegal
// movesets from older saves, and preload move data for battle.
async function syncOwnedMovesets() {
    const owned = gameState.pcBox || [];
    const priority = new Set((gameState.team || []).filter(Boolean));
    const ids = [...new Set(owned.slice().sort((a, b) => (priority.has(b.uid) ? 1 : 0) - (priority.has(a.uid) ? 1 : 0)).map(p => p.id))];
    let changed = false;
    const worker = async () => {
        while (ids.length) {
            const id = ids.shift();
            if (!(await ensureLearnset(id))) continue;
            for (const p of owned) if (p.id === id && validateMoveset(p)) changed = true;
        }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    await ensureMoveData(owned.flatMap(p => p.moves || []));
    if (changed) { saveProgress(); console.log('[MOVES] Corrected movesets to match official learnsets'); }
}

async function fetchPokemonData(id, level = 1) {
    try {
        // Fetch base data + species names in parallel
        const [response] = await Promise.all([
            fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
            _ensurePokemonNames(id),
        ]);
        const data = await response.json();
        if (!LEARNSETS[data.id]) { LEARNSETS[data.id] = parseLearnset(data); persistDataCaches(); }
        const startMoves = getMovesForLevel(data.id, level);
        await ensureMoveData(startMoves);
        const enName = data.name.charAt(0).toUpperCase() + data.name.slice(1);
        const displayName = getPokemonName({ id: data.id, name: enName });
        return {
            id: data.id, name: displayName, _enName: enName,
            type1: data.types[0].type.name, type2: data.types[1]?.type.name || null,
            sprite: pixelSprite(data.id, false),
            hp: data.stats[0].base_stat, atk: data.stats[1].base_stat, def: data.stats[2].base_stat,
            spAtk: data.stats[3].base_stat, spDef: data.stats[4].base_stat, speed: data.stats[5].base_stat,
            moves: startMoves, heldItem: null
        };
    } catch (error) {
        return {
            id: id, name: `MissingNo`, type1: "normal", type2: null,
            sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png",
            hp: 100, atk: 60, def: 60, spAtk: 60, spDef: 60, speed: 60,
            moves: ["tackle", "quick-attack"], heldItem: null
        };
    }
}

// The moves a Pokémon of this species knows at `level`: its four most
// recently learned level-up moves, as in the main games.
function getMovesForLevel(pokemonId, level) {
    const ls = LEARNSETS[pokemonId];
    if (ls && ls.lv && ls.lv.length) {
        const learned = [];
        for (const [lvl, mv] of ls.lv) {
            if (lvl > level) break;
            const i = learned.indexOf(mv);
            if (i >= 0) learned.splice(i, 1);
            learned.push(mv);
        }
        if (!learned.length) learned.push(ls.lv[0][1]);
        const final = learned.slice(-4);
        // Guarantee at least one damaging move when the species has one available
        const isDamaging = m => { const s = getMove(m); return s ? s.category !== 'status' : null; };
        if (final.every(m => isDamaging(m) === false)) {
            const attack = learned.slice(0, -4).reverse().find(m => isDamaging(m) === true);
            if (attack) final[0] = attack;
        }
        return final;
    }
    const moveData = LEVELUP_MOVES[pokemonId];
    if (!moveData) return ["tackle", "quick-attack"];
    const learned = [];
    const sortedLevels = Object.keys(moveData).map(Number).sort((a, b) => a - b);
    for (const lvl of sortedLevels) {
        if (lvl <= level) {
            for (const move of moveData[lvl]) if (!learned.includes(move)) learned.push(move);
        }
    }
    const finalMoves = learned.slice(-4);
    while (finalMoves.length < 2) finalMoves.push("tackle");
    return finalMoves;
}

function getLearnableMovesForPokemon(pokemon) {
    // Moves the species learns by level-up up to its current level
    // (like the Move Reminder), plus whatever it currently knows.
    const currentLevel = pokemon.level || 1;
    const learned = new Set();
    const ls = LEARNSETS[pokemon.id];
    if (ls && ls.lv && ls.lv.length) {
        ls.lv.forEach(([lvl, mv]) => { if (lvl <= currentLevel) learned.add(mv); });
    } else {
        const moveData = LEVELUP_MOVES[pokemon.id];
        if (moveData) {
            Object.keys(moveData).map(Number).filter(l => l <= currentLevel)
                .forEach(l => moveData[l].forEach(m => learned.add(m)));
        }
    }
    (pokemon.moves || []).forEach(m => learned.add(m));
    if (learned.size === 0) ["tackle", "quick-attack"].forEach(m => learned.add(m));
    return Array.from(learned).sort();
}

// Called after each level gained (and after evolving with opts.evolved).
function applyLevelUpMoves(pokemon, opts = {}) {
    const level = pokemon.level || 1;
    const known = new Set([...(pokemon.moves || []), ...(pokemon.moveBank || [])]);
    const newMoves = [];
    const ls = LEARNSETS[pokemon.id];
    if (ls && ls.lv && ls.lv.length) {
        // Moves for this level, plus a short catch-up window in case levels were skipped;
        // evolving also teaches the species' "on evolution" (level 0) moves.
        for (const [lvl, mv] of ls.lv) {
            const due = (lvl <= level && lvl > Math.max(0, level - 5)) || (opts.evolved && lvl === 0);
            if (due && !known.has(mv) && !newMoves.includes(mv)) newMoves.push(mv);
        }
    } else {
        // Learnset not loaded yet: fetch it for next time, fall back to the built-in table
        ensureLearnset(pokemon.id);
        let moveData = LEVELUP_MOVES[pokemon.id] || LEVELUP_MOVES[PRE_EVO_MAP[pokemon.id]];
        if (!moveData) return [];
        for (let l = Math.max(1, level - 5); l <= level; l++) {
            (moveData[l] || []).forEach(mv => { if (!known.has(mv) && !newMoves.includes(mv)) newMoves.push(mv); });
        }
    }
    ensureMoveData(newMoves);
    const actuallyLearned = [];
    for (const move of newMoves) {
        if (pokemon.moves.length < 4) {
            pokemon.moves.push(move);
            actuallyLearned.push(move);
        } else if (typeof window.queueLearnMove === 'function') {
            // Full moveset — queue a pop-up so the player chooses which slot to replace
            window.queueLearnMove(pokemon, move);
        } else {
            pokemon.moveBank = pokemon.moveBank || [];
            if (!pokemon.moveBank.includes(move)) pokemon.moveBank.push(move);
        }
    }
    return actuallyLearned;
}

// ── Move-Learn queue: shows pop-up when a Pokémon's moveset is full ──
window._learnMoveQueue = [];
window._learnMoveCurrent = null;

window.queueLearnMove = function(pokemon, moveName) {
    window._learnMoveQueue.push({ pokemon, moveName });
    setTimeout(() => window.processLearnMoveQueue(), 600);
};

window.processLearnMoveQueue = function() {
    if (window._learnMoveCurrent) return;
    if (!window._learnMoveQueue.length) return;
    window._learnMoveCurrent = window._learnMoveQueue.shift();
    const { pokemon, moveName } = window._learnMoveCurrent;
    const moveData = getMove(moveName);
    document.getElementById('learnMoveModalPokemon').textContent =
        pokemon.name + ' wants to learn ' + moveName.replace(/-/g,' ');
    document.getElementById('learnMoveModalMoveName').textContent = moveName.replace(/-/g,' ');
    document.getElementById('learnMoveModalMoveDesc').textContent = moveData
        ? (moveData.type||'').toUpperCase() + '  ·  Power: ' + (moveData.power||'—') + '  ·  PP: ' + (moveData.pp||'—')
        : '';
    document.getElementById('learnMoveSlotPicker').classList.add('hidden');
    document.getElementById('learnMoveYesNo').classList.remove('hidden');
    const modal = document.getElementById('learnMoveModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.learnMoveDecline = function() {
    const { pokemon, moveName } = window._learnMoveCurrent;
    pokemon.moveBank = pokemon.moveBank || [];
    if (!pokemon.moveBank.includes(moveName)) pokemon.moveBank.push(moveName);
    document.getElementById('learnMoveModal').classList.add('hidden');
    document.getElementById('learnMoveModal').classList.remove('flex');
    window._learnMoveCurrent = null;
    if (typeof saveProgress === 'function') saveProgress();
    window.processLearnMoveQueue();
};

window.learnMoveAccept = function() {
    const { pokemon } = window._learnMoveCurrent;
    document.getElementById('learnMoveYesNo').classList.add('hidden');
    document.getElementById('learnMoveSlotPicker').classList.remove('hidden');
    const grid = document.getElementById('learnMoveSlotBtns');
    grid.innerHTML = '';
    pokemon.moves.forEach((m, i) => {
        const md = getMove(m);
        const btn = document.createElement('button');
        btn.className = 'py-2 px-3 rounded-xl text-left transition hover:opacity-80';
        btn.style.cssText = 'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);';
        btn.innerHTML = '<div class="text-[10px] font-black text-white capitalize">' + m.replace(/-/g,' ') + '</div>'
            + '<div class="text-slate-500 text-[8px] uppercase mt-0.5">'
            + (md ? (md.type||'') + ' · Pwr ' + (md.power||'—') : '') + '</div>';
        btn.onclick = () => window.learnMoveChooseSlot(i);
        grid.appendChild(btn);
    });
};

window.learnMoveChooseSlot = function(slotIndex) {
    const { pokemon, moveName } = window._learnMoveCurrent;
    const replaced = pokemon.moves[slotIndex];
    pokemon.moveBank = pokemon.moveBank || [];
    if (!pokemon.moveBank.includes(replaced)) pokemon.moveBank.push(replaced);
    pokemon.moves[slotIndex] = moveName;
    document.getElementById('learnMoveModal').classList.add('hidden');
    document.getElementById('learnMoveModal').classList.remove('flex');
    window._learnMoveCurrent = null;
    if (typeof showNotification === 'function')
        showNotification('Move Learned!', pokemon.name + ' replaced ' + replaced.replace(/-/g,' ') + ' with ' + moveName.replace(/-/g,' ') + '!', 'success');
    if (typeof saveProgress === 'function') saveProgress();
    window.processLearnMoveQueue();
};
