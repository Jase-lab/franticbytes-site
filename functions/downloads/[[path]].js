// Private download counters for files under /downloads/.
// Totals live in the FB_DOWNLOADS KV namespace and are not exposed on the site.
// A failed or missing increment must never block or alter the file response.

const PATH_RE = /^\/downloads\/[A-Za-z0-9._/-]+$/;

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
  if (request.method === "GET" && response.ok) {
    waitUntil(
      increment(env, request).catch(() => {})
    );
  }
  return response;
}
