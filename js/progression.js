// PokeSpinner — Evolution, experience, victory/defeat and region unlocks.
// Classic script: top-level declarations are shared with the other js/ files,
// which index.html loads in order.

// ── Eevee level-up evolution at level 20 ──────────────────────────��───
async function checkEeveeLevelUpEvolution(pokemon, logBox) {
    const eeveeLvlUpEvos = [700, 196, 197]; // Sylveon, Espeon, Umbreon
    const targetId = eeveeLvlUpEvos[Math.floor(Math.random() * eeveeLvlUpEvos.length)];
    try {
        const evolved = await fetchPokemonData(targetId);
        const oldName = pokemon.name;
        pokemon.id    = evolved.id;
        pokemon.name  = evolved.name;
        pokemon.type1 = evolved.type1;
        pokemon.type2 = evolved.type2;
        pokemon.sprite = pixelSprite(evolved.id, !!pokemon.isShiny);
        pokemon.hp    = evolved.hp;
        pokemon.atk   = evolved.atk;
        pokemon.def   = evolved.def;
        pokemon.spAtk = evolved.spAtk || evolved.atk;
        pokemon.spDef = evolved.spDef || evolved.def;
        pokemon.speed = evolved.speed || 60;
        if (logBox) logBox.innerHTML += `<div class="text-pink-400 font-black animate-pulse mt-1">🌟 ${oldName} evolved into <span class="text-white">${evolved.name.toUpperCase()}</span>!</div>`;
        showNotification('✨ EVOLUTION!', `Eevee evolved into ${evolved.name}!`, 'success');
        // Teach evolved-form moves at current level
        const evoNewMoves = applyLevelUpMoves(pokemon, { evolved: true });
        if (evoNewMoves.length > 0 && logBox) {
            evoNewMoves.forEach(m => logBox.innerHTML += `<div class="text-cyan-400 font-bold mt-1">📖 ${pokemon.name} learned <span class="text-white capitalize">${m.replace(/-/g,' ')}</span>!</div>`);
        }
        saveProgress();
    } catch(e) { /* silent — evolution is cosmetic if fetch fails */ }
}

