// PokeSpinner — Yandex Games SDK adapter (branch: playhop).
// Playhop is the international Yandex Games catalog and uses the same SDK.
// Docs: https://yandex.com/dev/games/doc/en/sdk/sdk-about
// LoadingAPI.ready, GameplayAPI start/stop, fullscreen + rewarded video ads,
// pause/resume events, cloud saves via player data, and the player's language.
Portal.use({
    name: 'playhop',
    ysdk: null,
    player: null,
    midgameCooldownMs: 3 * 60 * 1000,   // Yandex also enforces its own minimum gap
    async init() {
        // On Yandex/Playhop hosting the SDK is served at /sdk.js
        try { await Portal.loadScript('/sdk.js'); }
        catch (e) { await Portal.loadScript('https://yandex.ru/games/sdk/v2'); }
        this.ysdk = await window.YaGames.init();
        try {
            this.ysdk.on('game_api_pause', () => Portal.pause());
            this.ysdk.on('game_api_resume', () => Portal.resume());
        } catch (e) {}
        try { this.player = await this.ysdk.getPlayer({ scopes: false }); } catch (e) { this.player = null; }
    },
    loadingStop() { const f = this.ysdk && this.ysdk.features; f && f.LoadingAPI && f.LoadingAPI.ready(); },
    gameplayStart() { const f = this.ysdk && this.ysdk.features; f && f.GameplayAPI && f.GameplayAPI.start(); },
    gameplayStop() { const f = this.ysdk && this.ysdk.features; f && f.GameplayAPI && f.GameplayAPI.stop(); },
    midgame(hooks) {
        return new Promise(resolve => {
            if (!this.ysdk) return resolve(false);
            this.ysdk.adv.showFullscreenAdv({ callbacks: {
                onOpen: () => hooks.onStart(),
                onClose: wasShown => resolve(!!wasShown),
                onError: () => resolve(false),
                onOffline: () => resolve(false),
            } });
        });
    },
    rewarded(hooks) {
        return new Promise(resolve => {
            if (!this.ysdk) return resolve(false);
            let rewarded = false;
            this.ysdk.adv.showRewardedVideo({ callbacks: {
                onOpen: () => hooks.onStart(),
                onRewarded: () => { rewarded = true; },
                onClose: () => resolve(rewarded),
                onError: () => resolve(false),
            } });
        });
    },
    canRewarded() { return !!this.ysdk; },
    async cloudLoad() { return this.player ? await this.player.getData() : null; },
    cloudSave(obj) {
        if (!this.player) return;
        // Player data is limited to ~200 KB; very large collections stay on the device
        if (JSON.stringify(obj).length > 190000) { console.warn('[Portal] save too large for Yandex cloud, kept locally'); return; }
        return this.player.setData(obj, true);
    },
    language() { const e = this.ysdk && this.ysdk.environment; return e && e.i18n && e.i18n.lang; },
});
