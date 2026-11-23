// Private download counters for files under /downloads/.
// Totals live in the FB_DOWNLOADS KV namespace and are not exposed on the site.
// A failed or missing increment must never block or alter the file response.
//
// Requests with a matching X-FB-NoCount header (FB_NOCOUNT_SECRET) are not
// counted. Optional FB_NOCOUNT_IPS (comma-separated client IPs) are also skipped.

const PATH_RE = /^\/downloads\/[A-Za-z0-9._/-]+$/;
const NOCOUNT_HEADER = "X-FB-NoCount";

function filePath(request) {
  let path;
  try {
    path = decodeURIComponent(new URL(request.url).pathname);
  } catch {
    return null;
  }
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path.includes("\0") || path.split("/").includes("..")) return null;
  if (!PATH_RE.test(path)) return null;
  return path;
}

function secretEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length === 0 || a.length !== b.length) {
    return false;
  }
  const enc = new TextEncoder();
  const left = enc.encode(a);
  const right = enc.encode(b);
  let out = 0;
  for (let i = 0; i < left.length; i++) out |= left[i] ^ right[i];
  return out === 0;
}

function shouldSkip(request, env) {
  const secret = env && env.FB_NOCOUNT_SECRET;
  if (secret && secretEqual(request.headers.get(NOCOUNT_HEADER) || "", secret)) {
    return true;
  }
  const allow = env && env.FB_NOCOUNT_IPS;
  if (allow) {
    const ip = request.headers.get("CF-Connecting-IP") || "";
    if (ip && String(allow).split(",").map((s) => s.trim()).filter(Boolean).includes(ip)) {
      return true;
    }
  }
  return false;
}

async function bump(kv, key) {
  const current = parseInt((await kv.get(key)) || "0", 10);
  const next = Number.isFinite(current) && current >= 0 ? current + 1 : 1;
  await kv.put(key, String(next));
}

async function increment(env, request) {
  const kv = env && env.FB_DOWNLOADS;
  if (!kv) return;
  const path = filePath(request);
  if (!path) return;
  const day = new Date().toISOString().slice(0, 10);
  await bump(kv, `total:${path}`);
  await bump(kv, `day:${day}:${path}`);
}

export async function onRequest(context) {
  const { request, env, next, waitUntil } = context;
  const response = env && env.ASSETS ? await env.ASSETS.fetch(request) : await next();
  if (request.method === "GET" && response.ok && !shouldSkip(request, env)) {
    waitUntil(
      increment(env, request).catch(() => {})
    );
  }
  return response;
}
