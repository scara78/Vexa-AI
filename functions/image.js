import {
    UA, DEEPAI_IMAGE_MODELS, POLLINATIONS_IMAGE_MODELS, IMAGE_PREFERENCES,
    DEFAULT_IMAGE_MODEL, DEFAULT_IMAGE_PREFERENCE,
    callDeepAIImage, callPollinationsImage, makeProxyId, proxyCache,
    corsHeaders,
} from "./core.js";

function isRateLimited(_ip) { return false; }

function parseGet(url) {
    const sp = url.searchParams;
    return {
        prompt: sp.get("q") || sp.get("prompt") || null,
        model: sp.get("model") || DEFAULT_IMAGE_MODEL,
        preference: sp.get("preference") || DEFAULT_IMAGE_PREFERENCE,
    };
}

async function parsePost(request) {
    let body;
    try { body = await request.json(); }
    catch (_) { return null; }
    return {
        prompt: body.prompt || body.q || null,
        model: body.model || DEFAULT_IMAGE_MODEL,
        preference: body.preference || DEFAULT_IMAGE_PREFERENCE,
    };
}

async function run(args, baseUrl) {
    const { prompt, model, preference } = args;
    if (!prompt || !String(prompt).trim()) {
        return Response.json({ success: false, error: "Missing required parameter: q or prompt" }, { status: 400, headers: corsHeaders() });
    }
    const isPollinations = POLLINATIONS_IMAGE_MODELS.has(model);
    const isDeepAI = DEEPAI_IMAGE_MODELS.has(model);
    if (!isPollinations && !isDeepAI) {
        return Response.json({ success: false, error: `Invalid model. Valid values: ${[...DEEPAI_IMAGE_MODELS, ...POLLINATIONS_IMAGE_MODELS].join(", ")}` }, { status: 400, headers: corsHeaders() });
    }
    const t0 = Date.now();
    let upstreamUrl;
    try {
        if (isPollinations) {
            upstreamUrl = await callPollinationsImage(String(prompt).trim().slice(0, 1000), model);
        } else {
            const prefKey = IMAGE_PREFERENCES[preference];
            if (!prefKey) {
                return Response.json({ success: false, error: "Invalid preference. Valid values: speed, quality" }, { status: 400, headers: corsHeaders() });
            }
            upstreamUrl = await callDeepAIImage(String(prompt).trim().slice(0, 1000), "hd", prefKey);
        }
    } catch (e) {
        return Response.json({ success: false, error: `Generation failed: ${e.message}` }, { status: 502, headers: corsHeaders() });
    }
    const proxyId = await makeProxyId(upstreamUrl);
    const proxyUrl = `${baseUrl}/image/proxy/${proxyId}`;
    const source = isPollinations ? "pollinations.ai" : "deepai.org";
    return Response.json({
        success: true,
        prompt: String(prompt).trim().slice(0, 1000),
        model,
        ...(isDeepAI && { preference }),
        proxy_url: proxyUrl,
        source,
        elapsed_ms: Date.now() - t0,
    }, { status: 200, headers: corsHeaders() });
}

export { proxyCache };

export async function onRequest({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (isRateLimited(ip)) {
        return Response.json({ success: false, error: "Rate limit exceeded" }, { status: 429, headers: corsHeaders() });
    }
    if (request.method === "GET") {
        return run(parseGet(url), baseUrl);
    }
    if (request.method === "POST") {
        const args = await parsePost(request);
        if (!args) {
            return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400, headers: corsHeaders() });
        }
        return run(args, baseUrl);
    }
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
}