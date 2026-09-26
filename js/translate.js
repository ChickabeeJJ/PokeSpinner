// PokeSpinner — Live translation of the whole interface.
// Language packs (js/lang/<code>.js) hold official Pokémon / move / type /
// item / place names from PokéAPI plus the game's UI phrases. This engine
// translates the page as it is rendered: exact phrases, templates such as
// "{p} used {m}!" (styled <span>s inside a line are kept in place), names,
// and sentence-by-sentence fallback. English needs no pack.

const LANG_PACKS = {};
function registerLanguagePack(code, pack) { LANG_PACKS[code] = pack; }

const I18N = { lang: 'en', pack: null, exact: new Map(), exactLower: new Map(), patterns: [], cache: new Map(), observer: null, busy: false };
const TOK_A = '', TOK_B = '';
const TOKEN_RE = /(\d+)/g;
const CJK_LANGS = new Set(['ja', 'zh', 'ko']);

function loadLanguagePack(code) {
    if (code === 'en' || LANG_PACKS[code]) return Promise.resolve(LANG_PACKS[code] || null);
    return new Promise(resolve => {
        const s = document.createElement('script');
        s.src = `js/lang/${code}.js?v=5`;
        s.onload = () => resolve(LANG_PACKS[code] || null);
        s.onerror = () => resolve(null);
        document.head.appendChild(s);
    });
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function compileI18n(pack) {
    I18N.exact.clear(); I18N.exactLower.clear(); I18N.patterns = []; I18N.cache.clear();
    const ui = pack.ui || {};
    for (const [en, tr] of Object.entries(ui)) {
        if (!tr) continue;
        if (/\{[a-z0-9]+\}/.test(en)) {
            const names = [];
            const src = '^' + escapeRe(en).replace(/\\\{([a-z0-9]+)\\\}/g, (_, n) => { names.push(n); return n === 'n' ? '([-+−]?[\\d.,]+[kKmM]?|\uE000\\d+\uE001)' : '(.+?)'; }) + '$';
            // "Gym Leader {x}"-style title prefixes go last so "{t}'s {p}" can split first
            const titlePrefix = /^[^{]+ \{x\}$/.test(en);
            I18N.patterns.push({ re: new RegExp(src, 'u'), names, tr, weight: en.replace(/\{[a-z0-9]+\}/g, '').length - (titlePrefix ? 1000 : 0) });
        } else {
            I18N.exact.set(en, tr);
            I18N.exactLower.set(en.toLowerCase(), tr);
        }
    }
    I18N.patterns.sort((a, b) => b.weight - a.weight);
    // Official TM texts: our English TM descriptions map to the move's in-game text
    if (typeof TM_DB !== 'undefined' && pack.moveDesc) {
        for (const tm of Object.values(TM_DB)) if (pack.moveDesc[tm.move]) I18N.exact.set(tm.desc, pack.moveDesc[tm.move]);
    }
}

const SENTENCE_BREAK = /[!?…]\s+\S|[a-z]{2,}\.\s+\S|\s[—·]\s/u;
const isAllCaps = s => /[A-Z]/.test(s) && !/[a-z]/.test(s);
function nameLookup(s) {
    const p = I18N.pack; if (!p) return null;
    const k = s.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    const kh = s.toLowerCase().trim();
    return (p.sp && (p.sp[kh] || p.sp[k])) || (p.mv && (p.mv[k] || p.mv[kh])) || (p.ty && p.ty[k]) || (p.it && p.it[k])
        || (p.loc && p.loc[k]) || (p.rg && p.rg[k]) || null;
}

// Translate one trimmed string (may contain rich-element tokens); null if unknown
function trCore(s, depth = 0) {
    if (!s || depth > 6) return null;
    if (I18N.cache.has(s)) return I18N.cache.get(s);
    let out = I18N.exact.get(s);
    if (out === undefined) { const low = I18N.exactLower.get(s.toLowerCase()); if (low !== undefined) out = isAllCaps(s) ? low.toLocaleUpperCase(I18N.lang) : low; }
    if (out === undefined) { const nm = nameLookup(s); if (nm) out = isAllCaps(s) && !CJK_LANGS.has(I18N.lang) ? nm.toLocaleUpperCase(I18N.lang) : nm; }
    // Comma-separated lists ("2× Red Apricorn, 1× Blue Apricorn"): translate each item
    if (out === undefined && /, /.test(s) && depth < 6) {
        const tr = s.split(', ').map(x => trCore(x, depth + 1));
        if (tr.every(x => x != null)) out = tr.join(I18N.lang === 'ja' || I18N.lang === 'zh' ? '、' : ', ');
    }
    if (out === undefined) {
        for (const pat of I18N.patterns) {
            const m = s.match(pat.re);
            if (!m) continue;
            // A placeholder never spans two sentences ("bait. Jigglypuff is…")
            if (m.slice(1).some(v => v && !/\uE000/.test(v) && SENTENCE_BREAK.test(v))) continue;
            const vals = {};
            pat.names.forEach((n, i) => { const v = m[i + 1]; vals[n] = //.test(v) ? v : (trText(v, depth + 1) ?? v); });
            out = pat.tr.replace(/\{([a-z0-9]+)\}/g, (_, n) => vals[n] ?? '');
            break;
        }
    }
    if (out === undefined) out = null;
    I18N.cache.set(s, out);
    return out;
}

// Decorations we keep around a phrase: leading emoji/symbols, trailing punctuation
const LEAD_RE = /^([\s\p{Extended_Pictographic}️‍✔✓✗✕×·•←→◀▶⚔♾◐☀☕★☆⭐🪙]+)/u;
const TRAIL_RE = /([\s!?.…:]+)$/u;
function trText(raw, depth = 0) {
    if (raw == null) return null;
    const lead = (raw.match(/^\s*/) || [''])[0], trail = (raw.match(/\s*$/) || [''])[0];
    const s = raw.trim();
    if (!s || !/[A-Za-zÀ-ÿ]/.test(s.replace(TOKEN_RE, ''))) return null;
    let out = trCore(s, depth);
    if (out == null) {
        const lm = s.match(LEAD_RE);
        const pre = lm ? lm[1] : '';
        let core = s.slice(pre.length);
        let t = trCore(core, depth);
        let post = '';
        if (t == null) { const tm = core.match(TRAIL_RE); if (tm) { post = tm[1]; core = core.slice(0, -post.length); t = trCore(core, depth); } }
        if (t != null) out = pre + t + post;
    }
    if (out == null && depth === 0) {
        // Several sentences in one string: translate the longest runs that are known
        const parts = s.split(/(?<=[!?.…])\s+(?=\S)/u);
        if (parts.length > 1) {
            const pieces = [];
            let any = false;
            for (let i = 0; i < parts.length;) {
                let done = false;
                for (let j = parts.length; j > i; j--) {
                    const seg = parts.slice(i, j).join(' ');
                    const tr = (j - i === parts.length) ? null : trText(seg, depth + 1);
                    if (tr != null) { pieces.push(tr); any = true; i = j; done = true; break; }
                }
                if (!done) { pieces.push(parts[i]); i++; }
            }
            if (any) out = pieces.join(' ');
        }
    }
    return out == null ? null : lead + out + trail;
}

// ── DOM walking ─────────────────────────────────────────────
const INLINE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'SPAN', 'SMALL', 'A', 'IMG', 'BR', 'U', 'SUP', 'SUB', 'MARK']);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'CANVAS', 'SVG', 'NOSCRIPT']);
function skipEl(el) { return !el || SKIP_TAGS.has(el.tagName) || el.closest('[data-no-i18n],#worldBg,textarea'); }

