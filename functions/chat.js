import {
    UA, TOOLBAZ_PAGE_URL, TOKEN_URL, WRITE_URL, DEEPAI_CHAT_URL,
    POLLINATIONS_MODELS, DOLPHIN_MODELS, DEEPAI_MODELS, TALKAI_MODELS,
    DEEPAI_MODEL_OVERRIDES, DEFAULT_MODEL, MODELS_CACHE_TTL, POST_HDRS,
    randomString, makeClientToken, parseFull, messagesToPrompt, unescapeHtml, labelToKey,
    aiFreeComplete, vexaComplete, pollinationsComplete, dolphinComplete, talkaiComplete,
    corsHeaders, corsHeadersStream,
} from "./core.js";

const SESSION_ID = "yz3SJSGvR1ih8w5vfOmk9Fpd87iSGfUos54s";

const modelsCache = { toolbazModels: new Set(), deepaiModels: new Set(), ts: 0 };

const HDRS = {
    "User-Agent": UA,
    "Referer": TOOLBAZ_PAGE_URL,
    "Origin": "https://toolbaz.com",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Accept-Language": "en-US,en;q=0.9",
};

async function scrapeDeepAIFreeModels() {
    try {
        const r = await fetch(DEEPAI_CHAT_URL, { headers: { "User-Agent": UA } });
        if (!r.ok) return new Set(Object.keys(DEEPAI_MODEL_OVERRIDES));
        const html = await r.text();
        const freeKeys = new Set(["vexa"]);
        const lockPattern = /lock-icon/;
        const spanPattern = /<span[^>]*>([^<]+)<\/span>/;
        const blocks = html.split(/<div[^>]*class="[^"]*chat-mode-menu-item/i).slice(1);
        for (const block of blocks) {
            if (/chat-mode-locked/.test(block) || lockPattern.test(block)) continue;
            const spanMatch = block.match(spanPattern);
            if (!spanMatch) continue;
            const label = unescapeHtml(spanMatch[1].trim());
            if (!label || label.length < 2) continue;
            const known = Object.entries(DEEPAI_MODEL_OVERRIDES).find(
                ([, v]) => v.label.toLowerCase() === label.toLowerCase()
            );
            freeKeys.add(known ? known[0] : labelToKey(label));
        }
        for (const key of Object.keys(DEEPAI_MODEL_OVERRIDES)) freeKeys.add(key);
        return freeKeys;
    } catch (_) {
        return new Set(Object.keys(DEEPAI_MODEL_OVERRIDES));
    }
}

