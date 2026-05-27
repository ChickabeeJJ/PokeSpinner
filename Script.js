/**
 * POKÉMON RADAR: ELITE EDITION
 * Core Application Engine Logic & Interface Interactivity Link
 */

// ==========================================
// 1. GLOBAL CORE ENGINE STATE CONFIGURATIONS
// ==========================================
let gameState = {
    coins: 100,
    xp: 0,
    level: 1,
    unlockedStages: 1,
    balls: { poke: 5, great: 0, ultra: 0, master: 0 },
    inventoryItems: {
        "Choice Band": 0,
        "Leftovers": 0,
        "Life Orb": 0,
        "Eviolite": 0
    },
    pcBox: [],
    pokedex: {} // Dictionary tracking encountered/registered species metrics
};

let selectedBallType = 'poke';
let isMuted = false;
let isSpinning = false;
let currentRotation = 0;
let nextCatchUid = 1;

// Database Registry for Pokemon Generation Channels
let pokemonDatabase = [];
let filteredDexList = [];
let filteredPCList = [];

// Pagination tracking metrics
let currentDexPage = 1;
const dexItemsPerPage = 9;
let currentPCPage = 1;
const pcItemsPerPage = 9;

// Capture timing metrics
let targetPokemonEncountered = null;
let timingRingRadius = 40;
let timingRingActive = false;

// Active Journey Battle Configuration Variables
let activeBattleMode = 'campaign'; // 'campaign' or 'unlimited'
let chosenCampaignStageId = null;
let deployedPartnerUid = null;
let activeBattleData = {
    playerHP: 100,
    playerMaxHP: 100,
    bossHP: 100,
    bossMaxHP: 100,
    bossPokemon: null,
    playerPokemon: null,
    turnOrder: []
};

// Campaign Stages Definition
const campaignStages = [
    { id: 1, name: "Pewter Gym Challenge", boss: "Onix", level: 5, hp: 120, reward: 150, unlockedGen: 1 },
    { id: 2, name: "Cerulean Cascade Match", boss: "Starmie", level: 14, hp: 250, reward: 300, unlockedGen: 2 },
    { id: 3, name: "Vermilion Lightning Arena", boss: "Raichu", level: 24, hp: 450, reward: 600, unlockedGen: 3 },
    { id: 4, name: "Celadon Flora Gauntlet", boss: "Vileplume", level: 35, hp: 800, reward: 1200, unlockedGen: 4 },
    { id: 5, name: "Fuchsia Ninja Challenge", boss: "Weezing", level: 43, hp: 1400, reward: 2000, unlockedGen: 5 }
];

// Available Hold Items inside the Shop Mart Grid
const shopItems = [
    { name: "Poké Ball", type: "ball", ballKey: "poke", cost: 10, desc: "Standard scan device tracking utility." },
    { name: "Great Ball", type: "ball", ballKey: "great", cost: 30, desc: "Enhanced capture capture rate matrix multiplier." },
    { name: "Ultra Ball", type: "ball", ballKey: "ultra", cost: 80, desc: "Advanced performance zone stabilizer." },
    { name: "Master Ball", type: "ball", ballKey: "master", cost: 500, desc: "Guaranteed absolute tracking containment catch." },
    { name: "Choice Band", type: "held_item", cost: 250, desc: "Boosts physical base combat modifiers by 30%." },
    { name: "Leftovers", type: "held_item", cost: 300, desc: "Passively regenerates flat HP bars each combat round." },
    { name: "Life Orb", type: "held_item", cost: 400, desc: "Amplifies damage output at the cost of slight self-recoil." }
];

// Radar Sector Wheel Mapping Colors
const sectorConfig = [
    { type: "Common", color: "#334155", label: "Standard" },
    { type: "Rare", color: "#1d4ed8", label: "Rare Tier" },
    { type: "Epic", color: "#6b21a8", label: "Epic Tier" },
    { type: "Legendary", color: "#854d0e", label: "Legendary" },
    { type: "Coins", color: "#b45309", label: "Bonus Gold" },
    { type: "Whiff", color: "#0f172a", label: "Empty Sign" }
];

// ==========================================
// 2. CORE UTILITY SYSTEMS (TOASTS, AUDIO, DATA)
// ==========================================

function showToast(title, message, iconType = "info") {
    const toast = document.getElementById('customToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMsg = document.getElementById('toastMessage');
    const iconContainer = document.getElementById('toastIconContainer');
    const icon = document.getElementById('toastIcon');

    if (!toast) return;

    toastTitle.innerText = title;
    toastMsg.innerText = message;

    // Toggle styling classes depending on feedback loops
    if (iconType === "success") {
        iconContainer.className = "p-3 rounded-xl bg-emerald-500/20 text-emerald-400";
        icon.className = "fas fa-check-circle text-xl";
    } else if (iconType === "error") {
        iconContainer.className = "p-3 rounded-xl bg-rose-500/20 text-rose-400";
        icon.className = "fas fa-times-circle text-xl";
    } else {
        iconContainer.className = "p-3 rounded-xl bg-blue-500/20 text-blue-400";
        icon.className = "fas fa-info-circle text-xl";
    }

    toast.classList.remove('opacity-0', 'translate-y-[-50px]', 'pointer-events-none');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-50px]', 'pointer-events-none');
    }, 3000);
}

