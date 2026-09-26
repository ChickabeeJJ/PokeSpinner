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
