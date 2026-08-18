// battle.js - Phase 1 helpers for battle layout and simple animations
(function(){
  function $(sel){ return document.querySelector(sel); }

  window.showBattleScreen = function(opponentSpriteSrc, playerBackSpriteSrc, mapSrc, opponentName){
    const screen = $("#battleScreen");
    const mapImg = $("#battleMapBg");
    const oppImg = $("#opponentSprite");
    const plyImg = $("#playerBackSprite");
    const oppName = $("#opponentName");
    if(mapSrc) mapImg.src = mapSrc;
    if(opponentSpriteSrc) oppImg.src = opponentSpriteSrc;
    if(playerBackSpriteSrc) plyImg.src = playerBackSpriteSrc;
    if(opponentName) oppName.textContent = opponentName;
    screen.classList.add('active');
  }

  window.hideBattleScreen = function(){
    const screen = $("#battleScreen");
    screen.classList.remove('active');
  }

  window.animatePlayerAttack = function(){
    const opponent = $("#opponentSprite");
    if(!opponent) return;
    opponent.classList.remove('shake');
    void opponent.offsetWidth;
    opponent.classList.add('shake');
    const bar = $("#opponentHPBar");
    if(bar){ bar.classList.add('pulse-hit'); setTimeout(()=>bar.classList.remove('pulse-hit'),400); }
  }

  window.animateOpponentAttack = function(){
    const player = $("#playerBackSprite");
    if(!player) return;
    player.classList.remove('shake');
    void player.offsetWidth;
    player.classList.add('shake');
  }

  window.updateHPBar = function(id, percent){
    const bar = document.getElementById(id+'HPBar');
    if(bar) bar.style.width = Math.max(0, Math.min(100, percent)) + '%';
  }

  // Expose a tiny API for other game code to hook into
  window.battleUI = {
    show: window.showBattleScreen,
    hide: window.hideBattleScreen,
    animatePlayerAttack: window.animatePlayerAttack,
    animateOpponentAttack: window.animateOpponentAttack,
    updateHPBar: window.updateHPBar
  };

  // auto-hide on ESC
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ window.hideBattleScreen(); } });
})();