function toggleMute() {
    isMuted = !isMuted;
    const soundIcon = document.getElementById('soundIcon');
    if (soundIcon) {
        soundIcon.className = isMuted ? "fas fa-volume-mute text-lg" : "fas fa-volume-up text-lg";
    }
    showToast("Audio Update", isMuted ? "System notifications muted" : "Audio sound arrays active");
}

function handleGoogleSignIn() {
    showToast("Firebase Cloud Engine", "Cloud profile sync feature initialized successfully.", "info");
}

// Loads PokeAPI baseline profiles cleanly 
async function initPokemonDatabase() {
    const loader = document.getElementById('wildPokemonLoading');
    if (loader) loader.classList.remove('hidden');
    try {
        // Fetching Kanto regional metrics (Gen 1 baseline configuration)
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
        const data = await response.json();
        
        pokemonDatabase = data.results.map((p, idx) => {
            const id = idx + 1;
            // Determine rarity tier splits systematically based on ID numbers
            let rarity = "Common";
            if (id % 15 === 0 || id === 143) rarity = "Epic";
            else if (id % 7 === 0) rarity = "Rare";
            else if ([144, 145, 146, 150, 151].includes(id)) rarity = "Legendary";

            return {
                id: id,
                name: p.name.charAt(0).toUpperCase() + p.name.slice(1),
                rarity: rarity,
                sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
                types: ["Normal"], // Simplified placeholder array
                level: 5
            };
        });
        filteredDexList = [...pokemonDatabase];
    } catch (e) {
        console.error("Database fetch exception:", e);
        showToast("Network Error", "Failed tracking index configurations via PokeAPI.", "error");
    } finally {
        if (loader) loader.classList.add('hidden');
    }
}

// LOCAL STORAGE READ/WRITE CORE CONTROLS
function loadSavedProgress() {
    try {
        const localData = localStorage.getItem('pokemon_radar_save');
        if (localData) {
            const parsed = JSON.parse(localData);
            gameState.pcBox = parsed.pcBox || [];
            gameState.coins = parsed.coins ?? 100;
            gameState.xp = parsed.xp ?? 0;
            gameState.level = parsed.level ?? 1;
            gameState.unlockedStages = parsed.unlockedStages ?? 1;
            gameState.balls = parsed.balls || gameState.balls;
            gameState.inventoryItems = parsed.inventoryItems || gameState.inventoryItems;
            gameState.pokedex = parsed.pokedex || gameState.pokedex;

            if (gameState.pcBox.length > 0) {
                let maxUid = 0;
                gameState.pcBox.forEach(p => {
                    if (p.uid && p.uid > maxUid) maxUid = p.uid;
                });
                nextCatchUid = maxUid + 1;
                gameState.pcBox.forEach(p => {
                    if (!p.uid) p.uid = nextCatchUid++;
                });
            }
        }
    } catch (e) {
        console.warn("Storage profile corrupted. Fallback configurations applied.");
    }
}

function saveProgress() {
    try {
        localStorage.setItem('pokemon_radar_save', JSON.stringify(gameState));
    } catch (e) {
        console.error("Failed saving context matrices:", e);
    }
}

// ==========================================
// 3. UI VIEW PANEL MANAGEMENT & NAVIGATION
// ==========================================

function switchView(viewName) {
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-gradient-to-r', 'from-rose-600', 'to-pink-600', 'text-white', 'shadow-lg', 'shadow-rose-600/10');
        btn.classList.add('bg-slate-955', 'border-slate-900', 'text-slate-400');
    });

    const targetPanel = document.getElementById(`view-${viewName}`);
    if (targetPanel) targetPanel.classList.remove('hidden');

    const targetBtn = document.getElementById(`nav-${viewName}`);
    if (targetBtn) {
        targetBtn.classList.add('active', 'bg-gradient-to-r', 'from-rose-600', 'to-pink-600', 'text-white', 'shadow-lg');
        targetBtn.classList.remove('bg-slate-955', 'border-slate-900', 'text-slate-400');
    }

    // Refresh context view frameworks dynamically
    if (viewName === 'pokedex') renderPokedexGrid();
    if (viewName === 'pc') renderPCGrid();
    if (viewName === 'shop') renderHeldItemsShop();
    if (viewName === 'battle') renderRoadmap();
}

function updateUI() {
    document.getElementById('playerCoins').innerText = gameState.coins;
    document.getElementById('trainerLevelBadge').innerText = gameState.level;
    document.getElementById('trainerLevelText').innerText = gameState.level;

    // Calculate progression bars percentage
    const xpNeeded = gameState.level * 100;
    const pct = Math.min((gameState.xp / xpNeeded) * 100, 100);
    document.getElementById('xpBar').style.width = `${pct}%`;

    // Counters update hooks
    document.getElementById('miniCount-poke').innerText = gameState.balls.poke;
    document.getElementById('miniCount-great').innerText = gameState.balls.great;
    document.getElementById('miniCount-ultra').innerText = gameState.balls.ultra;
    document.getElementById('miniCount-master').innerText = gameState.balls.master;

    if (document.getElementById('count-poke')) {
        document.getElementById('count-poke').innerText = gameState.balls.poke;
        document.getElementById('count-great').innerText = gameState.balls.great;
        document.getElementById('count-ultra').innerText = gameState.balls.ultra;
        document.getElementById('count-master').innerText = gameState.balls.master;
    }

    const registeredCount = Object.keys(gameState.pokedex).length;
    document.getElementById('dexProgressBadge').innerText = `${registeredCount}/${pokemonDatabase.length || 151}`;
    document.getElementById('pcCountBadge').innerText = gameState.pcBox.length;
}

