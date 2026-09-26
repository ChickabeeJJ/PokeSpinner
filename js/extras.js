// PokeSpinner — Auto battler, Shiny Charm, gym puzzles and starter selection.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
  // MODULE 9: AUTO BATTLER
  // ==========================================
  let autoBattlerIntervalId = null;
  let autoBattlerRunning = false;
  let autoBattlerBusy = false;

  function updateAutoBattlerUI() {
      var owned = gameState.autoBattler || false;
      var card = document.getElementById('autoBattlerShopCard');
      var panel = document.getElementById('autoBattlerPanel');
      var ownedBadge = document.getElementById('autoBattlerOwned');
      var buyBtn = document.getElementById('autoBattlerBuyBtn');
      if (owned) {
          if (card) card.classList.add('border-amber-500/50');
          if (ownedBadge) ownedBadge.textContent = '\u2705 Owned';
          if (buyBtn) { buyBtn.textContent = t('common.owned'); buyBtn.disabled = true; }
          if (panel) panel.classList.remove('hidden');
      } else {
          if (panel) panel.classList.add('hidden');
      }
      var sel = document.getElementById('autoBattlerStageSelect');
      if (sel && owned) {
          var currentVal = gameState.autoBattlerStage;
          sel.innerHTML = `<option value="">${t('autoBattler.selectStage')}</option>`;
          var maxStage = gameState.unlockedStages || 1;
          CAMPAIGN_ROADMAP.forEach(function(s) {
              if (s.stageId <= maxStage) {
                  var opt = document.createElement('option');
                  opt.value = String(s.stageId);
                  opt.textContent = 'Stage ' + s.stageId + ': ' + s.name + ' (' + s.trainer + ') \u2014 ' + formatNum(s.reward) + ' coins';
                  if (String(s.stageId) === String(currentVal)) opt.selected = true;
                  sel.appendChild(opt);
              }
          });
      }
      var startBtn = document.getElementById('autoBattlerStartBtn');
      if (startBtn) {
          if (autoBattlerRunning) { startBtn.textContent = t('autoBattler.stop'); startBtn.className = 'px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-bold uppercase rounded-xl transition shrink-0'; }
          else { startBtn.textContent = t('autoBattler.start'); startBtn.className = 'px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase rounded-xl transition shrink-0'; }
      }
      var badge = document.getElementById('autoBattlerStatusBadge');
      if (badge) {
          if (autoBattlerRunning) { badge.textContent = t('autoBattler.running'); badge.className = 'text-[9px] font-bold px-2 py-1 rounded bg-amber-900/60 text-amber-400 animate-pulse'; }
          else { badge.textContent = t('autoBattler.idle'); badge.className = 'text-[9px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-400'; }
      }
  }

  window.buyAutoBattler = function() {
      initAudio();
      if (gameState.autoBattler) { showNotification('Already Owned', 'Auto Battler is already active.', 'info'); return; }
      var cost = 50000;
      if (gameState.coins < cost) { showNotification('No Funds Available', 'Requires ' + formatNum(cost) + ' Coins.', 'error'); return; }
      spendCoins(cost);
      gameState.autoBattler = true;
      saveProgress();
      playConfirmSound();
      showNotification('Auto Battler Unlocked!', 'Select a stage below and start farming!', 'success');
      updateAutoBattlerUI();
  };

  window.toggleAutoBattler = function() {
      if (autoBattlerRunning) stopAutoBattler(); else startAutoBattler();
  };

  function autoBattlerLog(msg) {
      var log = document.getElementById('autoBattlerLog');
      if (!log) return;
      log.classList.remove('hidden');
      var now = new Date();
      var ts = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
      var line = document.createElement('div');
      line.innerHTML = '<span style="color:#475569">[' + ts + ']</span> ' + msg;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
      var lines = log.querySelectorAll('div');
      if (lines.length > 80) lines[0].remove();
  }

  function startAutoBattler() {
      if (!gameState.autoBattler) return;
      var sel = document.getElementById('autoBattlerStageSelect');
      var stageId = sel ? parseFloat(sel.value) : null;
      if (!stageId || isNaN(stageId)) { showNotification('No Stage Selected', 'Pick a campaign stage to farm first.', 'error'); return; }
      var stage = CAMPAIGN_ROADMAP.find(function(s) { return s.stageId === stageId; });
      if (!stage) { showNotification('Stage Not Found', 'Invalid stage.', 'error'); return; }
      var fighters = typeof getBattleFighterPool === 'function' ? getBattleFighterPool() : [];
      if (!fighters || fighters.length === 0) { showNotification('No Team', 'Assign at least one Pokemon to your team first.', 'error'); return; }
      gameState.autoBattlerStage = stageId;
      autoBattlerRunning = true;
      autoBattlerBusy = false;
      saveProgress();
      updateAutoBattlerUI();
      autoBattlerLog('\u25b6 Started \u2014 Stage ' + stageId + ': ' + stage.name);
      runAutoBattleRound();
      autoBattlerIntervalId = setInterval(function() {
          if (!autoBattlerRunning) { clearInterval(autoBattlerIntervalId); return; }
          if (!autoBattlerBusy) runAutoBattleRound();
      }, 4500);
  }

  function stopAutoBattler() {
      autoBattlerRunning = false;
      autoBattlerBusy = false;
      if (autoBattlerIntervalId) { clearInterval(autoBattlerIntervalId); autoBattlerIntervalId = null; }
      updateAutoBattlerUI();
      autoBattlerLog('\u23f9 Stopped.');
  }

  function runAutoBattleRound() {
      if (!autoBattlerRunning || autoBattlerBusy) return;
      autoBattlerBusy = true;
      var stageId = gameState.autoBattlerStage;
      var stage = CAMPAIGN_ROADMAP.find(function(s) { return s.stageId === stageId; });
      if (!stage) { stopAutoBattler(); autoBattlerBusy = false; return; }
      var fighters = typeof getBattleFighterPool === 'function' ? getBattleFighterPool() : [];
      if (!fighters || fighters.length === 0) { autoBattlerLog('\u26a0 No team. Stopping.'); stopAutoBattler(); autoBattlerBusy = false; return; }
      var fighter = fighters[0];
      var fighterLevel = fighter.level || 1;
      var levelMul = 1 + ((fighterLevel - 1) * 0.05);
      var fighterAtk = (fighter.atk || 50) * levelMul;
      var fighterDef = fighter.def || 50;
      var fighterHPBase = Math.max(1, Math.round((fighter.hp + (fighter.hpBonus || 0)) * levelMul));
      var teamCount = fighters.length;
      var remainingHP = fighterHPBase * teamCount;
      var teamSize = Math.max(1, Math.min(4, stage.teamSize || 1));
      var playerWins = true;
      for (var i = 0; i < teamSize; i++) {
          var eLvl = stage.level + (i * 4);
          var eHP = 60 + (eLvl * 3);
          var eAtk = 50 + (eLvl * 1.2);
          var playerDmg = Math.max(3, Math.round(((2 * fighterLevel / 5 + 2) * 60 * (fighterAtk / Math.max(1, eAtk * 0.8))) / 50 + 2));
          var enemyDmg = Math.max(3, Math.round(((2 * eLvl / 5 + 2) * 60 * (eAtk / Math.max(1, fighterDef))) / 50 + 2));
          var turns = Math.ceil(eHP / playerDmg);
          remainingHP -= turns * enemyDmg;
          if (remainingHP <= 0) { playerWins = false; break; }
      }
      if (playerWins) {
          var reward = stage.reward;
          var xpAward = stage.level * 18;
          addCoins(reward);
          addXP(Math.round(reward / 2));
          fighter.xp = (fighter.xp || 0) + xpAward;
          var nxtXp = (fighter.level || 1) * 100;
          var leveled = false;
          while (fighter.xp >= nxtXp) {
              fighter.xp -= nxtXp;
              fighter.level = (fighter.level || 1) + 1;
              nxtXp = fighter.level * 100;
              if (typeof applyLevelUpMoves === 'function') applyLevelUpMoves(fighter);
              leveled = true;
          }
          autoBattlerLog('\u2705 Stage ' + stageId + ' won! +' + formatNum(reward) + ' coins' + (leveled ? ' | ' + fighter.name + ' \u2192 Lv' + fighter.level : ''));
          saveProgress();
      } else {
          autoBattlerLog('\u274c Stage ' + stageId + ': defeat \u2014 your team may be too weak.');
      }
      autoBattlerBusy = false;
  }