// ── Level-up evolution table ──────────────────────────────────────────────
const LEVEL_EVO_TABLE = {
    // Gen 1
    1: { level: 16, evolvesTo: 2 },    // Bulbasaur → Ivysaur
    2: { level: 32, evolvesTo: 3 },    // Ivysaur → Venusaur
    4: { level: 16, evolvesTo: 5 },    // Charmander → Charmeleon
    5: { level: 36, evolvesTo: 6 },    // Charmeleon → Charizard
    7: { level: 16, evolvesTo: 8 },    // Squirtle → Wartortle
    8: { level: 36, evolvesTo: 9 },    // Wartortle → Blastoise
    10: { level: 7, evolvesTo: 11 },   // Caterpie → Metapod
    11: { level: 10, evolvesTo: 12 },  // Metapod → Butterfree
    13: { level: 7, evolvesTo: 14 },   // Weedle → Kakuna
    14: { level: 10, evolvesTo: 15 },  // Kakuna → Beedrill
    16: { level: 18, evolvesTo: 17 },  // Pidgey → Pidgeotto
    17: { level: 36, evolvesTo: 18 },  // Pidgeotto → Pidgeot
    19: { level: 20, evolvesTo: 20 },  // Rattata → Raticate
    21: { level: 20, evolvesTo: 22 },  // Spearow → Fearow
    23: { level: 22, evolvesTo: 24 },  // Ekans → Arbok
    27: { level: 22, evolvesTo: 28 },  // Sandshrew → Sandslash
    29: { level: 16, evolvesTo: 30 },  // Nidoran♀ → Nidorina
    32: { level: 16, evolvesTo: 33 },  // Nidoran♂ → Nidorino
    35: { level: 36, evolvesTo: 36 },  // Clefairy → Clefable (simplified)
    37: { level: 38, evolvesTo: 38 },  // Vulpix → Ninetales (simplified)
    39: { level: 36, evolvesTo: 40 },  // Jigglypuff → Wigglytuff (simplified)
    41: { level: 22, evolvesTo: 42 },  // Zubat → Golbat
    43: { level: 21, evolvesTo: 44 },  // Oddish → Gloom
    44: { level: 36, evolvesTo: 45 },  // Gloom → Vileplume (simplified)
    46: { level: 24, evolvesTo: 47 },  // Paras → Parasect
    48: { level: 31, evolvesTo: 49 },  // Venonat → Venomoth
    50: { level: 26, evolvesTo: 51 },  // Diglett → Dugtrio
    52: { level: 28, evolvesTo: 53 },  // Meowth → Persian
    54: { level: 33, evolvesTo: 55 },  // Psyduck → Golduck
    56: { level: 28, evolvesTo: 57 },  // Mankey → Primeape
    58: { level: 50, evolvesTo: 59 },  // Growlithe → Arcanine (simplified)
    60: { level: 25, evolvesTo: 61 },  // Poliwag → Poliwhirl
    61: { level: 36, evolvesTo: 62 },  // Poliwhirl → Poliwrath (simplified)
    63: { level: 16, evolvesTo: 64 },  // Abra → Kadabra
    64: { level: 36, evolvesTo: 65 },  // Kadabra → Alakazam (simplified)
    66: { level: 28, evolvesTo: 67 },  // Machop → Machoke
    67: { level: 36, evolvesTo: 68 },  // Machoke → Machamp (simplified)
    69: { level: 21, evolvesTo: 70 },  // Bellsprout → Weepinbell
    70: { level: 36, evolvesTo: 71 },  // Weepinbell → Victreebel (simplified)
    72: { level: 30, evolvesTo: 73 },  // Tentacool → Tentacruel
    74: { level: 25, evolvesTo: 75 },  // Geodude → Graveler
    75: { level: 36, evolvesTo: 76 },  // Graveler → Golem (simplified)
    77: { level: 40, evolvesTo: 78 },  // Ponyta → Rapidash
    79: { level: 37, evolvesTo: 80 },  // Slowpoke → Slowbro
    81: { level: 30, evolvesTo: 82 },  // Magnemite → Magneton
    84: { level: 31, evolvesTo: 85 },  // Doduo → Dodrio
    86: { level: 34, evolvesTo: 87 },  // Seel → Dewgong
    88: { level: 38, evolvesTo: 89 },  // Grimer → Muk
    90: { level: 36, evolvesTo: 91 },  // Shellder → Cloyster (simplified)
    92: { level: 25, evolvesTo: 93 },  // Gastly → Haunter
    93: { level: 36, evolvesTo: 94 },  // Haunter → Gengar (simplified)
    96: { level: 26, evolvesTo: 97 },  // Drowzee → Hypno
    98: { level: 28, evolvesTo: 99 },  // Krabby → Kingler
    100: { level: 30, evolvesTo: 101 }, // Voltorb → Electrode
    102: { level: 36, evolvesTo: 103 }, // Exeggcute → Exeggutor (simplified)
    104: { level: 28, evolvesTo: 105 }, // Cubone → Marowak
    109: { level: 35, evolvesTo: 110 }, // Koffing → Weezing
    111: { level: 42, evolvesTo: 112 }, // Rhyhorn → Rhydon
    116: { level: 32, evolvesTo: 117 }, // Horsea → Seadra
    118: { level: 33, evolvesTo: 119 }, // Goldeen → Seaking
    120: { level: 36, evolvesTo: 121 }, // Staryu → Starmie (simplified)
    129: { level: 20, evolvesTo: 130 }, // Magikarp �� Gyarados
    147: { level: 30, evolvesTo: 148 }, // Dratini → Dragonair
    148: { level: 55, evolvesTo: 149 }, // Dragonair → Dragonite
    // Gen 2
    152: { level: 16, evolvesTo: 153 }, // Chikorita → Bayleef
    153: { level: 32, evolvesTo: 154 }, // Bayleef → Meganium
    155: { level: 14, evolvesTo: 156 }, // Cyndaquil → Quilava
    156: { level: 36, evolvesTo: 157 }, // Quilava → Typhlosion
    158: { level: 18, evolvesTo: 159 }, // Totodile → Croconaw
    159: { level: 30, evolvesTo: 160 }, // Croconaw → Feraligatr
    161: { level: 15, evolvesTo: 162 }, // Sentret → Furret
    163: { level: 20, evolvesTo: 164 }, // Hoothoot → Noctowl
    165: { level: 18, evolvesTo: 166 }, // Ledyba → Ledian
    167: { level: 22, evolvesTo: 168 }, // Spinarak → Ariados
    170: { level: 27, evolvesTo: 171 }, // Chinchou → Lanturn
    172: { level: 18, evolvesTo: 25 },  // Pichu → Pikachu (simplified)
    173: { level: 18, evolvesTo: 35 },  // Cleffa → Clefairy (simplified)
    174: { level: 18, evolvesTo: 39 },  // Igglybuff → Jigglypuff (simplified)
    175: { level: 18, evolvesTo: 176 }, // Togepi → Togetic (simplified)
    177: { level: 25, evolvesTo: 178 }, // Natu → Xatu
    179: { level: 15, evolvesTo: 180 }, // Mareep → Flaaffy
    180: { level: 30, evolvesTo: 181 }, // Flaaffy → Ampharos
    183: { level: 18, evolvesTo: 184 }, // Marill → Azumarill
    187: { level: 18, evolvesTo: 188 }, // Hoppip → Skiploom
    188: { level: 27, evolvesTo: 189 }, // Skiploom → Jumpluff
    191: { level: 18, evolvesTo: 192 }, // Sunkern → Sunflora (simplified)
    193: { level: 24, evolvesTo: 469 }, // Yanma → Yanmega (simplified)
    194: { level: 20, evolvesTo: 195 }, // Wooper → Quagsire
    198: { level: 30, evolvesTo: 430 }, // Murkrow → Honchkrow (simplified)
    200: { level: 25, evolvesTo: 429 }, // Misdreavus → Mismagius (simplified)
    204: { level: 31, evolvesTo: 205 }, // Pineco → Forretress
    209: { level: 23, evolvesTo: 210 }, // Snubbull → Granbull
    213: { level: 30, evolvesTo: 213 }, // Shuckle stays
    214: { level: 25, evolvesTo: 214 }, // Heracross stays
    215: { level: 40, evolvesTo: 461 }, // Sneasel → Weavile (simplified)
    216: { level: 30, evolvesTo: 217 }, // Teddiursa → Ursaring
    218: { level: 38, evolvesTo: 219 }, // Slugma → Magcargo
    220: { level: 33, evolvesTo: 221 }, // Swinub → Piloswine
    221: { level: 58, evolvesTo: 473 }, // Piloswine → Mamoswine (simplified)
    223: { level: 25, evolvesTo: 224 }, // Remoraid → Octillery
    228: { level: 24, evolvesTo: 229 }, // Houndour → Houndoom
    246: { level: 30, evolvesTo: 247 }, // Larvitar → Pupitar
    247: { level: 55, evolvesTo: 248 }, // Pupitar → Tyranitar
    // Gen 3
    252: { level: 16, evolvesTo: 253 }, // Treecko → Grovyle
    253: { level: 36, evolvesTo: 254 }, // Grovyle → Sceptile
    255: { level: 16, evolvesTo: 256 }, // Torchic → Combusken
    256: { level: 36, evolvesTo: 257 }, // Combusken → Blaziken
    258: { level: 16, evolvesTo: 259 }, // Mudkip → Marshtomp
    259: { level: 36, evolvesTo: 260 }, // Marshtomp → Swampert
    261: { level: 18, evolvesTo: 262 }, // Poochyena → Mightyena
    263: { level: 20, evolvesTo: 264 }, // Zigzagoon → Linoone
    265: { level: 7,  evolvesTo: 266 }, // Wurmple → Silcoon
    266: { level: 10, evolvesTo: 267 }, // Silcoon → Beautifly
    270: { level: 14, evolvesTo: 271 }, // Lotad → Lombre
    271: { level: 36, evolvesTo: 272 }, // Lombre → Ludicolo (simplified)
    273: { level: 14, evolvesTo: 274 }, // Seedot → Nuzleaf
    274: { level: 36, evolvesTo: 275 }, // Nuzleaf → Shiftry (simplified)
    276: { level: 22, evolvesTo: 277 }, // Taillow → Swellow
    278: { level: 25, evolvesTo: 279 }, // Wingull → Pelipper
    280: { level: 20, evolvesTo: 281 }, // Ralts → Kirlia
    281: { level: 30, evolvesTo: 282 }, // Kirlia → Gardevoir
    283: { level: 22, evolvesTo: 284 }, // Surskit → Masquerain
    285: { level: 23, evolvesTo: 286 }, // Shroomish → Breloom
    287: { level: 36, evolvesTo: 288 }, // Slakoth → Vigoroth
    288: { level: 36, evolvesTo: 289 }, // Vigoroth → Slaking
    290: { level: 20, evolvesTo: 291 }, // Nincada → Ninjask
    293: { level: 20, evolvesTo: 294 }, // Whismur ��� Loudred
    294: { level: 40, evolvesTo: 295 }, // Loudred → Exploud
    296: { level: 24, evolvesTo: 297 }, // Makuhita → Hariyama
    300: { level: 18, evolvesTo: 301 }, // Skitty → Delcatty (simplified)
    304: { level: 32, evolvesTo: 305 }, // Aron → Lairon
    305: { level: 42, evolvesTo: 306 }, // Lairon → Aggron
    307: { level: 32, evolvesTo: 308 }, // Meditite → Medicham
    309: { level: 26, evolvesTo: 310 }, // Electrike → Manectric
    315: { level: 25, evolvesTo: 407 }, // Roselia → Roserade (simplified)
    316: { level: 26, evolvesTo: 317 }, // Gulpin → Swalot
    318: { level: 30, evolvesTo: 319 }, // Carvanha → Sharpedo
    320: { level: 40, evolvesTo: 321 }, // Wailmer → Wailord
    322: { level: 33, evolvesTo: 323 }, // Numel → Camerupt
    325: { level: 32, evolvesTo: 326 }, // Spoink → Grumpig
    328: { level: 22, evolvesTo: 329 }, // Trapinch → Vibrava
    329: { level: 45, evolvesTo: 330 }, // Vibrava → Flygon
    331: { level: 32, evolvesTo: 332 }, // Cacnea → Cacturne
    333: { level: 35, evolvesTo: 334 }, // Swablu → Altaria
    339: { level: 30, evolvesTo: 340 }, // Barboach → Whiscash
    341: { level: 30, evolvesTo: 342 }, // Corphish → Crawdaunt
    343: { level: 36, evolvesTo: 344 }, // Baltoy → Claydol
    345: { level: 38, evolvesTo: 346 }, // Lileep → Cradily
    347: { level: 40, evolvesTo: 348 }, // Anorith → Armaldo
    349: { level: 20, evolvesTo: 350 }, // Feebas → Milotic (simplified)
    353: { level: 37, evolvesTo: 354 }, // Shuppet → Banette
    355: { level: 37, evolvesTo: 356 }, // Duskull → Dusclops
    360: { level: 40, evolvesTo: 202 }, // Wynaut → Wobbuffet
    361: { level: 42, evolvesTo: 362 }, // Snorunt → Glalie
    363: { level: 32, evolvesTo: 364 }, // Spheal → Sealeo
    364: { level: 44, evolvesTo: 365 }, // Sealeo → Walrein
    366: { level: 36, evolvesTo: 367 }, // Clamperl → Huntail (simplified)
    371: { level: 30, evolvesTo: 372 }, // Bagon → Shelgon
    372: { level: 50, evolvesTo: 373 }, // Shelgon → Salamence
    374: { level: 20, evolvesTo: 375 }, // Beldum → Metang
    375: { level: 45, evolvesTo: 376 }, // Metang → Metagross
    // Gen 4
    387: { level: 18, evolvesTo: 388 }, // Turtwig → Grotle
    388: { level: 32, evolvesTo: 389 }, // Grotle → Torterra
    390: { level: 14, evolvesTo: 391 }, // Chimchar → Monferno
    391: { level: 36, evolvesTo: 392 }, // Monferno → Infernape
    393: { level: 16, evolvesTo: 394 }, // Piplup → Prinplup
    394: { level: 36, evolvesTo: 395 }, // Prinplup → Empoleon
    396: { level: 14, evolvesTo: 397 }, // Starly → Staravia
    397: { level: 34, evolvesTo: 398 }, // Staravia → Staraptor
    403: { level: 15, evolvesTo: 404 }, // Shinx → Luxio
    404: { level: 30, evolvesTo: 405 }, // Luxio → Luxray
    406: { level: 18, evolvesTo: 315 }, // Budew → Roselia (simplified)
    408: { level: 30, evolvesTo: 409 }, // Cranidos → Rampardos
    410: { level: 30, evolvesTo: 411 }, // Shieldon → Bastiodon
    415: { level: 21, evolvesTo: 416 }, // Combee → Vespiquen (female)
    418: { level: 26, evolvesTo: 419 }, // Buizel → Floatzel
    420: { level: 25, evolvesTo: 421 }, // Cherubi → Cherrim
    422: { level: 30, evolvesTo: 423 }, // Shellos → Gastrodon
    425: { level: 28, evolvesTo: 426 }, // Drifloon → Drifblim
    427: { level: 18, evolvesTo: 428 }, // Buneary → Lopunny (simplified)
    431: { level: 28, evolvesTo: 432 }, // Glameow → Purugly
    434: { level: 34, evolvesTo: 435 }, // Stunky → Skuntank
    436: { level: 38, evolvesTo: 437 }, // Bronzor → Bronzong
    440: { level: 18, evolvesTo: 113 }, // Happiny → Chansey (simplified)
    442: { level: 30, evolvesTo: 442 }, // Spiritomb stays
    443: { level: 24, evolvesTo: 444 }, // Gible → Gabite
    444: { level: 48, evolvesTo: 445 }, // Gabite → Garchomp
    447: { level: 20, evolvesTo: 448 }, // Riolu → Lucario (simplified)
    449: { level: 34, evolvesTo: 450 }, // Hippopotas → Hippowdon
    451: { level: 40, evolvesTo: 452 }, // Skorupi → Drapion
    453: { level: 37, evolvesTo: 454 }, // Croagunk → Toxicroak
    456: { level: 30, evolvesTo: 457 }, // Finneon → Lumineon
    459: { level: 40, evolvesTo: 460 }, // Snover → Abomasnow
    // Gen 5
    495: { level: 17, evolvesTo: 496 }, // Snivy → Servine
    496: { level: 36, evolvesTo: 497 }, // Servine → Serperior
    498: { level: 17, evolvesTo: 499 }, // Tepig → Pignite
    499: { level: 36, evolvesTo: 500 }, // Pignite → Emboar
    501: { level: 17, evolvesTo: 502 }, // Oshawott → Dewott
    502: { level: 36, evolvesTo: 503 }, // Dewott → Samurott
    504: { level: 20, evolvesTo: 505 }, // Patrat → Watchog
    506: { level: 16, evolvesTo: 507 }, // Lillipup → Herdier
    507: { level: 32, evolvesTo: 508 }, // Herdier → Stoutland
    509: { level: 22, evolvesTo: 510 }, // Purrloin → Liepard
    511: { level: 28, evolvesTo: 512 }, // Pansage → Simisage (simplified)
    513: { level: 28, evolvesTo: 514 }, // Pansear → Simisear (simplified)
    515: { level: 28, evolvesTo: 516 }, // Panpour → Simipour (simplified)
    519: { level: 21, evolvesTo: 520 }, // Pidove → Tranquill
    520: { level: 32, evolvesTo: 521 }, // Tranquill → Unfezant
    524: { level: 25, evolvesTo: 525 }, // Roggenrola → Boldore
    525: { level: 36, evolvesTo: 526 }, // Boldore → Gigalith (simplified)
    527: { level: 32, evolvesTo: 528 }, // Woobat → Swoobat (simplified)
    529: { level: 31, evolvesTo: 530 }, // Drilbur → Excadrill
    532: { level: 25, evolvesTo: 533 }, // Timburr → Gurdurr
    533: { level: 36, evolvesTo: 534 }, // Gurdurr → Conkeldurr (simplified)
    535: { level: 25, evolvesTo: 536 }, // Tympole → Palpitoad
    536: { level: 36, evolvesTo: 537 }, // Palpitoad → Seismitoad
    538: { level: 30, evolvesTo: 538 }, // Throh stays
    539: { level: 30, evolvesTo: 539 }, // Sawk stays
    540: { level: 22, evolvesTo: 541 }, // Sewaddle → Swadloon
    541: { level: 30, evolvesTo: 542 }, // Swadloon → Leavanny (simplified)
    543: { level: 22, evolvesTo: 544 }, // Venipede → Whirlipede
    544: { level: 30, evolvesTo: 545 }, // Whirlipede → Scolipede
    546: { level: 28, evolvesTo: 547 }, // Cottonee → Whimsicott (simplified)
    548: { level: 28, evolvesTo: 549 }, // Petilil → Lilligant (simplified)
    551: { level: 29, evolvesTo: 552 }, // Sandile → Krokorok
    552: { level: 40, evolvesTo: 553 }, // Krokorok → Krookodile
    554: { level: 35, evolvesTo: 555 }, // Darumaka → Darmanitan
    557: { level: 34, evolvesTo: 558 }, // Dwebble → Crustle
    559: { level: 36, evolvesTo: 560 }, // Scraggy → Scrafty
    562: { level: 34, evolvesTo: 563 }, // Yamask → Cofagrigus
    564: { level: 37, evolvesTo: 565 }, // Tirtouga → Carracosta
    566: { level: 37, evolvesTo: 567 }, // Archen → Archeops
    568: { level: 36, evolvesTo: 569 }, // Trubbish → Garbodor
    570: { level: 30, evolvesTo: 571 }, // Zorua → Zoroark
    572: { level: 36, evolvesTo: 573 }, // Minccino → Cinccino (simplified)
    574: { level: 32, evolvesTo: 575 }, // Gothita → Gothorita
    575: { level: 41, evolvesTo: 576 }, // Gothorita → Gothitelle
    577: { level: 32, evolvesTo: 578 }, // Solosis → Duosion
    578: { level: 41, evolvesTo: 579 }, // Duosion → Reuniclus
    582: { level: 30, evolvesTo: 583 }, // Vanillite → Vanillish
    583: { level: 35, evolvesTo: 584 }, // Vanillish → Vanilluxe
    585: { level: 34, evolvesTo: 586 }, // Deerling → Sawsbuck
    592: { level: 38, evolvesTo: 593 }, // Frillish → Jellicent
    595: { level: 36, evolvesTo: 596 }, // Joltik → Galvantula
    599: { level: 38, evolvesTo: 600 }, // Klink → Klang
    600: { level: 49, evolvesTo: 601 }, // Klang → Klinklang
    602: { level: 39, evolvesTo: 603 }, // Tynamo → Eelektrik
    603: { level: 50, evolvesTo: 604 }, // Eelektrik → Eelektross (simplified)
    605: { level: 32, evolvesTo: 606 }, // Elgyem → Beheeyem
    607: { level: 41, evolvesTo: 608 }, // Litwick → Lampent
    608: { level: 52, evolvesTo: 609 }, // Lampent → Chandelure (simplified)
    610: { level: 38, evolvesTo: 611 }, // Axew → Fraxure
    611: { level: 48, evolvesTo: 612 }, // Fraxure → Haxorus
    613: { level: 37, evolvesTo: 614 }, // Cubchoo → Beartic
    616: { level: 36, evolvesTo: 617 }, // Shelmet → Accelgor (simplified)
    618: { level: 35, evolvesTo: 618 }, // Stunfisk stays
    619: { level: 50, evolvesTo: 620 }, // Mienfoo → Mienshao
    621: { level: 40, evolvesTo: 621 }, // Druddigon stays
    624: { level: 31, evolvesTo: 625 }, // Pawniard → Bisharp
    626: { level: 40, evolvesTo: 626 }, // Bouffalant stays
    627: { level: 27, evolvesTo: 628 }, // Rufflet → Braviary
    629: { level: 28, evolvesTo: 630 }, // Vullaby → Mandibuzz
    631: { level: 41, evolvesTo: 631 }, // Heatmor stays
    632: { level: 38, evolvesTo: 632 }, // Durant stays
    633: { level: 50, evolvesTo: 634 }, // Deino → Zweilous
    634: { level: 64, evolvesTo: 635 }, // Zweilous → Hydreigon
    // Gen 6
    650: { level: 16, evolvesTo: 651 }, // Chespin → Quilladin
    651: { level: 36, evolvesTo: 652 }, // Quilladin → Chesnaught
    653: { level: 16, evolvesTo: 654 }, // Fennekin → Braixen
    654: { level: 36, evolvesTo: 655 }, // Braixen → Delphox
    656: { level: 16, evolvesTo: 657 }, // Froakie → Frogadier
    657: { level: 36, evolvesTo: 658 }, // Frogadier → Greninja
    659: { level: 20, evolvesTo: 660 }, // Bunnelby → Diggersby
    661: { level: 17, evolvesTo: 662 }, // Fletchling → Fletchinder
    662: { level: 35, evolvesTo: 663 }, // Fletchinder → Talonflame
    664: { level: 9,  evolvesTo: 665 }, // Scatterbug → Spewpa
    665: { level: 12, evolvesTo: 666 }, // Spewpa → Vivillon
    667: { level: 35, evolvesTo: 668 }, // Litleo → Pyroar
    669: { level: 29, evolvesTo: 670 }, // Flabébé → Floette
    670: { level: 19, evolvesTo: 671 }, // Floette → Florges (simplified)
    672: { level: 32, evolvesTo: 673 }, // Skiddo → Gogoat
    674: { level: 32, evolvesTo: 675 }, // Pancham → Pangoro (simplified)
    677: { level: 25, evolvesTo: 678 }, // Espurr → Meowstic
    679: { level: 35, evolvesTo: 680 }, // Honedge → Doublade
    680: { level: 45, evolvesTo: 681 }, // Doublade → Aegislash (simplified)
    682: { level: 29, evolvesTo: 683 }, // Spritzee → Aromatisse (simplified)
    684: { level: 29, evolvesTo: 685 }, // Swirlix → Slurpuff (simplified)
    686: { level: 30, evolvesTo: 687 }, // Inkay → Malamar
    688: { level: 36, evolvesTo: 689 }, // Binacle → Barbaracle
    690: { level: 38, evolvesTo: 691 }, // Skrelp → Dragalge
    692: { level: 37, evolvesTo: 693 }, // Clauncher → Clawitzer
    694: { level: 30, evolvesTo: 695 }, // Helioptile → Heliolisk (simplified)
    696: { level: 39, evolvesTo: 697 }, // Tyrunt → Tyrantrum
    698: { level: 39, evolvesTo: 699 }, // Amaura → Aurorus
    701: { level: 32, evolvesTo: 701 }, // Hawlucha stays
    702: { level: 30, evolvesTo: 702 }, // Dedenne stays
    703: { level: 32, evolvesTo: 703 }, // Carbink stays
    704: { level: 40, evolvesTo: 705 }, // Goomy → Sliggoo
    705: { level: 50, evolvesTo: 706 }, // Sliggoo → Goodra
    708: { level: 32, evolvesTo: 709 }, // Phantump → Trevenant (simplified)
    710: { level: 32, evolvesTo: 711 }, // Pumpkaboo → Gourgeist (simplified)
    712: { level: 37, evolvesTo: 713 }, // Bergmite → Avalugg
    714: { level: 40, evolvesTo: 715 }, // Noibat → Noivern
    // Gen 7
    722: { level: 17, evolvesTo: 723 }, // Rowlet → Dartrix
    723: { level: 34, evolvesTo: 724 }, // Dartrix → Decidueye
    725: { level: 17, evolvesTo: 726 }, // Litten → Torracat
    726: { level: 34, evolvesTo: 727 }, // Torracat → Incineroar
    728: { level: 17, evolvesTo: 729 }, // Popplio → Brionne
    729: { level: 34, evolvesTo: 730 }, // Brionne → Primarina
    731: { level: 14, evolvesTo: 732 }, // Pikipek → Trumbeak
    732: { level: 28, evolvesTo: 733 }, // Trumbeak → Toucannon
    734: { level: 20, evolvesTo: 735 }, // Yungoos → Gumshoos
    736: { level: 20, evolvesTo: 737 }, // Grubbin → Charjabug
    737: { level: 30, evolvesTo: 738 }, // Charjabug → Vikavolt (simplified)
    739: { level: 28, evolvesTo: 740 }, // Crabrawler → Crabominable (simplified)
    742: { level: 25, evolvesTo: 743 }, // Cutiefly → Ribombee
    744: { level: 25, evolvesTo: 745 }, // Rockruff → Lycanroc (simplified)
    746: { level: 25, evolvesTo: 746 }, // Wishiwashi stays
    747: { level: 42, evolvesTo: 748 }, // Mareanie → Toxapex
    749: { level: 30, evolvesTo: 750 }, // Mudbray → Mudsdale
    751: { level: 22, evolvesTo: 752 }, // Dewpider → Araquanid
    753: { level: 34, evolvesTo: 754 }, // Fomantis → Lurantis
    755: { level: 24, evolvesTo: 756 }, // Morelull → Shiinotic
    757: { level: 33, evolvesTo: 758 }, // Salandit → Salazzle
    759: { level: 38, evolvesTo: 760 }, // Stufful → Bewear
    761: { level: 18, evolvesTo: 762 }, // Bounsweet → Steenee
    762: { level: 28, evolvesTo: 763 }, // Steenee → Tsareena (simplified)
    764: { level: 30, evolvesTo: 764 }, // Comfey stays
    765: { level: 30, evolvesTo: 765 }, // Oranguru stays
    766: { level: 30, evolvesTo: 766 }, // Passimian stays
    767: { level: 22, evolvesTo: 768 }, // Wimpod → Golisopod
    769: { level: 20, evolvesTo: 770 }, // Sandygast → Palossand
    774: { level: 30, evolvesTo: 774 }, // Minior stays
    775: { level: 30, evolvesTo: 775 }, // Komala stays
    776: { level: 30, evolvesTo: 776 }, // Turtonator stays
    778: { level: 30, evolvesTo: 778 }, // Mimikyu stays
    779: { level: 38, evolvesTo: 780 }, // Bruxish stays
    780: { level: 35, evolvesTo: 780 }, // Drampa stays
    781: { level: 40, evolvesTo: 781 }, // Dhelmise stays
    782: { level: 35, evolvesTo: 783 }, // Jangmo-o → Hakamo-o
    783: { level: 45, evolvesTo: 784 }, // Hakamo-o → Kommo-o
    // Gen 8
    810: { level: 16, evolvesTo: 811 }, // Grookey → Thwackey
    811: { level: 35, evolvesTo: 812 }, // Thwackey → Rillaboom
    813: { level: 16, evolvesTo: 814 }, // Scorbunny → Raboot
    814: { level: 35, evolvesTo: 815 }, // Raboot → Cinderace
    816: { level: 16, evolvesTo: 817 }, // Sobble → Drizzile
    817: { level: 35, evolvesTo: 818 }, // Drizzile → Inteleon
    819: { level: 16, evolvesTo: 820 }, // Skwovet → Greedent
    821: { level: 18, evolvesTo: 822 }, // Rookidee → Corvisquire
    822: { level: 38, evolvesTo: 823 }, // Corvisquire → Corviknight
    824: { level: 20, evolvesTo: 825 }, // Blipbug → Dottler
    825: { level: 30, evolvesTo: 826 }, // Dottler → Orbeetle
    827: { level: 22, evolvesTo: 828 }, // Nickit → Thievul
    829: { level: 20, evolvesTo: 830 }, // Gossifleur → Eldegoss
    831: { level: 24, evolvesTo: 832 }, // Wooloo → Dubwool
    833: { level: 22, evolvesTo: 834 }, // Chewtle → Drednaw
    835: { level: 30, evolvesTo: 836 }, // Yamper → Boltund
    837: { level: 18, evolvesTo: 838 }, // Rolycoly → Carkol
    838: { level: 34, evolvesTo: 839 }, // Carkol → Coalossal
    840: { level: 24, evolvesTo: 841 }, // Applin → Flapple (simplified)
    843: { level: 24, evolvesTo: 844 }, // Silicobra → Sandaconda
    845: { level: 50, evolvesTo: 845 }, // Cramorant stays
    846: { level: 30, evolvesTo: 847 }, // Arrokuda → Barraskewda
    848: { level: 30, evolvesTo: 849 }, // Toxel → Toxtricity (simplified)
    850: { level: 28, evolvesTo: 851 }, // Sizzlipede → Centiskorch
    852: { level: 28, evolvesTo: 853 }, // Clobbopus → Grapploct
    854: { level: 28, evolvesTo: 855 }, // Sinistea → Polteageist (simplified)
    856: { level: 20, evolvesTo: 857 }, // Hatenna → Hattrem
    857: { level: 34, evolvesTo: 858 }, // Hattrem → Hatterene
    859: { level: 18, evolvesTo: 860 }, // Impidimp → Morgrem
    860: { level: 32, evolvesTo: 861 }, // Morgrem → Grimmsnarl
    868: { level: 35, evolvesTo: 869 }, // Milcery → Alcremie (simplified)
    870: { level: 38, evolvesTo: 870 }, // Falinks stays
    871: { level: 30, evolvesTo: 871 }, // Pincurchin stays
    872: { level: 38, evolvesTo: 873 }, // Snom → Frosmoth (simplified)
    874: { level: 34, evolvesTo: 874 }, // Stonjourner stays
    875: { level: 38, evolvesTo: 875 }, // Eiscue stays
    876: { level: 30, evolvesTo: 876 }, // Indeedee stays
    877: { level: 30, evolvesTo: 877 }, // Morpeko stays
    878: { level: 30, evolvesTo: 879 }, // Cufant → Copperajah
    884: { level: 28, evolvesTo: 884 }, // Duraludon stays
    885: { level: 50, evolvesTo: 886 }, // Dreepy → Drakloak
    886: { level: 60, evolvesTo: 887 }, // Drakloak → Dragapult
    // Gen 9
    906: { level: 16, evolvesTo: 907 }, // Sprigatito → Floragato
    907: { level: 36, evolvesTo: 908 }, // Floragato → Meowscarada
    909: { level: 16, evolvesTo: 910 }, // Fuecoco → Crocalor
    910: { level: 36, evolvesTo: 911 }, // Crocalor → Skeledirge
    912: { level: 16, evolvesTo: 913 }, // Quaxly → Quaxwell
    913: { level: 36, evolvesTo: 914 }, // Quaxwell → Quaquaval
    915: { level: 18, evolvesTo: 916 }, // Lechonk → Oinkologne
    917: { level: 18, evolvesTo: 918 }, // Tarountula → Spidops
    919: { level: 14, evolvesTo: 920 }, // Nymble → Lokix
    921: { level: 18, evolvesTo: 922 }, // Pawmi → Pawmo
    922: { level: 32, evolvesTo: 923 }, // Pawmo → Pawmot (simplified)
    924: { level: 15, evolvesTo: 925 }, // Tandemaus → Maushold (simplified)
    926: { level: 25, evolvesTo: 927 }, // Fidough → Dachsbun
    928: { level: 28, evolvesTo: 929 }, // Squawkabilly stays (simplified)
    931: { level: 24, evolvesTo: 932 }, // Nacli → Naclstack
    932: { level: 38, evolvesTo: 933 }, // Naclstack → Garganacl
    934: { level: 25, evolvesTo: 935 }, // Charcadet → Armarouge (simplified)
    938: { level: 26, evolvesTo: 939 }, // Tadbulb → Bellibolt
    940: { level: 20, evolvesTo: 941 }, // Wattrel → Kilowattrel
    942: { level: 22, evolvesTo: 943 }, // Maschiff → Mabosstiff
    944: { level: 18, evolvesTo: 945 }, // Shroodle → Grafaiai
    946: { level: 22, evolvesTo: 947 }, // Bramblin → Brambleghast (simplified)
    948: { level: 25, evolvesTo: 949 }, // Toedscool → Toedscruel
    950: { level: 28, evolvesTo: 951 }, // Klawf stays (simplified)
    952: { level: 16, evolvesTo: 953 }, // Capsakid → Scovillain
    954: { level: 32, evolvesTo: 955 }, // Rellor → Rabsca (simplified)
    956: { level: 30, evolvesTo: 956 }, // Flittle stays
    957: { level: 35, evolvesTo: 957 }, // Tinkatink stays
    963: { level: 30, evolvesTo: 964 }, // Finizen → Palafin (simplified)
};

