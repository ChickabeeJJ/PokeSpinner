// moveBankPatch.js — non-destructive patch that implements a move bank and prevents re-prompting
(function(){
  // simple localStorage-backed move bank
  const KEY_BANK = 'ps_moveBank_v1';
  const KEY_DECLINED = 'ps_declinedMoves_v1';

  function loadBank(){ try{ return JSON.parse(localStorage.getItem(KEY_BANK) || '[]'); }catch(e){ return []; } }
  function saveBank(bank){ localStorage.setItem(KEY_BANK, JSON.stringify(bank)); }
  function loadDeclined(){ try{ return JSON.parse(localStorage.getItem(KEY_DECLINED) || '{}'); }catch(e){ return {}; } }
  function saveDeclined(obj){ localStorage.setItem(KEY_DECLINED, JSON.stringify(obj)); }

  window.moveBank = {
    add: function(pokemonId, move){
      const bank = loadBank();
      bank.push({pokemonId:pokemonId, move:move, when:Date.now()});
      saveBank(bank);
      console.debug('moveBank: added', pokemonId, move);
    },
    list: function(){ return loadBank(); },
    clear: function(){ localStorage.removeItem(KEY_BANK); }
  };

  // Mark a particular Pokemon+move pair as declined so the modal won't show again
  window.moveBankDeclined = {
    set: function(pokemonId, moveName){ const d = loadDeclined(); d[pokemonId+'::'+moveName]=true; saveDeclined(d); },
    isDeclined: function(pokemonId, moveName){ const d = loadDeclined(); return !!d[pokemonId+'::'+moveName]; },
    reset: function(){ localStorage.removeItem(KEY_DECLINED); }
  };

  // Patch global learnMoveDecline if present — wrap to store in move bank and mark declined
  function tryPatch(){
    if(typeof window.learnMoveDecline === 'function'){
      const orig = window.learnMoveDecline;
      window.learnMoveDecline = function(){
        try{
          // attempt to read modal contents to get pokemon id/name and move
          const pokeEl = document.getElementById('learnMoveModalPokemon');
          const moveNameEl = document.getElementById('learnMoveModalMoveName');
          const pid = (pokeEl && pokeEl.dataset && pokeEl.dataset.pokemonId) || (pokeEl && pokeEl.textContent) || 'unknown';
          const moveName = (moveNameEl && moveNameEl.textContent) || 'unknown';
          // add to bank
          window.moveBank.add(pid, {name:moveName});
          window.moveBankDeclined.set(pid, moveName);
        }catch(e){ console.warn('moveBankPatch: decline wrapper failed', e); }
        // call original to preserve behavior
        return orig.apply(this, arguments);
      };
      console.info('moveBankPatch: patched learnMoveDecline');
    }
    // If there's a function that opens the learn move modal, patch it to skip declined moves
    if(typeof window.showLearnMoveModal === 'function'){
      const origShow = window.showLearnMoveModal;
      window.showLearnMoveModal = function(pokemonId, moveData){
        try{
          if(window.moveBankDeclined.isDeclined(pokemonId, moveData && moveData.name)){
            console.info('moveBankPatch: skipping learn prompt for', pokemonId, moveData && moveData.name);
            // instead auto-add to bank (if not already) and return
            window.moveBank.add(pokemonId, moveData || {name:'unknown'});
            return; // do not show modal
          }
        }catch(e){/* ignore */}
        return origShow.apply(this, arguments);
      };
      console.info('moveBankPatch: patched showLearnMoveModal');
    }
  }

  // run patch on DOM ready
  if(document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(tryPatch,120);
  else document.addEventListener('DOMContentLoaded', tryPatch);

  // expose debug helpers
  window._moveBankKeys = { bankKey: KEY_BANK, declinedKey: KEY_DECLINED };
})();
