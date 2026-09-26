// PokeSpinner — Battle engine: setup, HUD, moves, status, switching, animations.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

function launchStagePrep(stage) {
    // Check for unsolved gym puzzle
    if (stage.gymPuzzle && stage.isGym) {
        const solved = gameState.solvedGymPuzzles || [];
        if (!solved.includes(stage.stageId)) {
            showGymPuzzle(stage);
            return;
        }
    }
    initAudio();
    playConfirmSound();
    gameState.activeBattleStage = stage;
    // Check PC box first — need at least one Pokémon
    if (!gameState.pcBox || gameState.pcBox.length === 0) {
        showNotification("No Pokémon!", "Spin the wheel to catch Pokémon before battling.", "error");
        return;
    }
    const teamFighters = getBattleFighterPool(true);
    if (teamFighters.length > 0) {
        document.getElementById('battleSelector').classList.add('hidden');
        selectFighterAndBegin(teamFighters[0]);
        return;
    }
    document.getElementById('battleSelector').classList.add('hidden');
    document.getElementById('fighterSelector').classList.remove('hidden');
    renderFighterSelectionGrid();
}

function getBattleFighterPool(forceTeamOnly = false) {
    const useTeamOnly = forceTeamOnly || !gameState.activeBattleStage;
    if (useTeamOnly) {
        return gameState.team
            .map(uid => gameState.pcBox.find(pk => pk.uid === uid))
            .filter(Boolean);
    }
    if (gameState.team && gameState.team.some(Boolean)) {
        const fromTeam = gameState.team
            .map(uid => gameState.pcBox.find(pk => pk.uid === uid))
            .filter(Boolean);
        if (fromTeam.length > 0) return fromTeam;
    }
    return [...gameState.pcBox];
}

function renderFighterSelectionGrid() {
    const grid = document.getElementById('fighterSelectionGrid');
    if (!grid) return;
    grid.innerHTML = "";

    const fighterPool = getBattleFighterPool();
    if (fighterPool.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-400">
                ${t('battle.noTeamMsg')}
            </div>
        `;
        return;
    }

    fighterPool.forEach((pk, index) => {
        const card = document.createElement('div');
        card.className = "bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-2xl p-4 text-center cursor-pointer transition duration-150 relative flex flex-col justify-between";
        card.onclick = () => selectFighterAndBegin(pk);

        let itemStr = pk.heldItem ? HOLD_ITEMS_DB[pk.heldItem].name : t('battle.noItem');
        let currentLevel = pk.level || 1;
        let badge = '';
        if (gameState.team && gameState.team.some(Boolean) && index === 0) {
            badge = `<span class="absolute top-2 left-2 text-[7px] bg-cyan-500 text-white px-1 rounded uppercase font-black tracking-widest">${t('battle.leadBadge')}</span>`;
        }

        card.innerHTML = `
            <div class="flex justify-center mb-2">
                <img src="${pk.sprite}" alt="${pk.name}" class="h-16 w-16 object-contain" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
            </div>
            <div>
                <div class="text-xs font-bold text-white truncate">${pk.name}</div>
                <div class="text-[9px] text-slate-400 font-mono mt-1">${t('common.lv')} ${currentLevel} | ${t('battle.item')}: <span class="text-cyan-400 font-bold">${itemStr}</span></div>
            </div>
            ${badge}
            ${pk.isShiny ? `<span class="absolute top-2 right-2 text-[7px] bg-pink-500 text-white px-1 rounded uppercase font-black tracking-widest">${t('battle.shinyBadge')}</span>` : ''}
        `;
        grid.appendChild(card);
    });
}

async function selectFighterAndBegin(pokemon) {
    // Ignore double taps while opponents are still being fetched
    if (gameState.battle.starting) return;
    playConfirmSound();
    const stage = gameState.activeBattleStage;
    // 50-coin fee only for endless simulation (no active stage)
    if (!stage) {
        const BATTLE_ENTRY_COST = 50;
        if (gameState.coins < BATTLE_ENTRY_COST) {
            showNotification('Not Enough Coins', `Endless simulation entry requires ${BATTLE_ENTRY_COST} Coins.`, 'error');
            resetBattleScreen();
            return;
        }
        spendCoins(BATTLE_ENTRY_COST);
        showNotification('Entry Fee Paid', `-${BATTLE_ENTRY_COST} Coins — good luck, trainer!`, 'info');
    }
    let enemyProfile = null;
    let enemyTeam = [];
    gameState.battle.starting = true;
    const session = (gameState.battle.session || 0) + 1;
    gameState.battle.session = session;
    document.getElementById('battleSelector').classList.add('hidden');
    document.getElementById('fighterSelector').classList.add('hidden');
    document.getElementById('battleArenaActive').classList.add('hidden');
    document.getElementById('battleLoading').classList.remove('hidden');
    document.getElementById('battleLoadingText').textContent = stage
        ? `${stage.trainer} ${t('battle.wantsToBattle')}`
        : t('battle.preparing');

    try {
        if (stage) {
            // The trainer's real party; the ace (last) battles at the stage level
            const partyIds = getStageTeam(stage);
            const members = await Promise.all(partyIds.map((memberId, index) => {
                const memberLevel = Math.max(2, stage.level - (partyIds.length - 1 - index) * 2);
                return fetchPokemonData(memberId, memberLevel).then(member => ({ member, memberLevel }));
            }));
            members.forEach(({ member, memberLevel }) => {
                member.hp = member.hp + (memberLevel * 3);
                member.atk = member.atk + (memberLevel * 1.2);
                member.def = member.def + (memberLevel * 1);
                member.spAtk = member.spAtk + (memberLevel * 1.2);
                member.spDef = member.spDef + (memberLevel * 1);
                member.name = `${stage.trainer}'s ${member.name}`;
                member.level = memberLevel;
                if (memberLevel >= 20) member.heldItem = "oran_berry";
                enemyTeam.push(member);
            });
            enemyProfile = enemyTeam[0];
        } else {
            const fighterLevel = pokemon.level || 1;
            const endlessEnemyLevel = Math.max(1, Math.ceil((fighterLevel - 0.7) + ((gameState.endlessRunDefeats || 0) * 0.1)));
            const genRange = getRadarGenRange();
            const idDiff = genRange.max - genRange.min;
            const randomEnemyId = Math.floor(Math.random() * (idDiff + 1)) + genRange.min;

            enemyProfile = await fetchPokemonData(randomEnemyId, endlessEnemyLevel);
            enemyProfile.hp = enemyProfile.hp + (endlessEnemyLevel * 3);
            enemyProfile.atk = enemyProfile.atk + (endlessEnemyLevel * 1.2);
            enemyProfile.def = enemyProfile.def + (endlessEnemyLevel * 1);
            enemyProfile.spAtk = enemyProfile.spAtk + (endlessEnemyLevel * 1.2);
            enemyProfile.spDef = enemyProfile.spDef + (endlessEnemyLevel * 1);
            enemyProfile.name = "Simulated " + enemyProfile.name;
            enemyProfile.level = endlessEnemyLevel;
            if (endlessEnemyLevel >= 20) enemyProfile.heldItem = "oran_berry";
            enemyTeam = [enemyProfile];
        }
        // Make sure every move on the field has its official data loaded
        const partyForMoves = getBattleFighterPool(true);
        await Promise.all(partyForMoves.map(p => ensureLearnset(p.id)));
        await ensureMoveData([...partyForMoves, pokemon].flatMap(p => p.moves || []));
    } finally {
        gameState.battle.starting = false;
        document.getElementById('battleLoading').classList.add('hidden');
    }
    // The player left (Run / tab switch) while opponents were loading
    if (gameState.battle.session !== session) return;

    gameState.battle.bossPokemon = enemyProfile;
    gameState.battle.fighterPokemon = pokemon;
    gameState.battle.enemyTeam = enemyTeam;
    enemyTeam.forEach(m => markSeen(m.id, m.name));
    gameState.battle.enemyTeamIndex = 0;

    // Set up full player team for auto-switching
    const allTeamFighters = getBattleFighterPool(true);
    gameState.battle.playerTeam = allTeamFighters.length > 0 ? allTeamFighters : [pokemon];
    gameState.battle.playerTeamIndex = gameState.battle.playerTeam.findIndex(p => p.uid === pokemon.uid);
    if (gameState.battle.playerTeamIndex === -1) gameState.battle.playerTeamIndex = 0;

    const scaledHP = getBattleMaxHP(pokemon);

    gameState.battle.fighterHP = scaledHP;
    gameState.battle.fighterMaxHP = scaledHP;
    gameState.battle.bossHP = enemyProfile.hp;
    gameState.battle.bossMaxHP = enemyProfile.hp;
    gameState.battle.oranUsed = false;
    gameState.battle.bossOranUsed = false;
    // Reset per-battle stat stages and status conditions
    gameState.battle.statStages = { player:{atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0}, boss:{atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0} };
    gameState.battle.statusConds = { player: null, boss: null };
    gameState.battle.statusMeta = { player: {}, boss: {} };
    gameState.battle.choiceBandMove = null;
    gameState.battle.faintedUids = new Set();
    gameState.battle.busy = false;
    gameState.battle.pendingSwap = false;
    gameState.battle.pp = {};          // PP refills at the start of every battle
    gameState.battle.menu = 'main';
    // Per-battle HP tracker: saves HP of benched Pokémon so they return damaged
    gameState.battle.teamHp = {};

    document.getElementById('battleArenaActive').classList.remove('hidden');
    renderBattleHeader();
    renderBattleSide('boss');
    renderBattleSide('player');

    document.getElementById('battleLog').innerHTML = `<div class="text-cyan-400">${t('battle.combatInit')}<span class="font-bold text-white">${enemyProfile.name}</span>!</div>`;
    flashEffectiveness('');

    gameState.battle.active = true;
    renderBattleMoves(pokemon);

    // On phones the arena can start below the fold — bring it into view
    const arena = document.getElementById('battleArenaActive');
    const headerH = (document.querySelector('header') || {}).offsetHeight || 0;
    const top = arena.getBoundingClientRect().top;
    if (top < headerH || top > window.innerHeight * 0.4) {
        window.scrollTo({ top: Math.max(0, window.scrollY + top - headerH - 8), behavior: 'smooth' });
    }
}

