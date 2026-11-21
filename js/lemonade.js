/* Lemonade Stand */
(function (root) {
  "use strict";

  const START_CENTS = 200;
  const SIGN_COST = 15;
  const MAX_GLASSES = 1000;
  const MAX_SIGNS = 50;
  const MAX_PRICE = 100;
  const DAYS = 30;
  const P9 = 10;
  const S2 = 30;

  function glassCost(day) {
    if (day > 6) return 5;
    if (day > 2) return 4;
    return 2;
  }

  function money(cents) {
    const n = Math.round(Number(cents) || 0);
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);
    return sign + "$" + Math.floor(abs / 100) + "." + String(abs % 100).padStart(2, "0");
  }

  function parseWhole(raw, min, max) {
    const s = String(raw == null ? "" : raw).trim();
    if (!/^\d+$/.test(s)) return { ok: false, reason: "unreasonable" };
    const n = Number(s);
    if (n < min || n > max) return { ok: false, reason: "unreasonable" };
    return { ok: true, value: n };
  }

  function rng(rand) {
    return typeof rand === "function" ? rand() : Math.random();
  }

  /* Weather is rolled before the day counter is incremented, so days 1-3
     are sunny, matching the 1979 Apple II (Kellner) source. */
  function forecastWeather(dayBeforeIncrement, rand) {
    if (dayBeforeIncrement < 3) return { id: "sunny", sc: 2, label: "SUNNY" };
    const r = rng(rand);
    if (r < 0.6) return { id: "sunny", sc: 2, label: "SUNNY" };
    if (r < 0.8) return { id: "cloudy", sc: 10, label: "CLOUDY" };
    return { id: "hot", sc: 7, label: "HOT AND DRY" };
  }

  function rollEvents(day, weather, rand) {
    const messages = [];
    let r1 = 1;
    let r2 = 0;
    if (day === 3) messages.push("(YOUR MOTHER QUIT GIVING YOU FREE SUGAR)");
    if (day === 7) messages.push("(THE PRICE OF LEMONADE MIX JUST WENT UP)");
    if (day > 2) {
      if (weather.id === "cloudy") {
        const j = 30 + Math.floor(rng(rand) * 5) * 10;
        messages.push("THERE IS A " + j + "% CHANCE OF LIGHT RAIN,");
        messages.push("AND THE WEATHER IS COOLER TODAY.");
        r1 = 1 - j / 100;
      } else if (weather.id === "hot") {
        messages.push("A HEAT WAVE IS PREDICTED FOR TODAY!");
        r1 = 2;
      } else if (rng(rand) < 0.25) {
        messages.push("THE STREET DEPARTMENT IS WORKING TODAY.");
        messages.push("THERE WILL BE NO TRAFFIC ON YOUR STREET.");
        if (rng(rand) < 0.5) r2 = 2;
        else r1 = 0.1;
      }
    }
    return { r1: r1, r2: r2, messages: messages };
  }

  function maybeThunderstorm(day, weather, rand) {
    return day > 2 && weather && weather.id === "cloudy" && rng(rand) < 0.25;
  }

  function baseDemand(price) {
    if (price < P9) return (P9 - price) / P9 * 0.8 * S2 + S2;
    return (P9 * P9) * S2 / (price * price);
  }

  function signBoost(signs) {
    return 2 - Math.exp(-0.5 * signs);
  }

  function resolveDay(opts) {
    const glasses = opts.glasses;
    const signs = opts.signs;
    const price = opts.price;
    const cost = opts.cost;
    const r1 = opts.r1;
    const r2 = opts.r2;
    const storm = !!opts.storm;
    const expense = glasses * cost + signs * SIGN_COST;
    let sold;
    if (storm) {
      sold = 0;
    } else if (r2 === 2) {
      sold = glasses;
    } else {
      let n2 = r1 * baseDemand(price) * signBoost(signs);
      n2 = Math.floor(n2);
      if (n2 < 0) n2 = 0;
      if (n2 > glasses) n2 = glasses;
      sold = n2;
    }
    const income = sold * price;
    const profit = income - expense;
    return { sold: sold, income: income, expense: expense, profit: profit };
  }

  function weatherArt(id) {
    if (id === "hot") {
      return "  \\ | /\n -- * --\n  / | \\\n HOT AND DRY";
    }
    if (id === "cloudy") {
      return "   .--.\n  (    )\n   CLOUDY";
    }
    if (id === "storm") {
      return "   .--.\n  (    )\n    / /\n THUNDERSTORMS!";
    }
    return "  \\ | /\n -- * --\n  / | \\\n    SUNNY";
  }

  function padLeft(s, n) {
    s = String(s);
    while (s.length < n) s = " " + s;
    return s;
  }

  function padRight(s, n) {
    s = String(s);
    while (s.length < n) s += " ";
    return s;
  }

  function formatReport(day, result, glasses, signs, price, assets) {
    const sold = padLeft(result.sold, 4);
    const made = padLeft(glasses, 4);
    const signN = padLeft(signs, 4);
    const per = padRight(money(price), 7);
    const inc = money(result.income);
    const exp = money(result.expense);
    const pr = money(result.profit);
    const as = money(assets);
    return [
      "$$ LEMONSVILLE DAILY FINANCIAL REPORT $$",
      "",
      " DAY " + day,
      "",
      sold + "    GLASSES SOLD",
      per + " PER GLASS            INCOME " + inc,
      "",
      made + "    GLASSES MADE",
      signN + "    SIGNS MADE          EXPENSES " + exp,
      "",
      "                      PROFIT " + pr,
      "                      ASSETS " + as
    ].join("\n");
  }

  const api = {
    START_CENTS: START_CENTS,
    SIGN_COST: SIGN_COST,
    MAX_GLASSES: MAX_GLASSES,
    MAX_SIGNS: MAX_SIGNS,
    MAX_PRICE: MAX_PRICE,
    DAYS: DAYS,
    glassCost: glassCost,
    money: money,
    parseWhole: parseWhole,
    forecastWeather: forecastWeather,
    rollEvents: rollEvents,
    maybeThunderstorm: maybeThunderstorm,
    baseDemand: baseDemand,
    signBoost: signBoost,
    resolveDay: resolveDay,
    weatherArt: weatherArt,
    formatReport: formatReport
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LemonadeStand = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