// ==========================================
// MODULE 10: SHINY CHARM
// ==========================================
function updateShinyCharmUI() {
    const owned = !!gameState.shinyCharm;
    const ownedEl = document.getElementById('shinyCharmOwned');
    const buyBtn  = document.getElementById('shinyCharmBuyBtn');
    const card    = document.getElementById('shinyCharmShopCard');
    if (ownedEl) ownedEl.textContent = owned ? '\u2728 Owned' : 'Not Owned';
    if (card && owned) card.classList.add('border-pink-600/50');
    if (buyBtn) {
        if (owned) {
            buyBtn.textContent = t('common.owned');
            buyBtn.disabled = true;
            buyBtn.className = 'g-btn sm';
        } else {
            buyBtn.textContent = t('shop.buy');
            buyBtn.disabled = false;
            buyBtn.className = 'g-btn green sm';
        }
    }
}

window.buyShinyCharm = function() {
    initAudio();
    if (gameState.shinyCharm) { showNotification('Already Owned', 'Shiny Charm is already active!', 'info'); return; }
    const cost = 35000;
    if (gameState.coins < cost) { showNotification('No Funds Available', 'Requires ' + formatNum(cost) + ' Coins.', 'error'); return; }
    spendCoins(cost);
    gameState.shinyCharm = true;
    saveProgress();
    playConfirmSound();
    showNotification('\u2728 Shiny Charm!', 'Shiny odds tripled to about 1/1365. Good luck, trainer!', 'shiny');
    updateShinyCharmUI();
};