// ── Battle HUD helpers ────────────────────────────────────────────
// One place renders each side of the field, so every code path
// (battle start, switching, fainting, next trainer Pokémon, endless
// rounds) produces the same, consistent HUD.
const BATTLE_TYPE_COLORS = {
    normal:'#a8a77a', fire:'#ee8130', water:'#6390f0', electric:'#f7d02c', grass:'#7ac74c', ice:'#96d9d6',
    fighting:'#c22e28', poison:'#a33ea1', ground:'#e2bf65', flying:'#a98ff3', psychic:'#f95587', bug:'#a6b91a',
    rock:'#b6a136', ghost:'#735797', dragon:'#6f35fc', dark:'#705746', steel:'#b7b7ce', fairy:'#d685ad'
};
const BATTLE_STATUS_TAGS = {
    sleep:['SLP','#a5b4fc'], para:['PAR','#facc15'], burn:['BRN','#fb923c'],
    poison:['PSN','#c084fc'], freeze:['FRZ','#7dd3fc'], leech:['SEED','#4ade80']
};

function getBattleMaxHP(pokemon) {
    const lvlMult = 1 + (((pokemon.level || 1) - 1) * 0.05);
    return Math.max(1, Math.round((pokemon.hp + (pokemon.hpBonus || 0)) * lvlMult));
}

function getTypeEffectiveness(moveType, defender) {
    let mod = 1.0;
    const row = TYPE_MATCHUPS[moveType];
    if (row && defender) {
        if (row[defender.type1] !== undefined) mod *= row[defender.type1];
        if (defender.type2 && row[defender.type2] !== undefined) mod *= row[defender.type2];
    }
    return mod;
}

function hpLevel(pct) { return pct > 50 ? 'high' : pct > 20 ? 'mid' : 'low'; }

function pickBossMove(boss) {
    const moves = boss && boss.moves && boss.moves.length ? boss.moves : ['tackle'];
    return moves[Math.floor(Math.random() * moves.length)];
}

function replaySpriteAnim(sprite, cls) {
    sprite.classList.remove('is-hit', 'is-fainted', 'is-entering', 'is-lunge-right', 'is-lunge-left', 'is-charging');
    void sprite.offsetWidth; // restart the animation
    sprite.classList.add(cls);
    if (cls !== 'is-fainted') setTimeout(() => sprite.classList.remove(cls), 600);
}

// How long after an attack animation starts the damage lands on screen
const FX_HIT_DELAY = 380;
function syncBattleHP(delay) {
    if (delay) { setTimeout(() => syncBattleHP(0), delay); return; }
    const b = gameState.battle;
    [
        [b.fighterHP, b.fighterMaxHP, 'playerFighterHPBar', 'playerFighterHPText', 'playerFighterSprite'],
        [b.bossHP, b.bossMaxHP, 'bossHPBar', 'bossHPText', 'bossSprite']
    ].forEach(([hp, max, barId, textId, spriteId]) => {
        const bar = document.getElementById(barId);
        if (!bar) return;
        hp = Math.max(0, Math.round(hp || 0));
        max = Math.max(1, Math.round(max || 1));
        const pct = Math.max(0, Math.min(100, (hp / max) * 100));
        bar.style.width = `${pct.toFixed(1)}%`;
        bar.dataset.hp = hpLevel(pct);
        const text = document.getElementById(textId);
        if (text) text.textContent = `${hp}/${max}`;
        // Visual feedback: flinch on damage, drop on faint
        const sprite = document.getElementById(spriteId);
        const prev = bar.dataset.prevHp === '' || bar.dataset.prevHp === undefined ? NaN : Number(bar.dataset.prevHp);
        if (sprite) {
            if (hp <= 0 && prev !== 0) replaySpriteAnim(sprite, 'is-fainted');
            else if (hp > 0 && hp < prev) replaySpriteAnim(sprite, 'is-hit');
        }
        bar.dataset.prevHp = String(hp);
    });
    // EXP towards the next level (the game uses level × 100 XP per level)
    const expBar = document.getElementById('playerExpBar');
    const f = b.fighterPokemon;
    if (expBar && f) expBar.style.width = `${Math.min(100, ((f.xp || 0) / ((f.level || 1) * 100)) * 100).toFixed(1)}%`;
    renderBattlePips();
}

function renderBattleSide(side) {
    const b = gameState.battle;
    const isPlayer = side === 'player';
    const mon = isPlayer ? b.fighterPokemon : b.bossPokemon;
    if (!mon) return;
    const id = isPlayer
        ? { sprite:'playerFighterSprite', name:'playerFighterName', lvl:'playerFighterLevelBadge', types:'playerTypeTags', item:'playerHeldItemBadge', bar:'playerFighterHPBar' }
        : { sprite:'bossSprite', name:'bossName', lvl:'bossLevelBadge', types:'bossTypeTags', item:'bossHeldItemBadge', bar:'bossHPBar' };
    // Animated game sprite (your own Pokémon from behind), with fallbacks
    const sprite = document.getElementById(id.sprite);
    const candidates = battleSpriteCandidates(mon.id || 0, !!mon.isShiny, isPlayer);
    sprite.onload = () => {
        const src = sprite.currentSrc || sprite.src;
        fitBattleSprite(sprite, isPlayer);
        sprite.classList.toggle('is-artwork', src.includes('official-artwork'));
        // Fell back to a front sprite: mirror it so it faces the opponent
        sprite.style.setProperty('--flip', isPlayer && !src.includes('/back/') ? -1 : 1);
    };
    sprite.style.setProperty('--flip', 1);
    sprite.dataset.fallbacks = candidates.slice(1).join('|');
    sprite.src = candidates[0];
    sprite.alt = mon.name;
    replaySpriteAnim(sprite, 'is-entering');
    const nameEl = document.getElementById(id.name);
    // The trainer is already named in the top bar, so the HUD shows just the species
    const stage = gameState.activeBattleStage;
    const shownName = !isPlayer && stage && mon.name.startsWith(`${stage.trainer}'s `) ? mon.name.slice(stage.trainer.length + 3) : mon.name;
    nameEl.textContent = (mon.isShiny ? '✨ ' : '') + shownName;
    nameEl.title = mon.name;
    document.getElementById(id.lvl).textContent = `${t('battle.lvl')} ${mon.level || 1}`;
    document.getElementById(id.types).innerHTML = [mon.type1, mon.type2].filter(Boolean)
        .map(tp => `<span class="hud-chip hud-chip--type" style="--type-color:${BATTLE_TYPE_COLORS[tp] || '#94a3b8'}">${tp}</span>`).join('');
    const held = mon.heldItem && HOLD_ITEMS_DB[mon.heldItem];
    document.getElementById(id.item).innerHTML = held
        ? `<span class="hud-chip hud-chip--item" title="${t('battle.item')}: ${held.name}">🎒 ${held.name}</span>` : '';
    // New Pokémon on the field: don't treat its HP as "damage" vs. the previous one
    document.getElementById(id.bar).dataset.prevHp = '';
    syncBattleHP();
    renderStatStagesUI();
}

// Showdown sprites are drawn to each Pokémon's real size, so scale them to fit
// their half of the field (pixel-crisp, never beyond the base zoom).
function fitBattleSprite(sprite, isPlayer) {
    const field = document.getElementById('battleField');
    if (!field || !sprite.naturalWidth || sprite.classList.contains('is-artwork')) { sprite.style.removeProperty('--fit'); return; }
    const base = parseFloat(getComputedStyle(field).getPropertyValue('--sprite-scale')) || 2;
    const maxH = field.clientHeight * (isPlayer ? 0.62 : 0.4);
    const maxW = field.clientWidth * (isPlayer ? 0.5 : 0.4);
    const fit = Math.min(base * (isPlayer ? 1.18 : 1), maxH / sprite.naturalHeight, maxW / sprite.naturalWidth);
    sprite.style.setProperty('--fit', Math.max(0.6, fit).toFixed(3));
}
window.addEventListener('resize', () => {
    ['playerFighterSprite', 'bossSprite'].forEach(id => { const el = document.getElementById(id); if (el) fitBattleSprite(el, id === 'playerFighterSprite'); });
});

function renderBattlePips() {
    const b = gameState.battle;
    const pip = (state) => `<span class="battle-pip${state ? ' is-' + state : ''}"></span>`;
    const playerEl = document.getElementById('playerTeamPips');
    if (playerEl) {
        const fainted = b.faintedUids || new Set();
        const team = b.playerTeam || [];
        const isActive = p => !!b.fighterPokemon && p.uid === b.fighterPokemon.uid;
        playerEl.innerHTML = team.length > 1 ? team.map(p =>
            pip(fainted.has(p.uid) || (isActive(p) && b.fighterHP <= 0) ? 'fainted' : isActive(p) ? 'active' : '')
        ).join('') : '';
    }
    const bossEl = document.getElementById('bossTeamPips');
    if (bossEl) {
        const team = b.enemyTeam || [];
        const idx = b.enemyTeamIndex || 0;
        bossEl.innerHTML = team.length > 1 ? team.map((_, i) =>
            pip(i < idx || (i === idx && b.bossHP <= 0) ? 'fainted' : i === idx ? 'active' : '')
        ).join('') : '';
    }
}

