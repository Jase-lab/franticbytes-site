const TYPES = {
  "bug-report": "Bug Report",
  "support-request": "Support Request",
  "enhancement-request": "Enhancement Request",
  "something-else": "Something Else",
};

const TYPE_ALIASES = {};
for (const [id, label] of Object.entries(TYPES)) {
  TYPE_ALIASES[id] = id;
  TYPE_ALIASES[label.toLowerCase()] = id;
  TYPE_ALIASES[label.toLowerCase().replace(/\s+/g, "-")] = id;
}
TYPE_ALIASES["feedback"] = "support-request";


const LIMITS = {
  handle: 24,
  name: 80,
  email: 120,
  message: 4000,
  userAgent: 512,
  bodyBytes: 16384,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function htmlResponse(status, title, lines) {
  const body = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n  ");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { background: #03140a; color: #3dff6a; font-family: ui-monospace, monospace; padding: 2rem; line-height: 1.4; }
    a { color: #ffbf3c; }
  </style>
</head>
<body>
  ${body}
  <p><a href="/#/sysop">Back to Comment to SysOp</a></p>
  <p><a href="/#/menu">Back to the board</a></p>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clipLine(value, max) {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  return s.slice(0, max);
}

function clipText(value, max) {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().slice(0, max);
}

function tooLong(value, max) {
  const s = String(value ?? "");
  return s.length > max;
}

function wantsHtml(request, data, contentType) {
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    return true;
  }
  if (data && data.format === "html") return true;
  const accept = (request.headers.get("Accept") || "").toLowerCase();
  return accept.includes("text/html") && !accept.includes("application/json");
}

function reply(request, data, contentType, status, payload, htmlLines) {
  if (wantsHtml(request, data, contentType)) {
    const title = payload.ok ? "FranticBBS — Message saved" : "FranticBBS — Message not saved";
    return htmlResponse(status, title, htmlLines);
  }
  return jsonResponse(status, payload);
}

async function readPayload(request) {
  const contentType = (request.headers.get("Content-Type") || "").toLowerCase();
  const raw = await request.text();
  if (raw.length > LIMITS.bodyBytes) {
    return { error: "oversized", contentType, rawLength: raw.length };
  }
  let data;
  try {
    if (contentType.includes("application/json") || raw.trim().startsWith("{")) {
      data = JSON.parse(raw);
    } else {
      data = Object.fromEntries(new URLSearchParams(raw));
    }
  } catch {
    return { error: "bad-body", contentType };
  }
  return { data, contentType, rawLength: raw.length };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const lengthHeader = Number(request.headers.get("Content-Length") || 0);
  if (lengthHeader > LIMITS.bodyBytes) {
    return jsonResponse(413, { ok: false, error: "Message too long." });
  }

  const parsed = await readPayload(request);
  if (parsed.error === "oversized") {
    return jsonResponse(413, { ok: false, error: "Message too long." });
  }
  if (parsed.error === "bad-body" || !parsed.data || typeof parsed.data !== "object") {
    return jsonResponse(400, { ok: false, error: "Could not read that message." });
  }

  const data = parsed.data;
  const contentType = parsed.contentType;

  const honeypot = String(data.fax || data.company || data.website || "").trim();
  if (honeypot) {
    return reply(request, data, contentType, 200, { ok: true }, [
      "MESSAGE SAVED.",
      "IT HAS BEEN FILED IN THE SYSOP MAILBOX.",
      "LORD FRAZZLE WILL SEE IT ON HIS NEXT PASS THROUGH THE BOARD.",
    ]);
  }

  if (tooLong(data.name, LIMITS.name) || tooLong(data.email, LIMITS.email) || tooLong(data.message, LIMITS.message) || tooLong(data.handle, LIMITS.handle)) {
    return reply(request, data, contentType, 413, { ok: false, error: "Message too long." }, [
      "MESSAGE TOO LONG.",
      "SHORTEN THE NOTE AND TRY AGAIN.",
    ]);
  }

  const typeId = TYPE_ALIASES[String(data.type || "").trim().toLowerCase()];
  if (!typeId) {
    return reply(request, data, contentType, 400, { ok: false, error: "Choose a message type." }, [
      "A MESSAGE TYPE IS REQUIRED.",
    ]);
  }

  const message = clipText(data.message, LIMITS.message);
  if (!message) {
    return reply(request, data, contentType, 400, { ok: false, error: "A message is required." }, [
      "A MESSAGE IS REQUIRED.",
    ]);
  }

  const email = clipLine(data.email, LIMITS.email);
  if (email && !EMAIL_RE.test(email)) {
    return reply(request, data, contentType, 400, { ok: false, error: "That email does not look right." }, [
      "THAT EMAIL DOES NOT LOOK RIGHT. TRY AGAIN, OR LEAVE IT BLANK.",
    ]);
  }

  const name = clipLine(data.name, LIMITS.name);
  const handle = clipLine(data.handle, LIMITS.handle);
  const userAgent = clipLine(request.headers.get("User-Agent") || "", LIMITS.userAgent);
  const createdAt = new Date().toISOString();

  if (!env.DB) {
    return reply(request, data, contentType, 500, { ok: false, error: "The SysOp mailbox is offline." }, [
      "THE SYSOP MAILBOX IS OFFLINE.",
      "TRY AGAIN IN A LITTLE WHILE.",
    ]);
  }

  try {
    await env.DB.prepare(
      "INSERT INTO sysop_messages (created_at, type, handle, name, email, subject, message, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(createdAt, TYPES[typeId], handle || null, name || null, email || null, "", message, userAgent || null)
      .run();
  } catch {
    return reply(request, data, contentType, 500, { ok: false, error: "The SysOp mailbox is offline." }, [
      "THE BOARD COULD NOT FILE THAT MESSAGE.",
      "YOU CAN TRY AGAIN, OR GO BACK TO THE MAIN MENU.",
    ]);
  }

  return reply(request, data, contentType, 200, { ok: true }, [
    "MESSAGE SAVED.",
    "IT HAS BEEN FILED IN THE SYSOP MAILBOX.",
    "LORD FRAZZLE WILL SEE IT ON HIS NEXT PASS THROUGH THE BOARD.",
  ]);
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return new Response("Method not allowed", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  });
}