// IDs that evolve via stone only (skip automatic level-up evo check)
const STONE_EVO_ONLY = new Set([
    30,31,33,34,35,36,37,38,39,40,44,45,71,  // Nido/Clefairy/Vulpix/Jigglypuff/Vileplume lines
    58,59,80,90,91,102,103,120,121,  // Fire/Water stone evo targets
    133,134,135,136,196,197,700  // Eevee evolutions
]);

async function checkLevelUpEvolution(pokemon, logBox) {
    if (STONE_EVO_ONLY.has(pokemon.id)) return;
    const evoEntry = LEVEL_EVO_TABLE[pokemon.id];
    if (!evoEntry) return;
    if ((pokemon.level || 1) < evoEntry.level) return;
    if (pokemon.evoStoneUsed) return; // already stone-evolved, skip

    // Check if already at final form
    const targetId = evoEntry.evolvesTo;
    if (targetId === pokemon.id) return; // No-op entries for Pokémon that stay

    try {
        const evolved = await fetchPokemonData(targetId);
        const oldName = pokemon.name;
        pokemon.id    = evolved.id;
        pokemon.name  = evolved.name;
        pokemon.type1 = evolved.type1;
        pokemon.type2 = evolved.type2;
        pokemon.sprite = pixelSprite(evolved.id, !!pokemon.isShiny);
        pokemon.hp    = evolved.hp;
        pokemon.atk   = evolved.atk;
        pokemon.def   = evolved.def;
        pokemon.spAtk = evolved.spAtk || evolved.atk;
        pokemon.spDef = evolved.spDef || evolved.def;
        pokemon.speed = evolved.speed || 60;
        if (logBox) logBox.innerHTML += `<div class="text-pink-400 font-black animate-pulse mt-1">🌟 ${oldName} evolved into <span class="text-white">${evolved.name.toUpperCase()}</span>!</div>`;
        showNotification('✨ EVOLUTION!', `${oldName} evolved into ${evolved.name}!`, 'success');
        const evoMoves = applyLevelUpMoves(pokemon, { evolved: true });
        if (evoMoves.length > 0 && logBox) {
            evoMoves.forEach(m => logBox.innerHTML += `<div class="text-cyan-400 font-bold mt-1">📖 ${pokemon.name} learned <span class="text-white capitalize">${m.replace(/-/g,' ')}</span>!</div>`);
        }
        saveProgress();
    } catch(e) { /* silent */ }
}