// Official Gen 5 battle backdrops (as used by Pokémon Showdown).
// Picked from the stage's location, else the opponent's dominant type,
// so a Grass gym fights in a forest, a Fire gym in a volcano, and so on.
const BATTLE_BG_BASE = 'https://raw.githubusercontent.com/smogon/pokemon-showdown-client/master/play.pokemonshowdown.com/fx/';
const TYPE_BACKDROP = {
    grass:'forest', bug:'forest', normal:'meadow', fairy:'meadow', flying:'route',
    water:'beach', electric:'thunderplains', fire:'volcanocave', ice:'icecave',
    rock:'mountain', ground:'desert', fighting:'mountain', poison:'dampcave',
    ghost:'dampcave', dark:'city', steel:'city', psychic:'space', dragon:'space'
};
const PLACE_BACKDROP = [
    [/volcan|cinnabar|lava|magma|mt\.? chimney|stark/i, 'volcanocave'],
    [/ice|snow|frost|glacier|icirrus|snowpoint|mt\.? silver|coronet/i, 'icecave'],
    [/cave|tunnel|mt\.? moon|cavern|grotto|mine|b\dF|ruins|tower/i, 'earthycave'],
    [/desert|sand|canyon/i, 'desert'],
    [/sea|ocean|beach|island|bridge|harbor|port|s\.s\.|shore|coast|marine/i, 'beach'],
    [/river|lake|marsh|swamp|falls|pond/i, 'river'],
    [/forest|woods|jungle|grove|garden/i, 'forest'],
    [/victory road|mountain|mt\.|peak|pass|cliff/i, 'mountain'],
    [/space|spear pillar|sky|distortion/i, 'space'],
    [/city|town|hideout|hq|headquarters|lab|corp|building|stadium/i, 'city'],
    [/route|road|path|meadow|field|plain/i, 'route']
];
function dominantType(team) {
    const score = {};
    (team || []).forEach((m, i) => {
        const w = i === team.length - 1 ? 2 : 1;   // the ace counts double
        if (m?.type1) score[m.type1] = (score[m.type1] || 0) + w * 2;
        if (m?.type2) score[m.type2] = (score[m.type2] || 0) + w;
    });
    return Object.keys(score).sort((a, b) => score[b] - score[a])[0] || 'normal';
}
function pickBattleBackdrop(stage, team) {
    const leaderFight = stage && (stage.isGym || stage.isElite4 || stage.isChampion);
    if (stage && !leaderFight) {
        const hit = PLACE_BACKDROP.find(([re]) => re.test(stage.name || ''));
        if (hit) return hit[1];
    }
    const type = stage ? dominantType(team) : (team?.[0]?.type1 || 'normal');
    return TYPE_BACKDROP[type] || 'meadow';
}
function applyBattleBackdrop() {
    const field = document.getElementById('battleField');
    if (!field) return;
    const b = gameState.battle;
    const bg = pickBattleBackdrop(gameState.activeBattleStage, b.enemyTeam);
    if (field.dataset.bg === bg) return;
    field.dataset.bg = bg;
    field.style.setProperty('--battle-bg', `url('${BATTLE_BG_BASE}bg-${bg}.${bg === 'space' ? 'jpg' : 'png'}')`);
}

function renderBattleHeader() {
    const stage = gameState.activeBattleStage;
    const icon = document.getElementById('battleStageIcon');
    const title = document.getElementById('battleStageTitle');
    const sub = document.getElementById('battleStageSub');
    applyBattleBackdrop();
    if (stage) {
        icon.textContent = stage.icon || '⚔️';
        title.textContent = stage.trainer;
        sub.textContent = [stage.name, stage.isGym && stage.badgeName ? stage.badgeName : ''].filter(Boolean).join(' · ');
    } else {
        icon.textContent = '♾️';
        title.textContent = t('battle.endlessTitle');
        sub.textContent = `${t('battle.round')} ${(gameState.endlessRunDefeats || 0) + 1}`;
    }
}

function flashEffectiveness(text, kind) {
    const el = document.getElementById('effectivenessIndicator');
    if (!el) return;
    el.classList.remove('is-pop');
    el.textContent = text || '';
    el.dataset.kind = kind || '';
    if (text) { void el.offsetWidth; el.classList.add('is-pop'); }
}

// Locks every battle control while a turn resolves or a fainted
// Pokémon is being replaced, so taps can't queue overlapping turns.
// When control returns to the player, the command menu resets to the top level.
function setBattleBusy(state) {
    const b = gameState.battle;
    b.busy = !!state;
    const locked = b.busy || !!b.pendingSwap || !b.active;
    const arena = document.getElementById('battleArenaActive');
    if (arena) arena.dataset.busy = locked ? '1' : '0';
    document.querySelectorAll('#battleArenaActive .menu-btn, #battleMovesGrid button, #battleSwitchRow button, #battleBagList button, #battleBackBtn').forEach(btn => {
        btn.disabled = locked || btn.dataset.blocked === '1';
    });
    if (locked) showBattlePanel('main');
    else if (!b.menu || b.menu === 'main') showBattlePanel('main');
    updateBattlePrompt();
}

function showBattlePanel(name) {
    gameState.battle.menu = name;
    ['Main', 'Fight', 'Party', 'Bag'].forEach(n => {
        const el = document.getElementById('battleMenu' + n);
        if (el) el.classList.toggle('hidden', n.toLowerCase() !== name);
    });
    const back = document.getElementById('battleBackBtn');
    if (back) back.classList.toggle('hidden', name === 'main');
}

function updateBattlePrompt() {
    const b = gameState.battle;
    const prompt = document.getElementById('battlePrompt');
    if (!prompt) return;
    const locked = b.busy || b.pendingSwap || !b.active;
    const f = b.fighterPokemon;
    prompt.textContent = locked ? '…'
        : b.menu === 'fight' ? t('battle.chooseMove')
        : b.menu === 'party' ? t('battle.choosePokemon')
        : b.menu === 'bag' ? t('battle.chooseItem')
        : t('battle.whatWill').replace('{name}', f ? f.name : '');
}

// FIGHT / BAG / POKéMON sub-menus
window.setBattleMenu = function(name) {
    const b = gameState.battle;
    if (name !== 'main' && (!b.active || b.busy || b.pendingSwap)) return;
    if (name === 'fight' && b.fighterPokemon && getUsableMoves(b.fighterPokemon).length === 0) {
        // Out of PP on every move → Struggle, like the main games
        executeBattleTurn('struggle');
        return;
    }
    playBeep();
    if (name === 'party') renderSwitchOptions(b.fighterPokemon);
    if (name === 'bag') renderBattleBag();
    showBattlePanel(name);
    updateBattlePrompt();
};

// ── PP ────────────────────────────────────────────────────────────
const STRUGGLE = { type: 'normal', power: 50, category: 'physical', accuracy: 100, pp: 1, typeless: true, secondary: { recoilMaxHp: 25 } };
function maxPP(move) { const spec = getMove(move); return (spec && spec.pp) || 10; }
function getPP(pokemon, move) {
    const b = gameState.battle;
    b.pp = b.pp || {};
    const rec = b.pp[pokemon.uid] = b.pp[pokemon.uid] || {};
    if (rec[move] === undefined) rec[move] = maxPP(move);
    return rec[move];
}
function spendPP(pokemon, move) {
    const left = getPP(pokemon, move);
    gameState.battle.pp[pokemon.uid][move] = Math.max(0, left - 1);
}
function getUsableMoves(pokemon) {
    const moves = pokemon.moves && pokemon.moves.length ? pokemon.moves : ['tackle'];
    const b = gameState.battle;
    const locked = pokemon.heldItem === 'choice_band' && b.choiceBandMove;
    return moves.filter(m => getPP(pokemon, m) > 0 && (!locked || m === b.choiceBandMove));
}

function renderBattleMoves(pokemon) {
    const grid = document.getElementById('battleMovesGrid');
    grid.innerHTML = "";
    const moves = pokemon.moves && pokemon.moves.length ? pokemon.moves : ["tackle", "quick-attack"];
    const foe = gameState.battle.bossPokemon;

    // Choice Band: show which move is locked
    const choiceLocked = pokemon.heldItem === 'choice_band' && gameState.battle.choiceBandMove;

    moves.forEach(move => {
        const spec = getMove(move) || { type: "normal", power: 40, category: "physical" };
        const isStatus = spec.category === 'status';
        const isChoiceLocked = choiceLocked && move === gameState.battle.choiceBandMove;
        const isChoiceBlocked = choiceLocked && move !== gameState.battle.choiceBandMove;
        const pp = getPP(pokemon, move);
        const ppMax = maxPP(move);
        const moveName = move.replace(/-/g, ' ');
        const moveBtn = document.createElement('button');
        moveBtn.type = 'button';
        moveBtn.className = `move-btn${isChoiceLocked ? ' is-choice-locked' : ''}`;
        moveBtn.style.setProperty('--type-color', BATTLE_TYPE_COLORS[spec.type] || '#a8a77a');
        if (isChoiceBlocked || pp <= 0) moveBtn.dataset.blocked = '1';

        // Type-matchup hint against the current opponent
        let effTag = '';
        if (!isStatus && foe) {
            const mod = getTypeEffectiveness(spec.type, foe);
            if (mod === 0) effTag = `<span class="move-eff" data-eff="immune" title="${t('battle.immune')}">0×</span>`;
            else if (mod > 1) effTag = `<span class="move-eff" data-eff="super" title="${t('battle.superEff')}">${mod}×</span>`;
            else if (mod < 1) effTag = `<span class="move-eff" data-eff="weak" title="${t('battle.notVeryEff')}">${mod === 0.25 ? '¼' : '½'}×</span>`;
        }
        const acc = Number(spec.accuracy ?? 100);
        const detail = isStatus ? t('battle.statusMove') : `${t('battle.pwr')} ${spec.power}${acc < 100 ? ` · ${acc}%` : ''}`;
        const ppCls = pp <= 0 ? ' is-empty' : pp <= Math.ceil(ppMax / 4) ? ' is-low' : '';
        moveBtn.title = `${moveName} — ${spec.type} · ${spec.category || 'physical'} · ${detail}`;
        moveBtn.innerHTML = `<span class="move-name">${isChoiceLocked ? '🔒 ' : ''}${moveName}</span>`
            + `<span class="move-meta"><span class="move-type">${spec.type}</span>${effTag}<span class="move-pp${ppCls}">PP ${pp}/${ppMax}</span></span>`;
        moveBtn.onclick = () => executeBattleTurn(move);
        grid.appendChild(moveBtn);
    });

    renderSwitchOptions(pokemon);
    setBattleBusy(gameState.battle.busy);
}

