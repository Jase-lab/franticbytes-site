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
    const sess = sessionMinutes();
    if (sess.started && sess.left === 0 && state.view !== "goodbye" && state.view !== "intro" && state.view !== "login") go("goodbye");
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
    try {
      const key = "fb_sysop_online";
      const existing = sessionStorage.getItem(key);
      if (existing === "1" || existing === "0") return existing === "1";
      const on = Math.random() < 0.5;
      sessionStorage.setItem(key, on ? "1" : "0");
      return on;
    } catch {
      if (typeof state._sysopOnline !== "boolean") {
        state._sysopOnline = Math.random() < 0.5;
      }
      return state._sysopOnline;
    }
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
    if (h === "#downloads" || h === "#/downloads" || h === "#write65" || h === "#/write65" || h === "#/write65/downloads" || h === "#menu" || h === "#/menu" || h === "#about" || h === "#/about" || h === "#doors" || h === "#/doors") {
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
    $("doors-lead").textContent = "Online door games, played right from this terminal. No doors are hung yet — the bays below are waiting for a real game, not a placeholder title.";
    $("doors-note").innerHTML = `<p>“I put the frames up and oiled the hinges. Games come later. Don’t rattle the knobs.”</p><footer>— SysOp ${escapeHtml(sysopName())}</footer>`;
    const list = $("doors-list");
    list.innerHTML = "";
    const doors = doorList();
    const rows = doors.length
      ? doors
      : [
          { id: "bay-1", key: "1", status: "coming_soon" },
          { id: "bay-2", key: "2", status: "out_of_order" },
          { id: "bay-3", key: "3", status: "coming_soon" },
        ];
    rows.forEach((door) => {
      const li = document.createElement("li");
      const status = door.status || (door.url ? "open" : "coming_soon");
      const statusLabel = status === "out_of_order" ? "OUT OF ORDER" : status === "open" ? "READY" : "COMING SOON";
      const title = door.name || ("DOOR " + (door.key || ""));
      const isOpen = status === "open" && door.url;
      const el = document.createElement(isOpen ? "a" : "button");
      if (!isOpen) el.type = "button";
      el.className = "dl-link door-slot";
      if (isOpen) el.href = door.url;
      el.dataset.door = door.id || "";
      el.dataset.status = status;
      el.innerHTML = `<kbd>${escapeHtml(door.key || "")}</kbd><span class="dl-meta"><span class="dl-title">${escapeHtml(title)}</span><span class="door-status ${status === "out_of_order" ? "out-of-order" : status === "open" ? "ready" : "coming-soon"}">${escapeHtml(statusLabel)}</span>${door.blurb ? `<span class="dl-notes">${escapeHtml(door.blurb)}</span>` : ""}</span>`;
      if (!isOpen) {
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
    await typeLines(log, [
      { text: `THANKS FOR CALLING, ${greetName()}.`, cls: "info", pause: 200 },
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

    if (key === "?") {
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

    if (state.view === "login" && isTypingInField(ev.target)) {
      if (key === "Escape") {
        ev.preventDefault();
        finishLogin("GUEST");
        go("menu");
      }
      return;
    }

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
