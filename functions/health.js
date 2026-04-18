const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const TOOLBAZ_PAGE_URL = "https://toolbaz.com/writer/chat-gpt-alternative";
const TOKEN_URL = "https://data.toolbaz.com/token.php";
const DEEPAI_URL = "https://api.deepai.org/api/text2img";
const POLLINATIONS_MODEL_KEYS = ["pol-openai-fast"];
const TALKAI_MODEL_KEYS = ["claude-3-haiku", "gemini-2.0-flash-lite", "deepseek-chat", "gpt-4.1-nano"];
const HDRS = {
    "Referer": TOOLBAZ_PAGE_URL,
    "Origin": "https://toolbaz.com",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "User-Agent": UA,
};
const POST_HDRS = {
    "User-Agent": UA,
    "Referer": TOOLBAZ_PAGE_URL,
    "Origin": "https://toolbaz.com",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Accept-Language": "en-US,en;q=0.9",
};
const HEALTH_PROBE = "Hi";
const MODEL_CHECK_TIMEOUT = 10000;
const MAX_MODELS_TO_CHECK = 100;

function randomString(n) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

function makeClientToken() {
    const obj = {
        bR6wF: { nV5kP: UA, lQ9jX: "en-US", sD2zR: "1920x1080", tY4hL: "America/New_York", pL8mC: "Win32", cQ3vD: 24, hK7jN: 8 },
        uT4bX: { mM9wZ: [], kP8jY: [] },
        tuTcS: Math.floor(Date.now() / 1000),
        tDfxy: null,
        RtyJt: randomString(36),
    };
    return randomString(6) + btoa(JSON.stringify(obj));
}

async function fetchAvailableModels(request) {
    try {
        const modelsUrl = new URL('/models', request.url);
        const r = await fetch(modelsUrl.toString(), {
            method: 'GET',
            headers: { 'User-Agent': UA }
        });

        if (!r.ok) {
            return ["vexa"];
        }

        const data = await r.json();
        if (!data.success || !data.models) {
            return ["vexa"];
        }

        const modelKeys = Object.keys(data.models);

        return modelKeys.length > 0 ? modelKeys : ["vexa"];
    } catch (error) {
        return ["vexa"];
    }
}

async function checkModel(model, request) {
    const t0 = Date.now();
    try {
        const queryUrl = new URL('/query', request.url);
        queryUrl.searchParams.set('q', HEALTH_PROBE);
        queryUrl.searchParams.set('model', model);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), MODEL_CHECK_TIMEOUT);

        const r = await fetch(queryUrl.toString(), {
            method: 'GET',
            headers: {
                'User-Agent': UA
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!r.ok) {
            throw new Error(`Query endpoint error ${r.status}`);
        }

        const response = await r.json();
        if (!response.success) {
            throw new Error(response.error || 'Unknown error');
        }

        return { ok: true, latency_ms: Date.now() - t0 };
    } catch (e) {
        return { ok: false, error: e.message || 'Timeout', latency_ms: Date.now() - t0 };
    }
}

async function checkPage() {
    const t0 = Date.now();
    try {
        const r = await fetch(TOOLBAZ_PAGE_URL, { headers: { "User-Agent": UA } });
        return { reachable: r.ok, status_code: r.status, latency_ms: Date.now() - t0 };
    } catch (e) {
        return { reachable: false, error: e.message, latency_ms: Date.now() - t0 };
    }
}

async function checkToken() {
    const t0 = Date.now();
    const sid = randomString(32);
    try {
        const body = new URLSearchParams({ session_id: sid, token: makeClientToken() });
        const r = await fetch(TOKEN_URL, { method: "POST", headers: POST_HDRS, body: body.toString() });
        const ok = r.ok;
        let token = "";
        if (ok) {
            try { token = (await r.json()).token || ""; } catch (_) { }
        }
        return { reachable: ok, token_received: Boolean(token), status_code: r.status, latency_ms: Date.now() - t0 };
    } catch (e) {
        return { reachable: false, token_received: false, error: e.message, latency_ms: Date.now() - t0 };
    }
}

async function checkImage() {
    const t0 = Date.now();
    try {
        const r = await fetch(DEEPAI_URL, {
            method: "HEAD",
            headers: { "User-Agent": UA, "Origin": "https://deepai.org" },
        });
        return { reachable: r.status < 500, status_code: r.status, latency_ms: Date.now() - t0 };
    } catch (e) {
        return { reachable: false, error: e.message, latency_ms: Date.now() - t0 };
    }
}

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    };
}

export async function onRequest({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "GET") {
        return Response.json({ success: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
    }

    const tStart = Date.now();
    const scrapedModels = await fetchAvailableModels(request);
    const priorityModels = ['vexa', POLLINATIONS_MODEL_KEYS[0], ...TALKAI_MODEL_KEYS];
    const remainingSlots = MAX_MODELS_TO_CHECK - priorityModels.length;
    const additionalModels = scrapedModels
        .filter(m => !priorityModels.includes(m))
        .slice(0, Math.max(0, remainingSlots));
    const checkedSet = new Set([...priorityModels, ...additionalModels]);
    const allModels = [...priorityModels, ...additionalModels, ...scrapedModels.filter(m => !checkedSet.has(m))];

    const modelsToCheck = allModels.slice(0, MAX_MODELS_TO_CHECK);

    const [page, token, image, ...modelResults] = await Promise.all([
        checkPage(),
        checkToken(),
        checkImage(),
        ...modelsToCheck.map(m => checkModel(m, request)),
    ]);

    const models = {};
    for (let i = 0; i < modelsToCheck.length; i++) {
        models[modelsToCheck[i]] = modelResults[i];
    }

    for (const m of allModels.slice(MAX_MODELS_TO_CHECK)) {
        models[m] = { ok: null, error: 'Skipped - too many models', latency_ms: 0 };
    }

    const polResult = models[POLLINATIONS_MODEL_KEYS[0]];
    for (const key of POLLINATIONS_MODEL_KEYS.slice(1)) {
        models[key] = polResult;
    }

    const baseModels = modelsToCheck.filter(m => !POLLINATIONS_MODEL_KEYS.slice(1).includes(m));
    const failedModels = baseModels.filter((m, i) => !modelResults[baseModels.indexOf(m)] && !modelResults[i].ok);
    const polFailed = polResult && !polResult.ok;
    const allModelsOk = failedModels.length === 0 && !polFailed;
    const overall = page.reachable && token.reachable && token.token_received && image.reachable && allModelsOk;

    return Response.json({
        success: true,
        status: overall ? "ok" : "degraded",
        timestamp: Math.floor(Date.now() / 1000),
        total_ms: Date.now() - tStart,
        checks: {
            page,
            token,
            image,
            models,
        },
        ...(failedModels.length > 0 && { failed_models: failedModels }),
    }, { status: 200, headers: corsHeaders() });
}