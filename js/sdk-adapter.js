// PokeSpinner — CrazyGames SDK v3 adapter (branch: crazygames).
// Docs: https://docs.crazygames.com/sdk/html5-v3/
// Loading/gameplay events, happytime, midgame + rewarded ads, and cloud saves
// through the SDK data module (synced to the player's CrazyGames account).
Portal.use({
    name: 'crazygames',
    sdk: null,
    async init() {
        await Portal.loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js');
        await window.CrazyGames.SDK.init();
        this.sdk = window.CrazyGames.SDK;
        try { this.sdk.game.loadingStart(); } catch (e) {}
    },
    loadingStop() { this.sdk && this.sdk.game.loadingStop(); },
    gameplayStart() { this.sdk && this.sdk.game.gameplayStart(); },
    gameplayStop() { this.sdk && this.sdk.game.gameplayStop(); },
    happytime() { this.sdk && this.sdk.game.happytime(); },
    _ad(type, hooks) {
        return new Promise(resolve => {
            if (!this.sdk) return resolve(false);
            this.sdk.ad.requestAd(type, {
                adStarted: () => hooks.onStart(),
                adFinished: () => resolve(true),
                adError: () => resolve(false),
            });
        });
    },
    midgame(hooks) { return this._ad('midgame', hooks); },
    rewarded(hooks) { return this._ad('rewarded', hooks); },
    canRewarded() { return !!this.sdk; },
    cloudLoad() {
        if (!this.sdk || !this.sdk.data) return null;
        const out = {};
        ['_json', '_ts'].forEach(sfx => { const k = Portal.SAVE_PREFIX + sfx; const v = this.sdk.data.getItem(k); if (v !== null && v !== undefined) out[k] = v; });
        return out;
    },
    cloudSave(obj) {
        if (!this.sdk || !this.sdk.data) return;
        Object.entries(obj).forEach(([k, v]) => this.sdk.data.setItem(k, v));
    },
});