function translateTextNode(node) {
    const v = node.nodeValue;
    if (!v || node.__i18nOut === v) return;
    const out = trText(v);
    if (out != null && out !== v) { node.__i18nOut = out; node.nodeValue = out; }
    else node.__i18nOut = v;
}
function translateAttrs(el) {
    for (const a of ['placeholder', 'title', 'aria-label']) {
        const v = el.getAttribute && el.getAttribute(a);
        if (!v || el['__i18n_' + a] === v) continue;
        const out = trText(v);
        el['__i18n_' + a] = out ?? v;
        if (out != null && out !== v) el.setAttribute(a, out);
    }
}
// A line made of text plus inline styling (<b>, <span>…): translate it as a whole
function translateRich(el) {
    const kids = Array.from(el.childNodes);
    if (!kids.some(n => n.nodeType === 1) || !kids.some(n => n.nodeType === 3 && /[A-Za-z]/.test(n.nodeValue))) return false;
    if (kids.some(n => n.nodeType === 1 && (!INLINE_TAGS.has(n.tagName) || n.querySelector('div,p,ul,ol,li,button,section,table')))) return false;
    const els = [];
    const key = kids.map(n => n.nodeType === 3 ? n.nodeValue : n.nodeType === 1 ? (els.push(n), TOK_A + (els.length - 1) + TOK_B) : '').join('').replace(/\s+/g, ' ');
    if (el.__i18nRich === key) return true;
    const out = trText(key);
    if (out == null) return false;
    const frag = document.createDocumentFragment();
    let last = 0;
    out.replace(TOKEN_RE, (m, i, off) => {
        if (off > last) frag.appendChild(document.createTextNode(out.slice(last, off)));
        if (els[+i]) frag.appendChild(els[+i]);
        last = off + m.length; return m;
    });
    if (last < out.length) frag.appendChild(document.createTextNode(out.slice(last)));
    el.textContent = '';
    el.appendChild(frag);
    Array.from(el.childNodes).forEach(n => { if (n.nodeType === 3) n.__i18nOut = n.nodeValue; });
    const newKey = Array.from(el.childNodes).map(n => n.nodeType === 3 ? n.nodeValue : n.nodeType === 1 ? TOK_A + els.indexOf(n) + TOK_B : '').join('').replace(/\s+/g, ' ');
    el.__i18nRich = newKey;
    return true;
}
function translateElement(el) {
    if (skipEl(el)) return;
    translateAttrs(el);
    if (el.tagName === 'OPTION') { for (const n of el.childNodes) if (n.nodeType === 3) translateTextNode(n); return; }
    if (!translateRich(el)) for (const n of el.childNodes) if (n.nodeType === 3) translateTextNode(n);
}
function translateTree(root) {
    if (!root || I18N.lang === 'en') return;
    if (root.nodeType === 3) { const p = root.parentElement; if (p) translateElement(p); return; }
    if (root.nodeType !== 1) return;
    if (root.querySelectorAll) root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(translateAttrs);
    if (root.matches && root.matches('input,textarea')) translateAttrs(root);
    if (skipEl(root)) return;
    translateElement(root);
    const all = root.querySelectorAll('*');
    for (const el of all) if (!skipEl(el)) translateElement(el);
    if (root.tagName === 'SELECT' || root.querySelector && root.querySelector('select')) (root.tagName === 'SELECT' ? [root] : root.querySelectorAll('select')).forEach(sel => sel.querySelectorAll('option').forEach(o => translateElement(o)));
}

