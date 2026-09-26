#!/usr/bin/env python3
"""Build the language packs in js/lang/<code>.js.

Each pack = official names from PokéAPI's CSV data (species, moves, types,
items, places, regions, TM move texts) + the UI phrase tables in phrases/*.tsv
+ the older per-key strings in js/i18n.js (TRANSLATIONS), which phrases override.

Phrase tables: one row per English phrase, tab-separated, columns
    en  ja  ko  fr  de  es  it  zh  pt
Leave a cell empty to keep English. {x}-style placeholders mark the parts that
change ({n} = a number); every translation must use the same placeholders.

Usage:  python3 tools/i18n/build.py        (needs network once for the CSVs; needs node)
"""
import csv, glob, json, os, re, subprocess, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CACHE = os.path.join(HERE, '.cache')
LANGS = ['ja', 'ko', 'fr', 'de', 'es', 'it', 'zh', 'pt']
LANG_IDS = {'ja': [1, 11], 'ko': [3], 'fr': [5], 'de': [6], 'es': [7, 14], 'it': [8], 'zh': [12, 4], 'pt': [13]}
CSV_URL = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/{}.csv'
CSVS = ['pokemon_species_names', 'pokemon_species', 'pokemon', 'move_names', 'moves', 'type_names', 'types',
        'item_names', 'items', 'location_names', 'region_names', 'move_flavor_text']


def rows(name):
    name = name[:-4] if name.endswith('.csv') else name
    path = os.path.join(CACHE, name + '.csv')
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        print('downloading', name)
        urllib.request.urlretrieve(CSV_URL.format(name), path)
    return list(csv.DictReader(open(path, encoding='utf-8')))


def names_by(f, idcol, lang_ids, namecol='name', langcol='local_language_id'):
    out = {}
    for r in rows(f):
        lid = int(r[langcol])
        if lid in lang_ids and r[namecol].strip():
            cur = out.get(r[idcol])
            if cur is None or lang_ids.index(lid) < cur[0]:
                out[r[idcol]] = (lang_ids.index(lid), r[namecol].strip())
    return {k: v[1] for k, v in out.items()}


def phrase_tables():
    out = {l: {} for l in LANGS}
    bad = 0
    for f in sorted(glob.glob(os.path.join(HERE, 'phrases', '*.tsv'))):
        for ln, line in enumerate(open(f, encoding='utf-8'), 1):
            line = line.rstrip('\n')
            if not line.strip() or line.startswith('#'):
                continue
            cols = line.split('\t')
            cols += [''] * (9 - len(cols))
            if len(cols) != 9:
                print(f'{f}:{ln}: expected 9 columns, got {len(cols)}'); bad += 1; continue
            en = cols[0]
            ph = sorted(re.findall(r'\{[a-z0-9]+\}', en))
            for l, tr in zip(LANGS, cols[1:]):
                if not tr:
                    continue
                if sorted(re.findall(r'\{[a-z0-9]+\}', tr)) != ph:
                    print(f'{f}:{ln}: placeholder mismatch ({l}): {en!r} -> {tr!r}'); bad += 1; continue
                out[l][en] = tr
    if bad:
        sys.exit(f'{bad} bad rows')
    return out


def legacy_tables():
    js = r"""
const fs=require('fs');const src=fs.readFileSync(process.argv[1],'utf8');
const a=src.indexOf('const TRANSLATIONS = {');const b=src.indexOf('// PokéAPI language code mapping');
const T=eval('('+src.slice(a+'const TRANSLATIONS = '.length,b).trim().replace(/;\s*$/,'')+')');
const out={};for(const [l,d] of Object.entries(T)){if(l==='en')continue;out[l]={};for(const [k,v] of Object.entries(d)){const en=T.en[k];if(en&&v&&en!==v)out[l][en]=v;}}
process.stdout.write(JSON.stringify(out));"""
    return json.loads(subprocess.check_output(['node', '-e', js, os.path.join(ROOT, 'js', 'i18n.js')]))


