// PokeSpinner — The wheel, wild encounters, catching and rare cutscenes.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// MODULE 5: RADAR & WHEEL SYSTEM
// ==========================================
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const wheelRadius = canvas.width / 2;

const WHEEL_CONFIGS = {
    poke: [
        { rarity: "Common", ratio: 0.65, color: "#2d3748" },
        { rarity: "Rare", ratio: 0.25, color: "#1d4ed8" },
        { rarity: "Epic", ratio: 0.09, color: "#7e22ce" },
        { rarity: "Legendary", ratio: 0.01, color: "#b45309" }
    ],
    great: [
        { rarity: "Common", ratio: 0.40, color: "#2d3748" },
        { rarity: "Rare", ratio: 0.40, color: "#1d4ed8" },
        { rarity: "Epic", ratio: 0.18, color: "#7e22ce" },
        { rarity: "Legendary", ratio: 0.02, color: "#b45309" }
    ],
    ultra: [
        { rarity: "Common", ratio: 0.15, color: "#2d3748" },
        { rarity: "Rare", ratio: 0.35, color: "#1d4ed8" },
        { rarity: "Epic", ratio: 0.40, color: "#7e22ce" },
        { rarity: "Legendary", ratio: 0.10, color: "#b45309" }
    ],
    master: [
        { rarity: "Common", ratio: 0.00, color: "#2d3748" },
        { rarity: "Rare", ratio: 0.10, color: "#1d4ed8" },
        { rarity: "Epic", ratio: 0.60, color: "#7e22ce" },
        { rarity: "Legendary", ratio: 0.30, color: "#b45309" }
    ]
};

let currentSectors = [];

function buildWheelSectors() {
    const config = WHEEL_CONFIGS[gameState.selectedBall];
    currentSectors = [];
    const wedges = 12;
    let currentPool = [];
    
    config.forEach(cfg => {
        const count = Math.max(0, Math.round(cfg.ratio * wedges));
        for(let i=0; i < count; i++) currentPool.push({ rarity: cfg.rarity, color: cfg.color });
    });

    while(currentPool.length < wedges) currentPool.push({ rarity: "Common", color: "#2d3748" });
    if(currentPool.length > wedges) currentPool.splice(wedges);

    const anglePerWedge = (Math.PI * 2) / wedges;
    for(let i = 0; i < wedges; i++) {
        currentSectors.push({
            startAngle: i * anglePerWedge,
            endAngle: (i + 1) * anglePerWedge,
            rarity: currentPool[i].rarity,
            color: currentPool[i].color
        });
    }
}

// Rarity palette for the wheel: [light, dark, label, stars]
const WHEEL_STYLE = {
    Common:    ['#94a3b8', '#475569', 'COMMON', 1],
    Rare:      ['#60a5fa', '#1d4ed8', 'RARE', 2],
    Epic:      ['#c084fc', '#7e22ce', 'EPIC', 3],
    Legendary: ['#fde047', '#b45309', 'LEGEND', 4]
};
const BALL_HUB = { poke: ['#ef4444', '#f8fafc'], great: ['#2563eb', '#f8fafc'], ultra: ['#111827', '#f8fafc'], master: ['#7c3aed', '#f8fafc'] };

