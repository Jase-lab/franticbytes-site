/* Hunt the Wumpus */
(function (root) {
  "use strict";

  const ARROWS = 5;
  const ROOMS = 20;
  const MAX_PATH = 5;

  /* 20-room dodecahedron; each room has three tunnels. */
  const TUNNELS = [
    [2, 5, 8],
    [1, 3, 10],
    [2, 4, 12],
    [3, 5, 14],
    [1, 4, 6],
    [5, 7, 15],
    [6, 8, 17],
    [1, 7, 9],
    [8, 10, 18],
    [2, 9, 11],
    [10, 12, 19],
    [3, 11, 13],
    [12, 14, 20],
    [4, 13, 15],
    [6, 14, 16],
    [15, 17, 20],
    [7, 16, 18],
    [9, 17, 19],
    [11, 18, 20],
    [13, 16, 19]
  ];

  function rng(rand) {
    return typeof rand === "function" ? rand() : Math.random();
  }

  function randRoom(rand) {
    return Math.floor(rng(rand) * ROOMS) + 1;
  }

  function randTunnel(rand) {
    return Math.floor(rng(rand) * 3);
  }

  function tunnels(room) {
    if (room < 1 || room > ROOMS) return [];
    return TUNNELS[room - 1].slice();
  }

  function connected(a, b) {
    const list = tunnels(a);
    let i;
    for (i = 0; i < list.length; i++) if (list[i] === b) return true;
    return false;
  }

  function cloneState(s) {
    return {
      player: s.player,
      wumpus: s.wumpus,
      pits: s.pits.slice(),
      bats: s.bats.slice(),
      arrows: s.arrows
    };
  }

  function emptyState() {
    return { player: 0, wumpus: 0, pits: [0, 0], bats: [0, 0], arrows: ARROWS };
  }

  function placeAll(rand) {
    const used = {};
    const rooms = [];
    let guard = 0;
    while (rooms.length < 6 && guard < 1000) {
      guard += 1;
      const r = randRoom(rand);
      if (used[r]) continue;
      used[r] = true;
      rooms.push(r);
    }
    return {
      player: rooms[0],
      wumpus: rooms[1],
      pits: [rooms[2], rooms[3]],
      bats: [rooms[4], rooms[5]],
      arrows: ARROWS
    };
  }

  function makeState(parts) {
    const s = emptyState();
    if (!parts) return s;
    if (parts.player) s.player = parts.player;
    if (parts.wumpus) s.wumpus = parts.wumpus;
    if (parts.pits) s.pits = parts.pits.slice();
    if (parts.bats) s.bats = parts.bats.slice();
    if (typeof parts.arrows === "number") s.arrows = parts.arrows;
    return s;
  }

  function resetFrom(saved) {
    const s = cloneState(saved);
    s.arrows = ARROWS;
    return s;
  }

  function warnings(state) {
    const adj = tunnels(state.player);
    const msgs = [];
    let i;
    const has = function (room) {
      let k;
      for (k = 0; k < adj.length; k++) if (adj[k] === room) return true;
      return false;
    };
    if (has(state.wumpus)) msgs.push("I SMELL A WUMPUS!");
    for (i = 0; i < state.pits.length; i++) {
      if (has(state.pits[i])) msgs.push("I FEEL A DRAFT");
    }
    for (i = 0; i < state.bats.length; i++) {
      if (has(state.bats[i])) msgs.push("BATS NEARBY!");
    }
    return msgs;
  }

  function tunnelLine(state) {
    const t = tunnels(state.player);
    return "TUNNELS LEAD TO " + t[0] + " " + t[1] + " " + t[2];
  }

  function roomLine(state) {
    return "YOU ARE IN ROOM " + state.player;
  }

  function turnLines(state) {
    const lines = warnings(state).slice();
    lines.push(roomLine(state));
    lines.push(tunnelLine(state));
    lines.push("SHOOT OR MOVE (S-M)?");
    return lines;
  }

  function canMove(state, room) {
    const n = Number(room);
    if (n < 1 || n > ROOMS || n !== Math.floor(n)) return false;
    return n === state.player || connected(state.player, n);
  }

  function startleWumpus(state, rand) {
    const k = Math.floor(rng(rand) * 4);
    if (k < 3) state.wumpus = tunnels(state.wumpus)[k];
    if (state.wumpus === state.player) {
      return { moved: k < 3, dead: true, message: "TSK TSK TSK - WUMPUS GOT YOU!" };
    }
    return { moved: k < 3, dead: false, message: "" };
  }

  function resolveRoom(state, rand) {
    const messages = [];
    let hops = 0;
    while (hops < 40) {
      hops += 1;
      if (state.player === state.wumpus) {
        messages.push("... OOPS! BUMPED A WUMPUS!");
        const wake = startleWumpus(state, rand);
        if (wake.dead) {
          messages.push(wake.message);
          messages.push("HA HA HA - YOU LOSE!");
          return { over: true, win: false, messages: messages };
        }
      }
      if (state.pits[0] === state.player || state.pits[1] === state.player) {
        messages.push("YYYIIIIEEEE . . . FELL IN PIT");
        messages.push("HA HA HA - YOU LOSE!");
        return { over: true, win: false, messages: messages };
      }
      if (state.bats[0] === state.player || state.bats[1] === state.player) {
        messages.push("ZAP--SUPER BAT SNATCH! ELSEWHEREVILLE FOR YOU!");
        state.player = randRoom(rand);
        continue;
      }
      return { over: false, win: false, messages: messages };
    }
    return { over: false, win: false, messages: messages };
  }

  function move(state, room, rand) {
    const n = Number(room);
    if (!canMove(state, n)) {
      return { ok: false, over: false, win: false, messages: ["NOT POSSIBLE -"] };
    }
    state.player = n;
    const res = resolveRoom(state, rand);
    res.ok = true;
    return res;
  }

  function validAimRoom(path, room) {
    const n = Number(room);
    if (n < 1 || n > ROOMS || n !== Math.floor(n)) return false;
    if (path && path.length >= 2 && n === path[path.length - 2]) return false;
    return true;
  }

  function shoot(state, path, rand) {
    const messages = [];
    const rooms = (path || []).map(Number).filter(function (n) { return n >= 1 && n <= ROOMS; });
    if (!rooms.length || rooms.length > MAX_PATH) {
      return { ok: false, over: false, win: false, messages: [] };
    }
    let loc = state.player;
    let k;
    for (k = 0; k < rooms.length; k++) {
      const want = rooms[k];
      if (connected(loc, want)) loc = want;
      else loc = tunnels(loc)[randTunnel(rand)];
      if (loc === state.wumpus) {
        messages.push("AHA! YOU GOT THE WUMPUS!");
        messages.push("HEE HEE HEE - THE WUMPUS'LL GET YOU NEXT TIME!!");
        return { ok: true, over: true, win: true, messages: messages };
      }
      if (loc === state.player) {
        messages.push("OUCH! ARROW GOT YOU!");
        messages.push("HA HA HA - YOU LOSE!");
        return { ok: true, over: true, win: false, messages: messages };
      }
    }
    messages.push("MISSED");
    const wake = startleWumpus(state, rand);
    if (wake.dead) {
      messages.push(wake.message);
      messages.push("HA HA HA - YOU LOSE!");
      return { ok: true, over: true, win: false, messages: messages };
    }
    state.arrows -= 1;
    if (state.arrows <= 0) {
      messages.push("HA HA HA - YOU LOSE!");
      return { ok: true, over: true, win: false, messages: messages };
    }
    return { ok: true, over: false, win: false, messages: messages };
  }

  function instructions() {
    return [
      "WELCOME TO 'HUNT THE WUMPUS'",
      " THE WUMPUS LIVES IN A CAVE OF 20 ROOMS. EACH ROOM",
      "HAS 3 TUNNELS LEADING TO OTHER ROOMS. (LOOK AT A",
      "DODECAHEDRON TO SEE HOW THIS WORKS-IF YOU DON'T KNOW",
      "WHAT A DODECAHEDRON IS, ASK SOMEONE)",
      "",
      " HAZARDS:",
      " BOTTOMLESS PITS - TWO ROOMS HAVE BOTTOMLESS PITS IN THEM",
      " IF YOU GO THERE, YOU FALL INTO THE PIT (& LOSE!)",
      " SUPER BATS - TWO OTHER ROOMS HAVE SUPER BATS. IF YOU",
      " GO THERE, A BAT GRABS YOU AND TAKES YOU TO SOME OTHER",
      " ROOM AT RANDOM. (WHICH MAY BE TROUBLESOME)",
      "",
      " WUMPUS:",
      " THE WUMPUS IS NOT BOTHERED BY HAZARDS (HE HAS SUCKER",
      " FEET AND IS TOO BIG FOR A BAT TO LIFT). USUALLY",
      " HE IS ASLEEP. TWO THINGS WAKE HIM UP: YOU SHOOTING AN",
      "ARROW OR YOU ENTERING HIS ROOM.",
      " IF THE WUMPUS WAKES HE MOVES (P=.75) ONE ROOM",
      " OR STAYS STILL (P=.25). AFTER THAT, IF HE IS WHERE YOU",
      " ARE, HE EATS YOU UP AND YOU LOSE!",
      "",
      " YOU:",
      " EACH TURN YOU MAY MOVE OR SHOOT A CROOKED ARROW",
      " MOVING: YOU CAN MOVE ONE ROOM (THRU ONE TUNNEL)",
      " ARROWS: YOU HAVE 5 ARROWS. YOU LOSE WHEN YOU RUN OUT",
      " EACH ARROW CAN GO FROM 1 TO 5 ROOMS. YOU AIM BY PICKING",
      " THE ROOM NUMBERS YOU WANT THE ARROW TO GO TO.",
      " IF THE ARROW CAN'T GO THAT WAY (IF NO TUNNEL) IT MOVES",
      " AT RANDOM TO THE NEXT ROOM.",
      " IF THE ARROW HITS THE WUMPUS, YOU WIN.",
      " IF THE ARROW HITS YOU, YOU LOSE.",
      "",
      " WARNINGS:",
      " WHEN YOU ARE ONE ROOM AWAY FROM A WUMPUS OR HAZARD,",
      " THE COMPUTER SAYS:",
      " WUMPUS: 'I SMELL A WUMPUS!'",
      " BAT : 'BATS NEARBY!'",
      " PIT : 'I FEEL A DRAFT'"
    ];
  }

  const api = {
    ARROWS: ARROWS,
    ROOMS: ROOMS,
    MAX_PATH: MAX_PATH,
    TUNNELS: TUNNELS,
    tunnels: tunnels,
    connected: connected,
    placeAll: placeAll,
    makeState: makeState,
    cloneState: cloneState,
    resetFrom: resetFrom,
    warnings: warnings,
    tunnelLine: tunnelLine,
    roomLine: roomLine,
    turnLines: turnLines,
    canMove: canMove,
    startleWumpus: startleWumpus,
    move: move,
    validAimRoom: validAimRoom,
    shoot: shoot,
    instructions: instructions
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HuntTheWumpus = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