// ── Gym Puzzle system ──────────────────────────────────────────────────
let _pendingGymStage = null;
let _pendingGymPuzzle = null;

function showGymPuzzle(stage) {
    _pendingGymStage = stage;
    _pendingGymPuzzle = stage.gymPuzzle;
    const overlay = document.getElementById('gymPuzzleOverlay');
    document.getElementById('gymPuzzleIcon').textContent = stage.icon || '🏟️';
    document.getElementById('gymPuzzleQuestion').textContent = stage.gymPuzzle.question;
    document.getElementById('gymPuzzleResult').className = 'text-sm font-bold mt-4 text-center hidden';
    document.getElementById('gymPuzzleHint').className = 'text-xs text-yellow-400/60 mt-4 italic hidden';
    document.getElementById('gymPuzzleHint').textContent = t('battle.hint') + ': ' + (stage.gymPuzzle.hint || '');
    const optionsEl = document.getElementById('gymPuzzleOptions');
    optionsEl.innerHTML = stage.gymPuzzle.options.map((opt, i) => `
        <button onclick="answerGymPuzzle(${i})" class="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-yellow-500/50 text-sm text-slate-200 font-medium transition-all">
            <span class="text-yellow-400 font-black mr-2">${String.fromCharCode(65+i)}.</span> ${opt}
        </button>`).join('');
    overlay.style.display = 'flex';
}

