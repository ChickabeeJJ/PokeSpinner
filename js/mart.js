// PokeSpinner — Poké Mart.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ==========================================
// MODULE 8: MART SHOP
// ==========================================

// These consumables exist in-game but are not sold in the shop (too granular / clutters UI)
const SHOP_HIDDEN_CONSUMABLES = new Set([
    'vitamin_a','vitamin_b','vitamin_c','vitamin_d','vitamin_e','vitamin_f'
]);

// ==========================================
// POKé MART — tabs, official item art, quantities, daily deal
// ==========================================
const BALL_SHOP = {
    poke:   { name: 'Poké Ball',   cost: 10,  desc: 'The standard ball. The wheel spins fastest. Buy 10, get 1 free!' },
    great:  { name: 'Great Ball',  cost: 50,  desc: 'Slower spin and more Rare wedges. Better catch rate.' },
    ultra:  { name: 'Ultra Ball',  cost: 150, desc: 'Much slower spin and many Epic wedges. High catch rate.' },
    master: { name: 'Master Ball', cost: 500, desc: 'The slowest spin, packed with Epic & Legendary wedges. Never fails.' }
};
const MART_TABS = [
    { id: 'balls', label: 'Poké Balls', icon: 'poke-ball' },
    { id: 'medicine', label: 'Medicine', icon: 'potion' },
    { id: 'battle', label: 'Battle Items', icon: 'x-attack' },
    { id: 'held', label: 'Held Items', icon: 'leftovers' },
    { id: 'evolution', label: 'Evolution', icon: 'fire-stone' },
    { id: 'tms', label: 'TMs', icon: 'tm-normal' },
    { id: 'workshop', label: "Kurt's Workshop", icon: 'red-apricorn' },
    { id: 'special', label: 'Special', icon: 'shiny-charm' }
];
const MEDICINE = ['potion','super_potion','hyper_potion','max_potion','full_restore','full_heal','antidote','burn_heal','ice_heal','awakening','paralyze_heal','ether','max_ether','elixir','max_elixir'];
const BATTLE_ITEMS = ['attack_boost','defense_boost','speed_boost','special_boost'];
let martUI = { tab: 'balls', qty: {} };

function martItemsFor(tab) {
    if (tab === 'balls') return Object.keys(BALL_SHOP).map(k => 'ball:' + k);
    if (tab === 'medicine') return MEDICINE.filter(k => HOLD_ITEMS_DB[k]);
    if (tab === 'battle') return BATTLE_ITEMS.filter(k => HOLD_ITEMS_DB[k]);
    if (tab === 'held') return Object.keys(HOLD_ITEMS_DB).filter(k => HOLD_ITEMS_DB[k].type === 'held_item');
    if (tab === 'evolution') return Object.keys(HOLD_ITEMS_DB).filter(k => HOLD_ITEMS_DB[k].type === 'evolution_stone');
    if (tab === 'tms') return Object.keys(TM_DB).map(k => 'tm:' + k);
    return [];
}
// One item a day is 30% off (same for everyone on the same date)
function dailyDealKey() {
    const pool = [...martItemsFor('balls').filter(k => k !== 'ball:poke'), ...martItemsFor('medicine'), ...martItemsFor('battle'), ...martItemsFor('held'), ...martItemsFor('evolution')];
    const d = new Date(); const seed = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate();
    return pool[(seed * 2654435761 >>> 0) % pool.length];
}
function martInfo(key) {
    if (key.startsWith('ball:')) { const b = key.slice(5); const it = BALL_SHOP[b]; return { name: it.name, desc: it.desc, cost: it.cost, icon: ballIconUrl(b, true), owned: gameState.balls[b] || 0 }; }
    if (key.startsWith('tm:')) { const k = key.slice(3); const tm = TM_DB[k]; return { name: `TM${tm.num} ${tm.name}`, desc: tm.desc, cost: tm.cost, icon: `${ITEM_BASE}tm-${tm.type}.png`, owned: gameState.tmsOwned && gameState.tmsOwned[k] ? 1 : 0, tm, once: true }; }
    const it = HOLD_ITEMS_DB[key];
    return { name: it.name, desc: it.desc, cost: it.cost, icon: `${ITEM_BASE}dream-world/${itemIconUrl(key).split('/').pop()}`, fallback: itemIconUrl(key), owned: gameState.inventoryItems[key] || 0 };
}
function martPrice(key) { const base = martInfo(key).cost; return key === dailyDealKey() ? Math.max(1, Math.round(base * 0.7)) : base; }