async function getValidModels() {
    const now = Date.now();
    if (modelsCache.toolbazModels.size > 0 && now - modelsCache.ts < MODELS_CACHE_TTL) {
        return { toolbaz: modelsCache.toolbazModels, deepai: modelsCache.deepaiModels };
    }
    try {
        const [tbRes, deepaiKeys] = await Promise.all([
            fetch(TOOLBAZ_PAGE_URL, { headers: { "User-Agent": UA } }),
            scrapeDeepAIFreeModels(),
        ]);
        const toolbaz = new Set(["vexa"]);
        if (tbRes.ok) {
            const html = await tbRes.text();
            const selectMatch = html.match(/<select[^>]*\bname=["']?model["']?[^>]*>([\s\S]*?)(?:<\/select>|$)/i);
            if (selectMatch) {
                const seen = new Set();
                for (const m of selectMatch[1].matchAll(/<option[^>]*\bvalue=["']?([^"'\s>]+)/gi)) {
                    const val = m[1].trim();
                    if (val && !seen.has(val)) { seen.add(val); toolbaz.add(val); }
                }
            }
        }
        modelsCache.toolbazModels = toolbaz;
        modelsCache.deepaiModels = deepaiKeys;
        modelsCache.ts = now;
        return { toolbaz, deepai: deepaiKeys };
    } catch (_) {
        return {
            toolbaz: modelsCache.toolbazModels.size > 0 ? modelsCache.toolbazModels : new Set(["vexa"]),
            deepai: modelsCache.deepaiModels.size > 0 ? modelsCache.deepaiModels : new Set(Object.keys(DEEPAI_MODEL_OVERRIDES)),
        };
    }
}

async function toolbazComplete(prompt, model) {
    const clientToken = makeClientToken();
    const tokenBody = new URLSearchParams({ session_id: SESSION_ID, token: clientToken });
    const [tr] = await Promise.all([
        fetch(TOKEN_URL, { method: "POST", headers: HDRS, body: tokenBody.toString() }),
        getValidModels(),
    ]);
    const tj = await tr.json();
    const capcha = tj.token || "";
    if (!capcha) throw new Error("Failed to obtain capcha token");
    const writeBody = new URLSearchParams({ text: prompt, capcha, model, session_id: SESSION_ID });
    const wr = await fetch(WRITE_URL, {
        method: "POST",
        headers: { ...HDRS, Accept: "text/event-stream,*/*" },
        body: writeBody.toString(),
    });
    if (!wr.ok) throw new Error(`Upstream error ${wr.status}`);
    const text = await wr.text();
    if (text.toLowerCase().includes("capcha") || text.toLowerCase().includes("expired")) {
        throw new Error(`Toolbaz rejected request: ${text.slice(0, 200)}`);
    }
    return parseFull(text);
}

function isRateLimited(_ip) { return false; }

export async function onRequest({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders("POST, OPTIONS") });
    }
    if (request.method === "GET") {
        return Response.json({
            success: false,
            error: "GET not supported on /chat",
            reason: "This endpoint requires a POST request with a JSON body containing a 'messages' array.",
            frontend_only: true,
            how_to_use: {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: {
                    model: DEFAULT_MODEL,
                    messages: [
                        { role: "system", content: "You are a helpful assistant." },
                        { role: "user", content: "Your message here" },
                    ],
                },
            },
        }, { status: 405, headers: corsHeaders("POST, OPTIONS") });
    }
    if (request.method !== "POST") {
        return Response.json({ success: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders("POST, OPTIONS") });
    }
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (isRateLimited(ip)) {
        return Response.json({ success: false, error: "Rate limit exceeded. Try again shortly." }, { status: 429, headers: corsHeaders("POST, OPTIONS") });
    }
    let body;
    try { body = await request.json(); }
    catch (_) { return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400, headers: corsHeaders("POST, OPTIONS") }); }
    const messages = body.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return Response.json({ success: false, error: "Missing or empty 'messages' array" }, { status: 400, headers: corsHeaders("POST, OPTIONS") });
    }
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (typeof msg !== "object" || msg === null) {
            return Response.json({ success: false, error: `messages[${i}] must be an object` }, { status: 400, headers: corsHeaders("POST, OPTIONS") });
        }
        if (!["system", "user", "assistant"].includes(msg.role)) {
            return Response.json({ success: false, error: `messages[${i}].role must be 'system', 'user', or 'assistant'` }, { status: 400, headers: corsHeaders("POST, OPTIONS") });
        }
        if (typeof (msg.content ?? "") !== "string") {
            return Response.json({ success: false, error: `messages[${i}].content must be a string` }, { status: 400, headers: corsHeaders("POST, OPTIONS") });
        }
    }
    let model = body.model || DEFAULT_MODEL;
    const totalChars = messages.reduce((sum, m) => sum + (m.content || "").length, 0);
    const prompt = messagesToPrompt(messages);
    const { toolbaz: toolbazModels, deepai: deepaiModels } = await getValidModels();
    const isDeepAI = deepaiModels.has(model) || DEEPAI_MODELS.has(model);
    const isPollinations = POLLINATIONS_MODELS.has(model);
    const isDolphin = DOLPHIN_MODELS.has(model);
    const isTalkAI = TALKAI_MODELS.has(model);
    const isToolbaz = toolbazModels.has(model);
    if (!isDeepAI && !isPollinations && !isDolphin && !isTalkAI && !isToolbaz) model = DEFAULT_MODEL;
    const t0 = Date.now();
    const stream = body.stream === true;
    const deepaiModel = model === "vexa" ? "standard" : model;
    const lastUserMsg = messages.filter(m => m.role === "user").at(-1)?.content || "";

    async function resolve() {
        if (isTalkAI) return talkaiComplete(lastUserMsg, model);
        if (isDolphin) return dolphinComplete(lastUserMsg, model);
        if (isPollinations) return pollinationsComplete(messages, model);
        if (isDeepAI) return vexaComplete(prompt, messages, deepaiModel);
        if (model === "gpt-5") return aiFreeComplete(lastUserMsg, messages, model);
        return toolbazComplete(prompt, model);
    }

    try {
        if (stream) {
            const encoder = new TextEncoder();
            const readable = new ReadableStream({
                async start(controller) {
                    try {
                        const text = await resolve();
                        for (let i = 0; i < text.length; i++) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text[i] }, finish_reason: null }] })}\n\n`));
                            await new Promise(r => setTimeout(r, 10));
                        }
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}\n\n`));
                        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                        controller.close();
                    } catch (error) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { message: error.message } })}\n\n`));
                        controller.close();
                    }
                }
            });
            return new Response(readable, { status: 200, headers: corsHeadersStream() });
        }
        const text = await resolve();
        return Response.json({ success: true, message: { role: "assistant", content: text }, model, elapsed_ms: Date.now() - t0, prompt_chars: totalChars }, { status: 200, headers: corsHeaders("POST, OPTIONS") });
    } catch (e) {
        return Response.json({ success: false, error: `Upstream request failed: ${e.message}` }, { status: 502, headers: corsHeaders("POST, OPTIONS") });
    }
}