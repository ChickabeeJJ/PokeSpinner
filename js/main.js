// PokeSpinner — Boot: load save, restore preferences, first render.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// BOOTSTRAP INIT
// ==========================================
window.onload = function() {
    // Restore language from localStorage before anything renders
    const _savedLangOnLoad = localStorage.getItem('pokemon_radar_lang');
    if (_savedLangOnLoad && typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[_savedLangOnLoad]) {
        _currentLang = _savedLangOnLoad;
    }
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingBar = document.getElementById('loadingBar');
    const loadingText = document.getElementById('loadingText');
    
    const loadingSteps = [
        { progress: 20, text: 'Initializing quantum radar...' },
        { progress: 40, text: 'Calibrating frequency sensors...' },
        { progress: 60, text: 'Loading Pokémon database...' },
        { progress: 80, text: 'Testing encryption systems...' },
        { progress: 100, text: 'System ready!' }
    ];
    
    let currentStep = 0;
    
    const loadingInterval = setInterval(() => {
        if (currentStep < loadingSteps.length) {
            const step = loadingSteps[currentStep];
            loadingBar.style.width = step.progress + '%';
            loadingText.textContent = step.text;
            currentStep++;
        } else {
            clearInterval(loadingInterval);
            
            // Final initialization
            setTimeout(() => {
                // Test CryptoJS
                const cryptoTest = testCryptoJS();
                if (!cryptoTest) {
                    console.error('WARNING: CryptoJS encryption may not work properly');
                }
                
                // Load saved light/dark mode preference
                const savedLightMode = localStorage.getItem('pokemon_radar_lightmode');
                if (savedLightMode === '1') { isLightMode = true; applyLightDarkMode(true); }
                const savedGreyMode = localStorage.getItem('pokemon_radar_greymode');
                if (savedGreyMode === '1') { isGreyMode = true; applyGreyMode(true); }
                try {
                    if (localStorage.getItem('ps_muted') === '1' && !audioMuted) window.toggleMute();
                    const rm = localStorage.getItem('ps_reduce_motion');
                    if (rm === '1' || (rm === null && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) toggleReduceMotion(true);
                } catch (e) {}

                // Load saved theme (silent — no toast on page load)
                const savedTheme = localStorage.getItem('pokemon_radar_theme');
                if (savedTheme && THEMES[savedTheme]) {
                    setTheme(savedTheme, true);
                }

                loadSavedProgress();
                // Fetch official learnsets in the background and fix old movesets
                syncOwnedMovesets();
                // Show starter selection only for a truly new game.
                // starterSelected covers normal flow; pcBox.length covers
                // older saves that may not have the flag set yet.
                const hasExistingData = gameState.starterSelected ||
                    (gameState.pcBox && gameState.pcBox.length > 0);
                if (!hasExistingData) {
                    setTimeout(() => showStarterSelectionScreen(), 900);
                }
                updateProfileBtn();
                buildWheelSectors();
                drawWheel();
                updateUI();
                updateTargetRarityObjective();
                renderRoadmap();
                renderHeldItemsShop();
                updateAutoBattlerUI();
                  updateShinyCharmUI();
                  renderTMShop();
                
                // Hide loading screen with fade out
                loadingScreen.style.transition = 'opacity 0.5s ease-out';
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 500);
        }
    }, 400);
};

// Save on page unload/close (belt-and-suspenders)
window.addEventListener('beforeunload', function() { saveProgress(); });

// Expose light mode control
window.toggleDarkLight = window.toggleDarkLight;
window.applyLightDarkMode = applyLightDarkMode;

// ── Offline play + install as an app ─────────────────────────────
// The service worker caches the game, sprites and PokéAPI data (see sw.js).
// It only runs over http(s), not when index.html is opened from disk.
let deferredInstallPrompt = null;
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function refreshInstallButton() {
    const btn = document.getElementById('settingsInstallBtn');
    const hint = document.getElementById('settingsInstallHint');
    if (!btn) return;
    const canPrompt = !!deferredInstallPrompt;
    const iosManual = isIOS() && !isStandalone();
    btn.classList.toggle('hidden', isStandalone() || !(canPrompt || iosManual));
    if (hint) hint.textContent = canPrompt ? 'Play full-screen and offline' : 'Tap Share, then "Add to Home Screen"';
}

window.installApp = async function() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice.catch(() => null);
        deferredInstallPrompt = null;
        if (choice && choice.outcome === 'accepted') showNotification('Installed!', 'Pokémon Spinner is on your home screen.', 'success');
        refreshInstallButton();
    } else if (isIOS()) {
        showNotification('Add to Home Screen', 'In Safari, tap the Share button, then "Add to Home Screen".', 'info');
    }
};

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    refreshInstallButton();
});
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; refreshInstallButton(); });

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    // Registered straight away: the page's load event can be held up by ads
    {
        const firstInstall = !navigator.serviceWorker.controller;
        navigator.serviceWorker.register('sw.js').then(reg => {
            if (!firstInstall) return;
            const worker = reg.installing || reg.waiting;
            if (worker) worker.addEventListener('statechange', () => {
                if (worker.state === 'activated') showNotification('Ready offline', 'The game will now load even without a connection.', 'success');
            });
        }).catch(() => {});
    }
}
refreshInstallButton();
