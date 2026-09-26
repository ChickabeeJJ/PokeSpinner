// PokeSpinner — Settings sheet, display modes and accent themes.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// SETTINGS MODAL FUNCTIONS
// ==========================================
window.openHelpModal = function() { initAudio(); playConfirmSound(); const m = document.getElementById('helpModal'); m.classList.remove('hidden'); m.classList.add('flex'); };
window.closeHelpModal = function() { const m = document.getElementById('helpModal'); m.classList.add('hidden'); m.classList.remove('flex'); };

function openSettingsModal() {
    initAudio();
    playConfirmSound();
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    updateSettingsUI();
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function updateSettingsUI() {
    // Sound label
    const settingsSoundText = document.getElementById('settingsSoundText');
    if (settingsSoundText) settingsSoundText.textContent = audioMuted ? t('settings.soundOff') : t('settings.soundOn');

    // Display mode label (3-way: Dark / Light / Grey)
    const darkText = document.getElementById('darkModeSettingsText');
    const darkIcon = document.getElementById('darkModeIconSettings');
    if (isGreyMode) {
        if (darkText) darkText.textContent = 'Grey Scale';
        if (darkIcon) darkIcon.className = 'fas fa-circle-half-stroke text-slate-400';
    } else if (isLightMode) {
        if (darkText) darkText.textContent = t('settings.lightMode');
        if (darkIcon) darkIcon.className = 'fas fa-sun text-yellow-400';
    } else {
        if (darkText) darkText.textContent = t('settings.darkMode') || 'Dark Mode';
        if (darkIcon) darkIcon.className = 'fas fa-moon text-purple-400';
    }

    const mode = isGreyMode ? 'grey' : isLightMode ? 'light' : 'dark';
    document.querySelectorAll('.set-seg-btn').forEach(btn => {
        const on = btn.dataset.mode === mode;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-checked', String(on));
    });
    const soundSw = document.getElementById('settingsSoundBtn');
    if (soundSw) soundSw.setAttribute('aria-checked', String(!audioMuted));
    const motionSw = document.getElementById('settingsMotionBtn');
    if (motionSw) motionSw.setAttribute('aria-checked', String(document.body.classList.contains('reduce-motion')));
    const line = document.getElementById('settingsTrainerLine');
    if (line) {
        const badges = (gameState.gymBadges || []).length;
        line.textContent = `${(gameState.username || '').trim() || 'Trainer'} · ${new Set((gameState.pokedex || []).map(p => p.id)).size} caught · ${badges} badge${badges === 1 ? '' : 's'}`;
    }

    // Theme cards — toggle CSS class (is-active) which drives ring + checkmark via CSS
    document.querySelectorAll('.theme-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-theme') === currentTheme;
        btn.classList.toggle('is-active', isActive);
    });

    // Active theme label chip — text only; colours come from CSS variables
    const labels = { default:'Rose', ocean:'Ocean', forest:'Forest', sunset:'Sunset', electric:'Electric', midnight:'Midnight', dragon:'Dragon', steel:'Steel' };
    const labelEl = document.getElementById('activeThemeLabel');
    if (labelEl) labelEl.textContent = labels[currentTheme] || 'Rose';

    // Sync profile button
    updateProfileBtn();
    // Sync language buttons
    if (typeof applyTranslations === 'function') applyTranslations();
}

let currentTheme = 'default';
let isLightMode = false;
let isGreyMode = false;

function applyLightDarkMode(light) {
    const body = document.body;
    if (light) {
        body.classList.add('light-mode');
        body.classList.remove('grey-mode');
        isGreyMode = false;
    } else {
        body.classList.remove('light-mode');
    }
    // Let updateSettingsUI keep the button labels in sync
    updateSettingsUI();
}

function applyGreyMode(grey) {
    const body = document.body;
    if (grey) {
        body.classList.add('grey-mode');
        body.classList.remove('light-mode');
        isLightMode = false;
    } else {
        body.classList.remove('grey-mode');
    }
    updateSettingsUI();
}

