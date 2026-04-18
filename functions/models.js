import {
    DEFAULT_MODEL,
    corsHeaders,
    getAllEnabledModels,
} from "./core.js";

export async function onRequest({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders("GET, OPTIONS") });
    }
    if (request.method !== "GET") {
        return Response.json({ success: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders("GET, OPTIONS") });
    }
    const { textModels, imageModels } = await getAllEnabledModels();

    return Response.json({
        success: true,
        default: DEFAULT_MODEL,
        models: textModels,
        image_models: imageModels,
    }, { status: 200, headers: corsHeaders("GET, OPTIONS") });
}