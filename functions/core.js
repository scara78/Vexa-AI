export const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
export const TOOLBAZ_PAGE_URL = "https://toolbaz.com/writer/chat-gpt-alternative";
export const TOKEN_URL = "https://data.toolbaz.com/token.php";
export const WRITE_URL = "https://data.toolbaz.com/writing.php";
export const DEEPAI_API = "https://api.deepai.org";
export const DEEPAI_CHAT_URL = "https://deepai.org/chat";
export const DEEPAI_IMAGE_URL = "https://api.deepai.org/api/text2img";
export const POLLINATIONS_URL = "https://text.pollinations.ai/openai";
export const POLLINATIONS_IMAGE_URL = "https://image.pollinations.ai/prompt/";
export const DOLPHIN_URL = "https://chat.dphn.ai/api/chat";
export const TALKAI_URL = "https://talkai.info/chat/send/";
export const AIFREE_NONCE_URL = "https://aifreeforever.com/api/chat-nonce";
export const AIFREE_ANSWER_URL = "https://aifreeforever.com/api/generate-ai-answer";

export const POLLINATIONS_MODELS = new Set(["pol-openai-fast"]);
export const DOLPHIN_MODELS = new Set(["dolphin-logical", "dolphin-creative", "dolphin-summarize", "dolphin-code-beginner", "dolphin-code-advanced"]);
export const DOLPHIN_TEMPLATE_MAP = { "dolphin-logical": "logical", "dolphin-creative": "creative", "dolphin-summarize": "summarize", "dolphin-code-beginner": "code_beginner", "dolphin-code-advanced": "code_advanced" };
export const DEEPAI_MODELS = new Set(["vexa", "gemini-2.5-flash-lite", "gpt-4.1-nano", "deepseek-v3.2", "llama-3.3-70b", "llama-3.1-8b", "llama-4-scout", "qwen3-30b", "gpt-5-nano", "gpt-oss-120b", "dolphin-logical", "dolphin-creative", "dolphin-summarize", "dolphin-code-beginner", "dolphin-code-advanced", "claude-3-haiku", "gemini-2.0-flash-lite", "deepseek-chat"]);
export const TALKAI_MODELS = new Set(["claude-3-haiku", "gemini-2.0-flash-lite", "deepseek-chat", "gpt-4.1-nano"]);
export const TALKAI_MODEL_IDS = { "claude-3-haiku": "claude-3-haiku-20240307", "gemini-2.0-flash-lite": "gemini-2.0-flash-lite", "deepseek-chat": "deepseek-chat", "gpt-4.1-nano": "gpt-4.1-nano" };

export const DEEPAI_MODEL_OVERRIDES = {
    "vexa": { label: "Vexa", provider: "vexa-ai", speed: 0, quality: 0 },
    "dolphin-logical": { label: "Dolphin 24B (Logical)", provider: "Dolphin AI", speed: 300, quality: 78 },
    "dolphin-creative": { label: "Dolphin 24B (Creative)", provider: "Dolphin AI", speed: 300, quality: 76 },
    "dolphin-summarize": { label: "Dolphin 24B (Summarize)", provider: "Dolphin AI", speed: 300, quality: 75 },
    "dolphin-code-beginner": { label: "Dolphin 24B (Code Beginner)", provider: "Dolphin AI", speed: 300, quality: 74 },
    "dolphin-code-advanced": { label: "Dolphin 24B (Code Advanced)", provider: "Dolphin AI", speed: 280, quality: 79 },
    "gemini-2.5-flash-lite": { label: "Gemini 2.5 Flash Lite", provider: "Google", speed: 180, quality: 72 },
    "gpt-4.1-nano": { label: "GPT-4.1 Nano", provider: "OpenAI", speed: 320, quality: 70 },
    "deepseek-v3.2": { label: "DeepSeek V3.2", provider: "DeepSeek", speed: 280, quality: 81 },
    "llama-3.3-70b": { label: "Llama 3.3 70B Instruct", provider: "Facebook (Meta)", speed: 250, quality: 78 },
    "llama-3.1-8b": { label: "Llama 3.1 8B Instant", provider: "Facebook (Meta)", speed: 400, quality: 65 },
    "llama-4-scout": { label: "Llama 4 Scout", provider: "Facebook (Meta)", speed: 300, quality: 76 },
    "qwen3-30b": { label: "Qwen3 30B", provider: "Alibaba", speed: 260, quality: 77 },
    "gpt-5-nano": { label: "GPT-5 Nano", provider: "OpenAI", speed: 350, quality: 74 },
    "gpt-oss-120b": { label: "GPT OSS 120B", provider: "OpenAI", speed: 200, quality: 80 },
    "claude-3-haiku": { label: "Claude 3 Haiku", provider: "Anthropic", speed: 310, quality: 74 },
    "gemini-2.0-flash-lite": { label: "Gemini 2.0 Flash-Lite", provider: "Google", speed: 340, quality: 71 },
    "deepseek-chat": { label: "DeepSeek V3", provider: "DeepSeek", speed: 280, quality: 80 },
};