def main():
    ui_tables = phrase_tables()
    legacy = legacy_tables()
    sp_en = names_by('pokemon_species_names.csv', 'pokemon_species_id', [9])
    species_ident = {r['id']: r['identifier'] for r in rows('pokemon_species')}
    poke = [r for r in rows('pokemon') if int(r['species_id']) <= 1025 and r['is_default'] == '1']
    mv_ident = {r['id']: r['identifier'] for r in rows('moves')}
    mv_en = names_by('move_names.csv', 'move_id', [9])
    ty_ident = {r['id']: r['identifier'] for r in rows('types')}
    it_ident = {r['id']: r['identifier'] for r in rows('items')}
    it_en = names_by('item_names.csv', 'item_id', [9])
    loc_en = names_by('location_names.csv', 'location_id', [9])
    rg_en = names_by('region_names.csv', 'region_id', [9])
    src = open(os.path.join(ROOT, 'js', 'data-pokemon.js'), encoding='utf-8').read()
    our_items = dict(re.findall(r'\n\s+([a-z_]+): \{ name: "([^"]+)"', src[src.index('const HOLD_ITEMS_DB'):src.index('const STONE_EVO_POKEMON')]))
    alias = {'attack_boost': 'x-attack', 'defense_boost': 'x-defense', 'speed_boost': 'x-speed', 'special_boost': 'x-sp-atk',
             'vitamin_a': 'hp-up', 'vitamin_b': 'protein', 'vitamin_c': 'iron', 'vitamin_d': 'calcium', 'vitamin_e': 'zinc',
             'vitamin_f': 'carbos', 'nature_mint': 'adamant-mint'}
    item_idents = {k: alias.get(k, k.replace('_', '-')) for k in our_items}
    extra_items = ['poke-ball', 'great-ball', 'ultra-ball', 'master-ball', 'safari-ball', 'luxury-ball', 'premier-ball',
                   'shiny-charm', 'town-map', 'exp-share'] + [c + '-apricorn' for c in ['red', 'blue', 'yellow', 'green', 'pink', 'white', 'black']]
    tm_moves = re.findall(r"move:'([a-z-]+)'", src[src.index('const TM_DB'):])
    camp = open(os.path.join(ROOT, 'js', 'data-campaign.js'), encoding='utf-8').read()
    stage_bases = set(re.sub(r' (Gym|B\dF|\d+F)$', '', s) for s in re.findall(r'name:"([^"]+)"', camp))
    flav_rows = rows('move_flavor_text')
    ident_to_item = {v: k for k, v in it_ident.items()}
    mv_id_by_ident = {v: k for k, v in mv_ident.items()}
    os.makedirs(os.path.join(ROOT, 'js', 'lang'), exist_ok=True)
    for code, lids in LANG_IDS.items():
        sp_l = names_by('pokemon_species_names.csv', 'pokemon_species_id', lids)
        sp = {}
        for sid, name in sp_l.items():
            if int(sid) > 1025 or sp_en.get(sid) == name:
                continue
            if sp_en.get(sid): sp[sp_en[sid].lower()] = name
            if species_ident.get(sid): sp[species_ident[sid]] = name
        for r in poke:
            n = sp_l.get(r['species_id'])
            if n and r['identifier'] not in sp and sp_en.get(r['species_id']) != n: sp[r['identifier']] = n
        mv_l = names_by('move_names.csv', 'move_id', lids)
        mv = {}
        for mid, name in mv_l.items():
            ident = mv_ident.get(mid)
            if not ident or int(mid) > 1000 or mv_en.get(mid) == name:
                continue
            mv[ident.replace('-', ' ')] = name
            if mv_en.get(mid): mv.setdefault(mv_en[mid].lower(), name)
        ty = {ty_ident[t]: n for t, n in names_by('type_names.csv', 'type_id', lids).items() if t in ty_ident and int(t) <= 18}
        it_l = names_by('item_names.csv', 'item_id', lids)
        it = {}
        for ours, ident in item_idents.items():
            iid = ident_to_item.get(ident)
            if iid and it_l.get(iid): it[our_items[ours].lower()] = it_l[iid]; it[ident.replace('-', ' ')] = it_l[iid]
        for ident in extra_items:
            iid = ident_to_item.get(ident)
            if iid and it_l.get(iid):
                it[ident.replace('-', ' ')] = it_l[iid]
                if it_en.get(iid): it[it_en[iid].lower()] = it_l[iid]
        loc_l = names_by('location_names.csv', 'location_id', lids)
        loc = {e.lower(): loc_l[i] for i, e in loc_en.items() if e in stage_bases and loc_l.get(i) and loc_l[i] != e}
        rg = {rg_en[r].lower(): n for r, n in names_by('region_names.csv', 'region_id', lids).items() if r in rg_en}
        by_move = {}
        for r in flav_rows:
            if int(r['language_id']) in lids:
                k, vg, pr = r['move_id'], int(r['version_group_id']), lids.index(int(r['language_id']))
                cur = by_move.get(k)
                if cur is None or (pr, -vg) < (cur[0], -cur[1]): by_move[k] = (pr, vg, r['flavor_text'])
        md = {}
        for m in tm_moves:
            e = by_move.get(mv_id_by_ident.get(m))
            if e: md[m] = re.sub(r'\s+', '' if code in ('ja', 'zh') else ' ', e[2].replace('­', '')).strip()
        ui = dict(legacy.get(code, {}))
        ui.update(ui_tables.get(code, {}))
        pack = {'sp': sp, 'mv': mv, 'ty': ty, 'it': it, 'loc': loc, 'rg': rg, 'moveDesc': md, 'ui': ui}
        body = json.dumps(pack, ensure_ascii=False, separators=(',', ':'))
        path = os.path.join(ROOT, 'js', 'lang', f'{code}.js')
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(f"// PokeSpinner language pack ({code}). Generated by tools/i18n/build.py — edit tools/i18n/phrases/*.tsv instead.\nregisterLanguagePack('{code}', {body});\n")
        print(f'{code}: {len(sp)} species, {len(mv)} moves, {len(it)} items, {len(loc)} places, {len(ui)} phrases, {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    main()
