/* Freshwater Fishing */
(function (root) {
  "use strict";

  const CASTS_PER_DAY = 8;
  const HOOK_MS = { NIBBLE: 1500, STRIKE: 1100 };
  const LS_RECORDS = "fb_fish_records";

  const TILES = {
    "#": { land: true, ch: "#" },
    "=": { land: false, depth: 3, bottom: "SAND", dock: true, ch: "=" },
    ".": { land: false, depth: 4, bottom: "SAND", ch: "." },
    ",": { land: false, depth: 9, bottom: "SAND", ch: "," },
    "s": { land: false, depth: 16, bottom: "SAND", ch: "," },
    "w": { land: false, depth: 5, bottom: "WEEDS", ch: "w" },
    "W": { land: false, depth: 11, bottom: "WEEDS", ch: "W" },
    "o": { land: false, depth: 8, bottom: "ROCKS", ch: "o" },
    "O": { land: false, depth: 18, bottom: "ROCKS", ch: "O" },
    "d": { land: false, depth: 14, bottom: "DROP-OFF", ch: "\\" },
    "D": { land: false, depth: 24, bottom: "DROP-OFF", ch: "\\" },
    "~": { land: false, depth: 28, bottom: "SAND", ch: "~" }
  };

  const LAKES = [
    {
      id: "pine",
      name: "PINE LAKE",
      rows: [
        "########################",
        "####......wwww....######",
        "###...www,,,,ww......###",
        "##..w,,,,ddd,,,,www...##",
        "#...,,,ddd~~ddd,,,w....#",
        "##..ooo,dd~~dd,www....##",
        "###...oo,,,,,...ww...###",
        "##.........==.........##",
        "########################"
      ]
    },
    {
      id: "cedar",
      name: "CEDAR RESERVOIR",
      rows: [
        "########################",
        "##~~~~~DDDooo.........##",
        "#~~~~DDD~~~~oo,,,,.....#",
        "#~~~D~~......,,www.....#",
        "##~~D~...==,,,www.....##",
        "#~~~DD~~~~,,ooo........#",
        "#~~~~DDD~~~~OOOO,,.....#",
        "##~~~~~D~~~~~~~......###",
        "########################"
      ]
    }
  ];

  const LURES = [
    { id: "worm4", name: "4\" PLASTIC WORM", type: "worm", size: "small" },
    { id: "worm7", name: "7\" PLASTIC WORM", type: "worm", size: "large" },
    { id: "jig18", name: "1/8 OZ JIG", type: "jig", size: "small" },
    { id: "jig14", name: "1/4 OZ JIG", type: "jig", size: "medium" },
    { id: "spinS", name: "SMALL SPINNER", type: "spinner", size: "small" },
    { id: "spinL", name: "LARGE SPINNER", type: "spinner", size: "large" },
    { id: "crankS", name: "SHALLOW CRANKBAIT", type: "crank", size: "medium" },
    { id: "crankD", name: "DEEP CRANKBAIT", type: "crank", size: "large" },
    { id: "spoonM", name: "MEDIUM SPOON", type: "spoon", size: "medium" }
  ];

  const SPEEDS = ["SLOW", "MEDIUM", "FAST"];

  const SPECIES = [
    { id: "bluegill", name: "BLUEGILL", depth: [3, 8], bottoms: ["WEEDS", "SAND"], lures: ["worm", "jig"], sizes: ["small"], speeds: ["SLOW"], oz: [4, 16], rarity: 0.9 },
    { id: "crappie", name: "CRAPPIE", depth: [6, 14], bottoms: ["WEEDS", "DROP-OFF"], lures: ["jig", "worm"], sizes: ["small"], speeds: ["SLOW"], oz: [6, 24], rarity: 0.7 },
    { id: "perch", name: "YELLOW PERCH", depth: [6, 16], bottoms: ["SAND", "WEEDS"], lures: ["jig", "spoon"], sizes: ["small", "medium"], speeds: ["MEDIUM", "SLOW"], oz: [6, 20], rarity: 0.7 },
    { id: "lm-bass", name: "LARGEMOUTH BASS", depth: [4, 14], bottoms: ["WEEDS", "DROP-OFF"], lures: ["worm", "spinner", "crank"], sizes: ["medium", "large", "small"], speeds: ["SLOW", "MEDIUM"], oz: [16, 96], rarity: 0.55 },
    { id: "sm-bass", name: "SMALLMOUTH BASS", depth: [6, 18], bottoms: ["ROCKS", "DROP-OFF"], lures: ["crank", "spinner", "jig"], sizes: ["medium"], speeds: ["MEDIUM"], oz: [14, 80], rarity: 0.45 },
    { id: "walleye", name: "WALLEYE", depth: [10, 28], bottoms: ["SAND", "DROP-OFF"], lures: ["jig", "crank", "spoon"], sizes: ["medium", "large"], speeds: ["SLOW"], oz: [20, 120], rarity: 0.35 },
    { id: "pike", name: "NORTHERN PIKE", depth: [6, 20], bottoms: ["WEEDS", "DROP-OFF"], lures: ["spinner", "spoon"], sizes: ["large"], speeds: ["MEDIUM", "FAST"], oz: [32, 192], rarity: 0.3 },
    { id: "catfish", name: "CHANNEL CATFISH", depth: [10, 30], bottoms: ["SAND", "DROP-OFF"], lures: ["worm"], sizes: ["large", "medium"], speeds: ["SLOW"], oz: [24, 160], rarity: 0.3 },
    { id: "trout", name: "RAINBOW TROUT", depth: [10, 28], bottoms: ["ROCKS", "SAND"], lures: ["spoon", "spinner"], sizes: ["medium"], speeds: ["MEDIUM"], oz: [12, 80], rarity: 0.25 },
    { id: "muskie", name: "MUSKIE", depth: [8, 25], bottoms: ["WEEDS", "DROP-OFF", "ROCKS"], lures: ["spinner", "spoon"], sizes: ["large"], speeds: ["FAST"], oz: [80, 320], rarity: 0.08 }
  ];

  const HEADING_CH = { N: "^", S: "v", E: ">", W: "<" };
  const DELTA = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
  const KEY_HEADING = { ArrowUp: "N", ArrowDown: "S", ArrowLeft: "W", ArrowRight: "E" };

  function rng(rand) {
    return typeof rand === "function" ? rand() : Math.random();
  }

  function lakeById(id) {
    let i = 0;
    for (; i < LAKES.length; i++) if (LAKES[i].id === id) return LAKES[i];
    return LAKES[0];
  }

  function tileAt(lake, x, y) {
    const rows = lake.rows || lake;
    if (y < 0 || y >= rows.length) return { land: true, ch: "#" };
    const row = rows[y];
    if (x < 0 || x >= row.length) return { land: true, ch: "#" };
    const def = TILES[row.charAt(x)];
    return def ? Object.assign({ x: x, y: y }, def) : { land: true, ch: "#" };
  }

  function findDock(lake) {
    const rows = lake.rows;
    let y, x;
    for (y = 0; y < rows.length; y++) {
      x = rows[y].indexOf("=");
      if (x >= 0) return { x: x, y: y };
    }
    return { x: 1, y: 1 };
  }

  function moveBoat(lake, x, y, heading, key) {
    const dir = KEY_HEADING[key] || (DELTA[key] ? key : heading);
    const d = DELTA[key] || DELTA[dir] || [0, 0];
    const nx = x + d[0];
    const ny = y + d[1];
    const tile = tileAt(lake, nx, ny);
    if (tile.land) return { x: x, y: y, heading: dir, moved: false, tile: tileAt(lake, x, y) };
    return { x: nx, y: ny, heading: dir, moved: true, tile: tile };
  }

  function lureById(id) {
    let i = 0;
    for (; i < LURES.length; i++) if (LURES[i].id === id) return LURES[i];
    return LURES[0];
  }

  function speciesScore(species, cell, lure, speed) {
    let w = species.rarity * 0.2;
    if (cell.depth >= species.depth[0] && cell.depth <= species.depth[1]) w += 0.28;
    else w *= 0.12;
    if (species.bottoms.indexOf(cell.bottom) >= 0) w += 0.22;
    if (species.lures.indexOf(lure.type) >= 0) w += 0.24;
    if (species.sizes.indexOf(lure.size) >= 0) w += 0.1;
    if (species.speeds.indexOf(speed) >= 0) w += 0.16;
    else w *= 0.45;
    return w;
  }

  function rollBite(cell, lure, speed, rand) {
    if (!cell || cell.land) return { bite: false };
    const scores = [];
    let total = 0;
    let i;
    for (i = 0; i < SPECIES.length; i++) {
      const s = speciesScore(SPECIES[i], cell, lure, speed);
      scores.push(s);
      total += s;
    }
    const pBite = Math.min(0.82, 0.12 + total * 0.22);
    if (rng(rand) > pBite) return { bite: false, chance: pBite };
    let pick = rng(rand) * total;
    let idx = 0;
    for (i = 0; i < scores.length; i++) {
      pick -= scores[i];
      if (pick <= 0) { idx = i; break; }
      idx = i;
    }
    const sp = SPECIES[idx];
    const span = sp.oz[1] - sp.oz[0];
    const ounces = sp.oz[0] + Math.floor(rng(rand) * (span + 1));
    const kind = rng(rand) < 0.45 ? "NIBBLE" : "STRIKE";
    return { bite: true, kind: kind, species: sp, ounces: ounces, chance: pBite, window: HOOK_MS[kind] };
  }

  function hookHit(reactMs, windowMs) {
    return reactMs >= 0 && reactMs <= windowMs;
  }

  function startFight(ounces) {
    const needed = 3 + Math.min(5, Math.floor(ounces / 32));
    return { tension: 2, progress: 0, needed: needed, snapped: false, lost: false, landed: false };
  }

  function tensionLabel(t) {
    if (t <= 0) return "SLACK";
    if (t === 1) return "LIGHT";
    if (t === 2) return "STEADY";
    if (t === 3) return "TIGHT";
    if (t === 4) return "HIGH";
    return "CRITICAL";
  }

  function tensionBar(t) {
    const n = Math.max(0, Math.min(5, t));
    let s = "";
    let i;
    for (i = 0; i < 5; i++) s += i < n ? "=" : "-";
    return "[" + s + "] " + tensionLabel(n);
  }

  function fightAction(fight, action, rand) {
    const next = {
      tension: fight.tension,
      progress: fight.progress,
      needed: fight.needed,
      snapped: false,
      lost: false,
      landed: false,
      note: ""
    };
    const run = rng(rand);
    if (run < 0.3) {
      next.tension += 1;
      next.note = "THE FISH IS RUNNING!";
    } else if (run < 0.42) {
      next.tension += 2;
      next.note = "HARD RUN!  LINE IS SCREAMING!";
    } else if (run > 0.88) {
      next.tension = Math.max(0, next.tension - 1);
      next.note = "HE'S TIRING.";
    }
    if (action === "reel") {
      if (next.tension >= 4) {
        next.tension += 1;
        next.note = "TOO MUCH PRESSURE!";
      } else {
        next.progress += 1;
        next.tension += 1;
        if (!next.note) next.note = "YOU GAIN SOME LINE.";
      }
    } else if (action === "slack") {
      next.tension -= 2;
      if (next.tension < 0) {
        next.tension = 0;
        if (rng(rand) < 0.4) {
          next.lost = true;
          next.note = "HE THREW THE HOOK!";
        } else if (!next.note) next.note = "YOU GAVE TOO MUCH SLACK.";
      } else if (!next.note) next.note = "YOU GAVE HIM SLACK.";
    }
    if (next.tension >= 5) {
      next.snapped = true;
      next.lost = false;
      next.landed = false;
      next.note = "SNAP!  YOUR LINE BROKE.";
      return next;
    }
    if (next.lost) return next;
    if (next.progress >= next.needed) {
      next.landed = true;
      next.note = "YOU GOT HIM TO THE BOAT!";
    }
    return next;
  }

  function formatWeight(oz) {
    const n = Math.max(0, Math.round(Number(oz) || 0));
    const lb = Math.floor(n / 16);
    const r = n % 16;
    if (lb === 0) return r + " OZ";
    if (r === 0) return lb + " LB";
    return lb + " LB " + r + " OZ";
  }

  function renderMap(lake, boatX, boatY, heading) {
    const ch = HEADING_CH[heading] || "B";
    const lines = [];
    let y;
    for (y = 0; y < lake.rows.length; y++) {
      const row = lake.rows[y];
      let out = "";
      let x;
      for (x = 0; x < row.length; x++) {
        if (x === boatX && y === boatY) out += ch;
        else out += (TILES[row.charAt(x)] || TILES["#"]).ch;
      }
      lines.push(out);
    }
    return lines.join("\n");
  }

  function loadRecords(storage) {
    try {
      const raw = (storage || (typeof localStorage !== "undefined" ? localStorage : null));
      if (!raw) return {};
      const v = raw.getItem(LS_RECORDS);
      if (!v) return {};
      const data = JSON.parse(v);
      return data && typeof data === "object" ? data : {};
    } catch (e) {
      return {};
    }
  }

  function saveRecords(records, storage) {
    try {
      const raw = (storage || (typeof localStorage !== "undefined" ? localStorage : null));
      if (!raw) return;
      raw.setItem(LS_RECORDS, JSON.stringify(records));
    } catch (e) { /* ignore */ }
  }

  function updateRecords(records, speciesName, ounces, lakeName) {
    const prev = records[speciesName];
    if (!prev || ounces > prev.ounces) {
      records[speciesName] = { ounces: ounces, lake: lakeName };
      return true;
    }
    return false;
  }

  const api = {
    CASTS_PER_DAY: CASTS_PER_DAY,
    HOOK_MS: HOOK_MS,
    LS_RECORDS: LS_RECORDS,
    TILES: TILES,
    LAKES: LAKES,
    LURES: LURES,
    SPEEDS: SPEEDS,
    SPECIES: SPECIES,
    lakeById: lakeById,
    tileAt: tileAt,
    findDock: findDock,
    moveBoat: moveBoat,
    lureById: lureById,
    speciesScore: speciesScore,
    rollBite: rollBite,
    hookHit: hookHit,
    startFight: startFight,
    tensionLabel: tensionLabel,
    tensionBar: tensionBar,
    fightAction: fightAction,
    formatWeight: formatWeight,
    renderMap: renderMap,
    loadRecords: loadRecords,
    saveRecords: saveRecords,
    updateRecords: updateRecords
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FreshwaterFishing = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