export const IMAGE_MODELS = [
    { name: "hd", label: "HD", description: "Standard HD generation — DeepAI" },
    { name: "flux", label: "Flux", description: "Fast, high quality — default" },
    { name: "turbo", label: "Flux Turbo", description: "Fastest generation" },
    { name: "kontext", label: "Flux Kontext", description: "Instruction-following edits" },
    { name: "seedream", label: "Seedream 3", description: "ByteDance — photorealistic" },
    { name: "nanobanana", label: "Nano Banana", description: "Gemini-powered — high detail" },
];

export const DEEPAI_IMAGE_MODELS = new Set(["hd"]);
export const POLLINATIONS_IMAGE_MODELS = new Set(["flux", "turbo-img", "kontext", "seedream", "nanobanana"]);
export const IMAGE_PREFERENCES = { speed: "turbo", quality: "quality" };
export const DEFAULT_IMAGE_MODEL = "hd";
export const DEFAULT_IMAGE_PREFERENCE = "speed";

export const POLLINATIONS_TEXT_MODELS_LIST = [
    { key: "pol-openai-fast", label: "Pollinations GPT-OSS", provider: "Pollinations.ai", speed: 280, quality: 72 },
];

export const DEFAULT_MODEL = "vexa";
export const MODELS_CACHE_TTL = 300000;
export const HEALTH_PROBE = "Hi";

export const POST_HDRS = {
    "User-Agent": UA,
    "Referer": TOOLBAZ_PAGE_URL,
    "Origin": "https://toolbaz.com",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Accept-Language": "en-US,en;q=0.9",
};

export const proxyCache = new Map();

export function randomString(n) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

export function makeClientToken() {
    const obj = {
        bR6wF: { nV5kP: UA, lQ9jX: "en-US", sD2zR: "1920x1080", tY4hL: "America/New_York", pL8mC: "Win32", cQ3vD: 24, hK7jN: 8 },
        uT4bX: { mM9wZ: [], kP8jY: [] },
        tuTcS: Math.floor(Date.now() / 1000),
        tDfxy: null,
        RtyJt: randomString(36),
    };
    return randomString(6) + btoa(JSON.stringify(obj));
}