function answerGymPuzzle(selectedIdx) {
    const puzzle = _pendingGymPuzzle;
    const resultEl = document.getElementById('gymPuzzleResult');
    const optionsEl = document.getElementById('gymPuzzleOptions');
    // Highlight correct/incorrect
    const btns = optionsEl.querySelectorAll('button');
    btns.forEach((btn, i) => {
        btn.disabled = true;
        if (i === puzzle.answer) btn.className = btn.className.replace('bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-yellow-500/50', 'bg-green-900/60 border-green-500');
        else if (i === selectedIdx) btn.className = btn.className.replace('bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-yellow-500/50', 'bg-red-900/60 border-red-500');
    });
    if (selectedIdx === puzzle.answer) {
        resultEl.textContent = t('gym.correct');
        resultEl.className = 'text-sm font-bold mt-4 text-center text-green-400';
        resultEl.classList.remove('hidden');
        // Mark puzzle as solved and proceed to gym after delay
        if (!gameState.solvedGymPuzzles) gameState.solvedGymPuzzles = [];
        if (!gameState.solvedGymPuzzles.includes(_pendingGymStage.stageId)) {
            gameState.solvedGymPuzzles.push(_pendingGymStage.stageId);
            saveProgress();
        }
        setTimeout(() => {
            document.getElementById('gymPuzzleOverlay').style.display = 'none';
            launchStagePrep(_pendingGymStage);
        }, 1200);
    } else {
        resultEl.textContent = t('gym.wrong');
        resultEl.className = 'text-sm font-bold mt-4 text-center text-red-400';
        resultEl.classList.remove('hidden');
        setTimeout(() => {
            btns.forEach((btn, i) => {
                btn.disabled = false;
                btn.className = btn.className.replace(i === puzzle.answer ? 'bg-green-900/60 border-green-500' : 'bg-red-900/60 border-red-500', 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-yellow-500/50');
            });
            resultEl.classList.add('hidden');
        }, 1600);
    }
}

function showHint() {
    const hintEl = document.getElementById('gymPuzzleHint');
    hintEl.classList.remove('hidden');
}

function closeGymPuzzle() {
    document.getElementById('gymPuzzleOverlay').style.display = 'none';
    _pendingGymStage = null;
    _pendingGymPuzzle = null;
}

window.answerGymPuzzle = answerGymPuzzle;
window.showHint = showHint;
window.closeGymPuzzle = closeGymPuzzle;

// ── Starter Pokémon selection ──────────────────────────────────────────
const STARTER_POKEMON = [
    // Gen 1
    { id: 1,   name: "Bulbasaur",   gen: 1, type: "Grass/Poison", color: "#4ade80" },
    { id: 4,   name: "Charmander",  gen: 1, type: "Fire",         color: "#fb923c" },
    { id: 7,   name: "Squirtle",    gen: 1, type: "Water",        color: "#60a5fa" },
    // Gen 2
    { id: 152, name: "Chikorita",   gen: 2, type: "Grass",        color: "#4ade80" },
    { id: 155, name: "Cyndaquil",   gen: 2, type: "Fire",         color: "#fb923c" },
    { id: 158, name: "Totodile",    gen: 2, type: "Water",        color: "#60a5fa" },
    // Gen 3
    { id: 252, name: "Treecko",     gen: 3, type: "Grass",        color: "#4ade80" },
    { id: 255, name: "Torchic",     gen: 3, type: "Fire",         color: "#fb923c" },
    { id: 258, name: "Mudkip",      gen: 3, type: "Water/Ground", color: "#60a5fa" },
    // Gen 4
    { id: 387, name: "Turtwig",     gen: 4, type: "Grass",        color: "#4ade80" },
    { id: 390, name: "Chimchar",    gen: 4, type: "Fire",         color: "#fb923c" },
    { id: 393, name: "Piplup",      gen: 4, type: "Water",        color: "#60a5fa" },
    // Gen 5
    { id: 495, name: "Snivy",       gen: 5, type: "Grass",        color: "#4ade80" },
    { id: 498, name: "Tepig",       gen: 5, type: "Fire",         color: "#fb923c" },
    { id: 501, name: "Oshawott",    gen: 5, type: "Water",        color: "#60a5fa" },
    // Gen 6
    { id: 650, name: "Chespin",     gen: 6, type: "Grass",        color: "#4ade80" },
    { id: 653, name: "Fennekin",    gen: 6, type: "Fire",         color: "#fb923c" },
    { id: 656, name: "Froakie",     gen: 6, type: "Water",        color: "#60a5fa" },
    // Gen 7
    { id: 722, name: "Rowlet",      gen: 7, type: "Grass/Flying", color: "#4ade80" },
    { id: 725, name: "Litten",      gen: 7, type: "Fire",         color: "#fb923c" },
    { id: 728, name: "Popplio",     gen: 7, type: "Water",        color: "#60a5fa" },
    // Gen 8
    { id: 810, name: "Grookey",     gen: 8, type: "Grass",        color: "#4ade80" },
    { id: 813, name: "Scorbunny",   gen: 8, type: "Fire",         color: "#fb923c" },
    { id: 816, name: "Sobble",      gen: 8, type: "Water",        color: "#60a5fa" },
    // Gen 9
    { id: 906, name: "Sprigatito",  gen: 9, type: "Grass",        color: "#4ade80" },
    { id: 909, name: "Fuecoco",     gen: 9, type: "Fire",         color: "#fb923c" },
    { id: 912, name: "Quaxly",      gen: 9, type: "Water",        color: "#60a5fa" },
];

async function showStarterSelectionScreen() {
    const overlay = document.getElementById('starterSelectionOverlay');
    const grid = document.getElementById('starterGrid');
    if (!overlay || !grid) return;
    overlay.style.removeProperty('display');
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    grid.innerHTML = `<div class="col-span-3 text-center text-slate-400 py-8 animate-pulse">${t('starter.loading')}</div>`;
    const starterData = await Promise.all(STARTER_POKEMON.map(async s => {
        try {
            const pdata = await fetchPokemonData(s.id);
            return { ...s, sprite: pdata.sprite, hp: pdata.hp, atk: pdata.atk, def: pdata.def, spAtk: pdata.spAtk || pdata.atk, spDef: pdata.spDef || pdata.def, speed: pdata.speed || 60 };
        } catch { return { ...s, sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s.id}.png`, hp:45, atk:49, def:49, spAtk:65, spDef:65, speed:45 }; }
    }));
    grid.innerHTML = starterData.map(s => `
        <div style="border-color:${s.color}33" class="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:scale-105 hover:bg-slate-750 group">
            <img src="${s.sprite}" alt="${s.name}" class="w-16 h-16 object-contain drop-shadow-lg" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s.id}.png'"/>
            <span class="text-xs font-black text-white capitalize">${s.name}</span>
            <span class="text-[9px] font-bold text-slate-400 uppercase">${s.type}</span>
            <span class="text-[9px] text-slate-500 uppercase tracking-wider">${t('starter.gen')} ${s.gen}</span>
            <button onclick="selectStarter(${s.id})" style="background-color:${s.color}22; border-color:${s.color}55; color:${s.color}" class="mt-1 w-full py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all duration-150 hover:opacity-80 active:scale-95 cursor-pointer">${t('starter.select')}</button>
        </div>
    `).join('');
}

async function selectStarter(pokemonId) {
    const overlay = document.getElementById('starterSelectionOverlay');
    try {
        const pdata = await fetchPokemonData(pokemonId, 5);
        const starter = {
            uid: nextCatchUid++,
            id: pdata.id, name: pdata.name, type1: pdata.type1, type2: pdata.type2 || null,
            sprite: pdata.sprite, level: 5, xp: 0,
            hp: pdata.hp, atk: pdata.atk, def: pdata.def,
            spAtk: pdata.spAtk || pdata.atk, spDef: pdata.spDef || pdata.def, speed: pdata.speed || 45,
            // Official level-up moves known at Lv. 5
            moves: pdata.moves && pdata.moves.length ? pdata.moves : ['tackle'], isShiny: false,
            friendship: 70, battleCount: 0, caughtAt: Date.now(), rarity: 'Rare'
        };
        gameState.pcBox.push(starter);
        if (!gameState.pokedex.some(p => p.id === starter.id && !p.isShiny)) gameState.pokedex.push(starter);
        // The starter leads the team straight away so the Journey is playable immediately
        if (!gameState.team) gameState.team = [];
        if (!gameState.team.some(Boolean)) gameState.team[0] = starter.uid;
        gameState.starterSelected = true;
        if (overlay) overlay.style.display = 'none';
        showNotification('✨ Partner Chosen!', `${starter.name} joined your team at Lv 5!`, 'success');
        saveProgress();
        updateUI();
    } catch(e) {
        showNotification('Error', 'Could not load starter data. Try again.', 'error');
        console.error(e);
    }
}
window.selectStarter = selectStarter;