// ── Stat-stage helpers ────────────────────────────────────────
function stageMultiplier(stage) {
    const s = Math.max(-6, Math.min(6, stage || 0));
    return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

function applyStatStage(side, stat, delta, logBox, atkName, defName) {
    if (!gameState.battle.statStages) gameState.battle.statStages = { player:{atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0}, boss:{atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0} };
    const stages = gameState.battle.statStages[side];
    const prev = stages[stat] || 0;
    stages[stat] = Math.max(-6, Math.min(6, prev + delta));
    const change = stages[stat] - prev;
    const ownerName = side === 'player' ? atkName : defName;
    if (change === 0) {
        logBox.innerHTML += `<div class="text-slate-500 mt-1 italic text-[10px]">${ownerName}'s ${stat} ${delta > 0 ? t('battle.wontHigher') : t('battle.wontLower')}</div>`;
    } else {
        const sharply = Math.abs(change) >= 2 ? ' sharply' : '';
        const dir = change > 0 ? '⬆ rose' : '⬇ fell';
        const col = change > 0 ? 'text-green-400' : 'text-red-400';
        logBox.innerHTML += `<div class="${col} mt-1 font-bold">${ownerName}'s ${stat}${sharply} ${dir}!</div>`;
        setTimeout(() => playStatFx(side, change > 0), 250);
    }
    renderStatStagesUI();
}

function renderStatStagesUI() {
    const b = gameState.battle;
    if (!b.statStages) return;
    const sc = b.statusConds || {};
    const meta = b.statusMeta || {};
    const labels = { atk:'ATK', def:'DEF', spAtk:'SpA', spDef:'SpD', speed:'SPE', accuracy:'ACC' };
    const renderSide = (side, statusId, stagesId) => {
        // Status condition (SLP/PAR/BRN…) + confusion sit next to the types
        const statusEl = document.getElementById(statusId);
        if (statusEl) {
            let html = '';
            const cond = sc[side];
            if (cond) {
                const [label, col] = BATTLE_STATUS_TAGS[cond] || [String(cond).toUpperCase(), '#cbd5e1'];
                html += `<span class="hud-chip hud-chip--status" style="background:${col}">${label}</span>`;
            }
            if ((meta[side] || {}).confused) html += `<span class="hud-chip hud-chip--status" style="background:#fdba74">CNF</span>`;
            statusEl.innerHTML = html;
        }
        // Stat stage chips under the HP bar
        const stagesEl = document.getElementById(stagesId);
        if (stagesEl) {
            stagesEl.innerHTML = Object.entries(b.statStages[side] || {})
                .filter(([, val]) => val !== 0)
                .map(([stat, val]) => `<span class="hud-chip ${val > 0 ? 'hud-chip--up' : 'hud-chip--down'}">${labels[stat] || stat} ${val > 0 ? '+' : ''}${val}</span>`)
                .join('');
        }
    };
    renderSide('player', 'playerStatusTag', 'playerStatStages');
    renderSide('boss',   'bossStatusTag',   'bossStatStages');
}

function applyStatusCond(side, cond, logBox, myName, foeName, silentIfImmune) {
    if (!gameState.battle.statusConds) gameState.battle.statusConds = { player: null, boss: null };
    const ownerName = side === 'player' ? myName : foeName;
    // Type immunities from the main games
    const target = side === 'player' ? gameState.battle.fighterPokemon : gameState.battle.bossPokemon;
    const types = target ? [target.type1, target.type2] : [];
    const immune = (cond === 'burn' && types.includes('fire')) || (cond === 'para' && types.includes('electric')) ||
        (cond === 'freeze' && types.includes('ice')) || (cond === 'poison' && (types.includes('poison') || types.includes('steel'))) ||
        (cond === 'leech' && types.includes('grass'));
    if (immune) {
        if (!silentIfImmune) logBox.innerHTML += `<div class="text-slate-400 mt-1 italic">It doesn't affect ${ownerName}...</div>`;
        return;
    }
    if (silentIfImmune && cond !== 'confuse' && gameState.battle.statusConds[side]) return;
    // Confusion is tracked separately and can stack with other status
    if (cond === 'confuse') {
        if (!gameState.battle.statusMeta) gameState.battle.statusMeta = { player: {}, boss: {} };
        if (!gameState.battle.statusMeta[side]) gameState.battle.statusMeta[side] = {};
        if (gameState.battle.statusMeta[side].confused) {
            logBox.innerHTML += `<div class="text-slate-500 mt-1 italic text-[10px]">${ownerName} is already confused!</div>`;
            return;
        }
        gameState.battle.statusMeta[side].confused = true;
        gameState.battle.statusMeta[side].confuseTurns = 2 + Math.floor(Math.random() * 3); // 2-4 turns
        logBox.innerHTML += `<div class="text-orange-300 mt-1 font-bold">😵 ${ownerName} became confused!</div>`;
        renderStatStagesUI();
        return;
    }
    if (gameState.battle.statusConds[side]) {
        logBox.innerHTML += `<div class="text-slate-500 mt-1 italic text-[10px]">${ownerName} already has a condition!</div>`;
        return;
    }
    gameState.battle.statusConds[side] = cond;
    // Init sleep turn counter
    if (cond === 'sleep') {
        if (!gameState.battle.statusMeta) gameState.battle.statusMeta = { player: {}, boss: {} };
        gameState.battle.statusMeta[side] = { sleepTurns: -1 }; // -1 so first increment lands at 0
    }
    const msgs = { sleep:`💤 fell asleep!`, para:`⚡ became paralyzed!`, leech:`🌱 was seeded!`, burn:`🔥 was burned!`, poison:`☠️ was poisoned!`, freeze:`🧊 was frozen solid!` };
    const cols = { sleep:'text-indigo-400', para:'text-yellow-400', leech:'text-emerald-400', burn:'text-orange-400', poison:'text-purple-400', freeze:'text-blue-300' };
    logBox.innerHTML += `<div class="${cols[cond]||'text-slate-400'} mt-1 font-bold">${ownerName} ${msgs[cond]||cond}</div>`;
    if (cond === 'para')  applyStatStage(side, 'speed', -2, logBox, myName, foeName);
    if (cond === 'burn')  applyStatStage(side, 'atk',   -1, logBox, myName, foeName);
    // Always refresh the stat/status panel so Sleep, Freeze, Poison, Leech all appear
    renderStatStagesUI();
}

// Secondary effects of damaging moves: drain/recoil, status and stat chances
function applyMoveSecondary(spec, damage, isPlayerAttacker, attacker, defender, logBox, playerName, bossName) {
    const sec = spec.secondary;
    if (!sec || damage <= 0) return;
    const b = gameState.battle;
    const atkSide = isPlayerAttacker ? 'player' : 'boss';
    const defSide = isPlayerAttacker ? 'boss' : 'player';
    const hpKey = isPlayerAttacker ? 'fighterHP' : 'bossHP';
    const maxKey = isPlayerAttacker ? 'fighterMaxHP' : 'bossMaxHP';
    const defAlive = (isPlayerAttacker ? b.bossHP : b.fighterHP) > 0;
    if (sec.drain > 0) {
        const heal = Math.max(1, Math.floor(damage * sec.drain / 100));
        b[hpKey] = Math.min(b[maxKey], b[hpKey] + heal);
        logBox.innerHTML += `<div class="text-green-400 mt-0.5">${attacker.name} had its energy drained!</div>`;
    } else if (sec.drain < 0 || sec.recoilMaxHp) {
        // Recoil never knocks the user out here (keeps turn resolution simple)
        const recoil = sec.recoilMaxHp ? Math.floor(b[maxKey] * sec.recoilMaxHp / 100) : Math.floor(damage * -sec.drain / 100);
        b[hpKey] = Math.max(1, b[hpKey] - Math.max(1, recoil));
        logBox.innerHTML += `<div class="text-orange-300 mt-0.5">${attacker.name} is damaged by recoil!</div>`;
    }
    if (defAlive && sec.status && sec.chance && Math.random() * 100 < sec.chance) {
        applyStatusCond(defSide, sec.status, logBox, playerName, bossName, true);
    }
    if (sec.stats && Math.random() * 100 < (sec.statChance || 100)) {
        const side = sec.statTarget === 'self' ? atkSide : defSide;
        if (side === atkSide || defAlive) sec.stats.forEach(({ stat, stages }) => applyStatStage(side, stat, stages, logBox, playerName, bossName));
    }
}

function resolveMoveAttack(attacker, defender, moveName, isPlayerAttacker) {
    if (!gameState.battle.active) return;
    const moveSpec = getMove(moveName) || { type: "normal", power: 40, category: "physical" };
    const logBox = document.getElementById('battleLog');
    const attackerSide = isPlayerAttacker ? 'player' : 'boss';
    const defenderSide = isPlayerAttacker ? 'boss'   : 'player';

    // Names mapped to absolute sides (fixes "self buff shown as foe's" & vice-versa)
    const playerName = isPlayerAttacker ? attacker.name : defender.name;
    const bossName   = isPlayerAttacker ? defender.name : attacker.name;

    // ── SLEEP check — blocks ALL move types ─────────────
    const sc = gameState.battle.statusConds || {};
    if (sc[attackerSide] === 'sleep') {
        if (!gameState.battle.statusMeta) gameState.battle.statusMeta = { player: {}, boss: {} };
        const sleepMeta = gameState.battle.statusMeta[attackerSide];
        if (typeof sleepMeta.sleepTurns !== 'number') sleepMeta.sleepTurns = 0;
        else sleepMeta.sleepTurns++;

        // Turn 3 (index 2) = guaranteed wake; turns 1-2 = 1/3 chance to wake
        const wakeUp = sleepMeta.sleepTurns >= 2 || Math.random() < (1/3);
        logBox.innerHTML += `<div class="text-indigo-400 mt-1 italic">💤 ${attacker.name} is fast asleep!</div>`;
        if (wakeUp) {
            gameState.battle.statusConds[attackerSide] = null;
            sleepMeta.sleepTurns = 0;
            logBox.innerHTML += `<div class="text-indigo-300 mt-0.5">😲 ${attacker.name} woke up!</div>`;
            renderStatStagesUI();
        }
        logBox.scrollTop = logBox.scrollHeight;
        return;
    }

    // ── PARALYSIS check — 1/3 chance to not be able to move ──
    if (sc[attackerSide] === 'para') {
        if (Math.random() < (1/3)) {
            logBox.innerHTML += `<div class="text-yellow-400 mt-1 italic">⚡ ${attacker.name} is paralyzed and can't move!</div>`;
            logBox.scrollTop = logBox.scrollHeight;
            return;
        }
    }

    // ── CONFUSION check — 50% chance to hit self for 1/8 max HP ───────
    const meta = gameState.battle.statusMeta || {};
    const atkMeta = meta[attackerSide] || {};
    if (atkMeta.confused) {
        if (!gameState.battle.statusMeta) gameState.battle.statusMeta = { player:{}, boss:{} };
        if (!gameState.battle.statusMeta[attackerSide]) gameState.battle.statusMeta[attackerSide] = {};
        atkMeta.confuseTurns = (atkMeta.confuseTurns || 1) - 1;
        if (atkMeta.confuseTurns <= 0) {
            atkMeta.confused = false;
            logBox.innerHTML += `<div class="text-orange-300 mt-1">😊 ${attacker.name} snapped out of confusion!</div>`;
            renderStatStagesUI();
        } else if (Math.random() < 0.5) {
            // Hit self
            const selfDmg = Math.max(1, Math.round(
                isPlayerAttacker ? gameState.battle.fighterMaxHP / 8 : gameState.battle.bossMaxHP / 8
            ));
            logBox.innerHTML += `<div class="text-orange-400 mt-1 italic">😵 ${attacker.name} is confused and hurt itself! (−${selfDmg})</div>`;
            if (isPlayerAttacker) {
                gameState.battle.fighterHP = Math.max(0, gameState.battle.fighterHP - selfDmg);
                syncBattleHP();
                if (gameState.battle.fighterHP <= 0) { handleBattleDefeat(); return; }
            } else {
                gameState.battle.bossHP = Math.max(0, gameState.battle.bossHP - selfDmg);
                syncBattleHP();
                if (gameState.battle.bossHP <= 0) { handleBattleVictory(); return; }
            }
            logBox.scrollTop = logBox.scrollHeight;
            return;
        } else {
            logBox.innerHTML += `<div class="text-orange-300 mt-1 italic">😵 ${attacker.name} is confused but attacked anyway!</div>`;
        }
        renderStatStagesUI();
    }

    // ── FREEZE check — 80% stay frozen, 20% thaw ────────────
    if (sc[attackerSide] === 'freeze') {
        if (Math.random() < 0.8) {
            logBox.innerHTML += `<div class="text-blue-300 mt-1 italic">🧊 ${attacker.name} is frozen solid and can't move!</div>`;
            logBox.scrollTop = logBox.scrollHeight;
            return;
        }
        gameState.battle.statusConds[attackerSide] = null;
        if (!gameState.battle.statusMeta) gameState.battle.statusMeta = { player:{}, boss:{} };
        gameState.battle.statusMeta[attackerSide] = {};
        logBox.innerHTML += `<div class="text-blue-200 mt-0.5">🌡️ ${attacker.name} thawed out!</div>`;
        renderStatStagesUI();
    }

    // ── STATUS (non-damaging) moves ─────────────────────
    if (moveSpec.category === 'status' && moveSpec.effect) {
        const eff = moveSpec.effect;
        playBeep();
        logBox.innerHTML += `<div class="text-violet-400 mt-1">✨ ${attacker.name} used <span class="text-white capitalize font-bold">${moveName.replace(/-/g,' ')}</span>!</div>`;
        // Moves aimed at the foe can miss
        const statusAcc = Number(moveSpec.accuracy ?? 100);
        if (eff.target !== 'self' && statusAcc < 100 && Math.random() * 100 > statusAcc * stageMultiplier((gameState.battle.statStages?.[attackerSide] || {}).accuracy || 0)) {
            logBox.innerHTML += `<div class="text-slate-400 mt-0.5 italic">${attacker.name}'s attack missed!</div>`;
            logBox.scrollTop = logBox.scrollHeight;
            return;
        }
        playMoveFx(attackerSide, moveSpec, eff.target === 'self' || eff.heals ? attackerSide : defenderSide);
        if ((eff.heals === 'full' || eff.heals === 'half') && isPlayerAttacker) {
            const healAmt = eff.heals === 'full' ? gameState.battle.fighterMaxHP : Math.round(gameState.battle.fighterMaxHP / 2);
            gameState.battle.fighterHP = Math.min(gameState.battle.fighterMaxHP, gameState.battle.fighterHP + healAmt);
            syncBattleHP(FX_HIT_DELAY); playHealFx('player');
            logBox.innerHTML += `<div class="text-green-400 mt-1 font-bold">💚 ${attacker.name} restored ${healAmt} HP!</div>`;
        } else if (eff.heals === 'full' || eff.heals === 'half') {
            // Boss healed
            const healAmt = eff.heals === 'full' ? gameState.battle.bossMaxHP : Math.round(gameState.battle.bossMaxHP / 2);
            gameState.battle.bossHP = Math.min(gameState.battle.bossMaxHP, gameState.battle.bossHP + healAmt);
            syncBattleHP(FX_HIT_DELAY); playHealFx('boss');
            logBox.innerHTML += `<div class="text-emerald-400 mt-1 font-bold">💚 ${attacker.name} recovered ${healAmt} HP!</div>`;
        } else if (eff.status) {
            const tSide = eff.target === 'self' ? attackerSide : defenderSide;
            applyStatusCond(tSide, eff.status, logBox, playerName, bossName);
        } else if (eff.multiStat) {
            // Multi-stat changes (e.g. Calm Mind, Bulk Up)
            const tSide = eff.target === 'self' ? attackerSide : defenderSide;
            eff.multiStat.forEach(({ stat, stages }) => applyStatStage(tSide, stat, stages, logBox, playerName, bossName));
        } else if (eff.stat) {
            const tSide = eff.target === 'self' ? attackerSide : defenderSide;
            applyStatStage(tSide, eff.stat, eff.stages, logBox, playerName, bossName);
        }
        logBox.scrollTop = logBox.scrollHeight;
        return;
    }
    if (moveSpec.category === 'status') {
        playBeep();
        logBox.innerHTML += `<div class="text-violet-400 mt-1">✨ ${attacker.name} used <span class="text-white capitalize font-bold">${moveName.replace(/-/g,' ')}</span>! But nothing happened...</div>`;
        logBox.scrollTop = logBox.scrollHeight;
        return;
    }

    // Classic Pokémon battle order: priority first, then Speed; this
    // keeps quick attacks and similar moves faithful to the originals.
    const movePriority = Number(moveSpec.priority || 0);
    const accuracy = Number(moveSpec.accuracy ?? 100);
    const accuracyStage = stageMultiplier((gameState.battle.statStages?.[attackerSide] || {}).accuracy || 0);
    if (accuracy < 100 && Math.random() * 100 > Math.min(100, accuracy * accuracyStage)) {
        playBeep();
        logBox.innerHTML += `<div class="text-slate-500 mt-1 italic">${attacker.name}'s <span class="text-white capitalize">${moveName.replace(/-/g,' ')}</span> missed!</div>`;
        logBox.scrollTop = logBox.scrollHeight;
        return;
    }

    playMoveFx(attackerSide, moveSpec, defenderSide);
    const typeMod = moveSpec.typeless ? 1 : getTypeEffectiveness(moveSpec.type, defender);
    let stabMod = (moveSpec.type === attacker.type1 || moveSpec.type === attacker.type2) ? 1.5 : 1.0;
    let itemMod = 1.0;
    if (attacker.heldItem) {
        const h = HOLD_ITEMS_DB[attacker.heldItem];
        if (h) {
            if (h.effect === "boost_physical" && moveSpec.category === "physical") itemMod = h.value;
            if (h.effect === "boost_special"  && moveSpec.category === "special")  itemMod = h.value;
        }
    }
    const ss = gameState.battle.statStages || { player:{atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0}, boss:{atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0} };
    const attackerLvl = attacker.level || 1;
    const lvlMul = 1 + ((attackerLvl - 1) * 0.05);
    let attackStat, defenseStat;
    if (moveSpec.category === "special") {
        attackStat  = (attacker.spAtk || attacker.atk || 50) * lvlMul * stageMultiplier(ss[attackerSide].spAtk);
        defenseStat = (defender.spDef || defender.def || 50)            * stageMultiplier(ss[defenderSide].spDef);
    } else {
        attackStat  = (attacker.atk || 50) * lvlMul * stageMultiplier(ss[attackerSide].atk);
        defenseStat = (defender.def || 50)            * stageMultiplier(ss[defenderSide].def);
    }

    // Gen III-style damage: random 85–100%, STAB, type chart,
    // and a 1/16 critical-hit roll (critical hits ignore attack drops).
    const isCritical = typeMod > 0 && Math.random() < (moveSpec.highCrit ? 1 / 8 : 1 / 16);
    if (isCritical && (ss[attackerSide][moveSpec.category === 'special' ? 'spAtk' : 'atk'] || 0) < 0) {
        attackStat = (moveSpec.category === 'special' ? (attacker.spAtk || attacker.atk || 50) : (attacker.atk || 50)) * lvlMul;
    }
    const criticalMod = isCritical ? 2 : 1;
    let calculatedDamage = Math.round((((2 * attackerLvl / 5 + 2) * moveSpec.power * (attackStat / defenseStat)) / 50 + 2) * stabMod * typeMod * itemMod * criticalMod * (0.85 + Math.random() * 0.15));
    if (calculatedDamage < 1 || typeMod === 0) calculatedDamage = typeMod === 0 ? 0 : 1;
    // Multi-hit moves (e.g. Double Kick, Bullet Seed): 2–5 hits use the games' odds
    const sec = moveSpec.secondary || {};
    let hits = 1;
    if (sec.hits && typeMod > 0) {
        const [lo, hi] = sec.hits;
        if (lo === 2 && hi === 5) { const r = Math.random(); hits = r < .35 ? 2 : r < .7 ? 3 : r < .85 ? 4 : 5; }
        else hits = lo + Math.floor(Math.random() * (hi - lo + 1));
        calculatedDamage *= hits;
    }

    // Shared feedback for both sides: sound, floating callout, log lines
    if (typeMod > 1.0) playCritStrike();
    else if (typeMod === 0) playBeep();
    else playNormalHit();
    if (typeMod > 1.0) flashEffectiveness(t('battle.superEff'), 'super');
    else if (typeMod === 0) flashEffectiveness(t('battle.immune'), 'immune');
    else if (typeMod < 1.0) flashEffectiveness(t('battle.notVeryEff'), 'weak');
    else if (isCritical) flashEffectiveness(t('battle.critHit'), 'crit');
    else flashEffectiveness('');
    const usedCls = isPlayerAttacker ? 'text-blue-400' : 'text-rose-400';
    const usedIcon = isPlayerAttacker ? '⚔️' : '💥';
    logBox.innerHTML += `<div class="${usedCls} mt-1">${usedIcon} ${attacker.name} used <span class="text-white capitalize font-bold">${moveName.replace(/-/g,' ')}</span>! Dealt <span class="font-black">${calculatedDamage}</span> dmg.</div>`;
    if (isCritical) logBox.innerHTML += `<div class="text-orange-300 mt-0.5">${t('battle.critHit')}</div>`;
    if (hits > 1) logBox.innerHTML += `<div class="text-slate-300 mt-0.5">Hit ${hits} times!</div>`;
    if (typeMod > 1.0) logBox.innerHTML += `<div class="text-amber-300 mt-0.5">${t('battle.superEff')}</div>`;
    else if (typeMod === 0) logBox.innerHTML += `<div class="text-slate-400 mt-0.5">${t('battle.immune')}</div>`;
    else if (typeMod < 1.0) logBox.innerHTML += `<div class="text-slate-400 mt-0.5">${t('battle.notVeryEff')}</div>`;

    if (isPlayerAttacker) {
        gameState.battle.bossHP -= calculatedDamage;
        if (gameState.battle.bossHP < 0) gameState.battle.bossHP = 0;
        applyMoveSecondary(moveSpec, calculatedDamage, true, attacker, defender, logBox, playerName, bossName);

        if (defender.heldItem === "oran_berry" && !gameState.battle.bossOranUsed && gameState.battle.bossHP <= (gameState.battle.bossMaxHP * 0.3) && gameState.battle.bossHP > 0) {
            gameState.battle.bossHP = Math.min(gameState.battle.bossMaxHP, gameState.battle.bossHP + 30);
            gameState.battle.bossOranUsed = true;
            logBox.innerHTML += `<div class="text-yellow-400 mt-1">🎒 Opponent used <span class="font-bold">Oran Berry</span> (+30 HP)!</div>`;
        }
        syncBattleHP(FX_HIT_DELAY);
        if (gameState.battle.bossHP <= 0) handleBattleVictory();
    } else {
        gameState.battle.fighterHP -= calculatedDamage;
        if (gameState.battle.fighterHP < 0) gameState.battle.fighterHP = 0;
        applyMoveSecondary(moveSpec, calculatedDamage, false, attacker, defender, logBox, playerName, bossName);

        if (defender.heldItem === "oran_berry" && !gameState.battle.oranUsed && gameState.battle.fighterHP <= (gameState.battle.fighterMaxHP * 0.3) && gameState.battle.fighterHP > 0) {
            gameState.battle.fighterHP = Math.min(gameState.battle.fighterMaxHP, gameState.battle.fighterHP + 30);
            gameState.battle.oranUsed = true;
            logBox.innerHTML += `<div class="text-green-400 mt-1">🎒 Your Pokémon used <span class="font-bold">Oran Berry</span> (+30 HP)!</div>`;
        }
        if (defender.heldItem === "leftovers" && gameState.battle.fighterHP > 0) {
            const healVal = Math.round(gameState.battle.fighterMaxHP * 0.0625);
            gameState.battle.fighterHP = Math.min(gameState.battle.fighterMaxHP, gameState.battle.fighterHP + healVal);
            logBox.innerHTML += `<div class="text-emerald-400 mt-1">✨ Leftovers restored ${healVal} HP.</div>`;
        }
        syncBattleHP(FX_HIT_DELAY);
        if (gameState.battle.fighterHP <= 0) handleBattleDefeat();
    }
    logBox.scrollTop = logBox.scrollHeight;
}

function executeBattleTurn(moveName) {
    const b = gameState.battle;
    if (!b.active || b.busy || b.pendingSwap) return;
    const fighter = b.fighterPokemon;
    const boss = b.bossPokemon;
    const session = b.session;

    // Choice Band: lock holder into the first move they used this battle
    if (fighter.heldItem === 'choice_band') {
        if (!b.choiceBandMove) {
            b.choiceBandMove = moveName;
        } else {
            moveName = b.choiceBandMove;
        }
    }

    // Each use costs 1 PP; with no PP left on any move the Pokémon Struggles
    if (moveName !== 'struggle') {
        if (getPP(fighter, moveName) <= 0) {
            if (getUsableMoves(fighter).length) return;
            moveName = 'struggle';
        } else {
            spendPP(fighter, moveName);
        }
    }
    if (moveName === 'struggle') {
        const logBox = document.getElementById('battleLog');
        logBox.innerHTML += `<div class="text-slate-300 mt-1">${fighter.name} has no moves left!</div>`;
    }

    // Priority is checked before Speed, matching the original turn order.
    const _ss = b.statStages || { player:{speed:0}, boss:{speed:0} };
    const bossMoveForTurn = pickBossMove(boss);
    const playerPriority = Number((getMove(moveName) || {}).priority || 0);
    const bossPriority = Number((getMove(bossMoveForTurn) || {}).priority || 0);
    const fighterSpeed = (fighter.speed || 50) * stageMultiplier((_ss.player||{}).speed || 0);
    const bossSpeed    = (boss.speed    || 50) * stageMultiplier((_ss.boss  ||{}).speed || 0);
    const playerMovesFirst = playerPriority !== bossPriority ? playerPriority > bossPriority : fighterSpeed >= bossSpeed;

    const first  = playerMovesFirst ? [fighter, boss, moveName, true] : [boss, fighter, bossMoveForTurn, false];
    const second = playerMovesFirst ? [boss, fighter, bossMoveForTurn, false] : [fighter, boss, moveName, true];
    // The second attacker only acts if both original combatants are
    // still on the field (a fainted Pokémon must not strike back).
    const bothStanding = () => gameState.battle.active && gameState.battle.session === session &&
        gameState.battle.fighterPokemon === fighter && gameState.battle.bossPokemon === boss &&
        gameState.battle.fighterHP > 0 && gameState.battle.bossHP > 0;
    // Control returns to the player: refresh PP counters and reopen the command menu
    const finishTurn = () => {
        if (gameState.battle.session !== session) return;
        gameState.battle.busy = false;
        if (gameState.battle.active && gameState.battle.fighterPokemon && !gameState.battle.pendingSwap) renderBattleMoves(gameState.battle.fighterPokemon);
        else setBattleBusy(false);
    };

    setBattleBusy(true);
    resolveMoveAttack(...first);
    if (!bothStanding()) { finishTurn(); return; }
    setTimeout(() => {
        if (!bothStanding()) { finishTurn(); return; }
        resolveMoveAttack(...second);
        if (!gameState.battle.active || gameState.battle.session !== session) { finishTurn(); return; }
        // End-of-turn: burn/poison/leech after both moves
        setTimeout(() => {
            if (gameState.battle.session === session) applyEndOfTurnEffects();
            finishTurn();
        }, 700);
    }, 1100);
}

function applyEndOfTurnEffects() {
    if (!gameState.battle.active) return;
    const logBox = document.getElementById('battleLog');
    const sc = gameState.battle.statusConds || {};
    // ── Burn damage (1/16 max HP) ────────────────────────────────────────
    if (sc.player === 'burn' && gameState.battle.fighterHP > 0) {
        const d = Math.max(1, Math.round(gameState.battle.fighterMaxHP / 16));
        gameState.battle.fighterHP = Math.max(0, gameState.battle.fighterHP - d);
        syncBattleHP();
        if (logBox) logBox.innerHTML += `<div class="text-orange-400 mt-1 text-[10px] italic">🔥 ${gameState.battle.fighterPokemon.name} is hurt by its burn! (−${d})</div>`;
        if (gameState.battle.fighterHP <= 0) { if (logBox) logBox.scrollTop = logBox.scrollHeight; handleBattleDefeat(); return; }
    }
    if (sc.boss === 'burn' && gameState.battle.bossHP > 0) {
        const d = Math.max(1, Math.round(gameState.battle.bossMaxHP / 16));
        gameState.battle.bossHP = Math.max(0, gameState.battle.bossHP - d);
        syncBattleHP();
        if (logBox) logBox.innerHTML += `<div class="text-orange-400 mt-1 text-[10px] italic">🔥 ${gameState.battle.bossPokemon.name} is hurt by its burn! (−${d})</div>`;
        if (gameState.battle.bossHP <= 0) { if (logBox) logBox.scrollTop = logBox.scrollHeight; handleBattleVictory(); return; }
    }
    // ── Poison damage (1/8 max HP) ───────────────────────────────────────
    if (sc.player === 'poison' && gameState.battle.fighterHP > 0) {
        const d = Math.max(1, Math.round(gameState.battle.fighterMaxHP / 8));
        gameState.battle.fighterHP = Math.max(0, gameState.battle.fighterHP - d);
        syncBattleHP();
        if (logBox) logBox.innerHTML += `<div class="text-purple-400 mt-1 text-[10px] italic">☠️ ${gameState.battle.fighterPokemon.name} is hurt by poison! (−${d})</div>`;
        if (gameState.battle.fighterHP <= 0) { if (logBox) logBox.scrollTop = logBox.scrollHeight; handleBattleDefeat(); return; }
    }
    if (sc.boss === 'poison' && gameState.battle.bossHP > 0) {
        const d = Math.max(1, Math.round(gameState.battle.bossMaxHP / 8));
        gameState.battle.bossHP = Math.max(0, gameState.battle.bossHP - d);
        syncBattleHP();
        if (logBox) logBox.innerHTML += `<div class="text-purple-400 mt-1 text-[10px] italic">☠️ ${gameState.battle.bossPokemon.name} is hurt by poison! (−${d})</div>`;
        if (gameState.battle.bossHP <= 0) { if (logBox) logBox.scrollTop = logBox.scrollHeight; handleBattleVictory(); return; }
    }
    // ── Leech Seed (1/16 HP drain, heals user) ──────────────────────────
    if (sc.boss === 'leech' && gameState.battle.bossHP > 0) {
        const d = Math.max(1, Math.round(gameState.battle.bossMaxHP / 16));
        gameState.battle.bossHP = Math.max(0, gameState.battle.bossHP - d);
        gameState.battle.fighterHP = Math.min(gameState.battle.fighterMaxHP, gameState.battle.fighterHP + d);
        syncBattleHP();
        if (logBox) logBox.innerHTML += `<div class="text-emerald-400 mt-1 text-[10px] italic">🌱 Leech Seed drained ${d} HP from ${gameState.battle.bossPokemon.name}!</div>`;
        if (gameState.battle.bossHP <= 0) { if (logBox) logBox.scrollTop = logBox.scrollHeight; handleBattleVictory(); return; }
    }
    if (sc.player === 'leech' && gameState.battle.fighterHP > 0) {
        const d = Math.max(1, Math.round(gameState.battle.fighterMaxHP / 16));
        gameState.battle.fighterHP = Math.max(0, gameState.battle.fighterHP - d);
        gameState.battle.bossHP = Math.min(gameState.battle.bossMaxHP, gameState.battle.bossHP + d);
        syncBattleHP();
        if (logBox) logBox.innerHTML += `<div class="text-emerald-400 mt-1 text-[10px] italic">🌱 Leech Seed drained ${d} HP from ${gameState.battle.fighterPokemon.name}!</div>`;
        if (gameState.battle.fighterHP <= 0) { if (logBox) logBox.scrollTop = logBox.scrollHeight; handleBattleDefeat(); return; }
    }
    if (logBox) logBox.scrollTop = logBox.scrollHeight;
}

function disableMoveButtons(state) {
    setBattleBusy(state);
}

// ── Switch Pokémon ─────────────────────────────────────────────────────
function getBenchHP(p) {
    const full = getBattleMaxHP(p);
    const saved = (gameState.battle.teamHp || {})[p.uid];
    return [saved !== undefined ? Math.max(0, saved) : full, full];
}

// POKéMON menu: the whole party, like the games' party screen
function renderSwitchOptions(activePokemon) {
    const switchRow = document.getElementById('battleSwitchRow');
    if (!switchRow || !activePokemon) return;
    const b = gameState.battle;
    const playerTeam = (b.playerTeam || []).filter(Boolean);
    const fainted = b.faintedUids || new Set();
    switchRow.innerHTML =
        `<div class="battle-switch-list">` +
        playerTeam.map(p => {
            const isActive = p.uid === activePokemon.uid;
            const [cur, full] = isActive ? [Math.max(0, Math.round(b.fighterHP)), Math.round(b.fighterMaxHP)] : getBenchHP(p);
            const isFainted = fainted.has(p.uid) || cur <= 0;
            const pct = Math.round((cur / Math.max(1, full)) * 100);
            const sub = isActive ? t('battle.inBattle') : isFainted ? t('battle.fainted') : `${cur}/${full} HP`;
            const blocked = isActive || isFainted;
            return `<button type="button" onclick="window.switchBattlePokemon(${p.uid})" class="switch-btn${isActive ? ' is-active' : ''}"${blocked ? ' data-blocked="1" disabled' : ''} title="${p.name} — ${cur}/${full} HP">` +
                `<img src="${pixelSprite(p.id, !!p.isShiny)}" alt="" loading="lazy">` +
                `<span class="switch-info"><span class="switch-name">${p.isShiny ? '✨ ' : ''}${p.name}</span>` +
                `<span class="switch-sub">${t('battle.lvl')} ${p.level || 1} · ${sub}</span>` +
                `<span class="switch-hp"><span data-hp="${hpLevel(pct)}" style="width:${pct}%"></span></span></span></button>`;
        }).join('') +
        `</div>`;
}

// BAG menu: medicine and battle items from the Mart
const BATTLE_BAG_ITEMS = ['potion','super_potion','hyper_potion','max_potion','full_restore','full_heal','antidote','burn_heal','ice_heal','awakening','paralyze_heal','ether','max_ether','elixir','max_elixir','attack_boost','defense_boost','speed_boost','special_boost'];
function renderBattleBag() {
    const el = document.getElementById('battleBagList');
    if (!el) return;
    const inv = gameState.inventoryItems || {};
    const owned = BATTLE_BAG_ITEMS.filter(k => (inv[k] || 0) > 0 && HOLD_ITEMS_DB[k]);
    el.innerHTML = owned.length
        ? `<div class="battle-switch-list">` + owned.map(k => {
            const it = HOLD_ITEMS_DB[k];
            return `<button type="button" class="switch-btn bag-btn" onclick="window.useBattleItem('${k}')" title="${it.desc}">` +
                `<span class="switch-info"><span class="switch-name">${it.name} ×${inv[k]}</span><span class="switch-sub">${it.desc}</span></span></button>`;
        }).join('') + `</div>`
        : `<div class="bag-empty">${t('battle.bagEmpty')}</div>`;
}

window.useBattleItem = function(key) {
    const b = gameState.battle;
    if (!b.active || b.busy || b.pendingSwap) return;
    const item = HOLD_ITEMS_DB[key];
    const inv = gameState.inventoryItems || {};
    if (!item || !(inv[key] > 0)) return;
    const f = b.fighterPokemon;
    const boss = b.bossPokemon;
    const logBox = document.getElementById('battleLog');
    const sc = b.statusConds || (b.statusConds = { player: null, boss: null });
    const meta = b.statusMeta || (b.statusMeta = { player: {}, boss: {} });
    const cureMap = { cure_poison: 'poison', cure_burn: 'burn', cure_freeze: 'freeze', cure_sleep: 'sleep', cure_paralyze: 'para' };
    let msg = null;
    if (item.effect === 'heal_hp') {
        const heal = Math.min(item.value || 20, b.fighterMaxHP - b.fighterHP);
        if (heal > 0) { b.fighterHP += heal; msg = `${f.name}'s HP was restored by ${heal}.`; }
    } else if (item.effect === 'full_restore') {
        if (b.fighterHP < b.fighterMaxHP || sc.player || (meta.player || {}).confused) {
            b.fighterHP = b.fighterMaxHP; sc.player = null; meta.player = {};
            msg = `${f.name} was fully restored!`;
        }
    } else if (cureMap[item.effect]) {
        if (sc.player === cureMap[item.effect]) { sc.player = null; msg = `${f.name} was cured!`; }
    } else if (item.effect === 'restore_pp' || item.effect === 'restore_all_pp') {
        const moves = (f.moves || []).filter(m => getPP(f, m) < maxPP(m));
        const targets = item.effect === 'restore_pp' ? moves.sort((x, y) => getPP(f, x) - getPP(f, y)).slice(0, 1) : moves;
        targets.forEach(m => { b.pp[f.uid][m] = Math.min(maxPP(m), getPP(f, m) + (item.value || 10)); });
        if (targets.length) msg = `${f.name}'s PP was restored.`;
    } else if (item.effect === 'stat_boost') {
        const statMap = { attack: 'atk', defense: 'def', speed: 'speed', spa: 'spAtk' };
        const stat = statMap[item.stat];
        if (stat && (b.statStages.player[stat] || 0) < 6) {
            inv[key] -= 1;
            logBox.innerHTML += `<div class="text-amber-300 mt-1">🎒 You used ${item.name}!</div>`;
            applyStatStage('player', stat, 1, logBox, f.name, boss.name);
            playStatFx('player', true);
            msg = '';
        }
    }
    if (msg === null) {
        logBox.innerHTML += `<div class="text-slate-400 mt-1">It won't have any effect.</div>`;
        logBox.scrollTop = logBox.scrollHeight;
        return;
    }
    if (msg) {
        inv[key] -= 1;
        logBox.innerHTML += `<div class="text-amber-300 mt-1">🎒 You used ${item.name}!</div><div class="text-green-400">${msg}</div>`;
        playHealFx('player');
    }
    logBox.scrollTop = logBox.scrollHeight;
    saveProgress();
    syncBattleHP();
    renderStatStagesUI();
    // Using an item takes your turn: the opponent attacks
    const session = b.session;
    setBattleBusy(true);
    setTimeout(() => {
        if (!gameState.battle.active || gameState.battle.session !== session || gameState.battle.bossPokemon !== boss) {
            if (gameState.battle.session === session) setBattleBusy(false);
            return;
        }
        resolveMoveAttack(boss, gameState.battle.fighterPokemon, pickBossMove(boss), false);
        setTimeout(() => {
            if (gameState.battle.session === session) {
                applyEndOfTurnEffects();
                gameState.battle.busy = false;
                if (gameState.battle.active && !gameState.battle.pendingSwap) renderBattleMoves(gameState.battle.fighterPokemon);
                else setBattleBusy(false);
            }
        }, 700);
    }, 800);
};

// ── Move animations ───────────────────────────────────────────────
const TYPE_FX = {
    normal:   { c: ['#ffffff', '#e5e7eb'], shape: 'star', anim: 'burst' },
    fighting: { c: ['#fecaca', '#ffffff', '#f97316'], shape: 'star', anim: 'burst', shake: true },
    fire:     { c: ['#fb923c', '#fde047', '#ef4444'], shape: 'circle', anim: 'rise', screen: '#f97316' },
    water:    { c: ['#60a5fa', '#bfdbfe', '#2563eb'], shape: 'circle', anim: 'burst' },
    grass:    { c: ['#4ade80', '#16a34a', '#bbf7d0'], shape: 'leaf', anim: 'burst' },
    electric: { c: ['#fde047', '#fef9c3', '#facc15'], shape: 'bolt', anim: 'flicker', screen: '#fde047' },
    ice:      { c: ['#a5f3fc', '#e0f2fe', '#67e8f9'], shape: 'diamond', anim: 'burst', screen: '#e0f2fe' },
    poison:   { c: ['#c084fc', '#9333ea', '#e9d5ff'], shape: 'circle', anim: 'rise' },
    ground:   { c: ['#b45309', '#d6a35c', '#92400e'], shape: 'diamond', anim: 'fall', shake: true },
    rock:     { c: ['#a8a29e', '#78716c', '#d6d3d1'], shape: 'diamond', anim: 'fall', shake: true },
    flying:   { c: ['#ffffff', '#e0f2fe', '#bae6fd'], shape: 'slash', anim: 'slash' },
    psychic:  { c: ['#f472b6', '#f9a8d4', '#c026d3'], shape: 'ring', anim: 'ring', screen: '#f472b6' },
    bug:      { c: ['#a3e635', '#65a30d', '#ecfccb'], shape: 'circle', anim: 'burst' },
    ghost:    { c: ['#a78bfa', '#6d28d9', '#c4b5fd'], shape: 'ring', anim: 'ring', screen: '#312e81' },
    dragon:   { c: ['#8b5cf6', '#60a5fa', '#f472b6'], shape: 'circle', anim: 'burst', shake: true, screen: '#6d28d9' },
    dark:     { c: ['#111827', '#6b21a8', '#374151'], shape: 'slash', anim: 'slash', screen: '#000000' },
    steel:    { c: ['#f3f4f6', '#9ca3af', '#ffffff'], shape: 'diamond', anim: 'burst' },
    fairy:    { c: ['#f9a8d4', '#fbcfe8', '#ffffff'], shape: 'star', anim: 'burst', screen: '#fbcfe8' }
};
const FX_ANIMS = { burst: 'fxBurst', rise: 'fxRise', fall: 'fxFall', ring: 'fxRing', slash: 'fxSlash', flicker: 'fxFlicker' };

function spriteCenter(side) {
    const field = document.getElementById('battleField');
    const sprite = document.getElementById(side === 'player' ? 'playerFighterSprite' : 'bossSprite');
    if (!field || !sprite) return null;
    const fr = field.getBoundingClientRect(), sr = sprite.getBoundingClientRect();
    return { x: sr.left - fr.left + sr.width / 2, y: sr.top - fr.top + sr.height * 0.55, w: sr.width };
}

function spawnParticles(side, cfg, count = 12) {
    const layer = document.getElementById('battleFx');
    const at = spriteCenter(side);
    if (!layer || !at) return;
    const spread = Math.max(50, at.w * 0.75);
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = `fx fx-${cfg.shape}`;
        const ang = Math.random() * Math.PI * 2;
        const dist = spread * (0.4 + Math.random() * 0.7);
        const jitter = cfg.anim === 'flicker' || cfg.anim === 'slash' ? spread * 0.5 : 0;
        const size = cfg.shape === 'ring' ? 26 + i * 6 : cfg.shape === 'bolt' ? 30 + Math.random() * 22 : 12 + Math.random() * 14;
        p.style.cssText = `--x:${(at.x + (Math.random() - .5) * jitter).toFixed(1)}px;--y:${(at.y + (Math.random() - .5) * jitter).toFixed(1)}px;`
            + `--c:${cfg.c[i % cfg.c.length]};--s:${size.toFixed(1)}px;--dx:${(Math.cos(ang) * dist).toFixed(1)}px;--dy:${(Math.sin(ang) * dist).toFixed(1)}px;`
            + `--rot:${Math.round(Math.random() * 360)}deg;--anim:${FX_ANIMS[cfg.anim] || 'fxBurst'};--d:${(0.45 + Math.random() * 0.35).toFixed(2)}s;--delay:${(i * 0.025).toFixed(3)}s;`
            + (cfg.shape === 'ring' ? `--grow:${(2 + i * 0.4).toFixed(1)};` : '');
        layer.appendChild(p);
        setTimeout(() => p.remove(), 1400);
    }
    if (cfg.screen) {
        const flash = document.createElement('div');
        flash.className = 'fx-screen';
        flash.style.setProperty('--c', cfg.screen);
        document.getElementById('battleField').appendChild(flash);
        setTimeout(() => flash.remove(), 600);
    }
    if (cfg.shake) {
        const field = document.getElementById('battleField');
        field.classList.remove('is-shaking'); void field.offsetWidth; field.classList.add('is-shaking');
        setTimeout(() => field.classList.remove('is-shaking'), 400);
    }
}