// ==========================================
// 4. RADAR CANVAS SPIN SYSTEM & MINIGAMES
// ==========================================

function buildWheelSectors() {}

function drawWheel() {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2;

    ctx.clearRect(0, 0, width, height);

    const numSectors = sectorConfig.length;
    const arcSize = (2 * Math.PI) / numSectors;

    for (let i = 0; i < numSectors; i++) {
        const angle = i * arcSize;
        ctx.fillStyle = sectorConfig[i].color;
        ctx.beginPath();
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius - 10, angle, angle + arcSize);
        ctx.lineTo(radius, radius);
        ctx.fill();

        // Draw labels text overlays
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(angle + arcSize / 2);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(sectorConfig[i].label, radius - 25, 4);
        ctx.restore();
    }
}

function selectBall(ballType) {
    selectedBallType = ballType;
    document.querySelectorAll('.ball-selector-btn').forEach(btn => {
        btn.classList.remove('border-rose-500', 'border-2');
        btn.classList.add('border-slate-900');
    });
    const activeBtn = document.getElementById(`ballBtn-${ballType}`);
    if (activeBtn) {
        activeBtn.classList.remove('border-slate-900');
        activeBtn.classList.add('border-rose-500', 'border-2');
    }
}

function triggerSpin() {
    if (isSpinning) return;

    if (gameState.balls[selectedBallType] <= 0) {
        showToast("Inventory Empty", "You do not have any devices of this grade remaining.", "error");
        return;
    }

    gameState.balls[selectedBallType]--;
    updateUI();
    saveProgress();

    isSpinning = true;
    document.getElementById('spinBtn').disabled = true;
    const stopBtn = document.getElementById('stopBtn');
    stopBtn.disabled = false;
    stopBtn.classList.remove('cursor-not-allowed', 'text-slate-500');
    stopBtn.classList.add('bg-rose-600', 'text-white');

    document.getElementById('encounterStatus').className = "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-bold inline-block";
    document.getElementById('encounterStatus').innerText = "Scanning Frequencies...";
}

function triggerPrecisionStop() {
    if (!isSpinning) return;
    isSpinning = false;

    document.getElementById('spinBtn').disabled = false;
    const stopBtn = document.getElementById('stopBtn');
    stopBtn.disabled = true;
    stopBtn.className = "flex-1 py-4 px-6 bg-slate-900 text-slate-500 font-black uppercase rounded-2xl cursor-not-allowed transition duration-150 tracking-wider border border-slate-800";

    // Calculate final sector output based on rotation position angles
    const normalizedRotation = (currentRotation % 360);
    const sectorSize = 360 / sectorConfig.length;
    // Pointer matches the top offset axis arrow element
    const winningIndex = Math.floor(((360 - normalizedRotation + 90) % 360) / sectorSize);
    const targetSector = sectorConfig[winningIndex] || sectorConfig[0];

    resolveEncounterRadarHit(targetSector.type);
}

function resolveEncounterRadarHit(sectorType) {
    if (sectorType === "Whiff") {
        document.getElementById('encounterStatus').className = "bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-bold inline-block";
        document.getElementById('encounterStatus').innerText = "Signal Lost";
        document.getElementById('wildPokemonName').innerText = "Nothing Found";
        document.getElementById('wildPokemonDetails').innerText = "Radar lock returned blank feedback. Initialize next array sweep.";
        document.getElementById('wildPokemonGraphic').style.opacity = "0.1";
        return;
    }

    if (sectorType === "Coins") {
        const goldGain = Math.floor(Math.random() * 40) + 20;
        gameState.coins += goldGain;
        updateUI();
        saveProgress();
        document.getElementById('encounterStatus').className = "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-bold inline-block";
        document.getElementById('encounterStatus').innerText = "Data Extracted";
        document.getElementById('wildPokemonName').innerText = `+${goldGain} Gold Coins`;
        document.getElementById('wildPokemonDetails').innerText = "Scanned abandoned terminal logs to withdraw floating database coins.";
        return;
    }

    // Filter potential encounters targeting specified sector types matches
    let pool = pokemonDatabase.filter(p => p.rarity === sectorType);
    if (pool.length === 0) pool = pokemonDatabase; // Fallback filter sanity loop

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    targetPokemonEncountered = chosen;

    // Update Wild Encounter Graphics Panel interface views
    document.getElementById('encounterStatus').className = "bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-bold inline-block";
    document.getElementById('encounterStatus').innerText = `WILD ${sectorType.toUpperCase()} SIGNATURE FOUND`;
    
    const graphic = document.getElementById('wildPokemonGraphic');
    graphic.src = chosen.sprite;
    graphic.style.opacity = "1";

    document.getElementById('wildPokemonName').innerText = chosen.name;
    document.getElementById('wildPokemonDetails').innerText = `Index #${chosen.id} - Rarity Grade: ${chosen.rarity}`;

    // Enable Catch trigger buttons
    const catchBtn = document.getElementById('catchBtn');
    catchBtn.disabled = false;
    catchBtn.className = "w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold uppercase rounded-2xl tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg";
    catchBtn.querySelector('span').innerText = `Capture ${chosen.name}!`;

    // Start tracking ring parameters configuration matrices
    timingRingRadius = 80;
    timingRingActive = true;
    document.getElementById('timingRingContainer').classList.remove('hidden');
}

