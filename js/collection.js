// PokeSpinner — Pokédex, PC Box and Team screens.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// MODULE 7: POKEDEX & PC BOX MENUS
// ==========================================
window.triggerDexSearch = function() {
    gameState.dexUI.search = document.getElementById('dexSearchInput').value.toLowerCase().replace(/^#/, '').replace(/^0+(?=\d)/, '');
    gameState.dexUI.rarity = document.getElementById('rarityFilterSelect').value;
    gameState.dexUI.page = 1;
    renderPokedex();
};

window.changeDexPage = function(dir) {
    initAudio();
    playConfirmSound();
    gameState.dexUI.page += dir;
    renderPokedex();
};

// ==========================================
// POKéDEX — seen / caught per region, milestone rewards, detail card
// ==========================================
const DEX_REGIONS = [
    { name: 'Kanto', min: 1, max: 151 }, { name: 'Johto', min: 152, max: 251 }, { name: 'Hoenn', min: 252, max: 386 },
    { name: 'Sinnoh', min: 387, max: 493 }, { name: 'Unova', min: 494, max: 649 }, { name: 'Kalos', min: 650, max: 721 },
    { name: 'Alola', min: 722, max: 809 }, { name: 'Galar', min: 810, max: 905 }, { name: 'Paldea', min: 906, max: 1025 }
];
const DEX_MILESTONES = [
    { pct: 10, reward: { coins: 300 } }, { pct: 25, reward: { coins: 800, great: 5 } },
    { pct: 50, reward: { coins: 2000, ultra: 5 } }, { pct: 75, reward: { coins: 5000, ultra: 10 } },
    { pct: 100, reward: { coins: 15000, master: 1 } }
];
function markSeen(id, name) {
    if (!id) return;
    gameState.seen = gameState.seen || {};
    if (!gameState.seen[id]) gameState.seen[id] = name || true;
}
function dexCaughtSet() { return new Set((gameState.pokedex || []).map(p => p.id)); }
function dexShinySet() { return new Set((gameState.pokedex || []).filter(p => p.isShiny).map(p => p.id)); }
function dexNameFor(id) {
    const entry = (gameState.pokedex || []).find(p => p.id === id);
    if (entry) return getPokemonName(entry);
    const seen = (gameState.seen || {})[id];
    return typeof seen === 'string' ? seen.replace(/^.*'s /, '').replace(/^Simulated /, '') : null;
}
function rarityOfSpecies(id) {
    for (const rarity of ['Legendary', 'Epic', 'Rare', 'Common']) {
        const pools = BASIC_POKEMON_POOLS[rarity] || {};
        if (Object.values(pools).some(list => list.includes(id))) return rarity;
    }
    return LEGENDARY_MYTHICAL_POKEMON.includes(id) ? 'Legendary (1/200 special encounter)' : null;
}

function renderPokedex() {
    const grid = document.getElementById('pokedexGrid');
    if (!grid) return;
    const ui = gameState.dexUI;
    if (ui.region === undefined) ui.region = 0;
    ui.pageSize = 60;
    const caught = dexCaughtSet(), shiny = dexShinySet(), seen = gameState.seen || {};

    const tabs = document.getElementById('dexRegionTabs');
    tabs.innerHTML = DEX_REGIONS.map((r, i) => {
        let c = 0; for (let id = r.min; id <= r.max; id++) if (caught.has(id)) c++;
        return `<button type="button" class="g-tab${i === ui.region ? ' is-active' : ''}" onclick="setDexRegion(${i})">${r.name} <span class="dex-tab-count">${c}/${r.max - r.min + 1}</span></button>`;
    }).join('');

    // Region progress + milestone rewards
    const reg = DEX_REGIONS[ui.region];
    const size = reg.max - reg.min + 1;
    let rc = 0, rs = 0;
    for (let id = reg.min; id <= reg.max; id++) { if (caught.has(id)) rc++; else if (seen[id]) rs++; }
    const pct = (rc / size) * 100;
    gameState.dexClaims = gameState.dexClaims || {};
    document.getElementById('dexProgress').innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div class="g-font text-lg">${reg.name} Pokédex <span class="g-chip dark">${rc} caught · ${rs} seen · ${size} total</span></div>
            <div class="g-sub">National: ${caught.size}/1025 caught</div>
        </div>
        <div class="adv-progress"><span style="width:${pct.toFixed(1)}%"></span></div>
        <div class="dex-milestones">${DEX_MILESTONES.map(m => {
            const key = `${ui.region}-${m.pct}`;
            const done = gameState.dexClaims[key], ready = pct >= m.pct;
            const r = m.reward;
            const label = [`🪙${formatNum(r.coins)}`, r.great ? `${r.great}× Great` : '', r.ultra ? `${r.ultra}× Ultra` : '', r.master ? `${r.master}× Master` : ''].filter(Boolean).join(' + ');
            return `<button type="button" class="dex-milestone${done ? ' is-done' : ready ? ' is-ready' : ''}" ${ready && !done ? `onclick="claimDexMilestone(${ui.region},${m.pct})"` : 'disabled'} title="${label}">
                <b>${m.pct}%</b><span>${done ? '✓ Claimed' : ready ? 'Claim!' : label}</span></button>`;
        }).join('')}</div>`;

    // Species list for the region, filtered
    const q = (ui.search || '').trim();
    const filter = ui.rarity || 'all';
    const list = [];
    for (let id = reg.min; id <= reg.max; id++) {
        const isC = caught.has(id), isS = !!seen[id] || isC;
        if (filter === 'caught' && !isC) continue;
        if (filter === 'seen' && (isC || !seen[id])) continue;
        if (filter === 'missing' && isC) continue;
        if (filter === 'shiny' && !shiny.has(id)) continue;
        if (q) {
            const nm = (dexNameFor(id) || '').toLowerCase();
            if (!(String(id).includes(q) || (isS && nm.includes(q.toLowerCase())))) continue;
        }
        list.push({ id, isC, isS });
    }
    const maxPage = Math.max(1, Math.ceil(list.length / ui.pageSize));
    ui.page = Math.min(Math.max(1, ui.page || 1), maxPage);
    document.getElementById('pageInfoText').textContent = `${t('dex.page')} ${ui.page} ${t('dex.of')} ${maxPage}`;
    document.getElementById('prevPageBtn').disabled = ui.page === 1;
    document.getElementById('nextPageBtn').disabled = ui.page === maxPage;

    grid.innerHTML = list.slice((ui.page - 1) * ui.pageSize, ui.page * ui.pageSize).map(({ id, isC, isS }) => {
        const nm = isS ? (dexNameFor(id) || `#${id}`) : '???';
        const state = isC ? 'is-caught' : isS ? 'is-seen' : 'is-unknown';
        return `<button type="button" class="dex-tile ${state}${ui.selected === id ? ' is-selected' : ''}" onclick="openDexDetail(${id})">
            <span class="dex-no">#${String(id).padStart(4, '0')}</span>
            <img src="${pixelSprite(id, shiny.has(id))}" alt="" loading="lazy">
            <span class="dex-name">${nm}</span>
            ${isC ? `<img class="dex-caught" src="${ITEM_BASE}poke-ball.png" alt="caught">` : ''}${shiny.has(id) ? '<span class="dex-shiny">✨</span>' : ''}
        </button>`;
    }).join('') || '<p class="g-sub col-span-full">No Pokémon match.</p>';
    renderDexDetail();
}

