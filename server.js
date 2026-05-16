import { createServer } from "node:http";
import worker from "./_worker.js";

const PORT = process.env.PORT || 8787;

// Minimal KV stub for local use (in-memory)
function makeKV() {
    const store = new Map();
    return {
        async get(key) { return store.get(key) ?? null; },
        async put(key, value, opts) { store.set(key, value); },
        async delete(key) { store.delete(key); },
    };
}

const env = {
    PROXY_CACHE: makeKV(),
    ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
    },
};

const ctx = { waitUntil: () => {} };

const server = createServer(async (req, res) => {
    try {
        const host = req.headers.host || `localhost:${PORT}`;
        const url = `http://${host}${req.url}`;

        // Read body for non-GET/HEAD
        let body = null;
        if (req.method !== "GET" && req.method !== "HEAD") {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            if (chunks.length > 0) body = Buffer.concat(chunks);
        }

        // Build Web API Request
        const headers = new Headers();
        for (const [key, val] of Object.entries(req.headers)) {
            if (typeof val === "string") headers.set(key, val);
            else if (Array.isArray(val)) val.forEach(v => headers.append(key, v));
        }

        const init = { method: req.method, headers };
        if (body && body.length > 0) {
            init.body = body;
            init.duplex = "half";
        }

        const request = new Request(url, init);

        // Dispatch to worker
        const response = await worker.fetch(request, env, ctx);

        // Convert headers to plain object
        const resHeaders = {};
        response.headers.forEach((value, key) => {
            resHeaders[key] = value;
        });

        res.writeHead(response.status, resHeaders);

        // Stream body
        if (response.body) {
            const reader = response.body.getReader();
            const pump = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (!res.writableEnded) res.write(Buffer.from(value));
                }
            };
            await pump();
        } else {
            // No body (e.g., 204 responses)
            const text = await response.text();
            if (text) res.write(text);
        }
        res.end();
    } catch (err) {
        console.error("Server error:", err);
        if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
        }
        if (!res.writableEnded) {
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
    }
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Vexa AI running on http://0.0.0.0:${PORT}`);
});