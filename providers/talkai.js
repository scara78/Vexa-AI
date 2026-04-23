import { UA, API_URLS, MODEL_MAPPINGS, TEMPERATURE_SETTINGS, PROVIDER_SETTINGS } from "../config.js";
import { cleanText } from "../lib/utils.js";
import { registerProvider } from "../lib/models.js";

const { TALKAI_URL } = API_URLS;
const { TALKAI_MODEL_IDS } = MODEL_MAPPINGS;

const TALKAI_PAGE_URL = "https://talkai.info/chat/";

const ICON_PROVIDER_MAP = {
    "openai_icon.png": "OpenAI",
    "claude_icon.png": "Anthropic",
    "gemini_icon.png": "Google",
    "deepseek_icon.png": "DeepSeek",
};

async function scrapeModels() {
    try {
        const pageR = await fetch(TALKAI_PAGE_URL, { headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" } });
        if (!pageR.ok) return {};
        const html = await pageR.text();

        const scriptMatch = html.match(/src="(\/assets\/[^"]+\/js\/index\.js)"/);
        if (!scriptMatch) return {};

        const jsUrl = "https://talkai.info" + scriptMatch[1];
        const jsR = await fetch(jsUrl, { headers: { "User-Agent": UA } });
        if (!jsR.ok) return {};
        const js = await jsR.text();

        const result = {};
        const itemPattern = /\{title:"([^"]+)",value:"([^"]+)",type:"chat",category:"([^"]+)"[^}]*icon:"([^"]+)"[^}]*\}/g;

        for (const match of js.matchAll(itemPattern)) {
            const [, title, value, category, icon] = match;
            if (category !== "fast") continue;
            const provider = ICON_PROVIDER_MAP[icon] || "TalkAI";
            result[value] = { label: title, provider: "TalkAI", description: `${provider} - ${title}`, speed: 0, quality: 0 };
        }

        return result;
    } catch (_) { return {}; }
}

export async function talkaiComplete(prompt, model) {
    let fullText = "";
    await talkaiCompleteStream(prompt, model, (chunk) => {
        fullText += chunk;
    });
    return fullText
        .replace(/An internal server error occurred\.?/gi, "")
        .replace(/  \\n/g, "\n")
        .replace(/\\n/g, "\n")
        .split("\n")
        .map(line => line
            .replace(/ ([.,!?;:'])/g, "$1")
            .trim()
        )
        .join("\n")
        .trim();
}

export async function talkaiCompleteStream(prompt, model, onChunk) {
    const modelId = TALKAI_MODEL_IDS[model] || model;
    const messages = [{ id: "0", from: "you", content: prompt, model: "" }];
    const payload = { type: "chat", messagesHistory: messages, settings: { model: modelId, temperature: TEMPERATURE_SETTINGS.DEFAULT } };
    const r = await fetch(TALKAI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": UA, "Referer": "https://talkai.info/", "Origin": "https://talkai.info" },
        body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`TalkAI error ${r.status}`);
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let skipNext = false;
    const tokens = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
            if (line.startsWith("event:")) { skipNext = true; continue; }
            if (!line.startsWith("data:")) continue;
            if (skipNext) { skipNext = false; continue; }
            const data = line.slice(5);
            if (!data.trim() || data.trim() === "[DONE]") continue;
            tokens.push(data);
        }
    }
    if (buf.startsWith("data:") && !skipNext) {
        const data = buf.slice(5);
        if (data.trim() && data.trim() !== "[DONE]") tokens.push(data);
    }

    let text = "";
    for (const tok of tokens) {
        if (tok.startsWith("   \\n")) { text += "\n"; continue; }
        if (tok.startsWith("  ")) { text += " " + tok.trimStart(); continue; }
        text += tok.trimStart();
    }

    text = text
        .replace(/An internal server error occurred\.?/gi, "")
        .split("\n")
        .map(line => line
            .replace(/ ([.,!?;:'])/g, "$1")
            .replace(/([a-zA-Z]) ('s)/g, "$1$2")
            .trim()
        )
        .join("\n")
        .trim();
    onChunk(text);
}

const talkaiProvider = {
    id: "talkai",
    source: "talkai.info",
    enabled: () => PROVIDER_SETTINGS.talkai,
    scrapeModels,
    complete: talkaiComplete,
    completeStream: talkaiCompleteStream,
};

registerProvider(talkaiProvider);

export default talkaiProvider;