function renderMart() {
    const grid = document.getElementById('martGrid');
    if (!grid) return;
    const tabs = document.getElementById('martTabs');
    tabs.innerHTML = MART_TABS.map(tb => `<button type="button" class="g-tab mart-tab${tb.id === martUI.tab ? ' is-active' : ''}" onclick="setMartTab('${tb.id}')"><img src="${ITEM_BASE}${tb.icon}.png" alt="">${tb.label}</button>`).join('');
    const deal = dailyDealKey(), di = martInfo(deal);
    document.getElementById('martDeal').innerHTML = `
        <div class="mart-deal-card">
            <span class="mart-deal-tag">DAILY DEAL</span>
            <img src="${di.icon}" onerror="this.onerror=null;this.src='${di.fallback || di.icon}'" alt="">
            <div class="min-w-0 flex-1"><div class="g-font text-lg truncate">${di.name}</div><div class="g-sub">30% off today only · resets at midnight</div></div>
            <div class="text-right"><div class="mart-old">🪙 ${formatNum(di.cost)}</div><div class="mart-price">🪙 ${formatNum(martPrice(deal))}</div></div>
            <button type="button" class="g-btn green sm" onclick="martBuy('${deal}')">Buy</button>
        </div>`;
    const special = document.getElementById('martSpecial');
    if (special) special.classList.toggle('hidden', martUI.tab !== 'special');
    grid.classList.toggle('hidden', martUI.tab === 'special');
    grid.innerHTML = martItemsFor(martUI.tab).map(key => {
        const info = martInfo(key);
        const qty = martUI.qty[key] || 1;
        const price = martPrice(key);
        const onSale = key === deal;
        const bonus = key === 'ball:poke' ? Math.floor(qty / 10) : 0;
        return `<div class="mart-card${onSale ? ' is-deal' : ''}">
            ${onSale ? '<span class="mart-sale">-30%</span>' : ''}
            <div class="mart-icon"><img src="${info.icon}" ${info.fallback ? `onerror="this.onerror=null;this.src='${info.fallback}'"` : ''} alt=""></div>
            <div class="mart-name">${info.name}</div>
            ${info.tm ? `<div class="flex justify-center gap-1">${typeChip(info.tm.type)}<span class="g-chip">${info.tm.power ? 'PWR ' + info.tm.power : 'Status'}</span></div>` : ''}
            <p class="mart-desc">${info.desc}</p>
            <span class="g-chip">${info.once ? (info.owned ? '✓ Owned — reusable' : 'Not owned') : `In bag: ${info.owned}`}</span>
            <div class="mart-buy">
                <span class="mart-price">🪙 ${formatNum(price * (info.once ? 1 : qty))}${bonus ? ` <small>+${bonus} free</small>` : ''}</span>
                ${info.once ? '' : `<div class="mart-qty"><button type="button" onclick="setMartQty('${key}',-1)" aria-label="Less">−</button><span>${qty}</span><button type="button" onclick="setMartQty('${key}',1)" aria-label="More">+</button><button type="button" onclick="setMartQty('${key}',10)" aria-label="Add 10">×10</button></div>`}
                <button type="button" class="g-btn green sm" ${info.once && info.owned ? 'disabled' : ''} onclick="martBuy('${key}')">${info.once && info.owned ? 'Owned' : 'Buy'}</button>
            </div>
        </div>`;
    }).join('');
    // Kurt's Workshop (features.js): craft balls and held items from Apricorns
    grid.classList.toggle('is-workshop', martUI.tab === 'workshop');
    if (martUI.tab === 'workshop' && typeof workshopHtml === 'function') grid.innerHTML = workshopHtml();
}
window.setMartTab = function(tab) { playBeep(); martUI.tab = tab; renderMart(); };
window.setMartQty = function(key, delta) {
    const cur = martUI.qty[key] || 1;
    martUI.qty[key] = delta === 10 ? Math.min(99, cur === 1 ? 10 : cur + 10) : Math.min(99, Math.max(1, cur + delta));
    renderMart();
};
window.martBuy = function(key) {
    initAudio();
    if (key.startsWith('tm:')) { window.buyTM(key.slice(3)); return; }
    const qty = martUI.qty[key] || 1;
    const total = martPrice(key) * qty;
    if (gameState.coins < total) { playFailCapture(); showNotification('Not enough coins', `That costs ${formatNum(total)} coins.`, 'error'); return; }
    spendCoins(total);
    const info = martInfo(key);
    if (key.startsWith('ball:')) {
        const b = key.slice(5);
        const bonus = b === 'poke' ? Math.floor(qty / 10) : 0;
        gameState.balls[b] = (gameState.balls[b] || 0) + qty + bonus;
        showNotification('Thank you!', `Bought ${qty}× ${info.name}${bonus ? ` and got ${bonus} bonus!` : ''}`, 'success');
    } else {
        gameState.inventoryItems[key] = (gameState.inventoryItems[key] || 0) + qty;
        showNotification('Thank you!', `Bought ${qty}× ${info.name}.`, 'success');
    }
    playConfirmSound();
    martUI.qty[key] = 1;
    saveProgress(); updateUI(); renderMart();
};