export function generateTryitKey() {
    const r = String(Math.round(Math.random() * 100_000_000_000));
    const s = "hackers_become_a_little_stinkier_every_time_they_hack";
    function md5(str) {
        function safeAdd(x, y) { const lsw = (x & 0xffff) + (y & 0xffff); return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff); }
        function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
        function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
        function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
        function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
        function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
        function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }
        const bytes = new TextEncoder().encode(str);
        const len8 = bytes.length;
        const len32 = len8 >> 2;
        const tail = len8 & 3;
        let words = new Int32Array(((len8 + 72) >> 6 << 4) + 16);
        for (let i = 0; i < len32; i++) words[i] = bytes[i * 4] | (bytes[i * 4 + 1] << 8) | (bytes[i * 4 + 2] << 16) | (bytes[i * 4 + 3] << 24);
        let remaining = 0;
        for (let i = 0; i < tail; i++) remaining |= bytes[len32 * 4 + i] << (i * 8);
        words[len32] = remaining | (0x80 << (tail * 8));
        words[words.length - 2] = len8 * 8;
        let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
        for (let i = 0; i < words.length; i += 16) {
            const [oa, ob, oc, od] = [a, b, c, d];
            a = md5ff(a, b, c, d, words[i], 7, -680876936); d = md5ff(d, a, b, c, words[i + 1], 12, -389564586); c = md5ff(c, d, a, b, words[i + 2], 17, 606105819); b = md5ff(b, c, d, a, words[i + 3], 22, -1044525330);
            a = md5ff(a, b, c, d, words[i + 4], 7, -176418897); d = md5ff(d, a, b, c, words[i + 5], 12, 1200080426); c = md5ff(c, d, a, b, words[i + 6], 17, -1473231341); b = md5ff(b, c, d, a, words[i + 7], 22, -45705983);
            a = md5ff(a, b, c, d, words[i + 8], 7, 1770035416); d = md5ff(d, a, b, c, words[i + 9], 12, -1958414417); c = md5ff(c, d, a, b, words[i + 10], 17, -42063); b = md5ff(b, c, d, a, words[i + 11], 22, -1990404162);
            a = md5ff(a, b, c, d, words[i + 12], 7, 1804603682); d = md5ff(d, a, b, c, words[i + 13], 12, -40341101); c = md5ff(c, d, a, b, words[i + 14], 17, -1502002290); b = md5ff(b, c, d, a, words[i + 15], 22, 1236535329);
            a = md5gg(a, b, c, d, words[i + 1], 5, -165796510); d = md5gg(d, a, b, c, words[i + 6], 9, -1069501632); c = md5gg(c, d, a, b, words[i + 11], 14, 643717713); b = md5gg(b, c, d, a, words[i], 20, -373897302);
            a = md5gg(a, b, c, d, words[i + 5], 5, -701558691); d = md5gg(d, a, b, c, words[i + 10], 9, 38016083); c = md5gg(c, d, a, b, words[i + 15], 14, -660478335); b = md5gg(b, c, d, a, words[i + 4], 20, -405537848);
            a = md5gg(a, b, c, d, words[i + 9], 5, 568446438); d = md5gg(d, a, b, c, words[i + 14], 9, -1019803690); c = md5gg(c, d, a, b, words[i + 3], 14, -187363961); b = md5gg(b, c, d, a, words[i + 8], 20, 1163531501);
            a = md5gg(a, b, c, d, words[i + 13], 5, -1444681467); d = md5gg(d, a, b, c, words[i + 2], 9, -51403784); c = md5gg(c, d, a, b, words[i + 7], 14, 1735328473); b = md5gg(b, c, d, a, words[i + 12], 20, -1926607734);
            a = md5hh(a, b, c, d, words[i + 5], 4, -378558); d = md5hh(d, a, b, c, words[i + 8], 11, -2022574463); c = md5hh(c, d, a, b, words[i + 11], 16, 1839030562); b = md5hh(b, c, d, a, words[i + 14], 23, -35309556);
            a = md5hh(a, b, c, d, words[i + 1], 4, -1530992060); d = md5hh(d, a, b, c, words[i + 4], 11, 1272893353); c = md5hh(c, d, a, b, words[i + 7], 16, -155497632); b = md5hh(b, c, d, a, words[i + 10], 23, -1094730640);
            a = md5hh(a, b, c, d, words[i + 13], 4, 681279174); d = md5hh(d, a, b, c, words[i], 11, -358537222); c = md5hh(c, d, a, b, words[i + 3], 16, -722521979); b = md5hh(b, c, d, a, words[i + 6], 23, 76029189);
            a = md5hh(a, b, c, d, words[i + 9], 4, -640364487); d = md5hh(d, a, b, c, words[i + 12], 11, -421815835); c = md5hh(c, d, a, b, words[i + 15], 16, 530742520); b = md5hh(b, c, d, a, words[i + 2], 23, -995338651);
            a = md5ii(a, b, c, d, words[i], 6, -198630844); d = md5ii(d, a, b, c, words[i + 7], 10, 1126891415); c = md5ii(c, d, a, b, words[i + 14], 15, -1416354905); b = md5ii(b, c, d, a, words[i + 5], 21, -57434055);
            a = md5ii(a, b, c, d, words[i + 12], 6, 1700485571); d = md5ii(d, a, b, c, words[i + 3], 10, -1894986606); c = md5ii(c, d, a, b, words[i + 10], 15, -1051523); b = md5ii(b, c, d, a, words[i + 1], 21, -2054922799);
            a = md5ii(a, b, c, d, words[i + 8], 6, 1873313359); d = md5ii(d, a, b, c, words[i + 15], 10, -30611744); c = md5ii(c, d, a, b, words[i + 6], 15, -1560198380); b = md5ii(b, c, d, a, words[i + 13], 21, 1309151649);
            a = md5ii(a, b, c, d, words[i + 4], 6, -145523070); d = md5ii(d, a, b, c, words[i + 11], 10, -1120210379); c = md5ii(c, d, a, b, words[i + 2], 15, 718787259); b = md5ii(b, c, d, a, words[i + 9], 21, -343485551);
            a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
        }
        return [a, b, c, d].map(n => (n < 0 ? n + 4294967296 : n).toString(16).padStart(8, '0').match(/../g).reverse().join('')).join('');
    }
    const h1 = md5(UA + r + s);
    const h2 = md5(UA + h1);
    const h3 = md5(UA + h2);
    return `tryit-${r}-${h3}`;
}

