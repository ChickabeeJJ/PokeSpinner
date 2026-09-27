// PokeSpinner — Platform layer (web vs. CrazyGames). Non-commercial fan project: no ads anywhere.
// Loaded first, in <head>. On CrazyGames the game uses the CrazyGames SDK v3 for
// loading/gameplay events and cloud saves, and hides external links, the service
// worker and the install prompt there. Everywhere else nothing changes.
// Force CrazyGames mode locally with ?platform=crazygames.

(function () {
    const qs = new URLSearchParams(location.search);
    let ref = '';
    try { ref = document.referrer || ''; } catch (e) {}
    const onCrazyGames = document.documentElement.dataset.build === 'crazygames'
        || qs.get('platform') === 'crazygames'
        || /(^|\.)crazygames\.[a-z.]+$/i.test(location.hostname)
        || /crazygames\./i.test(ref);

    const Portal = {
        name: onCrazyGames ? 'crazygames' : 'web',
        isCrazyGames: onCrazyGames,
        sdk: null,
        adPlaying: false,
        _gameplay: false,
        _lastMidgame: 0,
        MIDGAME_COOLDOWN_MS: 3 * 60 * 1000,
        ready: null,
    };
    document.documentElement.dataset.platform = Portal.name;

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src; s.async = true;
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    if (onCrazyGames) {
        Portal.ready = loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js')
            .then(() => window.CrazyGames.SDK.init())
            .then(() => { Portal.sdk = window.CrazyGames.SDK; })
            .catch(err => { console.warn('[Portal] CrazyGames SDK unavailable, running without it', err); })
            .then(() => { try { Portal.sdk && Portal.sdk.game.loadingStart(); } catch (e) {} });
    } else {
        Portal.ready = Promise.resolve();
    }

    // ── Game events ───────────────────────────────────────────
    Portal.loadingStop = function () { try { Portal.sdk && Portal.sdk.game.loadingStop(); } catch (e) {} };
    Portal.gameplayStart = function () {
        if (Portal._gameplay || Portal.adPlaying) return;
        Portal._gameplay = true;
        try { Portal.sdk && Portal.sdk.game.gameplayStart(); } catch (e) {}
    };
    Portal.gameplayStop = function () {
        if (!Portal._gameplay) return;
        Portal._gameplay = false;
        try { Portal.sdk && Portal.sdk.game.gameplayStop(); } catch (e) {}
    };
    Portal.happytime = function () { try { Portal.sdk && Portal.sdk.game.happytime(); } catch (e) {} };

    // No ads: this is a non-commercial fan project.

    // ── Storage: CrazyGames data module (synced to the player's account) or localStorage
    Portal.storage = {
        getItem(k) {
            try { if (Portal.sdk && Portal.sdk.data) { const v = Portal.sdk.data.getItem(k); if (v !== null && v !== undefined) return v; } } catch (e) {}
            try { return localStorage.getItem(k); } catch (e) { return null; }
        },
        setItem(k, v) {
            try { if (Portal.sdk && Portal.sdk.data) Portal.sdk.data.setItem(k, v); } catch (e) {}
            try { localStorage.setItem(k, v); } catch (e) {}
        },
        removeItem(k) {
            try { if (Portal.sdk && Portal.sdk.data) Portal.sdk.data.removeItem(k); } catch (e) {}
            try { localStorage.removeItem(k); } catch (e) {}
        },
    };

    // Keep the host page from scrolling when the game uses Space / arrow keys
    if (onCrazyGames) {
        window.addEventListener('keydown', e => {
            const tag = (e.target && e.target.tagName) || '';
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
            if ([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.key) && e.target === document.body) e.preventDefault();
        }, { passive: false });
    }

    window.Portal = Portal;
})();
