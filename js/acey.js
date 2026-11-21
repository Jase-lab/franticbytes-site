/* Acey Deucey */
(function (root) {
  "use strict";

  const START = 100;
  const NAMES = {
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "10",
    11: "JACK",
    12: "QUEEN",
    13: "KING",
    14: "ACE"
  };

  const SUITS = ["♠", "♥", "♦", "♣"];

  function cardName(rank) {
    return NAMES[rank] || String(rank);
  }

  function shortRank(rank) {
    if (rank === 14) return "A";
    if (rank === 13) return "K";
    if (rank === 12) return "Q";
    if (rank === 11) return "J";
    return String(rank);
  }

  function rng(rand) {
    return typeof rand === "function" ? rand() : Math.random();
  }

  function drawCard(rand) {
    return 2 + Math.floor(rng(rand) * 13);
  }

  function drawHand(n, rand) {
    const count = n || 3;
    const deck = [];
    for (let rank = 2; rank <= 14; rank++) {
      for (let s = 0; s < SUITS.length; s++) {
        deck.push({ rank: rank, suit: SUITS[s] });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng(rand) * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    return deck.slice(0, count);
  }

  function cardFace(rank, suit) {
    const r = shortRank(rank);
    const top = (r + "    ").slice(0, 5);
    const bot = ("    " + r).slice(-5);
    return [
      "+-----+",
      "|" + top + "|",
      "|  " + suit + "  |",
      "|" + bot + "|",
      "+-----+"
    ];
  }

  function cardBack() {
    return [
      "+-----+",
      "|# # #|",
      "| # # |",
      "|# # #|",
      "+-----+"
    ];
  }

  function renderHand(left, right, third) {
    const a = cardFace(left.rank, left.suit);
    const b = cardFace(right.rank, right.suit);
    const c = third && third.suit ? cardFace(third.rank, third.suit) : cardBack();
    return a.map(function (line, i) { return line + "  " + b[i] + "  " + c[i]; }).join("\n");
  }

  function isBetween(a, b, mid) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return mid > lo && mid < hi;
  }

  function parseBet(raw, credits) {
    const s = String(raw == null ? "" : raw).trim();
    if (!/^\d+$/.test(s)) return { ok: false, reason: "nan" };
    const bet = Number(s);
    if (bet > credits) return { ok: false, reason: "too_much", bet: bet };
    return { ok: true, bet: bet };
  }

  function resolve(credits, bet, a, b, c) {
    if (bet === 0) return { credits: credits, outcome: "chicken" };
    if (isBetween(a, b, c)) return { credits: credits + bet, outcome: "win" };
    return { credits: credits - bet, outcome: "lose" };
  }

  const api = { START: START, NAMES: NAMES, SUITS: SUITS, cardName: cardName, shortRank: shortRank, drawCard: drawCard, drawHand: drawHand, cardFace: cardFace, cardBack: cardBack, renderHand: renderHand, isBetween: isBetween, parseBet: parseBet, resolve: resolve };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AceyDeucey = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