export async function md5Hex(str) {
    const encoded = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("MD5", encoded);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function reversedMd5(str) {
    return (await md5Hex(str)).split("").reverse().join("");
}

export async function makeProxyId(url) {
    const id = (await reversedMd5(url + String(Date.now()))).slice(0, 24);
    proxyCache.set(id, url);
    return id;
}

export async function generateImageKey() {
    const rnd = String(Math.round(Math.random() * 100000000000));
    const h1 = await reversedMd5(UA + rnd + "hackers_become_a_little_stinkier_every_time_they_hack");
    const h2 = await reversedMd5(UA + h1);
    const h3 = await reversedMd5(UA + h2);
    return `tryit-${rnd}-${h3}`;
}

export function buildDeepAIImageBody(prompt, modelVer, prefKey) {
    const boundary = "----DeepAIBound7MA4YWxkTrZu0gW";
    const fields = { text: prompt, image_generator_version: modelVer, generation_source: "img" };
    if (prefKey === "turbo") fields.turbo = "true";
    else fields.quality = "true";
    let body = "";
    for (const [name, val] of Object.entries(fields)) {
        body += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`;
    }
    body += `--${boundary}--\r\n`;
    return { boundary, body: new TextEncoder().encode(body) };
}

export async function callDeepAIImage(prompt, modelVer, prefKey) {
    const { boundary, body } = buildDeepAIImageBody(prompt, modelVer, prefKey);
    const key = await generateImageKey();
    const res = await fetch(DEEPAI_IMAGE_URL, {
        method: "POST",
        headers: {
            "api-key": key,
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            "User-Agent": UA,
            "Origin": "https://deepai.org",
            "Referer": "https://deepai.org/machine-learning-model/text2img",
        },
        body,
    });
    const data = await res.json();
    if (!data.output_url) {
        throw new Error(data.err || data.status || data.error || JSON.stringify(data));
    }
    return data.output_url;
}

export async function callPollinationsImage(prompt, model) {
    const polModel = model === "turbo-img" ? "turbo" : model;
    const seed = Math.floor(Math.random() * 999999);
    const url = `${POLLINATIONS_IMAGE_URL}${encodeURIComponent(prompt)}?model=${polModel}&width=1024&height=1024&nologo=true&private=true&seed=${seed}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`Pollinations error ${res.status}`);
    return url;
}

export function unescapeHtml(str) {
    return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

export function labelToKey(label) {
    return label
        .toLowerCase()
        .replace(/\binstruct\b/gi, "")
        .replace(/\binstant\b/gi, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/[^a-z0-9.-]/g, "")
        .replace(/-$/g, "");
}

export function parseChunk(chunk) {
    chunk = chunk.trim();
    if (!chunk || chunk === "[DONE]") return "";
    try { return JSON.parse(chunk).choices[0].delta?.content || ""; }
    catch (_) { return chunk; }
}

export function parseFull(raw) {
    raw = raw.replace(/\[model:[^\]]*\]/g, "").trim();
    if (raw.trimStart().startsWith("data:")) {
        const parts = raw.split("\n").filter(l => l.startsWith("data:")).map(l => parseChunk(l.slice(5)));
        const text = parts.join("").trim();
        if (text) return text;
    }
    try {
        const obj = JSON.parse(raw);
        if (typeof obj === "object" && obj) {
            for (const k of ["result", "text", "content", "output", "message", "response", "data"]) {
                if (obj[k]) return String(obj[k]).trim();
            }
        }
    } catch (_) { }
    return raw.replace(/<[^>]+>/g, "").trim();
}

export function messagesToPrompt(messages) {
    const systemMsg = messages.find(m => m.role === "system")?.content || "";
    const rest = messages.filter(m => m.role !== "system");
    const parts = rest.map((m, i) => {
        const role = m.role || "user";
        const content = (m.content || "").trim();
        const prefix = i === 0 && systemMsg ? `${systemMsg}\n\n` : "";
        if (role === "assistant") return `Assistant: ${content}`;
        return `User: ${prefix}${content}`;
    });
    parts.push("Assistant:");
    return parts.join("\n\n");
}

export function corsHeaders(methods = "GET, POST, OPTIONS") {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": methods,
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    };
}

