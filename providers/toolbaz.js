import { UA, API_URLS, REQUEST_HEADERS, PROVIDER_SETTINGS } from "../config.js";
import { makeClientToken, randomString } from "../lib/crypto.js";
import { parseFull, unescapeHtml } from "../lib/utils.js";
import { registerProvider } from "../lib/models.js";

const { TOKEN_URL, WRITE_URL, TOOLBAZ_PAGE_URL } = API_URLS;
const POST_HDRS = REQUEST_HEADERS.POST_HDRS;

async function getToken(sessionId) {
    const token = makeClientToken();
    const body = new URLSearchParams({ session_id: sessionId, token });
    const r = await fetch(TOKEN_URL, { method: "POST", headers: POST_HDRS, body: body.toString() });
    if (!r.ok) throw new Error(`Token fetch failed: ${r.status}`);
    const j = await r.json();
    if (!j.token) throw new Error(`No token returned: ${JSON.stringify(j)}`);
    return j.token;
}

export async function toolbazComplete(prompt, model) {
    let fullText = "";
    await toolbazCompleteStream(prompt, model, (chunk) => { fullText += chunk; });
    return parseFull(fullText);
}

export async function toolbazCompleteStream(prompt, model, onChunk) {
    const sessionId = randomString(36);
    const token = await getToken(sessionId);
    const body = new URLSearchParams({ text: prompt, model, capcha: token, session_id: sessionId });
    const r = await fetch(WRITE_URL, { method: "POST", headers: POST_HDRS, body: body.toString() });
    if (!r.ok) throw new Error(`Toolbaz error ${r.status}`);
    const text = await r.text();
    const parsed = parseFull(text);
    for (const char of parsed) {
        onChunk(char);
        await new Promise(r => setTimeout(r, 5));
    }
}

