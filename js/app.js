/* FranticBBS Stuff */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const panels = {
    intro: $("intro"),
    login: $("login"),
    menu: $("menu"),
    product: $("product"),
    downloads: $("downloads"),
    doors: $("doors"),
    door: $("door"),
    about: $("about"),
    goodbye: $("goodbye"),
  };

  const state = {
    catalog: null,
    handle: "",
    view: "intro",
    productId: "write65",
    typing: false,
    cancelled: false,
  };

  const SESSION_LIMIT = 20;
  const SS_SESSION_START = "fb_session_start";
  const SS_TIMEUP = "fb_timeup_shown";

  function boardClock() {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Denver",
        day: "2-digit",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const get = (type) => {
        const part = parts.find((p) => p.type === type);
        return part ? part.value : "";
      };
      const date = `${get("day")} ${get("month").replace(".", "").toUpperCase()} ${get("year")}`;
      const time = `${String(get("hour")).padStart(2, "0")}:${String(get("minute")).padStart(2, "0")}`;
      return { date, time, stamp: `${date}  ${time}` };
    } catch {
      const d = new Date();
      const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      const dd = String(d.getDate()).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const date = `${dd} ${months[d.getMonth()]} ${yy}`;
      return { date, time: `${hh}:${mm}`, stamp: `${date}  ${hh}:${mm}` };
    }
  }

  function todayStamp() {
    return boardClock().date;
  }

  function resetSession() {
    state.sessionStart = 0;
    state._timeupShown = false;
    try {
      sessionStorage.removeItem(SS_SESSION_START);
      sessionStorage.removeItem(SS_TIMEUP);
    } catch {}
  }

  function newNode() {
    const prev = sessionNode();
    let n = prev;
    while (n === prev) n = 1 + Math.floor(Math.random() * 9);
    state._node = n;
    try { sessionStorage.setItem("fb_session_node", String(n)); } catch {}
    document.querySelectorAll(".node-num").forEach((el) => { el.textContent = String(n); });
  }

  function ensureSessionStart() {
    try {
      if (!sessionStorage.getItem(SS_SESSION_START)) {
        sessionStorage.setItem(SS_SESSION_START, String(Date.now()));
      }
      state.sessionStart = Number(sessionStorage.getItem(SS_SESSION_START)) || Date.now();
    } catch {
      if (!state.sessionStart) state.sessionStart = Date.now();
    }
  }

  function sessionMinutes() {
    if (!state.sessionStart) {
      try {
        const stored = sessionStorage.getItem(SS_SESSION_START);
        if (stored) state.sessionStart = Number(stored);
      } catch (_) { /* ignore */ }
    }
    if (!state.sessionStart) return { started: false, on: 0, left: SESSION_LIMIT };
    const on = Math.max(0, Math.floor((Date.now() - state.sessionStart) / 60000));
    return { started: true, on, left: Math.max(0, SESSION_LIMIT - on) };
  }

  function maybeShowTimeUp() {
    try {
      if (sessionStorage.getItem(SS_TIMEUP) === "1") return;
      sessionStorage.setItem(SS_TIMEUP, "1");
    } catch {
      if (state._timeupShown) return;
      state._timeupShown = true;
    }
    const dlg = $("time-up");
    if (dlg && typeof dlg.showModal === "function") dlg.showModal();
    else if (dlg) dlg.setAttribute("open", "");
  }

  function sessionNode() {
    try {
      const v = sessionStorage.getItem("fb_session_node");
      if (v && /^[1-9]$/.test(v)) return Number(v);
      const n = 1 + Math.floor(Math.random() * 9);
      sessionStorage.setItem("fb_session_node", String(n));
      return n;
    } catch {
      if (state._node === undefined) state._node = 1 + Math.floor(Math.random() * 9);
      return state._node;
    }
  }

  function sessionLevel() {
    try {
      const key = "fb_session_level";
      const existing = sessionStorage.getItem(key);
      if (existing && /^\d+$/.test(existing)) {
        const n = Number(existing);
        if (n >= 0 && n <= 99) return n;
      }
      const n = Math.floor(Math.random() * 100);
      sessionStorage.setItem(key, String(n));
      return n;
    } catch {
      if (state._level === undefined) state._level = Math.floor(Math.random() * 100);
      return state._level;
    }
  }

  function sessionDownloads() {
    try {
      const v = sessionStorage.getItem("fb_session_dl");
      if (v !== null && /^\d+$/.test(v)) return Number(v);
    } catch {}
    return typeof state._dl === "number" ? state._dl : 10;
  }

  function useDownload() {
    const n = Math.max(0, sessionDownloads() - 1);
    state._dl = n;
    try { sessionStorage.setItem("fb_session_dl", String(n)); } catch {}
    renderSessionFooter();
  }

  function renderSessionFooter() {
    const el = $("footer-left");
    if (!el) return;
    const sess = sessionMinutes();
    if (!sess.started) {
      el.textContent = "";
      return;
    }
    const handle = greetName();
    const lvl = sessionLevel();
    const left = sess.left;
    el.innerHTML = `<span class="session-handle">${escapeHtml(handle)}</span><span class="session-meta">&nbsp;&nbsp;LVL ${lvl}&nbsp;&nbsp;UL 0&nbsp;&nbsp;DL ${sessionDownloads()}&nbsp;&nbsp;<span class="status-timeleft">TL ${left} min</span></span>`;
  }

  function renderStatusBar() {
    const right = $("status-right");
    if (right) {
      right.innerHTML = `<span class="status-clock">${escapeHtml(boardClock().stamp)}</span>`;
    }
    renderSessionFooter();
    renderSysopCorner();
    const sess = sessionMinutes();
    if (sess.started && sess.left === 0 && state.view !== "goodbye" && state.view !== "intro" && state.view !== "login") { state.timeUp = true; go("goodbye"); }
  }

  function scheduleClock() {
    renderStatusBar();
    if (state.clockTimeout) clearTimeout(state.clockTimeout);
    if (state.clockInterval) clearInterval(state.clockInterval);
    const now = new Date();
    const ms = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    state.clockTimeout = setTimeout(() => {
      renderStatusBar();
      state.clockInterval = setInterval(renderStatusBar, 60000);
    }, Math.max(250, ms));
  }

  function sysopName() {
    return (state.catalog && state.catalog.site && state.catalog.site.sysop) || "Lord Frazzle";
  }

  function sysopIsOnline() {
    // Online for 15 minutes, offline for 15, all day (:00-:14 and :30-:44 online)
    const d = new Date();
    return Math.floor((d.getHours() * 60 + d.getMinutes()) / 15) % 2 === 0;
  }


  function renderSysopCorner() {
    const el = $("footer-right");
    if (!el) return;
    const on = sysopIsOnline();
    el.className = "sysop-corner";
    el.innerHTML = `
      <span class="sysop-name"><span class="ft-full">SYSOP: ${escapeHtml(sysopName())}</span><span class="ft-short">SYSOP</span></span>
      <span class="presence ${on ? "online" : "offline"}" title="${on ? "SysOp is on the board" : "SysOp is away from the board"}">
        <span class="dot" aria-hidden="true"></span>
        <span class="presence-label">${on ? "ONLINE" : "OFFLINE"}</span>
      </span>
    `;
  }

  function sleep(ms) {
    if (reduced) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function showPanel(name) {
    Object.entries(panels).forEach(([key, el]) => {
      if (!el) return;
      el.hidden = key !== name;
    });
    state.view = name;
    document.querySelectorAll(".node-num").forEach((el) => { el.textContent = String(sessionNode()); });
    document.body.classList.toggle("pre-login", name === "intro" || name === "login");
    if (name !== "intro" && name !== "login" && name !== "goodbye") {
      ensureSessionStart();
      renderSessionFooter();
    }
    $("app").focus({ preventScroll: true });
  }

  function rememberHandle(name) {
    state.handle = name;
    try {
      localStorage.setItem("fb_handle", name);
    } catch (_) { /* ignore */ }
  }

  function loadSavedHandle() {
    try {
      return localStorage.getItem("fb_handle") || "";
    } catch {
      return "";
    }
  }

  function normalizeHandle(raw) {
    const t = (raw || "").trim().replace(/\s+/g, " ");
    if (!t || /^guest$/i.test(t)) return "GUEST";
    return t.slice(0, 24).toUpperCase();
  }

  function productById(id) {
    const list = (state.catalog && state.catalog.products) || [];
    return list.find((p) => p.id === id) || list[0] || null;
  }

  function firstProduct() {
    return productById(state.productId) || productById("write65");
  }

  function fileUrl(product, file) {
    if (/^https?:\/\//i.test(file.filename)) return file.filename;
    const dir = (product.downloadsDir || "downloads/" + product.id).replace(/\/$/, "");
    return dir + "/" + file.filename;
  }

  async function loadCatalog() {
    try {
      const res = await fetch("products.json", { cache: "no-cache" });
      if (res.ok) {
        state.catalog = await res.json();
        return;
      }
    } catch (_) { /* file:// or offline */ }
    const fallback = $("products-fallback");
    state.catalog = fallback ? JSON.parse(fallback.textContent) : { products: [] };
  }

  function wantsSkip() {
    const q = new URLSearchParams(location.search);
    if (q.has("skip") || q.has("fast") || q.get("go") === "downloads") return true;
    const h = (location.hash || "").toLowerCase();
    if (h === "#downloads" || h === "#/downloads" || h === "#write65" || h === "#/write65" || h === "#/write65/downloads" || h === "#menu" || h === "#/menu" || h === "#about" || h === "#/about" || h === "#doors" || h === "#/doors" || h.startsWith("#/doors/")) {
      return true;
    }
    return false;
  }

  function wantsDownloads() {
    const q = new URLSearchParams(location.search);
    const h = (location.hash || "").toLowerCase();
    return q.get("go") === "downloads" || h === "#downloads" || h === "#/downloads" || h === "#/write65/downloads";
  }

  function setHash(path) {
    const next = path.startsWith("#") ? path : "#" + path;
    if (location.hash !== next) {
      history.replaceState(null, "", next);
    }
  }

  async function typeLines(target, lines) {
    state.typing = true;
    state.cancelled = false;
    target.innerHTML = "";
    const cursor = document.createElement("span");
    cursor.className = "block-cursor";
    cursor.setAttribute("aria-hidden", "true");

    for (const item of lines) {
      if (state.cancelled) break;
      const line = typeof item === "string" ? { text: item } : item;
      const row = document.createElement("div");
      if (line.cls) row.className = line.cls;
      target.appendChild(row);
      target.appendChild(cursor);

      const text = line.text || "";
      if (reduced) {
        row.textContent = text;
      } else {
        const delay = line.ms != null ? line.ms : (text.length ? 12 : 80);
        if (!text) {
          await sleep(line.pause || 160);
        } else {
          for (let i = 0; i < text.length; i += 1) {
            if (state.cancelled) break;
            row.textContent += text[i];
            await sleep(delay);
          }
        }
      }
      if (line.pause && !reduced && !state.cancelled) await sleep(line.pause);
    }

    if (!state.cancelled) target.appendChild(cursor);
    else cursor.remove();
    state.typing = false;
  }

  function cancelType() {
    state.cancelled = true;
  }

  async function runConnect() {
    resetSession();
    newNode();
    showPanel("intro");
    setHash("#/connect");
    const log = $("intro-log");
    await typeLines(log, [
      { text: "ATZ", cls: "info" },
      { text: "OK", cls: "ok", pause: 280 },
      { text: "", pause: 120 },
      { text: "ATDT 555-BYTE", cls: "info" },
      { text: "DIALING...", pause: 400 },
      { text: "RING", cls: "warn", pause: 420 },
      { text: "RING", cls: "warn", pause: 500 },
      { text: "CONNECT 2400", cls: "ok", pause: 360 },
      { text: "" },
      { text: "CARRIER DETECTED", cls: "magenta", pause: 200 },
      { text: "INITIALIZING ANSI TERMINAL...", pause: 240 },
      { text: "FRANTICBBS CONNECTED", cls: "info" },
      { text: "NODE " + sessionNode() + "  ·  PUBLIC ACCESS  ·  " + todayStamp(), cls: "info" },
    ]);
    if (!state.cancelled) showLogin();
  }

  function showLogin() {
    showPanel("login");
    setHash("#/login");
    const saved = loadSavedHandle();
    const input = $("handle-input");
    if (saved && saved !== "GUEST") input.value = saved;
    setTimeout(() => input.focus(), 50);
  }

  function greetName() {
    return state.handle || "GUEST";
  }

  function renderMainMenu() {
    const products = (state.catalog && state.catalog.products) || [];
    const nav = $("main-menu");
    nav.innerHTML = "";

    products.forEach((p, i) => {
      const key = (p.menuKey || p.name || "W").charAt(0).toUpperCase();
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-item";
      btn.dataset.go = "product";
      btn.dataset.product = p.id;
      btn.innerHTML = `<kbd>${escapeHtml(key)}</kbd> <span>${escapeHtml(p.name)} <span class="ver">v${escapeHtml(p.version)}${p.stage ? " " + p.stage : ""}</span></span>`;
      nav.appendChild(btn);
      p._key = key;
      if (i === 0) state.productId = p.id;
    });

    const extras = [
      { go: "downloads", key: "F", label: "Files" },
      { go: "doors", key: "D", label: "Doors" },
      { go: "about", key: "A", label: "About the board" },
      { go: "goodbye", key: "G", label: "Goodbye / log off" },
    ];
    extras.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-item";
      btn.dataset.go = item.go;
      btn.innerHTML = `<kbd>${item.key}</kbd> <span>${escapeHtml(item.label)}</span>`;
      nav.appendChild(btn);
    });
  }

  function showMenu() {
    renderMainMenu();
    $("welcome-line").textContent = `HELLO, ${greetName()}.  ACCESS GRANTED.  MAIL WAITING: 0`;
    showPanel("menu");
    setHash("#/menu");
    const first = $("main-menu").querySelector(".menu-item");
    if (first) first.focus();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showProduct(id) {
    const product = productById(id) || firstProduct();
    if (!product) return showMenu();
    state.productId = product.id;
    const body = $("product-body");
    body.innerHTML = `
      <h2>${escapeHtml(product.name)} <span class="ver">v${escapeHtml(product.version)}${product.stage ? " " + escapeHtml(product.stage) : ""}</span></h2>
      <p class="rule" aria-hidden="true">========================================</p>
      <p>${escapeHtml(product.tagline || "")}</p>
      <p>${escapeHtml(product.blurb || "")}</p>
    `;
    const nav = $("product-menu");
    nav.innerHTML = `<button type="button" class="menu-item" data-go="menu"><kbd>M</kbd> Back to Main Menu</button>`;
    showPanel("product");
    setHash("#/" + product.id);
    nav.querySelector(".menu-item").focus();
  }

  function showDownloads(id) {
    const product = productById(id) || firstProduct();
    if (!product) return showMenu();
    state.productId = product.id;
    $("downloads-title").textContent = `${product.name} Files`;
    $("downloads-lead").textContent = `This File Area has the ${product.name} drops for version ${product.version}${product.stage ? " (" + product.stage + ")" : ""}. If a file is not on the board yet, you will see COMING SOON instead of a broken link.`;
    const list = $("download-list");
    list.innerHTML = "";
    (product.downloads || []).forEach((file) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.className = "dl-link";
      a.href = fileUrl(product, file);
      a.dataset.product = product.id;
      a.dataset.file = file.id;
      a.innerHTML = `<span class="dl-num">${escapeHtml(file.key || "")}.</span><span class="dl-meta"><span class="dl-title">${escapeHtml(file.label)}</span><span class="dl-notes">${escapeHtml(file.filename)}</span></span>`;
      li.appendChild(a);
      list.appendChild(li);
    });
    const nav = $("downloads-nav");
    nav.innerHTML = `<button type="button" class="menu-item" data-go="menu"><kbd>M</kbd> Back to Main Menu</button>`;
    showPanel("downloads");
    setHash("#/" + product.id + "/downloads");
    const first = list.querySelector(".dl-link");
    if (first) first.focus();
  }

  function doorList() {
    return (state.catalog && Array.isArray(state.catalog.doors)) ? state.catalog.doors : [];
  }

  function showDoorNotice(status) {
    const closed = status === "out_of_order";
    $("soon-title").textContent = closed ? "*** OUT OF ORDER ***" : "*** COMING SOON ***";
    $("soon-body").textContent = closed
      ? "This door bay is dark. Lord Frazzle has not hung a game here yet."
      : "This door is framed, but no game is bolted on yet. Check back after the next drop.";
    $("soon-file").textContent = "No game is attached to this bay.";
    const dlg = $("coming-soon");
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  }

  function showDoors() {
    const doors = doorList();
    const heading = document.querySelector("#doors h2");
    if (heading) heading.textContent = "ONLINE GAMES (DOORS)";
    const lead = $("doors-lead");
    if (lead) {
      lead.classList.remove("dim");
      lead.innerHTML = "THE FOLLOWING DOOR GAMES ARE AVAILABLE ON THIS NODE.<br><br>DOORS RUN IN A SEPARATE PROGRAM.  TIME SPENT IN DOORS COUNTS AGAINST YOUR TIME REMAINING.";
    }
    const note = $("doors-note");
    if (note) {
      note.innerHTML = "";
      note.hidden = true;
    }
    const list = $("doors-list");
    list.innerHTML = "";
    const placeholders = [
      { id: "bay-1", key: "1", status: "coming_soon" },
      { id: "bay-2", key: "2", status: "out_of_order" },
      { id: "bay-3", key: "3", status: "coming_soon" },
    ];
    const usedKeys = new Set(doors.map((d) => String(d.key)));
    const rows = doors.concat(placeholders.filter((p) => !usedKeys.has(String(p.key))));
    rows.forEach((door) => {
      const li = document.createElement("li");
      const status = door.status || (door.url ? "open" : "coming_soon");
      const title = door.name || ("DOOR " + (door.key || ""));
      const isOpenLink = status === "open" && door.url;
      const isPlayable = status === "open" && !door.url;
      const el = document.createElement(isOpenLink ? "a" : "button");
      if (!isOpenLink) el.type = "button";
      el.className = "dl-link door-slot";
      if (isOpenLink) el.href = door.url;
      el.dataset.door = door.id || "";
      el.dataset.status = status;
      el.innerHTML = `<kbd>${escapeHtml(door.key || "")}</kbd><span class="dl-meta"><span class="dl-title">${escapeHtml(title)}</span>${door.blurb ? `<span class="dl-notes">${escapeHtml(door.blurb)}</span>` : ""}</span>`;
      if (isPlayable) {
        el.addEventListener("click", (ev) => {
          ev.preventDefault();
          go("door", door.id);
        });
      } else if (!isOpenLink) {
        el.addEventListener("click", (ev) => {
          ev.preventDefault();
          showDoorNotice(status);
        });
      }
      li.appendChild(el);
      list.appendChild(li);
    });
    $("doors-nav").innerHTML = `<button type="button" class="menu-item" data-go="menu"><kbd>M</kbd> Back to Main Menu</button>`;
    showPanel("doors");
    setHash("#/doors");
    const first = list.querySelector(".dl-link, .door-slot");
    if (first) first.focus();
  }

  const SS_ACEY_CREDITS = "fb_acey_credits";
  const LS_ACEY_HIGH = "fb_acey_high";

  function aceyHigh() {
    try {
      const v = localStorage.getItem(LS_ACEY_HIGH);
      if (v && /^\d+$/.test(v)) return Number(v);
    } catch {}
    return AceyDeucey.START;
  }

  function saveAceyHigh(n) {
    const high = Math.max(n, aceyHigh());
    try { localStorage.setItem(LS_ACEY_HIGH, String(high)); } catch {}
    return high;
  }

  function aceyCredits() {
    try {
      const v = sessionStorage.getItem(SS_ACEY_CREDITS);
      if (v && /^\d+$/.test(v)) return Number(v);
    } catch {}
    return typeof state.aceyCredits === "number" ? state.aceyCredits : AceyDeucey.START;
  }

  function setAceyCredits(n) {
    state.aceyCredits = n;
    try { sessionStorage.setItem(SS_ACEY_CREDITS, String(n)); } catch {}
    return saveAceyHigh(n);
  }

  function appendDoorLog(text, cls) {
    const log = $("door-log");
    if (!log) return;
    const row = document.createElement("div");
    if (cls) row.className = cls;
    row.textContent = text || "\u00a0";
    log.appendChild(row);
    row.scrollIntoView({ block: "nearest" });
  }

  function hideAceyForms() {
    const form = $("acey-form");
    const actions = $("acey-actions");
    if (form) form.hidden = true;
    if (actions) {
      actions.hidden = true;
      actions.innerHTML = "";
    }
  }

  function hideLemonForms() {
    const form = $("lemon-form");
    const actions = $("lemon-actions");
    if (form) form.hidden = true;
    if (actions) {
      actions.hidden = true;
      actions.innerHTML = "";
    }
  }

  function clearFishTimers() {
    if (!state.fish) return;
    if (state.fish.hookTimer) {
      clearTimeout(state.fish.hookTimer);
      state.fish.hookTimer = 0;
    }
    if (state.fish.hookTick) {
      clearInterval(state.fish.hookTick);
      state.fish.hookTick = 0;
    }
  }

  function hideFishPanel() {
    clearFishTimers();
    const panel = $("fish-panel");
    if (panel) panel.hidden = true;
    const controls = $("fish-controls");
    if (controls) controls.innerHTML = "";
  }

  function aceyCreditsLine() {
    const n = aceyCredits();
    const high = saveAceyHigh(n);
    return "YOU NOW HAVE " + n + " CREDIT" + (n === 1 ? "" : "S") + ".    HIGH " + high;
  }

  function showAceyBetForm() {
    const form = $("acey-form");
    const actions = $("acey-actions");
    const input = $("acey-bet");
    if (actions) {
      actions.hidden = true;
      actions.innerHTML = "";
    }
    if (!form || !input) return;
    $("acey-bet-label").textContent = "WHAT IS YOUR BET (0 TO PASS)?";
    form.hidden = false;
    input.value = "";
    input.focus();
  }

  function showAceyNext() {
    hideAceyForms();
    const box = $("acey-actions");
    if (!box) return;
    box.hidden = false;
    box.innerHTML = `<button type="button" class="btn btn-amber" id="acey-next">Next hand</button>`;
    $("acey-next").addEventListener("click", dealAceyHand);
    $("acey-next").focus();
  }

  function showAceyBroke() {
    state.acey = { phase: "broke" };
    hideAceyForms();
    appendDoorLog("");
    appendDoorLog("SORRY, FRIEND, BUT YOU BLEW YOUR WAD.", "err");
    appendDoorLog("TRY AGAIN (YES OR NO)");
    const box = $("acey-actions");
    if (!box) return;
    box.hidden = false;
    box.innerHTML = `<button type="button" class="btn btn-amber" id="acey-yes">Yes</button><button type="button" class="btn" id="acey-no">No</button>`;
    $("acey-yes").addEventListener("click", () => startAceyDeucey(true));
    $("acey-no").addEventListener("click", () => go("doors"));
    $("acey-yes").focus();
  }

  function dealAceyHand() {
    const A = AceyDeucey;
    hideAceyForms();
    if (aceyCredits() <= 0) {
      showAceyBroke();
      return;
    }
    const cards = A.drawHand(3);
    state.acey = { a: cards[0].rank, b: cards[1].rank, cards: cards, phase: "bet" };
    appendDoorLog(aceyCreditsLine(), "info");
    appendDoorLog("");
    appendDoorLog("HERE ARE YOUR NEXT TWO CARDS:");
    const table = document.createElement("pre");
    table.className = "acey-table";
    table.textContent = A.renderHand(cards[0], cards[1], null);
    $("door-log").appendChild(table);
    state.acey.table = table;
    table.scrollIntoView({ block: "nearest" });
    appendDoorLog("");
    showAceyBetForm();
  }

  function submitAceyBet(raw) {
    if (!state.acey || state.acey.phase !== "bet") return;
    const A = AceyDeucey;
    const parsed = A.parseBet(raw, aceyCredits());
    if (!parsed.ok) {
      if (parsed.reason === "too_much") {
        appendDoorLog("SORRY, MY FRIEND, BUT YOU BET TOO MUCH.", "err");
        appendDoorLog("YOU HAVE ONLY " + aceyCredits() + " CREDITS TO BET.");
      } else {
        appendDoorLog("ENTER A WHOLE NUMBER FROM 0 TO " + aceyCredits() + ".");
      }
      showAceyBetForm();
      return;
    }
    const bet = parsed.bet;
    const third = state.acey.cards[2];
    const c = third.rank;
    const result = A.resolve(aceyCredits(), bet, state.acey.a, state.acey.b, c);
    state.acey.phase = "result";
    state.acey.c = c;
    hideAceyForms();
    if (result.outcome === "chicken") {
      appendDoorLog("CHICKEN!!", "warn");
    } else {
      if (state.acey.table) {
        state.acey.table.textContent = A.renderHand(state.acey.cards[0], state.acey.cards[1], third);
        state.acey.table.scrollIntoView({ block: "nearest" });
      }
      if (result.outcome === "win") appendDoorLog("YOU WIN!!!", "ok");
      else appendDoorLog("SORRY, YOU LOSE", "err");
    }
    setAceyCredits(result.credits);
    if (result.credits <= 0) {
      showAceyBroke();
      return;
    }
    showAceyNext();
  }

  function startAceyDeucey(reset) {
    hideLemonForms();
    hideFishPanel();
    if (reset || aceyCredits() <= 0) setAceyCredits(AceyDeucey.START);
    else saveAceyHigh(aceyCredits());
    const log = $("door-log");
    if (log) log.innerHTML = "";
    appendDoorLog("ACEY DEUCEY IS PLAYED IN THE FOLLOWING MANNER");
    appendDoorLog("THE DEALER (COMPUTER) DEALS TWO CARDS FACE UP.");
    appendDoorLog("YOU HAVE AN OPTION TO BET OR NOT BET DEPENDING");
    appendDoorLog("ON WHETHER OR NOT YOU FEEL THE NEXT CARD WILL HAVE");
    appendDoorLog("A VALUE BETWEEN THE FIRST TWO.");
    appendDoorLog("IF YOU DO NOT WANT TO BET, INPUT A 0");
    appendDoorLog("");
    dealAceyHand();
  }

  function showDoor(doorId) {
    const door = doorList().find((d) => d.id === doorId);
    if (!door || (door.status && door.status !== "open")) {
      showDoors();
      return;
    }
    state.doorId = door.id;
    const title = $("door-title");
    if (title) title.textContent = door.name || "Door";
    const nav = $("door-nav");
    if (nav) {
      nav.innerHTML = `<button type="button" class="menu-item" data-go="doors"><kbd>Q</kbd> Quit to Doors</button><button type="button" class="menu-item" data-go="menu"><kbd>M</kbd> Back to Main Menu</button>`;
    }
    showPanel("door");
    setHash("#/doors/" + door.id);
    if (door.id === "lemonade-stand") startLemonade();
    else if (door.id === "freshwater-fishing") startFishing();
    else startAceyDeucey(false);
  }

  function setFishMsg(text, cls) {
    const el = $("fish-msg");
    if (!el) return;
    el.className = "fish-msg" + (cls ? " " + cls : "");
    el.textContent = text || "";
  }

  function fishPrompt() {
    const g = state.fish;
    if (!g) return "";
    if (g.phase === "intro") return "PRESS CONTINUE TO START.";
    if (g.phase === "lake") return "PICK A LAKE.  PRESS 1 OR 2.";
    if (g.phase === "lure") return "PICK A LURE.";
    if (g.phase === "boat") return "MOVE WITH ARROWS, THEN PRESS C TO CAST.";
    if (g.phase === "wait") return "CASTING...";
    if (g.phase === "hook") return "PRESS SPACE NOW!";
    if (g.phase === "fight") return (g.fight && FreshwaterFishing.fightHint(g.fight.tension)) || "PRESS R TO REEL.";
    if (g.phase === "records") return "PRESS BACK TO RETURN.";
    if (g.phase === "dayend") return "PRESS Y TO FISH AGAIN, OR Q TO QUIT.";
    return "";
  }

  function renderFishView() {
    const F = FreshwaterFishing;
    const g = state.fish;
    if (!g || !g.lake) return;
    const cell = F.tileAt(g.lake, g.x, g.y);
    const lure = F.lureById(g.lureId);
    const status = $("fish-status");
    if (status) {
      status.textContent = g.lake.name + "          CASTS " + g.casts + "/" + F.CASTS_PER_DAY + "\n" +
        "DEPTH " + cell.depth + " FT        BOTTOM " + cell.bottom + "\n" +
        "LURE " + lure.name;
    }
    const map = $("fish-map");
    if (map) map.textContent = F.renderMap(g.lake, g.x, g.y, g.heading);
    const legend = $("fish-legend");
    if (legend) legend.textContent = F.mapLegend();
  }

  function showFishBoatControls() {
    const box = $("fish-controls");
    if (!box) return;
    box.innerHTML = `<div class="fish-pad" role="group" aria-label="Steer the boat"><button type="button" class="btn" id="fish-up" data-fish-dir="ArrowUp" aria-label="North">↑</button><button type="button" class="btn" id="fish-left" data-fish-dir="ArrowLeft" aria-label="West">←</button><button type="button" class="btn" id="fish-down" data-fish-dir="ArrowDown" aria-label="South">↓</button><button type="button" class="btn" id="fish-right" data-fish-dir="ArrowRight" aria-label="East">→</button></div><div class="intro-actions fish-cmd"><button type="button" class="btn btn-amber" id="fish-cast">Cast</button><button type="button" class="btn" id="fish-lure">Change lure</button><button type="button" class="btn" id="fish-records">Records</button></div>`;
    Array.from(box.querySelectorAll("[data-fish-dir]")).forEach((btn) => {
      btn.addEventListener("click", () => moveFishBoat(btn.getAttribute("data-fish-dir")));
    });
    $("fish-cast").addEventListener("click", fishCast);
    $("fish-lure").addEventListener("click", () => fishPickLure(false));
    $("fish-records").addEventListener("click", fishShowRecords);
    $("fish-cast").focus();
  }

  function isFishBoatMode() {
    return state.view === "door" && state.doorId === "freshwater-fishing" && state.fish && state.fish.phase === "boat";
  }

  function moveFishBoat(key) {
    const F = FreshwaterFishing;
    const g = state.fish;
    if (!isFishBoatMode() || !g) return;
    const next = F.moveBoat(g.lake, g.x, g.y, g.heading, key);
    g.x = next.x;
    g.y = next.y;
    g.heading = next.heading;
    renderFishView();
    if (!next.moved) setFishMsg("THAT'S THE BANK.  " + fishPrompt());
    else setFishMsg(fishPrompt());
  }

  function startFishing() {
    hideAceyForms();
    hideLemonForms();
    hideFishPanel();
    state.acey = null;
    state.lemon = null;
    state.fish = { phase: "intro" };
    const log = $("door-log");
    if (log) log.innerHTML = "";
    const panel = $("fish-panel");
    if (panel) panel.hidden = true;
    [
      "FRESHWATER FISHING",
      "",
      "MOTOR OUT TO THE WEEDS OR A DROP-OFF",
      "AND CAST.  WHEN YOU GET A BITE, SET",
      "THE HOOK.  THEN REEL -- OR GIVE SLACK",
      "IF THE LINE GETS TOO TIGHT.",
      "",
      "ARROW KEYS STEER THE BOAT.",
      "YOU GET 8 CASTS TODAY.",
      "",
      "TIGHT LINES!"
    ].forEach((line) => appendDoorLog(line));
    if (panel) panel.hidden = false;
    const st = $("fish-status");
    if (st) st.textContent = "";
    const mp = $("fish-map");
    if (mp) mp.textContent = "";
    const lg = $("fish-legend");
    if (lg) lg.textContent = "";
    setFishMsg(fishPrompt());
    const host = $("fish-controls");
    if (host) {
      host.innerHTML = `<div class="intro-actions fish-cmd"><button type="button" class="btn btn-amber" id="fish-continue">Continue</button></div>`;
      $("fish-continue").addEventListener("click", fishChooseLake);
      $("fish-continue").focus();
    }
  }

  function fishChooseLake() {
    const F = FreshwaterFishing;
    const log = $("door-log");
    if (log) log.innerHTML = "";
    state.fish = { phase: "lake" };
    const panel = $("fish-panel");
    if (panel) panel.hidden = false;
    const st = $("fish-status"); if (st) st.textContent = "";
    const mp = $("fish-map"); if (mp) mp.textContent = "";
    const lg = $("fish-legend"); if (lg) lg.textContent = "";
    setFishMsg(fishPrompt());
    const box = $("fish-controls");
    if (!box) return;
    box.innerHTML = `<div class="intro-actions fish-cmd">${F.LAKES.map((lake, i) => `<button type="button" class="btn ${i === 0 ? "btn-amber" : ""}" data-fish-lake="${lake.id}"><kbd>${i + 1}</kbd> ${escapeHtml(lake.name)}</button>`).join("")}</div>`;
    Array.from(box.querySelectorAll("[data-fish-lake]")).forEach((btn) => {
      btn.addEventListener("click", () => fishLaunch(btn.getAttribute("data-fish-lake")));
    });
    const first = box.querySelector("button");
    if (first) first.focus();
  }

  function fishLaunch(lakeId) {
    const F = FreshwaterFishing;
    const lake = F.lakeById(lakeId);
    const dock = F.findDock(lake);
    const log = $("door-log");
    if (log) log.innerHTML = "";
    const saved = F.loadLure();
    const lureId = saved || "worm";
    state.fish = {
      phase: saved ? "boat" : "lure",
      lake: lake,
      x: dock.x,
      y: dock.y,
      heading: "N",
      lureId: lureId,
      speed: F.autoSpeed(F.lureById(lureId)),
      casts: 0,
      catch: [],
      hookTimer: 0,
      hookTick: 0
    };
    const panel = $("fish-panel");
    if (panel) panel.hidden = false;
    if (!saved) {
      fishPickLure(true);
      return;
    }
    renderFishView();
    setFishMsg(fishPrompt());
    showFishBoatControls();
  }

  function fishPickLure(required) {
    const F = FreshwaterFishing;
    const g = state.fish;
    if (!g) return;
    if (!required && g.phase !== "boat") return;
    g.phase = "lure";
    setFishMsg(fishPrompt());
    const box = $("fish-controls");
    if (!box) return;
    const back = required ? "" : `<button type="button" class="btn" id="fish-back">Back</button>`;
    box.innerHTML = `<div class="intro-actions fish-cmd">${F.LURES.map((lure) => `<button type="button" class="btn ${lure.id === g.lureId ? "btn-amber" : ""}" data-fish-lure="${lure.id}">${escapeHtml(lure.name)}</button>`).join("")}${back}</div>`;
    Array.from(box.querySelectorAll("[data-fish-lure]")).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-fish-lure");
        state.fish.lureId = id;
        state.fish.speed = F.autoSpeed(F.lureById(id));
        F.saveLure(id);
        state.fish.phase = "boat";
        renderFishView();
        setFishMsg("TIED ON A " + F.lureById(id).name + ".  " + fishPrompt());
        showFishBoatControls();
      });
    });
    const backBtn = $("fish-back");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        state.fish.phase = "boat";
        setFishMsg(fishPrompt());
        showFishBoatControls();
      });
    }
    const first = box.querySelector("button");
    if (first) first.focus();
  }

  function fishShowRecords() {
    const F = FreshwaterFishing;
    const g = state.fish;
    if (!g || (g.phase !== "boat" && g.phase !== "dayend")) return;
    const from = g.phase;
    g.phase = "records";
    const rec = F.loadRecords();
    const names = F.SPECIES.map((s) => s.name);
    const lines = ["PERSONAL BESTS", ""];
    let any = false;
    names.forEach((name) => {
      if (rec[name]) {
        any = true;
        lines.push(name + "  " + F.formatWeight(rec[name].ounces) + "  " + rec[name].lake);
      }
    });
    if (!any) lines.push("NO RECORDS YET.  GO CATCH SOMETHING.");
    setFishMsg(fishPrompt());
    const box = $("fish-controls");
    if (!box) return;
    box.innerHTML = `<pre class="fish-status">${escapeHtml(lines.join("\n"))}</pre><div class="intro-actions fish-cmd"><button type="button" class="btn btn-amber" id="fish-back">Back</button></div>`;
    $("fish-back").addEventListener("click", () => {
      state.fish.phase = from;
      if (from === "dayend") fishShowDayEnd();
      else {
        setFishMsg(fishPrompt());
        renderFishView();
        showFishBoatControls();
      }
    });
    $("fish-back").focus();
  }

  function fishAfterCast() {
    const F = FreshwaterFishing;
    const g = state.fish;
    if (!g) return;
    clearFishTimers();
    if (g.casts >= F.CASTS_PER_DAY) {
      fishShowDayEnd();
      return;
    }
    g.phase = "boat";
    renderFishView();
    const keep = ($("fish-msg") && $("fish-msg").textContent) || "";
    const result = keep && !keep.startsWith("MOVE WITH") ? keep + "  " : "";
    setFishMsg(result + fishPrompt());
    showFishBoatControls();
  }

  function fishShowDayEnd() {
    const F = FreshwaterFishing;
    const g = state.fish;
    if (!g) return;
    clearFishTimers();
    g.phase = "dayend";
    const lines = ["THE SUN IS GETTING LOW.  TIME TO HEAD IN.", "", "TODAY'S CATCH:"];
    if (!g.catch.length) lines.push("  DIDN'T LAND A ONE TODAY.");
    else {
      g.catch.forEach((c) => {
        lines.push("  " + c.species + "  " + F.formatWeight(c.ounces) + "  " + c.lake);
      });
    }
    setFishMsg(fishPrompt());
    const box = $("fish-controls");
    if (!box) return;
    box.innerHTML = `<pre class="fish-status">${escapeHtml(lines.join("\n"))}</pre><div class="intro-actions fish-cmd"><button type="button" class="btn btn-amber" id="fish-again">Fish again</button><button type="button" class="btn" id="fish-rec-end">Records</button><button type="button" class="btn" id="fish-quit">Quit to Doors</button></div>`;
    $("fish-again").addEventListener("click", startFishing);
    $("fish-rec-end").addEventListener("click", fishShowRecords);
    $("fish-quit").addEventListener("click", () => go("doors"));
    $("fish-again").focus();
  }

  function fishCast() {
    const F = FreshwaterFishing;
    const g = state.fish;
    if (!g || g.phase !== "boat") return;
    if (g.casts >= F.CASTS_PER_DAY) {
      fishShowDayEnd();
      return;
    }
    g.casts += 1;
    const cell = F.tileAt(g.lake, g.x, g.y);
    g.phase = "wait";
    renderFishView();
    setFishMsg(fishPrompt());
    const box = $("fish-controls");
    if (box) box.innerHTML = "";
    clearFishTimers();
    g.hookTimer = setTimeout(() => {
      const bite = F.rollBite(cell, F.lureById(g.lureId), g.speed);
      if (!bite.bite) {
        setFishMsg("NOTHING.  TRY ANOTHER SPOT.");
        fishAfterCast();
        return;
      }
      g.pending = bite;
      g.phase = "hook";
      g.hookStart = Date.now();
      if (box) {
        box.innerHTML = `<div class="intro-actions fish-cmd"><button type="button" class="btn btn-amber" id="fish-hook">Set the hook</button></div>`;
        $("fish-hook").addEventListener("click", () => fishSetHook(true));
        $("fish-hook").focus();
      }
      const tick = () => {
        if (!state.fish || state.fish.phase !== "hook") return;
        const left = Math.max(0, Math.ceil((bite.window - (Date.now() - g.hookStart)) / 1000));
        setFishMsg(bite.kind + "!  PRESS SPACE NOW!  " + left, "now");
      };
      tick();
      g.hookTick = setInterval(tick, 250);
      g.hookTimer = setTimeout(() => fishSetHook(false), bite.window);
    }, 500);
  }

  function fishSetHook(manual) {
    const F = FreshwaterFishing;
    const g = state.fish;
    if (!g || g.phase !== "hook") return;
    const elapsed = Date.now() - (g.hookStart || 0);
    const windowMs = (g.pending && g.pending.window) || F.HOOK_WINDOW;
    clearFishTimers();
    const ok = manual && F.hookHit(elapsed, windowMs);
    if (!ok) {
      setFishMsg("TOO LATE!  IT GOT AWAY.", "err");
      fishAfterCast();
      return;
    }
    setFishMsg("HE'S ON!  " + F.fightHint(2), "ok");
    g.fight = F.startFight(g.pending.ounces);
    g.phase = "fight";
    fishRenderFight();
  }

  function fishRenderFight() {
    const F = FreshwaterFishing;
    const g = state.fish;
    if (!g || !g.fight || !g.pending) return;
    const fight = g.fight;
    const hint = F.fightHint(fight.tension);
    const slackNow = fight.tension >= 4;
    setFishMsg(hint + (fight.note && fight.note !== hint ? "  " + fight.note : ""), slackNow ? "now" : "");
    const box = $("fish-controls");
    if (box) {
      box.innerHTML = `<pre class="fish-status">FIGHTING A ${escapeHtml(g.pending.species.name)}\nLINE TENSION  ${escapeHtml(F.tensionBar(fight.tension))}</pre><div class="intro-actions fish-cmd"><button type="button" class="btn ${slackNow ? "" : "btn-amber"}" id="fish-reel">Reel</button><button type="button" class="btn ${slackNow ? "btn-amber" : ""}" id="fish-slack">Give slack</button></div>`;
      $("fish-reel").addEventListener("click", () => fishFight("reel"));
      $("fish-slack").addEventListener("click", () => fishFight("slack"));
      const focus = $(slackNow ? "fish-slack" : "fish-reel");
      if (focus) focus.focus();
    }
  }

  function fishFight(action) {
    const F = FreshwaterFishing;
    const g = state.fish;
    if (!g || g.phase !== "fight" || !g.fight || !g.pending) return;
    g.fight = F.fightAction(g.fight, action);
    if (g.fight.snapped) {
      setFishMsg("SNAP!  YOUR LINE BROKE.", "err");
      fishAfterCast();
      return;
    }
    if (g.fight.lost) {
      setFishMsg("HE THREW THE HOOK!", "err");
      fishAfterCast();
      return;
    }
    if (g.fight.landed) {
      const recs = F.loadRecords();
      const best = F.updateRecords(recs, g.pending.species.name, g.pending.ounces, g.lake.name);
      if (best) F.saveRecords(recs);
      g.catch.push({ species: g.pending.species.name, ounces: g.pending.ounces, lake: g.lake.name });
      setFishMsg("YOU CAUGHT A " + F.formatWeight(g.pending.ounces) + " " + g.pending.species.name + "!" + (best ? "  A NEW PERSONAL BEST!" : ""), "ok");
      fishAfterCast();
      return;
    }
    fishRenderFight();
  }

  function appendLemonPre(text, cls) {
    const log = $("door-log");
    if (!log) return;
    const pre = document.createElement("pre");
    pre.className = cls;
    pre.textContent = text;
    log.appendChild(pre);
    pre.scrollIntoView({ block: "nearest" });
  }

  function showLemonActions(html, focusId, onClick) {
    hideAceyForms();
    hideLemonForms();
    const box = $("lemon-actions");
    if (!box) return;
    box.hidden = false;
    box.innerHTML = html;
    if (typeof onClick === "function") onClick();
    const focus = focusId && $(focusId);
    if (focus) focus.focus();
  }

  function showLemonPrompt() {
    const L = LemonadeStand;
    const game = state.lemon;
    hideAceyForms();
    const actions = $("lemon-actions");
    if (actions) {
      actions.hidden = true;
      actions.innerHTML = "";
    }
    const form = $("lemon-form");
    const input = $("lemon-input");
    const label = $("lemon-input-label");
    const btn = $("lemon-submit");
    if (!form || !input || !label) return;
    if (game.step === "glasses") {
      label.textContent = "HOW MANY GLASSES OF LEMONADE DO YOU WISH TO MAKE?";
      if (btn) btn.textContent = "Make";
    } else if (game.step === "signs") {
      label.textContent = "HOW MANY ADVERTISING SIGNS (15 CENTS EACH) DO YOU WANT TO MAKE?";
      if (btn) btn.textContent = "Make";
    } else {
      label.textContent = "WHAT PRICE (IN CENTS) DO YOU WISH TO CHARGE FOR LEMONADE?";
      if (btn) btn.textContent = "Charge";
    }
    form.hidden = false;
    input.value = "";
    input.focus();
  }

  function startLemonade() {
    const L = LemonadeStand;
    hideAceyForms();
    hideLemonForms();
    hideFishPanel();
    state.acey = null;
    state.lemon = { day: 0, assets: L.START_CENTS, phase: "intro" };
    const log = $("door-log");
    if (log) log.innerHTML = "";
    [
      "HI!  WELCOME TO LEMONSVILLE, CALIFORNIA!",
      "",
      "IN THIS SMALL TOWN, YOU ARE IN CHARGE OF",
      "RUNNING YOUR OWN LEMONADE STAND.",
      "",
      "TO MANAGE YOUR LEMONADE STAND, YOU WILL",
      "NEED TO MAKE THESE DECISIONS EVERY DAY:",
      "",
      "1. HOW MANY GLASSES OF LEMONADE TO MAKE",
      "   (ONLY ONE BATCH IS MADE EACH MORNING)",
      "2. HOW MANY ADVERTISING SIGNS TO MAKE",
      "   (THE SIGNS COST FIFTEEN CENTS EACH)",
      "3. WHAT PRICE TO CHARGE FOR EACH GLASS",
      "",
      "YOU WILL BEGIN WITH $2.00 CASH (ASSETS).",
      "BECAUSE YOUR MOTHER GAVE YOU SOME SUGAR,",
      "YOUR COST TO MAKE LEMONADE IS TWO CENTS",
      "A GLASS (THIS MAY CHANGE IN THE FUTURE).",
      "",
      "YOUR EXPENSES ARE THE SUM OF THE COST OF",
      "THE LEMONADE AND THE COST OF THE SIGNS.",
      "YOUR PROFITS ARE THE DIFFERENCE BETWEEN",
      "THE INCOME FROM SALES AND YOUR EXPENSES.",
      "",
      "THE NUMBER OF GLASSES YOU SELL EACH DAY",
      "DEPENDS ON THE PRICE YOU CHARGE, AND ON",
      "THE NUMBER OF ADVERTISING SIGNS YOU USE.",
      "",
      "KEEP TRACK OF YOUR ASSETS, BECAUSE YOU",
      "CAN'T SPEND MORE MONEY THAN YOU HAVE!",
      "",
      "YOU WILL RUN YOUR STAND FOR 30 DAYS."
    ].forEach((line) => appendDoorLog(line));
    showLemonActions(`<button type="button" class="btn btn-amber" id="lemon-continue">Continue</button>`, "lemon-continue", () => {
      $("lemon-continue").addEventListener("click", lemonBeginDay);
    });
  }

  function lemonBeginDay() {
    const L = LemonadeStand;
    const game = state.lemon;
    if (!game) return;
    hideLemonForms();
    hideAceyForms();
    if (game.day >= L.DAYS) {
      lemonShowEnd(false);
      return;
    }
    const weather = L.forecastWeather(game.day);
    game.day += 1;
    game.weather = weather;
    game.cost = L.glassCost(game.day);
    const ev = L.rollEvents(game.day, weather);
    game.r1 = ev.r1;
    game.r2 = ev.r2;
    game.glasses = 0;
    game.signs = 0;
    game.price = 0;
    game.step = "glasses";
    game.phase = "plan";
    appendDoorLog("");
    appendDoorLog("========================================");
    appendDoorLog("ON DAY " + game.day + ", THE COST OF LEMONADE IS " + L.money(game.cost) + ".");
    appendDoorLog("");
    appendDoorLog("LEMONSVILLE WEATHER REPORT", "warn");
    appendLemonPre(L.weatherArt(weather.id), "lemon-weather");
    ev.messages.forEach((msg) => appendDoorLog(msg, "warn"));
    appendDoorLog("");
    appendDoorLog("ASSETS " + L.money(game.assets), "info");
    appendDoorLog("");
    showLemonPrompt();
  }

  function submitLemonInput(raw) {
    const L = LemonadeStand;
    const game = state.lemon;
    if (!game || game.phase !== "plan") return;
    if (game.step === "glasses") {
      const parsed = L.parseWhole(raw, 0, L.MAX_GLASSES);
      if (!parsed.ok) {
        appendDoorLog("COME ON, LET'S BE REASONABLE NOW!!!", "err");
        appendDoorLog("TRY AGAIN");
        showLemonPrompt();
        return;
      }
      if (parsed.value * game.cost > game.assets) {
        appendDoorLog("THINK AGAIN!!! YOU HAVE ONLY " + L.money(game.assets), "err");
        appendDoorLog("IN CASH AND TO MAKE " + parsed.value + " GLASSES OF");
        appendDoorLog("LEMONADE YOU NEED " + L.money(parsed.value * game.cost) + " IN CASH.");
        showLemonPrompt();
        return;
      }
      game.glasses = parsed.value;
      appendDoorLog("GLASSES TO MAKE: " + game.glasses);
      game.step = "signs";
      showLemonPrompt();
      return;
    }
    if (game.step === "signs") {
      const parsed = L.parseWhole(raw, 0, L.MAX_SIGNS);
      if (!parsed.ok) {
        appendDoorLog("COME ON, BE REASONABLE!!! TRY AGAIN.", "err");
        showLemonPrompt();
        return;
      }
      const left = game.assets - game.glasses * game.cost;
      if (parsed.value * L.SIGN_COST > left) {
        appendDoorLog("THINK AGAIN, YOU HAVE ONLY " + L.money(left), "err");
        appendDoorLog("IN CASH LEFT AFTER MAKING YOUR LEMONADE.");
        showLemonPrompt();
        return;
      }
      game.signs = parsed.value;
      appendDoorLog("SIGNS TO MAKE: " + game.signs);
      game.step = "price";
      showLemonPrompt();
      return;
    }
    if (game.step === "price") {
      const parsed = L.parseWhole(raw, 0, L.MAX_PRICE);
      if (!parsed.ok) {
        appendDoorLog("COME ON, BE REASONABLE!!! TRY AGAIN.", "err");
        showLemonPrompt();
        return;
      }
      game.price = parsed.value;
      appendDoorLog("PRICE PER GLASS: " + game.price + " CENTS");
      game.phase = "confirm";
      hideLemonForms();
      appendDoorLog("");
      appendDoorLog("WOULD YOU LIKE TO CHANGE ANYTHING?");
      showLemonActions(
        `<button type="button" class="btn" id="lemon-yes">Yes</button><button type="button" class="btn btn-amber" id="lemon-no">No</button>`,
        "lemon-no",
        () => {
          $("lemon-yes").addEventListener("click", lemonChangePlans);
          $("lemon-no").addEventListener("click", lemonResolveDay);
        }
      );
    }
  }

  function lemonChangePlans() {
    const game = state.lemon;
    if (!game) return;
    game.glasses = 0;
    game.signs = 0;
    game.price = 0;
    game.step = "glasses";
    game.phase = "plan";
    appendDoorLog("OK, LET'S CHANGE YOUR PLANS.");
    appendDoorLog("");
    showLemonPrompt();
  }

  function lemonResolveDay() {
    const L = LemonadeStand;
    const game = state.lemon;
    if (!game) return;
    hideLemonForms();
    const storm = L.maybeThunderstorm(game.day, game.weather);
    if (storm) {
      appendDoorLog("");
      appendDoorLog("WEATHER REPORT: A SEVERE THUNDERSTORM", "err");
      appendDoorLog("HIT LEMONSVILLE EARLIER TODAY, JUST AS");
      appendDoorLog("THE LEMONADE STANDS WERE BEING SET UP.");
      appendDoorLog("UNFORTUNATELY, EVERYTHING WAS RUINED!!", "err");
      appendLemonPre(L.weatherArt("storm"), "lemon-weather");
    } else if (game.r2 === 2) {
      appendDoorLog("");
      appendDoorLog("THE STREET CREWS BOUGHT ALL YOUR", "warn");
      appendDoorLog("LEMONADE AT LUNCHTIME!!", "warn");
    }
    const result = L.resolveDay({
      glasses: game.glasses,
      signs: game.signs,
      price: game.price,
      cost: game.cost,
      r1: game.r1,
      r2: game.r2,
      storm: storm
    });
    game.assets += result.profit;
    if (game.assets < 0) game.assets = 0;
    appendDoorLog("");
    appendLemonPre(L.formatReport(game.day, result, game.glasses, game.signs, game.price, game.assets), "lemon-report");
    const nextCost = L.glassCost(game.day + 1);
    const moreDays = game.day < L.DAYS;
    if (moreDays && game.assets < nextCost) {
      game.phase = "end";
      appendDoorLog("");
      appendDoorLog("...YOU DON'T HAVE ENOUGH MONEY LEFT", "err");
      appendDoorLog("TO STAY IN BUSINESS  YOU'RE BANKRUPT!", "err");
      lemonShowEnd(true);
      return;
    }
    if (!moreDays) {
      lemonShowEnd(false);
      return;
    }
    game.phase = "report";
    showLemonActions(`<button type="button" class="btn btn-amber" id="lemon-next">Next day</button>`, "lemon-next", () => {
      $("lemon-next").addEventListener("click", lemonBeginDay);
    });
  }

  function lemonShowEnd(bankrupt) {
    const L = LemonadeStand;
    const game = state.lemon;
    if (!game) return;
    game.phase = "end";
    hideLemonForms();
    const profit = game.assets - L.START_CENTS;
    appendDoorLog("");
    if (!bankrupt) appendDoorLog("YOUR 30 DAYS IN LEMONSVILLE ARE OVER.");
    appendDoorLog("FINAL ASSETS  " + L.money(game.assets), "info");
    if (profit > 0) appendDoorLog("PROFIT FOR THE SUMMER  " + L.money(profit), "ok");
    else if (profit < 0) appendDoorLog("LOSS FOR THE SUMMER  " + L.money(-profit), "err");
    else appendDoorLog("YOU BROKE EVEN.");
    appendDoorLog("");
    appendDoorLog("WOULD YOU LIKE TO PLAY AGAIN?");
    showLemonActions(
      `<button type="button" class="btn btn-amber" id="lemon-again-yes">Yes</button><button type="button" class="btn" id="lemon-again-no">No</button>`,
      "lemon-again-yes",
      () => {
        $("lemon-again-yes").addEventListener("click", startLemonade);
        $("lemon-again-no").addEventListener("click", () => go("doors"));
      }
    );
  }

  function showAbout() {
    showPanel("about");
    setHash("#/about");
    const back = panels.about.querySelector("[data-go='menu']");
    if (back) back.focus();
  }

  async function showGoodbye() {
    newNode();
    showPanel("goodbye");
    setHash("#/goodbye");
    const log = $("goodbye-log");
    const timeUp = !!state.timeUp;
    state.timeUp = false;
    await typeLines(log, [
      ...(timeUp ? [
        { text: "TIME LIMIT EXCEEDED", cls: "err", pause: 360 },
        { text: "[NO WORRIES - YOU CAN CALL BACK ANYTIME.]", cls: "info", pause: 360 },
      ] : []),
      { text: "THANKS FOR CALLING FRANTICBBS.", cls: "info", pause: 200 },
      { text: "HANGING UP...", pause: 360 },
      { text: "NO CARRIER", cls: "err", pause: 200 },
    ]);
    if (state.view === "goodbye") {
      document.body.classList.add("pre-login");
      resetSession();
    }
    const btn = panels.goodbye.querySelector("[data-go='connect']");
    if (btn) btn.focus();
  }

  function openComingSoon(file, product) {
    const name = file && file.filename ? file.filename : "that file";
    const label = file && file.label ? file.label : "This build";
    $("soon-body").textContent = `${label} has not been uploaded to the board yet. Check back after the next drop.`;
    $("soon-file").textContent = "Expected file: " + name + (product ? "  (v" + product.version + ")" : "");
    const dlg = $("coming-soon");
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    $("soon-ok").focus();
  }

  async function tryDownload(event, product, file) {
    const url = fileUrl(product, file);
    // Let modified clicks (open in new tab) through only after we know it exists? Keep simple: always check.
    event.preventDefault();
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (res.ok) {
        const ctype = (res.headers.get("content-type") || "").toLowerCase();
        // Some hosts may serve a fallback HTML page as 200.
        if (ctype.includes("text/html")) {
          openComingSoon(file, product);
          return;
        }
        useDownload();
        window.location.assign(url);
        return;
      }
    } catch (_) {
      // Network failure: still try GET in case HEAD is blocked; if that also fails, coming soon.
      try {
        const res = await fetch(url, { method: "GET", cache: "no-store", headers: { Range: "bytes=0-0" } });
        if (res.ok) {
          const ctype = (res.headers.get("content-type") || "").toLowerCase();
          if (!ctype.includes("text/html")) {
            useDownload();
            window.location.assign(url);
            return;
          }
        }
      } catch (__) { /* fall through */ }
    }
    openComingSoon(file, product);
  }

  function go(name, productId) {
    cancelType();
    hideFishPanel();
    if (name === "door") {
      showDoor(productId || state.doorId || "acey-deucey");
      return;
    }
    if (productId) state.productId = productId;
    switch (name) {
      case "connect":
        runConnect();
        break;
      case "login":
        showLogin();
        break;
      case "menu":
        showMenu();
        break;
      case "product":
        showProduct(state.productId);
        break;
      case "downloads":
        showDownloads(state.productId);
        break;
      case "doors":
        showDoors();
        break;
      case "about":
        showAbout();
        break;
      case "goodbye":
        showGoodbye();
        break;
      default:
        showMenu();
    }
  }

  function routeFromHash() {
    const h = (location.hash || "").replace(/^#\/?/, "").toLowerCase();
    if (!h || h === "connect") return { view: "connect" };
    if (h === "login") return { view: "login" };
    if (h === "menu") return { view: "menu" };
    if (h === "about") return { view: "about" };
    if (h === "goodbye") return { view: "goodbye" };
    if (h === "downloads") return { view: "downloads" };
    if (h === "doors") return { view: "doors" };
    const doorMatch = h.match(/^doors\/([a-z0-9-]+)$/);
    if (doorMatch) return { view: "door", doorId: doorMatch[1] };
    const m = h.match(/^([a-z0-9-]+)(?:\/(downloads))?$/);
    if (m && productById(m[1])) {
      return { view: m[2] ? "downloads" : "product", productId: m[1] };
    }
    return { view: "menu" };
  }

  function isTypingInField(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
  }

  function handleGlobalKey(ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const key = ev.key;
    const dialogOpen = document.querySelector("dialog[open]");
    if (dialogOpen) {
      if (key === "?" || key === "Escape") return;
      return;
    }

    const typing = isTypingInField(ev.target);

    if (!typing && state.view === "door" && state.doorId === "freshwater-fishing" && state.fish && state.fish.phase === "boat" && (key === "ArrowDown" || key === "ArrowUp" || key === "ArrowLeft" || key === "ArrowRight")) {
      ev.preventDefault();
      moveFishBoat(key);
      return;
    }

    if ((key === "ArrowDown" || key === "ArrowUp") && !typing) {
      const panel = panels[state.view];
      if (panel) {
        const items = Array.from(panel.querySelectorAll("a[href], button:not([disabled])")).filter((el) => el.offsetParent !== null);
        if (items.length) {
          ev.preventDefault();
          const i = items.indexOf(document.activeElement);
          const next = i < 0 ? 0 : (i + (key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
          items[next].focus();
          return;
        }
      }
    }

    if (key === "?" && !typing) {
      ev.preventDefault();
      const help = $("help-dialog");
      if (typeof help.showModal === "function") help.showModal();
      return;
    }

    if (state.view === "intro") {
      if (key === "Escape" || key === "s" || key === "S") {
        ev.preventDefault();
        cancelType();
        finishLogin("GUEST");
        go("menu");
      } else if (key === "f" || key === "F") {
        ev.preventDefault();
        cancelType();
        finishLogin("GUEST");
        go("downloads");
      } else if (key === "d" || key === "D") {
        ev.preventDefault();
        cancelType();
        finishLogin("GUEST");
        go("doors");
      }
      return;
    }

    if (state.view === "login" && typing) {
      if (key === "Escape") {
        ev.preventDefault();
        finishLogin("GUEST");
        go("menu");
      }
      return;
    }

    if (typing) return;

    if (key === "Escape" || key === "m" || key === "M") {
      ev.preventDefault();
      if (state.view === "login") {
        finishLogin("GUEST");
        go("menu");
      } else if (state.view === "goodbye") {
        return;
      } else if (state.view !== "menu" && state.view !== "intro") {
        go("menu");
      } else if (state.view === "intro") {
        cancelType();
        finishLogin("GUEST");
        go("menu");
      }
      return;
    }

    const k = key.length === 1 ? key.toUpperCase() : key;

    if (k === "R" && state.view === "goodbye") {
      ev.preventDefault();
      go("connect");
      return;
    }

    if (state.view === "menu") {
      if (k === "F") { ev.preventDefault(); go("downloads"); return; }
      if (k === "D") { ev.preventDefault(); go("doors"); return; }
      if (k === "A") { ev.preventDefault(); go("about"); return; }
      if (k === "G") { ev.preventDefault(); go("goodbye"); return; }
      if (k === "W") { ev.preventDefault(); go("product", "write65"); return; }
    }

    if (state.view === "downloads") {
      const product = firstProduct();
      const file = (product && product.downloads || []).find((f) => String(f.key) === k);
      if (file) {
        ev.preventDefault();
        const fakeEvent = { preventDefault() {} };
        tryDownload(fakeEvent, product, file);
      }
    }

    if (state.view === "doors") {
      const match = Array.from(($("doors-list") && $("doors-list").querySelectorAll(".door-slot")) || []).find((el) => {
        const kbd = el.querySelector("kbd");
        return kbd && kbd.textContent.trim() === k;
      });
      if (match) {
        ev.preventDefault();
        match.click();
      }
    }

    if (state.view === "door") {
      if (k === "Q") { ev.preventDefault(); go("doors"); return; }
      if (state.doorId === "acey-deucey" && state.acey && state.acey.phase === "broke") {
        if (k === "Y") { ev.preventDefault(); startAceyDeucey(true); return; }
        if (k === "N") { ev.preventDefault(); go("doors"); return; }
      }
      if (state.doorId === "acey-deucey" && state.acey && state.acey.phase === "result" && (key === "Enter" || key === " ")) {
        ev.preventDefault();
        dealAceyHand();
      }
      if (state.doorId === "freshwater-fishing" && state.fish) {
        if (state.fish.phase === "intro" && (key === "Enter" || key === " ")) {
          ev.preventDefault();
          fishChooseLake();
          return;
        }
        if (state.fish.phase === "lake" && (k === "1" || k === "2")) {
          ev.preventDefault();
          const lake = FreshwaterFishing.LAKES[Number(k) - 1];
          if (lake) fishLaunch(lake.id);
          return;
        }
        if (state.fish.phase === "lure" && (k === "1" || k === "2" || k === "3" || k === "4")) {
          ev.preventDefault();
          const lure = FreshwaterFishing.LURES[Number(k) - 1];
          if (lure) {
            state.fish.lureId = lure.id;
            state.fish.speed = FreshwaterFishing.autoSpeed(lure);
            FreshwaterFishing.saveLure(lure.id);
            state.fish.phase = "boat";
            renderFishView();
            setFishMsg("TIED ON A " + lure.name + ".  " + fishPrompt());
            showFishBoatControls();
          }
          return;
        }
        if (state.fish.phase === "boat" && k === "C") {
          ev.preventDefault();
          fishCast();
          return;
        }
        if (state.fish.phase === "hook" && (key === "Enter" || key === " " || k === "H")) {
          ev.preventDefault();
          fishSetHook(true);
          return;
        }
        if (state.fish.phase === "fight") {
          if (k === "R") { ev.preventDefault(); fishFight("reel"); return; }
          if (k === "S" || k === "G") { ev.preventDefault(); fishFight("slack"); return; }
        }
        if (state.fish.phase === "dayend" && (k === "Y" || key === "Enter")) {
          ev.preventDefault();
          startFishing();
          return;
        }
      }
      if (state.doorId === "lemonade-stand" && state.lemon) {
        if (state.lemon.phase === "intro" && (key === "Enter" || key === " ")) {
          ev.preventDefault();
          lemonBeginDay();
          return;
        }
        if (state.lemon.phase === "confirm") {
          if (k === "Y") { ev.preventDefault(); lemonChangePlans(); return; }
          if (k === "N" || key === "Enter") { ev.preventDefault(); lemonResolveDay(); return; }
        }
        if (state.lemon.phase === "report" && (key === "Enter" || key === " ")) {
          ev.preventDefault();
          lemonBeginDay();
          return;
        }
        if (state.lemon.phase === "end") {
          if (k === "Y") { ev.preventDefault(); startLemonade(); return; }
          if (k === "N") { ev.preventDefault(); go("doors"); return; }
        }
      }
    }

    if (state.view === "login" && k === "G" && !isTypingInField(ev.target)) {
      ev.preventDefault();
      finishLogin("GUEST");
      go("menu");
    }
  }

  function finishLogin(raw) {
    rememberHandle(normalizeHandle(raw));
    resetSession();
    ensureSessionStart();
    renderStatusBar();
  }

  function bind() {
    $("btn-skip").addEventListener("click", () => {
      cancelType();
      if (!state.handle) finishLogin("GUEST");
      go("menu");
    });
    $("btn-skip-dl").addEventListener("click", () => {
      cancelType();
      if (!state.handle) finishLogin("GUEST");
      go("downloads");
    });
    $("skip-to-downloads").addEventListener("click", (ev) => {
      ev.preventDefault();
      cancelType();
      if (!state.handle) finishLogin("GUEST");
      go("downloads");
    });
    $("btn-guest").addEventListener("click", () => {
      finishLogin("GUEST");
      go("menu");
    });
    $("login-form").addEventListener("submit", (ev) => {
      ev.preventDefault();
      finishLogin($("handle-input").value);
      go("menu");
    });

    document.addEventListener("click", (ev) => {
      const goBtn = ev.target.closest("[data-go]");
      if (goBtn && !goBtn.closest("dialog")) {
        ev.preventDefault();
        go(goBtn.dataset.go, goBtn.dataset.product);
        return;
      }
      const dl = ev.target.closest("a.dl-link");
      if (dl) {
        const product = productById(dl.dataset.product) || firstProduct();
        const file = (product && product.downloads || []).find((f) => f.id === dl.dataset.file);
        if (product && file) tryDownload(ev, product, file);
      }
    });

    document.addEventListener("keydown", handleGlobalKey);

    const aceyForm = $("acey-form");
    if (aceyForm) {
      aceyForm.addEventListener("submit", (ev) => {
        ev.preventDefault();
        submitAceyBet($("acey-bet") ? $("acey-bet").value : "");
      });
    }
    const aceyPass = $("acey-pass");
    if (aceyPass) {
      aceyPass.addEventListener("click", () => submitAceyBet("0"));
    }
    const lemonForm = $("lemon-form");
    if (lemonForm) {
      lemonForm.addEventListener("submit", (ev) => {
        ev.preventDefault();
        submitLemonInput($("lemon-input") ? $("lemon-input").value : "");
      });
    }

    const help = $("help-dialog");
    if (help) {
      help.addEventListener("close", () => {
        if (help.returnValue === "menu") go("menu");
      });
    }
  }

  async function boot() {
    renderSysopCorner();
    scheduleClock();
    await loadCatalog();
    renderSysopCorner();
    scheduleClock();
    bind();

    const saved = loadSavedHandle();
    if (saved) state.handle = saved;

    if (wantsSkip()) {
      if (!state.handle) finishLogin("GUEST");
      const route = routeFromHash();
      if (wantsDownloads() || route.view === "downloads") {
        go("downloads", route.productId);
      } else if (route.view === "doors") {
        go("doors");
      } else if (route.view === "door") {
        go("door", route.doorId);
      } else if (route.view === "product") {
        go("product", route.productId);
      } else if (route.view === "about") {
        go("about");
      } else if (route.view === "goodbye") {
        go("goodbye");
      } else {
        go("menu");
      }
      return;
    }

    await runConnect();
  }

  boot();
})();
