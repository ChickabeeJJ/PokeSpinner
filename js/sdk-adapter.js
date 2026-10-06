// PokeSpinner — Poki SDK v2 adapter (branch: poki).
// Docs: https://sdk.poki.com/html5/
// gameLoadingFinished, gameplayStart/Stop, commercialBreak at natural breaks
// (Poki decides when an ad actually plays) and rewardedBreak for free Poké Balls.
// Saves stay in localStorage (Poki has no cloud save API).
Portal.use({
    name: 'poki',
    sdk: null,
    midgameCooldownMs: 1,               // Poki rate-limits commercial breaks itself
    async init() {
        await Portal.loadScript('https://game-cdn.poki.com/scripts/v2/poki-sdk.js');
        this.sdk = window.PokiSDK;
        // init() rejects when an ad blocker is on: the game must keep working
        try { await this.sdk.init(); } catch (e) { console.warn('[Portal] Poki SDK init failed (ad blocker?)', e); }
    },
    loadingStop() { this.sdk && this.sdk.gameLoadingFinished(); },
    gameplayStart() { this.sdk && this.sdk.gameplayStart(); },
    gameplayStop() { this.sdk && this.sdk.gameplayStop(); },
    midgame(hooks) {
        if (!this.sdk) return Promise.resolve(false);
        return this.sdk.commercialBreak(() => hooks.onStart()).then(() => true);
    },
    rewarded(hooks) {
        if (!this.sdk) return Promise.resolve(false);
        return this.sdk.rewardedBreak(() => hooks.onStart()).then(success => !!success);
    },
    canRewarded() { return !!this.sdk; },
});