// 3-way display cycle: Dark → Light → Grey → Dark
window.toggleDisplayMode = function() {
    if (!isLightMode && !isGreyMode) {
        // Dark → Light
        isLightMode = true; isGreyMode = false;
        document.body.classList.add('light-mode');
        document.body.classList.remove('grey-mode');
    } else if (isLightMode) {
        // Light → Grey
        isLightMode = false; isGreyMode = true;
        document.body.classList.add('grey-mode');
        document.body.classList.remove('light-mode');
    } else {
        // Grey → Dark
        isLightMode = false; isGreyMode = false;
        document.body.classList.remove('light-mode', 'grey-mode');
    }
    localStorage.setItem('pokemon_radar_lightmode', isLightMode ? '1' : '0');
    localStorage.setItem('pokemon_radar_greymode', isGreyMode ? '1' : '0');
    updateSettingsUI();
};

// Direct pick from the settings segmented control
window.setDisplayMode = function(mode) {
    isLightMode = mode === 'light';
    isGreyMode = mode === 'grey';
    document.body.classList.toggle('light-mode', isLightMode);
    document.body.classList.toggle('grey-mode', isGreyMode);
    localStorage.setItem('pokemon_radar_lightmode', isLightMode ? '1' : '0');
    localStorage.setItem('pokemon_radar_greymode', isGreyMode ? '1' : '0');
    playConfirmSound();
    updateSettingsUI();
};

window.toggleReduceMotion = function(force) {
    const on = typeof force === 'boolean' ? force : !document.body.classList.contains('reduce-motion');
    document.body.classList.toggle('reduce-motion', on);
    try { localStorage.setItem('ps_reduce_motion', on ? '1' : '0'); } catch (e) {}
    updateSettingsUI();
};

// Keep legacy aliases in case any other code calls them
window.toggleDarkLight = window.toggleDisplayMode;
window.toggleGreyMode = window.toggleDisplayMode;

const THEMES = {
    default:  { primary:'from-rose-500 via-pink-500 to-amber-400',    accent:'rose',    glow:'rgba(244,63,94,0.65)'   },
    ocean:    { primary:'from-cyan-500 via-blue-500 to-indigo-500',    accent:'cyan',    glow:'rgba(6,182,212,0.65)'   },
    forest:   { primary:'from-emerald-500 via-green-500 to-teal-500',  accent:'emerald', glow:'rgba(16,185,129,0.65)'  },
    sunset:   { primary:'from-orange-500 via-amber-500 to-red-500',    accent:'orange',  glow:'rgba(249,115,22,0.65)'  },
    electric: { primary:'from-yellow-400 via-amber-400 to-orange-400', accent:'yellow',  glow:'rgba(234,179,8,0.65)'   },
    midnight: { primary:'from-indigo-500 via-violet-500 to-blue-500',  accent:'indigo',  glow:'rgba(99,102,241,0.65)'  },
    dragon:   { primary:'from-violet-600 via-purple-500 to-pink-500',  accent:'violet',  glow:'rgba(124,58,237,0.65)'  },
    steel:    { primary:'from-slate-500 via-slate-400 to-sky-400',     accent:'slate',   glow:'rgba(148,163,184,0.65)' }
};

function setTheme(themeName, silent = false) {
    if (!THEMES[themeName]) return;

    currentTheme = themeName;

    // Drive all themed elements via CSS variables on body
    document.body.setAttribute('data-theme', themeName);

    // Update card states and label chip
    updateSettingsUI();

    // Persist
    localStorage.setItem('pokemon_radar_theme', themeName);

    if (!silent) {
        const labels = { default:'Rose', ocean:'Ocean', forest:'Forest', sunset:'Sunset', electric:'Electric', midnight:'Midnight', dragon:'Dragon', steel:'Steel' };
        showNotification('Theme Changed', `Applied ${labels[themeName] || themeName} theme`, 'success');
    }
}

function clearAllData() {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone!')) {
        return;
    }
    
    try {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem('pokemon_radar_theme');
        
        // Reset game state to default
        gameState = {
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
        
        // Reset theme to default
        currentTheme = 'default';
        setTheme('default', true);
        
        if (typeof stopAutoBattler === 'function') stopAutoBattler();
        updateUI();
        renderRoadmap();
        renderPCBox();
        renderPokedex();
        renderHeldItemsShop();
        renderTMShop();
        updateAutoBattlerUI();
        updateShinyCharmUI();
        
        closeSettingsModal();
        showNotification('Data Cleared', 'All progress has been reset', 'success');
    } catch (e) {
        console.error('Clear data failed:', e);
        showNotification('Clear Failed', 'Failed to clear data: ' + e.message, 'error');
    }
}

window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.setTheme = setTheme;
window.clearAllData = clearAllData;