function handleBattleVictory() {
    const stage = gameState.activeBattleStage;
    const fighter = gameState.battle.fighterPokemon;
    const team = gameState.battle.enemyTeam || [gameState.battle.bossPokemon];
    const currentIndex = gameState.battle.enemyTeamIndex || 0;

    if (team.length > 1 && currentIndex + 1 < team.length) {
        const nextIndex = currentIndex + 1;
        const nextEnemy = team[nextIndex];
        // Stat scaling (incl. +3 HP/level) was already applied when the team was built
        const nextMaxHP = Math.max(1, Math.round(nextEnemy.hp));
        gameState.battle.enemyTeamIndex = nextIndex;
        gameState.battle.bossPokemon = nextEnemy;
        gameState.battle.bossHP = nextMaxHP;
        gameState.battle.bossMaxHP = nextMaxHP;
        gameState.battle.bossOranUsed = false;
        // Player's Pokémon HP is NOT restored when the trainer sends out the next Pokémon
        // New Pokémon sent out — clear boss status & stat stages
        gameState.battle.statusConds.boss = null;
        gameState.battle.statStages.boss = { atk:0, def:0, spAtk:0, spDef:0, speed:0, accuracy:0 };
        if (!gameState.battle.statusMeta) gameState.battle.statusMeta = { player: {}, boss: {} };
        gameState.battle.statusMeta.boss = {};
        const logBox = document.getElementById('battleLog');
        logBox.innerHTML += `<div class="text-emerald-400 font-bold mt-2">✔ ${team[currentIndex].name} fainted!</div>`;
        logBox.scrollTop = logBox.scrollHeight;
        // Let the faint animation play before the next Pokémon appears
        const session = gameState.battle.session;
        gameState.battle.pendingSwap = true;
        setBattleBusy(gameState.battle.busy);
        setTimeout(() => {
            if (gameState.battle.session !== session) return;
            gameState.battle.pendingSwap = false;
            renderBattleSide('boss');
            logBox.innerHTML += `<div class="text-amber-400 font-bold mt-1">🎯 ${stage ? stage.trainer : 'Trainer'} ${t('battle.sentOut')} ${nextEnemy.name}!</div>`;
            logBox.scrollTop = logBox.scrollHeight;
            renderBattleMoves(gameState.battle.fighterPokemon || fighter);
        }, 900);
        return;
    }

    gameState.battle.active = false;
    setBattleBusy(false);
    flashEffectiveness(t('battle.victory'), 'super');
    playSuccessCapture();

    let rewardCoins = 40;
    let enemyLvl = 5;

    if (stage) {
        rewardCoins = stage.reward; enemyLvl = stage.level;
        if (gameState.unlockedStages === stage.stageId) {
            // Advance to the next stageId in sorted order (supports fractional IDs for inserted stages)
            const _allIds = CAMPAIGN_ROADMAP.map(s => s.stageId).sort((a, b) => a - b);
            const _idx = _allIds.indexOf(stage.stageId);
            gameState.unlockedStages = (_idx >= 0 && _idx + 1 < _allIds.length) ? _allIds[_idx + 1] : stage.stageId + 1;
        }
        // Award gym badge if this was a gym battle and not already earned
        if (stage.isGym && !gameState.gymBadges.includes(stage.stageId)) {
            gameState.gymBadges.push(stage.stageId);
            showNotification("🏅 GYM BADGE EARNED!", `You received the ${stage.badgeName}!`, 'success');
        } else {
            showNotification("STAGE CLEARED!", `Defeated ${stage.trainer}! Unlocked next sector channel!`, 'success');
        }
    } else {
        enemyLvl = gameState.battle.bossPokemon.level;
        rewardCoins = 30 + (enemyLvl * 8);
        gameState.endlessRunDefeats = (gameState.endlessRunDefeats || 0) + 1;
        showNotification("SIMULATION CLEARED!", `Defeated simulated foe! Claimed +${rewardCoins} Coins.`, 'success');
    }

    const xpAward = enemyLvl * 18;
    fighter.xp = (fighter.xp || 0) + xpAward;
    
    let nextLevelXp = (fighter.level || 1) * 100;
    let didLevelUp = false;

    while (fighter.xp >= nextLevelXp) {
        fighter.xp -= nextLevelXp;
        fighter.level = (fighter.level || 1) + 1;
        nextLevelXp = fighter.level * 100;
        didLevelUp = true;
        // Live level badge update
        const _lvlBadge = document.getElementById('playerFighterLevelBadge');
        if (_lvlBadge) _lvlBadge.textContent = (typeof t==='function'?t('battle.lvl'):'LVL') + ' ' + fighter.level;
        const newMoves = applyLevelUpMoves(fighter);
        // Evolution stone check is handled by checkLevelUpEvolution / STONE_EVO_ONLY set
        if (newMoves.length > 0) {
            const logBox2 = document.getElementById('battleLog');
            newMoves.forEach(m => logBox2.innerHTML += `<div class="text-cyan-400 font-bold mt-1">📖 ${fighter.name} learned <span class="text-white capitalize">${m.replace('-', ' ')}</span>!</div>`);
        }
    }

    // Check level-up evolution for all Pokémon (covers Eevee special case too)
    if (didLevelUp) {
        const logBoxEvo = document.getElementById('battleLog');
        if (fighter.id === 133 && fighter.level >= 20 && !fighter.evoStoneUsed) {
            checkEeveeLevelUpEvolution(fighter, logBoxEvo);
        } else {
            checkLevelUpEvolution(fighter, logBoxEvo);
        }
    }

    addCoins(rewardCoins);
    addXP(Math.round(rewardCoins / 2));
    gameEvent('battleWin', { stage, endless: !stage });

    // ── Exp. Share — only the Pokémon holding exp_share gets 50 % XP ──
    if (gameState.team && gameState.pcBox) {
        const logB = document.getElementById('battleLog');
        gameState.team.forEach(uid => {
            if (!uid) return;
            const tm = gameState.pcBox.find(p => p.uid === uid);
            if (!tm || tm.uid === fighter.uid) return; // active battler already earned full XP
            if (tm.heldItem !== 'exp_share') return;  // only the holder benefits
            const expShareAmt = Math.round(xpAward * 0.5);
            tm.xp = (tm.xp || 0) + expShareAmt;
            let tmNext = (tm.level||1) * 100;
            let tmLeveled = false;
            while (tm.xp >= tmNext) {
                tm.xp -= tmNext; tm.level = (tm.level||1)+1; tmNext = tm.level*100;
                const newMs = applyLevelUpMoves(tm);
                if (newMs.length > 0 && logB) {
                    newMs.forEach(m => logB.innerHTML += `<div class="text-cyan-300 mt-0.5 text-[9px]">📖 ${tm.name} learned <span class="capitalize">${m.replace(/-/g,' ')}</span>!</div>`);
                }
                tmLeveled = true;
            }
            if (logB) logB.innerHTML += `<div class="text-amber-300 mt-1 text-[10px]">📡 ${tm.name} +${expShareAmt} XP (Exp. Share)${tmLeveled?' → Lv'+tm.level:''}</div>`;
            if (tmLeveled) {
                if (tm.id === 133 && tm.level >= 20 && !tm.evoStoneUsed) checkEeveeLevelUpEvolution(tm, logB);
                else checkLevelUpEvolution(tm, logB);
            }
        });
    }

    // ── Region unlock when champion is beaten ──
    if (stage && stage.isChampion) {
        const REGION_NAMES_ARR = ['','Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'];
        const nextR = (stage.regionId||1) + 1;
        if (nextR <= 9 && !(gameState.unlockedRegions||[1]).includes(nextR)) {
            if (!gameState.unlockedRegions) gameState.unlockedRegions = [1];
            gameState.unlockedRegions.push(nextR);
            setTimeout(() => showNotification(`🌍 ${REGION_NAMES_ARR[nextR]} UNLOCKED!`,
                `Johto & beyond Pokémon now appear in the Spinner!`, 'success'), 1500);
        }
    }

    if (gameState.battle.fighterPokemon) {
        gameState.battle.fighterPokemon.battleCount = (gameState.battle.fighterPokemon.battleCount || 0) + 1;
        gameState.battle.fighterPokemon.friendship = Math.min(255, (gameState.battle.fighterPokemon.friendship || 50) + 3);
    }

    const logBox = document.getElementById('battleLog');
    logBox.innerHTML += `<div class="text-emerald-400 font-bold mt-2">🏆 VICTORY! Deployed partner gained +${xpAward} XP!</div>`;
    if (gameState.battle.fighterPokemon) {
        logBox.innerHTML += `<div class="text-blue-400 mt-1">💕 Friendship increased! (${gameState.battle.fighterPokemon.friendship}/255)</div>`;
    }
    if (didLevelUp) logBox.innerHTML += `<div class="text-pink-400 font-black animate-pulse mt-1">⭐ LEVEL UP! ${fighter.name} reached Level ${fighter.level}! Base stats increased by 5%!</div>`;
    logBox.scrollTop = logBox.scrollHeight;

    saveProgress();
    const session = gameState.battle.session;
    if (!stage) {
        // Endless mode: spawn the next challenger instead of returning to the selector
        setTimeout(() => { if (gameState.battle.session === session) spawnNextEndlessEnemy(fighter); }, 3500);
    } else {
        setTimeout(() => {
            if (gameState.battle.session !== session) return; // player already left
            resetBattleScreen(); renderRoadmap(); updateUI(); updateScanningRegionUI();
        }, 3500);
    }
}

