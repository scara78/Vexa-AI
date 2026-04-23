import { UA, SECURITY_CONSTANTS, API_KEYS } from "../config.js";

export const proxyCache = new Map();

export async function getProxyUrl(id, env) {
    if (env?.PROXY_CACHE) {
        return await env.PROXY_CACHE.get(id);
    }
    return proxyCache.get(id);
}

export async function setProxyUrl(id, url, env) {
    if (env?.PROXY_CACHE) {
        await env.PROXY_CACHE.put(id, url, { expirationTtl: 86400 });
    } else {
        proxyCache.set(id, url);
    }
}

export function randomString(n) {
    const chars = SECURITY_CONSTANTS.RANDOM_STRING_CHARS;
    let s = "";
    for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

function md5(str) {
    function safeAdd(x, y) { const lsw = (x & 0xffff) + (y & 0xffff); return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff); }
    function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
    function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
    function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
    function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
    function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }
    const bytes = new TextEncoder().encode(str);
    const len = bytes.length;
    const words = new Int32Array((((len + 8) >> 6) + 1) * 16);
    for (let i = 0; i < len; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
    words[len >> 2] |= 0x80 << ((len % 4) * 8);
    words[words.length - 2] = len * 8;
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < words.length; i += 16) {
        const [oa, ob, oc, od] = [a, b, c, d];
        a = md5ff(a, b, c, d, words[i + 0], 7, -680876936); d = md5ff(d, a, b, c, words[i + 1], 12, -389564586); c = md5ff(c, d, a, b, words[i + 2], 17, 606105819); b = md5ff(b, c, d, a, words[i + 3], 22, -1044525330);
        a = md5ff(a, b, c, d, words[i + 4], 7, -176418897); d = md5ff(d, a, b, c, words[i + 5], 12, 1200080426); c = md5ff(c, d, a, b, words[i + 6], 17, -1473231341); b = md5ff(b, c, d, a, words[i + 7], 22, -45705983);
        a = md5ff(a, b, c, d, words[i + 8], 7, 1770035416); d = md5ff(d, a, b, c, words[i + 9], 12, -1958414417); c = md5ff(c, d, a, b, words[i + 10], 17, -42063); b = md5ff(b, c, d, a, words[i + 11], 22, -1990404162);
        a = md5ff(a, b, c, d, words[i + 12], 7, 1804603682); d = md5ff(d, a, b, c, words[i + 13], 12, -40341101); c = md5ff(c, d, a, b, words[i + 14], 17, -1502002290); b = md5ff(b, c, d, a, words[i + 15], 22, 1236535329);
        a = md5gg(a, b, c, d, words[i + 1], 5, -165796510); d = md5gg(d, a, b, c, words[i + 6], 9, -1069501632); c = md5gg(c, d, a, b, words[i + 11], 14, 643717713); b = md5gg(b, c, d, a, words[i + 0], 20, -373897302);
        a = md5gg(a, b, c, d, words[i + 5], 5, -701558691); d = md5gg(d, a, b, c, words[i + 10], 9, 38016083); c = md5gg(c, d, a, b, words[i + 15], 14, -660478335); b = md5gg(b, c, d, a, words[i + 4], 20, -405537848);
        a = md5gg(a, b, c, d, words[i + 9], 5, 568446438); d = md5gg(d, a, b, c, words[i + 14], 9, -1019803690); c = md5gg(c, d, a, b, words[i + 3], 14, -187363961); b = md5gg(b, c, d, a, words[i + 8], 20, 1163531501);
        a = md5gg(a, b, c, d, words[i + 13], 5, -1444681467); d = md5gg(d, a, b, c, words[i + 2], 9, -51403784); c = md5gg(c, d, a, b, words[i + 7], 14, 1735328473); b = md5gg(b, c, d, a, words[i + 12], 20, -1926607734);
        a = md5hh(a, b, c, d, words[i + 5], 4, -378558); d = md5hh(d, a, b, c, words[i + 8], 11, -2022574463); c = md5hh(c, d, a, b, words[i + 11], 16, 1839030562); b = md5hh(b, c, d, a, words[i + 14], 23, -35309556);
        a = md5hh(a, b, c, d, words[i + 1], 4, -1530992060); d = md5hh(d, a, b, c, words[i + 4], 11, 1272893353); c = md5hh(c, d, a, b, words[i + 7], 16, -155497632); b = md5hh(b, c, d, a, words[i + 10], 23, -1094730640);
        a = md5hh(a, b, c, d, words[i + 13], 4, 681279174); d = md5hh(d, a, b, c, words[i + 0], 11, -358537222); c = md5hh(c, d, a, b, words[i + 3], 16, -722521979); b = md5hh(b, c, d, a, words[i + 6], 23, 76029189);
        a = md5hh(a, b, c, d, words[i + 9], 4, -640364487); d = md5hh(d, a, b, c, words[i + 12], 11, -421815835); c = md5hh(c, d, a, b, words[i + 15], 16, 530742520); b = md5hh(b, c, d, a, words[i + 2], 23, -995338651);
        a = md5ii(a, b, c, d, words[i + 0], 6, -198630844); d = md5ii(d, a, b, c, words[i + 7], 10, 1126891415); c = md5ii(c, d, a, b, words[i + 14], 15, -1416354905); b = md5ii(b, c, d, a, words[i + 5], 21, -57434055);
        a = md5ii(a, b, c, d, words[i + 12], 6, 1700485571); d = md5ii(d, a, b, c, words[i + 3], 10, -1894986606); c = md5ii(c, d, a, b, words[i + 10], 15, -1051523); b = md5ii(b, c, d, a, words[i + 1], 21, -2054922799);
        a = md5ii(a, b, c, d, words[i + 8], 6, 1873313359); d = md5ii(d, a, b, c, words[i + 15], 10, -30611744); c = md5ii(c, d, a, b, words[i + 6], 15, -1560198380); b = md5ii(b, c, d, a, words[i + 13], 21, 1309151649);
        a = md5ii(a, b, c, d, words[i + 4], 6, -145523070); d = md5ii(d, a, b, c, words[i + 11], 10, -1120210379); c = md5ii(c, d, a, b, words[i + 2], 15, 718787259); b = md5ii(b, c, d, a, words[i + 9], 21, -343485551);
        a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
    }
    return [a, b, c, d].map(n => Array.from({ length: 4 }, (_, i) => ((n >> (i * 8)) & 0xff).toString(16).padStart(2, "0")).join("")).join("");
}

export async function reversedMd5(str) {
    return md5(str).split("").reverse().join("");
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

export async function generateImageKey() {
    const rnd = String(Math.round(Math.random() * 100000000000));
    const h1 = await reversedMd5(UA + rnd + SECURITY_CONSTANTS.HACKER_SECRET);
    const h2 = await reversedMd5(UA + h1);
    const h3 = await reversedMd5(UA + h2);
    return `tryit-${rnd}-${h3}`;
}

export async function makeProxyId(url, env) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
    const id = btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "")
        .slice(0, 32);
    await setProxyUrl(id, url, env);
    return id;
}

export function buildDeepAIImageBody(prompt, modelVer, prefKey) {
    const boundary = API_KEYS.DEEPAI_IMAGE_BOUNDARY;
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