function drawWheel() {
    const W = canvas.width, R = W / 2;
    const now = performance.now();
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.translate(R, R);

    // Outer rim with light bulbs (they chase while spinning)
    const rimR = R - 4;
    const rimGrad = ctx.createLinearGradient(0, -R, 0, R);
    rimGrad.addColorStop(0, '#3b4458'); rimGrad.addColorStop(1, '#171c26');
    ctx.beginPath(); ctx.arc(0, 0, rimR, 0, Math.PI * 2); ctx.fillStyle = rimGrad; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#0b0f17'; ctx.stroke();
    const bulbs = 24;
    const chase = gameState.wheel.spinning || gameState.wheel.stopping ? Math.floor(now / 90) : Math.floor(now / 600);
    for (let i = 0; i < bulbs; i++) {
        const a = (i / bulbs) * Math.PI * 2;
        const lit = (i + chase) % 3 === 0;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (rimR - 13), Math.sin(a) * (rimR - 13), 6, 0, Math.PI * 2);
        ctx.fillStyle = lit ? '#fef08a' : '#6b5f2a';
        ctx.shadowColor = lit ? '#fde047' : 'transparent';
        ctx.shadowBlur = lit ? 14 : 0;
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Wedges
    const faceR = rimR - 28;
    ctx.save();
    ctx.rotate(gameState.wheel.currentAngle);
    currentSectors.forEach((sector, idx) => {
        const [light, dark, label, stars] = WHEEL_STYLE[sector.rarity] || WHEEL_STYLE.Common;
        const grad = ctx.createRadialGradient(0, 0, faceR * 0.2, 0, 0, faceR);
        grad.addColorStop(0, dark); grad.addColorStop(1, light);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, faceR, sector.startAngle, sector.endAngle);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        // Alternate a subtle sheen so neighbouring wedges read apart
        if (idx % 2) { ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); }
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(15,23,42,.85)'; ctx.stroke();
        // Landed wedge glows after the wheel stops
        if (gameState.wheel.landedIndex === idx && !gameState.wheel.spinning && !gameState.wheel.stopping) {
            ctx.save(); ctx.clip();
            ctx.fillStyle = `rgba(255,255,255,${(0.18 + 0.12 * Math.sin(now / 180)).toFixed(3)})`;
            ctx.fillRect(-R, -R, W, W);
            ctx.restore();
            ctx.lineWidth = 6; ctx.strokeStyle = '#fef08a'; ctx.stroke();
        }
        // Label + rarity stars, reading outward
        ctx.save();
        const mid = sector.startAngle + (sector.endAngle - sector.startAngle) / 2;
        ctx.rotate(mid);
        // Keep labels upright: wedges on the left half are drawn flipped
        const flip = Math.cos(mid + gameState.wheel.currentAngle) < 0;
        if (flip) ctx.rotate(Math.PI);
        const dir = flip ? -1 : 1;
        ctx.textAlign = flip ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 4;
        ctx.font = `700 ${Math.round(W * 0.036)}px 'Silkscreen', 'Space Grotesk', sans-serif`;
        ctx.fillText(typeof trLabel === 'function' ? trLabel(label) : label, dir * (faceR - 16), -1);
        ctx.font = `${Math.round(W * 0.03)}px sans-serif`;
        ctx.fillStyle = sector.rarity === 'Legendary' ? '#fff7cc' : 'rgba(255,255,255,.85)';
        ctx.textAlign = 'center';
        ctx.fillText('★'.repeat(stars), dir * faceR * 0.36, 1);
        ctx.restore();
    });
    ctx.restore();

    // Hub: the official art of the selected ball (drawn fallback until it loads)
    const [top, bottom] = BALL_HUB[gameState.selectedBall] || BALL_HUB.poke;
    const hubR = W * 0.11;
    const art = _ballArt[gameState.selectedBall];
    if (art) {
        ctx.beginPath(); ctx.arc(0, 0, hubR * 1.18, 0, Math.PI * 2); ctx.fillStyle = '#1a1030'; ctx.fill();
        const sz = hubR * 2.1;
        ctx.drawImage(art, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
        return;
    }
    ctx.beginPath(); ctx.arc(0, 0, hubR, Math.PI, 0); ctx.fillStyle = top; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, hubR, 0, Math.PI); ctx.fillStyle = bottom; ctx.fill();
    ctx.fillStyle = '#111827'; ctx.fillRect(-hubR, -hubR * 0.14, hubR * 2, hubR * 0.28);
    ctx.beginPath(); ctx.arc(0, 0, hubR, 0, Math.PI * 2); ctx.lineWidth = 5; ctx.strokeStyle = '#111827'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, hubR * 0.36, 0, Math.PI * 2); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, hubR * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = gameState.wheel.spinning ? '#fca5a5' : '#e2e8f0'; ctx.fill();
    ctx.restore();
}

// Keep the rim lights / landed glow animating while idle on the Radar tab
setInterval(() => {
    if (!gameState.wheel.spinning && !gameState.wheel.stopping && !animationFrameId) {
        const view = document.getElementById('view-roulette');
        if (view && !view.classList.contains('hidden')) drawWheel();
    }
}, 120);

// OPTIMIZED ANIMATION LOOP
let lastTick = 0;
function gameLoop(timestamp) {
    if(!lastTick) lastTick = timestamp;
    let delta = timestamp - lastTick;
    lastTick = timestamp;
    let needsNextFrame = false;

    if (gameState.wheel.stopping) {
        // Smooth, fixed-length slow-down after LOCK (predictable, so timing still matters)
        gameState.wheel.spinSpeed = Math.max(0, gameState.wheel.spinSpeed - gameState.wheel.decel);
        gameState.wheel.currentAngle = (gameState.wheel.currentAngle + gameState.wheel.spinSpeed) % (Math.PI * 2);
        let wedgeCount = currentSectors.length;
        let currentWedge = Math.floor(((gameState.wheel.currentAngle + Math.PI/2) % (Math.PI * 2)) / ((Math.PI * 2) / wedgeCount));
        if (currentWedge !== gameState.wheel.lastWedgeAudio) { playPrecisionTick(); gameState.wheel.lastWedgeAudio = currentWedge; }
        if (gameState.wheel.spinSpeed <= 0) { gameState.wheel.stopping = false; finishWheelStop(); }
        drawWheel();
        needsNextFrame = gameState.wheel.stopping || needsNextFrame;
    }

    if (gameState.wheel.spinning) {
        gameState.wheel.currentAngle += gameState.wheel.spinSpeed;
        if (gameState.wheel.currentAngle >= Math.PI * 2) gameState.wheel.currentAngle -= Math.PI * 2;
        
        let wedgeCount = currentSectors.length;
        let currentWedge = Math.floor(((gameState.wheel.currentAngle + Math.PI/2) % (Math.PI * 2)) / ((Math.PI * 2) / wedgeCount));
        if (currentWedge !== gameState.wheel.lastWedgeAudio) {
            playPrecisionTick();
            gameState.wheel.lastWedgeAudio = currentWedge;
        }
        drawWheel();
        needsNextFrame = true;
    }

    if (gameState.catchMinigame.active) {
        const step = 0.015;
        if (gameState.catchMinigame.contracting) {
            gameState.catchMinigame.ringScale -= step;
            if (gameState.catchMinigame.ringScale <= 0.15) gameState.catchMinigame.contracting = false;
        } else {
            gameState.catchMinigame.ringScale += step;
            if (gameState.catchMinigame.ringScale >= 1.0) gameState.catchMinigame.contracting = true;
        }

        const ringEl = document.getElementById('timingRing');
        if (ringEl) {
            const widthPercent = gameState.catchMinigame.ringScale * 100;
            ringEl.style.width = `${widthPercent}%`;
            ringEl.style.height = `${widthPercent}%`;

            if (gameState.catchMinigame.ringScale > 0.7) ringEl.style.borderColor = "#f43f5e";
            else if (gameState.catchMinigame.ringScale > 0.35) ringEl.style.borderColor = "#eab308";
            else ringEl.style.borderColor = "#10b981";
        }
        needsNextFrame = true;
    }

    if (needsNextFrame) {
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
        animationFrameId = null;
        lastTick = 0;
    }
}

