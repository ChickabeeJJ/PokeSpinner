// PokeSpinner — Synthesised sound effects (Web Audio).
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// MODULE 2: AUDIO SYNTHESIZER
// ==========================================
const AudioCtor = window.AudioContext || window.webkitAudioContext;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioCtor();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSynthSound(freq, type, duration, gainStart) {
    if (audioMuted) return;
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(gainStart, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        // Protect audio thread
    }
}

function playBeep() { playSynthSound(440, 'sine', 0.1, 0.1); }
function playPrecisionTick() { playSynthSound(600, 'triangle', 0.04, 0.15); }
function playConfirmSound() { playSynthSound(880, 'sine', 0.15, 0.1); }
function playSuccessCapture() {
    setTimeout(() => playSynthSound(523, 'sine', 0.1, 0.15), 0);
    setTimeout(() => playSynthSound(659, 'sine', 0.1, 0.15), 80);
    setTimeout(() => playSynthSound(784, 'sine', 0.1, 0.15), 160);
    setTimeout(() => playSynthSound(1046, 'sine', 0.3, 0.2), 240);
}
function playFailCapture() {
    setTimeout(() => playSynthSound(220, 'triangle', 0.2, 0.15), 0);
    setTimeout(() => playSynthSound(130, 'triangle', 0.3, 0.15), 150);
}
function playCritStrike() { playSynthSound(1200, 'sawtooth', 0.2, 0.2); }
function playNormalHit() { playSynthSound(220, 'sawtooth', 0.15, 0.15); }

window.toggleMute = function() {
    audioMuted = !audioMuted;
    const soundIcon = document.getElementById('soundIcon');
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const settingsSoundText = document.getElementById('settingsSoundText');
    
    if (audioMuted) {
        if (soundIcon) soundIcon.className = "fas fa-volume-mute text-lg text-slate-400";
        if (soundToggleBtn) {
            soundToggleBtn.classList.remove('text-yellow-400');
            soundToggleBtn.classList.add('text-slate-400');
        }
        if (settingsSoundText) settingsSoundText.textContent = t('settings.soundOff');
    } else {
        if (soundIcon) soundIcon.className = "fas fa-volume-up text-lg text-yellow-400";
        if (soundToggleBtn) {
            soundToggleBtn.classList.remove('text-slate-400');
            soundToggleBtn.classList.add('text-yellow-400');
        }
        if (settingsSoundText) settingsSoundText.textContent = t('settings.soundOn');
        initAudio(); // Warm up context on unmute
    }
    const sw = document.getElementById('settingsSoundBtn');
    if (sw) sw.setAttribute('aria-checked', String(!audioMuted));
    try { localStorage.setItem('ps_muted', audioMuted ? '1' : '0'); } catch (e) {}
};