function handleBattleDefeat() {
    const playerTeam = gameState.battle.playerTeam || [];
    const currentIndex = gameState.battle.playerTeamIndex ?? 0;
    const faintedName = gameState.battle.fighterPokemon ? gameState.battle.fighterPokemon.name : 'Your Pokémon';
    const logBox = document.getElementById('battleLog');

    logBox.innerHTML += `<div class="text-red-400 font-bold mt-2">💀 ${faintedName} fainted!</div>`;
    logBox.scrollTop = logBox.scrollHeight;

    // Track fainted Pokémon so the switch UI can exclude them
    if (gameState.battle.fighterPokemon) {
        if (!gameState.battle.faintedUids) gameState.battle.faintedUids = new Set();
        gameState.battle.faintedUids.add(gameState.battle.fighterPokemon.uid);
    }

    // Check for next alive team member — search the ENTIRE team, not just forward.
    // Benched Pokémon keep the HP they had when they were switched out.
    const faintedSet = gameState.battle.faintedUids || new Set();
    let nextIndex = -1;
    for (let i = 0; i < playerTeam.length; i++) {
        const p = playerTeam[i];
        if (p && !faintedSet.has(p.uid) && p !== gameState.battle.fighterPokemon && getBenchHP(p)[0] > 0) { nextIndex = i; break; }
    }
    const session = gameState.battle.session;

    if (nextIndex !== -1) {
        const nextFighter = playerTeam[nextIndex];
        const [nextHP, nextMaxHP] = getBenchHP(nextFighter);

        gameState.battle.playerTeamIndex = nextIndex;
        gameState.battle.fighterPokemon = nextFighter;
        gameState.battle.fighterHP = nextHP;
        gameState.battle.fighterMaxHP = nextMaxHP;
        gameState.battle.oranUsed = false;
        gameState.battle.choiceBandMove = null;
        // Incoming Pokémon arrives with clean status & stat stages
        gameState.battle.statusConds.player = null;
        gameState.battle.statStages.player = { atk:0, def:0, spAtk:0, spDef:0, speed:0, accuracy:0 };
        if (!gameState.battle.statusMeta) gameState.battle.statusMeta = { player: {}, boss: {} };
        gameState.battle.statusMeta.player = {};
        gameState.battle.active = true;

        // Let the faint animation play, then send out the next partner
        gameState.battle.pendingSwap = true;
        setBattleBusy(gameState.battle.busy);
        setTimeout(() => {
            if (gameState.battle.session !== session) return;
            gameState.battle.pendingSwap = false;
            renderBattleSide('player');
            logBox.innerHTML += `<div class="text-cyan-400 font-bold mt-1">⚡ Go, <span class="text-white font-black">${nextFighter.name}</span>! (${nextIndex + 1}/${playerTeam.length})</div>`;
            logBox.scrollTop = logBox.scrollHeight;
            renderBattleMoves(nextFighter);
        }, 900);
        return;
    }

    // All team members fainted — true defeat
    gameState.battle.active = false;
    setBattleBusy(false);
    renderBattlePips();
    if (!gameState.activeBattleStage) {
        gameState.endlessRunDefeats = 0;
    }
    playFailCapture();
    showNotification("ALL POKÉMON FAINTED", "Your entire team was defeated! Train harder or equip better items!", "error");
    logBox.innerHTML += `<div class="text-red-500 font-black mt-2">💀 All Pokémon fainted. Returning to base...</div>`;
    logBox.scrollTop = logBox.scrollHeight;
    setTimeout(() => { if (gameState.battle.session === session) resetBattleScreen(); }, 3000);
}

function resetBattleScreen() {
    document.getElementById('battleSelector').classList.remove('hidden');
    document.getElementById('fighterSelector').classList.add('hidden');
    document.getElementById('battleArenaActive').classList.add('hidden');
    document.getElementById('battleLoading').classList.add('hidden');
    // Invalidate any pending turn / next-round timers from the old battle
    gameState.battle.session = (gameState.battle.session || 0) + 1;
    gameState.battle.active = false;
    gameState.battle.busy = false;
    gameState.battle.pendingSwap = false;
    // Clear per-battle stat stages and status conditions
    gameState.battle.statStages = { player:{atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0}, boss:{atk:0,def:0,spAtk:0,spDef:0,speed:0,accuracy:0} };
    gameState.battle.statusConds = { player: null, boss: null };
    gameState.battle.statusMeta = { player: {}, boss: {} };
    gameState.battle.choiceBandMove = null;
    gameState.battle.faintedUids = new Set();
    flashEffectiveness('');
}

window.cancelBattlePrep = function() {
    initAudio();
    playConfirmSound();
    resetBattleScreen();
};
