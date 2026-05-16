import { DEFAULT_MODEL } from "../config.js";
import { corsHeaders, corsHeadersStream } from "../lib/utils.js";
import { completeWithAIStream } from "../lib/ai.js";
import { resolveSource } from "../lib/models.js";

const MAX_MESSAGES = 100;
const MAX_CHARS_PER_MSG = 32000;
const MAX_TOTAL_CHARS = 200000;

function validateMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0)
        return "messages must be a non-empty array";
    if (messages.length > MAX_MESSAGES)
        return `Too many messages. Max ${MAX_MESSAGES}`;
    if (!messages.some(m => m.role === "user"))
        return "At least one message with role 'user' is required";

    let totalChars = 0;
    for (const m of messages) {
        if (!m.role || !m.content)
            return "Each message must have role and content";
        if (!["system", "user", "assistant"].includes(m.role))
            return `Invalid role: ${m.role}`;
        if (typeof m.content !== "string" || m.content.length === 0)
            return "Message content must be a non-empty string";
        if (m.content.length > MAX_CHARS_PER_MSG)
            return `Message too long. Max ${MAX_CHARS_PER_MSG} chars per message`;
        totalChars += m.content.length;
    }
    if (totalChars > MAX_TOTAL_CHARS)
        return `Total message length too long. Max ${MAX_TOTAL_CHARS} chars`;

    return null;
}

function makeChunkEvent(id, model, content, finishReason = null) {
    const delta = finishReason ? {} : { content };
    const chunk = {
        id,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
            index: 0,
            delta,
            finish_reason: finishReason,
        }],
    };
    return `data: ${JSON.stringify(chunk)}\n\n`;
}

function makeFullResponse(id, model, content) {
    return {
        id,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
            index: 0,
            message: { role: "assistant", content },
            finish_reason: "stop",
        }],
        usage: {
            prompt_tokens: -1,
            completion_tokens: -1,
            total_tokens: -1,
        },
    };
}

export async function onRequest({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders("POST, OPTIONS") });
    }

    if (request.method !== "POST") {
        return new Response(
            JSON.stringify({ error: { message: "Method not allowed", type: "invalid_request_error" } }),
            { status: 405, headers: corsHeaders("POST, OPTIONS") }
        );
    }

    let body;
    try { body = await request.json(); }
    catch (_) {
        return new Response(
            JSON.stringify({ error: { message: "Invalid JSON body", type: "invalid_request_error" } }),
            { status: 400, headers: corsHeaders("POST, OPTIONS") }
        );
    }

    const { messages, model = DEFAULT_MODEL, stream = false } = body;

    const validationError = validateMessages(messages);
    if (validationError) {
        return new Response(
            JSON.stringify({ error: { message: validationError, type: "invalid_request_error" } }),
            { status: 400, headers: corsHeaders("POST, OPTIONS") }
        );
    }

    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const completionId = `chatcmpl-${crypto.randomUUID().replace(/-/g, "").slice(0, 28)}`;

    if (stream) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        (async () => {
            try {
                const roleChunk = {
                    id: completionId,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model,
                    choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(roleChunk)}\n\n`));

                await completeWithAIStream(lastUserMsg, messages, model, async (chunk) => {
                    await writer.write(encoder.encode(makeChunkEvent(completionId, model, chunk)));
                });

                await writer.write(encoder.encode(makeChunkEvent(completionId, model, "", "stop")));
                await writer.write(encoder.encode("data: [DONE]\n\n"));
            } catch (e) {
                const errEvent = {
                    id: completionId,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model,
                    choices: [{ index: 0, delta: {}, finish_reason: "error" }],
                    error: { message: e.message, type: "upstream_error" },
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(errEvent)}\n\n`));
                await writer.write(encoder.encode("data: [DONE]\n\n"));
            } finally {
                await writer.close();
            }
        })();

        return new Response(readable, { status: 200, headers: corsHeadersStream() });
    }

    // Non-streaming
    try {
        let fullText = "";
        let actualModel = model;
        await completeWithAIStream(lastUserMsg, messages, model, (chunk, chunkModel) => {
            fullText += chunk;
            if (chunkModel) actualModel = chunkModel;
        });

        if (!fullText || fullText.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: { message: "Empty response from upstream provider", type: "upstream_error" } }),
                { status: 502, headers: corsHeaders("POST, OPTIONS") }
            );
        }

        return new Response(
            JSON.stringify(makeFullResponse(completionId, actualModel, fullText.trim())),
            { status: 200, headers: corsHeaders("POST, OPTIONS") }
        );
    } catch (e) {
        return new Response(
            JSON.stringify({ error: { message: e.message, type: "upstream_error" } }),
            { status: 502, headers: corsHeaders("POST, OPTIONS") }
        );
    }
}