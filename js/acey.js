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

  function cardName(rank) {
    return NAMES[rank] || String(rank);
  }

  function drawCard(rand) {
    const r = typeof rand === "function" ? rand() : Math.random();
    return 2 + Math.floor(r * 13);
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

  const api = { START: START, NAMES: NAMES, cardName: cardName, drawCard: drawCard, isBetween: isBetween, parseBet: parseBet, resolve: resolve };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AceyDeucey = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
