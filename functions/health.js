const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const TOOLBAZ_PAGE_URL = "https://toolbaz.com/writer/chat-gpt-alternative";
const TOKEN_URL = "https://data.toolbaz.com/token.php";
const DEEPAI_URL = "https://api.deepai.org/api/text2img";
const POLLINATIONS_MODEL_KEYS = ["pol-openai-fast"];
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
        const r = await fetch(queryUrl.toString(), {
            method: 'GET',
            headers: {
                'User-Agent': UA
            }
        });

        if (!r.ok) {
            throw new Error(`Query endpoint error ${r.status}`);
        }

        const response = await r.json();
        if (!response.success) {
            throw new Error(response.error || 'Unknown error');
        }

        return { ok: true, latency_ms: Date.now() - t0 };
    } catch (e) {
        return { ok: false, error: e.message, latency_ms: Date.now() - t0 };
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
    const allModels = [...await fetchAvailableModels(request), POLLINATIONS_MODEL_KEYS[0]];

    const [page, token, image, ...modelResults] = await Promise.all([
        checkPage(),
        checkToken(),
        checkImage(),
        ...allModels.map(m => checkModel(m, request)),
    ]);

    const models = {};
    for (let i = 0; i < allModels.length; i++) {
        models[allModels[i]] = modelResults[i];
    }
    const polResult = models[POLLINATIONS_MODEL_KEYS[0]];
    for (const key of POLLINATIONS_MODEL_KEYS.slice(1)) {
        models[key] = polResult;
    }

    const baseModels = allModels.filter(m => !POLLINATIONS_MODEL_KEYS.slice(1).includes(m));
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