// PokeSpinner — GameMonetize SDK adapter (branch: gamemonetize).
// Docs: https://github.com/MonetizeGame/GameMonetize.com-SDK
// Set GAMEMONETIZE_GAME_ID to the game id from your GameMonetize dashboard.
// Interstitials via sdk.showBanner() at natural breaks; the SDK's
// SDK_GAME_PAUSE / SDK_GAME_START events mute and resume the game (also for
// its own pre-roll). The SDK has no rewarded or cloud-save API, so those are off.
const GAMEMONETIZE_GAME_ID = 'REPLACE_WITH_YOUR_GAMEMONETIZE_GAME_ID';

Portal.use({
    name: 'gamemonetize',
    _ready: null,
    _pending: null,
    init() {
        if (/REPLACE_WITH/.test(GAMEMONETIZE_GAME_ID)) console.warn('[Portal] Set GAMEMONETIZE_GAME_ID in js/sdk-adapter.js');
        const self = this;
        this._ready = new Promise(resolve => {
            window.SDK_OPTIONS = {
                gameId: GAMEMONETIZE_GAME_ID,
                onEvent(event) {
                    switch (event.name) {
                        case 'SDK_GAME_PAUSE':                                  // an ad is about to show
                            Portal.pause();
                            if (self._onAdStart) { self._onAdStart(); self._onAdStart = null; }
                            break;
                        case 'SDK_GAME_START':                                  // ad finished / game may continue
                            Portal.resume();
                            if (self._pending) { const r = self._pending; self._pending = null; r(true); }
                            break;
                        case 'SDK_READY': resolve(); break;
                    }
                },
            };
        });
        return Portal.loadScript('https://api.gamemonetize.com/sdk.js')
            .then(() => Promise.race([this._ready, new Promise(r => setTimeout(r, 5000))]));
    },
    midgame(hooks) {
        return new Promise(resolve => {
            if (!window.sdk || typeof window.sdk.showBanner !== 'function') return resolve(false);
            this._pending = resolve;
            this._onAdStart = () => hooks.onStart();
            window.sdk.showBanner();
            // No fill: the SDK may never pause the game; don't wait forever
            setTimeout(() => { if (this._pending === resolve && !Portal.adPlaying) { this._pending = null; this._onAdStart = null; resolve(false); } }, 20000);
        });
    },
});