// Attacker lunges (physical) or charges up (special/status), then the
// move's type effect plays on its target.
function playMoveFx(attackerSide, spec, targetSide) {
    const sprite = document.getElementById(attackerSide === 'player' ? 'playerFighterSprite' : 'bossSprite');
    if (sprite) replaySpriteAnim(sprite, spec.category === 'physical' ? (attackerSide === 'player' ? 'is-lunge-right' : 'is-lunge-left') : 'is-charging');
    const cfg = TYPE_FX[spec.type] || TYPE_FX.normal;
    setTimeout(() => spawnParticles(targetSide, cfg, spec.category === 'status' ? 10 : 18), spec.category === 'physical' ? 200 : 160);
}
function playStatFx(side, up) {
    const layer = document.getElementById('battleFx');
    const at = spriteCenter(side);
    if (!layer || !at) return;
    for (let i = 0; i < 7; i++) {
        const p = document.createElement('div');
        p.className = `fx fx-arrow${up ? '' : ' is-down'}`;
        p.style.cssText = `--x:${(at.x + (i - 3) * 13).toFixed(1)}px;--y:${(at.y + (i % 2) * 14).toFixed(1)}px;--c:${up ? '#38bdf8' : '#f87171'};--anim:${up ? 'fxArrowUp' : 'fxArrowDown'};--d:.8s;--delay:${(i * 0.05).toFixed(2)}s;`;
        layer.appendChild(p);
        setTimeout(() => p.remove(), 1400);
    }
}
function playHealFx(side) {
    spawnParticles(side, { c: ['#86efac', '#bbf7d0', '#ffffff'], shape: 'star', anim: 'rise' }, 10);
}

