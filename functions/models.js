import { UA, TOOLBAZ_PAGE_URL, DEEPAI_CHAT_URL, DEEPAI_MODEL_OVERRIDES, IMAGE_MODELS, POLLINATIONS_TEXT_MODELS_LIST, MODELS_CACHE_TTL, DEFAULT_MODEL, unescapeHtml, labelToKey, corsHeaders } from "./core.js";

const cache = { textModels: {}, deepaiModels: new Set(), default: DEFAULT_MODEL, ts: 0 };

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
            if (known) {
                freeKeys.add(known[0]);
            } else {
                freeKeys.add(labelToKey(label));
            }
        }
        for (const key of Object.keys(DEEPAI_MODEL_OVERRIDES)) freeKeys.add(key);
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
        toolbazModels[val] = { label: valueToLabel[val] || val, provider: providerMap[val] || "", speed: speedMap[val] || 0, quality: qualityMap[val] || 0 };
    }
    return toolbazModels;
}

async function fetchToolbazModels() {
    try {
        const r = await fetch(TOOLBAZ_PAGE_URL, { headers: { "User-Agent": UA } });
        if (!r.ok) return {};
        return scrapeTextModels(await r.text());
    } catch (_) { return {}; }
}

async function refresh() {
    const now = Date.now();
    if (cache.textModels && Object.keys(cache.textModels).length > 0 && now - cache.ts < MODELS_CACHE_TTL) return cache;
    const [toolbazModels, deepaiKeys] = await Promise.all([fetchToolbazModels(), scrapeDeepAIFreeModels()]);
    const models = {};
    for (const key of deepaiKeys) {
        models[key] = key in DEEPAI_MODEL_OVERRIDES
            ? DEEPAI_MODEL_OVERRIDES[key]
            : { label: key, provider: "DeepAI", speed: 0, quality: 0 };
    }
    for (const [key, val] of Object.entries(toolbazModels)) {
        if (!(key in models)) models[key] = val;
    }
    for (const pm of POLLINATIONS_TEXT_MODELS_LIST) {
        models[pm.key] = { label: pm.label, provider: pm.provider, speed: pm.speed, quality: pm.quality };
    }
    cache.textModels = models;
    cache.deepaiModels = deepaiKeys;
    cache.default = DEFAULT_MODEL;
    cache.pollinationsModels = POLLINATIONS_TEXT_MODELS_LIST.map(m => ({ key: m.key, label: m.label, provider: m.provider }));
    cache.ts = now;
    return cache;
}

export async function onRequest({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders("GET, OPTIONS") });
    }
    if (request.method !== "GET") {
        return Response.json({ success: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders("GET, OPTIONS") });
    }
    const c = await refresh();
    return Response.json({
        success: true,
        default: c.default,
        models: c.textModels,
        image_models: IMAGE_MODELS,
        pollinations_models: c.pollinationsModels,
    }, { status: 200, headers: corsHeaders("GET, OPTIONS") });
}

export { refresh as refreshModelsCache };