function triggerCatchMinigame() {
    if (!targetPokemonEncountered || !timingRingActive) return;
    timingRingActive = false;
    document.getElementById('timingRingContainer').classList.add('hidden');

    // Precision calculation checking window parameters configuration bounds
    // Radius values between 30 and 50 are perfect score green zone sweeps
    let catchChanceModifier = 0.5;
    if (timingRingRadius >= 30 && timingRingRadius <= 50) {
        catchChanceModifier = 0.95; // Excellent snapshot bonus catch logic tracking
        showToast("Excellent Aim!", "Catch calculations amplified!", "success");
    } else {
        showToast("Sub-optimal Timing", "Standard algorithm modifier active.", "info");
    }

    // Apply ball grade modifications parameters loops
    if (selectedBallType === 'great') catchChanceModifier += 0.15;
    if (selectedBallType === 'ultra') catchChanceModifier += 0.35;
    if (selectedBallType === 'master') catchChanceModifier = 1.0; // Fail proof overrides

    const roll = Math.random();
    if (roll <= catchChanceModifier) {
        // Success routing
        const newCapture = {
            ...targetPokemonEncountered,
            uid: nextCatchUid++,
            level: Math.floor(Math.random() * 5) + 1,
            xp: 0,
            heldItem: null
        };

        gameState.pcBox.push(newCapture);
        gameState.pokedex[newCapture.id] = true; // Flag entry tracking indexing lists
        gameState.xp += 25;
        gameState.coins += 10;

        // Level Up Checking loop mechanics configuration
        if (gameState.xp >= gameState.level * 100) {
            gameState.xp -= (gameState.level * 100);
            gameState.level++;
            showToast("TRAINER LEVEL UP!", `You have hit Rank Level ${gameState.level}!`, "success");
        }

        showToast("Target Secured!", `${newCapture.name} was saved to your PC Storage box.`, "success");
    } else {
        showToast("Containment Deficit", `${targetPokemonEncountered.name} broke transmission vectors and fled.`, "error");
    }

    // Reset interaction interface metrics completely
    targetPokemonEncountered = null;
    updateUI();
    saveProgress();

    const catchBtn = document.getElementById('catchBtn');
    catchBtn.disabled = true;
    catchBtn.className = "w-full py-4 bg-slate-900 text-slate-500 font-extrabold uppercase rounded-2xl border border-slate-800 tracking-wider flex items-center justify-center gap-2 cursor-not-allowed";
    catchBtn.querySelector('span').innerText = "Awaiting Encounter...";
    document.getElementById('wildPokemonGraphic').style.opacity = "0.2";
}

function updateTargetRarityObjective() {}

// ==========================================
// 5. REGIONAL ROADMAP & JOURNEY SIMULATOR
// ==========================================

function toggleJourneySubMode(mode) {
    activeBattleMode = mode;
    const campaignBtn = document.getElementById('btn-journey-campaign');
    const unlimitedBtn = document.getElementById('btn-journey-unlimited');
    const campaignPanel = document.getElementById('journey-campaign-panel');
    const unlimitedPanel = document.getElementById('journey-unlimited-panel');

    if (mode === 'campaign') {
        campaignBtn.className = "px-5 py-2 rounded-lg text-xs font-bold transition duration-150 bg-rose-600 text-white";
        unlimitedBtn.className = "px-5 py-2 rounded-lg text-xs font-bold transition duration-150 text-slate-400 hover:text-white";
        campaignPanel.classList.remove('hidden');
        unlimitedPanel.classList.add('hidden');
    } else {
        unlimitedBtn.className = "px-5 py-2 rounded-lg text-xs font-bold transition duration-150 bg-rose-600 text-white";
        campaignBtn.className = "px-5 py-2 rounded-lg text-xs font-bold transition duration-150 text-slate-400 hover:text-white";
        unlimitedPanel.classList.remove('hidden');
        campaignPanel.classList.add('hidden');
    }
}