function renderDexDetail() {
    const el = document.getElementById('dexDetail');
    if (!el) return;
    const id = gameState.dexUI.selected;
    if (!id) { el.innerHTML = '<div class="dex-empty"><img src="' + ITEM_BASE + 'poke-radar.png" alt=""><p class="g-sub">Tap a Pokémon to see its entry.</p></div>'; return; }
    const caught = dexCaughtSet().has(id), seen = caught || !!(gameState.seen || {})[id];
    const entry = (gameState.pokedex || []).find(p => p.id === id);
    const owned = gameState.pcBox.filter(p => p.id === id);
    const shinyOwned = owned.some(p => p.isShiny);
    const rarity = rarityOfSpecies(id);
    const name = seen ? (dexNameFor(id) || `#${id}`) : '???';
    let statsHtml = '<p class="g-sub">Catch it to record its stats.</p>';
    if (entry) {
        const rows = [['HP', entry.hp], ['Atk', entry.atk], ['Def', entry.def], ['SpA', entry.spAtk || entry.atk], ['SpD', entry.spDef || entry.def], ['Spe', entry.speed || 60]];
        const col = v => v >= 110 ? '#56d43f' : v >= 80 ? '#ffd23f' : v >= 50 ? '#ff9f43' : '#ff5a64';
        statsHtml = `<div class="dex-stats">${rows.map(([k, v]) => `<span>${k}</span><b>${v}</b><div class="stat-bar"><span style="width:${Math.min(100, v / 1.6)}%;--sc:${col(v)}"></span></div>`).join('')}
            <span>Total</span><b>${rows.reduce((a, r) => a + r[1], 0)}</b><span></span></div>`;
    }
    el.innerHTML = `
        <div class="dex-detail-head"><span class="g-chip dark">#${String(id).padStart(4, '0')}</span>${caught ? '<span class="g-chip" style="background:#86efac">Caught</span>' : seen ? '<span class="g-chip">Seen</span>' : '<span class="g-chip">Unknown</span>'}</div>
        <div class="dex-detail-stage ${seen ? '' : 'is-hidden'}">${seen ? animatedSpriteImg({ id, isShiny: false, name }, 'dex-detail-sprite') : `<img class="dex-detail-sprite" src="${pixelSprite(id)}" alt="">`}</div>
        <div class="dex-detail-name">${name}</div>
        ${entry ? `<div class="flex justify-center gap-1 mb-2">${typeChip(entry.type1)}${typeChip(entry.type2)}</div>` : ''}
        ${statsHtml}
        <div class="dex-facts">
            <div><span>Owned</span><b>${owned.length}${shinyOwned ? ' ✨' : ''}</b></div>
            <div><span>Spinner</span><b>${rarity || 'Not on the wheel'}</b></div>
        </div>`;
}