window.selectBall = function(ballType) {
    if (gameState.wheel.spinning) return;
    initAudio();
    if (gameState.balls[ballType] <= 0) {
        showNotification('None left', `You have no ${BALL_SHOP[ballType] ? BALL_SHOP[ballType].name + 's' : 'balls of that kind'} — buy some at the Poké Mart.`, 'error');
        return;
    }
    playConfirmSound();
    gameState.selectedBall = ballType;
    buildWheelSectors();
    drawWheel();
    updateUI();
    updateTargetRarityObjective();
};

function updateTargetRarityObjective() {
    const cfg = WHEEL_CONFIGS[gameState.selectedBall];
    let list = cfg.filter(c => c.ratio > 0).map(c => c.rarity);
    
    if(list.includes("Legendary")) gameState.wheel.targetRarity = "Legendary";
    else if(list.includes("Epic")) gameState.wheel.targetRarity = "Epic";
    else gameState.wheel.targetRarity = "Rare";
}

function getRadarGenRange() {
    const REGION_MAX  = [0,151,251,386,493,649,721,809,905,1025];
    const REGION_NAME = ['','Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'];
    const unlocked = gameState.unlockedRegions || [1];
    const maxR = Math.max(...unlocked);
    const names = unlocked.map(r=>REGION_NAME[r]).join('/');
    return { min: 1, max: REGION_MAX[maxR], name: names.toUpperCase() + ' REGION' };
}

function updateScanningRegionUI() {
    const range = getRadarGenRange();
    const badge = document.getElementById('regionBadge');
    if (!badge) return;
    badge.textContent = range.name;
    const maxR = Math.max(...(gameState.unlockedRegions||[1]));
    const palettes = ['','bg-green-500/10 text-green-400 border-green-500/30','bg-blue-500/10 text-blue-400 border-blue-500/30','bg-red-500/10 text-red-400 border-red-500/30','bg-stone-500/10 text-stone-400 border-stone-500/30','bg-indigo-500/10 text-indigo-400 border-indigo-500/30','bg-purple-500/10 text-purple-400 border-purple-500/30','bg-teal-500/10 text-teal-400 border-teal-500/30','bg-orange-500/10 text-orange-400 border-orange-500/30','bg-rose-500/10 text-rose-400 border-rose-500/30'];
    badge.className = `${palettes[maxR]||palettes[1]} border text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-black inline-block mb-1`;
}

function getActiveGens() {
    const GEN_KEY = ['','gen1','gen2','gen3','gen4','gen5','gen6','gen7','gen8','gen9'];
    return (gameState.unlockedRegions || [1]).map(r => GEN_KEY[r]);
}

// Starter Pokémon appear 70% less frequently in the spinner pool
const STARTER_IDS_FREQ = new Set([1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912]);

function getWedgePokemonId(rarity) {
    const genRange = getRadarGenRange();
    const activeGens = getActiveGens();
    const rarityPool = BASIC_POKEMON_POOLS[rarity] || BASIC_POKEMON_POOLS['Common'];

    let pool = [];
    for (const gen of activeGens) if (rarityPool[gen]) pool = pool.concat(rarityPool[gen]);
    pool = pool.filter(id => id <= genRange.max);
    if (pool.length === 0) pool = BASIC_POKEMON_POOLS.Common.gen1;
    // Filter starters to 30% of their normal appearance rate
    const filtered = pool.filter(id => !STARTER_IDS_FREQ.has(id) || Math.random() < 0.30);
    const finalPool = filtered.length > 0 ? filtered : pool;
    // Weather (features.js) makes boosted types three times as likely
    return typeof pickWeatherWeighted === 'function' ? pickWeatherWeighted(finalPool) : finalPool[Math.floor(Math.random() * finalPool.length)];
}