function renderRoadmap() {
    const grid = document.getElementById('roadmapCampaignGrid');
    if (!grid) return;

    grid.innerHTML = campaignStages.map(stage => {
        const isUnlocked = gameState.unlockedStages >= stage.id;
        const btnClass = isUnlocked 
            ? "bg-slate-900 hover:bg-slate-800 text-white border-slate-800" 
            : "bg-slate-950 text-slate-600 border-slate-950 cursor-not-allowed opacity-50";

        return `
            <div class="border p-4 rounded-xl text-center flex flex-col justify-between min-h-[140px] ${btnClass}">
                <div>
                    <h4 class="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 uppercase tracking-wide">${stage.name}</h4>
                    <p class="text-[10px] text-slate-400 mt-1">Boss: ${stage.boss} (LVL ${stage.level})</p>
                </div>
                <button ${isUnlocked ? `onclick="initiateBattlePrep(${stage.id})"` : 'disabled'} class="mt-3 w-full py-1.5 rounded-lg font-black tracking-wide text-[10px] uppercase bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-500 hover:to-pink-500 transition disabled:opacity-40">
                    ${isUnlocked ? "Challenge Boss" : "Locked Chain"}
                </button>
            </div>
        `;
    }).join('');
}

function initiateBattlePrep(stageId) {
    if (gameState.pcBox.length === 0) {
        showToast("Deployment Interrupted", "You have no available Pokémon in your PC Box to deploy.", "error");
        return;
    }
    chosenCampaignStageId = stageId;
    document.getElementById('battleSelector').classList.add('hidden');
    document.getElementById('fighterSelector').classList.remove('hidden');
    renderFighterSelectionGrid();
}

function cancelBattlePrep() {
    document.getElementById('battleSelector').classList.remove('hidden');
    document.getElementById('fighterSelector').classList.add('hidden');
}

function renderFighterSelectionGrid() {
    const grid = document.getElementById('fighterSelectionGrid');
    if (!grid) return;

    grid.innerHTML = gameState.pcBox.map(p => {
        return `
            <div onclick="confirmBattleDeployment(${p.uid})" class="bg-slate-950 border border-slate-900 hover:border-rose-500 p-3 rounded-xl text-center cursor-pointer transition">
                <img src="${p.sprite}" class="w-16 h-16 mx-auto object-contain">
                <h4 class="text-xs font-bold text-white">${p.name}</h4>
                <p class="text-[10px] text-slate-400">LVL ${p.level} ${p.heldItem ? `[${p.heldItem}]` : ''}</p>
            </div>
        `;
    }).join('');
}

function confirmBattleDeployment(uid) {
    deployedPartnerUid = uid;
    document.getElementById('fighterSelector').classList.add('hidden');
    document.getElementById('battleArenaActive').classList.remove('hidden');

    const partner = gameState.pcBox.find(p => p.uid === uid);
    const stage = campaignStages.find(s => s.id === chosenCampaignStageId);

    activeBattleData.playerPokemon = partner;
    activeBattleData.bossPokemon = stage;

    activeBattleData.playerMaxHP = partner.level * 45;
    activeBattleData.playerHP = activeBattleData.playerMaxHP;

    activeBattleData.bossMaxHP = stage.hp;
    activeBattleData.bossHP = activeBattleData.bossMaxHP;

    // Build graphics interface displays data
    document.getElementById('bossSprite').src = `https://img.pokemondb.net/sprites/black-white/anim/normal/${stage.boss.toLowerCase()}.gif`;
    document.getElementById('bossName').innerText = stage.boss;
    document.getElementById('bossLevelBadge').innerText = `LVL ${stage.level}`;
    
    document.getElementById('playerFighterSprite').src = partner.sprite;
    document.getElementById('playerFighterName').innerText = partner.name;
    document.getElementById('playerFighterLevelBadge').innerText = `LVL ${partner.level}`;

    document.getElementById('battleLog').innerHTML = `<div>Combat engaged! Your ${partner.name} confronts Boss ${stage.boss}. Choose an attack strategy.</div>`;
    
    refreshBattleBars();
    renderBattleMoves();
}

function refreshBattleBars() {
    document.getElementById('bossHPText').innerText = `${activeBattleData.bossHP}/${activeBattleData.bossMaxHP}`;
    const bossPct = (activeBattleData.bossHP / activeBattleData.bossMaxHP) * 100;
    document.getElementById('bossHPBar').style.width = `${bossPct}%`;

    document.getElementById('playerFighterHPText').innerText = `${activeBattleData.playerHP}/${activeBattleData.playerMaxHP}`;
    const playerPct = (activeBattleData.playerHP / activeBattleData.playerMaxHP) * 100;
    document.getElementById('playerFighterHPBar').style.width = `${playerPct}%`;
}

function renderBattleMoves() {
    const grid = document.getElementById('battleMovesGrid');
    if (!grid) return;

    const moves = ["Tackle Strike", "Elemental Pulse", "Hyper Beam Discharge", "Strategic Guard"];
    grid.innerHTML = moves.map(move => {
        return `
            <button onclick="executeBattleTurn('${move}')" class="bg-slate-900 border border-slate-800 text-white font-bold text-xs p-3 rounded-xl hover:bg-slate-800 transition uppercase tracking-wide">
                ${move}
            </button>
        `;
    }).join('');
}

