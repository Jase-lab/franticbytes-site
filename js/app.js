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
    sysop: $("sysop"),
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
    if (h === "#downloads" || h === "#/downloads" || h === "#write65" || h === "#/write65" || h === "#/write65/downloads" || h === "#menu" || h === "#/menu" || h === "#about" || h === "#/about" || h === "#sysop" || h === "#/sysop" || h === "#doors" || h === "#/doors" || h.startsWith("#/doors/")) {
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
      { go: "sysop", key: "C", label: "Comment to SysOp" },
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

  function hideWumpusPanel() {
    if (state.wumpus && state.wumpus.digitTimer) {
      clearTimeout(state.wumpus.digitTimer);
      state.wumpus.digitTimer = 0;
    }
    if (state.wumpus) state.wumpus.digitBuf = "";
    const panel = $("wumpus-panel");
    if (panel) panel.hidden = true;
    const controls = $("wumpus-controls");
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
    hideWumpusPanel();
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
    else if (door.id === "hunt-the-wumpus") startWumpus();
    else startAceyDeucey(false);
  }

  function setWumpusMsg(text) {
    const el = $("wumpus-msg");
    if (!el) return;
    el.textContent = text || "";
  }

  function wumpusPrompt() {
    const g = state.wumpus;
    if (!g) return "";
    if (g.phase === "intro") return "PRESS I FOR INSTRUCTIONS, OR H TO START.";
    if (g.phase === "instruct") return "PRESS H TO START.";
    if (g.phase === "play") return "TAP A TUNNEL TO MOVE, OR PRESS S TO SHOOT.";
    if (g.phase === "shoot") return "TAP A TUNNEL TO SHOOT, OR PRESS L FOR A LONGER PATH.";
    if (g.phase === "path") {
      const n = (g.path && g.path.length) || 0;
      if (n >= HuntTheWumpus.MAX_PATH) return "PRESS F TO FIRE YOUR ARROW.";
      if (n) return "TAP ANOTHER ROOM, OR PRESS F TO FIRE.";
      return "TAP ROOMS TO AIM (1-5), THEN PRESS F TO FIRE.";
    }
    if (g.phase === "over") return "SAME SETUP (Y-N)?";
    return "";
  }

  function offeredWumpusRooms() {
    const W = HuntTheWumpus;
    const g = state.wumpus;
    if (!g || !g.game) return [];
    if (g.phase === "play" || g.phase === "shoot") return W.tunnels(g.game.player);
    if (g.phase === "path") {
      const path = g.path || [];
      if (path.length >= W.MAX_PATH) return [];
      const from = path.length ? path[path.length - 1] : g.game.player;
      return W.tunnels(from).filter((room) => W.validAimRoom(path, room));
    }
    return [];
  }

  function showWumpusRooms(box, rooms, onPick) {
    const wrap = document.createElement("div");
    wrap.className = "wumpus-rooms";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Rooms");
    rooms.forEach((room) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-amber";
      btn.textContent = String(room);
      btn.setAttribute("data-wumpus-room", String(room));
      btn.addEventListener("click", () => onPick(room));
      wrap.appendChild(btn);
    });
    box.appendChild(wrap);
  }

  function renderWumpusControls() {
    const W = HuntTheWumpus;
    const g = state.wumpus;
    const panel = $("wumpus-panel");
    const box = $("wumpus-controls");
    if (!g || !panel || !box) return;
    panel.hidden = false;
    box.innerHTML = "";
    setWumpusMsg(wumpusPrompt());

    if (g.phase === "intro" || g.phase === "instruct") {
      const actions = document.createElement("div");
      actions.className = "intro-actions wumpus-cmd";
      if (g.phase === "intro") {
        const inst = document.createElement("button");
        inst.type = "button";
        inst.className = "btn";
        inst.id = "wumpus-instructions";
        inst.textContent = "Instructions";
        inst.addEventListener("click", showWumpusInstructions);
        actions.appendChild(inst);
      }
      const hunt = document.createElement("button");
      hunt.type = "button";
      hunt.className = "btn btn-amber";
      hunt.id = "wumpus-start";
      hunt.textContent = "Hunt";
      hunt.addEventListener("click", () => beginWumpus(false));
      actions.appendChild(hunt);
      box.appendChild(actions);
      hunt.focus();
      return;
    }

    if (g.phase === "over") {
      const actions = document.createElement("div");
      actions.className = "intro-actions wumpus-cmd";
      const same = document.createElement("button");
      same.type = "button";
      same.className = "btn btn-amber";
      same.id = "wumpus-same";
      same.textContent = "Same setup";
      same.addEventListener("click", () => beginWumpus(true));
      const neu = document.createElement("button");
      neu.type = "button";
      neu.className = "btn";
      neu.id = "wumpus-new";
      neu.textContent = "New setup";
      neu.addEventListener("click", () => beginWumpus(false));
      actions.appendChild(same);
      actions.appendChild(neu);
      box.appendChild(actions);
      same.focus();
      return;
    }

    const status = document.createElement("div");
    status.className = "wumpus-status";
    status.id = "wumpus-status";
    status.textContent = "ARROWS LEFT: " + g.game.arrows;
    box.appendChild(status);

    if (g.phase === "path") {
      const path = document.createElement("div");
      path.className = "wumpus-path";
      path.textContent = "PATH: " + ((g.path && g.path.length) ? g.path.join(" ") : "(EMPTY)");
      box.appendChild(path);
    }

    const rooms = offeredWumpusRooms();
    if (rooms.length) {
      const pick = (room) => {
        if (g.phase === "play") wumpusMove(room);
        else if (g.phase === "shoot") wumpusFire([room]);
        else wumpusAddPath(room);
      };
      showWumpusRooms(box, rooms, pick);
    }

    const actions = document.createElement("div");
    actions.className = "intro-actions wumpus-cmd";
    if (g.phase === "play") {
      const shoot = document.createElement("button");
      shoot.type = "button";
      shoot.className = "btn";
      shoot.id = "wumpus-shoot";
      shoot.textContent = "Shoot";
      shoot.addEventListener("click", enterWumpusShoot);
      actions.appendChild(shoot);
    } else if (g.phase === "shoot") {
      const longer = document.createElement("button");
      longer.type = "button";
      longer.className = "btn";
      longer.id = "wumpus-longer";
      longer.textContent = "Longer path";
      longer.addEventListener("click", enterWumpusPath);
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "btn";
      cancel.id = "wumpus-cancel";
      cancel.textContent = "Cancel";
      cancel.addEventListener("click", cancelWumpusShoot);
      actions.appendChild(longer);
      actions.appendChild(cancel);
    } else if (g.phase === "path") {
      const fire = document.createElement("button");
      fire.type = "button";
      fire.className = "btn btn-amber";
      fire.id = "wumpus-fire";
      fire.textContent = "Fire arrow";
      fire.disabled = !(g.path && g.path.length);
      fire.addEventListener("click", () => {
        if (g.path && g.path.length) wumpusFire(g.path);
      });
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "btn";
      cancel.id = "wumpus-cancel";
      cancel.textContent = "Cancel";
      cancel.addEventListener("click", cancelWumpusShoot);
      actions.appendChild(fire);
      actions.appendChild(cancel);
    }
    box.appendChild(actions);
  }

  function startWumpus() {
    hideAceyForms();
    hideLemonForms();
    hideWumpusPanel();
    state.acey = null;
    state.lemon = null;
    state.wumpus = { phase: "intro", game: null, saved: null, path: [], digitBuf: "", digitTimer: 0 };
    const log = $("door-log");
    if (log) log.innerHTML = "";
    appendDoorLog("HUNT THE WUMPUS");
    appendDoorLog("");
    appendDoorLog("THE WUMPUS LIVES IN A CAVE OF 20 ROOMS.");
    appendDoorLog("EACH ROOM HAS 3 TUNNELS.");
    appendDoorLog("YOU HAVE 5 CROOKED ARROWS.");
    appendDoorLog("");
    renderWumpusControls();
  }

  function showWumpusInstructions() {
    const g = state.wumpus;
    if (!g) return;
    g.phase = "instruct";
    HuntTheWumpus.instructions().forEach((line) => appendDoorLog(line));
    appendDoorLog("");
    renderWumpusControls();
  }

  function beginWumpus(same) {
    const W = HuntTheWumpus;
    const g = state.wumpus || { digitBuf: "", digitTimer: 0 };
    if (same && g.saved) g.game = W.resetFrom(g.saved);
    else {
      g.saved = W.placeAll();
      g.game = W.cloneState(g.saved);
    }
    g.phase = "play";
    g.path = [];
    g.digitBuf = "";
    state.wumpus = g;
    appendDoorLog("");
    appendDoorLog("HUNT THE WUMPUS");
    showWumpusTurn();
  }

  function showWumpusTurn() {
    const g = state.wumpus;
    if (!g || !g.game) return;
    g.phase = "play";
    g.path = [];
    appendDoorLog("");
    HuntTheWumpus.turnLines(g.game).forEach((line) => appendDoorLog(line));
    renderWumpusControls();
  }

  function wumpusMove(room) {
    const g = state.wumpus;
    if (!g || g.phase !== "play" || !g.game) return;
    const res = HuntTheWumpus.move(g.game, room);
    if (!res.ok) {
      appendDoorLog("NOT POSSIBLE -");
      setWumpusMsg("NOT POSSIBLE.  " + wumpusPrompt());
      return;
    }
    (res.messages || []).forEach((line) => appendDoorLog(line));
    if (res.over) {
      endWumpus(res.win);
      return;
    }
    showWumpusTurn();
  }

  function enterWumpusShoot() {
    const g = state.wumpus;
    if (!g || g.phase !== "play") return;
    g.phase = "shoot";
    g.path = [];
    renderWumpusControls();
  }

  function enterWumpusPath() {
    const g = state.wumpus;
    if (!g || (g.phase !== "shoot" && g.phase !== "play")) return;
    g.phase = "path";
    g.path = [];
    renderWumpusControls();
  }

  function cancelWumpusShoot() {
    const g = state.wumpus;
    if (!g || (g.phase !== "shoot" && g.phase !== "path")) return;
    g.phase = "play";
    g.path = [];
    setWumpusMsg(wumpusPrompt());
    renderWumpusControls();
  }

  function wumpusAddPath(room) {
    const W = HuntTheWumpus;
    const g = state.wumpus;
    if (!g || g.phase !== "path") return;
    if (!W.validAimRoom(g.path, room)) {
      appendDoorLog("ARROWS AREN'T THAT CROOKED - TRY ANOTHER ROOM");
      setWumpusMsg("ARROWS AREN'T THAT CROOKED.  " + wumpusPrompt());
      return;
    }
    if (g.path.length >= W.MAX_PATH) return;
    g.path.push(room);
    if (g.path.length >= W.MAX_PATH) setWumpusMsg(wumpusPrompt());
    renderWumpusControls();
  }

  function wumpusFire(path) {
    const g = state.wumpus;
    if (!g || !g.game || (g.phase !== "shoot" && g.phase !== "path")) return;
    const res = HuntTheWumpus.shoot(g.game, path);
    if (!res.ok) return;
    (res.messages || []).forEach((line) => appendDoorLog(line));
    if (res.over) {
      endWumpus(res.win);
      return;
    }
    showWumpusTurn();
  }

  function endWumpus(win) {
    const g = state.wumpus;
    if (!g) return;
    g.phase = "over";
    g.path = [];
    renderWumpusControls();
  }

  function handleWumpusDigit(digit) {
    const g = state.wumpus;
    if (!g || (g.phase !== "play" && g.phase !== "shoot" && g.phase !== "path")) return false;
    const rooms = offeredWumpusRooms();
    if (!rooms.length) return false;
    if (g.digitTimer) {
      clearTimeout(g.digitTimer);
      g.digitTimer = 0;
    }
    g.digitBuf = (g.digitBuf || "") + digit;
    const buf = g.digitBuf;
    const n = Number(buf);
    const exact = rooms.indexOf(n) >= 0;
    const prefix = rooms.some((room) => String(room).indexOf(buf) === 0 && String(room) !== buf);
    const take = function (room) {
      g.digitBuf = "";
      if (g.phase === "play") wumpusMove(room);
      else if (g.phase === "shoot") wumpusFire([room]);
      else wumpusAddPath(room);
    };
    if (exact && !prefix) {
      take(n);
      return true;
    }
    if (buf.length >= 2) {
      g.digitBuf = "";
      if (exact) take(n);
      else setWumpusMsg("NOT POSSIBLE.  " + wumpusPrompt());
      return true;
    }
    g.digitTimer = setTimeout(() => {
      const cur = state.wumpus;
      if (!cur) return;
      const val = Number(cur.digitBuf);
      cur.digitBuf = "";
      cur.digitTimer = 0;
      if (rooms.indexOf(val) >= 0) take(val);
    }, 700);
    return true;
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
    hideWumpusPanel();
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

  const SYSOP_TYPES = [
    { key: "1", id: "bug-report", label: "Bug Report" },
    { key: "2", id: "feedback", label: "Feedback" },
    { key: "3", id: "enhancement-request", label: "Enhancement Request" },
    { key: "4", id: "something-else", label: "Something Else" },
  ];
  const SYSOP_LIMITS = { name: 80, email: 120, subject: 80, message: 4000 };
  const SYSOP_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function emptySysopDraft() {
    return { step: "type", type: "", typeLabel: "", name: "", email: "", subject: "", message: "" };
  }

  function sysopTypeById(id) {
    return SYSOP_TYPES.find((t) => t.id === id) || null;
  }

  function sysopHoneypot() {
    const a = $("sysop-fax") ? $("sysop-fax").value : "";
    const b = $("sysop-fax-body") ? $("sysop-fax-body").value : "";
    return (a + b).trim();
  }

  function hideSysopParts() {
    const lead = $("sysop-lead");
    const review = $("sysop-review");
    const status = $("sysop-status");
    const choices = $("sysop-choices");
    const form = $("sysop-form");
    const bodyForm = $("sysop-body-form");
    const skip = $("sysop-skip");
    const input = $("sysop-input");
    const body = $("sysop-body");
    const hint = $("sysop-body-hint");
    if (lead) lead.hidden = true;
    if (review) {
      review.hidden = true;
      review.textContent = "";
    }
    if (status) {
      status.hidden = true;
      status.textContent = "";
      status.classList.remove("err");
    }
    if (choices) {
      choices.hidden = true;
      choices.innerHTML = "";
    }
    if (form) form.hidden = true;
    if (bodyForm) bodyForm.hidden = true;
    if (skip) skip.hidden = true;
    if (hint) hint.textContent = "";
    if (input) {
      input.value = "";
      input.type = "text";
      input.removeAttribute("inputmode");
      input.autocomplete = "off";
      input.spellcheck = false;
    }
    if (body) body.value = "";
  }

  function setSysopStatus(text, isError) {
    const status = $("sysop-status");
    if (!status) return;
    if (!text) {
      status.hidden = true;
      status.textContent = "";
      status.classList.remove("err");
      return;
    }
    status.hidden = false;
    status.textContent = text;
    status.classList.toggle("err", !!isError);
  }

  function renderSysopNav(items) {
    const nav = $("sysop-nav");
    if (!nav) return;
    const buttons = (items || []).map((item) => {
      if (item.go) {
        return `<button type="button" class="menu-item" data-go="${escapeHtml(item.go)}"><kbd>${escapeHtml(item.key)}</kbd> <span>${escapeHtml(item.label)}</span></button>`;
      }
      return `<button type="button" class="menu-item" data-sysop="${escapeHtml(item.act)}"><kbd>${escapeHtml(item.key)}</kbd> <span>${escapeHtml(item.label)}</span></button>`;
    });
    buttons.push(`<button type="button" class="menu-item" data-go="menu"><kbd>M</kbd> Back to Main Menu</button>`);
    nav.innerHTML = buttons.join("");
  }

  function focusSysop(el) {
    if (el && typeof el.focus === "function") el.focus();
  }

  function renderSysop() {
    const draft = state.sysop || emptySysopDraft();
    hideSysopParts();
    const lead = $("sysop-lead");
    const choices = $("sysop-choices");
    const form = $("sysop-form");
    const label = $("sysop-input-label");
    const input = $("sysop-input");
    const skip = $("sysop-skip");
    const bodyForm = $("sysop-body-form");
    const bodyLabel = $("sysop-body-label");
    const bodyHint = $("sysop-body-hint");
    const body = $("sysop-body");
    const review = $("sysop-review");

    if (draft.step === "type") {
      if (lead) {
        lead.hidden = false;
        lead.textContent = "Leave a private note for Lord Frazzle. Your handle is already on the message.";
      }
      if (choices) {
        choices.hidden = false;
        SYSOP_TYPES.forEach((t) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "menu-item";
          btn.dataset.sysop = "type";
          btn.dataset.type = t.id;
          btn.innerHTML = `<kbd>${t.key}</kbd> <span>${escapeHtml(t.label)}</span>`;
          choices.appendChild(btn);
        });
        const abort = document.createElement("button");
        abort.type = "button";
        abort.className = "menu-item";
        abort.dataset.go = "menu";
        abort.innerHTML = `<kbd>Q</kbd> <span>Abort, back to Main Menu</span>`;
        choices.appendChild(abort);
      }
      renderSysopNav();
      focusSysop(choices && choices.querySelector(".menu-item"));
      return;
    }

    if (draft.step === "name" || draft.step === "email" || draft.step === "subject") {
      form.hidden = false;
      if (draft.step === "name") {
        label.textContent = "REAL NAME (OPTIONAL — PRESS ENTER TO SKIP):";
        input.maxLength = SYSOP_LIMITS.name;
        input.autocomplete = "name";
        input.value = draft.name;
        skip.hidden = false;
      } else if (draft.step === "email") {
        label.textContent = "EMAIL (OPTIONAL — PRESS ENTER TO SKIP):";
        input.type = "email";
        input.maxLength = SYSOP_LIMITS.email;
        input.autocomplete = "email";
        input.value = draft.email;
        skip.hidden = false;
      } else {
        label.textContent = "SUBJECT:";
        input.maxLength = SYSOP_LIMITS.subject;
        input.autocomplete = "off";
        input.value = draft.subject;
      }
      renderSysopNav([{ act: "abort", key: "Q", label: "Abort, back to Main Menu" }]);
      focusSysop(input);
      return;
    }

    if (draft.step === "body") {
      bodyForm.hidden = false;
      bodyLabel.textContent = "ENTER YOUR MESSAGE BELOW.";
      if (bodyHint) bodyHint.textContent = "WHEN YOU ARE DONE, TAP SAVE (OR TYPE /S ON THE LAST LINE).";
      body.value = draft.message;
      renderSysopNav([{ act: "abort", key: "Q", label: "Abort, back to Main Menu" }]);
      focusSysop(body);
      return;
    }

    if (draft.step === "confirm") {
      if (lead) {
        lead.hidden = false;
        lead.textContent = "READY TO SEND THIS TO THE SYSOP?";
      }
      if (review) {
        review.hidden = false;
        const name = draft.name || "(none)";
        const email = draft.email || "(none)";
        review.textContent = [
          `FROM    ${greetName()}`,
          `NAME    ${name}`,
          `EMAIL   ${email}`,
          `TYPE    ${draft.typeLabel.toUpperCase()}`,
          `SUBJ    ${draft.subject}`,
          "",
          draft.message,
        ].join("\n");
      }
      if (choices) {
        choices.hidden = false;
        const items = [
          { act: "save", key: "Y", label: "Save message" },
          { act: "restart", key: "N", label: "Start over" },
          { go: "menu", key: "Q", label: "Abort, back to Main Menu" },
        ];
        items.forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "menu-item";
          if (item.go) btn.dataset.go = item.go;
          else btn.dataset.sysop = item.act;
          btn.innerHTML = `<kbd>${item.key}</kbd> <span>${escapeHtml(item.label)}</span>`;
          choices.appendChild(btn);
        });
      }
      renderSysopNav();
      focusSysop(choices && choices.querySelector(".menu-item"));
      return;
    }

    if (draft.step === "done") {
      if (lead) {
        lead.hidden = false;
        lead.textContent = "MESSAGE SAVED.";
      }
      if (review) {
        review.hidden = false;
        review.textContent = "IT HAS BEEN FILED IN THE SYSOP MAILBOX.\nLORD FRAZZLE WILL SEE IT ON HIS NEXT PASS THROUGH THE BOARD.";
      }
      renderSysopNav();
      focusSysop($("sysop-nav") && $("sysop-nav").querySelector(".menu-item"));
      return;
    }

    if (draft.step === "error") {
      if (lead) {
        lead.hidden = false;
        lead.textContent = "THE BOARD COULD NOT FILE THAT MESSAGE.";
      }
      setSysopStatus("YOU CAN TRY AGAIN, OR GO BACK TO THE MAIN MENU.", true);
      renderSysopNav([
        { act: "retry", key: "Y", label: "Try again" },
        { go: "menu", key: "Q", label: "Abort, back to Main Menu" },
      ]);
      focusSysop($("sysop-nav") && $("sysop-nav").querySelector(".menu-item"));
    }
  }

  function showSysop() {
    state.sysop = emptySysopDraft();
    showPanel("sysop");
    setHash("#/sysop");
    renderSysop();
  }

  function sysopPickType(id) {
    const t = sysopTypeById(id);
    if (!t || !state.sysop) return;
    state.sysop.type = t.id;
    state.sysop.typeLabel = t.label;
    state.sysop.step = "name";
    renderSysop();
  }

  function sysopAdvanceFrom(step, raw) {
    const draft = state.sysop;
    if (!draft) return;
    const value = String(raw || "").trim();
    if (step === "name") {
      if (value.length > SYSOP_LIMITS.name) {
        setSysopStatus("THAT NAME IS TOO LONG.", true);
        return;
      }
      draft.name = value.slice(0, SYSOP_LIMITS.name);
      draft.step = "email";
      renderSysop();
      return;
    }
    if (step === "email") {
      if (value.length > SYSOP_LIMITS.email) {
        setSysopStatus("THAT EMAIL IS TOO LONG.", true);
        return;
      }
      if (value && !SYSOP_EMAIL_RE.test(value)) {
        setSysopStatus("THAT EMAIL DOES NOT LOOK RIGHT. TRY AGAIN, OR PRESS ENTER TO SKIP.", true);
        return;
      }
      draft.email = value.slice(0, SYSOP_LIMITS.email);
      draft.step = "subject";
      renderSysop();
      return;
    }
    if (step === "subject") {
      if (!value) {
        setSysopStatus("A SUBJECT IS REQUIRED.", true);
        return;
      }
      if (value.length > SYSOP_LIMITS.subject) {
        setSysopStatus("THAT SUBJECT IS TOO LONG.", true);
        return;
      }
      draft.subject = value.slice(0, SYSOP_LIMITS.subject);
      draft.step = "body";
      renderSysop();
    }
  }

  function stripSysopSave(text) {
    const lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    if (lines.length && /^\s*\/S\s*$/i.test(lines[lines.length - 1])) lines.pop();
    return lines.join("\n").trim();
  }

  function sysopSubmitBody(raw) {
    const draft = state.sysop;
    if (!draft) return;
    const message = stripSysopSave(raw);
    if (!message) {
      setSysopStatus("A MESSAGE IS REQUIRED.", true);
      return;
    }
    if (message.length > SYSOP_LIMITS.message) {
      setSysopStatus("THAT MESSAGE IS TOO LONG.", true);
      return;
    }
    draft.message = message;
    draft.step = "confirm";
    renderSysop();
  }

  async function sysopSave() {
    const draft = state.sysop;
    if (!draft || !draft.type || !draft.subject || !draft.message) return;
    setSysopStatus("FILING MESSAGE...");
    const payload = {
      type: draft.type,
      handle: greetName(),
      name: draft.name,
      email: draft.email,
      subject: draft.subject,
      message: draft.message,
      fax: sysopHoneypot(),
    };
    try {
      const res = await fetch("/api/sysop", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      let data = null;
      try { data = await res.json(); } catch (_) { /* ignore */ }
      if (res.ok && data && data.ok) {
        draft.step = "done";
        renderSysop();
        return;
      }
      draft.step = "error";
      renderSysop();
      if (data && data.error) setSysopStatus(String(data.error).toUpperCase(), true);
    } catch (_) {
      draft.step = "error";
      renderSysop();
    }
  }

  function handleSysopAction(act, typeId) {
    if (!state.sysop) return;
    if (act === "type") {
      sysopPickType(typeId);
      return;
    }
    if (act === "abort") {
      go("menu");
      return;
    }
    if (act === "save") {
      sysopSave();
      return;
    }
    if (act === "restart" || act === "retry") {
      state.sysop = emptySysopDraft();
      renderSysop();
    }
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
    hideWumpusPanel();
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
      case "sysop":
        showSysop();
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
    if (h === "sysop") return { view: "sysop" };
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
      if (k === "C") { ev.preventDefault(); go("sysop"); return; }
      if (k === "A") { ev.preventDefault(); go("about"); return; }
      if (k === "G") { ev.preventDefault(); go("goodbye"); return; }
      if (k === "W") { ev.preventDefault(); go("product", "write65"); return; }
    }

    if (state.view === "sysop" && state.sysop) {
      const step = state.sysop.step;
      if (step === "type") {
        const picked = SYSOP_TYPES.find((t) => t.key === k);
        if (picked) { ev.preventDefault(); sysopPickType(picked.id); return; }
        if (k === "Q") { ev.preventDefault(); go("menu"); return; }
      } else if (step === "confirm") {
        if (k === "Y") { ev.preventDefault(); sysopSave(); return; }
        if (k === "N") { ev.preventDefault(); state.sysop = emptySysopDraft(); renderSysop(); return; }
        if (k === "Q") { ev.preventDefault(); go("menu"); return; }
      } else if (step === "error") {
        if (k === "Y") { ev.preventDefault(); state.sysop = emptySysopDraft(); renderSysop(); return; }
        if (k === "Q") { ev.preventDefault(); go("menu"); return; }
      } else if (k === "Q" && !typing) {
        ev.preventDefault();
        go("menu");
        return;
      }
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
      if (state.doorId === "hunt-the-wumpus" && state.wumpus) {
        const phase = state.wumpus.phase;
        if ((phase === "intro" || phase === "instruct") && (k === "H" || key === "Enter" || key === " ")) {
          ev.preventDefault();
          beginWumpus(false);
          return;
        }
        if (phase === "intro" && k === "I") {
          ev.preventDefault();
          showWumpusInstructions();
          return;
        }
        if (phase === "play" && k === "S") {
          ev.preventDefault();
          enterWumpusShoot();
          return;
        }
        if (phase === "shoot" && k === "L") {
          ev.preventDefault();
          enterWumpusPath();
          return;
        }
        if ((phase === "shoot" || phase === "path") && k === "C") {
          ev.preventDefault();
          cancelWumpusShoot();
          return;
        }
        if (phase === "path" && (k === "F" || key === "Enter")) {
          ev.preventDefault();
          if (state.wumpus.path && state.wumpus.path.length) wumpusFire(state.wumpus.path);
          return;
        }
        if (phase === "over" && k === "Y") {
          ev.preventDefault();
          beginWumpus(true);
          return;
        }
        if (phase === "over" && k === "N") {
          ev.preventDefault();
          beginWumpus(false);
          return;
        }
        if ((phase === "play" || phase === "shoot" || phase === "path") && k >= "0" && k <= "9") {
          ev.preventDefault();
          handleWumpusDigit(k);
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

    const sysopForm = $("sysop-form");
    if (sysopForm) {
      sysopForm.addEventListener("submit", (ev) => {
        ev.preventDefault();
        if (!state.sysop) return;
        sysopAdvanceFrom(state.sysop.step, $("sysop-input") ? $("sysop-input").value : "");
      });
    }
    const sysopSkip = $("sysop-skip");
    if (sysopSkip) {
      sysopSkip.addEventListener("click", () => {
        if (!state.sysop) return;
        sysopAdvanceFrom(state.sysop.step, "");
      });
    }
    const sysopBodyForm = $("sysop-body-form");
    if (sysopBodyForm) {
      sysopBodyForm.addEventListener("submit", (ev) => {
        ev.preventDefault();
        sysopSubmitBody($("sysop-body") ? $("sysop-body").value : "");
      });
    }
    const sysopBodyAbort = $("sysop-body-abort");
    if (sysopBodyAbort) {
      sysopBodyAbort.addEventListener("click", () => go("menu"));
    }

    document.addEventListener("click", (ev) => {
      const sysopBtn = ev.target.closest("[data-sysop]");
      if (sysopBtn && !sysopBtn.closest("dialog")) {
        ev.preventDefault();
        handleSysopAction(sysopBtn.dataset.sysop, sysopBtn.dataset.type);
        return;
      }
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
      } else if (route.view === "sysop") {
        go("sysop");
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
