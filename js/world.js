// PokeSpinner — The living background: a sky that follows the player's local
// time of day, drifting clouds, twinkling stars, floating Poké Balls, the
// current weather (features.js) and Pokémon flying past now and then.
// Pure decoration: everything sits in #worldBg behind the game (css/world.css).

function timeOfDay(d = new Date()) {
    const h = d.getHours();
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 17) return 'day';
    if (h >= 17 && h < 20) return 'dusk';
    return 'night';
}

function buildWorld() {
    if (document.getElementById('worldBg')) return;
    const world = document.createElement('div');
    world.id = 'worldBg';
    world.setAttribute('aria-hidden', 'true');
    const clouds = [
        { top: 8, w: 26, d: 95, delay: -20, a: .12 },
        { top: 22, w: 18, d: 70, delay: -55, a: .09 },
        { top: 40, w: 30, d: 120, delay: -80, a: .07 },
        { top: 62, w: 20, d: 85, delay: -10, a: .08 }
    ].map(c => `<div class="wb-cloud" style="top:${c.top}vh;--w:${c.w}vw;--d:${c.d}s;--delay:${c.delay}s;--a:${c.a}"></div>`).join('');
    const balls = [
        { left: 6, s: 38, d: 28, delay: -4 }, { left: 18, s: 58, d: 34, delay: -20 },
        { left: 33, s: 30, d: 24, delay: -12 }, { left: 52, s: 46, d: 30, delay: -26 },
        { left: 68, s: 34, d: 26, delay: -7 }, { left: 82, s: 54, d: 36, delay: -16 },
        { left: 93, s: 28, d: 22, delay: -2 }
    ].map(b => `<div class="wb-ball" style="left:${b.left}vw;--s:${b.s}px;--d:${b.d}s;--delay:${b.delay}s"></div>`).join('');
    world.innerHTML = `<div class="wb-glow"></div><div class="wb-stars"></div><div class="wb-checker"></div>${clouds}<div class="wb-hills"></div>${balls}<div class="wb-weather"></div>`;
    document.body.prepend(world);
    updateWorld();
}

function updateWorld() {
    const world = document.getElementById('worldBg');
    if (!world) return;
    world.dataset.time = timeOfDay();
    world.dataset.wx = typeof currentWeather === 'function' ? currentWeather().id : '';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = { dawn: '#5b3a8c', day: '#4a3a9a', dusk: '#2d1f5c', night: '#0e0a26' }[world.dataset.time] || '#1c1233';
}

// Species that fit the moment: ghosts and bats at night, otherwise fliers,
// preferring ones the weather boosts; limited to the regions the player has unlocked.
function pickFlyer() {
    if (typeof SPECIES_BY_TYPE === 'undefined') return null;
    const maxId = typeof getRadarGenRange === 'function' ? getRadarGenRange().max : 151;
    const night = timeOfDay() === 'night';
    const boost = typeof currentWeather === 'function' ? currentWeather().boost : [];
    const legends = new Set(typeof LEGENDARY_MYTHICAL_POKEMON !== 'undefined' ? LEGENDARY_MYTHICAL_POKEMON : []);
    const within = ids => ids.filter(id => id <= maxId && !legends.has(id));
    let pool = night ? within(SPECIES_BY_TYPE.ghost) : [];
    const fliers = within(SPECIES_BY_TYPE.flying);
    const boosted = fliers.filter(id => (TYPES_OF_SPECIES[id] || []).some(tp => boost.includes(tp)));
    if (!pool.length || Math.random() < .5) pool = boosted.length && Math.random() < .6 ? boosted : fliers;
    if (!pool.length) return null;
    const id = pool[Math.floor(Math.random() * pool.length)];
    return { id, ghost: (TYPES_OF_SPECIES[id] || []).includes('ghost') };
}

function sendFlyer() {
    const world = document.getElementById('worldBg');
    if (!world || document.hidden || document.body.classList.contains('reduce-motion')) return;
    const pick = pickFlyer();
    if (!pick) return;
    const img = document.createElement('img');
    const c = battleSpriteCandidates(pick.id, Math.random() < 1 / 512, false);
    img.src = c[0];
    img.dataset.fallbacks = c.slice(1).join('|');
    img.onerror = () => _spriteFallback(img);
    img.alt = '';
    img.className = 'wb-flyer' + (Math.random() < .5 ? ' is-rtl' : '') + (pick.ghost ? ' is-ghost' : '');
    img.style.setProperty('--y', `${6 + Math.random() * 40}vh`);
    img.style.setProperty('--d', `${14 + Math.random() * 10}s`);
    img.addEventListener('animationend', () => img.remove());
    world.appendChild(img);
}

buildWorld();
setInterval(updateWorld, 60 * 1000);
setTimeout(sendFlyer, 6000);
setInterval(() => { if (Math.random() < .7) sendFlyer(); }, 22000);
