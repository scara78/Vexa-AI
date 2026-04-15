const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const TOOLBAZ_PAGE_URL = "https://toolbaz.com/writer/chat-gpt-alternative";
const DEEPAI_CHAT_URL = "https://deepai.org/chat";
const CACHE_TTL = 300000;
const DEFAULT_TEXT_MODEL = "vexa";

const POLLINATIONS_URL = "https://text.pollinations.ai/openai";
const POLLINATIONS_MODELS_LIST = [
    { key: "pol-openai-fast", label: "Pollinations GPT-OSS", provider: "Pollinations.ai", speed: 280, quality: 72 },
];

const IMAGE_MODELS = [
    { name: "hd", label: "HD", description: "Standard HD generation — DeepAI" },
    { name: "flux", label: "Flux", description: "Fast, high quality — default" },
    { name: "turbo", label: "Flux Turbo", description: "Fastest generation" },
    { name: "kontext", label: "Flux Kontext", description: "Instruction-following edits" },
    { name: "seedream", label: "Seedream 3", description: "ByteDance — photorealistic" },
    { name: "nanobanana", label: "Nano Banana", description: "Gemini-powered — high detail" },
];

const DEEPAI_MODEL_OVERRIDES = {
    "vexa": { label: "Vexa", provider: "vexa-ai", speed: 0, quality: 0 },
    "gemini-2.5-flash-lite": { label: "Gemini 2.5 Flash Lite", provider: "Google", speed: 180, quality: 72 },
    "gpt-4.1-nano": { label: "GPT-4.1 Nano", provider: "OpenAI", speed: 320, quality: 70 },
    "deepseek-v3.2": { label: "DeepSeek V3.2", provider: "DeepSeek", speed: 280, quality: 81 },
    "llama-3.3-70b": { label: "Llama 3.3 70B Instruct", provider: "Facebook (Meta)", speed: 250, quality: 78 },
    "llama-3.1-8b": { label: "Llama 3.1 8B Instant", provider: "Facebook (Meta)", speed: 400, quality: 65 },
    "llama-4-scout": { label: "Llama 4 Scout", provider: "Facebook (Meta)", speed: 300, quality: 76 },
    "qwen3-30b": { label: "Qwen3 30B", provider: "Alibaba", speed: 260, quality: 77 },
    "gpt-5-nano": { label: "GPT-5 Nano", provider: "OpenAI", speed: 350, quality: 74 },
    "gpt-oss-120b": { label: "GPT OSS 120B", provider: "OpenAI", speed: 200, quality: 80 },
};

const cache = { textModels: {}, deepaiModels: new Set(), default: DEFAULT_TEXT_MODEL, ts: 0 };

function unescapeHtml(str) {
    return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

function labelToKey(label) {
    return label
        .toLowerCase()
        .replace(/\binstruct\b/gi, "")
        .replace(/\binstant\b/gi, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/[^a-z0-9.-]/g, "")
        .replace(/-$/g, "");
}

async function scrapeDeepAIFreeModels() {
    try {
        const r = await fetch(DEEPAI_CHAT_URL, { headers: { "User-Agent": UA } });
        if (!r.ok) return new Set(Object.keys(DEEPAI_MODEL_OVERRIDES));
        const html = await r.text();

        const freeKeys = new Set(["vexa"]);

        const itemPattern = /<div[^>]*class="[^"]*chat-mode-menu-item(?!\s*chat-mode-locked)[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*chat-mode-menu-item|$)/gi;
        const lockedPattern = /chat-mode-locked/;
        const spanPattern = /<span[^>]*>([^<]+)<\/span>/;
        const lockPattern = /lock-icon/;

        const blocks = html.split(/<div[^>]*class="[^"]*chat-mode-menu-item/i).slice(1);
        for (const block of blocks) {
            if (lockedPattern.test(block) || lockPattern.test(block)) continue;
            const spanMatch = block.match(spanPattern);
            if (!spanMatch) continue;
            const label = unescapeHtml(spanMatch[1].trim());
            if (!label || label.length < 2) continue;

            const known = Object.entries(DEEPAI_MODEL_OVERRIDES).find(
                ([, v]) => v.label.toLowerCase() === label.toLowerCase()
            );
            if (known) {
                freeKeys.add(known[0]);
            } else {
                freeKeys.add(labelToKey(label));
            }
        }

        for (const key of Object.keys(DEEPAI_MODEL_OVERRIDES)) {
            freeKeys.add(key);
        }

        return freeKeys;
    } catch (_) {
        return new Set(Object.keys(DEEPAI_MODEL_OVERRIDES));
    }
}