function executeBattleTurn(playerMove) {
    if (activeBattleData.playerHP <= 0 || activeBattleData.bossHP <= 0) return;

    const log = document.getElementById('battleLog');
    
    // 1. Player Turn Calculation
    let playerDamage = Math.floor(Math.random() * 15) + activeBattleData.playerPokemon.level * 3;
    if (playerMove === "Hyper Beam Discharge") playerDamage = Math.floor(playerDamage * 1.5);
    
    activeBattleData.bossHP = Math.max(0, activeBattleData.bossHP - playerDamage);
    log.innerHTML += `<div class="text-emerald-400">&gt; Deployed partner executes ${playerMove} dealing ${playerDamage} damage matrix.</div>`;

    // Check Boss Defeat condition check
    if (activeBattleData.bossHP <= 0) {
        log.innerHTML += `<div class="text-yellow-400 font-bold">&gt; BOSS DEFEATED! Victory sequence completed.</div>`;
        resolveBattleEnd(true);
        refreshBattleBars();
        return;
    }

    // 2. Boss Retaliation Round turn logic calculation metrics
    let bossDamage = Math.floor(Math.random() * 12) + activeBattleData.bossPokemon.level * 2;
    if (playerMove === "Strategic Guard") bossDamage = Math.floor(bossDamage * 0.3);

    activeBattleData.playerHP = Math.max(0, activeBattleData.playerHP - bossDamage);
    log.innerHTML += `<div class="text-rose-400">&gt; Boss responses with heavy physical impact counter, inflicting ${bossDamage} points damage.</div>`;

    // Check Player failure state condition 
    if (activeBattleData.playerHP <= 0) {
        log.innerHTML += `<div class="text-red-500 font-bold">&gt; Deployed signature link collapsed. Partner fainted.</div>`;
        resolveBattleEnd(false);
    }

    refreshBattleBars();
    log.scrollTop = log.scrollHeight; // Auto-scroll logs feed element window frame
}

function resolveBattleEnd(isVictory) {
    // Clear moves buttons matrix grid layout to avoid loops
    document.getElementById('battleMovesGrid').innerHTML = '';
    
    setTimeout(() => {
        if (isVictory) {
            const reward = activeBattleData.bossPokemon.reward;
            gameState.coins += reward;
            
            // Progression advancement logic unlock
            if (chosenCampaignStageId === gameState.unlockedStages) {
                gameState.unlockedStages++;
            }
            showToast("Challenge Victory!", `Earned +${reward} coins for campaign progression clears.`, "success");
        } else {
            showToast("Defeat Encountered", "Your combat group requires higher leveling or equipped store accessories.", "error");
        }

        // Return dashboard state view back to standard selection view panels
        document.getElementById('battleArenaActive').classList.add('hidden');
        document.getElementById('battleSelector').classList.remove('hidden');
        updateUI();
        saveProgress();
    }, 2500);
}

function startUnlimitedMatch() {
    showToast("Unlimited Simulator", "Match simulation modules under deep space engineering construction pipelines.", "info");
}

function renderHeldItemsShop() {}

// ==========================================
// 6. REGISTERED REGISTRY POKEDEX VIEWS
// ==========================================

function renderPokedexGrid() {
    const grid = document.getElementById('pokedexGrid');
    if (!grid) return;

    if (filteredDexList.length === 0) {
        grid.innerHTML = `<div class="col-span-3 text-center py-8 text-slate-500">No database profiles match search parameters.</div>`;
        return;
    }

    // Calculate dynamic slice array arrays loops parameters bounds configurations
    const startIndex = (currentDexPage - 1) * dexItemsPerPage;
    const endIndex = startIndex + dexItemsPerPage;
    const visiblePageItems = filteredDexList.slice(startIndex, endIndex);

    grid.innerHTML = visiblePageItems.map(p => {
        const isRegistered = gameState.pokedex[p.id] === true;
        
        let glowClass = "glow-common";
        if (p.rarity === "Rare") glowClass = "glow-rare";
        if (p.rarity === "Epic") glowClass = "glow-epic";
        if (p.rarity === "Legendary") glowClass = "glow-legendary";

        if (!isRegistered) {
            return `
                <div class="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl text-center opacity-40 select-none">
                    <div class="w-20 h-20 bg-slate-900 rounded-full mx-auto flex items-center justify-center text-slate-700 text-xl font-bold font-mono">?</div>
                    <h4 class="text-xs font-bold text-slate-500 tracking-wide mt-3">Index #${p.id} [Unknown Data]</h4>
                    <p class="text-[10px] text-slate-600 uppercase font-mono mt-0.5">${p.rarity}</p>
                </div>
            `;
        }

        return `
            <div class="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-center shadow-lg hover:border-slate-700 transition ${glowClass}">
                <img src="${p.sprite}" class="w-20 h-20 mx-auto object-contain drop-shadow-md">
                <h4 class="text-sm font-extrabold text-white tracking-wide mt-2">${p.name}</h4>
                <p class="text-[10px] text-slate-400 font-mono mt-0.5">National ID: #${p.id}</p>
                <span class="inline-block px-2.5 py-0.5 text-[9px] font-black tracking-widest uppercase rounded-full bg-slate-900 border border-slate-800 mt-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                    ${p.rarity}
                </span>
            </div>
        `;
    }).join('');

    // Pagination label configurations
    const totalPages = Math.ceil(filteredDexList.length / dexItemsPerPage) || 1;
    document.getElementById('pageInfoText').innerText = `Page ${currentDexPage} of ${totalPages}`;
    document.getElementById('prevPageBtn').disabled = (currentDexPage === 1);
    document.getElementById('nextPageBtn').disabled = (currentDexPage === totalPages);
}