export function corsHeadersStream() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    };
}

export async function getAiFreeNonce() {
    const r = await fetch(AIFREE_NONCE_URL, {
        method: "GET",
        headers: { "Referer": "https://aifreeforever.com/", "Origin": "https://aifreeforever.com", "User-Agent": UA },
    });
    if (!r.ok) throw new Error(`Nonce fetch failed: ${r.status}`);
    const j = await r.json();
    return j.nonce || j.data?.nonce || Object.values(j)[0];
}

export async function aiFreeComplete(prompt, messages, model) {
    const nonce = await getAiFreeNonce();
    const history = messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
    const body = {
        question: prompt,
        tone: "friendly",
        format: "paragraph",
        file: null,
        conversationHistory: history,
        aiName: "",
        aiRole: "assistant",
        interactionProof: {
            nonce,
            keystrokeCount: Math.floor(prompt.length * 0.8 + Math.random() * 5),
            typingDuration: Math.floor(prompt.length * 120 + Math.random() * 1000),
            mouseMovements: Math.floor(Math.random() * 20 + 5),
        },
        model,
    };
    const r = await fetch(AIFREE_ANSWER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Referer": "https://aifreeforever.com/", "Origin": "https://aifreeforever.com", "User-Agent": UA },
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`AIFree error ${r.status}`);
    const j = await r.json();
    return j.answer || j.response || j.data?.answer || j.data?.response || JSON.stringify(j);
}

