// PokeSpinner — Adventure map: regions, stage nodes and stage preview.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// MODULE 6: BATTLE ENGINE & CAMPAIGN
// ==========================================
window.toggleJourneySubMode = function() { renderRoadmap(); };

window.startUnlimitedMatch = function() {
    initAudio();
    const teamFighters = getBattleFighterPool(true);
    if (teamFighters.length === 0) { showNotification("No Team!", "Add at least one Pokémon to your Team in the PC Box before battling.", "error"); return; }
    playConfirmSound();
    gameState.activeBattleStage = null;
    gameState.endlessRunDefeats = 0;
    document.getElementById('battleSelector').classList.add('hidden');
    // Auto-use team lead — no manual selection, no coin cost
    selectFighterAndBegin(teamFighters[0]);
};

// ==========================================
// ADVENTURE MAP — each region is a winding route of trainer nodes
// ==========================================
const REGION_INFO = [null,
    { name: 'Kanto', color: '#ef4444' }, { name: 'Johto', color: '#f59e0b' }, { name: 'Hoenn', color: '#10b981' },
    { name: 'Sinnoh', color: '#6366f1' }, { name: 'Unova', color: '#64748b' }, { name: 'Kalos', color: '#3b82f6' },
    { name: 'Alola', color: '#f97316' }, { name: 'Galar', color: '#a855f7' }, { name: 'Paldea', color: '#e11d48' }];

function stageKind(stage) {
    if (stage.isChampion) return { key: 'champ', label: 'Champion' };
    if (stage.isElite4) return { key: 'e4', label: 'Elite Four' };
    if (stage.isGym) return { key: 'gym', label: 'Gym Leader' };
    if (stage.isLegendTrainer) return { key: 'legend', label: 'Legendary Trainer' };
    if (stage.isVillain) return { key: 'villain', label: 'Villain' };
    if (stage.isRival) return { key: 'rival', label: 'Rival' };
    return { key: 'trainer', label: 'Trainer' };
}
function stageState(stage) {
    if (stage.stageId < gameState.unlockedStages) return 'cleared';
    if (stage.stageId === gameState.unlockedStages) return 'current';
    return 'locked';
}
function currentRegionId() {
    const cur = CAMPAIGN_ROADMAP.find(st => st.stageId === gameState.unlockedStages);
    return cur ? cur.regionId : Math.max(...(gameState.unlockedRegions || [1]));
}

function renderRoadmap() {
    const map = document.getElementById('advMap');
    const tabs = document.getElementById('advRegionTabs');
    const info = document.getElementById('advRegionInfo');
    if (!map || !tabs) return;
    const unlocked = gameState.unlockedRegions || [1];
    if (!gameState.advRegion || !unlocked.includes(gameState.advRegion)) gameState.advRegion = currentRegionId();
    const region = gameState.advRegion;

    tabs.innerHTML = REGION_INFO.slice(1).map((r, i) => {
        const id = i + 1, open = unlocked.includes(id);
        return `<button type="button" class="g-tab${id === region ? ' is-active' : ''}${open ? '' : ' is-locked'}" ${open ? `onclick="selectAdvRegion(${id})"` : 'disabled title="Beat the previous Champion to unlock"'}>${open ? '' : '🔒 '}${r.name}</button>`;
    }).join('');

    const stages = CAMPAIGN_ROADMAP.filter(st => st.regionId === region).sort((x, y) => x.stageId - y.stageId);
    const cleared = stages.filter(st => stageState(st) === 'cleared').length;
    const gyms = stages.filter(st => st.isGym);
    const pct = Math.round((cleared / Math.max(1, stages.length)) * 100);
    info.innerHTML = `
        <div class="adv-info-row">
            <div class="adv-info-title">${REGION_INFO[region].name} <span class="g-chip dark">${cleared}/${stages.length} cleared</span></div>
            <div class="adv-progress"><span style="width:${pct}%"></span></div>
        </div>
        <div class="adv-badges" title="Badge case">${gyms.map(g => {
            const has = (gameState.gymBadges || []).includes(g.stageId);
            return `<span class="adv-badge${has ? ' is-earned' : ''}" style="--bc:${g.badgeColor || '#facc15'}" title="${g.badgeName || 'Badge'}${has ? '' : ' (not earned)'}">${g.badgeEmoji || '🏅'}</span>`;
        }).join('')}</div>`;

    // Snake layout: rows alternate direction so the route winds down the page
    const width = map.clientWidth || 900;
    const cols = width < 520 ? 3 : width < 820 ? 4 : 5;
    let html = '';
    for (let r = 0; r * cols < stages.length; r++) {
        const row = stages.slice(r * cols, r * cols + cols);
        const cells = row.map(st => advNodeHtml(st));
        while (cells.length < cols) cells.push('<div class="adv-cell"></div>');
        if (r % 2 === 1) cells.reverse();
        html += `<div class="adv-row" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${cells.join('')}</div>`;
    }
    map.innerHTML = `<svg class="adv-path" aria-hidden="true"></svg>${html}`;
    requestAnimationFrame(drawAdvPath);
}