window.triggerSpin = function() {
    initAudio();
    if (gameState.wheel.spinning || gameState.wheel.stopping) return;
    
    // Out of the selected ball: switch to the cheapest ball still in the bag
    if ((gameState.balls[gameState.selectedBall] || 0) <= 0) {
        const next = ['poke', 'great', 'ultra', 'master'].find(b => (gameState.balls[b] || 0) > 0);
        if (!next) {
            if (Portal.canRewarded()) { offerRewardedBalls(); return; }
            if (gameState.coins >= 10) {
                showNotification('Out of Poké Balls', 'Opening the Poké Mart — Poké Balls cost 10 coins.', 'info');
                setTimeout(() => { switchView('shop'); if (typeof setMartTab === 'function') setMartTab('balls'); }, 700);
            } else {
                showNotification('Out of Poké Balls', 'Win battles on the Adventure map to earn coins, then buy more at the Poké Mart.', 'error');
            }
            return;
        }
        gameState.selectedBall = next;
        buildWheelSectors(); drawWheel(); updateTargetRarityObjective();
    }
    const selected = gameState.selectedBall;

    gameState.balls[selected] -= 1;
    updateUI();
    saveProgress();
    playConfirmSound();
    gameEvent('spin', { ball: selected });
    
    document.getElementById('spinBtn').disabled = true;
    document.getElementById('spinBtn').className = "flex-1 py-4 px-6 bg-slate-900 text-slate-600 font-black uppercase rounded-2xl cursor-not-allowed transition duration-150 tracking-wider border border-slate-800";
    
    const stopBtn = document.getElementById('stopBtn');
    stopBtn.disabled = false;
    stopBtn.classList.add('lock-lit');
    stopBtn.className = "lock-lit flex-1 py-4 px-6 text-white font-black uppercase rounded-2xl shadow-xl transition duration-150 tracking-wider cursor-pointer";

    // Poke Ball cannot catch legendaries
    if (selected === 'poke' && gameState.currentEncounter) {
        const encId = gameState.currentEncounter.id || 0;
        if (LEGENDARY_MYTHICAL_POKEMON.includes(encId)) {
            gameState.balls[selected] += 1; // refund
            updateUI();
            showNotification(t('scanner.cantCatch'), t('scanner.noPokeBall'), 'error');
            // Re-enable spin
            document.getElementById('spinBtn').disabled = false;
            document.getElementById('spinBtn').className = "flex-1 py-4 px-6 themed-gradient text-white font-black uppercase rounded-2xl shadow-xl transition duration-150 tracking-wider cursor-pointer";
            document.getElementById('stopBtn').disabled = true;
            document.getElementById('encounterStatus').textContent = t('scanner.selectBall');
            return;
        }
    }
    let baseSpeed = 0.15;
    if (selected === 'great') baseSpeed = 0.12;
    if (selected === 'ultra') baseSpeed = 0.09;
    if (selected === 'master') baseSpeed = 0.05;

    gameState.wheel.spinSpeed = baseSpeed + (Math.random() * 0.01);
    gameState.wheel.spinning = true;
    gameState.wheel.landedIndex = -1;
    gameState.wheel.lastWedgeAudio = -1;

    if (!animationFrameId) animationFrameId = requestAnimationFrame(gameLoop);

    document.getElementById('encounterStatus').className = "bg-rose-600/15 text-rose-500 border border-rose-500/20 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-bold inline-block animate-pulse";
    document.getElementById('encounterStatus').textContent = t('scanner.scanning');
    document.getElementById('wildPokemonName').textContent = t('scanner.frequencies');
    document.getElementById('wildPokemonGraphic').style.opacity = "0.1";
};

window.triggerPrecisionStop = function() {
    if (!gameState.wheel.spinning) return;

    gameState.wheel.spinning = false;
    gameState.wheel.stopping = true;
    gameState.wheel.decel = gameState.wheel.spinSpeed / 32; // ~0.5 s to a stop
    playConfirmSound();
    if (!animationFrameId) animationFrameId = requestAnimationFrame(gameLoop);

    document.getElementById('spinBtn').disabled = false;
    document.getElementById('spinBtn').className = "flex-1 py-4 px-6 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black uppercase rounded-2xl shadow-xl transition duration-150 tracking-wider";
    
    const stopBtn = document.getElementById('stopBtn');
    stopBtn.disabled = true;
    stopBtn.classList.remove('lock-lit');
    stopBtn.className = "flex-1 py-4 px-6 bg-slate-900 text-slate-600 font-black uppercase rounded-2xl cursor-not-allowed transition duration-150 tracking-wider border border-slate-800";

    document.getElementById('spinBtn').disabled = true;
};

function finishWheelStop() {
    document.getElementById('spinBtn').disabled = false;
    const wedgeCount = currentSectors.length;
    const anglePerWedge = (Math.PI * 2) / wedgeCount;

    let stopAngle = ( -gameState.wheel.currentAngle - (Math.PI / 2) ) % (Math.PI * 2);
    if (stopAngle < 0) stopAngle += (Math.PI * 2);

    let landedSectorIndex = Math.floor(stopAngle / anglePerWedge);
    let landedSector = currentSectors[landedSectorIndex];
    gameState.wheel.landedIndex = landedSectorIndex;

    // 1 in 200 chance for legendary/mythical encounter
    const legendaryChance = Math.random();
    const isLegendaryEncounter = legendaryChance < (1 / 200);

    processEncounterResult(landedSector, isLegendaryEncounter);
}

