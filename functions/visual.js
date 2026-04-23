import { corsHeaders } from "../lib/utils.js";
import { dolphinVisualStream } from "../providers/dolphin.js";

const VALID_TEMPLATES = new Set(["summary", "logical", "creative", "summarize", "code_beginner", "code_advanced"]);
const MAX_B64_BYTES = 10 * 1024 * 1024;

export async function onRequest({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "POST") {
        return Response.json({ success: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
    }

    const contentType = request.headers.get("content-type") || "";
    const t0 = Date.now();
    let prompt, imageUrl, template;

    if (contentType.includes("multipart/form-data")) {
        let formData;
        try { formData = await request.formData(); } catch (_) {
            return Response.json({ success: false, error: "Invalid form data" }, { status: 400, headers: corsHeaders() });
        }
        prompt = (formData.get("prompt") || formData.get("q") || "").trim();
        template = formData.get("template") || "summary";
        const file = formData.get("image") || formData.get("file");
        const urlField = formData.get("image_url") || formData.get("url") || "";
        if (file && typeof file === "object") {
            if (file.size > MAX_B64_BYTES) {
                return Response.json({ success: false, error: "Image too large. Max 10MB." }, { status: 413, headers: corsHeaders() });
            }
            const bytes = await file.arrayBuffer();
            const b64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
            const mime = file.type || "image/jpeg";
            imageUrl = `data:${mime};base64,${b64}`;
        } else {
            imageUrl = urlField.trim();
        }
    } else {
        let body;
        try { body = await request.json(); } catch (_) {
            return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400, headers: corsHeaders() });
        }
        prompt = (body.prompt || body.q || body.query || "").trim();
        template = body.template || "summary";
        const rawB64 = body.image_base64 || body.base64 || "";
        if (rawB64) {
            const mime = body.mime_type || "image/jpeg";
            imageUrl = `data:${mime};base64,${rawB64}`;
        } else {
            imageUrl = (body.image_url || body.image || "").trim();
        }
    }

    if (!VALID_TEMPLATES.has(template)) template = "summary";

    if (!prompt) {
        return Response.json({ success: false, error: "Missing required parameter: prompt" }, { status: 400, headers: corsHeaders() });
    }
    if (!imageUrl) {
        return Response.json({ success: false, error: "Missing required parameter: image_url, image_base64, or file upload" }, { status: 400, headers: corsHeaders() });
    }

    try {
        let fullText = "";
        await dolphinVisualStream(prompt, imageUrl, template, (chunk) => { fullText += chunk; });
        return Response.json({ success: true, response: fullText.trim(), model: "dolphinserver:24B", template, elapsed_ms: Date.now() - t0, source: "dphn.ai" }, { status: 200, headers: corsHeaders() });
    } catch (e) {
        return Response.json({ success: false, error: "Upstream request failed", detail: e.message, model: "dolphinserver:24B", template }, { status: 502, headers: corsHeaders() });
    }
}