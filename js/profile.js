// PokeSpinner — Trainer profile, username and badge case.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// PROFILE + USERNAME FUNCTIONS
// ==========================================
function saveUsername(value) {
    gameState.username = (value || '').trim().substring(0, 16);
    updateProfileBtn();
    saveProgress();
}

// Expose so oninput="saveUsernameFromProfile(...)" can reach it from HTML attribute scope
window.saveUsernameFromProfile = function saveUsernameFromProfile(value) {
    gameState.username = (value || '').trim().substring(0, 16);
    // Dedicated localStorage for fast load (no full parse needed)
    try { localStorage.setItem('pokemon_spinner_trainer_name', gameState.username); } catch(e) {}
    // Update the name/avatar live in the modal
    const nameEl   = document.getElementById('profileNameDisplay');
    const avatarEl = document.getElementById('profileAvatarModal');
    const display  = gameState.username || 'Trainer';
    if (nameEl)   nameEl.textContent   = display;
    if (avatarEl) avatarEl.textContent  = display.substring(0,1).toUpperCase() || '?';
    updateProfileBtn();
    // Also update header trainer name chip if visible
    const headerName = document.getElementById('headerTrainerName');
    if (headerName) headerName.textContent = gameState.username || '';
    saveProgress();
}

function updateProfileBtn() {
    // Merge saved name from dedicated key if gameState hasn't loaded yet
    if (!gameState.username) {
        const saved = localStorage.getItem('pokemon_spinner_trainer_name');
        if (saved) gameState.username = saved;
    }
    // Trainer name + initial in the header profile chip
    const shownName = (gameState.username && gameState.username.trim()) || 'Trainer';
    const nameEl = document.getElementById('headerTrainerName');
    if (nameEl) nameEl.textContent = shownName;
    const avatarEl = document.getElementById('headerAvatar');
    if (avatarEl) avatarEl.textContent = shownName.charAt(0).toUpperCase();
    // Sync profile input if modal is open
    const pInput = document.getElementById('profileUsernameInput');
    if (pInput && pInput.value !== (gameState.username||'')) pInput.value = gameState.username || '';
}

window.openProfileModal = function openProfileModal() {
    initAudio();
    playConfirmSound();
    // Populate name
    const nameDis  = document.getElementById('profileNameDisplay');
    const avatarDis = document.getElementById('profileAvatarModal');
    const pInput   = document.getElementById('profileUsernameInput');
    const name = gameState.username || localStorage.getItem('pokemon_spinner_trainer_name') || 'Trainer';
    if (nameDis)   nameDis.textContent   = name;
    if (avatarDis) avatarDis.textContent  = name.substring(0, 1).toUpperCase() || '?';
    if (pInput)    pInput.value           = gameState.username || '';

    // Stats
    const gymStages = CAMPAIGN_ROADMAP.filter(s => s.isGym);
    const earnedCount = gymStages.filter(s => gameState.gymBadges.includes(s.stageId)).length;
    const statBadges = document.getElementById('profileStatBadges');
    const statPoke   = document.getElementById('profileStatPokemon');
    const statLvl    = document.getElementById('profileStatLevel');
    if (statBadges) statBadges.textContent = earnedCount;
    if (statPoke)   statPoke.textContent   = gameState.pcBox ? gameState.pcBox.length : 0;
    if (statLvl)    statLvl.textContent    = gameState.level || 1;

    // Badge case — per generation with arrows (show all regions 1-9)
    const REGION_NAMES_P = ['','Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'];
    const ALL_REGIONS = [1,2,3,4,5,6,7,8,9];
    // clamp profileGenIndex to all regions
    if (!gameState.profileGenIndex || gameState.profileGenIndex < 0) gameState.profileGenIndex = 0;
    if (gameState.profileGenIndex >= ALL_REGIONS.length) gameState.profileGenIndex = ALL_REGIONS.length - 1;
    const currentRegionId = ALL_REGIONS[gameState.profileGenIndex];
    const regionGyms = gymStages.filter(s => s.regionId === currentRegionId);
    const earnedInRegion = regionGyms.filter(s => gameState.gymBadges.includes(s.stageId)).length;

    const badgeCase = document.getElementById('profileBadgeCase');
    if (badgeCase) {
        const prevOk = gameState.profileGenIndex > 0;
        const nextOk = gameState.profileGenIndex < ALL_REGIONS.length - 1;
        badgeCase.innerHTML = `
            <div class="w-full flex items-center justify-between mb-3">
                <button onclick="window.profileRegionNav(-1)" class="text-slate-400 hover:text-white px-3 py-1 rounded-lg border border-slate-800 text-[11px] disabled:opacity-30 transition" ${prevOk?'':'disabled'}>◀ Prev</button>
                <div class="text-center">
                    <div class="text-xs font-black text-white uppercase tracking-widest">${REGION_NAMES_P[currentRegionId]}</div>
                    <div class="text-[9px] text-slate-500">Gen ${currentRegionId} · ${earnedInRegion}/${regionGyms.length} badges</div>
                </div>
                <button onclick="window.profileRegionNav(1)" class="text-slate-400 hover:text-white px-3 py-1 rounded-lg border border-slate-800 text-[11px] disabled:opacity-30 transition" ${nextOk?'':'disabled'}>Next ▶</button>
            </div>
            <div id="profileBadgeGrid" class="grid grid-cols-4 gap-4 w-full"></div>
        `;
        const grid = document.getElementById('profileBadgeGrid');
        regionGyms.forEach(stage => {
            const earned = gameState.gymBadges.includes(stage.stageId);
            const div = document.createElement('div');
            div.className = 'flex flex-col items-center gap-1 ' + (earned ? 'badge-earned' : 'badge-locked');
            div.innerHTML = `
                <div class="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2 ${earned ? 'border-yellow-400/70' : 'border-slate-700'}" style="background:${earned ? 'rgba(234,179,8,0.18)' : 'rgba(255,255,255,0.03)'}">
                    ${stage.badgeEmoji}
                </div>
                <span class="text-[9px] font-bold text-center leading-tight ${earned ? 'text-yellow-300' : 'text-slate-600'} uppercase tracking-wide max-w-[56px] truncate">${stage.badgeName.replace(/ Badge| Z$/,'')}</span>
            `;
            if (grid) grid.appendChild(div);
        });
        if (regionGyms.length === 0) {
            if (grid) grid.innerHTML = '<div class="col-span-4 text-[10px] text-slate-500 text-center py-4">No gym badges in this region yet.</div>';
        }
    }

    const modal = document.getElementById('profileModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

window.profileRegionNav = function(dir) {
    const ALL_REGIONS = [1,2,3,4,5,6,7,8,9];
    gameState.profileGenIndex = Math.max(0, Math.min(ALL_REGIONS.length - 1, (gameState.profileGenIndex||0) + dir));
    window.openProfileModal();
};

window.closeProfileModal = function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}
