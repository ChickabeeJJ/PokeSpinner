// battle.js - Phase 1 helpers for battle layout and improved animations
(function(){
  function $(sel){ return document.querySelector(sel); }

  function isNumeric(n){ return !isNaN(parseInt(n)); }

  // helper to get a backsprite from PokeAPI raw sprites if numeric id provided
  function pokeBackSpriteUrl(id){
    // use the simple back sprite from the PokeAPI sprites repo
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/' + id + '.png';
  }

  window.showBattleScreen = function(opponentSpriteSrc, playerBackSpriteSrc, mapSrc, opponentName){
    const screen = $("#battleScreen");
    const mapImg = $("#battleMapBg");
    const oppImg = $("#opponentSprite");
    const plyImg = $("#playerBackSprite");
    const oppName = $("#opponentName");
    if(mapSrc) mapImg.src = mapSrc;
    // if caller passed numeric ids, convert to URLs
    if(isNumeric(opponentSpriteSrc)) oppImg.src = pokeBackSpriteUrl(opponentSpriteSrc).replace('/back/','/front/');
    else if(opponentSpriteSrc) oppImg.src = opponentSpriteSrc;
    if(isNumeric(playerBackSpriteSrc)) plyImg.src = pokeBackSpriteUrl(playerBackSpriteSrc);
    else if(playerBackSpriteSrc) plyImg.src = playerBackSpriteSrc;
    if(opponentName) oppName.textContent = opponentName;
    screen.classList.add('active');
  }

  window.hideBattleScreen = function(){
    const screen = $("#battleScreen");
    screen.classList.remove('active');
  }

  // create small particle effects on hit
  function spawnParticles(x,y,count){
    const container = $("#battleMap");
    if(!container) return;
    for(let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'particle-spark';
      p.style.left = x + Math.round((Math.random()-0.5)*80) + 'px';
      p.style.top = y + Math.round((Math.random()-0.5)*40) + 'px';
      p.style.background = i%2? 'radial-gradient(circle,#fff,#fff8,#f43f5e)': 'radial-gradient(circle,#fff,#fff8,#fbbf24)';
      container.appendChild(p);
      setTimeout(()=>{ p.remove(); }, 900);
    }
  }

  function showDamageNumber(x,y,amount,opts){
    const container = $("#battleMap");
    if(!container) return;
    const n = document.createElement('div');
    n.className = 'damage-number';
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    n.textContent = amount > 0 ? '-' + amount : '0';
    container.appendChild(n);
    requestAnimationFrame(()=>{ n.style.transform = 'translateY(-60px)'; n.style.opacity = '0'; });
    setTimeout(()=>n.remove(),1000);
  }

  // simple HP tween
  function tweenHPBar(bar, from, to, dur){
    const start = performance.now();
    function step(now){
      const t = Math.min(1,(now-start)/dur);
      const val = Math.round(from + (to-from)*t);
      bar.style.width = Math.max(0,Math.min(100,val)) + '%';
      if(t<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  window.animatePlayerAttack = function(damage){
    const opponent = $("#opponentSprite");
    if(!opponent) return;
    opponent.classList.remove('shake');
    void opponent.offsetWidth;
    opponent.classList.add('shake');
    const bar = $("#opponentHPBar");
    if(bar){
      bar.classList.add('pulse-hit'); setTimeout(()=>bar.classList.remove('pulse-hit'),400);
      // compute new width if damage provided
      if(typeof damage === 'number'){
        const current = parseFloat(bar.style.width) || 100;
        const newVal = Math.max(0, current - damage);
        spawnParticles(opponent.getBoundingClientRect().left - document.querySelector('#battleMap').getBoundingClientRect().left + 40,
                       opponent.getBoundingClientRect().top - document.querySelector('#battleMap').getBoundingClientRect().top + 40, 6);
        showDamageNumber(opponent.getBoundingClientRect().left - document.querySelector('#battleMap').getBoundingClientRect().left + 20,
                         opponent.getBoundingClientRect().top - document.querySelector('#battleMap').getBoundingClientRect().top, Math.round(damage));
        tweenHPBar(bar, current, newVal, 600);
      }
    }
  }

  window.animateOpponentAttack = function(damage){
    const player = $("#playerBackSprite");
    if(!player) return;
    player.classList.remove('shake');
    void player.offsetWidth;
    player.classList.add('shake');
    // future: animate player HP bar if exposed
    if(typeof damage === 'number'){
      const bar = $("#playerHPBar");
      if(bar){ const current = parseFloat(bar.style.width) || 100; const newVal = Math.max(0,current-damage); tweenHPBar(bar,current,newVal,600); }
    }
  }

  window.updateHPBar = function(id, percent){
    const bar = document.getElementById(id+'HPBar');
    if(bar) tweenHPBar(bar, parseFloat(bar.style.width) || 100, percent, 600);
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
