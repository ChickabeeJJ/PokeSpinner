// PokeSpinner — Weather, daily quests, the Safari Zone and Kurt's apricorn workshop.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order. Hooks into the rest of the game through
// gameEvent()/onGameEvent() (state.js) and a few calls from spinner/battle/mart.

const capWord = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
const ITEM_ART = key => `${ITEM_BASE}${key}.png`;

// Small deterministic RNG so everyone gets the same weather / quests at the same time
function seededRng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function localDateKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function hashString(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function formatDuration(ms) {
    const m = Math.max(0, Math.ceil(ms / 60000));
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

// ==========================================
// WEATHER — changes every 3 hours (same for everyone). Boosted types show up
// more often on the wheel and in the Safari Zone, and hit harder in battle.
// ==========================================
const WEATHERS = [
    { id: 'sunny',  name: 'Harsh Sunlight', icon: '☀️', boost: ['fire', 'grass', 'ground'], mods: { fire: 1.5, water: 0.5 }, note: 'Fire moves 1.5×, Water moves 0.5×' },
    { id: 'rain',   name: 'Rain',           icon: '🌧️', boost: ['water', 'electric', 'bug'], mods: { water: 1.5, fire: 0.5 }, note: 'Water moves 1.5×, Fire moves 0.5×' },
    { id: 'partly', name: 'Partly Cloudy',  icon: '⛅', boost: ['normal', 'rock'] },
    { id: 'cloudy', name: 'Overcast',       icon: '☁️', boost: ['fairy', 'fighting', 'poison'] },
    { id: 'windy',  name: 'Strong Winds',   icon: '🌬️', boost: ['dragon', 'flying', 'psychic'] },
    { id: 'snow',   name: 'Snow',           icon: '❄️', boost: ['ice', 'steel'] },
    { id: 'fog',    name: 'Fog',            icon: '🌫️', boost: ['dark', 'ghost'] }
];
const WEATHER_BLOCK_MS = 3 * 3600 * 1000;
function weatherBlock(t = Date.now()) { return Math.floor(t / WEATHER_BLOCK_MS); }
function currentWeather(t = Date.now()) {
    const rng = seededRng(weatherBlock(t) * 7919 + 17);
    return WEATHERS[Math.floor(rng() * WEATHERS.length)];
}
function weatherNote(w) { return w.note || `${w.boost.map(capWord).join(', ')} moves 1.2×`; }
// Battle damage multiplier for a move of `type` in the current weather
function weatherDamageMod(type) {
    const w = currentWeather();
    if (w.mods && w.mods[type]) return w.mods[type];
    return w.boost.includes(type) ? 1.2 : 1;
}
// Wheel / Safari: species of a boosted type are three times as likely
function pickWeatherWeighted(pool) {
    if (!pool || !pool.length) return undefined;
    const boost = currentWeather().boost;
    const weights = pool.map(id => ((TYPES_OF_SPECIES[id] || []).some(tp => boost.includes(tp)) ? 3 : 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
}

function renderWeatherChip() {
    const w = currentWeather();
    const chip = document.getElementById('weatherChip');
    if (chip) {
        chip.innerHTML = `<span class="wx-ico">${w.icon}</span><span class="wx-name">${w.name}</span>${w.boost.map(tp => `<span class="type-chip" style="--tc:${BATTLE_TYPE_COLORS[tp] || '#a8a77a'}">${tp}</span>`).join('')}`;
        chip.title = `${w.name}: ${w.boost.map(capWord).join(', ')} Pokémon appear more often. ${weatherNote(w)} in battle.`;
    }
}
window.showWeatherInfo = function() {
    const w = currentWeather();
    const next = currentWeather(Date.now() + WEATHER_BLOCK_MS);
    const left = (weatherBlock() + 1) * WEATHER_BLOCK_MS - Date.now();
    showNotification(`${w.icon} ${w.name}`, `${w.boost.map(capWord).join(', ')} types appear 3× more often. In battle: ${weatherNote(w)}. Next: ${next.icon} ${next.name} in ${formatDuration(left)}.`, 'info');
};
// Battle field overlay (rain streaks, snow, fog, sun glare) + a label in the top bar
function applyBattleWeather() {
    const w = currentWeather();
    const field = document.getElementById('battleField');
    if (field) field.dataset.wx = w.id;
    const sub = document.getElementById('battleStageSub');
    if (sub) sub.textContent = [sub.textContent, `${w.icon} ${w.name}`].filter(Boolean).join(' · ');
}
let _lastWeatherBlock = weatherBlock();
setInterval(() => {
    const b = weatherBlock();
    if (b !== _lastWeatherBlock) {
        _lastWeatherBlock = b;
        const w = currentWeather();
        renderWeatherChip();
        showNotification(`${w.icon} The weather changed!`, `${w.name}: ${w.boost.map(capWord).join(', ')} Pokémon are out in force.`, 'info');
    }
}, 60 * 1000);

// ==========================================
// APRICORNS — found in the Safari Zone, won from trainers and quests,
// and turned into balls and held items at Kurt's Workshop.
// ==========================================
const APRICORNS = ['red', 'blue', 'yellow', 'green', 'pink', 'white', 'black'];
function apricornBag() {
    gameState.apricorns = gameState.apricorns || {};
    APRICORNS.forEach(c => { gameState.apricorns[c] = gameState.apricorns[c] || 0; });
    return gameState.apricorns;
}
function grantApricorns(n) {
    const bag = apricornBag();
    const got = {};
    for (let i = 0; i < n; i++) { const c = APRICORNS[Math.floor(Math.random() * APRICORNS.length)]; bag[c]++; got[c] = (got[c] || 0) + 1; }
    return Object.entries(got).map(([c, k]) => `${k}× ${capWord(c)} Apricorn`).join(', ');
}
const apricornImg = (c, cls = '') => `<img class="${cls}" src="${ITEM_ART(c + '-apricorn')}" alt="${capWord(c)} Apricorn" title="${capWord(c)} Apricorn">`;

const WORKSHOP_RECIPES = [
    { out: { ball: 'great', n: 2 }, cost: { blue: 2 } },
    { out: { ball: 'ultra', n: 1 }, cost: { black: 2, yellow: 1 } },
    { out: { item: 'oran_berry', n: 3 }, cost: { pink: 1 } },
    { out: { item: 'full_restore', n: 1 }, cost: { pink: 2, white: 2 } },
    { out: { item: 'leftovers', n: 1 }, cost: { green: 3, white: 2 } },
    { out: { item: 'choice_band', n: 1 }, cost: { red: 3, black: 2 } },
    { out: { item: 'wise_glasses', n: 1 }, cost: { blue: 3, white: 2 } },
    { out: { item: 'scope_lens', n: 1 }, cost: { yellow: 2, black: 2 } },
    { out: { item: 'assault_vest', n: 1 }, cost: { black: 3, green: 2 } },
    { out: { item: 'life_orb', n: 1 }, cost: { red: 3, pink: 3 } },
    { out: { item: 'exp_share', n: 1 }, cost: { yellow: 2, green: 2, pink: 2 } },
    { out: { ball: 'master', n: 1 }, cost: { red: 3, blue: 3, yellow: 3, green: 3, pink: 3, white: 3, black: 3 } }
].filter(r => !r.out.item || HOLD_ITEMS_DB[r.out.item]);
const POUCH = { cost: 200, n: 5 };

function recipeInfo(r) {
    if (r.out.ball) { const b = BALL_SHOP[r.out.ball]; return { name: b.name, icon: ballIconUrl(r.out.ball, true), fallback: ballIconUrl(r.out.ball), desc: b.desc }; }
    const it = HOLD_ITEMS_DB[r.out.item];
    return { name: it.name, icon: `${ITEM_BASE}dream-world/${itemIconUrl(r.out.item).split('/').pop()}`, fallback: itemIconUrl(r.out.item), desc: it.desc };
}
const canCraft = r => Object.entries(r.cost).every(([c, k]) => (apricornBag()[c] || 0) >= k);

function workshopHtml() {
    const bag = apricornBag();
    const total = APRICORNS.reduce((a, c) => a + bag[c], 0);
    const pouch = `<div class="ws-bag g-card">
        <div class="ws-bag-head"><div><div class="g-font text-lg">Kurt's Workshop</div><div class="g-sub">Kurt turns Apricorns into Poké Balls and gear. Find them in the Safari Zone, from trainers and daily quests.</div></div>
        <button type="button" class="g-btn yellow sm" onclick="buyApricornPouch()">Pouch ×${POUCH.n} · 🪙 ${POUCH.cost}</button></div>
        <div class="ws-apricorns">${APRICORNS.map(c => `<div class="ws-apricorn${bag[c] ? '' : ' is-empty'}">${apricornImg(c)}<b>${bag[c]}</b></div>`).join('')}</div>
        ${total ? '' : '<p class="g-sub mt-1">Your apricorn bag is empty — visit the Safari Zone on the Adventure tab!</p>'}
    </div>`;
    const cards = WORKSHOP_RECIPES.map((r, i) => {
        const info = recipeInfo(r);
        const ok = canCraft(r);
        const owned = r.out.ball ? (gameState.balls[r.out.ball] || 0) : (gameState.inventoryItems[r.out.item] || 0);
        return `<div class="mart-card ws-card${ok ? ' can-craft' : ''}">
            <div class="mart-icon"><img src="${info.icon}" onerror="this.onerror=null;this.src='${info.fallback}'" alt=""></div>
            <div class="mart-name">${r.out.n > 1 ? r.out.n + '× ' : ''}${info.name}</div>
            <p class="mart-desc">${info.desc}</p>
            <div class="ws-cost">${Object.entries(r.cost).map(([c, k]) => `<span class="ws-need${(bag[c] || 0) >= k ? ' ok' : ''}">${apricornImg(c)}<b>${bag[c] || 0}/${k}</b></span>`).join('')}</div>
            <span class="g-chip">In bag: ${owned}</span>
            <button type="button" class="g-btn ${ok ? 'green' : 'ghost'} sm w-full" ${ok ? '' : 'disabled'} onclick="craftRecipe(${i})">Craft</button>
        </div>`;
    }).join('');
    return pouch + `<div class="ws-grid">${cards}</div>`;
}
window.craftRecipe = function(i) {
    initAudio();
    const r = WORKSHOP_RECIPES[i];
    if (!r || !canCraft(r)) { playFailCapture(); return; }
    const bag = apricornBag();
    Object.entries(r.cost).forEach(([c, k]) => { bag[c] -= k; });
    if (r.out.ball) gameState.balls[r.out.ball] = (gameState.balls[r.out.ball] || 0) + r.out.n;
    else gameState.inventoryItems[r.out.item] = (gameState.inventoryItems[r.out.item] || 0) + r.out.n;
    playSuccessCapture();
    showNotification('Kurt: "All done!"', `You received ${r.out.n}× ${recipeInfo(r).name}.`, 'success');
    gameEvent('craft', { recipe: r });
    saveProgress(); updateUI(); renderMart();
};
window.buyApricornPouch = function() {
    initAudio();
    if (gameState.coins < POUCH.cost) { playFailCapture(); showNotification('Not enough coins', `A pouch costs ${POUCH.cost} coins.`, 'error'); return; }
    spendCoins(POUCH.cost);
    const got = grantApricorns(POUCH.n);
    playConfirmSound();
    showNotification('Apricorn Pouch', `Inside: ${got}.`, 'success');
    saveProgress(); updateUI(); renderMart();
};

// ==========================================
// DAILY QUESTS — three a day (same for everyone), a bonus chest for finishing
// all three, and a streak that pays a Master Ball every 7 days.
// ==========================================
const QUEST_KINDS = {
    spin:        { text: q => `Spin the wheel ${q.target} times`, targets: [6, 10, 15], icon: 'poke-ball' },
    catch:       { text: q => `Catch ${q.target} Pokémon`, targets: [3, 5, 8], icon: 'great-ball' },
    catchType:   { text: q => `Catch ${q.target} ${capWord(q.type)}-type Pokémon`, targets: [1, 2], icon: 'ultra-ball' },
    catchRare:   { text: q => `Catch ${q.target} Rare, Epic or Legendary Pokémon`, targets: [1, 2], icon: 'luxury-ball' },
    battleWin:   { text: q => `Win ${q.target} battles`, targets: [2, 3, 5], icon: 'x-attack' },
    safariCatch: { text: q => `Catch ${q.target} Pokémon in the Safari Zone`, targets: [1, 2], icon: 'safari-ball' },
    craft:       { text: q => `Craft ${q.target} item${q.target > 1 ? 's' : ''} at Kurt's Workshop`, targets: [1], icon: 'red-apricorn' }
};
const QUEST_TYPES = ['normal', 'water', 'grass', 'bug', 'fire', 'electric', 'poison', 'ground', 'flying', 'rock', 'psychic', 'fighting'];

function questReward() {
    const lvl = gameState.level || 1;
    return { coins: Math.min(900, 150 + lvl * 20), apricorns: 2 };
}
function ensureQuests() {
    const today = localDateKey();
    const q = gameState.quests;
    if (q && q.date === today && Array.isArray(q.list)) return q;
    const rng = seededRng(hashString('quests-' + today));
    const kinds = Object.keys(QUEST_KINDS);
    const picked = [];
    while (picked.length < 3) { const k = kinds[Math.floor(rng() * kinds.length)]; if (!picked.includes(k)) picked.push(k); }
    const list = picked.map(kind => {
        const def = QUEST_KINDS[kind];
        const quest = { kind, target: def.targets[Math.floor(rng() * def.targets.length)], progress: 0, claimed: false, reward: questReward() };
        if (kind === 'catchType') quest.type = QUEST_TYPES[Math.floor(rng() * QUEST_TYPES.length)];
        return quest;
    });
    gameState.quests = { date: today, list, chestClaimed: false, streak: q ? q.streak || 0 : 0, lastFullDate: q ? q.lastFullDate || null : null };
    return gameState.quests;
}
function questDone(q) { return q.progress >= q.target; }
function questsClaimable() {
    const qs = ensureQuests();
    return qs.list.filter(q => questDone(q) && !q.claimed).length + (qs.list.every(q => q.claimed) && !qs.chestClaimed ? 1 : 0);
}
function bumpQuest(kind, amount = 1, filter) {
    const qs = ensureQuests();
    let changed = false;
    qs.list.forEach(q => {
        if (q.kind !== kind || questDone(q) || (filter && !filter(q))) return;
        q.progress = Math.min(q.target, q.progress + amount);
        changed = true;
        if (questDone(q)) {
            playSuccessCapture();
            showNotification('📋 Quest complete!', `${QUEST_KINDS[q.kind].text(q)} — claim your reward.`, 'success');
        }
    });
    if (changed) renderQuestBadge();
}

onGameEvent((name, data) => {
    if (name === 'catch' && (data.shiny || (data.pokemon && data.pokemon.isShiny) || data.rarity === 'Legendary')) Portal.happytime();
    if (name === 'battleWin' && data.stage && (data.stage.isGym || data.stage.isChampion)) Portal.happytime();
    if (name === 'spin') bumpQuest('spin');
    if (name === 'catch') {
        const p = data.pokemon || {};
        bumpQuest('catch');
        bumpQuest('catchType', 1, q => [p.type1, p.type2].includes(q.type));
        if (['Rare', 'Epic', 'Legendary'].includes(data.rarity || p.rarity)) bumpQuest('catchRare');
        if (data.safari) bumpQuest('safariCatch');
    }
    if (name === 'battleWin') {
        bumpQuest('battleWin');
        const stage = data.stage;
        const n = stage && (stage.isGym || stage.isElite4 || stage.isChampion) ? 3 : 1;
        const got = grantApricorns(n);
        const log = document.getElementById('battleLog');
        if (log) { log.innerHTML += `<div class="text-amber-300 mt-1">🍎 Found ${got}!</div>`; log.scrollTop = log.scrollHeight; }
    }
    if (name === 'craft') bumpQuest('craft');
});

function renderQuestBadge() {
    const badge = document.getElementById('questBadge');
    if (!badge) return;
    const n = questsClaimable();
    badge.textContent = n;
    badge.classList.toggle('hidden', !n);
    if (document.getElementById('questModal')?.classList.contains('flex')) renderQuests();
}
function renderQuests() {
    const qs = ensureQuests();
    const body = document.getElementById('questBody');
    if (!body) return;
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const allClaimed = qs.list.every(q => q.claimed);
    body.innerHTML = `
        <div class="quest-meta"><span class="g-chip">🔥 Streak: ${qs.streak || 0} day${qs.streak === 1 ? '' : 's'}</span><span class="g-sub">New quests in ${formatDuration(midnight - now)}</span></div>
        ${qs.list.map((q, i) => {
            const def = QUEST_KINDS[q.kind];
            const pct = Math.round(q.progress / q.target * 100);
            return `<div class="quest-card${q.claimed ? ' is-claimed' : questDone(q) ? ' is-done' : ''}">
                <img class="quest-ico" src="${ITEM_ART(def.icon)}" alt="">
                <div class="min-w-0 flex-1">
                    <div class="quest-text">${def.text(q)}</div>
                    <div class="stat-bar quest-bar"><span style="width:${pct}%"></span></div>
                    <div class="quest-reward">🪙 ${formatNum(q.reward.coins)} · 🍎 ${q.reward.apricorns} Apricorns · ${q.progress}/${q.target}</div>
                </div>
                ${q.claimed ? '<span class="g-chip">✓</span>' : `<button type="button" class="g-btn ${questDone(q) ? 'green' : 'ghost'} sm" ${questDone(q) ? '' : 'disabled'} onclick="claimQuest(${i})">Claim</button>`}
            </div>`;
        }).join('')}
        <div class="quest-chest${allClaimed && !qs.chestClaimed ? ' is-ready' : ''}${qs.chestClaimed ? ' is-claimed' : ''}">
            <div class="quest-chest-ico">🎁</div>
            <div class="min-w-0 flex-1"><div class="quest-text">Daily chest</div><div class="quest-reward">Finish all three: 🪙 300 + 2 Ultra Balls${((qs.streak || 0) + 1) % 7 === 0 && !qs.chestClaimed ? ' + a Master Ball (7-day streak!)' : ' · every 7-day streak adds a Master Ball'}</div></div>
            ${qs.chestClaimed ? '<span class="g-chip">✓</span>' : `<button type="button" class="g-btn yellow sm" ${allClaimed ? '' : 'disabled'} onclick="claimQuestChest()">Open</button>`}
        </div>`;
}
window.claimQuest = function(i) {
    const qs = ensureQuests();
    const q = qs.list[i];
    if (!q || q.claimed || !questDone(q)) return;
    q.claimed = true;
    addCoins(q.reward.coins);
    const got = grantApricorns(q.reward.apricorns);
    playConfirmSound();
    showNotification('Reward claimed!', `+${formatNum(q.reward.coins)} coins and ${got}.`, 'success');
    saveProgress(); updateUI(); renderQuests(); renderQuestBadge();
};
window.claimQuestChest = function() {
    const qs = ensureQuests();
    if (qs.chestClaimed || !qs.list.every(q => q.claimed)) return;
    qs.chestClaimed = true;
    const y = new Date(); y.setDate(y.getDate() - 1);
    qs.streak = qs.lastFullDate === localDateKey(y) ? (qs.streak || 0) + 1 : 1;
    qs.lastFullDate = qs.date;
    addCoins(300);
    gameState.balls.ultra = (gameState.balls.ultra || 0) + 2;
    let extra = '';
    if (qs.streak % 7 === 0) { gameState.balls.master = (gameState.balls.master || 0) + 1; extra = ' and a Master Ball for your 7-day streak!'; }
    playSuccessCapture();
    showNotification('🎁 Daily chest!', `+300 coins, 2 Ultra Balls${extra || '.'}`, 'success');
    saveProgress(); updateUI(); renderQuests(); renderQuestBadge();
};
window.openQuests = function() {
    initAudio(); playConfirmSound();
    renderQuests();
    const m = document.getElementById('questModal'); m.classList.remove('hidden'); m.classList.add('flex');
};
window.closeQuests = function() { const m = document.getElementById('questModal'); m.classList.add('hidden'); m.classList.remove('flex'); };

// ==========================================
// SAFARI ZONE — pay once for 20 Safari Balls. Throw bait to calm a Pokémon
// (less likely to flee, harder to catch) or a rock to rile it up (easier to
// catch, more likely to flee), like the Kanto Safari Zone.
// ==========================================
const SAFARI = { cost: 500, balls: 20, catchBase: { Common: 0.5, Rare: 0.33, Epic: 0.2 }, fleeBase: { Common: 0.08, Rare: 0.14, Epic: 0.22 } };
let safariBusy = false;

function safariPickSpecies() {
    const r = Math.random();
    const rarity = r < 0.62 ? 'Common' : r < 0.9 ? 'Rare' : 'Epic';
    const gens = getActiveGens();
    const legends = new Set(LEGENDARY_MYTHICAL_POKEMON);
    let pool = [];
    for (const g of gens) pool = pool.concat((BASIC_POKEMON_POOLS[rarity] || {})[g] || []);
    pool = pool.filter(id => !legends.has(id));
    if (!pool.length) pool = BASIC_POKEMON_POOLS.Common.gen1;
    return { id: pickWeatherWeighted(pool), rarity };
}
async function safariNewEncounter() {
    const s = gameState.safari;
    if (!s) return;
    safariBusy = true;
    s.current = null;
    renderSafari('Walking through the tall grass…');
    const { id, rarity } = safariPickSpecies();
    let p;
    try { p = await fetchPokemonData(id, getWildLevel(rarity)); } catch (e) { p = null; }
    if (!gameState.safari) { safariBusy = false; return; }
    if (!p) { safariBusy = false; renderSafari('The grass is quiet… try again.'); return; }
    p.rarity = rarity;
    p.level = p.level || getWildLevel(rarity);
    const shiny = rollShiny();
    s.encounters = (s.encounters || 0) + 1;
    s.current = { pokemon: p, shiny, status: null, turns: 0 };
    markSeen(p.id, p.name);
    let msg = `A wild ${shiny ? '✨shiny✨ ' : ''}${p.name} appeared!`;
    if (Math.random() < 0.25) msg += ` You found a ${grantApricorns(1).replace('1× ', '')} in the grass!`;
    safariBusy = false;
    playConfirmSound();
    renderSafari(msg);
    saveProgress();
}
function safariCatchChance(c) {
    let chance = SAFARI.catchBase[c.pokemon.rarity] || 0.4;
    if (c.status === 'eating') chance *= 0.7;
    if (c.status === 'angry') chance *= 1.8;
    return Math.min(0.95, chance);
}
function safariFleeChance(c) {
    let flee = SAFARI.fleeBase[c.pokemon.rarity] || 0.1;
    if (c.status === 'eating') flee *= 0.4;
    if (c.status === 'angry') flee *= 1.8;
    return Math.min(0.9, flee);
}
function safariAddCaught(p, shiny) {
    const caught = {
        uid: nextCatchUid++, id: p.id, name: p.name, type1: p.type1, type2: p.type2,
        sprite: pixelSprite(p.id, shiny), hp: p.hp, atk: p.atk, def: p.def,
        spAtk: p.spAtk || 60, spDef: p.spDef || 60, speed: p.speed || 60,
        moves: p.moves && p.moves.length ? p.moves.slice(0, 4) : getMovesForLevel(p.id, p.level),
        isShiny: shiny, heldItem: null, level: p.level, xp: 0, friendship: 70, battleCount: 0,
        caughtAt: Date.now(), rarity: p.rarity || 'Common', caughtIn: 'safari'
    };
    gameState.pcBox.push(caught);
    if (!gameState.pokedex.find(x => x.id === p.id && x.isShiny === shiny)) gameState.pokedex.push(caught);
    return caught;
}
function safariAfterTurn(msgs) {
    const s = gameState.safari;
    const c = s.current;
    if (c && c.status) { c.turns--; if (c.turns <= 0) { msgs.push(c.status === 'eating' ? `${c.pokemon.name} finished eating.` : `${c.pokemon.name} calmed down.`); c.status = null; } }
    if (c && Math.random() < safariFleeChance(c)) {
        msgs.push(`${c.pokemon.name} ran away!`);
        s.current = null;
        playFailCapture();
    }
}
window.safariAction = async function(kind) {
    initAudio();
    const s = gameState.safari;
    if (!s || safariBusy) return;
    const c = s.current;
    if (kind === 'next') { if (s.balls > 0) safariNewEncounter(); return; }
    if (!c) return;
    const name = c.pokemon.name;
    const msgs = [];
    if (kind === 'run') { s.current = null; playBeep(); renderSafari(`Got away safely from ${name}.`); saveProgress(); return; }
    if (kind === 'bait') {
        c.status = 'eating'; c.turns = 1 + Math.floor(Math.random() * 5);
        msgs.push(`You threw some bait. ${name} is eating!`);
        playBeep();
        safariAfterTurn(msgs);
    } else if (kind === 'rock') {
        c.status = 'angry'; c.turns = 1 + Math.floor(Math.random() * 5);
        msgs.push(`You threw a rock. ${name} is angry!`);
        playNormalHit();
        safariAfterTurn(msgs);
    } else if (kind === 'ball') {
        if (s.balls <= 0) return;
        s.balls--;
        safariBusy = true;
        const caught = Math.random() < safariCatchChance(c) || (c.shiny && Math.random() < 0.9);
        const shakes = caught ? 3 : Math.floor(Math.random() * 3);
        await safariThrowAnimation(shakes, caught);
        safariBusy = false;
        if (!gameState.safari) return;
        if (caught) {
            const mon = safariAddCaught(c.pokemon, c.shiny);
            s.caught.push({ id: mon.id, name: mon.name, shiny: mon.isShiny });
            addCoins(15); addXP(10);
            playSuccessCapture();
            msgs.push(`Gotcha! ${name} was caught!`);
            gameEvent('catch', { pokemon: mon, rarity: mon.rarity, safari: true });
            s.current = null;
        } else {
            playFailCapture();
            msgs.push(['Oh no! It broke free!', 'Aww! It appeared to be caught!', 'Aargh! Almost had it!'][Math.min(2, shakes)]);
            safariAfterTurn(msgs);
        }
    }
    if (s.balls <= 0 && s.current) { msgs.push('You are out of Safari Balls!'); s.current = null; }
    renderSafari(msgs.join(' '));
    saveProgress(); updateUI();
};
function safariThrowAnimation(shakes, caught) {
    return new Promise(resolve => {
        const scene = document.getElementById('safariScene');
        const sprite = document.getElementById('safariSprite');
        if (!scene || !sprite) return resolve();
        const ball = document.createElement('img');
        ball.className = 'safari-ball';
        ball.src = ITEM_ART('safari-ball');
        scene.appendChild(ball);
        sprite.classList.add('is-absorbed');
        ball.style.setProperty('--shakes', shakes);
        ball.classList.add('is-thrown');
        const total = 650 + shakes * 700 + 350;
        setTimeout(() => {
            if (caught) ball.classList.add('is-caught');
            else { ball.classList.add('is-burst'); sprite.classList.remove('is-absorbed'); }
            setTimeout(() => { ball.remove(); resolve(); }, 420);
        }, total);
    });
}
function renderSafari(message) {
    const s = gameState.safari;
    const body = document.getElementById('safariBody');
    if (!body) return;
    if (!s) {
        body.innerHTML = `<div class="safari-intro">
            <img src="${ITEM_ART('safari-ball')}" alt="" class="safari-intro-ball">
            <p>Pay <b>🪙 ${SAFARI.cost}</b> for <b>${SAFARI.balls} Safari Balls</b> and roam the tall grass.</p>
            <ul class="help-steps">
                <li>No battles: throw <b>Bait</b> to keep a Pokémon from fleeing, or a <b>Rock</b> to make it easier to catch (it may run!).</li>
                <li>Rarer Pokémon flee more often. The weather decides who's out: <b>${currentWeather().icon} ${currentWeather().name}</b>.</li>
                <li>Look out for <b>Apricorns</b> hidden in the grass.</li>
            </ul>
            <button type="button" class="g-btn green w-full" onclick="enterSafari()">Enter the Safari Zone</button>
        </div>`;
        return;
    }
    const c = s.current;
    const p = c && c.pokemon;
    const statusTag = c && c.status ? `<span class="safari-status is-${c.status}">${c.status === 'eating' ? '🍓 Eating' : '💢 Angry'}</span>` : '';
    const done = s.balls <= 0 && !c;
    body.innerHTML = `
        <div class="safari-hud"><span class="g-chip"><img src="${ITEM_ART('safari-ball')}" alt=""> × ${s.balls}</span><span class="g-chip">Caught ${s.caught.length}</span><span class="g-chip">${currentWeather().icon}</span></div>
        <div id="safariScene" class="safari-scene">
            ${p ? `<div class="safari-nameplate"><b>${p.name}</b> Lv ${p.level} ${typeChip(p.type1)}${typeChip(p.type2)} ${statusTag}</div>
                   <img id="safariSprite" class="safari-sprite" src="${battleSpriteCandidates(p.id, c.shiny, false)[0]}" data-fallbacks="${battleSpriteCandidates(p.id, c.shiny, false).slice(1).join('|')}" onerror="_spriteFallback(this)" alt="${p.name}">`
                : `<div class="safari-empty">${done ? '🏁' : safariBusy ? '🌾' : '🌿'}</div>`}
        </div>
        <div class="safari-msg">${message || (p ? `What will you do?` : done ? 'The Safari Game is over!' : 'Keep exploring the grass.')}</div>
        ${p ? `<div class="safari-actions">
                <button type="button" class="g-btn green" onclick="safariAction('ball')">Ball</button>
                <button type="button" class="g-btn yellow" onclick="safariAction('bait')">Bait</button>
                <button type="button" class="g-btn red" onclick="safariAction('rock')">Rock</button>
                <button type="button" class="g-btn blue" onclick="safariAction('run')">Run</button>
            </div>`
            : done ? `<div class="safari-caught">${s.caught.length ? s.caught.map(m => `<img src="${pixelSprite(m.id, m.shiny)}" alt="${m.name}" title="${m.name}">`).join('') : '<p class="g-sub">No catches this time.</p>'}</div>
                     <button type="button" class="g-btn green w-full" onclick="leaveSafari()">Leave the Safari Zone</button>`
            : `<div class="safari-actions"><button type="button" class="g-btn green" ${safariBusy ? 'disabled' : ''} onclick="safariAction('next')">Walk on 🌿</button><button type="button" class="g-btn ghost" onclick="leaveSafari()">Leave</button></div>`}`;
}
window.openSafari = function() {
    initAudio(); playConfirmSound();
    const m = document.getElementById('safariModal'); m.classList.remove('hidden'); m.classList.add('flex');
    renderSafari();
};
window.enterSafari = function() {
    if (gameState.safari) return renderSafari();
    if (gameState.coins < SAFARI.cost) { playFailCapture(); showNotification('Not enough coins', `The Safari Zone costs ${SAFARI.cost} coins.`, 'error'); return; }
    spendCoins(SAFARI.cost);
    gameState.safari = { balls: SAFARI.balls, caught: [], encounters: 0, current: null };
    saveProgress(); updateUI();
    safariNewEncounter();
};
window.leaveSafari = function() {
    const s = gameState.safari;
    if (s && (s.balls > 0) && !confirm(`Leave with ${s.balls} Safari Balls left? They can't be used outside.`)) return;
    if (s && s.caught.length) showNotification('Safari Game over', `You caught ${s.caught.length} Pokémon! They're in your PC.`, 'success');
    const hadTrip = !!s;
    gameState.safari = null;
    saveProgress(); updateUI();
    window.closeSafari(true);

};
window.closeSafari = function() {
    const m = document.getElementById('safariModal'); m.classList.add('hidden'); m.classList.remove('flex');
};

// First paint of the new HUD bits
renderWeatherChip();
ensureQuests();
renderQuestBadge();
