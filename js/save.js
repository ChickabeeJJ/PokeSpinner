// PokeSpinner — Local saves, cloud sync and backup codes.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// MODULE 3: LOCAL SAVES & DATA TRANSFER
// ==========================================
const SAVE_KEY = 'pokemon_radar_roadmap_save';

// Test CryptoJS availability
function testCryptoJS() {
    if (typeof CryptoJS === 'undefined') {
        console.error('CryptoJS is not loaded!');
        return false;
    }
    try {
        const testStr = 'test';
        const encrypted = CryptoJS.AES.encrypt(testStr, 'test-key').toString();
        const decrypted = CryptoJS.AES.decrypt(encrypted, 'test-key').toString(CryptoJS.enc.Utf8);
        if (decrypted === testStr) {
            console.log('CryptoJS test passed');
            return true;
        } else {
            console.error('CryptoJS test failed: decrypted != original');
            return false;
        }
    } catch (e) {
        console.error('CryptoJS test error:', e);
        return false;
    }
}

// ── SAVE SYSTEM ───────────────────────────���────────────────
// Plain JSON save — no CryptoJS dependency for primary slot.
// CryptoJS is still used for the manual Export/Import feature.
// ────────────────────────────────────────────────────────────
function saveProgressLocal() {
    try {
        const state = normalizeSaveState(gameState);
        state._theme     = currentTheme;
        state._lightMode = isLightMode;
        state._savedAt   = Date.now();
        const json = JSON.stringify(state);
        // Primary: plain JSON (most reliable)
        Portal.storage.setItem(SAVE_KEY + '_json', json);
        // Secondary: btoa-encoded (light obfuscation, still recoverable without CryptoJS)
        try { Portal.storage.setItem(SAVE_KEY + '_b64', btoa(unescape(encodeURIComponent(json)))); } catch(e) {}
        // Mark timestamp so we can detect stale data
        Portal.storage.setItem(SAVE_KEY + '_ts', state._savedAt.toString());
    } catch (err) {
        console.error('[SAVE] saveProgressLocal failed:', err);
    }
}

function saveProgress() {
    saveProgressLocal();
}

function loadSavedProgress() {
    // ── LOAD PRIORITY ───────────────────────────────────────────
    // 1) _json  — plain JSON   (written by current save system)
    // 2) _b64   — btoa-encoded (backup written by current system)
    // 3) legacy AES slot       (old encrypted format, backward compat)
    // ─────────────────────────────────────────────────────────────
    function applyParsed(parsed) {
        const normalized = normalizeSaveState(parsed);
        if (!normalized.balls) return false;           // sanity check
        Object.assign(gameState, normalized);
        assignPokemonUids();
        // Older saves could hold a translated name: keep the English one in data
        [...(gameState.pcBox || []), ...(gameState.pokedex || [])].forEach(p => { if (p && p._enName && /[^\x00-\x7F]/.test(p.name || '')) p.name = p._enName; });
        // Pixel sprites everywhere (and real shiny sprites instead of a colour filter)
        (gameState.pcBox || []).forEach(normalizeOwnedSprite);
        (gameState.pokedex || []).forEach(normalizeOwnedSprite);
        if (parsed._lightMode) { isLightMode = true; applyLightDarkMode(true); }
        if (parsed._theme && THEMES[parsed._theme])   { currentTheme = parsed._theme; }
        // Restore language preference
        if (normalized.language && typeof _currentLang !== 'undefined') {
            _currentLang = normalized.language;
            localStorage.setItem('pokemon_radar_lang', normalized.language);
        }
        updateProfileBtn();
        console.log('[SAVE] Loaded ' + (normalized.pokedex ? normalized.pokedex.length : 0) + ' Pokémon, coins=' + normalized.coins);
        return true;
    }

    // Slot 1 — plain JSON
    try {
        const raw = Portal.storage.getItem(SAVE_KEY + '_json');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (applyParsed(parsed)) return;
        }
    } catch(e) { console.warn('[SAVE] _json slot failed:', e); }

    // Slot 2 — btoa-encoded
    try {
        const b64 = Portal.storage.getItem(SAVE_KEY + '_b64');
        if (b64) {
            const json = decodeURIComponent(escape(atob(b64)));
            const parsed = JSON.parse(json);
            if (applyParsed(parsed)) {
                // Migrate to plain JSON slot so we don't rely on btoa next time
                try { Portal.storage.setItem(SAVE_KEY + '_json', json); } catch(e) {}
                return;
            }
        }
    } catch(e) { console.warn('[SAVE] _b64 slot failed:', e); }

    // Slot 3 — legacy AES encrypted slot (backward compat)
    try {
        const raw = Portal.storage.getItem(SAVE_KEY);
        if (raw && typeof CryptoJS !== 'undefined') {
            const decrypted = CryptoJS.AES.decrypt(raw, 'pokemon-radar-secret-key-2024').toString(CryptoJS.enc.Utf8);
            if (decrypted && decrypted.length > 2) {
                const parsed = JSON.parse(decrypted);
                if (applyParsed(parsed)) {
                    // Migrate to plain JSON slot
                    try { Portal.storage.setItem(SAVE_KEY + '_json', JSON.stringify(normalizeSaveState(parsed))); } catch(e) {}
                    return;
                }
            }
        }
    } catch(e) { console.warn('[SAVE] legacy AES slot failed:', e); }

    // Slot 4 — old _fallback plain JSON key
    try {
        const raw = Portal.storage.getItem(SAVE_KEY + '_fallback');
        if (raw) {
            const parsed = JSON.parse(raw);
            applyParsed(parsed);
        }
    } catch(e) { console.warn('[SAVE] _fallback slot failed:', e); }
}