function triggerDexSearch() {
    const query = document.getElementById('dexSearchInput').value.toLowerCase();
    const rarity = document.getElementById('rarityFilterSelect').value;

    filteredDexList = pokemonDatabase.filter(p => {
        const matchesQuery = p.name.toLowerCase().includes(query) || p.id.toString() === query;
        const matchesRarity = (rarity === 'all' || p.rarity === rarity);
        return matchesQuery && matchesRarity;
    });

    currentDexPage = 1;
    renderPokedexGrid();
}

function changeDexPage(direction) {
    const totalPages = Math.ceil(filteredDexList.length / dexItemsPerPage) || 1;
    currentDexPage = Math.max(1, Math.min(totalPages, currentDexPage + direction));
    renderPokedexGrid();
}

// ==========================================
// 7. PC BOX INVENTORY STORAGE DRAW ENGINE
// ==========================================

function renderPCGrid() {
    const grid = document.getElementById('pcGrid');
    if (!grid) return;

    if (gameState.pcBox.length === 0) {
        grid.innerHTML = `<div class="col-span-3 text-center py-12 text-slate-500 font-mono text-xs">PC inventory empty. Initialize scan frequencies matrix above to capture data links.</div>`;
        return;
    }

    const searchInput = document.getElementById('pcSearchInput');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    
    // Apply local computation sorting arrays filter routines 
    let workingList = gameState.pcBox.filter(p => p.name.toLowerCase().includes(query));

    const sortVal = document.getElementById('pcSortSelect')?.value || 'newest';
    if (sortVal === 'level-desc') workingList.sort((a,b) => b.level - a.level);
    else if (sortVal === 'level-asc') workingList.sort((a,b) => a.level - b.level);
    else if (sortVal === 'name') workingList.sort((a,b) => a.name.localeCompare(b.name));
    else if (sortVal === 'oldest') workingList.sort((a,b) => a.uid - b.uid);
    else workingList.sort((a,b) => b.uid - a.uid); // Default newest catch items entries first order parameters loop

    const startIndex = (currentPCPage - 1) * pcItemsPerPage;
    const visiblePCItems = workingList.slice(startIndex, startIndex + pcItemsPerPage);

    grid.innerHTML = visiblePCItems.map(p => {
        return `
            <div class="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between items-center relative overflow-hidden group">
                <span class="absolute top-2 right-2 text-[8px] font-mono text-slate-600">UID_${p.uid}</span>
                <img src="${p.sprite}" class="w-16 h-16 object-contain">
                <div class="text-center w-full mt-2">
                    <h4 class="text-xs font-bold text-white tracking-wide">${p.name}</h4>
                    <div class="flex justify-center items-center gap-2 mt-1">
                        <span class="text-[9px] font-mono text-slate-400">LVL ${p.level}</span>
                        ${p.heldItem ? `<span class="bg-purple-950 text-purple-300 border border-purple-900 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">${p.heldItem}</span>` : ''}
                    </div>
                </div>
                <div class="w-full grid grid-cols-2 gap-2 mt-3 opacity-0 group-hover:opacity-100 transition duration-200">
                    <button onclick="powerUpPartner(${p.uid})" class="py-1 bg-slate-900 border border-slate-800 text-[9px] rounded font-bold text-yellow-400 hover:bg-slate-850">Train</button>
                    <button onclick="releasePartner(${p.uid})" class="py-1 bg-rose-950/30 text-rose-400 border border-rose-900/40 text-[9px] rounded font-bold hover:bg-rose-900 hover:text-white">Release</button>
                </div>
            </div>
        `;
    }).join('');

    const totalPages = Math.ceil(workingList.length / pcItemsPerPage) || 1;
    document.getElementById('pcPageInfoText').innerText = `Page ${currentPCPage} of ${totalPages}`;
    document.getElementById('pcPrevPageBtn').disabled = (currentPCPage === 1);
    document.getElementById('pcNextPageBtn').disabled = (currentPCPage === totalPages);
}

function triggerPCSearch() {
    currentPCPage = 1;
    renderPCGrid();
}

function changePCPage(direction) {
    currentPCPage = Math.max(1, currentPCPage + direction);
    renderPCGrid();
}

function powerUpPartner(uid) {
    const cost = 25;
    if (gameState.coins < cost) {
        showToast("Insufficient Coins", `Training requires ${cost} gold coins.`, "error");
        return;
    }

    const partner = gameState.pcBox.find(p => p.uid === uid);
    if (partner) {
        gameState.coins -= cost;
        partner.level++;
        showToast("Training Loop Completed", `${partner.name} advanced to combat level ${partner.level}!`, "success");
        updateUI();
        renderPCGrid();
        saveProgress();
    }
}

function releasePartner(uid) {
    const idx = gameState.pcBox.findIndex(p => p.uid === uid);
    if (idx !== -1) {
        const name = gameState.pcBox[idx].name;
        gameState.pcBox.splice(idx, 1);
        gameState.coins += 15; // Rebate bonus
        showToast("Data Purged", `${name} dissolved back into digital data vectors. Received 15 recycled coins.`, "info");
        updateUI();
        renderPCGrid();
        saveProgress();
    }
}