async function scrapeModels() {
    try {
        const r = await fetch(TOOLBAZ_PAGE_URL, { headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" } });
        if (!r.ok) return {};
        const html = await r.text();

        const result = {};
        const seen = new Set();

        const dropdownMatch = html.match(/<div[^>]*\bclass=["'][^"']*model-dropdown-menu[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
        if (dropdownMatch) {
            const dropdownContent = dropdownMatch[1];

            const optionPattern = /<div[^>]*\bclass=["'][^"']*model-option[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
            for (const match of dropdownContent.matchAll(optionPattern)) {
                const optionContent = match[1];

                const valueMatch = optionContent.match(/data-value=["']([^"']+)["']/) ||
                    optionContent.match(/data-value=([^>\s]+)/);
                if (!valueMatch) continue;

                const modelKey = unescapeHtml(valueMatch[1].trim());
                if (seen.has(modelKey)) continue;
                seen.add(modelKey);

                const nameMatch = optionContent.match(/data-name=["']([^"']+)["']/) ||
                    optionContent.match(/data-name=([^>\s]+)/);
                const label = nameMatch ? unescapeHtml(nameMatch[1].trim()) : modelKey;

                let description = "";
                const descMatch = optionContent.match(/data-description=["']([^"']+)["']/) ||
                    optionContent.match(/data-description=([^>\s]+)/);
                if (descMatch) {
                    description = unescapeHtml(descMatch[1].trim().replace(/"/g, ''));
                } else {
                    const descDivMatch = optionContent.match(/<div[^>]*\bclass=["'][^"']*model-description[^"']*["'][^>]*>([^<]+)</);
                    if (descDivMatch) {
                        description = unescapeHtml(descDivMatch[1].trim());
                    }
                }

                let speed = 0;
                let quality = 0;

                const speedMatch = optionContent.match(/(\d+)\s*W\/s/);
                if (speedMatch) {
                    speed = parseInt(speedMatch[1]);
                }

                const qualityMatch = optionContent.match(/<span>(\d+)<\/span>/);
                if (qualityMatch) {
                    quality = parseInt(qualityMatch[1]);
                }

                let provider = "Toolbaz";
                const beforeOption = html.substring(0, match.index);
                const titleMatches = beforeOption.match(/<div[^>]*\bclass=["'][^"']*model-group-title[^"']*["'][^>]*>([^<]+)<\/div>/g);
                if (titleMatches && titleMatches.length > 0) {
                    const lastTitle = titleMatches[titleMatches.length - 1];
                    const titleText = unescapeHtml(lastTitle.match(/>([^<]+)</)[1].trim());

                    if (titleText.includes("Google")) provider = "Google";
                    else if (titleText.includes("DeepSeek")) provider = "DeepSeek";
                    else if (titleText.includes("OpenAI")) provider = "OpenAI";
                    else if (titleText.includes("Anthropic")) provider = "Anthropic";
                    else if (titleText.includes("xAI")) provider = "xAI";
                    else if (titleText.includes("Facebook") || titleText.includes("Meta")) provider = "Facebook (Meta)";
                    else if (titleText.includes("ToolBaz")) provider = "Toolbaz";
                }

                result[modelKey] = {
                    label,
                    provider,
                    description,
                    speed,
                    quality
                };
            }
        }

        if (Object.keys(result).length === 0) {
            const dataValueMatches = [
                ...html.matchAll(/data-value=["']([^"']+)["']/gi),
                ...html.matchAll(/data-value=([^>\s]+)/gi)
            ];

            let currentProvider = "Toolbaz";

            for (const match of dataValueMatches) {
                const modelKey = unescapeHtml(match[1].trim());
                if (seen.has(modelKey)) continue;
                seen.add(modelKey);

                const beforeMatch = html.substring(0, match.index);
                const divStart = beforeMatch.lastIndexOf('<div');
                const afterMatch = html.substring(match.index);
                const divEnd = afterMatch.indexOf('</div>') + 6;

                if (divStart === -1 || divEnd === -1) continue;

                const modelOptionDiv = html.substring(divStart, match.index + divEnd);

                const nameMatch = modelOptionDiv.match(/data-name=["']([^"']+)["']/) ||
                    modelOptionDiv.match(/data-name=([^>\s]+)/);
                const label = nameMatch ? unescapeHtml(nameMatch[1].trim()) : modelKey;

                let description = "";
                const descMatch = modelOptionDiv.match(/data-description=["']([^"']+)["']/) ||
                    modelOptionDiv.match(/data-description=([^>\s]+)/);
                if (descMatch) {
                    description = unescapeHtml(descMatch[1].trim().replace(/"/g, ''));
                } else {
                    const descDivMatch = modelOptionDiv.match(/<div[^>]*\bclass=["'][^"']*model-description[^"']*["'][^>]*>([^<]+)</);
                    if (descDivMatch) {
                        description = unescapeHtml(descDivMatch[1].trim());
                    }
                }

                const speedMatch = modelOptionDiv.match(/(\d+)\s*W\/s/) ||
                    modelOptionDiv.match(/speed-indicator[^>]*>.*?(\d+)\s*W\/s/);
                const speed = speedMatch ? parseInt(speedMatch[1]) : 0;

                const qualityMatch = modelOptionDiv.match(/quality-indicator[^>]*>.*?(\d+)/) ||
                    modelOptionDiv.match(/<span>(\d+)<\/span>/);
                const quality = qualityMatch ? parseInt(qualityMatch[1]) : 0;

                const providerSections = beforeMatch.match(/<div[^>]*\bclass=["'][^"']*model-group-title[^"']*["'][^>]*>([^<]+)<\/div>/g);

                if (providerSections && providerSections.length > 0) {
                    const lastSection = providerSections[providerSections.length - 1];
                    const titleMatch = lastSection.match(/>([^<]+)</);
                    if (titleMatch) {
                        const groupTitle = unescapeHtml(titleMatch[1].trim());
                        if (groupTitle.includes("Google")) currentProvider = "Google";
                        else if (groupTitle.includes("DeepSeek")) currentProvider = "DeepSeek";
                        else if (groupTitle.includes("OpenAI")) currentProvider = "OpenAI";
                        else if (groupTitle.includes("Anthropic")) currentProvider = "Anthropic";
                        else if (groupTitle.includes("xAI")) currentProvider = "xAI";
                        else if (groupTitle.includes("Facebook") || groupTitle.includes("Meta")) currentProvider = "Facebook (Meta)";
                        else if (groupTitle.includes("ToolBaz")) currentProvider = "Toolbaz";
                        else currentProvider = "Toolbaz";
                    }
                }

                result[modelKey] = {
                    label,
                    provider: currentProvider,
                    description,
                    speed,
                    quality
                };
            }
        }

        return result;
    } catch (_) { return {}; }
}

const toolbazProvider = {
    id: "toolbaz",
    source: "toolbaz.com",
    enabled: () => PROVIDER_SETTINGS.toolbaz,
    scrapeModels,
    hasModel: (() => {
        let _cached = null;
        return (model) => {
            if (!_cached) return true;
            return _cached.has(model);
        };
    })(),
    complete: toolbazComplete,
    completeStream: toolbazCompleteStream,
};

registerProvider(toolbazProvider);

export default toolbazProvider;