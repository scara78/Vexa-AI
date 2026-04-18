import {
  UA, TOOLBAZ_PAGE_URL, TOKEN_URL, WRITE_URL,
  POLLINATIONS_MODELS, DOLPHIN_MODELS, DEEPAI_MODELS, TALKAI_MODELS,
  DEFAULT_MODEL, MODELS_CACHE_TTL, POST_HDRS,
  randomString, makeClientToken, generateTryitKey, parseFull,
  aiFreeComplete, vexaComplete, pollinationsComplete, dolphinComplete, talkaiComplete,
  resolveSource, corsHeaders,
} from "./core.js";

const MAX_RETRIES = 3;
const BACKOFF_BASE = 1.5;

const modelsCache = { keys: new Set(), default: DEFAULT_MODEL, ts: 0 };

async function refreshModels() {
  const now = Date.now();
  if (modelsCache.keys.size > 0 && now - modelsCache.ts < MODELS_CACHE_TTL) return;
  try {
    const r = await fetch(TOOLBAZ_PAGE_URL, { headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" } });
    if (!r.ok) return;
    const html = await r.text();
    const selectMatch = html.match(/<select[^>]*\bname=["']?model["']?[^>]*>([\s\S]*?)(?:<\/select>|$)/i);
    if (!selectMatch) return;
    const keys = new Set([...DEEPAI_MODELS, ...DOLPHIN_MODELS, ...TALKAI_MODELS]);
    const seen = new Set(keys);
    for (const m of selectMatch[1].matchAll(/<option[^>]*\bvalue=["']?([^"'\s>]+)/gi)) {
      const k = m[1].trim();
      if (k && !seen.has(k)) { keys.add(k); seen.add(k); }
    }
    if (keys.size) { modelsCache.keys = keys; modelsCache.ts = now; }
  } catch (_) { }
}

async function fetchUpstream(prompt, model) {
  const sid = randomString(32);
  const tokenBody = new URLSearchParams({ session_id: sid, token: generateTryitKey() });
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const tr = await fetch(TOKEN_URL, { method: "POST", headers: POST_HDRS, body: tokenBody.toString() });
      if (!tr.ok) throw new Error(`Token request failed: ${tr.status}`);
      const tj = await tr.json();
      const token = tj.token || "";
      if (!token) throw new Error("Token endpoint returned no token");
      const writeBody = new URLSearchParams({ text: prompt, capcha: token, model, session_id: sid });
      const wr = await fetch(WRITE_URL, {
        method: "POST",
        headers: { ...POST_HDRS, Accept: "text/event-stream, application/json, */*" },
        body: writeBody.toString(),
      });
      if (wr.ok) return await wr.text();
      if (wr.status < 500) throw new Error(`Upstream error ${wr.status}`);
      lastErr = new Error(`Upstream server error ${wr.status}`);
    } catch (e) {
      lastErr = e;
      if (e.message.startsWith("Upstream error")) throw e;
    }
    await new Promise(res => setTimeout(res, Math.pow(BACKOFF_BASE, attempt) * 1000));
  }
  throw lastErr;
}

async function run(prompt, model, _ip) {
  if (!prompt || !prompt.trim()) {
    return Response.json({ success: false, error: "Missing required parameter: q, query, or prompt" }, { status: 400, headers: corsHeaders() });
  }
  prompt = prompt.trim();
  await refreshModels();
  if (!model) model = DEFAULT_MODEL;
  const isKnown = POLLINATIONS_MODELS.has(model) || DOLPHIN_MODELS.has(model) || DEEPAI_MODELS.has(model) || TALKAI_MODELS.has(model) || model === "vexa" || model === "gpt-5";
  if (!isKnown && modelsCache.keys.size > 0 && !modelsCache.keys.has(model)) {
    return Response.json({ success: false, error: `Unknown model '${model}'`, valid_models: [...modelsCache.keys].sort() }, { status: 400, headers: corsHeaders() });
  }
  const t0 = Date.now();
  try {
    const deepaiModel = model === "vexa" ? "standard" : model;
    const msgs = [{ role: "user", content: prompt }];
    const raw = TALKAI_MODELS.has(model)
      ? await talkaiComplete(prompt, model)
      : DOLPHIN_MODELS.has(model)
        ? await dolphinComplete(prompt, model)
        : POLLINATIONS_MODELS.has(model)
          ? await pollinationsComplete(msgs, model)
          : DEEPAI_MODELS.has(model) || model === "vexa"
            ? await vexaComplete(prompt, msgs, deepaiModel)
            : model === "gpt-5"
              ? await aiFreeComplete(prompt, msgs, model)
              : parseFull(await fetchUpstream(prompt, model));
    const text = (TALKAI_MODELS.has(model) || DOLPHIN_MODELS.has(model) || POLLINATIONS_MODELS.has(model) || DEEPAI_MODELS.has(model) || model === "vexa" || model === "gpt-5") ? raw : parseFull(raw);
    return Response.json({ success: true, response: text, model, elapsed_ms: Date.now() - t0, source: resolveSource(model) }, { status: 200, headers: corsHeaders() });
  } catch (e) {
    return Response.json({ success: false, error: "Upstream request failed", detail: e.message }, { status: 502, headers: corsHeaders() });
  }
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (request.method === "GET") {
    const url = new URL(request.url);
    return run(url.searchParams.get("q") || url.searchParams.get("query") || "", url.searchParams.get("model") || "", ip);
  }
  if (request.method === "POST") {
    let body;
    try { body = await request.json(); }
    catch (_) { return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400, headers: corsHeaders() }); }
    return run(body.q || body.query || body.prompt || "", body.model || "", ip);
  }
  return Response.json({ success: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
}