window.switchBattlePokemon = function(uid) {
    const b = gameState.battle;
    if (!b.active || b.busy || b.pendingSwap) return;
    const playerTeam = b.playerTeam || [];
    const newFighter = playerTeam.find(p => p && p.uid == uid);
    if (!newFighter || newFighter === b.fighterPokemon) return;

    const boss = b.bossPokemon;
    const session = b.session;
    const logBox = document.getElementById('battleLog');

    // Save current fighter's HP before switching out
    if (!b.teamHp) b.teamHp = {};
    const outgoing = b.fighterPokemon;
    if (outgoing) {
        b.teamHp[outgoing.uid] = b.fighterHP;
    }

    // Update active fighter — restore previously saved HP if this
    // Pokémon was benched earlier in this battle
    const [newHP, fullHP] = getBenchHP(newFighter);
    b.playerTeamIndex = playerTeam.findIndex(p => p && p.uid == uid);
    b.fighterPokemon = newFighter;
    b.fighterHP = newHP;
    b.fighterMaxHP = fullHP;
    b.oranUsed = false;
    b.choiceBandMove = null;
    // Incoming Pokémon has clean status & stat stages (including confusion)
    b.statusConds.player = null;
    b.statStages.player = { atk:0, def:0, spAtk:0, spDef:0, speed:0, accuracy:0 };
    if (!b.statusMeta) b.statusMeta = { player: {}, boss: {} };
    b.statusMeta.player = { confused: false };

    renderBattleSide('player');
    logBox.innerHTML += `<div class="text-amber-400 font-bold mt-2">🔄 ${t('battle.switchedTo')} <span class="text-white">${newFighter.name}</span>! ${boss.name} ${t('battle.attacksDuring')}</div>`;
    logBox.scrollTop = logBox.scrollHeight;

    // Enemy gets a free attack as the cost of switching
    setBattleBusy(true);
    renderBattleMoves(newFighter);
    setTimeout(() => {
        if (!gameState.battle.active || gameState.battle.session !== session || gameState.battle.bossPokemon !== boss) {
            if (gameState.battle.session === session) setBattleBusy(false);
            return;
        }
        resolveMoveAttack(boss, newFighter, pickBossMove(boss), false);
        setBattleBusy(false);
        // Refresh bench HP bars (unless the newcomer fainted and was replaced)
        if (gameState.battle.active && gameState.battle.fighterPokemon === newFighter) renderBattleMoves(newFighter);
    }, 700);
};