async function processEncounterResult(sector, isLegendaryEncounter = false) {
    document.getElementById('wildPokemonLoading').classList.remove('hidden');
    document.getElementById('wildPokemonGraphic').classList.add('hidden');
    
    let pokemon;
    let rarity;
    let isSpecialLegendary = false;

    if (isLegendaryEncounter) {
        // Get random legendary/mythical pokemon
        const legendaryId = LEGENDARY_MYTHICAL_POKEMON[Math.floor(Math.random() * LEGENDARY_MYTHICAL_POKEMON.length)];
        // Special legendary encounters are Lv. 50 and know their Lv. 50 moves
        pokemon = await fetchPokemonData(legendaryId, 50);
        rarity = 'Legendary';
        isSpecialLegendary = true;
        pokemon.level = 50;
    } else {
        rarity = sector.rarity;
        const basicId = getWedgePokemonId(rarity);
        const wildLevel = getWildLevel(rarity);
        pokemon = await fetchPokemonData(basicId, wildLevel);
        pokemon.level = wildLevel;
    }

    document.getElementById('wildPokemonLoading').classList.add('hidden');
    document.getElementById('wildPokemonGraphic').classList.remove('hidden');

    pokemon.rarity = rarity;
    pokemon.isSpecialLegendary = isSpecialLegendary;
    markSeen(pokemon.id, pokemon.name);
    gameState.currentEncounter = pokemon;
    gameState.encounterShiny = rollShiny();

    const encounterTag = document.getElementById('encounterStatus');
    encounterTag.className = `border text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-black inline-block animate-bounce`;
    
    const graphicEl = document.getElementById('wildPokemonGraphic');
    const nameEl = document.getElementById('wildPokemonName');
    const detailsEl = document.getElementById('wildPokemonDetails');
    const platformEl = document.getElementById('pokemonPlatform');

    if (isSpecialLegendary) {
        // Special legendary encounter with custom animation
        encounterTag.classList.add('bg-yellow-500/10', 'text-yellow-400', 'border-yellow-500/30');
        encounterTag.innerHTML = `<i class="fas fa-star mr-1"></i> ${t('scanner.legendary')}`;
        platformEl.className = "absolute bottom-6 w-32 h-6 bg-yellow-500/30 rounded-full blur-lg glow-legendary-special";
        graphicEl.classList.add('legendary-entry-animation');
        showNotification(t('scanner.legendaryAppeared'), t('scanner.legendaryAppearedMsg'), 'shiny');
    } else if (rarity === 'Legendary') {
        encounterTag.classList.add('bg-yellow-500/10', 'text-yellow-400', 'border-yellow-500/30');
        platformEl.className = "absolute bottom-6 w-32 h-6 bg-yellow-500/20 rounded-full blur-md animate-pulse";
    } else if (rarity === 'Epic') {
        encounterTag.classList.add('bg-purple-500/10', 'text-purple-400', 'border-purple-500/30');
        platformEl.className = "absolute bottom-6 w-32 h-6 bg-purple-500/20 rounded-full blur-md";
    } else if (rarity === 'Rare') {
        encounterTag.classList.add('bg-blue-500/10', 'text-blue-400', 'border-blue-500/30');
        platformEl.className = "absolute bottom-6 w-32 h-6 bg-blue-500/10 rounded-full blur-sm";
    } else {
        encounterTag.classList.add('bg-slate-900', 'text-slate-300', 'border-slate-800');
        platformEl.className = "absolute bottom-6 w-32 h-6 bg-slate-900 rounded-full blur-sm";
    }

    let targetStruck = (rarity === gameState.wheel.targetRarity);
    let targetBonusMessage = targetStruck ? "⚡ TARGET FOCUS MATCHED (+100% Coins!) ⚡" : "";

    if (!isSpecialLegendary) {
        encounterTag.innerHTML = `<i class="fas fa-satellite-dish mr-1"></i> ${t('scanner.radarLocked')}${rarity}`;
    }
    
    if (gameState.encounterShiny) {
        nameEl.innerHTML = `<span class="text-pink-400">✨ ${t('scanner.shiny') || 'SHINY'}</span> ${pokemon.name.toUpperCase()}`;
    } else {
        nameEl.textContent = pokemon.name;
    }
    graphicEl.className = "wild-sprite z-10 transition-all duration-300 opacity-100";
    graphicEl.style.filter = "none";
    graphicEl.style.opacity = '';

    // Remove animation class after animation completes
    setTimeout(() => {
        graphicEl.classList.remove('legendary-entry-animation');
    }, 1500);
    
    // Animated game sprite (real shiny colours when shiny), with fallbacks
    const wildCandidates = battleSpriteCandidates(pokemon.id, !!gameState.encounterShiny, false);
    graphicEl.dataset.fallbacks = wildCandidates.slice(1).join('|');
    graphicEl.onerror = () => window._spriteFallback(graphicEl);
    graphicEl.src = wildCandidates[0];
    if (gameState.encounterShiny && !isSpecialLegendary) setTimeout(() => sparkleBurst(document.getElementById('wildDisplayBox')), 250);

    // Show level for special legendary encounters
    const levelText = ` | <span class="text-slate-300 font-bold">${t('common.level') || 'Level'}:</span> ${pokemon.level || 1}`;
    const catchRateText = isSpecialLegendary ? ` | <span class="text-emerald-400 font-extrabold text-[9px]">100% CATCH RATE!</span>` : '';
    detailsEl.innerHTML = `<span class="text-slate-300 font-bold">${t('common.type') || 'Type'}:</span> ${pokemon.type1.toUpperCase()}${pokemon.type2 ? ' / ' + pokemon.type2.toUpperCase() : ''}${levelText}<br><span class="text-yellow-400 font-extrabold text-[9px]">${targetBonusMessage}</span>${catchRateText}`;

    const catchBtn = document.getElementById('catchBtn');
    catchBtn.disabled = false;
    catchBtn.className = "w-full py-4 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-slate-950 font-black uppercase rounded-2xl shadow-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer";
    catchBtn.innerHTML = `<i class="fas fa-crosshairs text-lg"></i> <span>${t('scanner.lockSig')}</span>`;
    // Phones stack the scanner under the wheel: bring the encounter and the Catch button on screen
    if (window.innerWidth < 768) {
        const tabbar = document.querySelector('.mobile-tabbar');
        const room = window.innerHeight - (tabbar ? tabbar.offsetHeight : 0) - 12;
        const bottom = catchBtn.getBoundingClientRect().bottom;
        if (bottom > room || bottom < 0) window.scrollTo({ top: Math.max(0, window.scrollY + bottom - room), behavior: 'smooth' });
    }

    // ── Rare encounter cutscene (shiny or legendary) ──
    if (gameState.encounterShiny || isSpecialLegendary) {
        window.showRareCutscene(pokemon, gameState.encounterShiny, isSpecialLegendary, function() {
            document.getElementById('timingRingContainer').classList.remove('hidden');
            gameState.catchMinigame.active = true;
            gameState.catchMinigame.ringScale = 1.0;
            gameState.catchMinigame.contracting = true;
            if (!animationFrameId) animationFrameId = requestAnimationFrame(gameLoop);
        });
    } else {
        document.getElementById('timingRingContainer').classList.remove('hidden');
        gameState.catchMinigame.active = true;
        gameState.catchMinigame.ringScale = 1.0;
        gameState.catchMinigame.contracting = true;
        if (!animationFrameId) animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// ── Rare encounter cutscene JS — ELITE EDITION ───────────────────────
window._cutsceneCallback = null;
window._cutsceneTimeout = null;

function _spawnCutsceneParticles(container, color1, color2, count) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const p = document.createElement('div');
            p.className = 'cutscene-particle';
            const angle = Math.random() * Math.PI * 2;
            const dist = 80 + Math.random() * 230;
            const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist;
            const size = 3 + Math.random() * 10;
            p.style.cssText = `left:calc(50% + ${(Math.random()-0.5)*130}px);top:calc(50% + ${(Math.random()-0.5)*130}px);width:${size}px;height:${size}px;background:${Math.random()>0.5?color1:color2};--pdx:${dx}px;--pdy:${dy}px;--pdur:${(0.5+Math.random()*1).toFixed(2)}s;--pdel:${(Math.random()*0.3).toFixed(2)}s;box-shadow:0 0 8px ${color1};`;
            container.appendChild(p);
            setTimeout(() => p.remove(), 1800);
        }, i * 16);
    }
}