function cleanText(text) {
  return text
    .replace(/^(Claude 3 Haiku|GPT 4\.1 nano|Gemini 2\.0 Flash-Lite|DeepSeek-V3)\s*/i, "")

    .replace(/^"\s*/, "")
    .replace(/\s*"$/, "")

    .replace(/-1\b/g, "")

    .replace(/([a-z])([A-Z])/g, "$1 $2")

    .replace(/\s*([,.!?])\s*/g, "$1 ")

    .replace(/\s+/g, " ")

    .trim();
}

export async function vexaComplete(prompt, messages, model = "standard") {
    const apiKey = generateTryitKey();
    const sessionUuid = crypto.randomUUID ? crypto.randomUUID() : randomString(36);
    const chatHistory = JSON.stringify(
        messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))
    );
    const formData = new URLSearchParams({
        chat_style: "chat",
        chatHistory,
        model,
        session_uuid: sessionUuid,
        hacker_is_stinky: "very_stinky",
        enabled_tools: JSON.stringify(["image_generator", "image_editor"]),
    });
    const resp = await fetch(`${DEEPAI_API}/hacking_is_a_serious_crime`, {
        method: "POST",
        headers: {
            "api-key": apiKey,
            "User-Agent": UA,
            "Referer": "https://deepai.org/",
            "Origin": "https://deepai.org",
            "Accept": "text/plain, */*",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
    });
    if (!resp.ok) throw new Error(`DeepAI error ${resp.status}`);
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk.includes("\u001c")) { full += chunk.split("\u001c")[0]; break; }
        full += chunk;
    }
    return full.trim();
}

export async function pollinationsComplete(messages, model) {
    const polModel = model.replace(/^pol-/, "");
    const r = await fetch(POLLINATIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": UA },
        body: JSON.stringify({ model: polModel, messages, temperature: 0.7, stream: false, private: true }),
    });
    if (!r.ok) throw new Error(`Pollinations error ${r.status}`);
    const j = await r.json();
    return (j.choices?.[0]?.message?.content || "").trim();
}

export async function dolphinComplete(prompt, model) {
    const template = DOLPHIN_TEMPLATE_MAP[model] || "logical";
    const r = await fetch(DOLPHIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": UA, "Referer": "https://chat.dphn.ai/", "Origin": "https://chat.dphn.ai" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "dolphinserver:24B", template }),
    });
    if (!r.ok) throw new Error(`Dolphin error ${r.status}`);
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buf = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
            const t = line.trim();
            if (!t || t === "data: [DONE]") continue;
            if (t.startsWith("data: ")) {
                try { const obj = JSON.parse(t.slice(6)); const c = obj.choices?.[0]?.delta?.content; if (c) full += c; } catch (_) { }
            }
        }
    }
    if (buf.trim().startsWith("data: ")) {
        try { const obj = JSON.parse(buf.trim().slice(6)); const c = obj.choices?.[0]?.delta?.content; if (c) full += c; } catch (_) { }
    }
    return full.trim();
}

export async function talkaiComplete(prompt, model) {
    const modelId = TALKAI_MODEL_IDS[model] || model;

    const messages = [
        { id: "0", from: "you", content: prompt, model: "" }
    ];

    const payload = {
        type: "chat",
        messagesHistory: messages,
        settings: { model: modelId, temperature: 0.7 }
    };

    const r = await fetch(TALKAI_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": UA,
            "Referer": "https://talkai.info/",
            "Origin": "https://talkai.info"
        },
        body: JSON.stringify(payload),
    });

    if (!r.ok) throw new Error(`TalkAI error ${r.status}`);

    const reader = r.body.getReader();
    const decoder = new TextDecoder();

    let full = "";
    let buf = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();

        for (const line of lines) {
            if (!line.startsWith("data:")) continue;

            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;

            full += data + " ";
        }
    }

    if (buf.trim().startsWith("data:")) {
        const data = buf.trim().slice(5).trim();
        if (data && data !== "[DONE]") full += data + " ";
    }

    return cleanText(full.trim());
}

export function resolveSource(model) {
    if (TALKAI_MODELS.has(model)) return "talkai.info";
    if (DOLPHIN_MODELS.has(model)) return "dphn.ai";
    if (POLLINATIONS_MODELS.has(model)) return "pollinations.ai";
    if (DEEPAI_MODELS.has(model) || model === "vexa") return "deepai.org";
    if (model === "gpt-5") return "aifreeforever.com";
    return "toolbaz.com";
}