function advNodeHtml(st) {
    const state = stageState(st);
    const kind = stageKind(st);
    const team = getStageTeam(st);
    const ace = team[team.length - 1];
    const mark = state === 'cleared' ? '<span class="adv-mark ok">✓</span>' : state === 'current' ? '<span class="adv-mark next">NEXT!</span>' : '<span class="adv-mark lock">🔒</span>';
    return `<div class="adv-cell"><button type="button" class="adv-node is-${state} kind-${kind.key}" data-stage="${st.stageId}" onclick="openStagePreview(${st.stageId})" title="${st.trainer} — ${st.name}">
        <span class="adv-disc"><img src="${pixelSprite(ace)}" alt="" loading="lazy">${st.isGym && st.badgeEmoji ? `<span class="adv-gym-badge">${st.badgeEmoji}</span>` : ''}</span>
        ${mark}
        <span class="adv-name">${st.trainer.replace(/^(Gym Leader|Elite Four|Rival|Captain|Kahuna|Champion Cup|Semi-Final) /, '')}</span>
        <span class="adv-place">${st.name} · Lv ${st.level}</span>
    </button></div>`;
}

// Connect the nodes in progression order with a thick route line
function drawAdvPath() {
    const map = document.getElementById('advMap');
    const svg = map && map.querySelector('.adv-path');
    if (!svg || !map.clientWidth) return;
    const mr = map.getBoundingClientRect();
    const nodes = [...map.querySelectorAll('.adv-node')]
        .map(n => ({ n, id: parseFloat(n.dataset.stage) }))
        .sort((x, y) => x.id - y.id)
        .map(({ n, id }) => { const d = n.querySelector('.adv-disc').getBoundingClientRect(); return { x: d.left - mr.left + d.width / 2, y: d.top - mr.top + d.height / 2, cleared: id < gameState.unlockedStages }; });
    if (nodes.length < 2) { svg.innerHTML = ''; return; }
    svg.setAttribute('viewBox', `0 0 ${map.clientWidth} ${map.scrollHeight}`);
    svg.style.height = map.scrollHeight + 'px';
    const seg = (a, b) => Math.abs(a.y - b.y) < 4 ? `M${a.x},${a.y} L${b.x},${b.y}` : `M${a.x},${a.y} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y}`;
    let under = '', over = '';
    for (let i = 0; i < nodes.length - 1; i++) {
        const d = seg(nodes[i], nodes[i + 1]);
        under += `<path d="${d}" class="adv-road-ink"/>`;
        over += `<path d="${d}" class="adv-road${nodes[i].cleared ? ' is-done' : ''}"/>`;
    }
    svg.innerHTML = under + over;
}
let _advResizeT = null;
window.addEventListener('resize', () => { clearTimeout(_advResizeT); _advResizeT = setTimeout(() => { const v = document.getElementById('view-battle'); if (v && !v.classList.contains('hidden')) renderRoadmap(); }, 150); });

window.selectAdvRegion = function(id) { playBeep(); gameState.advRegion = id; renderRoadmap(); };

window.openStagePreview = function(stageId) {
    initAudio(); playConfirmSound();
    const st = CAMPAIGN_ROADMAP.find(x => x.stageId === stageId);
    if (!st) return;
    const state = stageState(st), kind = stageKind(st);
    const team = getStageTeam(st);
    const levels = team.map((_, i) => Math.max(2, st.level - (team.length - 1 - i) * 2));
    const body = document.getElementById('stagePreviewBody');
    const hasBadge = st.isGym && (gameState.gymBadges || []).includes(st.stageId);
    body.innerHTML = `
        <div class="g-modal-head">
            <div class="flex items-center gap-2 min-w-0"><span class="adv-prev-icon">${st.icon || '⚔️'}</span>
                <div class="min-w-0"><h3 class="truncate">${st.trainer}</h3><div class="g-sub">${st.name} · ${REGION_INFO[st.regionId].name}</div></div></div>
            <button type="button" class="square-btn sm" onclick="closeStagePreview()" aria-label="Close">✕</button>
        </div>
        <div class="flex flex-wrap gap-1.5 mb-3">
            <span class="g-chip kind-chip kind-${kind.key}">${kind.label}</span>
            <span class="g-chip">Lv ${st.level}</span>
            <span class="g-chip">🪙 ${formatNum(st.reward)}</span>
            ${st.isGym ? `<span class="g-chip">${hasBadge ? '🏅' : '🔒'} ${st.badgeName || 'Badge'}</span>` : ''}
            ${state === 'cleared' ? '<span class="g-chip" style="background:#86efac">✓ Cleared</span>' : ''}
        </div>
        <div class="adv-team">${team.map((id, i) => `<div class="adv-team-mon"><img src="${pixelSprite(id)}" alt=""><span>Lv ${levels[i]}</span></div>`).join('')}</div>
        <p class="g-sub mt-3">${state === 'locked' ? 'Beat the earlier trainers on this route to unlock this battle.' : state === 'cleared' ? 'Rematch any time for coins and EXP.' : st.isGym && st.gymPuzzle ? 'Answer the Gym Leader’s challenge to enter the Gym!' : 'Your next challenge awaits!'}</p>
        <div class="flex gap-2 mt-4">
            <button type="button" class="g-btn green flex-1" ${state === 'locked' ? 'disabled' : ''} onclick="closeStagePreview(); launchStagePrepById(${st.stageId})">⚔️ ${state === 'cleared' ? 'Rematch' : 'Battle!'}</button>
            <button type="button" class="g-btn" onclick="closeStagePreview()">Close</button>
        </div>`;
    const m = document.getElementById('stagePreview');
    m.classList.remove('hidden'); m.classList.add('flex');
};
window.closeStagePreview = function() { const m = document.getElementById('stagePreview'); m.classList.add('hidden'); m.classList.remove('flex'); };
window.launchStagePrepById = function(stageId) {
    const st = CAMPAIGN_ROADMAP.find(x => x.stageId === stageId);
    if (st && stageState(st) !== 'locked') launchStagePrep(st);
};