window.showRareCutscene = function(pokemon, isShiny, isLegendary, callback) {
    let overlay = document.getElementById('rareCutscene');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'rareCutscene';
        overlay.className = 'hidden';
        document.body.appendChild(overlay);
    }
    const accent = isShiny ? '#f9a8d4' : '#fde047';
    const name = (pokemon.name || '').toUpperCase();
    const candidates = battleSpriteCandidates(pokemon.id, !!isShiny, false);
    overlay.style.cssText = `background:${isLegendary
        ? 'radial-gradient(ellipse at center, #2a1d05 0%, #0b0703 60%, #000 100%)'
        : 'radial-gradient(ellipse at center, #26143a 0%, #0b0614 60%, #000 100%)'};--rc-accent:${accent};`;
    overlay.innerHTML = `
        ${isLegendary ? '<div class="rc-bars" style="position:absolute;inset:0;pointer-events:none;"></div>' : ''}
        <div class="rc-whiteout"></div>
        <div class="rc-stage">
            <div class="rc-sprite-wrap" id="_csWrap">
                <div class="rc-rays"></div>
                <img id="_csSprite" class="rc-sprite" alt="${pokemon.name || ''}" style="opacity:0"
                     data-fallbacks="${candidates.slice(1).join('|')}" onerror="_spriteFallback(this)" src="${candidates[0]}">
            </div>
            <div class="rc-textbox" id="_csText"></div>
        </div>
        <div class="rc-skip">TAP TO CONTINUE</div>`;
    overlay.onclick = () => window.dismissCutscene();
    overlay.classList.remove('hidden');
    overlay.style.opacity = '1';
    window._cutsceneCallback = callback;

    const wrap = document.getElementById('_csWrap');
    const sprite = document.getElementById('_csSprite');
    const text = document.getElementById('_csText');
    const rays = overlay.querySelector('.rc-rays');
    sprite.onload = () => sprite.classList.toggle('is-artwork', (sprite.currentSrc || sprite.src).includes('official-artwork'));
    const later = (ms, fn) => setTimeout(() => { if (window._cutsceneCallback === callback) fn(); }, ms);

    if (isLegendary) {
        // Bars open → silhouette rises and shakes with a roar → white flash reveal
        later(500, () => { sprite.style.opacity = '1'; sprite.classList.add('rc-silhouette'); playSynthSound(90, 'sawtooth', 0.9, 0.18); });
        [900, 1150, 1400].forEach(ms => later(ms, () => {
            const ring = document.createElement('div'); ring.className = 'rc-roar'; wrap.appendChild(ring); setTimeout(() => ring.remove(), 1000);
            playSynthSound(70 + Math.random() * 40, 'square', 0.25, 0.12);
        }));
        later(1700, () => {
            overlay.querySelector('.rc-whiteout').classList.add('is-on');
            sprite.classList.remove('rc-silhouette'); sprite.classList.add('rc-reveal');
            rays.classList.add('is-on');
            playSuccessCapture();
            if (isShiny) setTimeout(() => sparkleBurst(wrap, 12), 500);
        });
        later(2000, () => {
            text.innerHTML = `The legendary <b>${isShiny ? 'shiny ' : ''}${name}</b> appeared!<div class="rc-sub">LV. ${pokemon.level || 50} · ${(pokemon.type1 || '').toUpperCase()}${pokemon.type2 ? ' / ' + pokemon.type2.toUpperCase() : ''}</div>`;
            text.classList.add('is-on');
        });
    } else {
        // Shiny: the Pokémon appears, then the classic star sparkle and chime
        later(250, () => { sprite.style.opacity = '1'; sprite.classList.add('rc-reveal'); });
        later(650, () => sparkleBurst(wrap, 12));
        later(1250, () => sparkleBurst(wrap, 8));
        later(900, () => {
            text.innerHTML = `A <b>shiny ${name}</b> appeared!<div class="rc-sub">FULL ODDS 1/${gameState.shinyCharm ? '1365' : SHINY_ODDS} · LV. ${pokemon.level || 1}</div>`;
            text.classList.add('is-on');
        });
    }

    clearTimeout(window._cutsceneTimeout);
    window._cutsceneTimeout = setTimeout(window.dismissCutscene, isLegendary ? 6500 : 5000);
};