// ── Run from battle ────────────────────────────────────────────────────
window.fleeBattle = function() {
    const b = gameState.battle;
    if (b.busy) return;
    initAudio();
    if (b.active && !window.confirm(gameState.activeBattleStage ? t('battle.runConfirmStage') : t('battle.runConfirmEndless'))) return;
    playConfirmSound();
    const wasActive = b.active;
    if (!gameState.activeBattleStage) gameState.endlessRunDefeats = 0;
    resetBattleScreen();
    renderRoadmap();
    updateUI();
    if (wasActive) showNotification(t('battle.fledTitle'), t('battle.fledMsg'), 'info');
};

// ── Endless mode: spawn the next challenger ────────────────────────────
async function spawnNextEndlessEnemy(fighter) {
    const session = gameState.battle.session;
    const fighterLevel = fighter.level || 1;
    const endlessEnemyLevel = Math.max(1, Math.ceil((fighterLevel - 0.7) + ((gameState.endlessRunDefeats || 0) * 0.1)));
    const genRange = getRadarGenRange();
    const idDiff = genRange.max - genRange.min;
    const randomEnemyId = Math.floor(Math.random() * (idDiff + 1)) + genRange.min;
    const logBox = document.getElementById('battleLog');
    if (logBox) { logBox.innerHTML += `<div class="text-cyan-400 font-bold mt-2">⚡ Preparing next challenger… (Round ${gameState.endlessRunDefeats + 1})</div>`; logBox.scrollTop = logBox.scrollHeight; }
    try {
        const newEnemy = await fetchPokemonData(randomEnemyId, endlessEnemyLevel);
        // The player ran or left the arena while the next foe was loading
        if (gameState.battle.session !== session) return;
        newEnemy.hp    = newEnemy.hp    + (endlessEnemyLevel * 3);
        newEnemy.atk   = newEnemy.atk   + (endlessEnemyLevel * 1.2);
        newEnemy.def   = newEnemy.def   + (endlessEnemyLevel * 1);
        newEnemy.spAtk = (newEnemy.spAtk || newEnemy.atk) + (endlessEnemyLevel * 1.2);
        newEnemy.spDef = (newEnemy.spDef || newEnemy.def) + (endlessEnemyLevel * 1);
        newEnemy.name  = 'Simulated ' + newEnemy.name;
        newEnemy.level = endlessEnemyLevel;
        if (endlessEnemyLevel >= 20) newEnemy.heldItem = 'oran_berry';

        gameState.battle.bossPokemon   = newEnemy;
        markSeen(newEnemy.id, newEnemy.name);
        gameState.battle.bossHP        = newEnemy.hp;
        gameState.battle.bossMaxHP     = newEnemy.hp;
        gameState.battle.bossOranUsed  = false;
        gameState.battle.enemyTeam     = [newEnemy];
        gameState.battle.enemyTeamIndex = 0;
        gameState.battle.active        = true;
        gameState.battle.statStages    = { player:{atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0}, boss:{atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0} };
        gameState.battle.statusConds.boss = null;
        if (!gameState.battle.statusMeta) gameState.battle.statusMeta = { player: {}, boss: {} };
        gameState.battle.statusMeta.boss = {};
        gameState.battle.choiceBandMove = null;

        renderBattleHeader();
        renderBattleSide('boss');
        renderBattleSide('player'); // level / moves may have changed after the last win
        if (logBox) { logBox.innerHTML += `<div class="text-amber-400 font-bold mt-2">⚔️ ${newEnemy.name} appeared! Defeat it to keep going!</div>`; logBox.scrollTop = logBox.scrollHeight; }
        setBattleBusy(false);
        renderBattleMoves(gameState.battle.fighterPokemon || fighter);
    } catch(e) {
        resetBattleScreen(); renderRoadmap(); updateUI();
    }
}
