// PokeSpinner — Platform core (portal builds).
// Loaded first, in <head>, followed by js/sdk-adapter.js, which plugs in this
// branch's portal SDK with Portal.use(adapter). The game only ever talks to
// `Portal`: loading/gameplay events, ads at natural breaks, rewarded ads,
// pausing audio, and saves (cloud saves where the portal offers them).
//
// Adapter interface (all optional except name/init):
//   name, init() -> Promise, loadingStop(), gameplayStart(), gameplayStop(),
//   happytime(), midgame(hooks) -> Promise<bool>, rewarded(hooks) -> Promise<bool>,
//   canRewarded() -> bool, cloudLoad() -> Promise<object|null>, cloudSave(obj) -> Promise,
//   language() -> 'en' | 'ja' | …, midgameCooldownMs
// hooks = { onStart } — call it when the ad actually appears; the core mutes the game,
// and stops/restarts gameplay around every ad request itself.

(function () {
    const qs = new URLSearchParams(location.search);
    const build = document.documentElement.dataset.build || qs.get('platform') || '';

    const Portal = {
        name: build || 'web',
        isPortal: !!build,
        isCrazyGames: build === 'crazygames',
        adapter: null,
        adPlaying: false,
        paused: false,
        _gameplay: false,
        _lastMidgame: 0,
        MIDGAME_COOLDOWN_MS: 3 * 60 * 1000,
        SAVE_PREFIX: 'pokemon_radar_roadmap_save',
    };
    if (Portal.isPortal) document.documentElement.dataset.portal = Portal.name;
    document.documentElement.dataset.platform = Portal.name;

    let resolveReady;
    Portal.ready = new Promise(r => { resolveReady = r; });

    Portal.loadScript = function (src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src; s.async = true;
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    };
    const call = (fn, ...a) => { try { const ad = Portal.adapter; return ad && typeof ad[fn] === 'function' ? ad[fn](...a) : undefined; } catch (e) { console.warn('[Portal]', fn, e); } };

    // ── Audio / pause (ads, tab hidden, portal pause events) ──
    function suspendAudio() { try { if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'running') audioCtx.suspend(); } catch (e) {} }
    function resumeAudio() { try { if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended' && !(typeof audioMuted !== 'undefined' && audioMuted)) audioCtx.resume(); } catch (e) {} }
    Portal.pause = function () { Portal.paused = true; suspendAudio(); };
    Portal.resume = function () { Portal.paused = false; if (!Portal.adPlaying && !document.hidden) resumeAudio(); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) suspendAudio(); else if (!Portal.adPlaying && !Portal.paused) resumeAudio(); });

    // ── Game events ───────────────────────────────────────────
    Portal.loadingStop = function () { call('loadingStop'); };
    Portal.gameplayStart = function () {
        if (Portal._gameplay || Portal.adPlaying) return;
        Portal._gameplay = true; call('gameplayStart');
    };
    Portal.gameplayStop = function () {
        if (!Portal._gameplay) return;
        Portal._gameplay = false; call('gameplayStop');
    };
    Portal.happytime = function () { call('happytime'); };

    // ── Ads ───────────────────────────────────────────────────
    // hooks.onStart: an ad is actually on screen -> mute; core restores afterwards
    const hooks = {
        onStart() { Portal.adPlaying = true; suspendAudio(); document.documentElement.classList.add('ad-playing'); },
    };
    async function runAd(kind) {
        if (!Portal.adapter || typeof Portal.adapter[kind] !== 'function' || Portal.adPlaying) return false;
        const wasPlaying = Portal._gameplay;
        Portal.gameplayStop();                       // portals want gameplay stopped before any ad request
        try { return !!(await Portal.adapter[kind](hooks)); }
        catch (e) { console.warn('[Portal] ad error', e); return false; }
        finally {
            Portal.adPlaying = false;
            document.documentElement.classList.remove('ad-playing');
            if (!document.hidden && !Portal.paused) resumeAudio();
            if (wasPlaying) Portal.gameplayStart();
        }
    }
    // Natural breaks only (after a battle, after a Safari trip), rate-limited
    Portal.midgameAd = function () {
        const cooldown = (Portal.adapter && Portal.adapter.midgameCooldownMs) || Portal.MIDGAME_COOLDOWN_MS;
        if (Date.now() - Portal._lastMidgame < cooldown) return Promise.resolve(false);
        Portal._lastMidgame = Date.now();
        return runAd('midgame');
    };
    Portal.canRewarded = function () { return !!(Portal.adapter && typeof Portal.adapter.rewarded === 'function' && call('canRewarded') !== false); };
    Portal.rewardedAd = function () { return runAd('rewarded'); };

    // ── Storage: local first (synchronous for the game), mirrored to the portal cloud
    const cloud = {};               // keys mirrored to the portal account
    let saveTimer = null;
    const mirrored = k => k.indexOf(Portal.SAVE_PREFIX) === 0 && !/_b64$/.test(k);   // skip the base64 duplicate
    function scheduleCloudSave() {
        if (!Portal.adapter || typeof Portal.adapter.cloudSave !== 'function') return;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { Promise.resolve(call('cloudSave', Object.assign({}, cloud))).catch(() => {}); }, 1500);
    }
    Portal.storage = {
        getItem(k) { try { return localStorage.getItem(k); } catch (e) { return k in cloud ? cloud[k] : null; } },
        setItem(k, v) {
            try { localStorage.setItem(k, v); } catch (e) {}
            if (mirrored(k)) { cloud[k] = String(v); scheduleCloudSave(); }
        },
        removeItem(k) {
            try { localStorage.removeItem(k); } catch (e) {}
            if (k in cloud) { delete cloud[k]; scheduleCloudSave(); }
        },
    };
    // On start: take the cloud save if it is newer than this device's save
    async function pullCloud() {
        if (!Portal.adapter || typeof Portal.adapter.cloudLoad !== 'function') return;
        let data = null;
        try { data = await Portal.adapter.cloudLoad(); } catch (e) {}
        const tsKey = Portal.SAVE_PREFIX + '_ts';
        let localTs = 0;
        try { localTs = +(localStorage.getItem(tsKey) || 0); } catch (e) {}
        const cloudTs = data ? +(data[tsKey] || 0) : 0;
        if (data && cloudTs > localTs) {
            Object.keys(data).forEach(k => { if (mirrored(k)) { cloud[k] = String(data[k]); try { localStorage.setItem(k, String(data[k])); } catch (e) {} } });
        } else {
            try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (mirrored(k)) cloud[k] = localStorage.getItem(k); } } catch (e) {}
            if (Object.keys(cloud).length) scheduleCloudSave();
        }
    }

    // ── Adapter registration (called by js/sdk-adapter.js) ────
    Portal.use = function (adapter) {
        Portal.adapter = adapter;
        Promise.resolve()
            .then(() => adapter.init())
            .catch(err => { console.warn('[Portal] ' + adapter.name + ' SDK unavailable, running without it', err); })
            .then(() => pullCloud())
            .then(() => {
                if (Portal.canRewarded()) document.documentElement.dataset.rewarded = '1';
                // First visit: start in the player's language if the game has it
                let saved = null;
                try { saved = localStorage.getItem('pokemon_radar_lang'); } catch (e) {}
                const lang = call('language');
                if (!saved && lang && lang !== 'en' && typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang]) {
                    try { localStorage.setItem('pokemon_radar_lang', lang); } catch (e) {}
                    const apply = () => { if (typeof activateLanguage === 'function') activateLanguage(lang); };
                    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
                }
            })
            .then(resolveReady, resolveReady);
    };
    // No adapter registered (plain web): ready once the page is parsed
    document.addEventListener('DOMContentLoaded', () => { if (!Portal.adapter) resolveReady(); });

    // Keep the host page from scrolling when the game uses Space / arrow keys
    if (Portal.isPortal) {
        window.addEventListener('keydown', e => {
            const tag = (e.target && e.target.tagName) || '';
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
            if ([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.key) && e.target === document.body) e.preventDefault();
        }, { passive: false });
        window.addEventListener('contextmenu', e => { if (!['INPUT', 'TEXTAREA'].includes((e.target && e.target.tagName) || '')) e.preventDefault(); });
    }

    window.Portal = Portal;
})();