function startTranslator() {
    if (I18N.observer) I18N.observer.disconnect();
    translateTree(document.body);
    document.querySelectorAll('select option').forEach(o => translateElement(o));
    I18N.observer = new MutationObserver(muts => {
        if (I18N.busy) return;
        I18N.busy = true;
        try {
            const parents = new Set();
            for (const m of muts) {
                if (m.type === 'childList') {
                    m.addedNodes.forEach(n => { if (n.nodeType === 1) translateTree(n); else if (n.nodeType === 3 && n.parentElement) parents.add(n.parentElement); });
                    if (m.target.nodeType === 1) parents.add(m.target);
                } else if (m.type === 'characterData') {
                    if (m.target.__i18nOut !== m.target.nodeValue && m.target.parentElement) parents.add(m.target.parentElement);
                } else if (m.type === 'attributes') translateAttrs(m.target);
            }
            parents.forEach(p => { p.__i18nRich = null; translateElement(p); });
        } finally {
            I18N.observer.takeRecords();
            I18N.busy = false;
        }
    });
    I18N.observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] });
}

// For code that draws text itself (the wheel canvas)
function trLabel(s) { return I18N.lang === 'en' ? s : (trText(s) ?? s); }

async function activateLanguage(code) {
    if (code === 'en') return true;
    const pack = await loadLanguagePack(code);
    if (!pack) return false;
    I18N.lang = code; I18N.pack = pack;
    compileI18n(pack);
    document.documentElement.lang = code;
    startTranslator();
    if (typeof buildWheelSectors === 'function') try { buildWheelSectors(); } catch (e) {}
    return true;
}

// Boot: switch before the loading screen lifts
(function bootLanguage() {
    let code = 'en';
    try { code = localStorage.getItem('pokemon_radar_lang') || 'en'; } catch (e) {}
    if (code !== 'en') {
        const go = () => activateLanguage(code);
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    }
})();
