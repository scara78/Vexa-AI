import {
    corsHeaders, fetchAvailableModels, checkModel, checkPage, checkToken, checkImage,
    getEnabledPriorityModels, HEALTH_SETTINGS,
} from "./core.js";

const MAX_MODELS_TO_CHECK = HEALTH_SETTINGS.MAX_MODELS_TO_CHECK;

export async function onRequest({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "GET") {
        return Response.json({ success: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
    }
    const tStart = Date.now();
    const scrapedModels = await fetchAvailableModels();
    const filteredPriorityModels = getEnabledPriorityModels();

    const prioritySet = new Set(filteredPriorityModels);
    const additionalModels = scrapedModels
        .filter(m => !prioritySet.has(m))
        .slice(0, Math.max(0, MAX_MODELS_TO_CHECK - filteredPriorityModels.length));
    const allModels = [...filteredPriorityModels, ...additionalModels, ...scrapedModels.filter(m => !prioritySet.has(m) && !additionalModels.includes(m))];
    const modelsToCheck = allModels.slice(0, MAX_MODELS_TO_CHECK);

    const [page, token, image, ...modelResults] = await Promise.all([
        checkPage(),
        checkToken(),
        checkImage(),
        ...modelsToCheck.map(m => checkModel(m)),
    ]);

    const models = {};
    for (let i = 0; i < modelsToCheck.length; i++) {
        models[modelsToCheck[i]] = modelResults[i];
    }
    for (const m of allModels.slice(MAX_MODELS_TO_CHECK)) {
        models[m] = { ok: null, error: "Skipped - too many models", latency_ms: 0 };
    }

    const failedModels = modelsToCheck.filter(m => !models[m]?.ok);
    const overall = page.reachable && token.reachable && token.token_received && image.reachable && failedModels.length === 0;

    return Response.json({
        success: true,
        status: overall ? "ok" : "degraded",
        timestamp: Math.floor(Date.now() / 1000),
        total_ms: Date.now() - tStart,
        checks: { page, token, image, models },
        ...(failedModels.length > 0 && { failed_models: failedModels }),
    }, { status: 200, headers: corsHeaders() });
}