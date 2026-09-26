// PokeSpinner — Toasts, HUD refresh, coins and trainer XP.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// MODULE 4: CORE UI & NOTIFICATIONS
// ==========================================
function showNotification(title, msg, type = 'info') {
    const toast = document.getElementById('customToast');
    const tTitle = document.getElementById('toastTitle');
    const tMsg = document.getElementById('toastMessage');
    const tIconContainer = document.getElementById('toastIconContainer');
    const tIcon = document.getElementById('toastIcon');

    tTitle.textContent = title;
    tMsg.textContent = msg;

    if (type === 'success') {
        tIconContainer.className = "p-3 rounded-xl bg-green-500/20 text-green-400";
        tIcon.className = "fas fa-check-circle text-xl";
    } else if (type === 'error') {
        tIconContainer.className = "p-3 rounded-xl bg-red-500/20 text-red-400";
        tIcon.className = "fas fa-times-circle text-xl";
    } else if (type === 'shiny') {
        tIconContainer.className = "p-3 rounded-xl bg-pink-500/20 text-pink-400 animate-pulse";
        tIcon.className = "fas fa-sparkles text-xl";
    } else {
        tIconContainer.className = "p-3 rounded-xl bg-blue-500/20 text-blue-400";
        tIcon.className = "fas fa-info-circle text-xl";
    }

    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, 0px)";
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translate(-50%, -50px)";
    }, 3500);
}

window.switchView = function(viewName) {
    initAudio();
    playConfirmSound();
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.id === `nav-${viewName}`));
    
    document.querySelectorAll('.mobile-nav-btn').forEach(mBtn => {
        const isActive = mBtn.dataset.view === viewName;
        mBtn.classList.toggle('is-active', isActive);
        if (isActive) mBtn.setAttribute('aria-current', 'page'); else mBtn.removeAttribute('aria-current');
    });

    const activePanel = document.getElementById(`view-${viewName}`);
    if (activePanel) activePanel.classList.remove('hidden');
    // Start each tab at the top on small screens
    if (window.innerWidth < 1024 && activePanel && activePanel.getBoundingClientRect().top < 0) window.scrollTo({ top: 0 });
    

    if (viewName === 'pokedex') renderPokedex();
    else if (viewName === 'battle') {
        // Returning to the Journey tab mid-battle resumes the fight instead of abandoning it
        if (!gameState.battle.active && !gameState.battle.starting) resetBattleScreen();
        renderRoadmap();
    }
    else if (viewName === 'shop') { renderHeldItemsShop(); renderTMShop(); updateAutoBattlerUI(); updateShinyCharmUI(); }
    else if (viewName === 'pc') renderPCBox();
    else if (viewName === 'team') renderTeamView();
    else if (viewName === 'roulette' && !animationFrameId) {
        // Make sure the wheel re-draws when coming back
        drawWheel();
    }
};

function formatNum(n) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    const abs = Math.abs(n);
    if (abs >= 1e9)  return (n / 1e9).toFixed(2) + 'b';
    if (abs >= 1e6)  return (n / 1e6).toFixed(2) + 'm';
    if (abs >= 1e3)  return (n / 1e3).toFixed(2) + 'k';
    return String(n);
}

  function updateUI() {
    // Persist on every UI refresh (catches all state mutations)
    saveProgress();
    // Apply i18n translations on every UI update
    if (typeof applyTranslations === 'function') applyTranslations();
    document.getElementById('playerCoins').textContent = formatNum(gameState.coins);
    document.getElementById('trainerLevelBadge').textContent = gameState.level;
    document.getElementById('trainerLevelText').textContent = gameState.level;
    
    const neededXp = gameState.level * 100;
    const xpPercent = Math.min(100, Math.max(5, (gameState.xp / neededXp) * 100));
    document.getElementById('xpBar').style.width = `${xpPercent}%`;

    const list = ['poke', 'great', 'ultra', 'master'];
    list.forEach(type => {
        const qty = gameState.balls[type] || 0;
        document.getElementById(`count-${type}`).textContent = qty;
        document.getElementById(`miniCount-${type}`).textContent = qty;

        const shopIndicator = document.getElementById(`shopCount-${type}`);
        if (shopIndicator) shopIndicator.textContent = qty;

        const btn = document.getElementById(`ballBtn-${type}`);
        if (btn) {
            btn.classList.toggle('is-empty', qty <= 0);
            if (qty <= 0 && gameState.selectedBall === type) gameState.selectedBall = 'poke';
        }
    });

    list.forEach(type => {
        const btn = document.getElementById(`ballBtn-${type}`);
        if (btn) btn.classList.toggle('is-selected', gameState.selectedBall === type);
    });

    const uniqueSpecies = new Set(gameState.pokedex.map(p => p.id)).size;
    document.getElementById('dexProgressBadge').textContent = `${uniqueSpecies}/1025`;
    const pcBadge = document.getElementById('pcCountBadge');
    if (pcBadge) pcBadge.textContent = gameState.pcBox.length;
    const teamBadge = document.getElementById('teamCountBadge');
    if (teamBadge) teamBadge.textContent = `${gameState.team.filter(Boolean).length}/6`;
    const teamBadgeInline = document.getElementById('teamCountBadgeInline');
    if (teamBadgeInline) teamBadgeInline.textContent = `${gameState.team.filter(Boolean).length}/6 ${t('team.selected')}`;
    updateScanningRegionUI();
}

function addCoins(amount) {
    gameState.coins += amount;
    updateUI();
    saveProgress();
}

function spendCoins(amount) {
    if (gameState.coins >= amount) {
        gameState.coins -= amount;
        updateUI();
        saveProgress();
        return true;
    }
    return false;
}

function addXP(amount) {
    gameState.xp += amount;
    let needed = gameState.level * 100;
    if (gameState.xp >= needed) {
        gameState.xp -= needed;
        gameState.level += 1;
        showNotification("Rank Up!", `Trainer level promoted to ${gameState.level}!`, 'success');
        playSuccessCapture();
    }
    updateUI();
    saveProgress();
}