window.dismissCutscene = function() {
    clearTimeout(window._cutsceneTimeout);
    const overlay = document.getElementById('rareCutscene');
    if (!overlay) return;
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.style.opacity = ''; // clear inline style so CSS class controls opacity
        if (window._cutsceneCallback) {
            const cb = window._cutsceneCallback;
            window._cutsceneCallback = null;
            cb();
        }
    }, 500);
};

// ── Shiny odds: full odds 1/4096 like the modern games; the Shiny Charm
// adds two extra rolls (≈1/1365) ───────────────────────────────────────
const SHINY_ODDS = 4096;
function rollShiny() {
    const rolls = gameState.shinyCharm ? 3 : 1;
    for (let i = 0; i < rolls; i++) if (Math.random() < 1 / SHINY_ODDS) return true;
    return false;
}

// Wild Pokémon keep pace with your Journey: their level tracks the next
// stage you need to clear, with rarer finds a few levels higher.
function getWildLevel(rarity) {
    const next = CAMPAIGN_ROADMAP.find(st => st.stageId === gameState.unlockedStages)
        || CAMPAIGN_ROADMAP.filter(st => st.stageId <= gameState.unlockedStages).pop()
        || CAMPAIGN_ROADMAP[0];
    const base = Math.max(3, Math.round((next ? next.level : 5) * 0.7));
    const bonus = { Common: 0, Rare: 2, Epic: 4, Legendary: 6 }[rarity] || 0;
    return Math.min(100, base + bonus + Math.floor(Math.random() * 3));
}

// Twinkling four-point stars, the classic "shiny" sparkle
function sparkleBurst(container, count = 10) {
    if (!container) return;
    for (let i = 0; i < count; i++) {
        const st = document.createElement('div');
        st.className = 'shiny-star';
        const ang = (i / count) * Math.PI * 2;
        const r = 30 + Math.random() * 40;
        st.style.cssText = `--sx:${(Math.cos(ang) * r).toFixed(1)}px;--sy:${(Math.sin(ang) * r).toFixed(1)}px;--sd:${(i * 0.06).toFixed(2)}s;--ss:${(10 + Math.random() * 12).toFixed(1)}px;`;
        container.appendChild(st);
        setTimeout(() => st.remove(), 1600);
    }
    playShinyChime();
}
function playShinyChime() {
    [1319, 1760, 2093, 2637].forEach((f, i) => setTimeout(() => playSynthSound(f, 'sine', 0.18, 0.07), i * 90));
}

// Poké Ball throw → Pokémon pulled in → wobbles → click (or it breaks free)
function playCatchAnimation(isCaptured, onDone) {
    const box = document.getElementById('wildDisplayBox');
    const graphicEl = document.getElementById('wildPokemonGraphic');
    const ballSvg = `<img src="${ballIconUrl(gameState.selectedBall, true)}" alt="">`;
    const ball = document.createElement('div');
    ball.className = 'catch-ball is-throw';
    ball.innerHTML = ballSvg;
    box.appendChild(ball);
    // Failed catches still wobble 0–2 times before breaking out
    const shakes = isCaptured ? 3 : Math.floor(Math.random() * 3);
    const t0 = 520;
    setTimeout(() => {                          // ball opens: flash & pull the Pokémon in
        playSynthSound(1600, 'square', 0.08, 0.05);
        box.classList.add('is-catch-flash');
        graphicEl.classList.add('is-caught-in');
    }, t0);
    setTimeout(() => { ball.className = 'catch-ball is-drop'; box.classList.remove('is-catch-flash'); }, t0 + 380);
    let t = t0 + 380 + 420;
    for (let i = 0; i < shakes; i++) {
        setTimeout(() => { ball.className = 'catch-ball is-shake'; void ball.offsetWidth; playSynthSound(300, 'triangle', 0.08, 0.12); }, t);
        t += 700;
    }
    setTimeout(() => {
        if (isCaptured) {
            ball.className = 'catch-ball is-caught';
            sparkleBurst(box, 8);
        } else {
            ball.className = 'catch-ball is-break';
            box.classList.add('is-catch-flash');
            graphicEl.classList.remove('is-caught-in');
            setTimeout(() => box.classList.remove('is-catch-flash'), 250);
        }
        setTimeout(() => { ball.remove(); onDone(); }, isCaptured ? 900 : 450);
    }, t);
}