function renderHeldItemsShop() { renderMart(); }

window.buyShopItem = function(itemKey) {
    initAudio();
    const item = HOLD_ITEMS_DB[itemKey];
    if (!item) return;

    if (gameState.coins < item.cost) {
        showNotification('No Funds Available', `Requires ${formatNum(item.cost)} Coins. Beat roadmap chapters to earn payouts!`, 'error');
        return;
    }

    spendCoins(item.cost);
    gameState.inventoryItems[itemKey] = (gameState.inventoryItems[itemKey] || 0) + 1;
    
    playConfirmSound();
    const actionLabel = item.type === 'held_item' ? 'Hold Item Purchased' : 'Consumable Purchased';
    showNotification(actionLabel, `Added ${item.name} to inventory.`, 'success');
    
    updateUI();
    renderHeldItemsShop();
    saveProgress();
};

window.buyHeldItem = function(itemKey) {
    window.buyShopItem(itemKey);
};

function renderTMShop() { renderMart(); }

window.buyTM = function(tmKey) {
    initAudio();
    const tm = TM_DB[tmKey];
    if (!tm) return;
    if (gameState.tmsOwned && gameState.tmsOwned[tmKey]) {
        showNotification('Already Owned', `TM${tm.num} ${tm.name} is already in your collection.`, 'info');
        return;
    }
    if (gameState.coins < tm.cost) {
        showNotification('No Funds Available', `Requires ${formatNum(tm.cost)} Coins.`, 'error');
        return;
    }
    spendCoins(tm.cost);
    if (!gameState.tmsOwned) gameState.tmsOwned = {};
    gameState.tmsOwned[tmKey] = true;
    saveProgress();
    playConfirmSound();
    showNotification(`TM${tm.num} Acquired!`, `${tm.name} can now be taught in your PC — unlimited uses!`, 'success');
    updateUI();
    renderMart();
};

window.buyBall = function(ballType) {
    initAudio();
    let cost = 10;
    if (ballType === 'great') cost = 50;
    if (ballType === 'ultra') cost = 150;
    if (ballType === 'master') cost = 500;

    if (gameState.coins < cost) {
        showNotification("No Funds Available", `Requires ${formatNum(cost)} Coins.`, 'error');
        return;
    }

    spendCoins(cost);
    if (!gameState.balls[ballType] && gameState.balls[ballType] !== 0) gameState.balls[ballType] = 0;
    gameState.balls[ballType] += 1;
    
    playConfirmSound();
    const ballNames = { poke: 'Poké Ball', great: 'Great Lens', ultra: 'Ultra Core', master: 'Master Link' };
    showNotification("Purchased", `Acquired 1x ${ballNames[ballType] || ballType}!`, 'success');
    
    updateUI();
    saveProgress();
};