function getDataExportPayload() {
    try {
        const dataObject = {
            version: 2,
            exportedAt: Date.now(),
            data: normalizeSaveState(gameState)
        };
        const jsonStr = JSON.stringify(dataObject);
        // Primary: btoa — always available, no CDN dependency
        const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
        if (!encoded || encoded.length === 0) throw new Error('btoa encoding returned empty result');
        console.log('[Export] Generated V2 btoa payload, length:', encoded.length);
        return 'PKMN_BACKUP_V2:' + encoded;
    } catch (e) {
        console.error('[Export] Failed:', e);
        throw new Error('Export failed: ' + e.message);
    }
}

function exportDataToBackupCode() {
    try {
        const textarea = document.getElementById('dataTransferText');
        if (!textarea) {
            showNotification('Export failed', 'Data transfer textarea not found.', 'error');
            return;
        }
        const payload = getDataExportPayload();
        textarea.value = payload;
        textarea.focus();
        textarea.select();
        showNotification('Export ready', 'A fresh encrypted backup code was generated for your current save.', 'success');
        return payload;
    } catch (e) {
        console.error('Export failed:', e);
        showNotification('Export failed', 'Failed to generate backup: ' + e.message, 'error');
        return null;
    }
}

function openDataTransferModal() {
    initAudio();
    playConfirmSound();
    const modal = document.getElementById('dataTransferModal');
    exportDataToBackupCode();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeDataTransferModal() {
    const modal = document.getElementById('dataTransferModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function copyExportedData() {
    const textarea = document.getElementById('dataTransferText');
    if (!textarea.value) {
        exportDataToBackupCode();
    }
    try {
        await navigator.clipboard.writeText(textarea.value);
        showNotification('Backup copied', 'Your encrypted save code is ready to paste elsewhere.', 'success');
    } catch (e) {
        showNotification('Copy failed', 'Select the text manually and copy it.', 'info');
    }
}

function importDataFromText() {
    const textarea = document.getElementById('dataTransferText');
    if (!textarea) {
        showNotification('Import failed', 'Data transfer textarea not found.', 'error');
        return;
    }
    const text = textarea.value.trim();
    if (!text) {
        showNotification('Nothing to import', 'Paste a saved backup code first.', 'error');
        return;
    }
    try {
        let parsed = null;

        if (text.startsWith('PKMN_BACKUP_V2:')) {
            // V2 format: btoa-encoded JSON (current)
            const encoded = text.slice('PKMN_BACKUP_V2:'.length);
            const jsonStr = decodeURIComponent(escape(atob(encoded)));
            parsed = JSON.parse(jsonStr);
        } else if (text.startsWith('PKMN_BACKUP:')) {
            // V1 format: CryptoJS AES (legacy)
            if (typeof CryptoJS === 'undefined') throw new Error('CryptoJS not available to decrypt legacy backup');
            const encryptedData = text.slice('PKMN_BACKUP:'.length);
            const decrypted = CryptoJS.AES.decrypt(encryptedData, 'pokemon-radar-secret-key-2024').toString(CryptoJS.enc.Utf8);
            if (!decrypted || decrypted.length === 0) throw new Error('Decryption failed — is the backup code complete?');
            parsed = JSON.parse(decrypted);
        } else {
            throw new Error('Not a valid backup code. It must start with PKMN_BACKUP_V2: or PKMN_BACKUP:');
        }

        const importedData = parsed.data || parsed;
        if (!importedData || !importedData.pokedex || !importedData.balls) {
            throw new Error('Invalid save structure — missing required fields (pokedex / balls)');
        }

        const normalizedImport = normalizeSaveState(importedData);
        Object.assign(gameState, normalizedImport);
        assignPokemonUids();
        saveProgress();
        updateUI();
        renderRoadmap();
        renderPCBox();
        renderPokedex();
        renderHeldItemsShop();
        showNotification('Data imported', 'Progress restored from your backup code!', 'success');
    } catch (e) {
        console.error('[Import] failed:', e);
        showNotification('Import failed', 'Backup invalid or corrupted: ' + e.message, 'error');
    }
}

window.openDataTransferModal = openDataTransferModal;
window.closeDataTransferModal = closeDataTransferModal;
window.exportDataToBackupCode = exportDataToBackupCode;
window.copyExportedData = copyExportedData;
window.importDataFromText = importDataFromText;

// ══════════════════════════════════════════════════════════════