window.triggerCatchMinigame = function() {
    if (!gameState.catchMinigame.active || !gameState.currentEncounter) return;
    gameState.catchMinigame.active = false;
    document.getElementById('timingRingContainer').classList.add('hidden');

    const scoreScale = gameState.catchMinigame.ringScale;
    let catchPhrase = "Scanned";
    let accuracyModifier = 1.0;

    if (scoreScale <= 0.35) { catchPhrase = t('timing.excellent'); accuracyModifier = 2.5; playSuccessCapture(); }
    else if (scoreScale <= 0.7) { catchPhrase = t('timing.great'); accuracyModifier = 1.6; playBeep(); }
    else { catchPhrase = t('timing.good'); accuracyModifier = 1.0; playBeep(); }

    const pokemon = gameState.currentEncounter;
    
    // Special legendary encounters have 100% catch rate
    if (pokemon.isSpecialLegendary) {
        catchPhrase = t('timing.legendary');
        accuracyModifier = 999.0; // Effectively 100% catch rate
        playSuccessCapture();
    }
    
    let baseRate = 0.50; 
    if (pokemon.rarity === 'Rare') baseRate = 0.35;
    if (pokemon.rarity === 'Epic') baseRate = 0.18;
    if (pokemon.rarity === 'Legendary') baseRate = 0.05; 

    let coreModifier = 1.0;
    if (gameState.selectedBall === 'great') coreModifier = 1.5;
    if (gameState.selectedBall === 'ultra') coreModifier = 2.2;
    if (gameState.selectedBall === 'master') coreModifier = 12.0; 

    const finalProbability = baseRate * coreModifier * accuracyModifier;
    // Shiny Pokémon have a guaranteed 90% catch rate floor
    const finalCatchProbability = gameState.encounterShiny ? Math.max(finalProbability, 0.9) : finalProbability;
    const rollChance = Math.random();
    const isCaptured = (rollChance <= finalCatchProbability);
    const wasShiny = gameState.encounterShiny;

    const catchBtn = document.getElementById('catchBtn');
    catchBtn.disabled = true;
    catchBtn.className = "w-full py-4 bg-slate-900 text-slate-500 font-extrabold uppercase rounded-2xl border border-slate-800 tracking-wider flex items-center justify-center gap-2 cursor-not-allowed";
    catchBtn.innerHTML = `<span>…</span>`;
    document.getElementById('spinBtn').disabled = true;
    playCatchAnimation(isCaptured, () => {
        document.getElementById('spinBtn').disabled = false;
        finishCatchAttempt(pokemon, isCaptured, wasShiny, catchPhrase);
    });
};

function finishCatchAttempt(pokemon, isCaptured, wasShiny, catchPhrase) {
    const nameEl = document.getElementById('wildPokemonName');
    const graphicEl = document.getElementById('wildPokemonGraphic');
    const detailsEl = document.getElementById('wildPokemonDetails');

    if (isCaptured) {
        playSuccessCapture();
        const catchUid = nextCatchUid++;
        const caughtLevel = pokemon.level || 1;
        // Caught at its wild level, knowing its official moves for that level
        const startMoves = pokemon.moves && pokemon.moves.length ? pokemon.moves.slice(0, 4) : getMovesForLevel(pokemon.id, caughtLevel);
        const caughtPokemon = {
            uid: catchUid, id: pokemon.id, name: pokemon.name, type1: pokemon.type1, type2: pokemon.type2,
            sprite: pixelSprite(pokemon.id, wasShiny), hp: pokemon.hp, atk: pokemon.atk, def: pokemon.def,
            spAtk: pokemon.spAtk || 60, spDef: pokemon.spDef || 60, speed: pokemon.speed || 60,
            moves: startMoves, isShiny: wasShiny, heldItem: null, level: caughtLevel, xp: 0, friendship: 50, battleCount: 0,
            caughtAt: Date.now(), rarity: pokemon.rarity || 'Common'
        };
        gameState.pcBox.push(caughtPokemon);

        const alreadyRegistered = gameState.pokedex.find(p => p.id === pokemon.id && p.isShiny === wasShiny);
        if (!alreadyRegistered) gameState.pokedex.push(caughtPokemon);

        let coinGain = 20;
        if (pokemon.rarity === 'Rare') coinGain = 50;
        if (pokemon.rarity === 'Epic') coinGain = 120;
        if (pokemon.rarity === 'Legendary') coinGain = 300;

        let matchedBonus = false;
        if(pokemon.rarity === gameState.wheel.targetRarity) { coinGain *= 2; matchedBonus = true; }

        addCoins(coinGain);
        addXP(coinGain / 2);
        gameEvent('catch', { pokemon: caughtPokemon, rarity: pokemon.rarity, shiny: wasShiny });

        // New species for the Pokédex pay a discovery bonus
        const newSpecies = !gameState.pokedex.some(p => p.id === pokemon.id && p !== caughtPokemon);
        if (newSpecies) { addCoins(25); coinGain += 25; }
        showNotification(`Gotcha! ${pokemon.name} was caught!`, `Lv. ${caughtPokemon.level} · +${coinGain} Coins${newSpecies ? ' (new Pokédex entry!)' : ''}`, wasShiny ? 'shiny' : 'success');
        graphicEl.className = "wild-sprite z-10 is-caught-in";
        nameEl.innerHTML = `<span class="text-green-400">Gotcha!</span> ${pokemon.name.toUpperCase()}`;
        detailsEl.innerHTML = `<span class="text-slate-400">${t('scanner.capturedWith')}${catchPhrase}!</span><br><span class="text-yellow-400 font-bold">+${coinGain} ${t('common.coins')} | +${coinGain/2} ${t('common.exp')}</span> ${matchedBonus ? '(' + t('scanner.perfectMatch') + ')' : ''}`;
    } else {
        playFailCapture();
        showNotification(`Oh no! ${pokemon.name} broke free!`, `It fled before you could throw another ball.`, 'error');
        graphicEl.className = "wild-sprite z-10 is-fleeing";
        nameEl.innerHTML = `<span class="text-red-500">${t('scanner.signalLost')}</span> ${pokemon.name}`;
        detailsEl.innerHTML = `<span class="text-slate-500">${t('scanner.targetEscaped')}</span>`;
    }

    const catchBtn = document.getElementById('catchBtn');
    catchBtn.disabled = true;
    catchBtn.className = "w-full py-4 bg-slate-900 text-slate-500 font-extrabold uppercase rounded-2xl border border-slate-800 tracking-wider flex items-center justify-center gap-2 cursor-not-allowed";
    catchBtn.innerHTML = `<i class="fas fa-radar text-lg"></i> <span>${t('scanner.scanDone')}</span>`;
    
    gameState.currentEncounter = null;
    updateTargetRarityObjective();
    saveProgress();
}