// ==========================================
// 8. GEAR MART SHOP IMPLEMENTATION MODULES
// ==========================================

function renderHeldItemsShop() {
    const grid = document.getElementById('shopProductGrid');
    if (!grid) return;

    grid.innerHTML = shopItems.map(item => {
        let isOwnedHeldMax = false;
        if (item.type === 'held_item' && gameState.inventoryItems[item.name] >= 5) isOwnedHeldMax = true;

        return `
            <div class="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between min-h-[160px] hover:border-slate-800 transition">
                <div>
                    <div class="flex justify-between items-start gap-2">
                        <h4 class="text-xs font-extrabold text-white uppercase tracking-wide">${item.name}</h4>
                        <span class="text-[10px] font-mono text-yellow-400 font-bold">${item.cost} G</span>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-medium">${item.desc}</p>
                </div>
                <button onclick="purchaseShopAsset('${item.name}')" ${isOwnedHeldMax ? 'disabled' : ''} class="mt-4 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 hover:border-slate-700 transition disabled:opacity-30">
                    ${isOwnedHeldMax ? "Max Stock" : "Acquire Asset"}
                </button>
            </div>
        `;
    }).join('');
}

function purchaseShopAsset(itemName) {
    const product = shopItems.find(i => i.name === itemName);
    if (!product) return;

    if (gameState.coins < product.cost) {
        showToast("Transaction Refused", "Your central credit accounting balances are insufficient.", "error");
        return;
    }

    gameState.coins -= product.cost;
    
    if (product.type === "ball") {
        gameState.balls[product.ballKey]++;
    } else {
        gameState.inventoryItems[product.name] = (gameState.inventoryItems[product.name] || 0) + 1;
    }

    showToast("Purchase Approved", `${product.name} appended to internal device inventories.`, "success");
    updateUI();
    renderHeldItemsShop();
    saveProgress();
}

function renderHeldItemsShop() {
    const parentContainer = document.getElementById('view-shop');
    if (!parentContainer) return;

    // Check for inner grid container injection safely
    let targetGrid = document.getElementById('shopProductGrid');
    if (!targetGrid) {
        parentContainer.innerHTML = `
            <div class="text-center mb-6">
                <span class="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-bold">SILPH CO. STRATEGY MART</span>
                <h2 class="heading-font text-2xl font-black text-white mt-2">RADAR & STRATEGIC EQUIPMENT</h2>
                <p class="text-xs text-slate-400">Purchase scanner gear, balls, and equippable passive Hold Items to power up your roadmap campaign!</p>
            </div>
            <div id="shopProductGrid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"></div>
        `;
        targetGrid = document.getElementById('shopProductGrid');
    }

    targetGrid.innerHTML = shopItems.map(item => {
        return `
            <div class="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between min-h-[160px] hover:border-slate-800 transition">
                <div>
                    <div class="flex justify-between items-start gap-2">
                        <h4 class="text-xs font-extrabold text-white uppercase tracking-wide">${item.name}</h4>
                        <span class="text-[10px] font-mono text-yellow-400 font-bold">${item.cost} G</span>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-medium">${item.desc}</p>
                </div>
                <button onclick="purchaseShopAsset('${item.name}')" class="mt-4 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 hover:border-slate-700 transition">
                    Acquire Asset
                </button>
            </div>
        `;
    }).join('');
}

// ==========================================
// 9. CORE RECURSIVE ENGINE LOOP PIPELINES
// ==========================================

function gameLoop() {
    // 1. Manage radar rotation vectors if spinning is marked active
    if (isSpinning) {
        currentRotation = (currentRotation + 12) % 360;
        const canvas = document.getElementById('wheelCanvas');
        if (canvas) {
            canvas.style.transform = `rotate(${currentRotation}deg)`;
        }
    }

    // 2. Manage capture contract target contracting ring animations metrics
    if (timingRingActive) {
        timingRingRadius -= 0.65;
        if (timingRingRadius <= 10) {
            timingRingRadius = 80; // Loop contraction sequences
        }
        const ringNode = document.getElementById('timingRing');
        if (ringNode) {
            ringNode.style.width = `${timingRingRadius * 2}px`;
            ringNode.style.height = `${timingRingRadius * 2}px`;
            
            // Alter ring coloring gradients dynamically depending on hot timing boundaries
            if (timingRingRadius >= 30 && timingRingRadius <= 50) {
                ringNode.className = "rounded-full border-4 border-emerald-400 absolute transition-all duration-75 animate-pulse";
            } else {
                ringNode.className = "rounded-full border-4 border-red-500 absolute transition-all duration-75";
            }
        }
    }

    requestAnimationFrame(gameLoop);
}

// Global initialization entry trigger
window.onload = function() {
    loadSavedProgress();
    initPokemonDatabase().then(() => {
        buildWheelSectors();
        drawWheel();
        selectBall('poke'); // Anchor standard visual configurations
        updateUI();
        updateTargetRarityObjective();
        renderRoadmap();
        renderHeldItemsShop();
        requestAnimationFrame(gameLoop);
    });
};