function scrapeTextModels(html) {
    const selectMatch = html.match(/<select[^>]*\bname=["']?model["']?[^>]*>([\s\S]*?)(?:<\/select>|$)/i);
    if (!selectMatch) return {};
    const block = selectMatch[1];

    const valueToLabel = {};
    const keys = [];
    const seen = new Set();
    for (const m of block.matchAll(/<option[^>]*\bvalue=["']?([^"'\s>]+)[^>]*>\s*([^\n<]+)/gi)) {
        const val = unescapeHtml(m[1].trim());
        const label = unescapeHtml(m[2].trim());
        if (val && !seen.has(val)) { keys.push(val); seen.add(val); valueToLabel[val] = label; }
    }

    const providerMap = {};
    const segments = html.split(/(By\s+[^\n<]{2,60})/);
    let currentProvider = "";
    for (const seg of segments) {
        const by = seg.match(/^By\s+(.+)/);
        if (by) {
            currentProvider = by[1].replace(/[^\w\s()]/g, "").trim();
        } else {
            for (const m of seg.matchAll(/data-value=(?:["']?)([^"'>\s]+)/gi)) {
                if (!providerMap[m[1].trim()]) providerMap[m[1].trim()] = currentProvider;
            }
        }
    }

    const dvPositions = [...html.matchAll(/data-value=(?:["']?)([^"'>\s]+)/gi)].map(m => ({ start: m.index, val: m[1] }));
    const speedMap = {};
    const qualityMap = {};
    dvPositions.forEach(({ start, val }, i) => {
        const end = i + 1 < dvPositions.length ? dvPositions[i + 1].start : start + 2000;
        const window = html.slice(start, end);
        const spd = window.match(/(\d+)\s*W\/s/);
        const qlt = window.match(/quality-indicator[^>]*>(?:\s*<[^>]+>)*\s*(\d+)/);
        if (spd) speedMap[val] = parseInt(spd[1]);
        if (qlt) qualityMap[val] = parseInt(qlt[1]);
    });

    const toolbazModels = {};
    for (const val of keys) {
        if (val in DEEPAI_MODEL_OVERRIDES) continue;
        toolbazModels[val] = {
            label: valueToLabel[val] || val,
            provider: providerMap[val] || "",
            speed: speedMap[val] || 0,
            quality: qualityMap[val] || 0,
        };
    }
    return toolbazModels;
}

async function fetchToolbazModels() {
    try {
        const r = await fetch(TOOLBAZ_PAGE_URL, { headers: { "User-Agent": UA } });
        if (!r.ok) return {};
        const html = await r.text();
        return scrapeTextModels(html);
    } catch (_) { return {}; }
}

async function refresh() {
    const now = Date.now();
    if (cache.textModels && Object.keys(cache.textModels).length > 0 && now - cache.ts < CACHE_TTL) return cache;

    const [toolbazModels, deepaiKeys] = await Promise.all([
        fetchToolbazModels(),
        scrapeDeepAIFreeModels(),
    ]);

    const models = {};

    for (const key of deepaiKeys) {
        if (key in DEEPAI_MODEL_OVERRIDES) {
            models[key] = DEEPAI_MODEL_OVERRIDES[key];
        } else {
            models[key] = { label: key, provider: "DeepAI", speed: 0, quality: 0 };
        }
    }

    for (const [key, val] of Object.entries(toolbazModels)) {
        if (!(key in models)) {
            models[key] = val;
        }
    }

    for (const pm of POLLINATIONS_MODELS_LIST) {
        models[pm.key] = { label: pm.label, provider: pm.provider, speed: pm.speed, quality: pm.quality };
    }

    cache.textModels = models;
    cache.deepaiModels = deepaiKeys;
    cache.default = DEFAULT_TEXT_MODEL;
    cache.pollinationsModels = POLLINATIONS_MODELS_LIST.map(m => ({ key: m.key, label: m.label, provider: m.provider }));
    cache.ts = now;
    return cache;
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
    const c = await refresh();
    return Response.json({
        success: true,
        default: c.default,
        models: c.textModels,
        image_models: IMAGE_MODELS,
        pollinations_models: c.pollinationsModels,
    }, { status: 200, headers: corsHeaders() });
}

export { refresh as refreshModelsCache };