window.openDexDetail = function(id) {
    playBeep();
    gameState.dexUI.selected = id;
    document.querySelectorAll('#pokedexGrid .dex-tile').forEach(b => b.classList.toggle('is-selected', b.getAttribute('onclick') === `openDexDetail(${id})`));
    renderDexDetail();
    if (window.innerWidth < 1024) document.getElementById('dexDetail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};
window.setDexRegion = function(i) { playBeep(); gameState.dexUI.region = i; gameState.dexUI.page = 1; renderPokedex(); };
window.claimDexMilestone = function(region, pct) {
    const key = `${region}-${pct}`;
    gameState.dexClaims = gameState.dexClaims || {};
    if (gameState.dexClaims[key]) return;
    const m = DEX_MILESTONES.find(x => x.pct === pct);
    gameState.dexClaims[key] = true;
    addCoins(m.reward.coins);
    ['great', 'ultra', 'master'].forEach(b => { if (m.reward[b]) gameState.balls[b] = (gameState.balls[b] || 0) + m.reward[b]; });
    playSuccessCapture();
    showNotification(`🏆 ${DEX_REGIONS[region].name} ${pct}% reward!`, `Professor Oak sent you ${formatNum(m.reward.coins)} coins${m.reward.great ? `, ${m.reward.great} Great Balls` : ''}${m.reward.ultra ? `, ${m.reward.ultra} Ultra Balls` : ''}${m.reward.master ? ' and a Master Ball' : ''}!`, 'success');
    saveProgress(); updateUI(); renderPokedex();
};

let pcUI = { page: 1, pageSize: 30, search: "", sort: "newest", type: "", selected: null };

window.triggerPCSearch = function() {
    pcUI.search = (document.getElementById('pcSearchInput')?.value || "").toLowerCase();
    pcUI.sort = document.getElementById('pcSortSelect')?.value || "newest";
    pcUI.type = document.getElementById('pcTypeSelect')?.value || "";
    pcUI.page = 1;
    renderPCBox();
};

window.changePCPage = function(dir) {
    initAudio();
    playConfirmSound();
    pcUI.page += dir;
    renderPCBox();
};

// ── Shared little renderers for Team / PC / Dex ─────────────────
function typeChip(tp) { return tp ? `<span class="type-chip" style="--tc:${BATTLE_TYPE_COLORS[tp] || '#a8a77a'}">${tp}</span>` : ''; }
function animatedSpriteImg(p, cls = '') {
    const c = battleSpriteCandidates(p.id, !!p.isShiny, false);
    return `<img class="${cls}" src="${c[0]}" data-fallbacks="${c.slice(1).join('|')}" onerror="_spriteFallback(this)" alt="${p.name}" loading="lazy">`;
}
function itemIconUrl(key) {
    const MAP = { attack_boost: 'x-attack', defense_boost: 'x-defense', speed_boost: 'x-speed', special_boost: 'x-sp-atk', vitamin_a: 'hp-up', vitamin_b: 'protein', vitamin_c: 'iron', vitamin_d: 'calcium', vitamin_e: 'zinc', vitamin_f: 'carbos', nature_mint: 'adamant-mint' };
    return `${ITEM_BASE}${MAP[key] || String(key).replace(/_/g, '-')}.png`;
}
function pokemonStats(p) {
    const m = 1 + (((p.level || 1) - 1) * 0.05);
    return {
        hp: Math.max(1, Math.round((p.hp + (p.hpBonus || 0)) * m)), atk: Math.round(p.atk * m), def: Math.round(p.def * m),
        spAtk: Math.round((p.spAtk || p.atk) * m), spDef: Math.round((p.spDef || p.def) * m), speed: Math.round((p.speed || 60) * m)
    };
}
function moveChip(m) {
    const spec = getMove(m) || { type: 'normal', power: 0, category: 'status' };
    return `<span class="move-chip" style="--tc:${BATTLE_TYPE_COLORS[spec.type] || '#a8a77a'}" title="${spec.type} · ${spec.category === 'status' ? 'Status' : 'PWR ' + spec.power}">${m.replace(/-/g, ' ')}</span>`;
}

function getTeamMembers() {
    return (gameState.team || []).map(uid => uid ? gameState.pcBox.find(p => p.uid === uid) : null);
}

function renderTeamView() {
    const slotsContainer = document.getElementById('teamSlotsContainer');
    if (!slotsContainer) return;
    if (!gameState.team || gameState.team.length < 6) gameState.team = Array.from({ length: 6 }, (_, i) => (gameState.team || [])[i] || null);
    const members = getTeamMembers();

    slotsContainer.innerHTML = members.map((pk, i) => {
        if (!pk) return `<button type="button" class="party-card is-empty" onclick="pickTeamSlot(${i})"><span class="party-plus">+</span><span>Add Pokémon</span><span class="g-sub">Slot ${i + 1}</span></button>`;
        const st = pokemonStats(pk);
        const xpPct = Math.min(100, ((pk.xp || 0) / ((pk.level || 1) * 100)) * 100);
        const held = pk.heldItem && HOLD_ITEMS_DB[pk.heldItem];
        return `<div class="party-card${i === 0 ? ' is-lead' : ''}">
            <div class="party-top">
                <span class="g-chip ${i === 0 ? '' : 'dark'}">${i === 0 ? '👑 Lead' : '#' + (i + 1)}</span>
                <div class="party-actions">
                    <button type="button" class="square-btn sm" onclick="moveTeamSlot(${i},-1)" ${i === 0 ? 'disabled' : ''} title="Move earlier">◀</button>
                    <button type="button" class="square-btn sm" onclick="moveTeamSlot(${i},1)" ${i === 5 ? 'disabled' : ''} title="Move later">▶</button>
                    <button type="button" class="square-btn sm" onclick="clearTeamSlot(${i})" title="Remove from team">✕</button>
                </div>
            </div>
            <button type="button" class="party-body" onclick="pickTeamSlot(${i})" title="Swap this Pokémon">
                <div class="party-stage">${animatedSpriteImg(pk, 'party-sprite')}</div>
                <div class="party-name">${pk.isShiny ? '✨ ' : ''}${getPokemonName(pk)} <span>Lv ${pk.level || 1}</span></div>
                <div class="flex justify-center gap-1">${typeChip(pk.type1)}${typeChip(pk.type2)}</div>
            </button>
            <div class="party-meta">
                <div class="party-stat"><span>HP</span><b>${st.hp}</b><span>ATK</span><b>${Math.max(st.atk, st.spAtk)}</b><span>SPE</span><b>${st.speed}</b></div>
                <div class="stat-bar" title="EXP ${pk.xp || 0}/${(pk.level || 1) * 100}"><span style="width:${xpPct}%;--sc:#45a3ff"></span></div>
                <div class="party-moves">${(pk.moves || []).map(moveChip).join('')}</div>
                <div class="party-item">${held ? `<img src="${itemIconUrl(pk.heldItem)}" alt=""> ${held.name}` : '<span class="g-sub">No held item</span>'}</div>
            </div>
        </div>`;
    }).join('');

    renderTeamCoverage(members.filter(Boolean));
    renderTeamReadiness(members.filter(Boolean));
    renderTeamPicker();

    const teamBadgeInline = document.getElementById('teamCountBadgeInline');
    if (teamBadgeInline) teamBadgeInline.textContent = `${members.filter(Boolean).length}/6`;
    updateUI();
}

// Offense: which types your moves hit super-effectively. Defense: shared weaknesses.
function renderTeamCoverage(members) {
    const el = document.getElementById('teamCoverage');
    if (!el) return;
    if (!members.length) { el.innerHTML = '<p class="g-sub">Add Pokémon to see what your team hits hard — and what hits it hard.</p>'; return; }
    const moveTypes = new Set();
    members.forEach(p => (p.moves || []).forEach(m => { const sp = getMove(m); if (sp && sp.category !== 'status' && sp.power > 0) moveTypes.add(sp.type); }));
    const offense = TYPES.map(def => {
        let best = 0;
        moveTypes.forEach(mt => { best = Math.max(best, getTypeEffectiveness(mt, { type1: def })); });
        return { t: def, best };
    });
    const threats = TYPES.map(atk => {
        let weak = 0, resist = 0;
        members.forEach(p => { const m = getTypeEffectiveness(atk, p); if (m > 1) weak++; else if (m < 1) resist++; });
        return { t: atk, weak, resist };
    }).filter(x => x.weak >= 2 && x.weak > x.resist).sort((a, b) => b.weak - a.weak);
    const covered = offense.filter(o => o.best > 1).length;
    el.innerHTML = `
        <p class="g-sub mb-2">Your moves hit <b class="text-white">${covered}/18</b> types super-effectively:</p>
        <div class="cov-grid">${offense.map(o => `<span class="cov-type${o.best > 1 ? ' is-super' : o.best === 0 ? ' is-none' : ''}" style="--tc:${BATTLE_TYPE_COLORS[o.t]}" title="${o.t}: best ${o.best}×">${o.t.slice(0, 3)}</span>`).join('')}</div>
        <p class="g-sub mt-3 mb-1">${threats.length ? '⚠️ Watch out for:' : '🛡️ No shared weaknesses — nicely balanced!'}</p>
        <div class="flex flex-wrap gap-1.5">${threats.slice(0, 6).map(x => `${typeChip(x.t)}<span class="g-chip">${x.weak} weak</span>`).join('')}</div>`;
}

function renderTeamReadiness(members) {
    const el = document.getElementById('teamReadiness');
    if (!el) return;
    const next = CAMPAIGN_ROADMAP.find(st => st.stageId === gameState.unlockedStages);
    if (!next) { el.innerHTML = '<p class="g-sub">You have beaten every trainer. You are a true Pokémon Master! 🏆</p>'; return; }
    const team = getStageTeam(next);
    const lead = members[0];
    const avg = members.length ? Math.round(members.reduce((a, p) => a + (p.level || 1), 0) / members.length) : 0;
    const diff = avg - next.level;
    const verdict = !members.length ? ['Add a Pokémon first!', '#ff8a8a'] : diff >= 0 ? ['Ready to battle!', '#86efac'] : diff >= -5 ? ['A close fight — good luck!', '#ffe06a'] : ['Train up first (Battle Tower or rematches).', '#ff8a8a'];
    el.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="adv-prev-icon">${next.icon || '⚔️'}</span>
            <div class="min-w-0"><div class="g-font text-lg truncate">${next.trainer}</div><div class="g-sub">${next.name} · Lv ${next.level}</div></div>
        </div>
        <div class="flex gap-1 mt-2">${team.map(id => `<img class="w-11 h-11 object-contain" src="${pixelSprite(id)}" alt="">`).join('')}</div>
        <p class="mt-2 font-extrabold" style="color:${verdict[1]}">${verdict[0]} <span class="g-sub">(your team avg Lv ${avg}${lead ? `, lead ${getPokemonName(lead)} Lv ${lead.level || 1}` : ''})</span></p>
        <button type="button" class="g-btn green sm mt-3" onclick="switchView('battle'); openStagePreview(${next.stageId})">⚔️ Go to battle</button>`;
}

function renderTeamPicker() {
    const modal = document.getElementById('teamPickerModal');
    const summary = document.getElementById('teamPcSummary');
    const browser = document.getElementById('teamPcBrowser');
    const banner = document.getElementById('teamActiveSlotBanner');
    if (!modal) return;
    const activeSlot = gameState._activeTeamSlot;
    const open = activeSlot !== null && activeSlot !== undefined;
    modal.classList.toggle('hidden', !open);
    modal.classList.toggle('flex', open);
    if (!open) return;
    if (banner) banner.textContent = activeSlot === 0 ? 'Choose your Lead' : `Choose Pokémon #${activeSlot + 1}`;
    const q = (gameState._teamSearch || '').toLowerCase();
    const tf = gameState._teamType || '';
    const inTeam = new Set((gameState.team || []).filter(Boolean));
    const list = gameState.pcBox
        .filter(p => (!q || getPokemonName(p).toLowerCase().includes(q)) && (!tf || p.type1 === tf || p.type2 === tf))
        .sort((a, b) => (b.level || 1) - (a.level || 1));
    summary.innerHTML = `
        <div class="flex flex-wrap gap-2">
            <input type="text" id="teamSearchInput" class="g-input flex-1 min-w-[140px]" placeholder="Search your Pokémon…" value="${gameState._teamSearch || ''}" oninput="window.filterTeamSearch(this.value)">
            <select class="g-input" onchange="gameState_setTeamType(this.value)"><option value="">All types</option>${TYPES.map(tp => `<option value="${tp}" ${tp === tf ? 'selected' : ''}>${tp}</option>`).join('')}</select>
        </div>`;
    browser.innerHTML = list.length ? list.map(pk => `
        <button type="button" class="pick-card${inTeam.has(pk.uid) ? ' is-in-team' : ''}" onclick="window.selectPcForSlot(${pk.uid})">
            <img src="${pixelSprite(pk.id, !!pk.isShiny)}" alt="">
            <span class="pick-name">${pk.isShiny ? '✨' : ''}${getPokemonName(pk)}</span>
            <span class="g-sub">Lv ${pk.level || 1}${inTeam.has(pk.uid) ? ' · in team' : ''}</span>
            <span class="flex gap-0.5">${typeChip(pk.type1)}${typeChip(pk.type2)}</span>
        </button>`).join('') : `<p class="g-sub">${gameState.pcBox.length ? 'No Pokémon match.' : t('team.catchFirst')}</p>`;
}
window.gameState_setTeamType = function(tp) { gameState._teamType = tp; renderTeamPicker(); };

window.moveTeamSlot = function(i, dir) {
    const j = i + dir;
    if (j < 0 || j > 5) return;
    playBeep();
    const tm = gameState.team;
    [tm[i], tm[j]] = [tm[j], tm[i]];
    saveProgress();
    renderTeamView();
};

// Strongest Pokémon first, but no more than two sharing a primary type
window.autoBuildTeam = function() {
    if (!gameState.pcBox.length) { showNotification('No Pokémon', 'Catch some Pokémon first!', 'info'); return; }
    playConfirmSound();
    const bst = p => p.hp + p.atk + p.def + (p.spAtk || p.atk) + (p.spDef || p.def) + (p.speed || 60);
    const ranked = [...gameState.pcBox].sort((a, b) => ((b.level || 1) * 12 + bst(b)) - ((a.level || 1) * 12 + bst(a)));
    const pick = [], typeCount = {};
    for (const p of ranked) {
        if (pick.length >= 6) break;
        if ((typeCount[p.type1] || 0) >= 2) continue;
        pick.push(p); typeCount[p.type1] = (typeCount[p.type1] || 0) + 1;
    }
    for (const p of ranked) { if (pick.length >= 6) break; if (!pick.includes(p)) pick.push(p); }
    gameState.team = Array.from({ length: 6 }, (_, i) => pick[i] ? pick[i].uid : null);
    saveProgress();
    renderTeamView();
    renderFighterSelectionGrid();
    showNotification('Team built!', `${pick.length} Pokémon ready — ${getPokemonName(pick[0])} leads.`, 'success');
};

window.pickTeamSlot = function(slotIndex) {
    gameState._activeTeamSlot = (slotIndex === null || gameState._activeTeamSlot === slotIndex) ? null : slotIndex;
    renderTeamPicker();
};

window.selectPcForSlot = function(uid) {
    const slotIndex = gameState._activeTeamSlot;
    if (slotIndex === null || slotIndex === undefined) return;
    gameState._activeTeamSlot = null; // clear before re-render triggered by setTeamSlot
    window.setTeamSlot(slotIndex, uid);
};

window.filterTeamSearch = function(val) {
    gameState._teamSearch = val;
    renderTeamPicker();
    const inp = document.getElementById('teamSearchInput');
    if (inp) { inp.focus(); const l=inp.value.length; inp.setSelectionRange(l,l); }
};

window.setTeamSlot = function(slotIndex, uid) {
    const normalizedUid = uid ? Number(uid) : null;
    if (!gameState.team || gameState.team.length < 6) {
        gameState.team = Array.from({ length: 6 }, (_, idx) => gameState.team?.[idx] || null);
    }
    const existingIndex = gameState.team.findIndex(existingUid => existingUid === normalizedUid);
    if (existingIndex !== -1 && existingIndex !== slotIndex) {
        gameState.team[existingIndex] = gameState.team[slotIndex] || null; // swap places
    }
    gameState.team[slotIndex] = normalizedUid;
    while (gameState.team.length < 6) gameState.team.push(null);
    saveProgress();
    renderTeamView();
    renderFighterSelectionGrid();
    playConfirmSound();
};

window.clearTeamSlot = function(slotIndex) {
    if (!gameState.team || gameState.team.length < 6) {
        gameState.team = Array.from({ length: 6 }, (_, idx) => gameState.team?.[idx] || null);
    }
    gameState.team[slotIndex] = null;
    saveProgress();
    renderTeamView();
    renderFighterSelectionGrid();
};

function renderPCBox() {
    const grid = document.getElementById('pcGrid');
    if (!grid) return;
    pcUI.pageSize = 30;
    const typeSel = document.getElementById('pcTypeSelect');
    if (typeSel && typeSel.options.length <= 1) typeSel.innerHTML = '<option value="">All types</option>' + TYPES.map(tp => `<option value="${tp}">${tp}</option>`).join('');

    let list = [...gameState.pcBox];
    if (pcUI.search) list = list.filter(p => getPokemonName(p).toLowerCase().includes(pcUI.search) || p.name.toLowerCase().includes(pcUI.search) || p.id.toString() === pcUI.search);
    if (pcUI.type) list = list.filter(p => p.type1 === pcUI.type || p.type2 === pcUI.type);
    const sorters = {
        newest: (a, b) => (b.caughtAt || 0) - (a.caughtAt || 0), oldest: (a, b) => (a.caughtAt || 0) - (b.caughtAt || 0),
        'level-desc': (a, b) => (b.level || 1) - (a.level || 1), 'level-asc': (a, b) => (a.level || 1) - (b.level || 1),
        dex: (a, b) => a.id - b.id, name: (a, b) => getPokemonName(a).localeCompare(getPokemonName(b)),
        shiny: (a, b) => (b.isShiny ? 1 : 0) - (a.isShiny ? 1 : 0), fav: (a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)
    };
    list.sort(sorters[pcUI.sort] || sorters.newest);

    const maxPage = Math.max(1, Math.ceil(list.length / pcUI.pageSize));
    pcUI.page = Math.min(Math.max(1, pcUI.page), maxPage);
    document.getElementById('pcPageInfoText').textContent = `BOX ${pcUI.page}`;
    document.getElementById('pcPrevPageBtn').disabled = pcUI.page === 1;
    document.getElementById('pcNextPageBtn').disabled = pcUI.page === maxPage;
    document.getElementById('pcCountBadge').textContent = gameState.pcBox.length;
    const foot = document.getElementById('pcBoxFoot');
    if (foot) foot.textContent = `${list.length} Pokémon${list.length !== gameState.pcBox.length ? ` (of ${gameState.pcBox.length})` : ''} · Box ${pcUI.page} of ${maxPage}`;

    const inTeam = new Set((gameState.team || []).filter(Boolean));
    const page = list.slice((pcUI.page - 1) * pcUI.pageSize, pcUI.page * pcUI.pageSize);
    const cells = page.map(pk => `
        <button type="button" class="pc-cell${pcUI.selected === pk.uid ? ' is-selected' : ''}" onclick="selectPcPokemon(${pk.uid})" title="${getPokemonName(pk)} Lv ${pk.level || 1}">
            <img src="${pixelSprite(pk.id, !!pk.isShiny)}" alt="" loading="lazy">
            <span class="pc-lv">${pk.level || 1}</span>
            ${pk.isShiny ? '<span class="pc-shiny">✨</span>' : ''}${pk.favorite ? '<span class="pc-fav">♥</span>' : ''}${inTeam.has(pk.uid) ? '<span class="pc-team" title="In team"></span>' : ''}
        </button>`);
    while (cells.length < pcUI.pageSize) cells.push('<div class="pc-cell is-empty"></div>');
    grid.innerHTML = gameState.pcBox.length ? cells.join('') : `<div class="col-span-full text-center py-10"><p class="g-font text-xl">${t('pc.noPokemon')}</p><p class="g-sub">${t('pc.noPokemonMsg')}</p></div>`;
    if (!gameState.pcBox.some(p => p.uid === pcUI.selected)) pcUI.selected = (page[0] || {}).uid || null;
    renderPcSummary();
}

function renderPcSummary() {
    const el = document.getElementById('pcSummary');
    if (!el) return;
    const pk = gameState.pcBox.find(p => p.uid === pcUI.selected);
    if (!pk) { el.innerHTML = '<div class="dex-empty"><img src="' + ITEM_BASE + 'premier-ball.png" alt=""><p class="g-sub">Select a Pokémon to see its summary.</p></div>'; return; }
    const st = pokemonStats(pk);
    const level = pk.level || 1, xp = pk.xp || 0, need = level * 100;
    const teamIdx = (gameState.team || []).indexOf(pk.uid);
    const statRows = [['HP', st.hp], ['Attack', st.atk], ['Defense', st.def], ['Sp. Atk', st.spAtk], ['Sp. Def', st.spDef], ['Speed', st.speed]];
    const maxStat = Math.max(...statRows.map(r => r[1]), 1);
    const held = Object.keys(HOLD_ITEMS_DB).filter(k => HOLD_ITEMS_DB[k].type === 'held_item' && ((gameState.inventoryItems[k] || 0) > 0 || pk.heldItem === k));
    const usable = Object.keys(HOLD_ITEMS_DB).filter(k => { const it = HOLD_ITEMS_DB[k]; return (it.type === 'evolution_stone' || (it.type === 'consumable' && !BATTLE_BAG_ITEMS.includes(k) && !SHOP_HIDDEN_CONSUMABLES.has(k))) && (gameState.inventoryItems[k] || 0) > 0; });
    const tms = Object.keys(gameState.tmsOwned || {}).filter(k => gameState.tmsOwned[k] && canLearnTM(pk, k));
    const learnable = getLearnableMovesForPokemon(pk);
    el.innerHTML = `
        <div class="pc-sum-head">
            <div class="min-w-0"><div class="pc-sum-name">${pk.isShiny ? '✨ ' : ''}${getPokemonName(pk)}</div><div class="g-sub">#${String(pk.id).padStart(4, '0')} · Lv ${level} · ${pk.rarity || 'Common'}</div></div>
            <button type="button" class="square-btn sm${pk.favorite ? ' is-fav' : ''}" onclick="togglePcFavorite(${pk.uid})" title="${pk.favorite ? 'Unfavourite' : 'Favourite (protects from release)'}">${pk.favorite ? '♥' : '♡'}</button>
        </div>
        <div class="party-stage pc-sum-stage">${animatedSpriteImg(pk, 'party-sprite')}</div>
        <div class="flex justify-center gap-1 my-2">${typeChip(pk.type1)}${typeChip(pk.type2)}</div>
        <div class="g-sub flex justify-between"><span>EXP</span><span>${xp}/${need}</span></div>
        <div class="stat-bar mb-3"><span style="width:${Math.min(100, xp / need * 100)}%;--sc:#45a3ff"></span></div>
        <div class="pc-stats">${statRows.map(([k, v]) => `<span>${k}</span><div class="stat-bar"><span style="width:${(v / maxStat * 100).toFixed(0)}%"></span></div><b>${v}</b>`).join('')}</div>
        <div class="pc-sec">Moves</div>
        <div class="pc-moves">${[0, 1, 2, 3].map(i => {
            const cur = (pk.moves || [])[i];
            const spec = cur ? getMove(cur) : null;
            return `<label class="pc-move" style="--tc:${spec ? BATTLE_TYPE_COLORS[spec.type] : '#6b5a86'}">
                <select onchange="window.changePokemonMove(${pk.uid}, ${i}, this.value)">${cur ? '' : '<option value="">— empty —</option>'}${learnable.map(m => `<option value="${m}" ${m === cur ? 'selected' : ''}>${m.replace(/-/g, ' ')}</option>`).join('')}</select>
                <span>${spec ? `${spec.type} · ${spec.category === 'status' ? 'Status' : 'PWR ' + spec.power}` : ''}</span></label>`;
        }).join('')}</div>
        <div class="pc-sec">Held item</div>
        <div class="flex items-center gap-2">
            ${pk.heldItem ? `<img class="w-8 h-8" src="${itemIconUrl(pk.heldItem)}" alt="">` : ''}
            <select class="g-input flex-1" onchange="window.equipItem(${pk.uid}, this.value)"><option value="">None</option>${held.map(k => `<option value="${k}" ${pk.heldItem === k ? 'selected' : ''}>${HOLD_ITEMS_DB[k].name}${gameState.inventoryItems[k] ? ` (${gameState.inventoryItems[k]})` : ''}</option>`).join('')}</select>
        </div>
        ${usable.length ? `<div class="pc-sec">Use item</div><div class="flex gap-2"><select id="pcConsumableSelect-${pk.uid}" class="g-input flex-1">${usable.map(k => `<option value="${k}">${HOLD_ITEMS_DB[k].name} (${gameState.inventoryItems[k]})</option>`).join('')}</select><button type="button" class="g-btn sm blue" onclick="window.usePcConsumable(${pk.uid}, document.getElementById('pcConsumableSelect-${pk.uid}').value)">Use</button></div>` : ''}
        ${tms.length ? `<div class="pc-sec">Teach TM</div><div class="flex flex-wrap gap-2"><select id="pcTmSelect-${pk.uid}" class="g-input flex-1 min-w-0">${tms.map(k => `<option value="${k}">TM${TM_DB[k].num} ${TM_DB[k].name}</option>`).join('')}</select><select id="pcTmSlot-${pk.uid}" class="g-input w-20">${[0, 1, 2, 3].map(i => `<option value="${i}">Slot ${i + 1}</option>`).join('')}</select><button type="button" class="g-btn sm purple" onclick="window.teachTM(${pk.uid}, document.getElementById('pcTmSelect-${pk.uid}').value, parseInt(document.getElementById('pcTmSlot-${pk.uid}').value))">Teach</button></div>` : ''}
        <div class="flex gap-2 mt-4">
            ${teamIdx >= 0 ? `<button type="button" class="g-btn sm flex-1" onclick="clearTeamSlot(${teamIdx}); renderPCBox();">Remove from team</button>`
                : `<button type="button" class="g-btn sm green flex-1" onclick="addPcToTeam(${pk.uid})">➕ Add to team</button>`}
            <button type="button" class="g-btn sm red" onclick="window.releasePokemon(${pk.uid})" ${pk.favorite ? 'disabled title="Unfavourite to release"' : ''}>Release</button>
        </div>`;
}

window.selectPcPokemon = function(uid) {
    playBeep();
    pcUI.selected = uid;
    document.querySelectorAll('#pcGrid .pc-cell').forEach(c => c.classList.toggle('is-selected', c.getAttribute('onclick') === `selectPcPokemon(${uid})`));
    renderPcSummary();
    if (window.innerWidth < 1024) document.getElementById('pcSummary').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
window.togglePcFavorite = function(uid) {
    const pk = gameState.pcBox.find(p => p.uid === uid);
    if (!pk) return;
    pk.favorite = !pk.favorite;
    playBeep(); saveProgress(); renderPCBox();
};
window.addPcToTeam = function(uid) {
    if (!gameState.team || gameState.team.length < 6) gameState.team = Array.from({ length: 6 }, (_, i) => (gameState.team || [])[i] || null);
    const slot = gameState.team.findIndex(x => !x);
    if (slot === -1) { showNotification('Team is full', 'Remove a Pokémon on the Team screen first.', 'info'); return; }
    window.setTeamSlot(slot, uid);
    showNotification('Added to team!', `${getPokemonName(gameState.pcBox.find(p => p.uid === uid))} joined slot ${slot + 1}.`, 'success');
    renderPCBox();
};

window.teachTM = function(pokemonUid, tmKey, slotIndex) {
      if (!tmKey) { showNotification('Select TM', 'Choose a TM from the dropdown first.', 'error'); return; }
      const tm = TM_DB[tmKey];
      if (!tm) return;
      if (!gameState.tmsOwned || !gameState.tmsOwned[tmKey]) {
          showNotification('TM Not Owned', 'Buy this TM in the Shop first.', 'error'); return;
      }
      const pk = gameState.pcBox.find(p => p.uid === pokemonUid);
      if (!pk) return;
      if (!canLearnTM(pk, tmKey)) {
          showNotification('Incompatible', pk.name + ' cannot learn ' + tm.name + '.', 'error'); return;
      }
      if (pk.moves.includes(tm.move)) {
          showNotification('Already Known', pk.name + ' already knows ' + tm.name + '.', 'info'); return;
      }
      const slot = (typeof slotIndex === 'number' && slotIndex >= 0 && slotIndex <= 3) ? slotIndex : 0;
      if (pk.moves.length > slot) {
          pk.moves[slot] = tm.move;
      } else {
          pk.moves.push(tm.move);
      }
      saveProgress();
      showNotification('\uD83D\uDCC0 TM Taught!', pk.name + ' learned ' + tm.name + '! (TM reusable)', 'success');
      renderPCBox();
  };

  window.releasePokemon = function(uid) {
    const pk = gameState.pcBox.find(p => p.uid === uid);
    if (!pk) return;
    if (pk.favorite) { showNotification('Favourite Pokémon', 'Unfavourite it before releasing.', 'info'); return; }
    if (gameState.pcBox.length <= 1) { showNotification("Can't release", 'You need at least one Pokémon!', 'info'); return; }
    const isOnTeam = (gameState.team||[]).some(id => id === uid);
    const msg = isOnTeam
        ? `Release ${pk.name} back into the wild? It is on your active team and will be removed.`
        : `Release ${pk.name} back into the wild? This cannot be undone.`;
    if (!confirm(msg)) return;
    gameState.pcBox = gameState.pcBox.filter(p => p.uid !== uid);
    if (gameState.team) gameState.team = gameState.team.map(id => id === uid ? null : id);
    saveProgress();
    renderPCBox();
    renderTeamView();
    renderFighterSelectionGrid();
    const pcBadge = document.getElementById('pcCountBadge');
    if (pcBadge) pcBadge.textContent = gameState.pcBox.length;
    // Professor Oak pays a little for every Pokémon sent back to the wild
    const releaseReward = 10 + (pk.level || 1) * 3 + (pk.isShiny ? 200 : 0);
    addCoins(releaseReward);
    updateUI();
    showNotification(`Bye-bye, ${pk.name}!`, `Professor Oak sent you ${releaseReward} coins as thanks.`, 'info');
};

window.equipItem = function(pokemonUid, itemKey) {
    initAudio();
    playConfirmSound();
    const pokemon = gameState.pcBox.find(p => p.uid === pokemonUid);
    if (!pokemon) return;

    if (itemKey && HOLD_ITEMS_DB[itemKey] && HOLD_ITEMS_DB[itemKey].type !== 'held_item') {
        showNotification('Only held items', 'Use the consumables section to apply one-time-use items.', 'info');
        return;
    }

    if (itemKey && pokemon.heldItem !== itemKey) {
        // Uniqueness check: compare owned count vs already-equipped-by-others count
        const owned = gameState.inventoryItems[itemKey] || 0;
        const equippedByOthers = gameState.pcBox.filter(p => p.uid !== pokemonUid && p.heldItem === itemKey).length;
        const available = owned - equippedByOthers;
        if (available <= 0) {
            const iname = (HOLD_ITEMS_DB[itemKey] && HOLD_ITEMS_DB[itemKey].name) ? HOLD_ITEMS_DB[itemKey].name : itemKey.replace(/_/g,' ');
            showNotification('Item Unavailable', `All owned ${iname}s are already held by other Pokémon. Unequip one first!`, 'error');
            renderPCBox(); // reset dropdown visual
            return;
        }
    }

    pokemon.heldItem = itemKey || null;
    saveProgress();
    renderPCBox();
    renderPokedex();
    showNotification('Hold Item Updated', `Updated ${pokemon.name}'s hold item.`, 'success');
};

window.changePokemonMove = function(pokemonUid, slotIndex, moveName) {
    initAudio();
    playConfirmSound();
    const pokemon = gameState.pcBox.find(p => p.uid === pokemonUid);
    if (!pokemon) return;
    const nextMoves = [...(pokemon.moves || [])];
    while (nextMoves.length < 4) nextMoves.push('tackle');
    nextMoves[slotIndex] = moveName || nextMoves[slotIndex] || 'tackle';
    pokemon.moves = nextMoves.slice(0, 4);
    saveProgress();
    renderPCBox();
    showNotification('Moves Updated', `${pokemon.name} now has a new move setup.`, 'success');
};

window.usePcConsumable = async function(pokemonUid, itemKey) {
    initAudio();
    const pokemon = gameState.pcBox.find(p => p.uid === pokemonUid);
    const item = itemKey ? HOLD_ITEMS_DB[itemKey] : null;
    if (!pokemon || !item) return;

    const owned = gameState.inventoryItems[itemKey] || 0;
    if (owned <= 0) {
        showNotification('No Item', `You do not own ${item.name}.`, 'error');
        return;
    }

    if (item.effect === 'evolution') {
        const targetId = getStoneEvolutionTarget(itemKey, pokemon);
        if (!targetId) {
            showNotification('No Evolution', `${pokemon.name} cannot evolve with ${item.name}.`, 'info');
            return;
        }

        const evolvedData = await fetchPokemonData(targetId);
        pokemon.id = evolvedData.id;
        pokemon.name = evolvedData.name;
        pokemon.type1 = evolvedData.type1;
        pokemon.type2 = evolvedData.type2;
        pokemon.sprite = pixelSprite(evolvedData.id, !!pokemon.isShiny);
        pokemon.hp = evolvedData.hp;
        pokemon.atk = evolvedData.atk;
        pokemon.def = evolvedData.def;
        pokemon.spAtk = evolvedData.spAtk || evolvedData.atk;
        pokemon.spDef = evolvedData.spDef || evolvedData.def;
        pokemon.speed = evolvedData.speed || 60;
        pokemon.moves = pokemon.moves && pokemon.moves.length ? pokemon.moves : (evolvedData.moves || []);
        pokemon.evoStoneUsed = true;
        // Teach moves appropriate to evolved form at current level
        applyLevelUpMoves(pokemon, { evolved: true });
        gameState.inventoryItems[itemKey] = owned - 1;
        showNotification('Evolved', `${pokemon.name} evolved with ${item.name}.`, 'success');
    } else if (item.effect === 'teach_move' && item.move) {
        // TM teaching — check for duplicates
        const moveName = item.move;
        if (!getMove(moveName)) {
            showNotification('Cannot Teach', `Move data not found for ${moveName}.`, 'error');
            return;
        }
        if (pokemon.moves && pokemon.moves.includes(moveName)) {
            showNotification('Already Known', `${pokemon.name} already knows ${moveName.replace(/-/g,' ')}.`, 'info');
            return;
        }
        gameState.inventoryItems[itemKey] = owned - 1;
        if (!pokemon.moves) pokemon.moves = [];
        if (pokemon.moves.length >= 4) {
            pokemon.moves[3] = moveName; // Replace last move if full
            showNotification('Move Taught', `${pokemon.name} replaced its last move with ${moveName.replace(/-/g,' ')}.`, 'success');
        } else {
            pokemon.moves.push(moveName);
            showNotification('Move Taught', `${pokemon.name} learned ${moveName.replace(/-/g,' ')}!`, 'success');
        }
    } else if (BATTLE_BAG_ITEMS.includes(itemKey)) {
        // Medicine and battle items are used from the BAG during a battle
        showNotification('Battle Item', `${item.name} can be used during battle from the BAG menu.`, 'info');
        return;
    } else {
        gameState.inventoryItems[itemKey] = owned - 1;
        if (item.effect === 'heal_hp') {
            pokemon.hpBonus = (pokemon.hpBonus || 0) + (item.value || 20);
            showNotification('Consumed', `${pokemon.name} healed with ${item.name}.`, 'success');
        } else if (item.effect === 'full_restore') {
            pokemon.hpBonus = Math.max(pokemon.hpBonus || 0, 60);
            showNotification('Consumed', `${pokemon.name} was fully restored with ${item.name}.`, 'success');
        } else {
            showNotification('Consumed', `${item.name} was used on ${pokemon.name}.`, 'success');
        }
    }

    saveProgress();
    renderPCBox();
    renderPokedex();
    renderHeldItemsShop();
};
