/**
 * server.js — Node.js HTTP shim for Docker / EasyPanel deployment.
 * Mimics the Cloudflare Workers runtime so _worker.js runs unchanged.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// ─── Polyfills needed by Workers code ────────────────────────────────────────

// Workers expose Response.json() as a static method
if (!Response.json) {
  Response.json = (data, init = {}) => {
    const body = JSON.stringify(data);
    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return new Response(body, { ...init, headers });
  };
}

// ─── In-memory KV store (replaces Cloudflare KV PROXY_CACHE binding) ─────────
const _kvStore = new Map();
const PROXY_CACHE = {
  async get(key) { return _kvStore.get(key) ?? null; },
  async put(key, value, opts) {
    _kvStore.set(key, value);
    if (opts?.expirationTtl) {
      setTimeout(() => _kvStore.delete(key), opts.expirationTtl * 1000);
    }
  },
  async delete(key) { _kvStore.delete(key); },
};

// ─── Static asset handler (replaces env.ASSETS.fetch) ─────────────────────────
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain",
  ".xml": "application/xml",
};

function serveStatic(req) {
  const url = new URL(req.url, "http://localhost");
  const filePath = path.join(__dirname, "public", url.pathname);
  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const ext = path.extname(filePath);
      const body = fs.readFileSync(filePath);
      return new Response(body, {
        headers: { "Content-Type": MIME[ext] || "application/octet-stream" },
      });
    }
  } catch (_) {}
  return null;
}

const ASSETS = {
  fetch(request) {
    const res = serveStatic(request);
    if (res) return Promise.resolve(res);
    return Promise.resolve(new Response("Not found", { status: 404 }));
  },
};

// ─── Worker env object ────────────────────────────────────────────────────────
const env = { PROXY_CACHE, ASSETS };

// ─── Import the worker ────────────────────────────────────────────────────────
const { default: worker } = await import("./_worker.js");

// ─── Node → Fetch API bridge ──────────────────────────────────────────────────
function nodeReqToFetchReq(nodeReq, body) {
  const host = nodeReq.headers.host || `localhost:${PORT}`;
  const url = `http://${host}${nodeReq.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(nodeReq.headers)) {
    if (Array.isArray(v)) v.forEach((val) => headers.append(k, val));
    else headers.set(k, v);
  }
  const init = { method: nodeReq.method, headers };
  if (body && body.length > 0) init.body = body;
  return new Request(url, init);
}

async function readBody(nodeReq) {
  return new Promise((resolve) => {
    const chunks = [];
    nodeReq.on("data", (c) => chunks.push(c));
    nodeReq.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function writeFetchResponse(fetchRes, nodeRes) {
  nodeRes.statusCode = fetchRes.status;
  fetchRes.headers.forEach((value, key) => nodeRes.setHeader(key, value));

  if (fetchRes.body) {
    const reader = fetchRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      nodeRes.write(value);
    }
  }
  nodeRes.end();
}

// ─── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (nodeReq, nodeRes) => {
  try {
    const body = await readBody(nodeReq);
    const fetchReq = nodeReqToFetchReq(nodeReq, body);
    const fetchRes = await worker.fetch(fetchReq, env, {});
    await writeFetchResponse(fetchRes, nodeRes);
  } catch (err) {
    console.error("Server error:", err);
    nodeRes.writeHead(500, { "Content-Type": "application/json" });
    nodeRes.end(JSON.stringify({ success: false, error: "Internal server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`✅ Vexa AI running on port ${PORT}`);
});
